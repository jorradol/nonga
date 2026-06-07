/**
 * v6.1B — Admin-gated server-side shadow smoke (mock evaluation only — user-visible legacy).
 * No paid provider network, no secret values in responses, synthetic cases only.
 */
import type { Express, Request, Response } from "express";
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import {
  evaluateSalesBrainShadowRuntime,
  summarizeShadowRuntimeFlags,
  type SalesBrainShadowRuntimeResult,
} from "./salesBrainShadowRuntime";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  type SalesBrainRuntimeEnvironment,
} from "./salesBrainRuntimeFlags";
import type {
  SalesBrainListingContext,
  SalesBrainUserRole,
} from "./salesBrainTypes";

export const SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE = "/api/admin/sales-brain-shadow-smoke";

const LEGACY_BUYER_SEARCH = "legacy orchestrator — buyer search results unchanged";
const LEGACY_LISTING = "legacy orchestrator — mock listing advisor text unchanged";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const LEGACY_DEALER_INVENTORY = "legacy orchestrator — dealer inventory count template unchanged";
const LEGACY_GENERIC = "legacy orchestrator — generic fallback unchanged";

const MOCK_LISTING: SalesBrainListingContext = {
  listingId: "mock-listing-001",
  brand: "Toyota",
  model: "Corolla",
  price: 450000,
  fieldsPresent: ["brand", "model", "year"],
};

export interface SalesBrainAdminShadowSmokeCaseDefinition {
  userMessage: string;
  userRole: SalesBrainUserRole;
  legacyUserVisibleResponse: string;
  listingContext?: SalesBrainListingContext;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
}

export const SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES = {
  "SS-01": {
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_BUYER_SEARCH,
    environment: "staging",
  },
  "SS-02": {
    userMessage: "รายละเอียดคันนี้หน่อย",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_LISTING,
    listingContext: MOCK_LISTING,
    environment: "staging",
  },
  "SS-03": {
    userMessage: "เริ่มใหม่",
    userRole: "seller",
    legacyUserVisibleResponse: LEGACY_START_OVER,
    environment: "staging",
  },
  "SS-04": {
    userMessage: "มีรถกี่คันในระบบ",
    userRole: "dealer",
    legacyUserVisibleResponse: LEGACY_DEALER_INVENTORY,
    environment: "staging",
  },
  "SS-05": {
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_GENERIC,
    environment: "staging",
    env: {
      [NONGA_AI_PROVIDER_ENV]: "gemini",
      [NONGA_AI_MODE_ENV]: "high",
      [NONGA_AI_FIRST_ENABLED_ENV]: "true",
      [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
      [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "false",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
      [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
      [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
    },
  },
  "SS-06": {
    userMessage: "เริ่มใหม่",
    userRole: "seller",
    legacyUserVisibleResponse: LEGACY_START_OVER,
    environment: "staging",
    env: {
      [NONGA_AI_PROVIDER_ENV]: "gemini",
      [NONGA_AI_MODE_ENV]: "high",
      [NONGA_AI_FIRST_ENABLED_ENV]: "true",
      [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
      [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "false",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
      [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "",
      [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
    },
  },
  "SS-07": {
    userMessage: "เริ่มใหม่",
    userRole: "seller",
    legacyUserVisibleResponse: LEGACY_START_OVER,
    environment: "staging",
    env: {
      [NONGA_AI_PROVIDER_ENV]: "gemini",
      [NONGA_AI_MODE_ENV]: "high",
      [NONGA_AI_FIRST_ENABLED_ENV]: "true",
      [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
      [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
      [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
      [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
    },
  },
  "SS-08": {
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_BUYER_SEARCH,
    environment: "production",
    env: {
      [NONGA_AI_PROVIDER_ENV]: "gemini",
      [NONGA_AI_MODE_ENV]: "high",
      [NONGA_AI_FIRST_ENABLED_ENV]: "true",
      [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
      [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "false",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
      [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
      [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
    },
  },
} as const satisfies Record<string, SalesBrainAdminShadowSmokeCaseDefinition>;

export type SalesBrainAdminShadowSmokeCaseId = keyof typeof SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES;

export function stagingStyleShadowEnv(
  overrides: Record<string, string> = {}
): Record<string, string> {
  return {
    [NONGA_AI_PROVIDER_ENV]: "gemini",
    [NONGA_AI_MODE_ENV]: "high",
    [NONGA_AI_FIRST_ENABLED_ENV]: "true",
    [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
    [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "false",
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
    [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
    [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
    ...overrides,
  };
}

function resolveCaseEnv(
  definition: SalesBrainAdminShadowSmokeCaseDefinition
): Record<string, string | undefined> {
  if (definition.env) {
    return definition.env;
  }
  return stagingStyleShadowEnv();
}

export function isSalesBrainAdminShadowSmokeCaseId(
  caseId: string
): caseId is SalesBrainAdminShadowSmokeCaseId {
  return Object.prototype.hasOwnProperty.call(SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES, caseId);
}

export function runSalesBrainAdminShadowSmoke(input: {
  caseId: SalesBrainAdminShadowSmokeCaseId;
}): SalesBrainShadowRuntimeResult & { caseId: SalesBrainAdminShadowSmokeCaseId } {
  const definition = SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES[input.caseId];
  const result = evaluateSalesBrainShadowRuntime({
    userMessage: definition.userMessage,
    userRole: definition.userRole,
    listingContext: "listingContext" in definition ? definition.listingContext : undefined,
    legacyUserVisibleResponse: definition.legacyUserVisibleResponse,
    environment: definition.environment ?? "staging",
    env: resolveCaseEnv(definition),
  });
  return { caseId: input.caseId, ...result };
}

export interface RedactedAdminShadowSmokePayload {
  caseId: SalesBrainAdminShadowSmokeCaseId;
  shadowModeActive: boolean;
  skippedReason?: string;
  userVisibleResponse: string;
  userVisibleBlockedReason?: string;
  runtimeFlagsSummary: string;
  shadowEvaluationAllowed: boolean;
  enablementBlockedReason?: string;
  shadowDebugResult?: {
    salesBrainIntent: string;
    legacyRouteLabel: string;
    routesAlign: boolean;
    provider: "mock";
    routedVia: string;
    selectedCapabilities: string[];
    safetyDecision: string;
    paramsHash: string;
    comparisonNotes: string;
  };
}

/** Admin/debug payload — redacted, no env/secret values, mock provider metadata only */
export function buildRedactedAdminShadowSmokePayload(
  result: SalesBrainShadowRuntimeResult & { caseId: SalesBrainAdminShadowSmokeCaseId }
): RedactedAdminShadowSmokePayload {
  const payload: RedactedAdminShadowSmokePayload = {
    caseId: result.caseId,
    shadowModeActive: result.shadowModeActive,
    skippedReason: result.skippedReason,
    userVisibleResponse: result.userVisibleResponse,
    userVisibleBlockedReason: result.userVisibleBlockedReason,
    runtimeFlagsSummary: summarizeShadowRuntimeFlags(result.runtimeFlags),
    shadowEvaluationAllowed: result.runtimeFlags.shadowEvaluationAllowed,
    enablementBlockedReason: result.runtimeFlags.enablementBlockedReason,
  };

  if (result.shadowDebugResult) {
    payload.shadowDebugResult = {
      salesBrainIntent: result.shadowDebugResult.salesBrainIntent,
      legacyRouteLabel: result.shadowDebugResult.legacyRouteLabel,
      routesAlign: result.shadowDebugResult.routesAlign,
      provider: "mock",
      routedVia: result.shadowDebugResult.routedVia,
      selectedCapabilities: result.shadowDebugResult.selectedCapabilities,
      safetyDecision: result.shadowDebugResult.safetyDecision,
      paramsHash: result.shadowDebugResult.paramsHash,
      comparisonNotes: redactPiiForSalesBrainLog(result.shadowDebugResult.comparisonNotes),
    };
  }

  return payload;
}

export function handleAdminSalesBrainShadowSmokePost(req: Request, res: Response): void {
  const caseId = String(req.body?.caseId ?? "").trim();
  if (!caseId) {
    res.status(400).json({
      success: false,
      message: "caseId is required — synthetic SS-01..SS-08 only",
    });
    return;
  }

  if (!isSalesBrainAdminShadowSmokeCaseId(caseId)) {
    res.status(400).json({
      success: false,
      message: "unknown caseId — use synthetic SS-01..SS-08 only",
    });
    return;
  }

  const evaluation = runSalesBrainAdminShadowSmoke({ caseId });
  const data = buildRedactedAdminShadowSmokePayload(evaluation);

  res.json({
    success: true,
    readOnly: true,
    userVisibleOff: true,
    providerNetwork: false,
    data,
  });
}

export function registerSalesBrainAdminShadowSmokeRoutes(app: Express): void {
  app.post(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE, handleAdminSalesBrainShadowSmokePost);
}
