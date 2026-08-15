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

export {
  CONVERSATION_CORE_ALLOWED_GEMINI_MODELS,
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  CONVERSATION_CORE_GEMINI_MODEL_FAMILY,
  CONVERSATION_CORE_GEMINI_PROVIDER_ID,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV,
  inspectConversationCoreGeminiConfigStatus,
  resolveConversationCoreGeminiConfig,
  type ConversationCoreAllowedGeminiModel,
  type ConversationCoreGeminiConfigInput,
  type ConversationCoreGeminiConfigStatus,
  type ConversationCoreGeminiConfigUnavailableReason,
} from "./conversationCoreGeminiConfig";

export {
  CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS,
  CONVERSATION_CORE_GEMINI_MAX_TIMEOUT_MS,
  buildConversationCoreGeminiContents,
  createConversationCoreGeminiAdapter,
  createConversationCoreGeminiSdkTransport,
  inspectConversationCoreGeminiSdkResponse,
  isConversationCoreGeminiAdapter,
  mapConversationHistoryRoleToGemini,
  resolveConversationCoreGeminiTimeoutMs,
  type ConversationCoreGeminiAdapter,
  type ConversationCoreGeminiAdapterErrorCode,
  type ConversationCoreGeminiAdapterInput,
  type ConversationCoreGeminiAdapterOptions,
  type ConversationCoreGeminiAdapterResult,
  type ConversationCoreGeminiContentTurn,
  type ConversationCoreGeminiGenerateRequest,
  type ConversationCoreGeminiRole,
  type ConversationCoreGeminiTimeoutHandle,
  type ConversationCoreGeminiTransport,
  type ConversationCoreGeminiTransportGenerateOptions,
  type ConversationCoreGeminiTransportResult,
} from "./conversationCoreGeminiAdapter";

export {
  CONVERSATION_CORE_GEMINI_FORBIDDEN_DECLARATION_NAMES,
  CONVERSATION_CORE_GEMINI_FORBIDDEN_DECLARATION_PREFIXES,
  CONVERSATION_CORE_GEMINI_FUNCTION_DECLARATIONS,
  CONVERSATION_CORE_GEMINI_VISIBLE_INPUT_KEYS_BY_TOOL,
  buildConversationCoreGeminiFunctionDeclarations,
} from "./conversationCoreGeminiFunctionDeclarations";

export {
  CONVERSATION_CORE_GEMINI_TOOL_TRANSPORT_ERROR_CODES,
  createConversationCoreGeminiToolTransportSdkSeam,
  generateFinalAnswerFromToolResult,
  generateStructuredInitialTurn,
  isConversationCoreGeminiToolTransportErrorCode,
  type ConversationCoreGeminiFinalAnswerFromToolResultInput,
  type ConversationCoreGeminiProviderFunctionCallContext,
  type ConversationCoreGeminiStructuredInitialTurnInput,
  type ConversationCoreGeminiStructuredInitialTurnSuccess,
  type ConversationCoreGeminiToolTransportErrorCode,
  type ConversationCoreGeminiToolTransportGenerateContentRequest,
  type ConversationCoreGeminiToolTransportResult,
  type ConversationCoreGeminiToolTransportSdkSeam,
} from "./conversationCoreGeminiToolTransport";

export {
  CONVERSATION_CORE_MAX_PROVIDER_CALLS,
  CONVERSATION_CORE_SECRET_HARD_REJECT_CODES,
  buildConversationCoreCorrectionInstruction,
  hasSecretOrPiiHardReject,
  runConversationCoreMaxOneCorrection,
  shouldAttemptCorrection,
  type ConversationCoreCorrectionPhase,
  type ConversationCoreMaxOneCorrectionInput,
  type ConversationCoreMaxOneCorrectionResult,
  type ConversationCoreMaxOneReasonCode,
  type ConversationCoreMaxOneTerminal,
} from "./conversationCoreCorrectionService";

export {
  CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT,
  buildConversationCoreHighRiskFallback,
  type ConversationCoreHighRiskFallbackInput,
  type ConversationCoreHighRiskFallbackResult,
} from "./conversationCoreHighRiskFallback";

export {
  runConversationCoreExecutionService,
  type ConversationCoreExecutionCandidateContext,
  type ConversationCoreExecutionReasonCode,
  type ConversationCoreExecutionResult,
  type ConversationCoreExecutionServiceInput,
  type ConversationCoreExecutionToolInjection,
} from "./conversationCoreExecutionService";

export {
  ConversationCoreToolRegistryDuplicateError,
  createConversationCoreToolRegistry,
  createEmptyConversationCoreToolRegistry,
  type ConversationCoreToolHandler,
  type ConversationCoreToolHandlerOutput,
  type ConversationCoreToolRegistration,
  type ConversationCoreToolRegistry,
} from "./conversationCoreToolRegistry";

export {
  CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS,
  CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES,
  CONVERSATION_CORE_TOOL_MAX_TIMEOUT_MS,
  CONVERSATION_CORE_TOOL_MIN_TIMEOUT_MS,
  executeConversationCoreTool,
  resolveConversationCoreToolTimeoutMs,
  type ConversationCoreToolExecutorDeps,
  type ConversationCoreToolExecutorInput,
  type ConversationCoreToolExecutorOutcome,
  type ConversationCoreToolExecutorRejectReason,
  type ConversationCoreToolExecutorScheduleHandle,
  type ConversationCoreToolTrustedBinding,
} from "./conversationCoreToolExecutor";

export {
  createConversationCoreBusinessToolRegistrations,
  createConversationCoreBusinessToolRegistry,
  type ConversationCoreBusinessToolAdapterDependencies,
} from "./conversationCoreBusinessToolAdapters";

export {
  createConversationCoreFinanceToolRegistrations,
  createConversationCoreFinanceToolRegistry,
  FINANCE_CALCULATE_ADAPTER_ERROR_CODES,
  type ConversationCoreFinanceToolAdapterDeps,
} from "./conversationCoreFinanceToolAdapters";

export {
  createConversationCoreVehicleToolRegistrations,
  createConversationCoreVehicleToolRegistry,
  INVENTORY_FETCH_ADAPTER_ERROR_CODES,
  MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES,
  VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES,
  type ConversationCoreVehicleToolAdapterDeps,
  type ConversationTrustedListingContext,
  type ConversationTrustedListingContextProvider,
  type InventoryFetchToolAdapterDeps,
  type LegacyMarketplaceSearchFn,
  type MarketplaceSearchToolAdapterDeps,
  type ScoredMarketplaceSearchFn,
  type VehicleResolveSelectionToolAdapterDeps,
} from "./conversationCoreVehicleToolAdapters";
