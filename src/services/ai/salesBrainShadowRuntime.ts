/**
 * v6.0R — Shadow runtime using env flags (mock evaluation only — user-visible legacy).
 * v6.0V — wired via salesBrainShadowChatPath (legacy user-visible unchanged).
 */
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import {
  resolveSalesBrainRuntimeFlags,
  type SalesBrainRuntimeEnvironment,
  type SalesBrainRuntimeFlags,
} from "./salesBrainRuntimeFlags";
import {
  evaluateSalesBrainShadowMode,
  type SalesBrainShadowEvaluation,
  type SalesBrainShadowInput,
} from "./salesBrainShadowMode";

export type {
  SalesBrainRuntimeEnvironment,
  SalesBrainRuntimeFlags,
} from "./salesBrainRuntimeFlags";

export {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  SALES_BRAIN_RUNTIME_FLAG_ENV_KEYS,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
  resolveSalesBrainRuntimeFlags,
} from "./salesBrainRuntimeFlags";

export interface SalesBrainShadowRuntimeInput
  extends Omit<
    SalesBrainShadowInput,
    "shadowModeEnabled" | "environment" | "aiMode" | "aiFirstEnabled" | "emergencyKillSwitch"
  > {
  environment?: SalesBrainRuntimeEnvironment;
  env?: Partial<NodeJS.ProcessEnv> | Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
}

export interface SalesBrainShadowRuntimeResult extends SalesBrainShadowEvaluation {
  runtimeFlags: SalesBrainRuntimeFlags;
  userVisibleBlockedReason?: string;
}

/** Redacted flag summary for debug logs — no secret values, no raw PII */
export function summarizeShadowRuntimeFlags(flags: SalesBrainRuntimeFlags): string {
  return redactPiiForSalesBrainLog(
    JSON.stringify({
      provider: flags.provider,
      mode: flags.mode,
      shadow: flags.shadowModeEnabled,
      userVisible: flags.userVisibleEnabled,
      killSwitch: flags.emergencyKillSwitch,
      budgetsConfigured:
        flags.budgetDailyLimit !== null && flags.budgetMonthlyLimit !== null,
    })
  );
}

/**
 * Evaluate shadow mode from runtime env flags — legacy user-visible response never replaced.
 */
export function evaluateSalesBrainShadowRuntime(
  input: SalesBrainShadowRuntimeInput
): SalesBrainShadowRuntimeResult {
  const flags = resolveSalesBrainRuntimeFlags({
    environment: input.environment,
    env: input.env,
    readEnv: input.readEnv,
  });

  const legacyUserVisibleResponse = input.legacyUserVisibleResponse;
  const userVisibleBlockedReason =
    flags.userVisibleRequested && !flags.userVisibleEnabled
      ? "user_visible_blocked_v60r"
      : undefined;

  if (!flags.shadowEvaluationAllowed) {
    return {
      shadowModeActive: false,
      skippedReason: flags.enablementBlockedReason ?? "runtime_flags_off",
      userVisibleResponse: legacyUserVisibleResponse,
      runtimeFlags: flags,
      userVisibleBlockedReason,
    };
  }

  const shadowEval = evaluateSalesBrainShadowMode({
    userMessage: input.userMessage,
    userRole: input.userRole,
    flowContext: input.flowContext,
    listingContext: input.listingContext,
    legacyUserVisibleResponse,
    shadowModeEnabled: flags.shadowModeEnabled,
    environment: input.environment ?? flags.environment,
    aiMode: flags.mode,
    aiFirstEnabled: flags.aiFirstEnabled,
    emergencyKillSwitch: flags.emergencyKillSwitch,
  });

  return {
    ...shadowEval,
    userVisibleResponse: legacyUserVisibleResponse,
    runtimeFlags: flags,
    userVisibleBlockedReason,
  };
}
