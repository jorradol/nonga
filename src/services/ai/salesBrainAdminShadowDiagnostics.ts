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

export type AdminShadowSmokeStage =
  | "admin_shadow_request_handler_start"
  | "admin_shadow_request_handler_return"
  | "admin_shadow_gate_checked"
  | "admin_shadow_provider_call_start"
  | "admin_shadow_provider_call_timeout"
  | "admin_shadow_provider_call_success"
  | "admin_shadow_provider_call_error"
  | "admin_shadow_fallback_returned"
  | "admin_shadow_manual_caller_start"
  | "admin_shadow_manual_caller_timeout"
  | "admin_shadow_manual_caller_completed"
  | "admin_shadow_manual_caller_aborted";

export const ADMIN_SHADOW_CODE_PATH_AVAILABLE_STAGES: readonly AdminShadowSmokeStage[] = [
  "admin_shadow_manual_caller_start",
  "admin_shadow_manual_caller_timeout",
  "admin_shadow_manual_caller_completed",
  "admin_shadow_manual_caller_aborted",
  "admin_shadow_request_handler_start",
  "admin_shadow_request_handler_return",
  "admin_shadow_gate_checked",
  "admin_shadow_provider_call_start",
  "admin_shadow_provider_call_success",
  "admin_shadow_provider_call_timeout",
  "admin_shadow_provider_call_error",
  "admin_shadow_fallback_returned",
];

export type AdminShadowCallerStatus =
  | "started"
  | "timeout"
  | "completed"
  | "aborted"
  | "unknown";
export type AdminShadowHandlerStatus = "started" | "returned" | "unknown";
export type AdminShadowProviderStatus =
  | "not_started"
  | "started"
  | "timeout"
  | "error"
  | "success"
  | "unknown";

export interface AdminShadowRuntimeDiagnosticSnapshot {
  caseId: string;
  runMode: "admin_shadow_manual_smoke";
  diagnosticSnapshotVersion: "v12.1";
  runtimeObservedStages: AdminShadowSmokeStage[];
  codePathAvailableStages: AdminShadowSmokeStage[];
  missingOrUnknownStages: AdminShadowSmokeStage[];
  callerStatus: AdminShadowCallerStatus;
  handlerStatus: AdminShadowHandlerStatus;
  providerStatus: AdminShadowProviderStatus;
  requestDispatched: boolean;
  responseCaptured: boolean;
  httpStatus?: number;
  timeout?: boolean;
  fallback?: boolean;
  sanitized: true;
}

type ApiErrorLike = Error & { status?: number };

function sortStages(stages: Iterable<AdminShadowSmokeStage>): AdminShadowSmokeStage[] {
  const order = new Map<AdminShadowSmokeStage, number>(
    ADMIN_SHADOW_CODE_PATH_AVAILABLE_STAGES.map((stage, index) => [stage, index])
  );
  return [...new Set(stages)].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

export function buildAdminShadowRuntimeDiagnosticSnapshot(input: {
  caseId: string;
  runtimeObservedStages: Iterable<AdminShadowSmokeStage>;
  callerStatus: AdminShadowCallerStatus;
  handlerStatus: AdminShadowHandlerStatus;
  providerStatus: AdminShadowProviderStatus;
  requestDispatched: boolean;
  responseCaptured: boolean;
  httpStatus?: number;
  timeout?: boolean;
  fallback?: boolean;
}): AdminShadowRuntimeDiagnosticSnapshot {
  const runtimeObservedStages = sortStages(input.runtimeObservedStages);
  const codePathAvailableStages = [...ADMIN_SHADOW_CODE_PATH_AVAILABLE_STAGES];
  const runtimeObservedSet = new Set(runtimeObservedStages);
  const missingOrUnknownStages = codePathAvailableStages.filter(
    (stage) => !runtimeObservedSet.has(stage)
  );
  return {
    caseId: input.caseId,
    runMode: "admin_shadow_manual_smoke",
    diagnosticSnapshotVersion: "v12.1",
    runtimeObservedStages,
    codePathAvailableStages,
    missingOrUnknownStages,
    callerStatus: input.callerStatus,
    handlerStatus: input.handlerStatus,
    providerStatus: input.providerStatus,
    requestDispatched: input.requestDispatched,
    responseCaptured: input.responseCaptured,
    httpStatus: input.httpStatus,
    timeout: input.timeout,
    fallback: input.fallback,
    sanitized: true,
  };
}

export function logAdminShadowRuntimeDiagnosticSnapshot(
  snapshot: AdminShadowRuntimeDiagnosticSnapshot
): void {
  console.log("[admin-shadow-smoke-runtime-snapshot]", JSON.stringify(snapshot));
}

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
    if (error.name === "AdminShadowRealProviderTimeoutError") {
      return { fallbackReason: "provider_timeout" };
    }
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

/** Safe stage log — checkpoints only, no prompt/output/secret values */
export function logAdminShadowSmokeStage(input: {
  caseId: string;
  stage: AdminShadowSmokeStage;
  gate?: string;
  fallback?: string;
}): void {
  console.log(
    "[admin-shadow-smoke-stage]",
    JSON.stringify({
      caseId: input.caseId,
      stage: input.stage,
      gate: input.gate ?? null,
      fallback: input.fallback ?? null,
    })
  );
}
