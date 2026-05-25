import type { ChatMessageAttachment } from "../../types";

export const CHAT_IMAGE_ATTACHMENT_V1_ENABLED = true;
export const CHAT_IMAGE_ATTACHMENT_MAX_FILES = 10;
export const CHAT_IMAGE_ATTACHMENT_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const CHAT_IMAGE_ATTACHMENT_MAX_SIDE = 1280;
export const CHAT_IMAGE_ATTACHMENT_QUALITY = 0.78;
export const CHAT_IMAGE_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export const CHAT_IMAGE_ATTACHMENT_TOO_MANY =
  "แนบรูปได้สูงสุด 10 รูปต่อครั้งครับ";
export const CHAT_IMAGE_ATTACHMENT_UNSUPPORTED =
  "ไฟล์รูปนี้ยังไม่รองรับครับ กรุณาใช้ JPG, PNG หรือ WebP";
export const CHAT_IMAGE_ATTACHMENT_TOO_LARGE =
  "ไฟล์รูปมีขนาดใหญ่เกินไปครับ กรุณาเลือกรูปไม่เกิน 15MB";
export const CHAT_IMAGE_ATTACHMENT_OPTIMIZE_FAILED =
  "เตรียมรูปไม่สำเร็จครับ กรุณาลองเลือกรูปใหม่อีกครั้ง";

export interface PendingChatImageAttachment {
  id: string;
  kind: "image";
  originalFileName: string;
  fileName: string;
  optimizedFile: File;
  previewUrl: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

export interface StoredChatImageAttachment {
  id: string;
  messageId: string;
  sessionId: string;
  file: File;
  metadata: ChatMessageAttachment;
}

export interface DraftImageMetadata {
  dealerId: string;
  draftId: string;
  sessionId?: string;
  fileName: string;
  originalFileName?: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  imagePath: string;
  imageUrl: string;
  thumbnailPath: string;
  thumbnailUrl: string;
  createdAt: string;
  sortOrder: number;
  source?: "chat-image-attachment-v1" | "draft-upload";
}
