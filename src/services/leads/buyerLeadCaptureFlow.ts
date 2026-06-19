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
  mergeNaturalBuyerLeadText,
  parseBahtFromThaiText,
} from "./buyerLeadTextParser";
import {
  containsForbiddenSensitiveDocument,
  isBuyerLeadConsentConfirmation,
  isBuyerLeadEditSavedProfileAction,
  isBuyerLeadOpenModalAction,
  isBuyerLeadUseSavedProfileAction,
  normalizeThaiPhone,
  parsePurchaseMethod,
  type BuyerLeadCreateInput,
  BUYER_LEAD_CONSENT_VERSION,
} from "./buyerLeadValidation";
import {
  getBuyerPurchaseProfile,
  profileToDraftFields,
} from "./buyerPurchaseProfile";

export type BuyerLeadCaptureStage =
  | "idle"
  | "collecting"
  | "reuse_profile_choice"
  | "ready_for_modal"
  | "paused"
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

const LINE_DISPLAY_NAME =
  /(?:ชื่อหรือชื่อเล่น|ชื่อเล่น|ชื่อ)\s*[:：]?\s*(.+)$/iu;
const LINE_PURCHASE_METHOD = /วิธีซื้อ\s*[:：]?\s*(.+)$/iu;
const LINE_OFFER_PRICE =
  /(?:ราคาที่เสนอ|ราคาเสนอ|เสนอราคา|เสนอ)\s*[:：]?\s*([\d,.]+)/iu;
const LINE_BUDGET =
  /(?:งบประมาณ|งบ)\s*[:：]?\s*([\d,.]+)/iu;
const LINE_CONTACT_WINDOW =
  /(?:เวลาที่สะดวกให้ติดต่อ|เวลาที่สะดวก(?:ให้)?ติดต่อ|สะดวก(?:ให้)?ติดต่อ)\s*[:：]?\s*(.+)$/iu;

export function isActiveBuyerLeadCaptureSession(sessionId: string): boolean {
  const ctx = bySession.get(sessionId);
  if (!ctx) return false;
  return (
    ctx.stage === "collecting" ||
    ctx.stage === "reuse_profile_choice" ||
    ctx.stage === "ready_for_modal"
  );
}

export function shouldRunBuyerLeadCaptureTurn(
  sessionId: string,
  memberConsumerSellerFlow: boolean
): boolean {
  if (isActiveBuyerLeadCaptureSession(sessionId)) return true;
  return !memberConsumerSellerFlow;
}

export function getBuyerLeadCaptureContext(
  sessionId: string
): BuyerLeadCaptureContext | null {
  return bySession.get(sessionId) ?? null;
}

export function clearBuyerLeadCaptureContext(sessionId: string): void {
  bySession.delete(sessionId);
}

/**
 * v7.1 — Lead Flow Escape: pause an active capture session without sending.
 * Keeps collected draft fields (so useful data is not lost) and marks the
 * stage as "paused" so subsequent messages flow back to normal search/help.
 * Never submits a lead. Returns null when there is nothing active to pause.
 */
export function pauseBuyerLeadCapture(
  sessionId: string
): BuyerLeadCaptureContext | null {
  const ctx = bySession.get(sessionId);
  if (!ctx) return null;
  if (
    ctx.stage === "completed" ||
    ctx.stage === "submitting" ||
    ctx.stage === "paused"
  ) {
    return ctx;
  }
  const paused: BuyerLeadCaptureContext = { ...ctx, stage: "paused" };
  bySession.set(sessionId, paused);
  return paused;
}

/** v7.1 — true when a session holds a paused (draft, unsent) lead context. */
export function isPausedBuyerLeadCaptureSession(sessionId: string): boolean {
  return bySession.get(sessionId)?.stage === "paused";
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
  return parseBahtFromThaiText(fragment);
}

function mergeBuyerLeadFieldsFromLine(
  next: BuyerLeadDraftFields,
  rawLine: string
): void {
  const line = rawLine.trim().replace(/^[-•*]\s*/, "");
  if (!line) return;

  const nameLine = line.match(LINE_DISPLAY_NAME);
  if (nameLine?.[1]) {
    next.displayName = nameLine[1].trim().slice(0, 60);
  }

  const methodLine = line.match(LINE_PURCHASE_METHOD);
  if (methodLine?.[1]) {
    const method = parsePurchaseMethod(methodLine[1]);
    if (method) next.purchaseMethod = method;
  }

  const offerLine = line.match(LINE_OFFER_PRICE);
  if (offerLine?.[1]) {
    const v = parseBahtFromText(offerLine[0]);
    if (v != null) next.offeredPrice = v;
  }

  const budgetLine = line.match(LINE_BUDGET);
  if (budgetLine?.[1]) {
    const v = parseBahtFromText(budgetLine[0]);
    if (v != null) next.budgetMax = v;
  }

  const contactLine = line.match(LINE_CONTACT_WINDOW);
  if (contactLine?.[1]) {
    next.preferredContactWindow = contactLine[1].trim().slice(0, 120);
  }
}

export function hasPartialBuyerLeadDraftFields(fields: BuyerLeadDraftFields): boolean {
  return Boolean(
    fields.displayName?.trim() ||
      fields.purchaseMethod ||
      hasBuyerLeadBudgetOrOffer(fields) ||
      fields.preferredContactWindow?.trim()
  );
}

export function mergeBuyerLeadFieldsFromMessage(
  fields: BuyerLeadDraftFields,
  message: string
): BuyerLeadDraftFields {
  const trimmed = message.trim();
  if (!trimmed) return { ...fields };

  let next = { ...fields };
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    for (const line of lines) {
      mergeBuyerLeadFieldsFromLine(next, line);
    }
  }

  const { fields: naturalMerged } = mergeNaturalBuyerLeadText(next, trimmed);
  next = { ...naturalMerged };

  for (const line of lines) {
    mergeBuyerLeadFieldsFromLine(next, line);
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
  options?: { requirePhone?: boolean; requireListing?: boolean }
): string[] {
  const missing: string[] = [];
  if (options?.requireListing !== false && !fields.listingId?.trim()) {
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
  car: ChatCarCardData,
  buyerUserId?: string
): BuyerLeadCaptureContext {
  setBuyerLeadTargetFromCar(car);
  saveLastSelectedCarId(car.id);
  const saved = getBuyerPurchaseProfile(buyerUserId);
  if (saved) {
    const ctx: BuyerLeadCaptureContext = {
      stage: "reuse_profile_choice",
      fields: profileToDraftFields(saved, car.id),
    };
    bySession.set(sessionId, ctx);
    return ctx;
  }
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

  if (
    !ctx ||
    ctx.stage === "completed" ||
    ctx.stage === "submitting" ||
    ctx.stage === "paused"
  ) {
    return { handled: false };
  }

  if (ctx.stage === "reuse_profile_choice") {
    if (isBuyerLeadUseSavedProfileAction(trimmed)) {
      const ready: BuyerLeadCaptureContext = {
        ...ctx,
        stage: "ready_for_modal",
        fields: { ...ctx.fields, contactPhone: undefined },
      };
      bySession.set(params.sessionId, ready);
      return {
        handled: true,
        reply: "",
        stage: "ready_for_modal",
        openConsentModal: true,
      };
    }
    if (isBuyerLeadEditSavedProfileAction(trimmed)) {
      bySession.set(params.sessionId, {
        ...ctx,
        stage: "collecting",
        fields: { ...ctx.fields, contactPhone: undefined },
      });
      return { handled: true, reply: "", stage: "collecting" };
    }
    ctx = {
      ...ctx,
      stage: "collecting",
      fields: mergeBuyerLeadFieldsFromMessage(
        { ...ctx.fields, contactPhone: undefined },
        trimmed
      ),
    };
    return advanceAfterFieldMerge(params.sessionId, ctx);
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
