/**
 * WP-V2U-04B — Server-side Chat V.2 → Conversation Core pilot bridge.
 * Routes only authenticated Pilot Search/Inventory turns. No import-time network.
 * Client flags/UID/tool allowlists are never trusted. Fail closed on Core errors.
 */
import type { ChatCarCardData } from "../../types";
import type { AuthRole } from "../../utils/rbac";
import type { ChatInventoryCar } from "../../services/ai/chat/marketplaceChatSearch";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../../services/ai/chat/marketplaceChatSearch";
import {
  CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT,
  CONVERSATION_CORE_MAX_ATTACHED_IMAGE_COUNT,
  CONVERSATION_CORE_POLICY_VERSION,
  containsHtmlOrScript,
  validateConversationCoreExecutionContext,
  validateConversationTurnRequest,
  type ConversationCoreExecutionContext,
  type ConversationCoreResult,
  type ConversationCoreToolName,
  type ConversationTurnRequest,
} from "../../services/conversation-core/index";
import { NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV } from "./conversationCoreGeminiConfig";
import {
  NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV,
  resolveConversationCoreLiveServerActivation,
} from "./conversationCoreLiveServerActivation";
import {
  classifyConversationCoreLane,
  type ConversationCoreLaneClassifierOutcome,
} from "./conversationCoreLaneClassifier";
import {
  evaluateConversationCorePilotEligibility,
} from "./conversationCorePilotEligibility";
import { resolveConversationCoreFeatureFlags } from "./conversationCoreFeatureFlags";
import {
  runConversationCoreOrchestrator,
  type ConversationCoreOrchestratorResult,
} from "./conversationCoreOrchestrator";

export const CHAT_V2_CONVERSATION_CORE_PILOT_UNAVAILABLE_TEXT =
  CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT;

export const CHAT_V2_CONVERSATION_CORE_STAGED_TOOL_NAMES = [
  "marketplace.search",
  "inventory.fetch",
] as const satisfies readonly ConversationCoreToolName[];

const CORE_ROUTE_TOOLS = new Set<string>(CHAT_V2_CONVERSATION_CORE_STAGED_TOOL_NAMES);

export interface ConversationTurnInput {
  readonly request: ConversationTurnRequest;
  readonly context: ConversationCoreExecutionContext;
}

export type ChatUserVisibleConversationCoreRouting =
  | { readonly kind: "legacy"; readonly reason: string }
  | {
      readonly kind: "conversation-core";
      readonly toolName: "marketplace.search" | "inventory.fetch";
      readonly reasonCode: string;
    };

export type ChatUserVisibleConversationCoreMappedSuccess = {
  readonly kind: "completed";
  readonly userVisibleText: string;
  readonly carCards: ChatCarCardData[];
};

export type ChatUserVisibleConversationCoreMappedUnavailable = {
  readonly kind: "unavailable";
  readonly userVisibleText: typeof CHAT_V2_CONVERSATION_CORE_PILOT_UNAVAILABLE_TEXT;
  readonly carCards: readonly [];
};

export type ChatUserVisibleConversationCoreMappedResult =
  | ChatUserVisibleConversationCoreMappedSuccess
  | ChatUserVisibleConversationCoreMappedUnavailable;

export type ChatUserVisibleConversationCoreRunner = (
  input: ConversationTurnInput
) =>
  | ConversationCoreOrchestratorResult
  | Promise<ConversationCoreOrchestratorResult>;

function parseFlagTrue(raw: string | undefined): boolean {
  return String(raw ?? "").trim() === "true";
}

function mapAuthRoleToActorScopeRole(
  role: AuthRole
): "client" | "dealer" | "admin" {
  if (role === "admin" || role === "superadmin") {
    return "admin";
  }
  if (role === "dealer") {
    return "dealer";
  }
  return "client";
}

function freezeUnavailable(): ChatUserVisibleConversationCoreMappedUnavailable {
  return Object.freeze({
    kind: "unavailable" as const,
    userVisibleText: CHAT_V2_CONVERSATION_CORE_PILOT_UNAVAILABLE_TEXT,
    carCards: Object.freeze([]) as readonly [],
  });
}

function classifyPilotLane(userMessage: string): ConversationCoreLaneClassifierOutcome {
  return classifyConversationCoreLane({
    userMessage,
    capabilities: {
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: true,
    },
    stagedToolNames: [...CHAT_V2_CONVERSATION_CORE_STAGED_TOOL_NAMES],
    trustedPrerequisites: {
      hasTrustedRoomListingSet: false,
      hasTrustedSelectedListing: false,
    },
  });
}

/**
 * Server-owned routing. Identity and flags come only from verified auth + readEnv.
 */
export function resolveChatUserVisibleConversationCoreRouting(input: {
  readonly authenticatedActorRef: string;
  readonly userMessage: string;
  readonly readEnv: (key: string) => string | undefined;
}): ChatUserVisibleConversationCoreRouting {
  const flags = resolveConversationCoreFeatureFlags({ readEnv: input.readEnv });
  if (flags.emergencyKillSwitchActive) {
    return { kind: "legacy", reason: "emergency-kill-switch" };
  }
  if (!flags.coreEnabled) {
    return { kind: "legacy", reason: "core-disabled" };
  }
  if (!parseFlagTrue(input.readEnv(NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV))) {
    return { kind: "legacy", reason: "gemini-disabled" };
  }
  if (!parseFlagTrue(input.readEnv(NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV))) {
    return { kind: "legacy", reason: "tools-disabled" };
  }

  const eligibility = evaluateConversationCorePilotEligibility({
    authenticatedActorRef: input.authenticatedActorRef,
    readEnv: input.readEnv,
  });
  if (!eligibility.eligible) {
    return { kind: "legacy", reason: eligibility.reason };
  }

  const classified = classifyPilotLane(input.userMessage);
  if (
    classified.kind === "classified" &&
    classified.policyLane === "authoritative-data" &&
    classified.allowedToolNames.length === 1
  ) {
    const toolName = classified.allowedToolNames[0];
    if (toolName === "marketplace.search" || toolName === "inventory.fetch") {
      if (CORE_ROUTE_TOOLS.has(toolName)) {
        return {
          kind: "conversation-core",
          toolName,
          reasonCode: classified.reasonCode,
        };
      }
    }
  }

  return { kind: "legacy", reason: classified.reasonCode };
}

export function mintChatUserVisibleConversationTurnInput(input: {
  readonly authenticatedActorRef: string;
  readonly authRole: AuthRole;
  readonly userMessage: string;
  readonly attachedImageCount?: number;
  readonly receivedAtMs: number;
}): ConversationTurnInput | null {
  const conversationId = `chat-v2:${input.authenticatedActorRef.trim()}`;
  const messageId = `chat-v2-turn-${input.receivedAtMs}`;
  const requestCandidate: Record<string, unknown> = {
    conversationId,
    messageId,
    userMessage: input.userMessage,
  };
  if (
    input.attachedImageCount !== undefined &&
    Number.isInteger(input.attachedImageCount) &&
    input.attachedImageCount >= 0 &&
    input.attachedImageCount <= CONVERSATION_CORE_MAX_ATTACHED_IMAGE_COUNT
  ) {
    requestCandidate.attachedImageCount = input.attachedImageCount;
  }

  const requestValidation = validateConversationTurnRequest(requestCandidate);
  if (!requestValidation.ok) {
    return null;
  }

  const contextCandidate = {
    conversationId,
    actorScope: {
      kind: "authenticated" as const,
      actorRef: input.authenticatedActorRef,
      role: mapAuthRoleToActorScopeRole(input.authRole),
    },
    conversationOwnership: {
      ownerActorRef: input.authenticatedActorRef,
      bindingVerified: true as const,
    },
    featureFlags: {
      coreEnabled: true,
      geminiEnabled: false,
      toolsEnabled: false,
      workspaceActionsEnabled: false,
    },
    toolAllowlist: [] as const,
    receivedAtMs: input.receivedAtMs,
    policyVersion: CONVERSATION_CORE_POLICY_VERSION,
  };
  const contextValidation = validateConversationCoreExecutionContext(contextCandidate);
  if (!contextValidation.ok) {
    return null;
  }

  return {
    request: requestValidation.value,
    context: contextValidation.value,
  };
}

function dedupePreserveOrder(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of ids) {
    const normalized = id.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

export function listingIdsFromConversationCoreResult(
  result: ConversationCoreResult
): string[] {
  const fromWorkspace: string[] = [];
  for (const action of result.workspaceActions) {
    if (action.actionType === "show-vehicle-results") {
      fromWorkspace.push(...action.payload.listingIds);
    }
  }
  if (fromWorkspace.length > 0) {
    return dedupePreserveOrder(fromWorkspace);
  }
  const fromRefs: string[] = [];
  for (const ref of result.groundedFactRefs) {
    if (ref.kind === "listing") {
      fromRefs.push(ref.id);
    }
  }
  return dedupePreserveOrder(fromRefs);
}

function mapListingIdsToCarCards(
  listingIds: readonly string[],
  inventory: readonly ChatInventoryCar[]
): ChatCarCardData[] | null {
  const byId = new Map<string, ChatInventoryCar>();
  for (const car of inventory) {
    const id = String(car.id ?? "").trim();
    if (id && !byId.has(id)) {
      byId.set(id, car);
    }
  }
  const cards: ChatCarCardData[] = [];
  for (const listingId of listingIds) {
    const record = byId.get(listingId);
    if (!record) {
      return null;
    }
    cards.push(summaryToChatCarCardData(toChatCarSummary(record), "exact"));
  }
  return cards;
}

function isSafelyCompletedCoreResult(
  result: ConversationCoreResult
): boolean {
  if (result.errorState) {
    return false;
  }
  if (result.safetyOutcome !== "pass") {
    return false;
  }
  if (result.validatorOutcome !== "pass") {
    return false;
  }
  const text = result.assistantText.trim();
  if (!text || containsHtmlOrScript(text)) {
    return false;
  }
  return true;
}

export function mapConversationCoreResultToUserVisibleEnvelope(input: {
  readonly coreResult: ConversationCoreOrchestratorResult;
  readonly inventory: readonly ChatInventoryCar[];
}): ChatUserVisibleConversationCoreMappedResult {
  if (input.coreResult.route !== "completed") {
    return freezeUnavailable();
  }
  const result = input.coreResult.result;
  if (!isSafelyCompletedCoreResult(result)) {
    return freezeUnavailable();
  }
  const listingIds = listingIdsFromConversationCoreResult(result);
  const carCards = mapListingIdsToCarCards(listingIds, input.inventory);
  if (carCards === null) {
    return freezeUnavailable();
  }
  return {
    kind: "completed",
    userVisibleText: result.assistantText.trim(),
    carCards,
  };
}

export async function runDefaultChatUserVisibleConversationCore(
  turn: ConversationTurnInput,
  deps: { readonly readEnv: (key: string) => string | undefined }
): Promise<ConversationCoreOrchestratorResult> {
  const activation = resolveConversationCoreLiveServerActivation({
    readEnv: deps.readEnv,
  });
  return runConversationCoreOrchestrator(turn.request, turn.context, activation);
}

export async function executeChatUserVisibleConversationCoreTurn(input: {
  readonly authenticatedActorRef: string;
  readonly authRole: AuthRole;
  readonly userMessage: string;
  readonly attachedImageCount?: number;
  readonly inventory: readonly ChatInventoryCar[];
  readonly readEnv: (key: string) => string | undefined;
  readonly receivedAtMs: number;
  readonly runConversationCore?: ChatUserVisibleConversationCoreRunner;
}): Promise<ChatUserVisibleConversationCoreMappedResult> {
  const turn = mintChatUserVisibleConversationTurnInput({
    authenticatedActorRef: input.authenticatedActorRef,
    authRole: input.authRole,
    userMessage: input.userMessage,
    attachedImageCount: input.attachedImageCount,
    receivedAtMs: input.receivedAtMs,
  });
  if (!turn) {
    return freezeUnavailable();
  }

  const runCore =
    input.runConversationCore ??
    ((coreInput: ConversationTurnInput) =>
      runDefaultChatUserVisibleConversationCore(coreInput, { readEnv: input.readEnv }));

  try {
    const coreResult = await runCore(turn);
    return mapConversationCoreResultToUserVisibleEnvelope({
      coreResult,
      inventory: input.inventory,
    });
  } catch {
    return freezeUnavailable();
  }
}
