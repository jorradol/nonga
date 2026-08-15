/**
 * WP-V2U-03C2 — Pure high-risk automotive validator for candidate assistant responses.
 * Runs only from server-owned lane/topic context. Does not classify user messages.
 */

import {
  CONVERSATION_CORE_POLICY_LANE_IDS,
  type ConversationCorePolicyLane,
} from "./conversationCorePolicyLanes";

export const CONVERSATION_CORE_HIGH_RISK_ISSUE_CODES = [
  "high_risk.invalid_input",
  "high_risk.invalid_context",
  "high_risk.unknown_context_field",
  "high_risk.invalid_high_risk_topic_declared",
  "high_risk.invalid_trusted_authoritative_context",
  "high_risk.engine_off_while_moving",
  "high_risk.intentional_collision",
  "high_risk.unsafe_fuel_hv_lift",
  "high_risk.steering_absolute_claim",
  "high_risk.braking_absolute_claim",
  "high_risk.epb_guaranteed_outcome",
  "high_risk.epb_universal_procedure",
  "high_risk.guaranteed_repair_outcome",
  "high_risk.vat_finance_absolute_claim",
  "high_risk.universal_control_without_qualification",
] as const;

export type ConversationCoreHighRiskIssueCode =
  (typeof CONVERSATION_CORE_HIGH_RISK_ISSUE_CODES)[number];

export type ConversationCoreHighRiskIssueOutcome =
  | "accept"
  | "correction-required"
  | "reject";

export interface ConversationCoreHighRiskIssue {
  readonly code: ConversationCoreHighRiskIssueCode;
  readonly category: "high-risk";
  readonly outcome: ConversationCoreHighRiskIssueOutcome;
  readonly description: string;
}

export interface ConversationCoreHighRiskValidationContext {
  readonly policyLane: ConversationCorePolicyLane;
  readonly highRiskTopicDeclared?: boolean;
  readonly hasTrustedAuthoritativeContext?: boolean;
}

export interface ConversationCoreHighRiskValidationInput {
  readonly candidateText: string;
  readonly context: ConversationCoreHighRiskValidationContext;
}

export interface ConversationCoreHighRiskValidationResult {
  readonly outcome: ConversationCoreHighRiskIssueOutcome;
  readonly issues: readonly ConversationCoreHighRiskIssue[];
}

const OUTCOME_RANK: Record<ConversationCoreHighRiskIssueOutcome, number> = {
  accept: 0,
  "correction-required": 1,
  reject: 2,
};

const CONTEXT_ALLOWED_KEYS = new Set([
  "policyLane",
  "highRiskTopicDeclared",
  "hasTrustedAuthoritativeContext",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const CONNECTIVE_TAE = "แต่";
const TAE_COMPOUND_PREFIXES = ["ตั้ง", "แม้", "เพียง"] as const;
const TAE_COMPOUND_SUFFIXES = ["ละ", "ง"] as const;

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

const DIRECT_NEGATION_BEFORE =
  /(?:ไม่(?:แนะนำ(?:ให้)?|ได้แปลว่า|ควร)|ห้าม(?:แนะนำให้)?|อย่า|หลีกเลี่ยง(?:การ)?|มิ(?:ใช่|ได้))\s*(?:ขับ|ชน|คูณ|บวก|เสีย|เบียด|ครูด|ควร|ต้อง|ให้|ดับ)?\s*$/;

const NEGATION_AROUND =
  /ไม่ได้แปลว่า|ไม่ควร|ห้าม|อย่า|ไม่แนะนำให้|ไม่ใช่ว่า|ไม่ถึงกับ|ไม่เหมารวม|ห้ามเหมารวม|ไม่รับรอง|ยังสรุปไม่ได้/;

function issue(
  code: ConversationCoreHighRiskIssueCode,
  outcome: ConversationCoreHighRiskIssueOutcome,
  description: string
): ConversationCoreHighRiskIssue {
  return Object.freeze({
    code,
    category: "high-risk",
    outcome,
    description,
  });
}

function worstOutcome(
  issues: readonly ConversationCoreHighRiskIssue[]
): ConversationCoreHighRiskIssueOutcome {
  let outcome: ConversationCoreHighRiskIssueOutcome = "accept";
  for (const item of issues) {
    if (OUTCOME_RANK[item.outcome] > OUTCOME_RANK[outcome]) {
      outcome = item.outcome;
    }
  }
  return outcome;
}

function foldForMatch(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHighRiskContextActive(
  context: ConversationCoreHighRiskValidationContext
): boolean {
  return (
    context.policyLane === "high-risk-automotive" ||
    context.highRiskTopicDeclared === true
  );
}

function matchIsNegated(text: string, match: RegExpExecArray): boolean {
  const prefix = text.slice(Math.max(0, match.index - 48), match.index);
  if (DIRECT_NEGATION_BEFORE.test(prefix)) {
    return true;
  }
  const window = text.slice(
    Math.max(0, match.index - 36),
    Math.min(text.length, match.index + match[0].length + 36)
  );
  return NEGATION_AROUND.test(window) && DIRECT_NEGATION_BEFORE.test(prefix);
}

function hasUnnegatedMatch(text: string, patterns: readonly RegExp[]): boolean {
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (!matchIsNegated(text, match) && !NEGATION_AROUND.test(match[0])) {
        return true;
      }
      if (match[0].length === 0) {
        re.lastIndex += 1;
      }
    }
  }
  return false;
}

const ENGINE_OFF_WHILE_MOVING_PATTERNS: readonly RegExp[] = [
  /(?:ให้|ควร|แนะนำให้)?ดับเครื่อง.{0,40}(?:ขณะ|ตอน|เมื่อ).{0,24}(?:รถ)?(?:ยัง)?(?:เคลื่อนที่|วิ่ง)/,
  /(?:รถยัง(?:วิ่ง|เคลื่อนที่)|ขณะรถ(?:วิ่ง|เคลื่อนที่)).{0,32}ดับเครื่อง/,
  /switch(?:\s+the)?\s+engine off.{0,32}while.{0,16}mov/i,
];

const COLLISION_PATTERNS: readonly RegExp[] = [
  /(?:ให้|ควร)?ขับเข้า(?:ไป(?:ใน|หา)?)?(?:พุ่มไม้|กอกล้วย|กองดิน|เนินทราย|เนินดิน)/,
  /(?:ให้|ควร)?(?:จงใจ)?ชน(?:พุ่มไม้|กอกล้วย|กองดิน|เนินทราย|เนินดิน|ขอบทาง|แบริเออร์|กำแพง|รถคันอื่น)/,
  /เบียด(?:เข้า)?(?:ขอบทาง|แบริเออร์)|ครูด(?:เข้า)?(?:ขอบทาง|แบริเออร์|กำแพง)/,
  /ขับชน(?:พุ่มไม้|กอกล้วย|ขอบทาง|แบริเออร์|กองดิน|วัตถุ)/,
  /ชน.{0,20}เพื่อ(?:หยุด|ชะลอ)/,
];

const UNSAFE_FUEL_HV_LIFT_PATTERNS: readonly RegExp[] = [
  /มุดใต้รถ.{0,32}แม่แรงตัวเดียว/,
  /ยกรถด้วยแม่แรงตัวเดียวแล้ว(?:มุด|เข้าไป)/,
  /จับสายไฟแรงสูง|แตะสายไฟแรงสูง|ซ่อมไฟฟ้าแรงสูงเองได้เลย/,
  /จุดไฟ.{0,24}(?:ใกล้|ตรง).{0,16}(?:น้ำมัน|เชื้อเพลิง)รั่ว/,
  /ดูด.{0,16}น้ำมัน.{0,16}ด้วยปาก/,
];

const STEERING_ABSOLUTE_PATTERNS: readonly RegExp[] = [
  /พวงมาลัยจะเลี้ยวไม่ได้(?:เลย)?/,
  /พวงมาลัยเลี้ยวได้แน่นอน/,
  /ดับเครื่องแล้วพวงมาลัยจะล็อก/,
  /พวงมาลัยจะล็อก(?:ตาย)?ทันที/,
  /แรงช่วยพวงมาลัยหายทันทีทุกคัน/,
  /แรงช่วยพวงมาลัยทุกระบบจะหยุดทันที/,
];

const BRAKING_ABSOLUTE_PATTERNS: readonly RegExp[] = [
  /รถทุกคันใช้(?:ระบบช่วยเบรกแบบ)?สุญญากาศ/,
  /แรงช่วยเบรก(?:เหมือนกัน|เท่ากัน)ทุกคัน/,
  /ดับเครื่องแล้วไม่มีแรงช่วยเบรกเหลือ/,
  /แป้นเบรกจะแข็งจนเหยียบไม่ลงแน่นอน/,
  /ระบบช่วยเบรกจะหยุดทั้งหมดทันที/,
];

const EPB_GUARANTEE_PATTERNS: readonly RegExp[] = [
  /(?:ดึง|กด).{0,16}(?:EPB|เบรก(?:มือ|จอด)ไฟฟ้า).{0,24}รถจะหยุดแน่นอน/,
  /EPB.{0,24}จะหยุดรถได้แน่นอน/,
  /ดึงค้างแล้วรถจะหยุดแน่นอน/,
  /ระบบจะเบรกให้แน่นอน/,
];

const EPB_UNIVERSAL_PATTERNS: readonly RegExp[] = [
  /(?:EPB|เบรก(?:มือ|จอด)ไฟฟ้า).{0,32}ทุกยี่ห้อใช้วิธีเดียวกัน/,
  /ใช้วิธีเดียวกันได้ทุก(?:ยี่ห้อ|รุ่น|คัน)/,
  /ดึงสวิตช์ค้างไว้เท่านั้น/,
  /ให้(?:ดึง|กด)สวิตช์ค้างไว้จนรถหยุด/,
  /วิธีฉุกเฉินคือดึง\s*EPB\s*ค้าง/,
  /EPB ใช้วิธีนี้ได้กับรถทุกรุ่น/,
];

const REPAIR_GUARANTEE_PATTERNS: readonly RegExp[] = [
  /ซ่อม(?:แล้ว|ระบบ).{0,32}(?:จะ)?(?:หาย|ปลอดภัย|ดี)แน่นอน(?:ทุกคัน)?/,
  /ดัดแปลงระบบ(?:เบรก|พวงมาลัย|ถุงลม).{0,24}รับประกัน/,
  /รับประกันผล(?:ลัพธ์)?จากการ(?:ซ่อม|ดัดแปลง)ระบบ/,
];

const VAT_ABSOLUTE_PATTERNS: readonly RegExp[] = [
  /รถมือสองทุกคันต้อง(?:บวก|เสีย|คิด)\s*VAT/,
  /รถมือสอง.{0,32}(?:ทุก(?:คัน|กรณี)|เสมอ).{0,20}(?:ต้อง)?(?:บวก|เสีย|คิด).{0,12}VAT/,
  /รถใหม่.{0,20}ไม่ต้อง(?:เสีย|คิด|บวก).{0,12}VAT/,
  /ค่างวด.{0,32}ต้องคูณ.{0,12}1\s*\.\s*07/,
  /ค่างวด.{0,32}ต้อง(?:บวก|เสีย|คิด)\s*VAT/,
  /ต้องบวก\s*VAT(?:\s*7\s*%)?.{0,16}ทุก(?:คัน|กรณี)/,
];

const VAT_CLAIM_BOUND_QUAL_RE =
  /ไม่ได้แปลว่า|ไม่ควร(?:คูณ|บวก)|ห้าม(?:คูณ|บวก)|ไม่ใช่ข้อยืนยันว่า|ยังสรุปไม่ได้ว่า/;

const MODEL_QUALIFICATION_RE =
  /แตกต่างตาม(?:ยี่ห้อ|รุ่น)|ต่างกันตาม(?:ยี่ห้อ|รุ่น)|บางรุ่นอาจ|ต้องตรวจคู่มือ|ดูคู่มือรถ/;

const GEAR_TOPIC_RE = /เกียร์|ตำแหน่งเกียร์|สูตรเกียร์/;
const NON_GEAR_SYSTEM_RE =
  /EPB|เบรก(?:มือ|จอด)ไฟฟ้า|พวงมาลัย|ระบบเบรก|แรงช่วยเบรก/;

const UNIVERSAL_CONTROL_PATTERNS: readonly RegExp[] = [
  /(?:ตำแหน่งเกียร์|เกียร์)\s*D3.{0,24}(?:→|->|ไป).{0,12}2.{0,12}(?:→|->|ไป).{0,12}L.{0,24}ทุกคัน/,
  /ใช้สูตรเกียร์เดียวกันได้ทุก(?:คัน|รุ่น)/,
];

function eachUnnegatedMatch(
  text: string,
  patterns: readonly RegExp[]
): RegExpExecArray[] {
  const found: RegExpExecArray[] = [];
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (!matchIsNegated(text, match) && !NEGATION_AROUND.test(match[0])) {
        found.push(match);
      }
      if (match[0].length === 0) {
        re.lastIndex += 1;
      }
    }
  }
  return found;
}

function vatMatchIsClaimQualified(text: string, match: RegExpExecArray): boolean {
  const prefix = text.slice(Math.max(0, match.index - 48), match.index);
  const window = text.slice(
    Math.max(0, match.index - 36),
    Math.min(text.length, match.index + match[0].length + 16)
  );
  return VAT_CLAIM_BOUND_QUAL_RE.test(prefix) || VAT_CLAIM_BOUND_QUAL_RE.test(window);
}

function vatMatchIsTrustedDocument(
  text: string,
  match: RegExpExecArray,
  trusted: boolean
): boolean {
  if (!trusted) {
    return false;
  }
  if (/ทุกคัน|เสมอ|ทุกกรณี/.test(match[0])) {
    return false;
  }
  const window = text.slice(
    Math.max(0, match.index - 40),
    Math.min(text.length, match.index + match[0].length + 16)
  );
  return /ตาม(?:เอกสาร|ใบเสนอราคา|สัญญา)/.test(window);
}

function gearMatchHasBoundModelQualification(text: string, match: RegExpExecArray): boolean {
  const qualRe = new RegExp(MODEL_QUALIFICATION_RE.source, "g");
  let qual: RegExpExecArray | null;
  while ((qual = qualRe.exec(text)) !== null) {
    const subject = text.slice(Math.max(0, qual.index - 28), qual.index);
    if (NON_GEAR_SYSTEM_RE.test(subject)) {
      continue;
    }
    if (!GEAR_TOPIC_RE.test(subject) && !GEAR_TOPIC_RE.test(qual[0])) {
      continue;
    }
    const distance = Math.abs(qual.index - match.index);
    if (distance <= 72) {
      return true;
    }
  }
  return false;
}

function detectVatAbsolute(
  rawText: string,
  hasTrustedAuthoritativeContext: boolean
): boolean {
  return splitClauses(rawText).some((clause) => {
    const text = foldForMatch(clause);
    return eachUnnegatedMatch(text, VAT_ABSOLUTE_PATTERNS).some(
      (match) =>
        !vatMatchIsClaimQualified(text, match) &&
        !vatMatchIsTrustedDocument(text, match, hasTrustedAuthoritativeContext)
    );
  });
}

function detectUniversalControlWithoutQualification(rawText: string): boolean {
  return splitClauses(rawText).some((clause) => {
    const text = foldForMatch(clause);
    return eachUnnegatedMatch(text, UNIVERSAL_CONTROL_PATTERNS).some(
      (match) => !gearMatchHasBoundModelQualification(text, match)
    );
  });
}

/**
 * Validate high-risk automotive candidate output from server-owned context only.
 * Does not infer lane from candidate text. Does not build a fallback reply.
 */
function freezeHighRisk(
  issues: ConversationCoreHighRiskIssue[]
): ConversationCoreHighRiskValidationResult {
  return Object.freeze({
    outcome: worstOutcome(issues),
    issues: Object.freeze(issues),
  });
}

function parseHighRiskContext(
  raw: unknown,
  issues: ConversationCoreHighRiskIssue[]
): ConversationCoreHighRiskValidationContext | null {
  if (!isPlainObject(raw)) {
    issues.push(
      issue(
        "high_risk.invalid_context",
        "reject",
        "Validation context must be a server-owned object"
      )
    );
    return null;
  }

  if (Object.keys(raw).some((key) => !CONTEXT_ALLOWED_KEYS.has(key))) {
    issues.push(
      issue(
        "high_risk.unknown_context_field",
        "reject",
        "Unknown validation context field is not allowed"
      )
    );
  }

  if (typeof raw.policyLane !== "string") {
    issues.push(
      issue("high_risk.invalid_input", "reject", "Policy lane must be a server-owned lane id")
    );
    return null;
  }
  if (!(CONVERSATION_CORE_POLICY_LANE_IDS as readonly string[]).includes(raw.policyLane)) {
    issues.push(
      issue("high_risk.invalid_input", "reject", "Policy lane is not a known server lane")
    );
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(raw, "highRiskTopicDeclared") &&
    typeof raw.highRiskTopicDeclared !== "boolean"
  ) {
    issues.push(
      issue(
        "high_risk.invalid_high_risk_topic_declared",
        "reject",
        "highRiskTopicDeclared must be a boolean when provided"
      )
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(raw, "hasTrustedAuthoritativeContext") &&
    typeof raw.hasTrustedAuthoritativeContext !== "boolean"
  ) {
    issues.push(
      issue(
        "high_risk.invalid_trusted_authoritative_context",
        "reject",
        "hasTrustedAuthoritativeContext must be a boolean when provided"
      )
    );
  }

  if (issues.length > 0) {
    return null;
  }

  return {
    policyLane: raw.policyLane as ConversationCorePolicyLane,
    ...(typeof raw.highRiskTopicDeclared === "boolean"
      ? { highRiskTopicDeclared: raw.highRiskTopicDeclared }
      : {}),
    ...(typeof raw.hasTrustedAuthoritativeContext === "boolean"
      ? { hasTrustedAuthoritativeContext: raw.hasTrustedAuthoritativeContext }
      : {}),
  };
}

/**
 * Validate high-risk automotive candidate output from server-owned context only.
 * Does not infer lane from candidate text. Does not build a fallback reply.
 */
export function validateConversationCoreHighRisk(
  input: ConversationCoreHighRiskValidationInput
): ConversationCoreHighRiskValidationResult {
  const issues: ConversationCoreHighRiskIssue[] = [];

  if (!input || typeof input.candidateText !== "string") {
    issues.push(
      issue("high_risk.invalid_input", "reject", "High-risk input is invalid")
    );
    return freezeHighRisk(issues);
  }

  const context = parseHighRiskContext(input.context, issues);
  if (!context) {
    return freezeHighRisk(issues);
  }

  if (!isHighRiskContextActive(context)) {
    return freezeHighRisk(issues);
  }

  const text = foldForMatch(input.candidateText);
  const trusted = context.hasTrustedAuthoritativeContext === true;

  if (hasUnnegatedMatch(text, ENGINE_OFF_WHILE_MOVING_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.engine_off_while_moving",
        "reject",
        "Candidate recommends switching the engine off while the vehicle is moving"
      )
    );
  }

  if (hasUnnegatedMatch(text, COLLISION_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.intentional_collision",
        "reject",
        "Candidate advises an intentional collision or impact to stop the vehicle"
      )
    );
  }

  if (hasUnnegatedMatch(text, UNSAFE_FUEL_HV_LIFT_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.unsafe_fuel_hv_lift",
        "reject",
        "Candidate gives unsafe fuel, high-voltage, or lifting advice"
      )
    );
  }

  if (hasUnnegatedMatch(text, STEERING_ABSOLUTE_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.steering_absolute_claim",
        "correction-required",
        "Candidate makes an absolute steering-assist claim"
      )
    );
  }

  if (hasUnnegatedMatch(text, BRAKING_ABSOLUTE_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.braking_absolute_claim",
        "correction-required",
        "Candidate makes an absolute braking-assist claim"
      )
    );
  }

  if (hasUnnegatedMatch(text, EPB_GUARANTEE_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.epb_guaranteed_outcome",
        "reject",
        "Candidate guarantees that EPB will stop the vehicle"
      )
    );
  }

  if (hasUnnegatedMatch(text, EPB_UNIVERSAL_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.epb_universal_procedure",
        "correction-required",
        "Candidate gives a universal EPB procedure"
      )
    );
  }

  if (hasUnnegatedMatch(text, REPAIR_GUARANTEE_PATTERNS)) {
    issues.push(
      issue(
        "high_risk.guaranteed_repair_outcome",
        "correction-required",
        "Candidate guarantees a repair or modification outcome"
      )
    );
  }

  if (detectVatAbsolute(input.candidateText, trusted)) {
    issues.push(
      issue(
        "high_risk.vat_finance_absolute_claim",
        "correction-required",
        "Candidate makes an ungrounded VAT or finance absolute claim"
      )
    );
  }

  if (detectUniversalControlWithoutQualification(input.candidateText)) {
    issues.push(
      issue(
        "high_risk.universal_control_without_qualification",
        "correction-required",
        "Candidate gives a model-dependent control instruction without qualification"
      )
    );
  }

  return Object.freeze({
    outcome: worstOutcome(issues),
    issues: Object.freeze(issues),
  });
}
