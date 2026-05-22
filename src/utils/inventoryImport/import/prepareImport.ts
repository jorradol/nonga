import { isRowReadyToImport } from "../cleaning/validationRules";
import type { CleanedInventoryRow } from "../cleaning/types";
import {
  buildPreviewTitle,
  mapCleanedRowToMarketplacePayload,
} from "./mapToMarketplace";
import type {
  ImportOwnerContext,
  ImportPreparationSummary,
  PreparedImportRow,
  SkippedImportRow,
} from "./types";

/**
 * กรอง valid + warning → map เป็น marketplace payload
 * error rows → skipped list
 */
export function prepareRowsForMarketplaceImport(
  cleanedRows: CleanedInventoryRow[],
  owner: ImportOwnerContext
): ImportPreparationSummary {
  const rowsToImport: PreparedImportRow[] = [];
  const skippedRows: SkippedImportRow[] = [];

  let validImportCount = 0;
  let warningImportCount = 0;

  for (const row of cleanedRows) {
    const previewTitle = buildPreviewTitle(row.data);

    if (row.status === "error" || !isRowReadyToImport(row.status)) {
      const errMsg =
        row.issues.find((i) => i.level === "error")?.message ??
        "แถวมี error — ไม่นำเข้า";
      skippedRows.push({
        sourceRowIndex: row.rowIndex,
        status: row.status,
        reason: errMsg,
        previewTitle,
      });
      continue;
    }

    const importStatus = row.status === "warning" ? "warning" : "valid";
    const payload = mapCleanedRowToMarketplacePayload(
      row.data,
      row.rowIndex,
      importStatus,
      owner
    );

    if (!payload) {
      skippedRows.push({
        sourceRowIndex: row.rowIndex,
        status: "error",
        reason: "ข้อมูลไม่ครบ (brand/model/year/price)",
        previewTitle,
      });
      continue;
    }

    if (importStatus === "warning") warningImportCount++;
    else validImportCount++;

    rowsToImport.push({
      sourceRowIndex: row.rowIndex,
      importStatus,
      payload,
      previewTitle: payload.title,
    });
  }

  return {
    totalRows: cleanedRows.length,
    importableCount: rowsToImport.length,
    skippedErrorCount: skippedRows.length,
    validImportCount,
    warningImportCount,
    rowsToImport,
    skippedRows,
  };
}
