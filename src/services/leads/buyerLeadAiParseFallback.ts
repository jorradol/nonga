/**
 * v5.6E.2 — Optional AI fallback for buyer lead text (default OFF, no API cost).
 */

import type { BuyerLeadDraftFields } from "./buyerLeadCaptureFlow";
import type { BuyerLeadTextParseResult } from "./buyerLeadTextParser";

/** Staging default: deterministic parser only. Set true only after explicit review. */
export const BUYER_LEAD_AI_TEXT_PARSE_ENABLED = false;

const AI_PARSE_CONFIDENCE_THRESHOLD = 0.75;

export function shouldAttemptAiBuyerLeadParse(
  parse: Pick<BuyerLeadTextParseResult, "confidence" | "missingFields">
): boolean {
  return (
    BUYER_LEAD_AI_TEXT_PARSE_ENABLED &&
    parse.confidence < AI_PARSE_CONFIDENCE_THRESHOLD &&
    parse.missingFields.length > 0
  );
}

/**
 * Future hook: structured Gemini extraction when enabled.
 * Currently returns null — no Gemini/API calls in v5.6E.2.
 */
export async function tryAiParseBuyerLeadText(_params: {
  message: string;
  existingFields: BuyerLeadDraftFields;
}): Promise<Partial<BuyerLeadTextParseResult> | null> {
  if (!BUYER_LEAD_AI_TEXT_PARSE_ENABLED) return null;
  return null;
}

export function describeBuyerLeadAiParseGuardrails(): string {
  return [
    "AI fallback is OFF by default (BUYER_LEAD_AI_TEXT_PARSE_ENABLED=false).",
    "When enabled in future: call only if deterministic confidence < 0.75 and fields remain missing.",
    "Output must be structured JSON only; never auto-submit or capture phone in chat.",
  ].join(" ");
}
