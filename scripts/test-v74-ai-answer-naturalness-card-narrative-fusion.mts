/**
 * v7.4 — AI Answer Naturalness + Car Card Narrative Fusion
 * npm run test:v74-ai-answer-naturalness-card-narrative-fusion
 *
 * Verifies:
 *  - per-car grounded "fit reason" is attached to each car card (narrative fusion)
 *  - fit reasons come ONLY from real fields/intent (no invented mileage/fuel/
 *    history/finance/condition; no forbidden marketing claims)
 *  - the text bubble no longer duplicates the per-car pitch wall (fused onto cards)
 *  - v7.2 memory drives a natural, DISPLAY-ONLY search opener ("ตามที่คุยกันไว้")
 *  - the opener recalls the buyer's own stated interest, never a phone/name/consent
 *  - memory never becomes consent and never enters the reply payload
 *  - no lead is auto-sent from a search reply
 *  - no buyer-facing queue count appears (regression v7.3)
 *  - builders are deterministic (same input → same output)
 */
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { tryBuyerScoredMarketplaceReply } from "../src/services/ai/chat/buyerScoredMarketplaceSearch.ts";
import {
  buildAllCardFitReasons,
  buildCardFitReason,
  BUYER_PITCH_FORBIDDEN_CLAIM,
} from "../src/services/ai/chat/buyerCarPitchCopy.ts";
import {
  parseBuyerSearchIntent,
} from "../src/services/ai/chat/buyerSearchIntentParser.ts";
import { scoreBuyerMarketplaceCandidates } from "../src/services/ai/chat/buyerMarketplaceScoring.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  buildSearchOpenerFromMemory,
  clearConversationalLeadMemory,
  conversationalLeadMemoryHasNoContactOrConsent,
  getConversationalLeadMemory,
  resetConversationalLeadMemoryForTests,
  updateConversationalLeadMemory,
} from "../src/services/leads/conversationalLeadMemory.ts";

let passed = 0;
let failed = 0;
function ok(name: string, pass: boolean, detail = "") {
  if (pass) passed++;
  else failed++;
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const FORBIDDEN = BUYER_PITCH_FORBIDDEN_CLAIM;
// invented-fact heuristics: mileage figures, fuel economy, repair/accident history
const INVENTED_FACT_RE =
  /\d[\d,]*\s*กม\.?|km\/l|กม\.\/ลิตร|กิโลเมตรต่อลิตร|ไม่เคยชน|ไม่เคยน้ำท่วม|ประวัติซ่อม|เคลมประกัน/i;
const QUEUE_NUMBER_RE = /ลำดับที่\s*\d|คิวผู้สนใจลำดับ|ลำดับ\s*\d|อยู่ในคิว|\bคิว.*\d/;
const PHONE_RE = /0\d{8,9}/;

resetConversationalLeadMemoryForTests();

const INVENTORY_FUEL: ChatInventoryCar[] = [
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
    id: "car-mira",
    title: "Daihatsu Mira",
    brand: "Daihatsu",
    model: "Mira",
    year: 2019,
    price: 295_000,
    bodyType: "hatchback",
    description: "รถประหยัดน้ำมัน",
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
];

const INVENTORY_YARIS: ChatInventoryCar[] = [
  {
    id: "car-yaris-1",
    title: "Toyota Yaris",
    brand: "Toyota",
    model: "Yaris",
    year: 2019,
    price: 289_000,
    bodyType: "hatchback",
    listingStatus: "published",
  },
  {
    id: "car-yaris-2",
    title: "Toyota Yaris Ativ",
    brand: "Toyota",
    model: "Yaris",
    year: 2020,
    price: 299_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
];

// ---------------------------------------------------------------------------
// 1) Per-car fit reason is grounded + safety-guarded
// ---------------------------------------------------------------------------
{
  const intent = parseBuyerSearchIntent("งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน");
  const scoring = scoreBuyerMarketplaceCandidates(intent, INVENTORY_FUEL, {
    limit: 5,
  });
  const reasons = buildAllCardFitReasons(intent, scoring);
  ok("fit reasons parallel to candidates", reasons.length === scoring.candidates.length);
  ok("every fit reason non-empty", reasons.every((r) => r.trim().length > 0));
  ok("no forbidden claim in fit reasons", reasons.every((r) => !FORBIDDEN.test(r)), reasons.join(" | "));
  ok(
    "no invented car facts in fit reasons",
    reasons.every((r) => !INVENTED_FACT_RE.test(r)),
    reasons.find((r) => INVENTED_FACT_RE.test(r)) ?? ""
  );
  // single-candidate helper is also guarded
  const one = buildCardFitReason(scoring.candidates[0], 0, intent);
  ok("single fit reason grounded", one.trim().length > 0 && !FORBIDDEN.test(one) && !INVENTED_FACT_RE.test(one), one);
}

// ---------------------------------------------------------------------------
// 2) Narrative fusion — reasons attached to each card, text wall trimmed
// ---------------------------------------------------------------------------
{
  const reply = tryBuyerScoredMarketplaceReply(
    "งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน",
    INVENTORY_FUEL
  );
  ok("scored reply built", reply != null);
  ok("each shown card has fit reason", (reply?.carCards ?? []).every((c) => (c.fitReason ?? "").trim().length > 0));
  ok("all ranked cards have fit reason", (reply?.allCarCards ?? []).every((c) => (c.fitReason ?? "").trim().length > 0));
  ok("fitReasons parallel array present", (reply?.fitReasons?.length ?? 0) === (reply?.allCarCards.length ?? -1));
  ok(
    "text bubble includes per-car sales explanations",
    /คันแรก|คันที่สอง|คันที่สาม/.test(reply?.text ?? "") &&
      /ราคา|ไมล์|จากข้อมูลประกาศ/.test(reply?.text ?? ""),
    (reply?.text ?? "").slice(0, 160)
  );
  ok("text still has warm opener (น้องเอ)", /น้องเอ/.test(reply?.text ?? ""));
  ok(
    "text has compare or soft CTA",
    /สรุปช่วยตัดสินใจ|นัดดูรถ|ทดลองขับ|นัดชมรถ/.test(reply?.text ?? ""),
    (reply?.text ?? "").slice(-120)
  );
  // grounded across the whole reply (text + every card reason)
  const blob = [reply?.text ?? "", ...(reply?.allCarCards ?? []).map((c) => c.fitReason ?? "")].join("\n");
  ok("no forbidden claim across reply", !FORBIDDEN.test(blob));
  ok("no invented facts across reply", !INVENTED_FACT_RE.test(blob), blob.slice(0, 120));
}

// ---------------------------------------------------------------------------
// 3) Deterministic — same input → same fused output
// ---------------------------------------------------------------------------
{
  const intent = parseBuyerSearchIntent("งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน");
  const scoring = scoreBuyerMarketplaceCandidates(intent, INVENTORY_FUEL, { limit: 5 });
  const a = buildAllCardFitReasons(intent, scoring);
  const b = buildAllCardFitReasons(intent, scoring);
  ok("fit reasons deterministic", JSON.stringify(a) === JSON.stringify(b));
}

// ---------------------------------------------------------------------------
// 4) Memory-driven natural search opener (DISPLAY-ONLY)
// ---------------------------------------------------------------------------
{
  const sid = "v74-opener";
  clearConversationalLeadMemory(sid);
  ok("no opener without memory", buildSearchOpenerFromMemory(getConversationalLeadMemory(sid)) === null);

  updateConversationalLeadMemory(
    sid,
    "อยากได้ Yaris งบไม่เกิน 3 แสน แถวลำลูกกา ไม่เอาติดแก๊ส"
  );
  const opener = buildSearchOpenerFromMemory(getConversationalLeadMemory(sid));
  ok("opener built from memory", opener != null);
  ok("opener uses natural recall phrase", opener?.includes("ตามที่คุยกันไว้") === true, opener ?? "");
  ok("opener recalls remembered model", opener?.includes("Yaris") === true);
  ok("opener recalls remembered area", opener?.includes("ลำลูกกา") === true);
  ok("opener recalls no-gas condition", opener?.includes("ไม่เอาติดแก๊ส") === true);
  ok("opener carries no phone", !PHONE_RE.test(opener ?? ""));
  ok("opener carries no queue count", !QUEUE_NUMBER_RE.test(opener ?? ""));
}

// ---------------------------------------------------------------------------
// 5) Opener fuses into the orchestrated search reply (same session)
// ---------------------------------------------------------------------------
{
  const sid = "v74-orch-opener";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(sid, "อยากได้ Yaris งบไม่เกิน 3 แสน");
  const reply = tryOrchestrateChatReply("มี Yaris ไม่เกิน 3 แสนไหม", INVENTORY_YARIS, {
    chatSessionId: sid,
  });
  ok("orchestrated reply built", reply != null);
  ok("reply has cards", (reply?.carCards.length ?? 0) >= 1);
  ok("reply opens with remembered context", reply?.text.startsWith("ตามที่คุยกันไว้") === true, reply?.text.slice(0, 60));
  ok("reply cards carry fused reason", (reply?.carCards ?? []).every((c) => (c.fitReason ?? "").trim().length > 0));

  // without memory there is no opener prefix
  const sid2 = "v74-no-mem";
  clearConversationalLeadMemory(sid2);
  const reply2 = tryOrchestrateChatReply("มี Yaris ไม่เกิน 3 แสนไหม", INVENTORY_YARIS, {
    chatSessionId: sid2,
  });
  ok("no opener prefix without memory", reply2?.text.startsWith("ตามที่คุยกันไว้") === false);
}

// ---------------------------------------------------------------------------
// 6) Memory is NOT consent and NEVER enters the reply payload
// ---------------------------------------------------------------------------
{
  const sid = "v74-not-consent";
  clearConversationalLeadMemory(sid);
  updateConversationalLeadMemory(sid, "Yaris งบ 3 แสน แถวลำลูกกา ไม่เอาติดแก๊ส");
  ok(
    "memory passes no-contact/consent guard",
    conversationalLeadMemoryHasNoContactOrConsent(getConversationalLeadMemory(sid))
  );
  const reply = tryOrchestrateChatReply("มี Yaris ไม่เกิน 3 แสนไหม", INVENTORY_YARIS, {
    chatSessionId: sid,
  });
  const blob = JSON.stringify(reply);
  ok("reply has no consent field", !/"consent"|"consentConfirmed"/.test(blob));
  ok("reply has no contactPhone field", !/"contactPhone"/.test(blob));
  ok("reply leaks no phone number", !PHONE_RE.test(blob));
}

// ---------------------------------------------------------------------------
// 7) No lead auto-send + no buyer-facing queue count in a search reply
// ---------------------------------------------------------------------------
{
  const reply = tryOrchestrateChatReply(
    "งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน",
    INVENTORY_FUEL
  );
  ok("search reply skips Gemini (deterministic)", reply?.skipGemini === true);
  ok("search reply only shows cards (no submit shape)", Array.isArray(reply?.carCards));
  const blob = JSON.stringify(reply);
  ok("search reply has no queue number", !QUEUE_NUMBER_RE.test(reply?.text ?? ""), reply?.text.slice(0, 80));
  ok("search reply has no lead-send markers", !/"leadId"|"submitted"|sendLead/.test(blob));
}

console.log(`\nDone v7.4 AI answer naturalness + card narrative fusion. PASS ${passed} / ${passed + failed}`);
if (process.exitCode) process.exit(process.exitCode);
