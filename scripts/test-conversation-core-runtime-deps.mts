/**
 * WP-V2U-03E2D2C2B — Lazy runtime dependencies factory mock-only tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-runtime-deps.mts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory";
import type { InventoryRepository } from "../src/server/repositories/inventoryRepository";
import {
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS,
  type ConversationCoreGeminiToolTransportGenerateContentRequest,
  type ConversationCoreGeminiToolTransportSdkSeam,
  type ConversationCoreGroundedToolTurnCoordinatorInput,
} from "../src/server/conversation-core/index";
import {
  CONVERSATION_CORE_RUNTIME_DEPS_REASON_CODES,
  CONVERSATION_CORE_RUNTIME_DEPS_SUPPORTED_TOOL_NAMES,
  createConversationCoreRuntimeDeps,
  type ConversationCoreRuntimeDepsReasonCode,
  type ConversationCoreRuntimeDepsResult,
} from "../src/server/conversation-core/conversationCoreRuntimeDeps";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
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

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(
      `FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
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

const CONVERSATION_ID = "conv-runtime-deps-001";
const MODEL = "gemini-3.5-flash";
const SYSTEM_INSTRUCTION = "Authoritative assistant";
const USER_TEXT = "หารถให้หน่อย";
const CONTENTS = [{ role: "user" as const, parts: [{ text: USER_TEXT }] }];
const FAKE_API_KEY = "runtime-deps-fake-api-key-not-real";
const LISTING_ID = "listing-runtime-deps-500k";

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
    id: LISTING_ID,
    title: "Toyota Camry 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 500_000,
    type: "used",
    condition: "good",
    mileage: 80000,
    fuelType: "gasoline",
    transmission: "auto",
    images: ["https://example.com/a.jpg"],
    description: "test",
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
} = {}): InventoryRepository & { listPublishedCalls: number } {
  const published = input.published ?? [baseRecord()];
  let listPublishedCalls = 0;
  const repo: InventoryRepository & { listPublishedCalls: number } = {
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
  return repo;
}

type FactoryCounters = {
  readEnvCalls: number;
  resolveConfigCalls: number;
  createSdkSeamCalls: number;
  mintRequestIdCalls: number;
};

function createCounters(): FactoryCounters {
  return {
    readEnvCalls: 0,
    resolveConfigCalls: 0,
    createSdkSeamCalls: 0,
    mintRequestIdCalls: 0,
  };
}

function baseActivation(
  overrides: Partial<{
    killSwitchEnabled: boolean;
    coreEnabled: boolean;
    geminiEnabled: boolean;
    toolsEnabled: boolean;
    serverStagedToolNames: string[];
  }> = {}
) {
  return {
    killSwitchEnabled: false,
    coreEnabled: true,
    geminiEnabled: true,
    toolsEnabled: true,
    serverStagedToolNames: ["marketplace.search"],
    ...overrides,
  };
}

function createFactoryInput(
  counters: FactoryCounters,
  overrides: {
    activation?: ReturnType<typeof baseActivation>;
    inventoryRepository?: InventoryRepository | null;
    transport?: ConversationCoreGeminiToolTransportSdkSeam;
    mintRequestId?: () => string;
    readEnv?: (key: string) => string | undefined;
    resolveGeminiConfig?: (input: unknown) => {
      status: string;
      providerId?: string;
      model?: string;
      modelFamily?: string;
      reasonCode?: string;
    };
    createSdkSeam?: (input: { apiKey: string }) => ConversationCoreGeminiToolTransportSdkSeam;
  } = {}
) {
  const transport =
    overrides.transport ??
    createRecordingTransport([
      toolPartResponse({ name: "marketplace.search", args: { query: "toyota camry" } }),
      textResponse("พบรถที่เหมาะกับคุณครับ"),
    ]);
  return {
    activation: overrides.activation ?? baseActivation(),
    inventoryRepository:
      overrides.inventoryRepository !== undefined
        ? overrides.inventoryRepository
        : createFakeInventoryRepository(),
    readEnv:
      overrides.readEnv ??
      ((key: string) => {
        counters.readEnvCalls += 1;
        if (key === CONVERSATION_CORE_GEMINI_API_KEY_ENV) {
          return FAKE_API_KEY;
        }
        if (key === "NONGA_CONVERSATION_CORE_GEMINI_ENABLED") {
          return "true";
        }
        if (key === "NONGA_CONVERSATION_CORE_GEMINI_MODEL") {
          return MODEL;
        }
        return undefined;
      }),
    resolveGeminiConfig:
      overrides.resolveGeminiConfig ??
      ((input: unknown) => {
        counters.resolveConfigCalls += 1;
        return {
          status: "ready",
          providerId: "conversation-core-gemini",
          model: MODEL,
          modelFamily: "gemini",
        };
      }),
    createSdkSeam:
      overrides.createSdkSeam !== undefined
        ? overrides.createSdkSeam
        : (input: { apiKey: string }) => {
            counters.createSdkSeamCalls += 1;
            assertTruthy("createSdkSeam receives api key", input.apiKey.length > 0);
            return transport;
          },
    mintRequestId:
      overrides.mintRequestId ??
      (() => {
        counters.mintRequestIdCalls += 1;
        return "server-req-runtime-1";
      }),
  };
}

function assertFactoryUnavailable(
  label: string,
  result: ConversationCoreRuntimeDepsResult,
  expectedReason: ConversationCoreRuntimeDepsReasonCode
): void {
  assertEqual(`${label}: kind`, result.kind, "unavailable");
  if (result.kind === "unavailable") {
    assertEqual(`${label}: reason`, result.reasonCode, expectedReason);
    const serialized = JSON.stringify(result);
    assertNotIncludes(`${label}: no api key leak`, serialized, FAKE_API_KEY);
    assertNotIncludes(`${label}: no GEMINI_API_KEY`, serialized, "GEMINI_API_KEY");
  }
}

function coordinatorInput(
  overrides: Partial<ConversationCoreGroundedToolTurnCoordinatorInput> = {}
): ConversationCoreGroundedToolTurnCoordinatorInput {
  return {
    conversationId: CONVERSATION_ID,
    policyLane: "authoritative-data",
    toolsEnabled: true,
    allowedToolNames: ["marketplace.search"],
    initialTurn: {
      model: MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: CONTENTS,
    },
    ...overrides,
  };
}

// --- Import purity ---

const runtimeDepsSource = readFileSync(
  fileURLToPath(new URL("../src/server/conversation-core/conversationCoreRuntimeDeps.ts", import.meta.url)),
  "utf8"
);
assertFalsy("import purity: no direct process.env", /\bprocess\.env\b/.test(runtimeDepsSource));
assertFalsy(
  "import purity: no live SDK factory at import",
  /createConversationCoreGeminiToolTransportSdkSeam\(/.test(runtimeDepsSource)
);
assertEqual(
  "import purity: reason codes bounded",
  CONVERSATION_CORE_RUNTIME_DEPS_REASON_CODES.length > 0,
  true
);
assertEqual(
  "import purity: supported tools frozen",
  [...CONVERSATION_CORE_RUNTIME_DEPS_SUPPORTED_TOOL_NAMES],
  ["marketplace.search", "inventory.fetch"]
);

{
  const counters = createCounters();
  const unavailable = createConversationCoreRuntimeDeps({
    activation: baseActivation({ killSwitchEnabled: true }),
    inventoryRepository: createFakeInventoryRepository(),
    readEnv: () => {
      counters.readEnvCalls += 1;
      return undefined;
    },
    resolveGeminiConfig: () => {
      counters.resolveConfigCalls += 1;
      return { status: "ready", model: MODEL };
    },
    createSdkSeam: () => {
      counters.createSdkSeamCalls += 1;
      return createRecordingTransport(textResponse("x"));
    },
    mintRequestId: () => {
      counters.mintRequestIdCalls += 1;
      return "x";
    },
  });
  assertFactoryUnavailable("import purity: kill switch no side effects", unavailable, "kill-switch-active");
  assertEqual("import purity: readEnv calls", counters.readEnvCalls, 0);
  assertEqual("import purity: resolveConfig calls", counters.resolveConfigCalls, 0);
  assertEqual("import purity: createSdkSeam calls", counters.createSdkSeamCalls, 0);
  assertEqual("import purity: mintRequestId calls", counters.mintRequestIdCalls, 0);
}

// --- Activation precedence ---

const precedenceCases: Array<{
  label: string;
  input: unknown;
  reason: ConversationCoreRuntimeDepsReasonCode;
}> = [
  {
    label: "kill switch",
    input: { activation: baseActivation({ killSwitchEnabled: true }) },
    reason: "kill-switch-active",
  },
  {
    label: "core disabled",
    input: { activation: baseActivation({ coreEnabled: false }) },
    reason: "core-disabled",
  },
  {
    label: "gemini disabled",
    input: { activation: baseActivation({ geminiEnabled: false }) },
    reason: "gemini-disabled",
  },
  {
    label: "tools disabled",
    input: { activation: baseActivation({ toolsEnabled: false }) },
    reason: "tools-disabled",
  },
  {
    label: "empty staged set",
    input: { activation: baseActivation({ serverStagedToolNames: [] }) },
    reason: "empty-staged-tool-set",
  },
  {
    label: "selection staged",
    input: { activation: baseActivation({ serverStagedToolNames: ["vehicle.resolveSelection"] }) },
    reason: "unsupported-staged-tool",
  },
  {
    label: "finance staged",
    input: { activation: baseActivation({ serverStagedToolNames: ["finance.calculate"] }) },
    reason: "unsupported-staged-tool",
  },
  {
    label: "mixed staged selection",
    input: {
      activation: baseActivation({
        serverStagedToolNames: ["marketplace.search", "vehicle.resolveSelection"],
      }),
    },
    reason: "unsupported-staged-tool",
  },
  {
    label: "unknown staged tool",
    input: { activation: baseActivation({ serverStagedToolNames: ["posting.create"] }) },
    reason: "invalid-runtime-deps-input",
  },
  {
    label: "duplicate staged tool",
    input: {
      activation: baseActivation({
        serverStagedToolNames: ["marketplace.search", "marketplace.search"],
      }),
    },
    reason: "invalid-runtime-deps-input",
  },
  {
    label: "invalid input root",
    input: null,
    reason: "invalid-runtime-deps-input",
  },
  {
    label: "unknown input key",
    input: { activation: baseActivation(), forgedField: true },
    reason: "invalid-runtime-deps-input",
  },
];

for (const testCase of precedenceCases) {
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  let result: ConversationCoreRuntimeDepsResult;
  if (testCase.input === null || testCase.reason === "invalid-runtime-deps-input") {
    result = createConversationCoreRuntimeDeps(testCase.input);
  } else {
    result = createConversationCoreRuntimeDeps({
      ...createFactoryInput(counters),
      ...(testCase.input as Record<string, unknown>),
      inventoryRepository: inventory,
    });
  }
  assertFactoryUnavailable(`precedence: ${testCase.label}`, result, testCase.reason);
  assertEqual(`precedence: ${testCase.label} readEnv`, counters.readEnvCalls, 0);
  assertEqual(`precedence: ${testCase.label} resolveConfig`, counters.resolveConfigCalls, 0);
  assertEqual(`precedence: ${testCase.label} createSdkSeam`, counters.createSdkSeamCalls, 0);
  if (testCase.input !== null && testCase.reason !== "invalid-runtime-deps-input") {
    assertEqual(`precedence: ${testCase.label} inventory`, inventory.listPublishedCalls, 0);
  }
  assertEqual(`precedence: ${testCase.label} mintRequestId`, counters.mintRequestIdCalls, 0);
}

{
  const counters = createCounters();
  const result = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, { inventoryRepository: null })
  );
  assertFactoryUnavailable("precedence: missing inventory", result, "inventory-repository-unavailable");
  assertEqual("precedence: missing inventory readEnv", counters.readEnvCalls, 0);
}

{
  const counters = createCounters();
  const result = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, {
      resolveGeminiConfig: () => {
        counters.resolveConfigCalls += 1;
        return { status: "unavailable", reasonCode: "missing-model" };
      },
    })
  );
  assertFactoryUnavailable("precedence: gemini config unavailable", result, "gemini-config-unavailable");
  assertEqual("precedence: gemini config resolve once", counters.resolveConfigCalls, 1);
  assertEqual("precedence: gemini config no sdk seam", counters.createSdkSeamCalls, 0);
}

{
  const counters = createCounters();
  const result = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, {
      readEnv: (key) => {
        counters.readEnvCalls += 1;
        if (key === CONVERSATION_CORE_GEMINI_API_KEY_ENV) {
          return "";
        }
        return undefined;
      },
    })
  );
  assertFactoryUnavailable("precedence: missing api key", result, "gemini-config-unavailable");
  assertEqual("precedence: missing api key resolve once", counters.resolveConfigCalls, 1);
  assertTruthy("precedence: missing api key readEnv called", counters.readEnvCalls >= 1);
  const serialized = JSON.stringify(result);
  assertNotIncludes("precedence: missing api key no secret", serialized, FAKE_API_KEY);
}

{
  const counters = createCounters();
  const input = createFactoryInput(counters);
  const { createSdkSeam: _removed, ...withoutSdkSeam } = input;
  const result = createConversationCoreRuntimeDeps(withoutSdkSeam);
  assertFactoryUnavailable("precedence: sdk seam missing", result, "sdk-seam-unavailable");
}

{
  const counters = createCounters();
  const result = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, {
      createSdkSeam: () => {
        counters.createSdkSeamCalls += 1;
        throw new Error("sdk construction failed with secret");
      },
    })
  );
  assertFactoryUnavailable("precedence: sdk seam throws", result, "runtime-deps-construction-failed");
  const serialized = JSON.stringify(result);
  assertNotIncludes("precedence: sdk seam throws no raw error", serialized, "secret");
}

// --- Ready output contract ---

{
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  const result = createConversationCoreRuntimeDeps(createFactoryInput(counters, { inventoryRepository: inventory }));
  assertEqual("ready: kind", result.kind, "ready");
  if (result.kind === "ready") {
    assertEqual(
      "ready: supported tools",
      [...result.supportedToolNames],
      ["marketplace.search", "inventory.fetch"]
    );
    assertTruthy("ready: supported tools frozen", Object.isFrozen(result.supportedToolNames));
    assertEqual("ready: supported tools length stable", result.supportedToolNames.length, 2);
    assertTruthy("ready: runner is function", typeof result.runGroundedToolTurnCoordinator === "function");
    const serialized = JSON.stringify(result);
    assertNotIncludes("ready: no api key in output", serialized, FAKE_API_KEY);
    assertNotIncludes("ready: no runner internals", serialized, "registry");
    assertEqual("ready: resolveConfig once", counters.resolveConfigCalls, 1);
    assertEqual("ready: createSdkSeam once", counters.createSdkSeamCalls, 1);
    assertEqual("ready: inventory not called at factory", inventory.listPublishedCalls, 0);
    assertEqual("ready: mintRequestId not at factory", counters.mintRequestIdCalls, 0);
  }
}

// --- Search runner success ---

{
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport([
    toolPartResponse({ name: "marketplace.search", args: { query: "toyota camry" } }),
    textResponse("พบรถที่เหมาะกับคุณครับ"),
  ]);
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, { inventoryRepository: inventory, transport })
  );
  assertEqual("search success: factory ready", factory.kind, "ready");
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  assertEqual("search success: grounded", outcome.kind, "grounded");
  if (outcome.kind === "grounded") {
    assertEqual("search success: provider calls", outcome.providerCallCount, 2);
    assertEqual("search success: tool executions", outcome.toolExecutionCount, 1);
    assertEqual("search success: correction", outcome.correctionStatus, "none");
    assertEqual("search success: workspace actions", outcome.workspaceActions.length, 0);
    assertTruthy(
      "search success: grounding status bounded",
      outcome.groundingStatus === "accepted" || outcome.groundingStatus === "deterministic-fallback"
    );
    assertEqual("search success: request id", outcome.toolResultsUsed[0]?.requestId, "server-req-runtime-1");
    assertTruthy("search success: inventory used", inventory.listPublishedCalls >= 1);
    assertEqual("search success: mint once", counters.mintRequestIdCalls, 1);
    assertEqual("search success: transport calls", transport.callCount, 2);
    assertNotIncludes("search success: no secret leak", outcome.assistantText, FAKE_API_KEY);
  }
}

// --- Inventory runner success ---

{
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport([
    toolPartResponse({ name: "inventory.fetch", args: { refresh: true } }),
    textResponse("อัปเดตสต็อกรถแล้วครับ"),
  ]);
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, {
      activation: baseActivation({ serverStagedToolNames: ["inventory.fetch"] }),
      inventoryRepository: inventory,
      transport,
    })
  );
  assertEqual("inventory success: factory ready", factory.kind, "ready");
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(
    coordinatorInput({ allowedToolNames: ["inventory.fetch"] })
  );
  assertEqual("inventory success: grounded", outcome.kind, "grounded");
  if (outcome.kind === "grounded") {
    assertEqual("inventory success: provider calls", outcome.providerCallCount, 2);
    assertEqual("inventory success: tool executions", outcome.toolExecutionCount, 1);
    assertEqual("inventory success: provenance", outcome.toolResultsUsed[0]?.toolName, "inventory.fetch");
    assertTruthy("inventory success: published inventory", inventory.listPublishedCalls >= 1);
  }
}

// --- Tool restriction at runner boundary ---

const runnerRejectCases: Array<{
  label: string;
  allowedToolNames: string[];
  staged?: string[];
}> = [
  { label: "selection tool", allowedToolNames: ["vehicle.resolveSelection"] },
  { label: "finance tool", allowedToolNames: ["finance.calculate"] },
  { label: "unknown tool", allowedToolNames: ["posting.create"] },
  { label: "multi-tool", allowedToolNames: ["marketplace.search", "inventory.fetch"] },
  { label: "empty allowlist", allowedToolNames: [] },
  {
    label: "inventory not staged",
    allowedToolNames: ["inventory.fetch"],
    staged: ["marketplace.search"],
  },
];

for (const testCase of runnerRejectCases) {
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport(textResponse("should not run"));
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, {
      activation: baseActivation({
        serverStagedToolNames: testCase.staged ?? ["marketplace.search", "inventory.fetch"],
      }),
      inventoryRepository: inventory,
      transport,
    })
  );
  if (factory.kind !== "ready") {
    console.error(`FAIL [runner reject: ${testCase.label}] factory not ready`);
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(
    coordinatorInput({ allowedToolNames: testCase.allowedToolNames as ["marketplace.search"] })
  );
  assertEqual(`runner reject: ${testCase.label} unavailable`, outcome.kind, "unavailable");
  if (outcome.kind === "unavailable") {
    assertEqual(`runner reject: ${testCase.label} reason`, outcome.reasonCode, "tool-not-allowed");
    assertEqual(`runner reject: ${testCase.label} provider`, outcome.providerCallCount, 0);
    assertEqual(`runner reject: ${testCase.label} tool`, outcome.toolExecutionCount, 0);
    assertEqual(
      `runner reject: ${testCase.label} safe text`,
      outcome.assistantText,
      CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT
    );
    assertEqual(`runner reject: ${testCase.label} inventory`, inventory.listPublishedCalls, 0);
    assertEqual(`runner reject: ${testCase.label} transport`, transport.callCount, 0);
    assertEqual(`runner reject: ${testCase.label} mint`, counters.mintRequestIdCalls, 0);
  }
}

// --- Provider / tool failures ---

{
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport({ type: "throw", error: new Error("provider down") });
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, { inventoryRepository: inventory, transport })
  );
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  assertEqual("failure: initial provider", outcome.kind, "unavailable");
  if (outcome.kind === "unavailable") {
    assertEqual("failure: initial provider reason", outcome.reasonCode, "invalid-tool-request");
    assertEqual("failure: initial provider tool count", outcome.toolExecutionCount, 0);
    assertEqual("failure: initial provider inventory", inventory.listPublishedCalls, 0);
    assertNotIncludes("failure: initial provider no raw error", outcome.assistantText, "provider down");
  }
}

{
  const counters = createCounters();
  const inventory = createFakeInventoryRepository({ listPublishedThrows: true });
  const transport = createRecordingTransport(
    toolPartResponse({ name: "marketplace.search", args: { query: "toyota camry" } })
  );
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, { inventoryRepository: inventory, transport })
  );
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  assertEqual("failure: tool error", outcome.kind, "unavailable");
  if (outcome.kind === "unavailable") {
    assertTruthy("failure: tool error reason bounded", typeof outcome.reasonCode === "string");
    assertEqual("failure: tool error one provider", outcome.providerCallCount, 1);
    assertEqual("failure: tool error one tool", outcome.toolExecutionCount, 1);
    assertNotIncludes("failure: tool error no listPublished", outcome.assistantText, "listPublished");
  }
}

{
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport([
    toolPartResponse({ name: "marketplace.search", args: { query: "toyota camry" } }),
    { type: "throw", error: new Error("follow-up failed") },
  ]);
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, { inventoryRepository: inventory, transport })
  );
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  assertEqual("failure: follow-up", outcome.kind, "unavailable");
  if (outcome.kind === "unavailable") {
    assertEqual("failure: follow-up reason", outcome.reasonCode, "follow-up-failed");
    assertEqual("failure: follow-up provider calls", outcome.providerCallCount, 2);
    assertEqual("failure: follow-up tool calls", outcome.toolExecutionCount, 1);
    assertNotIncludes("failure: follow-up no raw error", outcome.assistantText, "follow-up failed");
  }
}

{
  const counters = createCounters();
  const inventory = createFakeInventoryRepository();
  const transport = createRecordingTransport([
    toolPartResponse({ name: "marketplace.search", args: { query: "toyota camry" } }),
    toolPartResponse({ name: "finance.calculate", args: { listingId: LISTING_ID } }),
  ]);
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, { inventoryRepository: inventory, transport })
  );
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  assertEqual("failure: follow-up function call", outcome.kind, "unavailable");
  if (outcome.kind === "unavailable") {
    assertEqual("failure: follow-up function call reason", outcome.reasonCode, "second-tool-request");
  }
}

// --- Request ID policy ---

{
  let mintCount = 0;
  const counters = createCounters();
  const transport = createRecordingTransport([
    toolPartResponse({ name: "marketplace.search", args: { query: "toyota camry" } }),
    textResponse("พบรถที่เหมาะกับคุณครับ"),
    toolPartResponse({ name: "marketplace.search", args: { query: "toyota camry" } }),
    textResponse("พบรถที่เหมาะกับคุณครับ"),
  ]);
  const factory = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, {
      transport,
      mintRequestId: () => {
        mintCount += 1;
        return `deterministic-req-${mintCount}`;
      },
    })
  );
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const first = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  const second = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  assertEqual("request id: mint count", mintCount, 2);
  if (first.kind === "grounded" && second.kind === "grounded") {
    assertTruthy("request id: distinct ids", first.toolResultsUsed[0]?.requestId !== second.toolResultsUsed[0]?.requestId);
    assertEqual("request id: first id", first.toolResultsUsed[0]?.requestId, "deterministic-req-1");
    assertEqual("request id: second id", second.toolResultsUsed[0]?.requestId, "deterministic-req-2");
  }
}

{
  const counters = createCounters();
  const unavailable = createConversationCoreRuntimeDeps(
    createFactoryInput(counters, {
      activation: baseActivation({ toolsEnabled: false }),
    })
  );
  assertFactoryUnavailable("request id: unavailable factory", unavailable, "tools-disabled");
  assertEqual("request id: unavailable no mint", counters.mintRequestIdCalls, 0);
}

// --- Budget invariants ---

{
  const counters = createCounters();
  const factory = createConversationCoreRuntimeDeps(createFactoryInput(counters));
  if (factory.kind !== "ready") {
    process.exit(1);
  }
  const outcome = await factory.runGroundedToolTurnCoordinator(coordinatorInput());
  if (outcome.kind === "grounded") {
    assertFalsy(
      "budget: provider within max",
      outcome.providerCallCount > CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS
    );
    assertFalsy(
      "budget: tool within max",
      outcome.toolExecutionCount > CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS
    );
    assertEqual("budget: correction none", outcome.correctionStatus, "none");
  }
}

// --- Lazy secret boundary when flags ready ---

{
  const counters = createCounters();
  createConversationCoreRuntimeDeps(createFactoryInput(counters));
  assertEqual("lazy secret: resolveConfig once when ready", counters.resolveConfigCalls, 1);
  assertTruthy("lazy secret: readEnv called for api key", counters.readEnvCalls >= 1);
  assertEqual("lazy secret: sdk seam once", counters.createSdkSeamCalls, 1);
}

if (passCount < 100) {
  console.error(`FAIL [assertion count] expected at least 100, got ${passCount}`);
  process.exit(1);
}

console.log(`\nConversation Core runtime-deps tests passed (${passCount} assertions).`);
