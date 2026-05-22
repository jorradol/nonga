import { InventoryImportError } from "./fileValidators";
import type { InventoryRow } from "./types";

/** ลบ BOM UTF-8 สำหรับ Excel ที่ export ภาษาไทย */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * แยกแถว CSV รองรับฟิลด์ในเครื่องหมายคำพูด และ comma ภายในเครื่องหมายคำพูด
 */
function splitCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\r" && next === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }

    if (ch === "\n" || ch === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((c) => c.length > 0) || rows.length === 0) {
    rows.push(row);
  }

  return rows;
}

function normalizeCell(value: string): string {
  return value.replace(/\uFEFF/g, "").trim();
}

function rowIsEmpty(cells: string[]): boolean {
  return cells.every((c) => !normalizeCell(c));
}

export function parseCsvTextToObjects(text: string): InventoryRow[] {
  const trimmed = stripBom(text).trim();
  if (!trimmed) {
    throw new InventoryImportError("ไฟล์ว่าง กรุณาเลือกไฟล์ที่มีข้อมูล");
  }

  const matrix = splitCsvRows(trimmed).map((row) =>
    row.map((cell) => normalizeCell(cell))
  );

  while (matrix.length > 0 && rowIsEmpty(matrix[matrix.length - 1])) {
    matrix.pop();
  }

  if (matrix.length === 0) {
    throw new InventoryImportError("ไฟล์ว่าง กรุณาเลือกไฟล์ที่มีข้อมูล");
  }

  const headerRow = matrix[0];
  const headers = headerRow.map((h, idx) =>
    h.length > 0 ? h : `column_${idx + 1}`
  );

  if (headers.every((h) => h.startsWith("column_"))) {
    throw new InventoryImportError(
      "ไม่พบหัวคอลัมน์ในแถวแรก กรุณาตรวจสอบรูปแบบไฟล์ CSV"
    );
  }

  const rows: InventoryRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i];
    if (rowIsEmpty(cells)) continue;

    const record: InventoryRow = {};
    headers.forEach((header, colIdx) => {
      record[header] = cells[colIdx] ?? "";
    });
    rows.push(record);
  }

  if (rows.length === 0) {
    throw new InventoryImportError(
      "ไม่พบข้อมูลในไฟล์ (มีเฉพาะหัวคอลัมน์) กรุณาเพิ่มแถวข้อมูล"
    );
  }

  return rows;
}

export async function parseCsvFileToObjects(file: File): Promise<InventoryRow[]> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let text = "";
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    text = new TextDecoder("utf-8").decode(bytes);
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      try {
        text = new TextDecoder("windows-874").decode(bytes);
      } catch {
        text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      }
    }
  }

  return parseCsvTextToObjects(text);
}
