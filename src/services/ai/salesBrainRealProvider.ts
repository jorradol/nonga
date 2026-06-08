/**
 * v6.0N — Gemini real provider wiring behind disabled flag — no network, no secret values.
 * Round 1 = Gemini only; OpenAI future-only/no-op. Not wired to useChat / chatSearchOrchestrator.
 */
import { createHash } from "node:crypto";
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import type {
  SalesBrainAdapterInput,
  SalesBrainEnvReader,
  SalesBrainPaidProviderKind,
  SalesBrainRealProviderConfig,
  SalesBrainRealProviderRequest,
} from "./salesBrainTypes";
import {
  SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS,
  SALES_BRAIN_NO_GO_TOOL_PATTERNS,
  SalesBrainOpenAiFutureOnlyError,
  SalesBrainRealProviderMissingApiKeyError,
  SalesBrainRealProviderNetworkDisabledError,
} from "./salesBrainTypes";

export type {
  SalesBrainEnvReader,
  SalesBrainPaidProviderKind,
  SalesBrainRealProviderConfig,
  SalesBrainRealProviderRequest,
} from "./salesBrainTypes";

export {
  SalesBrainOpenAiFutureOnlyError,
  SalesBrainRealProviderMissingApiKeyError,
  SalesBrainRealProviderNetworkDisabledError,
} from "./salesBrainTypes";

/** v6.0N — network hard-off until explicit staging enablement */
export const SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED = false;

/** v6.0N — round 1 paid provider */
export const SALES_BRAIN_ROUND1_PAID_PROVIDER = "gemini" as const;

/** Cloud Run env var (logical) — maps to SM resource gemini-api-key:latest (v6.0L) */
export const SALES_BRAIN_GEMINI_ENV_VAR = "GEMINI_API_KEY";

/** Secret Manager resource name — not the secret value */
export const SALES_BRAIN_GEMINI_SM_RESOURCE = "gemini-api-key";

const SECRET_VALUE_LIKE = /^(AIza|sk-|sk-proj-)/;

/** v6.0N — Gemini env → SM mapping (names only) */
export function geminiSecretMapping(): {
  envVar: typeof SALES_BRAIN_GEMINI_ENV_VAR;
  smResource: typeof SALES_BRAIN_GEMINI_SM_RESOURCE;
  smVersion: "latest";
} {
  return {
    envVar: SALES_BRAIN_GEMINI_ENV_VAR,
    smResource: SALES_BRAIN_GEMINI_SM_RESOURCE,
    smVersion: "latest",
  };
}

export function defaultEnvReader(key: string): string | undefined {
  const raw =
    typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function defaultApiKeySecretName(provider: SalesBrainPaidProviderKind): string {
  if (provider === "gemini") {
    return SALES_BRAIN_GEMINI_ENV_VAR;
  }
  return "OPENAI_API_KEY";
}

export function defaultSmResourceName(provider: SalesBrainPaidProviderKind): string {
  if (provider === "gemini") {
    return SALES_BRAIN_GEMINI_SM_RESOURCE;
  }
  return "openai-api-key";
}

/** v6.0N — OpenAI is not active in round 1; no fallback to another provider */
export function assertRound1PaidProvider(provider: SalesBrainPaidProviderKind): void {
  if (provider === "openai") {
    throw new SalesBrainOpenAiFutureOnlyError();
  }
  if (provider !== "gemini") {
    throw new Error("Invalid paid provider — round 1 supports Gemini only");
  }
}

export function isGeminiApiKeyConfigured(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): boolean {
  const raw = readEnv(SALES_BRAIN_GEMINI_ENV_VAR);
  if (!raw) {
    return false;
  }
  if (SECRET_VALUE_LIKE.test(raw)) {
    return false;
  }
  return raw.length > 0;
}

/** Fail closed when GEMINI_API_KEY absent — no provider fallback */
export function assertGeminiApiKeyConfigured(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): void {
  if (!isGeminiApiKeyConfigured(readEnv)) {
    throw new SalesBrainRealProviderMissingApiKeyError();
  }
}

/**
 * Validate Gemini provider config — secret reference names only, never values.
 */
export function validateProviderConfig(config: SalesBrainRealProviderConfig): void {
  assertRound1PaidProvider(config.paidProvider);

  const mapping = geminiSecretMapping();
  if (config.apiKeySecretName !== mapping.envVar) {
    throw new Error(`apiKeySecretName must be ${mapping.envVar} for Gemini provider`);
  }
  if (config.smResourceName !== mapping.smResource) {
    throw new Error(`smResourceName must be ${mapping.smResource} for Gemini provider`);
  }
  if (SECRET_VALUE_LIKE.test(config.apiKeySecretName)) {
    throw new Error("apiKeySecretName must not contain secret value");
  }
  if (SECRET_VALUE_LIKE.test(config.smResourceName)) {
    throw new Error("smResourceName must not contain secret value");
  }
  const networkRequested =
    config.networkEnabled === true || SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED;
  if (networkRequested && !config.adminShadowRouteOnly) {
    throw new SalesBrainRealProviderNetworkDisabledError(
      "Real provider network is not enabled in v6.0N"
    );
  }
}

/** v6.1H — admin-only shadow route provider request (synthetic cases, redacted payload). */
export function buildAdminShadowProviderRequest(
  input: SalesBrainAdapterInput,
  readEnv: SalesBrainEnvReader = defaultEnvReader
): SalesBrainRealProviderRequest {
  assertGeminiApiKeyConfigured(readEnv);
  const config: SalesBrainRealProviderConfig = {
    ...resolveRealProviderConfig(input, SALES_BRAIN_ROUND1_PAID_PROVIDER),
    networkEnabled: true,
    adminShadowRouteOnly: true,
  };
  return buildProviderRequest(input, config);
}

function computeRequestIdHash(
  input: SalesBrainAdapterInput,
  provider: SalesBrainPaidProviderKind
): string {
  const safe = {
    provider,
    role: input.userRole,
    msg: redactPiiForSalesBrainLog(input.userMessage).slice(0, 120),
    listingId: input.listingContext?.listingId ?? null,
  };
  return createHash("sha256").update(JSON.stringify(safe)).digest("hex").slice(0, 16);
}

export function prepareProviderPayload(input: SalesBrainAdapterInput): {
  redactedUserMessage: string;
  listingContextSummary?: SalesBrainRealProviderRequest["listingContextSummary"];
} {
  const redactedUserMessage = redactPiiForSalesBrainLog(input.userMessage);
  const listingContextSummary = input.listingContext
    ? {
        listingId: input.listingContext.listingId,
        fieldsPresent: input.listingContext.fieldsPresent,
      }
    : undefined;
  return { redactedUserMessage, listingContextSummary };
}

export function assertProviderPayloadSafe(payload: {
  redactedUserMessage: string;
}): void {
  if (/0[689]\d{8,}/.test(payload.redactedUserMessage)) {
    throw new Error("Provider payload contains raw phone — PII guard violation");
  }
  if (SALES_BRAIN_NO_GO_TOOL_PATTERNS.test(payload.redactedUserMessage)) {
    throw new Error("Provider payload blocked — no-go zone in user message");
  }
  for (const pattern of [
    "settlement.*write",
    "payment\\.",
    "invoice\\.",
    "revenueWrite",
    "contactReveal",
  ]) {
    if (new RegExp(pattern, "i").test(payload.redactedUserMessage)) {
      throw new Error("Provider payload blocked — forbidden tool pattern");
    }
  }
  if (SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS.test(payload.redactedUserMessage)) {
    throw new Error("Provider payload blocked — forbidden tool id pattern");
  }
}

export function buildProviderRequest(
  input: SalesBrainAdapterInput,
  config: SalesBrainRealProviderConfig
): SalesBrainRealProviderRequest {
  validateProviderConfig(config);
  const { redactedUserMessage, listingContextSummary } = prepareProviderPayload(input);
  assertProviderPayloadSafe({ redactedUserMessage });

  if (/ผ่อน|ลดได้/i.test(input.userMessage) && !input.listingContext?.listingId) {
    throw new Error("Missing listing facts — askFollowUp required, no provider hallucination");
  }

  return {
    paidProvider: config.paidProvider,
    redactedUserMessage,
    userRole: input.userRole,
    aiMode: input.aiMode ?? "high",
    listingContextSummary,
    requestIdHash: computeRequestIdHash(input, config.paidProvider),
  };
}

/**
 * v6.0N — invoke stub; always throws network disabled (no fetch, no generateContent).
 * Future slice may wire Gemini client here when flag enabled.
 */
export function invokeRealProviderCall(_request: SalesBrainRealProviderRequest): never {
  throw new SalesBrainRealProviderNetworkDisabledError();
}

export function resolveRealProviderConfig(
  input: SalesBrainAdapterInput,
  realPaidProvider: SalesBrainPaidProviderKind = SALES_BRAIN_ROUND1_PAID_PROVIDER
): SalesBrainRealProviderConfig {
  const requested = input.paidProvider ?? realPaidProvider;
  assertRound1PaidProvider(requested);

  const mapping = geminiSecretMapping();
  return {
    paidProvider: SALES_BRAIN_ROUND1_PAID_PROVIDER,
    apiKeySecretName: mapping.envVar,
    smResourceName: mapping.smResource,
    networkEnabled: false,
  };
}

/** v6.0N — Gemini wiring entry: validate key, build request, invoke (throws network disabled). */
export function routeGeminiRealProviderDisabled(
  input: SalesBrainAdapterInput,
  options: { readEnv?: SalesBrainEnvReader } = {}
): never {
  const readEnv = options.readEnv ?? defaultEnvReader;
  const config = resolveRealProviderConfig(input, SALES_BRAIN_ROUND1_PAID_PROVIDER);
  assertGeminiApiKeyConfigured(readEnv);
  const request = buildProviderRequest(input, config);
  invokeRealProviderCall(request);
}

/** @deprecated alias — use routeGeminiRealProviderDisabled */
export function routeRealProviderStub(
  input: SalesBrainAdapterInput,
  realPaidProvider: SalesBrainPaidProviderKind = SALES_BRAIN_ROUND1_PAID_PROVIDER
): never {
  if (realPaidProvider === "openai" || input.paidProvider === "openai") {
    assertRound1PaidProvider("openai");
  }
  routeGeminiRealProviderDisabled(input);
}

/** v6.0N — map real provider errors to deterministic fallback eligibility */
export function shouldFallbackOnRealProviderError(error: unknown): boolean {
  return (
    error instanceof SalesBrainRealProviderNetworkDisabledError ||
    error instanceof SalesBrainRealProviderMissingApiKeyError ||
    error instanceof SalesBrainOpenAiFutureOnlyError
  );
}
