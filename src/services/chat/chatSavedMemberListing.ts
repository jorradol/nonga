import type {
  ChatMessageAttachment,
  SavedMemberListingCardData,
} from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../ai/chat/chatPrecheckLayer";
import { useChatStore } from "../../stores/chat/chatStore";

export const CHAT_SAVED_MEMBER_LISTING_CARD_INTRO =
  "บันทึกประกาศร่างเรียบร้อยแล้วครับ ประกาศนี้ยังไม่เผยแพร่ในตลาด — ตรวจทานข้อมูลในการ์ดด้านล่างได้เลย หรือไปต่อที่ “ประกาศของฉัน” เมื่อพร้อม";

export const SAVED_MEMBER_LISTING_STATUS_LABEL =
  "รอตรวจทาน / ยังไม่ลงตลาด";

export const CHAT_MEMBER_PUBLISH_LISTING_ACTION = "พร้อมลงตลาด";

export const CHAT_MEMBER_PUBLISH_COMING_SOON_ACK =
  "ฟีเจอร์ลงตลาดจากแชทจะเปิดในรอบถัดไปครับ ตอนนี้ประกาศถูกบันทึกเป็นร่างแล้ว — ยังไม่แสดงในตลาด ตรวจทานและแก้ไขได้ที่ “ประกาศของฉัน” ก่อนได้เลย";

export const CHAT_SAVED_MEMBER_LISTING_CARD_FOOTER =
  "ปุ่ม “พร้อมลงตลาด” จะเปิดในรอบถัดไป — ตอนนี้ประกาศยังเป็นร่างและยังไม่แสดงในตลาด";

export function listingImageUrlsToChatAttachments(
  urls: string[]
): ChatMessageAttachment[] {
  return urls.map((url, index) => ({
    id: `saved-listing-img-${index}`,
    kind: "image",
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
    imageUrls: params.imageUrls,
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
  const attachments = listingImageUrlsToChatAttachments(params.card.imageUrls);
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
      savedMemberListingCard: params.card,
    },
    params.card.listingId
  );
}
