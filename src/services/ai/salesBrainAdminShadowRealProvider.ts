/**
 * v6.1H — Admin-only shadow smoke real Gemini provider (staging, SS-01 only).
 * Not wired to public chat — user-visible response stays legacy.
 */
import { GoogleGenAI } from "@google/genai";
import {
  buildAdminShadowProviderRequest,
  defaultEnvReader,
  shouldFallbackOnRealProviderError,
  type SalesBrainEnvReader,
} from "./salesBrainRealProvider";
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import {
  NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainAdapterInput, SalesBrainUserRole } from "./salesBrainTypes";

export const ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS = ["SS-01"] as const;

export type AdminShadowRealProviderAllowedCaseId =
  (typeof ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS)[number];

/** Same model as vehicleVisionAnalyzer — metadata only in responses/logs */
export const ADMIN_SHADOW_GEMINI_MODEL = "gemini-2.0-flash";
export const ADMIN_SHADOW_GEMINI_REQUEST_SHAPE = "sdk_contents_text_part";
const MAX_PROVIDER_OUTPUT_CHARS = 500;

export interface AdminShadowGeminiCallResult {
  providerNetworkUsed: true;
  redactedProviderOutput: string;
  requestIdHash: string;
  modelId: string;
  budgetDailyLimit: number | null;
  budgetMonthlyLimit: number | null;
}

export type AdminShadowGeminiCaller = (
  input: SalesBrainAdapterInput,
  options: { readEnv: SalesBrainEnvReader }
) => Promise<AdminShadowGeminiCallResult>;

let testGeminiCaller: AdminShadowGeminiCaller | null = null;

export function setAdminShadowGeminiCallerForTests(fn: AdminShadowGeminiCaller | null): void {
  testGeminiCaller = fn;
}

export function resetAdminShadowGeminiCallerForTests(): void {
  testGeminiCaller = null;
}

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isAdminShadowRealProviderEnabled(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): boolean {
  return parseTruthy(readEnv(NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV));
}

export function isAdminShadowRealProviderCaseAllowed(
  caseId: string
): caseId is AdminShadowRealProviderAllowedCaseId {
  return (ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS as readonly string[]).includes(caseId);
}

export function canAttemptAdminShadowRealProvider(input: {
  caseId: string;
  environment: "production" | "staging" | "local";
  readEnv?: SalesBrainEnvReader;
}): boolean {
  if (input.environment === "production") {
    return false;
  }
  if (!isAdminShadowRealProviderEnabled(input.readEnv)) {
    return false;
  }
  return isAdminShadowRealProviderCaseAllowed(input.caseId);
}

function parseBudget(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function buildSyntheticAdminShadowPrompt(
  userRole: SalesBrainUserRole,
  redactedUserMessage: string
): string {
  return [
    "Synthetic admin shadow smoke only — not user-visible chat.",
    `Role: ${userRole}.`,
    `Message: ${redactedUserMessage}.`,
    "Reply briefly in Thai. No PII, no payment/settlement, no contact reveal.",
  ].join(" ");
}

async function defaultAdminShadowGeminiCaller(
  input: SalesBrainAdapterInput,
  options: { readEnv: SalesBrainEnvReader }
): Promise<AdminShadowGeminiCallResult> {
  const readEnv = options.readEnv;
  const request = buildAdminShadowProviderRequest(input, readEnv);
  const apiKey = readEnv("GEMINI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const prompt = buildSyntheticAdminShadowPrompt(
    request.userRole,
    request.redactedUserMessage
  );
  const response = await client.models.generateContent({
    model: ADMIN_SHADOW_GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: { maxOutputTokens: 256 },
  });

  const rawText = String(response.text ?? "").trim();
  const redactedProviderOutput = redactPiiForSalesBrainLog(rawText).slice(
    0,
    MAX_PROVIDER_OUTPUT_CHARS
  );

  return {
    providerNetworkUsed: true,
    redactedProviderOutput,
    requestIdHash: request.requestIdHash,
    modelId: ADMIN_SHADOW_GEMINI_MODEL,
    budgetDailyLimit: parseBudget(readEnv("NONGA_AI_BUDGET_DAILY_LIMIT")),
    budgetMonthlyLimit: parseBudget(readEnv("NONGA_AI_BUDGET_MONTHLY_LIMIT")),
  };
}

export async function invokeAdminShadowRealProvider(input: {
  userMessage: string;
  userRole: SalesBrainUserRole;
  readEnv?: SalesBrainEnvReader;
}): Promise<AdminShadowGeminiCallResult> {
  const readEnv = input.readEnv ?? defaultEnvReader;
  const adapterInput: SalesBrainAdapterInput = {
    userMessage: input.userMessage,
    userRole: input.userRole,
    aiMode: "high",
    provider: "real",
    paidProvider: "gemini",
  };

  const caller = testGeminiCaller ?? defaultAdminShadowGeminiCaller;
  try {
    return await caller(adapterInput, { readEnv });
  } catch (error) {
    if (shouldFallbackOnRealProviderError(error)) {
      throw error;
    }
    throw error;
  }
}
