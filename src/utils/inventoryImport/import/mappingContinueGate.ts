import type { ColumnMappingEntry } from "../columnMapping";

const REQUIRED_MAPPING_FIELDS = ["brand", "model", "year", "price"] as const;
const REQUIRED_MAPPING_LABELS: Record<(typeof REQUIRED_MAPPING_FIELDS)[number], string> = {
  brand: "ยี่ห้อ",
  model: "รุ่น",
  year: "ปี",
  price: "ราคา",
};

export interface MappingContinueGateResult {
  hasRows: boolean;
  mappedRequiredFields: string[];
  missingRequiredFields: string[];
  canContinue: boolean;
  reasons: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function evaluateMappingContinueGate(
  entries: ColumnMappingEntry[],
  totalRows: number,
  commitEnabled = true
): MappingContinueGateResult {
  const hasRows = totalRows > 0;
  const mappedFields = new Set(
    entries
      .map((entry) => entry.finalMapping)
      .filter((field) => field !== "ignore")
  );

  const missingRequiredFields = REQUIRED_MAPPING_FIELDS.filter(
    (field) => !mappedFields.has(field)
  );

  const reasons: string[] = [];
  if (!hasRows) {
    reasons.push("ยังไม่พบข้อมูลรถในไฟล์");
  }

  for (const field of missingRequiredFields) {
    reasons.push(`ยังต้องจับคู่คอลัมน์ ${REQUIRED_MAPPING_LABELS[field]}`);
  }

  if (!commitEnabled) {
    reasons.push("บัญชีนี้ยังไม่มีสิทธิ์ commit staging import");
  }

  const uniqueReasons = unique(reasons);
  const canContinue = hasRows && missingRequiredFields.length === 0;

  return {
    hasRows,
    mappedRequiredFields: REQUIRED_MAPPING_FIELDS.filter((field) =>
      mappedFields.has(field)
    ),
    missingRequiredFields,
    canContinue,
    reasons: uniqueReasons,
  };
}
