/**
 * v6.0E — Sales Brain mock routing types (local/deterministic, no paid API).
 */

export type SalesBrainUserRole = "buyer" | "seller" | "dealer" | "admin" | "superadmin";

export type SalesBrainAiMode = "off" | "low" | "standard" | "high";

export type SalesBrainSafetyDecision = "allow" | "no_go" | "askFollowUp";

export type SalesBrainAiProvider = "mock" | "none";

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

/** Capability IDs that must never appear in mock write actions */
export const SALES_BRAIN_NO_GO_CAP_IDS = [] as const;

export const SALES_BRAIN_NO_GO_TOOL_PATTERNS =
  /settlement adjust|revenue write|process payment|generate invoice|reveal phone|send buyer number|submit lead without consent/i;
