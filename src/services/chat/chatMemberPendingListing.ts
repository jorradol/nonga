import type { PendingListingCardData, ChatMessage, ChatMessageAttachment } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type {
  ChatPrecheckContext,
  VisionObservationSummary,
} from "../ai/chat/chatPrecheckLayer";
import {
  getMissingCoreFieldLabels,
  mergeEffectivePrecheckFields,
} from "../ai/chat/chatPrecheckLayer";
import { useChatStore } from "../../stores/chat/chatStore";

export const CHAT_MEMBER_PENDING_CARD_INTRO =
  "น้องเอเตรียมร่างประกาศไว้ให้แล้วครับ ลุงตรวจข้อมูลในการ์ดนี้ได้เลย ถ้าถูกต้องกดยืนยันบันทึกประกาศได้ในแชท ไม่ต้องย้ายหน้า";

export const CHAT_MEMBER_CONFIRM_SAVE_LISTING_ACTION = "ยืนยันบันทึกประกาศ";
export const CHAT_MEMBER_NOT_NOW_LISTING_ACTION = "ยังไม่ลงตลาดตอนนี้";

export const CHAT_MEMBER_NOT_NOW_ACK =
  "รับทราบครับ น้องเอเก็บร่างไว้ในแชทให้แล้ว ลุงกลับมาทำต่อเมื่อไหร่ก็ได้ครับ ยังไม่ลงตลาดตอนนี้";

/** @deprecated ใช้ saveMemberListingFromChat แทน — เก็บไว้เพื่อ backward compat ใน test */
export const CHAT_MEMBER_PENDING_SAVE_ACK =
  "กำลังบันทึกประกาศร่างผ่านระบบประกาศของฉันครับ";

function readTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/** Coerce snapshot / Firestore plain objects back into listing fields. */
export function normalizeExtractedCarFields(
  raw: Record<string, unknown> | ExtractedCarFields | undefined | null
): ExtractedCarFields {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  return {
    brand: readTrimmedString(record.brand),
    model: readTrimmedString(record.model),
    year: readFiniteNumber(record.year),
    price: readFiniteNumber(record.price),
    mileage: readFiniteNumber(record.mileage),
    color: readTrimmedString(record.color),
    transmission: readTrimmedString(record.transmission),
    fuelType: readTrimmedString(record.fuelType),
    licensePlate: readTrimmedString(record.licensePlate),
    trimSubModel: readTrimmedString(record.trimSubModel),
    description: readTrimmedString(record.description),
  };
}

export function normalizeVisionObservationSummary(
  raw: Record<string, unknown> | VisionObservationSummary | undefined | null
): VisionObservationSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const summary: VisionObservationSummary = {
    brand: readTrimmedString(record.brand),
    model: readTrimmedString(record.model),
    color: readTrimmedString(record.color),
    bodyType: readTrimmedString(record.bodyType),
    condition: readTrimmedString(record.condition),
  };
  return Object.values(summary).some(Boolean) ? summary : undefined;
}

export function normalizePendingListingCardData(
  raw: Partial<PendingListingCardData> | null | undefined
): PendingListingCardData | null {
  if (!raw || typeof raw !== "object") return null;
  const fields = normalizeExtractedCarFields(raw.fields);
  const visionSummary = normalizeVisionObservationSummary(raw.visionSummary);
  const publicRefCode = readTrimmedString(raw.publicRefCode);
  if (!publicRefCode) return null;
  return {
    publicRefCode,
    statusLabel:
      readTrimmedString(raw.statusLabel) ?? "ร่างประกาศ รอตรวจทาน",
    marketingCopy: readTrimmedString(raw.marketingCopy) ?? "",
    fields: fields as Record<string, unknown>,
    ...(visionSummary ? { visionSummary: visionSummary as Record<string, unknown> } : {}),
  };
}

export function extractMarketingCopyFromDraftText(draftPreviewText: string): string {
  const startTag = "[โพสต์ตัวอย่าง]";
  const endTag = "[ข้อมูลสำหรับตรวจสอบก่อนยืนยัน]";
  const start = draftPreviewText.indexOf(startTag);
  const end = draftPreviewText.indexOf(endTag);
  if (start >= 0 && end > start) {
    return draftPreviewText.slice(start + startTag.length, end).trim();
  }
  return draftPreviewText.trim();
}

export function buildPendingListingCardData(params: {
  fields: ExtractedCarFields;
  visionSummary?: VisionObservationSummary;
  publicRefCode: string;
  draftPreviewText: string;
  statusLabel?: string;
}): PendingListingCardData {
  const fields = normalizeExtractedCarFields(params.fields);
  const visionSummary = normalizeVisionObservationSummary(params.visionSummary);
  return {
    publicRefCode: params.publicRefCode,
    statusLabel: params.statusLabel ?? "ร่างประกาศ รอตรวจทาน",
    marketingCopy: extractMarketingCopyFromDraftText(params.draftPreviewText),
    fields: fields as Record<string, unknown>,
    ...(visionSummary ? { visionSummary: visionSummary as Record<string, unknown> } : {}),
  };
}

export function isMemberConsumerSellerFlow(options: {
  isSignedIn: boolean;
  isDealer: boolean;
  isAdmin: boolean;
  chatScopeMode: "dealer" | "consumer";
}): boolean {
  return (
    options.isSignedIn &&
    options.chatScopeMode === "consumer" &&
    !options.isDealer &&
    !options.isAdmin
  );
}

export function isMemberListingChatAction(message: string): boolean {
  const t = message.trim();
  return (
    t === CHAT_MEMBER_CONFIRM_SAVE_LISTING_ACTION ||
    t === CHAT_MEMBER_NOT_NOW_LISTING_ACTION
  );
}

export function findLatestPendingListingCardMessage(
  messages: ChatMessage[]
): ChatMessage | null {
  for (const message of [...messages].reverse()) {
    const card = normalizePendingListingCardData(message.pendingListingCard);
    if (!card && !message.isPendingListingCard) continue;
    if (!card) continue;
    return {
      ...message,
      isPendingListingCard: true,
      pendingListingCard: card,
    };
  }
  return null;
}

export type MemberPendingListingSaveContext =
  | {
      ok: true;
      fields: ExtractedCarFields;
      visionSummary?: VisionObservationSummary;
      publicRefCode: string;
      marketingCopy: string;
      cardMessage: ChatMessage;
      cardAttachments?: ChatMessageAttachment[];
    }
  | { ok: false; message: string };

export function resolveMemberPendingListingSaveContext(params: {
  messages: ChatMessage[];
  precheck?: ChatPrecheckContext | null;
  fallbackPublicRefCode?: string;
}): MemberPendingListingSaveContext {
  const cardMessage = findLatestPendingListingCardMessage(params.messages);
  const card = cardMessage?.pendingListingCard
    ? normalizePendingListingCardData(cardMessage.pendingListingCard)
    : null;
  const visionSummary =
    card?.visionSummary ??
    normalizeVisionObservationSummary(params.precheck?.visionSummary);
  const rawFields =
    card?.fields ??
    params.precheck?.fields ??
    ({} as ExtractedCarFields);
  const fields = mergeEffectivePrecheckFields(
    normalizeExtractedCarFields(rawFields),
    visionSummary
  );

  if (!card && !params.precheck?.fields) {
    return {
      ok: false,
      message:
        "ยังไม่พบการ์ดประกาศร่างหลังเข้าสู่ระบบครับ ลองเริ่มสร้างประกาศจากแชทใหม่อีกครั้งนะครับ",
    };
  }

  const missingCore = getMissingCoreFieldLabels(fields);
  if (missingCore.length > 0) {
    return {
      ok: false,
      message: `ข้อมูลยังไม่ครบสำหรับบันทึกครับ: ${missingCore.join(", ")} — กดแก้ไขข้อมูลในการ์ดแล้วเติมให้ครบก่อนนะครับ`,
    };
  }

  const publicRefCode =
    card?.publicRefCode ??
    params.precheck?.publicRefCode ??
    params.fallbackPublicRefCode ??
    "";
  if (!publicRefCode.trim()) {
    return {
      ok: false,
      message:
        "ยังไม่พบรหัสอ้างอิงประกาศครับ ลองเริ่มสร้างประกาศจากแชทใหม่อีกครั้งนะครับ",
    };
  }

  if (!cardMessage) {
    return {
      ok: false,
      message:
        "ยังไม่พบการ์ดประกาศร่างในแชทครับ ลองกดยืนยันสร้างประกาศอีกครั้งเพื่อให้น้องเอแสดงการ์ดใหม่นะครับ",
    };
  }

  return {
    ok: true,
    fields,
    visionSummary,
    publicRefCode,
    marketingCopy: card?.marketingCopy ?? "",
    cardMessage,
    cardAttachments: cardMessage.attachments,
  };
}

export async function appendMemberPendingListingCardMessage(
  sessionId: string,
  params: {
    fields: ExtractedCarFields;
    visionSummary?: VisionObservationSummary;
    publicRefCode: string;
    draftPreviewText: string;
    attachments?: ChatMessageAttachment[];
  }
): Promise<void> {
  const cardData = buildPendingListingCardData({
    fields: params.fields,
    visionSummary: params.visionSummary,
    publicRefCode: params.publicRefCode,
    draftPreviewText: params.draftPreviewText,
  });
  await useChatStore.getState().addMessage(
    sessionId,
    "ai",
    CHAT_MEMBER_PENDING_CARD_INTRO,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    params.attachments?.length ? params.attachments : undefined,
    { isPendingListingCard: true, pendingListingCard: cardData }
  );
}

export type MemberPendingListingExtras = {
  isPendingListingCard: true;
  pendingListingCard: PendingListingCardData;
  attachments?: ChatMessageAttachment[];
};
