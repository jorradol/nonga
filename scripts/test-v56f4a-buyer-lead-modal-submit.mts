/**
 * v5.6F.4a — Buyer lead consent modal submit UX (no silent failure)
 * npm run test:v56f4a-buyer-lead-modal-submit
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapBuyerLeadHttpError,
} from "../src/services/leads/buyerLeadApi.ts";
import {
  BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR,
  BUYER_LEAD_MODAL_SUBMIT_LOADING_LABEL,
  BUYER_LEAD_MODAL_SUBMIT_SESSION_ERROR,
} from "../src/services/leads/buyerLeadConsentModalCopy.ts";
import { buildBuyerLeadSuccessReply } from "../src/services/leads/buyerLeadCaptureCopy.ts";
import {
  clearBuyerLeadCaptureContext,
  setBuyerLeadCaptureContextForTest,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import { submitBuyerLeadFromModal } from "../src/services/leads/buyerLeadCaptureHandler.ts";

const repoRoot = resolve(import.meta.dirname ?? ".", "..");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

// --- HTTP error mapping ---
ok(
  "401 maps to session message",
  mapBuyerLeadHttpError(401) === BUYER_LEAD_MODAL_SUBMIT_SESSION_ERROR
);
ok(
  "500 maps to generic retry",
  mapBuyerLeadHttpError(500) === BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR
);
ok(
  "400 uses server message",
  mapBuyerLeadHttpError(400, "ประกาศนี้ไม่พร้อมรับลีดในขณะนี้ครับ").includes("ไม่พร้อมรับลีด")
);

// --- success copy ---
ok(
  "success reply mentions queue",
  buildBuyerLeadSuccessReply(2).includes("2")
);

// --- handler pre-submit errors (no API) ---
{
  const sid = "sess-f4a-not-ready";
  clearBuyerLeadCaptureContext(sid);
  const r = await submitBuyerLeadFromModal({
    sessionId: sid,
    contactPhone: "0812345678",
    isSignedIn: true,
  });
  ok(
    "not ready returns message",
    r.ok === false && Boolean(r.message)
  );
}

{
  const sid = "sess-f4a-guest";
  clearBuyerLeadCaptureContext(sid);
  setBuyerLeadCaptureContextForTest(sid, {
    stage: "ready_for_modal",
    fields: {
      listingId: "car-x",
      displayName: "ทดสอบ",
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
      budgetMax: 300000,
    },
  });
  const r = await submitBuyerLeadFromModal({
    sessionId: sid,
    contactPhone: "0812345678",
    isSignedIn: false,
  });
  ok("guest requires login flag", !r.ok && "requireLogin" in r && r.requireLogin === true);
}

// --- UI wiring: no silent failure ---
{
  const host = read("src/components/chat/BuyerLeadConsentModalHost.tsx");
  ok("host tracks submitError", host.includes("submitError"));
  ok("host sets error on !result.ok", host.includes("setSubmitError"));
  ok("host finally clears loading", host.includes("setIsSubmitting(false)"));
  ok("host passes submitError to modal", host.includes("submitError={submitError}"));
  ok(
    "host closes modal on success",
    host.includes("if (result.ok)") && host.includes("closeConsentModal()")
  );
  ok(
    "host keeps modal open on failure",
    host.includes("} else {") && host.includes("setSubmitError")
  );
}

{
  const modal = read("src/components/chat/BuyerLeadConsentModal.tsx");
  ok("modal shows submit error testid", modal.includes("buyer-lead-modal-submit-error"));
  ok(
    "modal loading label",
    modal.includes("BUYER_LEAD_MODAL_SUBMIT_LOADING_LABEL")
  );
}

{
  const useChatSrc = read("src/hooks/chat/useChat.ts");
  ok(
    "submit uses consentModalSessionId",
    useChatSrc.includes("consentModalSessionId") &&
      useChatSrc.includes("submitBuyerLeadFromModal")
  );
  ok(
    "close modal before addMessage on success",
    useChatSrc.includes("closeConsentModal();") &&
      useChatSrc.indexOf("closeConsentModal();") <
        useChatSrc.indexOf('await addMessage(sessionId, "ai", result.reply)')
  );
  ok("success chat message on ok", useChatSrc.includes('await addMessage(sessionId, "ai", result.reply)'));
}

{
  const api = read("src/services/leads/buyerLeadApi.ts");
  ok("api POST buyer-leads", api.includes('fetch("/api/buyer-leads"'));
  ok("api maps http errors", api.includes("mapBuyerLeadHttpError"));
  ok("api network catch", api.includes("BUYER_LEAD_MODAL_SUBMIT_NETWORK_ERROR"));
}

// --- no client Firestore on lead engine collections ---
{
  const forbidden = [
    /collection\s*\(\s*db\s*,\s*["']buyerLeads["']/,
    /collection\s*\(\s*db\s*,\s*["']leadContactLogs["']/,
    /collection\s*\(\s*db\s*,\s*["']buyerPurchaseProfiles["']/,
    /doc\s*\(\s*db\s*,\s*["']buyerLeads/,
  ];
  let hit = "";
  const filesToScan = [
    "src/services/leads/buyerLeadApi.ts",
    "src/services/leads/buyerLeadCaptureHandler.ts",
    "src/services/leads/buyerPurchaseProfile.ts",
    "src/components/chat/BuyerLeadConsentModalHost.tsx",
    "src/hooks/chat/useChat.ts",
  ];
  for (const rel of filesToScan) {
    const text = read(rel);
    for (const re of forbidden) {
      if (re.test(text)) hit = `${rel} ${re}`;
    }
  }
  ok("no client Firestore lead engine collections", hit === "", hit);
}

console.log("\nDone v5.6F.4a buyer lead modal submit tests.");
if (process.exitCode) process.exit(process.exitCode);
