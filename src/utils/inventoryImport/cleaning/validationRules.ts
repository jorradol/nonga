import type { InventoryImportFieldKey } from "../inventoryImportSchema";
import type { NormalizedInventoryRow } from "../inventoryImportSchema";
import type {
  RowValidationStatus,
  ValidationIssue,
} from "./types";
import { REQUIRED_IMPORT_FIELDS } from "./types";
import { issue } from "./normalizers/common";

export function validateRequiredFields(
  data: NormalizedInventoryRow
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.brand?.trim()) {
    issues.push(
      issue("error", "missing_brand", "ไม่มี brand", "brand")
    );
  }

  if (!data.model?.trim()) {
    issues.push(
      issue("error", "missing_model", "ไม่มี model", "model")
    );
  }

  if (!data.year?.trim()) {
    issues.push(
      issue("error", "missing_year", "ปีรถไม่ถูกต้อง", "year")
    );
  } else {
    const y = parseInt(data.year, 10);
    if (Number.isNaN(y)) {
      issues.push(
        issue("error", "year_invalid", "ปีรถไม่ถูกต้อง", "year")
      );
    }
  }

  if (!data.price?.trim()) {
    issues.push(
      issue("error", "missing_price", "ราคาไม่ถูกต้อง", "price")
    );
  } else {
    const p = parseInt(data.price, 10);
    if (Number.isNaN(p) || p <= 0) {
      issues.push(
        issue("error", "price_invalid", "ราคาไม่ถูกต้อง", "price")
      );
    }
  }

  return issues;
}

export function validateOptionalFieldWarnings(
  data: NormalizedInventoryRow
): ValidationIssue[] {
  const warnings: ValidationIssue[] = [];

  if (!data.mileage?.trim()) {
    warnings.push(
      issue("warning", "missing_mileage", "ไม่มีเลขไมล์", "mileage")
    );
  }

  if (!data.imageUrls?.trim()) {
    warnings.push(
      issue("warning", "missing_images", "ไม่มีรูปภาพ", "imageUrls")
    );
  }

  if (data.financeStatus?.trim()) {
    const f = data.financeStatus.toLowerCase();
    if (/ไม่ชัด|ไม่ระบุ|unknown|n\/a/i.test(f)) {
      warnings.push(
        issue(
          "warning",
          "finance_unclear",
          "สถานะไฟแนนซ์ไม่ชัดเจน",
          "financeStatus"
        )
      );
    }
  } else {
    warnings.push(
      issue(
        "warning",
        "missing_finance",
        "ไม่ระบุสถานะไฟแนนซ์",
        "financeStatus"
      )
    );
  }

  return warnings;
}

export function mergeRowIssues(
  fieldIssues: ValidationIssue[],
  requiredIssues: ValidationIssue[],
  optionalWarnings: ValidationIssue[]
): ValidationIssue[] {
  const byCode = new Map<string, ValidationIssue>();
  for (const i of [...fieldIssues, ...requiredIssues, ...optionalWarnings]) {
    byCode.set(`${i.level}:${i.code}:${i.field ?? ""}`, i);
  }
  return [...byCode.values()];
}

export function resolveRowStatus(issues: ValidationIssue[]): RowValidationStatus {
  if (issues.some((i) => i.level === "error")) return "error";
  if (issues.some((i) => i.level === "warning")) return "warning";
  return "valid";
}

export function isRowReadyToImport(status: RowValidationStatus): boolean {
  return status === "valid" || status === "warning";
}

export function buildCleaningSummary(
  rows: {
    status: RowValidationStatus;
    disposition?: import("../importConfidence").ImportDisposition;
  }[]
): import("./types").CleaningSummary {
  const totalRows = rows.length;
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let readyToImportCount = 0;
  let publishedCount = 0;
  let draftCount = 0;
  let needsReviewCount = 0;
  let rejectedCount = 0;

  for (const row of rows) {
    if (row.status === "valid") validCount++;
    else if (row.status === "warning") warningCount++;
    else if (row.status === "error") errorCount++;

    if (isRowReadyToImport(row.status)) readyToImportCount++;

    switch (row.disposition) {
      case "published":
        publishedCount++;
        break;
      case "draft":
        draftCount++;
        break;
      case "needs_review":
        needsReviewCount++;
        break;
      case "rejected":
        rejectedCount++;
        break;
    }
  }

  return {
    totalRows,
    validCount,
    warningCount,
    errorCount,
    readyToImportCount,
    publishedCount,
    draftCount,
    needsReviewCount,
    rejectedCount,
  };
}

export { REQUIRED_IMPORT_FIELDS };
