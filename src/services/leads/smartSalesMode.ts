/**
 * v5.6F — Smart Sales Mode tiers and feature flags (defaults OFF, no API cost).
 */

export type SmartSalesModeTier = "economy" | "smart_sales" | "premium_sales_future";

/** Staging default: deterministic parser/templates only. */
export const BUYER_LEAD_AI_TEXT_PARSE_ENABLED = false;

/** Staging default: smart_sales AI hooks disabled. */
export const NONGA_SMART_SALES_MODE: SmartSalesModeTier = "economy";

export const SMART_SALES_AI_MAX_INPUT_CHARS = 2000;

export const SMART_SALES_AI_PARSE_CONFIDENCE_THRESHOLD = 0.75;

export function resolveSmartSalesModeFromEnv(
  env: Partial<NodeJS.ProcessEnv> = process.env
): SmartSalesModeTier {
  const raw = String(env.NONGA_SMART_SALES_MODE ?? "economy").trim().toLowerCase();
  if (raw === "smart_sales" || raw === "smart-sales") return "smart_sales";
  if (raw === "premium_sales_future" || raw === "premium") return "premium_sales_future";
  return "economy";
}

export function isBuyerLeadAiTextParseEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env
): boolean {
  if (env.BUYER_LEAD_AI_TEXT_PARSE_ENABLED === "true") return true;
  if (env.BUYER_LEAD_AI_TEXT_PARSE_ENABLED === "false") return false;
  return BUYER_LEAD_AI_TEXT_PARSE_ENABLED;
}

export function isSmartSalesAiEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env
): boolean {
  return resolveSmartSalesModeFromEnv(env) === "smart_sales" && isBuyerLeadAiTextParseEnabled(env);
}

export function describeSmartSalesModeTiers(): string {
  return [
    "economy: parser/template first; no AI unless explicitly enabled.",
    "smart_sales: AI text only for low-confidence parse, quality summary, polite negotiation hints.",
    "premium_sales_future: documented only; not enabled in v5.6F.",
  ].join(" ");
}
