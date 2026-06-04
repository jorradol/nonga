/**
 * v5.6F — Smart Sales AI entry points (stubs; no Gemini/API in this round).
 */

import type { BuyerLeadDraftFields } from "./buyerLeadCaptureFlow";
import type { BuyerLeadTextParseResult } from "./buyerLeadTextParser";
import type { LeadQualityScoreResult } from "./leadQualityScore";
import type { BuyerLead } from "./leadTypes";
import {
  guardSmartSalesAiInput,
  guardSmartSalesAiStructuredOutput,
} from "./smartSalesAiGuards";
import {
  isSmartSalesAiEnabled,
  SMART_SALES_AI_PARSE_CONFIDENCE_THRESHOLD,
} from "./smartSalesMode";

export function shouldInvokeSmartSalesAiParse(
  parse: Pick<BuyerLeadTextParseResult, "confidence" | "missingFields">
): boolean {
  return (
    isSmartSalesAiEnabled() &&
    parse.confidence < SMART_SALES_AI_PARSE_CONFIDENCE_THRESHOLD &&
    parse.missingFields.length > 0
  );
}

/**
 * Future: structured JSON extraction. Returns null when flags off or guards fail.
 */
export async function trySmartSalesAiBuyerLeadParse(params: {
  message: string;
  existingFields: BuyerLeadDraftFields;
}): Promise<Partial<BuyerLeadTextParseResult> | null> {
  if (!isSmartSalesAiEnabled()) return null;
  const guard = guardSmartSalesAiInput(params.message);
  if (!guard.ok) return null;
  return null;
}

export async function trySmartSalesLeadQualityNarrative(_params: {
  lead: BuyerLead;
  score: LeadQualityScoreResult;
}): Promise<string | null> {
  if (!isSmartSalesAiEnabled()) return null;
  return null;
}

export async function trySmartSalesNegotiationHint(_params: {
  offeredPrice: number;
  listedPrice: number;
  floor: number;
}): Promise<string | null> {
  if (!isSmartSalesAiEnabled()) return null;
  return null;
}

export function validateSmartSalesAiPayloadBeforeUse(
  payload: Record<string, unknown>
): boolean {
  return guardSmartSalesAiStructuredOutput({
    fields: payload.fields as Record<string, unknown> | undefined,
    narrative: payload.narrative as string | undefined,
  }).ok;
}
