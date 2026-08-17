/**
 * WP-V2U-03E2D2C2C1 — Dormant orchestrator integration seam.
 * WP-V2U-03E2D2C2C2B — Called by the default orchestrator only when server-controlled
 * activation passes. Wires classifier → lazy runtime-deps resolver → execution
 * for authoritative Search/Inventory only. No live Gemini/network/secrets.
 */
import type {
  ConversationCoreExecutionContext,
  ConversationCoreResult,
  ConversationCoreToolName,
  ConversationTurnRequest,
} from "../../services/conversation-core/index";
import type { ConversationCoreGeminiAdapter } from "./conversationCoreGeminiAdapter";
import type { ConversationCoreGeminiConfigStatus } from "./conversationCoreGeminiConfig";
import {
  runConversationCoreExecutionService,
  type ConversationCoreExecutionResult,
} from "./conversationCoreExecutionService";
import {
  classifyConversationCoreLane,
  type ConversationCoreLaneClassifierContinuationSnapshot,
  type ConversationCoreLaneClassifierInput,
  type ConversationCoreLaneClassifierOutcome,
  type ConversationCoreLaneClassifierTrustedPrerequisiteSnapshot,
} from "./conversationCoreLaneClassifier";
import type {
  ConversationCoreRuntimeDepsActivationSnapshot,
  ConversationCoreRuntimeDepsResult,
  ConversationCoreRuntimeDepsSupportedToolName,
} from "./conversationCoreRuntimeDeps";

export const CONVERSATION_CORE_ORCHESTRATOR_INTEGRATION_SUPPORTED_TOOL_NAMES = [
  "marketplace.search",
  "inventory.fetch",
] as const;

const SUPPORTED_TOOL_SET = new Set<string>(
  CONVERSATION_CORE_ORCHESTRATOR_INTEGRATION_SUPPORTED_TOOL_NAMES
);

const BLOCKED_TOOL_SET = new Set<string>([
  "vehicle.resolveSelection",
  "finance.calculate",
]);

export type ConversationCoreOrchestratorIntegrationFailClosedResult = {
  readonly route: "honest-unavailable";
  readonly error: {
    readonly code: "core-not-ready";
  };
};

export type ConversationCoreOrchestratorIntegrationSuccessResult = {
  readonly route: "completed";
  readonly result: ConversationCoreResult;
  readonly providerCallCount: number;
};

export type ConversationCoreOrchestratorIntegrationResult =
  | ConversationCoreOrchestratorIntegrationFailClosedResult
  | ConversationCoreOrchestratorIntegrationSuccessResult;

export interface ConversationCoreOrchestratorIntegrationInput {
  readonly request: ConversationTurnRequest;
  readonly context: ConversationCoreExecutionContext;
  readonly serverStagedToolNames: readonly ConversationCoreToolName[];
  readonly baseInstruction: string;
  readonly geminiConfig: ConversationCoreGeminiConfigStatus;
  readonly adapter: ConversationCoreGeminiAdapter;
  readonly trustedPrerequisites?: ConversationCoreLaneClassifierTrustedPrerequisiteSnapshot;
  readonly continuation?: ConversationCoreLaneClassifierContinuationSnapshot;
  readonly killSwitchEnabled?: boolean;
}

export type ConversationCoreOrchestratorIntegrationRuntimeResolver = (
  input: { readonly activation: ConversationCoreRuntimeDepsActivationSnapshot }
) => ConversationCoreRuntimeDepsResult;

export type ConversationCoreOrchestratorIntegrationExecutionRunner = (
  input: Parameters<typeof runConversationCoreExecutionService>[0]
) => Promise<ConversationCoreExecutionResult>;

export type ConversationCoreOrchestratorIntegrationLaneClassifier = (
  input: ConversationCoreLaneClassifierInput
) => ConversationCoreLaneClassifierOutcome;

export interface ConversationCoreOrchestratorIntegrationDeps {
  readonly classifyLane?: ConversationCoreOrchestratorIntegrationLaneClassifier;
  readonly resolveRuntimeDeps?: ConversationCoreOrchestratorIntegrationRuntimeResolver;
  readonly runExecution?: ConversationCoreOrchestratorIntegrationExecutionRunner;
}

function freezeFailClosed(): ConversationCoreOrchestratorIntegrationFailClosedResult {
  return Object.freeze({
    route: "honest-unavailable" as const,
    error: Object.freeze({ code: "core-not-ready" as const }),
  });
}

function buildClassifierInput(
  input: ConversationCoreOrchestratorIntegrationInput
): ConversationCoreLaneClassifierInput {
  return Object.freeze({
    userMessage: input.request.userMessage,
    capabilities: Object.freeze({
      coreEnabled: input.context.featureFlags.coreEnabled,
      geminiEnabled: input.context.featureFlags.geminiEnabled,
      toolsEnabled: input.context.featureFlags.toolsEnabled,
    }),
    stagedToolNames: Object.freeze([...input.serverStagedToolNames]),
    trustedPrerequisites: Object.freeze({
      hasTrustedRoomListingSet:
        input.trustedPrerequisites?.hasTrustedRoomListingSet ?? false,
      hasTrustedSelectedListing:
        input.trustedPrerequisites?.hasTrustedSelectedListing ?? false,
    }),
    ...(input.continuation !== undefined ? { continuation: input.continuation } : {}),
  });
}

function buildActivationSnapshot(
  input: ConversationCoreOrchestratorIntegrationInput
): ConversationCoreRuntimeDepsActivationSnapshot {
  return Object.freeze({
    killSwitchEnabled: input.killSwitchEnabled ?? false,
    coreEnabled: input.context.featureFlags.coreEnabled,
    geminiEnabled: input.context.featureFlags.geminiEnabled,
    toolsEnabled: input.context.featureFlags.toolsEnabled,
    serverStagedToolNames: Object.freeze([...input.serverStagedToolNames]),
  });
}

function isSupportedAuthoritativeTool(
  toolName: ConversationCoreToolName
): toolName is ConversationCoreRuntimeDepsSupportedToolName {
  return SUPPORTED_TOOL_SET.has(toolName) && !BLOCKED_TOOL_SET.has(toolName);
}

function buildAuthoritativeExecutionContext(
  context: ConversationCoreExecutionContext,
  allowedTool: ConversationCoreRuntimeDepsSupportedToolName
): ConversationCoreExecutionContext {
  return Object.freeze({
    conversationId: context.conversationId,
    actorScope: context.actorScope,
    conversationOwnership: context.conversationOwnership,
    featureFlags: Object.freeze({
      coreEnabled: context.featureFlags.coreEnabled,
      geminiEnabled: context.featureFlags.geminiEnabled,
      toolsEnabled: true,
      workspaceActionsEnabled: context.featureFlags.workspaceActionsEnabled,
    }),
    toolAllowlist: Object.freeze([allowedTool]),
    receivedAtMs: context.receivedAtMs,
    policyVersion: context.policyVersion,
  });
}

/**
 * Async dormant integration seam: classifier → lazy runtime resolver → execution.
 * Resolver remains injected. Execution defaults to the existing execution service.
 */
export async function runConversationCoreOrchestratorIntegration(
  input: ConversationCoreOrchestratorIntegrationInput,
  deps: ConversationCoreOrchestratorIntegrationDeps
): Promise<ConversationCoreOrchestratorIntegrationResult> {
  const classifyLane = deps.classifyLane ?? classifyConversationCoreLane;
  const classifierOutcome = classifyLane(buildClassifierInput(input));

  if (classifierOutcome.kind !== "classified") {
    return freezeFailClosed();
  }

  if (classifierOutcome.policyLane !== "authoritative-data") {
    return freezeFailClosed();
  }

  if (classifierOutcome.allowedToolNames.length !== 1) {
    return freezeFailClosed();
  }

  const [allowedTool] = classifierOutcome.allowedToolNames;
  if (!isSupportedAuthoritativeTool(allowedTool)) {
    return freezeFailClosed();
  }

  if (typeof deps.resolveRuntimeDeps !== "function") {
    return freezeFailClosed();
  }

  const runtimeResult = deps.resolveRuntimeDeps({
    activation: buildActivationSnapshot(input),
  });

  if (runtimeResult.kind !== "ready") {
    return freezeFailClosed();
  }

  const runExecution = deps.runExecution ?? runConversationCoreExecutionService;
  if (typeof runExecution !== "function") {
    return freezeFailClosed();
  }

  const executionResult = await runExecution({
    request: input.request,
    context: buildAuthoritativeExecutionContext(input.context, allowedTool),
    baseInstruction: input.baseInstruction,
    policyLane: "authoritative-data",
    geminiConfig: input.geminiConfig,
    adapter: input.adapter,
    runGroundedToolTurnCoordinator: runtimeResult.runGroundedToolTurnCoordinator,
  });

  if (executionResult.kind === "completed") {
    return Object.freeze({
      route: "completed" as const,
      result: executionResult.result,
      providerCallCount: executionResult.providerCallCount,
    });
  }

  return freezeFailClosed();
}
