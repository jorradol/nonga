/**
 * v6.0J — Real paid AI provider stub (gemini/openai) — no network, no secret values.
 * Not wired to useChat / chatSearchOrchestrator.
 */
import { createHash } from "node:crypto";
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import type {
  SalesBrainAdapterInput,
  SalesBrainPaidProviderKind,
  SalesBrainRealProviderConfig,
  SalesBrainRealProviderRequest,
} from "./salesBrainTypes";
import {
  SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS,
  SALES_BRAIN_NO_GO_TOOL_PATTERNS,
  SalesBrainRealProviderNetworkDisabledError,
} from "./salesBrainTypes";

export type {
  SalesBrainPaidProviderKind,
  SalesBrainRealProviderConfig,
  SalesBrainRealProviderRequest,
} from "./salesBrainTypes";

export { SalesBrainRealProviderNetworkDisabledError } from "./salesBrainTypes";

/** v6.0J — network permanently off in this slice */
export const SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED = false;

const SECRET_NAME_BY_PROVIDER: Record<SalesBrainPaidProviderKind, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
};

const SECRET_VALUE_LIKE = /^(AIza|sk-|sk-proj-)/;

export function defaultApiKeySecretName(provider: SalesBrainPaidProviderKind): string {
  return SECRET_NAME_BY_PROVIDER[provider];
}

/**
 * Validate provider config — secret reference name only, never the key value.
 */
export function validateProviderConfig(config: SalesBrainRealProviderConfig): void {
  if (config.paidProvider !== "gemini" && config.paidProvider !== "openai") {
    throw new Error("Invalid paid provider — must be gemini or openai");
  }
  const expectedName = defaultApiKeySecretName(config.paidProvider);
  if (config.apiKeySecretName !== expectedName) {
    throw new Error(`apiKeySecretName must be ${expectedName} for provider ${config.paidProvider}`);
  }
  if (SECRET_VALUE_LIKE.test(config.apiKeySecretName)) {
    throw new Error("apiKeySecretName must not contain secret value");
  }
  if (config.networkEnabled === true || SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED) {
    throw new SalesBrainRealProviderNetworkDisabledError(
      "Real provider network is not enabled in v6.0J"
    );
  }
}

function computeRequestIdHash(input: SalesBrainAdapterInput, provider: SalesBrainPaidProviderKind): string {
  const safe = {
    provider,
    role: input.userRole,
    msg: redactPiiForSalesBrainLog(input.userMessage).slice(0, 120),
    listingId: input.listingContext?.listingId ?? null,
  };
  return createHash("sha256").update(JSON.stringify(safe)).digest("hex").slice(0, 16);
}

/**
 * Redact and prepare input before any future provider call.
 */
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
  for (const pattern of ["settlement.*write", "payment\\.", "invoice\\.", "revenueWrite", "contactReveal"]) {
    if (new RegExp(pattern, "i").test(payload.redactedUserMessage)) {
      throw new Error("Provider payload blocked — forbidden tool pattern");
    }
  }
  if (SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS.test(payload.redactedUserMessage)) {
    throw new Error("Provider payload blocked — forbidden tool id pattern");
  }
}

/**
 * Build provider request object — no network I/O.
 */
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
 * Stub invoke — always throws in v6.0J (no fetch, no generateContent, no paid API).
 */
export function invokeRealProviderCall(_request: SalesBrainRealProviderRequest): never {
  throw new SalesBrainRealProviderNetworkDisabledError();
}

export function resolveRealProviderConfig(
  input: SalesBrainAdapterInput,
  realPaidProvider: SalesBrainPaidProviderKind = "gemini"
): SalesBrainRealProviderConfig {
  const paidProvider = input.paidProvider ?? realPaidProvider;
  return {
    paidProvider,
    apiKeySecretName: defaultApiKeySecretName(paidProvider),
    networkEnabled: false,
  };
}

/** Entry: validate, build request, attempt invoke (throws network disabled). */
export function routeRealProviderStub(
  input: SalesBrainAdapterInput,
  realPaidProvider: SalesBrainPaidProviderKind = "gemini"
): never {
  const config = resolveRealProviderConfig(input, realPaidProvider);
  const request = buildProviderRequest(input, config);
  invokeRealProviderCall(request);
}
