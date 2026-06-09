/**
 * v6.1L.2g — Follow-up context grounding for pilot buyer compare/refine
 * npm run test:v61l2g-pilot-buyer-followup-context-grounding
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { CHAT_PATH_LEGACY_START_OVER } from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import { wireShadowChatPath } from "../src/services/ai/salesBrainShadowChatPath.ts";
import { wireShadowChatPathWithPilot } from "../src/services/ai/salesBrainShadowChatPathNode.ts";
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
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  SALES_BRAIN_USER_VISIBLE_PILOT_MARKER,
  resolveUserVisibleChatResponse,
} from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import {
  assertNoPilotDebugMarker,
  assertPilotCopySafe,
  buildBuyerComparePilotCopy,
  buildPilotBuyerUserVisibleCopy,
  buildBuyerRefinementPilotCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import {
  buildPilotSessionContextFromCarCards,
  type PilotGroundedCarCard,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import type { ChatCarCardData } from "../src/types.ts";

const TEST_UID = "synthetic-tester-uid-v61l2g";
const OTHER_UID = "synthetic-other-uid-v61l2g";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const COMPARE_MSG = "ช่วยเทียบคันที่ 1 กับ 2 ให้หน่อยว่าคันไหนน่าใช้กว่ากัน";
const COMPARE_SHORT = "เทียบคันที่ 1 กับ 2";
const REFINE_MSG = "เอาประหยัดน้ำมัน";

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

const SESSION_CONTEXT = buildPilotSessionContextFromCarCards(
  SAMPLE_CARDS.map(
    (c) =>
      ({
        id: `car-${c.index}`,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price: c.price,
        mileage: c.mileage ?? 0,
        bodyClassLabel: c.bodyClassLabel ?? "",
        color: "",
        condition: "",
        fuelType: "petrol",
        transmission: "",
        bodyClass: "",
        imageUrl: "",
        imageUrls: [],
        hasImage: false,
        detailPath: "",
        matchKind: "exact",
      }) satisfies ChatCarCardData
  ),
  400000
)!;

const bridgeSrc = readFileSync(
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
  "utf8"
);
const clientSrc = readFileSync("src/services/ai/chat/chatUserVisibleOrchestrateClient.ts", "utf8");
const useChatSrc = readFileSync("src/hooks/chat/useChat.ts", "utf8");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertThaiPitch(text: string, cardCount: number): boolean {
  return (
    text.includes("น้องเอ") &&
    !text.includes("หนู") &&
    assertPilotCopySafe(text, cardCount) &&
    !text.includes(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER)
  );
}

console.log("=== v6.1L.2g Pilot Buyer Follow-up Context Grounding ===\n");

// --- initial search pitch ---
{
  const search = buildPilotBuyerUserVisibleCopy({
    userMessage: BUYER_MSG,
    intent: "buyer.search",
    carCardCount: 3,
    recentCarCards: SAMPLE_CARDS,
    lastSearchBudgetMax: 400000,
  });
  ok("search three cards pitch", Boolean(search?.text.includes("3 คัน")));
  ok("search thai pitch", assertThaiPitch(search?.text ?? "", 3));
}

// --- compare follow-up grounded ---
{
  const compare = buildPilotBuyerUserVisibleCopy({
    userMessage: COMPARE_MSG,
    intent: "unknown",
    carCardCount: 0,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("compare long msg no zero cars", !/0\s*คัน|ในระบบ(?:มี|เหลือ)?\s*0/i.test(compare?.text ?? ""));
  ok("compare mentions card 1", compare?.text.includes("คันที่ 1") ?? false);
  ok("compare mentions card 2", compare?.text.includes("คันที่ 2") ?? false);
  ok("compare mentions Vios or City", /Vios|City/.test(compare?.text ?? ""));
  ok("compare no almera swift hallucination", !/Almera|Swift|Yaris|Eco Car|B-Segment/i.test(compare?.text ?? ""));
  ok("compare thai pitch", assertThaiPitch(compare?.text ?? "", 3));

  const shortCompare = buildPilotBuyerUserVisibleCopy({
    userMessage: COMPARE_SHORT,
    intent: "unknown",
    carCardCount: 0,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("compare short no zero cars", !/0\s*คัน/i.test(shortCompare?.text ?? ""));
}

// --- refinement grounded ---
{
  const refine = buildPilotBuyerUserVisibleCopy({
    userMessage: REFINE_MSG,
    intent: "unknown",
    carCardCount: 0,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("refine no zero cars", !/0\s*คัน|Almera|Swift|Yaris/i.test(refine?.text ?? ""));
  ok("refine mentions listings", /Vios|City|Mazda|จาก 3 คัน/.test(refine?.text ?? ""));
  ok("refine no external models", !/Almera|Swift|Yaris|Eco Car/i.test(refine?.text ?? ""));
  ok("refine thai pitch", assertThaiPitch(refine?.text ?? "", 3));
}

// --- bridge with session context ---
{
  ok("bridge accepts pilotSessionContext", bridgeSrc.includes("pilotSessionContext"));
  ok("client sends pilotSessionContext", clientSrc.includes("pilotSessionContext"));
  ok("useChat builds session context", useChatSrc.includes("resolvePilotSessionContextForFollowUp"));

  const bridged = runUserVisibleOrchestrationBridge({
    userMessage: COMPARE_SHORT,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotSessionContext: SESSION_CONTEXT,
  });
  ok("bridge compare pilot active", bridged.payload.pilotPathActive === true);
  ok("bridge compare no marker", assertNoPilotDebugMarker(bridged.payload.userVisibleText));
  ok("bridge compare no zero cars", !/0\s*คัน/i.test(bridged.payload.userVisibleText));
  ok("bridge compare grounded", /Vios|City|คันที่ 1/.test(bridged.payload.userVisibleText));
}

// --- resolver with session ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: REFINE_MSG,
    legacyUserVisibleResponse: "legacy 0 คัน in market",
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: {
      carCardCount: 3,
      recentCarCards: SAMPLE_CARDS,
      lastSearchBudgetMax: 400000,
    },
  });
  ok("resolver refine no legacy zero", !/legacy 0 คัน/.test(resolved.userVisibleText));
  ok("resolver refine grounded", /จาก 3 คัน|Vios|City/.test(resolved.userVisibleText));
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
    pilotOrchestration: { carCardCount: 3, recentCarCards: SAMPLE_CARDS },
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
    pilotOrchestration: { carCardCount: 3, recentCarCards: SAMPLE_CARDS },
  });
  ok("non-allowlisted start over exact", nonListed.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
}

// --- copy builders direct ---
{
  const compareCopy = buildBuyerComparePilotCopy({ a: 1, b: 2 }, SAMPLE_CARDS);
  ok("compare copy lists models", compareCopy.includes("Vios") && compareCopy.includes("City"));
  const refineCopy = buildBuyerRefinementPilotCopy("fuel", SAMPLE_CARDS);
  ok("refine copy lists cards", refineCopy.includes("Toyota") && refineCopy.includes("Honda"));
}

// --- node wire ---
{
  const nodeWired = wireShadowChatPathWithPilot({
    userMessage: COMPARE_SHORT,
    legacyUserVisibleResponse: "ในระบบมี 0 คัน",
    userRole: "buyer",
    source: "useChat.orchestrated",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: { carCardCount: 3, recentCarCards: SAMPLE_CARDS },
  });
  ok("node wire compare grounded", /คันที่ 1|Vios/.test(nodeWired.userVisibleText));
  ok("node wire no zero claim", !/0\s*คัน/.test(nodeWired.userVisibleText));
}

// --- orchestrator contextual follow-up (sessionStorage mocked via pre-save not available in node) ---
{
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

console.log("\nDone v6.1L.2g Pilot Buyer Follow-up Context Grounding tests.");
if (process.exitCode) process.exit(process.exitCode);
