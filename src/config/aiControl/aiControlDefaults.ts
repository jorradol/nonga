/**
 * v6.4B — AI control plane defaults and static guards (no runtime enablement, no network).
 */
import type {
  AiControlEnvironment,
  AiControlPermission,
  AiControlPlaneConfig,
  AiControlSurfaceId,
  AiOutputGuardPolicy,
  AiPromptAllowedField,
  AiPromptForbiddenField,
  AiProviderStatus,
  AiRolePermissionMatrix,
  AiSurfaceDefinition,
  AiSurfaceMode,
  StagingRealProviderRequirements,
} from "./aiControlTypes.ts";

export const DEFAULT_AI_PROVIDER_STATUS: AiProviderStatus = "OFF";

export const DEFAULT_AI_SURFACE_MODE: AiSurfaceMode = "DETERMINISTIC_ONLY";

/** v6.1K shadow flag name — must stay false until v6.4E approval. */
export const AI_CHAT_SHADOW_REAL_PROVIDER_FLAG_ENV =
  "NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED";

export const AI_CONTROL_SURFACE_REGISTRY: readonly AiSurfaceDefinition[] = [
  {
    id: "buyerFriendlyDetailPreview",
    label: "Buyer-friendly detail preview",
    description: "Buyer-facing listing copy preview",
    stagingRealPilotCandidate: true,
  },
  {
    id: "inChatGoldenSellerWeave",
    label: "In-chat golden seller weave",
    description: "Curated sales copy weave in chat",
    stagingRealPilotCandidate: false,
  },
  {
    id: "sellerListingCopy",
    label: "Seller listing copy",
    description: "Seller assist listing description (golden seller copy)",
    stagingRealPilotCandidate: true,
  },
  {
    id: "buyerChatAnswer",
    label: "Buyer chat answer",
    description: "Buyer conversation AI response",
    stagingRealPilotCandidate: false,
  },
  {
    id: "recommendationExplanation",
    label: "Recommendation explanation",
    description: "Future recommendation/ranking explanation",
    stagingRealPilotCandidate: false,
  },
] as const;

export const AI_CONTROL_ALLOWED_PROMPT_FIELDS: readonly AiPromptAllowedField[] =
  [
    "brand",
    "model",
    "year",
    "bodyType",
    "fuelType",
    "price",
    "mileage",
    "sanitizedPublicDescription",
    "normalizedPublicFeatures",
  ] as const;

export const AI_CONTROL_FORBIDDEN_PROMPT_FIELDS: readonly AiPromptForbiddenField[] =
  [
    "licensePlate",
    "phone",
    "line",
    "fullUid",
    "wholesaleInternalPrice",
    "secretEnvValues",
    "rawImageUrl",
    "privateAdminNotes",
    "rawPromptDumpWithPii",
  ] as const;

export const AI_OUTPUT_GUARD_POLICY: AiOutputGuardPolicy = {
  categories: [
    "pii",
    "secretRawUrl",
    "forbiddenClaims",
    "hype",
    "kmPerLiterWithoutSource",
    "accidentConditionOwnershipClaim",
    "mixedThaiLatinCorruptedToken",
    "financeClaimWithoutSource",
  ],
  onFail: "deterministic",
};

const SUPERADMIN_PERMISSIONS: ReadonlySet<AiControlPermission> = new Set([
  "viewStatus",
  "viewUsageSummary",
  "viewGuardFailFallback",
  "flagIssue",
  "viewSurfaceStatus",
  "changeMockOrOff",
  "approveStagingRealReadiness",
  "manageAllowlistReadiness",
  "setCapsReadiness",
  "triggerKillSwitchReadiness",
  "viewAuditSummary",
]);

const ADMIN_PERMISSIONS: ReadonlySet<AiControlPermission> = new Set([
  "viewStatus",
  "viewUsageSummary",
  "viewGuardFailFallback",
  "flagIssue",
  "viewSurfaceStatus",
  "viewAuditSummary",
]);

export const AI_CONTROL_ROLE_PERMISSIONS: AiRolePermissionMatrix = {
  superadmin: SUPERADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

function defaultSurfaceStates(): AiControlPlaneConfig["surfaces"] {
  return AI_CONTROL_SURFACE_REGISTRY.map((surface) => ({
    surfaceId: surface.id,
    mode: DEFAULT_AI_SURFACE_MODE,
  }));
}

export const DEFAULT_AI_CONTROL_PLANE_CONFIG: AiControlPlaneConfig = {
  providerStatus: DEFAULT_AI_PROVIDER_STATUS,
  environment: "staging",
  killSwitch: { active: false },
  surfaces: defaultSurfaceStates(),
  costCaps: {
    dailyRequestCap: null,
    perSurfaceCaps: {},
    perUserSessionCap: null,
    costGuardUsd: null,
  },
  noRepeatGeneration: {
    enabled: true,
    preferCachedDeterministic: true,
  },
  perListingCache: {
    keyFields: [
      "brand",
      "model",
      "year",
      "bodyType",
      "fuelType",
      "price",
      "mileage",
      "sanitizedPublicDescription",
      "normalizedPublicFeatures",
    ],
    ttlSeconds: 3600,
  },
  chatShadowRealProviderEnabled: false,
};

/** Production real provider is always forbidden. */
export function isProductionRealProviderForbidden(
  environment: AiControlEnvironment
): boolean {
  return environment === "production";
}

/** Admin cannot enable real provider in the first rollout phase. */
export function adminCanEnableRealProvider(): boolean {
  return false;
}

export function roleHasPermission(
  role: keyof AiRolePermissionMatrix,
  permission: AiControlPermission
): boolean {
  return AI_CONTROL_ROLE_PERMISSIONS[role].has(permission);
}

export function resolveEffectiveProviderStatus(input: {
  providerStatus: AiProviderStatus;
  killSwitchActive: boolean;
}): AiProviderStatus {
  if (input.killSwitchActive) {
    return "DISABLED";
  }
  return input.providerStatus;
}

/**
 * STAGING_REAL requires staging environment + approval + allowlist + caps + kill switch off.
 */
export function isStagingRealProviderAllowed(
  requirements: StagingRealProviderRequirements
): boolean {
  if (requirements.environment !== "staging") {
    return false;
  }
  if (requirements.killSwitchActive) {
    return false;
  }
  if (!requirements.stagingApprovalGranted) {
    return false;
  }
  if (!requirements.allowlistConfigured) {
    return false;
  }
  if (!requirements.capsConfigured) {
    return false;
  }
  return true;
}

export function isRealProviderStatus(status: AiProviderStatus): boolean {
  return status === "STAGING_REAL";
}

/** Build per-listing cache key readiness string from public-safe fields only. */
export function buildPerListingCacheKeyReadiness(
  fields: Partial<Record<AiPromptAllowedField, string | number | undefined>>
): string {
  const parts = AI_CONTROL_ALLOWED_PROMPT_FIELDS.map((key) => {
    const value = fields[key];
    if (value === undefined || value === null) {
      return `${key}:`;
    }
    return `${key}:${String(value).trim()}`;
  });
  return parts.join("|");
}

export function getDefaultSurfaceMode(
  surfaceId: AiControlSurfaceId
): AiSurfaceMode {
  const found = DEFAULT_AI_CONTROL_PLANE_CONFIG.surfaces.find(
    (surface) => surface.surfaceId === surfaceId
  );
  return found?.mode ?? DEFAULT_AI_SURFACE_MODE;
}
