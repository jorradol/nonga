/**
 * v5.6C / v5.6C.1 — Wire chat turn → buyer lead capture replies / modal submit.
 */

import { createBuyerLeadFromChat } from "./buyerLeadApi";
import {
  buildBuyerLeadCollectingPrompt,
  buildBuyerLeadOpenModalAckReply,
  buildBuyerLeadReadySummaryReply,
  buildBuyerLeadSelectCarFirstReply,
  buildBuyerLeadStartFromCarReply,
  buildBuyerLeadSuccessReply,
  BUYER_LEAD_CANCEL_REPLY,
  BUYER_LEAD_FORBIDDEN_DOC_REPLY,
} from "./buyerLeadCaptureCopy";
import {
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  getBuyerLeadCaptureContext,
  isBuyerLeadCancelIntent,
  listMissingBuyerLeadFields,
  processBuyerLeadCaptureTurn,
  startBuyerLeadCaptureFromCar,
  updateBuyerLeadDraftPhone,
} from "./buyerLeadCaptureFlow";
import {
  containsForbiddenSensitiveDocument,
  normalizeThaiPhone,
} from "./buyerLeadValidation";
import type { ChatCarCardData } from "../../types";
import { clearBuyerLeadTarget } from "../../utils/buyerLeadTarget";

export interface HandleBuyerLeadCaptureParams {
  sessionId: string;
  message: string;
  isSignedIn: boolean;
}

export type HandleBuyerLeadCaptureResult =
  | { handled: false }
  | {
      handled: true;
      reply: string;
      openConsentModal?: boolean;
      isBuyerLeadReady?: boolean;
    };

export async function handleBuyerLeadCaptureTurn(
  params: HandleBuyerLeadCaptureParams
): Promise<HandleBuyerLeadCaptureResult> {
  if (containsForbiddenSensitiveDocument(params.message)) {
    return { handled: true, reply: BUYER_LEAD_FORBIDDEN_DOC_REPLY };
  }

  if (isBuyerLeadCancelIntent(params.message)) {
    clearBuyerLeadCaptureContext(params.sessionId);
    clearBuyerLeadTarget();
    return { handled: true, reply: BUYER_LEAD_CANCEL_REPLY };
  }

  const turn = processBuyerLeadCaptureTurn({
    sessionId: params.sessionId,
    message: params.message,
  });

  if (!turn.handled) return { handled: false };

  if (turn.openConsentModal) {
    return {
      handled: true,
      reply: buildBuyerLeadOpenModalAckReply(),
      openConsentModal: true,
    };
  }

  const sessionCtx = getBuyerLeadCaptureContext(params.sessionId);
  if (!sessionCtx) {
    return { handled: true, reply: buildBuyerLeadSelectCarFirstReply() };
  }

  const miss = listMissingBuyerLeadFields(sessionCtx.fields);
  if (!sessionCtx.fields.listingId?.trim()) {
    return { handled: true, reply: buildBuyerLeadSelectCarFirstReply() };
  }

  if (sessionCtx.stage === "ready_for_modal" && miss.length === 0) {
    return {
      handled: true,
      reply: buildBuyerLeadReadySummaryReply(sessionCtx.fields),
      isBuyerLeadReady: true,
    };
  }

  return {
    handled: true,
    reply: buildBuyerLeadCollectingPrompt(miss),
  };
}

export function handleBuyerLeadCaptureFromCarCard(params: {
  sessionId: string;
  car: ChatCarCardData;
}): { reply: string } {
  startBuyerLeadCaptureFromCar(params.sessionId, params.car);
  const miss = listMissingBuyerLeadFields(
    getBuyerLeadCaptureContext(params.sessionId)?.fields ?? {}
  );
  return {
    reply:
      buildBuyerLeadStartFromCarReply(params.car) +
      "\n\n" +
      buildBuyerLeadCollectingPrompt(miss),
  };
}

export type SubmitBuyerLeadFromModalResult =
  | { ok: true; reply: string }
  | { ok: false; message: string; requireLogin?: boolean };

export async function submitBuyerLeadFromModal(params: {
  sessionId: string;
  contactPhone: string;
  isSignedIn: boolean;
}): Promise<SubmitBuyerLeadFromModalResult> {
  const ctx = getBuyerLeadCaptureContext(params.sessionId);
  if (!ctx || ctx.stage !== "ready_for_modal") {
    return { ok: false, message: "ยังไม่พร้อมส่งข้อมูล กรุณากรอกข้อมูลในแชทให้ครบก่อนครับ" };
  }

  const normalizedPhone = normalizeThaiPhone(params.contactPhone.trim());
  if (!normalizedPhone) {
    return { ok: false, message: "กรุณากรอกเบอร์โทรไทย 10 หลัก" };
  }

  updateBuyerLeadDraftPhone(params.sessionId, normalizedPhone);
  const updated = getBuyerLeadCaptureContext(params.sessionId);
  if (!updated) {
    return { ok: false, message: "ไม่พบข้อมูลที่จะส่งครับ" };
  }

  const missing = listMissingBuyerLeadFields(updated.fields, { requirePhone: true });
  if (missing.length > 0) {
    return {
      ok: false,
      message: `ข้อมูลยังไม่ครบ: ${missing.join(", ")}`,
    };
  }

  const input = draftToCreateInput(updated.fields, true);
  if (!input?.listingId?.trim()) {
    return {
      ok: false,
      message: 'กรุณาเลือกรถที่สนใจก่อน (กดปุ่ม "ให้ผู้ขายติดต่อกลับ" ที่การ์ดรถ)',
    };
  }

  if (!params.isSignedIn) {
    return {
      ok: false,
      message: "กรุณาเข้าสู่ระบบก่อนส่งข้อมูลให้ผู้ขายครับ",
      requireLogin: true,
    };
  }

  const api = await createBuyerLeadFromChat({
    listingId: input.listingId,
    displayName: input.displayName,
    contactPhone: input.contactPhone,
    purchaseMethod: input.purchaseMethod,
    preferredContactWindow: input.preferredContactWindow,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    offeredPrice: input.offeredPrice,
    consentConfirmed: true,
  });

  if (!api.ok) {
    return { ok: false, message: api.message };
  }

  clearBuyerLeadCaptureContext(params.sessionId);
  clearBuyerLeadTarget();
  const queuePosition = api.lead.queuePosition;
  return {
    ok: true,
    reply: api.message?.trim() || buildBuyerLeadSuccessReply(queuePosition),
  };
}
