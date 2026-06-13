/**
 * v6.5U.EXEC — Runtime-adjacent redaction guard for disabled adapter skeleton.
 * Pure validation only — no network, no secrets, no persistence, no provider invoke.
 */
import { assertNoForbiddenSensitiveContent } from "./redactionTestFixtures.ts";

export const REAL_PROVIDER_REDACTION_GUARD_VERSION =
  "v6.5U.EXEC-gate-c-minimal";

export type RealProviderRedactionStopReason =
  | "forbidden_content_in_payload"
  | "metadata_invariant_failed";

export type RealProviderRedactionValidationResult = {
  pass: boolean;
  stopReason?: RealProviderRedactionStopReason;
  violationIds?: string[];
};

export function validateAdapterPayloadRedaction(
  payload: string | undefined
): RealProviderRedactionValidationResult {
  if (payload === undefined || payload.trim() === "") {
    return { pass: true };
  }

  const check = assertNoForbiddenSensitiveContent(payload);
  if (!check.pass) {
    return {
      pass: false,
      stopReason: "forbidden_content_in_payload",
      violationIds: check.violations.map((v) => v.id),
    };
  }

  return { pass: true };
}

export function validateAdapterMetadataSerialization(
  serialized: string
): RealProviderRedactionValidationResult {
  const check = assertNoForbiddenSensitiveContent(serialized);
  if (!check.pass) {
    return {
      pass: false,
      stopReason: "metadata_invariant_failed",
      violationIds: check.violations.map((v) => v.id),
    };
  }

  return { pass: true };
}
