import type { ChatMessageAttachment } from "../../types";

/** ตอบกลับหลังผู้ใช้แนบไฟล์ (ไม่เรียก Gemini) */
export function buildAttachmentAckReply(
  attachments: ChatMessageAttachment[],
  hasText: boolean
): string | null {
  const spreadsheets = attachments.filter((a) => a.kind === "spreadsheet");
  const pdfs = attachments.filter((a) => a.kind === "pdf");
  const images = attachments.filter((a) => a.kind === "image");

  const parts: string[] = [];

  if (images.length > 0) {
    parts.push(
      images.length === 1
        ? "ได้รับรูปรถแล้วครับ"
        : `ได้รับรูปรถ ${images.length} รูปแล้วครับ`
    );
  }
  if (spreadsheets.length > 0) {
    parts.push("ได้รับไฟล์รายการรถแล้วครับ รอบต่อไปน้องเอจะช่วยนำเข้าไฟล์นี้ได้");
  }
  if (pdfs.length > 0) {
    parts.push("ได้รับไฟล์เอกสารแล้วครับ");
  }

  if (parts.length === 0) return null;
  if (hasText && images.length > 0 && spreadsheets.length === 0 && pdfs.length === 0) {
    return null;
  }
  if (hasText && spreadsheets.length === 0 && pdfs.length === 0 && images.length === 0) {
    return null;
  }
  if (hasText && images.length > 0) {
    return parts.filter((p) => !p.startsWith("ได้รับรูป")).join("\n") || null;
  }
  return parts.join("\n");
}
