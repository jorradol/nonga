import type { ChatMessage } from "../../types";
import type { ExtractedCarFields } from "../../services/ai/chat/sellIntentParser";

export interface PendingListingContext {
  draftMessage: ChatMessage;
  fields: ExtractedCarFields;
  label: string;
}

function listingLabel(fields: ExtractedCarFields): string {
  return [fields.brand, fields.model].filter(Boolean).join(" ").trim() || "รถคันนี้";
}

export function findLatestPendingListingContext(
  messages: ChatMessage[]
): PendingListingContext | null {
  const draftMessage = messages
    .slice()
    .reverse()
    .find((m) => m.isDraftPreview && m.draftFields);
  if (!draftMessage?.draftFields) return null;
  const fields = draftMessage.draftFields as ExtractedCarFields;
  return {
    draftMessage,
    fields,
    label: listingLabel(fields),
  };
}

export function findLatestSavedDraftId(messages: ChatMessage[]): string | null {
  return (
    messages
      .slice()
      .reverse()
      .find((m) => m.savedDraftId)?.savedDraftId ?? null
  );
}

export function isAddImagesToCurrentListingIntent(message: string): boolean {
  const t = message.trim().toLowerCase();
  if (!t) return true;
  return /รูป|ภาพ|photo|image|attach|upload|อัปโหลด|เพิ่ม/.test(t);
}

export function buildPendingListingImageAckReply(
  count: number,
  context: PendingListingContext
): string {
  if (count <= 1) {
    return `ได้รับรูปภาพรถแล้วครับ น้องเอจะนำรูปนี้ไปใช้กับประกาศ ${context.label} ที่กำลังเตรียมไว้ให้นะครับ ตอนนี้ข้อมูลพร้อมบันทึกประกาศแล้ว ปังปุริเย่!`;
  }
  return `ได้รับรูปภาพรถ ${count} รูปแล้วครับ น้องเอจะผูกภาพเหล่านี้กับประกาศ ${context.label} ที่กำลังเตรียมไว้ให้ครับ ตอนนี้สามารถกดบันทึกประกาศได้เลย ปังปุริเย่!`;
}

export function buildSavedDraftImageAckReply(count: number): string {
  if (count <= 1) {
    return "ได้รับรูปภาพรถแล้วครับ น้องเอเพิ่มรูปเข้าไปในประกาศที่บันทึกไว้ให้แล้วครับ ปังปุริเย่!";
  }
  return `ได้รับรูปภาพรถ ${count} รูปแล้วครับ น้องเอเพิ่มรูปเข้าไปในประกาศที่บันทึกไว้ให้แล้วครับ ปังปุริเย่!`;
}

export function buildNoListingImageAckReply(count: number): string {
  if (count <= 1) {
    return "ได้รับรูปแล้วครับ ลุงต้องการลงประกาศรถคันนี้ใช่ไหมครับ ช่วยพิมพ์ยี่ห้อ รุ่น ปี ราคา และเลขไมล์เพิ่มได้เลยครับ";
  }
  return `ได้รับรูป ${count} รูปแล้วครับ ลุงต้องการลงประกาศรถคันนี้ใช่ไหมครับ ช่วยพิมพ์ยี่ห้อ รุ่น ปี ราคา และเลขไมล์เพิ่มได้เลยครับ`;
}
