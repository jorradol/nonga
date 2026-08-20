/**
 * WP-NVB-02E — Client apply-path tests for V.3 General Bridge.
 * Exercises the same pure helper used by useChat. No network / live Gemini.
 */
import { readFileSync } from "node:fs";
import {
  isClearHighRiskAutomotiveEmergencyMessage,
  parseServerOwnedChatV3GeneralConversationBrain,
  resolveChatV2V3GeneralBridgeClientApply,
} from "../src/services/ai/chat/chatV2V3GeneralBridgeClientApply.ts";
import {
  shouldInvokeAuthenticatedGeneralConversationServerBridge,
  shouldInvokeAuthenticatedVehicleSearchServerBridge,
} from "../src/services/ai/buyerAiFirstConversationPath.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { isPilotBuyerFollowUpMessage } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { buildMockChatReply } from "../src/services/ai/chatMockFallback.ts";
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";

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

const OWNER_HIGH_RISK = "ถ้ารถเบรกจมระหว่างขับ ควรทำอย่างไรครับ";
const EDUCATION = "เบรกคืออะไร และมีหน้าที่อย่างไรครับ";
const SEARCH_MESSAGE = "ช่วยหารถเก๋งงบไม่เกิน 500,000 บาท";
const LEGACY_GENERAL = "ช่วยอธิบายภาษีรถประจำปีคร่าว ๆ หน่อยครับ";
const SAFETY_TEXT =
  "ตั้งสติ ถอนคันเร่ง ประคองทิศทาง เปิดไฟฉุกเฉินเมื่อปลอดภัย และห้ามดับเครื่องขณะรถยังเคลื่อนที่";

const MARKETPLACE_RE = /ในตลาดมีรถจริง|\/api\/cars/;

const mockCars = Array.from({ length: 15 }, (_, i) => ({
  id: `car-${i + 1}`,
  title: `Car ${i + 1}`,
  brand: "Toyota",
  model: "Yaris",
  year: 2018,
  price: 300000,
  createdAt: "2026-01-01T00:00:00.000Z",
  listingStatus: "published" as const,
}));

const useChatSource = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const applySource = readFileSync(
  "src/services/ai/chat/chatV2V3GeneralBridgeClientApply.ts",
  "utf8"
);

type Simulated = {
  branch: string;
  text: string;
  gemini: number;
  mock: number;
  skipGemini?: boolean;
};

function simulateUseChatApply(input: {
  message: string;
  hopStatus: "success" | "failure" | "not-attempted";
  conversationBrain?: unknown;
  conversationBrainStatus?: unknown;
  userVisibleText?: string;
  role?: "admin" | "buyer";
  clientGeminiFails?: boolean;
  isFollowUpPilot?: boolean;
  realProviderNetwork?: boolean;
}): Simulated {
  const signed = {
    isSignedIn: true,
    userMessage: input.message,
    isSellerListingAction: false,
    isSellIntent: false,
  };
  const search = shouldInvokeAuthenticatedVehicleSearchServerBridge(signed);
  if (search) {
    return { branch: "search", text: "search-branch", gemini: 0, mock: 0 };
  }

  const local = tryOrchestrateChatReply(input.message, []);
  const hopPred = shouldInvokeAuthenticatedGeneralConversationServerBridge({
    ...signed,
    userRole: input.role ?? "admin",
  });
  const isFollowUpPilot =
    input.isFollowUpPilot ?? isPilotBuyerFollowUpMessage(input.message);
  const shouldCall =
    hopPred &&
    (Boolean(local?.skipGemini) || (isFollowUpPilot && !local) || !local);

  let gemini = 0;
  let mock = 0;
  const mockText = buildMockChatReply(input.message, mockCars);

  if (!shouldCall || input.hopStatus === "not-attempted") {
    if (local?.skipGemini) {
      return { branch: "local", text: local.text, gemini, mock, skipGemini: true };
    }
    gemini += 1;
    if (input.clientGeminiFails) {
      mock += 1;
      return { branch: "mock", text: mockText, gemini, mock };
    }
    return { branch: "gemini", text: "client-gemini", gemini, mock };
  }

  const decision = resolveChatV2V3GeneralBridgeClientApply({
    userMessage: input.message,
    generalHopAttempted: true,
    hopStatus: input.hopStatus,
    userVisibleText: input.userVisibleText,
    conversationBrain: input.conversationBrain,
    conversationBrainStatus: input.conversationBrainStatus,
    localOrchestrated: local,
    isFollowUpPilot,
    realProviderNetwork: input.realProviderNetwork,
  });

  if (decision.action === "adopt-v3" || decision.action === "high-risk-fail-closed") {
    return {
      branch: decision.action,
      text: decision.text,
      gemini: 0,
      mock: 0,
      skipGemini: true,
    };
  }

  if (local?.skipGemini) {
    return {
      branch: "preserve-local",
      text: local.text,
      gemini,
      mock,
      skipGemini: true,
    };
  }
  if (isFollowUpPilot || input.realProviderNetwork) {
    return {
      branch: "preserve-legacy-adopt",
      text: String(input.userVisibleText ?? ""),
      gemini,
      mock,
      skipGemini: true,
    };
  }
  gemini += 1;
  if (input.clientGeminiFails) {
    mock += 1;
    return { branch: "mock", text: mockText, gemini, mock };
  }
  return { branch: "gemini", text: "client-gemini", gemini, mock };
}

console.log("=== WP-NVB-02E General Bridge Client Apply ===\n");

assertFalsy(
  "1: search predicate false for Owner high-risk",
  shouldInvokeAuthenticatedVehicleSearchServerBridge({
    isSignedIn: true,
    userMessage: OWNER_HIGH_RISK,
  })
);
assertTruthy(
  "4: authenticated general hop true",
  shouldInvokeAuthenticatedGeneralConversationServerBridge({
    isSignedIn: true,
    userRole: "admin",
    userMessage: OWNER_HIGH_RISK,
    isSellerListingAction: false,
    isSellIntent: false,
  })
);
assertEqual(
  "2: local orchestrated null",
  tryOrchestrateChatReply(OWNER_HIGH_RISK, []),
  null
);
assertFalsy(
  "10: not a follow-up",
  isPilotBuyerFollowUpMessage(OWNER_HIGH_RISK)
);
assertTruthy(
  "high-risk detector matches Owner prompt",
  isClearHighRiskAutomotiveEmergencyMessage(OWNER_HIGH_RISK)
);
assertFalsy(
  "education is not clear high-risk emergency",
  isClearHighRiskAutomotiveEmergencyMessage(EDUCATION)
);

const highRiskSuccess = simulateUseChatApply({
  message: OWNER_HIGH_RISK,
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "success",
  userVisibleText: SAFETY_TEXT,
  clientGeminiFails: true,
  realProviderNetwork: false,
});
assertEqual("5-6: branch adopt-v3", highRiskSuccess.branch, "adopt-v3");
assertEqual("6: server safety text wins", highRiskSuccess.text, SAFETY_TEXT);
assertEqual("7: client Gemini count 0", highRiskSuccess.gemini, 0);
assertEqual("8: mock fallback count 0", highRiskSuccess.mock, 0);
assertFalsy("9: Marketplace copy absent", MARKETPLACE_RE.test(highRiskSuccess.text));
assertEqual("11: skipGemini true without realProviderNetwork", highRiskSuccess.skipGemini, true);

const failedClosed = simulateUseChatApply({
  message: OWNER_HIGH_RISK,
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "failed-closed",
  userVisibleText: CHAT_V3_USER_FACING_UNAVAILABLE,
  clientGeminiFails: true,
});
assertEqual("12: failed-closed adopts unavailable", failedClosed.text, CHAT_V3_USER_FACING_UNAVAILABLE);
assertEqual("12b: failed-closed gemini 0", failedClosed.gemini, 0);

const emptySelected = simulateUseChatApply({
  message: OWNER_HIGH_RISK,
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "success",
  userVisibleText: "   ",
  clientGeminiFails: true,
});
assertEqual("13: selected empty text unavailable", emptySelected.text, CHAT_V3_USER_FACING_UNAVAILABLE);
assertEqual("13b: empty selected mock 0", emptySelected.mock, 0);

const malformed = simulateUseChatApply({
  message: OWNER_HIGH_RISK,
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "winner",
  userVisibleText: SAFETY_TEXT,
  clientGeminiFails: true,
});
assertEqual("14: malformed marker is not V.3", malformed.branch, "high-risk-fail-closed");
assertFalsy("14b: malformed never Marketplace", MARKETPLACE_RE.test(malformed.text));
assertEqual("14c: malformed unavailable", malformed.text, CHAT_V3_USER_FACING_UNAVAILABLE);

assertEqual(
  "14d: parse rejects malformed",
  parseServerOwnedChatV3GeneralConversationBrain({
    conversationBrain: "chat-v3-general",
    conversationBrainStatus: "winner",
  }),
  null
);

assertFalsy(
  "15-pre: legacy general is not follow-up",
  isPilotBuyerFollowUpMessage(LEGACY_GENERAL)
);
assertEqual(
  "15-pre: legacy general local null",
  tryOrchestrateChatReply(LEGACY_GENERAL, []),
  null
);

const legacyGeneral = simulateUseChatApply({
  message: LEGACY_GENERAL,
  hopStatus: "success",
  userVisibleText: "legacy-orchestrator-text",
  clientGeminiFails: true,
});
assertEqual("15: legacy without marker does not adopt V.3", legacyGeneral.branch, "mock");
assertTruthy("15b: existing policy may mock when local null", MARKETPLACE_RE.test(legacyGeneral.text));

const nonPilot = simulateUseChatApply({
  message: EDUCATION,
  hopStatus: "success",
  userVisibleText: "legacy-education",
  realProviderNetwork: false,
  clientGeminiFails: true,
});
assertEqual("16: non-pilot without marker preserves local/skipGemini", nonPilot.skipGemini, true);
assertFalsy("16b: education preserve is not Marketplace", MARKETPLACE_RE.test(nonPilot.text));

const transportFail = simulateUseChatApply({
  message: OWNER_HIGH_RISK,
  hopStatus: "failure",
  clientGeminiFails: true,
});
assertEqual("17: high-risk transport unavailable", transportFail.text, CHAT_V3_USER_FACING_UNAVAILABLE);
assertEqual("17b: high-risk transport gemini 0", transportFail.gemini, 0);
assertEqual("18: high-risk transport mock 0", transportFail.mock, 0);
assertFalsy("18b: high-risk transport never Marketplace", MARKETPLACE_RE.test(transportFail.text));

const generalTransport = simulateUseChatApply({
  message: LEGACY_GENERAL,
  hopStatus: "failure",
  clientGeminiFails: true,
});
assertEqual("19: general transport is not high-risk fail-closed", generalTransport.branch, "mock");
assertTruthy("19b: general transport stays on existing mock/Gemini policy", MARKETPLACE_RE.test(generalTransport.text));
assertEqual(
  "19c: helper preserve-existing on general transport",
  resolveChatV2V3GeneralBridgeClientApply({
    userMessage: LEGACY_GENERAL,
    generalHopAttempted: true,
    hopStatus: "failure",
  }).action,
  "preserve-existing"
);

assertTruthy(
  "20: Search predicate still true for Search message",
  shouldInvokeAuthenticatedVehicleSearchServerBridge({
    isSignedIn: true,
    userMessage: SEARCH_MESSAGE,
  })
);
const searchSim = simulateUseChatApply({
  message: SEARCH_MESSAGE,
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "success",
  userVisibleText: SAFETY_TEXT,
});
assertEqual("20b: Search stays on earlier mandatory branch", searchSim.branch, "search");

assertTruthy(
  "21: useChat imports the pure helper",
  useChatSource.includes("resolveChatV2V3GeneralBridgeClientApply")
);
assertTruthy(
  "21b: useChat consumes helper result",
  useChatSource.includes('v3Apply.action === "adopt-v3"') &&
    useChatSource.includes('v3Apply.action === "high-risk-fail-closed"') &&
    useChatSource.includes("v3Apply.text")
);
assertTruthy(
  "20c: Search branch remains earlier than general apply",
  useChatSource.indexOf("if (isMandatoryVehicleSearchBridge)") <
    useChatSource.indexOf("shouldCallUserVisibleBridge")
);

assertFalsy(
  "22: apply helper does not fabricate realProviderNetwork true",
  /realProviderNetwork\s*[:=]\s*true/.test(applySource)
);
assertFalsy(
  "22b: useChat does not fabricate realProviderNetwork true",
  /realProviderNetwork\s*[:=]\s*true/.test(useChatSource)
);
assertFalsy(
  "helper does not import mock fallback",
  applySource.includes("buildMockChatReply") || applySource.includes("fetchMockChatReply")
);

console.log("\n--- WP-NVB-02E-R1: Server-category transport fail-closed ---");

const SERVER_CLEAR_EMERGENCY_PROMPTS: readonly { category: string; message: string }[] = [
  { category: "brake-owner", message: OWNER_HIGH_RISK },
  { category: "brake-sink", message: "เบรกจมขณะขับต้องทำอย่างไร" },
  { category: "brake-no-function", message: "เบรกไม่ทำงานตอนขับรถ ควรทำอย่างไร" },
  { category: "steering-lock", message: "พวงมาลัยล็อกหมุนไม่ได้" },
  { category: "steering-loss", message: "พวงมาลัยควบคุมไม่ได้ขณะขับ" },
  { category: "fire", message: "รถไฟไหม้หน้าทางด่วน" },
  { category: "smoke", message: "มีควันออกจากรถตอนนี้ ควรทำอย่างไร" },
  { category: "overheat", message: "เครื่องร้อนเกินต้องหยุดไหม" },
  { category: "collision", message: "อุบัติเหตุแล้วรถชนพุ่มไม้" },
  { category: "rollover", message: "รถคว่ำแล้วควรทำอย่างไร" },
  { category: "engine-off-in-motion", message: "ดับเครื่องขณะรถยังเคลื่อนที่ รถยังวิ่งอยู่" },
  { category: "stuck-accelerator", message: "คันเร่งค้างขณะขับ ควรทำอย่างไรครับ" },
  { category: "tire-blowout", message: "ยางแตกขณะขับ ควรทำอย่างไรครับ" },
];

function assertTransportFailClosed(category: string, message: string): void {
  assertTruthy(
    `R1 ${category}: detector matches`,
    isClearHighRiskAutomotiveEmergencyMessage(message)
  );
  assertFalsy(
    `R1 ${category}: not Search predicate`,
    shouldInvokeAuthenticatedVehicleSearchServerBridge({
      isSignedIn: true,
      userMessage: message,
    })
  );
  const sim = simulateUseChatApply({
    message,
    hopStatus: "failure",
    clientGeminiFails: true,
  });
  assertEqual(`R1 ${category}: unavailable`, sim.text, CHAT_V3_USER_FACING_UNAVAILABLE);
  assertEqual(`R1 ${category}: branch fail-closed`, sim.branch, "high-risk-fail-closed");
  assertEqual(`R1 ${category}: gemini 0`, sim.gemini, 0);
  assertEqual(`R1 ${category}: mock 0`, sim.mock, 0);
  assertFalsy(`R1 ${category}: Marketplace absent`, MARKETPLACE_RE.test(sim.text));
  assertEqual(
    `R1 ${category}: helper no fake brain`,
    resolveChatV2V3GeneralBridgeClientApply({
      userMessage: message,
      generalHopAttempted: true,
      hopStatus: "failure",
    }).action,
    "high-risk-fail-closed"
  );
}

for (const item of SERVER_CLEAR_EMERGENCY_PROMPTS) {
  assertTransportFailClosed(item.category, item.message);
}

assertFalsy(
  "R1: helper has no Business Tool names",
  /marketplace\.search|inventory\.fetch|finance\.calculate|vehicle\.resolveSelection|functionCall/.test(
    applySource
  )
);
assertFalsy(
  "R1: helper does not import Server lane classifier",
  applySource.includes("classifyConversationCoreLane") ||
    applySource.includes("conversationCoreLaneClassifier")
);

console.log("\n--- WP-NVB-02E-R1: exclusions / not a second router ---");

assertFalsy(
  "R1-N1: เบรกคืออะไร is not emergency",
  isClearHighRiskAutomotiveEmergencyMessage(EDUCATION)
);
assertEqual(
  "R1-N1b: เบรกคืออะไร transport is not fail-closed",
  resolveChatV2V3GeneralBridgeClientApply({
    userMessage: EDUCATION,
    generalHopAttempted: true,
    hopStatus: "failure",
  }).action,
  "preserve-existing"
);

const BRAKE_EDUCATION = "เบรกกับคลัตช์ต่างกันอย่างไร";
assertFalsy(
  "R1-N2: general brake education is not emergency",
  isClearHighRiskAutomotiveEmergencyMessage(BRAKE_EDUCATION)
);

const COMPARISON = "Toyota กับ Honda ต่างกันอย่างไร";
assertFalsy(
  "R1-N3: general automotive comparison is not emergency",
  isClearHighRiskAutomotiveEmergencyMessage(COMPARISON)
);

const NEWS = "ข่าวรถชนเมื่อวานนี้สรุปว่าอย่างไร";
assertFalsy(
  "R1-N4: historical/news wording is not current emergency",
  isClearHighRiskAutomotiveEmergencyMessage(NEWS)
);

const HYPOTHETICAL = "อธิบายหลักการว่าเบรกจมทำงานอย่างไรในทางทฤษฎี";
assertFalsy(
  "R1-N5: hypothetical explanation is not current emergency",
  isClearHighRiskAutomotiveEmergencyMessage(HYPOTHETICAL)
);

const SEARCH_WITH_RISK = "ช่วยหารถเก๋งงบไม่เกิน 500,000 บาท ที่เคยไฟไหม้";
assertTruthy(
  "R1-N6: Search with risk word still Search predicate",
  shouldInvokeAuthenticatedVehicleSearchServerBridge({
    isSignedIn: true,
    userMessage: SEARCH_WITH_RISK,
  })
);
const searchWithRisk = simulateUseChatApply({
  message: SEARCH_WITH_RISK,
  hopStatus: "failure",
  clientGeminiFails: true,
});
assertEqual("R1-N6b: Search stays on earlier branch", searchWithRisk.branch, "search");

const INVENTORY_MESSAGE = "ตอนนี้มีรถอะไรขายบ้าง";
assertFalsy(
  "R1-N7: inventory is not emergency guard",
  isClearHighRiskAutomotiveEmergencyMessage(INVENTORY_MESSAGE)
);
const inventorySearch = shouldInvokeAuthenticatedVehicleSearchServerBridge({
  isSignedIn: true,
  userMessage: INVENTORY_MESSAGE,
});
const inventorySim = simulateUseChatApply({
  message: INVENTORY_MESSAGE,
  hopStatus: "failure",
  clientGeminiFails: true,
});
if (inventorySearch) {
  assertEqual(
    "R1-N7b: inventory stays on earlier Search/Inventory branch",
    inventorySim.branch,
    "search"
  );
} else {
  assertFalsy(
    "R1-N7b: inventory without Search predicate is not fail-closed",
    inventorySim.branch === "high-risk-fail-closed"
  );
}

const fireSuccess = simulateUseChatApply({
  message: "รถไฟไหม้หน้าทางด่วน",
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "success",
  userVisibleText: SAFETY_TEXT,
  clientGeminiFails: true,
});
assertEqual("R1-N8: valid V.3 success marker always wins", fireSuccess.branch, "adopt-v3");
assertEqual("R1-N8b: success text is Server text", fireSuccess.text, SAFETY_TEXT);

const fireFailed = simulateUseChatApply({
  message: "พวงมาลัยล็อกหมุนไม่ได้",
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "failed-closed",
  userVisibleText: CHAT_V3_USER_FACING_UNAVAILABLE,
  clientGeminiFails: true,
});
assertEqual("R1-N9: valid V.3 failed-closed marker always wins", fireFailed.text, CHAT_V3_USER_FACING_UNAVAILABLE);
assertEqual("R1-N9b: failed-closed gemini 0", fireFailed.gemini, 0);

const fireMalformed = simulateUseChatApply({
  message: "เครื่องร้อนเกินต้องหยุดไหม",
  hopStatus: "success",
  conversationBrain: "chat-v3-general",
  conversationBrainStatus: "winner",
  userVisibleText: SAFETY_TEXT,
  clientGeminiFails: true,
});
assertEqual("R1-N10: malformed marker cannot impersonate V.3", fireMalformed.branch, "high-risk-fail-closed");
assertEqual("R1-N10b: malformed uses unavailable", fireMalformed.text, CHAT_V3_USER_FACING_UNAVAILABLE);

assertEqual("R1-N11: Legacy without emergency remains mock policy", legacyGeneral.branch, "mock");
assertEqual("R1-N12: general transport remains existing policy", generalTransport.branch, "mock");

assertFalsy(
  "R1-N13: apply helper still does not fabricate realProviderNetwork true",
  /realProviderNetwork\s*[:=]\s*true/.test(applySource)
);
assertFalsy(
  "R1-N14: R1 helper does not touch memory normalizer",
  applySource.includes("normalizeChatV3UnsupportedDurableMemoryClaims") ||
    applySource.includes("chatV3MemoryClaimNormalizer")
);
assertFalsy(
  "R1-N15: R1 helper has no UI/SVG",
  applySource.includes("ChatV2MessageBubble") || applySource.includes("<svg")
);

console.log(`\n=== ${passCount} passed ===`);
