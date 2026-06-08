/**
 * v6.1K — Chat-path shadow sink redacted diagnostics (no secret/env values).
 */
import { isChatShadowRealProviderEnabled, isChatShadowRealProviderScenarioAllowed } from "./salesBrainChatShadowRealProvider";
import { isGeminiApiKeyPresent } from "./salesBrainRealProvider";
import type { SalesBrainRuntimeEnvironment } from "./salesBrainRuntimeFlags";

export const CHAT_SHADOW_SINK_SLICE_ID = "v6.1K";

export interface ChatShadowSinkDiag {
  sliceId: typeof CHAT_SHADOW_SINK_SLICE_ID;
  chatRealProviderFlagEnabled: boolean;
  geminiKeyPresent: boolean;
  shadowEvaluationAllowed: boolean;
  scenarioAllowedForRealProvider: boolean;
  environment: SalesBrainRuntimeEnvironment;
  geminiModel?: string;
  geminiRequestShape?: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}

export function buildChatShadowSinkDiag(input: {
  scenarioId: string;
  environment: SalesBrainRuntimeEnvironment;
  shadowEvaluationAllowed: boolean;
  readEnv?: (key: string) => string | undefined;
  geminiModel?: string;
  geminiRequestShape?: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}): ChatShadowSinkDiag {
  const readEnv = input.readEnv ?? ((key: string) => process.env[key]);
  return {
    sliceId: CHAT_SHADOW_SINK_SLICE_ID,
    chatRealProviderFlagEnabled: isChatShadowRealProviderEnabled(readEnv),
    geminiKeyPresent: isGeminiApiKeyPresent(readEnv),
    shadowEvaluationAllowed: input.shadowEvaluationAllowed,
    scenarioAllowedForRealProvider: isChatShadowRealProviderScenarioAllowed(input.scenarioId),
    environment: input.environment,
    geminiModel: input.geminiModel,
    geminiRequestShape: input.geminiRequestShape,
    geminiHttpStatus: input.geminiHttpStatus,
    geminiErrorCode: input.geminiErrorCode,
  };
}

export function logChatShadowSinkGate(payload: {
  scenarioId: string;
  source: string;
  providerNetwork: boolean;
  realProviderGateReason: string;
  chatShadowRealProviderFallbackReason?: string;
  diag: ChatShadowSinkDiag;
}): void {
  const redacted = JSON.stringify({
    tag: "[chat-shadow-sink]",
    scenarioId: payload.scenarioId,
    source: payload.source,
    providerNetwork: payload.providerNetwork,
    realProviderGateReason: payload.realProviderGateReason,
    chatShadowRealProviderFallbackReason: payload.chatShadowRealProviderFallbackReason,
    sliceId: payload.diag.sliceId,
    chatRealProviderFlagEnabled: payload.diag.chatRealProviderFlagEnabled,
    geminiKeyPresent: payload.diag.geminiKeyPresent,
    shadowEvaluationAllowed: payload.diag.shadowEvaluationAllowed,
    scenarioAllowedForRealProvider: payload.diag.scenarioAllowedForRealProvider,
    environment: payload.diag.environment,
    geminiModel: payload.diag.geminiModel,
    geminiHttpStatus: payload.diag.geminiHttpStatus,
    geminiErrorCode: payload.diag.geminiErrorCode,
  });
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    console.debug(redacted);
  }
}
