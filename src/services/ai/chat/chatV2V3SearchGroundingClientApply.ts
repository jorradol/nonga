/**
 * WP-NVB-03B — Pure Client apply seam for authenticated Search Grounding.
 * Server-owned marker is the only selected-Search signal.
 * Text and Vehicle Cards are adopted atomically. Never merge with local Legacy cards.
 */
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../chat-v3/chatV3ConversationContracts";
import type { ChatCarCardData } from "../../../types";

export const CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN =
  "chat-v3-search-grounded" as const;

export const CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN_STATUSES = [
  "success",
  "failed-closed",
] as const;

export type ChatV3SearchGroundedConversationBrain =
  typeof CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN;

export type ChatV3SearchGroundedConversationBrainStatus =
  (typeof CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN_STATUSES)[number];

export interface ParsedChatV3SearchGroundedConversationBrain {
  readonly conversationBrain: ChatV3SearchGroundedConversationBrain;
  readonly conversationBrainStatus: ChatV3SearchGroundedConversationBrainStatus;
}

export type ChatV2V3SearchGroundingHopStatus =
  | "not-attempted"
  | "success"
  | "failure";

export interface ChatV2V3SearchGroundingClientApplyInput {
  readonly searchHopAttempted: boolean;
  readonly hopStatus: ChatV2V3SearchGroundingHopStatus;
  readonly userVisibleText?: string;
  readonly carCards?: unknown;
  readonly hasMoreCars?: unknown;
  readonly conversationBrain?: unknown;
  readonly conversationBrainStatus?: unknown;
  readonly localOrchestrated?: {
    readonly text?: string;
    readonly carCards?: ChatCarCardData[];
  } | null;
}

export type ChatV2V3SearchGroundingClientApplyResult =
  | {
      readonly action: "adopt-search";
      readonly text: string;
      readonly carCards: ChatCarCardData[];
      readonly hasMoreCars: boolean;
      readonly skipGemini: true;
      readonly stopClientGemini: true;
      readonly stopMockFallback: true;
      readonly stopLegacyMerge: true;
    }
  | {
      readonly action: "fail-closed";
      readonly text: string;
      readonly carCards: [];
      readonly hasMoreCars: false;
      readonly skipGemini: true;
      readonly stopClientGemini: true;
      readonly stopMockFallback: true;
      readonly stopLegacyMerge: true;
    }
  | {
      readonly action: "preserve-existing";
    };

export function parseServerOwnedChatV3SearchGroundedConversationBrain(
  input: unknown
): ParsedChatV3SearchGroundedConversationBrain | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (record.conversationBrain !== CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN) {
    return null;
  }
  if (
    record.conversationBrainStatus !== "success" &&
    record.conversationBrainStatus !== "failed-closed"
  ) {
    return null;
  }
  return {
    conversationBrain: CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN,
    conversationBrainStatus: record.conversationBrainStatus,
  };
}

function asCarCards(raw: unknown): ChatCarCardData[] | null {
  if (!Array.isArray(raw)) return null;
  return raw as ChatCarCardData[];
}

function adoptSearch(
  text: string,
  carCards: ChatCarCardData[],
  hasMoreCars: boolean
): Extract<ChatV2V3SearchGroundingClientApplyResult, { action: "adopt-search" }> {
  return {
    action: "adopt-search",
    text,
    carCards,
    hasMoreCars,
    skipGemini: true,
    stopClientGemini: true,
    stopMockFallback: true,
    stopLegacyMerge: true,
  };
}

function failClosed(): Extract<
  ChatV2V3SearchGroundingClientApplyResult,
  { action: "fail-closed" }
> {
  return {
    action: "fail-closed",
    text: CHAT_V3_USER_FACING_UNAVAILABLE,
    carCards: [],
    hasMoreCars: false,
    skipGemini: true,
    stopClientGemini: true,
    stopMockFallback: true,
    stopLegacyMerge: true,
  };
}

/**
 * Adopt Server Search text and cards together. Local Legacy cards are never merged.
 */
export function resolveChatV2V3SearchGroundingClientApply(
  input: ChatV2V3SearchGroundingClientApplyInput
): ChatV2V3SearchGroundingClientApplyResult {
  if (!input.searchHopAttempted) {
    return { action: "preserve-existing" };
  }

  const parsed = parseServerOwnedChatV3SearchGroundedConversationBrain({
    conversationBrain: input.conversationBrain,
    conversationBrainStatus: input.conversationBrainStatus,
  });

  if (!parsed) {
    return { action: "preserve-existing" };
  }

  if (input.hopStatus === "failure") {
    return failClosed();
  }

  const cards = asCarCards(input.carCards);
  if (cards == null) {
    return failClosed();
  }

  const text = String(input.userVisibleText ?? "").trim();
  if (!text) {
    return failClosed();
  }

  return adoptSearch(text, cards, input.hasMoreCars === true);
}
