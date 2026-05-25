import { createImageStorageRepository } from "./repositories/imageStorageRepository";

export const MAX_LISTING_IMAGE_FILES = 12;
/** ขนาดไฟล์หลัง decode (ต่อรูป) */
export const MAX_LISTING_IMAGE_DECODED_BYTES = 3 * 1024 * 1024;

export interface ListingImageFileInput {
  mimeType?: string;
  dataBase64?: string;
  name?: string;
  originalFileName?: string;
}

export function stripDataUrlPrefix(b64: string): string {
  return String(b64).replace(/^data:image\/[^;]+;base64,/, "");
}

export function decodeListingImageFiles(
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
  if (list.length > MAX_LISTING_IMAGE_FILES) {
    return {
      ok: false,
      status: 400,
      message: `อัปโหลดได้ไม่เกิน ${MAX_LISTING_IMAGE_FILES} รูป`,
    };
  }

  const items: Array<{ buffer: Buffer; mimeType: string; name: string }> = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i] as ListingImageFileInput;
    const mimeType = String(item.mimeType ?? "image/jpeg");
    const b64 = stripDataUrlPrefix(String(item.dataBase64 ?? ""));
    if (!b64) {
      return {
        ok: false,
        status: 400,
        message: `รูปที่ ${i + 1} ไม่มีข้อมูล`,
      };
    }
    let buffer: Buffer;
    try {
      buffer = Buffer.from(b64, "base64");
    } catch {
      return {
        ok: false,
        status: 400,
        message: `รูปที่ ${i + 1} อ่านไม่ได้`,
      };
    }
    if (buffer.length === 0) {
      return {
        ok: false,
        status: 400,
        message: `รูปที่ ${i + 1} ว่าง`,
      };
    }
    if (buffer.length > MAX_LISTING_IMAGE_DECODED_BYTES) {
      return {
        ok: false,
        status: 413,
        error: "PAYLOAD_TOO_LARGE",
        message:
          "ข้อมูลรูปภาพใหญ่เกินไป กรุณาลดจำนวนรูปหรือขนาดรูป แล้วลองใหม่อีกครั้ง",
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

export async function persistListingImageUploads(
  dealerId: string,
  carId: string,
  items: Array<{ buffer: Buffer; mimeType: string; name: string }>
): Promise<
  { ok: true; storedUrls: string[] } | { ok: false; status: number; message: string }
> {
  const imageStorage = createImageStorageRepository();
  const storedUrls: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const { buffer, mimeType, name } = items[i];
    try {
      const saved = await imageStorage.uploadListingImage(dealerId, carId, {
        buffer,
        mimeType,
        originalFileName: name,
        seed: name,
        sortOrder: i,
        targetType: "listing",
      });
      storedUrls.push(saved.storedUrl);
    } catch (err: unknown) {
      return {
        ok: false,
        status: 400,
        message: err instanceof Error ? err.message : "บันทึกรูปไม่สำเร็จ",
      };
    }
  }
  return { ok: true, storedUrls };
}
