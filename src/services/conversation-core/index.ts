/**
 * WP-V2U-02 / R1 — Conversation Core contracts (export-only barrel).
 */

export {
  CONVERSATION_CORE_POLICY_VERSION,
  CONVERSATION_CORE_MAX_ID_LENGTH,
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  CONVERSATION_CORE_MAX_HISTORY_TURNS,
  CONVERSATION_CORE_MAX_HISTORY_CONTENT_CHARS,
  CONVERSATION_CORE_MAX_LOCALE_LENGTH,
  CONVERSATION_CORE_MAX_ATTACHED_IMAGE_COUNT,
  CONVERSATION_CORE_MAX_LISTING_ID_LENGTH,
  CONVERSATION_CORE_MAX_LISTING_ID_COUNT,
  CONVERSATION_CORE_MAX_VERIFIED_TEXT_LENGTH,
  CONVERSATION_CORE_MAX_ERROR_CODE_LENGTH,
  CONVERSATION_CORE_MAX_SNAPSHOT_VERSION_LENGTH,
  CONVERSATION_CORE_MAX_FINANCE_AMOUNT,
  CONVERSATION_CORE_EXPERT_MODES,
  CONVERSATION_HISTORY_ROLES,
  CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS,
  FORBIDDEN_TOOL_NAMES,
  FORBIDDEN_TOOL_NAME_PREFIXES,
  PHASE1_READ_ONLY_TOOLS,
  TOOL_REQUIRED_PROVENANCE_BY_TOOL,
  TOOL_RESULT_PROVENANCES,
  containsHtmlOrScript,
  fail,
  isForbiddenToolName,
  isPhase1ReadOnlyToolName,
  isPlainObject,
  issue,
  rejectUnknownKeys,
  requireBoolean,
  requireFiniteNumber,
  requireString,
  validateConversationCoreExecutionContext,
  validateConversationTurnRequest,
  validateNonEmptyId,
  type ConversationCoreActorScope,
  type ConversationCoreExecutionContext,
  type ConversationCoreExpertMode,
  type ConversationCoreFeatureFlagSnapshot,
  type ConversationCoreOwnershipBinding,
  type ConversationCoreToolName,
  type ConversationHistoryRole,
  type ConversationHistoryTurn,
  type ConversationTurnRequest,
  type SelectedVehicleRef,
  type ToolResultProvenance,
  type ValidationIssue,
  type ValidationResult,
} from "./conversationTurnInput";

export {
  FORBIDDEN_VEHICLE_PROVENANCES,
  TRUSTED_VEHICLE_MISSING_BEHAVIORS,
  TRUSTED_VEHICLE_PROVENANCES,
  VERIFIED_VEHICLE_FIELD_KEYS,
  validateTrustedVehicleContext,
  type TrustedVehicleContext,
  type TrustedVehicleMissingBehavior,
  type TrustedVehicleProvenance,
  type VerifiedVehicleFieldKey,
  type VerifiedVehicleFields,
} from "./trustedVehicleContext";

export {
  TOOL_RESULT_STATUSES,
  listingIdsFromToolResult,
  validateToolRequest,
  validateToolResult,
  type FinanceCalculateToolData,
  type FinanceCalculateToolInput,
  type InventoryFetchToolData,
  type InventoryFetchToolInput,
  type MarketplaceSearchToolData,
  type MarketplaceSearchToolInput,
  type ToolRequest,
  type ToolResult,
  type ToolResultStatus,
  type VehicleResolveSelectionToolData,
  type VehicleResolveSelectionToolInput,
} from "./toolEnvelope";

export {
  WORKSPACE_ACTION_PAYLOAD_VERSION,
  WORKSPACE_ACTION_TYPES,
  WORKSPACE_MODULE_TYPES,
  WORKSPACE_RENDER_BEHAVIORS,
  validateWorkspaceAction,
  type HighlightSelectedVehiclePayload,
  type ShowVehicleResultsPayload,
  type WorkspaceAction,
  type WorkspaceActionProvenance,
  type WorkspaceActionType,
  type WorkspaceActionValidationContext,
  type WorkspaceModuleType,
  type WorkspaceRenderBehavior,
} from "./workspaceAction";

export {
  CONVERSATION_CORE_ASSISTANT_NAME,
  CONVERSATION_CORE_EXPERT_MODE_HINTS,
  CONVERSATION_CORE_EXPERT_MODE_HINT_KEYS,
  CONVERSATION_CORE_PERSONA_CONVERSATION_LINES,
  CONVERSATION_CORE_PERSONA_FORMAT_LINES,
  CONVERSATION_CORE_PERSONA_HONESTY_LINES,
  CONVERSATION_CORE_PERSONA_IDENTITY_LINES,
  CONVERSATION_CORE_PERSONA_PHASE_BOUNDARY_LINES,
  CONVERSATION_CORE_PERSONA_SAFETY_LINES,
  CONVERSATION_CORE_PRODUCT_NAME,
} from "./conversationCorePersona";

export {
  buildConversationCoreBaseInstruction,
  type BuildConversationCoreBaseInstructionInput,
} from "./conversationCoreInstruction";

export {
  CONVERSATION_CORE_POLICY_LANE_DEFINITIONS,
  CONVERSATION_CORE_POLICY_LANE_IDS,
  getConversationCorePolicyLaneDefinition,
  type ConversationCoreLaneFailureBehavior,
  type ConversationCorePolicyLane,
  type ConversationCorePolicyLaneDefinition,
  type ConversationCoreProviderPolicy,
  type ConversationCoreToolRequirement,
  type ConversationCoreValidatorPolicy,
  type ConversationCoreWorkspaceActionPolicy,
} from "./conversationCorePolicyLanes";

export {
  APPROVED_TOOL_FAILURE_ERROR_CODES,
  CORE_ERROR_CODES,
  CORRECTION_STATUSES,
  PROVIDER_METADATA_FORBIDDEN_KEYS,
  SAFETY_OUTCOMES,
  VALIDATOR_OUTCOMES,
  parseTrustedToolResults,
  validateConversationCoreResult,
  type ConversationCoreErrorState,
  type ConversationCoreResult,
  type ConversationCoreResultValidationContext,
  type CoreErrorCode,
  type CorrectionStatus,
  type GroundedFactRef,
  type ProviderMetadata,
  type SafetyOutcome,
  type ToolResultSummary,
  type ValidatorOutcome,
} from "./conversationCoreResult";

export {
  CONVERSATION_CORE_TYPOGRAPHY_ISSUE_CODES,
  validateConversationCoreTypography,
  type ConversationCoreCandidateIssueOutcome,
  type ConversationCoreTypographyIssue,
  type ConversationCoreTypographyIssueCode,
  type ConversationCoreTypographyValidationInput,
  type ConversationCoreTypographyValidationResult,
} from "./conversationCoreTypographyValidator";

export {
  CONVERSATION_CORE_SAFETY_ISSUE_CODES,
  validateConversationCoreSafety,
  type ConversationCoreSafetyIssue,
  type ConversationCoreSafetyIssueCode,
  type ConversationCoreSafetyIssueOutcome,
  type ConversationCoreSafetyValidationInput,
  type ConversationCoreSafetyValidationResult,
} from "./conversationCoreSafetyValidator";

export {
  CONVERSATION_CORE_HIGH_RISK_ISSUE_CODES,
  validateConversationCoreHighRisk,
  type ConversationCoreHighRiskIssue,
  type ConversationCoreHighRiskIssueCode,
  type ConversationCoreHighRiskIssueOutcome,
  type ConversationCoreHighRiskValidationContext,
  type ConversationCoreHighRiskValidationInput,
  type ConversationCoreHighRiskValidationResult,
} from "./conversationCoreHighRiskValidator";

export {
  CONVERSATION_CORE_CANDIDATE_ISSUE_CATEGORIES,
  CONVERSATION_CORE_CANDIDATE_ISSUE_CODES,
  CONVERSATION_CORE_CANDIDATE_OUTCOMES,
  CONVERSATION_CORE_CANDIDATE_OUTCOME_PRECEDENCE,
  validateConversationCoreCandidate,
  type ConversationCoreCandidateIssue,
  type ConversationCoreCandidateIssueCategory,
  type ConversationCoreCandidateIssueCode,
  type ConversationCoreCandidateOutcome,
  type ConversationCoreCandidateValidationContext,
  type ConversationCoreCandidateValidationInput,
  type ConversationCoreCandidateValidationResult,
  type ConversationCoreComposedIssueCode,
} from "./conversationCoreCandidateValidator";
