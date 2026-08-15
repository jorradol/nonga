/**
 * WP-V2U-03B / R1 — Conversation Core orchestrator skeleton (no provider/tools/legacy).
 */
import type {
  ConversationCoreExecutionContext,
  ConversationTurnRequest,
} from "../../services/conversation-core/index";

export type ConversationCoreOrchestratorResult = {
  route: "honest-unavailable";
  error: {
    code: "core-not-ready";
  };
};

/**
 * Phase 1 skeleton: validated request + server-owned execution context only.
 * No legacy orchestrator, provider, tools, workspace actions, or persistence.
 */
export function runConversationCoreOrchestrator(
  _request: ConversationTurnRequest,
  _context: ConversationCoreExecutionContext
): ConversationCoreOrchestratorResult {
  return {
    route: "honest-unavailable",
    error: { code: "core-not-ready" },
  };
}
