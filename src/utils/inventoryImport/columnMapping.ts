import { COLUMN_MAPPING_RULES } from "./columnMappingRules";
import {
  INVENTORY_IMPORT_FIELD_KEYS,
  createEmptyNormalizedRow,
  type InventoryImportFieldKey,
  type NormalizedInventoryRow,
} from "./inventoryImportSchema";
import type { InventoryRow } from "./types";
import { PREVIEW_ROW_LIMIT } from "./types";

export interface ColumnMappingEntry {
  originalColumn: string;
  sampleValue: string;
  suggestedMapping: InventoryImportFieldKey;
  finalMapping: InventoryImportFieldKey;
}

export interface DuplicateMappingWarning {
  field: InventoryImportFieldKey;
  columns: string[];
}

/** normalize ชื่อคอลัมน์สำหรับจับคู่ — รองรับไทย */
export function normalizeColumnKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\uFEFF/g, "")
    .replace(/["'`]+/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[_\-./\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAliasMatch(
  normalizedColumn: string,
  alias: string,
  rulePriority: number
): number {
  const normAlias = normalizeColumnKey(alias);
  if (!normAlias) return 0;

  if (normalizedColumn === normAlias) {
    return 100 + rulePriority;
  }

  if (
    normalizedColumn.includes(normAlias) ||
    normAlias.includes(normalizedColumn)
  ) {
    const lengthBonus = Math.min(normAlias.length, normalizedColumn.length);
    return 50 + rulePriority + lengthBonus * 0.1;
  }

  const colTokens = normalizedColumn.split(" ");
  const aliasTokens = normAlias.split(" ");
  if (aliasTokens.every((t) => colTokens.includes(t))) {
    return 40 + rulePriority;
  }

  return 0;
}

export function suggestMappingForColumn(
  columnName: string
): InventoryImportFieldKey {
  const normalized = normalizeColumnKey(columnName);
  if (!normalized) return "ignore";

  let bestField: InventoryImportFieldKey = "ignore";
  let bestScore = 0;

  for (const rule of COLUMN_MAPPING_RULES) {
    for (const alias of rule.aliases) {
      const score = scoreAliasMatch(
        normalized,
        alias,
        rule.priority ?? 5
      );
      if (score > bestScore) {
        bestScore = score;
        bestField = rule.field;
      }
    }
  }

  return bestScore > 0 ? bestField : "ignore";
}

/** คะแนนเมื่อชื่อคอลัมน์ตรง alias ทั้งคำ (ป้องกัน value inference แย่ง field) */
export function getExactHeaderMatchScore(
  columnName: string,
  field?: InventoryImportFieldKey
): number {
  const normalized = normalizeColumnKey(columnName);
  if (!normalized) return 0;

  let best = 0;
  for (const rule of COLUMN_MAPPING_RULES) {
    if (field && rule.field !== field) continue;
    for (const alias of rule.aliases) {
      if (normalizeColumnKey(alias) === normalized) {
        best = Math.max(best, 100 + (rule.priority ?? 5));
      }
    }
  }
  return best;
}

/** Auto-map ทุกคอลัมน์ — ถ้า field ซ้ำ คอลัมน์หลังจะได้ ignore */
export function buildAutoColumnMappings(
  columns: string[],
  rows: InventoryRow[]
): ColumnMappingEntry[] {
  const usedFields = new Set<InventoryImportFieldKey>();

  return columns.map((originalColumn) => {
    const suggested = suggestMappingForColumn(originalColumn);
    let finalMapping = suggested;

    if (
      finalMapping !== "ignore" &&
      usedFields.has(finalMapping)
    ) {
      finalMapping = "ignore";
    } else if (finalMapping !== "ignore") {
      usedFields.add(finalMapping);
    }

    return {
      originalColumn,
      sampleValue: getSampleValueForColumn(rows, originalColumn),
      suggestedMapping: suggested,
      finalMapping,
    };
  });
}

export function getSampleValueForColumn(
  rows: InventoryRow[],
  column: string
): string {
  for (const row of rows) {
    const val = (row[column] ?? "").trim();
    if (val) return val.length > 80 ? `${val.slice(0, 77)}...` : val;
  }
  return "—";
}

export function findDuplicateMappingWarnings(
  entries: ColumnMappingEntry[]
): DuplicateMappingWarning[] {
  const byField = new Map<InventoryImportFieldKey, string[]>();

  for (const entry of entries) {
    if (entry.finalMapping === "ignore") continue;
    const list = byField.get(entry.finalMapping) ?? [];
    list.push(entry.originalColumn);
    byField.set(entry.finalMapping, list);
  }

  const warnings: DuplicateMappingWarning[] = [];
  for (const [field, columns] of byField) {
    if (columns.length > 1) {
      warnings.push({ field, columns });
    }
  }
  return warnings;
}

export function normalizeInventoryRows(
  rows: InventoryRow[],
  entries: ColumnMappingEntry[],
  limit: number = PREVIEW_ROW_LIMIT
): NormalizedInventoryRow[] {
  const slice =
    limit >= rows.length ? rows : rows.slice(0, limit);
  const columnToField = new Map<string, InventoryImportFieldKey>();
  for (const e of entries) {
    columnToField.set(e.originalColumn, e.finalMapping);
  }

  return slice.map((rawRow) => {
    const normalized = createEmptyNormalizedRow();

    for (const [col, value] of Object.entries(rawRow)) {
      const field = columnToField.get(col) ?? "ignore";
      if (field === "ignore") continue;

      const trimmed = (value ?? "").trim();
      if (!trimmed) continue;

      if (normalized[field]) {
        normalized[field] = `${normalized[field]}; ${trimmed}`;
      } else {
        normalized[field] = trimmed;
      }
    }

    return normalized;
  });
}

export function applyAutoMappingFromParsed(
  columns: string[],
  rows: InventoryRow[]
): ColumnMappingEntry[] {
  return buildAutoColumnMappings(columns, rows);
}

export function resetMappingsToIgnore(
  entries: ColumnMappingEntry[]
): ColumnMappingEntry[] {
  return entries.map((e) => ({
    ...e,
    suggestedMapping: suggestMappingForColumn(e.originalColumn),
    finalMapping: "ignore" as InventoryImportFieldKey,
  }));
}

export { INVENTORY_IMPORT_FIELD_KEYS };
