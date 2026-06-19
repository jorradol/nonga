/**
 * v7.1 — Lead Flow Escape + Intent Re-check
 * npm run test:v71-lead-flow-escape-intent-recheck
 *
 * Verifies that an active in-chat buyer lead capture pauses (never sends) when
 * the latest message expresses a new intent, and keeps collecting normally when
 * the message is a genuine lead-field answer / control action.
 */
import {
  clearBuyerLeadCaptureContext,
  getBuyerLeadCaptureContext,
  isActiveBuyerLeadCaptureSession,
  isPausedBuyerLeadCaptureSession,
  pauseBuyerLeadCapture,
  processBuyerLeadCaptureTurn,
  shouldRunBuyerLeadCaptureTurn,
  startBuyerLeadCaptureFromCar,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import {
  detectBuyerLeadFlowEscapeIntent,
  resolveBuyerLeadFlowEscape,
} from "../src/services/leads/buyerLeadFlowEscape.ts";
import type { ChatCarCardData } from "../src/types.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const car: ChatCarCardData = {
  id: "car-v71-escape-1",
  brand: "Toyota",
  model: "Vios",
  year: 2019,
  price: 380000,
  mileage: 60000,
  bodyClass: "sedan",
  bodyClassLabel: "รถเก๋ง",
  hasImage: false,
  detailPath: "/cars/car-v71-escape-1",
  matchKind: "exact",
};

// ---------------------------------------------------------------------------
// 1) Pure intent re-check — required + supplementary scenarios must REDIRECT
// ---------------------------------------------------------------------------
const REDIRECT_CASES: Array<[string, string]> = [
  ["yaris budget area", "ขอดู Yaris งบไม่เกิน 3 แสนแถวลำลูกกาแทน"],
  ["compare before send", "ยังไม่ส่ง ขอเปรียบเทียบอีกคันก่อน"],
  ["reject + no gas", "ไม่เอาคันนี้แล้ว มีรถไม่ติดแก๊สไหม"],
  ["area replace", "ขอแถวรังสิตหรือคูคตแทน"],
  ["finance question", "ผ่อนได้ไหม"],
  ["fuel economy", "ขอดูรถประหยัดน้ำมันกว่านี้"],
  ["budget change", "เปลี่ยนเป็นงบ 5 แสน"],
];
for (const [name, msg] of REDIRECT_CASES) {
  ok(
    `redirect: ${name}`,
    detectBuyerLeadFlowEscapeIntent(msg) === "redirect",
    detectBuyerLeadFlowEscapeIntent(msg)
  );
}

// ---------------------------------------------------------------------------
// 2) Pure intent re-check — hesitation must HOLD (pause, no forced phone)
// ---------------------------------------------------------------------------
const HOLD_CASES: Array<[string, string]> = [
  ["wait no phone", "เดี๋ยวก่อน ยังไม่ให้เบอร์"],
  ["not yet send", "ยังไม่ส่ง ขอดูก่อน"],
];
for (const [name, msg] of HOLD_CASES) {
  ok(
    `hold: ${name}`,
    detectBuyerLeadFlowEscapeIntent(msg) === "hold",
    detectBuyerLeadFlowEscapeIntent(msg)
  );
}

// ---------------------------------------------------------------------------
// 3) Pure intent re-check — genuine lead answers / actions must be NONE
// ---------------------------------------------------------------------------
const NONE_CASES: Array<[string, string]> = [
  ["lead field provision", "ชื่อ ดล จัดไฟแนนซ์ เสนอราคา 4 แสน ติดต่อได้ตลอดเวลา"],
  ["bare budget answer", "งบ 5 แสน"],
  ["use saved profile", "ใช้ข้อมูลนี้ต่อ"],
  ["open modal action", "ตรวจสอบและส่งข้อมูลให้ผู้ขาย"],
  ["consent confirm", "ยืนยัน"],
  ["cancel", "ยกเลิก"],
  ["just a name", "ชื่อเล่นโอ๊ต"],
];
for (const [name, msg] of NONE_CASES) {
  ok(
    `none: ${name}`,
    detectBuyerLeadFlowEscapeIntent(msg) === "none",
    detectBuyerLeadFlowEscapeIntent(msg)
  );
}

// ---------------------------------------------------------------------------
// 4) resolve only fires when a capture session is active
// ---------------------------------------------------------------------------
{
  const sid = "v71-inactive";
  clearBuyerLeadCaptureContext(sid);
  ok(
    "inactive session never escapes",
    resolveBuyerLeadFlowEscape(sid, "ขอดู Yaris งบ 3 แสนแทน").kind === "none"
  );
}

// ---------------------------------------------------------------------------
// 5) Active capture → redirect pauses (draft kept, never sent)
// ---------------------------------------------------------------------------
{
  const sid = "v71-redirect";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  // simulate collected fields before the user changes their mind
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อ เอก จัดไฟแนนซ์ งบ 4 แสน ติดต่อช่วงเย็น",
  });
  ok("active before escape", isActiveBuyerLeadCaptureSession(sid));

  const escape = resolveBuyerLeadFlowEscape(
    sid,
    "ขอดู Yaris งบไม่เกิน 3 แสนแถวลำลูกกาแทน"
  );
  ok("redirect kind", escape.kind === "redirect");
  if (escape.kind === "redirect") {
    ok("redirect ack mentions pause", escape.ack.includes("พักคันก่อนหน้า"));
    ok("redirect ack says not sent", escape.ack.includes("ยังไม่ส่ง"));
  }

  // caller pauses
  const before = getBuyerLeadCaptureContext(sid);
  pauseBuyerLeadCapture(sid);
  const after = getBuyerLeadCaptureContext(sid);

  ok("paused after escape", isPausedBuyerLeadCaptureSession(sid));
  ok("no longer active", !isActiveBuyerLeadCaptureSession(sid));
  ok(
    "member flow no longer forced into lead turn",
    shouldRunBuyerLeadCaptureTurn(sid, true) === false
  );
  ok("draft fields preserved", after?.fields.displayName === before?.fields.displayName);
  ok("listing kept (still a draft)", Boolean(after?.fields.listingId));
  ok("no lead id created (never sent)", !after?.createdLeadId);

  // a paused session must stay inert and not re-collect on the next message
  const inert = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "งบ 9 แสน",
  });
  ok("paused turn is inert", inert.handled === false);
}

// ---------------------------------------------------------------------------
// 6) Active capture → hold pauses + holds reply (no forced phone)
// ---------------------------------------------------------------------------
{
  const sid = "v71-hold";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  const escape = resolveBuyerLeadFlowEscape(sid, "เดี๋ยวก่อน ยังไม่ให้เบอร์");
  ok("hold kind", escape.kind === "hold");
  if (escape.kind === "hold") {
    ok("hold reply does not ask for phone now", !escape.reply.includes("กรอกเบอร์"));
    ok("hold reply says not sent", escape.reply.includes("ยังไม่ส่ง"));
  }
  pauseBuyerLeadCapture(sid);
  ok("paused after hold", isPausedBuyerLeadCaptureSession(sid));
}

// ---------------------------------------------------------------------------
// 7) Active capture → genuine lead answer keeps the flow (no escape)
// ---------------------------------------------------------------------------
{
  const sid = "v71-keep";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  ok(
    "lead answer keeps capture",
    resolveBuyerLeadFlowEscape(
      sid,
      "ชื่อ ดล จัดไฟแนนซ์ เสนอราคา 4 แสน ติดต่อได้ตลอดเวลา"
    ).kind === "none"
  );
  ok("still active (not paused)", isActiveBuyerLeadCaptureSession(sid));
}

console.log("\nDone v7.1 lead flow escape + intent re-check tests.");
if (process.exitCode) process.exit(process.exitCode);
