import type { NormalizedInventoryRow } from "./inventoryImportSchema";
import type { InventoryRow } from "./types";
import { isRowEffectivelyEmpty, rowLooksLikeVehicle } from "./smartFieldDetection";

export type ImportDisposition =
  | "published"
  | "draft"
  | "needs_review"
  | "rejected";

export interface ConfidenceResult {
  score: number;
  disposition: ImportDisposition;
  missingFields: string[];
  signals: string[];
}

const PUBLISH_CONFIDENCE_MIN = 50;

function hasValidYear(data: NormalizedInventoryRow): boolean {
  if (!data.year?.trim()) return false;
  const y = parseInt(data.year, 10);
  return !Number.isNaN(y) && y >= 1980 && y <= new Date().getFullYear() + 2;
}

function hasValidPrice(data: NormalizedInventoryRow): boolean {
  if (!data.price?.trim()) return false;
  const p = parseInt(data.price.replace(/[,\s]/g, ""), 10);
  return !Number.isNaN(p) && p > 0;
}

function hasDealerContact(data: NormalizedInventoryRow, raw?: InventoryRow): boolean {
  const blob = [
    data.notes,
    data.description,
    ...(raw ? Object.values(raw) : []),
  ]
    .join(" ");
  return /0[689]\d[\d\s-]{7,}/.test(blob) || /เซลล์|dealer|โชว์รูม|showroom/i.test(blob);
}

/**
 * คะแนนความมั่นใจ 0–100 ต่อแถว
 */
export function computeImportConfidence(
  data: NormalizedInventoryRow,
  rawRow?: InventoryRow
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  if (data.brand?.trim()) {
    score += 15;
    signals.push("brand");
  }
  if (data.model?.trim()) {
    score += 15;
    signals.push("model");
  }
  if (hasValidYear(data)) {
    score += 15;
    signals.push("year");
  }
  if (hasValidPrice(data)) {
    score += 15;
    signals.push("price");
  }
  if (data.mileage?.trim()) {
    score += 8;
    signals.push("mileage");
  }
  if (data.imageUrls?.trim()) {
    score += 12;
    signals.push("images");
  }
  if (hasDealerContact(data, rawRow)) {
    score += 5;
    signals.push("dealer_contact");
  }
  if (data.fuelType?.trim()) score += 3;
  if (data.gear?.trim()) score += 3;
  if (data.color?.trim()) score += 3;
  if (data.province?.trim()) score += 2;

  if (rawRow && rowLooksLikeVehicle(rawRow)) {
    score += 8;
    signals.push("car_like_text");
  }

  return { score: Math.min(100, score), signals };
}

export function getMissingPublishFields(data: NormalizedInventoryRow): string[] {
  const missing: string[] = [];
  if (!data.brand?.trim()) missing.push("brand");
  if (!data.model?.trim()) missing.push("model");
  if (!hasValidYear(data)) missing.push("year");
  if (!hasValidPrice(data)) missing.push("price");
  return missing;
}

/**
 * กำหนดเส้นทางนำเข้า: published / draft / needs_review / rejected
 */
export function resolveImportDisposition(
  data: NormalizedInventoryRow,
  rawRow?: InventoryRow
): ConfidenceResult {
  const { score, signals } = computeImportConfidence(data, rawRow);
  const missingFields = getMissingPublishFields(data);

  if (rawRow && isRowEffectivelyEmpty(rawRow)) {
    return {
      score: 0,
      disposition: "rejected",
      missingFields,
      signals,
    };
  }

  const hasBrand = !!data.brand?.trim();
  const hasModel = !!data.model?.trim();
  const hasYear = hasValidYear(data);
  const hasPrice = hasValidPrice(data);
  const carLike = score >= 20 || (rawRow && rowLooksLikeVehicle(rawRow));

  if (!carLike && !hasBrand && !hasModel) {
    return {
      score,
      disposition: "rejected",
      missingFields,
      signals,
    };
  }

  if (!hasBrand && (score < 35 || !hasModel)) {
    return {
      score,
      disposition: "needs_review",
      missingFields,
      signals,
    };
  }

  if (hasBrand && hasModel && hasYear && hasPrice && score >= PUBLISH_CONFIDENCE_MIN) {
    return {
      score,
      disposition: "published",
      missingFields: [],
      signals,
    };
  }

  if (hasBrand && hasModel) {
    return {
      score,
      disposition: "draft",
      missingFields,
      signals,
    };
  }

  return {
    score,
    disposition: "needs_review",
    missingFields,
    signals,
  };
}
