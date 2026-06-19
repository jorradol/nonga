/**
 * v7.2 — Conversational Lead Interest Memory
 * npm run test:v72-conversational-lead-memory
 *
 * Verifies น้องเอ can remember buyer interest from the conversation (model,
 * budget, area, unwanted conditions, purchase preference, intent), updates to
 * the latest intent, and stays fully within PDPA/lead safety:
 *   - memory is never consent
 *   - phone is never guessed/filled/stored
 *   - personal contact data stays separate from interest memory
 *   - no queue count, no full plate, no phone anywhere in memory
 *   - paused v7.1 lead is never sent
 *   - v7.1 escape behavior does not regress
 */
import {
  clearConversationalLeadMemory,
  conversationalLeadMemoryHasNoContactOrConsent,
  getConversationalLeadMemory,
  parseConversationalLeadInterest,
  resetConversationalLeadMemoryForTests,
  updateConversationalLeadMemory,
} from "../src/services/leads/conversationalLeadMemory.ts";
import {
  clearBuyerLeadCaptureContext,
  getBuyerLeadCaptureContext,
  isPausedBuyerLeadCaptureSession,
  pauseBuyerLeadCapture,
  processBuyerLeadCaptureTurn,
  startBuyerLeadCaptureFromCar,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import { resolveBuyerLeadFlowEscape } from "../src/services/leads/buyerLeadFlowEscape.ts";
import type { ChatCarCardData } from "../src/types.ts";

let passed = 0;
let failed = 0;
function ok(name: string, pass: boolean, detail = "") {
  if (pass) passed++;
  else failed++;
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

resetConversationalLeadMemoryForTests();

// ---------------------------------------------------------------------------
// 1) Remembers conditions from the conversation (Scenario 1)
// ---------------------------------------------------------------------------
{
  const sid = "v72-remember";
  clearConversationalLeadMemory(sid);
  const mem = updateConversationalLeadMemory(
    sid,
    "อยากได้ Yaris งบไม่เกิน 3 แสน แถวลำลูกกา ไม่เอาติดแก๊ส"
  );
  ok("remembers model Yaris", mem?.models?.includes("Yaris") === true, JSON.stringify(mem?.models));
  ok("remembers budget 300000", mem?.budgetMax === 300000, String(mem?.budgetMax));
  ok("remembers area ลำลูกกา", mem?.areas?.includes("ลำลูกกา") === true, JSON.stringify(mem?.areas));
  ok("remembers excludeGas", mem?.excludeGas === true);
  ok(
    "records unwanted condition no-gas",
    mem?.unwantedConditions?.some((c) => c.includes("แก๊ส")) === true,
    JSON.stringify(mem?.unwantedConditions)
  );

  // follow-up "มีคันไหนเหมาะสุด" must not erase remembered criteria
  const after = updateConversationalLeadMemory(sid, "มีคันไหนเหมาะสุด");
  ok("budget retained after follow-up", after?.budgetMax === 300000);
  ok("model retained after follow-up", after?.models?.includes("Yaris") === true);
  ok("area retained after follow-up", after?.areas?.includes("ลำลูกกา") === true);
}

// ---------------------------------------------------------------------------
// 2) Updates to the latest intent (Scenario 2): Yaris→City, ลำลูกกา→รังสิต
// ---------------------------------------------------------------------------
{
  const sid = "v72-change";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(sid, "Yaris งบ 3 แสน แถวลำลูกกา");
  const changed = updateConversationalLeadMemory(
    sid,
    "ถ้าเป็น City ได้ไหม แต่ยังขอแถวรังสิต"
  );
  ok("model updated to City", changed?.models?.includes("City") === true, JSON.stringify(changed?.models));
  ok("model no longer Yaris (not sticky)", changed?.models?.includes("Yaris") === false);
  ok("area updated to รังสิต", changed?.areas?.includes("รังสิต") === true);
  ok("area no longer ลำลูกกา", changed?.areas?.includes("ลำลูกกา") === false);
  ok("budget preserved when not re-stated", changed?.budgetMax === 300000, String(changed?.budgetMax));
}

// ---------------------------------------------------------------------------
// 3) Paused v7.1 lead is never sent; new criteria captured as memory (Scenario 3)
// ---------------------------------------------------------------------------
{
  const sid = "v72-paused";
  clearBuyerLeadCaptureContext(sid);
  clearConversationalLeadMemory(sid);
  const car: ChatCarCardData = {
    id: "car-v72-1",
    brand: "Toyota",
    model: "Vios",
    year: 2019,
    price: 380000,
    mileage: 60000,
    bodyClass: "sedan",
    bodyClassLabel: "รถเก๋ง",
    hasImage: false,
    detailPath: "/cars/car-v72-1",
    matchKind: "exact",
  };
  startBuyerLeadCaptureFromCar(sid, car);
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อ เอก จัดไฟแนนซ์ งบ 4 แสน ติดต่อช่วงเย็น",
  });

  // user changes their mind → v7.1 redirect → caller pauses
  const escape = resolveBuyerLeadFlowEscape(sid, "ขอดูรถประหยัดน้ำมันกว่านี้");
  ok("v7.1 still redirects (no regression)", escape.kind === "redirect", escape.kind);
  pauseBuyerLeadCapture(sid);
  ok("lead paused", isPausedBuyerLeadCaptureSession(sid));

  // v7.2 captures the new intent into memory
  const mem = updateConversationalLeadMemory(sid, "ขอดูรถประหยัดน้ำมันกว่านี้");
  ok(
    "captures fuel-efficient interest",
    mem?.usageTags?.includes("fuelEfficient") === true,
    JSON.stringify(mem?.usageTags)
  );

  const leadCtx = getBuyerLeadCaptureContext(sid);
  ok("paused lead never sent (no lead id)", !leadCtx?.createdLeadId);
  ok(
    "paused lead draft preserved",
    Boolean(leadCtx?.fields.displayName?.trim()) && leadCtx?.fields.purchaseMethod === "finance"
  );
}

// ---------------------------------------------------------------------------
// 4) Memory is NOT consent
// ---------------------------------------------------------------------------
{
  const sid = "v72-not-consent";
  clearConversationalLeadMemory(sid);
  const mem = updateConversationalLeadMemory(sid, "สนใจ Yaris ผ่อนได้ไหม") ?? {};
  ok("no consent field on memory", !("consent" in mem) && !("consentConfirmed" in mem));
  ok(
    "purchase preference is interest only, not consent",
    (mem as { purchasePreference?: string }).purchasePreference === "finance"
  );
}

// ---------------------------------------------------------------------------
// 5) Phone is never guessed / filled / stored
// ---------------------------------------------------------------------------
{
  const sid = "v72-no-phone";
  clearConversationalLeadMemory(sid);
  const mem =
    updateConversationalLeadMemory(
      sid,
      "Yaris งบ 3 แสน โทรหาผมเบอร์ 0812345678 แถวรังสิต"
    ) ?? {};
  ok("no contactPhone stored", !("contactPhone" in mem));
  const blob = JSON.stringify(mem);
  ok("phone digits not stored anywhere in memory", !blob.includes("0812345678"), blob);
}

// ---------------------------------------------------------------------------
// 6) Interest memory separate from personal contact data (PDPA guard)
// ---------------------------------------------------------------------------
{
  const sid = "v72-separation";
  clearConversationalLeadMemory(sid);
  const mem = updateConversationalLeadMemory(sid, "Yaris แถวคูคต ไม่เอาติดแก๊ส");
  ok("memory passes no-contact/consent guard", conversationalLeadMemoryHasNoContactOrConsent(mem));
  ok(
    "guard rejects leaked phone",
    conversationalLeadMemoryHasNoContactOrConsent({ ...mem!, contactPhone: "0812345678" } as never) === false
  );
  ok(
    "guard rejects leaked consent",
    conversationalLeadMemoryHasNoContactOrConsent({ ...mem!, consent: true } as never) === false
  );
}

// ---------------------------------------------------------------------------
// 7) No queue count anywhere in memory
// ---------------------------------------------------------------------------
{
  const sid = "v72-no-queue";
  clearConversationalLeadMemory(sid);
  const mem = updateConversationalLeadMemory(sid, "City แถวดอนเมือง งบ 5 แสน") ?? {};
  const keys = Object.keys(mem);
  ok(
    "no queue/count keys",
    !keys.some((k) => /queue|count|คิว/i.test(k)),
    keys.join(",")
  );
  ok("guard rejects queueCount", conversationalLeadMemoryHasNoContactOrConsent({ ...mem, queueCount: 3 } as never) === false);
}

// ---------------------------------------------------------------------------
// 8) No full plate / phone exposed in memory
// ---------------------------------------------------------------------------
{
  const sid = "v72-no-plate";
  clearConversationalLeadMemory(sid);
  const mem = updateConversationalLeadMemory(sid, "Civic ทะเบียน กข 1234 แถวสายไหม") ?? {};
  ok("no plate field", !("plate" in mem) && !("licensePlate" in mem));
  const blob = JSON.stringify(mem);
  ok("plate string not stored", !blob.includes("1234"), blob);
}

// ---------------------------------------------------------------------------
// 9) v7.1 escape behavior does not regress (representative cases)
// ---------------------------------------------------------------------------
{
  const sid = "v72-v71-regress";
  clearBuyerLeadCaptureContext(sid);
  const car: ChatCarCardData = {
    id: "car-v72-2",
    brand: "Toyota",
    model: "Vios",
    year: 2019,
    price: 380000,
    mileage: 60000,
    bodyClass: "sedan",
    bodyClassLabel: "รถเก๋ง",
    hasImage: false,
    detailPath: "/cars/car-v72-2",
    matchKind: "exact",
  };
  startBuyerLeadCaptureFromCar(sid, car);
  ok(
    "redirect intent still pauses",
    resolveBuyerLeadFlowEscape(sid, "ขอดู Yaris งบไม่เกิน 3 แสนแถวลำลูกกาแทน").kind === "redirect"
  );
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  ok(
    "hold intent still holds",
    resolveBuyerLeadFlowEscape(sid, "เดี๋ยวก่อน ยังไม่ให้เบอร์").kind === "hold"
  );
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  ok(
    "genuine lead answer keeps capture",
    resolveBuyerLeadFlowEscape(sid, "ชื่อ ดล จัดไฟแนนซ์ เสนอราคา 4 แสน ติดต่อได้ตลอดเวลา").kind === "none"
  );
}

// ---------------------------------------------------------------------------
// 10) Parser purity — empty / non-interest messages add nothing
// ---------------------------------------------------------------------------
{
  ok("empty message → no fields", Object.keys(parseConversationalLeadInterest("")).length === 0);
  ok(
    "greeting → no fields",
    Object.keys(parseConversationalLeadInterest("สวัสดีครับ")).length === 0
  );
  const sid = "v72-noop";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(sid, "Yaris แถวรังสิต");
  const before = JSON.stringify(getConversationalLeadMemory(sid)?.models);
  updateConversationalLeadMemory(sid, "ขอบคุณครับ");
  const after = JSON.stringify(getConversationalLeadMemory(sid)?.models);
  ok("non-interest message preserves memory", before === after);
}

console.log(`\nDone v7.2 conversational lead memory tests. PASS ${passed} / ${passed + failed}`);
if (process.exitCode) process.exit(process.exitCode);
