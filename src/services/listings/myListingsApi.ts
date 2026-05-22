import type { Car } from "../../types";
import { normalizeMarketplaceCar } from "../../utils/marketplaceCarMapper";
import { compressImage } from "../upload";
import {
  assertApiPayloadWithinLimit,
  buildListingImageUploadBody,
  isDataImageUrl,
  isRemoteImageUrl,
  LISTING_IMAGE_UPLOAD_BATCH_SIZE,
  logDevPayloadSize,
  MAX_LISTING_IMAGE_UPLOAD_REQUEST_BYTES,
  type ListingImageUploadFilePayload,
} from "../../utils/listingImageStorage";
import {
  isValidListingImageUrl,
  sanitizeListingImagesForId,
} from "../../utils/listingImages";
import {
  assertApiSuccess,
  safeApiFetch,
  type ApiJsonEnvelope,
} from "../../utils/safeApiFetch";
import { AppFriendlyError } from "../../utils/appFriendlyError";

export interface MyListingPatch {
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  fuelType?: string;
  gear?: string;
  transmission?: string;
  color?: string;
  description?: string;
  images?: string[];
}

const MAX_LISTING_IMAGES = 12;

function ownerHeaders(ownerId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Owner-Id": ownerId,
  };
}

function payloadTooLargeFriendly(url: string, detail?: string): AppFriendlyError {
  return new AppFriendlyError({
    code: "unknown",
    friendlyTitle: "น้องเอขออภัยค่ะ รูปใหญ่เกินไป",
    friendlyMessage:
      "ข้อมูลรูปภาพใหญ่เกินไป กรุณาลดจำนวนรูปหรือขนาดรูป แล้วลองใหม่อีกครั้ง",
    technicalDetail: detail ?? "payload too large",
    status: 413,
    url,
  });
}

async function fileToBase64Payload(file: File): Promise<ListingImageUploadFilePayload> {
  let processed = file;
  const compressPasses: Array<{ maxWidth: number; maxHeight: number; quality: number }> = [
    { maxWidth: 960, maxHeight: 960, quality: 0.78 },
    { maxWidth: 720, maxHeight: 720, quality: 0.68 },
    { maxWidth: 560, maxHeight: 560, quality: 0.58 },
  ];
  for (const opts of compressPasses) {
    try {
      processed = await compressImage(file, opts);
      break;
    } catch {
      /* try next pass */
    }
  }

  const buffer = await processed.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    mimeType: processed.type || "image/jpeg",
    dataBase64: btoa(binary),
    name: processed.name || file.name || "upload.jpg",
  };
}

/** อัปโหลดไฟล์จากเครื่อง → เก็บ /storage/listings/{carId}/ (แบ่ง batch) */
export async function uploadMyListingImages(
  ownerId: string,
  carId: string,
  files: File[]
): Promise<string[]> {
  if (files.length === 0) return [];
  if (files.length > MAX_LISTING_IMAGES) {
    throw payloadTooLargeFriendly(
      `/api/cars/${carId}/images`,
      `too many files: ${files.length}`
    );
  }

  const url = `/api/cars/${encodeURIComponent(carId)}/images`;
  const storedUrls: string[] = [];

  for (let i = 0; i < files.length; i += LISTING_IMAGE_UPLOAD_BATCH_SIZE) {
    const batch = files.slice(i, i + LISTING_IMAGE_UPLOAD_BATCH_SIZE);
    const payloads = await Promise.all(batch.map(fileToBase64Payload));
    const body = buildListingImageUploadBody(payloads);
    logDevPayloadSize("POST /api/cars/:id/images", body);

    const sizeCheck = assertApiPayloadWithinLimit(
      body,
      MAX_LISTING_IMAGE_UPLOAD_REQUEST_BYTES
    );
    if (sizeCheck.ok === false) {
      throw payloadTooLargeFriendly(url, `client bytes ${sizeCheck.bytes}`);
    }

    const json = await safeApiFetch<
      ApiJsonEnvelope & { data?: { storedUrls?: string[] } }
    >(url, {
      method: "POST",
      headers: ownerHeaders(ownerId),
      body: JSON.stringify(body),
    });
    assertApiSuccess(json, url);
    const stored = (json.data as { storedUrls?: string[] })?.storedUrls;
    if (!Array.isArray(stored) || stored.length === 0) {
      throw new AppFriendlyError({
        code: "unknown",
        friendlyTitle: "น้องเออัปโหลดรูปไม่สำเร็จค่ะ",
        friendlyMessage: "ลองเลือกรูปใหม่อีกครั้งนะคะ",
        technicalDetail: "POST /images returned no storedUrls",
        url,
      });
    }
    storedUrls.push(...stored);
  }

  return storedUrls;
}

/** รวม URL ที่เก็บแล้ว + อัปโหลดไฟล์ใหม่ แล้ว sanitize */
export async function resolveListingImagesForSave(
  ownerId: string,
  carId: string,
  keptUrls: string[],
  newFiles: File[]
): Promise<string[]> {
  const kept = keptUrls.filter(
    (u) => !isDataImageUrl(u) && isValidListingImageUrl(u, carId)
  );
  const uploaded = await uploadMyListingImages(ownerId, carId, newFiles);
  return sanitizeListingImagesForId([...uploaded, ...kept], carId);
}

export async function fetchMyListings(ownerId: string): Promise<Car[]> {
  const json = await safeApiFetch<ApiJsonEnvelope>("/api/my/listings", {
    headers: ownerHeaders(ownerId),
    cache: "no-store",
  });
  assertApiSuccess(json, "/api/my/listings");
  return (json.data as Record<string, unknown>[]).map(normalizeMarketplaceCar);
}

export async function patchMyListing(
  ownerId: string,
  id: string,
  patch: MyListingPatch
): Promise<Car> {
  const url = `/api/cars/${id}`;
  const json = await safeApiFetch<ApiJsonEnvelope>(url, {
    method: "PATCH",
    headers: ownerHeaders(ownerId),
    body: JSON.stringify({ ...patch, ownerId }),
  });
  assertApiSuccess(json, url);
  return normalizeMarketplaceCar(json.data as Record<string, unknown>);
}

export async function setMyListingVisibility(
  ownerId: string,
  id: string,
  hidden: boolean
): Promise<Car> {
  const url = `/api/cars/${id}/visibility`;
  const json = await safeApiFetch<ApiJsonEnvelope>(url, {
    method: "PATCH",
    headers: ownerHeaders(ownerId),
    body: JSON.stringify({ hidden, ownerId }),
  });
  assertApiSuccess(json, url);
  return normalizeMarketplaceCar(json.data as Record<string, unknown>);
}

export async function deleteMyListing(
  ownerId: string,
  id: string,
  hard = true
): Promise<void> {
  const url = `/api/cars/${id}?soft=${hard ? "0" : "1"}`;
  const json = await safeApiFetch<ApiJsonEnvelope>(url, {
    method: "DELETE",
    headers: ownerHeaders(ownerId),
    body: JSON.stringify({ ownerId, soft: !hard }),
  });
  assertApiSuccess(json, url);
}
