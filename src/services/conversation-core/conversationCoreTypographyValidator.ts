/**
 * WP-V2U-03C2 — Pure typography validator for candidate assistant responses.
 * Detects presentation hazards only. Does not rewrite meaning or build a corrected reply.
 */

import { containsHtmlOrScript } from "./conversationTurnInput";

export const CONVERSATION_CORE_TYPOGRAPHY_ISSUE_CODES = [
  "typography.invalid_input",
  "typography.empty_response",
  "typography.null_byte",
  "typography.control_characters",
  "typography.bidi_override",
  "typography.zero_width",
  "typography.replacement_or_mojibake",
  "typography.raw_latex",
  "typography.unclosed_code_fence",
  "typography.raw_html_or_script",
] as const;

export type ConversationCoreTypographyIssueCode =
  (typeof CONVERSATION_CORE_TYPOGRAPHY_ISSUE_CODES)[number];

export type ConversationCoreCandidateIssueOutcome =
  | "accept"
  | "correction-required"
  | "reject";

export interface ConversationCoreTypographyIssue {
  readonly code: ConversationCoreTypographyIssueCode;
  readonly category: "typography";
  readonly outcome: ConversationCoreCandidateIssueOutcome;
  readonly description: string;
}

export interface ConversationCoreTypographyValidationInput {
  readonly candidateText: string;
}

export interface ConversationCoreTypographyValidationResult {
  readonly outcome: ConversationCoreCandidateIssueOutcome;
  readonly issues: readonly ConversationCoreTypographyIssue[];
}

const BIDI_OVERRIDE_OR_ISOLATE_RE = /[\u202A-\u202E\u2066-\u2069]/;
const ZERO_WIDTH_RISK_RE = /[\u200B\u200C\u2060\uFEFF]/;
const CONTROL_CHAR_RE = /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
const REPLACEMENT_CHAR = "\uFFFD";
const LATEX_COMMAND_RE = /\\(?:rightarrow|leftarrow|frac|times|div|approx|geq?|leq?)\b/;
const LATEX_PARENS_RE = /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/;
const LATEX_DOLLAR_PAIR_RE = /\$([^$\n]{1,120})\$/g;

const OUTCOME_RANK: Record<ConversationCoreCandidateIssueOutcome, number> = {
  accept: 0,
  "correction-required": 1,
  reject: 2,
};

function issue(
  code: ConversationCoreTypographyIssueCode,
  outcome: ConversationCoreCandidateIssueOutcome,
  description: string
): ConversationCoreTypographyIssue {
  return Object.freeze({
    code,
    category: "typography",
    outcome,
    description,
  });
}

function worstOutcome(
  issues: readonly ConversationCoreTypographyIssue[]
): ConversationCoreCandidateIssueOutcome {
  let outcome: ConversationCoreCandidateIssueOutcome = "accept";
  for (const item of issues) {
    if (OUTCOME_RANK[item.outcome] > OUTCOME_RANK[outcome]) {
      outcome = item.outcome;
    }
  }
  return outcome;
}

function normalizeLineEndingsForScan(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function hasUnclosedCodeFence(text: string): boolean {
  const normalized = normalizeLineEndingsForScan(text);
  const fenceCount = (normalized.match(/^```/gm) ?? []).length;
  if (fenceCount % 2 === 1) {
    return true;
  }
  const inlineTicks = normalized.split("`").length - 1;
  return inlineTicks > 0 && inlineTicks % 2 === 1 && fenceCount === 0;
}

function isCurrencyAmount(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed || /[\\^_{}A-Za-z]/.test(trimmed)) {
    return false;
  }
  return /^\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$/.test(trimmed) || /^\d+(?:\.\d{1,2})?$/.test(trimmed);
}

function hasRawLatex(text: string): boolean {
  if (LATEX_COMMAND_RE.test(text) || LATEX_PARENS_RE.test(text)) {
    return true;
  }
  const dollarRe = new RegExp(LATEX_DOLLAR_PAIR_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = dollarRe.exec(text)) !== null) {
    const inner = match[1] ?? "";
    if (isCurrencyAmount(inner)) {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * Scan candidate assistant text for typography hazards.
 * Does not mutate input. Does not emit a rewritten response.
 */
export function validateConversationCoreTypography(
  input: ConversationCoreTypographyValidationInput
): ConversationCoreTypographyValidationResult {
  const issues: ConversationCoreTypographyIssue[] = [];

  if (!input || typeof input.candidateText !== "string") {
    issues.push(
      issue(
        "typography.invalid_input",
        "reject",
        "Candidate text must be a string"
      )
    );
    return Object.freeze({ outcome: "reject", issues: Object.freeze(issues) });
  }

  const text = input.candidateText;

  if (text.trim().length === 0) {
    issues.push(
      issue("typography.empty_response", "reject", "Candidate response is empty")
    );
  }

  if (text.includes("\u0000")) {
    issues.push(
      issue("typography.null_byte", "reject", "Null byte is not allowed")
    );
  }

  if (CONTROL_CHAR_RE.test(text)) {
    issues.push(
      issue(
        "typography.control_characters",
        "reject",
        "Disallowed control characters are present"
      )
    );
  }

  if (BIDI_OVERRIDE_OR_ISOLATE_RE.test(text)) {
    issues.push(
      issue(
        "typography.bidi_override",
        "reject",
        "Bidirectional override or isolate characters are present"
      )
    );
  }

  if (ZERO_WIDTH_RISK_RE.test(text)) {
    issues.push(
      issue(
        "typography.zero_width",
        "correction-required",
        "Unnecessary or spoof-risk zero-width characters are present"
      )
    );
  }

  if (text.includes(REPLACEMENT_CHAR) || /(?:Ã.|Â.){2,}/.test(text)) {
    issues.push(
      issue(
        "typography.replacement_or_mojibake",
        "correction-required",
        "Replacement character or mojibake indicator is present"
      )
    );
  }

  if (hasRawLatex(text)) {
    issues.push(
      issue(
        "typography.raw_latex",
        "correction-required",
        "Raw LaTeX delimiter or command should not reach the user"
      )
    );
  }

  if (hasUnclosedCodeFence(text)) {
    issues.push(
      issue(
        "typography.unclosed_code_fence",
        "correction-required",
        "Markdown code fence is unclosed"
      )
    );
  }

  if (containsHtmlOrScript(text)) {
    issues.push(
      issue(
        "typography.raw_html_or_script",
        "reject",
        "Raw HTML or script-like markup is not allowed"
      )
    );
  }

  return Object.freeze({
    outcome: worstOutcome(issues),
    issues: Object.freeze(issues),
  });
}
