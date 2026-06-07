/**
 * v6.0G — Sales Brain shadow mode (parallel evaluation only — not user-visible).
 * Not wired to useChat / chatSearchOrchestrator — mock provider only, no network.
 */
import { createSalesBrainAdapter } from "./salesBrainAdapter";
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import type {
  SalesBrainAdapterInput,
  SalesBrainAdapterRouteVia,
  SalesBrainAiMode,
  SalesBrainFlowContext,
  SalesBrainListingContext,
  SalesBrainUserRole,
} from "./salesBrainTypes";

/** v6.0G default — shadow mode off everywhere until explicitly enabled (non-production) */
export const SALES_BRAIN_SHADOW_MODE_DEFAULT_ENABLED = false;

export type SalesBrainShadowEnvironment = "production" | "staging" | "local";

export interface SalesBrainShadowInput {
  userMessage: string;
  userRole: SalesBrainUserRole;
  flowContext?: SalesBrainFlowContext;
  listingContext?: SalesBrainListingContext;
  /** Response from legacy chat/orchestrator flow — NEVER modified by shadow evaluation */
  legacyUserVisibleResponse: string;
  shadowModeEnabled?: boolean;
  environment?: SalesBrainShadowEnvironment;
  aiMode?: SalesBrainAiMode;
  aiFirstEnabled?: boolean;
  emergencyKillSwitch?: boolean;
}

export interface SalesBrainShadowDebugResult {
  salesBrainIntent: string;
  legacyRouteLabel: string;
  routesAlign: boolean;
  provider: "mock";
  routedVia: SalesBrainAdapterRouteVia;
  selectedCapabilities: string[];
  safetyDecision: string;
  paramsHash: string;
  comparisonNotes: string;
}

export interface SalesBrainShadowEvaluation {
  shadowModeActive: boolean;
  skippedReason?: string;
  /** Always identical to input.legacyUserVisibleResponse */
  userVisibleResponse: string;
  shadowDebugResult?: SalesBrainShadowDebugResult;
}

const LEGACY_INTENT_ALIGNMENT: Record<string, string[]> = {
  "legacy.tryOrchestrateChatReply.buyer_search": ["buyer.search"],
  "legacy.tryOrchestrateChatReply.buyer_finance_negotiate": ["buyer.finance_negotiate"],
  "legacy.tryOrchestrateChatReply.seller_image_draft": ["seller.image_draft"],
  "legacy.tryOrchestrateChatReply.seller_marketing_copy": ["seller.marketing_copy"],
  "legacy.tryOrchestrateChatReply.dealer_import": ["dealer.import"],
  "legacy.tryOrchestrateChatReply.dealer_suggested_reply": ["dealer.suggested_reply"],
  "legacy.tryOrchestrateChatReply.admin_ai_mode": ["admin.ai_control_readonly"],
  "legacy.tryOrchestrateChatReply.admin_revenue_readonly": ["admin.revenue_readonly"],
  "legacy.tryOrchestrateChatReply.fallback": [
    "fallback.orchestrator",
    "fallback.emergency_kill_switch",
    "unknown",
    "blocked.no_go",
  ],
};

/**
 * Production always off; staging/local require explicit shadowModeEnabled=true.
 */
export function resolveSalesBrainShadowModeEnabled(input: {
  shadowModeEnabled?: boolean;
  environment?: SalesBrainShadowEnvironment;
}): boolean {
  if (input.environment === "production") {
    return false;
  }
  if (input.shadowModeEnabled !== true) {
    return SALES_BRAIN_SHADOW_MODE_DEFAULT_ENABLED;
  }
  return true;
}

/** Deterministic legacy route label for comparison — does not invoke orchestrator runtime */
export function inferLegacyRouteLabel(input: SalesBrainShadowInput): string {
  const msg = input.userMessage;
  const role = input.userRole;

  if (role === "buyer" && /งบ|4\s*แสน|มีรถ.*น่า/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.buyer_search";
  }
  if (role === "buyer" && /ผ่อน|ลดได้/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.buyer_finance_negotiate";
  }
  if (role === "seller" && /ลงขายจากรูป|จากรูป/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.seller_image_draft";
  }
  if (role === "seller" && /เขียนโพสต์|โพสต์ขาย/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.seller_marketing_copy";
  }
  if (role === "dealer" && /ไฟล์รถ|เอาเข้า/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.dealer_import";
  }
  if (role === "dealer" && /ตอบลูกค้า/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.dealer_suggested_reply";
  }
  if ((role === "admin" || role === "superadmin") && /AI mode|สถานะ AI/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.admin_ai_mode";
  }
  if ((role === "admin" || role === "superadmin") && /รายได้|revenue/i.test(msg)) {
    return "legacy.tryOrchestrateChatReply.admin_revenue_readonly";
  }
  return "legacy.tryOrchestrateChatReply.fallback";
}

export function compareLegacyVsSalesBrainRoute(
  legacyRouteLabel: string,
  salesBrainIntent: string
): { routesAlign: boolean; comparisonNotes: string } {
  const expected = LEGACY_INTENT_ALIGNMENT[legacyRouteLabel];
  if (!expected) {
    return {
      routesAlign: false,
      comparisonNotes: `unknown legacy label ${legacyRouteLabel}`,
    };
  }
  const routesAlign = expected.includes(salesBrainIntent);
  return {
    routesAlign,
    comparisonNotes: routesAlign
      ? "legacy and sales brain routes align"
      : `legacy=${legacyRouteLabel} salesBrain=${salesBrainIntent}`,
  };
}

function buildAdapterInput(input: SalesBrainShadowInput): SalesBrainAdapterInput {
  return {
    userMessage: input.userMessage,
    userRole: input.userRole,
    flowContext: input.flowContext,
    listingContext: input.listingContext,
    aiMode: input.aiMode ?? "high",
    aiFirstEnabled: input.aiFirstEnabled,
    emergencyKillSwitch: input.emergencyKillSwitch,
    provider: "mock",
  };
}

/**
 * Run parallel Sales Brain shadow evaluation — user-visible response unchanged.
 */
export function evaluateSalesBrainShadowMode(
  input: SalesBrainShadowInput
): SalesBrainShadowEvaluation {
  const userVisibleResponse = input.legacyUserVisibleResponse;
  const active = resolveSalesBrainShadowModeEnabled(input);

  if (!active) {
    const skippedReason =
      input.environment === "production"
        ? "production_shadow_disabled"
        : "shadow_mode_disabled";
    return {
      shadowModeActive: false,
      skippedReason,
      userVisibleResponse,
    };
  }

  const adapter = createSalesBrainAdapter({ provider: "mock" });
  const adapterInput = buildAdapterInput(input);
  const salesBrain = adapter.route(adapterInput);
  const legacyRouteLabel = inferLegacyRouteLabel(input);
  const { routesAlign, comparisonNotes } = compareLegacyVsSalesBrainRoute(
    legacyRouteLabel,
    salesBrain.intent
  );

  const safeNotes = redactPiiForSalesBrainLog(comparisonNotes);

  return {
    shadowModeActive: true,
    userVisibleResponse,
    shadowDebugResult: {
      salesBrainIntent: salesBrain.intent,
      legacyRouteLabel,
      routesAlign,
      provider: "mock",
      routedVia: salesBrain.routedVia,
      selectedCapabilities: salesBrain.selectedCapabilities,
      safetyDecision: salesBrain.safetyDecision,
      paramsHash: salesBrain.logRecord.paramsHash,
      comparisonNotes: safeNotes,
    },
  };
}
