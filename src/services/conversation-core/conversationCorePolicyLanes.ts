/**
 * WP-V2U-03C1 — Policy lane types and immutable definitions (no classifier).
 */

export const CONVERSATION_CORE_POLICY_LANE_IDS = [
  "general-consultative",
  "authoritative-data",
  "high-risk-automotive",
  "write-action-blocked",
] as const;

export type ConversationCorePolicyLane =
  (typeof CONVERSATION_CORE_POLICY_LANE_IDS)[number];

export type ConversationCoreProviderPolicy =
  | "allowed-future"
  | "allowed-after-trusted-tools"
  | "allowed-after-safety-precheck"
  | "disallowed-for-action";

export type ConversationCoreToolRequirement =
  | "not-inherently-required"
  | "read-only-required"
  | "required-when-authoritative-claim"
  | "write-blocked";

export type ConversationCoreValidatorPolicy =
  | "standard-output-validation"
  | "safety-and-high-risk-required"
  | "trusted-tool-grounding-required"
  | "action-blocked";

export type ConversationCoreWorkspaceActionPolicy =
  | "disallowed"
  | "allowed-from-trusted-tool-results-future"
  | "blocked";

export type ConversationCoreLaneFailureBehavior =
  | "honest-unavailable"
  | "fail-closed-without-trusted-tools"
  | "safe-fallback-or-honest-unavailable"
  | "explicit-blocked";

export interface ConversationCorePolicyLaneDefinition {
  readonly lane: ConversationCorePolicyLane;
  readonly providerPolicy: ConversationCoreProviderPolicy;
  readonly toolRequirement: ConversationCoreToolRequirement;
  readonly validatorPolicy: ConversationCoreValidatorPolicy;
  readonly workspaceActionPolicy: ConversationCoreWorkspaceActionPolicy;
  readonly failureBehavior: ConversationCoreLaneFailureBehavior;
  readonly summary: string;
}

const GENERAL_CONSULTATIVE_DEFINITION: ConversationCorePolicyLaneDefinition =
  Object.freeze({
    lane: "general-consultative",
    providerPolicy: "allowed-future",
    toolRequirement: "not-inherently-required",
    validatorPolicy: "standard-output-validation",
    workspaceActionPolicy: "disallowed",
    failureBehavior: "honest-unavailable",
    summary:
      "General consultative conversation; no marketplace or sales template required.",
  });

const AUTHORITATIVE_DATA_DEFINITION: ConversationCorePolicyLaneDefinition =
  Object.freeze({
    lane: "authoritative-data",
    providerPolicy: "allowed-after-trusted-tools",
    toolRequirement: "read-only-required",
    validatorPolicy: "trusted-tool-grounding-required",
    workspaceActionPolicy: "allowed-from-trusted-tool-results-future",
    failureBehavior: "fail-closed-without-trusted-tools",
    summary:
      "Authoritative business facts require verified read-only tool results before provider use.",
  });

const HIGH_RISK_AUTOMOTIVE_DEFINITION: ConversationCorePolicyLaneDefinition =
  Object.freeze({
    lane: "high-risk-automotive",
    providerPolicy: "allowed-after-safety-precheck",
    toolRequirement: "required-when-authoritative-claim",
    validatorPolicy: "safety-and-high-risk-required",
    workspaceActionPolicy: "disallowed",
    failureBehavior: "safe-fallback-or-honest-unavailable",
    summary:
      "High-risk automotive topics require safety precheck and high-risk validators.",
  });

const WRITE_ACTION_BLOCKED_DEFINITION: ConversationCorePolicyLaneDefinition =
  Object.freeze({
    lane: "write-action-blocked",
    providerPolicy: "disallowed-for-action",
    toolRequirement: "write-blocked",
    validatorPolicy: "action-blocked",
    workspaceActionPolicy: "blocked",
    failureBehavior: "explicit-blocked",
    summary: "Posting, lead, and write tools or workspace actions are blocked.",
  });

export const CONVERSATION_CORE_POLICY_LANE_DEFINITIONS: Readonly<
  Record<ConversationCorePolicyLane, ConversationCorePolicyLaneDefinition>
> = Object.freeze({
  "general-consultative": GENERAL_CONSULTATIVE_DEFINITION,
  "authoritative-data": AUTHORITATIVE_DATA_DEFINITION,
  "high-risk-automotive": HIGH_RISK_AUTOMOTIVE_DEFINITION,
  "write-action-blocked": WRITE_ACTION_BLOCKED_DEFINITION,
});

/**
 * Lookup immutable lane definition by lane id.
 * Not a message/history classifier — runtime must select lane elsewhere in later WPs.
 */
export function getConversationCorePolicyLaneDefinition(
  lane: ConversationCorePolicyLane
): ConversationCorePolicyLaneDefinition {
  return CONVERSATION_CORE_POLICY_LANE_DEFINITIONS[lane];
}
