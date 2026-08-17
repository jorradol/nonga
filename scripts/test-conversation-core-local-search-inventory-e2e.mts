/**
 * WP-V2U-03E2D2C2C2B — Local dormant Search/Inventory end-to-end proof (mock-only).
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-local-search-inventory-e2e.mts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory";
import type { InventoryRepository } from "../src/server/repositories/inventoryRepository";
import {
  CONVERSATION_CORE_POLICY_VERSION,
  type ConversationCoreResult,
  type ConversationTurnRequest,
} from "../src/services/conversation-core/index";
import { ServerAuthError, type ServerAuthContext } from "../src/server/serverAuthContext";
import {
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  CONVERSATION_CORE_LIVE_STAGED_TOOL_NAMES,
  createConversationCoreGeminiAdapter,
  createConversationCoreRuntimeDeps,
  handleConversationCoreTurnPost,
  inspectConversationCoreLiveEnvironmentIdentity,
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV,
  NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV,
  NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV,
  resolveConversationCoreFeatureFlags,
  resolveConversationCoreGeminiConfig,
  resolveConversationCoreLiveServerActivation,
  runConversationCoreOrchestrator,
  type ConversationCoreGeminiToolTransportGenerateContentRequest,
  type ConversationCoreGeminiToolTransportSdkSeam,
  type ConversationCoreOrchestratorActivation,
  type ConversationCoreRouteResponse,
  type ConversationOwnershipVerifier,
} from "../src/server/conversation-core";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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

function assertIncludes(label: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to include ${needle}`);
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

const AUTH_UID = "auth-local-search-inventory-uid";
const CONVERSATION_ID = "conv-local-search-inventory-001";
const SEARCH_MESSAGE_ID = "msg-local-search-001";
const INVENTORY_MESSAGE_ID = "msg-local-inventory-001";
const SEARCH_MESSAGE = "ช่วยหารถเก๋งงบไม่เกิน 400000";
const INVENTORY_MESSAGE = "มีรถอะไรขายบ้าง";
const ALLOWED_MODEL = "gemini-3.5-flash";
const BASE_INSTRUCTION = "Authoritative assistant";
const FAKE_API_KEY = "local-e2e-fake-api-key-not-real";
const SENTINEL_LISTING_ID = "listing-sentinel-camry-387654";
const SENTINEL_TITLE = "Toyota Camry SENTINEL";
const SENTINEL_PRICE = 387654;
const SENTINEL_QUERY = "toyota camry";
const FORGED_LISTING_ID = "listing-forged-not-in-fixture";
const FORGED_PRICE = "9999999";

type ScriptedResponse =
  | { type: "sdk"; value: Record<string, unknown> }
  | { type: "throw"; error: Error };

function createRecordingTransport(
  script: ScriptedResponse | readonly ScriptedResponse[]
): ConversationCoreGeminiToolTransportSdkSeam & {
  requests: ConversationCoreGeminiToolTransportGenerateContentRequest[];
  callCount: number;
} {
  const queue = Array.isArray(script) ? [...script] : [script];
  const requests: ConversationCoreGeminiToolTransportGenerateContentRequest[] = [];
  return {
    requests,
    get callCount() {
      return requests.length;
    },
    async generateContent(request) {
      requests.push(request);
      const next = queue.shift();
      if (!next) {
        throw new Error("unexpected transport call");
      }
      if (next.type === "throw") {
        throw next.error;
      }
      return next.value;
    },
  };
}

function textResponse(text: string): ScriptedResponse {
  return {
    type: "sdk",
    value: {
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
    },
  };
}

function toolPartResponse(input: {
  name: string;
  args?: Record<string, unknown>;
}): ScriptedResponse {
  return {
    type: "sdk",
    value: {
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: input.name, args: input.args ?? {} } }],
          },
          finishReason: "STOP",
        },
      ],
    },
  };
}

function baseRecord(overrides: Partial<MarketplaceCarRecord> = {}): MarketplaceCarRecord {
  return {
    id: SENTINEL_LISTING_ID,
    title: SENTINEL_TITLE,
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: SENTINEL_PRICE,
    type: "used",
    condition: "good",
    mileage: 80000,
    fuelType: "gasoline",
    transmission: "auto",
    images: ["https://example.com/sentinel.jpg"],
    description: "sentinel fixture",
    ownerId: "owner-1",
    ownerName: "Dealer A",
    ownerPhone: "0800000000",
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createFakeInventoryRepository(input: {
  published?: MarketplaceCarRecord[];
  listPublishedThrows?: boolean;
  malformed?: boolean;
} = {}): InventoryRepository & { listPublishedCalls: number } {
  const published = input.malformed
    ? ([{ id: "" }] as unknown as MarketplaceCarRecord[])
    : (input.published ?? [baseRecord()]);
  let listPublishedCalls = 0;
  return {
    backend: "file",
    get listPublishedCalls() {
      return listPublishedCalls;
    },
    listings: {
      async listPublished() {
        listPublishedCalls += 1;
        if (input.listPublishedThrows) {
          throw new Error("listPublished failed");
        }
        return published;
      },
      async listAll() {
        return published;
      },
      async listByDealer() {
        return published;
      },
      async getById(id: string) {
        return published.find((record) => record.id === id) ?? null;
      },
      async createListing(_dealerId, record) {
        return record;
      },
      async updateListing() {
        return null;
      },
      async updateVisibility() {
        return null;
      },
      async deleteListing() {
        return false;
      },
    },
    drafts: {
      async listByDealer() {
        return [];
      },
      async getById() {
        return null;
      },
      async createDraft(_dealerId, record) {
        return record;
      },
      async updateDraft() {
        return null;
      },
      async deleteDraft() {
        return false;
      },
    },
    async publishDraft() {
      return { error: "not-implemented" };
    },
  };
}

function authContext(): ServerAuthContext {
  return {
    uid: AUTH_UID,
    email: "buyer@example.com",
    displayName: "Buyer",
    role: "member",
    status: "active",
    memberships: [],
    provider: "firebase",
    verificationMode: "firebase-admin",
  };
}

function verifiedOwnership(): ConversationOwnershipVerifier {
  return {
    async verify() {
      return { status: "verified", ownerActorRef: AUTH_UID };
    },
  };
}

function turnBody(input: { messageId: string; userMessage: string; extra?: Record<string, unknown> }) {
  return {
    conversationId: CONVERSATION_ID,
    messageId: input.messageId,
    userMessage: input.userMessage,
    history: [{ role: "user", content: "สวัสดีครับ" }],
    ...(input.extra ?? {}),
  };
}

function readyGeminiConfig() {
  return resolveConversationCoreGeminiConfig({
    readEnv: (key) => {
      if (key === NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) return "true";
      if (key === NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV) return ALLOWED_MODEL;
      return undefined;
    },
    apiKeyReady: true,
  });
}

function countingAdapter(counters: { generateCalls: number }) {
  return createConversationCoreGeminiAdapter({
    transport: {
      async generate() {
        counters.generateCalls += 1;
        throw new Error("live text adapter must not be used");
      },
    },
  });
}

function createActivation(input: {
  counters: { generateCalls: number };
  inventory?: InventoryRepository & { listPublishedCalls: number };
  transport?: ConversationCoreGeminiToolTransportSdkSeam & { callCount: number };
  toolsEnabled?: boolean;
  geminiEnabled?: boolean;
  staged?: Array<"marketplace.search" | "inventory.fetch">;
  resolveUnavailable?: boolean;
  resolveThrows?: boolean;
}): {
  activation: ConversationCoreOrchestratorActivation;
  inventory: InventoryRepository & { listPublishedCalls: number };
  transport: ConversationCoreGeminiToolTransportSdkSeam & { callCount: number };
} {
  const inventory = input.inventory ?? createFakeInventoryRepository();
  const transport =
    input.transport ??
    createRecordingTransport([
      toolPartResponse({ name: "marketplace.search", args: { query: SENTINEL_QUERY } }),
      textResponse("พบรถที่เหมาะกับคุณครับ"),
    ]);
  const activation: ConversationCoreOrchestratorActivation = {
    geminiEnabled: input.geminiEnabled ?? true,
    toolsEnabled: input.toolsEnabled ?? true,
    serverStagedToolNames: input.staged ?? ["marketplace.search", "inventory.fetch"],
    baseInstruction: BASE_INSTRUCTION,
    geminiConfig: readyGeminiConfig(),
    adapter: countingAdapter(input.counters),
    resolveRuntimeDeps: (resolverInput) => {
      if (input.resolveThrows) {
        throw new Error("runtime deps boom");
      }
      if (input.resolveUnavailable) {
        return { kind: "unavailable", reasonCode: "sdk-seam-unavailable" };
      }
      return createConversationCoreRuntimeDeps({
        activation: resolverInput.activation,
        inventoryRepository: inventory,
        readEnv: (key: string) => {
          if (key === CONVERSATION_CORE_GEMINI_API_KEY_ENV) return FAKE_API_KEY;
          if (key === NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) return "true";
          if (key === NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV) return ALLOWED_MODEL;
          return undefined;
        },
        createSdkSeam: () => transport,
        mintRequestId: () => "server-req-local-e2e-1",
      });
    },
  };
  return { activation, inventory, transport };
}

async function runDefaultServerPath(input: {
  body: Record<string, unknown>;
  activation?: ConversationCoreOrchestratorActivation;
  env?: Record<string, string | undefined>;
  orchestrator?: (
    request: ConversationTurnRequest,
    context: Parameters<typeof runConversationCoreOrchestrator>[1]
  ) => ReturnType<typeof runConversationCoreOrchestrator>;
}) {
  return handleConversationCoreTurnPost(
    {
      body: input.body,
      resolveAuth: async () => authContext(),
    },
    {
      ownershipVerifier: verifiedOwnership(),
      readEnv: (key) =>
        (input.env ?? {
          [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
          [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: AUTH_UID,
        })[key],
      now: () => 1_700_000_000_000,
      orchestratorActivation: input.activation,
      orchestrator: input.orchestrator,
    }
  );
}

function completedResult(body: ConversationCoreRouteResponse): ConversationCoreResult {
  assertEqual("completed body route", body.route, "completed");
  if (body.route !== "completed") {
    process.exit(1);
  }
  return body.result;
}

function assertFailClosedUnavailable(label: string, status: number, body: unknown): void {
  assertEqual(`${label}: status`, status, 503);
  const routeBody = body as ConversationCoreRouteResponse;
  assertEqual(`${label}: route`, routeBody.route, "honest-unavailable");
  if (routeBody.route === "honest-unavailable") {
    assertEqual(`${label}: code`, routeBody.error.code, "core-not-ready");
  }
  const serialized = JSON.stringify(body);
  assertNotIncludes(`${label}: no secret`, serialized, FAKE_API_KEY);
  assertNotIncludes(`${label}: no forged listing`, serialized, FORGED_LISTING_ID);
}

function assertGroundedFromFixture(label: string, result: ConversationCoreResult, toolName: string): void {
  assertIncludes(`${label}: sentinel listing id`, result.assistantText, SENTINEL_LISTING_ID);
  assertIncludes(`${label}: sentinel price token`, result.assistantText, String(SENTINEL_PRICE));
  assertNotIncludes(`${label}: no forged listing`, result.assistantText, FORGED_LISTING_ID);
  assertNotIncludes(`${label}: no forged price`, result.assistantText, FORGED_PRICE);
  assertNotIncludes(`${label}: no secret`, result.assistantText, FAKE_API_KEY);
  assertEqual(`${label}: workspace actions empty`, result.workspaceActions.length, 0);
  assertTruthy(
    `${label}: listing fact ref`,
    result.groundedFactRefs.some((ref) => ref.kind === "listing" && ref.id === SENTINEL_LISTING_ID)
  );
  assertFalsy(
    `${label}: no forged fact ref`,
    result.groundedFactRefs.some((ref) => ref.id === FORGED_LISTING_ID)
  );
  assertEqual(`${label}: tool name`, result.toolResultsUsed[0]?.toolName, toolName);
  assertEqual(`${label}: tool status`, result.toolResultsUsed[0]?.status, "ok");
}

const orchestratorSource = readFileSync(
  fileURLToPath(new URL("../src/server/conversation-core/conversationCoreOrchestrator.ts", import.meta.url)),
  "utf8"
);
const routeSource = readFileSync(
  fileURLToPath(new URL("../src/server/conversation-core/conversationCoreRouteHandler.ts", import.meta.url)),
  "utf8"
);
const integrationSource = readFileSync(
  fileURLToPath(new URL("../src/server/conversation-core/conversationCoreOrchestratorIntegration.ts", import.meta.url)),
  "utf8"
);

assertTruthy("wiring: orchestrator imports integration", orchestratorSource.includes("conversationCoreOrchestratorIntegration"));
assertFalsy("wiring: route does not import integration", routeSource.includes("conversationCoreOrchestratorIntegration"));
assertFalsy("purity: orchestrator has no process.env", /\bprocess\.env\b/.test(orchestratorSource));
assertFalsy("purity: orchestrator has no fetch", /\bfetch\(/.test(orchestratorSource));
assertFalsy("purity: orchestrator has no live SDK factory", /createConversationCoreGeminiToolTransportSdkSeam\(/.test(orchestratorSource));
assertFalsy("purity: orchestrator has no execution import", /conversationCoreExecutionService/.test(orchestratorSource));
assertFalsy("purity: integration has no process.env", /\bprocess\.env\b/.test(integrationSource));
assertFalsy("purity: route has no live SDK factory", /createConversationCoreGeminiToolTransportSdkSeam\(/.test(routeSource));
assertFalsy("purity: route has no Gemini env", /NONGA_CONVERSATION_CORE_GEMINI_ENABLED/.test(routeSource));
assertTruthy(
  "wiring: route imports live activation module",
  routeSource.includes("conversationCoreLiveServerActivation")
);
assertTruthy(
  "wiring: route imports pilot eligibility module",
  routeSource.includes("conversationCorePilotEligibility")
);
assertFalsy(
  "wiring: registerConversationCoreRoutes does not hardcode gemini on",
  /geminiEnabled:\s*true/.test(routeSource)
);
assertEqual(
  "live staged tools bounded",
  [...CONVERSATION_CORE_LIVE_STAGED_TOOL_NAMES],
  ["marketplace.search", "inventory.fetch"]
);

const defaultFlags = resolveConversationCoreFeatureFlags({ readEnv: () => undefined });
assertFalsy("flags default: core", defaultFlags.coreEnabled);
assertFalsy("flags default: gemini", defaultFlags.featureFlagSnapshot.geminiEnabled);
assertFalsy("flags default: tools", defaultFlags.featureFlagSnapshot.toolsEnabled);
assertFalsy("flags default: workspace", defaultFlags.featureFlagSnapshot.workspaceActionsEnabled);

{
  const flagsExplicit = resolveConversationCoreFeatureFlags({
    readEnv: (key) =>
      ({
        [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
        [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
        [NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV]: "true",
      })[key],
  });
  assertFalsy("03B snapshot still hides gemini", flagsExplicit.featureFlagSnapshot.geminiEnabled);
  assertFalsy("03B snapshot still hides tools", flagsExplicit.featureFlagSnapshot.toolsEnabled);
}

{
  const coreOff = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    env: {},
  });
  assertEqual("core off: 200", coreOff.status, 200);
  assertEqual("core off: legacy-delegate", (coreOff.body as ConversationCoreRouteResponse).route, "legacy-delegate");
}

{
  const counters = { generateCalls: 0 };
  const dormant = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation: createActivation({ counters, toolsEnabled: false }).activation,
  });
  assertFailClosedUnavailable("flags off dormant", dormant.status, dormant.body);
  assertEqual("flags off dormant: no text adapter", counters.generateCalls, 0);
}

{
  const syncResult = runConversationCoreOrchestrator(
    {
      conversationId: CONVERSATION_ID,
      messageId: SEARCH_MESSAGE_ID,
      userMessage: SEARCH_MESSAGE,
      history: [{ role: "user", content: "สวัสดีครับ" }],
    },
    {
      conversationId: CONVERSATION_ID,
      actorScope: { kind: "authenticated", actorRef: AUTH_UID, role: "client" },
      conversationOwnership: { ownerActorRef: AUTH_UID, bindingVerified: true },
      featureFlags: {
        coreEnabled: true,
        geminiEnabled: false,
        toolsEnabled: false,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
      receivedAtMs: 1_700_000_000_000,
      policyVersion: CONVERSATION_CORE_POLICY_VERSION,
    }
  );
  assertFalsy("default orchestrator without activation is sync", syncResult instanceof Promise);
  if (syncResult instanceof Promise) {
    process.exit(1);
  }
  assertEqual("default orchestrator without activation route", syncResult.route, "honest-unavailable");
}

{
  const counters = { generateCalls: 0 };
  const { activation, inventory, transport } = createActivation({
    counters,
    staged: ["marketplace.search", "inventory.fetch"],
    transport: createRecordingTransport([
      toolPartResponse({ name: "marketplace.search", args: { query: SENTINEL_QUERY } }),
      textResponse("พบรถที่เหมาะกับคุณครับ"),
    ]),
  });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
  });
  assertEqual("search e2e: 200", response.status, 200);
  const result = completedResult(response.body as ConversationCoreRouteResponse);
  assertGroundedFromFixture("search e2e", result, "marketplace.search");
  assertIncludes("search e2e: camry token from fixture id", result.assistantText, "camry");
  assertEqual("search e2e: inventory used", inventory.listPublishedCalls >= 1, true);
  assertEqual("search e2e: mock sdk called", transport.callCount >= 1, true);
  assertEqual("search e2e: no live text adapter", counters.generateCalls, 0);
  assertNotIncludes("search e2e: no GEMINI_API_KEY", JSON.stringify(response.body), "GEMINI_API_KEY");
}

{
  const counters = { generateCalls: 0 };
  const { activation, inventory, transport } = createActivation({
    counters,
    staged: ["inventory.fetch"],
    transport: createRecordingTransport([
      toolPartResponse({ name: "inventory.fetch", args: { refresh: true } }),
      textResponse("อัปเดตสต็อกรถแล้วครับ"),
    ]),
  });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: INVENTORY_MESSAGE_ID, userMessage: INVENTORY_MESSAGE }),
    activation,
  });
  assertEqual("inventory e2e: 200", response.status, 200);
  const result = completedResult(response.body as ConversationCoreRouteResponse);
  assertGroundedFromFixture("inventory e2e", result, "inventory.fetch");
  assertEqual("inventory e2e: published inventory used", inventory.listPublishedCalls >= 1, true);
  assertEqual("inventory e2e: mock sdk called", transport.callCount >= 1, true);
  assertEqual("inventory e2e: no live text adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const { activation } = createActivation({
    counters,
    staged: ["inventory.fetch"],
    toolsEnabled: false,
  });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
  });
  assertFailClosedUnavailable("tool disabled", response.status, response.body);
  assertEqual("tool disabled: no text adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const { activation } = createActivation({ counters, resolveUnavailable: true });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
  });
  assertFailClosedUnavailable("runtime deps unavailable", response.status, response.body);
  assertEqual("runtime deps unavailable: no text adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const { activation, inventory } = createActivation({
    counters,
    inventory: createFakeInventoryRepository({ listPublishedThrows: true }),
    transport: createRecordingTransport([
      toolPartResponse({ name: "marketplace.search", args: { query: SENTINEL_QUERY } }),
      textResponse("ไม่ควรตอบจากข้อความนี้"),
    ]),
  });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
  });
  assertFailClosedUnavailable("tool throws", response.status, response.body);
  assertEqual("tool throws: inventory attempted", inventory.listPublishedCalls >= 1, true);
  assertEqual("tool throws: no text adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const { activation } = createActivation({
    counters,
    inventory: createFakeInventoryRepository({ malformed: true }),
    transport: createRecordingTransport([
      toolPartResponse({ name: "marketplace.search", args: { query: SENTINEL_QUERY } }),
      textResponse("ไม่ควรแต่งรถจากผลผิดรูป"),
    ]),
  });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
  });
  assertFailClosedUnavailable("malformed tool output", response.status, response.body);
  assertEqual("malformed tool output: no text adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const { activation } = createActivation({
    counters,
    transport: createRecordingTransport([
      toolPartResponse({ name: "marketplace.search", args: { query: SENTINEL_QUERY } }),
      textResponse(`แนะนำ ${FORGED_LISTING_ID} ราคา ${FORGED_PRICE} บาท`),
    ]),
  });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
  });
  if (response.status === 200) {
    const result = completedResult(response.body as ConversationCoreRouteResponse);
    assertGroundedFromFixture("untrusted follow-up stripped", result, "marketplace.search");
    assertNotIncludes("untrusted follow-up stripped: no forged prose", result.assistantText, FORGED_LISTING_ID);
  } else {
    assertFailClosedUnavailable("untrusted follow-up fail closed", response.status, response.body);
  }
  assertEqual("untrusted follow-up: no text adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const { activation } = createActivation({
    counters,
    staged: ["marketplace.search"],
    transport: createRecordingTransport(textResponse("รถเก๋งน่าใช้หลายคันครับ")),
  });
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
  });
  assertFailClosedUnavailable("authoritative intent no text-only fallback", response.status, response.body);
  assertEqual("authoritative intent no text-only: adapter unused", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const clientForge = await runDefaultServerPath({
    body: turnBody({
      messageId: SEARCH_MESSAGE_ID,
      userMessage: SEARCH_MESSAGE,
      extra: {
        toolAllowlist: ["finance.calculate", "vehicle.resolveSelection"],
        featureFlags: { toolsEnabled: true, geminiEnabled: true },
      },
    }),
    activation: createActivation({ counters }).activation,
  });
  assertEqual("client cannot grant tools: 400", clientForge.status, 400);
  assertEqual("client cannot grant tools: no adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const geminiExtraTool = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation: createActivation({
      counters,
      staged: ["marketplace.search"],
      transport: createRecordingTransport([
        toolPartResponse({ name: "finance.calculate", args: { listingId: SENTINEL_LISTING_ID } }),
        textResponse("ไม่ควรคำนวณไฟแนนซ์"),
      ]),
    }).activation,
  });
  assertFailClosedUnavailable("gemini cannot add tools", geminiExtraTool.status, geminiExtraTool.body);
  assertEqual("gemini cannot add tools: no adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const selection = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: "เอาคันนี้" }),
    activation: createActivation({
      counters,
      staged: ["marketplace.search", "inventory.fetch"],
    }).activation,
  });
  assertFailClosedUnavailable("selection still blocked", selection.status, selection.body);
  assertEqual("selection still blocked: no adapter", counters.generateCalls, 0);
}

{
  const counters = { generateCalls: 0 };
  const finance = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: "คันนี้ผ่อนเดือนละเท่าไหร่" }),
    activation: createActivation({
      counters,
      staged: ["marketplace.search", "inventory.fetch"],
    }).activation,
  });
  assertFailClosedUnavailable("finance still blocked", finance.status, finance.body);
  assertEqual("finance still blocked: no adapter", counters.generateCalls, 0);
}

{
  let injectedCalls = 0;
  const injected = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    orchestrator: () => {
      injectedCalls += 1;
      return {
        route: "honest-unavailable",
        error: { code: "core-not-ready" },
      };
    },
    activation: createActivation({ counters: { generateCalls: 0 } }).activation,
  });
  assertFailClosedUnavailable("injected orchestrator still honored", injected.status, injected.body);
  assertEqual("injected orchestrator still honored: calls", injectedCalls, 1);
}

{
  const promiseResult = runConversationCoreOrchestrator(
    {
      conversationId: CONVERSATION_ID,
      messageId: SEARCH_MESSAGE_ID,
      userMessage: SEARCH_MESSAGE,
      history: [{ role: "user", content: "สวัสดีครับ" }],
    },
    {
      conversationId: CONVERSATION_ID,
      actorScope: { kind: "authenticated", actorRef: AUTH_UID, role: "client" },
      conversationOwnership: { ownerActorRef: AUTH_UID, bindingVerified: true },
      featureFlags: {
        coreEnabled: true,
        geminiEnabled: false,
        toolsEnabled: false,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
      receivedAtMs: 1_700_000_000_000,
      policyVersion: CONVERSATION_CORE_POLICY_VERSION,
    },
    createActivation({ counters: { generateCalls: 0 } }).activation
  );
  assertTruthy("activated orchestrator returns Promise", promiseResult instanceof Promise);
  const resolved = await promiseResult;
  assertTruthy(
    "activated orchestrator settles",
    resolved.route === "completed" || resolved.route === "honest-unavailable"
  );
}

function liveFactoryEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NONGA_RUNTIME_ENV: "local",
    NONGA_DATA_BACKEND: "file",
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
    [NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: AUTH_UID,
    [CONVERSATION_CORE_GEMINI_API_KEY_ENV]: FAKE_API_KEY,
    ...overrides,
  };
}

{
  const identity = inspectConversationCoreLiveEnvironmentIdentity(() => undefined);
  assertEqual("identity missing is blocked", identity.ok, false);
}

{
  const identity = inspectConversationCoreLiveEnvironmentIdentity(
    (key) => liveFactoryEnv({ NONGA_RUNTIME_ENV: "production" })[key]
  );
  assertEqual("identity production is blocked", identity.ok, false);
}

{
  const identity = inspectConversationCoreLiveEnvironmentIdentity((key) => liveFactoryEnv()[key]);
  assertEqual("identity local file is ok", identity.ok, true);
  if (identity.ok) {
    assertEqual("identity local class", identity.identity, "local");
    assertEqual("identity local backend", identity.backend, "file");
    assertEqual("identity local project class", identity.projectClass, "local-file");
  }
}

{
  let createSeamCalls = 0;
  const inactive = resolveConversationCoreLiveServerActivation({
    readEnv: () => undefined,
    createSdkSeam: () => {
      createSeamCalls += 1;
      throw new Error("sdk seam must not be created when flags are off");
    },
    createInventoryRepository: () => {
      throw new Error("inventory must not be created when flags are off");
    },
  });
  assertEqual("live factory flags off: undefined", inactive, undefined);
  assertEqual("live factory flags off: no sdk", createSeamCalls, 0);
}

{
  let createSeamCalls = 0;
  const productionBlocked = resolveConversationCoreLiveServerActivation({
    readEnv: (key) => liveFactoryEnv({ NONGA_RUNTIME_ENV: "production" })[key],
    inventoryRepository: createFakeInventoryRepository(),
    createSdkSeam: () => {
      createSeamCalls += 1;
      throw new Error("sdk seam must not be created in production identity");
    },
  });
  assertEqual("live factory production: undefined", productionBlocked, undefined);
  assertEqual("live factory production: no sdk", createSeamCalls, 0);
}

{
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport([
    toolPartResponse({ name: "marketplace.search", args: { query: SENTINEL_QUERY } }),
    textResponse("พบรถที่เหมาะกับคุณครับ"),
  ]);
  let createSeamCalls = 0;
  const activation = resolveConversationCoreLiveServerActivation({
    readEnv: (key) => liveFactoryEnv()[key],
    inventoryRepository: inventory,
    createSdkSeam: () => {
      createSeamCalls += 1;
      return transport;
    },
  });
  assertTruthy("live factory local ready", Boolean(activation));
  assertEqual("live factory staged tools", [...(activation?.serverStagedToolNames ?? [])], [
    "marketplace.search",
    "inventory.fetch",
  ]);
  assertFalsy(
    "live factory does not stage selection",
    (activation?.serverStagedToolNames ?? []).includes("vehicle.resolveSelection")
  );
  assertFalsy(
    "live factory does not stage finance",
    (activation?.serverStagedToolNames ?? []).includes("finance.calculate")
  );
  const response = await runDefaultServerPath({
    body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
    activation,
    env: liveFactoryEnv(),
  });
  assertEqual("live factory search: 200", response.status, 200);
  const result = completedResult(response.body as ConversationCoreRouteResponse);
  assertGroundedFromFixture("live factory search", result, "marketplace.search");
  assertEqual("live factory search: sdk constructed lazily", createSeamCalls, 1);
}

{
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport([
    toolPartResponse({ name: "marketplace.search", args: { query: SENTINEL_QUERY } }),
    textResponse("พบรถที่เหมาะกับคุณครับ"),
  ]);
  const defaultPath = await handleConversationCoreTurnPost(
    {
      body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
      resolveAuth: async () => authContext(),
    },
    {
      ownershipVerifier: verifiedOwnership(),
      readEnv: (key) => liveFactoryEnv()[key],
      now: () => 1_700_000_000_000,
      inventoryRepository: inventory,
      createSdkSeam: () => transport,
    }
  );
  assertEqual("default route live factory: 200", defaultPath.status, 200);
  const result = completedResult(defaultPath.body as ConversationCoreRouteResponse);
  assertGroundedFromFixture("default route live factory", result, "marketplace.search");
  assertEqual("default route live factory: inventory used", inventory.listPublishedCalls >= 1, true);
  assertEqual("default route live factory: mock sdk called", transport.callCount >= 1, true);
}

{
  const inventory = createFakeInventoryRepository();
  let createSeamCalls = 0;
  const flagsOffPath = await handleConversationCoreTurnPost(
    {
      body: turnBody({ messageId: SEARCH_MESSAGE_ID, userMessage: SEARCH_MESSAGE }),
      resolveAuth: async () => authContext(),
    },
    {
      ownershipVerifier: verifiedOwnership(),
      readEnv: (key) =>
        ({
          [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
          [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: AUTH_UID,
        })[key],
      now: () => 1_700_000_000_000,
      inventoryRepository: inventory,
      createSdkSeam: () => {
        createSeamCalls += 1;
        throw new Error("sdk seam must not run when tools/gemini are off");
      },
    }
  );
  assertFailClosedUnavailable("default route flags off", flagsOffPath.status, flagsOffPath.body);
  assertEqual("default route flags off: no sdk", createSeamCalls, 0);
  assertEqual("default route flags off: no inventory read", inventory.listPublishedCalls, 0);
}

console.log(`\nConversation Core local Search/Inventory e2e tests passed (${passCount} assertions).`);
