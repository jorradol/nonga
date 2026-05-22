import type { InventoryImportFieldKey } from "../../inventoryImportSchema";
import { FieldNormalizeResult, issue, stripText } from "./common";

function splitMultiUrls(raw: string): string[] {
  return raw
    .split(/[\n\r|,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

export function normalizeImageUrlsField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "imageUrls";
  const trimmed = stripText(raw);
  if (!trimmed) {
    return { value: "", issues: [] };
  }

  const parts = splitMultiUrls(trimmed);
  const valid = parts.filter((p) => isHttpUrl(p) || p.includes("."));

  if (valid.length === 0) {
    return {
      value: parts.join(", "),
      issues: [
        issue(
          "warning",
          "image_urls_unclear",
          "รูปภาพอาจไม่ใช่ URL ที่ถูกต้อง",
          field
        ),
      ],
    };
  }

  return { value: valid.join(", "), issues: [] };
}

export function normalizeYoutubeUrlField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "youtubeUrl";
  const trimmed = stripText(raw);
  if (!trimmed) return { value: "", issues: [] };

  const url = splitMultiUrls(trimmed)[0] ?? trimmed;
  if (!/youtube\.com|youtu\.be/i.test(url) && !isHttpUrl(url)) {
    return {
      value: url,
      issues: [
        issue("warning", "youtube_unclear", "ลิงก์ YouTube อาจไม่ถูกต้อง", field),
      ],
    };
  }
  return { value: url, issues: [] };
}

export function normalizeTiktokUrlField(raw: string): FieldNormalizeResult {
  const field: InventoryImportFieldKey = "tiktokUrl";
  const trimmed = stripText(raw);
  if (!trimmed) return { value: "", issues: [] };

  const url = splitMultiUrls(trimmed)[0] ?? trimmed;
  if (!/tiktok\.com/i.test(url) && !isHttpUrl(url)) {
    return {
      value: url,
      issues: [
        issue("warning", "tiktok_unclear", "ลิงก์ TikTok อาจไม่ถูกต้อง", field),
      ],
    };
  }
  return { value: url, issues: [] };
}
