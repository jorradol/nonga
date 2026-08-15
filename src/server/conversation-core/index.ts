/**
 * WP-V2U-03B / R1 — Conversation Core server runtime (Express/auth/env orchestration).
 */
export {
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  resolveConversationCoreFeatureFlags,
  type ConversationCoreLegacyDelegateReason,
  type ConversationCoreResolvedFlags,
} from "./conversationCoreFeatureFlags";

export {
  runConversationCoreOrchestrator,
  type ConversationCoreOrchestratorResult,
} from "./conversationCoreOrchestrator";

export {
  CONVERSATION_CORE_TURN_ROUTE,
  failClosedConversationOwnershipVerifier,
  handleConversationCoreTurnPost,
  registerConversationCoreRoutes,
  type ConversationCoreHonestUnavailableCode,
  type ConversationCoreRouteHandlerDeps,
  type ConversationCoreRouteResponse,
  type ConversationOwnershipVerifier,
  type ConversationOwnershipVerifyResult,
  type RegisterConversationCoreRoutesOptions,
} from "./conversationCoreRouteHandler";
