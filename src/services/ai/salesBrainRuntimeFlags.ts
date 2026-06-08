/**
 * v6.0R — Sales Brain runtime flag reader (env-only — no network, no secret values).
 */
import type { SalesBrainAiMode } from "./salesBrainTypes";

export const NONGA_AI_PROVIDER_ENV = "NONGA_AI_PROVIDER";
export const NONGA_AI_MODE_ENV = "NONGA_AI_MODE";
export const NONGA_AI_FIRST_ENABLED_ENV = "NONGA_AI_FIRST_ENABLED";
export const NONGA_AI_SHADOW_MODE_ENABLED_ENV = "NONGA_AI_SHADOW_MODE_ENABLED";
export const NONGA_AI_USER_VISIBLE_ENABLED_ENV = "NONGA_AI_USER_VISIBLE_ENABLED";
export const NONGA_AI_EMERGENCY_KILL_SWITCH_ENV = "NONGA_AI_EMERGENCY_KILL_SWITCH";
export const NONGA_AI_BUDGET_DAILY_LIMIT_ENV = "NONGA_AI_BUDGET_DAILY_LIMIT";
export const NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV = "NONGA_AI_BUDGET_MONTHLY_LIMIT";
/** v6.1H — admin-only shadow smoke real Gemini (default off) */
export const NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV =
  "NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED";

export const SALES_BRAIN_RUNTIME_FLAG_ENV_KEYS = [
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
] as const;

/** v6.0R — user-visible AI responses remain blocked until a future explicit slice */
export const SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED = true;

export type SalesBrainRuntimeEnvironment = "production" | "staging" | "local";

export type SalesBrainRuntimeProvider = "none" | "gemini";

export interface SalesBrainRuntimeFlags {
  provider: SalesBrainRuntimeProvider;
  mode: SalesBrainAiMode;
  aiFirstEnabled: boolean;
  shadowModeEnabled: boolean;
  /** Effective user-visible — v6.0R always false */
  userVisibleEnabled: boolean;
  /** Raw env request — for audit only */
  userVisibleRequested: boolean;
  emergencyKillSwitch: boolean;
  budgetDailyLimit: number | null;
  budgetMonthlyLimit: number | null;
  shadowEvaluationAllowed: boolean;
  enablementBlockedReason?: string;
  fallbackToDeterministic: boolean;
  environment: SalesBrainRuntimeEnvironment;
}

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function parseMode(raw: string | undefined): SalesBrainAiMode {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "off" || v === "low" || v === "standard" || v === "high") {
    return v;
  }
  return "off";
}

function parseProvider(raw: string | undefined): SalesBrainRuntimeProvider {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "gemini") {
    return "gemini";
  }
  return "none";
}

function parseBudget(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function offFlags(
  environment: SalesBrainRuntimeEnvironment,
  partial: Pick<
    SalesBrainRuntimeFlags,
    "userVisibleRequested" | "emergencyKillSwitch" | "budgetDailyLimit" | "budgetMonthlyLimit"
  > & {
    enablementBlockedReason: string;
  }
): SalesBrainRuntimeFlags {
  return {
    provider: "none",
    mode: "off",
    aiFirstEnabled: false,
    shadowModeEnabled: false,
    userVisibleEnabled: false,
    userVisibleRequested: partial.userVisibleRequested,
    emergencyKillSwitch: partial.emergencyKillSwitch,
    budgetDailyLimit: partial.budgetDailyLimit,
    budgetMonthlyLimit: partial.budgetMonthlyLimit,
    shadowEvaluationAllowed: false,
    enablementBlockedReason: partial.enablementBlockedReason,
    fallbackToDeterministic: true,
    environment,
  };
}

/**
 * Resolve Sales Brain runtime flags from env — safe defaults, production off, no secret reads.
 */
export function resolveSalesBrainRuntimeFlags(input: {
  env?: Partial<NodeJS.ProcessEnv> | Record<string, string | undefined>;
  environment?: SalesBrainRuntimeEnvironment;
  readEnv?: (key: string) => string | undefined;
} = {}): SalesBrainRuntimeFlags {
  const readEnv =
    input.readEnv ??
    ((key: string) => {
      const env = input.env ?? (typeof process !== "undefined" ? process.env : {});
      return env[key as keyof typeof env] as string | undefined;
    });
  const environment = input.environment ?? "local";

  const emergencyKillSwitch = parseTruthy(readEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV));
  const mode = parseMode(readEnv(NONGA_AI_MODE_ENV));
  const provider = parseProvider(readEnv(NONGA_AI_PROVIDER_ENV));
  const aiFirstEnabled = parseTruthy(readEnv(NONGA_AI_FIRST_ENABLED_ENV));
  const shadowModeRequested = parseTruthy(readEnv(NONGA_AI_SHADOW_MODE_ENABLED_ENV));
  const userVisibleRequested = parseTruthy(readEnv(NONGA_AI_USER_VISIBLE_ENABLED_ENV));
  const budgetDailyLimit = parseBudget(readEnv(NONGA_AI_BUDGET_DAILY_LIMIT_ENV));
  const budgetMonthlyLimit = parseBudget(readEnv(NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV));

  if (environment === "production") {
    return offFlags(environment, {
      userVisibleRequested,
      emergencyKillSwitch,
      budgetDailyLimit,
      budgetMonthlyLimit,
      enablementBlockedReason: "production_default_off",
    });
  }

  if (emergencyKillSwitch) {
    return offFlags(environment, {
      userVisibleRequested,
      emergencyKillSwitch: true,
      budgetDailyLimit,
      budgetMonthlyLimit,
      enablementBlockedReason: "emergency_kill_switch",
    });
  }

  let enablementBlockedReason: string | undefined;
  if (userVisibleRequested && SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED) {
    enablementBlockedReason = "user_visible_blocked_v60r";
  }

  const budgetsPresent = budgetDailyLimit !== null && budgetMonthlyLimit !== null;
  let shadowModeEnabled = false;
  let shadowEvaluationAllowed = false;

  if (shadowModeRequested && !(userVisibleRequested && SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED)) {
    if (provider !== "gemini") {
      enablementBlockedReason = enablementBlockedReason ?? "provider_not_gemini";
    } else if (!aiFirstEnabled) {
      enablementBlockedReason = enablementBlockedReason ?? "ai_first_disabled";
    } else if (mode === "off") {
      enablementBlockedReason = enablementBlockedReason ?? "ai_mode_off";
    } else if (!budgetsPresent) {
      enablementBlockedReason = enablementBlockedReason ?? "budget_caps_missing";
    } else {
      shadowModeEnabled = true;
      shadowEvaluationAllowed = true;
    }
  }

  return {
    provider,
    mode,
    aiFirstEnabled: shadowEvaluationAllowed ? aiFirstEnabled : false,
    shadowModeEnabled,
    userVisibleEnabled: false,
    userVisibleRequested,
    emergencyKillSwitch: false,
    budgetDailyLimit,
    budgetMonthlyLimit,
    shadowEvaluationAllowed,
    enablementBlockedReason,
    fallbackToDeterministic: !shadowEvaluationAllowed,
    environment,
  };
}
