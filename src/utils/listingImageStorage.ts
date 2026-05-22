/**
 * จัดการรูปสำหรับ mock/localStorage/API — ห้ามส่ง base64 ไปเซิร์ฟเวอร์
 */

const MAX_API_PAYLOAD_BYTES = 480_000;
/** POST /api/cars/:id/images — ต่อคำขอ (หลัง compress + batch) */
export const MAX_LISTING_IMAGE_UPLOAD_REQUEST_BYTES = 3_500_000;
export const LISTING_IMAGE_UPLOAD_BATCH_SIZE = 2;
const MAX_GALLERY_IMAGES = 12;
const MAX_API_DESCRIPTION_CHARS = 4000;

import {
  LISTING_PLACEHOLDER_IMAGE,
  sanitizeListingImagesForId,
} from "./listingImages";

export function isRemoteImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isDataImageUrl(url: string): boolean {
  return url.startsWith("data:image") || url.startsWith("blob:");
}

/** URL สำหรับ API / localStorage listing — ไม่มี data: เด็ดขาด */
export function toListingStorageImageUrl(url: string): string {
  if (!url?.trim()) return LISTING_PLACEHOLDER_IMAGE;
  if (isRemoteImageUrl(url)) return url;
  return LISTING_PLACEHOLDER_IMAGE;
}

export function sanitizeGalleryForStorage(
  images: string[] | undefined,
  coverImage?: string,
  listingId = "draft-form"
): { coverImage: string; gallery: string[] } {
  const raw = (images ?? []).slice(0, MAX_GALLERY_IMAGES);
  const httpGallery = raw.filter(isRemoteImageUrl);
  const cover = coverImage && isRemoteImageUrl(coverImage) ? coverImage : "";
  const merged = cover
    ? [cover, ...httpGallery.filter((u) => u !== cover)]
    : httpGallery;
  const gallery = sanitizeListingImagesForId(merged, listingId);
  return {
    coverImage: gallery[0] ?? LISTING_PLACEHOLDER_IMAGE,
    gallery,
  };
}

export interface MarketplaceApiCarPayload {
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: string;
  condition: string;
  mileage: number;
  fuelType: string;
  images: string[];
  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  isSold: boolean;
}

/** Payload สำหรับ POST /api/cars — รูปเป็น https เท่านั้น */
export function buildMarketplaceApiCarPayload(input: {
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: string;
  condition: string;
  mileage: number;
  fuelType: string;
  images: string[];
  coverImage?: string;
  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
}): MarketplaceApiCarPayload {
  const { gallery } = sanitizeGalleryForStorage(input.images, input.coverImage);
  const desc = (input.description ?? "").slice(0, MAX_API_DESCRIPTION_CHARS);

  return {
    title: input.title,
    brand: input.brand,
    model: input.model,
    year: input.year,
    price: input.price,
    type: input.type,
    condition: input.condition,
    mileage: input.mileage,
    fuelType: input.fuelType,
    images: gallery,
    description: desc,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerPhone: input.ownerPhone,
    isSold: false,
  };
}

export function getJsonPayloadByteSize(payload: unknown): number {
  try {
    return new Blob([JSON.stringify(payload)]).size;
  } catch {
    return 0;
  }
}

export function assertApiPayloadWithinLimit(
  payload: unknown,
  maxBytes = MAX_API_PAYLOAD_BYTES
): { ok: true } | { ok: false; message: string; bytes: number } {
  const bytes = getJsonPayloadByteSize(payload);
  if (bytes > maxBytes) {
    return {
      ok: false,
      bytes,
      message: "ข้อมูลรูปภาพใหญ่เกินไป กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true };
}

export interface ListingImageUploadFilePayload {
  mimeType: string;
  dataBase64: string;
  name: string;
}

/** body สำหรับ POST /api/cars/:id/images — ห้ามมี data: ใน field อื่น */
export function buildListingImageUploadBody(
  files: ListingImageUploadFilePayload[]
): { files: ListingImageUploadFilePayload[] } {
  const safe = files.map((f) => ({
    mimeType: f.mimeType || "image/jpeg",
    dataBase64: String(f.dataBase64).replace(/^data:image\/[^;]+;base64,/, ""),
    name: f.name || "upload.jpg",
  }));
  for (const f of safe) {
    if (f.dataBase64.startsWith("data:") || f.dataBase64.startsWith("blob:")) {
      throw new Error("invalid image payload");
    }
  }
  return { files: safe };
}

export function logDevPayloadSize(label: string, payload: unknown): void {
  const isDev =
    typeof import.meta !== "undefined" &&
    Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  if (isDev) {
    const bytes = getJsonPayloadByteSize(payload);
    const hasDataUrl = JSON.stringify(payload).includes("data:image");
    console.debug(`[${label}] payload ~${bytes} bytes, hasDataUrl=${hasDataUrl}`);
  }
}

/** แบบร่างฟอร์มขายรถ — ไม่เก็บ base64 */
export function serializeSellingFormDraft<T extends Record<string, unknown>>(
  formData: T & { images?: string[]; coverImage?: string }
): T & { images: string[]; coverImage: string; _localImageCount?: number } {
  const images = formData.images ?? [];
  const httpOnly = images.filter(isRemoteImageUrl);
  const cover = formData.coverImage ?? "";
  return {
    ...formData,
    images: httpOnly,
    coverImage: isRemoteImageUrl(cover) ? cover : "",
    _localImageCount: images.length,
  };
}
