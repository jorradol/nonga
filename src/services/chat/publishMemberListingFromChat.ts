import type { Car, ChatMessage, SavedMemberListingCardData } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import {
  fetchMyListings,
  setMyListingVisibility,
} from "../listings/myListingsApi";
import { AppFriendlyError } from "../../utils/appFriendlyError";
import { isValidListingImageUrl } from "../../utils/listingImages";
import { filterSavedCardImageUrls } from "./chatSavedMemberListing";
import {
  hasCoreFieldsComplete,
  getMissingCoreFieldLabels,
  mergeEffectivePrecheckFields,
} from "../ai/chat/chatPrecheckLayer";
import {
  normalizeExtractedCarFields,
  normalizeVisionObservationSummary,
  isMemberConsumerSellerFlow,
} from "./chatMemberPendingListing";
import { CHAT_MEMBER_PUBLISH_LISTING_ACTION } from "./chatSavedMemberListing";
import {
  clearPendingPublishListingContext,
  getPendingPublishListingContext,
  isPendingPublishListingContextExpired,
  setPendingPublishListingContext,
  type PendingPublishListingContext,
} from "./chatPendingPublishListing";
import {
  CHAT_PUBLISH_CONSENT_LABEL,
  CHAT_PUBLISH_CONSENT_REQUIRED_MESSAGE,
  clearPublishConsent,
  hasPublishConsentAccepted,
} from "./chatPublishConsent";

export { CHAT_PUBLISH_CONSENT_LABEL, CHAT_PUBLISH_CONSENT_REQUIRED_MESSAGE };

export { CHAT_MEMBER_PUBLISH_LISTING_ACTION };

export const CHAT_MEMBER_CONFIRM_PUBLISH_ACTION = "ยืนยันเผยแพร่ลงตลาด";

/** ข้อความยกเลิก/หมดอายุ pending publish (Step 3+ ใช้ในแชท) */
export const CHAT_MEMBER_CANCEL_PUBLISH_ACTION = "ยกเลิกเผยแพร่";

export const CHAT_MEMBER_PUBLISH_CANCELLED_ACK =
  "รับทราบครับ ยังไม่เผยแพร่ประกาศในตลาด — กลับมากด “พร้อมลงตลาด” ได้เมื่อพร้อม";

export const CHAT_MEMBER_PUBLISH_CONTEXT_EXPIRED_MESSAGE =
  "คำขอเผยแพร่หมดอายุแล้วครับ กรุณากด “พร้อมลงตลาด” จากการ์ดประกาศอีกครั้งเพื่อดูสรุปใหม่";

/** ข้อความ near-match ที่ปลอดภัย — ห้ามรวมคำกว้าง เช่น “ตกลง” */
const CONFIRM_PUBLISH_SAFE_ALIASES = ["ยืนยันลงตลาด"] as const;

export type PublishBlockedReason =
  | "missing-card"
  | "missing-listing-id"
  | "missing-core-fields"
  | "missing-images";

export type PublishPreflightFailureReason =
  | "listing-not-found"
  | "owner-mismatch"
  | "already-published"
  | "not-hidden"
  | "missing-images"
  | "missing-core-fields";

export const CHAT_PUBLISH_LOGIN_REQUIRED_MESSAGE =
  "กรุณาเข้าสู่ระบบก่อนเผยแพร่ประกาศครับ แล้วกลับมากด “ยืนยันเผยแพร่ลงตลาด” อีกครั้ง";

export const CHAT_PUBLISH_MEMBER_ONLY_MESSAGE =
  "ฟีเจอร์เผยแพร่จากแชทนี้สำหรับสมาชิกขายรถส่วนบุคคลเท่านั้นครับ";

export const CHAT_PUBLISH_ALREADY_PUBLISHED_MESSAGE =
  "ประกาศนี้ลงตลาดแล้วครับ ลูกค้าสามารถค้นหาและดูในตลาดรถได้เลย";

export const CHAT_PUBLISH_FORBIDDEN_MESSAGE =
  "น้องเอไม่สามารถเผยแพร่ประกาศนี้ได้ครับ อาจเป็นของบัญชีอื่นหรือคุณไม่มีสิทธิ์จัดการ — ลองตรวจที่ “ประกาศของฉัน”";

export const CHAT_PUBLISH_FETCH_FAILED_MESSAGE =
  "โหลดข้อมูลประกาศจากระบบไม่สำเร็จครับ ลองรีเฟรชหน้าแล้วกด “พร้อมลงตลาด” อีกครั้ง";

export type ValidateMemberListingReadyToPublishResult =
  | {
      ok: true;
      card: SavedMemberListingCardData;
      fields: ExtractedCarFields;
      imageCount: number;
    }
  | {
      ok: false;
      reason: PublishBlockedReason;
      message: string;
      missingCoreLabels?: string[];
    };

export function normalizeSavedMemberListingCardData(
  raw: Partial<SavedMemberListingCardData> | null | undefined
): SavedMemberListingCardData | null {
  if (!raw || typeof raw !== "object") return null;
  const listingId = typeof raw.listingId === "string" ? raw.listingId.trim() : "";
  const publicRefCode =
    typeof raw.publicRefCode === "string" ? raw.publicRefCode.trim() : "";
  if (!listingId) return null;

  const fields = normalizeExtractedCarFields(raw.fields);
  const visionSummary = normalizeVisionObservationSummary(raw.visionSummary);
  const imageUrls = filterSavedCardImageUrls(
    listingId,
    Array.isArray(raw.imageUrls)
      ? raw.imageUrls.filter((u): u is string => typeof u === "string" && Boolean(u.trim()))
      : []
  );

  return {
    listingId,
    publicRefCode,
    statusLabel:
      typeof raw.statusLabel === "string" && raw.statusLabel.trim()
        ? raw.statusLabel.trim()
        : "รอตรวจทาน / ยังไม่ลงตลาด",
    marketingCopy: typeof raw.marketingCopy === "string" ? raw.marketingCopy : "",
    fields: fields as Record<string, unknown>,
    ...(visionSummary ? { visionSummary: visionSummary as Record<string, unknown> } : {}),
    imageUrls,
  };
}

export function findLatestSavedMemberListingCardMessage(
  messages: ChatMessage[]
): ChatMessage | null {
  for (const message of [...messages].reverse()) {
    if (message.isPendingListingCard || message.pendingListingCard) continue;

    const card = normalizeSavedMemberListingCardData(message.savedMemberListingCard);
    if (!card && !message.isSavedMemberListingCard) continue;
    if (!card) continue;

    return {
      ...message,
      isSavedMemberListingCard: true,
      savedMemberListingCard: card,
      savedMemberListingId: card.listingId,
    };
  }
  return null;
}

export function validateMemberListingReadyToPublish(
  cardInput: SavedMemberListingCardData | null | undefined
): ValidateMemberListingReadyToPublishResult {
  if (!cardInput || typeof cardInput !== "object") {
    return {
      ok: false,
      reason: "missing-card",
      message: buildPublishBlockedMessage("missing-card"),
    };
  }

  const rawListingId =
    typeof cardInput.listingId === "string" ? cardInput.listingId.trim() : "";
  if (!rawListingId) {
    return {
      ok: false,
      reason: "missing-listing-id",
      message: buildPublishBlockedMessage("missing-listing-id"),
    };
  }

  const card = normalizeSavedMemberListingCardData(cardInput);
  if (!card) {
    return {
      ok: false,
      reason: "missing-card",
      message: buildPublishBlockedMessage("missing-card"),
    };
  }

  const visionSummary = normalizeVisionObservationSummary(card.visionSummary);
  const fields = mergeEffectivePrecheckFields(
    normalizeExtractedCarFields(card.fields),
    visionSummary
  );

  if (!hasCoreFieldsComplete(fields, visionSummary)) {
    const missingCoreLabels = getMissingCoreFieldLabels(fields);
    return {
      ok: false,
      reason: "missing-core-fields",
      message: buildPublishMissingCoreFieldsMessage(missingCoreLabels),
      missingCoreLabels,
    };
  }

  if (card.imageUrls.length < 1) {
    return {
      ok: false,
      reason: "missing-images",
      message: buildPublishBlockedMessage("missing-images"),
    };
  }

  return {
    ok: true,
    card,
    fields,
    imageCount: card.imageUrls.length,
  };
}

export function isMemberConfirmPublishListingChatAction(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (trimmed === CHAT_MEMBER_CONFIRM_PUBLISH_ACTION) return true;
  return CONFIRM_PUBLISH_SAFE_ALIASES.includes(
    trimmed as (typeof CONFIRM_PUBLISH_SAFE_ALIASES)[number]
  );
}

export function isMemberCancelPublishListingChatAction(message: string): boolean {
  return message.trim() === CHAT_MEMBER_CANCEL_PUBLISH_ACTION;
}

export function canEnterMemberPublishInChatFlow(options: {
  isSignedIn: boolean;
  isDealer: boolean;
  isAdmin: boolean;
  chatScopeMode: "dealer" | "consumer";
}): boolean {
  return isMemberConsumerSellerFlow(options);
}

export function beginPendingPublishListingFromSavedCard(params: {
  sessionId: string;
  messages: ChatMessage[];
}): PendingPublishListingContext | { ok: false; message: string } {
  const cardMessage = findLatestSavedMemberListingCardMessage(params.messages);
  if (!cardMessage?.savedMemberListingCard) {
    return {
      ok: false,
      message: buildPublishBlockedMessage("missing-card"),
    };
  }

  const validation = validateMemberListingReadyToPublish(cardMessage.savedMemberListingCard);
  if (validation.ok === false) {
    return { ok: false, message: validation.message };
  }

  return setPendingPublishListingContext({
    sessionId: params.sessionId,
    listingId: validation.card.listingId,
    publicRefCode: validation.card.publicRefCode,
    card: validation.card,
  });
}

export function resolvePendingPublishListingContext(
  sessionId: string
): PendingPublishListingContext | null {
  const ctx = getPendingPublishListingContext(sessionId);
  if (!ctx) return null;
  if (isPendingPublishListingContextExpired(ctx)) return null;
  return ctx;
}

function formatPriceThb(price: number | undefined): string {
  if (price == null || !Number.isFinite(price) || price <= 0) return "—";
  return `${Number(price).toLocaleString("th-TH")} บาท`;
}

function formatMileageKm(mileage: number | undefined): string {
  if (mileage == null || !Number.isFinite(mileage)) return "—";
  return `${Number(mileage).toLocaleString("th-TH")} กม.`;
}

export function buildPublishSummaryMessage(
  card: SavedMemberListingCardData
): string {
  const normalized = normalizeSavedMemberListingCardData(card);
  if (!normalized) {
    return buildPublishBlockedMessage("missing-card");
  }

  const visionSummary = normalizeVisionObservationSummary(normalized.visionSummary);
  const fields = mergeEffectivePrecheckFields(
    normalizeExtractedCarFields(normalized.fields),
    visionSummary
  );

  const brandModel = [fields.brand || visionSummary?.brand, fields.model || visionSummary?.model]
    .filter(Boolean)
    .join(" ")
    .trim();

  const lines = [
    "สรุปก่อนเผยแพร่ลงตลาดครับ",
    "",
    `ยี่ห้อ/รุ่น: ${brandModel || "—"}`,
    `ปี: ${fields.year ?? "—"}`,
    `ราคา: ${formatPriceThb(fields.price)}`,
    `เลขไมล์: ${formatMileageKm(fields.mileage)}`,
    `จำนวนรูป: ${normalized.imageUrls.length} รูป`,
    `สถานะปัจจุบัน: ${normalized.statusLabel || "รอตรวจทาน / ยังไม่ลงตลาด"}`,
    `รหัสประกาศ: ${normalized.listingId}`,
  ];

  if (normalized.publicRefCode) {
    lines.push(`รหัสอ้างอิงจากแชท: ${normalized.publicRefCode}`);
  }

  return lines.join("\n");
}

export function buildPublishAwaitingConfirmMessage(): string {
  return [
    "กรุณาติ๊กยืนยันด้านล่าง แล้วกด “ยืนยันเผยแพร่ลงตลาด” ครับ",
    "ระบบจะยังไม่เผยแพร่จนกว่าจะยืนยันครั้งที่ 2",
  ].join("\n");
}

export function buildPublishBlockedMessage(reason: PublishBlockedReason): string {
  switch (reason) {
    case "missing-card":
      return "ยังไม่พบการ์ดประกาศที่บันทึกแล้วในแชทครับ กรุณาบันทึกประกาศร่างก่อน แล้วกด “พร้อมลงตลาด” อีกครั้ง";
    case "missing-listing-id":
      return "ยังไม่พบรหัสประกาศในระบบครับ กรุณาบันทึกประกาศจากแชทใหม่ หรือไปตรวจที่ “ประกาศของฉัน”";
    case "missing-core-fields":
      return "ข้อมูลหลักยังไม่ครบสำหรับเผยแพร่ครับ กรุณาไปแก้ไขที่ “ประกาศของฉัน” ให้ครบก่อน แล้วกลับมากด “พร้อมลงตลาด” อีกครั้ง";
    case "missing-images":
      return "ต้องมีรูปอย่างน้อย 1 รูปก่อนเผยแพร่ครับ กรุณาเพิ่มรูปที่ “ประกาศของฉัน” แล้วกลับมายืนยันอีกครั้ง";
    default:
      return "ยังไม่พร้อมเผยแพร่ประกาศนี้ครับ กรุณาตรวจสอบที่ “ประกาศของฉัน”";
  }
}

export function buildPublishMissingCoreFieldsMessage(
  missingLabels: string[],
  options?: { cardHadCompleteFields?: boolean }
): string {
  if (missingLabels.length === 0) {
    return buildPublishBlockedMessage("missing-core-fields");
  }
  const intro = options?.cardHadCompleteFields
    ? "ข้อมูลในแชทครบแล้ว แต่ข้อมูลในระบบ (ประกาศของฉัน) ยังไม่ครบสำหรับเผยแพร่ครับ"
    : "ข้อมูลในระบบยังไม่ครบสำหรับเผยแพร่ครับ";
  return [
    intro,
    `ยังขาด: ${missingLabels.join(", ")}`,
    "",
    'กรุณาแก้ไขที่ "ประกาศของฉัน" ให้ครบก่อน แล้วกลับมากด "พร้อมลงตลาด" อีกครั้ง',
  ].join("\n");
}

export function buildPublishSuccessMessage(
  listing: Car,
  card?: SavedMemberListingCardData
): string {
  const brandModel = [listing.brand, listing.model].filter(Boolean).join(" ").trim();
  const refLine = card?.publicRefCode
    ? `\nรหัสอ้างอิงจากแชท: ${card.publicRefCode}`
    : "";
  return [
    "เผยแพร่ประกาศลงตลาดเรียบร้อยแล้วครับ",
    "",
    brandModel
      ? `${brandModel} ปี ${listing.year} — ${Number(listing.price).toLocaleString("th-TH")} บาท`
      : `รหัสประกาศ: ${listing.id}`,
    "ลูกค้าสามารถค้นหาและดูประกาศของคุณในตลาดรถได้แล้ว",
    refLine,
    "ปังปุริเย่!",
  ]
    .filter(Boolean)
    .join("\n");
}

export function countRealListingImagesOnRecord(car: Car): number {
  return car.images.filter((url) => isValidListingImageUrl(url, car.id)).length;
}

function extractTransmissionFromListingRecord(car: Car): string | undefined {
  if (typeof car.transmission === "string" && car.transmission.trim()) {
    return car.transmission.trim();
  }

  const candidates = [car.condition, car.description].filter(
    (value): value is string => typeof value === "string" && Boolean(value.trim())
  );

  for (const text of candidates) {
    const normalized = text.trim();
    const labeled = normalized.match(/(?:เกียร์)\s*(ออโต้|อัตโนมัติ|auto|at|mt|manual|ธรรมดา|cvt)/i);
    if (labeled) {
      const raw = labeled[1];
      if (/ออโต้|อัตโนมัติ|auto|cvt|^at$/i.test(raw)) return "เกียร์ออโต้";
      if (/^mt$|manual|ธรรมดา/i.test(raw)) return "เกียร์ธรรมดา";
      return `เกียร์ ${raw.trim()}`;
    }
    if (/ออโต้|อัตโนมัติ|automatic|cvt/i.test(normalized)) return "เกียร์ออโต้";
    if (/manual|ธรรมดา/i.test(normalized)) return "เกียร์ธรรมดา";
  }

  return undefined;
}

export function carRecordToExtractedFields(car: Car): ExtractedCarFields {
  return {
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    transmission: extractTransmissionFromListingRecord(car),
    color: car.color,
    description: car.description,
  };
}

export function preflightMemberListingRecordForChatPublish(params: {
  ownerId: string;
  listingId: string;
  listings: Car[];
}):
  | { ok: true; listing: Car }
  | {
      ok: false;
      reason: PublishPreflightFailureReason;
      message: string;
      missingCoreLabels?: string[];
    } {
  const listingId = params.listingId.trim();
  const ownerId = params.ownerId.trim();
  const listing = params.listings.find((item) => item.id === listingId);

  if (!listing) {
    return {
      ok: false,
      reason: "listing-not-found",
      message: buildPublishBlockedMessage("missing-listing-id"),
    };
  }

  if (listing.ownerId !== ownerId) {
    return {
      ok: false,
      reason: "owner-mismatch",
      message: CHAT_PUBLISH_FORBIDDEN_MESSAGE,
    };
  }

  if (listing.listingStatus === "published") {
    return {
      ok: false,
      reason: "already-published",
      message: CHAT_PUBLISH_ALREADY_PUBLISHED_MESSAGE,
    };
  }

  if (listing.listingStatus !== "hidden") {
    return {
      ok: false,
      reason: "not-hidden",
      message:
        "สถานะประกาศนี้ยังไม่พร้อมเผยแพร่จากแชทครับ กรุณาตรวจที่ “ประกาศของฉัน”",
    };
  }

  const fields = carRecordToExtractedFields(listing);
  const missingCoreLabels = getMissingCoreFieldLabels(fields);
  if (missingCoreLabels.length > 0) {
    return {
      ok: false,
      reason: "missing-core-fields",
      message: buildPublishMissingCoreFieldsMessage(missingCoreLabels),
      missingCoreLabels,
    };
  }

  if (countRealListingImagesOnRecord(listing) < 1) {
    return {
      ok: false,
      reason: "missing-images",
      message: buildPublishBlockedMessage("missing-images"),
    };
  }

  return { ok: true, listing };
}

export type ConfirmMemberPublishListingDeps = {
  fetchMyListings: (ownerId: string) => Promise<Car[]>;
  setListingVisible: (ownerId: string, listingId: string) => Promise<Car>;
};

export function createDefaultConfirmMemberPublishDeps(): ConfirmMemberPublishListingDeps {
  return {
    fetchMyListings: (ownerId) => fetchMyListings({ ownerId }),
    setListingVisible: (ownerId, listingId) =>
      setMyListingVisibility({ ownerId }, listingId, false),
  };
}

export type MemberPublishListingIntentOutcome =
  | { kind: "blocked"; message: string }
  | { kind: "summary"; message: string; listingId: string };

export type MemberConfirmPublishIntentOutcome =
  | { kind: "no_pending"; message: string }
  | { kind: "blocked"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "already_published"; message: string; listingId: string }
  | { kind: "success"; message: string; listingId: string };

export function handleMemberPublishListingIntent(params: {
  sessionId: string;
  messages: ChatMessage[];
}): MemberPublishListingIntentOutcome {
  clearPublishConsent(params.sessionId);
  const began = beginPendingPublishListingFromSavedCard(params);
  if ("ok" in began && began.ok === false) {
    return { kind: "blocked", message: began.message };
  }

  const ctx = began as PendingPublishListingContext;
  return {
    kind: "summary",
    listingId: ctx.listingId,
    message: `${buildPublishSummaryMessage(ctx.card)}\n\n${buildPublishAwaitingConfirmMessage()}`,
  };
}

export async function confirmMemberPublishListingFromChat(
  params: {
    sessionId: string;
    ownerId: string;
    canPublish: boolean;
  },
  deps: ConfirmMemberPublishListingDeps = createDefaultConfirmMemberPublishDeps()
): Promise<MemberConfirmPublishIntentOutcome> {
  if (!params.canPublish) {
    if (!params.ownerId.trim()) {
      return { kind: "blocked", message: CHAT_PUBLISH_LOGIN_REQUIRED_MESSAGE };
    }
    return { kind: "blocked", message: CHAT_PUBLISH_MEMBER_ONLY_MESSAGE };
  }

  const ctx = resolvePendingPublishListingContext(params.sessionId);
  if (!ctx) {
    return {
      kind: "no_pending",
      message: CHAT_MEMBER_PUBLISH_CONTEXT_EXPIRED_MESSAGE,
    };
  }

  if (!hasPublishConsentAccepted(params.sessionId)) {
    return {
      kind: "blocked",
      message: CHAT_PUBLISH_CONSENT_REQUIRED_MESSAGE,
    };
  }

  let listings: Car[];
  try {
    listings = await deps.fetchMyListings(params.ownerId);
  } catch {
    return { kind: "blocked", message: CHAT_PUBLISH_FETCH_FAILED_MESSAGE };
  }

  const preflight = preflightMemberListingRecordForChatPublish({
    ownerId: params.ownerId,
    listingId: ctx.listingId,
    listings,
  });

  if (preflight.ok === false) {
    if (preflight.reason === "already-published") {
      clearPendingPublishListingContext(params.sessionId);
      return {
        kind: "already_published",
        listingId: ctx.listingId,
        message: preflight.message,
      };
    }
    if (preflight.reason === "owner-mismatch") {
      return { kind: "forbidden", message: preflight.message };
    }
    if (preflight.reason === "missing-core-fields") {
      const cardReady = validateMemberListingReadyToPublish(ctx.card);
      const message =
        cardReady.ok && preflight.missingCoreLabels
          ? buildPublishMissingCoreFieldsMessage(preflight.missingCoreLabels, {
              cardHadCompleteFields: true,
            })
          : preflight.message;
      return { kind: "blocked", message };
    }
    return { kind: "blocked", message: preflight.message };
  }

  try {
    await deps.setListingVisible(params.ownerId, ctx.listingId);
  } catch (error) {
    if (error instanceof AppFriendlyError && error.code === "forbidden") {
      return { kind: "forbidden", message: CHAT_PUBLISH_FORBIDDEN_MESSAGE };
    }
    return {
      kind: "blocked",
      message:
        error instanceof AppFriendlyError
          ? error.friendlyMessage.split("\n")[0]
          : CHAT_PUBLISH_FETCH_FAILED_MESSAGE,
    };
  }

  clearPendingPublishListingContext(params.sessionId);
  clearPublishConsent(params.sessionId);
  return {
    kind: "success",
    listingId: ctx.listingId,
    message: buildPublishSuccessMessage(preflight.listing, ctx.card),
  };
}

export function handleMemberCancelPublishIntent(sessionId: string): {
  kind: "cancelled";
  message: string;
} {
  clearPendingPublishListingContext(sessionId);
  clearPublishConsent(sessionId);
  return {
    kind: "cancelled",
    message: CHAT_MEMBER_PUBLISH_CANCELLED_ACK,
  };
}
