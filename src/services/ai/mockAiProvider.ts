/**
 * v6.4D — Mock AI provider (deterministic, no network, no real Gemini).
 * Not wired to production chat — readiness for future shadow/mock pipeline only.
 */
import { createHash } from "node:crypto";
import type {
  AiControlSurfaceId,
  AiPromptAllowedField,
  AiPromptForbiddenField,
  AiProviderStatus,
  AiSurfaceMode,
} from "../../config/aiControl/aiControlTypes.ts";
import {
  AI_CONTROL_ALLOWED_PROMPT_FIELDS,
  AI_CONTROL_FORBIDDEN_PROMPT_FIELDS,
  AI_OUTPUT_GUARD_POLICY,
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  getDefaultSurfaceMode,
  isRealProviderStatus,
  isStagingRealProviderAllowed,
  resolveEffectiveProviderStatus,
} from "../../config/aiControl/aiControlDefaults.ts";
import {
  BUYER_FRIENDLY_SAFETY_DISCLAIMER,
  buildBuyerFriendlyListingCopy,
  buildCompactInChatSalesWeave,
  passesOutputGuard,
  type BuyerFriendlyListingCopyInput,
} from "../../utils/buyerFriendlyListingCopy.ts";

export const MOCK_AI_PROVIDER_VERSION = "v6.4D-mock-deterministic";

/** Controlled provider kinds — real Gemini is never one of these at runtime. */
export type MockAiProviderKind = "mock" | "disabled" | "stagingRealReadiness";

export interface MockAiPublicSafeInput {
  surfaceId: AiControlSurfaceId;
  /** Public-safe fields only — forbidden keys are rejected at the boundary. */
  fields: Partial<Record<AiPromptAllowedField, string | number | undefined>>;
  /** Optional deterministic seed — not a UID. */
  sessionSeed?: string;
}

export interface MockAiProviderMetadata {
  providerVersion: typeof MOCK_AI_PROVIDER_VERSION;
  providerKind: MockAiProviderKind;
  providerStatus: AiProviderStatus;
  effectiveStatus: AiProviderStatus;
  surfaceId: AiControlSurfaceId;
  surfaceMode: AiSurfaceMode;
  mock: boolean;
  shadow: boolean;
  realGeminiEnabled: false;
  network: false;
  persistence: false;
  outputGuardApplied: boolean;
  outputGuardPass: boolean;
  outputGuardOnFail: typeof AI_OUTPUT_GUARD_POLICY.onFail;
  fallbackUsed: boolean;
  deterministicHash: string;
  adminCanEnableRealProvider: false;
}

export interface MockAiProviderResult {
  text: string;
  metadata: MockAiProviderMetadata;
  guardReason?: string;
  blockedForbiddenFields: AiPromptForbiddenField[];
  warnings: string[];
}

export interface MockAiProviderOptions {
  /**
   * Readiness-only shadow simulation — does not change v6.4B control plane config.
   * When true, runs mock generation path with mock/shadow metadata while real provider stays OFF.
   */
  shadowSimulation?: boolean;
}

const FORBIDDEN_FIELD_SET = new Set<AiPromptForbiddenField>(
  AI_CONTROL_FORBIDDEN_PROMPT_FIELDS
);

const ALLOWED_FIELD_SET = new Set<AiPromptAllowedField>(
  AI_CONTROL_ALLOWED_PROMPT_FIELDS
);

export function detectForbiddenPromptFields(
  fields: Record<string, unknown>
): AiPromptForbiddenField[] {
  const blocked: AiPromptForbiddenField[] = [];
  for (const key of Object.keys(fields)) {
    if (FORBIDDEN_FIELD_SET.has(key as AiPromptForbiddenField)) {
      blocked.push(key as AiPromptForbiddenField);
    }
  }
  return blocked;
}

export function pickAllowedPublicSafeFields(
  fields: Partial<Record<AiPromptAllowedField, string | number | undefined>>
): Partial<Record<AiPromptAllowedField, string | number>> {
  const out: Partial<Record<AiPromptAllowedField, string | number>> = {};
  for (const key of AI_CONTROL_ALLOWED_PROMPT_FIELDS) {
    const value = fields[key];
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "number" ? value : String(value).trim();
  }
  return out;
}

export function mapToBuyerFriendlyInput(
  fields: Partial<Record<AiPromptAllowedField, string | number>>
): BuyerFriendlyListingCopyInput {
  const features =
    typeof fields.normalizedPublicFeatures === "string"
      ? fields.normalizedPublicFeatures
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
      : undefined;

  return {
    brand: fields.brand !== undefined ? String(fields.brand) : undefined,
    model: fields.model !== undefined ? String(fields.model) : undefined,
    year: typeof fields.year === "number" ? fields.year : undefined,
    price: typeof fields.price === "number" ? fields.price : undefined,
    mileage: typeof fields.mileage === "number" ? fields.mileage : undefined,
    bodyType: fields.bodyType !== undefined ? String(fields.bodyType) : undefined,
    fuelType: fields.fuelType !== undefined ? String(fields.fuelType) : undefined,
    description:
      fields.sanitizedPublicDescription !== undefined
        ? String(fields.sanitizedPublicDescription)
        : undefined,
    features,
  };
}

export function deterministicMockHash(input: {
  surfaceId: AiControlSurfaceId;
  fields: Partial<Record<AiPromptAllowedField, string | number>>;
  sessionSeed?: string;
}): string {
  const payload = {
    surfaceId: input.surfaceId,
    fields: AI_CONTROL_ALLOWED_PROMPT_FIELDS.map((key) => [
      key,
      input.fields[key] ?? "",
    ]),
    sessionSeed: input.sessionSeed ?? "default",
    version: MOCK_AI_PROVIDER_VERSION,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

export function resolveMockProviderKind(input: {
  effectiveStatus: AiProviderStatus;
  shadowSimulation: boolean;
  stagingRealBlocked: boolean;
}): MockAiProviderKind {
  if (input.effectiveStatus === "DISABLED") {
    return "disabled";
  }
  if (isRealProviderStatus(input.effectiveStatus)) {
    return input.stagingRealBlocked ? "stagingRealReadiness" : "stagingRealReadiness";
  }
  if (input.shadowSimulation && input.effectiveStatus === "OFF") {
    return "mock";
  }
  if (input.effectiveStatus === "MOCK") {
    return "mock";
  }
  return "disabled";
}

function generateSurfaceDeterministicDraft(
  surfaceId: AiControlSurfaceId,
  buyerInput: BuyerFriendlyListingCopyInput
): { text: string; warnings: string[]; guardPass: boolean } {
  if (
    surfaceId === "buyerFriendlyDetailPreview" ||
    surfaceId === "sellerListingCopy"
  ) {
    const result = buildBuyerFriendlyListingCopy(buyerInput);
    return {
      text: result.text,
      warnings: result.warnings,
      guardPass: result.guardPass,
    };
  }

  if (surfaceId === "inChatGoldenSellerWeave") {
    const weaveDescription = [
      buyerInput.description,
      ...(buyerInput.features ?? []),
    ]
      .filter(Boolean)
      .join(" + ");
    const weave = buildCompactInChatSalesWeave({
      brand: buyerInput.brand,
      model: buyerInput.model,
      year: buyerInput.year,
      bodyClassLabel: buyerInput.bodyType,
      fuelType: buyerInput.fuelType,
      description: weaveDescription,
    });
    if (weave.text.trim()) {
      return {
        text: weave.text,
        warnings: weave.warnings,
        guardPass: weave.guardPass,
      };
    }
    const listingLabel = [buyerInput.brand, buyerInput.model]
      .filter(Boolean)
      .join(" ")
      .trim();
    const fallbackWeave = listingLabel
      ? `คันนี้จุดที่น่าดูคือ${listingLabel} — mock shadow readiness weave (deterministic, no real provider).`
      : "คันนี้จุดที่น่าดูคือ mock shadow readiness weave (deterministic, no real provider).";
    return {
      text: fallbackWeave,
      warnings: [...weave.warnings, "weave-specs-insufficient-mock-fallback"],
      guardPass: passesOutputGuard(fallbackWeave).pass,
    };
  }

  const listingLabel = [buyerInput.brand, buyerInput.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  const text = listingLabel
    ? `[mock-shadow-readiness] ${listingLabel} — deterministic placeholder (no real provider).`
    : "[mock-shadow-readiness] deterministic placeholder (no real provider).";
  return { text, warnings: [], guardPass: passesOutputGuard(text).pass };
}

export function applyMockOutputGuardChain(text: string): {
  text: string;
  guardPass: boolean;
  guardReason?: string;
  fallbackUsed: boolean;
} {
  const guard = passesOutputGuard(text);
  if (guard.pass) {
    return { text, guardPass: true, fallbackUsed: false };
  }

  const fallback = BUYER_FRIENDLY_SAFETY_DISCLAIMER;
  const fallbackGuard = passesOutputGuard(fallback);
  return {
    text: fallbackGuard.pass ? fallback : "[mock-shadow] output blocked — use deterministic route.",
    guardPass: false,
    guardReason: guard.reason,
    fallbackUsed: true,
  };
}

/**
 * Deterministic mock provider — no network, no Gemini, no persistence.
 * Default v6.4B config keeps provider OFF; use shadowSimulation for readiness harness only.
 */
export function runMockAiProvider(
  input: MockAiPublicSafeInput,
  options: MockAiProviderOptions = {}
): MockAiProviderResult {
  const warnings: string[] = [];
  const shadowSimulation = options.shadowSimulation === true;
  const config = DEFAULT_AI_CONTROL_PLANE_CONFIG;
  const effectiveStatus = resolveEffectiveProviderStatus({
    providerStatus: config.providerStatus,
    killSwitchActive: config.killSwitch.active,
  });
  const surfaceMode = getDefaultSurfaceMode(input.surfaceId);
  const stagingRealBlocked = !isStagingRealProviderAllowed({
    environment: config.environment,
    killSwitchActive: config.killSwitch.active,
    stagingApprovalGranted: false,
    allowlistConfigured: false,
    capsConfigured: false,
  });

  const blockedForbiddenFields = detectForbiddenPromptFields(
    input.fields as Record<string, unknown>
  );
  if (blockedForbiddenFields.length > 0) {
    warnings.push(`forbidden-fields-blocked:${blockedForbiddenFields.join(",")}`);
  }

  const allowedFields = pickAllowedPublicSafeFields(input.fields);
  for (const key of Object.keys(input.fields)) {
    if (!ALLOWED_FIELD_SET.has(key as AiPromptAllowedField) && !FORBIDDEN_FIELD_SET.has(key as AiPromptForbiddenField)) {
      warnings.push(`unknown-field-ignored:${key}`);
    }
  }

  const providerKind = resolveMockProviderKind({
    effectiveStatus,
    shadowSimulation,
    stagingRealBlocked,
  });

  const hash = deterministicMockHash({
    surfaceId: input.surfaceId,
    fields: allowedFields,
    sessionSeed: input.sessionSeed,
  });

  if (providerKind === "disabled" && !shadowSimulation) {
    const buyerInput = mapToBuyerFriendlyInput(allowedFields);
    const draft = generateSurfaceDeterministicDraft(input.surfaceId, buyerInput);
    const guarded = applyMockOutputGuardChain(draft.text);
    return {
      text: guarded.text,
      metadata: {
        providerVersion: MOCK_AI_PROVIDER_VERSION,
        providerKind: "disabled",
        providerStatus: config.providerStatus,
        effectiveStatus,
        surfaceId: input.surfaceId,
        surfaceMode,
        mock: false,
        shadow: false,
        realGeminiEnabled: false,
        network: false,
        persistence: false,
        outputGuardApplied: true,
        outputGuardPass: guarded.guardPass,
        outputGuardOnFail: AI_OUTPUT_GUARD_POLICY.onFail,
        fallbackUsed: guarded.fallbackUsed,
        deterministicHash: hash,
        adminCanEnableRealProvider: false,
      },
      guardReason: guarded.guardReason,
      blockedForbiddenFields,
      warnings: [...warnings, ...draft.warnings],
    };
  }

  if (providerKind === "stagingRealReadiness") {
    warnings.push("staging-real-readiness-blocked");
    const fallback = applyMockOutputGuardChain(BUYER_FRIENDLY_SAFETY_DISCLAIMER);
    return {
      text: fallback.text,
      metadata: {
        providerVersion: MOCK_AI_PROVIDER_VERSION,
        providerKind: "stagingRealReadiness",
        providerStatus: config.providerStatus,
        effectiveStatus,
        surfaceId: input.surfaceId,
        surfaceMode,
        mock: true,
        shadow: shadowSimulation,
        realGeminiEnabled: false,
        network: false,
        persistence: false,
        outputGuardApplied: true,
        outputGuardPass: fallback.guardPass,
        outputGuardOnFail: AI_OUTPUT_GUARD_POLICY.onFail,
        fallbackUsed: true,
        deterministicHash: hash,
        adminCanEnableRealProvider: false,
      },
      guardReason: "staging-real-not-enabled",
      blockedForbiddenFields,
      warnings,
    };
  }

  const buyerInput = mapToBuyerFriendlyInput(allowedFields);
  const draft = generateSurfaceDeterministicDraft(input.surfaceId, buyerInput);
  const guarded = applyMockOutputGuardChain(draft.text);

  if (!adminCanEnableRealProvider()) {
    warnings.push("admin-cannot-enable-real-provider");
  }
  if (DEFAULT_AI_PROVIDER_STATUS !== "OFF") {
    warnings.push("unexpected-default-provider-status");
  }

  return {
    text: guarded.text,
    metadata: {
      providerVersion: MOCK_AI_PROVIDER_VERSION,
      providerKind: "mock",
      providerStatus: config.providerStatus,
      effectiveStatus,
      surfaceId: input.surfaceId,
      surfaceMode,
      mock: true,
      shadow: shadowSimulation,
      realGeminiEnabled: false,
      network: false,
      persistence: false,
      outputGuardApplied: true,
      outputGuardPass: guarded.guardPass,
      outputGuardOnFail: AI_OUTPUT_GUARD_POLICY.onFail,
      fallbackUsed: guarded.fallbackUsed,
      deterministicHash: hash,
      adminCanEnableRealProvider: false,
    },
    guardReason: guarded.guardReason,
    blockedForbiddenFields,
    warnings: [...warnings, ...draft.warnings],
  };
}
