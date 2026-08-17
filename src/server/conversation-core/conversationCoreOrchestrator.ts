/**
 * WP-V2U-03B / R1 — Conversation Core orchestrator skeleton (no provider/tools/legacy).
 * WP-V2U-03E2D2C2C2B — Default orchestrator may call the dormant integration runner
 * only when server-controlled activation is present. No live Gemini/network/secrets.
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
  runConversationCoreOrchestratorIntegration,
  type ConversationCoreOrchestratorIntegrationExecutionRunner,
  type ConversationCoreOrchestratorIntegrationRuntimeResolver,
} from "./conversationCoreOrchestratorIntegration";

export type ConversationCoreOrchestratorFailClosedResult = {
  readonly route: "honest-unavailable";
  readonly error: {
    readonly code: "core-not-ready";
  };
};

export type ConversationCoreOrchestratorCompletedResult = {
  readonly route: "completed";
  readonly result: ConversationCoreResult;
};

export type ConversationCoreOrchestratorResult =
  | ConversationCoreOrchestratorFailClosedResult
  | ConversationCoreOrchestratorCompletedResult;

const SUPPORTED_STAGED_TOOLS = new Set<string>(["marketplace.search", "inventory.fetch"]);

export interface ConversationCoreOrchestratorActivation {
  readonly geminiEnabled: boolean;
  readonly toolsEnabled: boolean;
  readonly serverStagedToolNames: readonly ConversationCoreToolName[];
  readonly baseInstruction: string;
  readonly geminiConfig: ConversationCoreGeminiConfigStatus;
  readonly adapter: ConversationCoreGeminiAdapter;
  readonly resolveRuntimeDeps: ConversationCoreOrchestratorIntegrationRuntimeResolver;
  readonly runExecution?: ConversationCoreOrchestratorIntegrationExecutionRunner;
  readonly killSwitchEnabled?: boolean;
}

function freezeFailClosed(): ConversationCoreOrchestratorFailClosedResult {
  return Object.freeze({
    route: "honest-unavailable" as const,
    error: Object.freeze({ code: "core-not-ready" as const }),
  });
}

function hasSupportedServerStagedTool(
  stagedToolNames: readonly ConversationCoreToolName[]
): boolean {
  return stagedToolNames.some((toolName) => SUPPORTED_STAGED_TOOLS.has(toolName));
}

function isServerControlledActivationReady(
  context: ConversationCoreExecutionContext,
  activation: ConversationCoreOrchestratorActivation | undefined
): activation is ConversationCoreOrchestratorActivation {
  if (!activation) {
    return false;
  }
  if (activation.killSwitchEnabled === true) {
    return false;
  }
  if (context.featureFlags.coreEnabled !== true) {
    return false;
  }
  if (activation.geminiEnabled !== true || activation.toolsEnabled !== true) {
    return false;
  }
  if (typeof activation.resolveRuntimeDeps !== "function") {
    return false;
  }
  if (typeof activation.baseInstruction !== "string" || activation.baseInstruction.trim().length === 0) {
    return false;
  }
  if (!activation.adapter || typeof activation.adapter.generate !== "function") {
    return false;
  }
  if (!Array.isArray(activation.serverStagedToolNames)) {
    return false;
  }
  return hasSupportedServerStagedTool(activation.serverStagedToolNames);
}

function overlayServerActivationContext(
  context: ConversationCoreExecutionContext
): ConversationCoreExecutionContext {
  return Object.freeze({
    conversationId: context.conversationId,
    actorScope: context.actorScope,
    conversationOwnership: context.conversationOwnership,
    featureFlags: Object.freeze({
      coreEnabled: context.featureFlags.coreEnabled,
      geminiEnabled: true,
      toolsEnabled: true,
      workspaceActionsEnabled: false,
    }),
    toolAllowlist: Object.freeze([]),
    receivedAtMs: context.receivedAtMs,
    policyVersion: context.policyVersion,
  });
}

/**
 * Default orchestrator: honest-unavailable unless server-controlled activation passes.
 * Injected callers keep the original two-argument contract.
 */
export function runConversationCoreOrchestrator(
  request: ConversationTurnRequest,
  context: ConversationCoreExecutionContext,
  activation?: ConversationCoreOrchestratorActivation
): ConversationCoreOrchestratorResult | Promise<ConversationCoreOrchestratorResult> {
  if (!isServerControlledActivationReady(context, activation)) {
    return freezeFailClosed();
  }

  return runConversationCoreOrchestratorIntegration(
    {
      request,
      context: overlayServerActivationContext(context),
      serverStagedToolNames: Object.freeze([...activation.serverStagedToolNames]),
      baseInstruction: activation.baseInstruction,
      geminiConfig: activation.geminiConfig,
      adapter: activation.adapter,
      killSwitchEnabled: activation.killSwitchEnabled ?? false,
    },
    {
      resolveRuntimeDeps: activation.resolveRuntimeDeps,
      ...(typeof activation.runExecution === "function"
        ? { runExecution: activation.runExecution }
        : {}),
    }
  ).then((integrated) => {
    if (integrated.route === "completed") {
      return Object.freeze({
        route: "completed" as const,
        result: integrated.result,
      });
    }
    return freezeFailClosed();
  });
}
