import { createHash } from "crypto";
import {
  VEHICLE_IMAGE_FAIL_MESSAGE,
  VEHICLE_IMAGE_WARN_MESSAGE,
  classifyVehicleVisionProbe,
  resolveVehicleImageValidationMode,
  shouldCallVehicleVisionAnalyzer,
  vehicleMetadataFromValidation,
  type VehicleImageMetadataFields,
  type VehicleImageStatus,
  type VehicleImageValidationMode,
  type VehicleImageValidationSource,
} from "../utils/vehicleImageValidationShared";
import { analyzeVehicleImageBuffer } from "./vehicleVisionAnalyzer";

export type {
  VehicleImageMetadataFields,
  VehicleImageStatus,
  VehicleImageValidationMode,
} from "../utils/vehicleImageValidationShared";
export {
  VEHICLE_IMAGE_FAIL_MESSAGE,
  VEHICLE_IMAGE_WARN_MESSAGE,
  VEHICLE_IMAGE_PUBLISH_BLOCK_MESSAGE,
  VEHICLE_WARN_PUBLISH_MIN_CONFIDENCE,
  classifyVehicleVisionProbe,
  countsAsPublishVehicleImage,
  countPublishableVehicleImages,
  hasActionableVehicleImageAnalysis,
  resolveVehicleImageValidationMode,
  shouldCallVehicleVisionAnalyzer,
  validateDraftVehicleImagesForPublish,
  vehicleMetadataFromValidation,
} from "../utils/vehicleImageValidationShared";

export interface VehicleImageValidationResult extends VehicleImageMetadataFields {
  vehicleImageStatus: VehicleImageStatus;
  vehicleImageReason: string;
  hasVehicle: boolean;
  vehicleConfidence: number;
  analyzedAt: string;
  cacheKey: string;
  source: VehicleImageValidationSource;
}

const validationCache = new Map<string, VehicleImageValidationResult>();

export function vehicleImageCacheKey(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function resetVehicleImageValidationCacheForTests(): void {
  validationCache.clear();
}

export function vehicleImageUserWarning(
  result: VehicleImageValidationResult
): string | null {
  if (result.vehicleImageStatus === "fail") {
    return result.vehicleImageReason || VEHICLE_IMAGE_FAIL_MESSAGE;
  }
  if (result.vehicleImageStatus === "warn") {
    return result.vehicleImageReason || VEHICLE_IMAGE_WARN_MESSAGE;
  }
  return null;
}

function foundationVehicleImageValidation(
  cacheKey: string,
  mode: VehicleImageValidationMode
): VehicleImageValidationResult {
  return {
    hasVehicle: false,
    vehicleConfidence: 0,
    vehicleImageStatus: "unknown",
    vehicleImageReason: "",
    analyzedAt: new Date().toISOString(),
    cacheKey,
    source: mode === "off" ? "unknown" : "foundation",
  };
}

function unknownVehicleImageValidation(cacheKey: string): VehicleImageValidationResult {
  return foundationVehicleImageValidation(cacheKey, "off");
}

export async function validateVehicleImageContent(
  buffer: Buffer,
  options: {
    mimeType?: string;
    cacheKey?: string;
    mode?: VehicleImageValidationMode;
  } = {}
): Promise<VehicleImageValidationResult> {
  if (buffer.length === 0) {
    return unknownVehicleImageValidation("");
  }

  const mode = options.mode ?? resolveVehicleImageValidationMode();
  const cacheKey = options.cacheKey ?? vehicleImageCacheKey(buffer);
  const cacheLookupKey = `${mode}:${cacheKey}`;
  const cached = validationCache.get(cacheLookupKey);
  if (cached) {
    return { ...cached, cacheKey };
  }

  if (!shouldCallVehicleVisionAnalyzer(mode)) {
    const safe = foundationVehicleImageValidation(cacheKey, mode);
    validationCache.set(cacheLookupKey, safe);
    return safe;
  }

  try {
    const probe = await analyzeVehicleImageBuffer(
      buffer,
      options.mimeType ?? "image/jpeg"
    );
    if (!probe) {
      const fallback = unknownVehicleImageValidation(cacheKey);
      validationCache.set(cacheLookupKey, fallback);
      return fallback;
    }

    const classified = classifyVehicleVisionProbe(probe);
    const result: VehicleImageValidationResult = {
      ...classified,
      analyzedAt: new Date().toISOString(),
      cacheKey,
      source: "vision",
    };
    validationCache.set(cacheLookupKey, result);
    return result;
  } catch {
    const fallback = unknownVehicleImageValidation(cacheKey);
    validationCache.set(cacheLookupKey, fallback);
    return fallback;
  }
}
