import type { ListingImageFileInput } from "./listingImageUploadBody";
import {
  PASTE_SOURCE_MAX_BYTES,
  processListingImageUpload,
} from "./listingImageProcessor";
import { saveProcessedListingImagePair } from "./listingImageStorage";

export { PASTE_SOURCE_MAX_BYTES as PASTE_UPLOAD_MAX_DECODED_BYTES };

const PASTE_MAX_FILES = 12;
const SAFE_LISTING_ID = /^draft-import-[0-9]+-d\d+$/;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const HEIC_MIME = /image\/(heic|heif)/i;

function stripB64(data: string): string {
  return String(data).replace(/^data:image\/[^;]+;base64,/, "");
}

export interface PasteUploadFileItem {
  buffer: Buffer;
  mimeType: string;
  name: string;
}

export interface PasteUploadFileFailure {
  name: string;
  error: string;
}

export function decodeSinglePasteUploadFile(
  item: ListingImageFileInput,
  index: number
):
  | { ok: true; data: PasteUploadFileItem }
  | { ok: false; failure: PasteUploadFileFailure } {
  const name = String(item.name ?? `upload-${index + 1}`);
  const mimeType = String(item.mimeType ?? "image/jpeg")
    .toLowerCase()
    .split(";")[0]
    .trim();

  if (HEIC_MIME.test(mimeType)) {
    return {
      ok: false,
      failure: {
        name,
        error: "ไฟล์ HEIC/HEIF ยังไม่รองรับ กรุณาแปลงเป็น JPG ก่อนอัปโหลด",
      },
    };
  }

  if (!ALLOWED_MIME.has(mimeType)) {
    return {
      ok: false,
      failure: {
        name,
        error: "ประเภทไฟล์ไม่รองรับ — ใช้ .jpg .jpeg .png .webp เท่านั้น",
      },
    };
  }

  const b64 = stripB64(String(item.dataBase64 ?? ""));
  if (!b64) {
    return { ok: false, failure: { name, error: "ไม่มีข้อมูลรูป" } };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return { ok: false, failure: { name, error: "อ่านไฟล์ไม่ได้" } };
  }

  if (buffer.length === 0) {
    return { ok: false, failure: { name, error: "ไฟล์ว่าง" } };
  }

  if (buffer.length > PASTE_SOURCE_MAX_BYTES) {
    return {
      ok: false,
      failure: {
        name,
        error: `ไฟล์ใหญ่เกิน ${Math.round(PASTE_SOURCE_MAX_BYTES / (1024 * 1024))}MB`,
      },
    };
  }

  return { ok: true, data: { buffer, mimeType, name } };
}

export function decodePasteUploadFiles(
  files: unknown
):
  | { ok: true; items: PasteUploadFileItem[]; failed: PasteUploadFileFailure[] }
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

  const items: PasteUploadFileItem[] = [];
  const failed: PasteUploadFileFailure[] = [];

  for (let i = 0; i < list.length; i++) {
    const decoded = decodeSinglePasteUploadFile(list[i] as ListingImageFileInput, i);
    if (decoded.ok === false) {
      failed.push(decoded.failure);
    } else {
      items.push(decoded.data);
    }
  }

  return { ok: true, items, failed };
}

export interface PasteUploadedImagesResult {
  storedUrls: string[];
  thumbnails: string[];
  warnings: string[];
  failed: PasteUploadFileFailure[];
}

export async function persistPasteUploadedImages(
  listingId: string,
  files: unknown
): Promise<
  | ({ ok: true } & PasteUploadedImagesResult)
  | { ok: false; status: number; message: string }
> {
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
  const thumbnails: string[] = [];
  const warnings: string[] = [...decoded.failed.map((f) => `${f.name}: ${f.error}`)];
  const failed: PasteUploadFileFailure[] = [...decoded.failed];

  for (const { buffer, mimeType, name } of decoded.items) {
    const processed = await processListingImageUpload(buffer, mimeType, name);
    if (processed.ok === false) {
      warnings.push(processed.error);
      failed.push({ name, error: processed.error.replace(`${name}: `, "") });
      continue;
    }

    const saved = saveProcessedListingImagePair(
      listingId,
      processed.data.mainBuffer,
      processed.data.thumbBuffer,
      processed.data.mainExt,
      name
    );
    if (saved.ok === false) {
      warnings.push(`${name}: ${saved.error}`);
      failed.push({ name, error: saved.error });
      continue;
    }

    storedUrls.push(saved.storedUrl);
    thumbnails.push(saved.thumbnailUrl);
  }

  return { ok: true, storedUrls, thumbnails, warnings, failed };
}
