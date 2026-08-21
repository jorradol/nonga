/**
 * WP-NVB-03B — Isolation and regression guards for Search Grounding.
 * No live Gemini, Firebase, Hosting, or network.
 */
import { readFileSync } from "node:fs";
import {
  NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV,
  NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS_ENV,
  resolveChatV2V3SearchGroundingRouting,
} from "../src/services/ai/chat/chatV2V3SearchGroundingBridge.ts";
import {
  NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV,
  NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV,
  resolveChatV2V3GeneralBridgeRouting,
} from "../src/services/ai/chat/chatV2V3GeneralConversationBridge.ts";
import { CHAT_V3_GENERAL_CONVERSATION_BRAIN } from "../src/services/ai/chat/chatV2V3GeneralBridgeClientApply.ts";
import { CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN } from "../src/services/ai/chat/chatV2V3SearchGroundingClientApply.ts";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV,
  NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV,
} from "../src/server/conversation-core/index.ts";

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

function assertNotIncludes(label: string, haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    console.error(`FAIL [${label}] must not include ${needle}`);
    process.exit(1);
  }
  pass(label);
}

const SEARCH_PILOT = "pilot-uid-nvb03b-search";
const GENERAL_PILOT = "pilot-uid-nvb01-general-bridge";
const SEARCH_MESSAGE = "ช่วยหารถเก๋ง Toyota เกียร์ออโต้ ราคาไม่เกิน 500,000 บาท";
const GENERAL_MESSAGE = "สวัสดีครับ รถไฟฟ้ากับรถน้ำมัน ใช้ต่างกันยังไง";
const INVENTORY_MESSAGE = "ตอนนี้มีรถอะไรขายบ้าง";
const SELL_MESSAGE = "อยากลงประกาศขายรถ";

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV]: "true",
    [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS_ENV]: SEARCH_PILOT,
    [NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV]: "true",
    [NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV]: GENERAL_PILOT,
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "false",
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "false",
    [NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV]: "false",
    [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: "",
    ...overrides,
  };
}

function readEnv(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

const files = {
  criteria: readFileSync("src/services/ai/chat/chatV2V3SearchGroundingCriteria.ts", "utf8"),
  match: readFileSync("src/services/ai/chat/chatV2V3SearchGroundingMatch.ts", "utf8"),
  compose: readFileSync("src/services/ai/chat/chatV2V3SearchGroundingCompose.ts", "utf8"),
  bridge: readFileSync("src/services/ai/chat/chatV2V3SearchGroundingBridge.ts", "utf8"),
  apply: readFileSync("src/services/ai/chat/chatV2V3SearchGroundingClientApply.ts", "utf8"),
  server: readFileSync(
    "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
    "utf8"
  ),
  useChat: readFileSync("src/hooks/chat/useChat.ts", "utf8"),
  client: readFileSync("src/services/ai/chat/chatUserVisibleOrchestrateClient.ts", "utf8"),
  v3Service: readFileSync("src/services/ai/chat-v3/chatV3ConversationService.ts", "utf8"),
  v3Instruction: readFileSync("src/services/ai/chat-v3/chatV3SystemInstruction.ts", "utf8"),
  envelope: readFileSync("src/services/conversation-core/toolEnvelope.ts", "utf8"),
};

const selectedPath = [
  files.criteria,
  files.match,
  files.compose,
  files.bridge,
  files.apply,
].join("\n");

console.log("=== WP-NVB-03B Search Grounding regressions ===\n");

assertEqual(
  "markers are distinct",
  new Set([
    CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    CHAT_V3_GENERAL_CONVERSATION_BRAIN,
  ]).size,
  2
);

assertFalsy(
  "flags default off in source (no true literal assignment)",
  /NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED.*=\s*"true"/.test(files.bridge)
);

assertEqual(
  "guest unauthenticated not selected",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: "",
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "not-selected"
);

assertEqual(
  "non-pilot search not selected",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: "someone-else",
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "not-selected"
);

assertEqual(
  "owner search pilot selected",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: SEARCH_PILOT,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "selected"
);

assertEqual(
  "inventory not selected for search path",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: SEARCH_PILOT,
    userMessage: INVENTORY_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "not-selected"
);

assertEqual(
  "general not selected for search path",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: SEARCH_PILOT,
    userMessage: GENERAL_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "not-selected"
);

assertEqual(
  "sell/posting not selected",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: SEARCH_PILOT,
    userMessage: SELL_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "not-selected"
);

assertEqual(
  "general conversation still selected for general pilot",
  resolveChatV2V3GeneralBridgeRouting({
    authenticatedActorRef: GENERAL_PILOT,
    userMessage: GENERAL_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "selected"
);

assertEqual(
  "search message not selected on general path",
  resolveChatV2V3GeneralBridgeRouting({
    authenticatedActorRef: GENERAL_PILOT,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnv(env()),
  }).kind,
  "not-selected"
);

assertEqual(
  "empty search allowlist not selected",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: SEARCH_PILOT,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnv(env({ [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS_ENV]: "" })),
  }).kind,
  "not-selected"
);

assertEqual(
  "kill switch fail-closed when otherwise selected",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: SEARCH_PILOT,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnv(env({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" })),
  }).kind,
  "kill-switch-fail-closed"
);

const forbidden = [
  "marketplaceSearchToolAdapter",
  "vehicleDiscoveryIndex",
  "from \"./vehicleDiscovery\"",
  "from \"./vehicleDiscovery.ts\"",
  "generateStructuredInitialTurn",
  "runConversationCoreGroundedToolTurnCoordinator",
  "runConversationCoreOrchestrator",
  "runConversationCoreExecutionService",
  "tryOrchestrateChatReplyCore",
  "orchestrateUserVisibleChatForTrustedAuth",
  "maybeApplyUserVisibleRealProvider",
  "runMarketplaceChatSearch",
  "runVehicleDiscovery",
];

for (const needle of forbidden) {
  assertNotIncludes(`selected-path forbids ${needle}`, selectedPath, needle);
}

assertTruthy(
  "server checks search routing before core",
  files.server.indexOf("resolveChatV2V3SearchGroundingRouting") <
    files.server.indexOf("coreRouting.kind === \"conversation-core\"")
);
assertTruthy(
  "server uses search-grounded marker",
  files.server.includes("CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN")
);
assertTruthy(
  "V.3 appendix option exists",
  files.v3Instruction.includes("searchGroundingAppendix")
);
assertTruthy(
  "V.3 composition skips second generate",
  files.v3Service.includes("searchGroundingComposition")
);
assertTruthy(
  "empty marketplace listingIds allowed",
  files.envelope.includes("allowEmpty: true")
);
assertNotIncludes("match does not execute inventory.fetch", files.match, "inventory.fetch");
assertNotIncludes("client does not send appendix", files.client, "searchGroundingAppendix");
assertNotIncludes("no real UID in search modules", selectedPath, "firebaseUid:");
assertNotIncludes("no GEMINI_API_KEY in search modules", selectedPath, "GEMINI_API_KEY");

const generalBridgeSrc = readFileSync(
  "src/services/ai/chat/chatV2V3GeneralConversationBridge.ts",
  "utf8"
);
assertNotIncludes(
  "General bridge does not request Search composition",
  generalBridgeSrc,
  "searchGroundingComposition"
);
assertNotIncludes(
  "General bridge does not attach Search JSON schema",
  generalBridgeSrc,
  "SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA"
);
assertTruthy(
  "V.3 Search schema is gated on searchGroundingComposition",
  files.v3Service.includes("searchGroundingComposition") &&
    files.v3Service.includes("SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA")
);
assertTruthy(
  "Search schema uses vehicleAnalyses not replyText",
  files.compose.includes("vehicleAnalyses") &&
    files.compose.includes("introText") &&
    !files.compose.includes("finalAnswerTh")
);
assertNotIncludes(
  "unreachable canonical-toolresult-degraded classification removed",
  files.compose,
  "canonical-toolresult-degraded"
);

console.log(`\nWP-NVB-03B regression guards passed: ${passCount}`);
