import type { InventoryImportFieldKey } from "../../inventoryImportSchema";
import { FieldNormalizeResult, issue, stripText } from "./common";

const AT_PATTERNS =
  /^(ออโต้|ออโต|อัตโนมัติ|auto|automatic|a\/t|at|cvt|dct|tiptronic|เกียร์ออโต)/i;
const MT_PATTERNS =
  /^(ธรรมดา|ธรรมด|manual|m\/t|mt|เกียร์ธรรมดา|เกียร์มือ)/i;

export function normalizeGearField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "gear";
  const trimmed = stripText(raw);
  if (!trimmed) {
    return { value: "", issues: [] };
  }

  if (AT_PATTERNS.test(trimmed)) {
    return { value: "AT", issues: [] };
  }
  if (MT_PATTERNS.test(trimmed)) {
    return { value: "MT", issues: [] };
  }

  return {
    value: trimmed,
    issues: [
      issue(
        "warning",
        "gear_unclear",
        `เกียร์ "${trimmed}" ไม่ตรงมาตรฐาน AT/MT`,
        field
      ),
    ],
  };
}
