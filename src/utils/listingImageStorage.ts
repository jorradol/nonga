/**
 * จัดการรูปสำหรับ mock/localStorage/API — ห้ามส่ง base64 ไปเซิร์ฟเวอร์
 */

const MAX_API_PAYLOAD_BYTES = 480_000;
const MAX_GALLERY_IMAGES = 12;
const MAX_API_DESCRIPTION_CHARS = 4000;

const PLACEHOLDER_POOL = [
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600",
];

export function isRemoteImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isDataImageUrl(url: string): boolean {
  return url.startsWith("data:image") || url.startsWith("blob:");
}

/** URL สำหรับ API / localStorage listing — ไม่มี data: เด็ดขาด */
export function toListingStorageImageUrl(url: string, index = 0): string {
  if (!url?.trim()) return PLACEHOLDER_POOL[0];
  if (isRemoteImageUrl(url)) return url;
  return PLACEHOLDER_POOL[index % PLACEHOLDER_POOL.length];
}

export function sanitizeGalleryForStorage(
  images: string[] | undefined,
  coverImage?: string
): { coverImage: string; gallery: string[] } {
  const raw = (images ?? []).slice(0, MAX_GALLERY_IMAGES);
  const gallery = raw.map((url, i) => toListingStorageImageUrl(url, i));
  const cover = coverImage
    ? toListingStorageImageUrl(coverImage, 0)
    : gallery[0] ?? PLACEHOLDER_POOL[0];
  return { coverImage: cover, gallery: gallery.length > 0 ? gallery : [cover] };
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
