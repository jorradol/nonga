/**
 * v6.1H.3 — Admin shadow smoke redacted diagnostics (no secret/env values).
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

export const ADMIN_SHADOW_SMOKE_SLICE_ID = "v6.1J";

export interface AdminShadowSmokeDiag {
  sliceId: typeof ADMIN_SHADOW_SMOKE_SLICE_ID;
  adminRealProviderFlagEnabled: boolean;
  geminiKeyPresent: boolean;
  shadowEvaluationAllowed: boolean;
  caseAllowedForRealProvider: boolean;
  environment: SalesBrainRuntimeEnvironment;
  geminiModel?: string;
  geminiRequestShape?: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}

export interface RedactedGeminiApiError {
  fallbackReason: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}

type ApiErrorLike = Error & { status?: number };

function parseGeminiApiErrorEnvelope(
  message: string
): { httpStatus?: number; grpcStatus?: string } {
  try {
    const parsed = JSON.parse(message) as {
      error?: { code?: number; status?: string };
    };
    const httpStatus =
      typeof parsed?.error?.code === "number" ? parsed.error.code : undefined;
    const grpcStatus =
      typeof parsed?.error?.status === "string"
        ? parsed.error.status.slice(0, 64)
        : undefined;
    return { httpStatus, grpcStatus };
  } catch {
    return {};
  }
}

/** Map HTTP/gRPC status to safe fallback codes — no message body */
export function mapGeminiHttpStatusToFallbackReason(input: {
  httpStatus?: number;
  grpcStatus?: string;
}): string {
  const { httpStatus, grpcStatus } = input;
  const grpc = String(grpcStatus ?? "").toUpperCase();

  if (grpc === "UNAUTHENTICATED" || httpStatus === 401) {
    return "gemini_auth_error";
  }
  if (grpc === "PERMISSION_DENIED" || httpStatus === 403) {
    return "gemini_http_403";
  }
  if (grpc === "NOT_FOUND" || httpStatus === 404) {
    return "gemini_model_not_found";
  }
  if (grpc === "RESOURCE_EXHAUSTED" || httpStatus === 429) {
    return "gemini_quota_error";
  }
  if (grpc === "INVALID_ARGUMENT" || httpStatus === 400) {
    return "request_format_error";
  }
  if (typeof httpStatus === "number" && httpStatus >= 500) {
    return `gemini_http_${httpStatus}`;
  }
  if (typeof httpStatus === "number" && httpStatus >= 400) {
    return `gemini_http_${httpStatus}`;
  }
  if (grpc) {
    return `gemini_grpc_${grpc.toLowerCase().slice(0, 40)}`;
  }
  return "gemini_api_error";
}

/** Redacted provider error — never includes secret values, raw prompts, or API messages */
export function extractRedactedGeminiApiError(error: unknown): RedactedGeminiApiError {
  if (error instanceof SalesBrainRealProviderMissingApiKeyError) {
    return { fallbackReason: "missing_api_key" };
  }
  if (error instanceof SalesBrainRealProviderNetworkDisabledError) {
    return { fallbackReason: "provider_network_disabled" };
  }
  if (error instanceof Error) {
    if (/GEMINI_API_KEY|api.?key/i.test(error.message)) {
      return { fallbackReason: "missing_api_key" };
    }

    const apiError = error as ApiErrorLike;
    const envelope =
      error.name === "ApiError" ? parseGeminiApiErrorEnvelope(error.message) : {};
    const httpStatus =
      typeof apiError.status === "number" ? apiError.status : envelope.httpStatus;
    const grpcStatus = envelope.grpcStatus;

    if (error.name === "ApiError" || typeof httpStatus === "number" || grpcStatus) {
      return {
        fallbackReason: mapGeminiHttpStatusToFallbackReason({ httpStatus, grpcStatus }),
        geminiHttpStatus: httpStatus,
        geminiErrorCode: grpcStatus,
      };
    }

    if (error.name) {
      return {
        fallbackReason: `provider_call_error:${error.name}`.slice(0, 80),
      };
    }
  }
  return { fallbackReason: "provider_call_error" };
}

/** @deprecated alias — use extractRedactedGeminiApiError */
export function classifyAdminShadowProviderError(error: unknown): string {
  return extractRedactedGeminiApiError(error).fallbackReason;
}

export function buildAdminShadowSmokeDiag(input: {
  caseId: string;
  environment: SalesBrainRuntimeEnvironment;
  shadowEvaluationAllowed: boolean;
  readEnv?: (key: string) => string | undefined;
  geminiModel?: string;
  geminiRequestShape?: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}): AdminShadowSmokeDiag {
  const readEnv = input.readEnv;
  return {
    sliceId: ADMIN_SHADOW_SMOKE_SLICE_ID,
    adminRealProviderFlagEnabled: isAdminShadowRealProviderEnabled(readEnv),
    geminiKeyPresent: isGeminiApiKeyPresent(readEnv),
    shadowEvaluationAllowed: input.shadowEvaluationAllowed,
    caseAllowedForRealProvider: isAdminShadowRealProviderCaseAllowed(input.caseId),
    environment: input.environment,
    geminiModel: input.geminiModel,
    geminiRequestShape: input.geminiRequestShape,
    geminiHttpStatus: input.geminiHttpStatus,
    geminiErrorCode: input.geminiErrorCode,
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
      geminiModel: input.diag.geminiModel ?? null,
      geminiRequestShape: input.diag.geminiRequestShape ?? null,
      geminiHttpStatus: input.diag.geminiHttpStatus ?? null,
      geminiErrorCode: input.diag.geminiErrorCode ?? null,
    })
  );
}
