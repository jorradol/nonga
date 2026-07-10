/**
 * v5.6E.2 — Natural Thai text parser for buyer lead capture (deterministic).
 */

import { parsePurchaseMethod } from "./buyerLeadValidation";
import type { PurchaseMethod } from "./leadTypes";

export interface BuyerLeadDraftFields {
  listingId?: string;
  displayName?: string;
  contactPhone?: string;
  purchaseMethod?: PurchaseMethod;
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  preferredContactWindow?: string;
}

export interface BuyerLeadTextParseResult {
  displayName?: string;
  purchaseMethod?: PurchaseMethod;
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  preferredContactWindow?: string;
  missingFields: string[];
  confidence: number;
}

const NAME_STOP =
  /\s+(?:ต้องการ|ขอ|อยาก)?(?:จัด(?:ไฟ)?แนนซ์|ผ่อน(?:ไฟ)?แนนซ์|ไฟแนนซ์|เงินสด|ซื้อสด|จ่ายสด|ตั้งงบ|งบ(?:ประมาณ)?|เสนอ(?:ราคา)?|ราค(?:า)?(?:ที่)?เสนอ|ติดต่อ|โทร(?:ได้)?|สะดวก|ยังไม่แน่ใจ)/i;

const CONTACT_PHRASES: RegExp[] = [
  /ติดต่อ(?:ได้)?ตลอด(?:เวลา)?/i,
  /โทร(?:ได้)?(?:ช่วง)?หลัง(?:ห้า)?โมง(?:เย็น)?/i,
  /สะดวก(?:ให้)?(?:ติดต่อ)?ช่วง(?:เช้า|บ่าย|เย็น)/i,
  /(?:สะดวก(?:ให้)?(?:ติดต่อ)?)?ช่วง(?:เช้า|บ่าย|เย็น)/i,
  /เวล(?:า)?ทำงาน/i,
  /(?:ติดต่อ)?(?:วัน)?(?:เสาร์(?:[\s-]?อาทิตย์)?|อาทิตย์(?:[\s-]?เสาร์)?)/i,
  /(?:ติดต่อ(?:ได้)?|สะดวก(?:ให้)?(?:ติดต่อ)?)\s*(?:ช่วง|เวลา)?\s*[^\d,]{3,60}/i,
];

const OFFER_PRICE_PATTERN =
  /(?:เสนอ(?:ราคา)?|ราค(?:า)?(?:ที่)?เสนอ)\s*([\d,.]+(?:\s*แส(?:น)?(?:\s*(?:ห(?:้)?า|50))?|\s*ล้าน|\s*บาท)?)/gi;
/**
 * Budget phrases — include Thai conversational forms:
 * งบ / งบประมาณ / ตั้งงบ / ตั้งงบเอาไว้ที่ / งบเอาไว้ที่ / มีงบ / ไม่เกิน
 */
const BUDGET_PRICE_PATTERN =
  /(?:ตั้งงบ(?:ประมาณ)?(?:\s*เอาไว้(?:ที่)?)?|มีงบ(?:ประมาณ)?|งบ(?:ประมาณ)?(?:\s*เอาไว้(?:ที่)?)?|ไม่เกิน)\s*[:：]?\s*(?:ที่\s*)?([\d,.]+(?:\s*แส(?:น)?(?:\s*(?:ห(?:้)?า|50))?|\s*ล้าน|\s*บาท)?)/gi;
const GENERIC_PRICE_PATTERN =
  /(?:^|\s)ราค(?:า)?\s*([\d,.]+(?:\s*แส(?:น)?(?:\s*(?:ห(?:้)?า|50))?|\s*ล้าน|\s*บาท)?)/gi;

function hasBudgetOrOffer(fields: BuyerLeadDraftFields): boolean {
  if (fields.budgetMin != null && fields.budgetMin > 0) return true;
  if (fields.budgetMax != null && fields.budgetMax > 0) return true;
  if (fields.offeredPrice != null && fields.offeredPrice > 0) return true;
  return false;
}

function listMissingLeadFields(fields: BuyerLeadDraftFields): string[] {
  const missing: string[] = [];
  if (!fields.displayName?.trim()) missing.push("ชื่อหรือชื่อเล่น");
  if (!fields.purchaseMethod) {
    missing.push("วิธีซื้อ (เงินสด/ไฟแนนซ์/ยังไม่แน่ใจ)");
  }
  if (!hasBudgetOrOffer(fields)) {
    missing.push("งบประมาณหรือราคาที่เสนอ");
  }
  if (!fields.preferredContactWindow?.trim()) {
    missing.push("เวลาที่สะดวกให้ติดต่อ");
  }
  return missing;
}

/** Parse Thai price fragments e.g. 4 แสน, 1.2 ล้าน, 480,000, 3 แสนห้า. */
export function parseBahtFromThaiText(fragment: string): number | null {
  const t = fragment.trim();
  if (!t) return null;

  const saenHa = t.match(/([\d.]+)\s*แส(?:น)?\s*(?:ห(?:้)?า|50)/i);
  if (saenHa) {
    const base = Number.parseFloat(saenHa[1].replace(/,/g, ""));
    if (Number.isFinite(base) && base > 0) {
      return Math.round(base * 100_000 + 50_000);
    }
  }

  const digitMatch = t.replace(/,/g, "").match(/([\d.]+)/);
  if (!digitMatch) return null;
  const num = Number.parseFloat(digitMatch[1]);
  if (!Number.isFinite(num) || num <= 0) return null;

  if (/ล้าน/.test(t)) return Math.round(num * 1_000_000);
  if (/แส(?:น)?/.test(t)) return Math.round(num * 100_000);
  if (num >= 1000 || /บาท/.test(t)) return Math.round(num);
  if (num <= 50) return Math.round(num * 100_000);
  return Math.round(num);
}

function extractContactWindow(text: string): string | undefined {
  let best: { value: string; index: number } | undefined;
  for (const pattern of CONTACT_PHRASES) {
    const m = text.match(pattern);
    if (!m?.[0]) continue;
    const value = m[0].trim().replace(/\s+/g, " ").slice(0, 120);
    if (!best || (m.index ?? 0) >= best.index) {
      best = { value, index: m.index ?? 0 };
    }
  }
  return best?.value;
}

function extractPrice(text: string, pattern: RegExp): number | undefined {
  pattern.lastIndex = 0;
  const m = pattern.exec(text);
  if (!m?.[0]) return undefined;
  const v = parseBahtFromThaiText(m[0]);
  if (v == null || v <= 0) return undefined;
  return v;
}

function extractDisplayName(text: string): string | undefined {
  const labeled = text.match(
    /(?:ชื่อ(?:หรือชื่อเล่น|เล่น)?|เรียก(?:ว่า)?)\s*([^\s,]+)/iu
  );
  if (labeled?.[1]) {
    const name = labeled[1].trim();
    if (name.length >= 1 && name.length <= 30) return name.slice(0, 60);
  }

  const leadingName = text.match(
    /^([^\d\s,]{2,20}?)\s+(?:ขอ|อยาก)?(?:จัด(?:ไฟ)?แนนซ์|ผ่อน(?:ไฟ)?แนนซ์|ไฟแนนซ์|ซื้อสด|เงินสด)/iu
  );
  if (leadingName?.[1]) {
    return leadingName[1].trim().slice(0, 60);
  }

  for (const pattern of [
    /(?:ชื่อ|เรียก)(?:ว่า)?[:\s]+([^\n,]{2,40})/i,
    /^ชื่อ\s+(.+)$/i,
  ]) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const raw = m[1].trim();
      const trimmed = raw.split(NAME_STOP)[0]?.trim();
      const name = (trimmed || raw).split(/\s+/)[0]?.trim();
      if (name && name.length >= 1 && name.length <= 30) return name.slice(0, 60);
    }
  }

  return undefined;
}

function computeConfidence(fields: BuyerLeadDraftFields): number {
  let score = 0;
  if (fields.displayName?.trim()) score += 0.25;
  if (fields.purchaseMethod) score += 0.25;
  if (hasBudgetOrOffer(fields)) score += 0.25;
  if (fields.preferredContactWindow?.trim()) score += 0.25;
  return Math.round(score * 100) / 100;
}

function mergeParsedIntoFields(
  base: BuyerLeadDraftFields,
  parsed: Partial<BuyerLeadTextParseResult>
): BuyerLeadDraftFields {
  return {
    ...base,
    ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
    ...(parsed.purchaseMethod ? { purchaseMethod: parsed.purchaseMethod } : {}),
    ...(parsed.budgetMin != null ? { budgetMin: parsed.budgetMin } : {}),
    ...(parsed.budgetMax != null ? { budgetMax: parsed.budgetMax } : {}),
    ...(parsed.offeredPrice != null ? { offeredPrice: parsed.offeredPrice } : {}),
    ...(parsed.preferredContactWindow
      ? { preferredContactWindow: parsed.preferredContactWindow }
      : {}),
  };
}

/** Parse a single natural-language buyer lead message (deterministic). */
export function parseNaturalBuyerLeadText(
  message: string,
  baseFields: BuyerLeadDraftFields = {}
): BuyerLeadTextParseResult {
  const text = message.trim().replace(/\s+/g, " ");
  const parsed: Partial<BuyerLeadTextParseResult> = {};

  parsed.preferredContactWindow = extractContactWindow(text);
  parsed.offeredPrice =
    extractPrice(text, OFFER_PRICE_PATTERN) ??
    extractPrice(text, GENERIC_PRICE_PATTERN);
  parsed.budgetMax = extractPrice(text, BUDGET_PRICE_PATTERN);
  parsed.purchaseMethod = parsePurchaseMethod(text) ?? undefined;
  parsed.displayName = extractDisplayName(text);

  const merged = mergeParsedIntoFields(baseFields, parsed);
  const missingFields = listMissingLeadFields(merged);

  return {
    ...parsed,
    missingFields,
    confidence: computeConfidence(merged),
  };
}

/** Merge parsed natural text into draft fields (keeps existing values when not parsed). */
export function mergeNaturalBuyerLeadText(
  fields: BuyerLeadDraftFields,
  message: string
): { fields: BuyerLeadDraftFields; parse: BuyerLeadTextParseResult } {
  const parse = parseNaturalBuyerLeadText(message, fields);
  const merged = mergeParsedIntoFields(fields, parse);
  return {
    fields: merged,
    parse: {
      ...parse,
      missingFields: listMissingLeadFields(merged),
      confidence: computeConfidence(merged),
    },
  };
}

/** @deprecated use parseBahtFromThaiText */
export function parseBahtFromText(fragment: string): number | null {
  return parseBahtFromThaiText(fragment);
}
