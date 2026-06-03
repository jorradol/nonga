/**
 * v5.6C.1 — buyer lead target selection + consent preview modal
 * npm run test:v56c1-buyer-lead-target-modal
 */
import {
  beginBuyerLeadCapture,
  beginBuyerLeadCaptureWithListing,
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  listMissingBuyerLeadFields,
  mergeBuyerLeadFieldsFromMessage,
  processBuyerLeadCaptureTurn,
  setBuyerLeadCaptureContextForTest,
  startBuyerLeadCaptureFromCar,
  getBuyerLeadCaptureContext,
  updateBuyerLeadDraftPhone,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import {
  submitBuyerLeadFromModal,
} from "../src/services/leads/buyerLeadCaptureHandler.ts";
import {
  BUYER_LEAD_MODAL_CONSENT_CONTACT,
  BUYER_LEAD_MODAL_CONSENT_PRIMARY,
} from "../src/services/leads/buyerLeadConsentModalCopy.ts";
import {
  buildBuyerLeadModalPreview,
  isReadyForBuyerLeadConsentModal,
} from "../src/services/leads/buyerLeadPreview.ts";
import {
  BUYER_LEAD_CONSENT_VERSION,
  validateBuyerLeadCreateInput,
} from "../src/services/leads/buyerLeadValidation.ts";
import type { ChatCarCardData } from "../src/types.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const sampleCar: ChatCarCardData = {
  id: "car-target-99",
  brand: "Toyota",
  model: "Vios",
  year: 2019,
  price: 320000,
  mileage: 45000,
  bodyClass: "sedan",
  bodyClassLabel: "รถเก๋ง",
  hasImage: false,
  detailPath: "/cars/car-target-99",
  matchKind: "exact",
};

// --- no listing → cannot create lead input ---
{
  const input = draftToCreateInput(
    {
      displayName: "มานี",
      contactPhone: "0812345678",
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
    },
    true
  );
  ok("draft without listingId is null", input === null);
  ok(
    "missing listing in field list",
    listMissingBuyerLeadFields({}).some((m) => m.includes("รถที่สนใจ"))
  );
}

// --- card button flow sets listing ---
{
  const sid = "sess-card-btn";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, sampleCar);
  const ctx = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อ มานี เบอร์ 0891112233 เงินสด สะดวกเย็น",
  });
  ok("capture from car has listing on complete", ctx.handled);
  if (ctx.handled) {
    ok("opens modal when complete", ctx.openConsentModal === true);
    ok("stage ready_for_modal", ctx.stage === "ready_for_modal");
  }
}

// --- start intent without car → ask select first (no modal) ---
{
  const sid = "sess-no-car";
  clearBuyerLeadCaptureContext(sid);
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ขอให้ผู้ขายติดต่อกลับ",
  });
  const t2 = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อ มานี เบอร์ 0891112233 เงินสด สะดวกเย็น",
  });
  ok("no car: still collecting missing listing", t2.handled && t2.stage === "collecting");
  ok("no car: no modal", !("openConsentModal" in t2 && t2.openConsentModal));
}

// --- modal preview ---
{
  const fields = {
    listingId: sampleCar.id,
    displayName: "มานี",
    contactPhone: "0891112233",
    purchaseMethod: "cash" as const,
    preferredContactWindow: "เย็น ๆ",
    budgetMax: 350000,
  };
  ok("ready for modal", isReadyForBuyerLeadConsentModal(fields));
  const preview = buildBuyerLeadModalPreview(fields, {
    listingId: sampleCar.id,
    brand: sampleCar.brand,
    model: sampleCar.model,
    year: sampleCar.year,
    price: sampleCar.price,
  });
  ok("preview built", Boolean(preview));
  if (preview) {
    ok("preview has car title", preview.carTitle.includes("Vios"));
    ok("preview has summary", preview.sellerSummary.includes("มานี"));
  }
}

// --- consent copy ---
ok("modal consent primary", BUYER_LEAD_MODAL_CONSENT_PRIMARY.includes("น้องเอจะส่งข้อมูลนี้"));
ok("modal consent contact", BUYER_LEAD_MODAL_CONSENT_CONTACT.includes("วัตถุประสงค์อื่น"));

// --- phone from modal updates payload ---
{
  const sid = "sess-phone-modal";
  clearBuyerLeadCaptureContext(sid);
  beginBuyerLeadCaptureWithListing(sid, sampleCar.id);
  setBuyerLeadCaptureContextForTest(sid, {
    stage: "ready_for_modal",
    fields: {
      listingId: sampleCar.id,
      displayName: "มานี",
      contactPhone: "0811111111",
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
    },
  });
  updateBuyerLeadDraftPhone(sid, "0822223333");
  const updatedCtx = getBuyerLeadCaptureContext(sid);
  const input = draftToCreateInput(updatedCtx?.fields ?? {}, true);
  ok("modal phone in draft", input?.contactPhone === "0822223333");
}

// --- consent required before API (validation) ---
{
  const v = validateBuyerLeadCreateInput({
    listingId: sampleCar.id,
    displayName: "มานี",
    contactPhone: "0812345678",
    purchaseMethod: "cash",
    preferredContactWindow: "เย็น",
    consentConfirmed: false,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  });
  ok("consent required for POST payload", !v.ok);
}

// --- guest submit blocked ---
{
  const sid = "sess-guest";
  clearBuyerLeadCaptureContext(sid);
  setBuyerLeadCaptureContextForTest(sid, {
    stage: "ready_for_modal",
    fields: {
      listingId: sampleCar.id,
      displayName: "มานี",
      contactPhone: "0812345678",
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
    },
  });
  const guest = await submitBuyerLeadFromModal({
    sessionId: sid,
    contactPhone: "0812345678",
    isSignedIn: false,
  });
  ok(
    "guest requires login",
    !guest.ok && "requireLogin" in guest && guest.requireLogin === true
  );
}

// --- begin without explicit target has no listing ---
{
  const sid = "sess-begin-plain";
  clearBuyerLeadCaptureContext(sid);
  const ctx = beginBuyerLeadCapture(sid);
  ok("plain begin has no listingId", !ctx.fields.listingId);
}

console.log("\nDone v5.6C.1 buyer lead target + consent modal tests.");
if (process.exitCode) process.exit(process.exitCode);
