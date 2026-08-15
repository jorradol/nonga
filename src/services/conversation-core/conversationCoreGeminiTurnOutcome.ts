/**
 * WP-V2U-03E2A — Gemini structured turn outcome (proposal contract only).
 *
 * Gemini may propose only tool intent, tool name, and untrusted tool input.
 * The server must mint requestId, bind conversationId, create trusted binding,
 * verify the Phase 1 allowlist, call validateToolRequest, select registry/timeout,
 * and mint provenance. This contract does not trust Gemini-proposed tool input.
 */

import {
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  fail,
  isForbiddenToolName,
  isPhase1ReadOnlyToolName,
  isPlainObject,
  issue,
  rejectUnknownKeys,
  requireString,
  type ConversationCoreToolName,
  type ValidationIssue,
  type ValidationResult,
} from "./conversationTurnInput";

export const CONVERSATION_CORE_GEMINI_TURN_OUTCOME_KINDS = [
  "final-answer",
  "tool-request",
] as const;

export type ConversationCoreGeminiTurnOutcomeKind =
  (typeof CONVERSATION_CORE_GEMINI_TURN_OUTCOME_KINDS)[number];

export interface ConversationCoreGeminiFinalAnswerOutcome {
  kind: "final-answer";
  assistantText: string;
}

export interface ConversationCoreGeminiToolRequestOutcome {
  kind: "tool-request";
  toolName: ConversationCoreToolName;
  /** Untrusted proposal — server validates via validateToolRequest after binding. */
  toolInput: Record<string, unknown>;
}

export type ConversationCoreGeminiTurnOutcome =
  | ConversationCoreGeminiFinalAnswerOutcome
  | ConversationCoreGeminiToolRequestOutcome;

/** Outer fields owned by the server — rejected when Gemini proposes them. */
export const GEMINI_TURN_OUTCOME_SERVER_OWNED_KEYS = [
  "requestId",
  "conversationId",
  "trustedBinding",
  "trustedToolAllowlist",
  "registry",
  "timeoutMs",
  "provenance",
  "toolResult",
  "toolResultsUsed",
  "groundedFactRefs",
  "workspaceActions",
] as const;

const FINAL_ANSWER_ALLOWED_KEYS = new Set(["kind", "assistantText"]);
const TOOL_REQUEST_ALLOWED_KEYS = new Set(["kind", "toolName", "toolInput"]);
const ALL_OUTCOME_FIELD_KEYS = new Set([
  ...FINAL_ANSWER_ALLOWED_KEYS,
  ...TOOL_REQUEST_ALLOWED_KEYS,
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasToolRequestFields(raw: Record<string, unknown>): boolean {
  return raw.toolName !== undefined || raw.toolInput !== undefined;
}

function hasFinalAnswerFields(raw: Record<string, unknown>): boolean {
  return raw.assistantText !== undefined;
}

function hasMixedOutcomeFields(raw: Record<string, unknown>): boolean {
  return hasFinalAnswerFields(raw) && hasToolRequestFields(raw);
}

function parseOutcomeKind(
  raw: unknown,
  issues: ValidationIssue[]
): ConversationCoreGeminiTurnOutcomeKind | null {
  if (raw === undefined) {
    issues.push(issue("kind", "invalid_type", "Outcome kind is required"));
    return null;
  }
  if (typeof raw !== "string") {
    issues.push(issue("kind", "invalid_type", "Outcome kind must be a string"));
    return null;
  }
  const kind = raw.trim();
  if (!(CONVERSATION_CORE_GEMINI_TURN_OUTCOME_KINDS as readonly string[]).includes(kind)) {
    issues.push(issue("kind", "unknown_outcome_kind", "Outcome kind is not recognized"));
    return null;
  }
  return kind as ConversationCoreGeminiTurnOutcomeKind;
}

function parseGeminiToolName(
  raw: unknown,
  issues: ValidationIssue[]
): ConversationCoreToolName | null {
  if (raw === undefined) {
    issues.push(issue("toolName", "invalid_type", "Tool name is required"));
    return null;
  }
  if (typeof raw !== "string") {
    issues.push(issue("toolName", "invalid_type", "Tool name must be a string"));
    return null;
  }
  const toolName = raw.trim();
  if (!toolName) {
    issues.push(issue("toolName", "empty_string", "Tool name is required"));
    return null;
  }
  if (isForbiddenToolName(toolName)) {
    issues.push(issue("toolName", "forbidden_tool", "Tool is not allowed in Phase 1"));
    return null;
  }
  if (!isPhase1ReadOnlyToolName(toolName)) {
    issues.push(issue("toolName", "unknown_tool", "Tool name is not in the read-only allowlist"));
    return null;
  }
  return toolName;
}

function parseUntrustedToolInput(
  raw: unknown,
  issues: ValidationIssue[]
): Record<string, unknown> | null {
  if (raw === undefined) {
    issues.push(issue("toolInput", "invalid_tool_input", "Tool input must be a plain object"));
    return null;
  }
  if (!isPlainRecord(raw)) {
    issues.push(issue("toolInput", "invalid_tool_input", "Tool input must be a plain object"));
    return null;
  }
  return raw;
}

export function validateConversationCoreGeminiTurnOutcome(
  raw: unknown
): ValidationResult<ConversationCoreGeminiTurnOutcome> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([issue("$", "invalid_outcome_object", "Gemini turn outcome must be an object")]);
  }

  if (hasMixedOutcomeFields(raw)) {
    issues.push(
      issue(
        "$",
        "mixed_outcome_fields",
        "Final answer and tool request fields cannot be combined"
      )
    );
  }

  const kind = parseOutcomeKind(raw.kind, issues);

  if (kind === "final-answer") {
    rejectUnknownKeys(raw, FINAL_ANSWER_ALLOWED_KEYS, "$", issues);
    const assistantText = requireString(raw.assistantText, "assistantText", issues, {
      maxLength: CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
    });
    if (issues.length > 0 || !assistantText) {
      return fail(issues);
    }
    return {
      ok: true,
      value: { kind: "final-answer", assistantText },
    };
  }

  if (kind === "tool-request") {
    rejectUnknownKeys(raw, TOOL_REQUEST_ALLOWED_KEYS, "$", issues);
    const toolName = parseGeminiToolName(raw.toolName, issues);
    const toolInput = toolName ? parseUntrustedToolInput(raw.toolInput, issues) : null;
    if (issues.length > 0 || !toolName || !toolInput) {
      return fail(issues);
    }
    return {
      ok: true,
      value: { kind: "tool-request", toolName, toolInput },
    };
  }

  rejectUnknownKeys(raw, ALL_OUTCOME_FIELD_KEYS, "$", issues);
  return fail(issues);
}
