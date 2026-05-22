import type { InventoryImportFieldKey } from "../../inventoryImportSchema";
import type { NormalizedInventoryRow } from "../../inventoryImportSchema";
import type { ValidationIssue } from "../types";
import { normalizePriceField } from "./priceNormalizer";
import { normalizeMileageField } from "./mileageNormalizer";
import { normalizeYearField } from "./yearNormalizer";
import { normalizeGearField } from "./gearNormalizer";
import {
  normalizeImageUrlsField,
  normalizeYoutubeUrlField,
  normalizeTiktokUrlField,
} from "./urlNormalizer";
import {
  normalizeBrandField,
  normalizeModelField,
  normalizeColorField,
  normalizeFuelTypeField,
  normalizeStatusLikeField,
  normalizeFinanceStatusField,
} from "./textNormalizer";
import { stripText } from "./common";
import type { FieldNormalizeResult } from "./common";

type NormalizerFn = (raw: string) => FieldNormalizeResult;

const FIELD_NORMALIZERS: Partial<Record<InventoryImportFieldKey, NormalizerFn>> =
  {
    brand: normalizeBrandField,
    model: normalizeModelField,
    year: normalizeYearField,
    price: normalizePriceField,
    mileage: normalizeMileageField,
    color: normalizeColorField,
    fuelType: normalizeFuelTypeField,
    gear: normalizeGearField,
    imageUrls: normalizeImageUrlsField,
    youtubeUrl: normalizeYoutubeUrlField,
    tiktokUrl: normalizeTiktokUrlField,
    status: (raw) => normalizeStatusLikeField(raw, "status"),
    financeStatus: normalizeFinanceStatusField,
    qcStatus: (raw) => normalizeStatusLikeField(raw, "qcStatus"),
    repairStatus: (raw) => normalizeStatusLikeField(raw, "repairStatus"),
  };

/** ทำความสะอาดทุก field ที่มี normalizer */
export function cleanNormalizedRow(
  row: NormalizedInventoryRow
): { data: NormalizedInventoryRow; issues: ValidationIssue[] } {
  const data = { ...row };
  const issues: ValidationIssue[] = [];

  for (const key of Object.keys(FIELD_NORMALIZERS) as InventoryImportFieldKey[]) {
    const fn = FIELD_NORMALIZERS[key];
    if (!fn) continue;
    const raw = row[key] ?? "";
    if (!stripText(raw) && key !== "brand" && key !== "model" && key !== "year" && key !== "price") {
      continue;
    }
    const result = fn(raw);
    data[key] = result.value;
    issues.push(...result.issues);
  }

  for (const key of Object.keys(data) as InventoryImportFieldKey[]) {
    if (key === "ignore") continue;
    if (!FIELD_NORMALIZERS[key] && stripText(data[key])) {
      data[key] = stripText(data[key]).replace(/\s+/g, " ");
    }
  }

  return { data, issues };
}
