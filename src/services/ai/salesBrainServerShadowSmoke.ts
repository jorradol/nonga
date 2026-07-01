/**
 * v6.1B — Admin-gated server-side shadow smoke (user-visible legacy).
 * v6.1H — optional admin-only real Gemini when NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED=true (SS-01 only).
 */
import type { Express, Request, Response } from "express";
import {
  buildAdminShadowSmokeDiag,
  extractRedactedGeminiApiError,
  logAdminShadowSmokeGate,
} from "./salesBrainAdminShadowDiagnostics";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  ADMIN_SHADOW_GEMINI_REQUEST_SHAPE,
  resolveAdminShadowRealProviderAttempt,
  invokeAdminShadowRealProvider,
  isAdminShadowRealProviderCaseAllowed,
  type AdminShadowGeminiCallResult,
} from "./salesBrainAdminShadowRealProvider";
import { isGlobalChatShadowEmergencyKillSwitchActive } from "./salesBrainChatShadowRealProvider";
import { defaultEnvReader } from "./salesBrainRealProvider";
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
    provider: "mock" | "gemini";
    routedVia: string;
    selectedCapabilities: string[];
    safetyDecision: string;
    paramsHash: string;
    comparisonNotes: string;
    providerModelId?: string;
    providerRequestIdHash?: string;
  };
  adminShadowRealProviderAttempted?: boolean;
  adminShadowRealProviderFallbackReason?: string;
  /** v6.1H — redacted gate reason only; no env/secret values */
  realProviderGateReason?: string;
}

export interface AdminShadowSmokeHandlerContext {
  providerNetwork: boolean;
  realProviderResult?: AdminShadowGeminiCallResult;
  realProviderFallbackReason?: string;
  realProviderGateReason?: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}

/** Admin/debug payload — redacted, no env/secret values */
export function buildRedactedAdminShadowSmokePayload(
  result: SalesBrainShadowRuntimeResult & { caseId: SalesBrainAdminShadowSmokeCaseId },
  context: AdminShadowSmokeHandlerContext = { providerNetwork: false }
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

  const realProvider = context.realProviderResult;
  const usedGemini = context.providerNetwork && realProvider !== undefined;

  if (result.shadowDebugResult || usedGemini) {
    const comparisonNotes = usedGemini
      ? redactPiiForSalesBrainLog(
          `admin-shadow real provider output (redacted): ${realProvider.redactedProviderOutput}`
        )
      : redactPiiForSalesBrainLog(result.shadowDebugResult?.comparisonNotes ?? "");

    payload.shadowDebugResult = {
      salesBrainIntent: result.shadowDebugResult?.salesBrainIntent ?? "admin.shadow.real_provider",
      legacyRouteLabel:
        result.shadowDebugResult?.legacyRouteLabel ?? "legacy orchestrator — unchanged",
      routesAlign: result.shadowDebugResult?.routesAlign ?? false,
      provider: usedGemini ? "gemini" : "mock",
      routedVia: usedGemini
        ? "admin.shadow.real_provider"
        : (result.shadowDebugResult?.routedVia ?? "mock"),
      selectedCapabilities:
        result.shadowDebugResult?.selectedCapabilities ?? ["admin.shadow.smoke"],
      safetyDecision: usedGemini
        ? "admin_only_real_provider_redacted"
        : (result.shadowDebugResult?.safetyDecision ?? "mock_only"),
      paramsHash: usedGemini
        ? realProvider.requestIdHash
        : (result.shadowDebugResult?.paramsHash ?? ""),
      comparisonNotes,
      providerModelId: usedGemini ? realProvider.modelId : undefined,
      providerRequestIdHash: usedGemini ? realProvider.requestIdHash : undefined,
    };
  }

  if (
    context.realProviderFallbackReason ||
    context.realProviderGateReason === "real_provider_call_failed"
  ) {
    payload.adminShadowRealProviderAttempted = true;
    payload.adminShadowRealProviderFallbackReason = context.realProviderFallbackReason;
  }

  if (context.realProviderGateReason) {
    payload.realProviderGateReason = context.realProviderGateReason;
  } else if (!context.providerNetwork) {
    payload.realProviderGateReason = "unknown_mock_fallback";
  }

  return payload;
}

export async function resolveAdminShadowSmokeHandlerContext(input: {
  caseId: SalesBrainAdminShadowSmokeCaseId;
  evaluation: SalesBrainShadowRuntimeResult & { caseId: SalesBrainAdminShadowSmokeCaseId };
  readEnv?: (key: string) => string | undefined;
}): Promise<AdminShadowSmokeHandlerContext> {
  const readEnv = input.readEnv ?? defaultEnvReader;
  const definition = SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES[input.caseId];
  const environment = definition.environment ?? "staging";

  if (environment === "production") {
    return {
      providerNetwork: false,
      realProviderGateReason: "production_environment",
    };
  }

  if (!isAdminShadowRealProviderCaseAllowed(input.caseId)) {
    return {
      providerNetwork: false,
      realProviderGateReason: "case_not_allowed_for_real_provider",
    };
  }

  const attempt = resolveAdminShadowRealProviderAttempt({
    caseId: input.caseId,
    environment,
    readEnv,
  });
  if (!attempt.allowed) {
    return {
      providerNetwork: false,
      realProviderGateReason: attempt.blockedReason,
    };
  }

  if (isGlobalChatShadowEmergencyKillSwitchActive(readEnv)) {
    return {
      providerNetwork: false,
      realProviderGateReason: "emergency_kill_switch",
      realProviderFallbackReason: "emergency_kill_switch",
    };
  }

  if (!input.evaluation.runtimeFlags.shadowEvaluationAllowed) {
    return {
      providerNetwork: false,
      realProviderGateReason: "shadow_evaluation_not_allowed",
      realProviderFallbackReason: "shadow_evaluation_not_allowed",
    };
  }

  try {
    const realProviderResult = await invokeAdminShadowRealProvider({
      userMessage: definition.userMessage,
      userRole: definition.userRole,
      readEnv,
    });
    return {
      providerNetwork: true,
      realProviderResult,
      realProviderGateReason: "real_provider_call_ok",
    };
  } catch (error) {
    const redacted = extractRedactedGeminiApiError(error);
    return {
      providerNetwork: false,
      realProviderGateReason: "real_provider_call_failed",
      realProviderFallbackReason: redacted.fallbackReason,
      geminiHttpStatus: redacted.geminiHttpStatus,
      geminiErrorCode: redacted.geminiErrorCode,
    };
  }
}

export async function handleAdminSalesBrainShadowSmokePost(
  req: Request,
  res: Response
): Promise<void> {
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
  const definition = SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES[caseId];
  const environment = definition.environment ?? "staging";
  const handlerContext = await resolveAdminShadowSmokeHandlerContext({
    caseId,
    evaluation,
  });
  const data = buildRedactedAdminShadowSmokePayload(evaluation, handlerContext);
  const realProviderGateReason =
    handlerContext.realProviderGateReason ??
    (handlerContext.providerNetwork ? "real_provider_call_ok" : "unknown_mock_fallback");
  const adminShadowDiag = buildAdminShadowSmokeDiag({
    caseId,
    environment,
    shadowEvaluationAllowed: evaluation.runtimeFlags.shadowEvaluationAllowed,
    geminiModel: ADMIN_SHADOW_GEMINI_MODEL,
    geminiRequestShape: ADMIN_SHADOW_GEMINI_REQUEST_SHAPE,
    geminiHttpStatus: handlerContext.geminiHttpStatus,
    geminiErrorCode: handlerContext.geminiErrorCode,
  });

  logAdminShadowSmokeGate({
    caseId,
    providerNetwork: handlerContext.providerNetwork,
    realProviderGateReason,
    adminShadowRealProviderFallbackReason: handlerContext.realProviderFallbackReason,
    diag: adminShadowDiag,
  });

  res.json({
    success: true,
    readOnly: true,
    userVisibleOff: true,
    /** Default when flag off: providerNetwork: false */
    providerNetwork: handlerContext.providerNetwork,
    realProviderGateReason,
    adminShadowRealProviderFallbackReason: handlerContext.realProviderFallbackReason,
    adminShadowDiag,
    data,
  });
}

export function registerSalesBrainAdminShadowSmokeRoutes(app: Express): void {
  app.post(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE, handleAdminSalesBrainShadowSmokePost);
}
