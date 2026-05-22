import type { InventoryImportFieldKey } from "../../inventoryImportSchema";
import { FieldNormalizeResult, issue, stripText } from "./common";

export function normalizeBrandField(raw: string): FieldNormalizeResult {
  const v = stripText(raw).replace(/\s+/g, " ");
  return { value: v, issues: [] };
}

export function normalizeModelField(raw: string): FieldNormalizeResult {
  const v = stripText(raw).replace(/\s+/g, " ");
  return { value: v, issues: [] };
}

export function normalizeColorField(raw: string): FieldNormalizeResult {
  return { value: stripText(raw), issues: [] };
}

const FUEL_MAP: [RegExp, string][] = [
  [/ไฟฟ้า|ev|bev|electric/i, "electric"],
  [/hybrid|ไฮบริด|plug.?in/i, "hybrid"],
  [/ดีเซล|diesel/i, "diesel"],
  [/เบนซิน|benzine|petrol|gasoline|benzin/i, "petrol"],
  [/ngv|lpg|ก๊าซ/i, "gas"],
];

export function normalizeFuelTypeField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "fuelType";
  const trimmed = stripText(raw);
  if (!trimmed) return { value: "", issues: [] };

  for (const [pattern, canonical] of FUEL_MAP) {
    if (pattern.test(trimmed)) {
      return { value: canonical, issues: [] };
    }
  }

  return {
    value: trimmed,
    issues: [
      issue(
        "warning",
        "fuel_unclear",
        `เชื้อเพลิง "${trimmed}" ไม่ตรงมาตรฐาน`,
        field
      ),
    ],
  };
}

export function normalizeStatusLikeField(
  raw: string,
  field: InventoryImportFieldKey
): FieldNormalizeResult {
  const trimmed = stripText(raw);
  if (!trimmed) return { value: "", issues: [] };
  return { value: trimmed, issues: [] };
}

export function normalizeFinanceStatusField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "financeStatus";
  const trimmed = stripText(raw);
  if (!trimmed) {
    return { value: "", issues: [] };
  }

  const lower = trimmed.toLowerCase();
  if (
    /ไม่ชัด|ไม่ระบุ|unknown|n\/a|na|-/i.test(lower) ||
    trimmed.length < 2
  ) {
    return {
      value: trimmed,
      issues: [
        issue(
          "warning",
          "finance_unclear",
          "สถานะไฟแนนซ์ไม่ชัดเจน",
          field
        ),
      ],
    };
  }

  return { value: trimmed, issues: [] };
}
