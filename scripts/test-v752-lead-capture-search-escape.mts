/**
 * v7.5.2 — Lead Capture Search Escape Patch
 * npm run test:v752-lead-capture-search-escape
 *
 * Scenario (ลุงเด่น staging repro):
 *   1) normal search -> finds a car
 *   2) buyer presses "ให้ผู้ขายติดต่อกลับ" -> enters lead capture
 *   3) while collecting lead fields the buyer types a NEW search intent
 *      ("ช่วยหารถที่ราคาถูกกว่า 400,000 มานำเสนอเพิ่มให้ด้วยครับ")
 *
 * Hard guarantees verified:
 *   - the lead loop does NOT re-prompt lead fields (escape = redirect)
 *   - the session pauses (draft kept, never sent)
 *   - no createdLeadId, no consent, no phone is ever fabricated
 *   - no buyer-facing queue count leaks into the escape copy
 *   - returning to "ให้ผู้ขายติดต่อกลับ" re-enters the SAME lead flow
 *     (collect -> ready_for_modal preview -> phone + consent final confirm)
 */
import {
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  getBuyerLeadCaptureContext,
  isActiveBuyerLeadCaptureSession,
  isPausedBuyerLeadCaptureSession,
  pauseBuyerLeadCapture,
  processBuyerLeadCaptureTurn,
  shouldRunBuyerLeadCaptureTurn,
  startBuyerLeadCaptureFromCar,
  type BuyerLeadDraftFields,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import {
  detectBuyerLeadFlowEscapeIntent,
  resolveBuyerLeadFlowEscape,
} from "../src/services/leads/buyerLeadFlowEscape.ts";
import {
  buildBuyerLeadModalPreview,
  isReadyForBuyerLeadConsentModal,
} from "../src/services/leads/buyerLeadPreview.ts";
import { parseBuyerSearchBudgetMax } from "../src/services/ai/chat/buyerSearchIntentParser.ts";
import type { ChatCarCardData } from "../src/types.ts";
import type { BuyerLeadTargetCar } from "../src/utils/buyerLeadTarget.ts";

let passed = 0;
let failed = 0;
function ok(name: string, pass: boolean, detail = "") {
  if (pass) passed++;
  else failed++;
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

// queue-count guard reused from v7.3 — escape copy must never show a position
const QUEUE_NUMBER_RE = /ลำดับที่\s*\d|คิวผู้สนใจลำดับ|ลำดับ\s*\d|อยู่ในคิว|\bคิว.*\d/;

const car: ChatCarCardData = {
  id: "car-v752-yaris",
  brand: "Toyota",
  model: "Yaris",
  year: 2019,
  price: 480000,
  mileage: 55000,
  bodyClass: "hatchback",
  bodyClassLabel: "รถเก๋ง",
  hasImage: false,
  detailPath: "/cars/car-v752-yaris",
  matchKind: "exact",
};

const target: BuyerLeadTargetCar = {
  listingId: "car-v752-yaris",
  brand: "Toyota",
  model: "Yaris",
  year: 2019,
  price: 480000,
};

// ---------------------------------------------------------------------------
// 1) Required scenario: cheaper-search message escapes (no re-prompt)
// ---------------------------------------------------------------------------
const REQUIRED_MSG = "ช่วยหารถที่ราคาถูกกว่า 400,000 มานำเสนอเพิ่มให้ด้วยครับ";
ok(
  "required: cheaper search detected as redirect",
  detectBuyerLeadFlowEscapeIntent(REQUIRED_MSG) === "redirect",
  detectBuyerLeadFlowEscapeIntent(REQUIRED_MSG)
);
ok(
  "required: cheaper budget parsed for the re-search (<= 400,000)",
  parseBuyerSearchBudgetMax(REQUIRED_MSG) === 400_000,
  String(parseBuyerSearchBudgetMax(REQUIRED_MSG))
);

// ---------------------------------------------------------------------------
// 2) Supplementary cases must escape (redirect or hold), never NONE
// ---------------------------------------------------------------------------
const REDIRECT_CASES: Array<[string, string]> = [
  ["cheaper other car", "ขอดูคันอื่นที่ถูกกว่านี้"],
  ["under 3 san", "มีรถไม่เกิน 3 แสนไหม"],
  ["suv replace", "ขอ SUV ราคาไม่เกิน 5 แสนแทน"],
  ["auto gearbox", "เปลี่ยนเป็นรถเกียร์ออโต้"],
  ["other yaris variant", "หา Yaris รุ่นอื่นให้ดูหน่อย"],
  ["compare first", "ขอเปรียบเทียบกับคันอื่นก่อน"],
];
for (const [name, msg] of REDIRECT_CASES) {
  ok(
    `redirect: ${name}`,
    detectBuyerLeadFlowEscapeIntent(msg) === "redirect",
    detectBuyerLeadFlowEscapeIntent(msg)
  );
}

const HOLD_CASES: Array<[string, string]> = [
  ["not yet send, keep searching", "ยังไม่ส่งข้อมูล ขอหารถต่อก่อน"],
];
for (const [name, msg] of HOLD_CASES) {
  ok(
    `hold: ${name}`,
    detectBuyerLeadFlowEscapeIntent(msg) === "hold",
    detectBuyerLeadFlowEscapeIntent(msg)
  );
}

// ---------------------------------------------------------------------------
// 3) Genuine lead-field answers must NOT escape (no false escape regression)
// ---------------------------------------------------------------------------
const NONE_CASES: Array<[string, string]> = [
  ["full lead answer", "ชื่อ ดล จัดไฟแนนซ์ เสนอราคา 4 แสน ติดต่อได้ตลอดเวลา"],
  ["bare budget answer", "งบ 5 แสน"],
  ["just a name", "ชื่อเล่นโอ๊ต"],
  ["consent confirm", "ยืนยัน"],
];
for (const [name, msg] of NONE_CASES) {
  ok(
    `none: ${name}`,
    detectBuyerLeadFlowEscapeIntent(msg) === "none",
    detectBuyerLeadFlowEscapeIntent(msg)
  );
}

// ---------------------------------------------------------------------------
// 4) End-to-end: enter lead capture -> cheaper-search escape -> pause, no send
// ---------------------------------------------------------------------------
{
  const sid = "v752-e2e";
  clearBuyerLeadCaptureContext(sid);

  // step 2 — buyer pressed "ให้ผู้ขายติดต่อกลับ" on the Yaris card
  startBuyerLeadCaptureFromCar(sid, car);
  ok("entered lead capture", isActiveBuyerLeadCaptureSession(sid));

  // partial lead fields collected before the buyer changes their mind
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อเล่นเด่น จัดไฟแนนซ์ ติดต่อช่วงเย็น",
  });
  const draftBefore = getBuyerLeadCaptureContext(sid);
  ok("draft has partial fields", Boolean(draftBefore?.fields.displayName));
  ok("no phone fabricated while collecting", !draftBefore?.fields.contactPhone);
  ok("no lead id while collecting", !draftBefore?.createdLeadId);

  // step 3 — the cheaper-search message
  const escape = resolveBuyerLeadFlowEscape(sid, REQUIRED_MSG);
  ok("escape kind is redirect", escape.kind === "redirect");
  if (escape.kind === "redirect") {
    ok("ack acknowledges continuing search", escape.ack.includes("เงื่อนไขใหม่"));
    ok("ack says previous car paused", escape.ack.includes("พักคันก่อนหน้า"));
    ok("ack says not sent to seller", escape.ack.includes("ยังไม่ส่ง"));
    ok("ack has no buyer-facing queue count", !QUEUE_NUMBER_RE.test(escape.ack), escape.ack);
  }

  // caller pauses (as useChat does on redirect)
  pauseBuyerLeadCapture(sid);
  const draftAfter = getBuyerLeadCaptureContext(sid);
  ok("session paused after escape", isPausedBuyerLeadCaptureSession(sid));
  ok("no longer active capture", !isActiveBuyerLeadCaptureSession(sid));
  ok(
    "lead turn no longer forced (search can take over)",
    shouldRunBuyerLeadCaptureTurn(sid, true) === false
  );

  // hard guarantees: nothing sent / fabricated
  ok("no createdLeadId (lead never sent)", !draftAfter?.createdLeadId);
  ok("no consent created from search intent", !("consentConfirmed" in (draftAfter?.fields ?? {})));
  ok("no phone fabricated/filled", !draftAfter?.fields.contactPhone);
  ok("draft fields preserved (not lost)", draftAfter?.fields.displayName === draftBefore?.fields.displayName);

  // re-prompt guard: a paused session is inert — it must NOT keep collecting
  const inert = processBuyerLeadCaptureTurn({ sessionId: sid, message: REQUIRED_MSG });
  ok("paused turn does not re-prompt lead", inert.handled === false);

  // paused draft is not sendable (no phone, no consent)
  ok(
    "paused draft cannot be submitted",
    draftToCreateInput(draftAfter?.fields ?? {}, false) === null
  );
}

// ---------------------------------------------------------------------------
// 5) Returning to "ให้ผู้ขายติดต่อกลับ" re-enters lead flow (preview + confirm)
// ---------------------------------------------------------------------------
{
  const sid = "v752-return";
  clearBuyerLeadCaptureContext(sid);

  // buyer presses the contact button again -> fresh capture
  startBuyerLeadCaptureFromCar(sid, car);
  ok("re-entered lead capture", isActiveBuyerLeadCaptureSession(sid));

  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อเล่นเด่น จัดไฟแนนซ์ งบ 4 แสน ติดต่อช่วงเย็น",
  });
  const ctx = getBuyerLeadCaptureContext(sid);
  ok("reached ready_for_modal (preview stage)", ctx?.stage === "ready_for_modal");

  const completeFields: BuyerLeadDraftFields = {
    ...ctx!.fields,
    listingId: target.listingId,
    contactPhone: "0812345678",
  };
  ok("ready for consent modal (preview exists)", isReadyForBuyerLeadConsentModal(completeFields));
  ok("modal preview can be built", buildBuyerLeadModalPreview(completeFields, target) != null);

  // final confirmation still requires phone + consent
  ok("no send without consent", draftToCreateInput(completeFields, false).consentConfirmed === false);
  ok("sendable only with valid phone + consent", draftToCreateInput(completeFields, true) != null);
}

console.log(`\nDone v7.5.2 lead capture search escape. PASS ${passed} / ${passed + failed}`);
if (process.exitCode) process.exit(process.exitCode);
