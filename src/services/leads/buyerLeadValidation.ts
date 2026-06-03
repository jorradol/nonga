/**
 * v5.6C — Pure validation for buyer consent lead capture.
 */

import type { PurchaseMethod } from "./leadTypes";

export const BUYER_LEAD_CONSENT_VERSION = "v5.6C-1";

export const BUYER_LEAD_CONSENT_PROMPT =
  "ถ้าคุณยืนยัน น้องเอจะส่งข้อมูลติดต่อและความสนใจของคุณให้ผู้ขายรถคันนี้ เพื่อให้ผู้ขายติดต่อกลับเรื่องการซื้อขายรถคันนี้เท่านั้น";

export const BUYER_LEAD_CONSENT_CONFIRM_PHRASES = [
  "ยืนยันให้ส่งข้อมูล",
  "ยืนยันส่งข้อมูล",
  "ยืนยัน",
] as const;

const FORBIDDEN_DOC_PATTERNS: RegExp[] = [
  /บัตรประชาชน/i,
  /เล่มทะเบียน/i,
  /สลิปเงินเดือน/i,
  /เลขบัญชี/i,
  /สัญญาไฟแนนซ์/i,
  /สำเนาบัตร/i,
  /รูปบัตร/i,
];

const PHONE_PATTERN = /(?:0[689]\d[\s-]?){1}\d{3}[\s-]?\d{4}|0[689]\d{8}/;

export interface BuyerLeadCreateInput {
  listingId: string;
  displayName: string;
  contactPhone: string;
  purchaseMethod: PurchaseMethod;
  preferredContactWindow: string;
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  buyerSummary?: string;
  consentConfirmed: boolean;
  consentVersion: string;
}

export type BuyerLeadValidationErrorCode =
  | "missing_consent"
  | "invalid_consent_version"
  | "missing_listing"
  | "missing_display_name"
  | "missing_phone"
  | "invalid_phone"
  | "missing_purchase_method"
  | "missing_contact_window"
  | "forbidden_sensitive_document"
  | "message_too_long";

export interface BuyerLeadValidationResult {
  ok: boolean;
  errors: BuyerLeadValidationErrorCode[];
}

export function containsForbiddenSensitiveDocument(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return FORBIDDEN_DOC_PATTERNS.some((p) => p.test(t));
}

export function normalizeThaiPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 9 && /^[689]/.test(digits)) return `0${digits}`;
  return null;
}

export function extractPhoneFromText(text: string): string | null {
  const match = text.match(PHONE_PATTERN);
  if (!match) return null;
  return normalizeThaiPhone(match[0]);
}

export function parsePurchaseMethod(text: string): PurchaseMethod | null {
  const t = text.trim();
  if (/เงินสด|ซื้อสด|จ่ายสด/i.test(t)) return "cash";
  if (/ไฟแนนซ์|ผ่อน|สินเชื่อ/i.test(t)) return "finance";
  if (/ยังไม่แน่ใจ|ยังไม่ตัดสินใจ/i.test(t)) return "undecided";
  return null;
}

export function isBuyerLeadConsentConfirmation(text: string): boolean {
  const t = text.trim();
  return BUYER_LEAD_CONSENT_CONFIRM_PHRASES.some(
    (phrase) => t === phrase || t.startsWith(phrase)
  );
}

/** Opens consent modal when chat draft is complete (v5.6D.1). */
export function isBuyerLeadOpenModalAction(text: string): boolean {
  const t = text.trim();
  return (
    t === "ตรวจสอบและส่งข้อมูลให้ผู้ขาย" ||
    t.startsWith("ตรวจสอบและส่งข้อมูลให้ผู้ขาย")
  );
}

export function validateBuyerLeadCreateInput(
  input: BuyerLeadCreateInput,
  options?: { checkForbiddenInSummary?: boolean }
): BuyerLeadValidationResult {
  const errors: BuyerLeadValidationErrorCode[] = [];

  if (!input.consentConfirmed) errors.push("missing_consent");
  if (input.consentVersion !== BUYER_LEAD_CONSENT_VERSION) {
    errors.push("invalid_consent_version");
  }
  if (!input.listingId?.trim()) errors.push("missing_listing");
  if (!input.displayName?.trim()) errors.push("missing_display_name");
  if (!input.contactPhone?.trim()) errors.push("missing_phone");
  else if (!normalizeThaiPhone(input.contactPhone)) errors.push("invalid_phone");
  if (!input.purchaseMethod) errors.push("missing_purchase_method");
  if (!input.preferredContactWindow?.trim()) errors.push("missing_contact_window");

  const blob = `${input.displayName} ${input.buyerSummary ?? ""} ${input.preferredContactWindow}`;
  if (containsForbiddenSensitiveDocument(blob)) {
    errors.push("forbidden_sensitive_document");
  }
  if (options?.checkForbiddenInSummary && input.buyerSummary) {
    if (containsForbiddenSensitiveDocument(input.buyerSummary)) {
      errors.push("forbidden_sensitive_document");
    }
  }
  if ((input.buyerSummary?.length ?? 0) > 2000) errors.push("message_too_long");

  return { ok: errors.length === 0, errors };
}

export function buildBuyerLeadSummary(input: {
  displayName: string;
  purchaseMethod: PurchaseMethod;
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  preferredContactWindow: string;
  listingTitle?: string;
}): string {
  const budget =
    input.budgetMin != null || input.budgetMax != null
      ? `งบประมาณ ${formatBahtRange(input.budgetMin, input.budgetMax)}`
      : "";
  const offer =
    input.offeredPrice != null && input.offeredPrice > 0
      ? `เสนอราคา ${input.offeredPrice.toLocaleString("th-TH")} บาท`
      : "";
  const method =
    input.purchaseMethod === "cash"
      ? "ซื้อเงินสด"
      : input.purchaseMethod === "finance"
        ? "ไฟแนนซ์"
        : "วิธีซื้อยังไม่แน่ใจ";
  const car = input.listingTitle ? `สนใจ ${input.listingTitle}` : "สนใจรถในประกาศ";
  return [
    `${input.displayName} ${car}`,
    method,
    budget,
    offer,
    `สะดวกติดต่อ: ${input.preferredContactWindow}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatBahtRange(min?: number, max?: number): string {
  if (min != null && max != null && min !== max) {
    return `${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")} บาท`;
  }
  const v = max ?? min;
  if (v == null) return "ไม่ระบุ";
  return `ประมาณ ${v.toLocaleString("th-TH")} บาท`;
}
