import type { InventoryImportFieldKey } from "../../inventoryImportSchema";
import { extractDigits, FieldNormalizeResult, issue, stripText } from "./common";

export function normalizeMileageField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "mileage";
  const trimmed = stripText(raw);
  if (!trimmed) {
    return { value: "", issues: [] };
  }

  const digits = extractDigits(trimmed);
  if (!digits) {
    return {
      value: "",
      issues: [
        issue(
          "warning",
          "mileage_invalid",
          "เลขไมล์ไม่ชัดเจน",
          field
        ),
      ],
    };
  }

  const num = parseInt(digits, 10);
  if (Number.isNaN(num) || num < 0) {
    return {
      value: "",
      issues: [
        issue("warning", "mileage_invalid", "เลขไมล์ไม่ชัดเจน", field),
      ],
    };
  }

  return { value: String(num), issues: [] };
}
