/**
 * WP-NVB-03B — Client apply-path tests for Search Grounding.
 * Exercises the same pure helper used by useChat. No network / live Gemini.
 */
import { readFileSync } from "node:fs";
import {
  CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
  parseServerOwnedChatV3SearchGroundedConversationBrain,
  resolveChatV2V3SearchGroundingClientApply,
} from "../src/services/ai/chat/chatV2V3SearchGroundingClientApply.ts";
import { parseServerOwnedChatV3GeneralConversationBrain } from "../src/services/ai/chat/chatV2V3GeneralBridgeClientApply.ts";
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";
import type { ChatCarCardData } from "../src/types.ts";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(
      `FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
  pass(label);
}

function assertTruthy(label: string, value: unknown): void {
  if (!value) {
    console.error(`FAIL [${label}] expected truthy`);
    process.exit(1);
  }
  pass(label);
}

function assertFalsy(label: string, value: unknown): void {
  if (value) {
    console.error(`FAIL [${label}] expected falsy`);
    process.exit(1);
  }
  pass(label);
}

const SEARCH_CARDS: ChatCarCardData[] = [
  {
    id: "toyota-sedan-01",
    brand: "Toyota",
    model: "Altis",
    year: 2018,
    price: 450000,
    mileage: 80000,
    bodyClass: "sedan",
    bodyClassLabel: "Sedan",
    hasImage: false,
    detailPath: "/cars/toyota-sedan-01",
    matchKind: "exact",
  },
];

const LOCAL_LEGACY_CARDS: ChatCarCardData[] = [
  {
    id: "legacy-card-99",
    brand: "Honda",
    model: "Civic",
    year: 2017,
    price: 399000,
    mileage: 90000,
    bodyClass: "sedan",
    bodyClassLabel: "Sedan",
    hasImage: false,
    detailPath: "/cars/legacy-card-99",
    matchKind: "exact",
  },
];

const useChatSource = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const clientSource = readFileSync(
  "src/services/ai/chat/chatUserVisibleOrchestrateClient.ts",
  "utf8"
);
const applySource = readFileSync(
  "src/services/ai/chat/chatV2V3SearchGroundingClientApply.ts",
  "utf8"
);

console.log("=== WP-NVB-03B Search Grounding client apply ===\n");

assertEqual(
  "parse: exact search marker",
  parseServerOwnedChatV3SearchGroundedConversationBrain({
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "success",
  })?.conversationBrain,
  CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN
);

assertFalsy(
  "parse: general marker is not search",
  parseServerOwnedChatV3SearchGroundedConversationBrain({
    conversationBrain: "chat-v3-general",
    conversationBrainStatus: "success",
  })
);

assertFalsy(
  "parse: search marker is not general",
  parseServerOwnedChatV3GeneralConversationBrain({
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "success",
  })
);

assertEqual(
  "apply: hop not attempted preserves existing",
  resolveChatV2V3SearchGroundingClientApply({
    searchHopAttempted: false,
    hopStatus: "success",
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "success",
    userVisibleText: "search-text",
    carCards: SEARCH_CARDS,
  }).action,
  "preserve-existing"
);

{
  const adopted = resolveChatV2V3SearchGroundingClientApply({
    searchHopAttempted: true,
    hopStatus: "success",
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "success",
    userVisibleText: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 1 คันในรอบนี้ครับ",
    carCards: SEARCH_CARDS,
    hasMoreCars: false,
    localOrchestrated: {
      text: "local-legacy-text",
      carCards: LOCAL_LEGACY_CARDS,
    },
  });
  assertEqual("apply: adopt-search", adopted.action, "adopt-search");
  if (adopted.action === "adopt-search") {
    assertEqual("apply: server text", adopted.text, "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 1 คันในรอบนี้ครับ");
    assertEqual("apply: server cards only", adopted.carCards.map((card) => card.id), [
      "toyota-sedan-01",
    ]);
    assertFalsy(
      "apply: never merge legacy cards",
      adopted.carCards.some((card) => card.id === "legacy-card-99")
    );
    assertEqual("apply: stop legacy merge", adopted.stopLegacyMerge, true);
    assertEqual("apply: skip gemini", adopted.skipGemini, true);
    assertEqual("apply: hasMoreCars false", adopted.hasMoreCars, false);
  }
}

{
  const orderedCards: ChatCarCardData[] = [
    { ...SEARCH_CARDS[0], id: "idC", detailPath: "/cars/idC", model: "Vios" },
    { ...SEARCH_CARDS[0], id: "idA", detailPath: "/cars/idA", model: "Altis" },
    { ...SEARCH_CARDS[0], id: "idB", detailPath: "/cars/idB", model: "Yaris" },
    { ...SEARCH_CARDS[0], id: "idD", detailPath: "/cars/idD", model: "Camry" },
  ];
  const adopted = resolveChatV2V3SearchGroundingClientApply({
    searchHopAttempted: true,
    hopStatus: "success",
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "success",
    userVisibleText: "structured-order-text",
    carCards: orderedCards,
    hasMoreCars: false,
    localOrchestrated: {
      text: "local-legacy-text",
      carCards: LOCAL_LEGACY_CARDS,
    },
  });
  assertEqual("apply: path-c adopt-search", adopted.action, "adopt-search");
  if (adopted.action === "adopt-search") {
    assertEqual(
      "apply: preserves received non-toolresult order",
      adopted.carCards.map((card) => card.id),
      ["idC", "idA", "idB", "idD"]
    );
    assertEqual("apply: path-c stop legacy merge", adopted.stopLegacyMerge, true);
    assertEqual("apply: preserves four-card array", adopted.carCards.length, 4);
  }
}

{
  const empty = resolveChatV2V3SearchGroundingClientApply({
    searchHopAttempted: true,
    hopStatus: "success",
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "success",
    userVisibleText: "ไม่พบรถที่ตรงตามเงื่อนไขที่ระบุในรอบนี้ครับ",
    carCards: [],
    hasMoreCars: false,
    localOrchestrated: { text: "legacy", carCards: LOCAL_LEGACY_CARDS },
  });
  assertEqual("apply: zero-result still adopt-search", empty.action, "adopt-search");
  if (empty.action === "adopt-search") {
    assertEqual("apply: zero-result no cards", empty.carCards, []);
  }
}

{
  const failed = resolveChatV2V3SearchGroundingClientApply({
    searchHopAttempted: true,
    hopStatus: "failure",
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "failed-closed",
    localOrchestrated: { text: "legacy", carCards: LOCAL_LEGACY_CARDS },
  });
  assertEqual("apply: hop failure fail-closed", failed.action, "fail-closed");
  if (failed.action === "fail-closed") {
    assertEqual("apply: unavailable text", failed.text, CHAT_V3_USER_FACING_UNAVAILABLE);
    assertEqual("apply: no cards", failed.carCards, []);
    assertFalsy("apply: no-match wording on tool failure", failed.text.includes("ไม่พบรถ"));
  }
}

{
  const missingCards = resolveChatV2V3SearchGroundingClientApply({
    searchHopAttempted: true,
    hopStatus: "success",
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: "success",
    userVisibleText: "search-text",
    carCards: undefined,
  });
  assertEqual("apply: missing cards fail-closed", missingCards.action, "fail-closed");
}

{
  const noMarker = resolveChatV2V3SearchGroundingClientApply({
    searchHopAttempted: true,
    hopStatus: "success",
    conversationBrain: "chat-v3-general",
    conversationBrainStatus: "success",
    userVisibleText: "general-text",
    carCards: SEARCH_CARDS,
  });
  assertEqual("apply: general marker preserved for other path", noMarker.action, "preserve-existing");
}

assertTruthy(
  "useChat: search apply helper wired",
  useChatSource.includes("resolveChatV2V3SearchGroundingClientApply")
);
assertTruthy(
  "useChat: adopt-search branch",
  useChatSource.includes('searchApply.action === "adopt-search"')
);
assertFalsy(
  "client: no search appendix field",
  /searchGroundingAppendix/.test(clientSource)
);
assertFalsy(
  "client: no systemInstruction send",
  /systemInstruction/.test(clientSource)
);
assertFalsy(
  "client request body does not send conversationBrain",
  /conversationBrain/.test(
    clientSource.slice(
      clientSource.indexOf("function buildOrchestrateRequestBody"),
      clientSource.indexOf("return body;")
    )
  )
);
assertFalsy(
  "apply: no UID allowlist",
  applySource.includes("NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS")
);
assertFalsy(
  "useChat: no search UID allowlist",
  useChatSource.includes("NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS")
);

console.log(`\nWP-NVB-03B client tests passed: ${passCount}`);
