import type { ListingImageFileInput } from "./listingImageUploadBody";
import {
  PASTE_SOURCE_MAX_BYTES,
  processListingImageUpload,
} from "./listingImageProcessor";
import {
  createImageStorageRepository,
  type ListingImageTargetType,
} from "./repositories/imageStorageRepository";

export { PASTE_SOURCE_MAX_BYTES as PASTE_UPLOAD_MAX_DECODED_BYTES };

const PASTE_MAX_FILES = 12;
/** draft-* และ car-* (published listing) */
const SAFE_LISTING_ID = /^(?:draft(?:-import-[0-9]+-d\d+|-[0-9]+)|car-[0-9]+)$/;

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
  originalFileName?: string;
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

  const originalFileName =
    typeof item.originalFileName === "string" && item.originalFileName.trim()
      ? item.originalFileName.trim()
      : undefined;

  return { ok: true, data: { buffer, mimeType, name, originalFileName } };
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
  metadata: Array<{
    fileName: string;
    originalFileName: string;
    mimeType: string;
    width: number;
    height: number;
    size: number;
    imagePath: string;
    imageUrl: string;
    thumbnailPath: string;
    thumbnailUrl: string;
    imageId?: string;
    storagePath?: string;
    publicUrl?: string;
    createdAt: string;
    sortOrder: number;
  }>;
  warnings: string[];
  failed: PasteUploadFileFailure[];
}

export function persistPasteUploadedImages(
  listingId: string,
  files: unknown
): Promise<
  | ({ ok: true } & PasteUploadedImagesResult)
  | { ok: false; status: number; message: string }
>;
export function persistPasteUploadedImages(
  dealerId: string,
  listingId: string,
  files: unknown
): Promise<
  | ({ ok: true } & PasteUploadedImagesResult)
  | { ok: false; status: number; message: string }
>;
export async function persistPasteUploadedImages(
  dealerIdOrListingId: string,
  listingIdOrFiles: string | unknown,
  maybeFiles?: unknown
): Promise<
  | ({ ok: true } & PasteUploadedImagesResult)
  | { ok: false; status: number; message: string }
> {
  const dealerId =
    typeof listingIdOrFiles === "string" && maybeFiles !== undefined
      ? dealerIdOrListingId
      : "legacy-dealer";
  const listingId =
    typeof listingIdOrFiles === "string" && maybeFiles !== undefined
      ? listingIdOrFiles
      : dealerIdOrListingId;
  const files =
    typeof listingIdOrFiles === "string" && maybeFiles !== undefined
      ? maybeFiles
      : listingIdOrFiles;

  if (!SAFE_LISTING_ID.test(listingId)) {
    return { ok: false, status: 400, message: "รหัสประกาศไม่ถูกต้อง" };
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
  const metadata: PasteUploadedImagesResult["metadata"] = [];
  const warnings: string[] = [...decoded.failed.map((f) => `${f.name}: ${f.error}`)];
  const failed: PasteUploadFileFailure[] = [...decoded.failed];
  const imageStorage = createImageStorageRepository();
  const targetType: ListingImageTargetType = listingId.startsWith("draft-")
    ? "draft"
    : "listing";

  for (const { buffer, mimeType, name, originalFileName } of decoded.items) {
    const processed = await processListingImageUpload(buffer, mimeType, name);
    if (processed.ok === false) {
      warnings.push(processed.error);
      failed.push({ name, error: processed.error.replace(`${name}: `, "") });
      continue;
    }

    const saved = await imageStorage.uploadListingImagePair(
      dealerId,
      listingId,
      {
        mainBuffer: processed.data.mainBuffer,
        thumbBuffer: processed.data.thumbBuffer,
        ext: processed.data.mainExt,
        mimeType: processed.data.mainExt === ".webp" ? "image/webp" : "image/jpeg",
        width: processed.data.mainWidth,
        height: processed.data.mainHeight,
        originalFileName: originalFileName ?? name,
        seed: name,
        sortOrder: metadata.length,
        targetType,
      }
    ).catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "บันทึกรูปไม่สำเร็จ",
    }));
    if ("error" in saved) {
      warnings.push(`${name}: ${saved.error}`);
      failed.push({ name, error: saved.error });
      continue;
    }

    storedUrls.push(saved.storedUrl);
    if (saved.thumbnailUrl) thumbnails.push(saved.thumbnailUrl);
    const resolvedOriginal =
      saved.metadata.originalFileName ?? originalFileName ?? name;
    metadata.push({
      imageId: saved.metadata.imageId,
      fileName: saved.metadata.fileName,
      originalFileName: resolvedOriginal,
      mimeType: saved.metadata.mimeType,
      width: saved.metadata.width,
      height: saved.metadata.height,
      size: saved.metadata.size,
      storagePath: saved.metadata.storagePath,
      publicUrl: saved.metadata.publicUrl,
      imagePath: saved.metadata.imagePath,
      imageUrl: saved.metadata.imageUrl,
      thumbnailPath: saved.metadata.thumbnailPath ?? "",
      thumbnailUrl: saved.metadata.thumbnailUrl ?? "",
      createdAt: saved.metadata.createdAt,
      sortOrder: saved.metadata.sortOrder,
    });
  }

  return { ok: true, storedUrls, thumbnails, metadata, warnings, failed };
}
