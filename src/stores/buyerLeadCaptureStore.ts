/**
 * v5.6C.1 — UI state for buyer lead consent preview modal.
 */

import { create } from "zustand";

interface BuyerLeadCaptureStore {
  consentModalOpen: boolean;
  consentModalSessionId: string | null;
  openConsentModal: (sessionId: string) => void;
  closeConsentModal: () => void;
}

export const useBuyerLeadCaptureStore = create<BuyerLeadCaptureStore>((set) => ({
  consentModalOpen: false,
  consentModalSessionId: null,
  openConsentModal: (sessionId) =>
    set({ consentModalOpen: true, consentModalSessionId: sessionId }),
  closeConsentModal: () =>
    set({ consentModalOpen: false, consentModalSessionId: null }),
}));
