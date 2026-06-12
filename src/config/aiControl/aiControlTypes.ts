/**
 * v6.4B — AI control plane types (static model only — no runtime enablement).
 */

/** Global AI provider status — default must be OFF. */
export type AiProviderStatus = "OFF" | "MOCK" | "STAGING_REAL" | "DISABLED";

/** Per-surface mode — default deterministic-only / off. */
export type AiSurfaceMode =
  | "OFF"
  | "DETERMINISTIC_ONLY"
  | "MOCK"
  | "STAGING_REAL"
  | "DISABLED";

export type AiControlEnvironment = "production" | "staging" | "local";

export type AiControlActorRole = "superadmin" | "admin";

export type AiControlSurfaceId =
  | "buyerFriendlyDetailPreview"
  | "inChatGoldenSellerWeave"
  | "sellerListingCopy"
  | "buyerChatAnswer"
  | "recommendationExplanation";

export type AiControlPermission =
  | "viewStatus"
  | "viewUsageSummary"
  | "viewGuardFailFallback"
  | "flagIssue"
  | "viewSurfaceStatus"
  | "changeMockOrOff"
  | "approveStagingRealReadiness"
  | "manageAllowlistReadiness"
  | "setCapsReadiness"
  | "triggerKillSwitchReadiness"
  | "viewAuditSummary";

export type AiAuditEventType =
  | "providerStateChange"
  | "killSwitch"
  | "capChange"
  | "surfaceApproval"
  | "guardFail"
  | "fallback"
  | "issueFlagged";

/** Redacted audit event — no full UID, raw prompt, secret, or env dump. */
export interface AiAuditEvent {
  eventType: AiAuditEventType;
  actorRole: AiControlActorRole;
  /** Masked actor id only — e.g. adm_***xyz */
  maskedActorId: string;
  surface: AiControlSurfaceId | "global";
  previousStatus: AiProviderStatus | AiSurfaceMode;
  nextStatus: AiProviderStatus | AiSurfaceMode;
  reason: string;
  /** ISO 8601 timestamp type placeholder — set at runtime in future slices. */
  timestamp: string;
}

export interface AiSurfaceDefinition {
  id: AiControlSurfaceId;
  label: string;
  description: string;
  /** v6.4E pilot candidate — still default off in v6.4B. */
  stagingRealPilotCandidate: boolean;
}

export interface AiSurfaceControlState {
  surfaceId: AiControlSurfaceId;
  mode: AiSurfaceMode;
}

export interface AiCostCapConfig {
  /** Global daily request cap — null = unset (block real provider). */
  dailyRequestCap: number | null;
  /** Per-surface caps keyed by surface id. */
  perSurfaceCaps: Partial<Record<AiControlSurfaceId, number | null>>;
  /** Per-user/session cap — e.g. 10 requests per session. */
  perUserSessionCap: number | null;
  /** Daily USD/token cost guard — null = unset. */
  costGuardUsd: number | null;
}

export type AiCapExceededFallback = "deterministic";

export interface AiNoRepeatGenerationPolicy {
  /** Skip provider call when deterministic output is already acceptable. */
  enabled: boolean;
  /** Prefer cached deterministic output before any provider call. */
  preferCachedDeterministic: boolean;
}

export interface AiPerListingCacheReadiness {
  /** Public fields used for cache key — never includes UID or forbidden fields. */
  keyFields: readonly AiPromptAllowedField[];
  /** Cache TTL seconds — conservative default for future runtime. */
  ttlSeconds: number;
}

export type AiPromptAllowedField =
  | "brand"
  | "model"
  | "year"
  | "bodyType"
  | "fuelType"
  | "price"
  | "mileage"
  | "sanitizedPublicDescription"
  | "normalizedPublicFeatures";

export type AiPromptForbiddenField =
  | "licensePlate"
  | "phone"
  | "line"
  | "fullUid"
  | "wholesaleInternalPrice"
  | "secretEnvValues"
  | "rawImageUrl"
  | "privateAdminNotes"
  | "rawPromptDumpWithPii";

export type AiOutputGuardCategory =
  | "pii"
  | "secretRawUrl"
  | "forbiddenClaims"
  | "hype"
  | "kmPerLiterWithoutSource"
  | "accidentConditionOwnershipClaim"
  | "mixedThaiLatinCorruptedToken"
  | "financeClaimWithoutSource";

export interface AiOutputGuardPolicy {
  categories: readonly AiOutputGuardCategory[];
  onFail: AiCapExceededFallback;
}

export interface StagingRealProviderRequirements {
  environment: AiControlEnvironment;
  stagingApprovalGranted: boolean;
  allowlistConfigured: boolean;
  capsConfigured: boolean;
  killSwitchActive: boolean;
}

export interface AiKillSwitchState {
  active: boolean;
}

export interface AiControlPlaneConfig {
  providerStatus: AiProviderStatus;
  environment: AiControlEnvironment;
  killSwitch: AiKillSwitchState;
  surfaces: AiSurfaceControlState[];
  costCaps: AiCostCapConfig;
  noRepeatGeneration: AiNoRepeatGenerationPolicy;
  perListingCache: AiPerListingCacheReadiness;
  /** Shadow real provider flag — must remain false in v6.4B. */
  chatShadowRealProviderEnabled: boolean;
}

export type AiRolePermissionMatrix = Record<
  AiControlActorRole,
  ReadonlySet<AiControlPermission>
>;
