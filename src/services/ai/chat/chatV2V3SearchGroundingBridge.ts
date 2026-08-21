/**
 * WP-NVB-03B — Server-owned Search Grounding bridge.
 * Dedicated pilot gate + Search lane confirmation + one marketplace.search
 * Tool execution + at most one V.3 grounded composition. No Legacy after selection.
 */
import { classifyConversationCoreLane } from "../../../server/conversation-core/conversationCoreLaneClassifier";
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../chat-v3/chatV3ConversationContracts";
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
  validateSearchGroundingComposition,
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

export const SEARCH_GROUNDING_NO_MATCH_TEXT =
  "ไม่พบรถที่ตรงตามเงื่อนไขที่ระบุในรอบนี้ครับ";

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
    }
  | {
      readonly kind: "success";
      readonly userVisibleText: string;
      readonly carCards: readonly ChatCarCardData[];
      readonly hasMoreCars: false;
      readonly conversationBrainStatus: "success";
      readonly usedDeterministicFallback: boolean;
    }
  | {
      readonly kind: "failed-closed";
      readonly userVisibleText: string;
      readonly carCards: readonly [];
      readonly hasMoreCars: false;
      readonly conversationBrainStatus: "failed-closed";
      readonly errorCode?: string;
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
  if (
    isServerDirectedSearchShowMoreMessage(input.userMessage) &&
    continuation
  ) {
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

function failClosedOutcome(errorCode?: string): ChatV2V3SearchGroundingTurnOutcome {
  return {
    kind: "failed-closed",
    userVisibleText: CHAT_V3_USER_FACING_UNAVAILABLE,
    carCards: [],
    hasMoreCars: false,
    conversationBrainStatus: "failed-closed",
    ...(errorCode ? { errorCode } : {}),
  };
}

function successOutcome(input: {
  readonly text: string;
  readonly carCards: readonly ChatCarCardData[];
  readonly usedDeterministicFallback: boolean;
}): ChatV2V3SearchGroundingTurnOutcome {
  return {
    kind: "success",
    userVisibleText: input.text,
    carCards: input.carCards,
    hasMoreCars: false,
    conversationBrainStatus: "success",
    usedDeterministicFallback: input.usedDeterministicFallback,
  };
}

function noMatchOutcome(text = SEARCH_GROUNDING_NO_MATCH_TEXT): ChatV2V3SearchGroundingTurnOutcome {
  return successOutcome({
    text,
    carCards: [],
    usedDeterministicFallback: true,
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
    return noMatchOutcome(
      criteria.unsupportedReasons.includes("show-more-without-prior")
        ? SEARCH_GROUNDING_NO_MATCH_TEXT
        : criteria.unsupportedReasons.length > 0 &&
            !criteria.unsupportedReasons.includes("no-supported-criterion")
          ? SEARCH_GROUNDING_UNSUPPORTED_TEXT
          : SEARCH_GROUNDING_NO_MATCH_TEXT
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
    return failClosedOutcome("malformed_tool_result");
  }
  const toolResult = match.toolResult;
  if (!toolResult || toolResult.status !== "ok" || !toolResult.data) {
    return failClosedOutcome(toolResult?.errorCode ?? "search_tool_failed");
  }

  const packetResult = buildSearchGroundingPacket({
    requestId: ids.requestId,
    conversationId: ids.conversationId,
    criteria,
    toolResult,
    inventory: input.inventory,
  });
  if (!packetResult.ok) {
    return failClosedOutcome("unmapped-listing");
  }

  const { packet, carCards } = packetResult;
  const deterministic = buildDeterministicSearchGroundingSummary(packet);

  if (packet.displayedCount === 0) {
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
      const successText = extractSuccessText(response);
      if (successText) {
        const grounded = validateSearchGroundingComposition({
          text: successText,
          packet,
        });
        if (grounded.ok) {
          return successOutcome({
            text: successText,
            carCards: [],
            usedDeterministicFallback: false,
          });
        }
      }
    } catch {
      // Deterministic no-match summary after valid zero-result.
    }
    return noMatchOutcome(deterministic);
  }

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
    const successText = extractSuccessText(response);
    if (successText) {
      const grounded = validateSearchGroundingComposition({
        text: successText,
        packet,
      });
      if (grounded.ok) {
        return successOutcome({
          text: successText,
          carCards,
          usedDeterministicFallback: false,
        });
      }
    }
  } catch {
    // Keep trusted cards and use deterministic ToolResult-derived summary.
  }

  return successOutcome({
    text: deterministic,
    carCards,
    usedDeterministicFallback: true,
  });
}

export { CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN };
export type { ChatV3SearchGroundedConversationBrainStatus };
