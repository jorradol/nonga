import type { InventoryImportFieldKey } from "../../inventoryImportSchema";
import { FieldNormalizeResult, issue, stripText } from "./common";

const MIN_YEAR = 1980;
const MAX_YEAR = new Date().getFullYear() + 2;

function buddhistToChristian(year: number): number {
  if (year >= 2400) return year - 543;
  return year;
}

function parseTwoDigitYear(two: number): number {
  if (two >= 0 && two <= 30) return 2000 + two;
  if (two >= 31 && two <= 99) return 1900 + two;
  return two;
}

export function normalizeYearField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "year";
  const trimmed = stripText(raw);
  if (!trimmed) {
    return { value: "", issues: [] };
  }

  const yearMatch = trimmed.match(/(?:ปี\s*)?(\d{2,4})/i);
  const digitStr = yearMatch ? yearMatch[1] : trimmed.replace(/[^\d]/g, "");

  if (!digitStr) {
    return {
      value: "",
      issues: [issue("error", "year_invalid", "ปีรถไม่ถูกต้อง", field)],
    };
  }

  let year = parseInt(digitStr, 10);
  if (Number.isNaN(year)) {
    return {
      value: "",
      issues: [issue("error", "year_invalid", "ปีรถไม่ถูกต้อง", field)],
    };
  }

  if (digitStr.length === 2) {
    year = parseTwoDigitYear(year);
  } else if (year >= 2400 || (year > MAX_YEAR && year < 2400 + 100)) {
    year = buddhistToChristian(year);
  } else if (year > 100 && year < 2400 && year > MAX_YEAR) {
    year = buddhistToChristian(year);
  }

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return {
      value: "",
      issues: [issue("error", "year_invalid", "ปีรถไม่ถูกต้อง", field)],
    };
  }

  return { value: String(year), issues: [] };
}
