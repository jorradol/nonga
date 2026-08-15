/**
 * WP-V2U-03C3 / R1 — Server-owned Gemini execution foundation (not route-wired).
 */
import {
  CONVERSATION_CORE_POLICY_LANE_IDS,
  CONVERSATION_CORE_POLICY_VERSION,
  getConversationCorePolicyLaneDefinition,
  validateConversationCoreCandidate,
  validateConversationCoreExecutionContext,
  validateConversationCoreResult,
  validateConversationTurnRequest,
  type ConversationCoreExecutionContext,
  type ConversationCorePolicyLane,
  type ConversationCoreResult,
  type ConversationTurnRequest,
  type CorrectionStatus,
  type SafetyOutcome,
  type ValidatorOutcome,
} from "../../services/conversation-core/index";
import {
  isConversationCoreGeminiAdapter,
  type ConversationCoreGeminiAdapter,
} from "./conversationCoreGeminiAdapter";
import {
  runConversationCoreMaxOneCorrection,
  type ConversationCoreMaxOneReasonCode,
} from "./conversationCoreCorrectionService";
import {
  CONVERSATION_CORE_GEMINI_MODEL_FAMILY,
  CONVERSATION_CORE_GEMINI_PROVIDER_ID,
  inspectConversationCoreGeminiConfigStatus,
  type ConversationCoreGeminiConfigStatus,
} from "./conversationCoreGeminiConfig";
import {
  buildConversationCoreHighRiskFallback,
  type ConversationCoreHighRiskFallbackResult,
} from "./conversationCoreHighRiskFallback";

export type ConversationCoreExecutionReasonCode =
  | "invalid-input"
  | "invalid-lane"
  | "gemini-disabled"
  | "missing-model"
  | "invalid-model"
  | "missing-api-key"
  | "invalid-config"
  | "tools-not-ready"
  | "write-action-blocked"
  | "fallback-invalid"
  | "result-invalid"
  | ConversationCoreMaxOneReasonCode;

export type ConversationCoreExecutionResult =
  | {
      readonly kind: "completed";
      readonly result: ConversationCoreResult;
      readonly providerCallCount: number;
      readonly correctionStatus: CorrectionStatus;
    }
  | {
      readonly kind: "honest-unavailable";
      readonly reasonCode: ConversationCoreExecutionReasonCode;
      readonly providerCallCount: number;
    }
  | {
      readonly kind: "blocked";
      readonly reasonCode: "write-action-blocked";
      readonly providerCallCount: 0;
    };

/**
 * 03C3 candidate context: trusted authoritative context is not representable as true.
 * 03D may widen `hasTrustedAuthoritativeContext` after ToolResults exist.
 */
export interface ConversationCoreExecutionCandidateContext {
  readonly highRiskTopicDeclared?: boolean;
  readonly hasTrustedAuthoritativeContext?: false;
}

export interface ConversationCoreExecutionServiceInput {
  readonly request: ConversationTurnRequest;
  readonly context: ConversationCoreExecutionContext;
  readonly baseInstruction: string;
  readonly policyLane: ConversationCorePolicyLane;
  readonly geminiConfig: ConversationCoreGeminiConfigStatus;
  readonly adapter: ConversationCoreGeminiAdapter;
  readonly candidateContext?: ConversationCoreExecutionCandidateContext;
  readonly fallbackBuilder?: (
    input: { policyLane: ConversationCorePolicyLane }
  ) => ConversationCoreHighRiskFallbackResult;
}

const CANDIDATE_CONTEXT_ALLOWED_KEYS = new Set([
  "highRiskTopicDeclared",
  "hasTrustedAuthoritativeContext",
]);

function freezeUnavailable(
  reasonCode: ConversationCoreExecutionReasonCode,
  providerCallCount: number
): ConversationCoreExecutionResult {
  return Object.freeze({
    kind: "honest-unavailable" as const,
    reasonCode,
    providerCallCount,
  });
}

function freezeBlocked(): ConversationCoreExecutionResult {
  return Object.freeze({
    kind: "blocked" as const,
    reasonCode: "write-action-blocked" as const,
    providerCallCount: 0 as const,
  });
}

function freezeCompleted(
  result: ConversationCoreResult,
  providerCallCount: number
): ConversationCoreExecutionResult {
  return Object.freeze({
    kind: "completed" as const,
    result,
    providerCallCount,
    correctionStatus: result.correctionStatus,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isKnownLane(value: unknown): value is ConversationCorePolicyLane {
  return (
    typeof value === "string" &&
    (CONVERSATION_CORE_POLICY_LANE_IDS as readonly string[]).includes(value)
  );
}

function mapConfigUnavailable(
  config: ConversationCoreGeminiConfigStatus
): ConversationCoreExecutionReasonCode {
  if (config.status === "disabled") {
    return "gemini-disabled";
  }
  if (config.status === "unavailable") {
    return config.reasonCode;
  }
  return "missing-api-key";
}

function parseOptionalBooleanFlag(
  raw: Record<string, unknown>,
  key: "highRiskTopicDeclared" | "hasTrustedAuthoritativeContext"
): { ok: true; present: boolean; value?: boolean } | { ok: false } {
  if (!Object.prototype.hasOwnProperty.call(raw, key)) {
    return { ok: true, present: false };
  }
  const value = raw[key];
  if (typeof value !== "boolean") {
    return { ok: false };
  }
  return { ok: true, present: true, value };
}

function inspectCandidateContext(
  raw: unknown
):
  | { ok: true; value: ConversationCoreExecutionCandidateContext | undefined }
  | { ok: false; reasonCode: "invalid-input" | "tools-not-ready" } {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }
  if (!isPlainObject(raw)) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (Object.keys(raw).some((key) => !CANDIDATE_CONTEXT_ALLOWED_KEYS.has(key))) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  const declared = parseOptionalBooleanFlag(raw, "highRiskTopicDeclared");
  if (!declared.ok) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  const trusted = parseOptionalBooleanFlag(raw, "hasTrustedAuthoritativeContext");
  if (!trusted.ok) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (trusted.present && trusted.value === true) {
    return { ok: false, reasonCode: "tools-not-ready" };
  }
  return {
    ok: true,
    value: {
      ...(declared.present ? { highRiskTopicDeclared: declared.value } : {}),
      ...(trusted.present ? { hasTrustedAuthoritativeContext: false as const } : {}),
    },
  };
}

function inspectRuntimeInput(input: ConversationCoreExecutionServiceInput):
  | {
      ok: true;
      request: ConversationTurnRequest;
      context: ConversationCoreExecutionContext;
      policyLane: ConversationCorePolicyLane;
      baseInstruction: string;
      geminiConfig: ConversationCoreGeminiConfigStatus;
      adapter: ConversationCoreGeminiAdapter;
      candidateContext: ConversationCoreExecutionCandidateContext | undefined;
      fallbackBuilder: ConversationCoreExecutionServiceInput["fallbackBuilder"];
    }
  | { ok: false; reasonCode: ConversationCoreExecutionReasonCode } {
  if (!isPlainObject(input as unknown)) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (typeof input.baseInstruction !== "string" || input.baseInstruction.trim().length === 0) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (!isKnownLane(input.policyLane)) {
    return { ok: false, reasonCode: "invalid-lane" };
  }
  if (!isConversationCoreGeminiAdapter(input.adapter)) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (
    Object.prototype.hasOwnProperty.call(input, "fallbackBuilder") &&
    input.fallbackBuilder !== undefined &&
    typeof input.fallbackBuilder !== "function"
  ) {
    return { ok: false, reasonCode: "invalid-input" };
  }

  const turn = validateConversationTurnRequest(input.request);
  if (!turn.ok) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  const context = validateConversationCoreExecutionContext(input.context);
  if (!context.ok) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (turn.value.conversationId !== context.value.conversationId) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (context.value.conversationOwnership.bindingVerified !== true) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (context.value.actorScope.actorRef !== context.value.conversationOwnership.ownerActorRef) {
    return { ok: false, reasonCode: "invalid-input" };
  }
  if (context.value.policyVersion !== CONVERSATION_CORE_POLICY_VERSION) {
    return { ok: false, reasonCode: "invalid-input" };
  }

  const config = inspectConversationCoreGeminiConfigStatus(input.geminiConfig);
  if (!config.ok) {
    return { ok: false, reasonCode: "invalid-input" };
  }

  const candidateContext = inspectCandidateContext(input.candidateContext);
  if (candidateContext.ok === false) {
    return { ok: false, reasonCode: candidateContext.reasonCode };
  }

  return {
    ok: true,
    request: turn.value,
    context: context.value,
    policyLane: input.policyLane,
    baseInstruction: input.baseInstruction,
    geminiConfig: config.value,
    adapter: input.adapter,
    candidateContext: candidateContext.value,
    fallbackBuilder: typeof input.fallbackBuilder === "function" ? input.fallbackBuilder : undefined,
  };
}

function composeResult(input: {
  request: ConversationTurnRequest;
  assistantText: string;
  safetyOutcome: SafetyOutcome;
  validatorOutcome: ValidatorOutcome;
  correctionStatus: CorrectionStatus;
  includeProviderMetadata: boolean;
  errorState?: ConversationCoreResult["errorState"];
}): unknown {
  return {
    conversationId: input.request.conversationId,
    messageId: input.request.messageId,
    assistantText: input.assistantText,
    groundedFactRefs: [],
    workspaceActions: [],
    safetyOutcome: input.safetyOutcome,
    validatorOutcome: input.validatorOutcome,
    correctionStatus: input.correctionStatus,
    ...(input.includeProviderMetadata
      ? {
          providerMetadata: {
            providerId: CONVERSATION_CORE_GEMINI_PROVIDER_ID,
            modelFamily: CONVERSATION_CORE_GEMINI_MODEL_FAMILY,
          },
        }
      : {}),
    toolResultsUsed: [],
    ...(input.errorState ? { errorState: input.errorState } : {}),
  };
}

function validateComposedResult(
  raw: unknown,
  request: ConversationTurnRequest
): ConversationCoreResult | null {
  const validated = validateConversationCoreResult(raw, {
    expectedConversationId: request.conversationId,
    expectedMessageId: request.messageId,
    toolResults: [],
  });
  if (!validated.ok) {
    return null;
  }
  return validated.value;
}

async function completeAccepted(input: {
  request: ConversationTurnRequest;
  assistantText: string;
  providerCallCount: number;
  correctionStatus: CorrectionStatus;
}): Promise<ConversationCoreExecutionResult> {
  const raw = composeResult({
    request: input.request,
    assistantText: input.assistantText,
    safetyOutcome: "pass",
    validatorOutcome: "pass",
    correctionStatus: input.correctionStatus,
    includeProviderMetadata: true,
  });
  const result = validateComposedResult(raw, input.request);
  if (!result) {
    return freezeUnavailable("result-invalid", input.providerCallCount);
  }
  return freezeCompleted(result, input.providerCallCount);
}

function inspectFallbackBuilderResult(raw: unknown): ConversationCoreHighRiskFallbackResult {
  if (!isPlainObject(raw)) {
    return Object.freeze({ ok: false as const, reasonCode: "fallback-invalid" as const });
  }
  if (raw.ok === true && typeof raw.assistantText === "string") {
    return Object.freeze({ ok: true as const, assistantText: raw.assistantText });
  }
  return Object.freeze({ ok: false as const, reasonCode: "fallback-invalid" as const });
}

async function completeHighRiskFallback(input: {
  request: ConversationTurnRequest;
  policyLane: ConversationCorePolicyLane;
  providerCallCount: number;
  fallbackBuilder: ConversationCoreExecutionServiceInput["fallbackBuilder"];
  errorCode: "validation_fallback" | "provider_unavailable" | "unsafe_output";
}): Promise<ConversationCoreExecutionResult> {
  const builder = input.fallbackBuilder ?? buildConversationCoreHighRiskFallback;
  let fallback: ConversationCoreHighRiskFallbackResult;
  try {
    fallback = inspectFallbackBuilderResult(builder({ policyLane: input.policyLane }));
  } catch {
    return freezeUnavailable("fallback-invalid", input.providerCallCount);
  }
  if (!fallback.ok) {
    return freezeUnavailable("fallback-invalid", input.providerCallCount);
  }

  const candidate = validateConversationCoreCandidate({
    candidateText: fallback.assistantText,
    context: { policyLane: input.policyLane },
  });
  if (candidate.outcome !== "accept") {
    return freezeUnavailable("fallback-invalid", input.providerCallCount);
  }

  const raw = composeResult({
    request: input.request,
    assistantText: fallback.assistantText,
    safetyOutcome: "fallback",
    validatorOutcome: "fallback",
    correctionStatus: "fallback",
    includeProviderMetadata: input.providerCallCount > 0,
    errorState: {
      code: input.errorCode,
      fallbackPath: "deterministic-grounded",
    },
  });
  const result = validateComposedResult(raw, input.request);
  if (!result) {
    return freezeUnavailable("result-invalid", input.providerCallCount);
  }
  return freezeCompleted(result, input.providerCallCount);
}

function fallbackErrorCode(
  reasonCode: ConversationCoreMaxOneReasonCode | undefined
): "validation_fallback" | "provider_unavailable" | "unsafe_output" {
  if (
    reasonCode === "provider-error" ||
    reasonCode === "provider-timeout" ||
    reasonCode === "provider-aborted" ||
    reasonCode === "empty-response" ||
    reasonCode === "malformed-response" ||
    reasonCode === "non-text-response" ||
    reasonCode === "oversized-response"
  ) {
    return "provider_unavailable";
  }
  if (reasonCode === "hard-reject") {
    return "unsafe_output";
  }
  return "validation_fallback";
}

/**
 * Execute a server-owned Conversation Core turn foundation.
 * Runtime-validates all inputs before any provider call. Does not classify lanes
 * from user text. Does not call tools. Does not wire routes.
 */
export async function runConversationCoreExecutionService(
  input: ConversationCoreExecutionServiceInput
): Promise<ConversationCoreExecutionResult> {
  const inspected = inspectRuntimeInput(input);
  if (inspected.ok === false) {
    return freezeUnavailable(inspected.reasonCode, 0);
  }

  const {
    request,
    context,
    policyLane,
    baseInstruction,
    geminiConfig,
    adapter,
    candidateContext,
    fallbackBuilder,
  } = inspected;

  void getConversationCorePolicyLaneDefinition(policyLane);

  if (policyLane === "write-action-blocked") {
    return freezeBlocked();
  }

  if (policyLane === "authoritative-data") {
    return freezeUnavailable("tools-not-ready", 0);
  }

  if (!context.featureFlags.coreEnabled || !context.featureFlags.geminiEnabled) {
    return freezeUnavailable("gemini-disabled", 0);
  }

  if (geminiConfig.status !== "ready") {
    return freezeUnavailable(mapConfigUnavailable(geminiConfig), 0);
  }

  const correction = await runConversationCoreMaxOneCorrection({
    adapter,
    model: geminiConfig.model,
    baseInstruction,
    userMessage: request.userMessage,
    history: request.history,
    policyLane,
    candidateContext,
  });

  if (correction.terminal === "accepted" && typeof correction.assistantText === "string") {
    return completeAccepted({
      request,
      assistantText: correction.assistantText,
      providerCallCount: correction.providerCallCount,
      correctionStatus: correction.correctionStatus,
    });
  }

  if (correction.terminal === "needs-fallback" && policyLane === "high-risk-automotive") {
    return completeHighRiskFallback({
      request,
      policyLane,
      providerCallCount: correction.providerCallCount,
      fallbackBuilder,
      errorCode: fallbackErrorCode(correction.reasonCode),
    });
  }

  return freezeUnavailable(
    correction.reasonCode ?? "validation-failed",
    correction.providerCallCount
  );
}
