/**
 * v7.3 — Natural Lead Preview + No Queue Count Display
 * npm run test:v73-natural-lead-preview-no-queue-count
 *
 * Verifies:
 *  - v7.2 conversational memory enriches the lead PREVIEW (display-only)
 *  - remembered interest NEVER enters the submitted lead payload
 *  - memory is NOT consent; consent stays an explicit, separate flag
 *  - phone is never guessed/pre-filled — preview carries no phone field
 *  - preview is required before send (cannot build preview from incomplete draft)
 *  - final confirmation path still requires phone + consent
 *  - NO buyer-facing queue count in success / joined-queue messages
 *  - backend queue position remains a separate value (revenue logic intact)
 */
import {
  buildLeadPreviewContextFromMemory,
  clearConversationalLeadMemory,
  conversationalLeadMemoryHasNoContactOrConsent,
  getConversationalLeadMemory,
  resetConversationalLeadMemoryForTests,
  updateConversationalLeadMemory,
} from "../src/services/leads/conversationalLeadMemory.ts";
import {
  buildBuyerLeadModalPreview,
  isReadyForBuyerLeadConsentModal,
} from "../src/services/leads/buyerLeadPreview.ts";
import {
  draftToCreateInput,
  type BuyerLeadDraftFields,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import { buildBuyerLeadSuccessReply } from "../src/services/leads/buyerLeadCaptureCopy.ts";
import { buildBuyerJoinedQueueMessage } from "../src/services/leads/buyerLeadQueuePolicy.ts";
import type { BuyerLeadTargetCar } from "../src/utils/buyerLeadTarget.ts";

let passed = 0;
let failed = 0;
function ok(name: string, pass: boolean, detail = "") {
  if (pass) passed++;
  else failed++;
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

resetConversationalLeadMemoryForTests();

const QUEUE_NUMBER_RE = /ลำดับที่\s*\d|คิวผู้สนใจลำดับ|ลำดับ\s*\d|อยู่ในคิว|\bคิว.*\d/;

const completeFields: BuyerLeadDraftFields = {
  listingId: "car-v73-1",
  displayName: "พี่ก้อง",
  contactPhone: "0812345678",
  purchaseMethod: "finance",
  budgetMax: 300000,
  preferredContactWindow: "ช่วงเย็น",
};

const target: BuyerLeadTargetCar = {
  listingId: "car-v73-1",
  brand: "Toyota",
  model: "Yaris",
  year: 2019,
  price: 350000,
};

// ---------------------------------------------------------------------------
// 1) Natural preview context built from v7.2 memory (display-only)
// ---------------------------------------------------------------------------
{
  const sid = "v73-natural";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(
    sid,
    "อยากได้ Yaris งบไม่เกิน 3 แสน แถวลำลูกกา ไม่เอาติดแก๊ส"
  );
  const ctx = buildLeadPreviewContextFromMemory(getConversationalLeadMemory(sid));
  ok("memory context built", ctx != null);
  ok(
    "context mentions remembered model",
    ctx?.highlights.some((h) => h.includes("Yaris")) === true,
    JSON.stringify(ctx?.highlights)
  );
  ok("context mentions area", ctx?.highlights.some((h) => h.includes("ลำลูกกา")) === true);
  ok("context mentions no-gas", ctx?.highlights.some((h) => h.includes("แก๊ส")) === true);

  const preview = buildBuyerLeadModalPreview(completeFields, target, ctx);
  ok("preview built with memory highlights", (preview?.memoryHighlights?.length ?? 0) > 0);
}

// ---------------------------------------------------------------------------
// 2) Memory NEVER enters the submitted payload
// ---------------------------------------------------------------------------
{
  const sid = "v73-payload";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(sid, "Yaris แถวลำลูกกา ไม่เอาติดแก๊ส");
  const input = draftToCreateInput(completeFields, true);
  ok("payload built", input != null);
  const blob = JSON.stringify(input);
  ok("payload has no remembered model", !blob.includes("Yaris"), blob);
  ok("payload has no remembered area", !blob.includes("ลำลูกกา"));
  ok("payload has no no-gas condition text", !blob.includes("แก๊ส"));
  ok("payload carries explicit consent flag only", input?.consentConfirmed === true);
}

// ---------------------------------------------------------------------------
// 3) Memory is NOT consent (preview can show memory without any consent)
// ---------------------------------------------------------------------------
{
  const sid = "v73-not-consent";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(sid, "Yaris งบ 3 แสน");
  const ctx = buildLeadPreviewContextFromMemory(getConversationalLeadMemory(sid));
  const preview = buildBuyerLeadModalPreview(completeFields, target, ctx);
  ok("preview object has no consent field", preview != null && !("consent" in preview) && !("consentConfirmed" in preview));
  // explicit consent is still required to build a sendable input
  const noConsent = draftToCreateInput(completeFields, false);
  ok("input requires explicit consent value", noConsent?.consentConfirmed === false);
  ok("memory still passes no-contact/consent guard", conversationalLeadMemoryHasNoContactOrConsent(getConversationalLeadMemory(sid)));
}

// ---------------------------------------------------------------------------
// 4) Phone never guessed / pre-filled — preview carries no phone field
// ---------------------------------------------------------------------------
{
  const sid = "v73-phone";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(sid, "Yaris แถวรังสิต");
  const ctx = buildLeadPreviewContextFromMemory(getConversationalLeadMemory(sid));
  const preview = buildBuyerLeadModalPreview(completeFields, target, ctx);
  const blob = JSON.stringify(preview);
  ok("preview has no contactPhone field", preview != null && !("contactPhone" in preview));
  ok("preview does not leak the draft phone", !blob.includes("0812345678"), blob);
  ok("memory context has no phone", JSON.stringify(ctx).indexOf("08") === -1 || !/0\d{9}/.test(JSON.stringify(ctx)));
}

// ---------------------------------------------------------------------------
// 5) Preview required before send — cannot build from incomplete draft
// ---------------------------------------------------------------------------
{
  const incomplete: BuyerLeadDraftFields = { listingId: "car-v73-1", displayName: "พี่ก้อง" };
  ok("incomplete draft not ready for modal", isReadyForBuyerLeadConsentModal(incomplete) === false);
  ok("no preview from incomplete draft", buildBuyerLeadModalPreview(incomplete, target) === null);
  ok("complete draft is ready for modal", isReadyForBuyerLeadConsentModal(completeFields) === true);
  ok("preview built from complete draft", buildBuyerLeadModalPreview(completeFields, target) != null);
}

// ---------------------------------------------------------------------------
// 6) Final confirmation still requires phone + consent (no auto-send shape)
// ---------------------------------------------------------------------------
{
  const noPhone: BuyerLeadDraftFields = { ...completeFields, contactPhone: undefined };
  ok("no sendable input without phone", draftToCreateInput(noPhone, true) === null);
  const badPhone: BuyerLeadDraftFields = { ...completeFields, contactPhone: "123" };
  ok("no sendable input with invalid phone", draftToCreateInput(badPhone, true) === null);
  ok("sendable input only with valid phone + consent", draftToCreateInput(completeFields, true) != null);
}

// ---------------------------------------------------------------------------
// 7) NO buyer-facing queue count (success + joined-queue messages)
// ---------------------------------------------------------------------------
{
  const success = buildBuyerLeadSuccessReply(2);
  ok("success reply confirms submission", success.includes("ส่งข้อมูลให้ผู้ขายแล้ว"));
  ok("success reply has no queue number", !QUEUE_NUMBER_RE.test(success), success);

  const joined = buildBuyerJoinedQueueMessage(5);
  ok("joined-queue message confirms submission", joined.includes("ส่งข้อมูลให้ผู้ขายแล้ว"));
  ok("joined-queue message has no queue number", !QUEUE_NUMBER_RE.test(joined), joined);
  // even with a large position the number must not appear
  ok("joined-queue does not leak the position digit", !buildBuyerJoinedQueueMessage(7).includes("7"));
}

console.log(`\nDone v7.3 natural lead preview + no queue count. PASS ${passed} / ${passed + failed}`);
if (process.exitCode) process.exit(process.exitCode);
