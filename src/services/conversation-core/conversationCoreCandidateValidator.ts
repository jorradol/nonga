/**
 * WP-V2U-03C2 / R1 — Pure candidate-response composer for typography, safety, and high-risk validators.
 * Not a runtime orchestrator. Does not select lanes, call providers, or rewrite answers.
 */

import {
  CONVERSATION_CORE_POLICY_LANE_IDS,
  type ConversationCorePolicyLane,
} from "./conversationCorePolicyLanes";
import {
  validateConversationCoreHighRisk,
  type ConversationCoreHighRiskIssue,
} from "./conversationCoreHighRiskValidator";
import {
  validateConversationCoreSafety,
  type ConversationCoreSafetyIssue,
} from "./conversationCoreSafetyValidator";
import {
  validateConversationCoreTypography,
  type ConversationCoreTypographyIssue,
} from "./conversationCoreTypographyValidator";

export const CONVERSATION_CORE_CANDIDATE_OUTCOMES = [
  "accept",
  "correction-required",
  "reject",
] as const;

export type ConversationCoreCandidateOutcome =
  (typeof CONVERSATION_CORE_CANDIDATE_OUTCOMES)[number];

export const CONVERSATION_CORE_CANDIDATE_OUTCOME_PRECEDENCE = [
  "reject",
  "correction-required",
  "accept",
] as const;

export const CONVERSATION_CORE_CANDIDATE_ISSUE_CATEGORIES = [
  "candidate",
  "typography",
  "safety",
  "high-risk",
] as const;

export type ConversationCoreCandidateIssueCategory =
  (typeof CONVERSATION_CORE_CANDIDATE_ISSUE_CATEGORIES)[number];

export const CONVERSATION_CORE_CANDIDATE_ISSUE_CODES = [
  "candidate.invalid_input",
  "candidate.unknown_field",
  "candidate.invalid_candidate_text",
  "candidate.invalid_context",
  "candidate.unknown_context_field",
  "candidate.invalid_policy_lane",
  "candidate.invalid_high_risk_topic_declared",
  "candidate.invalid_trusted_authoritative_context",
] as const;

export type ConversationCoreCandidateIssueCode =
  (typeof CONVERSATION_CORE_CANDIDATE_ISSUE_CODES)[number];

export type ConversationCoreComposedIssueCode =
  | ConversationCoreCandidateIssueCode
  | ConversationCoreTypographyIssue["code"]
  | ConversationCoreSafetyIssue["code"]
  | ConversationCoreHighRiskIssue["code"];

export interface ConversationCoreCandidateIssue {
  readonly code: ConversationCoreComposedIssueCode;
  readonly category: ConversationCoreCandidateIssueCategory;
  readonly outcome: ConversationCoreCandidateOutcome;
  readonly description: string;
}

export interface ConversationCoreCandidateValidationContext {
  readonly policyLane: ConversationCorePolicyLane;
  readonly highRiskTopicDeclared?: boolean;
  readonly hasTrustedAuthoritativeContext?: boolean;
}

export interface ConversationCoreCandidateValidationInput {
  readonly candidateText: string;
  readonly context: ConversationCoreCandidateValidationContext;
}

export interface ConversationCoreCandidateValidationResult {
  readonly outcome: ConversationCoreCandidateOutcome;
  readonly issues: readonly ConversationCoreCandidateIssue[];
}

const OUTCOME_RANK: Record<ConversationCoreCandidateOutcome, number> = {
  accept: 0,
  "correction-required": 1,
  reject: 2,
};

const INPUT_ALLOWED_KEYS = new Set(["candidateText", "context"]);
const CONTEXT_ALLOWED_KEYS = new Set([
  "policyLane",
  "highRiskTopicDeclared",
  "hasTrustedAuthoritativeContext",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function candidateIssue(
  code: ConversationCoreCandidateIssueCode,
  description: string
): ConversationCoreCandidateIssue {
  return Object.freeze({
    code,
    category: "candidate",
    outcome: "reject" as const,
    description,
  });
}

function worstOutcome(
  issues: readonly ConversationCoreCandidateIssue[]
): ConversationCoreCandidateOutcome {
  let outcome: ConversationCoreCandidateOutcome = "accept";
  for (const item of issues) {
    if (OUTCOME_RANK[item.outcome] > OUTCOME_RANK[outcome]) {
      outcome = item.outcome;
    }
  }
  return outcome;
}

function appendUnique(
  target: ConversationCoreCandidateIssue[],
  seen: Set<string>,
  incoming: readonly ConversationCoreCandidateIssue[]
): void {
  for (const item of incoming) {
    if (seen.has(item.code)) {
      continue;
    }
    seen.add(item.code);
    target.push(item);
  }
}

function asCandidateIssues(
  issues: readonly (
    | ConversationCoreTypographyIssue
    | ConversationCoreSafetyIssue
    | ConversationCoreHighRiskIssue
  )[]
): ConversationCoreCandidateIssue[] {
  return issues.map((item) =>
    Object.freeze({
      code: item.code,
      category: item.category,
      outcome: item.outcome,
      description: item.description,
    })
  );
}

function hasUnknownKeys(
  raw: Record<string, unknown>,
  allowed: ReadonlySet<string>
): boolean {
  return Object.keys(raw).some((key) => !allowed.has(key));
}

function optionalBooleanFlag(
  raw: Record<string, unknown>,
  key: "highRiskTopicDeclared" | "hasTrustedAuthoritativeContext"
): { present: boolean; valid: boolean; value?: boolean } {
  if (!Object.prototype.hasOwnProperty.call(raw, key)) {
    return { present: false, valid: true };
  }
  const value = raw[key];
  if (typeof value !== "boolean") {
    return { present: true, valid: false };
  }
  return { present: true, valid: true, value };
}

function shouldRunHighRisk(context: ConversationCoreCandidateValidationContext): boolean {
  return (
    context.policyLane === "high-risk-automotive" ||
    context.highRiskTopicDeclared === true
  );
}

function freezeResult(
  issues: ConversationCoreCandidateIssue[]
): ConversationCoreCandidateValidationResult {
  return Object.freeze({
    outcome: worstOutcome(issues),
    issues: Object.freeze(issues),
  });
}

/**
 * Compose pure typography, safety, and high-risk validation.
 * High-risk checks run only when the server-owned lane or declared topic says so.
 */
export function validateConversationCoreCandidate(
  input: ConversationCoreCandidateValidationInput
): ConversationCoreCandidateValidationResult {
  const issues: ConversationCoreCandidateIssue[] = [];
  const seen = new Set<string>();

  if (!isPlainObject(input)) {
    issues.push(candidateIssue("candidate.invalid_input", "Candidate input must be an object"));
    return freezeResult(issues);
  }

  if (hasUnknownKeys(input, INPUT_ALLOWED_KEYS)) {
    appendUnique(issues, seen, [
      candidateIssue(
        "candidate.unknown_field",
        "Unknown candidate input field is not allowed"
      ),
    ]);
  }

  if (typeof input.candidateText !== "string") {
    appendUnique(issues, seen, [
      candidateIssue("candidate.invalid_candidate_text", "Candidate text must be a string"),
    ]);
    return freezeResult(issues);
  }

  if (!isPlainObject(input.context)) {
    appendUnique(issues, seen, [
      candidateIssue(
        "candidate.invalid_context",
        "Validation context must be a server-owned object"
      ),
    ]);
    return freezeResult(issues);
  }

  const rawContext = input.context;

  if (hasUnknownKeys(rawContext, CONTEXT_ALLOWED_KEYS)) {
    appendUnique(issues, seen, [
      candidateIssue(
        "candidate.unknown_context_field",
        "Unknown validation context field is not allowed"
      ),
    ]);
  }

  const policyLane = rawContext.policyLane;
  if (typeof policyLane !== "string") {
    appendUnique(issues, seen, [
      candidateIssue(
        "candidate.invalid_policy_lane",
        "Policy lane must be a server-owned lane id"
      ),
    ]);
    return freezeResult(issues);
  }
  if (!(CONVERSATION_CORE_POLICY_LANE_IDS as readonly string[]).includes(policyLane)) {
    appendUnique(issues, seen, [
      candidateIssue("candidate.invalid_policy_lane", "Policy lane is not a known server lane"),
    ]);
    return freezeResult(issues);
  }

  const declared = optionalBooleanFlag(rawContext, "highRiskTopicDeclared");
  if (!declared.valid) {
    appendUnique(issues, seen, [
      candidateIssue(
        "candidate.invalid_high_risk_topic_declared",
        "highRiskTopicDeclared must be a boolean when provided"
      ),
    ]);
    return freezeResult(issues);
  }

  const trusted = optionalBooleanFlag(rawContext, "hasTrustedAuthoritativeContext");
  if (!trusted.valid) {
    appendUnique(issues, seen, [
      candidateIssue(
        "candidate.invalid_trusted_authoritative_context",
        "hasTrustedAuthoritativeContext must be a boolean when provided"
      ),
    ]);
    return freezeResult(issues);
  }

  if (issues.length > 0) {
    return freezeResult(issues);
  }

  const context: ConversationCoreCandidateValidationContext = {
    policyLane: policyLane as ConversationCorePolicyLane,
    ...(declared.present ? { highRiskTopicDeclared: declared.value } : {}),
    ...(trusted.present ? { hasTrustedAuthoritativeContext: trusted.value } : {}),
  };

  const typography = validateConversationCoreTypography({
    candidateText: input.candidateText,
  });
  appendUnique(issues, seen, asCandidateIssues(typography.issues));

  const safety = validateConversationCoreSafety({
    candidateText: input.candidateText,
  });
  appendUnique(issues, seen, asCandidateIssues(safety.issues));

  if (shouldRunHighRisk(context)) {
    const highRisk = validateConversationCoreHighRisk({
      candidateText: input.candidateText,
      context,
    });
    appendUnique(issues, seen, asCandidateIssues(highRisk.issues));
  }

  return freezeResult(issues);
}
