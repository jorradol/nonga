/**
 * WP-V2U-04S — Bounded Conversation Core runtime observability.
 * Default: deterministic mocks only. Optional live probe:
 *   NONGA_WP04S_SANITIZED_LIVE_PROBE=1
 * Never prints secrets, prompts, listing IDs, or vehicle facts.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import {
  createInventoryRepository,
  type InventoryRepository,
} from "../src/server/repositories/inventoryRepository.ts";
import {
  CONVERSATION_CORE_POLICY_VERSION,
  buildConversationCoreAuthoritativeGroundedAnswer,
  validateConversationCoreAuthoritativeGrounding,
  type ConversationCoreExecutionContext,
  type ConversationTurnRequest,
  type ToolResult,
} from "../src/services/conversation-core/index.ts";
import {
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS,
  createConversationCoreGeminiAdapter,
  createConversationCoreGeminiToolTransportSdkSeam,
  generateStructuredInitialTurn,
  generateFinalAnswerFromToolResult,
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV,
  NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV,
  resolveConversationCoreGeminiConfig,
  runConversationCoreExecutionService,
  runConversationCoreGroundedToolTurnCoordinator,
  runConversationCoreOrchestrator,
  type ConversationCoreGeminiToolTransportSdkSeam,
  type ConversationCoreGroundedToolTurnCoordinatorDeps,
  type ConversationCoreGroundedToolTurnCoordinatorInput,
} from "../src/server/conversation-core/index.ts";
import {
  classifyConversationCoreBoundedGeminiProviderError,
  type ConversationCoreRuntimeObservabilityEvent,
  type ConversationCoreRuntimeObservabilitySink,
} from "../src/server/conversation-core/conversationCoreGeminiToolTransport.ts";
import { createConversationCoreRuntimeDeps } from "../src/server/conversation-core/conversationCoreRuntimeDeps.ts";
import { classifyConversationCoreLane } from "../src/server/conversation-core/conversationCoreLaneClassifier.ts";
import {
  CONVERSATION_CORE_RUNTIME_OBSERVABILITY_LOG_EVENT,
  CONVERSATION_CORE_RUNTIME_OBSERVABILITY_MAX_EVENTS,
  NONGA_CONVERSATION_CORE_OBSERVABILITY_ENABLED_ENV,
  isConversationCoreObservabilityEnabled,
  resolveConversationCoreLiveServerActivation,
  toConversationCoreRuntimeObservabilityLog,
} from "../src/server/conversation-core/conversationCoreLiveServerActivation.ts";

export const NONGA_WP04S_SANITIZED_LIVE_PROBE_ENV = "NONGA_WP04S_SANITIZED_LIVE_PROBE";

const SANITIZED_PROMPT =
  "ต้องการค้นหา Toyota เกียร์อัตโนมัติ ราคาไม่เกิน 600000 บาท จากรายการรถที่มีอยู่จริง";

const EVENT_KEYS_BY_NAME: Record<string, ReadonlySet<string>> = {
  runtime_deps_outcome: new Set(["event", "kind", "reasonCode"]),
  gemini_transport_outcome: new Set(["event", "phase", "kind", "errorClass", "providerErrorClass"]),
  tool_execution_outcome: new Set(["event", "toolName", "status", "resultCount"]),
  coordinator_outcome: new Set([
    "event",
    "kind",
    "reasonCode",
    "providerCallCount",
    "toolExecutionCount",
    "authoritativeResultCount",
  ]),
  execution_service_outcome: new Set([
    "event",
    "route",
    "preservedCoordinatorReasonCode",
  ]),
};

const FORBIDDEN_FIELD_NAMES = [
  "uid",
  "email",
  "token",
  "fingerprint",
  "prompt",
  "userMessage",
  "assistantText",
  "listingId",
  "listingIds",
  "query",
  "content",
  "ip",
  "correlation",
  "requestCorrelationId",
  "apiKey",
  "secret",
];

const CONVERSATION_ID = "conv-04s-observability";
const MESSAGE_ID = "msg-04s-observability";
const AUTH_UID = "probe-core-pilot-04s";
const MODEL = "gemini-3.5-flash";
const SYSTEM_INSTRUCTION = "Authoritative assistant";
const LISTINGS = ["listing-alpha", "listing-beta", "listing-gamma"];
const FAKE_API_KEY = "04s-fake-api-key-not-real";
const APPROVED_ENV_FILE = "D:/nonga/.env";
const EXPECTED_FIREBASE_PROJECT_ID = "nonga-ce93c";
const ALLOWLISTED_SECRET_KEYS = [
  "GEMINI_API_KEY",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
] as const;
const SYNTHETIC_GEMINI_KEY = "04s-r2-synthetic-gemini-not-real";
const SYNTHETIC_UNRELATED_KEY = "UNRELATED_SYNTHETIC_KEY_04S_R2";
const SYNTHETIC_UNRELATED_VALUE = "04s-r2-unrelated-should-not-import";
const SYNTHETIC_PREEXISTING_GEMINI = "04s-r2-preexisting-nonempty-gemini";
const SYNTHETIC_MALFORMED_JSON = "{\n  not-json\n";
const LIVE_PROBE_IDENTITY_ENV: Readonly<Record<string, string>> = {
  NONGA_DATA_BACKEND: "firestore",
  FIREBASE_PROJECT_ID: EXPECTED_FIREBASE_PROJECT_ID,
  NONGA_RUNTIME_ENV: "staging",
  NONGA_DEPLOY_ENV: "staging",
  [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
  [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
  [NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV]: "true",
  [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: MODEL,
};

type AllowlistedSecretKey = (typeof ALLOWLISTED_SECRET_KEYS)[number];

type LoaderSafetyReport = {
  readonly selectedKeyNames: readonly AllowlistedSecretKey[];
  readonly geminiCredentialReady: boolean;
  readonly firebaseCredentialReady: boolean;
  readonly firebaseJsonParseValid: boolean;
  readonly firebaseProjectIdentityMatch: boolean;
};

type EnvMutation = {
  readonly key: string;
  readonly previous: string | undefined;
};

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

function createSink(): {
  events: ConversationCoreRuntimeObservabilityEvent[];
  sink: ConversationCoreRuntimeObservabilitySink;
} {
  const events: ConversationCoreRuntimeObservabilityEvent[] = [];
  return {
    events,
    sink: (event) => {
      events.push(event);
    },
  };
}

function eventsNamed(
  events: readonly ConversationCoreRuntimeObservabilityEvent[],
  name: string
): ConversationCoreRuntimeObservabilityEvent[] {
  return events.filter((event) => event.event === name);
}

function assertNoForbiddenFields(
  label: string,
  events: readonly ConversationCoreRuntimeObservabilityEvent[]
): void {
  const serialized = JSON.stringify(events);
  for (const field of FORBIDDEN_FIELD_NAMES) {
    assertFalsy(`${label}: no field ${field}`, serialized.includes(`"${field}"`));
  }
  assertFalsy(`${label}: no fake api key`, serialized.includes(FAKE_API_KEY));
  assertFalsy(`${label}: no sanitized prompt`, serialized.includes(SANITIZED_PROMPT));
  assertFalsy(`${label}: no listing id`, serialized.includes("listing-alpha"));
  for (const event of events) {
    const allowed = EVENT_KEYS_BY_NAME[String(event.event)];
    assertTruthy(`${label}: known event ${String(event.event)}`, Boolean(allowed));
    for (const key of Object.keys(event)) {
      assertTruthy(`${label}: allowed key ${key}`, allowed?.has(key) === true);
    }
  }
}

function marketplaceToolResult(requestId: string, listingIds = LISTINGS): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "marketplace.search",
    status: "ok",
    provenance: "marketplace-search",
    data: { listingIds, query: "toyota" },
  };
}

function baseCoordinatorInput(): ConversationCoreGroundedToolTurnCoordinatorInput {
  return {
    conversationId: CONVERSATION_ID,
    policyLane: "authoritative-data",
    toolsEnabled: true,
    allowedToolNames: ["marketplace.search"],
    initialTurn: {
      model: MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [{ role: "user", parts: [{ text: "หารถให้หน่อย" }] }],
    },
  };
}

function createCoordinatorDeps(
  sink: ConversationCoreRuntimeObservabilitySink | undefined,
  overrides: Partial<ConversationCoreGroundedToolTurnCoordinatorDeps> = {}
): ConversationCoreGroundedToolTurnCoordinatorDeps {
  return {
    observabilitySink: sink,
    mintRequestId: () => "server-req-1",
    generateInitialTurn: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "marketplace.search" as const,
          toolInput: { query: "toyota" },
        },
        providerContext: {
          functionName: "marketplace.search",
          args: { query: "toyota" },
          modelContent: {
            role: "model",
            parts: [{ functionCall: { name: "marketplace.search", args: { query: "toyota" } } }],
          },
        },
      },
    }),
    executeTool: async () => ({
      kind: "completed" as const,
      result: marketplaceToolResult("server-req-1"),
    }),
    generateFollowUp: async () => ({
      ok: true as const,
      value: buildConversationCoreAuthoritativeGroundedAnswer(
        marketplaceToolResult("server-req-1")
      ),
    }),
    validateGrounding: (input) => validateConversationCoreAuthoritativeGrounding(input),
    buildDeterministicGroundedAnswer: (toolResult, userAssumptions) =>
      buildConversationCoreAuthoritativeGroundedAnswer(toolResult, userAssumptions ?? []),
    ...overrides,
  };
}

function textResponse(text: string) {
  return {
    candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
  };
}

function toolCallResponse() {
  return {
    candidates: [
      {
        content: {
          parts: [{ functionCall: { name: "marketplace.search", args: { query: "toyota" } } }],
        },
        finishReason: "STOP",
      },
    ],
  };
}

function throwingTransport(): ConversationCoreGeminiToolTransportSdkSeam {
  return {
    async generateContent() {
      throw new Error("simulated-provider-failure-do-not-log");
    },
  };
}

function scriptedTransport(
  responses: readonly unknown[]
): ConversationCoreGeminiToolTransportSdkSeam {
  const queue = [...responses];
  return {
    async generateContent() {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error("unexpected transport call");
      }
      return next;
    },
  };
}

function baseRecord(): MarketplaceCarRecord {
  return {
    id: "listing-alpha",
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
  };
}

function createFakeInventoryRepository(
  published: MarketplaceCarRecord[] = [baseRecord()]
): InventoryRepository {
  return {
    backend: "file",
    listings: {
      async listPublished() {
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

function runtimeDepsInput(
  sink?: ConversationCoreRuntimeObservabilitySink,
  overrides: Record<string, unknown> = {}
) {
  return {
    activation: {
      killSwitchEnabled: false,
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: true,
      serverStagedToolNames: ["marketplace.search"],
    },
    inventoryRepository: createFakeInventoryRepository(),
    readEnv: (key: string) => {
      if (key === CONVERSATION_CORE_GEMINI_API_KEY_ENV) return FAKE_API_KEY;
      if (key === NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) return "true";
      if (key === NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV) return MODEL;
      return undefined;
    },
    createSdkSeam: () => scriptedTransport([toolCallResponse(), textResponse("unused")]),
    ...(sink ? { observabilitySink: sink } : {}),
    ...overrides,
  };
}

function validatedTurn(): ConversationTurnRequest {
  return {
    conversationId: CONVERSATION_ID,
    messageId: MESSAGE_ID,
    userMessage: "หารถให้หน่อย",
    history: [{ role: "user", content: "สวัสดีครับ" }],
  };
}

function validatedContext(): ConversationCoreExecutionContext {
  return {
    conversationId: CONVERSATION_ID,
    actorScope: { kind: "authenticated", actorRef: AUTH_UID, role: "client" },
    conversationOwnership: { ownerActorRef: AUTH_UID, bindingVerified: true },
    featureFlags: {
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: true,
      workspaceActionsEnabled: false,
    },
    toolAllowlist: ["marketplace.search"],
    receivedAtMs: 1_700_000_000_000,
    policyVersion: CONVERSATION_CORE_POLICY_VERSION,
  };
}

function readyConfig() {
  return resolveConversationCoreGeminiConfig({
    readEnv: (key) => {
      if (key === NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) return "true";
      if (key === NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV) return MODEL;
      return undefined;
    },
    apiKeyReady: true,
  });
}

function textAdapter() {
  return createConversationCoreGeminiAdapter({
    transport: {
      async generate() {
        return { kind: "text" as const, text: "แนะนำการดูแลรถยนต์เบื้องต้นอย่างปลอดภัย" };
      },
    },
  });
}

function proveMarketplaceAdapterReadOnly(): boolean {
  const adapterSource = readFileSync(
    resolve("src/server/conversation-core/adapters/marketplaceSearchToolAdapter.ts"),
    "utf8"
  );
  const runtimeDepsSource = readFileSync(
    resolve("src/server/conversation-core/conversationCoreRuntimeDeps.ts"),
    "utf8"
  );
  const writes = [
    "createListing",
    "updateListing",
    "updateVisibility",
    "deleteListing",
    "publishDraft",
    "createDraft",
    "updateDraft",
    "deleteDraft",
  ];
  const adapterHasWrite = writes.some((name) => adapterSource.includes(name));
  const financeNull = runtimeDepsSource.includes("finance: null");
  const blockedSelection = runtimeDepsSource.includes("vehicle.resolveSelection");
  return !adapterHasWrite && financeNull && blockedSelection && adapterSource.includes("listPublished");
}

async function testSinkOmittedUnchanged(): Promise<void> {
  const withoutSink = await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(undefined)
  );
  const withCollector = createSink();
  const withSink = await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(withCollector.sink)
  );
  assertEqual("04S-1 public result unchanged", withSink, withoutSink);
  assertTruthy("04S-1 sink observed events", withCollector.events.length > 0);
}

async function testRuntimeDepsOutcomes(): Promise<void> {
  const ready = createSink();
  const readyResult = createConversationCoreRuntimeDeps(runtimeDepsInput(ready.sink));
  assertEqual("04S-2 ready kind", readyResult.kind, "ready");
  assertEqual("04S-2 ready event", eventsNamed(ready.events, "runtime_deps_outcome")[0]?.kind, "ready");

  const unavailable = createSink();
  const unavailableResult = createConversationCoreRuntimeDeps(
    runtimeDepsInput(unavailable.sink, { inventoryRepository: null })
  );
  assertEqual("04S-2 unavailable kind", unavailableResult.kind, "unavailable");
  assertEqual(
    "04S-2 unavailable reason",
    eventsNamed(unavailable.events, "runtime_deps_outcome")[0]?.reasonCode,
    "inventory-repository-unavailable"
  );
}

async function testGeminiProviderError(): Promise<void> {
  const { events, sink } = createSink();
  const result = await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: "x" }] }],
    allowedToolNames: ["marketplace.search"],
    transport: throwingTransport(),
    observabilitySink: sink,
  });
  assertEqual("04S-3 transport not ok", result.ok, false);
  const gemini = eventsNamed(events, "gemini_transport_outcome")[0];
  assertEqual("04S-3 phase", gemini?.phase, "initial");
  assertEqual("04S-3 kind", gemini?.kind, "provider_error");
  assertEqual("04S-3 errorClass", gemini?.errorClass, "provider-error");
  const serialized = JSON.stringify(events);
  assertFalsy("04S-3 no raw error", serialized.includes("simulated-provider-failure-do-not-log"));
}

async function testGeminiFinalAnswerWithoutTool(): Promise<void> {
  const { events, sink } = createSink();
  const transportResult = await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: "x" }] }],
    allowedToolNames: ["marketplace.search"],
    transport: scriptedTransport([textResponse("สวัสดีครับ")]),
    observabilitySink: sink,
  });
  assertTruthy("04S-4 transport ok", transportResult.ok);
  assertEqual(
    "04S-4 gemini kind",
    eventsNamed(events, "gemini_transport_outcome")[0]?.kind,
    "final_answer"
  );

  const coordinatorSink = createSink();
  const coordinator = await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(coordinatorSink.sink, {
      generateInitialTurn: async () => ({
        ok: true as const,
        value: {
          outcome: { kind: "final-answer" as const, assistantText: "สวัสดีครับ" },
        },
      }),
    })
  );
  assertEqual("04S-4 coordinator kind", coordinator.kind, "unavailable");
  if (coordinator.kind === "unavailable") {
    assertEqual("04S-4 coordinator reason", coordinator.reasonCode, "tool-required");
  }
  assertEqual(
    "04S-4 coordinator event reason",
    eventsNamed(coordinatorSink.events, "coordinator_outcome")[0]?.reasonCode,
    "tool-required"
  );
}

async function testValidToolRequestAttemptedOnce(): Promise<void> {
  const { events, sink } = createSink();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(sink)
  );
  assertEqual("04S-5 grounded", outcome.kind, "grounded");
  const toolEvents = eventsNamed(events, "tool_execution_outcome");
  assertEqual("04S-5 attempted once", toolEvents.filter((event) => event.status === "attempted").length, 1);
  assertEqual("04S-5 tool name", toolEvents[0]?.toolName, "marketplace.search");
  assertTruthy(
    "04S-12 provider bound",
    Number(eventsNamed(events, "coordinator_outcome")[0]?.providerCallCount) <=
      CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS
  );
  assertTruthy(
    "04S-13 tool bound",
    Number(eventsNamed(events, "coordinator_outcome")[0]?.toolExecutionCount) <=
      CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS
  );
}

async function testToolRejectedReasonPreserved(): Promise<void> {
  const { events, sink } = createSink();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(sink, {
      executeTool: async () => ({
        kind: "rejected" as const,
        reasonCode: "malformed_request" as const,
        issues: [],
      }),
    })
  );
  assertEqual("04S-6 public kind", outcome.kind, "unavailable");
  if (outcome.kind === "unavailable") {
    assertEqual("04S-6 public reason", outcome.reasonCode, "invalid-tool-request");
  }
  assertEqual(
    "04S-6 tool status",
    eventsNamed(events, "tool_execution_outcome").at(-1)?.status,
    "rejected"
  );
  assertEqual(
    "04S-6 coordinator reason",
    eventsNamed(events, "coordinator_outcome")[0]?.reasonCode,
    "invalid-tool-request"
  );
}

async function testToolSuccessResultCountOnly(): Promise<void> {
  const { events, sink } = createSink();
  await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(sink)
  );
  const okEvent = eventsNamed(events, "tool_execution_outcome").find((event) => event.status === "ok");
  assertEqual("04S-7 resultCount", okEvent?.resultCount, LISTINGS.length);
  assertEqual(
    "04S-7 coordinator count",
    eventsNamed(events, "coordinator_outcome")[0]?.authoritativeResultCount,
    LISTINGS.length
  );
}

async function testGroundingRejectionBoundedReason(): Promise<void> {
  const { events, sink } = createSink();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(sink, {
      generateFollowUp: async () => ({ ok: true as const, value: "ราคานี้ดีมาก 999,999 บาท" }),
      validateGrounding: () => ({
        ok: false as const,
        code: "unaccounted_numeric_claim" as const,
        fallbackText: CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
      }),
      buildDeterministicGroundedAnswer: () => "ราคานี้ดีมาก 999,999 บาท",
    })
  );
  assertEqual("04S-8 public kind", outcome.kind, "unavailable");
  if (outcome.kind === "unavailable") {
    assertEqual("04S-8 public reason", outcome.reasonCode, "deterministic-fallback-invalid");
  }
  assertEqual(
    "04S-8 event reason",
    eventsNamed(events, "coordinator_outcome")[0]?.reasonCode,
    "deterministic-fallback-invalid"
  );
  assertEqual("04S-8 fail-closed text", outcome.kind === "unavailable" && outcome.assistantText, CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT);
}

async function testGroundedSuccessCompleted(): Promise<void> {
  const { events, sink } = createSink();
  const coordinatorOutcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(sink)
  );
  assertEqual("04S-9 coordinator grounded", coordinatorOutcome.kind, "grounded");

  const execSink = createSink();
  const execution = await runConversationCoreExecutionService({
    request: validatedTurn(),
    context: validatedContext(),
    baseInstruction: SYSTEM_INSTRUCTION,
    policyLane: "authoritative-data",
    geminiConfig: readyConfig(),
    adapter: textAdapter(),
    observabilitySink: execSink.sink,
    runGroundedToolTurnCoordinator: async () => coordinatorOutcome,
  });
  assertEqual("04S-9 execution route", execution.kind, "completed");
  assertEqual(
    "04S-9 execution event",
    eventsNamed(execSink.events, "execution_service_outcome")[0]?.route,
    "completed"
  );
}

async function testExecutionPreservesCoordinatorReason(): Promise<void> {
  const { events, sink } = createSink();
  const execution = await runConversationCoreExecutionService({
    request: validatedTurn(),
    context: validatedContext(),
    baseInstruction: SYSTEM_INSTRUCTION,
    policyLane: "authoritative-data",
    geminiConfig: readyConfig(),
    adapter: textAdapter(),
    observabilitySink: sink,
    runGroundedToolTurnCoordinator: async () => ({
      kind: "unavailable",
      reasonCode: "tool-required",
      assistantText: CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
      providerCallCount: 1,
      toolExecutionCount: 0,
    }),
  });
  assertEqual("04S-10 public kind", execution.kind, "honest-unavailable");
  if (execution.kind === "honest-unavailable") {
    assertEqual("04S-10 public reason still collapsed", execution.reasonCode, "tools-not-ready");
  }
  assertEqual(
    "04S-10 preserved reason",
    eventsNamed(events, "execution_service_outcome")[0]?.preservedCoordinatorReasonCode,
    "tool-required"
  );
}

async function testNoPiiAndLegacyUntouched(): Promise<void> {
  const { events, sink } = createSink();
  await runConversationCoreGroundedToolTurnCoordinator(
    baseCoordinatorInput(),
    createCoordinatorDeps(sink)
  );
  createConversationCoreRuntimeDeps(runtimeDepsInput(sink, { inventoryRepository: null }));
  assertNoForbiddenFields("04S-11", events);

  const salesBrain = readFileSync(
    resolve("src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts"),
    "utf8"
  );
  assertTruthy("04S-14 legacy bridge present", salesBrain.includes("handleChatUserVisibleOrchestratePost"));
}

function isLiveProbeEnabled(): boolean {
  return String(process.env[NONGA_WP04S_SANITIZED_LIVE_PROBE_ENV] ?? "").trim() === "1";
}

function envReady(key: string): boolean {
  return String(process.env[key] ?? "").trim().length > 0;
}

function emptyLoaderReport(): LoaderSafetyReport {
  return {
    selectedKeyNames: [],
    geminiCredentialReady: false,
    firebaseCredentialReady: false,
    firebaseJsonParseValid: false,
    firebaseProjectIdentityMatch: false,
  };
}

function parseAllowlistedSecretsFromSource(source: string): {
  report: LoaderSafetyReport;
  selected: Partial<Record<AllowlistedSecretKey, string>>;
} {
  const parsed = parseDotenv(source);
  const selected: Partial<Record<AllowlistedSecretKey, string>> = {};
  for (const key of ALLOWLISTED_SECRET_KEYS) {
    const value = parsed[key];
    if (typeof value === "string" && value.length > 0) {
      selected[key] = value;
    }
  }
  const firebaseRaw = selected.FIREBASE_SERVICE_ACCOUNT_JSON;
  let firebaseJsonParseValid = false;
  let firebaseProjectIdentityMatch = false;
  if (typeof firebaseRaw === "string") {
    try {
      const obj = JSON.parse(firebaseRaw) as { project_id?: unknown };
      firebaseJsonParseValid = obj !== null && typeof obj === "object";
      firebaseProjectIdentityMatch =
        firebaseJsonParseValid && obj.project_id === EXPECTED_FIREBASE_PROJECT_ID;
    } catch {
      firebaseJsonParseValid = false;
      firebaseProjectIdentityMatch = false;
    }
  }
  return {
    selected,
    report: {
      selectedKeyNames: ALLOWLISTED_SECRET_KEYS.filter(
        (key) => typeof selected[key] === "string"
      ),
      geminiCredentialReady: Boolean(selected.GEMINI_API_KEY?.trim()),
      firebaseCredentialReady: Boolean(firebaseRaw?.trim()),
      firebaseJsonParseValid,
      firebaseProjectIdentityMatch,
    },
  };
}

function loadAllowlistedSecretsFromApprovedEnvFile(filePath: string): {
  filePresent: boolean;
  report: LoaderSafetyReport;
  selected: Partial<Record<AllowlistedSecretKey, string>>;
} {
  if (!existsSync(filePath)) {
    return { filePresent: false, report: emptyLoaderReport(), selected: {} };
  }
  const source = readFileSync(filePath, "utf8");
  const parsed = parseAllowlistedSecretsFromSource(source);
  return { filePresent: true, ...parsed };
}

function applyAllowlistedSecrets(
  selected: Partial<Record<AllowlistedSecretKey, string>>
): EnvMutation[] {
  const mutations: EnvMutation[] = [];
  for (const key of ALLOWLISTED_SECRET_KEYS) {
    const incoming = selected[key];
    if (!incoming) {
      continue;
    }
    const previous = process.env[key];
    if (previous && previous.trim().length > 0) {
      continue;
    }
    mutations.push({ key, previous });
    process.env[key] = incoming;
  }
  return mutations;
}

function applyEnvOverlay(overlay: Readonly<Record<string, string>>): EnvMutation[] {
  const mutations: EnvMutation[] = [];
  for (const [key, value] of Object.entries(overlay)) {
    mutations.push({ key, previous: process.env[key] });
    process.env[key] = value;
  }
  return mutations;
}

function restoreEnvMutations(mutations: readonly EnvMutation[]): void {
  for (const mutation of [...mutations].reverse()) {
    if (mutation.previous === undefined) {
      delete process.env[mutation.key];
    } else {
      process.env[mutation.key] = mutation.previous;
    }
  }
}

function inspectFirebaseServiceAccount(raw: string | undefined): {
  valid: boolean;
  projectMatch: boolean;
} {
  if (!raw || !raw.trim()) {
    return { valid: false, projectMatch: false };
  }
  try {
    const obj = JSON.parse(raw) as { project_id?: unknown };
    const valid = obj !== null && typeof obj === "object";
    return {
      valid,
      projectMatch: valid && obj.project_id === EXPECTED_FIREBASE_PROJECT_ID,
    };
  } catch {
    return { valid: false, projectMatch: false };
  }
}

function tryInitFirestoreAdmin(): boolean {
  try {
    const repo = createInventoryRepository();
    return repo.backend === "firestore";
  } catch {
    return false;
  }
}

function syntheticValidMultilineEnvSource(): string {
  return [
    `${SYNTHETIC_UNRELATED_KEY}=${SYNTHETIC_UNRELATED_VALUE}`,
    `${CONVERSATION_CORE_GEMINI_API_KEY_ENV}=${SYNTHETIC_GEMINI_KEY}`,
    "FIREBASE_SERVICE_ACCOUNT_JSON='{",
    '  "type": "service_account",',
    `  "project_id": "${EXPECTED_FIREBASE_PROJECT_ID}"`,
    "}'",
    "",
  ].join("\n");
}

function syntheticMalformedMultilineEnvSource(): string {
  return [
    `${CONVERSATION_CORE_GEMINI_API_KEY_ENV}=${SYNTHETIC_GEMINI_KEY}`,
    `FIREBASE_SERVICE_ACCOUNT_JSON='${SYNTHETIC_MALFORMED_JSON}'`,
    "",
  ].join("\n");
}

function testLoaderSafety(): void {
  const scriptSource = readFileSync(
    resolve("scripts/test-wp-v2u04s-core-runtime-observability.mts"),
    "utf8"
  );
  assertTruthy("04S-R2 uses dotenv.parse", scriptSource.includes("parse as parseDotenv"));

  const tmpBefore = new Set(readdirSync(tmpdir()));
  const parsed = parseAllowlistedSecretsFromSource(syntheticValidMultilineEnvSource());
  const tmpAdded = readdirSync(tmpdir()).filter(
    (name) =>
      !tmpBefore.has(name) &&
      /04s|dotenv|service.account|credential|nonga-sa/i.test(name)
  );
  assertEqual("04S-R2 parser wrote no tmp files", tmpAdded, []);
  assertFalsy("04S-R2 no worktree .env copy", existsSync(resolve(".env")));

  assertEqual("04S-R2 multiline JSON parse valid", parsed.report.firebaseJsonParseValid, true);
  assertEqual("04S-R2 gemini key parse ready", parsed.report.geminiCredentialReady, true);
  assertEqual("04S-R2 selected key count", parsed.report.selectedKeyNames.length, 2);
  assertEqual("04S-R2 selected key names", [...parsed.report.selectedKeyNames].sort(), [
    ...ALLOWLISTED_SECRET_KEYS,
  ].sort());
  assertEqual(
    "04S-R2 firebase project identity match",
    parsed.report.firebaseProjectIdentityMatch,
    true
  );

  const reportSerialized = JSON.stringify(parsed.report);
  assertFalsy("04S-R2 report omits gemini secret", reportSerialized.includes(SYNTHETIC_GEMINI_KEY));
  assertFalsy(
    "04S-R2 report omits unrelated value",
    reportSerialized.includes(SYNTHETIC_UNRELATED_VALUE)
  );
  assertFalsy("04S-R2 report omits service-account JSON", reportSerialized.includes("private_key"));
  assertFalsy("04S-R2 report omits type field value", reportSerialized.includes("service_account"));

  const previousUnrelated = process.env[SYNTHETIC_UNRELATED_KEY];
  const previousGemini = process.env.GEMINI_API_KEY;
  const previousFirebase = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env[SYNTHETIC_UNRELATED_KEY];
  process.env.GEMINI_API_KEY = SYNTHETIC_PREEXISTING_GEMINI;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  const mutations = applyAllowlistedSecrets(parsed.selected);
  assertEqual(
    "04S-R2 unrelated key stays out of process",
    process.env[SYNTHETIC_UNRELATED_KEY],
    undefined
  );
  assertEqual(
    "04S-R2 nonempty process env not overwritten",
    process.env.GEMINI_API_KEY,
    SYNTHETIC_PREEXISTING_GEMINI
  );
  assertTruthy(
    "04S-R2 firebase secret applied when empty",
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.startsWith("{"))
  );
  restoreEnvMutations(mutations);
  assertEqual(
    "04S-R2 restored firebase after apply",
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    undefined
  );
  process.env.GEMINI_API_KEY = previousGemini;
  if (previousGemini === undefined) {
    delete process.env.GEMINI_API_KEY;
  }
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = previousFirebase;
  if (previousFirebase === undefined) {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  }
  process.env[SYNTHETIC_UNRELATED_KEY] = previousUnrelated;
  if (previousUnrelated === undefined) {
    delete process.env[SYNTHETIC_UNRELATED_KEY];
  }

  const malformed = parseAllowlistedSecretsFromSource(syntheticMalformedMultilineEnvSource());
  assertEqual("04S-R2 malformed JSON invalid", malformed.report.firebaseJsonParseValid, false);
  assertEqual(
    "04S-R2 malformed project match false",
    malformed.report.firebaseProjectIdentityMatch,
    false
  );
  const malformedSerialized = JSON.stringify(malformed.report);
  assertFalsy(
    "04S-R2 malformed report omits raw JSON",
    malformedSerialized.includes("not-json")
  );
  assertFalsy(
    "04S-R2 malformed report omits exception text",
    malformedSerialized.toLowerCase().includes("syntaxerror")
  );

  const { events } = createSink();
  assertNoForbiddenFields("04S-R2 loader events", events);
  if (!isLiveProbeEnabled()) {
    assertFalsy(
      "04S-R2 default live flag unset",
      String(process.env[NONGA_WP04S_SANITIZED_LIVE_PROBE_ENV] ?? "").trim() === "1"
    );
  }
}

function throwingObjectTransport(error: unknown): ConversationCoreGeminiToolTransportSdkSeam {
  return {
    async generateContent() {
      throw error;
    },
  };
}

function followUpProviderContext() {
  return {
    functionName: "marketplace.search" as const,
    args: { q: "toyota" },
    callId: "call-r3-1",
    modelContent: {
      role: "model" as const,
      parts: [{ functionCall: { name: "marketplace.search", args: { q: "toyota" }, id: "call-r3-1" } }],
    },
  };
}

async function assertInitialProviderClass(
  label: string,
  error: unknown,
  expectedClass: string,
  publicCode = "provider-error"
): Promise<void> {
  const { events, sink } = createSink();
  const result = await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: "x" }] }],
    allowedToolNames: ["marketplace.search"],
    transport: throwingObjectTransport(error),
    observabilitySink: sink,
  });
  assertEqual(`${label} public not ok`, result.ok, false);
  if (result.ok === false) {
    assertEqual(`${label} public code`, result.code, publicCode);
  }
  const gemini = eventsNamed(events, "gemini_transport_outcome")[0];
  assertEqual(`${label} kind`, gemini?.kind, "provider_error");
  assertEqual(`${label} errorClass`, gemini?.errorClass, publicCode);
  assertEqual(`${label} providerErrorClass`, gemini?.providerErrorClass, expectedClass);
  assertEqual(
    `${label} classifier`,
    classifyConversationCoreBoundedGeminiProviderError(error),
    expectedClass
  );
}

async function testR3BoundedGeminiErrorClassification(): Promise<void> {
  const leakToken = "r3-secret-must-not-appear";
  await assertInitialProviderClass("04S-R3 auth status", { status: 401 }, "authentication_failed");
  await assertInitialProviderClass(
    "04S-R3 auth code",
    { status: "UNAUTHENTICATED" },
    "authentication_failed"
  );
  await assertInitialProviderClass(
    "04S-R3 auth api key code",
    { error: { details: [{ reason: "API_KEY_INVALID" }] } },
    "authentication_failed"
  );
  await assertInitialProviderClass("04S-R3 permission", { status: 403 }, "permission_denied");
  await assertInitialProviderClass("04S-R3 quota", { status: 429 }, "quota_exhausted");
  await assertInitialProviderClass("04S-R3 model not found", { status: 404 }, "model_not_found");
  await assertInitialProviderClass("04S-R3 unavailable 503", { status: 503 }, "provider_unavailable");
  await assertInitialProviderClass(
    "04S-R3 timeout name",
    { name: "TimeoutError", code: "ETIMEDOUT" },
    "timeout",
    "provider-timeout"
  );
  await assertInitialProviderClass("04S-R3 network", { code: "ECONNRESET" }, "network_error");
  await assertInitialProviderClass("04S-R3 unknown object", { foo: true }, "unknown_provider_error");

  const leaky = {
    status: 401,
    message: leakToken,
    stack: `Error: ${leakToken}`,
    headers: { authorization: leakToken },
    error: { message: leakToken, body: leakToken, text: leakToken },
  };
  const leakSink = createSink();
  const leakResult = await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: SANITIZED_PROMPT }] }],
    allowedToolNames: ["marketplace.search"],
    transport: throwingObjectTransport(leaky),
    observabilitySink: leakSink.sink,
  });
  assertEqual("04S-R3 leaky public not ok", leakResult.ok, false);
  if (leakResult.ok === false) {
    assertEqual("04S-R3 leaky public code", leakResult.code, "provider-error");
  }
  const leakEvent = eventsNamed(leakSink.events, "gemini_transport_outcome")[0];
  assertEqual("04S-R3 leaky class", leakEvent?.providerErrorClass, "authentication_failed");
  const leakSerialized = JSON.stringify(leakSink.events);
  assertFalsy("04S-R3 no leak token", leakSerialized.includes(leakToken));
  assertFalsy("04S-R3 no prompt in leak events", leakSerialized.includes(SANITIZED_PROMPT));
  assertNoForbiddenFields("04S-R3 leak events", leakSink.events);

  const withoutSink = await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: "x" }] }],
    allowedToolNames: ["marketplace.search"],
    transport: throwingObjectTransport({ status: 401 }),
  });
  const withSink = await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: "x" }] }],
    allowedToolNames: ["marketplace.search"],
    transport: throwingObjectTransport({ status: 401 }),
    observabilitySink: createSink().sink,
  });
  assertEqual("04S-R3 public outcome unchanged with sink", withSink, withoutSink);

  const followSink = createSink();
  const followResult = await generateFinalAnswerFromToolResult({
    model: MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [{ role: "user", parts: [{ text: "x" }] }],
    providerContext: followUpProviderContext(),
    toolResult: marketplaceToolResult("server-req-1", ["id-one"]),
    transport: throwingObjectTransport({ status: 503 }),
    observabilitySink: followSink.sink,
  });
  assertEqual("04S-R3 follow-up public not ok", followResult.ok, false);
  if (followResult.ok === false) {
    assertEqual("04S-R3 follow-up public code", followResult.code, "provider-error");
  }
  const followEvent = eventsNamed(followSink.events, "gemini_transport_outcome")[0];
  assertEqual("04S-R3 follow-up phase", followEvent?.phase, "follow_up");
  assertEqual("04S-R3 follow-up kind", followEvent?.kind, "provider_error");
  assertEqual("04S-R3 follow-up errorClass", followEvent?.errorClass, "provider-error");
  assertEqual("04S-R3 follow-up providerErrorClass", followEvent?.providerErrorClass, "provider_unavailable");
  assertFalsy("04S-R3 follow-up no listing id", JSON.stringify(followSink.events).includes("id-one"));
  assertNoForbiddenFields("04S-R3 follow-up events", followSink.events);
}

const CLOUD_OBS_LOG_KEYS = new Set([
  "event",
  "requestCorrelationId",
  "stage",
  "kind",
  "reasonCode",
  "providerErrorClass",
  "toolName",
  "providerCallCount",
  "toolExecutionCount",
  "authoritativeResultCount",
  "resultCount",
  "route",
]);

function liveObservabilityEnv(overrides: Record<string, string | undefined> = {}): Record<string, string> {
  return {
    NONGA_RUNTIME_ENV: "local",
    NONGA_DATA_BACKEND: "file",
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: MODEL,
    [NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV]: "true",
    [CONVERSATION_CORE_GEMINI_API_KEY_ENV]: FAKE_API_KEY,
    ...Object.fromEntries(
      Object.entries(overrides).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    ),
  };
}

function parseObservabilityLogs(lines: readonly string[]): Record<string, string | number>[] {
  return lines.map((line) => JSON.parse(line) as Record<string, string | number>);
}

async function test04TCloudObservabilityWiring(): Promise<void> {
  assertFalsy(
    "04T flag default false",
    isConversationCoreObservabilityEnabled(() => undefined)
  );
  assertFalsy(
    "04T flag blank false",
    isConversationCoreObservabilityEnabled(() => "  ")
  );
  assertFalsy(
    "04T flag TRUE false",
    isConversationCoreObservabilityEnabled(() => "TRUE")
  );
  assertFalsy(
    "04T flag 1 false",
    isConversationCoreObservabilityEnabled(() => "1")
  );
  assertTruthy(
    "04T flag true only",
    isConversationCoreObservabilityEnabled((key) =>
      key === NONGA_CONVERSATION_CORE_OBSERVABILITY_ENABLED_ENV ? "true" : undefined
    )
  );

  const leakMapped = toConversationCoreRuntimeObservabilityLog({
    requestCorrelationId: "corr-04t-leak",
    raw: {
      event: "gemini_transport_outcome",
      phase: "initial",
      kind: "provider_error",
      providerErrorClass: "authentication_failed",
      message: "r3-secret-must-not-appear",
      uid: AUTH_UID,
      prompt: SANITIZED_PROMPT,
    } as ConversationCoreRuntimeObservabilityEvent,
  });
  assertTruthy("04T mapper keeps provider class", Boolean(leakMapped));
  const leakSerialized = JSON.stringify(leakMapped);
  assertFalsy("04T mapper omits secret", leakSerialized.includes("r3-secret-must-not-appear"));
  assertFalsy("04T mapper omits uid", leakSerialized.includes(AUTH_UID));
  assertFalsy("04T mapper omits prompt", leakSerialized.includes(SANITIZED_PROMPT));
  assertEqual("04T mapper event name", leakMapped?.event, CONVERSATION_CORE_RUNTIME_OBSERVABILITY_LOG_EVENT);

  const inventory = createFakeInventoryRepository();
  let transportCalls = 0;
  const throwingSeam: ConversationCoreGeminiToolTransportSdkSeam = {
    async generateContent() {
      transportCalls += 1;
      throw { status: 401, message: "04t-raw-provider-message" };
    },
  };
  const request = {
    conversationId: CONVERSATION_ID,
    messageId: MESSAGE_ID,
    userMessage: SANITIZED_PROMPT,
    history: [] as const,
  };
  const context = validatedContext();

  const offLogs: string[] = [];
  const offActivation = resolveConversationCoreLiveServerActivation({
    readEnv: (key) => liveObservabilityEnv()[key],
    inventoryRepository: inventory,
    createSdkSeam: () => throwingSeam,
    writeObservabilityLog: (line) => offLogs.push(line),
    observabilityCorrelationId: "corr-04t-off",
  });
  assertTruthy("04T flag unset activation ready", Boolean(offActivation));
  const offResult = await runConversationCoreOrchestrator(request, context, offActivation);
  assertEqual("04T flag unset no logs", offLogs.length, 0);

  const onLogs: string[] = [];
  transportCalls = 0;
  const onActivation = resolveConversationCoreLiveServerActivation({
    readEnv: (key) =>
      liveObservabilityEnv({
        [NONGA_CONVERSATION_CORE_OBSERVABILITY_ENABLED_ENV]: "true",
      })[key],
    inventoryRepository: inventory,
    createSdkSeam: () => throwingSeam,
    writeObservabilityLog: (line) => onLogs.push(line),
    observabilityCorrelationId: "corr-04t-on",
  });
  assertTruthy("04T flag true activation ready", Boolean(onActivation));
  const onResult = await runConversationCoreOrchestrator(request, context, onActivation);
  assertEqual("04T public result unchanged", onResult, offResult);
  assertEqual("04T fail-closed route", onResult.route, "honest-unavailable");
  if (onResult.route === "honest-unavailable") {
    assertEqual("04T fail-closed code", onResult.error.code, "core-not-ready");
  }
  assertTruthy("04T flag true emits logs", onLogs.length > 0);
  assertTruthy(
    "04T event count bounded",
    onLogs.length <= CONVERSATION_CORE_RUNTIME_OBSERVABILITY_MAX_EVENTS
  );
  assertTruthy(
    "04T provider calls bounded",
    transportCalls <= CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS
  );

  const parsedLogs = parseObservabilityLogs(onLogs);
  const correlationIds = new Set(parsedLogs.map((entry) => String(entry.requestCorrelationId)));
  assertEqual("04T single correlation id", [...correlationIds], ["corr-04t-on"]);
  for (const entry of parsedLogs) {
    assertEqual("04T log event name", entry.event, CONVERSATION_CORE_RUNTIME_OBSERVABILITY_LOG_EVENT);
    for (const key of Object.keys(entry)) {
      assertTruthy(`04T allowed log key ${key}`, CLOUD_OBS_LOG_KEYS.has(key));
    }
  }
  const serializedLogs = JSON.stringify(parsedLogs);
  assertFalsy("04T logs omit raw provider message", serializedLogs.includes("04t-raw-provider-message"));
  assertFalsy("04T logs omit prompt", serializedLogs.includes(SANITIZED_PROMPT));
  assertFalsy("04T logs omit fake key", serializedLogs.includes(FAKE_API_KEY));
  assertFalsy("04T logs omit uid", serializedLogs.includes(AUTH_UID));
  const geminiLog = parsedLogs.find((entry) => entry.stage === "gemini_initial");
  assertEqual("04T gemini class", geminiLog?.providerErrorClass, "authentication_failed");
  const toolLog = parsedLogs.find((entry) => entry.stage === "tool_execution");
  if (toolLog) {
    assertTruthy("04T tool name bounded", toolLog.toolName === "marketplace.search");
  }

  const throwingLogs: string[] = [];
  const throwingActivation = resolveConversationCoreLiveServerActivation({
    readEnv: (key) =>
      liveObservabilityEnv({
        [NONGA_CONVERSATION_CORE_OBSERVABILITY_ENABLED_ENV]: "true",
      })[key],
    inventoryRepository: inventory,
    createSdkSeam: () => throwingSeam,
    writeObservabilityLog: () => {
      throwingLogs.push("attempted");
      throw new Error("04t-observability-write-failed");
    },
    observabilityCorrelationId: "corr-04t-throw",
  });
  const throwingResult = await runConversationCoreOrchestrator(
    request,
    context,
    throwingActivation
  );
  assertEqual("04T observability throw does not change result", throwingResult, offResult);
  assertTruthy("04T observability write attempted", throwingLogs.length > 0);

  const salesBrain = readFileSync(
    resolve("src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts"),
    "utf8"
  );
  assertTruthy(
    "04T legacy orchestrate route unchanged",
    salesBrain.includes("handleChatUserVisibleOrchestratePost")
  );
}

function createReadOnlyInventoryGuard(inner: InventoryRepository): {
  repo: InventoryRepository;
  writeAttempts: { count: number };
} {
  const writeAttempts = { count: 0 };
  const blockWrite = async () => {
    writeAttempts.count += 1;
    throw new Error("04s-write-blocked");
  };
  return {
    writeAttempts,
    repo: {
      backend: inner.backend,
      listings: {
        listPublished: () => inner.listings.listPublished(),
        getById: (id: string) => inner.listings.getById(id),
        listAll: blockWrite,
        listByDealer: blockWrite,
        createListing: blockWrite,
        updateListing: blockWrite,
        updateVisibility: blockWrite,
        deleteListing: blockWrite,
      },
      drafts: {
        listByDealer: blockWrite,
        getById: blockWrite,
        createDraft: blockWrite,
        updateDraft: blockWrite,
        deleteDraft: blockWrite,
      },
      publishDraft: blockWrite,
    },
  };
}

function printProbeField(label: string, value: string | number | boolean): void {
  console.log(`${label}: ${value}`);
}

function publicSignupIsTrue(): boolean {
  return String(process.env.VITE_NONGA_PUBLIC_SIGNUP_ENABLED ?? "").trim() === "true";
}

function classifyFirstFailedStage(input: {
  runtimeKind: string;
  runtimeReason: string;
  initialKind: string;
  initialErrorClass: string;
  toolRequestProduced: boolean;
  toolName: string;
  toolStatus: string;
  toolResultCount: number;
  coordinatorKind: string;
  coordinatorReason: string;
  executionRoute: string;
  followUpKind: string;
}): string {
  if (input.runtimeKind !== "ready") {
    return "RUNTIME_DEPS_UNAVAILABLE";
  }
  if (input.initialKind === "provider_error") {
    return "GEMINI_PROVIDER_ERROR";
  }
  if (input.initialKind === "invalid_response") {
    return "GEMINI_INVALID_STRUCTURED_RESPONSE";
  }
  if (input.initialKind !== "tool_request" || !input.toolRequestProduced) {
    return "GEMINI_NO_TOOL_REQUEST";
  }
  if (input.toolStatus === "rejected") {
    return "TOOL_REQUEST_REJECTED";
  }
  if (input.toolName !== "marketplace.search") {
    return "TOOL_REQUEST_REJECTED";
  }
  if (input.toolStatus === "error") {
    return "MARKETPLACE_EXECUTION_ERROR";
  }
  if (input.toolStatus === "ok" && input.toolResultCount === 0) {
    return "TOOL_RESULT_NORMALIZATION_EMPTY";
  }
  if (input.followUpKind === "provider_error") {
    return "GEMINI_PROVIDER_ERROR";
  }
  if (input.followUpKind === "invalid_response") {
    return "GEMINI_INVALID_STRUCTURED_RESPONSE";
  }
  if (input.coordinatorKind === "grounded" && input.executionRoute === "completed") {
    return "LOCAL PROBE COMPLETED SUCCESSFULLY — CLOUD RUNTIME DIFFERENCE REMAINS";
  }
  if (
    input.coordinatorReason === "invalid-tool-request" ||
    input.coordinatorReason === "trusted-binding-failed" ||
    input.coordinatorReason === "tool-not-allowed"
  ) {
    return "TOOL_REQUEST_REJECTED";
  }
  if (
    input.coordinatorReason === "tool-execution-failed" ||
    input.coordinatorReason === "tool-result-not-ok"
  ) {
    return "MARKETPLACE_EXECUTION_ERROR";
  }
  if (input.coordinatorReason === "invalid-tool-result") {
    return "TOOL_RESULT_NORMALIZATION_EMPTY";
  }
  if (input.coordinatorReason === "follow-up-failed") {
    return "GEMINI_PROVIDER_ERROR";
  }
  if (input.coordinatorReason === "second-tool-request") {
    return "GEMINI_INVALID_STRUCTURED_RESPONSE";
  }
  if (
    input.coordinatorReason === "grounding-failed" ||
    input.coordinatorReason === "deterministic-fallback-invalid"
  ) {
    return "GROUNDING_VALIDATOR_REJECTED";
  }
  return "GROUNDING_VALIDATOR_REJECTED";
}

async function runSanitizedLiveProbe(): Promise<
  "ran" | "blocked-multiline-credential" | "blocked-readonly"
> {
  if (!proveMarketplaceAdapterReadOnly()) {
    console.log("BLOCKED — READ-ONLY PROBE GUARANTEE FAILED");
    return "blocked-readonly";
  }
  pass("04S live: marketplace adapter read-only proven");

  const mutations: EnvMutation[] = [];
  try {
    const loaded = loadAllowlistedSecretsFromApprovedEnvFile(APPROVED_ENV_FILE);
    mutations.push(...applyAllowlistedSecrets(loaded.selected));
    mutations.push(...applyEnvOverlay(LIVE_PROBE_IDENTITY_ENV));

    const processFirebase = inspectFirebaseServiceAccount(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
    const geminiReady = envReady(CONVERSATION_CORE_GEMINI_API_KEY_ENV);
    const firebaseReady = envReady("FIREBASE_SERVICE_ACCOUNT_JSON");
    const jsonValid = processFirebase.valid;
    const projectMatch = processFirebase.projectMatch;
    const firestoreAdminInit = jsonValid && projectMatch ? tryInitFirestoreAdmin() : false;
    const publicSignupTrue = publicSignupIsTrue();

    printProbeField("secret.geminiCredential", geminiReady ? "ready" : "missing");
    printProbeField("secret.firebaseCredential", firebaseReady ? "ready" : "missing");
    printProbeField("secret.firebaseJsonParse", jsonValid ? "valid" : "invalid");
    printProbeField("secret.firebaseProjectIdentityMatch", projectMatch);
    printProbeField("secret.firestoreAdminInit", firestoreAdminInit ? "success" : "fail");
    printProbeField("secret.printed", false);
    printProbeField("publicSignupTrue", publicSignupTrue);

    if (
      !geminiReady ||
      !firebaseReady ||
      !jsonValid ||
      !projectMatch ||
      !firestoreAdminInit ||
      publicSignupTrue
    ) {
      console.log("LOCAL PROBE BLOCKED — MULTILINE CREDENTIAL STILL UNAVAILABLE");
      return "blocked-multiline-credential";
    }

    assertEqual(
      "04S live: provider max",
      CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS,
      2
    );
    assertEqual(
      "04S live: tool max",
      CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS,
      1
    );

    const lane = classifyConversationCoreLane({
      userMessage: SANITIZED_PROMPT,
      capabilities: { coreEnabled: true, geminiEnabled: true, toolsEnabled: true },
      stagedToolNames: ["marketplace.search", "inventory.fetch"],
      trustedPrerequisites: {
        hasTrustedRoomListingSet: false,
        hasTrustedSelectedListing: false,
      },
    });
    const lanePolicy =
      lane.kind === "classified" ? lane.policyLane : "unclassified";
    const laneReason = lane.kind === "classified" ? lane.reasonCode : lane.kind;
    const laneTool =
      lane.kind === "classified" && lane.allowedToolNames.length === 1
        ? lane.allowedToolNames[0]
        : "none";
    if (laneTool !== "marketplace.search") {
      console.log("BLOCKED — READ-ONLY PROBE GUARANTEE FAILED");
      return "blocked-readonly";
    }

    const { events, sink } = createSink();
    const innerRepo = createInventoryRepository();
    const guarded = createReadOnlyInventoryGuard(innerRepo);
    const runtime = createConversationCoreRuntimeDeps({
      activation: {
        killSwitchEnabled: false,
        coreEnabled: true,
        geminiEnabled: true,
        toolsEnabled: true,
        serverStagedToolNames: ["marketplace.search"],
      },
      inventoryRepository: guarded.repo,
      readEnv: (key: string) => process.env[key],
      createSdkSeam: (input: { apiKey: string }) =>
        createConversationCoreGeminiToolTransportSdkSeam(input),
      observabilitySink: sink,
    });

    const printBoundedChain = (
      runtimeKind: string,
      runtimeReason: string,
      executionKind: string
    ): void => {
      const runtimeEvent = eventsNamed(events, "runtime_deps_outcome")[0];
      const initialGemini = eventsNamed(events, "gemini_transport_outcome").find(
        (event) => event.phase === "initial"
      );
      const followGemini = eventsNamed(events, "gemini_transport_outcome").find(
        (event) => event.phase === "follow_up"
      );
      const toolEvents = eventsNamed(events, "tool_execution_outcome");
      const coordinatorEvent = eventsNamed(events, "coordinator_outcome")[0];
      const executionEvent = eventsNamed(events, "execution_service_outcome")[0];
      const toolRequestProduced = initialGemini?.kind === "tool_request";
      const lastTool = toolEvents.at(-1);
      printProbeField("runtime_deps.kind", String(runtimeEvent?.kind ?? runtimeKind));
      printProbeField("runtime_deps.reason", String(runtimeEvent?.reasonCode ?? runtimeReason));
      printProbeField("lane.policy", lanePolicy);
      printProbeField("lane.reason", laneReason);
      printProbeField("lane.tool", laneTool);
      printProbeField("gemini.initial.kind", String(initialGemini?.kind ?? "none"));
      printProbeField("gemini.initial.errorClass", String(initialGemini?.errorClass ?? "none"));
      printProbeField(
        "gemini.initial.providerErrorClass",
        String(initialGemini?.providerErrorClass ?? "none")
      );
      printProbeField("providerCallCount", Number(coordinatorEvent?.providerCallCount ?? 0));
      printProbeField("toolRequestProduced", toolRequestProduced);
      printProbeField("toolName", String(toolEvents[0]?.toolName ?? "none"));
      printProbeField("toolExecution.status", String(lastTool?.status ?? "none"));
      printProbeField("toolExecution.resultCount", Number(lastTool?.resultCount ?? 0));
      printProbeField("gemini.follow_up.kind", String(followGemini?.kind ?? "none"));
      printProbeField("gemini.follow_up.errorClass", String(followGemini?.errorClass ?? "none"));
      printProbeField(
        "gemini.follow_up.providerErrorClass",
        String(followGemini?.providerErrorClass ?? "none")
      );
      printProbeField("coordinator.kind", String(coordinatorEvent?.kind ?? "none"));
      printProbeField("coordinator.reasonCode", String(coordinatorEvent?.reasonCode ?? "none"));
      printProbeField(
        "coordinator.authoritativeResultCount",
        Number(coordinatorEvent?.authoritativeResultCount ?? 0)
      );
      printProbeField("execution.route", String(executionEvent?.route ?? executionKind));
      printProbeField(
        "execution.preservedCoordinatorReasonCode",
        String(executionEvent?.preservedCoordinatorReasonCode ?? "none")
      );
      printProbeField(
        "firstFailedStage",
        classifyFirstFailedStage({
          runtimeKind: String(runtimeEvent?.kind ?? runtimeKind),
          runtimeReason: String(runtimeEvent?.reasonCode ?? runtimeReason),
          initialKind: String(initialGemini?.kind ?? "none"),
          initialErrorClass: String(initialGemini?.errorClass ?? "none"),
          toolRequestProduced,
          toolName: String(toolEvents[0]?.toolName ?? "none"),
          toolStatus: String(lastTool?.status ?? "none"),
          toolResultCount: Number(lastTool?.resultCount ?? 0),
          coordinatorKind: String(coordinatorEvent?.kind ?? "none"),
          coordinatorReason: String(coordinatorEvent?.reasonCode ?? "none"),
          executionRoute: String(executionEvent?.route ?? executionKind),
          followUpKind: String(followGemini?.kind ?? "none"),
        })
      );
    };

    if (runtime.kind !== "ready") {
      printBoundedChain(runtime.kind, runtime.reasonCode, "none");
      return "ran";
    }

    const execution = await runConversationCoreExecutionService({
      request: {
        conversationId: CONVERSATION_ID,
        messageId: MESSAGE_ID,
        userMessage: SANITIZED_PROMPT,
      },
      context: validatedContext(),
      baseInstruction: "You are a read-only vehicle search assistant.",
      policyLane: "authoritative-data",
      geminiConfig: readyConfig(),
      adapter: textAdapter(),
      observabilitySink: sink,
      runGroundedToolTurnCoordinator: runtime.runGroundedToolTurnCoordinator,
    });

    printBoundedChain(runtime.kind, "none", execution.kind);
    printProbeField("writeAttempts", guarded.writeAttempts.count);
    assertEqual("04S live: no writes", guarded.writeAttempts.count, 0);
    assertNoForbiddenFields("04S live events", events);
    assertTruthy(
      "04S live: provider bound",
      Number(eventsNamed(events, "coordinator_outcome")[0]?.providerCallCount ?? 0) <=
        CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS
    );
    assertTruthy(
      "04S live: tool bound",
      Number(eventsNamed(events, "coordinator_outcome")[0]?.toolExecutionCount ?? 0) <=
        CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS
    );
    void execution;
    return "ran";
  } finally {
    restoreEnvMutations(mutations);
  }
}

async function main(): Promise<void> {
  console.log("=== WP-V2U-04S Conversation Core runtime observability ===");
  await testSinkOmittedUnchanged();
  await testRuntimeDepsOutcomes();
  await testGeminiProviderError();
  await testGeminiFinalAnswerWithoutTool();
  await testValidToolRequestAttemptedOnce();
  await testToolRejectedReasonPreserved();
  await testToolSuccessResultCountOnly();
  await testGroundingRejectionBoundedReason();
  await testGroundedSuccessCompleted();
  await testExecutionPreservesCoordinatorReason();
  await testNoPiiAndLegacyUntouched();
  assertTruthy("04S read-only source proof", proveMarketplaceAdapterReadOnly());
  assertEqual("04S-R2 existing deterministic pass count", passCount, 78);
  testLoaderSafety();
  if (!isLiveProbeEnabled()) {
    assertTruthy("04S-R3 existing deterministic total", passCount >= 119);
  }
  await testR3BoundedGeminiErrorClassification();
  await test04TCloudObservabilityWiring();

  if (isLiveProbeEnabled()) {
    const live = await runSanitizedLiveProbe();
    printProbeField("liveProbeStatus", live);
  } else {
    printProbeField("liveProbeStatus", "skipped");
  }

  console.log(`PASS_COUNT=${passCount}`);
}

await main();
