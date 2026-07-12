/**
 * Epic B — Single AI-first buyer conversation path (grounding reuse + provider default).
 * Deterministic/template layers remain fallback-only when provider unavailable.
 */
import {
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
  resolveSalesBrainRuntimeFlags,
  type SalesBrainRuntimeEnvironment,
} from "./salesBrainRuntimeFlags";
import {
  evaluateUserVisibleGate,
  type UserVisibleGateResult,
} from "./salesBrainUserVisibleGate";
import { evaluateUserVisibleRealProviderEligibility } from "./salesBrainUserVisibleRealProvider";
import type { SalesBrainUserRole } from "./salesBrainTypes";

export const BUYER_AI_FIRST_CONVERSATION_SLICE_ID = "epic-b-ai-first";

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export interface BuyerAiFirstEligibilityInput {
  firebaseUid?: string | null;
  userRole: SalesBrainUserRole;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
}

export interface BuyerAiFirstEligibility {
  /** Provider generation should be attempted as the primary response path. */
  aiFirstPathActive: boolean;
  /** Mock pilot / template polish must not run before provider attempt. */
  skipMockPilotCopy: boolean;
  /** Real Gemini network call is permitted when other gates pass. */
  realProviderAttemptAllowed: boolean;
  gateReason: string;
  userVisibleGate?: UserVisibleGateResult;
}

/**
 * Resolve whether this buyer turn should use the consolidated AI-first path.
 * Requires allowlist + AI-first flags + real-provider flag (staging/local only).
 */
export function evaluateBuyerAiFirstEligibility(
  input: BuyerAiFirstEligibilityInput
): BuyerAiFirstEligibility {
  const readEnv =
    input.readEnv ??
    ((key: string) => input.env?.[key] as string | undefined);
  const environment = input.environment ?? "local";

  if (input.userRole !== "buyer") {
    return {
      aiFirstPathActive: false,
      skipMockPilotCopy: false,
      realProviderAttemptAllowed: false,
      gateReason: "user_role_not_buyer",
    };
  }

  const flags = resolveSalesBrainRuntimeFlags({
    environment,
    env: input.env,
    readEnv,
  });

  const userVisibleGate = evaluateUserVisibleGate({
    firebaseUid: input.firebaseUid,
    environment,
    env: input.env,
    readEnv,
    runtimeFlags: flags,
  });

  const aiFirstFlagOn = parseTruthy(readEnv(NONGA_AI_FIRST_ENABLED_ENV));
  const ownerUxOn = parseTruthy(readEnv(NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV));
  const realProviderFlagOn = parseTruthy(
    readEnv(NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV)
  );

  const realProviderEligibility = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: input.firebaseUid,
    userRole: input.userRole,
    environment,
    env: input.env,
    readEnv,
    userVisibleGate,
  });

  const prerequisitesOk =
    flags.userVisibleEnabled &&
    userVisibleGate.effectiveUserVisibleAllowed &&
    aiFirstFlagOn &&
    ownerUxOn &&
    realProviderFlagOn;

  if (!prerequisitesOk) {
    const reason = !userVisibleGate.effectiveUserVisibleAllowed
      ? userVisibleGate.blockedReason
      : !aiFirstFlagOn
        ? "ai_first_disabled"
        : !ownerUxOn
          ? "owner_only_controlled_ux_flag_off"
          : !realProviderFlagOn
            ? "real_provider_flag_off"
            : "user_visible_disabled";
    return {
      aiFirstPathActive: false,
      skipMockPilotCopy: false,
      realProviderAttemptAllowed: false,
      gateReason: reason,
      userVisibleGate,
    };
  }

  return {
    aiFirstPathActive: true,
    skipMockPilotCopy: true,
    realProviderAttemptAllowed: realProviderEligibility.eligible,
    gateReason: realProviderEligibility.gateReason,
    userVisibleGate,
  };
}

/** Client-side: signed-in buyer turns should always hit the server bridge (gate is server-side). */
export function shouldInvokeBuyerConversationServerBridge(input: {
  isSignedIn: boolean;
  userRole: SalesBrainUserRole;
  userMessage: string;
  isSellerListingAction?: boolean;
  isSellIntent?: boolean;
}): boolean {
  if (!input.isSignedIn || !input.userMessage.trim()) return false;
  if (input.userRole !== "buyer") return false;
  if (input.isSellerListingAction || input.isSellIntent) return false;
  return true;
}
