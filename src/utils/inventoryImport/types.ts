/** ผลลัพธ์จากการ parse ไฟล์นำเข้า inventory (Phase 1 — preview only) */

export type InventoryRow = Record<string, string>;

export interface ParsedInventoryFile {
  fileName: string;
  fileType: "csv" | "xlsx";
  columns: string[];
  rows: InventoryRow[];
  totalRows: number;
}

export const PREVIEW_ROW_LIMIT = 10;

export const ALLOWED_INVENTORY_EXTENSIONS = [".csv", ".xlsx"] as const;

export type AllowedInventoryExtension =
  (typeof ALLOWED_INVENTORY_EXTENSIONS)[number];
