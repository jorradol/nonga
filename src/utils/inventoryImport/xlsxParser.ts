import * as XLSX from "xlsx";
import { InventoryImportError } from "./fileValidators";
import type { InventoryRow } from "./types";

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value).trim();
}

export async function parseXlsxFileToObjects(file: File): Promise<InventoryRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new InventoryImportError("ไฟล์ Excel ว่าง ไม่พบชีตข้อมูล");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(
    sheet,
    { header: 1, defval: "", raw: false }
  ) as unknown[][];

  if (!matrix.length) {
    throw new InventoryImportError("ไฟล์ Excel ว่าง กรุณาเลือกไฟล์ที่มีข้อมูล");
  }

  const stringMatrix = matrix.map((row) =>
    (Array.isArray(row) ? row : [row]).map((cell) => cellToString(cell))
  );

  while (
    stringMatrix.length > 0 &&
    stringMatrix[stringMatrix.length - 1].every((c) => !c)
  ) {
    stringMatrix.pop();
  }

  const headerRow = stringMatrix[0] ?? [];
  const headers = headerRow.map((h, idx) =>
    h.length > 0 ? h : `column_${idx + 1}`
  );

  const rows: InventoryRow[] = [];

  for (let i = 1; i < stringMatrix.length; i++) {
    const cells = stringMatrix[i];
    if (cells.every((c) => !c)) continue;

    const record: InventoryRow = {};
    headers.forEach((header, colIdx) => {
      record[header] = cells[colIdx] ?? "";
    });
    rows.push(record);
  }

  if (rows.length === 0) {
    throw new InventoryImportError(
      "ไม่พบข้อมูลในไฟล์ Excel (มีเฉพาะหัวคอลัมน์)"
    );
  }

  return rows;
}
