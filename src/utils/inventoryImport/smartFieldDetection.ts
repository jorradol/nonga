import type { InventoryImportFieldKey } from "./inventoryImportSchema";
import { COLUMN_MAPPING_RULES } from "./columnMappingRules";
import {
  buildAutoColumnMappings,
  getExactHeaderMatchScore,
  normalizeColumnKey,
  suggestMappingForColumn,
  type ColumnMappingEntry,
} from "./columnMapping";
import type { InventoryRow } from "./types";

const KNOWN_BRANDS = [
  "toyota",
  "honda",
  "suzuki",
  "isuzu",
  "mazda",
  "nissan",
  "mitsubishi",
  "ford",
  "chevrolet",
  "bmw",
  "mercedes",
  "benz",
  "hyundai",
  "kia",
  "volvo",
  "subaru",
  "lexus",
  "mg",
  "proton",
  "haval",
  "gwm",
  "byd",
  "tesla",
  "อีซูซุ",
  "โตโยต้า",
  "ฮอนด้า",
  "ซูซูกิ",
  "มาสด้า",
  "นิสสัน",
  "ฟอร์ด",
  "เมอร์เซเดส",
];

const CAR_TEXT_HINTS =
  /รถ|car|vehicle|sedan|suv|pickup|กระบะ|มือสอง|ไมล์|mileage|ทะเบียน|cc\b|เกียร์|เบนซิน|ดีเซล|hybrid|ev\b/i;

const URL_PATTERN = /^https?:\/\//i;
const YEAR_PATTERN = /^(19[89]\d|20[0-2]\d)$/;
const PHONE_PATTERN = /^0[689]\d{8}$/;

function sampleValues(rows: InventoryRow[], column: string, limit = 12): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const v = String(row[column] ?? "").trim();
    if (v) out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

function scoreValuesAsField(
  field: InventoryImportFieldKey,
  values: string[]
): number {
  if (values.length === 0) return 0;
  let score = 0;
  let hits = 0;

  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;

    switch (field) {
      case "imageUrls":
        if (URL_PATTERN.test(v) || /\.(jpg|jpeg|png|webp|gif)/i.test(v)) {
          score += 25;
          hits++;
        }
        break;
      case "year": {
        const y = parseInt(v.replace(/[^\d]/g, ""), 10);
        if (y >= 1980 && y <= new Date().getFullYear() + 2) {
          score += 22;
          hits++;
        }
        break;
      }
      case "price": {
        const p = parseInt(v.replace(/[,\s]/g, ""), 10);
        if (p >= 10_000 && p <= 50_000_000) {
          score += 20;
          hits++;
        }
        break;
      }
      case "mileage": {
        const m = parseInt(v.replace(/[,\s]/g, ""), 10);
        if (m >= 0 && m <= 999_999) {
          score += 18;
          hits++;
        }
        break;
      }
      case "brand": {
        const low = v.toLowerCase();
        if (KNOWN_BRANDS.some((b) => low.includes(b))) {
          score += 24;
          hits++;
        }
        break;
      }
      case "model":
        if (v.length >= 2 && v.length <= 40 && !YEAR_PATTERN.test(v)) {
          score += 10;
          hits++;
        }
        break;
      case "fuelType":
        if (/เบนซิน|ดีเซล|hybrid|electric|ev|ไฮบริด|น้ำมัน|petrol|diesel/i.test(v)) {
          score += 20;
          hits++;
        }
        break;
      case "gear":
        if (/อัตโนมัติ|manual|cvt|at\b|mt\b|เกียร์/i.test(v)) {
          score += 18;
          hits++;
        }
        break;
      case "licensePlate":
        if (/[ก-ฮ]{1,2}\s?\d{1,4}/.test(v)) {
          score += 22;
          hits++;
        }
        break;
      default:
        break;
    }
  }

  const ratio = hits / values.length;
  return score * (0.5 + ratio * 0.5);
}

/** เดาฟิลด์จากค่าในเซลล์ (เมื่อ header ไม่ตรง) */
export function detectFieldFromColumnValues(
  columnName: string,
  values: string[]
): { field: InventoryImportFieldKey; score: number } {
  const headerGuess = suggestMappingForColumn(columnName);
  const exactHeaderScore = getExactHeaderMatchScore(columnName, headerGuess);
  let bestField: InventoryImportFieldKey = headerGuess !== "ignore" ? headerGuess : "ignore";
  let bestScore =
    exactHeaderScore > 0
      ? exactHeaderScore
      : headerGuess !== "ignore"
        ? 45
        : 0;

  const candidates: InventoryImportFieldKey[] = [
    "brand",
    "model",
    "year",
    "price",
    "mileage",
    "imageUrls",
    "fuelType",
    "gear",
    "color",
    "licensePlate",
    "description",
  ];

  for (const field of candidates) {
    const valueScore = scoreValuesAsField(field, values);
    if (valueScore > bestScore) {
      bestScore = valueScore;
      bestField = field;
    }
  }

  return { field: bestField, score: bestScore };
}

/**
 * ปรับ mapping ด้วย smart detection — header + ค่าในเซลล์
 */
export function buildSmartColumnMappings(
  columns: string[],
  rows: InventoryRow[]
): ColumnMappingEntry[] {
  const base = buildAutoColumnMappings(columns, rows);
  const usedFields = new Set<InventoryImportFieldKey>();

  return base.map((entry) => {
    const values = sampleValues(rows, entry.originalColumn);
    const { field: valueField, score: valueScore } = detectFieldFromColumnValues(
      entry.originalColumn,
      values
    );

    let finalMapping = entry.finalMapping;
    const exactHeaderScore = getExactHeaderMatchScore(
      entry.originalColumn,
      entry.suggestedMapping
    );
    const headerLocked = exactHeaderScore >= 100;

    if (
      valueScore >= 35 &&
      (finalMapping === "ignore" || valueScore > 50) &&
      !(headerLocked && valueField !== finalMapping)
    ) {
      finalMapping = valueField;
    }

    if (
      finalMapping !== "ignore" &&
      usedFields.has(finalMapping)
    ) {
      if (
        valueScore >= 40 &&
        valueField !== finalMapping &&
        !usedFields.has(valueField)
      ) {
        finalMapping = valueField;
      } else {
        finalMapping = "ignore";
      }
    }

    if (finalMapping !== "ignore") {
      usedFields.add(finalMapping);
    }

    return {
      ...entry,
      suggestedMapping:
        valueScore > 40 ? valueField : entry.suggestedMapping,
      finalMapping,
    };
  });
}

/** ข้อความรวมของแถวดูเหมือนข้อมูลรถหรือไม่ */
export function rowLooksLikeVehicle(rawRow: InventoryRow): boolean {
  const text = Object.values(rawRow).join(" ");
  if (!text.trim()) return false;
  if (CAR_TEXT_HINTS.test(text)) return true;
  const low = text.toLowerCase();
  return KNOWN_BRANDS.some((b) => low.includes(b));
}

export function isRowEffectivelyEmpty(rawRow: InventoryRow): boolean {
  return Object.values(rawRow).every((v) => !String(v ?? "").trim());
}
