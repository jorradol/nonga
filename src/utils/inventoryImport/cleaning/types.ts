import type { InventoryImportFieldKey } from "../inventoryImportSchema";
import type { NormalizedInventoryRow } from "../inventoryImportSchema";
import type { ImportDisposition } from "../importConfidence";

export type RowValidationStatus = "valid" | "warning" | "error";

export type ValidationLevel = "warning" | "error";

export interface ValidationIssue {
  level: ValidationLevel;
  field?: InventoryImportFieldKey;
  code: string;
  message: string;
}

export interface CleanedInventoryRow {
  rowIndex: number;
  data: NormalizedInventoryRow;
  status: RowValidationStatus;
  issues: ValidationIssue[];
  /** Smart import — คะแนน 0–100 */
  confidenceScore: number;
  disposition: ImportDisposition;
  missingFields: string[];
}

export interface CleaningSummary {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  readyToImportCount: number;
  publishedCount: number;
  draftCount: number;
  needsReviewCount: number;
  rejectedCount: number;
}

export const CLEAN_PREVIEW_ROW_LIMIT = 20;

export const REQUIRED_IMPORT_FIELDS: InventoryImportFieldKey[] = [
  "brand",
  "model",
  "year",
  "price",
];
