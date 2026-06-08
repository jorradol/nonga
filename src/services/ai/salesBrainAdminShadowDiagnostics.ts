/**
 * v6.1H.2 — Admin shadow smoke redacted diagnostics (no secret/env values).
 */
import {
  isAdminShadowRealProviderCaseAllowed,
  isAdminShadowRealProviderEnabled,
} from "./salesBrainAdminShadowRealProvider";
import { isGeminiApiKeyPresent } from "./salesBrainRealProvider";
import {
  SalesBrainRealProviderMissingApiKeyError,
  SalesBrainRealProviderNetworkDisabledError,
} from "./salesBrainTypes";
import type { SalesBrainRuntimeEnvironment } from "./salesBrainRuntimeFlags";

export const ADMIN_SHADOW_SMOKE_SLICE_ID = "v6.1H.2";

export interface AdminShadowSmokeDiag {
  sliceId: typeof ADMIN_SHADOW_SMOKE_SLICE_ID;
  adminRealProviderFlagEnabled: boolean;
  geminiKeyPresent: boolean;
  shadowEvaluationAllowed: boolean;
  caseAllowedForRealProvider: boolean;
  environment: SalesBrainRuntimeEnvironment;
}

/** Redacted provider error code — never includes secret values or raw prompts */
export function classifyAdminShadowProviderError(error: unknown): string {
  if (error instanceof SalesBrainRealProviderMissingApiKeyError) {
    return "missing_api_key";
  }
  if (error instanceof SalesBrainRealProviderNetworkDisabledError) {
    return "provider_network_disabled";
  }
  if (error instanceof Error) {
    const name = error.name.trim();
    if (name === "ApiError" || name === "GoogleGenerativeAIError") {
      return "gemini_api_error";
    }
    if (/GEMINI_API_KEY|api.?key/i.test(error.message)) {
      return "missing_api_key";
    }
    if (name) {
      return `provider_call_error:${name}`.slice(0, 80);
    }
  }
  return "provider_call_error";
}

export function buildAdminShadowSmokeDiag(input: {
  caseId: string;
  environment: SalesBrainRuntimeEnvironment;
  shadowEvaluationAllowed: boolean;
  readEnv?: (key: string) => string | undefined;
}): AdminShadowSmokeDiag {
  const readEnv = input.readEnv;
  return {
    sliceId: ADMIN_SHADOW_SMOKE_SLICE_ID,
    adminRealProviderFlagEnabled: isAdminShadowRealProviderEnabled(readEnv),
    geminiKeyPresent: isGeminiApiKeyPresent(readEnv),
    shadowEvaluationAllowed: input.shadowEvaluationAllowed,
    caseAllowedForRealProvider: isAdminShadowRealProviderCaseAllowed(input.caseId),
    environment: input.environment,
  };
}

/** Safe metadata log — booleans/codes only, no secrets or PII */
export function logAdminShadowSmokeGate(input: {
  caseId: string;
  providerNetwork: boolean;
  realProviderGateReason?: string;
  adminShadowRealProviderFallbackReason?: string;
  diag: AdminShadowSmokeDiag;
}): void {
  console.log(
    "[admin-shadow-smoke]",
    JSON.stringify({
      caseId: input.caseId,
      sliceId: input.diag.sliceId,
      providerNetwork: input.providerNetwork,
      gate: input.realProviderGateReason ?? "unknown",
      fallback: input.adminShadowRealProviderFallbackReason ?? null,
      flagEnabled: input.diag.adminRealProviderFlagEnabled,
      keyPresent: input.diag.geminiKeyPresent,
      shadowAllowed: input.diag.shadowEvaluationAllowed,
      caseAllowed: input.diag.caseAllowedForRealProvider,
      environment: input.diag.environment,
    })
  );
}
