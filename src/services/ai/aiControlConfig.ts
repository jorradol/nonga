/**
 * v5.6J — Resolve SuperAdmin AI control config (defaults safe; no API I/O).
 */

import type {
  AiControlConfig,
  AiControlMode,
  AiFlowToggleKey,
  AiFlowToggleMap,
} from "./aiControlTypes";
import { AI_FLOW_TOGGLE_KEYS } from "./aiControlTypes";

export const NONGA_AI_CONTROL_MODE_ENV = "NONGA_AI_CONTROL_MODE";

const DEFAULT_MAX_TOKENS_PER_REPLY = 512;
const DEFAULT_MAX_CALLS_PER_SESSION = 6;
const DEFAULT_MAX_CALLS_PER_USER_PER_DAY = 24;

function allFlowsOff(): AiFlowToggleMap {
  return Object.fromEntries(
    AI_FLOW_TOGGLE_KEYS.map((k) => [k, false])
  ) as AiFlowToggleMap;
}

function flowsForSmartSalesPilot(): AiFlowToggleMap {
  const base = allFlowsOff();
  return {
    ...base,
    buyerLeadTextParse: true,
    priceNegotiation: true,
    adminLeadQualityReview: true,
  };
}

export function getDefaultAiControlConfig(): AiControlConfig {
  const now = new Date().toISOString();
  return {
    mode: "economy",
    flows: allFlowsOff(),
    maxTokensPerReply: DEFAULT_MAX_TOKENS_PER_REPLY,
    maxAiCallsPerSession: DEFAULT_MAX_CALLS_PER_SESSION,
    maxAiCallsPerUserPerDay: DEFAULT_MAX_CALLS_PER_USER_PER_DAY,
    allowLeadAiParsing: false,
    allowNegotiationAi: false,
    allowAlternativeSuggestions: false,
    fallbackToTemplate: true,
    updatedBy: "system-default",
    updatedAt: now,
  };
}

function normalizeMode(raw: string | undefined): AiControlMode {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "off") return "off";
  if (v === "balanced") return "balanced";
  if (v === "smart_sales" || v === "smart-sales") return "smart_sales";
  if (v === "full_ai" || v === "full-ai") return "full_ai";
  return "economy";
}

export function resolveAiControlConfig(
  env: Partial<NodeJS.ProcessEnv> = process.env
): AiControlConfig {
  const base = getDefaultAiControlConfig();
  const mode = normalizeMode(env[NONGA_AI_CONTROL_MODE_ENV]);

  if (mode === "off") {
    return { ...base, mode, flows: allFlowsOff(), fallbackToTemplate: true };
  }

  if (mode === "smart_sales") {
    return {
      ...base,
      mode,
      flows: flowsForSmartSalesPilot(),
      allowLeadAiParsing: true,
      allowNegotiationAi: true,
      fallbackToTemplate: true,
    };
  }

  if (mode === "balanced") {
    return {
      ...base,
      mode,
      allowAlternativeSuggestions: true,
      fallbackToTemplate: true,
    };
  }

  if (mode === "full_ai") {
    return {
      ...base,
      mode,
      flows: Object.fromEntries(
        AI_FLOW_TOGGLE_KEYS.map((k) => [k, true])
      ) as AiFlowToggleMap,
      allowLeadAiParsing: true,
      allowNegotiationAi: true,
      allowAlternativeSuggestions: true,
      fallbackToTemplate: false,
    };
  }

  return base;
}

export function isFullAiControlMode(config: AiControlConfig): boolean {
  return config.mode === "full_ai";
}

export function canUseSmartSalesAi(
  flow: AiFlowToggleKey,
  config: AiControlConfig = resolveAiControlConfig()
): boolean {
  if (config.mode === "off" || config.mode === "economy") {
    return false;
  }
  if (config.mode === "full_ai") {
    return false;
  }
  if (!config.flows[flow]) {
    return false;
  }
  if (flow === "buyerLeadTextParse" && !config.allowLeadAiParsing) {
    return false;
  }
  if (flow === "priceNegotiation" && !config.allowNegotiationAi) {
    return false;
  }
  if (flow === "alternativeCarSuggestion" && !config.allowAlternativeSuggestions) {
    return false;
  }
  return config.mode === "smart_sales" || config.mode === "balanced";
}

export type AiControlFlowSafety =
  | { ok: true }
  | { ok: false; reason: string };

const BLOCKED_FLOWS_ALWAYS_TEMPLATE: readonly AiFlowToggleKey[] = [
  "buyerLeadCapture",
];

export function assertAiControlSafeForFlow(
  flow: AiFlowToggleKey,
  config: AiControlConfig = resolveAiControlConfig()
): AiControlFlowSafety {
  if (BLOCKED_FLOWS_ALWAYS_TEMPLATE.includes(flow)) {
    return {
      ok: false,
      reason: "flow_requires_template_only",
    };
  }
  if (config.mode === "full_ai") {
    return { ok: false, reason: "full_ai_not_enabled_in_v56j" };
  }
  if (!canUseSmartSalesAi(flow, config)) {
    return { ok: false, reason: "ai_flow_disabled_or_economy" };
  }
  return { ok: true };
}

export function shouldFallbackToTemplate(
  config: AiControlConfig = resolveAiControlConfig()
): boolean {
  return config.fallbackToTemplate !== false;
}

export function getAiControlModeLabel(mode: AiControlMode): string {
  switch (mode) {
    case "off":
      return "ปิด AI เพิ่มเติม (เทมเพลตอย่างเดียว)";
    case "economy":
      return "ประหยัด — เทมเพลต/พาร์เซอร์ก่อน (ค่าเริ่มต้น)";
    case "balanced":
      return "สมดุล — จำกัดบาง flow (ยังไม่เปิด API จริง)";
    case "smart_sales":
      return "Smart Sales — เฉพาะ flow รายได้ (ต้องเปิด env + review)";
    case "full_ai":
      return "Full AI — ห้ามเป็น default (อนาคต)";
    default:
      return mode;
  }
}
