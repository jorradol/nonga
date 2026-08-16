/**
 * WP-V2U-03E2D2A — Grounded tool-turn coordinator mock-only tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-grounded-tool-turn-coordinator.mts
 */
import {
  buildConversationCoreAuthoritativeGroundedAnswer,
  buildConversationCoreFinanceGroundedAnswer,
  validateConversationCoreAuthoritativeGrounding,
  type ConversationCoreToolName,
  type FinanceCalculateToolData,
  type ToolResult,
} from "../src/services/conversation-core/index";
import {
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS,
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS,
  runConversationCoreGroundedToolTurnCoordinator,
  type ConversationCoreGeminiProviderFunctionCallContext,
  type ConversationCoreGroundedToolTurnCoordinatorDeps,
  type ConversationCoreGroundedToolTurnCoordinatorInput,
  type ConversationCoreGroundedToolTurnCoordinatorOutcome,
} from "../src/server/conversation-core/index";

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
    console.error(`FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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

const CONVERSATION_ID = "conv-coordinator-001";
const MODEL = "gemini-3.5-flash";
const SYSTEM_INSTRUCTION = "Authoritative assistant";
const CONTENTS = [{ role: "user" as const, parts: [{ text: "หารถให้หน่อย" }] }];
const LISTINGS = ["listing-alpha", "listing-beta"];

function providerContextFor(
  toolName: ConversationCoreToolName,
  args: Record<string, unknown>
): ConversationCoreGeminiProviderFunctionCallContext {
  return {
    functionName: toolName,
    args,
    modelContent: {
      role: "model",
      parts: [{ functionCall: { name: toolName, args } }],
    },
  };
}

function marketplaceToolResult(requestId: string): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "marketplace.search",
    status: "ok",
    provenance: "marketplace-search",
    data: { listingIds: LISTINGS, query: "รถเก๋ง" },
  };
}

function inventoryToolResult(requestId: string): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "inventory.fetch",
    status: "ok",
    provenance: "inventory-api",
    data: { listingIds: LISTINGS },
  };
}

function selectionToolResult(requestId: string, listingId = "listing-alpha"): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "vehicle.resolveSelection",
    status: "ok",
    provenance: "vehicle-selection",
    data: { listingId, resolved: true },
  };
}

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

function financeToolResult(requestId: string): ToolResult {
  return {
    requestId,
    conversationId: CONVERSATION_ID,
    toolName: "finance.calculate",
    status: "ok",
    provenance: "finance-calculator",
    data: BASE_FINANCE,
  };
}

type MockCounters = {
  initialCalls: number;
  followUpCalls: number;
  toolCalls: number;
  correctionCalls: number;
  mintedIds: string[];
};

function baseInput(
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

function createMockDeps(
  overrides: Partial<{
    initialOutcome: ConversationCoreGroundedToolTurnCoordinatorDeps["generateInitialTurn"];
    followUpOutcome: ConversationCoreGroundedToolTurnCoordinatorDeps["generateFollowUp"];
    executeTool: ConversationCoreGroundedToolTurnCoordinatorDeps["executeTool"];
    validateGrounding: ConversationCoreGroundedToolTurnCoordinatorDeps["validateGrounding"];
    buildDeterministicGroundedAnswer: ConversationCoreGroundedToolTurnCoordinatorDeps["buildDeterministicGroundedAnswer"];
    mintRequestId: ConversationCoreGroundedToolTurnCoordinatorDeps["mintRequestId"];
  }> = {}
): { deps: ConversationCoreGroundedToolTurnCoordinatorDeps; counters: MockCounters } {
  const counters: MockCounters = {
    initialCalls: 0,
    followUpCalls: 0,
    toolCalls: 0,
    correctionCalls: 0,
    mintedIds: [],
  };

  let mintCounter = 0;

  const deps: ConversationCoreGroundedToolTurnCoordinatorDeps = {
    mintRequestId:
      overrides.mintRequestId ??
      (() => {
        mintCounter += 1;
        const id = `server-req-${mintCounter}`;
        counters.mintedIds.push(id);
        return id;
      }),
    generateInitialTurn: async (initialInput) => {
      counters.initialCalls += 1;
      if (overrides.initialOutcome) {
        return overrides.initialOutcome(initialInput);
      }
      return {
        ok: true as const,
        value: {
          outcome: {
            kind: "tool-request" as const,
            toolName: "marketplace.search",
            toolInput: { query: "รถเก๋ง" },
          },
          providerContext: providerContextFor("marketplace.search", { query: "รถเก๋ง" }),
        },
      };
    },
    executeTool: async (executorInput) => {
      counters.toolCalls += 1;
      if (overrides.executeTool) {
        return overrides.executeTool(executorInput);
      }
      return {
        kind: "completed" as const,
        result: marketplaceToolResult("server-req-1"),
      };
    },
    generateFollowUp: async (followUpInput) => {
      counters.followUpCalls += 1;
      if (overrides.followUpOutcome) {
        return overrides.followUpOutcome(followUpInput);
      }
      return {
        ok: true as const,
        value: buildConversationCoreAuthoritativeGroundedAnswer(marketplaceToolResult("server-req-1")),
      };
    },
    validateGrounding:
      overrides.validateGrounding ??
      ((input) => validateConversationCoreAuthoritativeGrounding(input)),
    buildDeterministicGroundedAnswer:
      overrides.buildDeterministicGroundedAnswer ??
      ((toolResult, userAssumptions) =>
        buildConversationCoreAuthoritativeGroundedAnswer(toolResult, userAssumptions ?? [])),
  };

  return { deps, counters };
}

function assertUnavailable(
  label: string,
  outcome: ConversationCoreGroundedToolTurnCoordinatorOutcome,
  expectedReason: string,
  expectedProviderCalls: number,
  expectedToolCalls: number
): void {
  if (outcome.kind !== "unavailable") {
    console.error(`FAIL [${label}] expected unavailable`);
    process.exit(1);
  }
  assertEqual(`${label}: reason`, outcome.reasonCode, expectedReason);
  assertEqual(`${label}: provider calls`, outcome.providerCallCount, expectedProviderCalls);
  assertEqual(`${label}: tool calls`, outcome.toolExecutionCount, expectedToolCalls);
  assertEqual(`${label}: safe text`, outcome.assistantText, CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT);
}

function assertBudget(label: string, counters: MockCounters): void {
  assertFalsy(`${label}: correction calls`, counters.correctionCalls > 0);
  if (counters.initialCalls + counters.followUpCalls > CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS) {
    console.error(`FAIL [${label}] provider budget exceeded`);
    process.exit(1);
  }
  if (counters.toolCalls > CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS) {
    console.error(`FAIL [${label}] tool budget exceeded`);
    process.exit(1);
  }
  pass(`${label}: call budgets within limits`);
}

function assertNoLeakage(label: string, outcome: ConversationCoreGroundedToolTurnCoordinatorOutcome): void {
  const text = outcome.kind === "unavailable" ? outcome.assistantText : outcome.assistantText;
  assertNotIncludes(`${label}: no stack trace`, text, "Error:");
  assertNotIncludes(`${label}: no listing payload`, text, "listing-alpha");
  assertNotIncludes(`${label}: no GEMINI_API_KEY`, text, "GEMINI_API_KEY");
  if (outcome.kind === "unavailable") {
    assertFalsy(`${label}: no toolResultsUsed`, "toolResultsUsed" in outcome);
    assertFalsy(`${label}: no groundedFactRefs`, "groundedFactRefs" in outcome);
  }
}

// --- Disabled / preconditions ---

{
  const { deps, counters } = createMockDeps();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ toolsEnabled: false }),
    deps
  );
  assertUnavailable("precondition: tools disabled", outcome, "coordinator-disabled", 0, 0);
  assertEqual("precondition: tools disabled initial calls", counters.initialCalls, 0);
  assertBudget("precondition: tools disabled", counters);
}

{
  const { deps, counters } = createMockDeps();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ policyLane: "general-consultative" }),
    deps
  );
  assertUnavailable("precondition: unsupported lane", outcome, "unsupported-lane", 0, 0);
  assertBudget("precondition: unsupported lane", counters);
}

{
  const { deps, counters } = createMockDeps();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: [] }),
    deps
  );
  assertUnavailable("precondition: empty allowlist", outcome, "empty-tool-allowlist", 0, 0);
  assertBudget("precondition: empty allowlist", counters);
}

{
  const { deps, counters } = createMockDeps();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: ["post.lead" as ConversationCoreToolName] }),
    deps
  );
  assertUnavailable("precondition: forbidden allowed tool", outcome, "tool-not-allowed", 0, 0);
  assertBudget("precondition: forbidden allowed tool", counters);
}

{
  const { deps, counters } = createMockDeps();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ conversationId: "   " }),
    deps
  );
  assertUnavailable("precondition: invalid conversation id", outcome, "invalid-coordinator-input", 0, 0);
  assertEqual("precondition: invalid input no initial", counters.initialCalls, 0);
  assertBudget("precondition: invalid conversation id", counters);
}

// --- Initial outcome ---

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: { kind: "final-answer" as const, assistantText: "นี่คือคำตอบโดยไม่มีเครื่องมือ" },
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("initial: final-answer rejected", outcome, "tool-required", 1, 0);
  assertNotIncludes(
    "initial: final-answer text absent",
    outcome.assistantText,
    "นี่คือคำตอบโดยไม่มีเครื่องมือ"
  );
  assertEqual("initial: final-answer no tool execution", counters.toolCalls, 0);
  assertBudget("initial: final-answer", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({ ok: false as const, code: "multiple-function-calls" }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("initial: transport failure", outcome, "invalid-tool-request", 1, 0);
  assertEqual("initial: transport failure no tool", counters.toolCalls, 0);
  assertBudget("initial: transport failure", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "marketplace.search",
          toolInput: { query: "รถ", requestId: "gemini-forged-id" },
        },
        providerContext: providerContextFor("marketplace.search", { query: "รถ" }),
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("binding: server-owned key injection", outcome, "invalid-tool-request", 1, 0);
  assertBudget("binding: server-owned key injection", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "marketplace.search",
          toolInput: { query: "รถ", forgedField: true },
        },
        providerContext: providerContextFor("marketplace.search", { query: "รถ", forgedField: true }),
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("binding: unknown input key", outcome, "invalid-tool-request", 1, 0);
  assertBudget("binding: unknown input key", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "finance.calculate",
          toolInput: {
            listingId: "listing-100",
            annualInterestRatePercent: 5,
            termMonths: 60,
            downPaymentPercent: 20,
          },
        },
        providerContext: providerContextFor("finance.calculate", {}),
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: ["marketplace.search"] }),
    deps
  );
  assertUnavailable("binding: tool not in turn allowlist", outcome, "tool-not-allowed", 1, 0);
  assertBudget("binding: tool not in turn allowlist", counters);
}

// --- Tool request / binding / execution ---

{
  const { deps, counters } = createMockDeps();
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertTruthy("success: marketplace grounded", outcome.kind === "grounded");
  if (outcome.kind === "grounded") {
    assertEqual("success: provider calls", outcome.providerCallCount, 2);
    assertEqual("success: tool executions", outcome.toolExecutionCount, 1);
    assertEqual("success: correction status", outcome.correctionStatus, "none");
    assertEqual("success: workspace actions empty", outcome.workspaceActions.length, 0);
    assertEqual("success: grounding accepted", outcome.groundingStatus, "accepted");
    assertEqual("success: toolResultsUsed count", outcome.toolResultsUsed.length, 1);
    assertEqual("success: toolResultsUsed request id", outcome.toolResultsUsed[0]?.requestId, "server-req-1");
    assertTruthy(
      "success: groundedFactRefs include tool-result",
      outcome.groundedFactRefs.some((ref) => ref.kind === "tool-result" && ref.id === "server-req-1")
    );
    assertTruthy(
      "success: groundedFactRefs include listings",
      outcome.groundedFactRefs.some((ref) => ref.kind === "listing" && ref.id === "listing-alpha")
    );
  }
  assertEqual("success: minted request id", counters.mintedIds[0], "server-req-1");
  assertBudget("success: marketplace", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "inventory.fetch",
          toolInput: {},
        },
        providerContext: providerContextFor("inventory.fetch", {}),
      },
    }),
    executeTool: async () => ({
      kind: "completed" as const,
      result: inventoryToolResult("server-req-1"),
    }),
    followUpOutcome: async () => ({
      ok: true as const,
      value: buildConversationCoreAuthoritativeGroundedAnswer(inventoryToolResult("server-req-1")),
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: ["inventory.fetch"] }),
    deps
  );
  assertTruthy("tool: inventory success", outcome.kind === "grounded");
  assertBudget("tool: inventory success", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "vehicle.resolveSelection",
          toolInput: { listingId: "listing-alpha" },
        },
        providerContext: providerContextFor("vehicle.resolveSelection", { listingId: "listing-alpha" }),
      },
    }),
    executeTool: async () => ({
      kind: "completed" as const,
      result: selectionToolResult("server-req-1"),
    }),
    followUpOutcome: async () => ({
      ok: true as const,
      value: buildConversationCoreAuthoritativeGroundedAnswer(selectionToolResult("server-req-1")),
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: ["vehicle.resolveSelection"] }),
    deps
  );
  assertTruthy("tool: selection success", outcome.kind === "grounded");
  assertBudget("tool: selection success", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "finance.calculate",
          toolInput: {
            listingId: "listing-100",
            annualInterestRatePercent: 5,
            termMonths: 60,
            downPaymentPercent: 20,
          },
        },
        providerContext: providerContextFor("finance.calculate", {
          listingId: "listing-100",
          annualInterestRatePercent: 5,
          termMonths: 60,
          downPaymentPercent: 20,
        }),
      },
    }),
    executeTool: async () => ({
      kind: "completed" as const,
      result: financeToolResult("server-req-1"),
    }),
    followUpOutcome: async () => ({
      ok: true as const,
      value: buildConversationCoreFinanceGroundedAnswer(BASE_FINANCE),
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: ["finance.calculate"] }),
    deps
  );
  assertTruthy("tool: finance success", outcome.kind === "grounded");
  assertBudget("tool: finance success", counters);
}

{
  const { deps, counters } = createMockDeps({
    executeTool: async () => ({
      kind: "completed" as const,
      result: {
        requestId: "server-req-1",
        conversationId: CONVERSATION_ID,
        toolName: "marketplace.search",
        status: "error",
        provenance: "marketplace-search",
        errorCode: "listing_not_in_trusted_set",
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("tool: cross-room error result", outcome, "tool-result-not-ok", 1, 1);
  assertNoLeakage("tool: cross-room error result", outcome);
  assertBudget("tool: cross-room error result", counters);
}

{
  const { deps, counters } = createMockDeps({
    executeTool: async () => ({
      kind: "rejected" as const,
      reasonCode: "invalid_trusted_binding",
      issues: [{ path: "trustedBinding", code: "invalid_trusted_binding", message: "bad" }],
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("tool: trusted binding rejected", outcome, "trusted-binding-failed", 1, 1);
  assertBudget("tool: trusted binding rejected", counters);
}

{
  const { deps, counters } = createMockDeps({
    executeTool: async () => ({
      kind: "completed" as const,
      result: {
        requestId: "forged-request",
        conversationId: CONVERSATION_ID,
        toolName: "marketplace.search",
        status: "ok",
        provenance: "marketplace-search",
        data: { listingIds: LISTINGS, query: "รถ" },
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("tool: request id mismatch", outcome, "invalid-tool-result", 1, 1);
  assertBudget("tool: request id mismatch", counters);
}

{
  let toolCalls = 0;
  const { deps, counters } = createMockDeps({
    executeTool: async () => {
      toolCalls += 1;
      if (toolCalls > 1) {
        console.error("FAIL [budget: tool executor called more than once]");
        process.exit(1);
      }
      return {
        kind: "completed" as const,
        result: marketplaceToolResult("server-req-1"),
      };
    },
  });
  await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertEqual("budget: tool executor single call", counters.toolCalls, 1);
  pass("budget: tool executor mock enforces single call");
}

// --- Tool result / follow-up ---

{
  const { deps, counters } = createMockDeps({
    executeTool: async () => ({
      kind: "completed" as const,
      result: {
        requestId: "server-req-1",
        conversationId: CONVERSATION_ID,
        toolName: "marketplace.search",
        status: "fallback",
        provenance: "marketplace-search",
        errorCode: "search_fallback",
        fallbackUsed: true,
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("tool: fallback not sent to follow-up", outcome, "tool-result-not-ok", 1, 1);
  assertEqual("tool: fallback no follow-up", counters.followUpCalls, 0);
  assertBudget("tool: fallback not sent to follow-up", counters);
}

{
  const { deps, counters } = createMockDeps({
    followUpOutcome: async () => ({ ok: false as const, code: "follow-up-function-call-rejected" }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("follow-up: second function call", outcome, "second-tool-request", 2, 1);
  assertBudget("follow-up: second function call", counters);
}

{
  const { deps, counters } = createMockDeps({
    followUpOutcome: async () => ({ ok: false as const, code: "provider-timeout" }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("follow-up: provider failure", outcome, "follow-up-failed", 2, 1);
  assertNoLeakage("follow-up: provider failure", outcome);
  assertBudget("follow-up: provider failure", counters);
}

{
  const ungroundedGemini = "รถคันนี้ราคา 999,999 บาท ถูกมาก";
  const { deps, counters } = createMockDeps({
    followUpOutcome: async () => ({ ok: true as const, value: ungroundedGemini }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertTruthy("grounding: deterministic fallback success", outcome.kind === "grounded");
  if (outcome.kind === "grounded") {
    assertEqual("grounding: deterministic status", outcome.groundingStatus, "deterministic-fallback");
    assertNotIncludes("grounding: original prose absent", outcome.assistantText, "999,999");
    assertTruthy("grounding: deterministic still has provenance", outcome.toolResultsUsed.length === 1);
  }
  assertBudget("grounding: deterministic fallback", counters);
}

{
  const { deps, counters } = createMockDeps({
    followUpOutcome: async () => ({ ok: true as const, value: "ข้อความที่ไม่ grounded เลย" }),
    buildDeterministicGroundedAnswer: () => "ข้อความที่ไม่ grounded เลย",
    validateGrounding: () => ({
      ok: false as const,
      code: "unsupported_prose_shape" as const,
      fallbackText: CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("grounding: deterministic invalid", outcome, "deterministic-fallback-invalid", 2, 1);
  assertBudget("grounding: deterministic invalid", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "finance.calculate",
          toolInput: {
            listingId: "listing-100",
            annualInterestRatePercent: 5,
            termMonths: 60,
            downPaymentPercent: 20,
          },
        },
        providerContext: providerContextFor("finance.calculate", {}),
      },
    }),
    executeTool: async () => ({
      kind: "completed" as const,
      result: financeToolResult("server-req-1"),
    }),
    followUpOutcome: async () => ({
      ok: true as const,
      value: buildConversationCoreFinanceGroundedAnswer(BASE_FINANCE).replace("420,000", "421,000"),
    }),
    validateGrounding: (input) => validateConversationCoreAuthoritativeGrounding(input),
    buildDeterministicGroundedAnswer: () =>
      buildConversationCoreFinanceGroundedAnswer(BASE_FINANCE).replace("420,000", "421,000"),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: ["finance.calculate"] }),
    deps
  );
  assertUnavailable("grounding: finance precision loss", outcome, "deterministic-fallback-invalid", 2, 1);
  assertBudget("grounding: finance precision loss", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "finance.calculate",
          toolInput: {
            listingId: "listing-untrusted",
            annualInterestRatePercent: 5,
            termMonths: 60,
            downPaymentPercent: 20,
          },
        },
        providerContext: providerContextFor("finance.calculate", {}),
      },
    }),
    executeTool: async () => ({
      kind: "completed" as const,
      result: {
        requestId: "server-req-1",
        conversationId: CONVERSATION_ID,
        toolName: "finance.calculate",
        status: "error",
        provenance: "finance-calculator",
        errorCode: "listing_not_in_trusted_set",
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(
    baseInput({ allowedToolNames: ["finance.calculate"] }),
    deps
  );
  assertUnavailable("binding: finance untrusted listing", outcome, "tool-result-not-ok", 1, 1);
  assertBudget("binding: finance untrusted listing", counters);
}

{
  const { deps, counters } = createMockDeps({
    initialOutcome: async () => ({
      ok: true as const,
      value: {
        outcome: {
          kind: "tool-request" as const,
          toolName: "marketplace.search",
          toolInput: { query: "รถ" },
        },
      },
    }),
  });
  const outcome = await runConversationCoreGroundedToolTurnCoordinator(baseInput(), deps);
  assertUnavailable("follow-up: missing provider context", outcome, "follow-up-failed", 1, 1);
  assertEqual("follow-up: missing provider context no follow-up", counters.followUpCalls, 0);
  assertBudget("follow-up: missing provider context", counters);
}

if (passCount < 55) {
  console.error(`FAIL [assertion count] expected at least 55, got ${passCount}`);
  process.exit(1);
}

console.log(`\nConversation Core grounded tool-turn coordinator tests passed (${passCount} assertions).`);
