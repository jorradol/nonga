import type { InventoryImportFieldKey } from "../../inventoryImportSchema";
import {
  extractDigits,
  FieldNormalizeResult,
  isAmbiguousPricePattern,
  issue,
  parseAmbiguousPrice,
  stripText,
} from "./common";

export function normalizePriceField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "price";
  const trimmed = stripText(raw);
  if (!trimmed) {
    return { value: "", issues: [] };
  }

  if (isAmbiguousPricePattern(trimmed)) {
    const parsed = parseAmbiguousPrice(trimmed);
    if (parsed !== null && parsed > 0) {
      return {
        value: String(parsed),
        issues: [
          issue(
            "warning",
            "price_ambiguous",
            `ราคารูปแบบ "${trimmed}" แปลงเป็นประมาณ ${parsed.toLocaleString("th-TH")} บาท — กรุณาตรวจสอบ`,
            field
          ),
        ],
      };
    }
    return {
      value: "",
      issues: [
        issue(
          "warning",
          "price_ambiguous_unparsed",
          `ราคารูปแบบ "${trimmed}" ไม่ชัดเจน — กรุณาตรวจสอบด้วยตนเอง`,
          field
        ),
      ],
    };
  }

  const digits = extractDigits(trimmed);
  if (!digits) {
    return {
      value: "",
      issues: [
        issue("error", "price_invalid", "ราคาไม่ถูกต้อง", field),
      ],
    };
  }

  const num = parseInt(digits, 10);
  if (Number.isNaN(num) || num <= 0) {
    return {
      value: "",
      issues: [
        issue("error", "price_invalid", "ราคาไม่ถูกต้อง", field),
      ],
    };
  }

  return { value: String(num), issues: [] };
}
