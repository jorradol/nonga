/**
 * v6.1L.2h — Hard guard follow-up compare/refine (no zero cars, no sales tone)
 * npm run test:v61l2h-pilot-buyer-followup-hard-guard
 */
import { readFileSync } from "node:fs";
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
  assertPilotFollowUpCopySafe,
  buildBuyerComparePilotCopy,
  buildPilotBuyerUserVisibleCopy,
  buildBuyerRefinementPilotCopy,
  buildPilotFollowUpNoContextCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import {
  buildPilotSessionContextFromCarCards,
  buildPilotSessionContextFromMessages,
  resolvePilotSessionContextForFollowUp,
  type PilotGroundedCarCard,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import { FORBIDDEN_PILOT_FOLLOWUP_PHRASES } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import type { ChatCarCardData, ChatMessage } from "../src/types.ts";

const TEST_UID = "synthetic-tester-uid-v61l2h";
const OTHER_UID = "synthetic-other-uid-v61l2h";
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

const CARD_DATA = SAMPLE_CARDS.map(
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
);

const SESSION_CONTEXT = buildPilotSessionContextFromCarCards(CARD_DATA, 400000)!;

const copySrc = readFileSync("src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts", "utf8");
const useChatSrc = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const chatStoreSrc = readFileSync("src/stores/chat/chatStore.ts", "utf8");
const pathSrc = readFileSync("src/services/ai/salesBrainUserVisibleChatPath.ts", "utf8");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertFollowUpSafe(text: string, cardCount: number): boolean {
  return (
    text.includes("น้องเอ") &&
    !text.includes("หนู") &&
    assertPilotFollowUpCopySafe(text, cardCount) &&
    !text.includes(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER)
  );
}

console.log("=== v6.1L.2h Pilot Buyer Follow-up Hard Guard ===\n");

// --- slice + wiring ---
{
  ok("copy slice v61l2h", copySrc.includes("v6.1L.2h"));
  ok("path slice v61l2i", pathSrc.includes("v6.1L.2i"));
  ok("useChat resolvePilotSessionContextForFollowUp", useChatSrc.includes("resolvePilotSessionContextForFollowUp"));
  ok("useChat blocks follow-up gemini fallback", useChatSrc.includes("buildPilotFollowUpNoContextCopy"));
  ok("useChat bridge on null orchestrated follow-up", /isFollowUpPilot && !orchestrated/.test(useChatSrc));
  ok("chatStore saves car context on finalize", chatStoreSrc.includes("saveChatCarContext(cards, sessionId)"));
  ok("copy has no context builder", copySrc.includes("buildPilotFollowUpNoContextCopy"));
}

// --- manual sequence 1: search pitch ---
{
  const search = buildPilotBuyerUserVisibleCopy({
    userMessage: BUYER_MSG,
    intent: "buyer.search",
    carCardCount: 3,
    recentCarCards: SAMPLE_CARDS,
    lastSearchBudgetMax: 400000,
  });
  ok("search three cards pitch", Boolean(search?.text.includes("3 คัน")));
  ok("search thai pitch", assertFollowUpSafe(search?.text ?? "", 3));
}

// --- manual sequence 2: compare with cards ---
{
  const compare = buildPilotBuyerUserVisibleCopy({
    userMessage: COMPARE_SHORT,
    intent: "unknown",
    carCardCount: 0,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("compare no zero cars", assertPilotFollowUpCopySafe(compare?.text ?? "", 3));
  ok("compare mentions Vios or City", /Vios|City/.test(compare?.text ?? ""));
  ok("compare no forbidden tone", assertFollowUpSafe(compare?.text ?? "", 3));
  ok("compare no external models", !/Almera|Swift|Yaris|Eco Car/i.test(compare?.text ?? ""));
}

// --- manual sequence 3: refine with cards ---
{
  const refine = buildPilotBuyerUserVisibleCopy({
    userMessage: REFINE_MSG,
    intent: "unknown",
    carCardCount: 0,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("refine no zero cars", assertPilotFollowUpCopySafe(refine?.text ?? "", 3));
  ok("refine lists cards", /Vios|City|Mazda/.test(refine?.text ?? ""));
  ok("refine no external models", !/Almera|Swift|Yaris/i.test(refine?.text ?? ""));
}

// --- no prior context ---
{
  const noCtx = buildPilotBuyerUserVisibleCopy({
    userMessage: COMPARE_SHORT,
    intent: "unknown",
    carCardCount: 0,
  });
  ok("no context asks to search first", noCtx?.text.includes("ยังไม่เห็นชุดรถล่าสุด"));
  ok("no context no zero cars", assertPilotFollowUpCopySafe(noCtx?.text ?? "", 0));
  ok("no context direct builder", buildPilotFollowUpNoContextCopy().includes("งบ 4 แสน"));
}

// --- context from chat messages ---
{
  const messages: Pick<ChatMessage, "sender" | "carCards">[] = [
    { sender: "user", carCards: undefined },
    { sender: "ai", carCards: CARD_DATA },
  ];
  const fromMessages = buildPilotSessionContextFromMessages(messages);
  ok("messages context three cards", fromMessages?.recentCarCards.length === 3);
  const resolved = resolvePilotSessionContextForFollowUp(messages);
  ok("resolve prefers message cards", resolved?.recentCarCards.length === 3);
}

// --- bridge compare with session ---
{
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
  ok("bridge compare grounded", /Vios|City|คันที่ 1/.test(bridged.payload.userVisibleText));
  ok("bridge compare safe", assertPilotFollowUpCopySafe(bridged.payload.userVisibleText, 3));
}

// --- resolver rejects legacy zero ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: COMPARE_SHORT,
    legacyUserVisibleResponse: "ในระบบมี 0 คัน คุณพี่คร้าบ ดีลสุดคุ้ม คุ้มค่าเงินทุกบาทแน่นอน",
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: { carCardCount: 3, recentCarCards: SAMPLE_CARDS },
  });
  ok("resolver no legacy zero", !/0\s*คัน|คุณพี่คร้าบ|ดีลสุดคุ้ม/.test(resolved.userVisibleText));
  ok("resolver grounded compare", /Vios|City|คันที่ 1/.test(resolved.userVisibleText));

  const noCardsResolved = resolveUserVisibleChatResponse({
    userMessage: COMPARE_SHORT,
    legacyUserVisibleResponse: "ในระบบมี 0 คัน",
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: { carCardCount: 0 },
  });
  ok("resolver no cards safe reply", noCardsResolved.userVisibleText.includes("ยังไม่เห็นชุดรถล่าสุด"));
  ok("resolver no cards no zero", assertPilotFollowUpCopySafe(noCardsResolved.userVisibleText, 0));
}

// --- forbidden phrase patterns ---
{
  ok("forbidden คุณพี่คร้าบ detected", FORBIDDEN_PILOT_FOLLOWUP_PHRASES.some((p) => p.test("คุณพี่คร้าบ")));
  ok("forbidden overpromise detected", FORBIDDEN_PILOT_FOLLOWUP_PHRASES.some((p) => p.test("ดีลสุดคุ้ม คุ้มค่าเงินทุกบาทแน่นอน")));
  const bad = "ในระบบมี 0 คัน คุณพี่คร้าบ";
  ok("bad copy fails guard", !assertPilotFollowUpCopySafe(bad, 3));
  const good = buildBuyerComparePilotCopy({ a: 1, b: 2 }, SAMPLE_CARDS);
  ok("good compare passes guard", assertPilotFollowUpCopySafe(good, 3));
  const refineCopy = buildBuyerRefinementPilotCopy("fuel", SAMPLE_CARDS);
  ok("good refine passes guard", assertPilotFollowUpCopySafe(refineCopy, 3));
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

// --- node wire ---
{
  const nodeWired = wireShadowChatPathWithPilot({
    userMessage: COMPARE_SHORT,
    legacyUserVisibleResponse: "ในระบบมี 0 คัน กราบขออภัยอย่างสูง",
    userRole: "buyer",
    source: "useChat.orchestrated",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: { carCardCount: 3, recentCarCards: SAMPLE_CARDS },
  });
  ok("node wire safe compare", assertPilotFollowUpCopySafe(nodeWired.userVisibleText, 3));

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

console.log("\nDone v6.1L.2h Pilot Buyer Follow-up Hard Guard tests.");
if (process.exitCode) process.exit(process.exitCode);
