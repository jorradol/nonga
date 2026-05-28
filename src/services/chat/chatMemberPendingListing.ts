import type { PendingListingCardData, ChatMessage, ChatMessageAttachment } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../ai/chat/chatPrecheckLayer";
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
  return {
    publicRefCode: params.publicRefCode,
    statusLabel: params.statusLabel ?? "ร่างประกาศ รอตรวจทาน",
    marketingCopy: extractMarketingCopyFromDraftText(params.draftPreviewText),
    fields: params.fields as Record<string, unknown>,
    visionSummary: params.visionSummary as Record<string, unknown> | undefined,
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
  return (
    messages
      .slice()
      .reverse()
      .find((m) => m.isPendingListingCard && m.pendingListingCard) ?? null
  );
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
