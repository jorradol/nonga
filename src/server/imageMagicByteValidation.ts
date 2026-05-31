import { fileTypeFromBuffer } from "file-type";

/** User-facing message — no stack/token/file content */
export const IMAGE_UPLOAD_UNSUPPORTED_MESSAGE =
  "ไฟล์นี้ไม่ใช่รูปภาพที่ระบบรองรับครับ กรุณาอัปโหลดไฟล์ JPG, PNG หรือ WebP";

export const IMAGE_UPLOAD_CORRUPTED_MESSAGE =
  "ไฟล์รูปเสียหายหรืออ่านไม่ได้ กรุณาลองใช้ไฟล์อื่น";

export const ALLOWED_IMAGE_UPLOAD_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function normalizeImageUploadMime(mimeType: string): string {
  const mime = mimeType.toLowerCase().split(";")[0].trim();
  if (mime === "image/jpg") return "image/jpeg";
  return mime;
}

export function isAllowedImageUploadMime(mimeType: string): boolean {
  return ALLOWED_IMAGE_UPLOAD_MIMES.has(normalizeImageUploadMime(mimeType));
}

function mimeFamilyMatches(detected: string, claimed: string): boolean {
  return normalizeImageUploadMime(detected) === normalizeImageUploadMime(claimed);
}

export function formatImageUploadValidationError(
  fileName: string,
  message: string
): string {
  const label = String(fileName ?? "").trim();
  return label ? `${label}: ${message}` : message;
}

/** Magic-byte + claimed MIME guard before sharp/storage processing */
export async function validateImageUploadBuffer(
  buffer: Buffer,
  claimedMimeType: string
): Promise<{ ok: true; detectedMime: string } | { ok: false; message: string }> {
  if (buffer.length === 0) {
    return { ok: false, message: IMAGE_UPLOAD_UNSUPPORTED_MESSAGE };
  }

  const claimed = normalizeImageUploadMime(claimedMimeType);
  if (!isAllowedImageUploadMime(claimed)) {
    return { ok: false, message: IMAGE_UPLOAD_UNSUPPORTED_MESSAGE };
  }

  if (/heic|heif/.test(claimed)) {
    return { ok: false, message: IMAGE_UPLOAD_UNSUPPORTED_MESSAGE };
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !isAllowedImageUploadMime(detected.mime)) {
    return { ok: false, message: IMAGE_UPLOAD_UNSUPPORTED_MESSAGE };
  }

  if (!mimeFamilyMatches(detected.mime, claimed)) {
    return { ok: false, message: IMAGE_UPLOAD_UNSUPPORTED_MESSAGE };
  }

  return { ok: true, detectedMime: detected.mime };
}
