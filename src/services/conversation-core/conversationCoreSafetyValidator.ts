/**
 * WP-V2U-03C2 — Pure general safety validator for candidate assistant responses.
 * Applies to every policy lane. Detects output hazards only. Does not classify user messages.
 */

export const CONVERSATION_CORE_SAFETY_ISSUE_CODES = [
  "safety.invalid_input",
  "safety.secret_leakage",
  "safety.system_instruction_disclosure",
  "safety.false_write_action_claim",
  "safety.html_or_executable_ui",
  "safety.boundary_bypass",
] as const;

export type ConversationCoreSafetyIssueCode =
  (typeof CONVERSATION_CORE_SAFETY_ISSUE_CODES)[number];

export type ConversationCoreSafetyIssueOutcome =
  | "accept"
  | "correction-required"
  | "reject";

export interface ConversationCoreSafetyIssue {
  readonly code: ConversationCoreSafetyIssueCode;
  readonly category: "safety";
  readonly outcome: ConversationCoreSafetyIssueOutcome;
  readonly description: string;
}

export interface ConversationCoreSafetyValidationInput {
  readonly candidateText: string;
}

export interface ConversationCoreSafetyValidationResult {
  readonly outcome: ConversationCoreSafetyIssueOutcome;
  readonly issues: readonly ConversationCoreSafetyIssue[];
}

const OUTCOME_RANK: Record<ConversationCoreSafetyIssueOutcome, number> = {
  accept: 0,
  "correction-required": 1,
  reject: 2,
};

const SECRET_LIKE_PATTERNS: readonly RegExp[] = [
  /AIza[0-9A-Za-z\-_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /sk-proj-[A-Za-z0-9\-_]{20,}/,
  /Bearer\s+[A-Za-z0-9\-._~+/]{24,}={0,2}/i,
  /(?:GEMINI_API_KEY|OPENAI_API_KEY|NONGA_AI_[A-Z0-9_]+)\s*[=:]\s*\S+/,
];

const HTML_EXECUTABLE_RE =
  /<\s*(?:script|iframe|object|embed|link|style|svg)\b|javascript\s*:|on(?:click|error|load)\s*=/i;

const PROTECTED_INTERNAL_RE =
  /system\s*(?:instruction|prompt)|คำสั่งระบบ|developer\s*instruction/i;

const INTRO_MARKER_RE = /นี่คือ|ต่อไปนี้คือ|ดังนี้คือ|here (?:is|are)|the following is/gi;

const EXPLANATION_AFTER_INTRO_RE =
  /^\s*(?:คำอธิบาย|ความหมาย|ตัวอย่าง|คำว่า|an?\s+(?:explanation|meaning|example|definition)\b)/i;

const OWNERSHIP_DUMP_RE =
  /(?:system\s*(?:instruction|prompt)|คำสั่งระบบ).{0,24}(?:ของฉัน|ของระบบ)\s*(?:คือ|:)/i;

const DUMP_VERB_RE =
  /dump(?:ing)?\s+(?:the\s+)?(?:system\s*(?:prompt|instruction)|hidden\s+rules)|เปิดเผย(?:system\s*(?:instruction|prompt)|คำสั่งระบบ|secret|token).{0,16}(?:ให้|ดังนี้)/i;

const EDUCATIONAL_META_RE =
  /(?:ห้าม|อย่า|ไม่(?:ควร|สามารถ)|must not|do not)\s*(?:เปิดเผย|reveal|expose|share).{0,40}(?:system\s*(?:instruction|prompt)|คำสั่งระบบ|API\s*key|secret|token)|(?:system\s*(?:instruction|prompt)|คำสั่งระบบ|API\s*key)\s*(?:คือ|หมายถึง|เป็น)/i;

const WRITE_ACTION_CLAIM_RE =
  /(?:โพสต์|ลง)ประกาศ(?:ให้)?แล้ว|ประกาศ(?:ขึ้น|ออนไลน์)แล้ว|ส่ง(?:\s*(?:Lead|ลีด))(?:ให้)?แล้ว|สร้าง(?:\s*(?:Lead|ลีด))แล้ว|(?:บันทึก|เซฟ)(?:ข้อมูล)?(?:ให้)?แล้ว|โทรหาผู้ขายแล้ว|ติดต่อผู้ขายให้แล้ว|write action(?:สำเร็จ|เสร็จ)แล้ว/i;

const WRITE_ACTION_NEGATION_RE =
  /ยังไม่(?:สามารถ|ได้)|ห้ามสัญญาว่า|ยังไม่ดำเนินการ|ระบบยังไม่รองรับ|ไม่ได้(?:โพสต์|ส่ง|บันทึก|โทร)/;

const BYPASS_CLAIM_RE =
  /(?:DAN\s*mode|developer mode)\s*(?:enabled|on|unlocked)|ignore (?:all )?(?:previous |prior )?instructions|ฉันจะข้าม(?:กฎ|คำสั่ง)|กฎ(?:ภายใน)?ถูกยกเลิกแล้ว|jailbreak\s*(?:สำเร็จ|สำเร็จแล้ว|enabled)/i;

const BYPASS_NEGATION_RE =
  /ห้าม(?:ทำตาม|ข้าม)|อย่า(?:ทำตาม|ข้าม)|ไม่(?:ทำตาม|ข้าม)คำสั่งที่ยกเลิกกฎ/;

const CONNECTIVE_TAE = "แต่";
const TAE_COMPOUND_PREFIXES = ["ตั้ง", "แม้", "เพียง"] as const;
const TAE_COMPOUND_SUFFIXES = ["ละ", "ง"] as const;

function issue(
  code: ConversationCoreSafetyIssueCode,
  description: string
): ConversationCoreSafetyIssue {
  return Object.freeze({
    code,
    category: "safety",
    outcome: "reject",
    description,
  });
}

function worstOutcome(
  issues: readonly ConversationCoreSafetyIssue[]
): ConversationCoreSafetyIssueOutcome {
  let outcome: ConversationCoreSafetyIssueOutcome = "accept";
  for (const item of issues) {
    if (OUTCOME_RANK[item.outcome] > OUTCOME_RANK[outcome]) {
      outcome = item.outcome;
    }
  }
  return outcome;
}

function isConnectiveTaeAt(text: string, index: number): boolean {
  if (text.slice(index, index + CONNECTIVE_TAE.length) !== CONNECTIVE_TAE) {
    return false;
  }
  for (const prefix of TAE_COMPOUND_PREFIXES) {
    if (index >= prefix.length && text.slice(index - prefix.length, index) === prefix) {
      return false;
    }
  }
  const after = index + CONNECTIVE_TAE.length;
  for (const suffix of TAE_COMPOUND_SUFFIXES) {
    if (text.slice(after, after + suffix.length) === suffix) {
      return false;
    }
  }
  return true;
}

function splitOnConnectiveTae(segment: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let from = 0;
  while (from < segment.length) {
    const index = segment.indexOf(CONNECTIVE_TAE, from);
    if (index < 0) {
      break;
    }
    if (isConnectiveTaeAt(segment, index)) {
      const left = segment.slice(start, index).trim();
      if (left.length > 0) {
        parts.push(left);
      }
      start = index + CONNECTIVE_TAE.length;
    }
    from = index + CONNECTIVE_TAE.length;
  }
  const tail = segment.slice(start).trim();
  if (tail.length > 0) {
    parts.push(tail);
  }
  return parts;
}

function splitClauses(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+|;\s*|\s*อย่างไรก็ตาม\s*/)
    .flatMap(splitOnConnectiveTae)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function clauseHasUnnegatedMatch(clause: string, claim: RegExp, negation: RegExp): boolean {
  return claim.test(clause) && !negation.test(clause);
}

function isEducationalMetaClause(clause: string): boolean {
  return EDUCATIONAL_META_RE.test(clause);
}

function introIntroducesProtectedDump(clause: string): boolean {
  const markerRe = new RegExp(INTRO_MARKER_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = markerRe.exec(clause)) !== null) {
    const rest = clause.slice(match.index + match[0].length);
    if (EXPLANATION_AFTER_INTRO_RE.test(rest)) {
      continue;
    }
    if (PROTECTED_INTERNAL_RE.test(rest.slice(0, 48))) {
      return true;
    }
  }
  return false;
}

function hasActualDisclosureDump(clause: string): boolean {
  return (
    OWNERSHIP_DUMP_RE.test(clause) ||
    DUMP_VERB_RE.test(clause) ||
    introIntroducesProtectedDump(clause)
  );
}

function clauseDisclosesInternalInstruction(clause: string): boolean {
  if (hasActualDisclosureDump(clause)) {
    return true;
  }
  if (isEducationalMetaClause(clause)) {
    return false;
  }
  return false;
}

function hasSecretLikeValue(text: string): boolean {
  return SECRET_LIKE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasDisclosureClaim(text: string): boolean {
  return splitClauses(text).some((clause) => clauseDisclosesInternalInstruction(clause));
}

function hasFalseWriteActionClaim(text: string): boolean {
  return splitClauses(text).some((clause) =>
    clauseHasUnnegatedMatch(clause, WRITE_ACTION_CLAIM_RE, WRITE_ACTION_NEGATION_RE)
  );
}

function hasBoundaryBypass(text: string): boolean {
  return splitClauses(text).some((clause) =>
    clauseHasUnnegatedMatch(clause, BYPASS_CLAIM_RE, BYPASS_NEGATION_RE)
  );
}

/**
 * Scan candidate assistant text for general safety hazards.
 * Never returns matched secret values, candidate text, or PII.
 */
export function validateConversationCoreSafety(
  input: ConversationCoreSafetyValidationInput
): ConversationCoreSafetyValidationResult {
  const issues: ConversationCoreSafetyIssue[] = [];

  if (!input || typeof input.candidateText !== "string") {
    issues.push(issue("safety.invalid_input", "Candidate text must be a string"));
    return Object.freeze({ outcome: "reject", issues: Object.freeze(issues) });
  }

  const text = input.candidateText;

  if (hasSecretLikeValue(text)) {
    issues.push(
      issue(
        "safety.secret_leakage",
        "High-confidence secret-like value detected"
      )
    );
  }

  if (hasDisclosureClaim(text)) {
    issues.push(
      issue(
        "safety.system_instruction_disclosure",
        "Candidate claims to disclose system instruction or internal secrets"
      )
    );
  }

  if (hasFalseWriteActionClaim(text)) {
    issues.push(
      issue(
        "safety.false_write_action_claim",
        "Candidate claims a write action that this phase cannot perform"
      )
    );
  }

  if (HTML_EXECUTABLE_RE.test(text)) {
    issues.push(
      issue(
        "safety.html_or_executable_ui",
        "Candidate includes executable HTML, script, or UI markup"
      )
    );
  }

  if (hasBoundaryBypass(text)) {
    issues.push(
      issue(
        "safety.boundary_bypass",
        "Candidate attempts to bypass a safety boundary"
      )
    );
  }

  return Object.freeze({
    outcome: worstOutcome(issues),
    issues: Object.freeze(issues),
  });
}
