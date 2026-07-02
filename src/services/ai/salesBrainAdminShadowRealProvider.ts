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
  NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV,
  NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV,
  NONGA_AI_ADMIN_SHADOW_PROVIDER_TIMEOUT_MS_ENV,
  NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainAdapterInput, SalesBrainUserRole } from "./salesBrainTypes";

export const ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS = ["SS-01"] as const;

export type AdminShadowRealProviderAllowedCaseId =
  (typeof ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS)[number];

export type AdminShadowRealProviderAttemptBlockedReason =
  | "production_environment"
  | "case_not_allowed_for_real_provider"
  | "admin_shadow_real_provider_flag_off"
  | "admin_shadow_manual_smoke_disabled"
  | "admin_shadow_manual_smoke_case_mismatch";

/** Align with server.ts Gemini routes (e.g. analyze-memory); gemini-2.0-flash returns 404 NOT_FOUND */
export const ADMIN_SHADOW_GEMINI_MODEL = "gemini-3.5-flash";
export const ADMIN_SHADOW_GEMINI_REQUEST_SHAPE = "sdk_contents_text_part";
const MAX_PROVIDER_OUTPUT_CHARS = 500;
const ADMIN_SHADOW_PROVIDER_TIMEOUT_DEFAULT_MS = 15000;
const ADMIN_SHADOW_PROVIDER_TIMEOUT_MIN_MS = 1000;
const ADMIN_SHADOW_PROVIDER_TIMEOUT_MAX_MS = 20000;

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
  options: { readEnv: SalesBrainEnvReader; signal: AbortSignal; timeoutMs: number }
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

export function isAdminShadowManualSmokeEnabled(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): boolean {
  return parseTruthy(readEnv(NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV));
}

export function getAdminShadowManualSmokeCaseId(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): string {
  return String(readEnv(NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV) ?? "").trim();
}

export function isAdminShadowRealProviderCaseAllowed(
  caseId: string
): caseId is AdminShadowRealProviderAllowedCaseId {
  return (ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS as readonly string[]).includes(caseId);
}

export function resolveAdminShadowRealProviderAttempt(input: {
  caseId: string;
  environment: "production" | "staging" | "local";
  readEnv?: SalesBrainEnvReader;
}):
  | { allowed: true }
  | {
      allowed: false;
      blockedReason: AdminShadowRealProviderAttemptBlockedReason;
    } {
  const readEnv = input.readEnv ?? defaultEnvReader;
  if (input.environment === "production") {
    return { allowed: false, blockedReason: "production_environment" };
  }
  if (!isAdminShadowRealProviderCaseAllowed(input.caseId)) {
    return {
      allowed: false,
      blockedReason: "case_not_allowed_for_real_provider",
    };
  }
  if (!isAdminShadowRealProviderEnabled(readEnv)) {
    return {
      allowed: false,
      blockedReason: "admin_shadow_real_provider_flag_off",
    };
  }
  if (!isAdminShadowManualSmokeEnabled(readEnv)) {
    return {
      allowed: false,
      blockedReason: "admin_shadow_manual_smoke_disabled",
    };
  }
  const manualCaseId = getAdminShadowManualSmokeCaseId(readEnv);
  if (manualCaseId !== input.caseId) {
    return {
      allowed: false,
      blockedReason: "admin_shadow_manual_smoke_case_mismatch",
    };
  }
  return { allowed: true };
}

export function canAttemptAdminShadowRealProvider(input: {
  caseId: string;
  environment: "production" | "staging" | "local";
  readEnv?: SalesBrainEnvReader;
}): boolean {
  return resolveAdminShadowRealProviderAttempt(input).allowed;
}

export class AdminShadowRealProviderTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Admin shadow provider timed out after ${timeoutMs}ms`);
    this.name = "AdminShadowRealProviderTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function resolveAdminShadowProviderTimeoutMs(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): number {
  const raw = String(
    readEnv(NONGA_AI_ADMIN_SHADOW_PROVIDER_TIMEOUT_MS_ENV) ?? ""
  ).trim();
  if (!raw) {
    return ADMIN_SHADOW_PROVIDER_TIMEOUT_DEFAULT_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return ADMIN_SHADOW_PROVIDER_TIMEOUT_DEFAULT_MS;
  }
  const rounded = Math.round(parsed);
  return Math.min(
    ADMIN_SHADOW_PROVIDER_TIMEOUT_MAX_MS,
    Math.max(ADMIN_SHADOW_PROVIDER_TIMEOUT_MIN_MS, rounded)
  );
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
  options: { readEnv: SalesBrainEnvReader; signal: AbortSignal; timeoutMs: number }
): Promise<AdminShadowGeminiCallResult> {
  const readEnv = options.readEnv;
  if (options.signal.aborted) {
    throw new AdminShadowRealProviderTimeoutError(options.timeoutMs);
  }
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
  const response = await (
    client.models.generateContent as unknown as (
      request: {
        model: string;
        contents: Array<{ text: string }>;
        config: { maxOutputTokens: number };
      },
      options?: { signal?: AbortSignal }
    ) => Promise<{ text?: string }>
  )(
    {
      model: ADMIN_SHADOW_GEMINI_MODEL,
      contents: [{ text: prompt }],
      config: { maxOutputTokens: 256 },
    },
    { signal: options.signal }
  );

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
  const timeoutMs = resolveAdminShadowProviderTimeoutMs(readEnv);
  const timeoutController = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<AdminShadowGeminiCallResult>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timeoutController.abort("admin_shadow_provider_timeout");
      reject(new AdminShadowRealProviderTimeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      caller(adapterInput, {
        readEnv,
        signal: timeoutController.signal,
        timeoutMs,
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (shouldFallbackOnRealProviderError(error)) {
      throw error;
    }
    throw error;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
