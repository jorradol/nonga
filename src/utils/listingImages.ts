/**
 * รูปประกาศ — ใช้ images[] ตามลำดับที่บันทึก (images[0] ก่อน)
 * ห้ามสุ่ม / ห้าม reorder local ก่อน remote / ห้าม legacy stock แทนรูปจริง
 */

export const LISTING_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600";

/** รูป demo/stock ที่เคยใช้เป็น fallback — ไม่นับเป็นรูปจริงของประกาศ */
export const LEGACY_STOCK_IMAGE_URLS = new Set([
  LISTING_PLACEHOLDER_IMAGE,
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1562575214-da9fcf59b907?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
]);

export function isLocalListingImageUrl(url: string): boolean {
  return String(url).startsWith("/storage/listings/");
}

export function extractStorageListingId(url: string): string | null {
  const m = String(url).trim().match(/^\/storage\/listings\/([^/]+)\//);
  return m?.[1] ?? null;
}

function isLegacyStockImage(url: string): boolean {
  const u = String(url).trim();
  if (LEGACY_STOCK_IMAGE_URLS.has(u)) return true;
  if (u.includes("unsplash.com/photo-1533473359331-0135ef1b58bf")) return true;
  return false;
}

/** Decode path so listing id checks work on Firebase-encoded URLs. */
export function listingImageUrlReferencesListing(
  url: string,
  listingId: string
): boolean {
  const id = String(listingId ?? "").trim();
  if (!id) return true;
  const raw = String(url ?? "").trim();
  if (!raw) return false;
  try {
    return decodeURIComponent(raw).includes(id) || raw.includes(id);
  } catch {
    return raw.includes(id);
  }
}

export type ListingImageFieldSource = {
  images?: unknown;
  imageUrls?: unknown;
  imageUrl?: unknown;
  coverImage?: unknown;
  gallery?: unknown;
  primaryImage?: unknown;
};

function pushListingImageCandidate(out: string[], raw: unknown): void {
  if (typeof raw !== "string") return;
  const url = raw.trim();
  if (!url || out.includes(url)) return;
  out.push(url);
}

function pushListingImageCandidates(out: string[], raw: unknown): void {
  if (Array.isArray(raw)) {
    for (const item of raw) pushListingImageCandidate(out, item);
    return;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed.includes(",") && !/^https?:\/\//i.test(trimmed)) {
      for (const part of trimmed.split(",")) pushListingImageCandidate(out, part);
      return;
    }
    pushListingImageCandidate(out, trimmed);
  }
}

/** Collect image URLs from legacy + current listing record fields (order preserved). */
export function collectListingImageCandidates(
  source: ListingImageFieldSource
): string[] {
  const out: string[] = [];
  pushListingImageCandidates(out, source.images);
  pushListingImageCandidates(out, source.imageUrls);
  pushListingImageCandidates(out, source.gallery);
  pushListingImageCandidate(out, source.coverImage);
  pushListingImageCandidate(out, source.imageUrl);
  pushListingImageCandidate(out, source.primaryImage);
  return out;
}

/** Merge heterogeneous listing image fields then sanitize for display/storage. */
export function mergeListingRecordImages(
  listingId: string,
  source: ListingImageFieldSource
): string[] {
  return sanitizeListingImagesForId(
    collectListingImageCandidates(source),
    listingId
  );
}

/**
 * รูปที่นับว่าเป็นของประกาศนี้ (ตามลำดับใน array — ไม่สลับ local/remote)
 */
export function isValidListingImageUrl(url: string, listingId: string): boolean {
  const u = String(url ?? "").trim();
  if (!u || u.startsWith("data:") || u.startsWith("blob:")) return false;

  if (isLocalListingImageUrl(u)) {
    return extractStorageListingId(u) === listingId;
  }

  if (/^https?:\/\//i.test(u)) {
    return !isLegacyStockImage(u);
  }

  // Firebase / import paths without scheme (legacy rows)
  if (
    u.startsWith("listing-images/") &&
    listingImageUrlReferencesListing(u, listingId)
  ) {
    return true;
  }

  return false;
}

function resolveListingPrimaryImage(
  images: string[] | undefined,
  listingId: string,
  extra?: ListingImageFieldSource
): string {
  const list =
    images && images.length > 0
      ? images
      : extra
        ? collectListingImageCandidates(extra)
        : [];
  for (const raw of list) {
    const url = String(raw ?? "").trim();
    if (isValidListingImageUrl(url, listingId)) return url;
  }
  return LISTING_PLACEHOLDER_IMAGE;
}

/** รูปหลัก — ตัวแรกใน images[] ที่ valid (ตามลำดับที่บันทึก) */
export function getListingPrimaryImage(
  images: string[] | undefined,
  listingId: string
): string;
export function getListingPrimaryImage(car: {
  id: string;
  images?: string[];
} & ListingImageFieldSource): string;
export function getListingPrimaryImage(
  imagesOrCar:
    | string[]
    | undefined
    | ({ id: string; images?: string[] } & ListingImageFieldSource),
  listingId?: string
): string {
  if (
    imagesOrCar &&
    typeof imagesOrCar === "object" &&
    !Array.isArray(imagesOrCar) &&
    "id" in imagesOrCar
  ) {
    const { id, images, ...rest } = imagesOrCar;
    const merged =
      images && images.length > 0
        ? images
        : collectListingImageCandidates(rest);
    return resolveListingPrimaryImage(merged, id, rest);
  }
  return resolveListingPrimaryImage(
    imagesOrCar as string[] | undefined,
    listingId ?? ""
  );
}

/** @deprecated ใช้ getListingPrimaryImage แทน */
export const getPrimaryListingImage = getListingPrimaryImage;

/** แกลเลอรี่ทั้งหมดที่ valid — คงลำดับเดิม */
export function getListingGalleryImages(
  images: string[] | undefined,
  listingId: string
): string[] {
  const list = Array.isArray(images) ? images : [];
  const out: string[] = [];
  for (const raw of list.slice(0, 12)) {
    const url = String(raw ?? "").trim();
    if (isValidListingImageUrl(url, listingId)) out.push(url);
  }
  return out.length > 0 ? out : [LISTING_PLACEHOLDER_IMAGE];
}

/**
 * ทำความสะอาด images[] ก่อนบันทึก — คงลำดับ, ตัด legacy/blob/cross-car
 */
export function sanitizeListingImagesForId(
  images: unknown,
  listingId: string
): string[] {
  const list = Array.isArray(images) ? images : [];
  const out: string[] = [];
  for (const raw of list.slice(0, 12)) {
    const url = String(raw ?? "").trim();
    if (isValidListingImageUrl(url, listingId)) out.push(url);
  }
  return out.length > 0 ? out : [LISTING_PLACEHOLDER_IMAGE];
}

export function withSanitizedListingImages<
  T extends { id: string; images: string[] },
>(record: T): T {
  return {
    ...record,
    images: sanitizeListingImagesForId(record.images, record.id),
  };
}
