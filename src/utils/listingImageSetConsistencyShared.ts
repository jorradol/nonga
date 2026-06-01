/**
 * Listing image set consistency — client-safe helpers (metadata only).
 *
 * Phase 2 (future): Vision mode analyzes imageRole, color/body hints, set
 * consistency; routes through AI guard/rate-limit; public gallery filter;
 * admin review for fail/suspicious; abuse counter for repeated non_vehicle.
 * This round: foundation + metadata + tests; default does not call Gemini.
 */
import type { VehicleImageMetadataFields, VehicleImageStatus } from "./vehicleImageValidationShared";

export type ListingImageRole =
  | "exterior"
  | "interior"
  | "engine"
  | "trunk"
  | "odometer"
  | "wheel"
  | "key"
  | "document"
  | "other_vehicle_part"
  | "non_vehicle"
  | "unknown";

export type ImageSetConsistencyStatus =
  | "same_vehicle_likely"
  | "same_vehicle_uncertain"
  | "different_vehicle_suspected"
  | "non_vehicle"
  | "unknown";

export interface ListingImageSetMetadataFields extends VehicleImageMetadataFields {
  imageRole?: ListingImageRole;
  imageSetConsistencyStatus?: ImageSetConsistencyStatus;
}

export interface ListingImageDisplayClassification {
  imageRole: ListingImageRole;
  imageSetConsistencyStatus: ImageSetConsistencyStatus;
  isPublicDisplayEligible: boolean;
  isMainImageCandidate: boolean;
  isSupportingImage: boolean;
  warningMessage: string;
  holdPublicDisplay: boolean;
}

export interface ImageSetConsistencyWarning {
  imageUrl?: string;
  message: string;
  severity: "info" | "warn" | "hold";
}

export const LISTING_IMAGE_NON_VEHICLE_MESSAGE =
  "รูปนี้ยังไม่เห็นตัวรถหรือส่วนประกอบของรถชัดเจนครับคุณพี่ น้องเอจะยังไม่นำรูปนี้ไปแสดงในประกาศขายนะครับ";

export const LISTING_IMAGE_SUPPORTING_MESSAGE =
  "รูปนี้น่าจะเป็นรูปประกอบของรถ เช่น ภายในหรือห้องเครื่องครับ เก็บไว้ช่วยเพิ่มความน่าเชื่อถือได้ แต่ควรมีรูปด้านนอกตัวรถอย่างน้อย 1 รูปก่อนลงตลาดครับ";

export const LISTING_IMAGE_MIXED_VEHICLE_MESSAGE =
  "น้องเอพบว่ารูปบางภาพอาจไม่ใช่รถคันเดียวกับประกาศนี้ครับ เพื่อให้ประกาศน่าเชื่อถือ แนะนำให้ตรวจรูปที่ระบบไฮไลต์ไว้ก่อนลงตลาดนะครับ";

export const LISTING_IMAGE_NO_EXTERIOR_MESSAGE =
  "ยังไม่พบรูปด้านนอกตัวรถที่ชัดเจนครับ กรุณาเพิ่มรูปด้านหน้า ด้านข้าง หรือด้านหลังของรถอย่างน้อย 1 รูปก่อนลงตลาดนะครับ";

export const LISTING_IMAGE_SET_PUBLISH_BLOCK_MESSAGE =
  LISTING_IMAGE_NO_EXTERIOR_MESSAGE;

const SUPPORTING_ROLES = new Set<ListingImageRole>([
  "interior",
  "engine",
  "trunk",
  "odometer",
  "wheel",
  "other_vehicle_part",
]);

const PUBLIC_ELIGIBLE_ROLES = new Set<ListingImageRole>([
  "exterior",
  "interior",
  "engine",
  "trunk",
  "odometer",
  "wheel",
  "other_vehicle_part",
]);

const PRIVATE_ROLES = new Set<ListingImageRole>(["document", "key"]);

export function normalizeListingImageRole(
  value: unknown
): ListingImageRole {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  const roles: ListingImageRole[] = [
    "exterior",
    "interior",
    "engine",
    "trunk",
    "odometer",
    "wheel",
    "key",
    "document",
    "other_vehicle_part",
    "non_vehicle",
    "unknown",
  ];
  return roles.includes(raw as ListingImageRole)
    ? (raw as ListingImageRole)
    : "unknown";
}

export function normalizeImageSetConsistencyStatus(
  value: unknown
): ImageSetConsistencyStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  const statuses: ImageSetConsistencyStatus[] = [
    "same_vehicle_likely",
    "same_vehicle_uncertain",
    "different_vehicle_suspected",
    "non_vehicle",
    "unknown",
  ];
  return statuses.includes(raw as ImageSetConsistencyStatus)
    ? (raw as ImageSetConsistencyStatus)
    : "unknown";
}

function isVehicleStatusActionable(status?: VehicleImageStatus): boolean {
  return status === "pass" || status === "warn" || status === "fail";
}

function resolveImageRole(meta: ListingImageSetMetadataFields): ListingImageRole {
  const explicit = normalizeListingImageRole(meta.imageRole);
  if (explicit !== "unknown") return explicit;
  if (
    isVehicleStatusActionable(meta.vehicleImageStatus) &&
    meta.vehicleImageStatus === "fail" &&
    meta.hasVehicle === false
  ) {
    return "non_vehicle";
  }
  return "unknown";
}

function resolveConsistencyStatus(
  meta: ListingImageSetMetadataFields,
  role: ListingImageRole
): ImageSetConsistencyStatus {
  const explicit = normalizeImageSetConsistencyStatus(
    meta.imageSetConsistencyStatus
  );
  if (explicit !== "unknown") return explicit;
  if (role === "non_vehicle") return "non_vehicle";
  if (
    isVehicleStatusActionable(meta.vehicleImageStatus) &&
    meta.vehicleImageStatus === "fail"
  ) {
    return "non_vehicle";
  }
  return "unknown";
}

function vehicleBlocksPublicDisplay(meta: ListingImageSetMetadataFields): boolean {
  if (!isVehicleStatusActionable(meta.vehicleImageStatus)) return false;
  return meta.vehicleImageStatus === "fail";
}

export function classifyListingImageForDisplay(
  meta: ListingImageSetMetadataFields = {}
): ListingImageDisplayClassification {
  const imageRole = resolveImageRole(meta);
  const imageSetConsistencyStatus = resolveConsistencyStatus(meta, imageRole);
  const hasActionableRole = normalizeListingImageRole(meta.imageRole) !== "unknown";
  const hasActionableConsistency =
    normalizeImageSetConsistencyStatus(meta.imageSetConsistencyStatus) !==
    "unknown";

  const isSupportingImage = SUPPORTING_ROLES.has(imageRole);

  let isPublicDisplayEligible = true;
  let holdPublicDisplay = false;
  let warningMessage = "";

  if (imageRole === "non_vehicle" || imageSetConsistencyStatus === "non_vehicle") {
    isPublicDisplayEligible = false;
    holdPublicDisplay = true;
    warningMessage = LISTING_IMAGE_NON_VEHICLE_MESSAGE;
  } else if (imageSetConsistencyStatus === "different_vehicle_suspected") {
    isPublicDisplayEligible = false;
    holdPublicDisplay = true;
    warningMessage = LISTING_IMAGE_MIXED_VEHICLE_MESSAGE;
  } else if (PRIVATE_ROLES.has(imageRole)) {
    isPublicDisplayEligible = false;
    holdPublicDisplay = false;
  } else if (!PUBLIC_ELIGIBLE_ROLES.has(imageRole) && imageRole !== "unknown") {
    isPublicDisplayEligible = false;
    holdPublicDisplay = true;
    warningMessage = LISTING_IMAGE_NON_VEHICLE_MESSAGE;
  } else if (vehicleBlocksPublicDisplay(meta)) {
    isPublicDisplayEligible = false;
    holdPublicDisplay = true;
    warningMessage = LISTING_IMAGE_NON_VEHICLE_MESSAGE;
  } else if (isSupportingImage && (hasActionableRole || hasActionableConsistency)) {
    warningMessage = LISTING_IMAGE_SUPPORTING_MESSAGE;
  }

  const isMainImageCandidate =
    imageRole === "exterior" &&
    isPublicDisplayEligible &&
    !holdPublicDisplay &&
    !PRIVATE_ROLES.has(imageRole);

  return {
    imageRole,
    imageSetConsistencyStatus,
    isPublicDisplayEligible,
    isMainImageCandidate,
    isSupportingImage,
    warningMessage,
    holdPublicDisplay,
  };
}

export function isImagePublicDisplayEligible(
  meta: ListingImageSetMetadataFields = {}
): boolean {
  return classifyListingImageForDisplay(meta).isPublicDisplayEligible;
}

export function isMainImageCandidate(
  meta: ListingImageSetMetadataFields = {}
): boolean {
  return classifyListingImageForDisplay(meta).isMainImageCandidate;
}

export function countsAsPublishablePrimaryImage(
  meta: ListingImageSetMetadataFields = {}
): boolean {
  const classified = classifyListingImageForDisplay(meta);
  return classified.isMainImageCandidate;
}

export function hasActionableImageSetAnalysis(
  imageMetadata?: readonly ListingImageSetMetadataFields[]
): boolean {
  return (imageMetadata ?? []).some((item) => {
    const role = normalizeListingImageRole(item.imageRole);
    const consistency = normalizeImageSetConsistencyStatus(
      item.imageSetConsistencyStatus
    );
    return role !== "unknown" || consistency !== "unknown";
  });
}

export function hasExteriorVehicleImage(
  imageMetadata?: readonly ListingImageSetMetadataFields[]
): boolean {
  return (imageMetadata ?? []).some((item) => {
    const classified = classifyListingImageForDisplay(item);
    return classified.imageRole === "exterior" && classified.isPublicDisplayEligible;
  });
}

export function hasSupportingVehicleImagesOnly(
  imageMetadata?: readonly ListingImageSetMetadataFields[]
): boolean {
  const items = imageMetadata ?? [];
  if (!items.length) return false;
  if (!hasActionableImageSetAnalysis(items)) return false;
  if (hasExteriorVehicleImage(items)) return false;
  return items.some((item) => {
    const role = normalizeListingImageRole(item.imageRole);
    return SUPPORTING_ROLES.has(role);
  });
}

export function hasSuspiciousMixedVehicleImages(
  imageMetadata?: readonly ListingImageSetMetadataFields[]
): boolean {
  return (imageMetadata ?? []).some((item) => {
    const status = normalizeImageSetConsistencyStatus(
      item.imageSetConsistencyStatus
    );
    return status === "different_vehicle_suspected";
  });
}

export function countPublicDisplayEligibleImages(
  images: string[] | undefined,
  imageMetadata: readonly ListingImageSetMetadataFields[] | undefined,
  validImageUrls: string[]
): number {
  if (!imageMetadata?.length) return 0;
  const valid = new Set(validImageUrls);
  const byUrl = new Map<string, ListingImageSetMetadataFields>();
  for (const item of imageMetadata) {
    const url = String(item.imageUrl ?? item.imagePath ?? "").trim();
    if (url) byUrl.set(url, item);
  }

  let count = 0;
  for (const url of images ?? []) {
    const trimmed = String(url).trim();
    if (!valid.has(trimmed)) continue;
    const meta = byUrl.get(trimmed);
    if (meta && isImagePublicDisplayEligible(meta)) count += 1;
  }
  return count;
}

export function buildImageSetConsistencyWarnings(
  imageMetadata?: readonly ListingImageSetMetadataFields[]
): ImageSetConsistencyWarning[] {
  const items = imageMetadata ?? [];
  if (!items.length || !hasActionableImageSetAnalysis(items)) return [];

  const warnings: ImageSetConsistencyWarning[] = [];

  for (const item of items) {
    const classified = classifyListingImageForDisplay(item);
    if (!classified.warningMessage) continue;
    warnings.push({
      imageUrl: item.imageUrl ?? item.imagePath,
      message: classified.warningMessage,
      severity: classified.holdPublicDisplay ? "hold" : "warn",
    });
  }

  if (hasSuspiciousMixedVehicleImages(items)) {
    const alreadyMixed = warnings.some(
      (w) => w.message === LISTING_IMAGE_MIXED_VEHICLE_MESSAGE
    );
    if (!alreadyMixed) {
      warnings.push({
        message: LISTING_IMAGE_MIXED_VEHICLE_MESSAGE,
        severity: "hold",
      });
    }
  }

  if (hasSupportingVehicleImagesOnly(items)) {
    warnings.push({
      message: LISTING_IMAGE_NO_EXTERIOR_MESSAGE,
      severity: "warn",
    });
  }

  return dedupeWarnings(warnings);
}

export function imageSetWarningMessages(
  imageMetadata?: readonly ListingImageSetMetadataFields[]
): string[] {
  return buildImageSetConsistencyWarnings(imageMetadata).map((w) => w.message);
}

export function shouldBlockPublishForImageSet(input: {
  images?: string[];
  imageMetadata?: readonly ListingImageSetMetadataFields[];
  validImageUrls?: string[];
}): { block: false } | { block: true; message: string } {
  const metadata = input.imageMetadata ?? [];
  if (!hasActionableImageSetAnalysis(metadata)) {
    return { block: false };
  }

  const validUrls =
    input.validImageUrls ??
    (input.images ?? []).filter((url) => String(url).trim().length > 0);

  if (hasSuspiciousMixedVehicleImages(metadata)) {
    return { block: true, message: LISTING_IMAGE_MIXED_VEHICLE_MESSAGE };
  }

  const publicEligible = countPublicDisplayEligibleImages(
    input.images,
    metadata,
    validUrls
  );
  if (publicEligible < 1) {
    return { block: true, message: LISTING_IMAGE_NON_VEHICLE_MESSAGE };
  }

  if (hasSupportingVehicleImagesOnly(metadata)) {
    return { block: true, message: LISTING_IMAGE_NO_EXTERIOR_MESSAGE };
  }

  if (!hasExteriorVehicleImage(metadata)) {
    return { block: true, message: LISTING_IMAGE_NO_EXTERIOR_MESSAGE };
  }

  return { block: false };
}

export function listingImageSetMetadataFromFields(
  input?: Partial<ListingImageSetMetadataFields> | null
): ListingImageSetMetadataFields {
  if (!input) return {};
  const out: ListingImageSetMetadataFields = {};
  if (input.imageUrl) out.imageUrl = input.imageUrl;
  if (input.imagePath) out.imagePath = input.imagePath;
  if (input.hasVehicle !== undefined) out.hasVehicle = input.hasVehicle;
  if (input.vehicleConfidence !== undefined) {
    out.vehicleConfidence = input.vehicleConfidence;
  }
  if (input.vehicleImageStatus) out.vehicleImageStatus = input.vehicleImageStatus;
  if (input.vehicleImageReason) out.vehicleImageReason = input.vehicleImageReason;
  if (input.imageRole) out.imageRole = normalizeListingImageRole(input.imageRole);
  if (input.imageSetConsistencyStatus) {
    out.imageSetConsistencyStatus = normalizeImageSetConsistencyStatus(
      input.imageSetConsistencyStatus
    );
  }
  return out;
}

function dedupeWarnings(
  warnings: ImageSetConsistencyWarning[]
): ImageSetConsistencyWarning[] {
  const seen = new Set<string>();
  const out: ImageSetConsistencyWarning[] = [];
  for (const warning of warnings) {
    const key = `${warning.imageUrl ?? ""}:${warning.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(warning);
  }
  return out;
}
