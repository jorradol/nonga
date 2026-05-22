import type { ListingImageFileInput } from "./listingImageUploadBody";
import { persistListingImageUploads } from "./listingImageUploadBody";
import { saveListingImageUpload } from "./listingImageStorage";
import { createThumbnailSiblingFiles } from "./pasteImageImportService";

export const PASTE_UPLOAD_MAX_DECODED_BYTES = 5 * 1024 * 1024;
const PASTE_MAX_FILES = 12;
const SAFE_LISTING_ID = /^draft-import-[0-9]+-d\d+$/;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function stripB64(data: string): string {
  return String(data).replace(/^data:image\/[^;]+;base64,/, "");
}

export function decodePasteUploadFiles(
  files: unknown
):
  | {
      ok: true;
      items: Array<{ buffer: Buffer; mimeType: string; name: string }>;
    }
  | { ok: false; status: number; message: string; error?: string } {
  const list = Array.isArray(files) ? files : [];
  if (list.length === 0) {
    return { ok: false, status: 400, message: "ไม่มีไฟล์รูป" };
  }
  if (list.length > PASTE_MAX_FILES) {
    return {
      ok: false,
      status: 400,
      message: `อัปโหลดได้ไม่เกิน ${PASTE_MAX_FILES} รูป`,
    };
  }

  const items: Array<{ buffer: Buffer; mimeType: string; name: string }> = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i] as ListingImageFileInput;
    const mimeType = String(item.mimeType ?? "image/jpeg")
      .toLowerCase()
      .split(";")[0]
      .trim();
    if (!ALLOWED_MIME.has(mimeType)) {
      return {
        ok: false,
        status: 400,
        message: `รูปที่ ${i + 1}: ประเภทไฟล์ไม่รองรับ`,
      };
    }
    const b64 = stripB64(String(item.dataBase64 ?? ""));
    if (!b64) {
      return { ok: false, status: 400, message: `รูปที่ ${i + 1} ไม่มีข้อมูล` };
    }
    let buffer: Buffer;
    try {
      buffer = Buffer.from(b64, "base64");
    } catch {
      return { ok: false, status: 400, message: `รูปที่ ${i + 1} อ่านไม่ได้` };
    }
    if (buffer.length === 0) {
      return { ok: false, status: 400, message: `รูปที่ ${i + 1} ว่าง` };
    }
    if (buffer.length > PASTE_UPLOAD_MAX_DECODED_BYTES) {
      return {
        ok: false,
        status: 413,
        error: "PAYLOAD_TOO_LARGE",
        message: `รูปที่ ${i + 1} ใหญ่เกิน 5MB`,
      };
    }
    items.push({
      buffer,
      mimeType,
      name: String(item.name ?? `upload-${i}`),
    });
  }

  return { ok: true, items };
}

export function persistPasteUploadedImages(
  listingId: string,
  files: unknown
):
  | { ok: true; storedUrls: string[]; thumbnails: string[] }
  | { ok: false; status: number; message: string } {
  if (!SAFE_LISTING_ID.test(listingId)) {
    return { ok: false, status: 400, message: "รหัส Draft ไม่ถูกต้อง" };
  }

  const decoded = decodePasteUploadFiles(files);
  if (decoded.ok === false) {
    return {
      ok: false,
      status: decoded.status,
      message: decoded.message,
    };
  }

  const storedUrls: string[] = [];
  for (let i = 0; i < decoded.items.length; i++) {
    const { buffer, mimeType, name } = decoded.items[i];
    const saved = saveListingImageUpload(listingId, buffer, mimeType, name);
    if (saved.ok === false) {
      return { ok: false, status: 400, message: saved.error };
    }
    storedUrls.push(saved.storedUrl);
  }

  const thumbnails = createThumbnailSiblingFiles(listingId, storedUrls);

  return { ok: true, storedUrls, thumbnails };
}
