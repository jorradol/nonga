/**
 * v6.1L.1 — Controlled user-visible AI allowlist gate (default-deny, legacy fallback).
 * Server-side env only — no network, no secret values, no raw UID in diagnostics.
 */
import { evaluateAiFirstAllowlist, type AiFirstGateAuthPath } from "../../config/ai-first-allowlist";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
  resolveSalesBrainRuntimeFlags,
  type SalesBrainRuntimeEnvironment,
  type SalesBrainRuntimeFlags,
} from "./salesBrainRuntimeFlags";

export const USER_VISIBLE_GATE_SLICE_ID = "v6.1L.1";

export { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV };
export type { AiFirstGateAuthPath };

export const STAGING_AUTHENTICATED_GATE_REASON = "staging_authenticated_allowed";

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function parseModeOff(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "off" || v === "";
}

function parseBudgetMissing(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === "") {
    return true;
  }
  const n = Number(String(raw).trim());
  return !Number.isFinite(n) || n <= 0;
}

/** Parse comma-separated Firebase UIDs — server env only; never log raw list in diagnostics */
export function parseUserVisibleAllowlistUids(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  return raw
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/** True when uid passes AI-first allowlist (staging-expanded; production env-only). */
export function isUidAllowlistedForUserVisible(
  uid: string | undefined | null,
  readEnv?: (key: string) => string | undefined,
  environment: SalesBrainRuntimeEnvironment = "local"
): boolean {
  const read =
    readEnv ??
    ((key: string) =>
      typeof process !== "undefined" ? (process.env[key] as string | undefined) : undefined);
  return evaluateAiFirstAllowlist({
    firebaseUid: uid,
    environment,
    readEnv: read,
  }).allowed;
}

export interface EvaluateUserVisibleGateInput {
  firebaseUid?: string | null;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Partial<NodeJS.ProcessEnv> | Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
  runtimeFlags?: SalesBrainRuntimeFlags;
}

export interface UserVisibleGateRedactedDiagnostics {
  sliceId: typeof USER_VISIBLE_GATE_SLICE_ID;
  effectiveUserVisibleAllowed: boolean;
  wouldAllowWithoutV60rBlock: boolean;
  blockedReason: string;
  uidPresent: boolean;
  uidAllowlisted: boolean;
  allowlistConfigured: boolean;
  allowlistEntryCount: number;
  v60rBlockActive: boolean;
  environment: SalesBrainRuntimeEnvironment;
  gateAuthPath: AiFirstGateAuthPath;
  gateCheck: "PASSED" | "FAILED";
}

export interface UserVisibleGateResult {
  effectiveUserVisibleAllowed: boolean;
  wouldAllowWithoutV60rBlock: boolean;
  blockedReason: string;
  fallbackToLegacy: boolean;
  gateAuthPath: AiFirstGateAuthPath;
  gateCheck: "PASSED" | "FAILED";
  redactedDiagnostics: UserVisibleGateRedactedDiagnostics;
}

function checkUserVisiblePrerequisites(
  readEnv: (key: string) => string | undefined
): string | undefined {
  const provider = String(readEnv(NONGA_AI_PROVIDER_ENV) ?? "").trim().toLowerCase();
  if (provider !== "gemini") {
    return "provider_not_gemini";
  }
  if (!parseTruthy(readEnv(NONGA_AI_FIRST_ENABLED_ENV))) {
    return "ai_first_disabled";
  }
  if (parseModeOff(readEnv(NONGA_AI_MODE_ENV))) {
    return "ai_mode_off";
  }
  if (
    parseBudgetMissing(readEnv(NONGA_AI_BUDGET_DAILY_LIMIT_ENV)) ||
    parseBudgetMissing(readEnv(NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV))
  ) {
    return "budget_caps_missing";
  }
  return undefined;
}

/**
 * Evaluate controlled user-visible gate — default-deny; legacy fallback when not effective.
 * v6.1L.2b: when SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED is false, allowlist gate controls access.
 */
export function evaluateUserVisibleGate(
  input: EvaluateUserVisibleGateInput = {}
): UserVisibleGateResult {
  const readEnv =
    input.readEnv ??
    ((key: string) => {
      const env = input.env ?? (typeof process !== "undefined" ? process.env : {});
      return env[key as keyof typeof env] as string | undefined;
    });

  const flags =
    input.runtimeFlags ??
    resolveSalesBrainRuntimeFlags({
      environment: input.environment,
      env: input.env,
      readEnv,
    });

  const uid = String(input.firebaseUid ?? "").trim();
  const uidPresent = uid.length > 0;
  const allowlist = parseUserVisibleAllowlistUids(
    readEnv(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV)
  );
  const allowlistConfigured = allowlist.length > 0;
  const aiFirstAllowlist = evaluateAiFirstAllowlist({
    firebaseUid: uid,
    environment: flags.environment,
    readEnv,
  });
  const uidAllowlisted = uidPresent && aiFirstAllowlist.allowed;
  const gateAuthPath = aiFirstAllowlist.authPath;
  const gateCheck = aiFirstAllowlist.gateCheck;

  let wouldAllow = true;
  let blockedReason = "user_visible_allowed";

  if (flags.environment === "production") {
    wouldAllow = false;
    blockedReason = "production_default_off";
  } else if (flags.emergencyKillSwitch) {
    wouldAllow = false;
    blockedReason = "emergency_kill_switch";
  } else if (!flags.userVisibleRequested) {
    wouldAllow = false;
    blockedReason = "user_visible_not_requested";
  } else if (!uidPresent) {
    wouldAllow = false;
    blockedReason = "guest_uid_missing";
  } else if (!uidAllowlisted) {
    wouldAllow = false;
    blockedReason = aiFirstAllowlist.blockedReason;
  } else {
    const prereqReason = checkUserVisiblePrerequisites(readEnv);
    if (prereqReason) {
      wouldAllow = false;
      blockedReason = prereqReason;
    } else if (gateAuthPath === "staging_authenticated") {
      blockedReason = STAGING_AUTHENTICATED_GATE_REASON;
    }
  }

  const v60rBlockActive = SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED;
  let effectiveAllowed = wouldAllow && !v60rBlockActive;
  if (wouldAllow && v60rBlockActive) {
    blockedReason = "user_visible_blocked_v60r";
    effectiveAllowed = false;
  }

  const redactedDiagnostics: UserVisibleGateRedactedDiagnostics = {
    sliceId: USER_VISIBLE_GATE_SLICE_ID,
    effectiveUserVisibleAllowed: effectiveAllowed,
    wouldAllowWithoutV60rBlock: wouldAllow,
    blockedReason,
    uidPresent,
    uidAllowlisted,
    allowlistConfigured,
    allowlistEntryCount: allowlistConfigured ? allowlist.length : 0,
    v60rBlockActive,
    environment: flags.environment,
    gateAuthPath,
    gateCheck,
  };

  return {
    effectiveUserVisibleAllowed: effectiveAllowed,
    wouldAllowWithoutV60rBlock: wouldAllow,
    blockedReason,
    fallbackToLegacy: !effectiveAllowed,
    gateAuthPath,
    gateCheck,
    redactedDiagnostics,
  };
}
