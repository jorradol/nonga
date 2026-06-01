import type {
  ChatMessageAttachment,
  SavedMemberListingCardData,
} from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../ai/chat/chatPrecheckLayer";
import { isValidListingImageUrl } from "../../utils/listingImages";
import { useChatStore } from "../../stores/chat/chatStore";

export const CHAT_SAVED_MEMBER_LISTING_CARD_INTRO =
  "บันทึกประกาศร่างเรียบร้อยแล้วครับ ประกาศนี้ยังไม่เผยแพร่ในตลาด — ตรวจทานข้อมูลในการ์ดด้านล่างได้เลย หรือไปต่อที่ “ประกาศของฉัน” เมื่อพร้อม";

export const SAVED_MEMBER_LISTING_STATUS_LABEL =
  "รอตรวจทาน / ยังไม่ลงตลาด";

export const CHAT_MEMBER_PUBLISH_LISTING_ACTION = "พร้อมลงตลาด";

export const CHAT_MEMBER_PUBLISH_COMING_SOON_ACK =
  "ข้อมูลพร้อมแล้วครับ — กด “พร้อมลงตลาด” เพื่อตรวจสรุปและเผยแพร่ประกาศได้เลย หรือไปตรวจทานที่ “ประกาศของฉัน” ก่อนก็ได้";

export const CHAT_SAVED_MEMBER_LISTING_CARD_FOOTER =
  "ข้อมูลพร้อมแล้ว คุณพี่สามารถกด “พร้อมลงตลาด” เพื่อตรวจสรุปและเผยแพร่ประกาศได้เลยครับ — ตอนนี้ประกาศยังเป็นร่างและยังไม่แสดงในตลาด";

/** ไม่ใช้ชื่อไฟล์เปล่า ๆ เป็น src รูป */
export function isLikelyDisplayableImageSrc(url: string): boolean {
  const u = String(url ?? "").trim();
  if (!u) return false;
  if (u.startsWith("data:") || u.startsWith("blob:")) return true;
  if (u.startsWith("/storage/listings/")) return true;
  if (/^https?:\/\//i.test(u)) return true;
  if (!u.includes("/") && /\.(jpe?g|png|webp|gif)$/i.test(u)) return false;
  return false;
}

export function filterSavedCardImageUrls(
  listingId: string,
  imageUrls: string[] | undefined
): string[] {
  if (!Array.isArray(imageUrls)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of imageUrls) {
    const url = String(raw ?? "").trim();
    if (!url || seen.has(url)) continue;
    if (!isLikelyDisplayableImageSrc(url)) continue;
    if (!isValidListingImageUrl(url, listingId)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** รูปที่แสดงใน saved card — ใช้ URL หลัง upload ก่อน metadata แนบในแชท */
export function resolveSavedMemberListingCardImageUrls(params: {
  card: SavedMemberListingCardData;
  attachments?: ChatMessageAttachment[];
}): string[] {
  const fromCard = filterSavedCardImageUrls(params.card.listingId, params.card.imageUrls);
  if (fromCard.length > 0) return fromCard;

  const fromAttachments: string[] = [];
  for (const att of params.attachments ?? []) {
    if (att.kind !== "image") continue;
    const candidates = [
      att.imageUrl,
      att.thumbnailUrl,
      att.previewUrl,
      att.previewDataUrl?.startsWith("data:") ? att.previewDataUrl : undefined,
    ];
    for (const raw of candidates) {
      const url = String(raw ?? "").trim();
      if (!url || !isLikelyDisplayableImageSrc(url)) continue;
      if (!isValidListingImageUrl(url, params.card.listingId)) continue;
      if (!fromAttachments.includes(url)) fromAttachments.push(url);
    }
  }
  return fromAttachments;
}

export function listingImageUrlsToChatAttachments(
  urls: string[]
): ChatMessageAttachment[] {
  return urls
    .map((url) => String(url ?? "").trim())
    .filter((url) => isLikelyDisplayableImageSrc(url))
    .map((url, index) => ({
      id: `saved-listing-img-${index}`,
      kind: "image" as const,
      name: `รูปประกาศ ${index + 1}`,
      size: 0,
      mimeType: "image/jpeg",
      imageUrl: url,
    }));
}

export function buildSavedMemberListingCardData(params: {
  listingId: string;
  publicRefCode: string;
  fields: ExtractedCarFields;
  visionSummary?: VisionObservationSummary;
  marketingCopy: string;
  imageUrls: string[];
  statusLabel?: string;
}): SavedMemberListingCardData {
  return {
    listingId: params.listingId,
    publicRefCode: params.publicRefCode,
    statusLabel: params.statusLabel ?? SAVED_MEMBER_LISTING_STATUS_LABEL,
    marketingCopy: params.marketingCopy,
    fields: params.fields as Record<string, unknown>,
    visionSummary: params.visionSummary as Record<string, unknown> | undefined,
    imageUrls: filterSavedCardImageUrls(params.listingId, params.imageUrls),
  };
}

export function isMemberPublishListingChatAction(message: string): boolean {
  return message.trim() === CHAT_MEMBER_PUBLISH_LISTING_ACTION;
}

export async function appendSavedMemberListingCardMessage(
  sessionId: string,
  params: {
    card: SavedMemberListingCardData;
    intro?: string;
  }
): Promise<void> {
  const imageUrls = resolveSavedMemberListingCardImageUrls({
    card: params.card,
  });
  const cardWithUrls: SavedMemberListingCardData = {
    ...params.card,
    imageUrls,
  };
  const attachments = listingImageUrlsToChatAttachments(imageUrls);
  await useChatStore.getState().addMessage(
    sessionId,
    "ai",
    params.intro ?? CHAT_SAVED_MEMBER_LISTING_CARD_INTRO,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    attachments.length > 0 ? attachments : undefined,
    {
      isSavedMemberListingCard: true,
      savedMemberListingCard: cardWithUrls,
    },
    cardWithUrls.listingId
  );
}
