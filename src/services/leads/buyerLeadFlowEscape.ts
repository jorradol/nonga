/**
 * v7.1 — Lead Flow Escape + Intent Re-check (deterministic, no Gemini).
 *
 * Re-checks the latest buyer message while an in-chat buyer lead capture is
 * active. If the message expresses a *new* intent (search another car, change
 * budget/area, compare, ask about finance / gas / fuel economy) or a hesitation
 * ("ยังไม่ส่ง", "เดี๋ยวก่อน ยังไม่ให้เบอร์"), the lead flow must pause instead of
 * forcing the user to keep filling lead fields.
 *
 * Hard guarantees:
 * - Never sends a lead. Pausing is handled by pauseBuyerLeadCapture (caller).
 * - Never treats a genuine lead-field answer or a lead-flow action button as an
 *   escape (name/method/contact-window answers, consent, modal, reuse/edit).
 * - Only re-checks when a capture session is actually active.
 */

import { parseBuyerSearchIntent } from "../ai/chat/buyerSearchIntentParser";
import {
  isActiveBuyerLeadCaptureSession,
  isBuyerLeadCancelIntent,
} from "./buyerLeadCaptureFlow";
import { parseNaturalBuyerLeadText } from "./buyerLeadTextParser";
import {
  isBuyerLeadConsentConfirmation,
  isBuyerLeadEditSavedProfileAction,
  isBuyerLeadOpenModalAction,
  isBuyerLeadUseSavedProfileAction,
} from "./buyerLeadValidation";

export type BuyerLeadFlowEscapeIntent = "redirect" | "hold" | "none";

export type BuyerLeadFlowEscape =
  | { kind: "none" }
  | { kind: "redirect"; ack: string }
  | { kind: "hold"; reply: string };

/** Natural pause copy — น้องเอ pauses the previous car, never sends, then helps with the new intent. */
export const BUYER_LEAD_PAUSE_REDIRECT_ACK =
  "ได้เลยครับ งั้นน้องเอพักคันก่อนหน้าไว้ก่อน (ยังไม่ส่งข้อมูลให้ผู้ขายนะครับ) เดี๋ยวช่วยหา/ดูตามเงื่อนไขใหม่ให้เลยครับ";

export const BUYER_LEAD_PAUSE_HOLD_REPLY =
  "ได้เลยครับ ไม่ต้องรีบ น้องเอพักเรื่องส่งข้อมูลไว้ก่อน ยังไม่ส่งให้ผู้ขายและยังไม่ขอเบอร์นะครับ — อยากดูรถคันอื่น เปรียบเทียบ หรือถามอะไรเพิ่มเติม พิมพ์มาได้เลยครับ พอพร้อมส่งค่อยบอกน้องเอได้เสมอครับ";

const COMPARE_SIGNAL =
  /เปรียบเทียบ|เทียบ(?:กับ|ดู|ให้|อีก)?|อีกคัน|คันอื่น|รถคันอื่น|ดูคันอื่น/i;

const GAS_SIGNAL = /ติด\s*แก๊ส|แก๊ส|\bngv\b|\blpg\b/i;

const FUEL_ECONOMY_SIGNAL =
  /ประหยัด\s*น้ำมัน|ประหยัดกว่า|กินน้ำมัน(?:น้อย|เบา)?/i;

/** Finance asked as a *question* (not "จัดไฟแนนซ์" chosen as a lead purchase method). */
const FINANCE_QUESTION_SIGNAL =
  /ผ่อน(?:ได้|ไหว|ไหม|มั้ย|กี่|นาน|เดือนละ|หนัก|เบา|ยังไง|อย่างไร|หรือ)|ดาวน์\s*(?:เท่า|กี่|น้อย|เยอะ|ประมาณ)|ค่างวด|กี่งวด|ไฟแนนซ์(?:ผ่าน|ยังไง|ได้ไหม|กี่|มั้ย|ไหม)/i;

const AREA_SIGNAL = /แถว|โซน|ย่าน|ใกล้บ้าน|จังหวัด|ในเมือง|ต่างจังหวัด/i;

const REPLACE_SIGNAL =
  /แทน|เปลี่ยน(?:เป็น|ไป|มา)?|ขอเป็น|เอาเป็น|ขอใหม่|อันใหม่|คันใหม่/i;

const SEARCH_VERB_SIGNAL =
  /ขอดู|อยากดู|อยากได้|ขอ\s*รถ|หารถ|ค้นหา|ช่วยหา|ช่วยค้นหา|มีรถ|มี.{0,12}(?:ไหม|มั้ย)|แนะนำรถ|ดูรถ/i;

const REJECT_CURRENT_SIGNAL =
  /ไม่เอาคันนี้|ไม่เอาแล้ว|ไม่เอาอันนี้|ไม่ชอบคันนี้|เปลี่ยนคัน/i;

const CHANGE_CRITERIA_SIGNAL = /งบ|ราคา|แสน|ล้าน|รุ่น|ยี่ห้อ|รถ/i;

const HOLD_SIGNAL =
  /ยังไม่ส่ง|ยังไม่ให้เบอร์|ไม่ให้เบอร์|ยังไม่ให้ข้อมูล|เดี๋ยวก่อน|ขอคิดก่อน|ขอดูก่อน|ยังก่อน|ช้าก่อน|ขอเวลา|ไว้ก่อน|ยังไม่พร้อม|ยังไม่ยืนยัน/i;

/** True when the message reads as a genuine lead-field answer (name/method/contact window). */
function looksLikeLeadFieldContinuation(message: string): boolean {
  const r = parseNaturalBuyerLeadText(message);
  return Boolean(r.displayName || r.purchaseMethod || r.preferredContactWindow);
}

/** True for lead-flow control actions that must never be treated as a new intent. */
function isLeadFlowControlAction(message: string): boolean {
  return (
    isBuyerLeadCancelIntent(message) ||
    isBuyerLeadConsentConfirmation(message) ||
    isBuyerLeadOpenModalAction(message) ||
    isBuyerLeadUseSavedProfileAction(message) ||
    isBuyerLeadEditSavedProfileAction(message)
  );
}

/**
 * Classify the latest message intent for an in-progress lead flow.
 * Pure function — safe to unit test without React/session state.
 */
export function detectBuyerLeadFlowEscapeIntent(
  message: string
): BuyerLeadFlowEscapeIntent {
  const t = message.trim();
  if (!t) return "none";

  if (isLeadFlowControlAction(t)) return "none";

  const strongRedirect =
    COMPARE_SIGNAL.test(t) ||
    GAS_SIGNAL.test(t) ||
    FUEL_ECONOMY_SIGNAL.test(t) ||
    FINANCE_QUESTION_SIGNAL.test(t) ||
    REJECT_CURRENT_SIGNAL.test(t) ||
    (AREA_SIGNAL.test(t) && REPLACE_SIGNAL.test(t)) ||
    (REPLACE_SIGNAL.test(t) && CHANGE_CRITERIA_SIGNAL.test(t));

  if (strongRedirect) return "redirect";

  // Soft (budget-style) search — require an explicit search/replace verb and
  // make sure it is not just the user answering a lead field with a number.
  const softSearch = parseBuyerSearchIntent(t).isVehicleSearch;
  if (
    softSearch &&
    !looksLikeLeadFieldContinuation(t) &&
    (SEARCH_VERB_SIGNAL.test(t) || REPLACE_SIGNAL.test(t))
  ) {
    return "redirect";
  }

  if (HOLD_SIGNAL.test(t)) return "hold";

  return "none";
}

/**
 * Resolve whether an active lead capture should escape for this message.
 * Returns "none" when no capture session is active.
 */
export function resolveBuyerLeadFlowEscape(
  sessionId: string,
  message: string
): BuyerLeadFlowEscape {
  if (!isActiveBuyerLeadCaptureSession(sessionId)) {
    return { kind: "none" };
  }
  const intent = detectBuyerLeadFlowEscapeIntent(message);
  if (intent === "redirect") {
    return { kind: "redirect", ack: BUYER_LEAD_PAUSE_REDIRECT_ACK };
  }
  if (intent === "hold") {
    return { kind: "hold", reply: BUYER_LEAD_PAUSE_HOLD_REPLY };
  }
  return { kind: "none" };
}
