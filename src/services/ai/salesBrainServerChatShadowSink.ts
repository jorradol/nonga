/**
 * v6.1K — Admin-gated chat-path shadow sink (user-visible legacy unchanged).
 * Synthetic scenario IDs only — mirrors public /chat orchestrator paths; sink-only output.
 */
import type { Express, Request, Response } from "express";
import {
  buildChatShadowSinkDiag,
  logChatShadowSinkGate,
} from "./salesBrainChatShadowSinkDiagnostics";
import { extractRedactedGeminiApiError } from "./salesBrainAdminShadowDiagnostics";
import type { AdminShadowGeminiCallResult } from "./salesBrainAdminShadowRealProvider";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  ADMIN_SHADOW_GEMINI_REQUEST_SHAPE,
  canAttemptChatShadowRealProvider,
  invokeChatShadowRealProvider,
  isChatShadowRealProviderScenarioAllowed,
} from "./salesBrainChatShadowRealProvider";
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
import type { SalesBrainShadowChatPathSource } from "./salesBrainShadowChatPath";
import type { SalesBrainUserRole } from "./salesBrainTypes";
import { stagingStyleShadowEnv } from "./salesBrainServerShadowSmoke";

export const SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE = "/api/admin/chat-shadow-sink";

/** Exact legacy from chatSearchOrchestrator seller "เริ่มใหม่" */
export const CHAT_PATH_LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

const LEGACY_BUYER_SEARCH = "legacy orchestrator — buyer search results unchanged";

export interface SalesBrainChatShadowSinkScenarioDefinition {
  userMessage: string;
  userRole: SalesBrainUserRole;
  legacyUserVisibleResponse: string;
  chatPathSource: SalesBrainShadowChatPathSource;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
}

export const SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS = {
  "CP-01": {
    userMessage: "เริ่มใหม่",
    userRole: "seller",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    chatPathSource: "chatSearchOrchestrator",
    environment: "staging",
  },
  "CP-02": {
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_BUYER_SEARCH,
    chatPathSource: "useChat.orchestrated",
    environment: "staging",
  },
  "CP-03": {
    userMessage: "เริ่มใหม่",
    userRole: "seller",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    chatPathSource: "chatSearchOrchestrator",
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
  "CP-04": {
    userMessage: "เริ่มใหม่",
    userRole: "seller",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    chatPathSource: "useChat.orchestrated",
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
  "CP-05": {
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_BUYER_SEARCH,
    chatPathSource: "useChat.gemini_fallback",
    environment: "production",
    env: stagingStyleShadowEnv(),
  },
} as const satisfies Record<string, SalesBrainChatShadowSinkScenarioDefinition>;

export type SalesBrainChatShadowSinkScenarioId =
  keyof typeof SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS;

export const CHAT_SHADOW_SINK_SCENARIO_IDS = Object.keys(
  SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS
) as SalesBrainChatShadowSinkScenarioId[];

export function isSalesBrainChatShadowSinkScenarioId(
  scenarioId: string
): scenarioId is SalesBrainChatShadowSinkScenarioId {
  return Object.prototype.hasOwnProperty.call(SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS, scenarioId);
}

function resolveScenarioEnv(
  definition: SalesBrainChatShadowSinkScenarioDefinition
): Record<string, string | undefined> {
  if (definition.env) {
    return definition.env;
  }
  return stagingStyleShadowEnv();
}

export function runSalesBrainChatShadowSink(input: {
  scenarioId: SalesBrainChatShadowSinkScenarioId;
}): SalesBrainShadowRuntimeResult & {
  scenarioId: SalesBrainChatShadowSinkScenarioId;
  chatPathSource: SalesBrainShadowChatPathSource;
} {
  const definition = SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS[input.scenarioId];
  const result = evaluateSalesBrainShadowRuntime({
    userMessage: definition.userMessage,
    userRole: definition.userRole,
    legacyUserVisibleResponse: definition.legacyUserVisibleResponse,
    environment: definition.environment ?? "staging",
    env: resolveScenarioEnv(definition),
  });
  return {
    scenarioId: input.scenarioId,
    chatPathSource: definition.chatPathSource,
    ...result,
  };
}

export interface RedactedChatShadowSinkPayload {
  scenarioId: SalesBrainChatShadowSinkScenarioId;
  chatPathSource: SalesBrainShadowChatPathSource;
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
  chatShadowRealProviderAttempted?: boolean;
  chatShadowRealProviderFallbackReason?: string;
  realProviderGateReason?: string;
}

export interface ChatShadowSinkHandlerContext {
  providerNetwork: boolean;
  realProviderResult?: AdminShadowGeminiCallResult;
  realProviderFallbackReason?: string;
  realProviderGateReason?: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}

export function buildRedactedChatShadowSinkPayload(
  result: SalesBrainShadowRuntimeResult & {
    scenarioId: SalesBrainChatShadowSinkScenarioId;
    chatPathSource: SalesBrainShadowChatPathSource;
  },
  context: ChatShadowSinkHandlerContext = { providerNetwork: false }
): RedactedChatShadowSinkPayload {
  const payload: RedactedChatShadowSinkPayload = {
    scenarioId: result.scenarioId,
    chatPathSource: result.chatPathSource,
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
          `chat-shadow real provider output (redacted): ${realProvider.redactedProviderOutput}`
        )
      : redactPiiForSalesBrainLog(result.shadowDebugResult?.comparisonNotes ?? "");

    payload.shadowDebugResult = {
      salesBrainIntent:
        result.shadowDebugResult?.salesBrainIntent ?? "chat.shadow.real_provider",
      legacyRouteLabel:
        result.shadowDebugResult?.legacyRouteLabel ?? "legacy chat path — unchanged",
      routesAlign: result.shadowDebugResult?.routesAlign ?? false,
      provider: usedGemini ? "gemini" : "mock",
      routedVia: usedGemini
        ? "chat.shadow.real_provider"
        : (result.shadowDebugResult?.routedVia ?? "mock"),
      selectedCapabilities:
        result.shadowDebugResult?.selectedCapabilities ?? ["chat.shadow.sink"],
      safetyDecision: usedGemini
        ? "chat_path_sink_only_redacted"
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
    payload.chatShadowRealProviderAttempted = true;
    payload.chatShadowRealProviderFallbackReason = context.realProviderFallbackReason;
  }

  if (context.realProviderGateReason) {
    payload.realProviderGateReason = context.realProviderGateReason;
  } else if (!context.providerNetwork) {
    payload.realProviderGateReason = "unknown_mock_fallback";
  }

  return payload;
}

export async function resolveChatShadowSinkHandlerContext(input: {
  scenarioId: SalesBrainChatShadowSinkScenarioId;
  evaluation: SalesBrainShadowRuntimeResult & {
    scenarioId: SalesBrainChatShadowSinkScenarioId;
    chatPathSource: SalesBrainShadowChatPathSource;
  };
  readEnv?: (key: string) => string | undefined;
}): Promise<ChatShadowSinkHandlerContext> {
  const readEnv = input.readEnv ?? defaultEnvReader;
  const definition = SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS[input.scenarioId];
  const environment = definition.environment ?? "staging";

  if (environment === "production") {
    return {
      providerNetwork: false,
      realProviderGateReason: "production_environment",
    };
  }

  if (!isChatShadowRealProviderScenarioAllowed(input.scenarioId)) {
    return {
      providerNetwork: false,
      realProviderGateReason: "scenario_not_allowed_for_real_provider",
    };
  }

  if (
    !canAttemptChatShadowRealProvider({
      scenarioId: input.scenarioId,
      environment,
      readEnv,
    })
  ) {
    return {
      providerNetwork: false,
      realProviderGateReason: "chat_shadow_real_provider_flag_off",
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
    const realProviderResult = await invokeChatShadowRealProvider({
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

export async function handleAdminChatShadowSinkPost(
  req: Request,
  res: Response
): Promise<void> {
  const scenarioId = String(req.body?.scenarioId ?? "").trim();
  if (!scenarioId) {
    res.status(400).json({
      success: false,
      message: "scenarioId is required — synthetic CP-01..CP-05 only",
    });
    return;
  }

  if (!isSalesBrainChatShadowSinkScenarioId(scenarioId)) {
    res.status(400).json({
      success: false,
      message: "unknown scenarioId — use synthetic CP-01..CP-05 only",
    });
    return;
  }

  const evaluation = runSalesBrainChatShadowSink({ scenarioId });
  const definition = SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS[scenarioId];
  const environment = definition.environment ?? "staging";
  const handlerContext = await resolveChatShadowSinkHandlerContext({
    scenarioId,
    evaluation,
  });
  const data = buildRedactedChatShadowSinkPayload(evaluation, handlerContext);
  const realProviderGateReason =
    handlerContext.realProviderGateReason ??
    (handlerContext.providerNetwork ? "real_provider_call_ok" : "unknown_mock_fallback");
  const chatShadowDiag = buildChatShadowSinkDiag({
    scenarioId,
    environment,
    shadowEvaluationAllowed: evaluation.runtimeFlags.shadowEvaluationAllowed,
    geminiModel: ADMIN_SHADOW_GEMINI_MODEL,
    geminiRequestShape: ADMIN_SHADOW_GEMINI_REQUEST_SHAPE,
    geminiHttpStatus: handlerContext.geminiHttpStatus,
    geminiErrorCode: handlerContext.geminiErrorCode,
  });

  logChatShadowSinkGate({
    scenarioId,
    source: definition.chatPathSource,
    providerNetwork: handlerContext.providerNetwork,
    realProviderGateReason,
    chatShadowRealProviderFallbackReason: handlerContext.realProviderFallbackReason,
    diag: chatShadowDiag,
  });

  res.json({
    success: true,
    readOnly: true,
    userVisibleOff: true,
    sinkOnly: true,
    providerNetwork: handlerContext.providerNetwork,
    realProviderGateReason,
    chatShadowRealProviderFallbackReason: handlerContext.realProviderFallbackReason,
    chatShadowDiag,
    data,
  });
}

export function registerSalesBrainChatShadowSinkRoutes(app: Express): void {
  app.post(SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE, handleAdminChatShadowSinkPost);
}
