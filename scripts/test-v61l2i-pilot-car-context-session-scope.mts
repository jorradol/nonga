/**
 * v6.1L.2i — Scope pilot car context to current chat session
 * npm run test:v61l2i-pilot-car-context-session-scope
 */
import { readFileSync } from "node:fs";
import { CHAT_PATH_LEGACY_START_OVER } from "../src/services/ai/salesBrainServerChatShadowSink.ts";
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
  SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
  resolveUserVisibleChatResponse,
} from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import {
  assertNoPilotDebugMarker,
  assertPilotFollowUpCopySafe,
  buildPilotFollowUpNoContextCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import {
  buildPilotSessionContextFromCarCards,
  buildPilotSessionContextFromStorage,
  resolvePilotSessionContextForFollowUp,
  type PilotGroundedCarCard,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  clearPilotChatSessionContext,
  loadChatCarContext,
  saveChatCarContext,
  setActivePilotChatSessionId,
} from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData, ChatMessage } from "../src/types.ts";

const TEST_UID = "synthetic-tester-uid-v61l2i";
const OTHER_UID = "synthetic-other-uid-v61l2i";
const SESSION_A = "chat-session-a-v61l2i";
const SESSION_B = "chat-session-b-v61l2i";
const COMPARE_SHORT = "เทียบคันที่ 1 กับ 2";
const STALE_COROLLA = "Toyota Corolla";
const STALE_ALTIS = "Toyota Altis";

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
    price: 399000,
    mileage: 38000,
    bodyClassLabel: "Hatchback B",
  },
];

const STALE_CARDS: ChatCarCardData[] = [
  {
    id: "stale-1",
    brand: "Toyota",
    model: "Corolla",
    year: 2010,
    price: 250000,
    mileage: 120000,
    bodyClassLabel: "Sedan B",
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
  },
  {
    id: "stale-2",
    brand: "Toyota",
    model: "Altis",
    year: 2020,
    price: 650000,
    mileage: 40000,
    bodyClassLabel: "Sedan B",
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
  },
];

const CARD_DATA: ChatCarCardData[] = SAMPLE_CARDS.map((c, i) => ({
  id: `card-${i + 1}`,
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
  matchKind: "exact" as const,
}));

let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

// --- mock sessionStorage ---
const mockStore = new Map<string, string>();
(globalThis as { sessionStorage?: Storage }).sessionStorage = {
  getItem: (k) => mockStore.get(k) ?? null,
  setItem: (k, v) => {
    mockStore.set(k, v);
  },
  removeItem: (k) => {
    mockStore.delete(k);
  },
  clear: () => mockStore.clear(),
  key: () => null,
  length: 0,
};

const chatCarCtxSrc = readFileSync("src/utils/chatCarContext.ts", "utf8");
const pilotCtxSrc = readFileSync("src/services/ai/chat/chatPilotSessionContext.ts", "utf8");
const chatStoreSrc = readFileSync("src/stores/chat/chatStore.ts", "utf8");
const useChatSrc = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orchSrc = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");

console.log("v6.1L.2i — pilot car context session scope\n");

ok("slice id v6.1L.2i", SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID === "v6.1L.2i");
ok("storage binds chatSessionId", /chatSessionId/.test(chatCarCtxSrc));
ok("clearPilotChatSessionContext exported", /export function clearPilotChatSessionContext/.test(chatCarCtxSrc));
ok("setActivePilotChatSessionId exported", /export function setActivePilotChatSessionId/.test(chatCarCtxSrc));
ok("createSession clears pilot context", /clearPilotChatSessionContext/.test(chatStoreSrc));
ok("resolve accepts chatSessionId", /resolvePilotSessionContextForFollowUp\([\s\S]*chatSessionId/.test(pilotCtxSrc));
ok("useChat passes sessionId to resolve", /resolvePilotSessionContextForFollowUp\(\s*historyAfterUser,\s*sessionId/.test(useChatSrc));
ok("orchestrator chatSessionId option", /chatSessionId\?: string/.test(orchSrc));

// --- same chat: messages win ---
{
  const messages: Pick<ChatMessage, "sender" | "carCards">[] = [
    { sender: "user" },
    { sender: "ai", carCards: CARD_DATA },
  ];
  const ctx = resolvePilotSessionContextForFollowUp(messages, SESSION_A);
  ok("same chat compare context from messages", ctx?.recentCarCards.length === 3);
  ok("same chat has Vios", ctx?.recentCarCards[0]?.model === "Vios");
}

// --- stale storage from previous chat must be ignored in new chat ---
{
  mockStore.clear();
  saveChatCarContext(STALE_CARDS, SESSION_A);
  setActivePilotChatSessionId(SESSION_B);
  clearPilotChatSessionContext();
  setActivePilotChatSessionId(SESSION_B);

  ok("new chat storage empty after clear", loadChatCarContext(SESSION_B).length === 0);

  const staleStillInA = loadChatCarContext(SESSION_A);
  ok("session A storage cleared on new chat", staleStillInA.length === 0);

  const noMessages: Pick<ChatMessage, "sender" | "carCards">[] = [];
  const ctx = resolvePilotSessionContextForFollowUp(noMessages, SESSION_B);
  ok("new chat no context from stale storage", ctx === undefined);

  const resolved = resolveUserVisibleChatResponse({
    userMessage: COMPARE_SHORT,
    legacyUserVisibleResponse: "legacy",
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: ctx ? { carCardCount: ctx.recentCarCards.length, recentCarCards: ctx.recentCarCards } : { carCardCount: 0 },
  });
  ok("new chat compare no-context copy", resolved.userVisibleText.includes("ยังไม่เห็นชุดรถล่าสุด"));
  ok("new chat no Corolla stale", !resolved.userVisibleText.includes(STALE_COROLLA));
  ok("new chat no Altis stale", !resolved.userVisibleText.includes(STALE_ALTIS));
  ok("new chat no zero cars", assertPilotFollowUpCopySafe(resolved.userVisibleText, 0));
}

// --- orchestrator must not compare from other session storage ---
{
  mockStore.clear();
  saveChatCarContext(STALE_CARDS, SESSION_A);
  setActivePilotChatSessionId(SESSION_B);
  const orch = tryOrchestrateChatReplyCore(COMPARE_SHORT, [], { chatSessionId: SESSION_B });
  ok("orchestrator no compare without session context", orch === null);
}

// --- legacy unscoped sessionStorage ignored ---
{
  mockStore.clear();
  mockStore.set(
    "nonga_chat_last_car_results",
    JSON.stringify({ savedAt: Date.now(), cars: STALE_CARDS })
  );
  setActivePilotChatSessionId(SESSION_B);
  const fromStorage = buildPilotSessionContextFromStorage(SESSION_B);
  ok("legacy unscoped payload ignored", fromStorage === undefined);
}

// --- reset/new chat simulation ---
{
  mockStore.clear();
  saveChatCarContext(CARD_DATA, SESSION_A);
  setActivePilotChatSessionId(SESSION_A);
  ok("session A has cards before reset", loadChatCarContext(SESSION_A).length === 3);

  clearPilotChatSessionContext();
  setActivePilotChatSessionId(SESSION_B);
  ok("after reset new session storage empty", loadChatCarContext(SESSION_B).length === 0);

  const afterReset = resolvePilotSessionContextForFollowUp([], SESSION_B);
  ok("after reset compare resolves no context", afterReset === undefined);
  ok(
    "after reset no-context builder",
    buildPilotFollowUpNoContextCopy().includes("งบ 4 แสน")
  );
}

// --- guards ---
{
  ok("no pilot marker in no-context", assertNoPilotDebugMarker(buildPilotFollowUpNoContextCopy()));
  const guest = resolveUserVisibleChatResponse({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: OTHER_UID,
  });
  ok("guest start-over exact legacy", guest.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
