/**
 * WP-V2U-03E2D2B — Grounded tool-turn execution service integration (mock-only).
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-grounded-tool-turn-execution.mts
 */
import {
  CONVERSATION_CORE_POLICY_VERSION,
  buildConversationCoreAuthoritativeGroundedAnswer,
  buildConversationCoreFinanceGroundedAnswer,
  validateConversationCoreResult,
  type ConversationCoreExecutionContext,
  type ConversationCoreToolName,
  type ConversationTurnRequest,
  type FinanceCalculateToolData,
  type ToolResult,
} from "../src/services/conversation-core/index";
import {
  createConversationCoreGeminiAdapter,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV,
  resolveConversationCoreGeminiConfig,
  runConversationCoreExecutionService,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
  type ConversationCoreGroundedToolTurnCoordinatorInput,
  type ConversationCoreGroundedToolTurnCoordinatorOutcome,
  type ConversationCoreGroundedToolTurnCoordinatorSuccess,
} from "../src/server/conversation-core/index";

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

function assertNotIncludes(label: string, haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    console.error(`FAIL [${label}] must not include ${needle}`);
    process.exit(1);
  }
  pass(label);
}

const CONVERSATION_ID = "conv-exec-grounded-001";
const MESSAGE_ID = "msg-exec-grounded-001";
const AUTH_UID = "auth-exec-grounded-uid";
const ALLOWED_MODEL = "gemini-3.5-flash";
const SAFE_TEXT = "แนะนำการดูแลรถยนต์เบื้องต้นอย่างปลอดภัย";
const LISTINGS = ["listing-alpha", "listing-beta"];

const BASE_FINANCE: FinanceCalculateToolData = {
  listingId: "listing-100",
  vehiclePrice: 420_000,
  priceSource: "inventory",
  calculationMode: "listing-bound",
  downPaymentBaht: 84_000,
  downPaymentPercent: 20,
  loanAmount: 336_000,
  annualInterestRatePercent: 5,
  interestMethod: "flat",
  termMonths: 60,
  totalInterest: 42_000,
  monthlyPayment: 6_300,
  totalPayable: 378_000,
  currency: "THB",
  isEstimate: true,
  quotationStatus: "not-quotation",
  vatStatus: "not-calculated",
  additionalChargesStatus: "not-calculated",
};

function validatedTurn(): ConversationTurnRequest {
  return {
    conversationId: CONVERSATION_ID,
    messageId: MESSAGE_ID,
    userMessage: "หารถให้หน่อย",
    history: [{ role: "user", content: "สวัสดีครับ" }],
  };
}

function validatedContext(
  overrides: Partial<{
    toolsEnabled: boolean;
    toolAllowlist: readonly ConversationCoreToolName[];
  }> = {}
): ConversationCoreExecutionContext {
  return {
    conversationId: CONVERSATION_ID,
    actorScope: { kind: "authenticated", actorRef: AUTH_UID, role: "client" },
    conversationOwnership: { ownerActorRef: AUTH_UID, bindingVerified: true },
    featureFlags: {
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: overrides.toolsEnabled ?? false,
      workspaceActionsEnabled: false,
    },
    toolAllowlist: overrides.toolAllowlist ?? [],
    receivedAtMs: 1_700_000_000_000,
    policyVersion: CONVERSATION_CORE_POLICY_VERSION,
  };
}

function readyConfig() {
  return resolveConversationCoreGeminiConfig({
    readEnv: (key) => {
      if (key === NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) return "true";
      if (key === NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV) return ALLOWED_MODEL;
      return undefined;
    },
    apiKeyReady: true,
  });
}

function textAdapter(onGenerate?: () => void) {
  return createConversationCoreGeminiAdapter({
    transport: {
      async generate() {
        onGenerate?.();
        return { kind: "text" as const, text: SAFE_TEXT };
      },
    },
  });
}

function marketplaceToolResult(requestId = "server-req-1"): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "marketplace.search",
    status: "ok",
    provenance: "marketplace-search",
    data: { listingIds: LISTINGS, query: "รถเก๋ง" },
  };
}

function inventoryToolResult(requestId = "server-req-1"): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "inventory.fetch",
    status: "ok",
    provenance: "inventory-api",
    data: { listingIds: LISTINGS },
  };
}

function selectionToolResult(requestId = "server-req-1"): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "vehicle.resolveSelection",
    status: "ok",
    provenance: "vehicle-selection",
    data: { listingId: "listing-alpha", resolved: true },
  };
}

function financeToolResult(requestId = "server-req-1"): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "finance.calculate",
    status: "ok",
    provenance: "finance-calculator",
    data: BASE_FINANCE,
  };
}

function coordinatorSuccess(input: {
  toolResult: ToolResult;
  assistantText: string;
  groundingStatus?: "accepted" | "deterministic-fallback";
}): ConversationCoreGroundedToolTurnCoordinatorSuccess {
  const requestId = input.toolResult.requestId;
  return {
    kind: "grounded",
    assistantText: input.assistantText,
    toolResult: input.toolResult,
    toolResultsUsed: [
      {
        requestId,
        toolName: input.toolResult.toolName,
        status: "ok",
        provenance: input.toolResult.provenance,
      },
    ],
    groundedFactRefs: [
      { kind: "tool-result", id: requestId },
      ...(input.toolResult.data && "listingIds" in input.toolResult.data
        ? input.toolResult.data.listingIds.map((id) => ({ kind: "listing" as const, id }))
        : input.toolResult.data && "listingId" in input.toolResult.data
          ? [{ kind: "listing" as const, id: input.toolResult.data.listingId }]
          : []),
    ],
    groundingStatus: input.groundingStatus ?? "accepted",
    correctionStatus: "none",
    providerCallCount: 2,
    toolExecutionCount: 1,
    workspaceActions: [],
  };
}

type Counters = {
  coordinatorCalls: number;
  correctionCalls: number;
};

async function runExecution(input: {
  lane: ConversationCoreExecutionContext extends never ? never : string;
  toolsEnabled?: boolean;
  toolAllowlist?: readonly ConversationCoreToolName[];
  coordinatorOutcome?: ConversationCoreGroundedToolTurnCoordinatorOutcome;
  coordinatorSpy?: (coordinatorInput: ConversationCoreGroundedToolTurnCoordinatorInput) => void;
}): Promise<{ result: Awaited<ReturnType<typeof runConversationCoreExecutionService>>; counters: Counters }> {
  const counters: Counters = { coordinatorCalls: 0, correctionCalls: 0 };
  const adapter = textAdapter(() => {
    counters.correctionCalls += 1;
  });

  const result = await runConversationCoreExecutionService({
    request: validatedTurn(),
    context: validatedContext({
      toolsEnabled: input.toolsEnabled,
      toolAllowlist: input.toolAllowlist,
    }),
    baseInstruction: "Authoritative assistant",
    policyLane: input.lane as "authoritative-data" | "general-consultative" | "high-risk-automotive",
    geminiConfig: readyConfig(),
    adapter,
    ...(input.coordinatorOutcome || input.coordinatorSpy
      ? {
          runGroundedToolTurnCoordinator: async (coordinatorInput) => {
            counters.coordinatorCalls += 1;
            input.coordinatorSpy?.(coordinatorInput);
            if (counters.coordinatorCalls > 1) {
              console.error("FAIL coordinator called more than once");
              process.exit(1);
            }
            return (
              input.coordinatorOutcome ?? {
                kind: "unavailable" as const,
                reasonCode: "invalid-coordinator-input" as const,
                assistantText: CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
                providerCallCount: 0,
                toolExecutionCount: 0,
              }
            );
          },
        }
      : {}),
  });

  return { result, counters };
}

// --- Preservation ---

{
  const { result, counters } = await runExecution({ lane: "general-consultative" });
  assertEqual("preserve: general completed", result.kind, "completed");
  assertEqual("preserve: general correction used", counters.correctionCalls, 1);
  assertEqual("preserve: general coordinator not called", counters.coordinatorCalls, 0);
  if (result.kind === "completed") {
    assertEqual("preserve: general empty provenance refs", result.result.groundedFactRefs, []);
    assertEqual("preserve: general empty toolResultsUsed", result.result.toolResultsUsed, []);
  }
}

{
  const { result, counters } = await runExecution({ lane: "authoritative-data", toolsEnabled: false });
  assertEqual("disabled: tools off kind", result.kind, "honest-unavailable");
  assertEqual("disabled: tools off coordinator calls", counters.coordinatorCalls, 0);
  assertEqual("disabled: tools off correction calls", counters.correctionCalls, 0);
  if (result.kind === "honest-unavailable") {
    assertEqual("disabled: tools off reason", result.reasonCode, "tools-not-ready");
  }
}

{
  const { result, counters } = await runExecution({
    lane: "authoritative-data",
    toolsEnabled: true,
    toolAllowlist: ["marketplace.search"],
  });
  assertEqual("missing-dep: fail closed kind", result.kind, "honest-unavailable");
  assertEqual("missing-dep: coordinator calls", counters.coordinatorCalls, 0);
  assertEqual("missing-dep: correction calls", counters.correctionCalls, 0);
  if (result.kind === "honest-unavailable") {
    assertEqual("missing-dep: reason", result.reasonCode, "tools-not-ready");
  }
}

// --- Coordinator invocation ---

let capturedCoordinatorInput: ConversationCoreGroundedToolTurnCoordinatorInput | null = null;
const marketplaceSuccess = coordinatorSuccess({
  toolResult: marketplaceToolResult(),
  assistantText: buildConversationCoreAuthoritativeGroundedAnswer(marketplaceToolResult()),
});

{
  const { result, counters } = await runExecution({
    lane: "authoritative-data",
    toolsEnabled: true,
    toolAllowlist: ["marketplace.search"],
    coordinatorOutcome: marketplaceSuccess,
    coordinatorSpy: (input) => {
      capturedCoordinatorInput = input;
    },
  });
  assertEqual("invoke: marketplace completed", result.kind, "completed");
  assertEqual("invoke: marketplace coordinator once", counters.coordinatorCalls, 1);
  assertEqual("invoke: marketplace correction zero", counters.correctionCalls, 0);
  assertTruthy("invoke: coordinator input captured", capturedCoordinatorInput);
  if (capturedCoordinatorInput) {
    assertEqual("invoke: conversation id", capturedCoordinatorInput.conversationId, CONVERSATION_ID);
    assertEqual("invoke: lane", capturedCoordinatorInput.policyLane, "authoritative-data");
    assertEqual("invoke: tools enabled", capturedCoordinatorInput.toolsEnabled, true);
    assertEqual("invoke: allowlist", capturedCoordinatorInput.allowedToolNames, ["marketplace.search"]);
  }
  if (result.kind === "completed") {
    assertEqual("compose: marketplace correction none", result.result.correctionStatus, "none");
    assertEqual("compose: marketplace workspace empty", result.result.workspaceActions, []);
    assertEqual("compose: marketplace toolResultsUsed len", result.result.toolResultsUsed.length, 1);
    assertTruthy("compose: marketplace groundedFactRefs", result.result.groundedFactRefs.length > 0);
    assertTruthy(
      "validator: marketplace passes with actual tool result",
      validateConversationCoreResult(result.result, {
        expectedConversationId: CONVERSATION_ID,
        expectedMessageId: MESSAGE_ID,
        toolResults: [marketplaceToolResult()],
        requiredToolRequestIds: ["server-req-1"],
      }).ok
    );
  }
}

for (const [toolName, toolResult, assistantText, allowlist] of [
  [
    "inventory.fetch",
    inventoryToolResult("server-req-inv"),
    buildConversationCoreAuthoritativeGroundedAnswer(inventoryToolResult("server-req-inv")),
    ["inventory.fetch"],
  ],
  [
    "vehicle.resolveSelection",
    selectionToolResult("server-req-sel"),
    buildConversationCoreAuthoritativeGroundedAnswer(selectionToolResult("server-req-sel")),
    ["vehicle.resolveSelection"],
  ],
  [
    "finance.calculate",
    financeToolResult("server-req-fin"),
    buildConversationCoreFinanceGroundedAnswer(BASE_FINANCE),
    ["finance.calculate"],
  ],
] as const) {
  const success = coordinatorSuccess({ toolResult, assistantText });
  const { result, counters } = await runExecution({
    lane: "authoritative-data",
    toolsEnabled: true,
    toolAllowlist: allowlist,
    coordinatorOutcome: success,
  });
  assertEqual(`tool:${toolName} completed`, result.kind, "completed");
  assertEqual(`tool:${toolName} coordinator once`, counters.coordinatorCalls, 1);
  assertEqual(`tool:${toolName} correction zero`, counters.correctionCalls, 0);
  if (result.kind === "completed") {
    assertTruthy(
      `validator:${toolName} actual tool result`,
      validateConversationCoreResult(result.result, {
        expectedConversationId: CONVERSATION_ID,
        expectedMessageId: MESSAGE_ID,
        toolResults: [toolResult],
        requiredToolRequestIds: [toolResult.requestId],
      }).ok
    );
  }
}

// --- Deterministic fallback ---

{
  const deterministicText = buildConversationCoreAuthoritativeGroundedAnswer(marketplaceToolResult());
  const fallbackSuccess = coordinatorSuccess({
    toolResult: marketplaceToolResult("server-req-fallback"),
    assistantText: deterministicText,
    groundingStatus: "deterministic-fallback",
  });
  const { result } = await runExecution({
    lane: "authoritative-data",
    toolsEnabled: true,
    toolAllowlist: ["marketplace.search"],
    coordinatorOutcome: fallbackSuccess,
  });
  assertEqual("fallback: completed", result.kind, "completed");
  if (result.kind === "completed") {
    assertEqual("fallback: grounding status reflected in errorState", result.result.errorState?.fallbackPath, "deterministic-grounded");
    assertNotIncludes("fallback: no ungrounded prose", result.result.assistantText, "999,999");
    assertEqual("fallback: provenance kept", result.result.toolResultsUsed.length, 1);
  }
}

// --- Invalid bundles ---

async function assertInvalidBundle(
  label: string,
  outcome: ConversationCoreGroundedToolTurnCoordinatorSuccess | Record<string, unknown>
): Promise<void> {
  const bundle = outcome as ConversationCoreGroundedToolTurnCoordinatorSuccess;
  const { result, counters } = await runExecution({
    lane: "authoritative-data",
    toolsEnabled: true,
    toolAllowlist: ["marketplace.search"],
    coordinatorOutcome: bundle,
  });
  assertEqual(`${label}: fail closed kind`, result.kind, "honest-unavailable");
  assertEqual(`${label}: correction zero`, counters.correctionCalls, 0);
  if (result.kind === "honest-unavailable") {
    assertEqual(`${label}: reason`, result.reasonCode, "result-invalid");
  }
}

await assertInvalidBundle(
  "invalid:error tool result",
  {
    ...coordinatorSuccess({
      toolResult: marketplaceToolResult(),
      assistantText: buildConversationCoreAuthoritativeGroundedAnswer(marketplaceToolResult()),
    }),
    toolResult: {
      ...marketplaceToolResult(),
      status: "error",
      errorCode: "inventory_load_failed",
    },
  }
);

await assertInvalidBundle(
  "invalid:request id mismatch summary",
  {
    ...coordinatorSuccess({
      toolResult: marketplaceToolResult("server-req-a"),
      assistantText: buildConversationCoreAuthoritativeGroundedAnswer(marketplaceToolResult("server-req-a")),
    }),
    toolResultsUsed: [
      {
        requestId: "forged-id",
        toolName: "marketplace.search",
        status: "ok",
        provenance: "marketplace-search",
      },
    ],
  }
);

await assertInvalidBundle(
  "invalid:workspace actions",
  {
    ...marketplaceSuccess,
    workspaceActions: [{ kind: "noop-action" } as never],
  }
);

await assertInvalidBundle(
  "invalid:correction status",
  {
    ...marketplaceSuccess,
    correctionStatus: "attempted",
  }
);

await assertInvalidBundle(
  "invalid:provider budget",
  {
    ...marketplaceSuccess,
    providerCallCount: 3,
  }
);

await assertInvalidBundle(
  "invalid:tool execution count",
  {
    ...marketplaceSuccess,
    toolExecutionCount: 0,
  }
);

// --- Coordinator unavailable ---

{
  const { result, counters } = await runExecution({
    lane: "authoritative-data",
    toolsEnabled: true,
    toolAllowlist: ["marketplace.search"],
    coordinatorOutcome: {
      kind: "unavailable",
      reasonCode: "tool-execution-failed",
      assistantText: CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
      providerCallCount: 1,
      toolExecutionCount: 1,
    },
  });
  assertEqual("unavailable: kind", result.kind, "honest-unavailable");
  assertEqual("unavailable: coordinator once", counters.coordinatorCalls, 1);
  assertEqual("unavailable: correction zero", counters.correctionCalls, 0);
  if (result.kind === "honest-unavailable") {
    assertEqual("unavailable: reason mapped", result.reasonCode, "tools-not-ready");
    assertNotIncludes("unavailable: no raw reason", JSON.stringify(result), "tool-execution-failed");
    assertNotIncludes("unavailable: no listing leak", result.reasonCode, "listing-alpha");
  }
}

// --- Validator adversarial ---

if (marketplaceSuccess.kind === "grounded") {
  const composed = {
    conversationId: CONVERSATION_ID,
    messageId: MESSAGE_ID,
    assistantText: marketplaceSuccess.assistantText,
    groundedFactRefs: marketplaceSuccess.groundedFactRefs,
    workspaceActions: [],
    safetyOutcome: "pass",
    validatorOutcome: "pass",
    correctionStatus: "none",
    toolResultsUsed: marketplaceSuccess.toolResultsUsed,
    providerMetadata: { providerId: "conversation-core-gemini", modelFamily: "gemini" },
  };
  assertFalsy(
    "adversarial: missing tool result fails",
    validateConversationCoreResult(composed, {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: MESSAGE_ID,
      toolResults: [],
      requiredToolRequestIds: ["server-req-1"],
    }).ok
  );
  assertFalsy(
    "adversarial: forged listing ref fails",
    validateConversationCoreResult(
      {
        ...composed,
        groundedFactRefs: [
          { kind: "tool-result", id: "server-req-1" },
          { kind: "listing", id: "listing-forged" },
        ],
      },
      {
        expectedConversationId: CONVERSATION_ID,
        expectedMessageId: MESSAGE_ID,
        toolResults: [marketplaceToolResult()],
        requiredToolRequestIds: ["server-req-1"],
      }
    ).ok
  );
}

// --- Disabled-by-construction ---

assertFalsy(
  "disabled-by-construction: no default coordinator on execution input",
  Object.prototype.hasOwnProperty.call(runConversationCoreExecutionService, "runGroundedToolTurnCoordinator")
);

if (passCount < 55) {
  console.error(`FAIL [assertion count] expected at least 55, got ${passCount}`);
  process.exit(1);
}

console.log(`\nConversation Core grounded tool-turn execution tests passed (${passCount} assertions).`);
