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
import { isPilotBuyerFollowUpMessage } from "./chat/chatPilotBuyerFollowUp";
import type { SalesBrainAdapterInput, SalesBrainUserRole } from "./salesBrainTypes";

export const USER_VISIBLE_REAL_PROVIDER_SLICE_ID = "v6.8D";
/** v6.8E — buyer prompt quality / listing-grounded reply rules */
export const USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID = "v6.8E";

/** Prompt rules exported for offline quality tests (no Gemini network). */
export const USER_VISIBLE_BUYER_GROUNDING_RULE_MARKERS = [
  "ข้อมูล listing ที่อนุญาตให้อ้างอิง",
  "ยังไม่มีข้อมูลนี้ในระบบ",
  "ห้ามแต่งรุ่น ราคา ปี ไมล์ โปรโมชัน",
] as const;

export const USER_VISIBLE_BUYER_MULTI_CARD_RULE_MARKERS = [
  "หลายคัน",
  "ไม่ซ้ำ",
  "แต่ละคัน",
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
  pilotOrchestration?: UserVisiblePilotOrchestrationHint
): string {
  const listingBlock = formatListingContextForPrompt(pilotOrchestration);
  const cardCount =
    pilotOrchestration?.recentCarCards?.length ?? pilotOrchestration?.carCardCount ?? 0;
  const multiCardNote =
    cardCount >= 2
      ? "ผู้ใช้เห็นหลายคัน — อธิบายแต่ละคันให้ต่างกันตามข้อมูลจริงของคันนั้น ห้ามใช้ประโยคซ้ำแข็งทุกคัน"
      : "";

  return [
    `คุณคือน้องเอ ผู้ช่วยซื้อรถมือสองของ Nong A (staging pilot เท่านั้น, ${USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID}).`,
    "ตอบเป็นภาษาไทย กระชับ เป็นกันเอง สุภาพ ไม่ใช้ emoji มากเกินไป.",
    "",
    "[กฎข้อมูล — ห้ามแต่ง]",
    "อ้างอิงได้เฉพาะข้อมูล listing ด้านล่างเท่านั้น — ห้ามแต่งรุ่น ราคา ปี ไมล์ โปรโมชัน ส่วนลด หรือสเปกที่ไม่มีใน listing.",
    "ถ้าช่องข้อมูลไม่มีใน listing ให้ตอบว่า \"ยังไม่มีข้อมูลนี้ในระบบ\" ห้ามเดาหรือเติมเอง.",
    "ห้ามสรุปเหนือข้อมูลจริง ห้ามแต่งผลตรวจสภาพ ประวัติศูนย์ หรือของแถมที่ไม่มีใน listing.",
    multiCardNote,
    "",
    "[หลายคัน — ไม่ซ้ำ]",
    "เมื่อแนะนำหรือเทียบหลายคัน ให้แต่ละคันมีมุมอธิบายต่างกันตามข้อมูลจริง (เช่น ปี ไมล์ ราคา ประเภทรถ).",
    "ห้ามใช้ประโยคซ้ำแข็งทุกคัน — อ้างจุดเด่นที่มีในข้อมูลจริงของแต่ละคัน.",
    "",
    "[ไฟแนนซ์/ผ่อน]",
    "ห้ามใช้คำ: อนุมัติแน่นอน, การันตี, ผ่อนได้แน่นอน, ผ่านชัวร์, รับประกันอนุมัติ.",
    "ใช้ภาษา: ประเมินเบื้องต้น, ขึ้นอยู่กับเงื่อนไขไฟแนนซ์, ทีมงานช่วยประสานรายละเอียดให้ได้.",
    "ห้ามรับปากแทน dealer หรือสถาบันไฟแนนซ์ — อธิบายแนวทางทั่วไปได้เท่านั้น.",
    "",
    "[CTA]",
    "เมื่อผู้ใช้สนใจ ชวนนุ่มนวล เช่น \"ถ้าชอบคันไหน ลองฝากชื่อ/เบอร์ไว้ให้ทีมงานติดต่อกลับได้ครับ\".",
    "ห้ามกดดัน ห้ามยืนยันข้อมูลส่วนตัวแทนผู้ใช้.",
    "",
    "ห้ามตอบเรื่องนอกขอบเขตรถ/ตลาดรถมือสองแบบเปิดกว้าง.",
    "",
    "ข้อมูล listing ที่อนุญาตให้อ้างอิง:",
    listingBlock,
  ]
    .filter(Boolean)
    .join("\n");
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
    buildUserVisibleBuyerSystemInstruction(pilotOrchestration),
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
  const prompt = buildUserVisibleGeminiCombinedPrompt(
    request.redactedUserMessage,
    options.pilotOrchestration
  );
  const response = await client.models.generateContent({
    model: USER_VISIBLE_REAL_GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      maxOutputTokens: 512,
      temperature: 0.7,
    },
  });

  const rawText = String(response.text ?? "").trim();
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
  return caller(adapterInput, { readEnv, pilotOrchestration: input.pilotOrchestration });
}

function isRealProviderOutputSafe(
  text: string,
  userMessage: string,
  carCardCount: number
): boolean {
  if (!text.trim()) {
    return false;
  }
  if (!assertNoPilotDebugMarker(text)) {
    return false;
  }
  if (!assertNoFinanceGuaranteeLanguage(text)) {
    return false;
  }
  if (isPilotBuyerFollowUpMessage(userMessage)) {
    return assertPilotFollowUpCopySafe(text, carCardCount);
  }
  return assertPilotCopySafe(text, carCardCount, userMessage);
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
    const real = await invokeUserVisibleRealProvider({
      userMessage: input.userMessage,
      userRole: input.userRole,
      pilotOrchestration: input.pilotOrchestration,
      readEnv,
    });
    const text = real.redactedProviderOutput.trim();
    if (!isRealProviderOutputSafe(text, input.userMessage, carCardCount)) {
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
