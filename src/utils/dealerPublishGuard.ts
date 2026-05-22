import { isValidListingImageUrl } from "./listingImages";

/** ฟิลด์จำเป็นสำหรับ Publish Draft → Marketplace */
export type PublishRequiredFieldKey = "image" | "brand" | "model" | "price";

export const PUBLISH_MISSING_THAI: Record<PublishRequiredFieldKey, string> = {
  image: "ขาดรูปภาพสินค้า",
  brand: "ขาดยี่ห้อรถ",
  model: "ขาดรุ่นรถ",
  price: "ขาดราคาขาย",
};

export interface DraftPublishInput {
  id: string;
  brand?: string;
  model?: string;
  price?: number;
  images?: string[];
  /** ไม่นับเป็นรูปจริงถ้ายังไม่มี images ใน storage */
  sourceImageUrls?: string[];
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

  const price = Number(draft.price);
  if (!Number.isFinite(price) || price <= 0) missing.push("price");

  if (getValidPublishImages(draft.id, draft.images).length < 1) {
    missing.push("image");
  }

  return {
    ok: missing.length === 0,
    missingFields: missing,
    missingLabelsThai: missing.map((k) => PUBLISH_MISSING_THAI[k]),
  };
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
    message: "กรุณาเติมข้อมูลจำเป็นให้ครบก่อนส่งรถคันนี้เข้าตลาด",
    missingFields: validation.missingFields,
    missingLabelsThai: validation.missingLabelsThai,
  };
}
