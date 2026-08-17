/**
 * WP-V2U-04B — Chat V.2 server-side Conversation Core pilot bridge tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-chat-v2-conversation-core-pilot-bridge.mts
 * Mock/deterministic only — no live Gemini or Firestore.
 */
import { readFileSync } from "node:fs";
import type { Request, Response } from "express";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  handleChatUserVisibleOrchestratePost,
  SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE,
  type ChatUserVisibleOrchestrateHandlerDeps,
  type UserVisibleOrchestrationBridgeResult,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatUserVisibleOrchestrateResponse } from "../src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";
import { ServerAuthError, type ServerAuthContext } from "../src/server/serverAuthContext.ts";
import {
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV,
  NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV,
} from "../src/server/conversation-core/index.ts";
import type { ConversationCoreOrchestratorResult } from "../src/server/conversation-core/index.ts";
import type { ConversationCoreResult } from "../src/services/conversation-core/index.ts";
import {
  CHAT_V2_CONVERSATION_CORE_PILOT_UNAVAILABLE_TEXT,
  CHAT_V2_CONVERSATION_CORE_STAGED_TOOL_NAMES,
  executeChatUserVisibleConversationCoreTurn,
  listingIdsFromConversationCoreResult,
  mintChatUserVisibleConversationTurnInput,
  resolveChatUserVisibleConversationCoreRouting,
} from "../src/server/conversation-core/conversationCoreChatUserVisiblePilotBridge.ts";

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

const PILOT_UID = "pilot-uid-chat-v2-04b";
const NON_PILOT_UID = "non-pilot-uid-chat-v2-04b";
const SENTINEL_LISTING_ID = "listing-sentinel-camry-387654";
const SENTINEL_PRICE = 387654;
const SENTINEL_MILEAGE = 80000;
const EXTRA_FIXTURE_LISTING_ID = "listing-fixture-extra-not-in-tool";
const SEARCH_MESSAGE = "ช่วยหารถเก๋งงบไม่เกิน 500,000 บาท";
const INVENTORY_MESSAGE = "ตอนนี้มีรถอะไรขายบ้าง";
const CASUAL_MESSAGE = "สวัสดีครับ";
const SELECTION_MESSAGE = "เอาคันที่ 2";
const FINANCE_MESSAGE = "คันนี้ผ่อนเดือนละเท่าไหร่";
const RECEIVED_AT_MS = 1_700_000_000_000;

const SEARCH_ASSISTANT_TEXT = `พบผลลัพธ์ 1 รายการ: ${SENTINEL_LISTING_ID}`;

function corePilotEnv(overrides: Record<string, string | undefined> = {}): Record<
  string,
  string | undefined
> {
  return {
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: PILOT_UID,
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
    ...overrides,
  };
}

function readEnvFrom(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

function authContext(uid = PILOT_UID): ServerAuthContext {
  return {
    uid,
    email: "redacted@example.test",
    displayName: "Redacted",
    role: "member",
    status: "active",
    memberships: [],
    provider: "firebase",
    verificationMode: "firebase-admin",
  };
}

function sentinelInventoryCar(): ChatInventoryCar {
  return {
    id: SENTINEL_LISTING_ID,
    title: "Toyota Camry SENTINEL",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: SENTINEL_PRICE,
    mileage: SENTINEL_MILEAGE,
    color: "white",
    fuelType: "gasoline",
    transmission: "auto",
    type: "used",
    condition: "good",
    images: ["https://example.com/sentinel.jpg"],
    showroomName: "Dealer A",
    isSold: false,
    listingStatus: "published",
  };
}

function extraFixtureCar(): ChatInventoryCar {
  return {
    id: EXTRA_FIXTURE_LISTING_ID,
    title: "Honda Civic EXTRA",
    brand: "Honda",
    model: "Civic",
    year: 2020,
    price: 9999999,
    mileage: 12000,
    listingStatus: "published",
    isSold: false,
  };
}

function completedSearchResult(): ConversationCoreOrchestratorResult {
  const result: ConversationCoreResult = {
    conversationId: `chat-v2:${PILOT_UID}`,
    messageId: `chat-v2-turn-${RECEIVED_AT_MS}`,
    assistantText: SEARCH_ASSISTANT_TEXT,
    groundedFactRefs: [{ kind: "listing", id: SENTINEL_LISTING_ID }],
    workspaceActions: [],
    safetyOutcome: "pass",
    validatorOutcome: "pass",
    correctionStatus: "none",
    toolResultsUsed: [
      {
        requestId: "req-search-1",
        toolName: "marketplace.search",
        status: "ok",
        provenance: "marketplace-search",
      },
    ],
  };
  return { route: "completed", result };
}

function completedInventoryResult(): ConversationCoreOrchestratorResult {
  const base = completedSearchResult();
  if (base.route !== "completed") {
    return base;
  }
  return {
    route: "completed",
    result: {
      ...base.result,
      toolResultsUsed: [
        {
          requestId: "req-inventory-1",
          toolName: "inventory.fetch",
          status: "ok",
          provenance: "inventory-api",
        },
      ],
    },
  };
}

function unavailableCoreResult(): ConversationCoreOrchestratorResult {
  return {
    route: "honest-unavailable",
    error: { code: "core-not-ready" },
  };
}

function legacyResult(text = "legacy-orchestrator-text"): UserVisibleOrchestrationBridgeResult {
  return {
    orchestrated: {
      text,
      carCards: [],
      skipGemini: false,
    },
    payload: {
      sliceId: "v6.1L.2c",
      userVisibleText: text,
      pilotPathActive: false,
      fallbackToLegacy: true,
      skipGemini: false,
      carCardCount: 0,
    },
  };
}

type CapturedJson = {
  statusCode: number;
  body: unknown;
};

function createMockRes(): Response & { captured: CapturedJson } {
  const captured: CapturedJson = { statusCode: 200, body: undefined };
  const res = {
    captured,
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(body: unknown) {
      captured.body = body;
      return res;
    },
  };
  return res as unknown as Response & { captured: CapturedJson };
}

function createMockReq(body: Record<string, unknown>): Request {
  return { body } as Request;
}

async function runHandler(input: {
  uid?: string;
  body: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  authError?: ServerAuthError;
  runLegacy?: () => UserVisibleOrchestrationBridgeResult;
  runCore?: () => ConversationCoreOrchestratorResult | Promise<ConversationCoreOrchestratorResult>;
  applyRealProvider?: () => Promise<UserVisibleOrchestrationBridgeResult>;
  inventory?: ChatInventoryCar[];
}): Promise<{ statusCode: number; body: unknown; counters: { legacy: number; core: number; realProvider: number } }> {
  const counters = { legacy: 0, core: 0, realProvider: 0 };
  const res = createMockRes();
  await handleChatUserVisibleOrchestratePost(createMockReq(input.body), res, {
    loadChatInventory: async () => input.inventory ?? [sentinelInventoryCar(), extraFixtureCar()],
    readEnv: readEnvFrom(input.env ?? {}),
    now: () => RECEIVED_AT_MS,
    resolveAuth: async () => {
      if (input.authError) {
        throw input.authError;
      }
      return authContext(input.uid);
    },
    runLegacyOrchestration: () => {
      counters.legacy += 1;
      return input.runLegacy?.() ?? legacyResult();
    },
    applyRealProvider: (async (args) => {
      counters.realProvider += 1;
      if (input.applyRealProvider) {
        return input.applyRealProvider();
      }
      return args.bridgeResult;
    }) as ChatUserVisibleOrchestrateHandlerDeps["applyRealProvider"],
    runConversationCore: async (turn) => {
      counters.core += 1;
      assertEqual("core turn userMessage", turn.request.userMessage, String(input.body.userMessage).trim());
      assertEqual("core turn conversation is server-owned", turn.request.conversationId.startsWith("chat-v2:"), true);
      assertEqual("core context toolAllowlist empty", [...turn.context.toolAllowlist], []);
      assertFalsy("core request has no client toolAllowlist", "toolAllowlist" in turn.request);
      return input.runCore?.() ?? completedSearchResult();
    },
  });
  return { statusCode: res.captured.statusCode, body: res.captured.body, counters };
}

function asSuccess(body: unknown): ChatUserVisibleOrchestrateResponse {
  return body as ChatUserVisibleOrchestrateResponse;
}

function assertV2ReadableContract(label: string, body: unknown): void {
  const json = asSuccess(body);
  assertEqual(`${label}: success`, json.success, true);
  assertTruthy(`${label}: data`, Boolean(json.data));
  assertTruthy(`${label}: userVisibleText`, Boolean(json.data?.userVisibleText?.trim()));
  assertEqual(`${label}: carCards array`, Array.isArray(json.data?.carCards), true);
}

const bridgeSource = readFileSync(
  "src/server/conversation-core/conversationCoreChatUserVisiblePilotBridge.ts",
  "utf8"
);
const handlerSource = readFileSync(
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
  "utf8"
);

console.log("=== WP-V2U-04B Chat V.2 Conversation Core Pilot Bridge ===\n");

assertEqual(
  "endpoint path",
  SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE,
  "/api/ai/chat-user-visible-orchestrate"
);
assertTruthy("handler still POST-registers original path", handlerSource.includes("app.post(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE"));
assertTruthy("handler still authenticates via getServerAuthContext", handlerSource.includes("getServerAuthContext"));
assertFalsy("handler does not trust body firebaseUid", handlerSource.includes("body?.firebaseUid"));
assertFalsy("bridge has no fetch", /\bfetch\(/.test(bridgeSource));
assertFalsy("bridge has no process.env", /\bprocess\.env\b/.test(bridgeSource));
assertFalsy("bridge has no Math.random", /Math\.random/.test(bridgeSource));
assertEqual(
  "staged tools are search/inventory only",
  [...CHAT_V2_CONVERSATION_CORE_STAGED_TOOL_NAMES],
  ["marketplace.search", "inventory.fetch"]
);
assertFalsy(
  "staged tools exclude selection",
  CHAT_V2_CONVERSATION_CORE_STAGED_TOOL_NAMES.includes("vehicle.resolveSelection" as never)
);
assertFalsy(
  "staged tools exclude finance",
  CHAT_V2_CONVERSATION_CORE_STAGED_TOOL_NAMES.includes("finance.calculate" as never)
);

{
  const routing = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: NON_PILOT_UID,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv()),
  });
  assertEqual("routing: non-pilot search is legacy", routing.kind, "legacy");
}

{
  const routing = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv({ [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "false" })),
  });
  assertEqual("routing: flags off is legacy", routing.kind, "legacy");
}

{
  const routing = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" })),
  });
  assertEqual("routing: kill switch is legacy", routing.kind, "legacy");
}

{
  const routing = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv({ [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: "" })),
  });
  assertEqual("routing: empty allowlist is legacy", routing.kind, "legacy");
}

{
  const routing = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: CASUAL_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv()),
  });
  assertEqual("routing: pilot casual is legacy", routing.kind, "legacy");
}

{
  const routing = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: SEARCH_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv()),
  });
  assertEqual("routing: pilot search is core", routing.kind, "conversation-core");
  if (routing.kind === "conversation-core") {
    assertEqual("routing: pilot search tool", routing.toolName, "marketplace.search");
  }
}

{
  const routing = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: INVENTORY_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv()),
  });
  assertEqual("routing: pilot inventory is core", routing.kind, "conversation-core");
  if (routing.kind === "conversation-core") {
    assertEqual("routing: pilot inventory tool", routing.toolName, "inventory.fetch");
  }
}

{
  const selection = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: SELECTION_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv()),
  });
  assertEqual("routing: pilot selection is legacy", selection.kind, "legacy");
  const finance = resolveChatUserVisibleConversationCoreRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: FINANCE_MESSAGE,
    readEnv: readEnvFrom(corePilotEnv()),
  });
  assertEqual("routing: pilot finance is legacy", finance.kind, "legacy");
}

{
  const minted = mintChatUserVisibleConversationTurnInput({
    authenticatedActorRef: PILOT_UID,
    authRole: "member",
    userMessage: SEARCH_MESSAGE,
    receivedAtMs: RECEIVED_AT_MS,
  });
  assertTruthy("adapter: minted turn", Boolean(minted));
  assertEqual("adapter: conversation id is server canonical", minted?.request.conversationId, `chat-v2:${PILOT_UID}`);
  assertEqual("adapter: context actor is auth uid", minted?.context.actorScope.actorRef, PILOT_UID);
  assertEqual("adapter: toolAllowlist empty", [...(minted?.context.toolAllowlist ?? ["x"])], []);
  assertEqual("adapter: workspace actions disabled", minted?.context.featureFlags.workspaceActionsEnabled, false);
}

{
  const nonPilot = await runHandler({
    uid: NON_PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv(),
  });
  assertEqual("1: non-pilot status", nonPilot.statusCode, 200);
  assertEqual("1: non-pilot legacy once", nonPilot.counters.legacy, 1);
  assertEqual("1: non-pilot core never", nonPilot.counters.core, 0);
  assertV2ReadableContract("1: non-pilot", nonPilot.body);
}

{
  const flagsOff = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv({ [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "false" }),
  });
  assertEqual("2: flags off legacy once", flagsOff.counters.legacy, 1);
  assertEqual("2: flags off core never", flagsOff.counters.core, 0);
}

{
  const kill = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" }),
  });
  assertEqual("3: kill switch legacy once", kill.counters.legacy, 1);
  assertEqual("3: kill switch core never", kill.counters.core, 0);
}

{
  const casual = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: CASUAL_MESSAGE },
    env: corePilotEnv(),
  });
  assertEqual("4: pilot casual legacy once", casual.counters.legacy, 1);
  assertEqual("4: pilot casual core never", casual.counters.core, 0);
}

{
  const search = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv(),
    runCore: () => completedSearchResult(),
  });
  assertEqual("5: pilot search core once", search.counters.core, 1);
  assertEqual("5: pilot search legacy never", search.counters.legacy, 0);
  assertEqual("5: pilot search no real provider", search.counters.realProvider, 0);
  const json = asSuccess(search.body);
  assertEqual("5: search text", json.data?.userVisibleText, SEARCH_ASSISTANT_TEXT);
  assertEqual("5: search card count", json.data?.carCards?.length, 1);
  assertEqual("5: search listing id", json.data?.carCards?.[0]?.id, SENTINEL_LISTING_ID);
  assertEqual("5: search price matches tool/fixture", json.data?.carCards?.[0]?.price, SENTINEL_PRICE);
  assertEqual("5: search mileage matches tool/fixture", json.data?.carCards?.[0]?.mileage, SENTINEL_MILEAGE);
  assertFalsy(
    "5: search no extra fixture listing",
    (json.data?.carCards ?? []).some((card) => card.id === EXTRA_FIXTURE_LISTING_ID)
  );
  assertV2ReadableContract("5: search", search.body);
}

{
  const inventory = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: INVENTORY_MESSAGE },
    env: corePilotEnv(),
    runCore: () => completedInventoryResult(),
  });
  assertEqual("6: pilot inventory core once", inventory.counters.core, 1);
  assertEqual("6: pilot inventory legacy never", inventory.counters.legacy, 0);
  assertEqual("6: inventory listing id", asSuccess(inventory.body).data?.carCards?.[0]?.id, SENTINEL_LISTING_ID);
}

{
  const selection = await runHandler({
    uid: PILOT_UID,
    body: {
      userMessage: SELECTION_MESSAGE,
      toolAllowlist: ["vehicle.resolveSelection", "finance.calculate"],
    },
    env: corePilotEnv(),
  });
  assertEqual("7: selection stays legacy", selection.counters.legacy, 1);
  assertEqual("7: selection does not call core", selection.counters.core, 0);
  const finance = await runHandler({
    uid: PILOT_UID,
    body: {
      userMessage: FINANCE_MESSAGE,
      toolAllowlist: ["finance.calculate"],
    },
    env: corePilotEnv(),
  });
  assertEqual("7: finance stays legacy", finance.counters.legacy, 1);
  assertEqual("7: finance does not call core", finance.counters.core, 0);
}

{
  const forged = await runHandler({
    uid: NON_PILOT_UID,
    body: {
      userMessage: SEARCH_MESSAGE,
      firebaseUid: PILOT_UID,
      uid: PILOT_UID,
      email: "forged@example.test",
      flags: { coreEnabled: true, geminiEnabled: true, toolsEnabled: true },
      featureFlags: { coreEnabled: true },
      toolAllowlist: ["marketplace.search", "finance.calculate"],
      [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: PILOT_UID,
    },
    env: corePilotEnv(),
  });
  assertEqual("8: forged identity stays legacy", forged.counters.legacy, 1);
  assertEqual("8: forged identity does not call core", forged.counters.core, 0);
}

{
  const forgedFlags = await runHandler({
    uid: PILOT_UID,
    body: {
      userMessage: SEARCH_MESSAGE,
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: true,
      [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
    },
    env: corePilotEnv({ [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "false" }),
  });
  assertEqual("8: forged flags cannot enable core", forgedFlags.counters.legacy, 1);
  assertEqual("8: forged flags core never", forgedFlags.counters.core, 0);
}

{
  const failed = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv(),
    runCore: () => unavailableCoreResult(),
  });
  assertEqual("9: core failure core once", failed.counters.core, 1);
  assertEqual("9: core failure legacy never", failed.counters.legacy, 0);
  assertEqual("9: core failure no real provider", failed.counters.realProvider, 0);
  const json = asSuccess(failed.body);
  assertEqual("9: fail closed text", json.data?.userVisibleText, CHAT_V2_CONVERSATION_CORE_PILOT_UNAVAILABLE_TEXT);
  assertEqual("9: fail closed no cards", json.data?.carCards?.length, 0);
  assertEqual("9: fail closed not legacy fallback", json.data?.fallbackToLegacy, false);
  assertV2ReadableContract("9: fail closed", failed.body);
}

{
  const thrown = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv(),
    runCore: async () => {
      throw new Error("tool transport failed");
    },
  });
  assertEqual("9b: thrown core once", thrown.counters.core, 1);
  assertEqual("9b: thrown legacy never", thrown.counters.legacy, 0);
  assertEqual(
    "9b: thrown fail closed text",
    asSuccess(thrown.body).data?.userVisibleText,
    CHAT_V2_CONVERSATION_CORE_PILOT_UNAVAILABLE_TEXT
  );
}

{
  const mapped = await executeChatUserVisibleConversationCoreTurn({
    authenticatedActorRef: PILOT_UID,
    authRole: "member",
    userMessage: SEARCH_MESSAGE,
    inventory: [sentinelInventoryCar(), extraFixtureCar()],
    readEnv: readEnvFrom(corePilotEnv()),
    receivedAtMs: RECEIVED_AT_MS,
    runConversationCore: async () => completedSearchResult(),
  });
  assertEqual("10: mapped kind", mapped.kind, "completed");
  if (mapped.kind === "completed") {
    assertEqual("10: mapped listing id", mapped.carCards[0]?.id, SENTINEL_LISTING_ID);
    assertEqual("10: mapped price", mapped.carCards[0]?.price, SENTINEL_PRICE);
    assertEqual("10: mapped mileage", mapped.carCards[0]?.mileage, SENTINEL_MILEAGE);
    assertEqual("10: mapped sold status stays unpublished-false", mapped.carCards.length, 1);
    assertEqual(
      "11: no extra fixture listing",
      mapped.carCards.some((card) => card.id === EXTRA_FIXTURE_LISTING_ID),
      false
    );
  }
  const ids = listingIdsFromConversationCoreResult(
    (completedSearchResult() as { route: "completed"; result: ConversationCoreResult }).result
  );
  assertEqual("10: grounded listing ids", ids, [SENTINEL_LISTING_ID]);
}

{
  const missingListing = await executeChatUserVisibleConversationCoreTurn({
    authenticatedActorRef: PILOT_UID,
    authRole: "member",
    userMessage: SEARCH_MESSAGE,
    inventory: [extraFixtureCar()],
    readEnv: readEnvFrom(corePilotEnv()),
    receivedAtMs: RECEIVED_AT_MS,
    runConversationCore: async () => completedSearchResult(),
  });
  assertEqual("10b: unmapped listing fail closed", missingListing.kind, "unavailable");
}

{
  const search = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv(),
    runCore: () => completedSearchResult(),
  });
  const json = asSuccess(search.body);
  const card = json.data?.carCards?.[0];
  assertTruthy("12: card id", Boolean(card?.id));
  assertTruthy("12: card brand", Boolean(card?.brand));
  assertTruthy("12: card model", Boolean(card?.model));
  assertEqual("12: card year number", typeof card?.year, "number");
  assertEqual("12: card price number", typeof card?.price, "number");
  assertEqual("12: card mileage number", typeof card?.mileage, "number");
  assertEqual("12: card hasImage boolean", typeof card?.hasImage, "boolean");
  assertTruthy("12: card detailPath", Boolean(card?.detailPath));
  assertTruthy("12: card matchKind", Boolean(card?.matchKind));
  assertFalsy("12: no html in assistant text", /<[a-z]/i.test(json.data?.userVisibleText ?? ""));
}

{
  const unauth = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: SEARCH_MESSAGE },
    env: corePilotEnv(),
    authError: new ServerAuthError(401, "Authentication required"),
  });
  assertEqual("13: auth failure status", unauth.statusCode, 401);
  assertEqual(
    "13: auth failure body",
    unauth.body,
    { success: false, message: "Authentication required" }
  );
  assertEqual("13: auth failure no core", unauth.counters.core, 0);
  assertEqual("13: auth failure no legacy", unauth.counters.legacy, 0);
}

{
  const missing = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: "   " },
    env: corePilotEnv(),
  });
  assertEqual("13b: empty message 400", missing.statusCode, 400);
  assertEqual("13b: empty message no core", missing.counters.core, 0);
}

{
  const methodSource = readFileSync("src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts", "utf8");
  assertTruthy(
    "14: POST method preserved",
    /app\.post\(\s*SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE/.test(methodSource)
  );
  assertEqual(
    "14: path constant preserved",
    SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE,
    "/api/ai/chat-user-visible-orchestrate"
  );
}

console.log(`\nChat V.2 Conversation Core pilot bridge tests passed (${passCount} assertions).`);
