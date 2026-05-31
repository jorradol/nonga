/**
 * Vehicle image validation — shared types, classification, publish guard helpers.
 *
 * Phase 2 (future): real Vision enforcement must route through AI endpoint
 * guard / rate-limit / cache / abuse counter — not direct Gemini from upload.
 * This round: foundation + metadata + tests only; default safe mode does not
 * call Gemini; staging keeps NONGA_VEHICLE_IMAGE_VALIDATION unset (off).
 */
export type VehicleImageValidationMode =
  | "off"
  | "metadata-only"
  | "foundation"
  | "vision";

export function resolveVehicleImageValidationMode(
  env: Partial<Pick<NodeJS.ProcessEnv, "NONGA_VEHICLE_IMAGE_VALIDATION">> = process.env
): VehicleImageValidationMode {
  const raw = String(env.NONGA_VEHICLE_IMAGE_VALIDATION ?? "")
    .trim()
    .toLowerCase();
  if (raw === "vision") return "vision";
  if (raw === "metadata-only" || raw === "foundation") return "metadata-only";
  // Default safe mode — never call Gemini unless vision is explicitly enabled.
  return "off";
}

export function shouldCallVehicleVisionAnalyzer(
  mode: VehicleImageValidationMode = resolveVehicleImageValidationMode()
): boolean {
  return mode === "vision";
}

export type VehicleImageStatus = "pass" | "warn" | "fail" | "unknown";

export type VehicleImageValidationSource = "vision" | "foundation" | "unknown";

export interface VehicleImageMetadataFields {
  imageUrl?: string;
  imagePath?: string;
  hasVehicle?: boolean;
  vehicleConfidence?: number;
  vehicleImageStatus?: VehicleImageStatus;
  vehicleImageReason?: string;
}

export interface VehicleVisionProbeLike {
  hasVehicle: boolean;
  vehicleConfidence: number;
  imageClarity?: number;
  isInappropriate?: boolean;
  category?: string;
}

export const VEHICLE_IMAGE_FAIL_MESSAGE =
  "รูปนี้ยังไม่เห็นตัวรถชัดเจนครับคุณพี่ กรุณาอัปโหลดรูปรถด้านหน้า ด้านข้าง หรือด้านหลังอีกครั้งนะครับ";

export const VEHICLE_IMAGE_WARN_MESSAGE =
  "รูปนี้อาจเป็นรูปรถ แต่ยังเห็นรายละเอียดไม่ชัดครับ ถ้ามีรูปด้านหน้า ด้านข้าง ภายใน และเลขไมล์ จะช่วยให้น้องเอสร้างประกาศได้มืออาชีพขึ้นครับ";

export const VEHICLE_IMAGE_PUBLISH_BLOCK_MESSAGE =
  "ยังไม่สามารถลงตลาดได้ครับ เพราะระบบยังไม่พบรูปรถที่ชัดเจนอย่างน้อย 1 รูป กรุณาอัปโหลดรูปรถจริงก่อนนะครับ";

export const VEHICLE_WARN_PUBLISH_MIN_CONFIDENCE = 0.65;
export const VEHICLE_PASS_MIN_CONFIDENCE = 0.72;
export const VEHICLE_CLARITY_WARN_THRESHOLD = 0.45;

export function classifyVehicleVisionProbe(probe: VehicleVisionProbeLike): {
  hasVehicle: boolean;
  vehicleConfidence: number;
  vehicleImageStatus: VehicleImageStatus;
  vehicleImageReason: string;
} {
  const vehicleConfidence = clamp01(probe.vehicleConfidence);
  const clarity = clamp01(probe.imageClarity ?? vehicleConfidence);

  if (probe.isInappropriate) {
    return {
      hasVehicle: false,
      vehicleConfidence,
      vehicleImageStatus: "fail",
      vehicleImageReason: VEHICLE_IMAGE_FAIL_MESSAGE,
    };
  }

  if (!probe.hasVehicle) {
    return {
      hasVehicle: false,
      vehicleConfidence,
      vehicleImageStatus: "fail",
      vehicleImageReason: VEHICLE_IMAGE_FAIL_MESSAGE,
    };
  }

  if (
    vehicleConfidence >= VEHICLE_PASS_MIN_CONFIDENCE &&
    clarity >= VEHICLE_CLARITY_WARN_THRESHOLD
  ) {
    return {
      hasVehicle: true,
      vehicleConfidence,
      vehicleImageStatus: "pass",
      vehicleImageReason: "",
    };
  }

  if (vehicleConfidence >= 0.4 || clarity >= VEHICLE_CLARITY_WARN_THRESHOLD) {
    return {
      hasVehicle: true,
      vehicleConfidence,
      vehicleImageStatus: "warn",
      vehicleImageReason: VEHICLE_IMAGE_WARN_MESSAGE,
    };
  }

  return {
    hasVehicle: probe.hasVehicle,
    vehicleConfidence,
    vehicleImageStatus: "unknown",
    vehicleImageReason: VEHICLE_IMAGE_WARN_MESSAGE,
  };
}

export function countsAsPublishVehicleImage(
  meta: VehicleImageMetadataFields
): boolean {
  const status = meta.vehicleImageStatus;
  const confidence = Number(meta.vehicleConfidence ?? 0);
  if (status === "pass") return true;
  if (status === "warn" && confidence >= VEHICLE_WARN_PUBLISH_MIN_CONFIDENCE) {
    return true;
  }
  return false;
}

export function hasActionableVehicleImageAnalysis(
  imageMetadata?: readonly VehicleImageMetadataFields[]
): boolean {
  return (imageMetadata ?? []).some((item) => {
    const status = item.vehicleImageStatus;
    // unknown / foundation safe fallback never triggers publish enforcement
    return status === "pass" || status === "warn" || status === "fail";
  });
}

export function countPublishableVehicleImages(
  listingId: string,
  images: string[] | undefined,
  imageMetadata: readonly VehicleImageMetadataFields[] | undefined,
  validImageUrls: string[]
): number {
  if (!imageMetadata?.length) return 0;
  const valid = new Set(validImageUrls);
  const byUrl = new Map<string, VehicleImageMetadataFields>();
  for (const item of imageMetadata) {
    const url = String(item.imageUrl ?? item.imagePath ?? "").trim();
    if (url) byUrl.set(url, item);
  }

  let count = 0;
  for (const url of images ?? []) {
    const trimmed = String(url).trim();
    if (!valid.has(trimmed)) continue;
    const meta = byUrl.get(trimmed);
    if (meta && countsAsPublishVehicleImage(meta)) count += 1;
  }
  return count;
}

export function validateDraftVehicleImagesForPublish(input: {
  id: string;
  images?: string[];
  imageMetadata?: readonly VehicleImageMetadataFields[];
}): { ok: true } | { ok: false; message: string } {
  const validUrls = (input.images ?? []).filter((url) =>
    String(url).trim().startsWith("/storage/listings/")
  );
  if (!hasActionableVehicleImageAnalysis(input.imageMetadata)) {
    return { ok: true };
  }
  const publishable = countPublishableVehicleImages(
    input.id,
    input.images,
    input.imageMetadata,
    validUrls
  );
  if (publishable >= 1) return { ok: true };
  return { ok: false, message: VEHICLE_IMAGE_PUBLISH_BLOCK_MESSAGE };
}

export function vehicleMetadataFromValidation(input?: {
  hasVehicle?: boolean;
  vehicleConfidence?: number;
  vehicleImageStatus?: VehicleImageStatus;
  vehicleImageReason?: string;
} | null): VehicleImageMetadataFields {
  if (!input) return {};
  return {
    hasVehicle: input.hasVehicle,
    vehicleConfidence: input.vehicleConfidence,
    vehicleImageStatus: input.vehicleImageStatus,
    ...(input.vehicleImageReason
      ? { vehicleImageReason: input.vehicleImageReason }
      : {}),
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return Math.min(1, value / 100);
  return Math.max(0, Math.min(1, value));
}
