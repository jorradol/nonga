/**
 * v5.6E.2 / v5.6F — Optional AI fallback for buyer lead text (default OFF, no API cost).
 */

import type { BuyerLeadDraftFields } from "./buyerLeadCaptureFlow";
import type { BuyerLeadTextParseResult } from "./buyerLeadTextParser";
import { trySmartSalesAiBuyerLeadParse } from "./smartSalesAiHooks";
import {
  BUYER_LEAD_AI_TEXT_PARSE_ENABLED,
  isBuyerLeadAiTextParseEnabled,
  SMART_SALES_AI_PARSE_CONFIDENCE_THRESHOLD,
} from "./smartSalesMode";

export { BUYER_LEAD_AI_TEXT_PARSE_ENABLED };

export function shouldAttemptAiBuyerLeadParse(
  parse: Pick<BuyerLeadTextParseResult, "confidence" | "missingFields">
): boolean {
  return (
    isBuyerLeadAiTextParseEnabled() &&
    parse.confidence < SMART_SALES_AI_PARSE_CONFIDENCE_THRESHOLD &&
    parse.missingFields.length > 0
  );
}

/** Future hook: delegates to Smart Sales when flags allow; otherwise null (no API). */
export async function tryAiParseBuyerLeadText(params: {
  message: string;
  existingFields: BuyerLeadDraftFields;
}): Promise<Partial<BuyerLeadTextParseResult> | null> {
  if (!isBuyerLeadAiTextParseEnabled()) return null;
  return trySmartSalesAiBuyerLeadParse(params);
}

export function describeBuyerLeadAiParseGuardrails(): string {
  return [
    "AI fallback is OFF by default (BUYER_LEAD_AI_TEXT_PARSE_ENABLED=false).",
    "Smart Sales requires NONGA_SMART_SALES_MODE=smart_sales plus parse flag.",
    "When enabled: call only if deterministic confidence < 0.75 and fields remain missing.",
    "Output must be structured JSON only; never auto-submit or capture phone in chat.",
  ].join(" ");
}
