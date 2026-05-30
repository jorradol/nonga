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
import type { DealerApiHeaders, DealerInventoryCar } from "../dealer/dealerApi";
import {
  deleteDealerInventory,
  fetchDealerInventory,
  hideDealerInventory,
  patchDealerInventory,
} from "../dealer/dealerApi";
import { uploadListingImagesApi } from "../dealer/dealerListingImageApi";
import { getFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";

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

export interface MyListingsApiScope {
  ownerId: string;
  dealerHeaders?: DealerApiHeaders;
}

export type MyListingsApiScopeInput = string | MyListingsApiScope;

export interface LegacyCreateListingInput {
  ownerId?: unknown;
  dealerId?: unknown;
}

function normalizeScope(scope: MyListingsApiScopeInput): MyListingsApiScope {
  return typeof scope === "string" ? { ownerId: scope } : scope;
}

async function ownerHeadersAsync(ownerId: string): Promise<HeadersInit> {
  return {
    ...((await getFirebaseAuthHeaders()) as Record<string, string>),
    "Content-Type": "application/json",
    "X-Owner-Id": ownerId,
  };
}

function toCar(raw: Record<string, unknown> | DealerInventoryCar): Car {
  return normalizeMarketplaceCar(raw as Record<string, unknown>);
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

export interface UploadMyListingImagesResult {
  storedUrls: string[];
  requestedCount: number;
  uploadedCount: number;
  failedBatches: Array<{ batchIndex: number; fileNames: string[]; message: string }>;
  failedFiles: Array<{
    fileName: string;
    batchIndex: number;
    message: string;
    httpStatus?: number;
  }>;
}

/** อัปโหลดไฟล์จากเครื่อง → เก็บ /storage/listings/{carId}/ (แบ่ง batch) */
export async function uploadMyListingImages(
  scopeInput: MyListingsApiScopeInput,
  carId: string,
  files: File[]
): Promise<string[]> {
  const result = await uploadMyListingImagesDetailed(scopeInput, carId, files);
  if (result.failedBatches.length > 0 && result.uploadedCount === 0) {
    throw new AppFriendlyError({
      code: "unknown",
      friendlyTitle: "น้องเออัปโหลดรูปไม่สำเร็จค่ะ",
      friendlyMessage: result.failedBatches[0]?.message ?? "ลองเลือกรูปใหม่อีกครั้งนะคะ",
      technicalDetail: "all image batches failed",
      url: `/api/cars/${carId}/images`,
    });
  }
  return result.storedUrls;
}

export async function uploadMyListingImagesDetailed(
  scopeInput: MyListingsApiScopeInput,
  carId: string,
  files: File[]
): Promise<UploadMyListingImagesResult> {
  if (files.length === 0) {
    return {
      storedUrls: [],
      requestedCount: 0,
      uploadedCount: 0,
      failedBatches: [],
      failedFiles: [],
    };
  }
  if (files.length > MAX_LISTING_IMAGES) {
    throw payloadTooLargeFriendly(
      `/api/cars/${carId}/images`,
      `too many files: ${files.length}`
    );
  }

  const url = `/api/cars/${encodeURIComponent(carId)}/images`;
  const storedUrls: string[] = [];
  const failedBatches: UploadMyListingImagesResult["failedBatches"] = [];
  const failedFiles: UploadMyListingImagesResult["failedFiles"] = [];
  let uploadedFileCount = 0;

  for (let i = 0; i < files.length; i += LISTING_IMAGE_UPLOAD_BATCH_SIZE) {
    const batchIndex = Math.floor(i / LISTING_IMAGE_UPLOAD_BATCH_SIZE);
    const batch = files.slice(i, i + LISTING_IMAGE_UPLOAD_BATCH_SIZE);
    const fileNames = batch.map((f) => f.name || "upload.jpg");

    try {
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

      const scope = normalizeScope(scopeInput);
      if (scope.dealerHeaders) {
        const result = await uploadListingImagesApi(
          scope.dealerHeaders,
          carId,
          "inventory",
          payloads
        );
        if (result.storedUrls.length === 0) {
          throw new Error("dealer upload returned no storedUrls");
        }
        storedUrls.push(...result.storedUrls);
        uploadedFileCount += result.storedUrls.length;
        continue;
      }

      const json = await safeApiFetch<
        ApiJsonEnvelope & {
          data?: {
            storedUrls?: string[];
            failedFiles?: Array<{ name?: string; message?: string }>;
          };
        }
      >(url, {
        method: "POST",
        headers: await ownerHeadersAsync(scope.ownerId),
        body: JSON.stringify(body),
      });
      assertApiSuccess(json, url);
      const data = json.data as {
        storedUrls?: string[];
        failedFiles?: Array<{ name?: string; message?: string }>;
      };
      const stored = data?.storedUrls;
      if (!Array.isArray(stored) || stored.length === 0) {
        throw new Error("POST /images returned no storedUrls");
      }
      storedUrls.push(...stored);
      uploadedFileCount += stored.length;

      const serverFailed = Array.isArray(data?.failedFiles) ? data.failedFiles : [];
      for (const item of serverFailed) {
        const fileName = String(item.name ?? "upload.jpg");
        const message = String(item.message ?? "อัปโหลดรูปไม่สำเร็จ");
        failedFiles.push({ fileName, batchIndex, message });
      }

      if (stored.length < batch.length) {
        const missingCount = batch.length - stored.length - serverFailed.length;
        if (missingCount > 0) {
          const missingNames = fileNames.slice(stored.length + serverFailed.length);
          for (const fileName of missingNames) {
            failedFiles.push({
              fileName,
              batchIndex,
              message: "เซิร์ฟเวอร์ไม่คืน URL สำหรับรูปนี้",
            });
          }
        }
      }

      console.info("[member-listing-image-upload] batch ok", {
        carId,
        endpoint: url,
        batchIndex,
        fileNames,
        storedCount: stored.length,
        requestedInBatch: batch.length,
        serverFailedCount: serverFailed.length,
      });
    } catch (err) {
      const message =
        err instanceof AppFriendlyError
          ? err.friendlyMessage
          : err instanceof Error
            ? err.message
            : "อัปโหลดรูปไม่สำเร็จ";
      const errorCategory =
        err instanceof AppFriendlyError ? err.code : "unknown";
      const httpStatus =
        err instanceof AppFriendlyError ? err.status : undefined;
      console.warn("[member-listing-image-upload] batch failed", {
        carId,
        endpoint: url,
        batchIndex,
        fileNames,
        fileCount: batch.length,
        errorCategory,
        httpStatus,
        technicalDetail:
          err instanceof AppFriendlyError
            ? err.technicalDetail
            : err instanceof Error
              ? err.message
              : String(err),
      });
      failedBatches.push({ batchIndex, fileNames, message });
      for (const fileName of fileNames) {
        failedFiles.push({ fileName, batchIndex, message, httpStatus });
      }
    }
  }

  return {
    storedUrls,
    requestedCount: files.length,
    uploadedCount: uploadedFileCount,
    failedBatches,
    failedFiles,
  };
}

/** รวม URL ที่เก็บแล้ว + อัปโหลดไฟล์ใหม่ แล้ว sanitize */
export async function resolveListingImagesForSave(
  scope: MyListingsApiScopeInput,
  carId: string,
  keptUrls: string[],
  newFiles: File[]
): Promise<string[]> {
  const kept = keptUrls.filter(
    (u) => !isDataImageUrl(u) && isValidListingImageUrl(u, carId)
  );
  const uploaded = await uploadMyListingImages(scope, carId, newFiles);
  return sanitizeListingImagesForId([...uploaded, ...kept], carId);
}

export async function fetchMyListings(
  scopeInput: MyListingsApiScopeInput
): Promise<Car[]> {
  const scope = normalizeScope(scopeInput);
  if (scope.dealerHeaders) {
    const rows = await fetchDealerInventory(scope.dealerHeaders);
    return rows.map(toCar);
  }

  const json = await safeApiFetch<ApiJsonEnvelope>("/api/my/listings", {
    headers: await ownerHeadersAsync(scope.ownerId),
    cache: "no-store",
  });
  assertApiSuccess(json, "/api/my/listings");
  return (json.data as Record<string, unknown>[]).map(normalizeMarketplaceCar);
}

export async function patchMyListing(
  scopeInput: MyListingsApiScopeInput,
  id: string,
  patch: MyListingPatch
): Promise<Car> {
  const scope = normalizeScope(scopeInput);
  if (scope.dealerHeaders) {
    return toCar(await patchDealerInventory(scope.dealerHeaders, id, patch));
  }

  const url = `/api/cars/${id}`;
  const json = await safeApiFetch<ApiJsonEnvelope>(url, {
    method: "PATCH",
    headers: await ownerHeadersAsync(scope.ownerId),
    body: JSON.stringify({ ...patch, ownerId: scope.ownerId }),
  });
  assertApiSuccess(json, url);
  return normalizeMarketplaceCar(json.data as Record<string, unknown>);
}

export async function setMyListingVisibility(
  scopeInput: MyListingsApiScopeInput,
  id: string,
  hidden: boolean
): Promise<Car> {
  const scope = normalizeScope(scopeInput);
  if (scope.dealerHeaders) {
    return toCar(await hideDealerInventory(scope.dealerHeaders, id, hidden));
  }

  const url = `/api/cars/${id}/visibility`;
  const json = await safeApiFetch<ApiJsonEnvelope>(url, {
    method: "PATCH",
    headers: await ownerHeadersAsync(scope.ownerId),
    body: JSON.stringify({ hidden, ownerId: scope.ownerId }),
  });
  assertApiSuccess(json, url);
  return normalizeMarketplaceCar(json.data as Record<string, unknown>);
}

export async function deleteMyListing(
  scopeInput: MyListingsApiScopeInput,
  id: string,
  hard = true
): Promise<void> {
  const scope = normalizeScope(scopeInput);
  if (scope.dealerHeaders) {
    await deleteDealerInventory(scope.dealerHeaders, id);
    return;
  }

  const url = `/api/cars/${id}?soft=${hard ? "0" : "1"}`;
  const json = await safeApiFetch<ApiJsonEnvelope>(url, {
    method: "DELETE",
    headers: await ownerHeadersAsync(scope.ownerId),
    body: JSON.stringify({ ownerId: scope.ownerId, soft: !hard }),
  });
  assertApiSuccess(json, url);
}

/**
 * Compatibility path for the older public sell form.
 * Dealer Portal and Chat to Draft should prefer /api/dealer/* flows.
 */
export async function createLegacyMarketplaceListing(
  input: LegacyCreateListingInput
): Promise<Car> {
  logDevPayloadSize("POST /api/cars", input);
  const json = await safeApiFetch<ApiJsonEnvelope>("/api/cars", {
    method: "POST",
    headers: await ownerHeadersAsync(String(input.ownerId ?? "")),
    body: JSON.stringify(input),
  });
  assertApiSuccess(json, "/api/cars");
  return normalizeMarketplaceCar(json.data as Record<string, unknown>);
}
