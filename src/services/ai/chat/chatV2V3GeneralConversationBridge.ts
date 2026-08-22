/**
 * WP-NVB-01 / WP-NVB-01R1 — V.2 → V.3 General Conversation Bridge (server-owned seam).
 * Authenticated pilot buyers; general-consultative + high-risk read-only lanes;
 * bounded untrusted history; fail closed on V.3 errors and emergency kill switch.
 */
import { classifyConversationCoreLane } from "../../../server/conversation-core/conversationCoreLaneClassifier";
import type { ConversationCorePolicyLane } from "../../../services/conversation-core/conversationCorePolicyLanes";
import {
  CHAT_V3_USER_FACING_UNAVAILABLE,
  type ChatV3ConversationResponse,
  type ChatV3HistoryTurn,
} from "../chat-v3/chatV3ConversationContracts";
import type { ChatV3AutomotiveVehicleContext } from "../chat-v3/chatV3AutomotiveReasoning";
import {
  runChatV3Conversation,
  type RunChatV3ConversationOptions,
} from "../chat-v3/chatV3ConversationService";
import type { ChatV3ProviderEnvironment } from "../chat-v3/chatV3ProviderAdapter";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../salesBrainRuntimeFlags";
import type { SalesBrainRuntimeEnvironment } from "../salesBrainRuntimeFlags";

export const CHAT_V2_V3_GENERAL_BRIDGE_SLICE_ID = "wp-nvb-01-general-bridge";

export const NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV =
  "NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED";

export const NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV =
  "NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS";

export const GENERAL_BRIDGE_MAX_HISTORY_MESSAGES = 12;
export const GENERAL_BRIDGE_MAX_MESSAGE_CHARS = 2000;
export const GENERAL_BRIDGE_MAX_TOTAL_HISTORY_CHARS = 8000;

const STAGED_LANE_TOOLS = ["marketplace.search", "inventory.fetch"] as const;

const ALLOWED_POLICY_LANES = new Set<ConversationCorePolicyLane>([
  "general-consultative",
  "high-risk-automotive",
]);

export type GeneralBridgeHistoryTurn = ChatV3HistoryTurn;

export type ChatV2V3GeneralBridgeSelection =
  | { readonly selected: false; readonly reason: string }
  | { readonly selected: true };

export type ChatV2V3GeneralBridgeRouting =
  | { readonly kind: "not-selected"; readonly reason: string }
  | { readonly kind: "kill-switch-fail-closed" }
  | { readonly kind: "selected" };

export type ChatV2V3GeneralBridgeTurnOutcome =
  | { readonly kind: "not-selected"; readonly reason: string }
  | { readonly kind: "kill-switch-fail-closed"; readonly userVisibleText: string }
  | {
      readonly kind: "selected-reference-fail-closed";
      readonly userVisibleText: string;
    }
  | { readonly kind: "success"; readonly userVisibleText: string }
  | {
      readonly kind: "failed-closed";
      readonly userVisibleText: string;
      readonly errorCode?: string;
    };

export const SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE =
  "ไม่สามารถยืนยันข้อมูลรถที่เลือกได้ในขณะนี้ กรุณาเลือกรถอีกครั้ง";

const THAI_EXPLICIT_SELECTED_VEHICLE_PHRASES = [
  "รถคันนี้",
  "คันที่เลือก",
  "รถที่เลือก",
  "คันดังกล่าว",
  "คันนี้",
] as const;

const ENGLISH_EXPLICIT_SELECTED_VEHICLE_PATTERNS: readonly RegExp[] = [
  /\bthis car\b/i,
  /\bthis vehicle\b/i,
  /\bselected car\b/i,
  /\bselected vehicle\b/i,
];

export type SelectedVehicleGroundingOutcomeForBridge =
  | "no-selection"
  | "malformed-id"
  | "not-found"
  | "unavailable-blocking-status"
  | "resolved"
  | "resolver-failure";

/** Bounded deterministic cues for explicit selected-vehicle references only. */
export function detectExplicitSelectedVehicleReference(message: string): boolean {
  const text = String(message ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return false;
  if (THAI_EXPLICIT_SELECTED_VEHICLE_PHRASES.some((phrase) => text.includes(phrase))) {
    return true;
  }
  return ENGLISH_EXPLICIT_SELECTED_VEHICLE_PATTERNS.some((pattern) =>
    pattern.test(text)
  );
}

export function shouldFailClosedExplicitSelectedVehicleReference(input: {
  readonly userMessage: string;
  readonly selectedListingIdRequested: boolean;
  readonly groundingOutcome: SelectedVehicleGroundingOutcomeForBridge;
}): boolean {
  if (!detectExplicitSelectedVehicleReference(input.userMessage)) {
    return false;
  }
  if (input.groundingOutcome === "resolved") {
    return false;
  }
  if (input.selectedListingIdRequested) {
    return true;
  }
  return input.groundingOutcome === "no-selection" || input.groundingOutcome === "resolver-failure";
}

export type ChatV2V3GeneralConversationRunner = (
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

function hasDisallowedAuthoritativeTools(
  allowedToolNames: readonly string[]
): boolean {
  for (const toolName of allowedToolNames) {
    if (toolName === "marketplace.search" || toolName === "inventory.fetch") {
      return true;
    }
  }
  return false;
}

/**
 * Read-only classifier evidence: only general-consultative and high-risk-automotive
 * with empty tool allowlists are bridge-eligible lanes.
 */
export function classifyGeneralBridgeLane(userMessage: string): {
  readonly allowed: boolean;
  readonly policyLane?: ConversationCorePolicyLane;
  readonly reasonCode?: string;
} {
  const classified = classifyConversationCoreLane({
    userMessage,
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
  });

  if (classified.kind !== "classified") {
    return { allowed: false, reasonCode: classified.reasonCode };
  }

  if (!ALLOWED_POLICY_LANES.has(classified.policyLane)) {
    return {
      allowed: false,
      policyLane: classified.policyLane,
      reasonCode: classified.reasonCode,
    };
  }

  if (hasDisallowedAuthoritativeTools(classified.allowedToolNames)) {
    return {
      allowed: false,
      policyLane: classified.policyLane,
      reasonCode: classified.reasonCode,
    };
  }

  if (classified.policyLane === "high-risk-automotive") {
    if (classified.reasonCode !== "high-risk-intent") {
      return {
        allowed: false,
        policyLane: classified.policyLane,
        reasonCode: classified.reasonCode,
      };
    }
  }

  if (classified.allowedToolNames.length > 0) {
    return {
      allowed: false,
      policyLane: classified.policyLane,
      reasonCode: classified.reasonCode,
    };
  }

  return {
    allowed: true,
    policyLane: classified.policyLane,
    reasonCode: classified.reasonCode,
  };
}

/**
 * Untrusted conversational context only — never used for auth, facts, or tools.
 */
export function sanitizeBoundedGeneralBridgeHistory(
  raw: unknown,
  currentUserMessage: string
): GeneralBridgeHistoryTurn[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalizedCurrent = String(currentUserMessage ?? "").trim();
  const candidates: GeneralBridgeHistoryTurn[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const roleRaw = String(record.role ?? "").trim().toLowerCase();
    if (roleRaw !== "user" && roleRaw !== "assistant") {
      continue;
    }
    const contentRaw = String(record.content ?? "").trim();
    if (!contentRaw) {
      continue;
    }
    const content =
      contentRaw.length > GENERAL_BRIDGE_MAX_MESSAGE_CHARS
        ? contentRaw.slice(0, GENERAL_BRIDGE_MAX_MESSAGE_CHARS)
        : contentRaw;
    candidates.push({ role: roleRaw, content });
  }

  while (candidates.length > 0) {
    const last = candidates[candidates.length - 1];
    if (last.role === "user" && last.content === normalizedCurrent) {
      candidates.pop();
    } else {
      break;
    }
  }

  let kept = candidates.slice(-GENERAL_BRIDGE_MAX_HISTORY_MESSAGES);
  while (kept.length > 0) {
    const totalChars = kept.reduce((sum, turn) => sum + turn.content.length, 0);
    if (totalChars <= GENERAL_BRIDGE_MAX_TOTAL_HISTORY_CHARS) {
      break;
    }
    kept = kept.slice(1);
  }

  return kept;
}

/**
 * Pilot eligibility without emergency kill switch (kill switch is a separate fail-closed path).
 */
export function evaluateChatV2V3GeneralBridgePilotEligibility(input: {
  readonly authenticatedActorRef: string | undefined | null;
  readonly readEnv: (key: string) => string | undefined;
}): { readonly eligible: boolean; readonly reason: string } {
  const actorRef = String(input.authenticatedActorRef ?? "").trim();
  if (!actorRef) {
    return { eligible: false, reason: "unauthenticated" };
  }

  if (!parseTruthy(input.readEnv(NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV))) {
    return { eligible: false, reason: "bridge-disabled" };
  }

  const pilotUids = parsePilotUids(input.readEnv(NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV));
  if (pilotUids.length === 0) {
    return { eligible: false, reason: "pilot-allowlist-empty" };
  }

  if (!pilotUids.includes(actorRef)) {
    return { eligible: false, reason: "not-on-pilot-allowlist" };
  }

  return { eligible: true, reason: "eligible" };
}

/** @deprecated Use evaluateChatV2V3GeneralBridgePilotEligibility — kill switch handled separately. */
export function evaluateChatV2V3GeneralBridgeEligibility(input: {
  readonly authenticatedActorRef: string | undefined | null;
  readonly readEnv: (key: string) => string | undefined;
}): { readonly eligible: boolean; readonly reason: string } {
  const pilot = evaluateChatV2V3GeneralBridgePilotEligibility(input);
  if (!pilot.eligible) {
    return pilot;
  }
  if (parseTruthy(input.readEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV))) {
    return { eligible: false, reason: "emergency-kill-switch" };
  }
  return pilot;
}

export function resolveChatV2V3GeneralBridgeRouting(input: {
  readonly authenticatedActorRef: string | undefined | null;
  readonly userMessage: string;
  readonly readEnv: (key: string) => string | undefined;
}): ChatV2V3GeneralBridgeRouting {
  const pilot = evaluateChatV2V3GeneralBridgePilotEligibility({
    authenticatedActorRef: input.authenticatedActorRef,
    readEnv: input.readEnv,
  });
  if (!pilot.eligible) {
    return { kind: "not-selected", reason: pilot.reason };
  }

  const lane = classifyGeneralBridgeLane(input.userMessage);
  if (!lane.allowed) {
    return { kind: "not-selected", reason: "lane-not-allowed" };
  }

  if (parseTruthy(input.readEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV))) {
    return { kind: "kill-switch-fail-closed" };
  }

  return { kind: "selected" };
}

/**
 * Determines whether the General Bridge path is selected for this turn.
 */
export function resolveChatV2V3GeneralBridgeSelection(input: {
  readonly authenticatedActorRef: string | undefined | null;
  readonly userMessage: string;
  readonly readEnv: (key: string) => string | undefined;
}): ChatV2V3GeneralBridgeSelection {
  const routing = resolveChatV2V3GeneralBridgeRouting(input);
  if (routing.kind === "selected") {
    return { selected: true };
  }
  if (routing.kind === "kill-switch-fail-closed") {
    return { selected: false, reason: "emergency-kill-switch" };
  }
  return { selected: false, reason: routing.reason };
}

function buildServerOwnedV3Request(input: {
  readonly authenticatedActorRef: string;
  readonly userMessage: string;
  readonly history: readonly GeneralBridgeHistoryTurn[];
}): Record<string, unknown> {
  return {
    conversationId: `chat-v2-v3-bridge:${input.authenticatedActorRef.trim()}`,
    message: input.userMessage.trim(),
    history: input.history.map((turn) => ({ role: turn.role, content: turn.content })),
    expertMode: "AUTO",
  };
}

function extractSuccessText(response: ChatV3ConversationResponse): string | null {
  if (!response.success) {
    return null;
  }
  const content = String(response.data.content ?? "").trim();
  return content.length > 0 ? content : null;
}

export function buildGeneralBridgeKillSwitchFailClosedResult(): ChatV2V3GeneralBridgeTurnOutcome {
  return {
    kind: "kill-switch-fail-closed",
    userVisibleText: CHAT_V3_USER_FACING_UNAVAILABLE,
  };
}

/**
 * Execute one General Bridge turn. Call only when routing.kind === "selected".
 */
export async function executeChatV2V3GeneralBridgeTurn(input: {
  readonly authenticatedActorRef: string;
  readonly userMessage: string;
  readonly conversationHistory?: unknown;
  readonly readEnv: (key: string) => string | undefined;
  readonly environment: SalesBrainRuntimeEnvironment;
  readonly runChatV3Conversation?: ChatV2V3GeneralConversationRunner;
  readonly now?: () => number;
  readonly authoritativeVehicleContext?: ChatV3AutomotiveVehicleContext | null;
  readonly selectedListingIdRequested?: boolean;
  readonly selectedVehicleGroundingOutcome?: SelectedVehicleGroundingOutcomeForBridge;
}): Promise<ChatV2V3GeneralBridgeTurnOutcome> {
  const routing = resolveChatV2V3GeneralBridgeRouting({
    authenticatedActorRef: input.authenticatedActorRef,
    userMessage: input.userMessage,
    readEnv: input.readEnv,
  });

  if (routing.kind === "kill-switch-fail-closed") {
    return buildGeneralBridgeKillSwitchFailClosedResult();
  }

  if (routing.kind === "not-selected") {
    return { kind: "not-selected", reason: routing.reason };
  }

  const groundingOutcome = input.selectedVehicleGroundingOutcome ?? "no-selection";
  if (
    shouldFailClosedExplicitSelectedVehicleReference({
      userMessage: input.userMessage,
      selectedListingIdRequested: input.selectedListingIdRequested === true,
      groundingOutcome,
    })
  ) {
    return {
      kind: "selected-reference-fail-closed",
      userVisibleText: SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE,
    };
  }

  const history = sanitizeBoundedGeneralBridgeHistory(
    input.conversationHistory,
    input.userMessage
  );

  const runner = input.runChatV3Conversation ?? runChatV3Conversation;
  const response = await runner({
    rawRequest: buildServerOwnedV3Request({
      authenticatedActorRef: input.authenticatedActorRef,
      userMessage: input.userMessage,
      history,
    }),
    environment: mapBridgeEnvironment(input.environment),
    readEnv: input.readEnv,
    now: input.now,
    authoritativeSelectedVehicleContext: input.authoritativeVehicleContext ?? null,
  });

  const successText = extractSuccessText(response);
  if (successText) {
    return { kind: "success", userVisibleText: successText };
  }

  let errorCode = "empty_v3_content";
  if (response.success === false) {
    errorCode = response.errorCode;
  }
  return {
    kind: "failed-closed",
    userVisibleText: CHAT_V3_USER_FACING_UNAVAILABLE,
    errorCode,
  };
}
