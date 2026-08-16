/**
 * WP-V2U-03E2D2C2A — Pure deterministic server lane and tool eligibility classifier.
 * No network, no env reads, no provider/tool calls, no user-message authority for tools.
 */
import {
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  PHASE1_READ_ONLY_TOOLS,
  type ConversationCoreToolName,
} from "../../services/conversation-core/index";
import type { ConversationCorePolicyLane } from "../../services/conversation-core/conversationCorePolicyLanes";

export const CONVERSATION_CORE_LANE_CLASSIFIER_PHASE1_ELIGIBLE_TOOLS = [
  "marketplace.search",
  "inventory.fetch",
] as const;

export type ConversationCoreLaneClassifierPhase1EligibleTool =
  (typeof CONVERSATION_CORE_LANE_CLASSIFIER_PHASE1_ELIGIBLE_TOOLS)[number];

export const CONVERSATION_CORE_LANE_CLASSIFIER_REASON_CODES = [
  "invalid-classifier-input",
  "general-consultative-intent",
  "high-risk-intent",
  "vehicle-search-intent",
  "vehicle-inventory-intent",
  "ambiguous-intent",
  "core-disabled",
  "gemini-disabled",
  "tools-disabled",
  "tool-not-staged",
  "tool-self-grant-attempt",
  "selection-not-enabled",
  "trusted-listing-context-required",
  "finance-not-enabled",
  "trusted-selection-required",
] as const;

export type ConversationCoreLaneClassifierReasonCode =
  (typeof CONVERSATION_CORE_LANE_CLASSIFIER_REASON_CODES)[number];

export interface ConversationCoreLaneClassifierCapabilitySnapshot {
  readonly coreEnabled: boolean;
  readonly geminiEnabled: boolean;
  readonly toolsEnabled: boolean;
}

export interface ConversationCoreLaneClassifierTrustedPrerequisiteSnapshot {
  readonly hasTrustedRoomListingSet: boolean;
  readonly hasTrustedSelectedListing: boolean;
}

export interface ConversationCoreLaneClassifierContinuationSnapshot {
  readonly vehicleSearchContinuation?: boolean;
}

export interface ConversationCoreLaneClassifierInput {
  readonly userMessage: string;
  readonly capabilities: ConversationCoreLaneClassifierCapabilitySnapshot;
  readonly stagedToolNames: readonly ConversationCoreToolName[];
  readonly trustedPrerequisites: ConversationCoreLaneClassifierTrustedPrerequisiteSnapshot;
  readonly continuation?: ConversationCoreLaneClassifierContinuationSnapshot;
}

export interface ConversationCoreLaneClassifierClassifiedOutcome {
  readonly kind: "classified";
  readonly policyLane: ConversationCorePolicyLane;
  readonly allowedToolNames: readonly ConversationCoreToolName[];
  readonly reasonCode: ConversationCoreLaneClassifierReasonCode;
}

export interface ConversationCoreLaneClassifierClarificationOutcome {
  readonly kind: "clarification-required";
  readonly allowedToolNames: readonly [];
  readonly reasonCode: ConversationCoreLaneClassifierReasonCode;
}

export interface ConversationCoreLaneClassifierBlockedOutcome {
  readonly kind: "blocked";
  readonly allowedToolNames: readonly [];
  readonly reasonCode: ConversationCoreLaneClassifierReasonCode;
}

export type ConversationCoreLaneClassifierOutcome =
  | ConversationCoreLaneClassifierClassifiedOutcome
  | ConversationCoreLaneClassifierClarificationOutcome
  | ConversationCoreLaneClassifierBlockedOutcome;

const INPUT_ALLOWED_KEYS = new Set([
  "userMessage",
  "capabilities",
  "stagedToolNames",
  "trustedPrerequisites",
  "continuation",
]);

const CAPABILITY_ALLOWED_KEYS = new Set([
  "coreEnabled",
  "geminiEnabled",
  "toolsEnabled",
]);

const PREREQUISITE_ALLOWED_KEYS = new Set([
  "hasTrustedRoomListingSet",
  "hasTrustedSelectedListing",
]);

const CONTINUATION_ALLOWED_KEYS = new Set(["vehicleSearchContinuation"]);

const CANONICAL_TOOL_SET = new Set<string>(PHASE1_READ_ONLY_TOOLS);

const PHASE1_ELIGIBLE_TOOL_SET = new Set<string>(
  CONVERSATION_CORE_LANE_CLASSIFIER_PHASE1_ELIGIBLE_TOOLS
);

const PHASE1_INELIGIBLE_TOOLS = new Set<string>([
  "vehicle.resolveSelection",
  "finance.calculate",
]);

const EMPTY_TOOLS = Object.freeze([] as const);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function freezeClassified(
  policyLane: ConversationCorePolicyLane,
  allowedToolNames: readonly ConversationCoreToolName[],
  reasonCode: ConversationCoreLaneClassifierReasonCode
): ConversationCoreLaneClassifierClassifiedOutcome {
  return Object.freeze({
    kind: "classified" as const,
    policyLane,
    allowedToolNames: Object.freeze([...allowedToolNames]),
    reasonCode,
  });
}

function freezeClarification(
  reasonCode: ConversationCoreLaneClassifierReasonCode
): ConversationCoreLaneClassifierClarificationOutcome {
  return Object.freeze({
    kind: "clarification-required" as const,
    allowedToolNames: EMPTY_TOOLS,
    reasonCode,
  });
}

function freezeBlocked(
  reasonCode: ConversationCoreLaneClassifierReasonCode
): ConversationCoreLaneClassifierBlockedOutcome {
  return Object.freeze({
    kind: "blocked" as const,
    allowedToolNames: EMPTY_TOOLS,
    reasonCode,
  });
}

function freezeInvalid(): ConversationCoreLaneClassifierBlockedOutcome {
  return freezeBlocked("invalid-classifier-input");
}

function normalizeForMatch(message: string): string {
  return message.trim().toLowerCase();
}

function hasUnknownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>
): boolean {
  return Object.keys(value).some((key) => !allowed.has(key));
}

function parseStagedToolNames(
  raw: unknown
): readonly ConversationCoreToolName[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const seen = new Set<string>();
  const normalized: ConversationCoreToolName[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      return null;
    }
    const trimmed = entry.trim();
    if (!CANONICAL_TOOL_SET.has(trimmed)) {
      return null;
    }
    if (seen.has(trimmed)) {
      return null;
    }
    seen.add(trimmed);
    normalized.push(trimmed as ConversationCoreToolName);
  }
  return Object.freeze(normalized);
}

function effectivePhase1StagedTools(
  stagedToolNames: readonly ConversationCoreToolName[]
): readonly ConversationCoreLaneClassifierPhase1EligibleTool[] {
  const eligible: ConversationCoreLaneClassifierPhase1EligibleTool[] = [];
  for (const toolName of stagedToolNames) {
    if (PHASE1_ELIGIBLE_TOOL_SET.has(toolName)) {
      eligible.push(toolName as ConversationCoreLaneClassifierPhase1EligibleTool);
    }
  }
  return Object.freeze(eligible);
}

function stagedIncludesForbiddenOnly(
  stagedToolNames: readonly ConversationCoreToolName[]
): boolean {
  if (stagedToolNames.length === 0) {
    return false;
  }
  return stagedToolNames.every((toolName) => PHASE1_INELIGIBLE_TOOLS.has(toolName));
}

function validateInput(raw: unknown): ConversationCoreLaneClassifierInput | null {
  if (!isPlainObject(raw) || hasUnknownKeys(raw, INPUT_ALLOWED_KEYS)) {
    return null;
  }
  if (typeof raw.userMessage !== "string") {
    return null;
  }
  const userMessage = raw.userMessage;
  if (userMessage.trim().length === 0 || userMessage.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
    return null;
  }
  if (!isPlainObject(raw.capabilities) || hasUnknownKeys(raw.capabilities, CAPABILITY_ALLOWED_KEYS)) {
    return null;
  }
  const { coreEnabled, geminiEnabled, toolsEnabled } = raw.capabilities;
  if (
    typeof coreEnabled !== "boolean" ||
    typeof geminiEnabled !== "boolean" ||
    typeof toolsEnabled !== "boolean"
  ) {
    return null;
  }
  if (!isPlainObject(raw.trustedPrerequisites) || hasUnknownKeys(raw.trustedPrerequisites, PREREQUISITE_ALLOWED_KEYS)) {
    return null;
  }
  const { hasTrustedRoomListingSet, hasTrustedSelectedListing } = raw.trustedPrerequisites;
  if (
    typeof hasTrustedRoomListingSet !== "boolean" ||
    typeof hasTrustedSelectedListing !== "boolean"
  ) {
    return null;
  }
  const stagedToolNames = parseStagedToolNames(raw.stagedToolNames);
  if (stagedToolNames === null) {
    return null;
  }
  let continuation: ConversationCoreLaneClassifierContinuationSnapshot | undefined;
  if (raw.continuation !== undefined) {
    if (!isPlainObject(raw.continuation) || hasUnknownKeys(raw.continuation, CONTINUATION_ALLOWED_KEYS)) {
      return null;
    }
    const vehicleSearchContinuationRaw = raw.continuation.vehicleSearchContinuation;
    if (
      vehicleSearchContinuationRaw !== undefined &&
      typeof vehicleSearchContinuationRaw !== "boolean"
    ) {
      return null;
    }
    const vehicleSearchContinuation =
      vehicleSearchContinuationRaw === undefined
        ? undefined
        : (vehicleSearchContinuationRaw as boolean);
    continuation = Object.freeze(
      vehicleSearchContinuation === undefined
        ? {}
        : { vehicleSearchContinuation }
    );
  }
  return Object.freeze({
    userMessage,
    capabilities: Object.freeze({ coreEnabled, geminiEnabled, toolsEnabled }),
    stagedToolNames,
    trustedPrerequisites: Object.freeze({
      hasTrustedRoomListingSet,
      hasTrustedSelectedListing,
    }),
    continuation,
  });
}

const PROMPT_INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+previous\s+rules/i,
  /toolsenabled\s*=\s*true/i,
  /policylane\s*=\s*authoritative/i,
  /allowedtoolnames/i,
  /"toolsenabled"\s*:/i,
  /"policylane"\s*:/i,
  /"allowedtoolnames"\s*:/i,
  /run\s+finance\.calculate/i,
  /เรียก\s+marketplace\.search\s+โดยไม่ตรวจ/i,
  /ตั้ง\s*toolsenabled/i,
  /ตั้งค่า\s*policylane/i,
  /\bfinance\.calculate\b/i,
  /\bvehicle\.resolveSelection\b/i,
  /\bmarketplace\.search\b/i,
  /\binventory\.fetch\b/i,
];

function detectPromptInjection(message: string): boolean {
  const normalized = normalizeForMatch(message);
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(message)) {
      return true;
    }
  }
  if (normalized.includes("{") && normalized.includes("allowedtool")) {
    return true;
  }
  return false;
}

const HIGH_RISK_EMERGENCY_PATTERNS: readonly RegExp[] = [
  /เบรกจม/,
  /เบรกล็อก/,
  /เบรกไม่ทำงาน/,
  /เบรกเสีย/,
  /เบรกหมด/,
  /เบรกไม่อยู่/,
  /เบรกแตก/,
  /พวงมาลัยล็อก/,
  /พวงมาลัยขัด/,
  /พวงมาลัยหนัก/,
  /พวงมาลัยเลี้ยวไม่ได้/,
  /พวงมาลัยควบคุมไม่ได้/,
  /ไฟไหม้/,
  /รถไฟไหม้/,
  /ควันไฟ/,
  /ควันออกจากรถ/,
  /เครื่องร้อนเกิน/,
  /น้ำร้อนล้น/,
  /เครื่องยนต์ร้อนรุนแรง/,
  /อุบัติเหตุ/,
  /รถชน/,
  /ชนพุ่มไม้/,
  /รถคว่ำ/,
  /ดับเครื่องขณะรถยังเคลื่อนที่/,
  /ดับเครื่องทันทีขณะรถยังวิ่ง/,
];

const HIGH_RISK_EDUCATION_EXCLUSIONS: readonly RegExp[] = [
  /คืออะไร/,
  /ต่างกันอย่างไร/,
  /ควรเช็ค/,
  /ดูแลอย่างไร/,
  /แนะนำการดูแล/,
];

function detectHighRiskIntent(message: string): boolean {
  const normalized = normalizeForMatch(message);
  for (const exclusion of HIGH_RISK_EDUCATION_EXCLUSIONS) {
    if (exclusion.test(normalized)) {
      return false;
    }
  }
  for (const pattern of HIGH_RISK_EMERGENCY_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  return false;
}

const SELECTION_INTENT_PATTERNS: readonly RegExp[] = [
  /เอาคันที่\s*\d+/,
  /เลือกคันที่\s*\d+/,
  /เลือก\s*listing[-\w]+/i,
  /เอาคันนี้/,
  /เลือกรถคันเมื่อกี้/,
  /เลือกรถคันนี้/,
  /เลือกคันนี้/,
  /เลือกรถที่เลือก/,
];

function detectSelectionIntent(message: string): boolean {
  const normalized = normalizeForMatch(message);
  for (const pattern of SELECTION_INTENT_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(message)) {
      return true;
    }
  }
  return false;
}

const FINANCE_EDUCATION_PATTERNS: readonly RegExp[] = [
  /ดอกเบี้ยรถคืออะไร/,
  /flat\s*rate/i,
  /effective\s*rate/i,
  /vat\s*7%/i,
  /vat\s*คือ/,
  /เช่าซื้อกับลีสซิ่ง/,
  /ลีสซิ่งต่าง/,
  /ถ้าผ่อน\s*\d+\s*ปีมีข้อดีข้อเสีย/,
  /ผ่อน\s*\d+\s*ปีมีข้อดีข้อเสีย/,
];

const FINANCE_CALCULATION_PATTERNS: readonly RegExp[] = [
  /คำนวณค่างวด/,
  /คำนวณผ่อน/,
  /ผ่อนเดือนละ/,
  /ค่างวดเท่าไหร่/,
  /ค่างวดเท่าไร/,
  /ดาวน์\s*\d+\s*%/,
  /ดาวน์\s*\d+[\s,]*บาท/,
  /ผ่อน\s*\d+\s*เดือน/,
  /ดอกเบี้ย\s*\d+(\.\d+)?\s*%/,
  /ถ้าใช้ดอกเบี้ย\s*\d/,
  /ช่วยคำนวณค่างวดรถที่เลือก/,
  /คันนี้ผ่อน/,
];

function detectFinanceEducation(message: string): boolean {
  const normalized = normalizeForMatch(message);
  for (const pattern of FINANCE_EDUCATION_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(message)) {
      return true;
    }
  }
  if (/ดอกเบี้ย.*คืออะไร/.test(normalized)) {
    return true;
  }
  if (/vat.*ต้องบวก/.test(normalized)) {
    return true;
  }
  return false;
}

function detectFinanceCalculationIntent(message: string): boolean {
  if (detectFinanceEducation(message)) {
    return false;
  }
  const normalized = normalizeForMatch(message);
  for (const pattern of FINANCE_CALCULATION_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(message)) {
      return true;
    }
  }
  if (/^ผ่อนเท่าไหร่$/.test(normalized) || /^ผ่อนเท่าไร$/.test(normalized)) {
    return false;
  }
  return false;
}

const SEARCH_FALSE_POSITIVE_PATTERNS: readonly RegExp[] = [
  /หาอู่/,
  /หาอะไหล่/,
  /หาสาเหตุ/,
  /หาข้อมูล/,
  /หากฎหมาย/,
  /หาประกัน/,
  /ค้นหาสาเหตุ/,
  /หาวิธี/,
  /หาซ่อม/,
];

const SEARCH_POSITIVE_PATTERNS: readonly RegExp[] = [
  /หารถ/,
  /ค้นหารถ/,
  /อยากได้.*รถ/,
  /อยากหารถ/,
  /ช่วยหารถ/,
  /หา.*เก๋ง/,
  /หา.*suv/,
  /หา.*รถกระบะ/,
  /หา.*รถครอบครัว/,
  /งบไม่เกิน/,
  /งบประมาณ/,
  /ราคาไม่เกิน/,
  /ไม่เกิน\s*[\d,]+\s*บาท/,
  /toyota|honda|mazda|nissan|mitsubishi|isuzu|ford|chevrolet|bmw|benz|mercedes/i,
  /รถครอบครัว/,
  /รถถูกกว่า/,
  /คันอื่นที่ถูกกว่า/,
  /มีคันอื่น.*ถูกกว่า/,
];

function detectSearchIntent(
  message: string,
  continuation?: ConversationCoreLaneClassifierContinuationSnapshot
): boolean {
  const normalized = normalizeForMatch(message);
  for (const pattern of SEARCH_FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;
    }
  }
  if (/^ช่วยหาหน่อย$/.test(normalized) || /^หาหน่อย$/.test(normalized)) {
    return false;
  }
  if (/มีคันอื่นที่ถูกกว่า/.test(normalized) || /รถถูกกว่า/.test(normalized)) {
    return continuation?.vehicleSearchContinuation === true;
  }
  for (const pattern of SEARCH_POSITIVE_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(message)) {
      return true;
    }
  }
  if (/หา.*รถ/.test(normalized) && !/หาอ/.test(normalized)) {
    return true;
  }
  return false;
}

const INVENTORY_FALSE_POSITIVE_PATTERNS: readonly RegExp[] = [
  /อะไหล่/,
  /น้ำมันเครื่อง/,
  /อุปกรณ์/,
  /มีวิธี/,
  /มีปัญหา/,
  /สต็อกอะไหล่/,
];

const INVENTORY_POSITIVE_PATTERNS: readonly RegExp[] = [
  /รถในสต็อก/,
  /รถใน\s*stock/i,
  /ขอดูรถในสต็อก/,
  /มีรถอะไรขาย/,
  /มีรถพร้อมขาย/,
  /แสดงรายการรถ/,
  /รายการรถที่มี/,
  /มีรถกี่คัน/,
  /มีรถอะไรบ้าง/,
  /ตอนนี้มีรถอะไรขาย/,
];

function detectInventoryIntent(message: string): boolean {
  const normalized = normalizeForMatch(message);
  for (const pattern of INVENTORY_FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;
    }
  }
  for (const pattern of INVENTORY_POSITIVE_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(message)) {
      return true;
    }
  }
  if (/สต็อก/.test(normalized) && /รถ/.test(normalized)) {
    return true;
  }
  return false;
}

const AMBIGUOUS_PATTERNS: readonly RegExp[] = [
  /^ช่วยหาหน่อย$/,
  /^หาหน่อย$/,
  /^มีไหม$/,
  /^ขออีก$/,
  /^ดูเพิ่ม$/,
  /^ผ่อนเท่าไหร่$/,
  /^ผ่อนเท่าไร$/,
  /^เอาคันนี้$/,
];

function detectAmbiguousIntent(
  message: string,
  continuation?: ConversationCoreLaneClassifierContinuationSnapshot
): boolean {
  const normalized = normalizeForMatch(message);
  for (const pattern of AMBIGUOUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return continuation?.vehicleSearchContinuation !== true;
    }
  }
  if (/^มี$/.test(normalized) || /^มีไหม$/.test(normalized)) {
    return true;
  }
  return false;
}

function resolveAuthoritativeToolEligibility(
  input: ConversationCoreLaneClassifierInput,
  toolName: ConversationCoreLaneClassifierPhase1EligibleTool,
  successReason: ConversationCoreLaneClassifierReasonCode
): ConversationCoreLaneClassifierOutcome {
  const { capabilities, stagedToolNames } = input;
  if (!capabilities.coreEnabled) {
    return freezeBlocked("core-disabled");
  }
  if (!capabilities.geminiEnabled) {
    return freezeBlocked("gemini-disabled");
  }
  if (!capabilities.toolsEnabled) {
    return freezeBlocked("tools-disabled");
  }
  const effectiveStaged = effectivePhase1StagedTools(stagedToolNames);
  if (!effectiveStaged.includes(toolName)) {
    if (stagedIncludesForbiddenOnly(stagedToolNames) || stagedToolNames.length === 0) {
      return freezeBlocked("tool-not-staged");
    }
    return freezeBlocked("tool-not-staged");
  }
  return freezeClassified("authoritative-data", [toolName], successReason);
}

function resolveSelectionOutcome(
  input: ConversationCoreLaneClassifierInput
): ConversationCoreLaneClassifierOutcome {
  const { trustedPrerequisites } = input;
  if (!trustedPrerequisites.hasTrustedRoomListingSet) {
    return freezeBlocked("trusted-listing-context-required");
  }
  return freezeBlocked("selection-not-enabled");
}

function resolveFinanceOutcome(
  input: ConversationCoreLaneClassifierInput
): ConversationCoreLaneClassifierOutcome {
  const { trustedPrerequisites } = input;
  if (!trustedPrerequisites.hasTrustedSelectedListing) {
    if (!trustedPrerequisites.hasTrustedRoomListingSet) {
      return freezeBlocked("trusted-listing-context-required");
    }
    return freezeBlocked("trusted-selection-required");
  }
  return freezeBlocked("finance-not-enabled");
}

/**
 * Classify server-owned lane and Phase-1 tool eligibility from untrusted user text.
 */
export function classifyConversationCoreLane(
  rawInput: unknown
): ConversationCoreLaneClassifierOutcome {
  const input = validateInput(rawInput);
  if (!input) {
    return freezeInvalid();
  }

  const message = input.userMessage;

  if (detectHighRiskIntent(message)) {
    return freezeClassified("high-risk-automotive", EMPTY_TOOLS, "high-risk-intent");
  }

  if (detectPromptInjection(message)) {
    return freezeBlocked("tool-self-grant-attempt");
  }

  if (detectSelectionIntent(message)) {
    return resolveSelectionOutcome(input);
  }

  if (detectFinanceCalculationIntent(message)) {
    return resolveFinanceOutcome(input);
  }

  if (detectAmbiguousIntent(message, input.continuation)) {
    return freezeClarification("ambiguous-intent");
  }

  const searchIntent = detectSearchIntent(message, input.continuation);
  const inventoryIntent = detectInventoryIntent(message);

  if (searchIntent && inventoryIntent) {
    if (/งบ|ราคา|toyota|honda|เก๋ง|suv|ไม่เกิน/i.test(normalizeForMatch(message))) {
      return resolveAuthoritativeToolEligibility(input, "marketplace.search", "vehicle-search-intent");
    }
    return freezeClarification("ambiguous-intent");
  }

  if (searchIntent) {
    return resolveAuthoritativeToolEligibility(input, "marketplace.search", "vehicle-search-intent");
  }

  if (inventoryIntent) {
    return resolveAuthoritativeToolEligibility(input, "inventory.fetch", "vehicle-inventory-intent");
  }

  return freezeClassified("general-consultative", EMPTY_TOOLS, "general-consultative-intent");
}
