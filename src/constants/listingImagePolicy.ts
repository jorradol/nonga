import { LISTING_IMAGE_UPLOAD_BATCH_SIZE as UPLOAD_BATCH_FROM_UTIL } from "../utils/listingImageStorage";

/** จำนวนรูปสูงสุดต่อประกาศ (chat-first v5.4) */
export const LISTING_MAX_IMAGES_PER_LISTING = 10;

/** ต้องมีอย่างน้อย 1 รูปก่อน publish */
export const LISTING_MIN_IMAGES_FOR_PUBLISH = 1;

/** snapshot preview หลัง login — พยายาม persist สูงสุดเท่านี้ (byte budget แยก) */
export const SNAPSHOT_MAX_PREVIEW_IMAGES = LISTING_MAX_IMAGES_PER_LISTING;

/** thumbnail บน pending/saved card ในแชท */
export const LISTING_CARD_MAX_THUMBNAILS = LISTING_MAX_IMAGES_PER_LISTING;

/** re-export — batch upload ยัง 2 ต่อ request */
export const LISTING_IMAGE_UPLOAD_BATCH_SIZE = UPLOAD_BATCH_FROM_UTIL;

export const CHAT_LISTING_IMAGE_CAP_TRUNCATED_NOTE =
  "หมายเหตุ: ระบบบันทึกได้สูงสุด 10 รูปต่อประกาศ — ใช้รูปแรกตามลำดับที่แนบ รูปที่เกินไม่ถูกบันทึกครับ";

export function buildChatListingImageCapTruncatedNote(
  totalBeforeCap: number,
  max = LISTING_MAX_IMAGES_PER_LISTING
): string {
  return `${CHAT_LISTING_IMAGE_CAP_TRUNCATED_NOTE} (แนบรวม ${totalBeforeCap} รูป ใช้ ${max} รูป)`;
}
