/**
 * v6.1L.2c — Server-side user-visible orchestration bridge (auth-trusted UID only).
 * Authenticated route; default-deny; mock pilot path; no client-supplied UID trust.
 */
import type { Express, Request, Response } from "express";
import { evaluateAiFirstAllowlist } from "../../config/ai-first-allowlist";
import {
  getServerAuthContext,
  ServerAuthError,
  type ServerAuthContext,
} from "../../server/serverAuthContext";
import {
  tryOrchestrateChatReplyCore,
  type OrchestratedChatReply,
  mergeProviderGroundingCarCards,
  classifyProviderGroundingIntent,
} from "./chat/chatSearchOrchestrator";
import type { ChatInventoryCar } from "./chat/marketplaceChatSearch";
import { resolveChatListingTransmission } from "./chat/marketplaceChatSearch";
import { isPublishedDiscoveryListing } from "./chat/vehicleDiscoveryMatcher";
import type { ChatV3AutomotiveVehicleContext } from "./chat-v3/chatV3AutomotiveReasoning";
import { parseBoundedSelectedListingId } from "../../utils/chatCarContext";
import { mapChatRoleToSalesBrainUserRole } from "./salesBrainShadowChatPath";
import { wireShadowChatPathWithPilot } from "./salesBrainShadowChatPathNode";
import {
  resolveSalesBrainRuntimeEnvironmentFromProcess,
} from "./salesBrainShadowChatPath";
import {
  resolveSalesBrainRuntimeFlags,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
  type SalesBrainRuntimeEnvironment,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainUserRole } from "./salesBrainTypes";
import type { PilotBuyerSessionContext } from "./chat/chatPilotSessionContext";
import {
  sanitizePilotSessionContext,
  pilotSessionCardsToChatCarCards,
  buildPilotSessionContextFromCarCards,
} from "./chat/chatPilotSessionContext";
import { isPilotBuyerFollowUpMessage } from "./chat/chatPilotBuyerFollowUp";
import {
  isNamedInventoryCompareIntent,
  rehydrateSessionCarsFromInventory,
} from "./chat/inventoryBackedCompare";
import { buildPilotFollowUpNoContextCopy } from "./salesBrainUserVisiblePilotBuyerCopy";
import type { UserVisiblePilotOrchestrationHint } from "./salesBrainUserVisiblePilotTypes";
import {
  AI_USER_VISIBLE_GUARD_POLICY_MARKERS,
  AI_USER_VISIBLE_GUARD_POLICY_VERSION,
  AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS,
  detectOwnerControlledGeminiUxZone,
  evaluateUserVisibleRealProviderEligibility,
  hasDeterministicBoundaryBlock,
  maybeApplyUserVisibleRealProvider,
} from "./salesBrainUserVisibleRealProvider";
import {
  evaluateBuyerAiFirstEligibility,
  BUYER_AI_FIRST_CONVERSATION_SLICE_ID,
} from "./buyerAiFirstConversationPath";
import {
  evaluateUserVisibleGate,
  parseUserVisibleAllowlistUids,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
} from "./salesBrainUserVisibleGate";
import {
  executeChatUserVisibleConversationCoreTurn,
  resolveChatUserVisibleConversationCoreRouting,
  type ChatUserVisibleConversationCoreRunner,
} from "../../server/conversation-core/conversationCoreChatUserVisiblePilotBridge";
import { hashPiiForLog } from "../../utils/piiLogRedaction";
import {
  executeChatV2V3GeneralBridgeTurn,
  resolveChatV2V3GeneralBridgeRouting,
  sanitizeBoundedGeneralBridgeHistory,
  type ChatV2V3GeneralConversationRunner,
} from "./chat/chatV2V3GeneralConversationBridge";
import {
  executeChatV2V3SearchGroundingTurn,
  resolveChatV2V3SearchGroundingRouting,
  type ChatV2V3SearchGroundingRunner,
  type ChatV2V3SearchGroundingTurnOutcome,
} from "./chat/chatV2V3SearchGroundingBridge";
import type {
  SearchCountClaimDisposition,
  SearchDisplayOrderClassification,
} from "./chat/chatV2V3SearchGroundingCompose";
import {
  CHAT_V3_USER_FACING_UNAVAILABLE,
  type SearchCompositionFallbackReason,
  type SearchCompositionStructuredOutputParseStatus,
  type SearchCompositionValidationCode,
  type SearchPresentationMode,
} from "./chat-v3/chatV3ConversationContracts";
import {
  CHAT_V3_GENERAL_CONVERSATION_BRAIN,
  type ChatV3GeneralConversationBrainStatus,
} from "./chat/chatV2V3GeneralBridgeClientApply";
import {
  CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
  type ChatV3SearchGroundedConversationBrainStatus,
} from "./chat/chatV2V3SearchGroundingClientApply";

export const SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE =
  "/api/ai/chat-user-visible-orchestrate";

export const USER_VISIBLE_ORCHESTRATION_BRIDGE_SLICE_ID = "v6.1L.2c";
export const USER_VISIBLE_RUNTIME_ATTRIBUTION_SLICE_ID = "runtime-attribution-v1";

const MAX_USER_MESSAGE_LENGTH = 4000;
const RUNTIME_ATTRIBUTION_LOG_EVENT = "user_visible_runtime_attribution";
const POST_INVOKE_REAL_PROVIDER_GATE_REASONS = new Set([
  "real_provider_call_ok",
  "real_provider_output_unsafe",
  "real_provider_call_failed",
]);

export type UserVisibleRuntimeTextSource = "orchestrator" | "provider" | "fallback";
export type UserVisibleRuntimeSafetyResult = "accepted" | "rejected" | "not_run";

export type UserVisibleRuntimeRoutingLane =
  | "search"
  | "general"
  | "conversation-core"
  | "legacy"
  | "kill-switch";

export type UserVisibleRuntimeBusinessToolName = "marketplace.search" | "none";

export type UserVisibleRuntimeGroundedV3CompositionOutcome =
  | "success"
  | "deterministic-fallback"
  | "failed-closed"
  | "not-applicable";

export type SelectedVehicleGroundingOutcome =
  | "no-selection"
  | "malformed-id"
  | "not-found"
  | "unavailable"
  | "resolved";

export interface UserVisibleRuntimeLaneEvidence {
  routingLane: UserVisibleRuntimeRoutingLane;
  businessToolName: UserVisibleRuntimeBusinessToolName;
  marketplaceSearchExecutionCount: 0 | 1;
  inventoryFetchExecutionCount: 0 | 1;
  geminiInitialFunctionCallingAttemptCount: 0 | 1;
  groundedV3CompositionAttempted: boolean;
  groundedV3CompositionOutcome: UserVisibleRuntimeGroundedV3CompositionOutcome;
  legacyFallbackAfterSearchSelection: boolean;
  validatedToolResultListingIdCount?: number;
  orderedCardCount?: number;
  displayedCardCount?: number;
  displayOrderClassification?: SearchDisplayOrderClassification;
  structuredOrderValid?: boolean;
  searchFailureClassification: "none" | string;
  searchCompositionFallbackReason?: SearchCompositionFallbackReason;
  structuredOutputParseStatus?: SearchCompositionStructuredOutputParseStatus;
  searchCompositionTextPresent?: boolean;
  searchCompositionValidationCode?: SearchCompositionValidationCode;
  searchPresentationMode?: SearchPresentationMode;
  searchCountClaimDisposition?: SearchCountClaimDisposition;
  selectedVehicleGroundingRequested?: boolean;
  selectedVehicleGroundingOutcome?: SelectedVehicleGroundingOutcome;
  selectedVehicleContextSupplied?: boolean;
}

export interface UserVisibleRuntimeAttributionDiagnostic {
  sliceId: string;
  requestCorrelationId: string;
  aiFirstPathActive: boolean;
  realProviderEligible: boolean;
  realProviderInvocationAttempted: boolean;
  realProviderNetwork: boolean;
  realProviderGateReason: string;
  fallbackUsed: boolean;
  fallbackReason: string;
  candidateCount: number;
  groundingVehicleCount: number;
  textSource: UserVisibleRuntimeTextSource;
  safetyResult: UserVisibleRuntimeSafetyResult;
  gateCheck: "PASSED" | "FAILED";
  gateAuthPath: string;
  realProviderGateReasonDetail: string;
  providerGroundingIntent: string;
  sessionGroundingCount: number;
  orchestratedGroundingCount: number;
  capturedAt: string;
  /** One-way SHA-256 of verified auth.uid. Diagnostic only; never authorize from this. */
  verifiedActorFingerprint?: string;
  routingLane?: UserVisibleRuntimeRoutingLane;
  conversationBrain?: string;
  conversationBrainStatus?: string;
  businessToolName?: UserVisibleRuntimeBusinessToolName;
  marketplaceSearchExecutionCount?: 0 | 1;
  inventoryFetchExecutionCount?: 0 | 1;
  geminiInitialFunctionCallingAttemptCount?: 0 | 1;
  groundedV3CompositionAttempted?: boolean;
  groundedV3CompositionOutcome?: UserVisibleRuntimeGroundedV3CompositionOutcome;
  legacyFallbackAfterSearchSelection?: boolean;
  validatedToolResultListingIdCount?: number;
  orderedCardCount?: number;
  displayedCardCount?: number;
  displayOrderClassification?: SearchDisplayOrderClassification;
  structuredOrderValid?: boolean;
  searchFailureClassification?: "none" | string;
  skipGemini?: boolean;
  searchCompositionFallbackReason?: SearchCompositionFallbackReason;
  structuredOutputParseStatus?: SearchCompositionStructuredOutputParseStatus;
  searchCompositionTextPresent?: boolean;
  searchCompositionValidationCode?: SearchCompositionValidationCode;
  searchPresentationMode?: SearchPresentationMode;
  searchCountClaimDisposition?: SearchCountClaimDisposition;
  selectedVehicleGroundingRequested?: boolean;
  selectedVehicleGroundingOutcome?: SelectedVehicleGroundingOutcome;
  selectedVehicleContextSupplied?: boolean;
}
const MAX_USER_VISIBLE_EVIDENCE_CHARS = 1200;

export function buildAuthoritativeSelectedVehicleContext(
  car: ChatInventoryCar
): ChatV3AutomotiveVehicleContext {
  const facts: Record<string, string> = {
    brand: String(car.brand ?? "").trim(),
    model: String(car.model ?? "").trim(),
    year: String(car.year),
    price: String(car.price),
    source: "authoritative-marketplace-inventory",
  };
  if (typeof car.mileage === "number" && car.mileage > 0) {
    facts.mileage = String(car.mileage);
  }
  const transmission =
    resolveChatListingTransmission(car) ?? String(car.transmission ?? "").trim();
  if (transmission) {
    facts.transmission = transmission;
  }
  if (car.listingStatus) {
    facts.listingStatus = String(car.listingStatus);
  }
  if (car.saleStatus) {
    facts.saleStatus = String(car.saleStatus);
  }
  return {
    selectedVehicleId: car.id,
    vehicles: [
      {
        id: car.id,
        label: `${car.year} ${car.brand} ${car.model}`.trim(),
        facts,
      },
    ],
  };
}

/**
 * Authoritative listing-by-id resolver for General V.3 follow-ups.
 * Source: loadChatInventory() → listPublished(); visibility via isPublishedDiscoveryListing.
 */
export function resolveAuthoritativeSelectedVehicleContext(
  selectedListingId: string | null | undefined,
  inventory: readonly ChatInventoryCar[]
): {
  outcome: SelectedVehicleGroundingOutcome;
  context: ChatV3AutomotiveVehicleContext | null;
} {
  if (selectedListingId == null || selectedListingId === "") {
    return { outcome: "no-selection", context: null };
  }
  const id = parseBoundedSelectedListingId(selectedListingId);
  if (!id) {
    return { outcome: "malformed-id", context: null };
  }
  const car = inventory.find((entry) => String(entry.id ?? "").trim() === id);
  if (!car) {
    return { outcome: "not-found", context: null };
  }
  if (!isPublishedDiscoveryListing(car)) {
    return { outcome: "unavailable", context: null };
  }
  return {
    outcome: "resolved",
    context: buildAuthoritativeSelectedVehicleContext(car),
  };
}

function selectedVehicleGroundingLaneEvidence(input: {
  requested: boolean;
  outcome: SelectedVehicleGroundingOutcome;
}): Pick<
  UserVisibleRuntimeLaneEvidence,
  | "selectedVehicleGroundingRequested"
  | "selectedVehicleGroundingOutcome"
  | "selectedVehicleContextSupplied"
> {
  return {
    selectedVehicleGroundingRequested: input.requested,
    selectedVehicleGroundingOutcome: input.outcome,
    selectedVehicleContextSupplied: input.outcome === "resolved",
  };
}

export interface UserVisibleOrchestrationBridgeInput {
  userMessage: string;
  inventory: ChatInventoryCar[];
  trustedFirebaseUid: string;
  displayName?: string;
  attachedImageCount?: number;
  userRole: SalesBrainUserRole;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  /** v6.1L.2g — client session last-shown cards (listing fields only) */
  pilotSessionContext?: PilotBuyerSessionContext;
}

export interface RedactedUserVisibleOrchestrationPayload {
  sliceId: string;
  userVisibleText: string;
  pilotPathActive: boolean;
  fallbackToLegacy: boolean;
  skipGemini: boolean;
  carCardCount: number;
  hasMoreCars?: boolean;
  isDraftPreview?: boolean;
  /**
   * WP-NVB-02E / WP-NVB-03B — Server-owned V.3 discriminator.
   * Set only when General Bridge or Search Grounding is selected.
   * Never derived from userRole or request body. Not realProviderNetwork.
   */
  conversationBrain?:
    | typeof CHAT_V3_GENERAL_CONVERSATION_BRAIN
    | typeof CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN;
  conversationBrainStatus?:
    | ChatV3GeneralConversationBrainStatus
    | ChatV3SearchGroundedConversationBrainStatus;
  /** v6.8D — redacted real-provider diagnostics (no secret values) */
  realProviderNetwork?: boolean;
  realProviderGateReason?: string;
  /** v13.15N-N — masked allowlist diagnostics (no raw UID / token / secret). */
  userVisibleGateDiagnostic?: {
    blockedReason: string;
    requestUidMasked: string;
    allowlistMasked: string[];
    allowlistMatch: boolean;
    allowlistCount: number;
  };
  /** v13.15N-W — runtime status-only diagnostics for pilot-path mismatch analysis. */
  userVisibleRuntimeDiagnostic?: {
    runtimeMode: string;
    provider: string;
    userVisibleEnabled: boolean;
    realProviderEnabled: boolean;
    ownerControlledUxEnabled: boolean;
    aiFirstEnabled: boolean;
    aiFirstPathActive: boolean;
    aiFirstSliceId: string;
    pilotContextPresentServer: boolean;
    serverRecentCarCardsCount: number;
    followUpMessage: boolean;
    pilotInactiveReason: string;
    guardPolicyVersion: string;
    thaiUxTuningSliceId: string;
    thaiUxTuningActive: boolean;
    targetAnswerLengthGuidance: string;
    leadPiiCueGuardActive: boolean;
    phoneEchoGuardActive: boolean;
    safeConfirmationStepWordingActive: boolean;
  };
}

export interface UserVisibleOrchestrationBridgeResult {
  orchestrated: OrchestratedChatReply | null;
  payload: RedactedUserVisibleOrchestrationPayload;
}

function mapAuthToSalesBrainRole(auth: ServerAuthContext): SalesBrainUserRole {
  return mapChatRoleToSalesBrainUserRole({
    role: auth.role,
    isAdmin: auth.role === "admin" || auth.role === "superadmin",
    isDealer: auth.role === "dealer" || Boolean(auth.dealerId),
  });
}

function resolveBridgeEnvironment(
  override?: SalesBrainRuntimeEnvironment
): SalesBrainRuntimeEnvironment {
  if (override) {
    return override;
  }
  return resolveSalesBrainRuntimeEnvironmentFromProcess();
}

function buildRedactedPayload(
  orchestrated: OrchestratedChatReply | null,
  userVisibleText: string,
  pilotPathActive: boolean,
  fallbackToLegacy: boolean
): RedactedUserVisibleOrchestrationPayload {
  return {
    sliceId: USER_VISIBLE_ORCHESTRATION_BRIDGE_SLICE_ID,
    userVisibleText,
    pilotPathActive,
    fallbackToLegacy,
    skipGemini: orchestrated?.skipGemini ?? false,
    carCardCount: orchestrated?.carCards?.length ?? 0,
    hasMoreCars: orchestrated?.hasMoreCars,
    isDraftPreview: orchestrated?.isDraftPreview,
  };
}

function withGeneralBridgeConversationBrain(
  payload: RedactedUserVisibleOrchestrationPayload,
  status: ChatV3GeneralConversationBrainStatus
): RedactedUserVisibleOrchestrationPayload {
  return {
    ...payload,
    conversationBrain: CHAT_V3_GENERAL_CONVERSATION_BRAIN,
    conversationBrainStatus: status,
  };
}

function withSearchGroundingConversationBrain(
  payload: RedactedUserVisibleOrchestrationPayload,
  status: ChatV3SearchGroundedConversationBrainStatus
): RedactedUserVisibleOrchestrationPayload {
  return {
    ...payload,
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: status,
  };
}

function sanitizeUserVisibleEvidenceText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_USER_VISIBLE_EVIDENCE_CHARS);
}

function maskUid(uid: string | undefined | null): string {
  const value = String(uid ?? "").trim();
  if (!value) return "***";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

function createRuntimeAttributionCorrelationId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `attr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function resolveRuntimeAttributionTextSource(input: {
  realProviderNetwork: boolean;
  fallbackToLegacy: boolean;
  realProviderGateReason: string;
}): UserVisibleRuntimeTextSource {
  if (input.realProviderNetwork) return "provider";
  if (input.fallbackToLegacy) return "fallback";
  if (
    input.realProviderGateReason === "real_provider_output_unsafe" ||
    input.realProviderGateReason === "real_provider_call_failed"
  ) {
    return "orchestrator";
  }
  if (
    input.realProviderGateReason &&
    input.realProviderGateReason !== "real_provider_call_ok" &&
    input.realProviderGateReason !== "real_provider_eligible"
  ) {
    return "fallback";
  }
  return "orchestrator";
}

function resolveRuntimeAttributionFallbackUsed(input: {
  fallbackToLegacy: boolean;
  realProviderGateReason: string;
  textSource: UserVisibleRuntimeTextSource;
}): boolean {
  if (input.fallbackToLegacy) return true;
  if (input.textSource === "fallback") return true;
  if (
    input.realProviderGateReason === "real_provider_output_unsafe" ||
    input.realProviderGateReason === "real_provider_call_failed"
  ) {
    return true;
  }
  return false;
}

function resolveRuntimeAttributionFallbackReason(input: {
  fallbackToLegacy: boolean;
  realProviderGateReason: string;
  pilotInactiveReason?: string;
  fallbackUsed: boolean;
}): string {
  if (!input.fallbackUsed) return "none";
  if (
    input.realProviderGateReason &&
    input.realProviderGateReason !== "real_provider_call_ok" &&
    input.realProviderGateReason !== "real_provider_eligible"
  ) {
    return input.realProviderGateReason;
  }
  if (input.pilotInactiveReason && input.pilotInactiveReason !== "pilot_active") {
    return input.pilotInactiveReason;
  }
  if (input.fallbackToLegacy) return "legacy_fallback";
  return "unknown_fallback";
}

function resolveRuntimeAttributionSafetyResult(
  realProviderGateReason: string
): UserVisibleRuntimeSafetyResult {
  if (realProviderGateReason === "real_provider_call_ok") return "accepted";
  if (realProviderGateReason === "real_provider_output_unsafe") return "rejected";
  return "not_run";
}

function wouldAttemptRealProviderInvocation(input: {
  payload: RedactedUserVisibleOrchestrationPayload;
  userMessage: string;
  firebaseUid: string;
  userRole: SalesBrainUserRole;
  aiFirstPathActive: boolean;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
}): boolean {
  const readEnv = (key: string) => input.env?.[key];
  const eligibility = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: input.firebaseUid,
    userRole: input.userRole,
    environment: input.environment,
    env: input.env,
    readEnv,
  });
  if (!eligibility.eligible) return false;
  if (hasDeterministicBoundaryBlock(input.userMessage)) return false;
  if (!input.aiFirstPathActive) {
    if (!input.payload.pilotPathActive) return false;
    if (!detectOwnerControlledGeminiUxZone(input.userMessage)) return false;
  }
  return true;
}

function resolveProviderPilotOrchestration(input: {
  userMessage: string;
  orchestrated?: OrchestratedChatReply | null;
  pilotSessionContext?: PilotBuyerSessionContext;
  inventory: ChatInventoryCar[];
}): {
  hint: UserVisiblePilotOrchestrationHint | undefined;
  sessionGroundingCount: number;
  orchestratedGroundingCount: number;
  providerGroundingIntent: string;
} {
  const sessionCards = input.pilotSessionContext?.recentCarCards ?? [];
  const sessionGroundingCount = sessionCards.length;
  const orchestratedCards = input.orchestrated?.carCards ?? [];
  const orchestratedGroundingCount = orchestratedCards.length;
  const providerGroundingIntent = classifyProviderGroundingIntent(input.userMessage);

  const orchestratedHint = input.orchestrated
    ? resolvePilotOrchestrationHint(input.orchestrated, input.pilotSessionContext)
    : undefined;

  const rehydratedSessionCards =
    sessionCards.length > 0
      ? rehydrateSessionCarsFromInventory(
          pilotSessionCardsToChatCarCards(sessionCards),
          input.inventory
        )
      : [];

  const mergedCards = mergeProviderGroundingCarCards({
    message: input.userMessage,
    orchestratedCards,
    contextCards: rehydratedSessionCards,
  });

  if (mergedCards.length > 0) {
    const mergedContext = buildPilotSessionContextFromCarCards(mergedCards);
    return {
      hint: {
        carCardCount: mergedCards.length,
        recentCarCards: mergedContext?.recentCarCards,
        hasMoreCars: input.orchestrated?.hasMoreCars,
        ...(input.pilotSessionContext?.lastSearchBudgetMax != null
          ? { lastSearchBudgetMax: input.pilotSessionContext.lastSearchBudgetMax }
          : {}),
      },
      sessionGroundingCount,
      orchestratedGroundingCount,
      providerGroundingIntent,
    };
  }

  const orchestratedCardCount = orchestratedHint?.recentCarCards?.length ?? 0;
  const preferOrchestratedGrounding =
    orchestratedCardCount >= 2 ||
    (orchestratedCardCount > 0 && orchestratedCardCount >= sessionGroundingCount) ||
    isNamedInventoryCompareIntent(input.userMessage);

  const hint = preferOrchestratedGrounding
    ? orchestratedHint ??
      (sessionCards.length > 0
        ? {
            carCardCount: sessionCards.length,
            recentCarCards: sessionCards,
            ...(input.pilotSessionContext?.lastSearchBudgetMax != null
              ? { lastSearchBudgetMax: input.pilotSessionContext.lastSearchBudgetMax }
              : {}),
          }
        : undefined)
    : sessionCards.length > 0
      ? {
          carCardCount: sessionCards.length,
          recentCarCards: sessionCards,
          ...(input.pilotSessionContext?.lastSearchBudgetMax != null
            ? { lastSearchBudgetMax: input.pilotSessionContext.lastSearchBudgetMax }
            : {}),
        }
      : orchestratedHint;

  return {
    hint,
    sessionGroundingCount,
    orchestratedGroundingCount,
    providerGroundingIntent,
  };
}

function buildRealProviderGateReasonDetail(input: {
  payload: RedactedUserVisibleOrchestrationPayload;
  eligibilityGateReason: string;
  allowlistGateReason: string;
  gateAuthPath: string;
  aiFirstPathActive: boolean;
  aiFirstGateReason: string;
  textSource: UserVisibleRuntimeTextSource;
  fallbackUsed: boolean;
  providerGroundingIntent: string;
}): string {
  return [
    `eligibility=${input.eligibilityGateReason}`,
    `allowlist=${input.allowlistGateReason}`,
    `gateAuthPath=${input.gateAuthPath}`,
    `aiFirstActive=${input.aiFirstPathActive}`,
    `aiFirstGate=${input.aiFirstGateReason}`,
    `textSource=${input.textSource}`,
    `fallbackUsed=${input.fallbackUsed}`,
    `groundingIntent=${input.providerGroundingIntent}`,
    `payloadGate=${input.payload.realProviderGateReason ?? "unset"}`,
    `pilotPathActive=${input.payload.pilotPathActive === true}`,
    `fallbackToLegacy=${input.payload.fallbackToLegacy === true}`,
  ].join("|");
}

export function buildUserVisibleRuntimeAttributionDiagnostic(input: {
  requestCorrelationId: string;
  payload: RedactedUserVisibleOrchestrationPayload;
  userMessage: string;
  firebaseUid: string;
  userRole: SalesBrainUserRole;
  pilotOrchestration?: UserVisiblePilotOrchestrationHint;
  orchestratedCarCardCount?: number;
  sessionGroundingCount?: number;
  orchestratedGroundingCount?: number;
  providerGroundingIntent?: string;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  capturedAt?: string;
  /** Server-derived hashPiiForLog(auth.uid) after verified auth. Absent when unauthenticated. */
  verifiedActorFingerprint?: string | null;
  laneEvidence?: UserVisibleRuntimeLaneEvidence;
}): UserVisibleRuntimeAttributionDiagnostic {
  const readEnv = (key: string) => input.env?.[key];
  const aiFirstPathActive =
    input.payload.userVisibleRuntimeDiagnostic?.aiFirstPathActive ?? false;
  const eligibility = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: input.firebaseUid,
    userRole: input.userRole,
    environment: input.environment,
    env: input.env,
    readEnv,
  });
  const realProviderGateReason =
    input.payload.realProviderGateReason ?? eligibility.gateReason ?? "unknown";
  const realProviderNetwork = input.payload.realProviderNetwork === true;
  const invocationWouldRun = wouldAttemptRealProviderInvocation({
    payload: input.payload,
    userMessage: input.userMessage,
    firebaseUid: input.firebaseUid,
    userRole: input.userRole,
    aiFirstPathActive,
    environment: input.environment,
    env: input.env,
  });
  const realProviderInvocationAttempted =
    POST_INVOKE_REAL_PROVIDER_GATE_REASONS.has(realProviderGateReason) ||
    (invocationWouldRun && realProviderNetwork);
  const textSource = resolveRuntimeAttributionTextSource({
    realProviderNetwork,
    fallbackToLegacy: input.payload.fallbackToLegacy,
    realProviderGateReason,
  });
  const fallbackUsed = resolveRuntimeAttributionFallbackUsed({
    fallbackToLegacy: input.payload.fallbackToLegacy,
    realProviderGateReason,
    textSource,
  });
  const recentGroundingCount = input.pilotOrchestration?.recentCarCards?.length ?? 0;
  const groundingVehicleCount =
    recentGroundingCount > 0
      ? recentGroundingCount
      : input.pilotOrchestration?.carCardCount ??
        input.payload.carCardCount ??
        0;
  const allowlistEval = evaluateAiFirstAllowlist({
    firebaseUid: input.firebaseUid,
    environment: input.environment,
    readEnv,
  });
  const aiFirstGateReason =
    input.payload.userVisibleRuntimeDiagnostic?.pilotInactiveReason ?? "unknown";
  const providerGroundingIntent =
    input.providerGroundingIntent ?? classifyProviderGroundingIntent(input.userMessage);
  const sessionGroundingCount = input.sessionGroundingCount ?? 0;
  const orchestratedGroundingCount =
    input.orchestratedGroundingCount ?? input.orchestratedCarCardCount ?? 0;
  const realProviderGateReasonDetail = buildRealProviderGateReasonDetail({
    payload: input.payload,
    eligibilityGateReason: eligibility.gateReason,
    allowlistGateReason: allowlistEval.blockedReason,
    gateAuthPath: allowlistEval.authPath,
    aiFirstPathActive,
    aiFirstGateReason,
    textSource,
    fallbackUsed,
    providerGroundingIntent,
  });
  const verifiedActorFingerprint =
    typeof input.verifiedActorFingerprint === "string" &&
    input.verifiedActorFingerprint.trim() !== ""
      ? input.verifiedActorFingerprint
      : undefined;
  const lane = input.laneEvidence;

  return {
    sliceId: USER_VISIBLE_RUNTIME_ATTRIBUTION_SLICE_ID,
    requestCorrelationId: input.requestCorrelationId,
    aiFirstPathActive,
    realProviderEligible: eligibility.eligible,
    realProviderInvocationAttempted,
    realProviderNetwork,
    realProviderGateReason,
    realProviderGateReasonDetail,
    fallbackUsed,
    fallbackReason: resolveRuntimeAttributionFallbackReason({
      fallbackToLegacy: input.payload.fallbackToLegacy,
      realProviderGateReason,
      pilotInactiveReason: input.payload.userVisibleRuntimeDiagnostic?.pilotInactiveReason,
      fallbackUsed,
    }),
    candidateCount: input.orchestratedCarCardCount ?? input.payload.carCardCount ?? 0,
    groundingVehicleCount,
    providerGroundingIntent,
    sessionGroundingCount,
    orchestratedGroundingCount,
    textSource,
    safetyResult: resolveRuntimeAttributionSafetyResult(realProviderGateReason),
    gateCheck: allowlistEval.gateCheck,
    gateAuthPath: allowlistEval.authPath,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    ...(verifiedActorFingerprint ? { verifiedActorFingerprint } : {}),
    ...(lane
      ? {
          routingLane: lane.routingLane,
          businessToolName: lane.businessToolName,
          marketplaceSearchExecutionCount: lane.marketplaceSearchExecutionCount,
          inventoryFetchExecutionCount: lane.inventoryFetchExecutionCount,
          geminiInitialFunctionCallingAttemptCount:
            lane.geminiInitialFunctionCallingAttemptCount,
          groundedV3CompositionAttempted: lane.groundedV3CompositionAttempted,
          groundedV3CompositionOutcome: lane.groundedV3CompositionOutcome,
          legacyFallbackAfterSearchSelection: lane.legacyFallbackAfterSearchSelection,
          searchFailureClassification: lane.searchFailureClassification,
          ...(lane.validatedToolResultListingIdCount != null
            ? {
                validatedToolResultListingIdCount:
                  lane.validatedToolResultListingIdCount,
              }
            : {}),
          ...(lane.orderedCardCount != null
            ? { orderedCardCount: lane.orderedCardCount }
            : {}),
          ...(lane.displayedCardCount != null
            ? { displayedCardCount: lane.displayedCardCount }
            : {}),
          ...(lane.displayOrderClassification
            ? { displayOrderClassification: lane.displayOrderClassification }
            : {}),
          ...(lane.structuredOrderValid != null
            ? { structuredOrderValid: lane.structuredOrderValid }
            : {}),
          ...(lane.searchCompositionFallbackReason
            ? {
                searchCompositionFallbackReason:
                  lane.searchCompositionFallbackReason,
              }
            : {}),
          ...(lane.structuredOutputParseStatus
            ? {
                structuredOutputParseStatus: lane.structuredOutputParseStatus,
              }
            : {}),
          ...(lane.searchCompositionTextPresent != null
            ? {
                searchCompositionTextPresent:
                  lane.searchCompositionTextPresent,
              }
            : {}),
          ...(lane.searchCompositionValidationCode
            ? {
                searchCompositionValidationCode:
                  lane.searchCompositionValidationCode,
              }
            : {}),
          ...(lane.searchPresentationMode
            ? { searchPresentationMode: lane.searchPresentationMode }
            : {}),
          ...(lane.searchCountClaimDisposition
            ? {
                searchCountClaimDisposition: lane.searchCountClaimDisposition,
              }
            : {}),
          ...(lane.selectedVehicleGroundingRequested != null
            ? {
                selectedVehicleGroundingRequested:
                  lane.selectedVehicleGroundingRequested,
              }
            : {}),
          ...(lane.selectedVehicleGroundingOutcome
            ? {
                selectedVehicleGroundingOutcome:
                  lane.selectedVehicleGroundingOutcome,
              }
            : {}),
          ...(lane.selectedVehicleContextSupplied != null
            ? {
                selectedVehicleContextSupplied:
                  lane.selectedVehicleContextSupplied,
              }
            : {}),
        }
      : {}),
    ...(input.payload.conversationBrain
      ? { conversationBrain: input.payload.conversationBrain }
      : {}),
    ...(input.payload.conversationBrainStatus
      ? { conversationBrainStatus: input.payload.conversationBrainStatus }
      : {}),
    skipGemini: input.payload.skipGemini === true,
  };
}

export function serializeRuntimeAttributionDiagnosticForStructuredLog(
  diagnostic: UserVisibleRuntimeAttributionDiagnostic
): string {
  return JSON.stringify({
    event: RUNTIME_ATTRIBUTION_LOG_EVENT,
    ...diagnostic,
  });
}

export function emitRuntimeAttributionStructuredLog(
  diagnostic: UserVisibleRuntimeAttributionDiagnostic
): void {
  try {
    console.log(serializeRuntimeAttributionDiagnosticForStructuredLog(diagnostic));
  } catch {
    // Fail-open: attribution logging must never block conversation responses.
  }
}

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function withMaskedUserVisibleGateDiagnostic(input: {
  payload: RedactedUserVisibleOrchestrationPayload;
  firebaseUid: string;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
}): RedactedUserVisibleOrchestrationPayload {
  const gate = evaluateUserVisibleGate({
    firebaseUid: input.firebaseUid,
    environment: input.environment,
    env: input.env,
  });
  const allowlist = parseUserVisibleAllowlistUids(
    input.env?.[NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]
  );
  return {
    ...input.payload,
    userVisibleGateDiagnostic: {
      blockedReason: gate.blockedReason,
      requestUidMasked: maskUid(input.firebaseUid),
      allowlistMasked: allowlist.map((uid) => maskUid(uid)),
      allowlistMatch: gate.redactedDiagnostics.uidAllowlisted,
      allowlistCount: allowlist.length,
    },
  };
}

function withSafeUserVisibleRuntimeDiagnostic(input: {
  payload: RedactedUserVisibleOrchestrationPayload;
  userMessage: string;
  pilotSessionContext?: PilotBuyerSessionContext;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  firebaseUid?: string;
}): RedactedUserVisibleOrchestrationPayload {
  const resolvedEnvironment = resolveBridgeEnvironment(input.environment);
  const runtimeFlags = resolveSalesBrainRuntimeFlags({
    environment: resolvedEnvironment,
    env: input.env,
  });
  const serverRecentCarCardsCount = input.pilotSessionContext?.recentCarCards?.length ?? 0;
  const pilotContextPresentServer = serverRecentCarCardsCount > 0;
  const followUpMessage = isPilotBuyerFollowUpMessage(input.userMessage);
  const aiFirst = evaluateBuyerAiFirstEligibility({
    firebaseUid: input.firebaseUid,
    userRole: "buyer",
    environment: resolvedEnvironment,
    env: input.env,
  });

  let pilotInactiveReason = "pilot_active";
  if (!input.payload.pilotPathActive) {
    if (!runtimeFlags.userVisibleEnabled) {
      pilotInactiveReason = "user_visible_disabled";
    } else if (
      typeof input.payload.realProviderGateReason === "string" &&
      input.payload.realProviderGateReason === "pilot_path_inactive"
    ) {
      pilotInactiveReason = "real_provider_gate_pilot_path_inactive";
    } else if (!followUpMessage) {
      pilotInactiveReason = "message_not_followup";
    } else if (!pilotContextPresentServer) {
      pilotInactiveReason = "pilot_context_missing_or_dropped";
    } else {
      pilotInactiveReason = "pilot_resolution_fallback";
    }
  }

  return {
    ...input.payload,
    userVisibleRuntimeDiagnostic: {
      runtimeMode: runtimeFlags.mode,
      provider: runtimeFlags.provider,
      userVisibleEnabled: runtimeFlags.userVisibleEnabled,
      realProviderEnabled: parseTruthy(
        input.env?.[NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]
      ),
      ownerControlledUxEnabled: runtimeFlags.ownerOnlyControlledUxEnabled,
      aiFirstEnabled: runtimeFlags.aiFirstEnabled,
      aiFirstPathActive: aiFirst.aiFirstPathActive,
      aiFirstSliceId: BUYER_AI_FIRST_CONVERSATION_SLICE_ID,
      pilotContextPresentServer,
      serverRecentCarCardsCount,
      followUpMessage,
      pilotInactiveReason,
      guardPolicyVersion: AI_USER_VISIBLE_GUARD_POLICY_VERSION,
      thaiUxTuningSliceId: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.thaiUxTuningSliceId,
      thaiUxTuningActive: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.thaiUxTuningActive,
      targetAnswerLengthGuidance:
        AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.targetAnswerLengthGuidance,
      leadPiiCueGuardActive: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.leadPiiCueGuardActive,
      phoneEchoGuardActive: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.phoneEchoGuardActive,
      safeConfirmationStepWordingActive:
        AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.safeConfirmationStepWordingActive,
    },
  };
}

function tryOrchestratedReplyFromPilotSession(
  message: string,
  pilotSessionContext?: PilotBuyerSessionContext,
  inventory: ChatInventoryCar[] = []
): OrchestratedChatReply | null {
  const sessionCards = pilotSessionContext?.recentCarCards ?? [];
  if (sessionCards.length === 0 || !isPilotBuyerFollowUpMessage(message)) {
    return null;
  }
  // v22.59 — rehydrate from inventory so follow-up cards keep public images
  // (pilot session serialization intentionally omits image URLs).
  const rawCards = pilotSessionCardsToChatCarCards(sessionCards);
  const carCards =
    inventory.length > 0
      ? rehydrateSessionCarsFromInventory(rawCards, inventory)
      : rawCards;
  return {
    text: "",
    carCards,
    skipGemini: true,
  };
}

export function resolvePilotOrchestrationHint(
  orchestrated: OrchestratedChatReply,
  pilotSessionContext?: PilotBuyerSessionContext
): UserVisiblePilotOrchestrationHint {
  const sessionCards = pilotSessionContext?.recentCarCards ?? [];
  const orchestratedCards = orchestrated.carCards ?? [];
  const orchestratedCount = orchestratedCards.length;
  const sessionCount = sessionCards.length;
  // Prefer freshly orchestrated cards for inventory answers so pilot copy can
  // summarize make/model/price/mileage — not only a count-based template.
  const useOrchestratedCards = orchestratedCount > 0;
  const useSession =
    !useOrchestratedCards &&
    sessionCount > 0 &&
    (sessionCount >= orchestratedCount || orchestratedCount === 0);
  const recentCarCards = useOrchestratedCards
    ? buildPilotSessionContextFromCarCards(orchestratedCards)?.recentCarCards
    : useSession
      ? sessionCards
      : undefined;

  return {
    carCardCount: useOrchestratedCards
      ? orchestratedCount
      : useSession
        ? sessionCount
        : orchestratedCount,
    hasMoreCars: orchestrated.hasMoreCars,
    ...(recentCarCards && recentCarCards.length > 0
      ? { recentCarCards }
      : {}),
    ...(pilotSessionContext?.lastSearchBudgetMax != null
      ? { lastSearchBudgetMax: pilotSessionContext.lastSearchBudgetMax }
      : {}),
  };
}

/** v6.1L.2j — pilot follow-up when orchestrator returns null (no-context safe copy). */
function runPilotFollowUpBridgeWhenNoOrchestrator(
  input: UserVisibleOrchestrationBridgeInput,
  environment: SalesBrainRuntimeEnvironment
): UserVisibleOrchestrationBridgeResult | null {
  if (!isPilotBuyerFollowUpMessage(input.userMessage)) {
    return null;
  }

  const sessionCards = input.pilotSessionContext?.recentCarCards ?? [];
  const rawSessionCards =
    sessionCards.length > 0 ? pilotSessionCardsToChatCarCards(sessionCards) : [];
  const hydratedSessionCards =
    rawSessionCards.length > 0
      ? rehydrateSessionCarsFromInventory(rawSessionCards, input.inventory)
      : [];
  const pilotOrchestration: UserVisiblePilotOrchestrationHint =
    sessionCards.length > 0
      ? {
          carCardCount: sessionCards.length,
          recentCarCards: sessionCards,
          ...(input.pilotSessionContext?.lastSearchBudgetMax != null
            ? { lastSearchBudgetMax: input.pilotSessionContext.lastSearchBudgetMax }
            : {}),
        }
      : { carCardCount: 0 };

  const wired = wireShadowChatPathWithPilot({
    userMessage: input.userMessage,
    legacyUserVisibleResponse: "",
    userRole: input.userRole,
    flowContext: { attachedImageCount: input.attachedImageCount },
    source: "useChat.orchestrated",
    environment,
    env: input.env,
    firebaseUid: input.trustedFirebaseUid,
    pilotOrchestration,
  });

  const text = wired.userVisibleText?.trim()
    ? wired.userVisibleText
    : buildPilotFollowUpNoContextCopy();

  const orchestrated: OrchestratedChatReply = {
    text,
    carCards:
      hydratedSessionCards.length > 0
        ? hydratedSessionCards
        : rawSessionCards.length > 0
          ? rawSessionCards
          : [],
    skipGemini: true,
  };

  return {
    orchestrated,
    payload: buildRedactedPayload(
      orchestrated,
      text,
      wired.pilotPathActive,
      !wired.pilotPathActive
    ),
  };
}

/**
 * Run orchestration + allowlist-gated pilot on server (trusted UID from auth only).
 */
export function runUserVisibleOrchestrationBridge(
  input: UserVisibleOrchestrationBridgeInput
): UserVisibleOrchestrationBridgeResult {
  const environment = resolveBridgeEnvironment(input.environment);
  const aiFirst = evaluateBuyerAiFirstEligibility({
    firebaseUid: input.trustedFirebaseUid,
    userRole: input.userRole,
    environment,
    env: input.env,
  });
  const sessionCards = input.pilotSessionContext?.recentCarCards ?? [];
  // v22.58 — server has no sessionStorage; inject rehydrated pilot cards so
  // named inventory compare resolves the same canonical pair as the client.
  const contextCarsOverride =
    sessionCards.length > 0
      ? rehydrateSessionCarsFromInventory(
          pilotSessionCardsToChatCarCards(sessionCards),
          input.inventory
        )
      : undefined;
  // v22.57 — named inventory compare needs orchestrator + inventory; do not
  // short-circuit to session-only cards (that caused Corolla 2020 vs itself).
  const preferPilotSessionFirst =
    sessionCards.length > 0 &&
    isPilotBuyerFollowUpMessage(input.userMessage) &&
    !isNamedInventoryCompareIntent(input.userMessage);

  let orchestrated = preferPilotSessionFirst
    ? null
    : tryOrchestrateChatReplyCore(input.userMessage, input.inventory, {
        attachedImageCount: input.attachedImageCount,
        displayName: input.displayName,
        ...(contextCarsOverride && contextCarsOverride.length > 0
          ? { contextCarsOverride }
          : {}),
      });

  if (!orchestrated && input.pilotSessionContext) {
    orchestrated = tryOrchestratedReplyFromPilotSession(
      input.userMessage,
      input.pilotSessionContext,
      input.inventory
    );
  }

  if (!orchestrated) {
    const followUp = runPilotFollowUpBridgeWhenNoOrchestrator(input, environment);
    if (followUp) {
      return followUp;
    }
    if (aiFirst.aiFirstPathActive) {
      const rawSessionCards =
        sessionCards.length > 0 ? pilotSessionCardsToChatCarCards(sessionCards) : [];
      const hydratedSessionCards =
        rawSessionCards.length > 0
          ? rehydrateSessionCarsFromInventory(rawSessionCards, input.inventory)
          : [];
      const groundingShell: OrchestratedChatReply = {
        text: "",
        carCards: hydratedSessionCards,
        skipGemini: false,
      };
      return {
        orchestrated: groundingShell,
        payload: buildRedactedPayload(groundingShell, "", true, false),
      };
    }
    return {
      orchestrated: null,
      payload: buildRedactedPayload(null, "", false, true),
    };
  }

  const legacyText = orchestrated.text;

  if (aiFirst.skipMockPilotCopy) {
    return {
      orchestrated: { ...orchestrated, text: legacyText },
      payload: buildRedactedPayload(orchestrated, legacyText, true, false),
    };
  }

  const wired = wireShadowChatPathWithPilot({
    userMessage: input.userMessage,
    legacyUserVisibleResponse: legacyText,
    userRole: input.userRole,
    flowContext: { attachedImageCount: input.attachedImageCount },
    source: "useChat.orchestrated",
    environment,
    env: input.env,
    firebaseUid: input.trustedFirebaseUid,
    pilotOrchestration: resolvePilotOrchestrationHint(orchestrated, input.pilotSessionContext),
  });

  orchestrated.text = wired.userVisibleText;

  return {
    orchestrated,
    payload: buildRedactedPayload(
      orchestrated,
      wired.userVisibleText,
      wired.pilotPathActive,
      wired.fallbackToLegacy
    ),
  };
}

export interface OrchestrateForTrustedAuthInput {
  auth: Pick<ServerAuthContext, "uid" | "displayName" | "role" | "dealerId">;
  userMessage: string;
  attachedImageCount?: number;
  inventory: ChatInventoryCar[];
  env?: Record<string, string | undefined>;
  environment?: SalesBrainRuntimeEnvironment;
  pilotSessionContext?: PilotBuyerSessionContext;
}

export function orchestrateUserVisibleChatForTrustedAuth(
  input: OrchestrateForTrustedAuthInput
): UserVisibleOrchestrationBridgeResult {
  const environment = resolveBridgeEnvironment(input.environment);
  if (environment === "production") {
    const orchestrated = tryOrchestrateChatReplyCore(input.userMessage, input.inventory, {
      attachedImageCount: input.attachedImageCount,
      displayName: input.auth.displayName,
    });
    const legacyText = orchestrated?.text ?? "";
    if (orchestrated) {
      orchestrated.text = legacyText;
    }
    return {
      orchestrated,
      payload: buildRedactedPayload(orchestrated, legacyText, false, true),
    };
  }

  return runUserVisibleOrchestrationBridge({
    userMessage: input.userMessage,
    inventory: input.inventory,
    trustedFirebaseUid: input.auth.uid,
    displayName: input.auth.displayName,
    attachedImageCount: input.attachedImageCount,
    userRole: mapAuthToSalesBrainRole(input.auth as ServerAuthContext),
    environment,
    env: input.env,
    pilotSessionContext: input.pilotSessionContext,
  });
}

function parseOrchestrateBody(body: Record<string, unknown> | undefined): {
  userMessage: string;
  attachedImageCount?: number;
  pilotSessionContext?: PilotBuyerSessionContext;
  conversationHistory?: unknown;
  selectedListingId?: string;
} | { error: string } {
  const userMessage = String(body?.userMessage ?? "").trim();
  if (!userMessage) {
    return { error: "userMessage is required" };
  }
  if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
    return { error: "userMessage too long" };
  }
  let attachedImageCount: number | undefined;
  if (body?.attachedImageCount !== undefined && body?.attachedImageCount !== null) {
    const n = Number(body.attachedImageCount);
    if (Number.isFinite(n) && n >= 0) {
      attachedImageCount = Math.min(Math.floor(n), 32);
    }
  }
  const pilotSessionContext = sanitizePilotSessionContext(body?.pilotSessionContext);
  const conversationHistory =
    body?.conversationHistory !== undefined ? body.conversationHistory : undefined;
  const selectedListingId =
    body?.selectedListingId !== undefined
      ? parseBoundedSelectedListingId(body.selectedListingId) ?? undefined
      : undefined;
  // WP-NVB-02E — conversationBrain is server-owned; request body cannot set it.
  return {
    userMessage,
    attachedImageCount,
    ...(pilotSessionContext ? { pilotSessionContext } : {}),
    ...(conversationHistory !== undefined ? { conversationHistory } : {}),
    ...(selectedListingId ? { selectedListingId } : {}),
  };
}

function isParseError(
  parsed: ReturnType<typeof parseOrchestrateBody>
): parsed is { error: string } {
  return "error" in parsed;
}

export interface ChatUserVisibleOrchestrateHandlerDeps {
  loadChatInventory: () => Promise<ChatInventoryCar[]>;
  readEnv?: (key: string) => string | undefined;
  now?: () => number;
  resolveAuth?: (req: Request) => Promise<ServerAuthContext>;
  runLegacyOrchestration?: (
    input: OrchestrateForTrustedAuthInput
  ) => UserVisibleOrchestrationBridgeResult;
  applyRealProvider?: typeof maybeApplyUserVisibleRealProvider;
  runConversationCore?: ChatUserVisibleConversationCoreRunner;
  runChatV3GeneralBridge?: ChatV2V3GeneralConversationRunner;
  runChatV3SearchGrounding?: ChatV2V3SearchGroundingRunner;
}

function generalLaneEvidence(): UserVisibleRuntimeLaneEvidence {
  return {
    routingLane: "general",
    businessToolName: "none",
    marketplaceSearchExecutionCount: 0,
    inventoryFetchExecutionCount: 0,
    geminiInitialFunctionCallingAttemptCount: 0,
    groundedV3CompositionAttempted: false,
    groundedV3CompositionOutcome: "not-applicable",
    legacyFallbackAfterSearchSelection: false,
    orderedCardCount: 0,
    displayedCardCount: 0,
    searchFailureClassification: "none",
  };
}

function searchLaneEvidenceFromTurn(
  searchTurn: ChatV2V3SearchGroundingTurnOutcome
): UserVisibleRuntimeLaneEvidence {
  if (searchTurn.kind === "not-selected") {
    return {
      routingLane: "search",
      businessToolName: "none",
      marketplaceSearchExecutionCount: 0,
      inventoryFetchExecutionCount: 0,
      geminiInitialFunctionCallingAttemptCount: 0,
      groundedV3CompositionAttempted: false,
      groundedV3CompositionOutcome: "failed-closed",
      legacyFallbackAfterSearchSelection: false,
      orderedCardCount: 0,
      displayedCardCount: 0,
      displayOrderClassification: "failed-closed",
      structuredOrderValid: false,
      searchFailureClassification: searchTurn.reason || "not-selected",
    };
  }
  if (searchTurn.kind === "kill-switch-fail-closed") {
    return {
      routingLane: "kill-switch",
      businessToolName: "none",
      marketplaceSearchExecutionCount: 0,
      inventoryFetchExecutionCount: 0,
      geminiInitialFunctionCallingAttemptCount: 0,
      groundedV3CompositionAttempted: false,
      groundedV3CompositionOutcome: "failed-closed",
      legacyFallbackAfterSearchSelection: false,
      validatedToolResultListingIdCount: 0,
      orderedCardCount: 0,
      displayedCardCount: 0,
      displayOrderClassification: "failed-closed",
      structuredOrderValid: false,
      searchFailureClassification: "kill-switch",
    };
  }
  if (searchTurn.kind === "failed-closed") {
    return {
      routingLane: "search",
      businessToolName:
        searchTurn.marketplaceSearchExecutionCount === 1
          ? "marketplace.search"
          : "none",
      marketplaceSearchExecutionCount: searchTurn.marketplaceSearchExecutionCount,
      inventoryFetchExecutionCount: 0,
      geminiInitialFunctionCallingAttemptCount: 0,
      groundedV3CompositionAttempted: false,
      groundedV3CompositionOutcome: "failed-closed",
      legacyFallbackAfterSearchSelection: false,
      validatedToolResultListingIdCount:
        searchTurn.validatedToolResultListingIdCount,
      orderedCardCount: 0,
      displayedCardCount: 0,
      displayOrderClassification: "failed-closed",
      structuredOrderValid: false,
      searchFailureClassification: searchTurn.errorCode ?? "failed-closed",
    };
  }
  const compositionAttempted = searchTurn.marketplaceSearchExecutionCount === 1;
  const compositionOutcome: UserVisibleRuntimeGroundedV3CompositionOutcome =
    !compositionAttempted
      ? "not-applicable"
      : searchTurn.usedDeterministicFallback
        ? "deterministic-fallback"
        : "success";
  return {
    routingLane: "search",
    businessToolName:
      searchTurn.marketplaceSearchExecutionCount === 1
        ? "marketplace.search"
        : "none",
    marketplaceSearchExecutionCount: searchTurn.marketplaceSearchExecutionCount,
    inventoryFetchExecutionCount: 0,
    geminiInitialFunctionCallingAttemptCount: 0,
    groundedV3CompositionAttempted: compositionAttempted,
    groundedV3CompositionOutcome: compositionOutcome,
    legacyFallbackAfterSearchSelection: false,
    validatedToolResultListingIdCount:
      searchTurn.validatedToolResultListingIdCount,
    orderedCardCount: searchTurn.carCards.length,
    displayedCardCount: searchTurn.carCards.length,
    displayOrderClassification: searchTurn.displayOrderClassification,
    structuredOrderValid: searchTurn.structuredOrderValid,
    searchFailureClassification: "none",
    ...(searchTurn.searchCompositionFallbackReason
      ? {
          searchCompositionFallbackReason:
            searchTurn.searchCompositionFallbackReason,
        }
      : {}),
    ...(searchTurn.structuredOutputParseStatus
      ? {
          structuredOutputParseStatus: searchTurn.structuredOutputParseStatus,
        }
      : {}),
    ...(searchTurn.searchCompositionTextPresent != null
      ? {
          searchCompositionTextPresent:
            searchTurn.searchCompositionTextPresent,
        }
      : {}),
    ...(searchTurn.searchCompositionValidationCode
      ? {
          searchCompositionValidationCode:
            searchTurn.searchCompositionValidationCode,
        }
      : {}),
    ...(searchTurn.searchPresentationMode
      ? { searchPresentationMode: searchTurn.searchPresentationMode }
      : {}),
    ...(searchTurn.searchCountClaimDisposition
      ? { searchCountClaimDisposition: searchTurn.searchCountClaimDisposition }
      : {}),
  };
}

export async function handleChatUserVisibleOrchestratePost(
  req: Request,
  res: Response,
  deps: ChatUserVisibleOrchestrateHandlerDeps
): Promise<void> {
  const requestCorrelationId = createRuntimeAttributionCorrelationId();
  try {
    const resolveAuth = deps.resolveAuth ?? ((incoming: Request) => getServerAuthContext(incoming));
    const auth = await resolveAuth(req);
    const parsed = parseOrchestrateBody(req.body as Record<string, unknown> | undefined);
    if (isParseError(parsed)) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }
    const { userMessage, attachedImageCount, pilotSessionContext, conversationHistory, selectedListingId } =
      parsed;
    const inventory = await deps.loadChatInventory();
    const bridgeEnvironment = resolveBridgeEnvironment();
    const readEnv = deps.readEnv ?? ((key: string) => process.env[key]);
    const envSnapshot = process.env as Record<string, string | undefined>;

    const coreRouting = resolveChatUserVisibleConversationCoreRouting({
      authenticatedActorRef: auth.uid,
      userMessage,
      readEnv,
    });

    const searchGroundingRouting = resolveChatV2V3SearchGroundingRouting({
      authenticatedActorRef: auth.uid,
      userMessage,
      conversationHistory,
      readEnv,
    });

    let result: UserVisibleOrchestrationBridgeResult;
    let skipRealProvider = false;
    let laneEvidence: UserVisibleRuntimeLaneEvidence = {
      routingLane: "legacy",
      businessToolName: "none",
      marketplaceSearchExecutionCount: 0,
      inventoryFetchExecutionCount: 0,
      geminiInitialFunctionCallingAttemptCount: 0,
      groundedV3CompositionAttempted: false,
      groundedV3CompositionOutcome: "not-applicable",
      legacyFallbackAfterSearchSelection: false,
      searchFailureClassification: "none",
    };

    if (searchGroundingRouting.kind === "kill-switch-fail-closed") {
      skipRealProvider = true;
      const unavailableText = CHAT_V3_USER_FACING_UNAVAILABLE;
      const orchestrated: OrchestratedChatReply = {
        text: unavailableText,
        carCards: [],
        skipGemini: true,
        hasMoreCars: false,
      };
      result = {
        orchestrated,
        payload: withSearchGroundingConversationBrain(
          buildRedactedPayload(orchestrated, unavailableText, false, false),
          "failed-closed"
        ),
      };
      laneEvidence = searchLaneEvidenceFromTurn({
        kind: "kill-switch-fail-closed",
        userVisibleText: unavailableText,
        carCards: [],
        hasMoreCars: false,
        conversationBrainStatus: "failed-closed",
        displayOrderClassification: "failed-closed",
        structuredOrderValid: false,
        validatedToolResultListingIdCount: 0,
        marketplaceSearchExecutionCount: 0,
        inventoryFetchExecutionCount: 0,
      });
    } else if (searchGroundingRouting.kind === "selected") {
      skipRealProvider = true;
      const searchTurn = await executeChatV2V3SearchGroundingTurn({
        authenticatedActorRef: auth.uid,
        userMessage,
        conversationHistory,
        inventory,
        readEnv,
        environment: bridgeEnvironment,
        runChatV3Conversation: deps.runChatV3SearchGrounding,
        now: deps.now,
      });
      laneEvidence = searchLaneEvidenceFromTurn(searchTurn);
      if (searchTurn.kind === "not-selected") {
        const unavailableText = CHAT_V3_USER_FACING_UNAVAILABLE;
        const orchestrated: OrchestratedChatReply = {
          text: unavailableText,
          carCards: [],
          skipGemini: true,
          hasMoreCars: false,
        };
        result = {
          orchestrated,
          payload: withSearchGroundingConversationBrain(
            buildRedactedPayload(orchestrated, unavailableText, false, false),
            "failed-closed"
          ),
        };
      } else {
        const userVisibleText = searchTurn.userVisibleText;
        const orchestrated: OrchestratedChatReply = {
          text: userVisibleText,
          carCards: [...searchTurn.carCards],
          skipGemini: true,
          hasMoreCars: searchTurn.hasMoreCars,
        };
        result = {
          orchestrated,
          payload: withSearchGroundingConversationBrain(
            buildRedactedPayload(orchestrated, userVisibleText, false, false),
            searchTurn.conversationBrainStatus
          ),
        };
      }
    } else if (coreRouting.kind === "conversation-core") {
      skipRealProvider = true;
      const coreMapped = await executeChatUserVisibleConversationCoreTurn({
        authenticatedActorRef: auth.uid,
        authRole: auth.role,
        userMessage,
        attachedImageCount,
        inventory,
        readEnv,
        receivedAtMs: deps.now?.() ?? Date.now(),
        runConversationCore: deps.runConversationCore,
      });
      const orchestrated: OrchestratedChatReply = {
        text: coreMapped.userVisibleText,
        carCards: [...coreMapped.carCards],
        skipGemini: true,
      };
      result = {
        orchestrated,
        payload: buildRedactedPayload(
          orchestrated,
          coreMapped.userVisibleText,
          false,
          false
        ),
      };
      laneEvidence = {
        routingLane: "conversation-core",
        businessToolName: "none",
        marketplaceSearchExecutionCount: 0,
        inventoryFetchExecutionCount: 0,
        geminiInitialFunctionCallingAttemptCount: 0,
        groundedV3CompositionAttempted: false,
        groundedV3CompositionOutcome: "not-applicable",
        legacyFallbackAfterSearchSelection: false,
        orderedCardCount: orchestrated.carCards?.length ?? 0,
        displayedCardCount: orchestrated.carCards?.length ?? 0,
        searchFailureClassification: "none",
      };
    } else {
      const generalBridgeRouting = resolveChatV2V3GeneralBridgeRouting({
        authenticatedActorRef: auth.uid,
        userMessage,
        readEnv,
      });

      if (generalBridgeRouting.kind === "kill-switch-fail-closed") {
        skipRealProvider = true;
        const unavailableText = CHAT_V3_USER_FACING_UNAVAILABLE;
        const orchestrated: OrchestratedChatReply = {
          text: unavailableText,
          carCards: [],
          skipGemini: true,
        };
        result = {
          orchestrated,
          payload: withGeneralBridgeConversationBrain(
            buildRedactedPayload(orchestrated, unavailableText, false, false),
            "failed-closed"
          ),
        };
        laneEvidence = {
          ...generalLaneEvidence(),
          routingLane: "kill-switch",
          groundedV3CompositionOutcome: "failed-closed",
          searchFailureClassification: "kill-switch",
        };
      } else if (generalBridgeRouting.kind === "selected") {
        skipRealProvider = true;
        const selectedVehicleGrounding = resolveAuthoritativeSelectedVehicleContext(
          selectedListingId,
          inventory
        );
        const generalBridgeTurn = await executeChatV2V3GeneralBridgeTurn({
          authenticatedActorRef: auth.uid,
          userMessage,
          conversationHistory: sanitizeBoundedGeneralBridgeHistory(
            conversationHistory,
            userMessage
          ),
          readEnv,
          environment: bridgeEnvironment,
          runChatV3Conversation: deps.runChatV3GeneralBridge,
          now: deps.now,
          authoritativeVehicleContext: selectedVehicleGrounding.context,
        });
        const userVisibleText =
          generalBridgeTurn.kind === "success" ||
          generalBridgeTurn.kind === "failed-closed" ||
          generalBridgeTurn.kind === "kill-switch-fail-closed"
            ? generalBridgeTurn.userVisibleText
            : CHAT_V3_USER_FACING_UNAVAILABLE;
        const orchestrated: OrchestratedChatReply = {
          text: userVisibleText,
          carCards: [],
          skipGemini: true,
        };
        const conversationBrainStatus: ChatV3GeneralConversationBrainStatus =
          generalBridgeTurn.kind === "success" ? "success" : "failed-closed";
        result = {
          orchestrated,
          payload: withGeneralBridgeConversationBrain(
            buildRedactedPayload(orchestrated, userVisibleText, false, false),
            conversationBrainStatus
          ),
        };
        laneEvidence = {
          ...generalLaneEvidence(),
          ...selectedVehicleGroundingLaneEvidence({
            requested: selectedListingId != null && selectedListingId !== "",
            outcome: selectedVehicleGrounding.outcome,
          }),
        };
      } else {
        const runLegacy =
          deps.runLegacyOrchestration ?? orchestrateUserVisibleChatForTrustedAuth;
        result = runLegacy({
          auth,
          userMessage,
          attachedImageCount,
          inventory,
          env: envSnapshot,
          pilotSessionContext,
        });
        laneEvidence = {
          routingLane: "legacy",
          businessToolName: "none",
          marketplaceSearchExecutionCount: 0,
          inventoryFetchExecutionCount: 0,
          geminiInitialFunctionCallingAttemptCount: 0,
          groundedV3CompositionAttempted: false,
          groundedV3CompositionOutcome: "not-applicable",
          legacyFallbackAfterSearchSelection: false,
          searchFailureClassification: "none",
        };
      }
    }

    const {
      hint: pilotOrchestrationForRealProvider,
      sessionGroundingCount,
      orchestratedGroundingCount,
      providerGroundingIntent,
    } = resolveProviderPilotOrchestration({
      userMessage,
      orchestrated: result.orchestrated,
      pilotSessionContext,
      inventory,
    });

    if (!skipRealProvider) {
      const applyRealProvider =
        deps.applyRealProvider ?? maybeApplyUserVisibleRealProvider;
      result = await applyRealProvider({
        bridgeResult: result,
        userMessage,
        firebaseUid: auth.uid,
        userRole: mapAuthToSalesBrainRole(auth),
        pilotOrchestration: pilotOrchestrationForRealProvider,
        environment: bridgeEnvironment,
        env: envSnapshot,
      });
      laneEvidence = {
        ...laneEvidence,
        geminiInitialFunctionCallingAttemptCount:
          result.payload.realProviderNetwork === true ||
          POST_INVOKE_REAL_PROVIDER_GATE_REASONS.has(
            String(result.payload.realProviderGateReason ?? "")
          )
            ? 1
            : 0,
      };
    }

    const payloadWithMaskedGate = withMaskedUserVisibleGateDiagnostic({
      payload: result.payload,
      firebaseUid: auth.uid,
      env: process.env as Record<string, string | undefined>,
    });
    const payloadWithRuntimeDiagnostic = withSafeUserVisibleRuntimeDiagnostic({
      payload: payloadWithMaskedGate,
      userMessage,
      pilotSessionContext,
      env: process.env as Record<string, string | undefined>,
      firebaseUid: auth.uid,
    });
    const sanitizedUserVisibleText = sanitizeUserVisibleEvidenceText(
      payloadWithRuntimeDiagnostic.userVisibleText
    );
    const missingUserVisibleText = sanitizedUserVisibleText.length === 0;
    const evidenceCapturedAt = new Date().toISOString();

    emitRuntimeAttributionStructuredLog(
      buildUserVisibleRuntimeAttributionDiagnostic({
        requestCorrelationId,
        payload: payloadWithRuntimeDiagnostic,
        userMessage,
        firebaseUid: auth.uid,
        userRole: mapAuthToSalesBrainRole(auth),
        pilotOrchestration: pilotOrchestrationForRealProvider,
        orchestratedCarCardCount: result.orchestrated?.carCards?.length ?? 0,
        sessionGroundingCount,
        orchestratedGroundingCount,
        providerGroundingIntent,
        environment: bridgeEnvironment,
        env: process.env as Record<string, string | undefined>,
        capturedAt: evidenceCapturedAt,
        verifiedActorFingerprint: hashPiiForLog(auth.uid),
        laneEvidence,
      })
    );

    res.json({
      success: true,
      data: {
        ...payloadWithRuntimeDiagnostic,
        sanitizedUserVisibleText,
        missingUserVisibleText,
        ...(missingUserVisibleText
          ? { missingUserVisibleTextReason: "missing_or_empty_user_visible_text" }
          : {}),
        evidenceCapturedAt,
        carCards: result.orchestrated?.carCards ?? [],
        hasMoreCars: result.orchestrated?.hasMoreCars,
        isDraftPreview: result.orchestrated?.isDraftPreview,
        draftFields: result.orchestrated?.draftFields,
      },
    });
  } catch (err) {
    if (err instanceof ServerAuthError) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    console.error("[chat-user-visible-orchestrate] failed:", err);
    res.status(500).json({ success: false, message: "Orchestration bridge failed" });
  }
}

export function registerSalesBrainUserVisibleOrchestrationBridgeRoutes(
  app: Express,
  deps: { loadChatInventory: () => Promise<ChatInventoryCar[]> }
): void {
  app.post(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE, (req, res) =>
    handleChatUserVisibleOrchestratePost(req, res, deps)
  );
}
