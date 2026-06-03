/**
 * v5.4.10 — shared member listing publish readiness (client + server).
 */

import type { Car } from "../../types";
import type { MarketplaceCarRecord } from "../../server/marketplaceInventory";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import { getMissingCoreFieldLabels } from "../ai/chat/chatPrecheckLayer";
import { isValidListingImageUrl } from "../../utils/listingImages";

export type MemberListingPublishBlockReason =
  | "already-published"
  | "missing-core-fields"
  | "missing-images";

export type MemberListingPublishValidation =
  | { ok: true }
  | {
      ok: false;
      reason: MemberListingPublishBlockReason;
      message: string;
      missingCoreLabels?: string[];
    };

export type MemberListingLike = Pick<
  Car | MarketplaceCarRecord,
  | "id"
  | "brand"
  | "model"
  | "year"
  | "price"
  | "mileage"
  | "transmission"
  | "condition"
  | "description"
  | "color"
  | "images"
  | "listingStatus"
>;

export function countRealListingImagesOnRecord(car: {
  id: string;
  images: string[];
}): number {
  return car.images.filter((url) => isValidListingImageUrl(url, car.id)).length;
}

function extractTransmissionFromListingRecord(
  car: MemberListingLike
): string | undefined {
  if (typeof car.transmission === "string" && car.transmission.trim()) {
    return car.transmission.trim();
  }

  const candidates = [car.condition, car.description].filter(
    (value): value is string => typeof value === "string" && Boolean(value.trim())
  );

  for (const text of candidates) {
    const normalized = text.trim();
    const labeled = normalized.match(
      /(?:เกียร์)\s*(ออโต้|อัตโนมัติ|auto|at|mt|manual|ธรรมดา|cvt)/i
    );
    if (labeled) {
      const raw = labeled[1];
      if (/ออโต้|อัตโนมัติ|auto|cvt|^at$/i.test(raw)) return "เกียร์ออโต้";
      if (/^mt$|manual|ธรรมดา/i.test(raw)) return "เกียร์ธรรมดา";
      return `เกียร์ ${raw.trim()}`;
    }
    if (/ออโต้|อัตโนมัติ|automatic|cvt/i.test(normalized)) return "เกียร์ออโต้";
    if (/manual|ธรรมดา/i.test(normalized)) return "เกียร์ธรรมดา";
  }

  return undefined;
}

export function carRecordToExtractedFields(
  car: MemberListingLike
): ExtractedCarFields {
  return {
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    transmission: extractTransmissionFromListingRecord(car),
    color: car.color,
    description: car.description,
  };
}

export function buildMemberPublishMissingCoreFieldsMessage(
  missingLabels: string[]
): string {
  if (missingLabels.length === 0) {
    return "ข้อมูลในระบบยังไม่ครบสำหรับเผยแพร่ครับ กรุณาแก้ไขที่ “ประกาศของฉัน” ให้ครบก่อน";
  }
  return [
    "ข้อมูลในระบบยังไม่ครบสำหรับเผยแพร่ครับ",
    `ยังขาด: ${missingLabels.join(", ")}`,
    "",
    "กรุณาแก้ไขที่ “ประกาศของฉัน” ให้ครบก่อน แล้วกด “แสดงอีกครั้ง” หรือ “พร้อมลงตลาด” จากแชท",
  ].join("\n");
}

export const MEMBER_PUBLISH_MISSING_IMAGES_MESSAGE =
  "ต้องมีรูปอย่างน้อย 1 รูปก่อนเผยแพร่ครับ กรุณาเพิ่มรูปที่ “ประกาศของฉัน” แล้วลองอีกครั้ง";

export const MEMBER_PUBLISH_ALREADY_PUBLISHED_MESSAGE =
  "ประกาศนี้ลงตลาดแล้วครับ";

/**
 * Validate listing record before unhide/publish (My Listings + server visibility).
 */
export function validateMemberListingRecordReadyToPublish(
  car: MemberListingLike
): MemberListingPublishValidation {
  if (car.listingStatus === "published") {
    return {
      ok: false,
      reason: "already-published",
      message: MEMBER_PUBLISH_ALREADY_PUBLISHED_MESSAGE,
    };
  }

  const fields = carRecordToExtractedFields(car);
  const missingCoreLabels = getMissingCoreFieldLabels(fields);
  if (missingCoreLabels.length > 0) {
    return {
      ok: false,
      reason: "missing-core-fields",
      message: buildMemberPublishMissingCoreFieldsMessage(missingCoreLabels),
      missingCoreLabels,
    };
  }

  if (countRealListingImagesOnRecord(car) < 1) {
    return {
      ok: false,
      reason: "missing-images",
      message: MEMBER_PUBLISH_MISSING_IMAGES_MESSAGE,
    };
  }

  return { ok: true };
}
