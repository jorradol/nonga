import type { NormalizedInventoryRow } from "./inventoryImportSchema";
import { createEmptyNormalizedRow } from "./inventoryImportSchema";
import type { ParsedPasteVehicle } from "./pasteRawVehicleTypes";
import type {
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "./import/types";
import { mapCleanedRowToPartialPayload } from "./import/mapToMarketplace";
import { driveFolderWarnings } from "./imageLinkExtractor";

/** ฟอร์มแก้ไขหลัง parse — ค่าเป็น string สำหรับ input */
export interface EditablePasteDraft {
  brand: string;
  model: string;
  subModel: string;
  licensePlate: string;
  year: string;
  color: string;
  transmission: string;
  mileage: string;
  price: string;
  referencePrice: string;
  description: string;
  features: string;
  websiteUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  /** หลายบรรทัดหรือคั่นด้วย comma */
  driveLinksText: string;
  imageLinksText: string;
  notes: string;
}

export interface PasteDraftValidation {
  fieldErrors: Partial<Record<keyof EditablePasteDraft, string>>;
  warnings: string[];
  /** อนุญาตบันทึก Draft แม้ข้อมูลไม่ครบ */
  canSaveDraft: boolean;
}

function parseDigits(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
}

function splitUrlLines(text: string): string[] {
  return text
    .split(/[\n\r,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBasicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** สร้าง state แก้ไขจากผล parser */
export function createEditablePasteDraft(
  parsed: ParsedPasteVehicle
): EditablePasteDraft {
  const featuresCol = (parsed.rawColumns[4] ?? "").trim();
  const trimCol = (parsed.subModel ?? "").trim();
  const descOnly =
    parsed.description.startsWith(trimCol) && featuresCol
      ? featuresCol
      : featuresCol || "";

  return {
    brand: parsed.brand,
    model: parsed.model,
    subModel: parsed.subModel,
    licensePlate: parsed.plateNumber,
    year: parsed.year != null ? String(parsed.year) : "",
    color: parsed.colorNormalized || parsed.color,
    transmission: parsed.transmissionNormalized || parsed.transmissionRaw,
    mileage: parsed.mileage != null ? String(parsed.mileage) : "",
    price: parsed.price != null ? String(parsed.price) : "",
    referencePrice:
      parsed.referencePrice != null ? String(parsed.referencePrice) : "",
    description: parsed.description,
    features: descOnly,
    websiteUrl: parsed.links.websiteUrl ?? "",
    youtubeUrl: parsed.links.youtubeUrl ?? "",
    tiktokUrl: parsed.links.tiktokUrl ?? "",
    driveLinksText: parsed.links.driveLinks.join("\n"),
    imageLinksText: parsed.links.imageSourceUrls.join("\n"),
    notes: "",
  };
}

export function validateEditablePasteDraft(
  draft: EditablePasteDraft,
  parserWarnings: string[] = []
): PasteDraftValidation {
  const fieldErrors: Partial<Record<keyof EditablePasteDraft, string>> = {};
  const warnings = [...parserWarnings];

  if (!draft.brand.trim()) {
    fieldErrors.brand = "กรุณาระบุยี่ห้อ";
    warnings.push("ยังไม่มียี่ห้อ — บันทึก Draft ได้แต่ควรเติมก่อนเผยแพร่");
  }
  if (!draft.model.trim()) {
    fieldErrors.model = "กรุณาระบุรุ่น";
    warnings.push("ยังไม่มีรุ่น — บันทึก Draft ได้แต่ควรเติมก่อนเผยแพร่");
  }

  const yearStr = draft.year.trim();
  if (yearStr) {
    const y = parseInt(yearStr, 10);
    const maxY = new Date().getFullYear() + 2;
    if (yearStr.length !== 4 || Number.isNaN(y) || y < 1980 || y > maxY) {
      fieldErrors.year = "ปีต้องเป็นตัวเลข 4 หลัก (1980–ปัจจุบัน)";
    }
  } else {
    warnings.push("ยังไม่ระบุปีรถ");
  }

  const priceStr = draft.price.trim();
  if (priceStr) {
    const p = parseDigits(priceStr);
    if (p == null || p <= 0) {
      fieldErrors.price = "ราคาต้องเป็นตัวเลข";
    } else if (p < 10_000 && priceStr.replace(/[^\d]/g, "").length <= 3) {
      warnings.push("ราคาดูไม่ชัดเจน กรุณาตรวจสอบ (เช่น 389 → 389,000)");
    }
  } else {
    warnings.push("ยังไม่ระบุราคา — บันทึกเป็น Draft เพื่อตรวจสอบ");
  }

  if (draft.referencePrice.trim()) {
    const ref = parseDigits(draft.referencePrice);
    if (ref == null || ref <= 0) {
      fieldErrors.referencePrice = "ราคาอ้างอิงต้องเป็นตัวเลข";
    }
  }

  if (draft.mileage.trim()) {
    const m = parseDigits(draft.mileage);
    if (m == null) fieldErrors.mileage = "เลขไมล์ต้องเป็นตัวเลข";
  }

  for (const [label, url] of [
    ["websiteUrl", draft.websiteUrl],
    ["youtubeUrl", draft.youtubeUrl],
    ["tiktokUrl", draft.tiktokUrl],
  ] as const) {
    const u = url.trim();
    if (u && !isBasicUrl(u)) {
      fieldErrors[label] = "URL ไม่ถูกต้อง";
    }
  }

  for (const u of splitUrlLines(draft.driveLinksText)) {
    if (!isBasicUrl(u)) {
      fieldErrors.driveLinksText = "มีลิงก์ Drive ที่ไม่ใช่ URL ถูกต้อง";
      break;
    }
  }

  for (const u of splitUrlLines(draft.imageLinksText)) {
    if (!isBasicUrl(u)) {
      fieldErrors.imageLinksText = "มีลิงก์รูปที่ไม่ใช่ URL ถูกต้อง";
      break;
    }
  }

  warnings.push(...driveFolderWarnings(splitUrlLines(draft.driveLinksText)));

  const uniqueWarnings = [...new Set(warnings)];

  return {
    fieldErrors,
    warnings: uniqueWarnings,
    canSaveDraft: true,
  };
}

export function editableDraftToNormalizedRow(
  draft: EditablePasteDraft
): NormalizedInventoryRow {
  const row = createEmptyNormalizedRow();
  row.brand = draft.brand.trim();
  row.model = draft.model.trim();
  row.subModel = draft.subModel.trim();
  row.licensePlate = draft.licensePlate.trim();
  row.year = draft.year.trim();
  const priceNum = parseDigits(draft.price);
  row.price = priceNum != null ? String(priceNum) : "";
  row.mileage = draft.mileage.trim().replace(/[^\d]/g, "") || "";
  row.color = draft.color.trim();
  row.gear = draft.transmission.trim();

  const descParts = [
    draft.description.trim(),
    draft.features.trim() &&
    !draft.description.includes(draft.features.trim())
      ? draft.features.trim()
      : "",
  ].filter(Boolean);
  row.description = descParts.join(" — ") || draft.subModel.trim();

  row.youtubeUrl = draft.youtubeUrl.trim();
  row.tiktokUrl = draft.tiktokUrl.trim();

  const noteParts: string[] = [];
  if (draft.referencePrice.trim()) {
    const ref = parseDigits(draft.referencePrice);
    if (ref != null) {
      noteParts.push(`ราคาอ้างอิง: ${ref.toLocaleString()} บาท`);
    }
  }
  if (draft.notes.trim()) noteParts.push(draft.notes.trim());
  if (draft.websiteUrl.trim()) noteParts.push(`เว็บ: ${draft.websiteUrl.trim()}`);
  const drives = splitUrlLines(draft.driveLinksText);
  if (drives.length) noteParts.push(`Drive: ${drives.join(", ")}`);
  row.notes = noteParts.join(" | ");

  const images = splitUrlLines(draft.imageLinksText).filter((u) =>
    isBasicUrl(u)
  );
  row.imageUrls = images.join(", ");

  return row;
}

export interface PasteDraftCommitExtras {
  commitDraftId?: string;
  storedImages?: string[];
  /** ลิงก์รูปภายนอกที่ยังไม่ได้ดาวน์โหลด */
  externalImageLinks?: string[];
  imageImportWarnings?: string[];
}

export function editablePasteDraftToPayload(
  draft: EditablePasteDraft,
  owner: ImportOwnerContext,
  sourceParsed: ParsedPasteVehicle,
  extras?: PasteDraftCommitExtras
): {
  payload: MarketplaceImportPayload | null;
  validation: PasteDraftValidation;
} {
  const validation = validateEditablePasteDraft(
    draft,
    sourceParsed.warnings
  );

  const normalized = editableDraftToNormalizedRow(draft);
  const payload = mapCleanedRowToPartialPayload(normalized, 1, owner, {
    paste: "thor-auto",
    rawColumns: sourceParsed.rawColumns.join("\t"),
    edited: "true",
  });

  if (!payload) {
    return { payload: null, validation };
  }

  const missingFields: string[] = [];
  if (!draft.brand.trim()) missingFields.push("brand");
  if (!draft.model.trim()) missingFields.push("model");
  if (!draft.year.trim()) missingFields.push("year");
  if (!draft.price.trim()) missingFields.push("price");

  const imageWarnings = extras?.imageImportWarnings ?? [];
  const allWarnings = [...validation.warnings, ...imageWarnings];
  if (!extras?.storedImages?.length) {
    allWarnings.push(
      "กรุณาเลือกรูปสำหรับประกาศอย่างน้อย 1 รูป — ยังไม่มีรูปภาพสำหรับประกาศ"
    );
  }

  const externalUrls =
    extras?.externalImageLinks ??
    splitUrlLines(draft.imageLinksText).filter((u) => isBasicUrl(u));

  return {
    payload: {
      ...payload,
      disposition: "draft",
      confidenceScore: sourceParsed.confidenceScore,
      missingFields,
      warnings: [...new Set(allWarnings)],
      importStatus: "warning",
      images: extras?.storedImages ?? [],
      sourceImageUrls: externalUrls,
      commitDraftId: extras?.commitDraftId,
      skipSourceImageDownload: true,
    },
    validation: {
      ...validation,
      warnings: [...new Set(allWarnings)],
    },
  };
}
