/**
 * v5.6C.1 — buyer lead target selection + consent preview modal
 * npm run test:v56c1-buyer-lead-target-modal
 */
import {
  beginBuyerLeadCapture,
  beginBuyerLeadCaptureWithListing,
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  isActiveBuyerLeadCaptureSession,
  listMissingBuyerLeadFields,
  mergeBuyerLeadFieldsFromMessage,
  processBuyerLeadCaptureTurn,
  setBuyerLeadCaptureContextForTest,
  shouldRunBuyerLeadCaptureTurn,
  startBuyerLeadCaptureFromCar,
  getBuyerLeadCaptureContext,
  updateBuyerLeadDraftPhone,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import { buildBuyerLeadReadySummaryReply } from "../src/services/leads/buyerLeadCaptureCopy.ts";
import { handleBuyerLeadCaptureTurn } from "../src/services/leads/buyerLeadCaptureHandler.ts";
import {
  submitBuyerLeadFromModal,
} from "../src/services/leads/buyerLeadCaptureHandler.ts";
import {
  BUYER_LEAD_MODAL_CONSENT_CONTACT,
  BUYER_LEAD_MODAL_CONSENT_PRIMARY,
} from "../src/services/leads/buyerLeadConsentModalCopy.ts";
import { buildBuyerLeadCollectingPrompt } from "../src/services/leads/buyerLeadCaptureCopy.ts";
import {
  isBuyerLeadOpenModalAction,
  normalizeThaiPhone,
} from "../src/services/leads/buyerLeadValidation.ts";
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
    message: "ชื่อ มานี เงินสด งบประมาณ 320000 บาท สะดวกเย็น",
  });
  ok("capture from car has listing on complete", ctx.handled);
  const ctxAfter = getBuyerLeadCaptureContext(sid);
  ok("v5.6D.1 no auto modal when complete", !("openConsentModal" in ctx && ctx.openConsentModal));
  ok("stage ready_for_modal", ctxAfter?.stage === "ready_for_modal");
  ok("chat draft has no phone yet", !ctxAfter?.fields.contactPhone);
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
    message: "ชื่อ มานี เงินสด งบประมาณ 320000 บาท สะดวกเย็น",
  });
  ok("no car: still collecting missing listing", t2.handled && t2.stage === "collecting");
  ok("no car: no modal", !("openConsentModal" in t2 && t2.openConsentModal));
}

// --- modal preview ---
{
  const fields = {
    listingId: sampleCar.id,
    displayName: "มานี",
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
ok("modal consent contact", BUYER_LEAD_MODAL_CONSENT_CONTACT.includes("รายการนี้"));

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
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      budgetMax: 300000,
    },
  });
  updateBuyerLeadDraftPhone(sid, "082-222-3333");
  const updatedCtx = getBuyerLeadCaptureContext(sid);
  const input = draftToCreateInput(updatedCtx?.fields ?? {}, true);
  ok("modal phone normalized in draft", input?.contactPhone === "0822223333");
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
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
      budgetMax: 250000,
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

// --- v5.6D.1 state bug: member + multiline structured input ---
{
  const sid = "sess-multiline-member";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, sampleCar);
  ok("active session after CTA", isActiveBuyerLeadCaptureSession(sid));
  ok(
    "member flow still runs lead handler when active",
    shouldRunBuyerLeadCaptureTurn(sid, true)
  );
  ok(
    "member flow skips lead handler when idle",
    !shouldRunBuyerLeadCaptureTurn("sess-idle", true)
  );
  const multiline = [
    "ชื่อหรือชื่อเล่น ดล",
    "วิธีซื้อ: ไฟแนนซ์",
    "ราคาที่เสนอ: 480,000",
    "เวลาที่สะดวกให้ติดต่อ หลังห้าโมงเย็น",
  ].join("\n");
  const merged = mergeBuyerLeadFieldsFromMessage(
    getBuyerLeadCaptureContext(sid)!.fields,
    multiline
  );
  ok("parse nickname", merged.displayName === "ดล");
  ok("parse finance method", merged.purchaseMethod === "finance");
  ok("parse offer price", merged.offeredPrice === 480000);
  ok("parse contact window", merged.preferredContactWindow === "หลังห้าโมงเย็น");
  ok("multiline fields complete", listMissingBuyerLeadFields(merged).length === 0);
  processBuyerLeadCaptureTurn({ sessionId: sid, message: multiline });
  const handler = await handleBuyerLeadCaptureTurn({
    sessionId: sid,
    message: multiline,
    isSignedIn: true,
  });
  ok("handler returns summary not search", handler.handled && handler.isBuyerLeadReady === true);
  if (handler.handled) {
    ok(
      "summary copy prefix",
      handler.reply.includes("น้องเอสรุปข้อมูลที่จะส่งให้ผู้ขายก่อนนะครับ")
    );
    ok(
      "summary has review button phrase",
      handler.reply.includes("ตรวจสอบและส่งข้อมูลให้ผู้ขาย")
    );
  }
  ok(
    "ready summary builder",
    buildBuyerLeadReadySummaryReply(merged).includes("ดล")
  );
}

// --- v5.6D.1 UX ---
{
  const prompt = buildBuyerLeadCollectingPrompt(["ชื่อหรือชื่อเล่น"]);
  ok("collecting prompt does not ask phone in chat", !prompt.includes("• เบอร์โทร"));
  ok("collecting prompt mentions modal phone", prompt.includes("หน้าต่างสรุป"));
}
ok("open modal action phrase", isBuyerLeadOpenModalAction("ตรวจสอบและส่งข้อมูลให้ผู้ขาย"));
ok("normalize dashed thai phone", normalizeThaiPhone("081-234-5678") === "0812345678");
ok("invalid phone short", normalizeThaiPhone("08123") === null);
ok("valid 09x phone", normalizeThaiPhone("0912345678") === "0912345678");
ok("valid 06x phone", normalizeThaiPhone("0612345678") === "0612345678");
{
  const merged = mergeBuyerLeadFieldsFromMessage(
    {},
    "ชื่อ มานี เบอร์ 0891112233 เงินสด งบประมาณ 200000 บาท สะดวกเย็น"
  );
  ok("chat merge ignores phone", !merged.contactPhone);
}
{
  const sid = "sess-open-modal-action";
  clearBuyerLeadCaptureContext(sid);
  beginBuyerLeadCaptureWithListing(sid, sampleCar.id);
  setBuyerLeadCaptureContextForTest(sid, {
    stage: "ready_for_modal",
    fields: {
      listingId: sampleCar.id,
      displayName: "มานี",
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
      budgetMax: 320_000,
    },
  });
  const open = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ตรวจสอบและส่งข้อมูลให้ผู้ขาย",
  });
  ok("open modal only on explicit action", open.handled && open.openConsentModal === true);
}
{
  const sid = "sess-no-post-before-phone";
  clearBuyerLeadCaptureContext(sid);
  setBuyerLeadCaptureContextForTest(sid, {
    stage: "ready_for_modal",
    fields: {
      listingId: sampleCar.id,
      displayName: "มานี",
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
      budgetMax: 200000,
    },
  });
  ok("no API payload before modal phone", draftToCreateInput(getBuyerLeadCaptureContext(sid)!.fields, true) === null);
}

console.log("\nDone v5.6C.1 buyer lead target + consent modal tests.");
if (process.exitCode) process.exit(process.exitCode);
