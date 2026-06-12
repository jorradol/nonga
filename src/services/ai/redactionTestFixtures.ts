/**
 * v6.4M — Synthetic redaction test fixtures (test-only, no runtime wiring).
 * Not wired to useChat, orchestrator, App.tsx, Firestore, or backend.
 * No network, no persistence, no env/secrets access, no Gemini SDK.
 */
import type { AiProviderStatus } from "../../config/aiControl/aiControlTypes.ts";

export const REDACTION_TEST_FIXTURE_VERSION =
  "v6.4M-synthetic-redaction-fixtures";

/** Forbidden log field categories — aligns with v6.4K contract (names only). */
export const FORBIDDEN_LOG_FIELDS = [
  "rawPrompt",
  "fullUserMessage",
  "fullUid",
  "email",
  "phone",
  "contactInfo",
  "thaiNationalId",
  "licensePlate",
  "vin",
  "chassisNumber",
  "realDealerListing",
  "realCarImageUrl",
  "dealerPrivateNote",
  "paymentLeadRevealOutcome",
  "secretValue",
  "apiKeyTokenCredential",
  "envDump",
  "providerRequestBody",
  "providerResponseBody",
  "identifiableRealCarData",
] as const;

export type ForbiddenLogField = (typeof FORBIDDEN_LOG_FIELDS)[number];

/** Allowed redacted metadata field names — v6.4K / v6.4M contract. */
export const ALLOWED_REDACTED_METADATA_FIELDS = [
  "providerMode",
  "providerStatus",
  "realGeminiEnabled",
  "networkCallMade",
  "guardDecisionCode",
  "blockedReasonCode",
  "fallbackReasonCode",
  "syntheticScenarioId",
  "environmentLabel",
  "coarseTimestampBucket",
  "nonReversibleCorrelationId",
  "tokenEstimateBucket",
  "latencyBucket",
  "costBucket",
  "successFailureCategory",
  "redactionApplied",
  "killSwitchState",
  "capState",
  "allowlistState",
] as const;

export type AllowedRedactedMetadataField =
  (typeof ALLOWED_REDACTED_METADATA_FIELDS)[number];

export type SyntheticRedactedMetadataFixture = {
  [K in AllowedRedactedMetadataField]: K extends "providerMode"
    ? "disabled" | "blocked" | "fallback-only"
    : K extends "providerStatus"
      ? AiProviderStatus
      : K extends "realGeminiEnabled"
        ? false
        : K extends "networkCallMade"
          ? false
          : K extends "redactionApplied"
            ? true
            : K extends "environmentLabel"
              ? "staging" | "local"
              : K extends "killSwitchState"
                ? boolean
                : K extends "capState"
                  ? "within-cap" | "cap-unset"
                  : K extends "allowlistState"
                    ? "configured" | "not-configured"
                    : K extends "successFailureCategory"
                      ? "blocked" | "fallback"
                      : string;
};

const FORBIDDEN_SENSITIVE_PATTERNS: ReadonlyArray<{
  id: string;
  category: ForbiddenLogField;
  pattern: RegExp;
}> = [
  { id: "raw-prompt-long", category: "rawPrompt", pattern: /prompt:\s*["'][^"']{30,}["']/i },
  { id: "full-uid", category: "fullUid", pattern: /\b[a-zA-Z0-9]{28}\b/ },
  { id: "email", category: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { id: "phone-th", category: "phone", pattern: /\b0[689]\d{8}\b/ },
  { id: "thai-id", category: "thaiNationalId", pattern: /\b\d{13}\b/ },
  { id: "license-plate", category: "licensePlate", pattern: /\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/ },
  { id: "vin", category: "vin", pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/i },
  { id: "secret-aiza", category: "secretValue", pattern: /AIza[Sy][a-zA-Z0-9_-]{20,}/ },
  { id: "secret-sk", category: "apiKeyTokenCredential", pattern: /\bsk-[a-zA-Z0-9]{20,}\b/ },
  { id: "bearer-token", category: "apiKeyTokenCredential", pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/i },
  {
    id: "env-dump",
    category: "envDump",
    pattern: new RegExp("\\bprocess" + ".env\\b"),
  },
  {
    id: "provider-generate",
    category: "providerRequestBody",
    pattern: new RegExp("generate" + "Content\\s*\\("),
  },
  { id: "real-image-url", category: "realCarImageUrl", pattern: /firebasestorage\.googleapis\.com/i },
  { id: "production-url", category: "identifiableRealCarData", pattern: /https?:\/\/(?:www\.)?nongbot\.org\b/i },
];

export interface ForbiddenContentCheckResult {
  pass: boolean;
  violations: Array<{ id: string; category: ForbiddenLogField }>;
}

export interface MetadataInvariantCheckResult {
  pass: boolean;
  failures: string[];
}

/** Build synthetic redacted metadata — all v6.4M invariants enforced at type level. */
export function buildSyntheticRedactedMetadataFixture(
  overrides?: Partial<
    Pick<
      SyntheticRedactedMetadataFixture,
      | "syntheticScenarioId"
      | "guardDecisionCode"
      | "blockedReasonCode"
      | "fallbackReasonCode"
    >
  >
): SyntheticRedactedMetadataFixture {
  return {
    providerMode: "blocked",
    providerStatus: "OFF",
    realGeminiEnabled: false,
    networkCallMade: false,
    guardDecisionCode: overrides?.guardDecisionCode ?? "SYNTH_GUARD_BLOCK",
    blockedReasonCode: overrides?.blockedReasonCode ?? "adapter_not_enabled",
    fallbackReasonCode:
      overrides?.fallbackReasonCode ?? "deterministic_safety_disclaimer",
    syntheticScenarioId:
      overrides?.syntheticScenarioId ?? "SYNTH_REDACTION_SCENARIO_001",
    environmentLabel: "staging",
    coarseTimestampBucket: "2026-06-12T21:00Z",
    nonReversibleCorrelationId: "corr_synth_***001",
    tokenEstimateBucket: "0-0",
    latencyBucket: "0ms",
    costBucket: "zero",
    successFailureCategory: "blocked",
    redactionApplied: true,
    killSwitchState: true,
    capState: "cap-unset",
    allowlistState: "not-configured",
  };
}

/** Assert text/metadata serialization contains no forbidden sensitive patterns. */
export function assertNoForbiddenSensitiveContent(
  input: string
): ForbiddenContentCheckResult {
  const violations: ForbiddenContentCheckResult["violations"] = [];
  for (const { id, category, pattern } of FORBIDDEN_SENSITIVE_PATTERNS) {
    if (pattern.test(input)) {
      violations.push({ id, category });
    }
  }
  return { pass: violations.length === 0, violations };
}

/** Verify metadata fixture keys match allowlist and invariants hold. */
export function assertSyntheticMetadataInvariants(
  metadata: SyntheticRedactedMetadataFixture
): MetadataInvariantCheckResult {
  const failures: string[] = [];
  const keys = Object.keys(metadata) as AllowedRedactedMetadataField[];

  for (const field of ALLOWED_REDACTED_METADATA_FIELDS) {
    if (!(field in metadata)) {
      failures.push(`missing allowed field: ${field}`);
    }
  }

  for (const key of keys) {
    if (!ALLOWED_REDACTED_METADATA_FIELDS.includes(key)) {
      failures.push(`unexpected metadata key: ${key}`);
    }
  }

  if (metadata.realGeminiEnabled !== false) {
    failures.push("realGeminiEnabled must be false");
  }
  if (metadata.networkCallMade !== false) {
    failures.push("networkCallMade must be false");
  }
  if (metadata.redactionApplied !== true) {
    failures.push("redactionApplied must be true");
  }
  if (!["staging", "local"].includes(metadata.environmentLabel)) {
    failures.push("environmentLabel must be staging or local");
  }
  if (!metadata.syntheticScenarioId.startsWith("SYNTH_")) {
    failures.push("syntheticScenarioId must use SYNTH_ prefix");
  }

  const serialized = JSON.stringify(metadata);
  const forbidden = assertNoForbiddenSensitiveContent(serialized);
  if (!forbidden.pass) {
    failures.push(
      ...forbidden.violations.map((v) => `forbidden pattern: ${v.id}`)
    );
  }

  return { pass: failures.length === 0, failures };
}

/** Verify metadata cannot reconstruct raw prompt/PII (no long free-text fields). */
export function assertNoReconstructableRawContent(
  metadata: SyntheticRedactedMetadataFixture
): MetadataInvariantCheckResult {
  const failures: string[] = [];
  for (const value of Object.values(metadata)) {
    if (typeof value === "string" && value.length > 64) {
      failures.push("metadata string value exceeds safe bucket length");
    }
  }
  return { pass: failures.length === 0, failures };
}

export const SYNTHETIC_REDACTION_FIXTURES = {
  version: REDACTION_TEST_FIXTURE_VERSION,
  scenarioId: "SYNTH_REDACTION_SCENARIO_001",
  metadata: buildSyntheticRedactedMetadataFixture(),
  allowedSampleLabels: [
    "SYNTH_INTENT_BUDGET_SEARCH",
    "SYNTH_VEHICLE_SEDAN",
    "STAGING_REGION_A",
  ] as const,
  forbiddenCategoryLabels: FORBIDDEN_LOG_FIELDS,
  markers: {
    userVisibleAnswer: false,
    dbWrite: false,
    mutationMarker: false,
    persistence: false,
    analyticsEvent: false,
  },
} as const;
