/**
 * v6.4F / v6.5U.EXEC — Real provider adapter skeleton (disabled by default, no network, no secrets).
 * v6.5U.EXEC adds runtime-adjacent redaction validation — still blocked, no provider invoke.
 * Not wired to useChat, orchestrator, Firestore, or backend — readiness only.
 *
 * Future Gemini secret must come from approved Secret Manager path only
 * (see REAL_PROVIDER_SECRET_READINESS — resource names, never values).
 */
import type {
  AiControlEnvironment,
  AiControlSurfaceId,
  AiProviderStatus,
} from "../../config/aiControl/aiControlTypes.ts";
import {
  adminCanEnableRealProvider,
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  isProductionRealProviderForbidden,
  isStagingRealProviderAllowed,
  resolveEffectiveProviderStatus,
} from "../../config/aiControl/aiControlDefaults.ts";
import { BUYER_FRIENDLY_SAFETY_DISCLAIMER } from "../../utils/buyerFriendlyListingCopy.ts";
import type { AiShadowHarnessExpectation } from "./aiShadowHarness.ts";
import type { MockAiProviderMetadata } from "./mockAiProvider.ts";
import {
  validateAdapterMetadataSerialization,
  validateAdapterPayloadRedaction,
} from "./realProviderRedactionGuard.ts";

export const REAL_PROVIDER_ADAPTER_VERSION = "v6.5U.EXEC-gate-c-minimal";

/** v6.4F — adapter is structurally present but hard-disabled until future approval. */
export const REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED = false;

/** Provider mode — always disabled/blocked/fallback-only in v6.4F. */
export type RealProviderMode = "disabled" | "blocked" | "fallback-only";

/** Guard decision outcome — v6.4F always returns block. */
export type RealProviderGuardResult = "allow" | "block";

/** Deterministic reason codes for blocked/disabled states. */
export type RealProviderBlockedReasonCode =
  | "real_provider_disabled"
  | "production_forbidden"
  | "caps_unset"
  | "kill_switch_active"
  | "missing_approval"
  | "missing_allowlist"
  | "admin_cannot_enable"
  | "adapter_not_enabled"
  | "staging_gates_incomplete"
  | "forbidden_content_in_payload"
  | "metadata_invariant_failed";

export type RealProviderFallbackReasonCode =
  | RealProviderBlockedReasonCode
  | "deterministic_safety_disclaimer";

/** Future Secret Manager readiness — names only, never secret values. */
export const REAL_PROVIDER_SECRET_READINESS = {
  smResourceName: "gemini-api-key",
  envVarLogicalName: "GEMINI_API_KEY",
  smVersion: "latest" as const,
} as const;

export interface RealProviderAdapterGuardContext {
  environment: AiControlEnvironment;
  killSwitchActive: boolean;
  stagingApprovalGranted: boolean;
  allowlistConfigured: boolean;
  capsConfigured: boolean;
  /** Must remain false in v6.4F — no admin enable path exists. */
  adapterExplicitlyEnabled?: boolean;
}

export interface RealProviderAdapterMetadata {
  adapterVersion: typeof REAL_PROVIDER_ADAPTER_VERSION;
  providerMode: RealProviderMode;
  disabledReason: RealProviderBlockedReasonCode;
  fallbackReason: RealProviderFallbackReasonCode;
  guardResult: RealProviderGuardResult;
  realGeminiEnabled: false;
  networkCallMade: false;
  persistence: false;
  providerActivated: false;
  adminCanEnableRealProvider: false;
  surfaceId: AiControlSurfaceId;
  effectiveProviderStatus: AiProviderStatus;
  redactionApplied: boolean;
}

export interface RealProviderAdapterResult {
  blocked: true;
  fallbackUsed: true;
  text: string;
  metadata: RealProviderAdapterMetadata;
  reasonCode: RealProviderBlockedReasonCode;
}

export interface RealProviderAdapterInput {
  surfaceId: AiControlSurfaceId;
  /** Optional redacted payload candidate — validated pre-guard; never sent to provider in v6.5U.EXEC. */
  payloadCandidate?: string;
}

export interface RealProviderGuardEvaluation {
  guardResult: RealProviderGuardResult;
  reasonCode: RealProviderBlockedReasonCode;
  providerMode: RealProviderMode;
}

/** Type-only readiness bridge to v6.4D mock/shadow harness — no runtime wiring. */
export type RealProviderShadowHarnessReadinessMarker = {
  harnessExpectation: Pick<
    AiShadowHarnessExpectation,
    "realGeminiEnabled" | "network" | "persistence"
  >;
  mockMetadataShape: Pick<
    MockAiProviderMetadata,
    "realGeminiEnabled" | "network" | "persistence"
  >;
  adapterMetadataShape: Pick<
    RealProviderAdapterMetadata,
    "realGeminiEnabled" | "networkCallMade" | "persistence"
  >;
};

export function defaultRealProviderAdapterGuardContext(): RealProviderAdapterGuardContext {
  const config = DEFAULT_AI_CONTROL_PLANE_CONFIG;
  return {
    environment: config.environment,
    killSwitchActive: config.killSwitch.active,
    stagingApprovalGranted: false,
    allowlistConfigured: false,
    capsConfigured: capsConfiguredFromConfig(config.costCaps),
    adapterExplicitlyEnabled: false,
  };
}

function capsConfiguredFromConfig(costCaps: {
  dailyRequestCap: number | null;
  perUserSessionCap: number | null;
}): boolean {
  return (
    costCaps.dailyRequestCap !== null && costCaps.perUserSessionCap !== null
  );
}

/**
 * Deterministic guard chain — evaluates block reasons in priority order.
 * v6.4F: always blocks; never returns allow.
 */
export function evaluateRealProviderAdapterGuards(
  context: RealProviderAdapterGuardContext
): RealProviderGuardEvaluation {
  if (context.adapterExplicitlyEnabled !== true) {
    return guardBlock("adapter_not_enabled", "disabled");
  }
  if (isProductionRealProviderForbidden(context.environment)) {
    return guardBlock("production_forbidden", "blocked");
  }
  if (context.killSwitchActive) {
    return guardBlock("kill_switch_active", "blocked");
  }
  if (!context.capsConfigured) {
    return guardBlock("caps_unset", "blocked");
  }
  if (!context.stagingApprovalGranted) {
    return guardBlock("missing_approval", "blocked");
  }
  if (!context.allowlistConfigured) {
    return guardBlock("missing_allowlist", "blocked");
  }
  if (!adminCanEnableRealProvider()) {
    return guardBlock("admin_cannot_enable", "blocked");
  }
  if (
    !isStagingRealProviderAllowed({
      environment: context.environment,
      killSwitchActive: context.killSwitchActive,
      stagingApprovalGranted: context.stagingApprovalGranted,
      allowlistConfigured: context.allowlistConfigured,
      capsConfigured: context.capsConfigured,
    })
  ) {
    return guardBlock("staging_gates_incomplete", "blocked");
  }
  return guardBlock("real_provider_disabled", "fallback-only");
}

function guardBlock(
  reasonCode: RealProviderBlockedReasonCode,
  providerMode: RealProviderMode
): RealProviderGuardEvaluation {
  return {
    guardResult: "block",
    reasonCode,
    providerMode,
  };
}

function buildBlockedMetadata(
  input: RealProviderAdapterInput,
  evaluation: RealProviderGuardEvaluation,
  options?: { redactionApplied?: boolean }
): RealProviderAdapterMetadata {
  const config = DEFAULT_AI_CONTROL_PLANE_CONFIG;
  const effectiveProviderStatus = resolveEffectiveProviderStatus({
    providerStatus: config.providerStatus,
    killSwitchActive: config.killSwitch.active,
  });

  return {
    adapterVersion: REAL_PROVIDER_ADAPTER_VERSION,
    providerMode: evaluation.providerMode,
    disabledReason: evaluation.reasonCode,
    fallbackReason: "deterministic_safety_disclaimer",
    guardResult: evaluation.guardResult,
    realGeminiEnabled: false,
    networkCallMade: false,
    persistence: false,
    providerActivated: false,
    adminCanEnableRealProvider: false,
    surfaceId: input.surfaceId,
    effectiveProviderStatus,
    redactionApplied: options?.redactionApplied ?? false,
  };
}

function blockedAdapterResult(
  input: RealProviderAdapterInput,
  evaluation: RealProviderGuardEvaluation,
  options?: { redactionApplied?: boolean }
): RealProviderAdapterResult {
  const metadata = buildBlockedMetadata(input, evaluation, options);
  const metadataCheck = validateAdapterMetadataSerialization(
    JSON.stringify(metadata)
  );
  if (!metadataCheck.pass && metadataCheck.stopReason) {
    const metaBlock = guardBlock(metadataCheck.stopReason, "blocked");
    return {
      blocked: true,
      fallbackUsed: true,
      text: BUYER_FRIENDLY_SAFETY_DISCLAIMER,
      metadata: buildBlockedMetadata(input, metaBlock, { redactionApplied: false }),
      reasonCode: metadataCheck.stopReason,
    };
  }

  return {
    blocked: true,
    fallbackUsed: true,
    text: BUYER_FRIENDLY_SAFETY_DISCLAIMER,
    metadata,
    reasonCode: evaluation.reasonCode,
  };
}

/**
 * Real provider adapter skeleton entry — always returns deterministic fallback.
 * No SDK, no fetch, no env read, no secret read, no network call.
 */
export function invokeRealProviderAdapterSkeleton(
  input: RealProviderAdapterInput,
  guardContext: RealProviderAdapterGuardContext = defaultRealProviderAdapterGuardContext()
): RealProviderAdapterResult {
  const payloadCheck = validateAdapterPayloadRedaction(input.payloadCandidate);
  if (!payloadCheck.pass && payloadCheck.stopReason) {
    return blockedAdapterResult(
      input,
      guardBlock(payloadCheck.stopReason, "blocked"),
      { redactionApplied: false }
    );
  }

  const evaluation = evaluateRealProviderAdapterGuards(guardContext);
  return blockedAdapterResult(input, evaluation, { redactionApplied: true });
}

/** Type-only bridge — confirms adapter metadata aligns with shadow harness expectations. */
export function assertRealProviderShadowHarnessTypeReadiness(
  expectation: Pick<
    AiShadowHarnessExpectation,
    "realGeminiEnabled" | "network" | "persistence"
  >
): RealProviderShadowHarnessReadinessMarker {
  return {
    harnessExpectation: expectation,
    mockMetadataShape: {
      realGeminiEnabled: false,
      network: false,
      persistence: false,
    },
    adapterMetadataShape: {
      realGeminiEnabled: false,
      networkCallMade: false,
      persistence: false,
    },
  };
}
