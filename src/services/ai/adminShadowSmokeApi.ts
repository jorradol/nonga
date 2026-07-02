import {
  assertApiSuccess,
  safeApiFetch,
  type ApiJsonEnvelope,
} from "../../utils/safeApiFetch";
import { adminAuthHeadersAsync } from "../../utils/apiAuthHeaders";

/** Must match server `SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE` — synthetic cases only. */
export const ADMIN_SHADOW_SMOKE_ROUTE = "/api/admin/sales-brain-shadow-smoke";

/** Fixed synthetic case IDs — no custom prompt / PII / real stock. */
export const ADMIN_SHADOW_SMOKE_CASE_IDS = [
  "SS-01",
  "SS-02",
  "SS-03",
  "SS-04",
  "SS-05",
  "SS-06",
  "SS-07",
  "SS-08",
] as const;

export type AdminShadowSmokeCaseId = (typeof ADMIN_SHADOW_SMOKE_CASE_IDS)[number];

export const ADMIN_SHADOW_SMOKE_CASE_LABELS: Record<AdminShadowSmokeCaseId, string> = {
  "SS-01": "Buyer generic search",
  "SS-02": "Buyer mock listing detail",
  "SS-03": "Seller start over",
  "SS-04": "Dealer inventory count",
  "SS-05": "Kill switch blocked",
  "SS-06": "Budget missing blocked",
  "SS-07": "User-visible blocked",
  "SS-08": "Production off",
};

export interface AdminShadowSmokeRedactedData {
  caseId: AdminShadowSmokeCaseId;
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
  realProviderGateReason?: string;
}

export interface AdminShadowSmokeDiag {
  sliceId: string;
  adminRealProviderFlagEnabled: boolean;
  geminiKeyPresent: boolean;
  shadowEvaluationAllowed: boolean;
  caseAllowedForRealProvider: boolean;
  environment: string;
  geminiModel?: string;
  geminiRequestShape?: string;
  geminiHttpStatus?: number;
  geminiErrorCode?: string;
}

export interface AdminShadowSmokeApiResponse {
  success: boolean;
  readOnly: boolean;
  userVisibleOff: boolean;
  providerNetwork: boolean;
  realProviderGateReason?: string;
  adminShadowRealProviderFallbackReason?: string;
  adminShadowDiag?: AdminShadowSmokeDiag;
  data: AdminShadowSmokeRedactedData;
}

export type AdminShadowManualCallerStage =
  | "admin_shadow_manual_caller_start"
  | "admin_shadow_manual_caller_timeout"
  | "admin_shadow_manual_caller_completed"
  | "admin_shadow_manual_caller_aborted";

export interface AdminShadowManualCallerLifecycleEvent {
  stage: AdminShadowManualCallerStage;
  caseId: AdminShadowSmokeCaseId;
  timeoutMs: number;
  elapsedMs?: number;
  reason?: string;
}

export interface RunAdminShadowSmokeCaseOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  onLifecycleEvent?: (event: AdminShadowManualCallerLifecycleEvent) => void;
}

const ADMIN_SHADOW_MANUAL_CALLER_TIMEOUT_DEFAULT_MS = 8000;
const ADMIN_SHADOW_MANUAL_CALLER_TIMEOUT_MIN_MS = 1000;
const ADMIN_SHADOW_MANUAL_CALLER_TIMEOUT_MAX_MS = 30000;

function resolveManualCallerTimeoutMs(raw: number | undefined): number {
  if (!Number.isFinite(raw)) {
    return ADMIN_SHADOW_MANUAL_CALLER_TIMEOUT_DEFAULT_MS;
  }
  const rounded = Math.round(Number(raw));
  return Math.min(
    ADMIN_SHADOW_MANUAL_CALLER_TIMEOUT_MAX_MS,
    Math.max(ADMIN_SHADOW_MANUAL_CALLER_TIMEOUT_MIN_MS, rounded)
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function emitManualCallerLifecycle(
  options: RunAdminShadowSmokeCaseOptions | undefined,
  event: AdminShadowManualCallerLifecycleEvent
): void {
  options?.onLifecycleEvent?.(event);
}

export async function runAdminShadowSmokeCase(
  caseId: AdminShadowSmokeCaseId,
  options?: RunAdminShadowSmokeCaseOptions
): Promise<AdminShadowSmokeApiResponse> {
  const timeoutMs = resolveManualCallerTimeoutMs(options?.timeoutMs);
  const startedAt = Date.now();
  emitManualCallerLifecycle(options, {
    stage: "admin_shadow_manual_caller_start",
    caseId,
    timeoutMs,
  });

  const timeoutController = new AbortController();
  const externalSignal = options?.signal;
  let timeoutTriggered = false;
  const timeoutHandle = setTimeout(() => {
    timeoutTriggered = true;
    emitManualCallerLifecycle(options, {
      stage: "admin_shadow_manual_caller_timeout",
      caseId,
      timeoutMs,
      elapsedMs: Date.now() - startedAt,
      reason: "manual_caller_timeout",
    });
    timeoutController.abort("admin_shadow_manual_caller_timeout");
  }, timeoutMs);

  const externalAbortListener = () => {
    timeoutController.abort("admin_shadow_manual_caller_aborted");
  };
  if (externalSignal) {
    if (externalSignal.aborted) {
      externalAbortListener();
    } else {
      externalSignal.addEventListener("abort", externalAbortListener, { once: true });
    }
  }

  try {
    const json = await safeApiFetch<
      ApiJsonEnvelope & Partial<AdminShadowSmokeApiResponse>
    >(ADMIN_SHADOW_SMOKE_ROUTE, {
      method: "POST",
      headers: {
        ...(await adminAuthHeadersAsync()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ caseId }),
      cache: "no-store",
      signal: timeoutController.signal,
    });
    assertApiSuccess(json, ADMIN_SHADOW_SMOKE_ROUTE);
    emitManualCallerLifecycle(options, {
      stage: "admin_shadow_manual_caller_completed",
      caseId,
      timeoutMs,
      elapsedMs: Date.now() - startedAt,
    });
    return json as AdminShadowSmokeApiResponse;
  } catch (error) {
    if (timeoutTriggered || isAbortError(error)) {
      emitManualCallerLifecycle(options, {
        stage: "admin_shadow_manual_caller_aborted",
        caseId,
        timeoutMs,
        elapsedMs: Date.now() - startedAt,
        reason: timeoutTriggered ? "manual_caller_timeout" : "manual_caller_aborted",
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", externalAbortListener);
    }
  }
}
