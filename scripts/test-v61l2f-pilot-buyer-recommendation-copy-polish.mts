/**
 * v6.1L.2f — Pilot buyer recommendation copy polish (static + unit tests)
 * npm run test:v61l2f-pilot-buyer-recommendation-copy-polish
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { CHAT_PATH_LEGACY_START_OVER } from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import { wireShadowChatPath } from "../src/services/ai/salesBrainShadowChatPath.ts";
import { wireShadowChatPathWithPilot } from "../src/services/ai/salesBrainShadowChatPathNode.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  SALES_BRAIN_USER_VISIBLE_PILOT_MARKER,
  resolveUserVisibleChatResponse,
} from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import {
  assertNoPilotDebugMarker,
  buildBuyerComparePilotCopy,
  buildBuyerSearchPilotCopy,
  buildPilotBuyerUserVisibleCopy,
  detectBuyerRefinement,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import type { PilotGroundedCarCard } from "../src/services/ai/chat/chatPilotSessionContext.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const TEST_UID = "synthetic-tester-uid-v61l2f";
const OTHER_UID = "synthetic-other-uid-v61l2f";
const LEGACY_TEXT = "legacy orchestrator reply";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const PII_PHONE = "0812345678";

const SAMPLE_CARDS: PilotGroundedCarCard[] = [
  {
    index: 1,
    brand: "Toyota",
    model: "Vios",
    year: 2019,
    price: 390000,
    mileage: 45000,
    bodyClassLabel: "Sedan B",
  },
  {
    index: 2,
    brand: "Honda",
    model: "City",
    year: 2018,
    price: 410000,
    mileage: 52000,
    bodyClassLabel: "Sedan B",
  },
  {
    index: 3,
    brand: "Mazda",
    model: "2",
    year: 2020,
    price: 420000,
    mileage: 38000,
    bodyClassLabel: "Hatchback B",
  },
];

const STAGING_PILOT_ENV: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: TEST_UID,
};

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const copySrc = readFileSync("src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts", "utf8");
const pathSrc = readFileSync("src/services/ai/salesBrainUserVisibleChatPath.ts", "utf8");
const bridgeSrc = readFileSync(
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
  "utf8"
);

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertThaiPitch(text: string): boolean {
  return (
    text.includes("น้องเอ") &&
    !text.includes("หนู") &&
    assertNoPilotDebugMarker(text) &&
    !text.includes(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER)
  );
}

console.log("=== v6.1L.2f Pilot Buyer Recommendation Copy Polish ===\n");

// --- copy module ---
{
  ok("copy module exists", copySrc.length > 1500);
  ok("copy slice v61l2h", copySrc.includes("v6.1L.2h"));
  ok("copy uses nong a tone", copySrc.includes("น้องเอ") && !/user-visible.*หนู/i.test(copySrc));
  ok("copy has disclaimer", /ข้อมูลประกาศ|แนะนำเบื้องต้น/i.test(copySrc));
  ok("copy no overpromise best", !/(?:เป็น|คือ|ถือว่า|แนะนำ).*ดีที่สุด/i.test(copySrc));
}

// --- no debug marker in user-visible text ---
{
  const three = buildBuyerSearchPilotCopy({
    userMessage: BUYER_MSG,
    carCardCount: 3,
  });
  ok("three cars no marker", assertNoPilotDebugMarker(three));
  ok("three cars thai pitch", assertThaiPitch(three));
  ok("three cars has compare help", /เทียบ|คัด|ไมล์|คุ้ม/.test(three));
  ok("three cars no old UI tap CTA", !/กดดูคันที่ถูกใจ|ดูรายละเอียดในแชท/.test(three));

  const one = buildBuyerSearchPilotCopy({ userMessage: BUYER_MSG, carCardCount: 1 });
  ok("one car pitch", one.includes("1 คัน"));
  ok("one car useful summary", /ราคา|ไมล์|จุดเด่น|การ์ด/.test(one));

  const two = buildBuyerSearchPilotCopy({ userMessage: BUYER_MSG, carCardCount: 2 });
  ok("two car pitch", two.includes("2 คัน"));
  ok("two car compare help", /เทียบ|คัด/.test(two));

  const zero = buildBuyerSearchPilotCopy({ userMessage: BUYER_MSG, carCardCount: 0 });
  ok("zero cars guidance", /ยังไม่เจอ|ใกล้เคียง/i.test(zero));

  const richOne = buildBuyerSearchPilotCopy({
    userMessage: "มี Honda CRV 2019 ไหมครับ",
    carCardCount: 1,
    recentCarCards: SAMPLE_CARDS.slice(0, 1),
  });
  ok(
    "rich one-car summary uses safe fields",
    /ราคา/.test(richOne) && /1 คัน/.test(richOne) && !/ลุง/.test(richOne)
  );

  const compare = buildBuyerComparePilotCopy({ a: 1, b: 2 }, SAMPLE_CARDS);
  ok("compare copy thai", assertThaiPitch(compare));
  ok("compare mentions pair", compare.includes("คันที่ 1") && compare.includes("คันที่ 2"));
}

// --- detect refinement / compare ---
{
  ok("refinement fuel", detectBuyerRefinement("เอาประหยัดน้ำมัน") === "fuel");
  ok("refinement family", detectBuyerRefinement("เอารถครอบครัว") === "family");
  ok("refinement installment", detectBuyerRefinement("เอาผ่อนถูก") === "installment");
  ok(
    "build compare intent",
    buildPilotBuyerUserVisibleCopy({
      userMessage: "เทียบคันที่ 1 กับ 2",
      intent: "unknown",
      carCardCount: 3,
      recentCarCards: SAMPLE_CARDS,
    })?.text.includes("คันที่ 1")
  );
}

// --- allowlisted buyer.search pilot path ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: { carCardCount: 3, hasMoreCars: true },
  });
  ok("allowlisted pilot active", resolved.pilotPathActive === true);
  ok("allowlisted no debug marker", assertNoPilotDebugMarker(resolved.userVisibleText));
  ok("allowlisted thai pitch", assertThaiPitch(resolved.userVisibleText));
  ok("allowlisted buyer search intent", resolved.pilotIntent === "buyer.search");
  ok(
    "allowlisted has compare/help wording",
    /เทียบ|คัด|ไมล์|คุ้ม|การ์ด/.test(resolved.userVisibleText)
  );
  ok(
    "allowlisted no old UI tap CTA",
    !/กดดูคันที่ถูกใจ|ดูรายละเอียดในแชท|จัดการ์ดไว้ด้านล่าง/.test(
      resolved.userVisibleText
    )
  );
}

// --- buyer.search pilot copy with card fields keeps rich summary ---
{
  const polished = buildPilotBuyerUserVisibleCopy({
    userMessage: "มี Honda CRV 2019 ไหมครับ",
    intent: "buyer.search",
    carCardCount: 1,
    recentCarCards: [
      {
        index: 1,
        brand: "Honda",
        model: "CRV",
        year: 2019,
        price: 599000,
        mileage: 82000,
        bodyClassLabel: "SUV / Crossover",
      },
    ],
  });
  ok("rich pilot active", polished?.pilotPathActive === true);
  ok(
    "rich pilot summarizes car fields",
    Boolean(
      polished &&
        /Honda|CRV/i.test(polished.text) &&
        /ราคา/.test(polished.text) &&
        /599/.test(polished.text) &&
        !/ลุง/.test(polished.text)
    ),
    polished?.text.slice(0, 120) ?? "null"
  );
}

// --- guest / non-allowlisted legacy ---
{
  const guest = resolveUserVisibleChatResponse({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: undefined,
    pilotOrchestration: { carCardCount: 0 },
  });
  ok("guest start over exact", guest.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
  ok("guest no pilot", guest.pilotPathActive === false);

  const nonListed = resolveUserVisibleChatResponse({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: OTHER_UID,
    pilotOrchestration: { carCardCount: 0 },
  });
  ok("non-allowlisted start over exact", nonListed.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
  ok("non-allowlisted no pilot", nonListed.pilotPathActive === false);

  const guestWired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: undefined,
  });
  ok("guest wire legacy", guestWired.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
}

// --- bridge passes orchestration hint ---
{
  ok("bridge passes pilotOrchestration", bridgeSrc.includes("pilotOrchestration"));
  ok("bridge accepts pilotSessionContext", bridgeSrc.includes("pilotSessionContext"));
  ok("bridge carCardCount", bridgeSrc.includes("carCards?.length"));
}

// --- path never emits marker to users ---
{
  ok("path no marker emit", !pathSrc.includes(`${SALES_BRAIN_USER_VISIBLE_PILOT_MARKER}\${intent}`));
  ok("path uses polish module", pathSrc.includes("buildPilotBuyerUserVisibleCopy"));
  ok("path marker guard", pathSrc.includes("assertNoPilotDebugMarker"));
}

// --- orchestrator guest legacy unchanged ---
{
  const reply = tryOrchestrateChatReply("เริ่มใหม่", [], {});
  ok("orchestrator guest legacy", reply?.text === CHAT_PATH_LEGACY_START_OVER);
}

// --- bridge allowlisted with cards ---
{
  const result = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  ok("bridge allowlisted active", result.payload.pilotPathActive === true);
  ok("bridge no marker", assertNoPilotDebugMarker(result.payload.userVisibleText));
}

// --- node wire with cards ---
{
  const nodeWired = wireShadowChatPathWithPilot({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    source: "useChat.orchestrated",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: { carCardCount: 3 },
  });
  ok("node wire no marker", assertNoPilotDebugMarker(nodeWired.userVisibleText));
  ok("node wire thai pitch", assertThaiPitch(nodeWired.userVisibleText));
}

// --- no secrets / pii in copy module ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`copy no secret ${pat.source.slice(0, 10)}`, !pat.test(copySrc));
  }
  ok("copy no phone literal", !copySrc.includes(PII_PHONE));
  ok("resolved no uid in text", !buildBuyerSearchPilotCopy({ userMessage: BUYER_MSG, carCardCount: 3 }).includes(TEST_UID));
}

console.log("\nDone v6.1L.2f Pilot Buyer Recommendation Copy Polish tests.");
if (process.exitCode) process.exit(process.exitCode);
