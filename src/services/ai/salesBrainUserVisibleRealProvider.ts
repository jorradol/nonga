/**
 * v6.8D — Real Gemini user-visible provider (staging + allowlist + explicit flag only).
 * Wired from server orchestration bridge only — not browser bundle.
 */
import { GoogleGenAI } from "@google/genai";
import {
  assertGeminiApiKeyPresentForAdminShadow,
  buildProviderRequest,
  defaultEnvReader,
  isGeminiApiKeyPresent,
  prepareProviderPayload,
  resolveRealProviderConfig,
  shouldFallbackOnRealProviderError,
  type SalesBrainEnvReader,
} from "./salesBrainRealProvider";
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import {
  evaluateUserVisibleGate,
  type UserVisibleGateResult,
} from "./salesBrainUserVisibleGate";
import {
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
  resolveSalesBrainRuntimeFlags,
  type SalesBrainRuntimeEnvironment,
} from "./salesBrainRuntimeFlags";
import type { UserVisiblePilotOrchestrationHint } from "./salesBrainUserVisiblePilotTypes";
import {
  assertNoPilotDebugMarker,
  assertPilotCopySafe,
  assertPilotFollowUpCopySafe,
} from "./salesBrainUserVisiblePilotBuyerCopy";
import {
  isPilotBuyerCardInsightFollowUp,
  isPilotBuyerFollowUpMessage,
  extractNumberedComparePair,
} from "./chat/chatPilotBuyerFollowUp";
import type { SalesBrainAdapterInput, SalesBrainUserRole } from "./salesBrainTypes";

export const USER_VISIBLE_REAL_PROVIDER_SLICE_ID = "v6.8D";
/** v6.8E.3 — Thai brand voice, vehicle English allowlist, real output recovery */
export const USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID = "v6.8E.3";

export type UserVisibleOutputUnsafeReason =
  | "too_short"
  | "pipe_echo"
  | "finance_forbidden_phrase"
  | "meta_instruction_leak"
  | "non_thai_output"
  | "incomplete_sentence"
  | "generic_safety_guard"
  | "customer_address_term"
  | "empty_output";

export type UserVisibleBuyerAnswerScenario =
  | "budget"
  | "finance"
  | "compare"
  | "summarize"
  | "fit"
  | "general";

export const USER_VISIBLE_MIN_OUTPUT_CHARS: Record<UserVisibleBuyerAnswerScenario, number> = {
  budget: 120,
  finance: 150,
  compare: 120,
  summarize: 100,
  fit: 120,
  general: 80,
};

/** Meta / instruction leak — must trigger mock fallback (v6.8E.2+). */
export const USER_VISIBLE_META_INSTRUCTION_LEAK_PATTERNS: RegExp[] = [
  /let'?s be careful/i,
  /do not invent/i,
  /\bI should\b/i,
  /\bI need to\b/i,
  /\bI must\b/i,
  /\bas an AI\b/i,
  /\baccording to (?:the )?prompt\b/i,
  /\bWait,\b/,
  /Sentence\s*\d/i,
  /\binstruction\b/i,
  /\bprompt\b/i,
  /\brules\b/i,
  /ตาม\s*instruction/i,
  /ตาม\s*prompt/i,
];

export const USER_VISIBLE_THAI_ONLY_PROMPT_MARKERS = [
  "ภาษาไทยเป็นหลัก",
  "ตอบเฉพาะคำตอบสุดท้าย",
  "ห้ามแสดงแผน",
] as const;

export const USER_VISIBLE_BUYER_PERSONA_MARKERS = [
  "น้องเอ",
  "คุณลูกค้า",
  "ห้ามเดาว่า",
  "ปังปุริเย่",
] as const;

export const USER_VISIBLE_TWO_LAYER_KNOWLEDGE_MARKERS = [
  "จากข้อมูลในประกาศนี้",
  "จากความรู้ทั่วไปของรุ่นนี้",
  "ไม่ใช่การยืนยันสภาพของรถคันนี้โดยตรง",
] as const;

export const USER_VISIBLE_VEHICLE_ENGLISH_ALLOWED_MARKERS = [
  "ชื่อยี่ห้อ/รุ่น/เทคนิคเป็นภาษาอังกฤษได้",
] as const;

/** Static automotive English tokens allowed in Thai buyer answers. */
export const USER_VISIBLE_STATIC_VEHICLE_ENGLISH_TERMS = [
  "Honda",
  "Toyota",
  "Mazda",
  "Nissan",
  "Isuzu",
  "Mitsubishi",
  "Ford",
  "Chevrolet",
  "BMW",
  "Mercedes-Benz",
  "Mercedes",
  "HR-V",
  "CR-V",
  "Vios",
  "City",
  "Camry",
  "Yaris",
  "ATIV",
  "Civic",
  "Fortuner",
  "D-Max",
  "Hybrid",
  "e:HEV",
  "Turbo",
  "CVT",
  "AT",
  "MT",
  "SUV",
  "Crossover",
  "Sedan",
  "Hatchback",
  "Pickup",
  "MPV",
  "4WD",
  "ABS",
  "RS",
  "EL",
] as const;

export const USER_VISIBLE_GUESSED_CUSTOMER_ADDRESS_PATTERNS: RegExp[] = [
  /(?:^|[\s,.])ลุง(?:ครับ|ค่ะ|[\s,.]|$)/,
  /(?:^|[\s,.])ป้า(?:ครับ|ค่ะ|[\s,.]|$)/,
  /(?:^|[\s,.])เฮีย(?:ครับ|ค่ะ|[\s,.]|$)/,
  /(?:^|[\s,.])เจ๊(?:ครับ|ค่ะ|[\s,.]|$)/,
  /(?:^|[\s,.])พี่(?:ครับ|ค่ะ|[\s,.]|$)/,
  /(?:^|[\s,.])น้อง(?:ครับ|ค่ะ|[\s,.]|$)/,
];

export const USER_VISIBLE_FORBIDDEN_BRAND_VOICE_TERMS = ["ปังปุริเย่"] as const;

export const USER_VISIBLE_GENERAL_KNOWLEDGE_DISCLAIMER_MARKERS = [
  "ไม่ใช่การยืนยันสภาพของรถคันนี้โดยตรง",
  "ควรตรวจสภาพและทดลองขับจริงก่อนตัดสินใจ",
] as const;

export const USER_VISIBLE_RETRY_UNSAFE_REASONS: ReadonlySet<UserVisibleOutputUnsafeReason> = new Set([
  "too_short",
  "non_thai_output",
]);

export const USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS = 768;

/** Prompt rules exported for offline quality tests (no Gemini network). */
export const USER_VISIBLE_BUYER_ANSWER_FORMAT_MARKERS = [
  "ตอบเฉพาะคำตอบสุดท้าย",
  "3–6 ประโยค",
  "รูปแบบคำตอบ",
] as const;
export const USER_VISIBLE_BUYER_GROUNDING_RULE_MARKERS = [
  "ข้อมูล listing ที่อนุญาตให้อ้างอิง",
  "จากข้อมูลในประกาศนี้",
  "ห้ามแต่ง",
] as const;

export const USER_VISIBLE_BUYER_MULTI_CARD_RULE_MARKERS = [
  "แต่ละคัน",
  "ห้ามซ้ำ",
] as const;

export const USER_VISIBLE_FINANCE_FORBIDDEN_PHRASES = [
  "อนุมัติแน่นอน",
  "การันตี",
  "ผ่อนได้แน่นอน",
  "ผ่านชัวร์",
  "รับประกันอนุมัติ",
] as const;

export const USER_VISIBLE_FINANCE_SAFE_PHRASE_MARKERS = [
  "ประเมินเบื้องต้น",
  "ขึ้นอยู่กับเงื่อนไขไฟแนนซ์",
  "ทีมงานช่วยประสานรายละเอียด",
] as const;

export const USER_VISIBLE_BUYER_CTA_RULE_MARKERS = [
  "ฝากชื่อ",
  "เบอร์",
  "ทีมงานติดต่อกลับ",
] as const;

/** Output guard — finance guarantee language must trigger mock fallback. */
export const USER_VISIBLE_FINANCE_GUARANTEE_OUTPUT_PATTERNS: RegExp[] = [
  /อนุมัติแน่นอน/,
  /ผ่อนได้แน่นอน/,
  /ผ่านชัวร์/,
  /รับประกัน(?:อนุมัติ|ผ่าน)/,
  /การันตี(?:อนุมัติ|ผ่าน|ผ่อน)/,
];

export const USER_VISIBLE_REAL_GEMINI_MODEL = "gemini-3.5-flash";
/** Align with admin SS-01 — single contents text part; no config.systemInstruction (Gemini API SDK). */
export const USER_VISIBLE_GEMINI_REQUEST_SHAPE = "sdk_contents_text_merged_instruction";
const MAX_USER_VISIBLE_OUTPUT_CHARS = 1200;

export function detectUserVisibleBuyerScenario(
  message: string
): UserVisibleBuyerAnswerScenario {
  const t = message.trim();
  if (isPilotBuyerCardInsightFollowUp(t)) {
    if (/เหมาะกับใคร|เหมาะ(?:กับ)?(?:การใช้งาน)?แบบไหน/i.test(t)) {
      return "fit";
    }
    return "summarize";
  }
  if (extractNumberedComparePair(t) || /เทียบ|เปรียบเทียบ/i.test(t)) {
    return "compare";
  }
  if (/ผ่อน|ไฟแนนซ์|งวด|ดาวน์/i.test(t)) {
    return "finance";
  }
  if (/งบ|งบประมาณ|มีรถอะไร|หารถ/i.test(t)) {
    return "budget";
  }
  return "general";
}

function buildScenarioAnswerGuidance(
  scenario: UserVisibleBuyerAnswerScenario,
  cardCount: number
): string {
  const minChars = USER_VISIBLE_MIN_OUTPUT_CHARS[scenario];
  switch (scenario) {
    case "budget":
      return [
        `งานนี้: แนะนำรถจาก listing (${cardCount || "หลาย"} คัน) เป็นภาษาไทย — อย่างน้อย ${minChars} ตัวอักษร.`,
        "รูปแบบ: ทักทายสั้น ๆ แล้วอธิบายทีละคัน 1–2 ประโยคต่อคัน (ไม่ซ้ำ) จากข้อมูลจริง ปิดท้าย CTA นุ่มนวลด้วย ครับ/ค่ะ.",
      ].join(" ");
    case "finance":
      return [
        `งานนี้: ตอบเรื่องผ่อน/ไฟแนนซ์เป็นภาษาไทยเท่านั้น — อย่างน้อย ${minChars} ตัวอักษร, 2–4 ประโยค.`,
        "ใช้คำว่า ประเมินเบื้องต้น / ขึ้นอยู่กับเงื่อนไขไฟแนนซ์ / ทีมงานช่วยประสานรายละเอียด — ห้ามรับประกันอนุมัติ.",
        "ห้ามเดาตัวเลขงวดหรือดอกเบี้ยแม่นยำ ถ้าไม่มีใน listing ให้บอกให้ทีมงานตรวจเงื่อนไขก่อน.",
      ].join(" ");
    case "compare":
      return [
        `งานนี้: เทียบรถจาก listing เป็นภาษาไทย — อย่างน้อย ${minChars} ตัวอักษร, 4–6 ประโยค.`,
        "เปรียบคันที่ 1 กับ 2 ด้วยหัวข้อชัดเจน (ปี ราคา ไมล์ ประเภท) จากข้อมูลจริง จบด้วย ครับ/ค่ะ.",
      ].join(" ");
    case "summarize":
      return [
        `งานนี้: สรุปจุดเด่นคันเดียวจาก listing — ภาษาไทย อย่างน้อย ${minChars} ตัวอักษร, 3–5 ประโยค.`,
        "อ้างเฉพาะ brand/model/ปี/ราคา/ไมล์/ประเภทที่มี ห้ามแต่งสภาพหรือประวัติ จบด้วย ครับ/ค่ะ.",
      ].join(" ");
    case "fit":
      return [
        `งานนี้: บอกว่าเหมาะกับใครจากข้อมูล listing — ภาษาไทย อย่างน้อย ${minChars} ตัวอักษร, 3–5 ประโยค.`,
        "อิงประเภทรถ ปี ราคา ไมล์ที่มี ห้ามฟันธงเกินข้อมูล จบด้วย ครับ/ค่ะ.",
      ].join(" ");
    default:
      return `ตอบครบประเด็น อย่างน้อย ${minChars} ตัวอักษร (ประมาณ 3–5 ประโยค) ไม่ยาวเกินจำเป็น.`;
  }
}

/** Reject listing pipe echo mistaken as a complete answer. */
export function looksLikeListingPipeEcho(text: string): boolean {
  const trimmed = text.trim();
  const pipes = (trimmed.match(/\|/g) ?? []).length;
  return pipes >= 2 && trimmed.length < USER_VISIBLE_MIN_OUTPUT_CHARS.general;
}

export function assertRealProviderOutputMinLength(
  text: string,
  userMessage: string,
  carCardCount: number
): boolean {
  const scenario = detectUserVisibleBuyerScenario(userMessage);
  const min = USER_VISIBLE_MIN_OUTPUT_CHARS[scenario];
  if (carCardCount <= 0 && (scenario === "summarize" || scenario === "fit")) {
    return false;
  }
  return text.trim().length >= min;
}

export function extractUserVisibleGeminiResponseText(response: {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  const direct = String(response.text ?? "").trim();
  if (direct) return direct;
  const parts: string[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.text) parts.push(part.text);
    }
  }
  return parts.join("").trim();
}

function escapeRegexToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Collect brand/model/trim tokens from listing cards for English allowlist checks. */
export function extractVehicleEnglishAllowlistFromPilotOrchestration(
  pilotOrchestration?: UserVisiblePilotOrchestrationHint
): string[] {
  const terms = new Set<string>(USER_VISIBLE_STATIC_VEHICLE_ENGLISH_TERMS);
  for (const card of pilotOrchestration?.recentCarCards ?? []) {
    for (const part of [card.brand, card.model, card.fuelType, card.bodyClassLabel]) {
      const raw = String(part ?? "").trim();
      if (!raw) continue;
      for (const token of raw.split(/[\s/|,-]+/)) {
        const t = token.trim();
        if (t.length >= 2) terms.add(t);
      }
    }
    if (card.description) {
      for (const token of card.description.match(/\b[A-Za-z][A-Za-z0-9:+\-.]{1,}\b/g) ?? []) {
        if (token.length >= 2) terms.add(token);
      }
    }
  }
  return [...terms];
}

/** Strip allowed vehicle English before Thai-ratio guard. */
export function stripAllowedVehicleEnglishForThaiCheck(
  text: string,
  allowedVehicleTerms: Iterable<string> = USER_VISIBLE_STATIC_VEHICLE_ENGLISH_TERMS
): string {
  let stripped = text;
  const sorted = [...new Set(allowedVehicleTerms)].sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    if (term.length < 2) continue;
    stripped = stripped.replace(new RegExp(`\\b${escapeRegexToken(term)}\\b`, "gi"), " ");
  }
  stripped = stripped.replace(/\b\d+(?:\.\d+)?\b/g, " ");
  return stripped.replace(/\s+/g, " ").trim();
}

export function hasMetaInstructionLeak(text: string): boolean {
  for (const pattern of USER_VISIBLE_META_INSTRUCTION_LEAK_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

export function hasGuessedCustomerAddressTerm(text: string): boolean {
  for (const pattern of USER_VISIBLE_GUESSED_CUSTOMER_ADDRESS_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

export function hasForbiddenBrandVoiceTerm(text: string): boolean {
  return USER_VISIBLE_FORBIDDEN_BRAND_VOICE_TERMS.some((term) => text.includes(term));
}

/** Reject answers dominated by Latin/English when user-visible reply must be Thai. */
export function hasExcessiveNonThaiContent(
  text: string,
  allowedVehicleTerms?: Iterable<string>
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const stripped = stripAllowedVehicleEnglishForThaiCheck(trimmed, allowedVehicleTerms);
  const latinWords = stripped.match(/\b[A-Za-z]{2,}\b/g) ?? [];
  const latinChars = (stripped.match(/[A-Za-z]/g) ?? []).length;
  const thaiChars = (stripped.match(/[\u0E00-\u0E7F]/g) ?? []).length;

  if (thaiChars === 0 && latinChars > 8) return true;
  if (thaiChars < 20 && latinWords.length >= 2) return true;
  if (/\b[A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){2,}/.test(stripped)) return true;

  if (thaiChars >= 60 && latinWords.length <= 6 && latinChars / (thaiChars + latinChars + 1) <= 0.18) {
    return false;
  }

  if (latinWords.length >= 3) return true;
  if (latinChars >= 20) return true;
  if (thaiChars > 0 && latinChars / (thaiChars + latinChars) > 0.18) return true;
  return false;
}

/** Buyer-visible replies must end as a complete Thai sentence (ครับ/ค่ะ or clear closure). */
export function looksLikeIncompleteSentence(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/(?:ครับ|ค่ะ|นะครับ|นะคะ)(?:[.!?…])?$/.test(t)) return false;
  if (/[.!?…]$/.test(t) && /[\u0E00-\u0E7F]/.test(t) && !hasExcessiveNonThaiContent(t)) {
    return false;
  }
  if (/[a-zA-Z,(]$/.test(t)) return true;
  if (/[\u0E00-\u0E7F]$/.test(t)) return true;
  return true;
}

export interface UserVisibleOutputSafetyResult {
  safe: boolean;
  unsafeReason?: UserVisibleOutputUnsafeReason;
  scenario: UserVisibleBuyerAnswerScenario;
  outputLength: number;
}

export interface UserVisibleOutputUnsafeDiagnostics {
  sliceId: typeof USER_VISIBLE_REAL_PROVIDER_SLICE_ID;
  qualitySliceId: typeof USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID;
  route: "user-visible";
  modelId: string;
  scenario: UserVisibleBuyerAnswerScenario;
  outputLength: number;
  unsafeReason: UserVisibleOutputUnsafeReason;
  gateReason: "real_provider_output_unsafe";
  outputSampleRedacted: string;
  retryAttempt?: boolean;
}

function redactOutputSampleForDiagnostics(text: string, max = 80): string {
  let sample = text.trim().slice(0, max);
  sample = redactPiiForSalesBrainLog(sample);
  sample = sample.replace(/AIza[0-9A-Za-z\-_]+/g, "[api-key-redacted]");
  sample = sample.replace(/Bearer\s+\S+/gi, "[auth-redacted]");
  return sample;
}

export interface UserVisibleOutputSafetyOptions {
  allowedVehicleTerms?: Iterable<string>;
}

export function evaluateRealProviderOutputSafety(
  text: string,
  userMessage: string,
  carCardCount: number,
  options?: UserVisibleOutputSafetyOptions
): UserVisibleOutputSafetyResult {
  const scenario = detectUserVisibleBuyerScenario(userMessage);
  const trimmed = text.trim();
  const outputLength = trimmed.length;
  const vehicleTerms = options?.allowedVehicleTerms;

  if (!trimmed) {
    return { safe: false, unsafeReason: "empty_output", scenario, outputLength: 0 };
  }
  if (!assertNoPilotDebugMarker(trimmed)) {
    return { safe: false, unsafeReason: "generic_safety_guard", scenario, outputLength };
  }
  if (!assertNoFinanceGuaranteeLanguage(trimmed)) {
    return { safe: false, unsafeReason: "finance_forbidden_phrase", scenario, outputLength };
  }
  if (hasMetaInstructionLeak(trimmed)) {
    return { safe: false, unsafeReason: "meta_instruction_leak", scenario, outputLength };
  }
  if (hasGuessedCustomerAddressTerm(trimmed)) {
    return { safe: false, unsafeReason: "customer_address_term", scenario, outputLength };
  }
  if (hasForbiddenBrandVoiceTerm(trimmed)) {
    return { safe: false, unsafeReason: "generic_safety_guard", scenario, outputLength };
  }
  if (hasExcessiveNonThaiContent(trimmed, vehicleTerms)) {
    return { safe: false, unsafeReason: "non_thai_output", scenario, outputLength };
  }
  if (looksLikeListingPipeEcho(trimmed)) {
    return { safe: false, unsafeReason: "pipe_echo", scenario, outputLength };
  }
  if (!assertRealProviderOutputMinLength(trimmed, userMessage, carCardCount)) {
    return { safe: false, unsafeReason: "too_short", scenario, outputLength };
  }
  if (looksLikeIncompleteSentence(trimmed)) {
    return { safe: false, unsafeReason: "incomplete_sentence", scenario, outputLength };
  }
  if (isPilotBuyerFollowUpMessage(userMessage)) {
    if (!assertPilotFollowUpCopySafe(trimmed, carCardCount)) {
      return { safe: false, unsafeReason: "generic_safety_guard", scenario, outputLength };
    }
  } else if (!assertPilotCopySafe(trimmed, carCardCount, userMessage)) {
    return { safe: false, unsafeReason: "generic_safety_guard", scenario, outputLength };
  }
  return { safe: true, scenario, outputLength };
}

export function isRealProviderOutputSafe(
  text: string,
  userMessage: string,
  carCardCount: number
): boolean {
  return evaluateRealProviderOutputSafety(text, userMessage, carCardCount).safe;
}

function logUserVisibleOutputUnsafeDiagnostics(
  diagnostics: UserVisibleOutputUnsafeDiagnostics
): void {
  console.warn("[user-visible-real-provider]", JSON.stringify(diagnostics));
}

export type UserVisibleRealProviderGateReason =
  | "real_provider_eligible"
  | "real_provider_call_ok"
  | "real_provider_flag_off"
  | "production_environment"
  | "emergency_kill_switch"
  | "user_visible_gate_blocked"
  | "user_role_not_buyer"
  | "missing_gemini_key"
  | "pilot_path_inactive"
  | "real_provider_call_failed"
  | "real_provider_output_unsafe"
  | "guest_uid_missing"
  | "uid_not_allowlisted"
  | "allowlist_empty"
  | "user_visible_not_requested"
  | "provider_not_gemini"
  | "ai_first_disabled"
  | "ai_mode_off"
  | "budget_caps_missing"
  | "production_default_off";

export interface UserVisibleRealProviderEligibility {
  eligible: boolean;
  gateReason: UserVisibleRealProviderGateReason;
}

export interface UserVisibleRealProviderBridgePayload {
  userVisibleText: string;
  pilotPathActive: boolean;
  fallbackToLegacy: boolean;
  skipGemini: boolean;
  carCardCount: number;
  hasMoreCars?: boolean;
  isDraftPreview?: boolean;
  realProviderNetwork?: boolean;
  realProviderGateReason?: string;
  sliceId: string;
}

export interface UserVisibleRealProviderBridgeResult {
  orchestrated: { text: string; carCards?: unknown[]; skipGemini?: boolean } | null;
  payload: UserVisibleRealProviderBridgePayload;
}

export interface UserVisibleGeminiCallResult {
  providerNetworkUsed: true;
  redactedProviderOutput: string;
  requestIdHash: string;
  modelId: string;
}

export type UserVisibleGeminiCaller = (
  input: SalesBrainAdapterInput,
  options: {
    readEnv: SalesBrainEnvReader;
    pilotOrchestration?: UserVisiblePilotOrchestrationHint;
    retryContext?: {
      priorUnsafeReason: UserVisibleOutputUnsafeReason;
      redactedUserMessage: string;
    };
  }
) => Promise<UserVisibleGeminiCallResult>;

let testGeminiCaller: UserVisibleGeminiCaller | null = null;

export function setUserVisibleGeminiCallerForTests(fn: UserVisibleGeminiCaller | null): void {
  testGeminiCaller = fn;
}

export function resetUserVisibleGeminiCallerForTests(): void {
  testGeminiCaller = null;
}

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isUserVisibleRealProviderFlagEnabled(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): boolean {
  return parseTruthy(readEnv(NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV));
}

function formatListingContextForPrompt(
  pilotOrchestration?: UserVisiblePilotOrchestrationHint
): string {
  const cards = pilotOrchestration?.recentCarCards ?? [];
  if (cards.length === 0) {
    const count = pilotOrchestration?.carCardCount ?? 0;
    if (count > 0) {
      return `ระบบแสดงรถ ${count} คัน (รายละเอียดเต็มอยู่ในการ์ดแยก — ห้ามแต่งข้อมูลเพิ่ม)`;
    }
    return "ไม่มีข้อมูลรถจาก listing ในรอบนี้ — ห้ามแต่งรุ่น/ราคา/โปรโมชัน";
  }
  return cards
    .map((c) => {
      const parts = [
        `#${c.index}`,
        `${c.brand} ${c.model}`.trim(),
        c.year ? `ปี ${c.year}` : "",
        c.price ? `ราคา ${c.price.toLocaleString("th-TH")} บาท` : "",
        c.mileage ? `ไมล์ ${c.mileage.toLocaleString("th-TH")} กม.` : "",
        c.fuelType ? `เชื้อเพลิง ${c.fuelType}` : "",
        c.bodyClassLabel ? `ประเภท ${c.bodyClassLabel}` : "",
        c.description ? `คำอธิบาย: ${c.description}` : "",
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

function buildUserVisibleBuyerSystemInstruction(
  pilotOrchestration: UserVisiblePilotOrchestrationHint | undefined,
  userMessage: string
): string {
  const listingBlock = formatListingContextForPrompt(pilotOrchestration);
  const cardCount =
    pilotOrchestration?.recentCarCards?.length ?? pilotOrchestration?.carCardCount ?? 0;
  const scenario = detectUserVisibleBuyerScenario(userMessage);
  const scenarioGuidance = buildScenarioAnswerGuidance(scenario, cardCount);
  const minChars = USER_VISIBLE_MIN_OUTPUT_CHARS[scenario];

  return [
    `คุณคือน้องเอ ผู้ช่วยซื้อรถมือสองของ Nong A (${USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID}, staging pilot).`,
    "",
    "[บุคลิกน้องเอ]",
    "ตอบภาษาไทย สุภาพ อบอุ่น เป็นมิตร มีเสน่ห์แบบไทย ไม่แข็งเหมือนระบบ ไม่พูดเหมือนแปลจากอังกฤษ.",
    "เรียกลูกค้าว่า “คุณลูกค้า” หรือไม่ต้องเรียกขาน — ห้ามเดาว่า ลุง/ป้า/พี่/น้อง/เฮีย/เจ๊.",
    "ใช้ “ครับ” เป็นค่า default จบประโยค — ห้ามใช้คำว่า “ปังปุริเย่”.",
    "",
    "[สัญญาคำตอบ — สำคัญที่สุด]",
    "ตอบเฉพาะคำตอบสุดท้ายที่ลูกค้าเห็นเท่านั้น — ห้ามแสดงแผน เหตุผลภายใน หรือขั้นตอนคิด.",
    `ภาษาไทยเป็นหลัก อย่างน้อย ${minChars} ตัวอักษร ประมาณ 3–6 ประโยค จบด้วย ครับ/ค่ะ.`,
    "ชื่อยี่ห้อ/รุ่น/เทคนิคเป็นภาษาอังกฤษได้ (เช่น Honda HR-V, Toyota Vios, Hybrid, CVT) — ห้ามใช้อังกฤษอธิบายหรือ meta.",
    "",
    "[รูปแบบคำตอบ]",
    scenarioGuidance,
    cardCount >= 2
      ? "เมื่อมีหลายคัน — อธิบายแต่ละคันต่างกันตามข้อมูลจริง ห้ามซ้ำแข็ง."
      : "",
    "",
    "[ข้อมูล 2 ชั้น]",
    "ชั้น 1 — จากข้อมูลในประกาศนี้: ราคา ปี ไมล์ สภาพ อุปกรณ์ โปรโมชัน ต้องมาจาก listing เท่านั้น ห้ามแต่ง.",
    "ถ้าช่องข้อมูลไม่มี ให้บอกว่า ยังไม่มีข้อมูลนี้ในระบบ.",
    "ชั้น 2 — จากความรู้ทั่วไปของรุ่นนี้: ใช้ได้เฉพาะ insight ทั่วไป (ลักษณะใช้งาน จุดเด่นทั่วไป) พร้อม disclaimer:",
    "“ข้อมูลทั่วไปนี้ไม่ใช่การยืนยันสภาพของรถคันนี้โดยตรง ควรตรวจสภาพและทดลองขับจริงก่อนตัดสินใจครับ”",
    "ห้ามอ้างราคาตลาดปัจจุบัน รีวิวภายนอก หรือปัญหาประจำรุ่นแบบเฉพาะเจาะจง.",
    "ถ้าถามเรื่องตลาดนอกระบบ ให้บอกว่าน้องเอยังอ้างอิงจากข้อมูลในระบบและความรู้ทั่วไปเท่านั้น.",
    "",
    "[ไฟแนนซ์] ห้าม: อนุมัติแน่นอน, การันตี, ผ่อนได้แน่นอน, ผ่านชัวร์, รับประกันอนุมัติ.",
    "[CTA] ชวนนุ่มนวลให้ฝากชื่อ/เบอร์ให้ทีมงานติดต่อกลับได้ครับ",
    "",
    "ตัวอย่างโครงสร้าง (ข้อมูลสมมุติ):",
    "สวัสดีครับ น้องเอคัดรถในงบที่ขอมา 2 คันแล้วครับ คันแรก Brand Model ปี XXXX ราคา XXX,XXX บาท เหมาะใช้งานประจำครับ คันที่สอง ... ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ",
    "",
    "ข้อมูล listing ที่อนุญาตให้อ้างอิง:",
    listingBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUserVisibleGeminiRetryPrompt(
  redactedUserMessage: string,
  pilotOrchestration: UserVisiblePilotOrchestrationHint | undefined,
  priorUnsafeReason: UserVisibleOutputUnsafeReason
): string {
  const scenario = detectUserVisibleBuyerScenario(redactedUserMessage);
  const minChars = USER_VISIBLE_MIN_OUTPUT_CHARS[scenario];
  const listingBlock = formatListingContextForPrompt(pilotOrchestration);
  const reasonNote =
    priorUnsafeReason === "non_thai_output"
      ? "คำตอบก่อนหน้ามีภาษาอังกฤษเกินไป"
      : "คำตอบก่อนหน้าสั้นเกินไป";

  return [
    `ตอบใหม่เป็นภาษาไทยเท่านั้น (${USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID} retry).`,
    `${reasonNote} — ตอบเฉพาะคำตอบสุดท้าย ห้ามแสดงแผนหรือเหตุผลภายใน.`,
    `อย่างน้อย ${minChars} ตัวอักษร 3–6 ประโยค จบด้วย ครับ.`,
    "ชื่อรถภาษาอังกฤษได้ ห้าม meta/instruction leak.",
    buildScenarioAnswerGuidance(
      scenario,
      pilotOrchestration?.recentCarCards?.length ?? pilotOrchestration?.carCardCount ?? 0
    ),
    "",
    "ข้อมูล listing:",
    listingBlock,
    "",
    `ข้อความผู้ใช้: ${redactedUserMessage}`,
  ].join("\n");
}

function buildUserVisibleBuyerPrompt(redactedUserMessage: string): string {
  return `ข้อความผู้ใช้ (redacted): ${redactedUserMessage}`;
}

/** Merge system instruction into contents text — same SDK surface as admin shadow SS-01. */
export function buildUserVisibleGeminiCombinedPrompt(
  redactedUserMessage: string,
  pilotOrchestration?: UserVisiblePilotOrchestrationHint
): string {
  return [
    buildUserVisibleBuyerSystemInstruction(pilotOrchestration, redactedUserMessage),
    "",
    buildUserVisibleBuyerPrompt(redactedUserMessage),
  ].join("\n");
}

/** Satisfy v6.0N listing guard when pilot already has grounded cards/count. */
export function enrichUserVisibleAdapterInputWithListingContext(
  input: SalesBrainAdapterInput,
  pilotOrchestration?: UserVisiblePilotOrchestrationHint
): SalesBrainAdapterInput {
  if (input.listingContext?.listingId) {
    return input;
  }
  const cards = pilotOrchestration?.recentCarCards ?? [];
  const cardCount = cards.length > 0 ? cards.length : pilotOrchestration?.carCardCount ?? 0;
  if (cardCount <= 0) {
    return input;
  }
  const first = cards[0];
  return {
    ...input,
    listingContext: {
      listingId: first ? `pilot-card-${first.index}` : `pilot-orchestrated-${cardCount}-cards`,
      fieldsPresent: first
        ? ["brand", "model", "year", "price"]
        : ["orchestratedCarCards"],
    },
  };
}

export interface UserVisibleRealProviderErrorDiagnostics {
  sliceId: typeof USER_VISIBLE_REAL_PROVIDER_SLICE_ID;
  route: "user-visible";
  modelId: string;
  requestShape: typeof USER_VISIBLE_GEMINI_REQUEST_SHAPE;
  errorName: string;
  errorMessageRedacted: string;
}

/** Redact provider errors for server logs — no secrets, prompts, or PII. */
export function redactUserVisibleRealProviderError(
  error: unknown,
  modelId: string = USER_VISIBLE_REAL_GEMINI_MODEL
): UserVisibleRealProviderErrorDiagnostics {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const raw = error instanceof Error ? error.message : String(error);
  let errorMessageRedacted = redactPiiForSalesBrainLog(raw).slice(0, 200);
  errorMessageRedacted = errorMessageRedacted.replace(/AIza[0-9A-Za-z\-_]+/g, "[api-key-redacted]");
  errorMessageRedacted = errorMessageRedacted.replace(/Bearer\s+\S+/gi, "[auth-redacted]");
  errorMessageRedacted = errorMessageRedacted.replace(/GEMINI_API_KEY[=:\s]\S+/gi, "GEMINI_API_KEY=[redacted]");
  return {
    sliceId: USER_VISIBLE_REAL_PROVIDER_SLICE_ID,
    route: "user-visible",
    modelId,
    requestShape: USER_VISIBLE_GEMINI_REQUEST_SHAPE,
    errorName,
    errorMessageRedacted,
  };
}

function logUserVisibleRealProviderFailure(diagnostics: UserVisibleRealProviderErrorDiagnostics): void {
  console.warn("[user-visible-real-provider]", JSON.stringify(diagnostics));
}

async function defaultUserVisibleGeminiCaller(
  input: SalesBrainAdapterInput,
  options: {
    readEnv: SalesBrainEnvReader;
    pilotOrchestration?: UserVisiblePilotOrchestrationHint;
    retryContext?: {
      priorUnsafeReason: UserVisibleOutputUnsafeReason;
      redactedUserMessage: string;
    };
  }
): Promise<UserVisibleGeminiCallResult> {
  const readEnv = options.readEnv;
  assertGeminiApiKeyPresentForAdminShadow(readEnv);
  const adapterInput = enrichUserVisibleAdapterInputWithListingContext(
    input,
    options.pilotOrchestration
  );
  const config = {
    ...resolveRealProviderConfig(adapterInput, "gemini"),
    networkEnabled: true,
    adminShadowRouteOnly: false,
    userVisibleRouteOnly: true,
  };
  const request = buildProviderRequest(adapterInput, config);
  const apiKey = readEnv("GEMINI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const prompt = options.retryContext
    ? buildUserVisibleGeminiRetryPrompt(
        options.retryContext.redactedUserMessage,
        options.pilotOrchestration,
        options.retryContext.priorUnsafeReason
      )
    : buildUserVisibleGeminiCombinedPrompt(
        request.redactedUserMessage,
        options.pilotOrchestration
      );
  const response = await client.models.generateContent({
    model: USER_VISIBLE_REAL_GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      maxOutputTokens: USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS,
      temperature: options.retryContext ? 0.35 : 0.5,
    },
  });

  const rawText = extractUserVisibleGeminiResponseText(response);
  const redactedProviderOutput = redactPiiForSalesBrainLog(rawText).slice(
    0,
    MAX_USER_VISIBLE_OUTPUT_CHARS
  );

  return {
    providerNetworkUsed: true,
    redactedProviderOutput,
    requestIdHash: request.requestIdHash,
    modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
  };
}

export function evaluateUserVisibleRealProviderEligibility(input: {
  firebaseUid?: string | null;
  userRole: SalesBrainUserRole;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  readEnv?: SalesBrainEnvReader;
  userVisibleGate?: UserVisibleGateResult;
}): UserVisibleRealProviderEligibility {
  const readEnv = input.readEnv ?? defaultEnvReader;
  const environment = input.environment ?? "local";

  if (environment === "production") {
    return { eligible: false, gateReason: "production_environment" };
  }

  if (!isUserVisibleRealProviderFlagEnabled(readEnv)) {
    return { eligible: false, gateReason: "real_provider_flag_off" };
  }

  const flags = resolveSalesBrainRuntimeFlags({
    environment,
    env: input.env,
    readEnv,
  });
  if (flags.emergencyKillSwitch) {
    return { eligible: false, gateReason: "emergency_kill_switch" };
  }

  const gate =
    input.userVisibleGate ??
    evaluateUserVisibleGate({
      firebaseUid: input.firebaseUid,
      environment,
      env: input.env,
      readEnv,
      runtimeFlags: flags,
    });

  if (!gate.effectiveUserVisibleAllowed) {
    const reason = gate.blockedReason;
    const mapped: UserVisibleRealProviderGateReason =
      reason === "production_default_off"
        ? "production_environment"
        : reason === "guest_uid_missing" ||
            reason === "uid_not_allowlisted" ||
            reason === "allowlist_empty" ||
            reason === "user_visible_not_requested" ||
            reason === "provider_not_gemini" ||
            reason === "ai_first_disabled" ||
            reason === "ai_mode_off" ||
            reason === "budget_caps_missing" ||
            reason === "emergency_kill_switch"
          ? reason
          : "user_visible_gate_blocked";
    return { eligible: false, gateReason: mapped };
  }

  if (input.userRole !== "buyer") {
    return { eligible: false, gateReason: "user_role_not_buyer" };
  }

  if (!isGeminiApiKeyPresent(readEnv)) {
    return { eligible: false, gateReason: "missing_gemini_key" };
  }

  return { eligible: true, gateReason: "real_provider_eligible" };
}

export async function invokeUserVisibleRealProvider(input: {
  userMessage: string;
  userRole: SalesBrainUserRole;
  pilotOrchestration?: UserVisiblePilotOrchestrationHint;
  readEnv?: SalesBrainEnvReader;
  retryContext?: {
    priorUnsafeReason: UserVisibleOutputUnsafeReason;
    redactedUserMessage: string;
  };
}): Promise<UserVisibleGeminiCallResult> {
  const readEnv = input.readEnv ?? defaultEnvReader;
  const { redactedUserMessage } = prepareProviderPayload({
    userMessage: input.userMessage,
    userRole: input.userRole,
    aiMode: "high",
    provider: "real",
    paidProvider: "gemini",
  });

  const adapterInput: SalesBrainAdapterInput = {
    userMessage: input.userMessage,
    userRole: input.userRole,
    aiMode: "high",
    provider: "real",
    paidProvider: "gemini",
  };

  const caller = testGeminiCaller ?? defaultUserVisibleGeminiCaller;
  return caller(adapterInput, {
    readEnv,
    pilotOrchestration: input.pilotOrchestration,
    retryContext: input.retryContext,
  });
}

/** Block finance guarantee language in real-provider user-visible output. */
export function assertNoFinanceGuaranteeLanguage(text: string): boolean {
  for (const pattern of USER_VISIBLE_FINANCE_GUARANTEE_OUTPUT_PATTERNS) {
    if (pattern.test(text)) return false;
  }
  return true;
}

/**
 * Upgrade orchestration bridge result with real Gemini when eligible; mock/legacy on block or error.
 */
export async function maybeApplyUserVisibleRealProvider<T extends UserVisibleRealProviderBridgeResult>(
  input: {
    bridgeResult: T;
  userMessage: string;
  firebaseUid: string;
  userRole: SalesBrainUserRole;
  pilotOrchestration?: UserVisiblePilotOrchestrationHint;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  readEnv?: SalesBrainEnvReader;
  }
): Promise<T> {
  const readEnv = input.readEnv ?? defaultEnvReader;
  const eligibility = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: input.firebaseUid,
    userRole: input.userRole,
    environment: input.environment,
    env: input.env,
    readEnv,
  });

  const carCardCount =
    input.pilotOrchestration?.recentCarCards?.length ??
    input.pilotOrchestration?.carCardCount ??
    input.bridgeResult.payload.carCardCount ??
    0;

  if (!eligibility.eligible) {
    return {
      ...input.bridgeResult,
      payload: {
        ...input.bridgeResult.payload,
        realProviderNetwork: false,
        realProviderGateReason: eligibility.gateReason,
      },
    } as T;
  }

  if (!input.bridgeResult.payload.pilotPathActive) {
    return {
      ...input.bridgeResult,
      payload: {
        ...input.bridgeResult.payload,
        realProviderNetwork: false,
        realProviderGateReason: "pilot_path_inactive",
      },
    } as T;
  }

  try {
    const vehicleTerms = extractVehicleEnglishAllowlistFromPilotOrchestration(
      input.pilotOrchestration
    );
    const evaluateOutput = (text: string) =>
      evaluateRealProviderOutputSafety(text, input.userMessage, carCardCount, {
        allowedVehicleTerms: vehicleTerms,
      });

    const { redactedUserMessage } = prepareProviderPayload({
      userMessage: input.userMessage,
      userRole: input.userRole,
      aiMode: "high",
      provider: "real",
      paidProvider: "gemini",
    });

    const real = await invokeUserVisibleRealProvider({
      userMessage: input.userMessage,
      userRole: input.userRole,
      pilotOrchestration: input.pilotOrchestration,
      readEnv,
    });
    let text = real.redactedProviderOutput.trim();
    let safety = evaluateOutput(text);
    let usedModelId = real.modelId;

    if (
      !safety.safe &&
      safety.unsafeReason &&
      USER_VISIBLE_RETRY_UNSAFE_REASONS.has(safety.unsafeReason)
    ) {
      const retryReal = await invokeUserVisibleRealProvider({
        userMessage: input.userMessage,
        userRole: input.userRole,
        pilotOrchestration: input.pilotOrchestration,
        readEnv,
        retryContext: {
          priorUnsafeReason: safety.unsafeReason,
          redactedUserMessage,
        },
      });
      const retryText = retryReal.redactedProviderOutput.trim();
      const retrySafety = evaluateOutput(retryText);
      if (retrySafety.safe) {
        text = retryText;
        safety = retrySafety;
        usedModelId = retryReal.modelId;
      } else {
        logUserVisibleOutputUnsafeDiagnostics({
          sliceId: USER_VISIBLE_REAL_PROVIDER_SLICE_ID,
          qualitySliceId: USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
          route: "user-visible",
          modelId: retryReal.modelId,
          scenario: retrySafety.scenario,
          outputLength: retrySafety.outputLength,
          unsafeReason: retrySafety.unsafeReason ?? "generic_safety_guard",
          gateReason: "real_provider_output_unsafe",
          outputSampleRedacted: redactOutputSampleForDiagnostics(retryText),
          retryAttempt: true,
        });
        return {
          ...input.bridgeResult,
          payload: {
            ...input.bridgeResult.payload,
            realProviderNetwork: false,
            realProviderGateReason: "real_provider_output_unsafe",
          },
        } as T;
      }
    }

    if (!safety.safe) {
      logUserVisibleOutputUnsafeDiagnostics({
        sliceId: USER_VISIBLE_REAL_PROVIDER_SLICE_ID,
        qualitySliceId: USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
        route: "user-visible",
        modelId: usedModelId,
        scenario: safety.scenario,
        outputLength: safety.outputLength,
        unsafeReason: safety.unsafeReason ?? "generic_safety_guard",
        gateReason: "real_provider_output_unsafe",
        outputSampleRedacted: redactOutputSampleForDiagnostics(text),
      });
      return {
        ...input.bridgeResult,
        payload: {
          ...input.bridgeResult.payload,
          realProviderNetwork: false,
          realProviderGateReason: "real_provider_output_unsafe",
        },
      } as T;
    }

    const orchestrated = input.bridgeResult.orchestrated
      ? { ...input.bridgeResult.orchestrated, text, skipGemini: false }
      : { text, carCards: [], skipGemini: false };

    return {
      orchestrated,
      payload: {
        ...input.bridgeResult.payload,
        userVisibleText: text,
        pilotPathActive: true,
        fallbackToLegacy: false,
        skipGemini: false,
        realProviderNetwork: true,
        realProviderGateReason: "real_provider_call_ok",
      },
    } as T;
  } catch (error) {
    logUserVisibleRealProviderFailure(redactUserVisibleRealProviderError(error));
    if (shouldFallbackOnRealProviderError(error)) {
      return {
        ...input.bridgeResult,
        payload: {
          ...input.bridgeResult.payload,
          realProviderNetwork: false,
          realProviderGateReason:
            error instanceof Error && error.message.includes("GEMINI_API_KEY")
              ? "missing_gemini_key"
              : "real_provider_call_failed",
        },
      } as T;
    }
    return {
      ...input.bridgeResult,
      payload: {
        ...input.bridgeResult.payload,
        realProviderNetwork: false,
        realProviderGateReason: "real_provider_call_failed",
      },
    } as T;
  }
}
