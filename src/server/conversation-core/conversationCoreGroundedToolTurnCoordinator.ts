/**
 * WP-V2U-03E2D2A — Pure grounded tool-turn coordinator (mock-tested, no runtime wiring).
 * Authoritative-data lane only. No correction service. No route/flag integration.
 */
import {
  CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT,
  GEMINI_TURN_OUTCOME_SERVER_OWNED_KEYS,
  isForbiddenToolName,
  isPhase1ReadOnlyToolName,
  listingIdsFromToolResult,
  validateConversationCoreGeminiTurnOutcome,
  validateToolRequest,
  validateToolResult,
  type ConversationCoreAuthoritativeGroundingInput,
  type ConversationCoreAuthoritativeGroundingResult,
  type ConversationCoreGeminiTurnOutcome,
  type ConversationCorePolicyLane,
  type ConversationCoreToolName,
  type ConversationCoreUserAssumption,
  type GroundedFactRef,
  type ToolRequest,
  type ToolResult,
  type ToolResultSummary,
} from "../../services/conversation-core/index";
import type {
  ConversationCoreGeminiFinalAnswerFromToolResultInput,
  ConversationCoreGeminiProviderFunctionCallContext,
  ConversationCoreGeminiStructuredInitialTurnInput,
  ConversationCoreGeminiStructuredInitialTurnSuccess,
  ConversationCoreGeminiToolTransportResult,
} from "./conversationCoreGeminiToolTransport";
import type { ConversationCoreGeminiContentTurn } from "./conversationCoreGeminiAdapter";
import type {
  ConversationCoreToolExecutorInput,
  ConversationCoreToolExecutorOutcome,
  ConversationCoreToolExecutorRejectReason,
  ConversationCoreToolTrustedBinding,
} from "./conversationCoreToolExecutor";

export const CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_REASON_CODES = [
  "coordinator-disabled",
  "unsupported-lane",
  "empty-tool-allowlist",
  "tool-required",
  "invalid-tool-request",
  "tool-not-allowed",
  "trusted-binding-failed",
  "tool-execution-failed",
  "tool-result-not-ok",
  "invalid-tool-result",
  "follow-up-failed",
  "second-tool-request",
  "grounding-failed",
  "deterministic-fallback-invalid",
  "duplicate-execution",
  "provider-call-budget-exceeded",
  "tool-execution-budget-exceeded",
  "invalid-coordinator-input",
] as const;

export type ConversationCoreGroundedToolTurnCoordinatorReasonCode =
  (typeof CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_REASON_CODES)[number];

export const CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT =
  CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT;

export const CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS = 2;
export const CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS = 1;

export interface ConversationCoreGroundedToolTurnInitialTurnInput {
  readonly model: string;
  readonly systemInstruction: string;
  readonly contents: readonly ConversationCoreGeminiContentTurn[];
}

export interface ConversationCoreGroundedToolTurnCoordinatorInput {
  readonly conversationId: string;
  readonly policyLane: ConversationCorePolicyLane;
  readonly toolsEnabled: boolean;
  readonly allowedToolNames: readonly ConversationCoreToolName[];
  readonly initialTurn: ConversationCoreGroundedToolTurnInitialTurnInput;
  readonly userAssumptions?: readonly ConversationCoreUserAssumption[];
  readonly timeoutMs?: number;
}

export interface ConversationCoreGroundedToolTurnCoordinatorDeps {
  readonly generateInitialTurn: (
    input: ConversationCoreGeminiStructuredInitialTurnInput
  ) => Promise<
    ConversationCoreGeminiToolTransportResult<ConversationCoreGeminiStructuredInitialTurnSuccess>
  >;
  readonly generateFollowUp: (
    input: ConversationCoreGeminiFinalAnswerFromToolResultInput
  ) => Promise<ConversationCoreGeminiToolTransportResult<string>>;
  readonly executeTool: (
    input: ConversationCoreToolExecutorInput
  ) => Promise<ConversationCoreToolExecutorOutcome>;
  readonly validateGrounding: (
    input: ConversationCoreAuthoritativeGroundingInput
  ) => ConversationCoreAuthoritativeGroundingResult;
  readonly buildDeterministicGroundedAnswer: (
    toolResult: ToolResult,
    userAssumptions?: readonly ConversationCoreUserAssumption[]
  ) => string;
  readonly mintRequestId: () => string;
}

export type ConversationCoreGroundedToolTurnGroundingStatus =
  | "accepted"
  | "deterministic-fallback";

export interface ConversationCoreGroundedToolTurnCoordinatorSuccess {
  readonly kind: "grounded";
  readonly assistantText: string;
  readonly toolResult: ToolResult;
  readonly toolResultsUsed: readonly ToolResultSummary[];
  readonly groundedFactRefs: readonly GroundedFactRef[];
  readonly groundingStatus: ConversationCoreGroundedToolTurnGroundingStatus;
  readonly correctionStatus: "none";
  readonly providerCallCount: number;
  readonly toolExecutionCount: number;
  readonly workspaceActions: readonly [];
}

export interface ConversationCoreGroundedToolTurnCoordinatorUnavailable {
  readonly kind: "unavailable";
  readonly reasonCode: ConversationCoreGroundedToolTurnCoordinatorReasonCode;
  readonly assistantText: typeof CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT;
  readonly providerCallCount: number;
  readonly toolExecutionCount: number;
}

export type ConversationCoreGroundedToolTurnCoordinatorOutcome =
  | ConversationCoreGroundedToolTurnCoordinatorSuccess
  | ConversationCoreGroundedToolTurnCoordinatorUnavailable;

function freezeUnavailable(
  reasonCode: ConversationCoreGroundedToolTurnCoordinatorReasonCode,
  providerCallCount: number,
  toolExecutionCount: number
): ConversationCoreGroundedToolTurnCoordinatorUnavailable {
  return Object.freeze({
    kind: "unavailable" as const,
    reasonCode,
    assistantText: CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
    providerCallCount,
    toolExecutionCount,
  });
}

function freezeSuccess(
  input: Omit<ConversationCoreGroundedToolTurnCoordinatorSuccess, "kind" | "workspaceActions">
): ConversationCoreGroundedToolTurnCoordinatorSuccess {
  return Object.freeze({
    kind: "grounded" as const,
    ...input,
    workspaceActions: [] as const,
  });
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasServerOwnedToolInputKeys(toolInput: Record<string, unknown>): boolean {
  for (const key of Object.keys(toolInput)) {
    if (
      (GEMINI_TURN_OUTCOME_SERVER_OWNED_KEYS as readonly string[]).includes(key) ||
      key === "requestId" ||
      key === "conversationId" ||
      key === "provenance" ||
      key === "toolResult" ||
      key === "toolResultsUsed" ||
      key === "groundedFactRefs" ||
      key === "workspaceActions"
    ) {
      return true;
    }
  }
  return false;
}

function validateCoordinatorInput(
  input: ConversationCoreGroundedToolTurnCoordinatorInput
): ConversationCoreGroundedToolTurnCoordinatorReasonCode | null {
  if (!isNonEmptyId(input.conversationId)) {
    return "invalid-coordinator-input";
  }
  if (input.policyLane !== "authoritative-data") {
    return "unsupported-lane";
  }
  if (input.toolsEnabled !== true) {
    return "coordinator-disabled";
  }
  if (!Array.isArray(input.allowedToolNames) || input.allowedToolNames.length === 0) {
    return "empty-tool-allowlist";
  }
  const seen = new Set<string>();
  for (const toolName of input.allowedToolNames) {
    if (typeof toolName !== "string") {
      return "invalid-coordinator-input";
    }
    const normalized = toolName.trim();
    if (isForbiddenToolName(normalized) || !isPhase1ReadOnlyToolName(normalized)) {
      return "tool-not-allowed";
    }
    if (seen.has(normalized)) {
      return "invalid-coordinator-input";
    }
    seen.add(normalized);
  }
  const turn = input.initialTurn;
  if (
    !turn ||
    typeof turn.model !== "string" ||
    turn.model.trim().length === 0 ||
    typeof turn.systemInstruction !== "string" ||
    turn.systemInstruction.trim().length === 0 ||
    !Array.isArray(turn.contents)
  ) {
    return "invalid-coordinator-input";
  }
  return null;
}

function isToolAllowedForTurn(
  toolName: ConversationCoreToolName,
  allowedToolNames: readonly ConversationCoreToolName[]
): boolean {
  return allowedToolNames.includes(toolName);
}

function buildTrustedBinding(
  requestId: string,
  conversationId: string,
  toolName: ConversationCoreToolName
): ConversationCoreToolTrustedBinding {
  return Object.freeze({
    requestId,
    conversationId,
    toolName,
  });
}

function buildServerToolRequest(input: {
  conversationId: string;
  requestId: string;
  outcome: Extract<ConversationCoreGeminiTurnOutcome, { kind: "tool-request" }>;
}):
  | { ok: true; request: ToolRequest }
  | { ok: false; reasonCode: ConversationCoreGroundedToolTurnCoordinatorReasonCode } {
  if (hasServerOwnedToolInputKeys(input.outcome.toolInput)) {
    return { ok: false, reasonCode: "invalid-tool-request" };
  }

  const rawRequest = {
    toolName: input.outcome.toolName,
    requestId: input.requestId,
    conversationId: input.conversationId,
    input: input.outcome.toolInput,
  };

  const validated = validateToolRequest(rawRequest);
  if (!validated.ok) {
    return { ok: false, reasonCode: "invalid-tool-request" };
  }

  if (validated.value.conversationId !== input.conversationId) {
    return { ok: false, reasonCode: "trusted-binding-failed" };
  }

  return { ok: true, request: validated.value };
}

function mapExecutorRejectedReason(
  reasonCode: ConversationCoreToolExecutorRejectReason
): ConversationCoreGroundedToolTurnCoordinatorReasonCode {
  if (reasonCode === "invalid_trusted_binding") {
    return "trusted-binding-failed";
  }
  return "invalid-tool-request";
}

function buildProvenanceFromOkToolResult(toolResult: ToolResult): {
  toolResultsUsed: readonly ToolResultSummary[];
  groundedFactRefs: readonly GroundedFactRef[];
} {
  const toolResultsUsed: ToolResultSummary[] = [
    Object.freeze({
      requestId: toolResult.requestId,
      toolName: toolResult.toolName,
      status: toolResult.status,
      provenance: toolResult.provenance,
    }),
  ];

  const groundedFactRefs: GroundedFactRef[] = [
    Object.freeze({ kind: "tool-result", id: toolResult.requestId }),
  ];

  for (const listingId of listingIdsFromToolResult(toolResult)) {
    groundedFactRefs.push(Object.freeze({ kind: "listing", id: listingId }));
  }

  return {
    toolResultsUsed: Object.freeze(toolResultsUsed),
    groundedFactRefs: Object.freeze(groundedFactRefs),
  };
}

function resolveGroundedAssistantText(input: {
  followUpText: string;
  toolResult: ToolResult;
  userAssumptions: readonly ConversationCoreUserAssumption[] | undefined;
  validateGrounding: ConversationCoreGroundedToolTurnCoordinatorDeps["validateGrounding"];
  buildDeterministicGroundedAnswer: ConversationCoreGroundedToolTurnCoordinatorDeps["buildDeterministicGroundedAnswer"];
}):
  | {
      ok: true;
      assistantText: string;
      groundingStatus: ConversationCoreGroundedToolTurnGroundingStatus;
    }
  | { ok: false; reasonCode: ConversationCoreGroundedToolTurnCoordinatorReasonCode } {
  const grounding = input.validateGrounding({
    assistantText: input.followUpText,
    toolResult: input.toolResult,
    userAssumptions: input.userAssumptions,
  });

  if (grounding.ok === true) {
    return {
      ok: true,
      assistantText: grounding.assistantText,
      groundingStatus: "accepted",
    };
  }

  const groundingFailureCode = grounding.code;

  const deterministicText = input.buildDeterministicGroundedAnswer(
    input.toolResult,
    input.userAssumptions
  );
  const deterministicValidation = input.validateGrounding({
    assistantText: deterministicText,
    toolResult: input.toolResult,
    userAssumptions: input.userAssumptions,
  });

  if (deterministicValidation.ok === true) {
    return {
      ok: true,
      assistantText: deterministicValidation.assistantText,
      groundingStatus: "deterministic-fallback",
    };
  }

  if (groundingFailureCode === "finance_precision_loss") {
    return { ok: false, reasonCode: "grounding-failed" };
  }

  return { ok: false, reasonCode: "deterministic-fallback-invalid" };
}

/**
 * Run one authoritative grounded tool turn under server-owned policy.
 * Mock-tested only — no correction, no retries, no runtime wiring.
 */
export async function runConversationCoreGroundedToolTurnCoordinator(
  input: ConversationCoreGroundedToolTurnCoordinatorInput,
  deps: ConversationCoreGroundedToolTurnCoordinatorDeps
): Promise<ConversationCoreGroundedToolTurnCoordinatorOutcome> {
  const inputIssue = validateCoordinatorInput(input);
  if (inputIssue) {
    return freezeUnavailable(inputIssue, 0, 0);
  }

  let providerCallCount = 0;
  let toolExecutionCount = 0;

  if (providerCallCount >= CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS) {
    return freezeUnavailable("provider-call-budget-exceeded", providerCallCount, toolExecutionCount);
  }

  providerCallCount += 1;
  const initialResult = await deps.generateInitialTurn({
    model: input.initialTurn.model,
    systemInstruction: input.initialTurn.systemInstruction,
    contents: input.initialTurn.contents,
    allowedToolNames: input.allowedToolNames,
    transport: { generateContent: async () => ({}) },
    timeoutMs: input.timeoutMs,
  });

  if (providerCallCount > CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS) {
    return freezeUnavailable("provider-call-budget-exceeded", providerCallCount, toolExecutionCount);
  }

  if (!initialResult.ok) {
    return freezeUnavailable("invalid-tool-request", providerCallCount, toolExecutionCount);
  }

  const outcomeValidation = validateConversationCoreGeminiTurnOutcome(
    initialResult.value.outcome
  );
  if (!outcomeValidation.ok) {
    return freezeUnavailable("invalid-tool-request", providerCallCount, toolExecutionCount);
  }

  const outcome = outcomeValidation.value;

  if (outcome.kind === "final-answer") {
    return freezeUnavailable("tool-required", providerCallCount, toolExecutionCount);
  }

  if (!isToolAllowedForTurn(outcome.toolName, input.allowedToolNames)) {
    return freezeUnavailable("tool-not-allowed", providerCallCount, toolExecutionCount);
  }

  const requestId = deps.mintRequestId();
  if (!isNonEmptyId(requestId)) {
    return freezeUnavailable("invalid-tool-request", providerCallCount, toolExecutionCount);
  }

  const boundRequest = buildServerToolRequest({
    conversationId: input.conversationId,
    requestId,
    outcome,
  });
  if (boundRequest.ok === false) {
    return freezeUnavailable(boundRequest.reasonCode, providerCallCount, toolExecutionCount);
  }

  const serverToolRequest = boundRequest.request;

  if (toolExecutionCount >= CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS) {
    return freezeUnavailable("duplicate-execution", providerCallCount, toolExecutionCount);
  }

  toolExecutionCount += 1;
  const executorOutcome = await deps.executeTool({
    rawRequest: serverToolRequest,
    trustedBinding: buildTrustedBinding(
      serverToolRequest.requestId,
      serverToolRequest.conversationId,
      serverToolRequest.toolName
    ),
    trustedToolAllowlist: input.allowedToolNames,
    timeoutMs: input.timeoutMs,
  });

  if (toolExecutionCount > CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_TOOL_EXECUTIONS) {
    return freezeUnavailable("tool-execution-budget-exceeded", providerCallCount, toolExecutionCount);
  }

  if (executorOutcome.kind === "rejected") {
    const reasonCode = mapExecutorRejectedReason(executorOutcome.reasonCode);
    return freezeUnavailable(reasonCode, providerCallCount, toolExecutionCount);
  }

  const validatedToolResult = validateToolResult(executorOutcome.result, {
    requestId: serverToolRequest.requestId,
    conversationId: serverToolRequest.conversationId,
    toolName: serverToolRequest.toolName,
  });

  if (!validatedToolResult.ok) {
    return freezeUnavailable("invalid-tool-result", providerCallCount, toolExecutionCount);
  }

  const toolResult = validatedToolResult.value;

  if (
    toolResult.requestId !== serverToolRequest.requestId ||
    toolResult.conversationId !== serverToolRequest.conversationId ||
    toolResult.toolName !== serverToolRequest.toolName
  ) {
    return freezeUnavailable("invalid-tool-result", providerCallCount, toolExecutionCount);
  }

  if (toolResult.status !== "ok") {
    return freezeUnavailable("tool-result-not-ok", providerCallCount, toolExecutionCount);
  }

  if (providerCallCount >= CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS) {
    return freezeUnavailable("provider-call-budget-exceeded", providerCallCount, toolExecutionCount);
  }

  const providerContext: ConversationCoreGeminiProviderFunctionCallContext | undefined =
    initialResult.value.providerContext;
  if (!providerContext) {
    return freezeUnavailable("follow-up-failed", providerCallCount, toolExecutionCount);
  }

  providerCallCount += 1;
  const followUpResult = await deps.generateFollowUp({
    model: input.initialTurn.model,
    systemInstruction: input.initialTurn.systemInstruction,
    contents: input.initialTurn.contents,
    providerContext,
    toolResult,
    transport: { generateContent: async () => ({}) },
    timeoutMs: input.timeoutMs,
  });

  if (providerCallCount > CONVERSATION_CORE_GROUNDED_TOOL_TURN_MAX_PROVIDER_CALLS) {
    return freezeUnavailable("provider-call-budget-exceeded", providerCallCount, toolExecutionCount);
  }

  if (followUpResult.ok === false) {
    const followUpFailureCode = followUpResult.code;
    const reasonCode =
      followUpFailureCode === "follow-up-function-call-rejected"
        ? "second-tool-request"
        : "follow-up-failed";
    return freezeUnavailable(reasonCode, providerCallCount, toolExecutionCount);
  }

  const grounded = resolveGroundedAssistantText({
    followUpText: followUpResult.value,
    toolResult,
    userAssumptions: input.userAssumptions,
    validateGrounding: deps.validateGrounding,
    buildDeterministicGroundedAnswer: deps.buildDeterministicGroundedAnswer,
  });

  if (grounded.ok === false) {
    return freezeUnavailable(grounded.reasonCode, providerCallCount, toolExecutionCount);
  }

  const provenance = buildProvenanceFromOkToolResult(toolResult);

  return freezeSuccess({
    assistantText: grounded.assistantText,
    toolResult,
    toolResultsUsed: provenance.toolResultsUsed,
    groundedFactRefs: provenance.groundedFactRefs,
    groundingStatus: grounded.groundingStatus,
    correctionStatus: "none",
    providerCallCount,
    toolExecutionCount,
  });
}
