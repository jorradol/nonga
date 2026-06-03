import type { ChatMessageAttachment } from "../../types";
import { listingImageUrlsToChatAttachments } from "./chatSavedMemberListing";

export interface DealerChatImageUploadResult {
  storedUrls: string[];
  failed?: Array<{ name: string; error: string }>;
}

export function buildDealerChatImageUploadNote(
  totalCount: number,
  uploadResult: DealerChatImageUploadResult
): string {
  const uploadedCount = uploadResult.storedUrls.length;
  const failedCount = uploadResult.failed?.length ?? 0;
  if (totalCount <= 0) return "";
  if (uploadedCount === totalCount) {
    return `\n\nแนบรูปภาพแล้ว ${uploadedCount} รูปครับ`;
  }
  if (uploadedCount > 0) {
    return `\n\nบันทึก draft สำเร็จ แต่อัปโหลดรูปสำเร็จ ${uploadedCount}/${totalCount} รูป — กรุณาตรวจสอบรูปในหน้าประกาศที่ยังไม่ลงขาย`;
  }
  if (failedCount > 0 || totalCount > 0) {
    return `\n\nแนบรูปไม่สำเร็จทั้งหมด ${totalCount} รูป กรุณาลองอัปโหลดใหม่ในหน้าประกาศที่ยังไม่ลงขาย`;
  }
  return "";
}

export function attachmentsForSavedDealerDraft(
  uploadedImageUrls: string[] | undefined,
  fallback?: ChatMessageAttachment[]
): ChatMessageAttachment[] | undefined {
  if (uploadedImageUrls?.length) {
    return listingImageUrlsToChatAttachments(uploadedImageUrls);
  }
  return fallback;
}
