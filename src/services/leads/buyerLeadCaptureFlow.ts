/**
 * v5.6C / v5.6C.1 — In-chat buyer lead capture state machine (deterministic, no Gemini).
 */

import {
  getBuyerLeadTarget,
  setBuyerLeadTargetFromCar,
  type BuyerLeadTargetCar,
} from "../../utils/buyerLeadTarget";
import { saveLastSelectedCarId } from "../../utils/chatCarContext";
import type { ChatCarCardData } from "../../types";
import {
  containsForbiddenSensitiveDocument,
  isBuyerLeadConsentConfirmation,
  isBuyerLeadOpenModalAction,
  normalizeThaiPhone,
  parsePurchaseMethod,
  type BuyerLeadCreateInput,
  BUYER_LEAD_CONSENT_VERSION,
} from "./buyerLeadValidation";

export type BuyerLeadCaptureStage =
  | "idle"
  | "collecting"
  | "ready_for_modal"
  | "submitting"
  | "completed";

export interface BuyerLeadDraftFields {
  listingId?: string;
  displayName?: string;
  contactPhone?: string;
  purchaseMethod?: "cash" | "finance" | "undecided";
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  preferredContactWindow?: string;
}

export interface BuyerLeadCaptureContext {
  stage: BuyerLeadCaptureStage;
  fields: BuyerLeadDraftFields;
  createdLeadId?: string;
}

const bySession = new Map<string, BuyerLeadCaptureContext>();

const START_INTENT_PATTERNS: RegExp[] = [
  /ขอให้ผู้ขายติดต่อกลับ/i,
  /ให้ผู้ขายติดต่อ/i,
  /อยากให้(?:ผู้ขาย|เจ้าของ|เต็นท์)?ติดต่อกลับ/i,
  /ติดต่อกลับ(?:เรื่องรถ)?/i,
  /สนใจ(?:รถ)?(?:คัน)?นี้.*ติดต่อ/i,
  /ขอเบอร์ผู้ขาย/i,
];

const CANCEL_PATTERNS = [/^ยกเลิก$/i, /ไม่ส่งข้อมูลแล้ว/i];

const NAME_PATTERNS = [
  /(?:ชื่อ|เรียก)(?:ว่า)?[:\s]*([^\n,]{2,40})/i,
  /^ชื่อ\s+(.+)$/i,
];

const CONTACT_WINDOW_PATTERNS = [
  /สะดวก(?:ติดต่อ)?[:\s]*([^\n]{3,80})/i,
  /ติดต่อ(?:ได้)?(?:ช่วง|เวลา)[:\s]*([^\n]{3,80})/i,
];

const BUDGET_PATTERN =
  /(?:งบประมาณ|ไม่เกิน|งบ)\s*([\d,.]+)\s*(?:แสน|ล้าน|บาท)?/i;
const OFFER_PATTERN =
  /(?:เสนอราคา|เสนอ|ราคา)\s*([\d,.]+)\s*(?:แสน|ล้าน|บาท)?/i;

export function getBuyerLeadCaptureContext(
  sessionId: string
): BuyerLeadCaptureContext | null {
  return bySession.get(sessionId) ?? null;
}

export function clearBuyerLeadCaptureContext(sessionId: string): void {
  bySession.delete(sessionId);
}

export function isBuyerLeadStartIntent(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  return START_INTENT_PATTERNS.some((p) => p.test(t));
}

export function isBuyerLeadCancelIntent(message: string): boolean {
  const t = message.trim();
  return CANCEL_PATTERNS.some((p) => p.test(t));
}

export function parseBahtFromText(fragment: string): number | null {
  const digitMatch = fragment.replace(/,/g, "").match(/([\d.]+)/);
  if (!digitMatch) return null;
  const num = Number.parseFloat(digitMatch[1]);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (/ล้าน/.test(fragment)) return Math.round(num * 1_000_000);
  if (/แสน/.test(fragment)) return Math.round(num * 100_000);
  if (num < 1000 && !/บาท/.test(fragment)) {
    if (num <= 50) return Math.round(num * 100_000);
  }
  return Math.round(num);
}

export function mergeBuyerLeadFieldsFromMessage(
  fields: BuyerLeadDraftFields,
  message: string
): BuyerLeadDraftFields {
  const next = { ...fields };
  const t = message.trim();

  for (const pattern of NAME_PATTERNS) {
    const m = t.match(pattern);
    if (m?.[1]) {
      const rawName = m[1].trim();
      const trimmedName = rawName.split(/\s+(?:เงินสด|ไฟแนนซ์|งบ|เสนอ|สะดวก)/i)[0]?.trim();
      next.displayName = (trimmedName || rawName).slice(0, 60);
      break;
    }
  }
  if (!next.displayName && t.length >= 2 && t.length <= 40 && !/\d{5,}/.test(t)) {
    if (/^(?:ผม|ดิฉัน|ฉัน|หนู)?\s*[\u0E00-\u0E7F]{2,30}$/u.test(t)) {
      next.displayName = t.replace(/^(?:ผม|ดิฉัน|ฉัน|หนู)\s*/u, "").trim();
    }
  }

  const method = parsePurchaseMethod(t);
  if (method) next.purchaseMethod = method;

  const budgetMatch = t.match(BUDGET_PATTERN);
  if (budgetMatch?.[1]) {
    const v = parseBahtFromText(budgetMatch[0]);
    if (v != null) next.budgetMax = v;
  }
  const offerMatch = t.match(OFFER_PATTERN);
  if (offerMatch?.[1]) {
    const v = parseBahtFromText(offerMatch[0]);
    if (v != null) next.offeredPrice = v;
  }

  for (const pattern of CONTACT_WINDOW_PATTERNS) {
    const m = t.match(pattern);
    if (m?.[1]) {
      next.preferredContactWindow = m[1].trim().slice(0, 120);
      break;
    }
  }
  if (
    !next.preferredContactWindow &&
    /(?:เช้า|บ่าย|เย็น|วันหยุด|โทร|ทัก|line|ไลน์|after|ก่อน|หลัง)/i.test(t)
  ) {
    next.preferredContactWindow = t.slice(0, 120);
  }

  return next;
}

export function hasBuyerLeadBudgetOrOffer(fields: BuyerLeadDraftFields): boolean {
  if (fields.budgetMin != null && fields.budgetMin > 0) return true;
  if (fields.budgetMax != null && fields.budgetMax > 0) return true;
  if (fields.offeredPrice != null && fields.offeredPrice > 0) return true;
  return false;
}

export function listMissingBuyerLeadFields(
  fields: BuyerLeadDraftFields,
  options?: { requirePhone?: boolean }
): string[] {
  const missing: string[] = [];
  if (!fields.listingId?.trim()) {
    missing.push('รถที่สนใจ (กดปุ่ม "ให้ผู้ขายติดต่อกลับ" ที่การ์ดรถ)');
  }
  if (!fields.displayName?.trim()) missing.push("ชื่อหรือชื่อเล่น");
  if (!fields.purchaseMethod) missing.push("วิธีซื้อ (เงินสด/ไฟแนนซ์/ยังไม่แน่ใจ)");
  if (!hasBuyerLeadBudgetOrOffer(fields)) {
    missing.push("งบประมาณหรือราคาที่เสนอ");
  }
  if (!fields.preferredContactWindow?.trim()) missing.push("เวลาที่สะดวกให้ติดต่อ");
  if (options?.requirePhone) {
    if (!fields.contactPhone?.trim() || !normalizeThaiPhone(fields.contactPhone)) {
      missing.push("เบอร์โทร");
    }
  }
  return missing;
}

export function draftToCreateInput(
  fields: BuyerLeadDraftFields,
  consentConfirmed: boolean
): BuyerLeadCreateInput | null {
  if (!fields.listingId?.trim() || !fields.displayName || !fields.contactPhone) return null;
  if (!fields.purchaseMethod || !fields.preferredContactWindow) return null;
  const phone = normalizeThaiPhone(fields.contactPhone);
  if (!phone) return null;
  return {
    listingId: fields.listingId.trim(),
    displayName: fields.displayName,
    contactPhone: phone,
    purchaseMethod: fields.purchaseMethod,
    preferredContactWindow: fields.preferredContactWindow,
    consentConfirmed,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
    ...(fields.budgetMin != null ? { budgetMin: fields.budgetMin } : {}),
    ...(fields.budgetMax != null ? { budgetMax: fields.budgetMax } : {}),
    ...(fields.offeredPrice != null ? { offeredPrice: fields.offeredPrice } : {}),
  };
}

export function beginBuyerLeadCapture(sessionId: string): BuyerLeadCaptureContext {
  const explicitTarget = getBuyerLeadTarget();
  const ctx: BuyerLeadCaptureContext = {
    stage: "collecting",
    fields: explicitTarget?.listingId
      ? { listingId: explicitTarget.listingId }
      : {},
  };
  bySession.set(sessionId, ctx);
  return ctx;
}

export function beginBuyerLeadCaptureWithListing(
  sessionId: string,
  listingId: string
): BuyerLeadCaptureContext {
  const ctx: BuyerLeadCaptureContext = {
    stage: "collecting",
    fields: { listingId: listingId.trim() },
  };
  bySession.set(sessionId, ctx);
  return ctx;
}

export function startBuyerLeadCaptureFromCar(
  sessionId: string,
  car: ChatCarCardData
): BuyerLeadCaptureContext {
  setBuyerLeadTargetFromCar(car);
  saveLastSelectedCarId(car.id);
  return beginBuyerLeadCaptureWithListing(sessionId, car.id);
}

export function updateBuyerLeadDraftPhone(
  sessionId: string,
  contactPhone: string
): BuyerLeadCaptureContext | null {
  const ctx = bySession.get(sessionId);
  if (!ctx) return null;
  const next = {
    ...ctx,
    fields: { ...ctx.fields, contactPhone },
  };
  bySession.set(sessionId, next);
  return next;
}

export function resolveBuyerLeadTargetForFields(
  fields: BuyerLeadDraftFields
): BuyerLeadTargetCar | null {
  const target = getBuyerLeadTarget();
  if (!target?.listingId || !fields.listingId?.trim()) return null;
  return target.listingId === fields.listingId.trim() ? target : null;
}

export type BuyerLeadCaptureTurnResult =
  | { handled: false }
  | {
      handled: true;
      reply: string;
      stage: BuyerLeadCaptureStage;
      openConsentModal?: boolean;
    };

function advanceAfterFieldMerge(
  sessionId: string,
  ctx: BuyerLeadCaptureContext
): BuyerLeadCaptureTurnResult {
  const missing = listMissingBuyerLeadFields(ctx.fields);
  if (missing.length > 0) {
    bySession.set(sessionId, { ...ctx, stage: "collecting" });
    return { handled: true, reply: "", stage: "collecting" };
  }
  const ready = { ...ctx, stage: "ready_for_modal" as const };
  bySession.set(sessionId, ready);
  return {
    handled: true,
    reply: "",
    stage: "ready_for_modal",
  };
}

export function processBuyerLeadCaptureTurn(params: {
  sessionId: string;
  message: string;
}): BuyerLeadCaptureTurnResult {
  const trimmed = params.message.trim();
  if (!trimmed) return { handled: false };

  let ctx = bySession.get(params.sessionId);

  if (!ctx && isBuyerLeadStartIntent(trimmed)) {
    ctx = beginBuyerLeadCapture(params.sessionId);
  }

  if (!ctx || ctx.stage === "completed" || ctx.stage === "submitting") {
    return { handled: false };
  }

  if (
    ctx.stage === "ready_for_modal" &&
    (isBuyerLeadOpenModalAction(trimmed) || isBuyerLeadConsentConfirmation(trimmed))
  ) {
    return {
      handled: true,
      reply: "",
      stage: "ready_for_modal",
      openConsentModal: true,
    };
  }

  if (ctx.stage === "collecting" || ctx.stage === "ready_for_modal") {
    ctx = {
      ...ctx,
      fields: mergeBuyerLeadFieldsFromMessage(ctx.fields, trimmed),
    };
    return advanceAfterFieldMerge(params.sessionId, ctx);
  }

  return { handled: false };
}

/** Test helper */
export function setBuyerLeadCaptureContextForTest(
  sessionId: string,
  ctx: BuyerLeadCaptureContext
): void {
  bySession.set(sessionId, ctx);
}
