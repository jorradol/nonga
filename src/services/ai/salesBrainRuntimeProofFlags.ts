/**
 * v9.2 - Admin-only runtime proof skeleton flags (default OFF).
 * Env-name placeholders only. No secrets, no provider calls.
 */

export const AI_RUNTIME_PROOF_ENABLED_ENV = "AI_RUNTIME_PROOF_ENABLED";
export const AI_ADMIN_RUNTIME_PROOF_ONLY_ENV = "AI_ADMIN_RUNTIME_PROOF_ONLY";
export const AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV = "AI_RUNTIME_PROOF_QUOTA_LIMIT";
export const AI_LOG_REDACTION_ENABLED_ENV = "AI_LOG_REDACTION_ENABLED";

export interface SalesBrainRuntimeProofFlags {
  runtimeProofEnabled: boolean;
  adminOnly: boolean;
  quotaLimit: number | null;
  logRedactionEnabled: boolean;
  allowRuntimeProofPath: boolean;
  blockedReason:
    | "runtime_proof_disabled_default_off"
    | "admin_only_boundary_required"
    | "invalid_quota_limit"
    | "enabled_for_admin_proof_skeleton";
  deterministicFallback: true;
  providerNetwork: false;
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
 * Resolve runtime-proof skeleton flags.
 * Safety baseline: deterministic fallback is always source of truth.
 */
export function resolveSalesBrainRuntimeProofFlags(input: {
  env?: Partial<NodeJS.ProcessEnv> | Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
} = {}): SalesBrainRuntimeProofFlags {
  const readEnv =
    input.readEnv ??
    ((key: string) => {
      const env = input.env ?? (typeof process !== "undefined" ? process.env : {});
      return env[key as keyof typeof env] as string | undefined;
    });

  const runtimeProofEnabled = parseTruthy(readEnv(AI_RUNTIME_PROOF_ENABLED_ENV));
  const adminOnly = parseTruthy(readEnv(AI_ADMIN_RUNTIME_PROOF_ONLY_ENV));
  const quotaLimit = parsePositiveNumber(readEnv(AI_RUNTIME_PROOF_QUOTA_LIMIT_ENV));
  const logRedactionEnabled = parseTruthy(readEnv(AI_LOG_REDACTION_ENABLED_ENV));

  if (!runtimeProofEnabled) {
    return {
      runtimeProofEnabled: false,
      adminOnly: adminOnly || true,
      quotaLimit,
      logRedactionEnabled,
      allowRuntimeProofPath: false,
      blockedReason: "runtime_proof_disabled_default_off",
      deterministicFallback: true,
      providerNetwork: false,
    };
  }

  if (!adminOnly) {
    return {
      runtimeProofEnabled: true,
      adminOnly: false,
      quotaLimit,
      logRedactionEnabled,
      allowRuntimeProofPath: false,
      blockedReason: "admin_only_boundary_required",
      deterministicFallback: true,
      providerNetwork: false,
    };
  }

  if (quotaLimit === null) {
    return {
      runtimeProofEnabled: true,
      adminOnly: true,
      quotaLimit: null,
      logRedactionEnabled,
      allowRuntimeProofPath: false,
      blockedReason: "invalid_quota_limit",
      deterministicFallback: true,
      providerNetwork: false,
    };
  }

  return {
    runtimeProofEnabled: true,
    adminOnly: true,
    quotaLimit,
    logRedactionEnabled,
    allowRuntimeProofPath: true,
    blockedReason: "enabled_for_admin_proof_skeleton",
    deterministicFallback: true,
    providerNetwork: false,
  };
}
