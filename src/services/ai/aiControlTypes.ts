/**
 * v5.6J — SuperAdmin AI Control Center types (foundation only).
 */

export type AiControlMode =
  | "off"
  | "economy"
  | "balanced"
  | "smart_sales"
  | "full_ai";

export type AiFlowToggleKey =
  | "buyerChatAdvisor"
  | "buyerLeadCapture"
  | "buyerLeadTextParse"
  | "priceNegotiation"
  | "alternativeCarSuggestion"
  | "sellerCopyAssist"
  | "adminLeadQualityReview";

export type AiFlowToggleMap = Record<AiFlowToggleKey, boolean>;

export interface AiControlConfig {
  mode: AiControlMode;
  flows: AiFlowToggleMap;
  maxTokensPerReply: number;
  maxAiCallsPerSession: number;
  maxAiCallsPerUserPerDay: number;
  allowLeadAiParsing: boolean;
  allowNegotiationAi: boolean;
  allowAlternativeSuggestions: boolean;
  fallbackToTemplate: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export const AI_FLOW_TOGGLE_KEYS: readonly AiFlowToggleKey[] = [
  "buyerChatAdvisor",
  "buyerLeadCapture",
  "buyerLeadTextParse",
  "priceNegotiation",
  "alternativeCarSuggestion",
  "sellerCopyAssist",
  "adminLeadQualityReview",
] as const;

/** Flows that may invoke paid AI when explicitly enabled (staging pilot). */
export const SMART_SALES_AI_FLOW_KEYS: readonly AiFlowToggleKey[] = [
  "buyerLeadTextParse",
  "priceNegotiation",
  "adminLeadQualityReview",
] as const;
