/**
 * v9.3 - Admin-only runtime-proof provider wiring placeholder.
 * Safety: still OFF, kill-switch protected, deterministic fallback only.
 */
import type { SalesBrainRuntimeProofFlags } from "./salesBrainRuntimeProofFlags";

export const AI_RUNTIME_PROOF_PROVIDER_ENABLED_ENV = "AI_RUNTIME_PROOF_PROVIDER_ENABLED";
export const AI_RUNTIME_PROOF_KILL_SWITCH_ENV = "AI_RUNTIME_PROOF_KILL_SWITCH";
export const AI_RUNTIME_PROOF_MAX_COST_USD_ENV = "AI_RUNTIME_PROOF_MAX_COST_USD";
export const AI_RUNTIME_PROOF_PROVIDER_SECRET_ENV = "GEMINI_API_KEY";
export const AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV = "AI_RUNTIME_PROOF_DRY_RUN_ONLY";
export const AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV =
  "AI_RUNTIME_PROOF_OWNER_APPROVED_MODE";
export const AI_RUNTIME_PROOF_OWNER_APPROVAL_FLAG_ENV =
  AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV;
export const AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV = "AI_RUNTIME_PROOF_MANUAL_PROOF_MODE";
export const AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV =
  "AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION";
export const AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV =
  "AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP";

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

export type RuntimeProofDryRunBlockedReason =
  | "dry_run_only_guard_active"
  | "dry_run_only_required"
  | "owner_approval_mode_required"
  | "kill_switch_forced_off"
  | "runtime_proof_disabled_default_off"
  | "admin_only_boundary_required"
  | "provider_secret_missing_or_placeholder"
  | "quota_guard_missing"
  | "cost_guard_missing"
  | "logging_redaction_required";

export interface RuntimeProofDryRunGateState {
  dryRunOnlyEnforced: true;
  requestedDryRunOnly: boolean;
  ownerApprovedMode: boolean;
  readyForFutureRealProof: boolean;
  realProviderCallAllowed: false;
  effectiveProviderEnabled: false;
  deterministicFallback: true;
  networkAllowed: false;
  blockedReasons: RuntimeProofDryRunBlockedReason[];
}

export type RuntimeProofRealProviderBlockedReason =
  | "kill_switch_forced_off"
  | "runtime_proof_disabled_default_off"
  | "admin_only_boundary_required"
  | "manual_proof_mode_required"
  | "owner_approval_flag_required"
  | "provider_secret_missing_or_placeholder"
  | "quota_guard_missing"
  | "cost_guard_missing"
  | "logging_redaction_required"
  | "dry_run_gate_not_ready"
  | "real_provider_quota_cap_missing"
  | "real_provider_activation_flag_required";

export interface RuntimeProofRealProviderGuardState {
  requestedRealProviderActivation: boolean;
  manualProofMode: boolean;
  ownerApprovalFlag: boolean;
  dryRunGatePassed: boolean;
  realProviderQuotaCapReady: boolean;
  realProviderQuotaCap: number | null;
  runtimeProofEnabled: boolean;
  adminOnly: boolean;
  killSwitchActive: boolean;
  secretGuardReady: boolean;
  quotaGuardReady: boolean;
  costGuardReady: boolean;
  logRedactionGuardReady: boolean;
  effectiveProviderEnabled: boolean;
  realProviderCallAllowed: boolean;
  deterministicFallback: true;
  networkAllowed: boolean;
  blockedReasons: RuntimeProofRealProviderBlockedReason[];
}

export interface RuntimeProofProviderAdapter {
  providerName: "gemini-placeholder";
  invoke: (input: {
    message: string;
    state: RuntimeProofProviderWiringState;
  }) => Promise<RuntimeProofProviderInvocationResult>;
}

export interface ManualAdminRuntimeProofAdapterResult {
  status: "blocked" | "fallback" | "success";
  provider: "gemini-manual-proof";
  blockedReasons: RuntimeProofRealProviderBlockedReason[];
  deterministicFallbackUsed: boolean;
  networkAttempted: boolean;
  geminiRequestAttempted: boolean;
  output: string;
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

export function resolveRuntimeProofDryRunGate(input: {
  flags: SalesBrainRuntimeProofFlags;
  wiring: RuntimeProofProviderWiringState;
  env?: Partial<NodeJS.ProcessEnv> | Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
}): RuntimeProofDryRunGateState {
  const readEnv =
    input.readEnv ??
    ((key: string) => {
      const env = input.env ?? (typeof process !== "undefined" ? process.env : {});
      return env[key as keyof typeof env] as string | undefined;
    });

  const dryRunRaw = readEnv(AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV);
  const requestedDryRunOnly =
    dryRunRaw === undefined ? true : parseTruthy(readEnv(AI_RUNTIME_PROOF_DRY_RUN_ONLY_ENV));
  const ownerApprovedMode = parseTruthy(readEnv(AI_RUNTIME_PROOF_OWNER_APPROVED_MODE_ENV));

  const blockedReasons: RuntimeProofDryRunBlockedReason[] = [];
  if (!requestedDryRunOnly) blockedReasons.push("dry_run_only_required");
  if (input.wiring.killSwitchActive) blockedReasons.push("kill_switch_forced_off");
  if (!input.flags.runtimeProofEnabled) {
    blockedReasons.push("runtime_proof_disabled_default_off");
  }
  if (!input.flags.adminOnly) blockedReasons.push("admin_only_boundary_required");
  if (!input.wiring.secretGuardReady) blockedReasons.push("provider_secret_missing_or_placeholder");
  if (!input.wiring.quotaGuardReady) blockedReasons.push("quota_guard_missing");
  if (!input.wiring.costGuardReady) blockedReasons.push("cost_guard_missing");
  if (!input.wiring.logRedactionGuardReady) blockedReasons.push("logging_redaction_required");
  if (!ownerApprovedMode) blockedReasons.push("owner_approval_mode_required");
  blockedReasons.push("dry_run_only_guard_active");

  const readyForFutureRealProof =
    requestedDryRunOnly &&
    ownerApprovedMode &&
    !input.wiring.killSwitchActive &&
    input.flags.runtimeProofEnabled &&
    input.flags.adminOnly &&
    input.wiring.secretGuardReady &&
    input.wiring.quotaGuardReady &&
    input.wiring.costGuardReady &&
    input.wiring.logRedactionGuardReady;

  return {
    dryRunOnlyEnforced: true,
    requestedDryRunOnly,
    ownerApprovedMode,
    readyForFutureRealProof,
    realProviderCallAllowed: false,
    effectiveProviderEnabled: false,
    deterministicFallback: true,
    networkAllowed: false,
    blockedReasons,
  };
}

export function resolveRuntimeProofRealProviderGuard(input: {
  flags: SalesBrainRuntimeProofFlags;
  wiring: RuntimeProofProviderWiringState;
  dryRunGate: RuntimeProofDryRunGateState;
  env?: Partial<NodeJS.ProcessEnv> | Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
}): RuntimeProofRealProviderGuardState {
  const readEnv =
    input.readEnv ??
    ((key: string) => {
      const env = input.env ?? (typeof process !== "undefined" ? process.env : {});
      return env[key as keyof typeof env] as string | undefined;
    });

  const requestedRealProviderActivation = parseTruthy(
    readEnv(AI_RUNTIME_PROOF_REAL_PROVIDER_ACTIVATION_ENV)
  );
  const manualProofMode = parseTruthy(readEnv(AI_RUNTIME_PROOF_MANUAL_PROOF_MODE_ENV));
  const ownerApprovalFlag = parseTruthy(readEnv(AI_RUNTIME_PROOF_OWNER_APPROVAL_FLAG_ENV));
  const realProviderQuotaCap = parsePositiveNumber(
    readEnv(AI_RUNTIME_PROOF_REAL_PROVIDER_QUOTA_CAP_ENV)
  );
  const realProviderQuotaCapReady = realProviderQuotaCap !== null;
  const dryRunGatePassed =
    input.dryRunGate.dryRunOnlyEnforced &&
    input.dryRunGate.requestedDryRunOnly &&
    input.dryRunGate.readyForFutureRealProof;

  const blockedReasons: RuntimeProofRealProviderBlockedReason[] = [];
  if (input.wiring.killSwitchActive) blockedReasons.push("kill_switch_forced_off");
  if (!input.flags.runtimeProofEnabled) blockedReasons.push("runtime_proof_disabled_default_off");
  if (!input.flags.adminOnly) blockedReasons.push("admin_only_boundary_required");
  if (!manualProofMode) blockedReasons.push("manual_proof_mode_required");
  if (!ownerApprovalFlag) blockedReasons.push("owner_approval_flag_required");
  if (!input.wiring.secretGuardReady) blockedReasons.push("provider_secret_missing_or_placeholder");
  if (!input.wiring.quotaGuardReady) blockedReasons.push("quota_guard_missing");
  if (!input.wiring.costGuardReady) blockedReasons.push("cost_guard_missing");
  if (!input.wiring.logRedactionGuardReady) blockedReasons.push("logging_redaction_required");
  if (!dryRunGatePassed) blockedReasons.push("dry_run_gate_not_ready");
  if (!realProviderQuotaCapReady) blockedReasons.push("real_provider_quota_cap_missing");
  if (!requestedRealProviderActivation) {
    blockedReasons.push("real_provider_activation_flag_required");
  }

  const realProviderCallAllowed = blockedReasons.length === 0;

  return {
    requestedRealProviderActivation,
    manualProofMode,
    ownerApprovalFlag,
    dryRunGatePassed,
    realProviderQuotaCapReady,
    realProviderQuotaCap,
    runtimeProofEnabled: input.flags.runtimeProofEnabled,
    adminOnly: input.flags.adminOnly,
    killSwitchActive: input.wiring.killSwitchActive,
    secretGuardReady: input.wiring.secretGuardReady,
    quotaGuardReady: input.wiring.quotaGuardReady,
    costGuardReady: input.wiring.costGuardReady,
    logRedactionGuardReady: input.wiring.logRedactionGuardReady,
    effectiveProviderEnabled: realProviderCallAllowed,
    realProviderCallAllowed,
    deterministicFallback: true,
    networkAllowed: realProviderCallAllowed,
    blockedReasons,
  };
}

export function buildRuntimeProofDeterministicFallback(input: {
  message: string;
  reason: string;
}): string {
  const redactedMessage = redactRuntimeProofDiagnosticText(input.message);
  return [
    "runtime_proof_deterministic_fallback",
    `reason=${input.reason}`,
    `message=${redactedMessage}`,
  ].join(" | ");
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

export function createManualAdminGeminiRuntimeProofAdapter(input: {
  invokeGemini?: (message: string) => Promise<string>;
} = {}): {
  providerName: "gemini-manual-proof";
  invoke: (args: {
    message: string;
    guard: RuntimeProofRealProviderGuardState;
  }) => Promise<ManualAdminRuntimeProofAdapterResult>;
} {
  return {
    providerName: "gemini-manual-proof",
    async invoke(args) {
      if (!args.guard.realProviderCallAllowed) {
        return {
          status: "blocked",
          provider: "gemini-manual-proof",
          blockedReasons: args.guard.blockedReasons,
          deterministicFallbackUsed: true,
          networkAttempted: false,
          geminiRequestAttempted: false,
          output: buildRuntimeProofDeterministicFallback({
            message: args.message,
            reason: args.guard.blockedReasons[0] ?? "guard_blocked",
          }),
        };
      }

      if (!input.invokeGemini) {
        return {
          status: "fallback",
          provider: "gemini-manual-proof",
          blockedReasons: [],
          deterministicFallbackUsed: true,
          networkAttempted: false,
          geminiRequestAttempted: false,
          output: buildRuntimeProofDeterministicFallback({
            message: args.message,
            reason: "provider_invoke_not_attached",
          }),
        };
      }

      try {
        const output = await input.invokeGemini(args.message);
        return {
          status: "success",
          provider: "gemini-manual-proof",
          blockedReasons: [],
          deterministicFallbackUsed: false,
          networkAttempted: true,
          geminiRequestAttempted: true,
          output: redactRuntimeProofDiagnosticText(output),
        };
      } catch {
        return {
          status: "fallback",
          provider: "gemini-manual-proof",
          blockedReasons: [],
          deterministicFallbackUsed: true,
          networkAttempted: true,
          geminiRequestAttempted: true,
          output: buildRuntimeProofDeterministicFallback({
            message: args.message,
            reason: "provider_failure_fallback",
          }),
        };
      }
    },
  };
}
