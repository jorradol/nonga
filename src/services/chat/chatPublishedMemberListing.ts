import type {
  ChatMessage,
  PublishedMemberListingCardData,
  SavedMemberListingCardData,
} from "../../types";
import { normalizeSavedMemberListingCardData } from "./publishMemberListingFromChat";

export const PUBLISHED_MEMBER_LISTING_STATUS_LABEL = "เผยแพร่แล้ว";

export function normalizePublishedMemberListingCardData(
  raw: Partial<PublishedMemberListingCardData> | null | undefined
): PublishedMemberListingCardData | null {
  const saved = normalizeSavedMemberListingCardData(
    raw as Partial<SavedMemberListingCardData> | null | undefined
  );
  if (!saved) return null;
  return {
    ...saved,
    statusLabel: PUBLISHED_MEMBER_LISTING_STATUS_LABEL,
  };
}

export function buildPublishedMemberListingCardData(
  saved: SavedMemberListingCardData
): PublishedMemberListingCardData {
  return {
    listingId: saved.listingId,
    publicRefCode: saved.publicRefCode,
    statusLabel: PUBLISHED_MEMBER_LISTING_STATUS_LABEL,
    marketingCopy: saved.marketingCopy,
    fields: saved.fields,
    ...(saved.visionSummary ? { visionSummary: saved.visionSummary } : {}),
    imageUrls: [...saved.imageUrls],
  };
}

/** หา saved card ใน history ที่ตรง listingId — ไม่ fetch backend */
export function resolveSavedCardForPublishedListing(
  messages: ChatMessage[],
  listingId: string
): SavedMemberListingCardData | null {
  const trimmedId = listingId.trim();
  if (!trimmedId) return null;

  for (const message of [...messages].reverse()) {
    const card = normalizeSavedMemberListingCardData(message.savedMemberListingCard);
    if (!card || card.listingId !== trimmedId) continue;
    if (message.isSavedMemberListingCard || message.savedMemberListingCard) {
      return card;
    }
  }

  return null;
}
