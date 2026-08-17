/**
 * WP-V2U-03E2D2C2C2C-R1 — Server-side Conversation Core pilot eligibility.
 * Reuses canonical Firebase auth UID + evaluateAiFirstAllowlist.
 * Dedicated allowlist env defaults empty. No client/Gemini self-enrollment.
 * Never logs identity or PII.
 */
import { evaluateAiFirstAllowlist } from "../../config/ai-first-allowlist";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../../services/ai/salesBrainRuntimeFlags";

export const NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV =
  "NONGA_CONVERSATION_CORE_PILOT_UIDS";

const STAGING_LOCAL_EXTRA_UID_ENV_KEYS = [
  "NONGA_TEST_ADMIN_UID",
  "NONGA_STAGING_ADMIN_UID",
  "NONGA_TEST_MEMBER_UID",
  "NONGA_TEST_DEALER_UID",
  "NONGA_INTERNAL_TESTER_UIDS",
] as const;

export type ConversationCorePilotEligibilityReason =
  | "eligible"
  | "unauthenticated"
  | "allowlist-empty"
  | "not-allowlisted";

export interface ConversationCorePilotEligibilityResult {
  readonly eligible: boolean;
  readonly reason: ConversationCorePilotEligibilityReason;
}

function conversationCorePilotReadEnv(
  readEnv: (key: string) => string | undefined
): (key: string) => string | undefined {
  return (key: string) => {
    if (key === NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV) {
      return readEnv(NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV);
    }
    if (
      (STAGING_LOCAL_EXTRA_UID_ENV_KEYS as readonly string[]).includes(key)
    ) {
      return undefined;
    }
    return readEnv(key);
  };
}

function mapBlockedReason(
  blockedReason: string
): Exclude<ConversationCorePilotEligibilityReason, "eligible"> {
  if (blockedReason === "guest_uid_missing") {
    return "unauthenticated";
  }
  if (blockedReason === "allowlist_empty") {
    return "allowlist-empty";
  }
  return "not-allowlisted";
}

/**
 * Flags do not grant access. Only a server-verified authenticated actor
 * present on the dedicated, default-empty server allowlist is eligible.
 */
export function evaluateConversationCorePilotEligibility(input: {
  readonly authenticatedActorRef: string;
  readonly readEnv: (key: string) => string | undefined;
}): ConversationCorePilotEligibilityResult {
  const evaluation = evaluateAiFirstAllowlist({
    firebaseUid: input.authenticatedActorRef,
    environment: "production",
    readEnv: conversationCorePilotReadEnv(input.readEnv),
  });
  if (evaluation.allowed) {
    return { eligible: true, reason: "eligible" };
  }
  return {
    eligible: false,
    reason: mapBlockedReason(evaluation.blockedReason),
  };
}
