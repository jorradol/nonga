import { useMemo, useState } from "react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { useBuyerLeadCaptureStore } from "../../stores/buyerLeadCaptureStore";
import {
  getBuyerLeadCaptureContext,
  resolveBuyerLeadTargetForFields,
} from "../../services/leads/buyerLeadCaptureFlow";
import { buildBuyerLeadModalPreview } from "../../services/leads/buyerLeadPreview";
import {
  buildLeadPreviewContextFromMemory,
  getConversationalLeadMemory,
} from "../../services/leads/conversationalLeadMemory";
import { BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR } from "../../services/leads/buyerLeadConsentModalCopy";
import { BuyerLeadConsentModal } from "./BuyerLeadConsentModal";

/**
 * Renders consent preview modal wired to active chat session capture state.
 */
export function BuyerLeadConsentModalHost() {
  const { consentModalOpen, consentModalSessionId, closeConsentModal } =
    useBuyerLeadCaptureStore();
  const { activeSessionId, submitBuyerLeadConsent } = useChatContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sessionId = consentModalSessionId ?? activeSessionId;

  const preview = useMemo(() => {
    if (!consentModalOpen || !sessionId) return null;
    const ctx = getBuyerLeadCaptureContext(sessionId);
    if (!ctx || ctx.stage !== "ready_for_modal") return null;
    const target = resolveBuyerLeadTargetForFields(ctx.fields);
    // v7.3 — DISPLAY-ONLY enrichment from v7.2 conversational memory.
    // Never added to the submitted payload; never treated as consent.
    const memoryContext = buildLeadPreviewContextFromMemory(
      getConversationalLeadMemory(sessionId)
    );
    return buildBuyerLeadModalPreview(ctx.fields, target, memoryContext);
  }, [consentModalOpen, sessionId]);

  const handleConfirm = async (phone: string) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await submitBuyerLeadConsent(phone);
      if (result.ok) {
        setSubmitError(null);
        closeConsentModal();
      } else {
        setSubmitError(result.message?.trim() || BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR);
      }
    } catch {
      setSubmitError(BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitError(null);
    closeConsentModal();
  };

  return (
    <BuyerLeadConsentModal
      open={consentModalOpen}
      preview={preview}
      isSubmitting={isSubmitting}
      submitError={submitError}
      onClose={handleClose}
      onBackToEdit={handleClose}
      onConfirm={handleConfirm}
    />
  );
}
