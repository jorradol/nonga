/**
 * v5.6J — Cost/safety guardrails for AI control (pure checks).
 */

import type { AiControlConfig } from "./aiControlTypes";

const CREDIT_RISK_LABEL_PATTERNS = [
  /ติดบูโร/i,
  /บูโร/i,
  /เครดิตบูโร/i,
  /blacklist/i,
];

const BUYER_COMMISSION_PATTERNS = [/ค่าคอม/i, /commission/i, /คอมมิชชั่น/i];

const FORBIDDEN_FRONTEND_SECRET_PATTERNS = [
  /GEMINI_API_KEY/i,
  /AIzaSy[a-zA-Z0-9_-]{20,}/,
];

export function clampAiTokenBudget(
  requested: number,
  config: Pick<AiControlConfig, "maxTokensPerReply">
): number {
  const max = Math.max(64, config.maxTokensPerReply);
  if (!Number.isFinite(requested) || requested < 1) return max;
  return Math.min(Math.floor(requested), max);
}

export function isWithinSessionCallLimit(
  callsSoFar: number,
  config: Pick<AiControlConfig, "maxAiCallsPerSession">
): boolean {
  return callsSoFar < Math.max(0, config.maxAiCallsPerSession);
}

export function isWithinDailyUserCallLimit(
  callsSoFar: number,
  config: Pick<AiControlConfig, "maxAiCallsPerUserPerDay">
): boolean {
  return callsSoFar < Math.max(0, config.maxAiCallsPerUserPerDay);
}

export function containsCreditRiskLabel(text: string): boolean {
  return CREDIT_RISK_LABEL_PATTERNS.some((re) => re.test(text));
}

export function containsBuyerCommissionLanguage(text: string): boolean {
  return BUYER_COMMISSION_PATTERNS.some((re) => re.test(text));
}

/** Strip phone-like sequences before logging AI prompts (foundation). */
export function redactPiiForAiLog(text: string): string {
  return text
    .replace(/\b0[689]\d{8}\b/g, "[phone-redacted]")
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      "[email-redacted]"
    );
}

export function assertNoFrontendApiKeyLeak(sourceText: string): boolean {
  return !FORBIDDEN_FRONTEND_SECRET_PATTERNS.some((re) => re.test(sourceText));
}
