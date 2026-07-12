import type {
  ParsedPasteVehicle,
  PasteConfidenceLevel,
  PasteVehicleLinks,
} from "./pasteRawVehicleTypes";

const URL_RE = /https?:\/\/[^\s\t"']+/gi;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)(\?|$)/i;

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "").trim();
}

function parseDigits(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
}

function normalizeTransmission(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (!t) return "";
  if (t === "AT" || t.includes("AUTO") || t.includes("CVT")) return "อัตโนมัติ";
  if (t === "MT" || t.includes("MANUAL")) return "เกียร์ธรรมดา";
  return raw.trim();
}

function normalizeColor(raw: string): string {
  const c = raw.trim();
  if (!c) return "";
  const map: Record<string, string> = {
    ดำ: "ดำ",
    ขาว: "ขาว",
    เงิน: "เงิน",
    แดง: "แดง",
    เทา: "เทา",
    น้ำเงิน: "น้ำเงิน",
    black: "ดำ",
    white: "ขาว",
    silver: "เงิน",
    red: "แดง",
    gray: "เทา",
    grey: "เทา",
  };
  const low = c.toLowerCase();
  return map[c] ?? map[low] ?? c;
}

function extractUrlsFromText(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of found) {
    const clean = u.replace(/[),.;]+$/, "").trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out;
}

function classifyUrls(urls: string[]): PasteVehicleLinks {
  const links: PasteVehicleLinks = {
    driveLinks: [],
    imageSourceUrls: [],
    otherUrls: [],
  };

  for (const url of urls) {
    const low = url.toLowerCase();
    if (low.includes("thorautocar.com")) {
      if (!links.websiteUrl) links.websiteUrl = url;
      continue;
    }
    if (low.includes("youtube.com") || low.includes("youtu.be")) {
      if (!links.youtubeUrl) links.youtubeUrl = url;
      continue;
    }
    if (low.includes("tiktok.com")) {
      if (!links.tiktokUrl) links.tiktokUrl = url;
      continue;
    }
    if (low.includes("drive.google.com")) {
      links.driveLinks.push(url);
      continue;
    }
    if (IMAGE_EXT_RE.test(low)) {
      links.imageSourceUrls.push(url);
      continue;
    }
    links.otherUrls.push(url);
  }

  return links;
}

function parseThorPrice(
  saleRaw: string,
  referenceRaw: string
): {
  price: number | null;
  confidence: PasteConfidenceLevel;
  warnings: string[];
} {
  const warnings: string[] = [];
  const ref = parseDigits(referenceRaw);
  const saleDigits = saleRaw.replace(/[^\d]/g, "");
  const saleHasComma = /,/.test(saleRaw);
  const saleNum = parseDigits(saleRaw);

  if (saleNum == null && !saleRaw.trim()) {
    return { price: null, confidence: "low", warnings: ["ไม่พบราคาขาย"] };
  }

  if (saleHasComma || (saleNum != null && saleNum >= 10_000)) {
    return { price: saleNum, confidence: "high", warnings };
  }

  if (
    saleDigits.length > 0 &&
    saleDigits.length <= 3 &&
    ref != null &&
    ref >= 100_000
  ) {
    const inferred = parseInt(saleDigits, 10) * 1000;
    warnings.push(
      `ราคา "${saleRaw}" ตีความเป็น ${inferred.toLocaleString()} บาท (พัน) — ควรตรวจสอบกับราคาอ้างอิง ${ref.toLocaleString()}`
    );
    return { price: inferred, confidence: "medium", warnings };
  }

  if (saleNum != null && saleNum >= 1000) {
    return { price: saleNum, confidence: "medium", warnings };
  }

  warnings.push(`ราคา "${saleRaw}" ไม่ชัดเจน — ควรตรวจสอบก่อนบันทึก`);
  return { price: saleNum, confidence: "low", warnings };
}

function looksLikeMileageValue(n: number | null): boolean {
  return n != null && n >= 10_000 && n <= 500_000;
}

function looksLikeVehiclePriceValue(n: number | null): boolean {
  return n != null && n >= 200_000 && n <= 20_000_000;
}

function resolveThorMileageAndPrice(cols: string[]): {
  mileage: number | null;
  priceParsed: {
    price: number | null;
    confidence: PasteConfidenceLevel;
    warnings: string[];
  };
  referencePrice: number | null;
  remapWarning?: string;
} {
  const mileageCol8 = parseDigits(cols[8] ?? "");
  const mileageCol9 = parseDigits(cols[9] ?? "");

  const primaryPrice = parseThorPrice(cols[9] ?? "", cols[10] ?? "");
  const primaryReference = parseDigits(cols[10] ?? "");
  const saleCol10 = cols[10] ?? "";
  const saleCol10Num = parseDigits(saleCol10);
  const col10AlreadyLooksLikeFullPrice =
    saleCol10.includes(",") ||
    (saleCol10Num != null && saleCol10Num >= 100_000);

  const shiftedPrice = parseThorPrice(cols[10] ?? "", cols[11] ?? "");
  const shiftedReference = parseDigits(cols[11] ?? "");

  const primaryLooksSwapped =
    (mileageCol8 == null || mileageCol8 <= 0) &&
    looksLikeMileageValue(mileageCol9) &&
    primaryPrice.price != null &&
    primaryPrice.price === mileageCol9;

  const shiftedLooksHealthy =
    looksLikeVehiclePriceValue(shiftedPrice.price) ||
    (shiftedPrice.price != null &&
      mileageCol9 != null &&
      shiftedPrice.price > mileageCol9 * 1.5);

  if (
    primaryLooksSwapped &&
    shiftedLooksHealthy &&
    !col10AlreadyLooksLikeFullPrice
  ) {
    return {
      mileage: mileageCol9,
      priceParsed: shiftedPrice,
      referencePrice: shiftedReference,
      remapWarning:
        "ตรวจพบคอลัมน์ราคา/เลขไมล์เหลื่อมหนึ่งตำแหน่ง — ปรับใช้เลขไมล์จากคอลัมน์ถัดไปและตีความราคาจากคู่คอลัมน์ 10/11 อัตโนมัติ",
    };
  }

  return {
    mileage: mileageCol8,
    priceParsed: primaryPrice,
    referencePrice: primaryReference,
  };
}

function yearFromUrl(urls: string[]): number | null {
  for (const u of urls) {
    const m = u.match(/\/(20\d{2})\//);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function scoreConfidence(
  parsed: Omit<ParsedPasteVehicle, "confidenceScore" | "confidenceLevel" | "suggestedDisposition">
): { score: number; level: PasteConfidenceLevel } {
  let score = 100;
  if (!parsed.brand) score -= 25;
  if (!parsed.model) score -= 25;
  if (parsed.year == null) score -= 15;
  if (parsed.price == null) score -= 20;
  else if (parsed.priceConfidence === "medium") score -= 12;
  else if (parsed.priceConfidence === "low") score -= 20;
  if (parsed.mileage == null) score -= 8;
  if (parsed.warnings.length) score -= Math.min(25, parsed.warnings.length * 5);

  const level: PasteConfidenceLevel =
    score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  return { score: Math.max(0, Math.min(100, score)), level };
}

/** แยกแถวข้อมูลแรกที่มี tab (ThorAuto template) */
export function splitPasteRawLine(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const dataLine =
    lines.find((l) => l.includes("\t")) ??
    lines.find((l) => l.split("\t").length >= 8) ??
    text.trim();
  return dataLine.split("\t").map(stripQuotes);
}

/**
 * Parse ข้อมูลดิบ 1 คัน — template ThorAuto (คอลัมน์ tab ตาม index)
 */
export function parseThorAutoPasteRow(rawText: string): ParsedPasteVehicle {
  const cols = splitPasteRawLine(rawText);
  const fullText = cols.join("\t");
  const allUrls = extractUrlsFromText(fullText);
  const links = classifyUrls(allUrls);

  const brand = (cols[0] ?? "").trim();
  const model = (cols[1] ?? "").trim();
  const plateNumber = (cols[2] ?? "").trim();
  const trim = (cols[3] ?? "").trim();
  const features = (cols[4] ?? "").trim();
  const transmissionRaw = (cols[5] ?? "").trim();
  const yearNum = parseDigits(cols[6] ?? "");
  const colorRaw = (cols[7] ?? "").trim();
  const resolvedPriceMileage = resolveThorMileageAndPrice(cols);
  const mileage = resolvedPriceMileage.mileage;
  const priceParsed = resolvedPriceMileage.priceParsed;
  const referencePrice = resolvedPriceMileage.referencePrice;
  const source = (cols[11] ?? "").trim();
  const listedDate = (cols[12] ?? "").trim();
  const vehicleCondition = (cols[13] ?? "").trim();
  const parkingSlot = (cols[14] ?? "").trim();
  const financeSummary = (cols[17] ?? "").trim();

  const descriptionParts = [trim, features].filter(Boolean);
  const description = descriptionParts.join(" — ");

  const warnings: string[] = [...priceParsed.warnings];
  const missingFields: string[] = [];

  if (!brand) missingFields.push("brand");
  if (!model) missingFields.push("model");
  if (yearNum == null) missingFields.push("year");
  if (priceParsed.price == null) missingFields.push("price");
  if (mileage == null) missingFields.push("mileage");

  if (links.driveLinks.length > 0) {
    warnings.push(
      "พบลิงก์ Google Drive — ระบบอาจโหลดรูปอัตโนมัติไม่ได้ ควรใส่ URL รูปตรงหรืออัปโหลดภายหลัง"
    );
  }
  if (
    links.imageSourceUrls.length === 0 &&
    links.driveLinks.length === 0
  ) {
    warnings.push("ไม่พบ URL รูปภาพตรง — ควรเพิ่มรูปก่อนเผยแพร่");
  }

  const urlYear = yearFromUrl([
    ...(links.websiteUrl ? [links.websiteUrl] : []),
    ...links.otherUrls,
  ]);
  if (
    yearNum != null &&
    urlYear != null &&
    Math.abs(yearNum - urlYear) >= 2
  ) {
    warnings.push(
      `ปีในข้อมูล (${yearNum}) ไม่ตรงกับปีใน URL (${urlYear}) — ควรตรวจสอบ`
    );
  }

  if (priceParsed.confidence !== "high") {
    warnings.push("ราคาดูไม่ชัดเจน — บันทึกเป็นฉบับร่างเพื่อตรวจสอบ");
  }
  if (resolvedPriceMileage.remapWarning) {
    warnings.push(resolvedPriceMileage.remapWarning);
  }

  const base = {
    templateId: "thor-auto-row-v1" as const,
    rawColumns: cols,
    brand,
    model,
    subModel: trim,
    plateNumber,
    description,
    transmissionRaw,
    transmissionNormalized: normalizeTransmission(transmissionRaw),
    year: yearNum,
    color: colorRaw,
    colorNormalized: normalizeColor(colorRaw),
    mileage,
    price: priceParsed.price,
    referencePrice,
    priceConfidence: priceParsed.confidence,
    source,
    listedDate,
    vehicleCondition,
    parkingSlot,
    financeSummary,
    links,
    warnings,
    missingFields,
    suggestedDisposition: "draft" as const,
  };

  const { score, level } = scoreConfidence(base);

  return {
    ...base,
    confidenceScore: score,
    confidenceLevel: level,
  };
}
