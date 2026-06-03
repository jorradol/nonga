/**
 * v5.6C — Wire chat turn → buyer lead capture replies / API submit.
 */

import { createBuyerLeadFromChat } from "./buyerLeadApi";
import {
  buildBuyerLeadCollectingPrompt,
  buildBuyerLeadConsentPrompt,
  buildBuyerLeadSuccessReply,
  BUYER_LEAD_CANCEL_REPLY,
  BUYER_LEAD_FORBIDDEN_DOC_REPLY,
  BUYER_LEAD_LOGIN_REQUIRED_REPLY,
} from "./buyerLeadCaptureCopy";
import {
  clearBuyerLeadCaptureContext,
  getBuyerLeadCaptureContext,
  isBuyerLeadCancelIntent,
  listMissingBuyerLeadFields,
  processBuyerLeadCaptureTurn,
} from "./buyerLeadCaptureFlow";
import { containsForbiddenSensitiveDocument } from "./buyerLeadValidation";

export interface HandleBuyerLeadCaptureParams {
  sessionId: string;
  message: string;
  isSignedIn: boolean;
}

export type HandleBuyerLeadCaptureResult =
  | { handled: false }
  | { handled: true; reply: string };

export async function handleBuyerLeadCaptureTurn(
  params: HandleBuyerLeadCaptureParams
): Promise<HandleBuyerLeadCaptureResult> {
  if (containsForbiddenSensitiveDocument(params.message)) {
    return { handled: true, reply: BUYER_LEAD_FORBIDDEN_DOC_REPLY };
  }

  if (isBuyerLeadCancelIntent(params.message)) {
    clearBuyerLeadCaptureContext(params.sessionId);
    return { handled: true, reply: BUYER_LEAD_CANCEL_REPLY };
  }

  const turn = processBuyerLeadCaptureTurn({
    sessionId: params.sessionId,
    message: params.message,
  });

  if (!turn.handled) return { handled: false };

  if (turn.shouldSubmit && turn.createInput) {
    if (!params.isSignedIn) {
      return { handled: true, reply: BUYER_LEAD_LOGIN_REQUIRED_REPLY };
    }
    const api = await createBuyerLeadFromChat({
      listingId: turn.createInput.listingId,
      displayName: turn.createInput.displayName,
      contactPhone: turn.createInput.contactPhone,
      purchaseMethod: turn.createInput.purchaseMethod,
      preferredContactWindow: turn.createInput.preferredContactWindow,
      budgetMin: turn.createInput.budgetMin,
      budgetMax: turn.createInput.budgetMax,
      offeredPrice: turn.createInput.offeredPrice,
      consentConfirmed: true,
    });
    if (!api.ok) {
      return { handled: true, reply: api.message };
    }
    clearBuyerLeadCaptureContext(params.sessionId);
    return { handled: true, reply: buildBuyerLeadSuccessReply() };
  }

  if (turn.stage === "awaiting_consent") {
    return { handled: true, reply: buildBuyerLeadConsentPrompt() };
  }

  const sessionCtx = getBuyerLeadCaptureContext(params.sessionId);
  const miss = sessionCtx
    ? listMissingBuyerLeadFields(sessionCtx.fields)
    : ["ชื่อหรือชื่อเล่น", "เบอร์โทร"];

  return {
    handled: true,
    reply: buildBuyerLeadCollectingPrompt(miss),
  };
}
