/**
 * WP-NVB-03B — Server-owned Search Grounding bridge.
 * Dedicated pilot gate + Search lane confirmation + one marketplace.search
 * Tool execution + at most one V.3 grounded composition. No Legacy after selection.
 */
import { classifyConversationCoreLane } from "../../../server/conversation-core/conversationCoreLaneClassifier";
import {
  CHAT_V3_USER_FACING_UNAVAILABLE,
  readChatV3SearchCompositionBoundaryDiagnostic,
  type SearchCompositionFallbackReason,
  type SearchCompositionStructuredOutputParseStatus,
  type SearchCompositionValidationCode,
  type SearchPresentationMode,
} from "../chat-v3/chatV3ConversationContracts";
import {
  runChatV3Conversation,
  type RunChatV3ConversationOptions,
} from "../chat-v3/chatV3ConversationService";
import type { ChatV3ConversationResponse } from "../chat-v3/chatV3ConversationContracts";
import type { ChatV3ProviderEnvironment } from "../chat-v3/chatV3ProviderAdapter";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../salesBrainRuntimeFlags";
import type { SalesBrainRuntimeEnvironment } from "../salesBrainRuntimeFlags";
import type { ChatCarCardData } from "../../../types";
import type { ChatInventoryCar } from "./marketplaceChatSearch";
import {
  sanitizeBoundedGeneralBridgeHistory,
  type GeneralBridgeHistoryTurn,
} from "./chatV2V3GeneralConversationBridge";
import {
  hasPriorSubstantiveServerDirectedSearch,
  isServerDirectedSearchShowMoreMessage,
  parseServerDirectedSearchCriteria,
  type ServerDirectedSearchCriteria,
  type ServerDirectedSearchHistoryTurn,
} from "./chatV2V3SearchGroundingCriteria";
import { runServerDirectedMarketplaceMatch } from "./chatV2V3SearchGroundingMatch";
import {
  buildDeterministicSearchGroundingSummary,
  buildSearchGroundingAppendix,
  buildSearchGroundingPacket,
  buildSearchGroundingVehicleContext,
  looksLikeSearchGroundingJsonEnvelope,
  orderSearchGroundingCarCards,
  renderSearchVehicleSectionsMarkdown,
  renderZeroResultSearchMarkdown,
  SEARCH_GROUNDING_NO_MATCH_TEXT,
  validateSearchVehicleSections,
  type SearchCountClaimDisposition,
  type SearchDisplayOrderClassification,
  type SearchGroundingPacket,
  type SearchVehicleSectionsOutput,
} from "./chatV2V3SearchGroundingCompose";
import {
  CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
  type ChatV3SearchGroundedConversationBrainStatus,
} from "./chatV2V3SearchGroundingClientApply";

export const CHAT_V2_V3_SEARCH_GROUNDING_SLICE_ID = "wp-nvb-03b-search-grounding";

export const NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV =
  "NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED";

export const NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS_ENV =
  "NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS";

export { SEARCH_GROUNDING_NO_MATCH_TEXT };

export const SEARCH_GROUNDING_SHOW_MORE_WITHOUT_PRIOR_TEXT =
  "ยังไม่มีผลการค้นหาก่อนหน้าสำหรับดูเพิ่ม กรุณาค้นหารถก่อน";

export const SEARCH_GROUNDING_UNSUPPORTED_TEXT =
  "ยังไม่สามารถค้นจากเงื่อนไขนี้ได้อย่างแม่นยำครับ จึงไม่ขยายผลไปยังรถที่ไม่ตรงตามที่ขอ";

const STAGED_LANE_TOOLS = ["marketplace.search", "inventory.fetch"] as const;

export type ChatV2V3SearchGroundingRouting =
  | { readonly kind: "not-selected"; readonly reason: string }
  | { readonly kind: "kill-switch-fail-closed" }
  | { readonly kind: "selected" };

export type ChatV2V3SearchGroundingTurnOutcome =
  | { readonly kind: "not-selected"; readonly reason: string }
  | {
      readonly kind: "kill-switch-fail-closed";
      readonly userVisibleText: string;
      readonly carCards: readonly [];
      readonly hasMoreCars: false;
      readonly conversationBrainStatus: "failed-closed";
      readonly displayOrderClassification: "failed-closed";
      readonly structuredOrderValid: false;
      readonly validatedToolResultListingIdCount: 0;
      readonly marketplaceSearchExecutionCount: 0;
      readonly inventoryFetchExecutionCount: 0;
    }
  | {
      readonly kind: "success";
      readonly userVisibleText: string;
      readonly carCards: readonly ChatCarCardData[];
      readonly hasMoreCars: false;
      readonly conversationBrainStatus: "success";
      readonly usedDeterministicFallback: boolean;
      readonly displayOrderClassification: SearchDisplayOrderClassification;
      readonly structuredOrderValid: boolean;
      readonly validatedToolResultListingIdCount: number;
      readonly marketplaceSearchExecutionCount: 0 | 1;
      readonly inventoryFetchExecutionCount: 0;
      readonly searchCompositionFallbackReason?: SearchCompositionFallbackReason;
      readonly structuredOutputParseStatus?: SearchCompositionStructuredOutputParseStatus;
      readonly searchCompositionTextPresent?: boolean;
      readonly searchCompositionValidationCode?: SearchCompositionValidationCode;
      readonly searchPresentationMode?: SearchPresentationMode;
      readonly searchCountClaimDisposition?: SearchCountClaimDisposition;
    }
  | {
      readonly kind: "failed-closed";
      readonly userVisibleText: string;
      readonly carCards: readonly [];
      readonly hasMoreCars: false;
      readonly conversationBrainStatus: "failed-closed";
      readonly errorCode?: string;
      readonly displayOrderClassification: "failed-closed";
      readonly structuredOrderValid: false;
      readonly validatedToolResultListingIdCount: number;
      readonly marketplaceSearchExecutionCount: 0 | 1;
      readonly inventoryFetchExecutionCount: 0;
    };

export type ChatV2V3SearchGroundingRunner = (
  options: RunChatV3ConversationOptions
) => Promise<ChatV3ConversationResponse>;

function parseTruthy(raw: string | undefined): boolean {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function parsePilotUids(raw: string | undefined): readonly string[] {
  return String(raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapBridgeEnvironment(
  environment: SalesBrainRuntimeEnvironment
): ChatV3ProviderEnvironment {
  if (environment === "production") return "production";
  if (environment === "staging") return "staging";
  return "local";
}

export function evaluateChatV2V3SearchGroundingPilotEligibility(input: {
  readonly authenticatedActorRef: string | undefined | null;
  readonly readEnv: (key: string) => string | undefined;
}): { readonly eligible: boolean; readonly reason: string } {
  const actorRef = String(input.authenticatedActorRef ?? "").trim();
  if (!actorRef) {
    return { eligible: false, reason: "unauthenticated" };
  }
  if (!parseTruthy(input.readEnv(NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV))) {
    return { eligible: false, reason: "search-grounding-disabled" };
  }
  const pilotUids = parsePilotUids(
    input.readEnv(NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS_ENV)
  );
  if (pilotUids.length === 0) {
    return { eligible: false, reason: "pilot-allowlist-empty" };
  }
  if (!pilotUids.includes(actorRef)) {
    return { eligible: false, reason: "not-on-pilot-allowlist" };
  }
  return { eligible: true, reason: "eligible" };
}

export function classifySearchGroundingLane(input: {
  readonly userMessage: string;
  readonly conversationHistory?: unknown;
}): { readonly allowed: boolean; readonly reason: string } {
  const history = sanitizeBoundedGeneralBridgeHistory(
    input.conversationHistory,
    input.userMessage
  );
  const continuation = hasPriorSubstantiveServerDirectedSearch(
    history as ServerDirectedSearchHistoryTurn[]
  );
  // Show-more is Search-owned. Missing prior page context is a
  // context-required outcome — not another lane and not a no-match.
  if (isServerDirectedSearchShowMoreMessage(input.userMessage)) {
    return { allowed: true, reason: "vehicle-search-intent" };
  }
  const classified = classifyConversationCoreLane({
    userMessage: input.userMessage,
    capabilities: {
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: true,
    },
    stagedToolNames: [...STAGED_LANE_TOOLS],
    trustedPrerequisites: {
      hasTrustedRoomListingSet: false,
      hasTrustedSelectedListing: false,
    },
    continuation: {
      vehicleSearchContinuation: continuation,
    },
  });

  if (classified.kind !== "classified") {
    return { allowed: false, reason: classified.reasonCode };
  }
  if (classified.reasonCode === "vehicle-inventory-intent") {
    return { allowed: false, reason: "inventory-not-selected" };
  }
  if (classified.reasonCode !== "vehicle-search-intent") {
    return { allowed: false, reason: classified.reasonCode };
  }
  if (!classified.allowedToolNames.includes("marketplace.search")) {
    return { allowed: false, reason: "search-tool-not-allowed" };
  }
  if (classified.allowedToolNames.includes("inventory.fetch")) {
    return { allowed: false, reason: "inventory-not-selected" };
  }
  return { allowed: true, reason: "vehicle-search-intent" };
}

export function resolveChatV2V3SearchGroundingRouting(input: {
  readonly authenticatedActorRef: string | undefined | null;
  readonly userMessage: string;
  readonly conversationHistory?: unknown;
  readonly readEnv: (key: string) => string | undefined;
}): ChatV2V3SearchGroundingRouting {
  const pilot = evaluateChatV2V3SearchGroundingPilotEligibility({
    authenticatedActorRef: input.authenticatedActorRef,
    readEnv: input.readEnv,
  });
  if (!pilot.eligible) {
    return { kind: "not-selected", reason: pilot.reason };
  }

  const lane = classifySearchGroundingLane({
    userMessage: input.userMessage,
    conversationHistory: input.conversationHistory,
  });
  if (!lane.allowed) {
    return { kind: "not-selected", reason: lane.reason };
  }

  if (parseTruthy(input.readEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV))) {
    return { kind: "kill-switch-fail-closed" };
  }

  return { kind: "selected" };
}

function extractSuccessText(response: ChatV3ConversationResponse): string | null {
  if (!response.success) return null;
  const content = String(response.data.content ?? "").trim();
  return content.length > 0 ? content : null;
}

function failClosedOutcome(input: {
  readonly errorCode?: string;
  readonly marketplaceSearchExecutionCount?: 0 | 1;
  readonly validatedToolResultListingIdCount?: number;
}): ChatV2V3SearchGroundingTurnOutcome {
  return {
    kind: "failed-closed",
    userVisibleText: CHAT_V3_USER_FACING_UNAVAILABLE,
    carCards: [],
    hasMoreCars: false,
    conversationBrainStatus: "failed-closed",
    displayOrderClassification: "failed-closed",
    structuredOrderValid: false,
    validatedToolResultListingIdCount: input.validatedToolResultListingIdCount ?? 0,
    marketplaceSearchExecutionCount: input.marketplaceSearchExecutionCount ?? 0,
    inventoryFetchExecutionCount: 0,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  };
}

type SearchCompositionDiagnosticFields = {
  readonly searchCompositionFallbackReason: SearchCompositionFallbackReason;
  readonly structuredOutputParseStatus: SearchCompositionStructuredOutputParseStatus;
  readonly searchCompositionTextPresent: boolean;
  readonly searchCompositionValidationCode: SearchCompositionValidationCode;
  readonly searchPresentationMode?: SearchPresentationMode;
  readonly searchCountClaimDisposition?: SearchCountClaimDisposition;
};

function successOutcome(input: {
  readonly text: string;
  readonly carCards: readonly ChatCarCardData[];
  readonly usedDeterministicFallback: boolean;
  readonly displayOrderClassification: SearchDisplayOrderClassification;
  readonly structuredOrderValid: boolean;
  readonly validatedToolResultListingIdCount: number;
  readonly marketplaceSearchExecutionCount: 0 | 1;
  readonly diagnostic?: SearchCompositionDiagnosticFields;
}): ChatV2V3SearchGroundingTurnOutcome {
  return {
    kind: "success",
    userVisibleText: input.text,
    carCards: input.carCards,
    hasMoreCars: false,
    conversationBrainStatus: "success",
    usedDeterministicFallback: input.usedDeterministicFallback,
    displayOrderClassification: input.displayOrderClassification,
    structuredOrderValid: input.structuredOrderValid,
    validatedToolResultListingIdCount: input.validatedToolResultListingIdCount,
    marketplaceSearchExecutionCount: input.marketplaceSearchExecutionCount,
    inventoryFetchExecutionCount: 0,
    ...(input.diagnostic ?? {}),
  };
}

function noMatchOutcome(
  text = SEARCH_GROUNDING_NO_MATCH_TEXT,
  marketplaceSearchExecutionCount: 0 | 1 = 0,
  diagnostic?: SearchCompositionDiagnosticFields
): ChatV2V3SearchGroundingTurnOutcome {
  return successOutcome({
    text,
    carCards: [],
    usedDeterministicFallback: true,
    displayOrderClassification: "zero-result",
    structuredOrderValid: true,
    validatedToolResultListingIdCount: 0,
    marketplaceSearchExecutionCount,
    ...(diagnostic
      ? {
          diagnostic: {
            ...diagnostic,
            searchPresentationMode: diagnostic.searchPresentationMode ?? "zero-result",
          },
        }
      : {
          diagnostic: {
            searchCompositionFallbackReason: "none",
            structuredOutputParseStatus: "not-applicable",
            searchCompositionTextPresent: false,
            searchCompositionValidationCode: "none",
            searchPresentationMode: "zero-result",
          },
        }),
  });
}

function unsupportedShowMoreWithoutPriorOutcome(): ChatV2V3SearchGroundingTurnOutcome {
  return successOutcome({
    text: SEARCH_GROUNDING_SHOW_MORE_WITHOUT_PRIOR_TEXT,
    carCards: [],
    usedDeterministicFallback: false,
    displayOrderClassification: "unsupported-show-more-without-prior",
    structuredOrderValid: true,
    validatedToolResultListingIdCount: 0,
    marketplaceSearchExecutionCount: 0,
    diagnostic: {
      searchCompositionFallbackReason: "none",
      structuredOutputParseStatus: "not-applicable",
      searchCompositionTextPresent: false,
      searchCompositionValidationCode: "none",
    },
  });
}

function extractSearchVehicleSections(
  response: ChatV3ConversationResponse
): SearchVehicleSectionsOutput | undefined {
  if (!response.success) return undefined;
  const metadata = response.data.searchComposition;
  if (!metadata) return undefined;
  if (typeof metadata.introText !== "string") return undefined;
  if (typeof metadata.closingText !== "string") return undefined;
  if (!Array.isArray(metadata.vehicleAnalyses)) return undefined;
  return {
    introText: metadata.introText,
    vehicleAnalyses: metadata.vehicleAnalyses,
    closingText: metadata.closingText,
  };
}

function providerErrorFallbackReason(
  errorCode: string | undefined
): SearchCompositionFallbackReason {
  if (
    errorCode === "provider_failure" ||
    errorCode === "provider_unavailable" ||
    errorCode === "provider_timeout" ||
    errorCode === "provider_rejected"
  ) {
    return "provider-failure";
  }
  if (errorCode === "unsafe_output") return "unsafe-output";
  return "unknown-bounded";
}

function mapCompositionValidation(reason: string): {
  readonly fallbackReason: SearchCompositionFallbackReason;
  readonly validationCode: SearchCompositionValidationCode;
} {
  if (reason === "marketplace-total-claim") {
    return {
      fallbackReason: "composition-total-claim-invalid",
      validationCode: "marketplace-total-claim",
    };
  }
  if (reason === "incorrect-count") {
    return {
      fallbackReason: "composition-count-claim-invalid",
      validationCode: "incorrect-count",
    };
  }
  if (reason === "displayed-count-mismatch") {
    return {
      fallbackReason: "composition-count-claim-invalid",
      validationCode: "displayed-count-mismatch",
    };
  }
  if (
    reason === "cross-listing-price" ||
    reason === "cross-listing-mileage" ||
    reason === "omitted-mileage-stated" ||
    reason === "omitted-transmission-stated" ||
    reason === "omitted-body-stated"
  ) {
    return {
      fallbackReason: "composition-grounding-fact-invalid",
      validationCode: reason,
    };
  }
  if (reason === "empty-text") {
    return {
      fallbackReason: "missing-success-text",
      validationCode: "empty-text",
    };
  }
  if (reason === "invalid-listing-ids") {
    return {
      fallbackReason: "composition-validation-failed",
      validationCode: "invalid-listing-ids",
    };
  }
  if (reason === "identity-rename") {
    return {
      fallbackReason: "composition-grounding-fact-invalid",
      validationCode: "identity-rename",
    };
  }
  if (reason === "unsupported-listing-claim") {
    return {
      fallbackReason: "composition-grounding-fact-invalid",
      validationCode: "unsupported-listing-claim",
    };
  }
  return {
    fallbackReason: "composition-validation-failed",
    validationCode: "unknown-bounded",
  };
}

function resolveMissingOrLeakedDiagnostic(input: {
  readonly response: ChatV3ConversationResponse | null;
  readonly leaked: boolean;
  readonly successTextPresent: boolean;
}): SearchCompositionDiagnosticFields {
  const boundary = readChatV3SearchCompositionBoundaryDiagnostic(input.response);
  if (input.leaked) {
    return {
      searchCompositionFallbackReason: "structured-output-envelope-leak",
      structuredOutputParseStatus:
        boundary?.structuredOutputParseStatus ?? "envelope-leak",
      searchCompositionTextPresent: input.successTextPresent,
      searchCompositionValidationCode: "none",
    };
  }
  if (boundary) {
    return {
      searchCompositionFallbackReason: boundary.searchCompositionFallbackReason,
      structuredOutputParseStatus: boundary.structuredOutputParseStatus,
      searchCompositionTextPresent: boundary.searchCompositionTextPresent,
      searchCompositionValidationCode: "none",
    };
  }
  if (!input.response) {
    return {
      searchCompositionFallbackReason: "provider-failure",
      structuredOutputParseStatus: "absent",
      searchCompositionTextPresent: false,
      searchCompositionValidationCode: "none",
    };
  }
  const response = input.response;
  if (response.success === false) {
    return {
      searchCompositionFallbackReason: providerErrorFallbackReason(
        response.errorCode
      ),
      structuredOutputParseStatus: "absent",
      searchCompositionTextPresent: false,
      searchCompositionValidationCode: "none",
    };
  }
  return {
    searchCompositionFallbackReason: "missing-success-text",
    structuredOutputParseStatus: "absent",
    searchCompositionTextPresent: false,
    searchCompositionValidationCode: "none",
  };
}

function acceptedCompositionDiagnostic(
  response: ChatV3ConversationResponse | null
): SearchCompositionDiagnosticFields {
  const boundary = readChatV3SearchCompositionBoundaryDiagnostic(response);
  return {
    searchCompositionFallbackReason: "none",
    structuredOutputParseStatus:
      boundary?.structuredOutputParseStatus ??
      (response && extractSearchVehicleSections(response) !== undefined
        ? "structured"
        : "plain-text"),
    searchCompositionTextPresent: true,
    searchCompositionValidationCode: "none",
  };
}

function withPresentationMode(
  diagnostic: SearchCompositionDiagnosticFields,
  mode: SearchPresentationMode
): SearchCompositionDiagnosticFields {
  return { ...diagnostic, searchPresentationMode: mode };
}

function resolveGroundedSearchDisplay(input: {
  readonly response: ChatV3ConversationResponse | null;
  readonly packet: SearchGroundingPacket;
  readonly canonicalCards: readonly ChatCarCardData[];
  readonly deterministic: string;
}): ChatV2V3SearchGroundingTurnOutcome {
  const zero = input.packet.displayedCount === 0;
  const marketplaceSearchExecutionCount = 1 as const;
  const validatedCount = input.packet.returnedCount;
  const successText = input.response ? extractSuccessText(input.response) : null;
  const leaked =
    Boolean(successText) && looksLikeSearchGroundingJsonEnvelope(successText ?? "");
  let sections = input.response
    ? extractSearchVehicleSections(input.response)
    : undefined;

  const readableFallback = (
    diagnostic: SearchCompositionDiagnosticFields
  ): ChatV2V3SearchGroundingTurnOutcome => {
    const withMode = withPresentationMode(
      diagnostic,
      zero ? "zero-result" : "readable-fallback"
    );
    if (zero) return noMatchOutcome(input.deterministic, 1, withMode);
    return successOutcome({
      text: input.deterministic,
      carCards: input.canonicalCards,
      usedDeterministicFallback: true,
      displayOrderClassification: "deterministic-fallback",
      structuredOrderValid: false,
      validatedToolResultListingIdCount: validatedCount,
      marketplaceSearchExecutionCount,
      diagnostic: withMode,
    });
  };

  const zeroResultServerCue = (
    diagnostic: SearchCompositionDiagnosticFields
  ): ChatV2V3SearchGroundingTurnOutcome =>
    successOutcome({
      text: SEARCH_GROUNDING_NO_MATCH_TEXT,
      carCards: [],
      usedDeterministicFallback: false,
      displayOrderClassification: "zero-result",
      structuredOrderValid: true,
      validatedToolResultListingIdCount: 0,
      marketplaceSearchExecutionCount,
      diagnostic: withPresentationMode(
        {
          ...diagnostic,
          searchCompositionTextPresent: false,
          searchCompositionFallbackReason: "missing-success-text",
          searchCompositionValidationCode: "empty-text",
        },
        "zero-result"
      ),
    });

  if (leaked) {
    return readableFallback(
      resolveMissingOrLeakedDiagnostic({
        response: input.response,
        leaked: true,
        successTextPresent: Boolean(successText),
      })
    );
  }

  // Plain-text V.3 on a successful empty ToolResult is still a V.3 reply.
  if (!sections && zero && successText) {
    sections = {
      introText: successText,
      closingText: "",
      vehicleAnalyses: [],
    };
  }

  // Adaptive: structured metadata may carry an intentionally short/empty narrative.
  // Do not treat empty success text as style failure when sections are present.
  if (sections) {
    const validated = validateSearchVehicleSections({
      sections,
      packet: input.packet,
    });
    if (validated.ok === false) {
      const mapped = mapCompositionValidation(validated.reason);
      return readableFallback({
        searchCompositionFallbackReason: mapped.fallbackReason,
        structuredOutputParseStatus:
          readChatV3SearchCompositionBoundaryDiagnostic(input.response)
            ?.structuredOutputParseStatus ?? "structured",
        searchCompositionTextPresent: Boolean(successText),
        searchCompositionValidationCode: mapped.validationCode,
      });
    }

    const v3HasText =
      Boolean(validated.introText) ||
      Boolean(validated.closingText) ||
      validated.vehicleAnalyses.some((item) => Boolean(item.analysisText));

    const accepted = withPresentationMode(
      {
        ...acceptedCompositionDiagnostic(input.response),
        searchCountClaimDisposition: validated.countClaimDisposition,
        searchCompositionTextPresent: v3HasText,
      },
      zero ? "zero-result" : "vehicle-sections"
    );

    if (zero) {
      const rendered = renderZeroResultSearchMarkdown({
        introText: validated.introText,
        closingText: validated.closingText,
      }).trim();
      if (!rendered) {
        return zeroResultServerCue(accepted);
      }
      return successOutcome({
        text: rendered,
        carCards: [],
        usedDeterministicFallback: false,
        displayOrderClassification: "zero-result",
        structuredOrderValid: true,
        validatedToolResultListingIdCount: 0,
        marketplaceSearchExecutionCount,
        diagnostic: accepted,
      });
    }

    const listingsById = new Map(
      input.packet.displayedListings.map((listing) => [listing.id, listing])
    );
    return successOutcome({
      text: renderSearchVehicleSectionsMarkdown({
        introText: validated.introText,
        closingText: validated.closingText,
        vehicleAnalyses: validated.vehicleAnalyses,
        listingsById,
      }),
      carCards: orderSearchGroundingCarCards(
        input.canonicalCards,
        validated.orderedListingIds
      ),
      usedDeterministicFallback: false,
      displayOrderClassification: "structured-accepted",
      structuredOrderValid: true,
      validatedToolResultListingIdCount: validatedCount,
      marketplaceSearchExecutionCount,
      diagnostic: accepted,
    });
  }

  // Successful empty ToolResult + successful empty V.3 → Server factual cue.
  // Provider/tool-unrelated V.3 failure still uses existing fail-closed/readable paths.
  if (zero && input.response?.success === true) {
    return zeroResultServerCue({
      searchCompositionFallbackReason: "missing-success-text",
      structuredOutputParseStatus:
        readChatV3SearchCompositionBoundaryDiagnostic(input.response)
          ?.structuredOutputParseStatus ?? "absent",
      searchCompositionTextPresent: false,
      searchCompositionValidationCode: "empty-text",
    });
  }

  if (!successText) {
    return readableFallback(
      resolveMissingOrLeakedDiagnostic({
        response: input.response,
        leaked: false,
        successTextPresent: false,
      })
    );
  }

  return readableFallback({
    searchCompositionFallbackReason: "composition-validation-failed",
    structuredOutputParseStatus:
      readChatV3SearchCompositionBoundaryDiagnostic(input.response)
        ?.structuredOutputParseStatus ?? "plain-text",
    searchCompositionTextPresent: true,
    searchCompositionValidationCode: "invalid-listing-ids",
  });
}

function buildServerOwnedV3Request(input: {
  readonly authenticatedActorRef: string;
  readonly userMessage: string;
  readonly history: readonly GeneralBridgeHistoryTurn[];
}): Record<string, unknown> {
  return {
    conversationId: `chat-v2-v3-search:${input.authenticatedActorRef.trim()}`,
    message: input.userMessage.trim(),
    history: input.history.map((turn) => ({ role: turn.role, content: turn.content })),
    expertMode: "BUYING",
  };
}

export async function executeChatV2V3SearchGroundingTurn(input: {
  readonly authenticatedActorRef: string;
  readonly userMessage: string;
  readonly conversationHistory?: unknown;
  readonly inventory: readonly ChatInventoryCar[];
  readonly readEnv: (key: string) => string | undefined;
  readonly environment: SalesBrainRuntimeEnvironment;
  readonly runChatV3Conversation?: ChatV2V3SearchGroundingRunner;
  readonly now?: () => number;
  readonly createIds?: () => { requestId: string; conversationId: string };
}): Promise<ChatV2V3SearchGroundingTurnOutcome> {
  const routing = resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: input.authenticatedActorRef,
    userMessage: input.userMessage,
    conversationHistory: input.conversationHistory,
    readEnv: input.readEnv,
  });

  if (routing.kind === "kill-switch-fail-closed") {
    return {
      kind: "kill-switch-fail-closed",
      userVisibleText: CHAT_V3_USER_FACING_UNAVAILABLE,
      carCards: [],
      hasMoreCars: false,
      conversationBrainStatus: "failed-closed",
      displayOrderClassification: "failed-closed",
      structuredOrderValid: false,
      validatedToolResultListingIdCount: 0,
      marketplaceSearchExecutionCount: 0,
      inventoryFetchExecutionCount: 0,
    };
  }

  if (routing.kind === "not-selected") {
    return { kind: "not-selected", reason: routing.reason };
  }

  const history = sanitizeBoundedGeneralBridgeHistory(
    input.conversationHistory,
    input.userMessage
  );
  const criteria: ServerDirectedSearchCriteria = parseServerDirectedSearchCriteria(
    input.userMessage,
    history as ServerDirectedSearchHistoryTurn[]
  );

  if (!criteria.supported) {
    if (criteria.unsupportedReasons.includes("show-more-without-prior")) {
      return unsupportedShowMoreWithoutPriorOutcome();
    }
    return noMatchOutcome(
      criteria.unsupportedReasons.length > 0 &&
        !criteria.unsupportedReasons.includes("no-supported-criterion")
        ? SEARCH_GROUNDING_UNSUPPORTED_TEXT
        : SEARCH_GROUNDING_NO_MATCH_TEXT,
      0
    );
  }

  const ids =
    input.createIds?.() ??
    ({
      requestId: `search-grounding-${Date.now().toString(36)}`,
      conversationId: `chat-v2-v3-search:${input.authenticatedActorRef.trim()}`,
    } as const);

  const match = await runServerDirectedMarketplaceMatch({
    requestId: ids.requestId,
    conversationId: ids.conversationId,
    criteria,
    inventory: input.inventory,
  });

  if (match.outcome.kind !== "completed") {
    return failClosedOutcome({
      errorCode: "malformed_tool_result",
      marketplaceSearchExecutionCount: 1,
    });
  }
  const toolResult = match.toolResult;
  if (!toolResult || toolResult.status !== "ok" || !toolResult.data) {
    return failClosedOutcome({
      errorCode: toolResult?.errorCode ?? "search_tool_failed",
      marketplaceSearchExecutionCount: 1,
    });
  }

  const packetResult = buildSearchGroundingPacket({
    requestId: ids.requestId,
    conversationId: ids.conversationId,
    criteria,
    toolResult,
    inventory: input.inventory,
  });
  if (!packetResult.ok) {
    return failClosedOutcome({
      errorCode: "unmapped-listing",
      marketplaceSearchExecutionCount: 1,
    });
  }

  const { packet, carCards } = packetResult;
  const deterministic = buildDeterministicSearchGroundingSummary(packet);
  const runner = input.runChatV3Conversation ?? runChatV3Conversation;

  try {
    const response = await runner({
      rawRequest: buildServerOwnedV3Request({
        authenticatedActorRef: input.authenticatedActorRef,
        userMessage: input.userMessage,
        history,
      }),
      environment: mapBridgeEnvironment(input.environment),
      readEnv: input.readEnv,
      now: input.now,
      searchGroundingAppendix: buildSearchGroundingAppendix(packet),
      searchGroundingVehicleContext: buildSearchGroundingVehicleContext(packet),
      searchGroundingComposition: true,
    });
    return resolveGroundedSearchDisplay({
      response,
      packet,
      canonicalCards: carCards,
      deterministic,
    });
  } catch {
    return resolveGroundedSearchDisplay({
      response: null,
      packet,
      canonicalCards: carCards,
      deterministic,
    });
  }
}

export { CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN };
export type { ChatV3SearchGroundedConversationBrainStatus };
