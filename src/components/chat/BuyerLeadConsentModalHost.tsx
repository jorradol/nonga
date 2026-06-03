import { useMemo, useState } from "react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { useBuyerLeadCaptureStore } from "../../stores/buyerLeadCaptureStore";
import {
  getBuyerLeadCaptureContext,
  resolveBuyerLeadTargetForFields,
} from "../../services/leads/buyerLeadCaptureFlow";
import { buildBuyerLeadModalPreview } from "../../services/leads/buyerLeadPreview";
import { BuyerLeadConsentModal } from "./BuyerLeadConsentModal";

/**
 * Renders consent preview modal wired to active chat session capture state.
 */
export function BuyerLeadConsentModalHost() {
  const { consentModalOpen, consentModalSessionId, closeConsentModal } =
    useBuyerLeadCaptureStore();
  const { activeSessionId, submitBuyerLeadConsent } = useChatContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionId = consentModalSessionId ?? activeSessionId;

  const preview = useMemo(() => {
    if (!consentModalOpen || !sessionId) return null;
    const ctx = getBuyerLeadCaptureContext(sessionId);
    if (!ctx || ctx.stage !== "ready_for_modal") return null;
    const target = resolveBuyerLeadTargetForFields(ctx.fields);
    return buildBuyerLeadModalPreview(ctx.fields, target);
  }, [consentModalOpen, sessionId]);

  const handleConfirm = async (phone: string) => {
    setIsSubmitting(true);
    try {
      await submitBuyerLeadConsent(phone);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BuyerLeadConsentModal
      open={consentModalOpen}
      preview={preview}
      isSubmitting={isSubmitting}
      onClose={closeConsentModal}
      onBackToEdit={closeConsentModal}
      onConfirm={handleConfirm}
    />
  );
}
