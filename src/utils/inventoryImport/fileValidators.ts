import { ALLOWED_INVENTORY_EXTENSIONS } from "./types";

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export class InventoryImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryImportError";
  }
}

export function getFileExtension(fileName: string): string {
  const lower = fileName.toLowerCase().trim();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

export function isAllowedInventoryExtension(ext: string): boolean {
  return (ALLOWED_INVENTORY_EXTENSIONS as readonly string[]).includes(ext);
}

export function validateInventoryFile(file: File): "csv" | "xlsx" {
  const ext = getFileExtension(file.name);

  if (!isAllowedInventoryExtension(ext)) {
    throw new InventoryImportError(
      "รองรับเฉพาะไฟล์ .csv และ .xlsx เท่านั้น"
    );
  }

  if (file.size === 0) {
    throw new InventoryImportError("ไฟล์ว่าง กรุณาเลือกไฟล์ที่มีข้อมูล");
  }

  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new InventoryImportError(
      "ไฟล์ใหญ่เกินไป (สูงสุด 15 MB) กรุณาแบ่งไฟล์หรือลบแถวที่ไม่จำเป็น"
    );
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    const stillOk =
      ext === ".csv" || ext === ".xlsx";
    if (!stillOk) {
      throw new InventoryImportError(
        `ประเภทไฟล์ไม่รองรับ (${file.type || "unknown"})`
      );
    }
  }

  return ext === ".csv" ? "csv" : "xlsx";
}
