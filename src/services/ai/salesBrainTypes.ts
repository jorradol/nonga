/**
 * v6.0E — Sales Brain mock routing types (local/deterministic, no paid API).
 * v6.0F — Adapter contract types (not wired to chat runtime).
 */

export type SalesBrainUserRole = "buyer" | "seller" | "dealer" | "admin" | "superadmin";

export type SalesBrainAiMode = "off" | "low" | "standard" | "high";

export type SalesBrainSafetyDecision = "allow" | "no_go" | "askFollowUp";

export type SalesBrainAiProvider = "mock" | "none";

/** v6.0F adapter provider — real is stub-only until wired behind feature flags */
export type SalesBrainAdapterProviderKind = "mock" | "real";

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
}

export interface SalesBrainAdapter {
  readonly provider: SalesBrainAdapterProviderKind;
  route(input: SalesBrainAdapterInput): SalesBrainAdapterOutput;
}

/** Controlled error when real provider is requested but not wired (v6.0F) */
export class SalesBrainRealProviderNotAvailableError extends Error {
  readonly code = "SALES_BRAIN_REAL_PROVIDER_NOT_WIRED" as const;

  constructor(message = "Real Sales Brain provider is not wired — use mock provider only") {
    super(message);
    this.name = "SalesBrainRealProviderNotAvailableError";
  }
}

/** Capability IDs that must never appear in mock write actions */
export const SALES_BRAIN_NO_GO_CAP_IDS = [] as const;

export const SALES_BRAIN_NO_GO_TOOL_PATTERNS =
  /settlement adjust|revenue write|process payment|generate invoice|reveal phone|send buyer number|submit lead without consent/i;

/** Tool ID patterns that must never appear in allowed mock tool calls */
export const SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS =
  /settlement.*write|payment\.|invoice\.|revenueWrite|contactReveal/i;
