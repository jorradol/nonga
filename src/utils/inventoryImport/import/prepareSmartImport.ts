import type { CleanedInventoryRow } from "../cleaning/types";
import type { ImportDisposition } from "../importConfidence";
import {
  buildPreviewTitle,
  mapCleanedRowToMarketplacePayload,
  mapCleanedRowToPartialPayload,
} from "./mapToMarketplace";
import type {
  ImportOwnerContext,
  MarketplaceImportPayload,
  SmartImportPreparationSummary,
  SmartPreparedRow,
} from "./types";
import {
  isForbiddenRawKey,
  isSensitiveRegistrationKey,
} from "./forbiddenRawKeys";

function issueMessages(row: CleanedInventoryRow): string[] {
  return row.issues.map((i) => i.message);
}

/**
 * จัดกลุ่มแถวตาม smart disposition สำหรับ Review UI + Commit
 */
export function prepareSmartInventoryImport(
  cleanedRows: CleanedInventoryRow[],
  owner: ImportOwnerContext,
  rawRowsByIndex: Record<number, Record<string, string>>
): SmartImportPreparationSummary {
  const readyToPublish: SmartPreparedRow[] = [];
  const draftRows: SmartPreparedRow[] = [];
  const needsReview: SmartPreparedRow[] = [];
  const rejected: SmartPreparedRow[] = [];
  const forbiddenRawColumnsSet = new Set<string>();
  const sensitiveRegistrationColumnsSet = new Set<string>();

  for (const row of cleanedRows) {
    const previewTitle = buildPreviewTitle(row.data);
    const rawRow = rawRowsByIndex[row.rowIndex] ?? {};
    for (const key of Object.keys(rawRow)) {
      if (isForbiddenRawKey(key)) {
        forbiddenRawColumnsSet.add(key);
      }
      if (isSensitiveRegistrationKey(key)) {
        sensitiveRegistrationColumnsSet.add(key);
      }
    }
    const warnings = issueMessages(row).filter(Boolean);
    const importStatus =
      row.status === "warning" ? "warning" : row.status === "valid" ? "valid" : "warning";

    const base = {
      sourceRowIndex: row.rowIndex,
      confidenceScore: row.confidenceScore,
      disposition: row.disposition,
      missingFields: row.missingFields,
      previewTitle,
      warnings,
      rawRow,
    };

    if (row.disposition === "rejected") {
      rejected.push({
        ...base,
        payload: null,
        reason:
          row.issues.find((i) => i.level === "error")?.message ??
          "แถวว่างหรือไม่ใช่ข้อมูลรถ",
      });
      continue;
    }

    if (row.disposition === "published") {
      const payload = mapCleanedRowToMarketplacePayload(
        row.data,
        row.rowIndex,
        importStatus,
        owner,
        rawRow
      );
      if (!payload) {
        rejected.push({
          ...base,
          disposition: "rejected",
          payload: null,
          reason: "ข้อมูลไม่ครบสำหรับเผยแพร่",
        });
        continue;
      }
      readyToPublish.push({
        ...base,
        importStatus,
        payload,
      });
      continue;
    }

    const partial = mapCleanedRowToPartialPayload(
      row.data,
      row.rowIndex,
      owner,
      rawRow
    );

    if (!partial) {
      rejected.push({
        ...base,
        payload: null,
        reason: "ไม่สามารถระบุยี่ห้อ/รุ่นได้",
      });
      continue;
    }

    const entry: SmartPreparedRow = {
      ...base,
      importStatus: "warning",
      payload: partial,
    };

    if (row.disposition === "needs_review") {
      needsReview.push(entry);
    } else {
      draftRows.push(entry);
    }
  }

  return {
    totalRows: cleanedRows.length,
    readyToPublish,
    draftRows,
    needsReview,
    rejected,
    forbiddenRawColumns: [...forbiddenRawColumnsSet].sort((a, b) =>
      a.localeCompare(b)
    ),
    sensitiveRegistrationColumns: [...sensitiveRegistrationColumnsSet].sort(
      (a, b) => a.localeCompare(b)
    ),
    importableCount:
      readyToPublish.length + draftRows.length + needsReview.length,
    publishedCount: readyToPublish.length,
    draftCount: draftRows.length,
    needsReviewCount: needsReview.length,
    rejectedCount: rejected.length,
  };
}

export function flattenSmartPrepForCommit(
  prep: SmartImportPreparationSummary
): {
  published: MarketplaceImportPayload[];
  drafts: MarketplaceImportPayload[];
} {
  const published = prep.readyToPublish
    .filter((r) => r.payload)
    .map((r) => ({ ...r.payload!, disposition: "published" as ImportDisposition }));

  const drafts = [
    ...prep.draftRows,
    ...prep.needsReview,
  ]
    .filter((r) => r.payload)
    .map((r) => ({
      ...r.payload!,
      disposition: r.disposition,
      confidenceScore: r.confidenceScore,
      missingFields: r.missingFields,
      rawRow: r.rawRow,
      warnings: r.warnings,
    }));

  return { published, drafts };
}
