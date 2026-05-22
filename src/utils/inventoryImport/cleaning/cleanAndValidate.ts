import type { ColumnMappingEntry } from "../columnMapping";
import { normalizeInventoryRows } from "../columnMapping";
import { resolveImportDisposition } from "../importConfidence";
import type { InventoryRow } from "../types";
import { cleanNormalizedRow } from "./normalizers";
import {
  buildCleaningSummary,
  mergeRowIssues,
  resolveRowStatus,
  validateOptionalFieldWarnings,
  validateRequiredFields,
} from "./validationRules";
import type {
  CleanedInventoryRow,
  CleaningSummary,
} from "./types";
import { CLEAN_PREVIEW_ROW_LIMIT } from "./types";

export interface InventoryCleanPipelineResult {
  allRows: CleanedInventoryRow[];
  previewRows: CleanedInventoryRow[];
  summary: CleaningSummary;
}

/** map ทุกแถวจากไฟล์ (ไม่จำกัด preview) */
export function mapAllInventoryRows(
  rows: InventoryRow[],
  entries: ColumnMappingEntry[]
): ReturnType<typeof normalizeInventoryRows> {
  return normalizeInventoryRows(rows, entries, rows.length);
}

/**
 * Phase 3: ทำความสะอาด + validate ทุกแถวหลัง column mapping
 */
export function runInventoryCleanPipeline(
  sourceRows: InventoryRow[],
  mappingEntries: ColumnMappingEntry[],
  previewLimit = CLEAN_PREVIEW_ROW_LIMIT
): InventoryCleanPipelineResult {
  const mappedRows = mapAllInventoryRows(sourceRows, mappingEntries);

  const allRows: CleanedInventoryRow[] = mappedRows.map((mapped, index) => {
    const rawRow = sourceRows[index] ?? {};
    const { data, issues: fieldIssues } = cleanNormalizedRow(mapped);
    const requiredIssues = validateRequiredFields(data);
    const optionalWarnings = validateOptionalFieldWarnings(data);
    const issues = mergeRowIssues(
      fieldIssues,
      requiredIssues,
      optionalWarnings
    );
    let status = resolveRowStatus(issues);

    const confidence = resolveImportDisposition(data, rawRow);

    if (confidence.disposition === "rejected") {
      status = "error";
    } else if (
      confidence.disposition === "draft" ||
      confidence.disposition === "needs_review"
    ) {
      if (status === "error") status = "warning";
    }

    return {
      rowIndex: index + 1,
      data,
      status,
      issues,
      confidenceScore: confidence.score,
      disposition: confidence.disposition,
      missingFields: confidence.missingFields,
    };
  });

  const summary = buildCleaningSummary(allRows);
  const previewRows = allRows.slice(0, previewLimit);

  return { allRows, previewRows, summary };
}
