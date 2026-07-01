/**
 * v6.8B — Legacy Gemini safety gate (kill switch before SDK invoke).
 * Request-time check — GEMINI_API_KEY alone is not enough to call Gemini.
 */
import {
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED_ENV,
} from "../../services/ai/salesBrainRuntimeFlags";

export type LegacyGeminiBlockReason =
  | "missing_provider"
  | "kill_switch"
  | "legacy_public_disabled";

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isLegacyGeminiEmergencyKillSwitchActive(
  readEnv?: (key: string) => string | undefined
): boolean {
  const read =
    readEnv ??
    ((key: string) =>
      typeof process !== "undefined" ? (process.env[key] as string | undefined) : undefined);
  return parseTruthy(read(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV));
}

export function isLegacyPublicGeminiEnabled(
  readEnv?: (key: string) => string | undefined
): boolean {
  const read =
    readEnv ??
    ((key: string) =>
      typeof process !== "undefined" ? (process.env[key] as string | undefined) : undefined);
  return parseTruthy(read(NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED_ENV));
}

export function getLegacyGeminiBlockReason(
  aiClientPresent: boolean,
  readEnv?: (key: string) => string | undefined
): LegacyGeminiBlockReason | null {
  if (!aiClientPresent) {
    return "missing_provider";
  }
  if (!isLegacyPublicGeminiEnabled(readEnv)) {
    return "legacy_public_disabled";
  }
  if (isLegacyGeminiEmergencyKillSwitchActive(readEnv)) {
    return "kill_switch";
  }
  return null;
}

/** True only when Gemini client exists and emergency kill switch is off. */
export function canInvokeLegacyGeminiProvider(
  aiClientPresent: boolean,
  readEnv?: (key: string) => string | undefined
): boolean {
  return getLegacyGeminiBlockReason(aiClientPresent, readEnv) === null;
}

export function logLegacyGeminiBlocked(routeLabel: string, reason: LegacyGeminiBlockReason): void {
  if (reason === "kill_switch") {
    console.warn(
      `[${routeLabel}] NONGA_AI_EMERGENCY_KILL_SWITCH active — mock/fail-closed`
    );
    return;
  }
  if (reason === "legacy_public_disabled") {
    console.warn(
      `[${routeLabel}] NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED is off — mock/fail-closed`
    );
    return;
  }
  console.warn(`[${routeLabel}] GEMINI_API_KEY missing — mock/fail-closed`);
}
