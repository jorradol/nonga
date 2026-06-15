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
export const USER_VISIBLE_REAL_GEMINI_MODEL = "gemini-3.5-flash";
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
        c.year ? `${c.year}` : "",
        c.price ? `ราคา ${c.price.toLocaleString("th-TH")} บาท` : "",
        c.mileage ? `ไมล์ ${c.mileage.toLocaleString("th-TH")}` : "",
        c.fuelType ? `เชื้อเพลิง ${c.fuelType}` : "",
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
  return [
    "คุณคือน้องเอ ผู้ช่วยซื้อรถมือสองของ Nong A (staging pilot เท่านั้น).",
    "ตอบเป็นภาษาไทย กระชับ เป็นกันเอง ไม่ใช้ emoji มากเกินไป.",
    "ขอบเขต: แนะนำ/เปรียบเทียบรถจากข้อมูล listing ด้านล่างเท่านั้น — ห้ามแต่งรุ่น ราคา โปรโมชัน หรือสเปกที่ไม่มีใน listing.",
    "ห้ามรับปากแทน dealer หรือยืนยันไฟแนนซ์/ประกันอนุมัติแน่นอน — อธิบายแบบทั่วไปได้.",
    "เมื่อผู้ใช้สนใจ ชวนฝากชื่อ/เบอร์ติดต่อได้ แต่ห้ามขอหรือยืนยัน PII ที่ละเอียดเกินไป.",
    "ห้ามตอบเรื่องนอกขอบเขตรถ/ตลาดรถมือสองแบบเปิดกว้าง.",
    "",
    "ข้อมูล listing ที่อนุญาตให้อ้างอิง:",
    listingBlock,
  ].join("\n");
}

function buildUserVisibleBuyerPrompt(redactedUserMessage: string): string {
  return `ข้อความผู้ใช้ (redacted): ${redactedUserMessage}`;
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
  const config = {
    ...resolveRealProviderConfig(input, "gemini"),
    networkEnabled: true,
    adminShadowRouteOnly: false,
    userVisibleRouteOnly: true,
  };
  const request = buildProviderRequest(input, config);
  const apiKey = readEnv("GEMINI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const systemInstruction = buildUserVisibleBuyerSystemInstruction(options.pilotOrchestration);
  const response = await client.models.generateContent({
    model: USER_VISIBLE_REAL_GEMINI_MODEL,
    contents: [{ text: buildUserVisibleBuyerPrompt(request.redactedUserMessage) }],
    config: {
      systemInstruction,
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
  if (isPilotBuyerFollowUpMessage(userMessage)) {
    return assertPilotFollowUpCopySafe(text, carCardCount);
  }
  return assertPilotCopySafe(text, carCardCount, userMessage);
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
