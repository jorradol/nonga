import type { ValidationIssue } from "../types";

export interface FieldNormalizeResult {
  value: string;
  issues: ValidationIssue[];
}

export function stripText(raw: string): string {
  return raw.replace(/\uFEFF/g, "").trim();
}

/** ดึงตัวเลขทั้งหมดจากสตริง (ลบ comma, space, บาท, km) */
export function extractDigits(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function issue(
  level: ValidationIssue["level"],
  code: string,
  message: string,
  field?: ValidationIssue["field"]
): ValidationIssue {
  return { level, code, message, field };
}

/** รูปแบบราคาแบบ 12x,xxx หรือ 12x */
export function isAmbiguousPricePattern(raw: string): boolean {
  const lower = raw.toLowerCase();
  return /x/i.test(lower) && /\d/.test(lower);
}

/** แปลง 12x,xxx → 120000 (เติมศูนย์ตาม x) */
export function parseAmbiguousPrice(raw: string): number | null {
  const match = raw
    .replace(/,/g, "")
    .match(/(\d+)\s*x\s*(\d*)/i);
  if (!match) return null;
  const leading = parseInt(match[1], 10);
  const trailing = match[2] ? parseInt(match[2], 10) : 0;
  if (Number.isNaN(leading)) return null;
  if (!match[2] || match[2].length === 0) {
    return leading * 10000;
  }
  const zeros = "0".repeat(Math.max(0, 3 - String(trailing).length));
  return parseInt(`${leading}${zeros}${trailing}`, 10);
}
