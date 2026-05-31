import { isValidListingImageUrl } from "./listingImages";
import type { VehicleImageMetadataFields } from "./vehicleImageValidationShared";
import {
  VEHICLE_IMAGE_PUBLISH_BLOCK_MESSAGE,
  countPublishableVehicleImages,
  hasActionableVehicleImageAnalysis,
} from "./vehicleImageValidationShared";

/** ฟิลด์จำเป็นสำหรับ Publish Draft → Marketplace */
export type PublishRequiredFieldKey =
  | "image"
  | "vehicle_image"
  | "brand"
  | "model"
  | "year"
  | "price"
  | "mileage";

export const PUBLISH_MISSING_THAI: Record<PublishRequiredFieldKey, string> = {
  image: "ขาดรูปภาพสินค้า",
  vehicle_image: "ยังไม่พบรูปรถที่ชัดเจน",
  brand: "ขาดยี่ห้อรถ",
  model: "ขาดรุ่นรถ",
  year: "ขาดปีรถ",
  price: "ขาดราคาขาย",
  mileage: "ขาดเลขไมล์",
};

export function getPublishMissingLabelsThai(
  missingFields: readonly string[]
): string[] {
  return missingFields
    .map((field) => PUBLISH_MISSING_THAI[field as PublishRequiredFieldKey])
    .filter((label): label is string => Boolean(label));
}

export interface DraftPublishInput {
  id: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  images?: string[];
  /** ไม่นับเป็นรูปจริงถ้ายังไม่มี images ใน storage */
  sourceImageUrls?: string[];
  imageMetadata?: readonly VehicleImageMetadataFields[];
}

export interface DraftPublishValidation {
  ok: boolean;
  missingFields: PublishRequiredFieldKey[];
  missingLabelsThai: string[];
}

/** รูปที่นับได้ก่อน publish — ไม่รวม placeholder / unsplash fallback */
export function getValidPublishImages(
  listingId: string,
  images?: string[]
): string[] {
  return (images ?? []).filter((u) =>
    isValidListingImageUrl(String(u).trim(), listingId)
  );
}

export function validateDraftForPublish(
  draft: DraftPublishInput
): DraftPublishValidation {
  const missing: PublishRequiredFieldKey[] = [];

  if (!draft.brand?.trim()) missing.push("brand");
  if (!draft.model?.trim()) missing.push("model");

  const year = Number(draft.year);
  if (
    !Number.isFinite(year) ||
    year < 1980 ||
    year > new Date().getFullYear() + 2
  ) {
    missing.push("year");
  }

  const price = Number(draft.price);
  if (!Number.isFinite(price) || price <= 0) missing.push("price");

  const mileage = Number(draft.mileage);
  if (!Number.isFinite(mileage) || mileage < 0) missing.push("mileage");

  if (getValidPublishImages(draft.id, draft.images).length < 1) {
    missing.push("image");
  } else if (
    hasActionableVehicleImageAnalysis(draft.imageMetadata) &&
    countPublishableVehicleImages(
      draft.id,
      draft.images,
      draft.imageMetadata,
      getValidPublishImages(draft.id, draft.images)
    ) < 1
  ) {
    missing.push("vehicle_image");
  }

  return {
    ok: missing.length === 0,
    missingFields: missing,
    missingLabelsThai: getPublishMissingLabelsThai(missing),
  };
}

export function publishGuardVehicleImageMessage(
  validation: DraftPublishValidation
): string {
  if (validation.missingFields.includes("vehicle_image")) {
    return VEHICLE_IMAGE_PUBLISH_BLOCK_MESSAGE;
  }
  return "กรุณาเติมข้อมูลจำเป็นให้ครบก่อนส่งรถคันนี้เข้าตลาด";
}

export function isMissingFieldsPublishError(
  result: { error: string } & Record<string, unknown>
): result is {
  error: "missing_required_fields";
  missingFields: PublishRequiredFieldKey[];
  missingLabelsThai: string[];
  message: string;
} {
  return result.error === "missing_required_fields";
}

export function publishGuardApiBody(validation: DraftPublishValidation) {
  return {
    success: false as const,
    error: "missing_required_fields" as const,
    message: publishGuardVehicleImageMessage(validation),
    missingFields: validation.missingFields,
    missingLabelsThai: validation.missingLabelsThai,
  };
}
