/**
 * v9.3 - Admin-only runtime-proof provider wiring placeholder.
 * Safety: still OFF, kill-switch protected, deterministic fallback only.
 */
import type { SalesBrainRuntimeProofFlags } from "./salesBrainRuntimeProofFlags";

export const AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV = "AI_RUNTIME_PROOF_PROVIDER_ENABLED";
export const AI_RUNTIME_PROOF_KILL_SWITCH_ENV = "AI_RUNTIME_PROOF_KILL_SWITCH";
export const AI_RUNTIME_PROOF_MAX_COST_USD_ENV = "AI_RUNTIME_PROOF_MAX_COST_USD";
export const AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV = "GEMINI_API_KEY";

export type RuntimeProofProviderBlockedReason =
  | "kill_switch_forced_off"
  | "runtime_proof_disabled_default_off"
  | "admin_only_boundary_required"
  | "provider_flag_off"
  | "provider_secret_missing_or_placeholder"
  | "quota_guard_missing"
  | "cost_guard_missing"
  | "logging_redaction_required"
  | "provider_wiring_placeholder_off";

export interface RuntimeProofProviderWiringState {
  requestedProviderEnabled: boolean;
  effectiveProviderEnabled: false;
  providerName: "gemini-placeholder";
  killSwitchActive: boolean;
  secretGuardReady: boolean;
  quotaGuardReady: boolean;
  costGuardReady: boolean;
  logRedactionGuardReady: boolean;
  blockedReason: RuntimeProofProviderBlockedReason;
  deterministicFallback: true;
  networkAllowed: false;
}

export interface RuntimeProofProviderInvocationResult {
  status: "blocked";
  blockedReason: RuntimeProofProviderBlockedReason;
  networkAttempted: false;
  geminiRequestAttempted: false;
}

export interface RuntimeProofProviderAdapter {
  providerName: "gemini-placeholder";
  invoke: (input: {
    message: string;
    state: RuntimeProofProviderWiringState;
  }) => Promise<RuntimeProofProviderInvocationResult>;
}

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function parsePositiveNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

/**
 * Redact user-provided text for diagnostics.
 * Never log raw prompt/PII/secret tokens.
 */
export function redactRuntimeProofDiagnosticText(raw: string): string {
  const noPrompt = raw.replace(/\bprompt\s*:\s*[^,\n]{0,200}/gi, "[redacted-prompt]");
  const noBearer = noPrompt.replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, "[redacted-bearer]");
  const noGoogleApiKey = noBearer.replace(/AIza[0-9A-Za-z\-_]{20,}/g, "[redacted-api-key]");
  const noSkToken = noGoogleApiKey.replace(/\bsk-[A-Za-z0-9_-]{12,}\b/gi, "[redacted-token]");
  const noSecretLike = noSkToken.replace(
    /\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*["']?[^"',\n]{6,}["']?/gi,
    "[redacted-secret-like]"
  );
  const noPhone = noSecretLike.replace(/\b0[689]\d{8}\b/g, "[redacted-phone]");
  const noVin = noPhone.replace(/\b[A-HJ-NPR-Z0-9]{17}\b/g, "[redacted-vin]");
  return noVin.slice(0, 160);
}

function isNonPlaceholderSecret(raw: string | undefined): boolean {
  const value = String(raw ?? "").trim();
  if (!value) return false;
  if (/placeholder|fake|your[_-]?api|example|dummy/i.test(value)) return false;
  return value.length >= 20;
}

export function resolveRuntimeProofProviderWiring(input: {
  flags: SalesBrainRuntimeProofFlags;
  env?: Partial<NodeJS.ProcessEnv> | Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
}): RuntimeProofProviderWiringState {
  const readEnv =
    input.readEnv ??
    ((key: string) => {
      const env = input.env ?? (typeof process !== "undefined" ? process.env : {});
      return env[key as keyof typeof env] as string | undefined;
    });

  const requestedProviderEnabled = parseTruthy(
    readEnv(AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV)
  );
  const killSwitchActive = parseTruthy(readEnv(AI_RUNTIME_PROOF_KILL_SWITCH_ENV));
  const maxCostUsd = parsePositiveNumber(readEnv(AI_RUNTIME_PROOF_MAX_COST_USD_ENV));
  const secretGuardReady = isNonPlaceholderSecret(readEnv(AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV));
  const quotaGuardReady = input.flags.quotaLimit !== null && input.flags.quotaLimit > 0;
  const costGuardReady = maxCostUsd !== null;
  const logRedactionGuardReady = input.flags.logRedactionEnabled;

  let blockedReason: RuntimeProofProviderBlockedReason;
  if (killSwitchActive) {
    blockedReason = "kill_switch_forced_off";
  } else if (!input.flags.runtimeProofEnabled) {
    blockedReason = "runtime_proof_disabled_default_off";
  } else if (!input.flags.adminOnly) {
    blockedReason = "admin_only_boundary_required";
  } else if (!requestedProviderEnabled) {
    blockedReason = "provider_flag_off";
  } else if (!secretGuardReady) {
    blockedReason = "provider_secret_missing_or_placeholder";
  } else if (!quotaGuardReady) {
    blockedReason = "quota_guard_missing";
  } else if (!costGuardReady) {
    blockedReason = "cost_guard_missing";
  } else if (!logRedactionGuardReady) {
    blockedReason = "logging_redaction_required";
  } else {
    // v9.3 deliberately keeps provider OFF even when all gates are green.
    blockedReason = "provider_wiring_placeholder_off";
  }

  return {
    requestedProviderEnabled,
    effectiveProviderEnabled: false,
    providerName: "gemini-placeholder",
    killSwitchActive,
    secretGuardReady,
    quotaGuardReady,
    costGuardReady,
    logRedactionGuardReady,
    blockedReason,
    deterministicFallback: true,
    networkAllowed: false,
  };
}

export function createDisabledRuntimeProofProviderAdapter(): RuntimeProofProviderAdapter {
  return {
    providerName: "gemini-placeholder",
    async invoke(input) {
      const _redacted = redactRuntimeProofDiagnosticText(input.message);
      return {
        status: "blocked",
        blockedReason: input.state.blockedReason,
        networkAttempted: false,
        geminiRequestAttempted: false,
      };
    },
  };
}
