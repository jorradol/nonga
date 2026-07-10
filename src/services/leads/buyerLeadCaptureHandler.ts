/**
 * v5.6C / v5.6C.1 — Wire chat turn → buyer lead capture replies / modal submit.
 */

import { createBuyerLeadFromChat } from "./buyerLeadApi";
import {
  saveBuyerPurchaseProfileFromDraft,
} from "./buyerPurchaseProfile";
import {
  buildBuyerLeadCollectingPrompt,
  buildBuyerLeadEditProfileReply,
  buildBuyerLeadOpenModalAckReply,
  buildBuyerLeadReadySummaryReply,
  buildBuyerLeadSavedProfileSummaryReply,
  buildBuyerLeadSelectCarFirstReply,
  buildBuyerLeadStartFromCarReply,
  buildBuyerLeadSuccessReply,
  BUYER_LEAD_CANCEL_REPLY,
  BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY,
  BUYER_LEAD_FORBIDDEN_DOC_REPLY,
  CHAT_BUYER_LEAD_EDIT_SAVED_PROFILE_ACTION,
  CHAT_BUYER_LEAD_OPEN_MODAL_ACTION,
  CHAT_BUYER_LEAD_USE_SAVED_PROFILE_ACTION,
} from "./buyerLeadCaptureCopy";
import { fetchLeadCaptureEnabled } from "./leadCaptureClientFlags";
import {
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  getBuyerLeadCaptureContext,
  hasPartialBuyerLeadDraftFields,
  isBuyerLeadCancelIntent,
  isBuyerLeadStartIntent,
  listMissingBuyerLeadFields,
  processBuyerLeadCaptureTurn,
  startBuyerLeadCaptureFromCar,
  updateBuyerLeadDraftPhone,
} from "./buyerLeadCaptureFlow";
import {
  containsForbiddenSensitiveDocument,
  isBuyerLeadEditSavedProfileAction,
  normalizeThaiPhone,
} from "./buyerLeadValidation";
import type { ChatCarCardData } from "../../types";
import { clearBuyerLeadTarget } from "../../utils/buyerLeadTarget";

function isBuyerLeadUiActionMessage(message: string): boolean {
  const t = message.trim();
  return (
    t === CHAT_BUYER_LEAD_OPEN_MODAL_ACTION ||
    t === CHAT_BUYER_LEAD_USE_SAVED_PROFILE_ACTION ||
    t === CHAT_BUYER_LEAD_EDIT_SAVED_PROFILE_ACTION ||
    isBuyerLeadEditSavedProfileAction(message)
  );
}

/** v22.46 — Clear in-progress draft when capture is OFF; never collect PII. */
function clearBuyerLeadCaptureWhileUnavailable(sessionId: string): void {
  clearBuyerLeadCaptureContext(sessionId);
  clearBuyerLeadTarget();
}

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
      isBuyerLeadProfileReuse?: boolean;
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

  // v22.46 — While kill switch is OFF, do not collect PII or open consent modal.
  const captureOn = await fetchLeadCaptureEnabled();
  if (!captureOn) {
    const active = getBuyerLeadCaptureContext(params.sessionId);
    const startOrContinue =
      Boolean(active) ||
      isBuyerLeadStartIntent(params.message) ||
      isBuyerLeadUiActionMessage(params.message);
    if (startOrContinue) {
      clearBuyerLeadCaptureWhileUnavailable(params.sessionId);
      return {
        handled: true,
        reply: BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY,
      };
    }
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

  if (isBuyerLeadEditSavedProfileAction(params.message)) {
    const editCtx = getBuyerLeadCaptureContext(params.sessionId);
    if (editCtx) {
      return {
        handled: true,
        reply: buildBuyerLeadEditProfileReply(
          listMissingBuyerLeadFields(editCtx.fields)
        ),
      };
    }
  }

  const sessionCtx = getBuyerLeadCaptureContext(params.sessionId);
  if (!sessionCtx) {
    return { handled: true, reply: buildBuyerLeadSelectCarFirstReply() };
  }

  const miss = listMissingBuyerLeadFields(sessionCtx.fields);
  if (!sessionCtx.fields.listingId?.trim()) {
    return { handled: true, reply: buildBuyerLeadSelectCarFirstReply() };
  }

  if (sessionCtx.stage === "reuse_profile_choice") {
    return {
      handled: true,
      reply: buildBuyerLeadSavedProfileSummaryReply(sessionCtx.fields),
      isBuyerLeadProfileReuse: true,
    };
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
    reply: buildBuyerLeadCollectingPrompt(miss, {
      compact: hasPartialBuyerLeadDraftFields(sessionCtx.fields),
    }),
  };
}

export async function handleBuyerLeadCaptureFromCarCard(params: {
  sessionId: string;
  car: ChatCarCardData;
  buyerUserId?: string;
}): Promise<{ reply: string; isBuyerLeadProfileReuse?: boolean }> {
  // v22.46 — OFF: explain unavailable; do not start draft or ask for PII.
  const captureOn = await fetchLeadCaptureEnabled();
  if (!captureOn) {
    clearBuyerLeadCaptureWhileUnavailable(params.sessionId);
    return { reply: BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY };
  }

  const ctx = startBuyerLeadCaptureFromCar(
    params.sessionId,
    params.car,
    params.buyerUserId
  );
  if (ctx.stage === "reuse_profile_choice") {
    return {
      reply:
        buildBuyerLeadStartFromCarReply(params.car) +
        "\n\n" +
        buildBuyerLeadSavedProfileSummaryReply(ctx.fields),
      isBuyerLeadProfileReuse: true,
    };
  }
  const miss = listMissingBuyerLeadFields(ctx.fields);
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
  buyerUserId?: string;
}): Promise<SubmitBuyerLeadFromModalResult> {
  // v22.46 — UI fail-closed; backend kill switch remains authoritative.
  const captureOn = await fetchLeadCaptureEnabled({ force: true });
  if (!captureOn) {
    clearBuyerLeadCaptureWhileUnavailable(params.sessionId);
    return {
      ok: false,
      message: BUYER_LEAD_CAPTURE_UNAVAILABLE_REPLY,
    };
  }

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

  if (params.buyerUserId) {
    saveBuyerPurchaseProfileFromDraft(params.buyerUserId, updated.fields);
  }

  clearBuyerLeadCaptureContext(params.sessionId);
  clearBuyerLeadTarget();
  const queuePosition = api.lead.queuePosition;
  return {
    ok: true,
    reply: api.message?.trim() || buildBuyerLeadSuccessReply(queuePosition),
  };
}
