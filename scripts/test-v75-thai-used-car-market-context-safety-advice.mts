/**
 * v7.5 — Thai Used-car Market Context + Safety Advice Layer
 * npm run test:v75-thai-used-car-market-context-safety-advice
 *
 * Verifies:
 *  - 4 new advisor topics (cityVsUpcountry / hiddenCosts / monthlyBudget / paymentSafety)
 *    answer correctly, carry general advice + disclaimers, no invented car facts
 *  - safety nudge is TRIGGER-ONLY and a SINGLE line (null without a payment trigger)
 *  - market-context note is a light, conditional weave (only with budget/finance signal)
 *  - no over-claim / no guarantee of condition / finance / market price
 *  - new topics do NOT hijack vehicle search and do NOT clash with finance calc
 *  - search reply stays deterministic (skipGemini), no lead auto-send, no queue count
 *  - lead flow v7.1–v7.4 untouched (no consent/contactPhone in reply)
 */
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  detectBuyerAdvisorTopic,
  buildBuyerAdvisorReply,
} from "../src/services/ai/chat/chatBuyerAdvisorTemplates.ts";
import {
  buildMarketContextNote,
  buildUsedCarSafetyNudge,
  hasUsedCarSafetyTrigger,
  assertUsedCarAdviceSafe,
  USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN,
} from "../src/services/ai/chat/chatUsedCarSafetyAdvice.ts";
import { parseBuyerSearchIntent } from "../src/services/ai/chat/buyerSearchIntentParser.ts";
import { isFinanceCalculatorIntent } from "../src/services/ai/chat/chatBuyerFinanceCalculator.ts";
import { BUYER_PITCH_FORBIDDEN_CLAIM } from "../src/services/ai/chat/buyerCarPitchCopy.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";

let passed = 0;
let failed = 0;
function ok(name: string, pass: boolean, detail = "") {
  if (pass) passed++;
  else failed++;
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const INVENTED_FACT_RE =
  /\d[\d,]*\s*กม\.?|km\/l|กม\.\/ลิตร|กิโลเมตรต่อลิตร|ไม่เคยชน|ไม่เคยน้ำท่วม|ประวัติซ่อม.*จริง|เคยเคลม/i;
const QUEUE_NUMBER_RE = /ลำดับที่\s*\d|คิวผู้สนใจลำดับ|ลำดับ\s*\d|อยู่ในคิว|\bคิว.*\d/;
const PHONE_RE = /0\d{8,9}/;

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "car-vios",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2018,
    price: 279_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-city",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 325_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-yaris",
    title: "Toyota Yaris",
    brand: "Toyota",
    model: "Yaris",
    year: 2019,
    price: 295_000,
    bodyType: "hatchback",
    listingStatus: "published",
  },
];

// ---------------------------------------------------------------------------
// 1) New advisor topics: detect + reply grounded + disclaimers + no invented facts
// ---------------------------------------------------------------------------
{
  const cases: Array<{ q: string; topic: string; expect: RegExp }> = [
    { q: "ค่าใช้จ่ายแฝงตอนออกรถมีอะไรบ้าง", topic: "hiddenCosts", expect: /พรบ|ประกัน|ภาษี|โอน/ },
    { q: "ใช้ในเมืองกับต่างจังหวัดเลือกรถยังไงดี", topic: "cityVsUpcountry", expect: /ในเมือง|ต่างจังหวัด/ },
    { q: "ควรผ่อนเดือนละเท่าไหร่ถึงไม่หนัก", topic: "monthlyBudget", expect: /ค่างวด|รายได้|ดาวน์/ },
    { q: "โอนเงินก่อนดูรถได้ไหม", topic: "paymentSafety", expect: /เห็นรถจริง|เอกสาร|มัดจำ|โอน/ },
  ];
  for (const { q, topic, expect } of cases) {
    const detected = detectBuyerAdvisorTopic(q);
    ok(`detect-${topic}`, detected === topic, String(detected));
    const reply = buildBuyerAdvisorReply(detected!);
    ok(`reply-${topic}-on-point`, expect.test(reply), reply.slice(0, 60));
    ok(`reply-${topic}-no-pitch-forbidden`, !BUYER_PITCH_FORBIDDEN_CLAIM.test(reply));
    ok(`reply-${topic}-no-overclaim`, !USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN.test(reply));
    ok(`reply-${topic}-no-invented-facts`, !INVENTED_FACT_RE.test(reply), reply.slice(0, 80));
    // not too long / stiff: keep advisor replies compact (<= 8 lines)
    ok(`reply-${topic}-concise`, reply.split("\n").length <= 8, String(reply.split("\n").length));
  }
}

// ---------------------------------------------------------------------------
// 2) Safety nudge — trigger-only + single line
// ---------------------------------------------------------------------------
{
  ok("trigger detected for transfer", hasUsedCarSafetyTrigger("เจ้าของให้โอนมัดจำก่อนดูรถ"));
  ok("no trigger for plain search", !hasUsedCarSafetyTrigger("อยากได้ Yaris งบไม่เกิน 3 แสน"));

  const nudge = buildUsedCarSafetyNudge("เขาให้โอนเงินมัดจำก่อนได้ไหม");
  ok("nudge built on trigger", nudge != null);
  ok("nudge is single line", (nudge ?? "").split("\n").length === 1, nudge ?? "");
  ok("nudge mentions see-car-first", /เห็นรถจริง|ดูรถจริง|ตรวจ/.test(nudge ?? ""));
  ok("nudge no overclaim", !USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN.test(nudge ?? ""));
  ok("no nudge without trigger", buildUsedCarSafetyNudge("อยากได้รถประหยัดน้ำมัน") === null);
}

// ---------------------------------------------------------------------------
// 3) Market-context note — light, conditional weave only
// ---------------------------------------------------------------------------
{
  const withBudget = buildMarketContextNote(parseBuyerSearchIntent("งบไม่เกิน 3 แสน"), "งบไม่เกิน 3 แสน");
  ok("market note with budget", withBudget != null);
  ok("market note single line", (withBudget ?? "").split("\n").length === 1, withBudget ?? "");
  ok("market note mentions hidden costs", /พรบ|ประกัน|ภาษี|บำรุง/.test(withBudget ?? ""));
  ok("market note no specific market price", !/ราคาตลาด.*\d/.test(withBudget ?? ""));
  ok("market note no overclaim", !USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN.test(withBudget ?? ""));

  const noSignal = buildMarketContextNote(parseBuyerSearchIntent("มี Yaris ไหม"), "มี Yaris ไหม");
  ok("no market note without budget/finance", noSignal === null, noSignal ?? "");
}

// ---------------------------------------------------------------------------
// 4) Over-claim guard throws
// ---------------------------------------------------------------------------
{
  let threw = false;
  try {
    assertUsedCarAdviceSafe("คันนี้สภาพดีแน่นอน ไฟแนนซ์ผ่านชัวร์");
  } catch {
    threw = true;
  }
  ok("overclaim guard throws", threw);
}

// ---------------------------------------------------------------------------
// 5) Weave into search reply (budget signal) — light, grounded, deterministic
// ---------------------------------------------------------------------------
{
  const reply = tryOrchestrateChatReply("งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน", INVENTORY);
  ok("search reply built", reply != null);
  ok("search reply has cards", (reply?.carCards.length ?? 0) >= 1);
  ok("search reply skips gemini", reply?.skipGemini === true);
  ok("search reply weaves market note", /พรบ|ประกัน|ภาษี|บำรุง/.test(reply?.text ?? ""), (reply?.text ?? "").slice(-120));
  ok("search reply no overclaim", !USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN.test(reply?.text ?? ""));
  ok("search reply no invented facts", !INVENTED_FACT_RE.test(reply?.text ?? ""));
  ok("search reply no queue count", !QUEUE_NUMBER_RE.test(reply?.text ?? ""));
  const blob = JSON.stringify(reply);
  ok("search reply no consent field", !/"consent"|"consentConfirmed"/.test(blob));
  ok("search reply no contactPhone", !/"contactPhone"/.test(blob) && !PHONE_RE.test(blob));

  // deterministic
  const reply2 = tryOrchestrateChatReply("งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน", INVENTORY);
  ok("search reply deterministic", reply?.text === reply2?.text);
}

// ---------------------------------------------------------------------------
// 6) Safety nudge woven into a search reply only when triggered
// ---------------------------------------------------------------------------
{
  const triggered = tryOrchestrateChatReply("มี Yaris ไม่เกิน 3 แสนไหม ต้องโอนมัดจำก่อนดูรถไหม", INVENTORY);
  // payment phrasing may route to paymentSafety advisor OR weave a nudge into search;
  // either way the safety message must be present and grounded.
  const hasSafety = /เห็นรถจริง|ก่อนโอน|วางมัดจำ|ตรวจเล่มทะเบียน|ตรวจเอกสาร/.test(triggered?.text ?? "");
  ok("payment-triggered reply carries safety guidance", hasSafety, (triggered?.text ?? "").slice(0, 80));
  ok("payment-triggered reply no overclaim", !USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN.test(triggered?.text ?? ""));

  const plain = tryOrchestrateChatReply("อยากได้รถประหยัดน้ำมัน งบ 3 แสน", INVENTORY);
  ok("plain search has no safety nudge", !/ก่อนโอนเงินหรือวางมัดจำ|นัดดูรถจริงและตรวจเอกสาร|เห็นรถจริง ตรวจเล่มทะเบียน/.test(plain?.text ?? ""));
}

// ---------------------------------------------------------------------------
// 7) New topics do NOT hijack vehicle search and do NOT clash with finance calc
// ---------------------------------------------------------------------------
{
  // a real search with usage still returns cards (not an advisor-only reply)
  const search = tryOrchestrateChatReply("มี Yaris ไม่เกิน 3 แสนไหม", INVENTORY);
  ok("real search still returns cards", (search?.carCards.length ?? 0) >= 1);

  // finance CALC (with numbers) is not stolen by monthlyBudget advice
  ok("finance calc intent with numbers", isFinanceCalculatorIntent("รถ 500000 ดาวน์ 20% ผ่อน 60 งวด ผ่อนเท่าไหร่"));
  ok("monthlyBudget advice is not finance-calc", !isFinanceCalculatorIntent("ควรผ่อนเดือนละเท่าไหร่ถึงไม่หนัก"));
  ok("monthlyBudget advice detected as advisor", detectBuyerAdvisorTopic("ควรผ่อนเดือนละเท่าไหร่ถึงไม่หนัก") === "monthlyBudget");

  // a pure city search (single area) must NOT become cityVsUpcountry advisor
  ok("single-area search not hijacked", detectBuyerAdvisorTopic("อยากได้รถใช้ในเมือง") === null);
}

console.log(`\nDone v7.5 Thai used-car market context + safety advice. PASS ${passed} / ${passed + failed}`);
if (process.exitCode) process.exit(process.exitCode);
