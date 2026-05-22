import { validateInventoryFile } from "./fileValidators";
import { parseCsvFileToObjects } from "./csvParser";
import { parseXlsxFileToObjects } from "./xlsxParser";
import type { ParsedInventoryFile } from "./types";

function collectColumns(rows: Record<string, string>[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

/**
 * อ่านไฟล์ CSV / XLSX จากเต็นท์รถ → array of objects (Phase 1 preview)
 */
export async function parseInventoryFile(
  file: File
): Promise<ParsedInventoryFile> {
  const fileType = validateInventoryFile(file);

  const rows =
    fileType === "csv"
      ? await parseCsvFileToObjects(file)
      : await parseXlsxFileToObjects(file);

  const columns = collectColumns(rows);

  return {
    fileName: file.name,
    fileType,
    columns,
    rows,
    totalRows: rows.length,
  };
}
