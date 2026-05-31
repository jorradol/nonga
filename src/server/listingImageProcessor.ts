import sharp from "sharp";
import {
  formatImageUploadValidationError,
  IMAGE_UPLOAD_CORRUPTED_MESSAGE,
  validateImageUploadBuffer,
} from "./imageMagicByteValidation";

export const PASTE_SOURCE_MAX_BYTES = 15 * 1024 * 1024;

const SHARP_OPTS = {
  failOn: "none" as const,
  limitInputPixels: 50_000_000,
};
export const LISTING_MAIN_MAX_WIDTH = 1600;
export const LISTING_THUMB_MAX_WIDTH = 400;
export const LISTING_MAIN_QUALITY = 82;
export const LISTING_THUMB_QUALITY = 78;

export type ProcessedImageExt = ".webp" | ".jpg";

export interface ProcessedListingImage {
  mainBuffer: Buffer;
  thumbBuffer: Buffer;
  mainExt: ProcessedImageExt;
  mainWidth: number;
  mainHeight: number;
}

function isHeicMime(mimeType: string): boolean {
  const m = mimeType.toLowerCase();
  return m.includes("heic") || m.includes("heif");
}

async function encodeMain(buffer: Buffer): Promise<{
  data: Buffer;
  ext: ProcessedImageExt;
  width: number;
  height: number;
}> {
  const meta = await sharp(buffer, SHARP_OPTS).rotate().metadata();

  try {
    const out = await sharp(buffer, SHARP_OPTS)
      .rotate()
      .resize({
        width: LISTING_MAIN_MAX_WIDTH,
        height: LISTING_MAIN_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: LISTING_MAIN_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return {
      data: out.data,
      ext: ".webp",
      width: out.info.width,
      height: out.info.height,
    };
  } catch {
    const out = await sharp(buffer, SHARP_OPTS)
      .rotate()
      .resize({
        width: LISTING_MAIN_MAX_WIDTH,
        height: LISTING_MAIN_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: LISTING_MAIN_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return {
      data: out.data,
      ext: ".jpg",
      width: out.info.width ?? meta.width ?? 0,
      height: out.info.height ?? meta.height ?? 0,
    };
  }
}

async function encodeThumb(buffer: Buffer, ext: ProcessedImageExt): Promise<Buffer> {
  const pipeline = sharp(buffer, SHARP_OPTS)
    .rotate()
    .resize({
      width: LISTING_THUMB_MAX_WIDTH,
      height: LISTING_THUMB_MAX_WIDTH,
      fit: "inside",
      withoutEnlargement: true,
    });

  if (ext === ".webp") {
    return pipeline.webp({ quality: LISTING_THUMB_QUALITY }).toBuffer();
  }
  return pipeline
    .jpeg({ quality: LISTING_THUMB_QUALITY, mozjpeg: true })
    .toBuffer();
}

/** แปลงรูปต้นฉบับ → main + thumbnail สำหรับ storage */
export async function processListingImageUpload(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<
  | { ok: true; data: ProcessedListingImage }
  | { ok: false; error: string }
> {
  if (buffer.length === 0) {
    return { ok: false, error: `${originalName}: ไฟล์ว่าง` };
  }
  if (buffer.length > PASTE_SOURCE_MAX_BYTES) {
    return {
      ok: false,
      error: `${originalName}: ไฟล์ใหญ่เกิน ${Math.round(PASTE_SOURCE_MAX_BYTES / (1024 * 1024))}MB`,
    };
  }
  if (isHeicMime(mimeType)) {
    return {
      ok: false,
      error: `${originalName}: ไฟล์ HEIC/HEIF ยังไม่รองรับ กรุณาแปลงเป็น JPG ก่อนอัปโหลด`,
    };
  }

  const magic = await validateImageUploadBuffer(buffer, mimeType);
  if (magic.ok === false) {
    return {
      ok: false,
      error: formatImageUploadValidationError(originalName, magic.message),
    };
  }

  try {
    const main = await encodeMain(buffer);
    const thumbBuffer = await encodeThumb(buffer, main.ext);
    return {
      ok: true,
      data: {
        mainBuffer: main.data,
        thumbBuffer,
        mainExt: main.ext,
        mainWidth: main.width,
        mainHeight: main.height,
      },
    };
  } catch {
    return {
      ok: false,
      error: formatImageUploadValidationError(
        originalName,
        IMAGE_UPLOAD_CORRUPTED_MESSAGE
      ),
    };
  }
}
