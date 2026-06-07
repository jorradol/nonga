/**
 * v6.0E — Sales Brain mock routing types (local/deterministic, no paid API).
 * v6.0F — Adapter contract types (not wired to chat runtime).
 */

export type SalesBrainUserRole = "buyer" | "seller" | "dealer" | "admin" | "superadmin";

export type SalesBrainAiMode = "off" | "low" | "standard" | "high";

export type SalesBrainSafetyDecision = "allow" | "no_go" | "askFollowUp";

export type SalesBrainAiProvider = "mock" | "none";

/** v6.0F adapter provider — mock default; real delegates to paid stub (v6.0J) */
export type SalesBrainAdapterProviderKind = "mock" | "real";

/** v6.0J — paid AI provider candidates; v6.0N round 1 = gemini only, openai future-only */
export type SalesBrainPaidProviderKind = "gemini" | "openai";

/** v6.0N — Round 1 active paid provider (Gemini only) */
export type SalesBrainRound1PaidProvider = "gemini";

export interface SalesBrainFlowContext {
  sessionIdHash?: string;
  selectedListingId?: string;
  attachedImageCount?: number;
}

export interface SalesBrainListingContext {
  listingId?: string;
  price?: number;
  brand?: string;
  model?: string;
  fieldsPresent?: string[];
}

export interface SalesBrainMockInput {
  userMessage: string;
  userRole: SalesBrainUserRole;
  flowContext?: SalesBrainFlowContext;
  listingContext?: SalesBrainListingContext;
  aiMode?: SalesBrainAiMode;
  aiProvider?: SalesBrainAiProvider;
  /** v6.0B design — when false, route to deterministic fallback */
  aiFirstEnabled?: boolean;
  /** v6.0B NONGA_AI_EMERGENCY_KILL_SWITCH design */
  emergencyKillSwitch?: boolean;
}

/** v6.0F — input to adapter route (extends mock input with optional provider override) */
export interface SalesBrainAdapterInput extends SalesBrainMockInput {
  provider?: SalesBrainAdapterProviderKind;
  /** v6.0J — when provider=real, select gemini or openai stub */
  paidProvider?: SalesBrainPaidProviderKind;
}

export interface SalesBrainMockToolCall {
  toolId: string;
  capId: string;
  mock: true;
  paramsHash: string;
}

export interface SalesBrainLogRecord {
  intent: string;
  caps: string[];
  safety: SalesBrainSafetyDecision;
  paramsHash: string;
  latencyMs: number;
}

export interface SalesBrainMockOutput {
  intent: string;
  selectedCapabilities: string[];
  mockToolCalls: SalesBrainMockToolCall[];
  responsePlan: string;
  safetyDecision: SalesBrainSafetyDecision;
  fallback: boolean;
  askFollowUp?: string;
  logRecord: SalesBrainLogRecord;
}

/** v6.0F — adapter output adds routing metadata; no raw PII in logRecord */
export type SalesBrainAdapterRouteVia = "mock" | "fallback" | "real_unavailable";

export interface SalesBrainAdapterOutput extends SalesBrainMockOutput {
  provider: SalesBrainAdapterProviderKind;
  routedVia: SalesBrainAdapterRouteVia;
}

export interface SalesBrainAdapterConfig {
  provider?: SalesBrainAdapterProviderKind;
  aiMode?: SalesBrainAiMode;
  aiFirstEnabled?: boolean;
  emergencyKillSwitch?: boolean;
  /** v6.0N — default paid provider when provider=real (gemini only in round 1) */
  realPaidProvider?: SalesBrainPaidProviderKind;
  /** v6.0N — inject env reader for tests; default reads process.env */
  readEnv?: SalesBrainEnvReader;
}

/** v6.0N — read env without logging values */
export type SalesBrainEnvReader = (key: string) => string | undefined;

/** v6.0J / v6.0N — real provider config (secret names only — never values) */
export interface SalesBrainRealProviderConfig {
  paidProvider: SalesBrainPaidProviderKind;
  /** Cloud Run env var e.g. GEMINI_API_KEY — not the key value */
  apiKeySecretName: string;
  /** v6.0N — Secret Manager resource e.g. gemini-api-key — not the key value */
  smResourceName: string;
  /** Must remain false in v6.0N — no live network */
  networkEnabled?: boolean;
}

/** v6.0J — prepared request payload (PII redacted — no network sent in stub) */
export interface SalesBrainRealProviderRequest {
  paidProvider: SalesBrainPaidProviderKind;
  redactedUserMessage: string;
  userRole: SalesBrainUserRole;
  aiMode: SalesBrainAiMode;
  listingContextSummary?: {
    listingId?: string;
    fieldsPresent?: string[];
  };
  requestIdHash: string;
}

export interface SalesBrainAdapter {
  readonly provider: SalesBrainAdapterProviderKind;
  route(input: SalesBrainAdapterInput): SalesBrainAdapterOutput;
}

/** Controlled error when real provider is requested but not wired (v6.0F legacy path) */
export class SalesBrainRealProviderNotAvailableError extends Error {
  readonly code = "SALES_BRAIN_REAL_PROVIDER_NOT_WIRED" as const;

  constructor(message = "Real Sales Brain provider is not wired — use mock provider only") {
    super(message);
    this.name = "SalesBrainRealProviderNotAvailableError";
  }
}

/** v6.0J / v6.0N — network calls disabled until staging enablement */
export class SalesBrainRealProviderNetworkDisabledError extends Error {
  readonly code = "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED" as const;

  constructor(
    message = "Real Sales Brain provider network is disabled — Gemini wiring behind flag in v6.0N"
  ) {
    super(message);
    this.name = "SalesBrainRealProviderNetworkDisabledError";
  }
}

/** v6.0N — GEMINI_API_KEY not present in runtime env — fail closed */
export class SalesBrainRealProviderMissingApiKeyError extends Error {
  readonly code = "SALES_BRAIN_REAL_PROVIDER_MISSING_API_KEY" as const;

  constructor(
    message = "GEMINI_API_KEY is not configured — real Gemini provider fail closed"
  ) {
    super(message);
    this.name = "SalesBrainRealProviderMissingApiKeyError";
  }
}

/** v6.0N — OpenAI is optional future-only; not used in round 1 */
export class SalesBrainOpenAiFutureOnlyError extends Error {
  readonly code = "SALES_BRAIN_OPENAI_FUTURE_ONLY_NOOP" as const;

  constructor(
    message = "OpenAI provider is future-only in round 1 — use Gemini only"
  ) {
    super(message);
    this.name = "SalesBrainOpenAiFutureOnlyError";
  }
}

/** Capability IDs that must never appear in mock write actions */
export const SALES_BRAIN_NO_GO_CAP_IDS = [] as const;

export const SALES_BRAIN_NO_GO_TOOL_PATTERNS =
  /settlement adjust|revenue write|process payment|generate invoice|reveal phone|send buyer number|submit lead without consent/i;

/** Tool ID patterns that must never appear in allowed mock tool calls */
export const SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS =
  /settlement.*write|payment\.|invoice\.|revenueWrite|contactReveal/i;
