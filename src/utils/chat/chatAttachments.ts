import type { ChatMessageAttachment, ChatMessageAttachmentKind } from "../../types";

export const CHAT_MAX_FILES = 10;
export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_DOC_MAX_BYTES = 20 * 1024 * 1024;

export const MSG_FILE_TOO_LARGE = "ไฟล์มีขนาดใหญ่เกินไปครับ กรุณาเลือกไฟล์ใหม่";
export const MSG_TOO_MANY_FILES = "แนบไฟล์ได้สูงสุด 10 ไฟล์ต่อครั้งครับ";
export const MSG_UNSUPPORTED_TYPE = "ไฟล์ชนิดนี้ยังไม่รองรับครับ";
export const MSG_UPLOAD_FAIL = "อัปโหลดไฟล์ไม่สำเร็จครับ กรุณาลองใหม่อีกครั้ง";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const SPREADSHEET_EXT = new Set([".csv", ".xlsx"]);
const PDF_EXT = new Set([".pdf"]);

const BLOCKED_EXT = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".js",
  ".sh",
  ".msi",
  ".dll",
  ".scr",
  ".ps1",
  ".vbs",
  ".com",
]);

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const SPREADSHEET_MIME = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const PDF_MIME = new Set(["application/pdf"]);

export function getFileExtension(name: string): string {
  const lower = name.toLowerCase().trim();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

export function classifyChatAttachment(file: File): ChatMessageAttachmentKind | null {
  const ext = getFileExtension(file.name);
  if (BLOCKED_EXT.has(ext)) return null;
  if (IMAGE_EXT.has(ext) && (!file.type || IMAGE_MIME.has(file.type.toLowerCase()))) {
    return "image";
  }
  if (SPREADSHEET_EXT.has(ext)) {
    if (file.type && !SPREADSHEET_MIME.has(file.type.toLowerCase()) && file.type !== "application/octet-stream") {
      return SPREADSHEET_EXT.has(ext) ? "spreadsheet" : null;
    }
    return "spreadsheet";
  }
  if (PDF_EXT.has(ext) && (!file.type || PDF_MIME.has(file.type.toLowerCase()))) {
    return "pdf";
  }
  if (IMAGE_EXT.has(ext)) return "image";
  if (SPREADSHEET_EXT.has(ext)) return "spreadsheet";
  if (PDF_EXT.has(ext)) return "pdf";
  return null;
}

export function maxBytesForKind(kind: ChatMessageAttachmentKind): number {
  return kind === "image" ? CHAT_IMAGE_MAX_BYTES : CHAT_DOC_MAX_BYTES;
}

export function validateChatAttachmentFile(file: File): ChatMessageAttachmentKind {
  const kind = classifyChatAttachment(file);
  if (!kind) {
    throw new Error(MSG_UNSUPPORTED_TYPE);
  }
  const max = maxBytesForKind(kind);
  if (file.size > max) {
    throw new Error(MSG_FILE_TOO_LARGE);
  }
  if (file.size === 0) {
    throw new Error(MSG_UNSUPPORTED_TYPE);
  }
  return kind;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAttachmentsSummary(attachments: ChatMessageAttachment[]): string {
  const images = attachments.filter((a) => a.kind === "image");
  const lines: string[] = [];
  if (images.length > 0) {
    lines.push(`รูปรถ ${images.length} รูป`);
  }
  for (const a of attachments) {
    if (a.kind !== "image") {
      lines.push(`ไฟล์ ${a.name}`);
    }
  }
  return lines.join("\n");
}

export function buildAttachmentMeta(
  file: File,
  kind: ChatMessageAttachmentKind,
  previewDataUrl?: string
): ChatMessageAttachment {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    size: file.size,
    kind,
    mimeType: file.type || "application/octet-stream",
    ...(previewDataUrl ? { previewDataUrl } : {}),
  };
}

export async function createChatImageThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return undefined;
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const max = 160;
        let { width, height } = img;
        const scale = Math.min(1, max / Math.max(width, height, 1));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        resolve(undefined);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    img.src = url;
  });
}

export const CHAT_FILE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.csv,.xlsx,.pdf,image/jpeg,image/png,image/webp,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
