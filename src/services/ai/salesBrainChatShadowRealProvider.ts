/**
 * v6.1K — Chat-path shadow sink real Gemini provider (staging, CP-02 only).
 * Server-side only — not wired to browser; user-visible response stays legacy.
 */
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  ADMIN_SHADOW_GEMINI_REQUEST_SHAPE,
  invokeAdminShadowRealProvider,
  type AdminShadowGeminiCallResult,
} from "./salesBrainAdminShadowRealProvider";
import { defaultEnvReader, type SalesBrainEnvReader } from "./salesBrainRealProvider";
import {
  NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainUserRole } from "./salesBrainTypes";

export {
  ADMIN_SHADOW_GEMINI_MODEL,
  ADMIN_SHADOW_GEMINI_REQUEST_SHAPE,
  setAdminShadowGeminiCallerForTests,
  resetAdminShadowGeminiCallerForTests,
} from "./salesBrainAdminShadowRealProvider";

export const CHAT_SHADOW_REAL_PROVIDER_ALLOWED_SCENARIO_IDS = ["CP-02"] as const;

export type ChatShadowRealProviderAllowedScenarioId =
  (typeof CHAT_SHADOW_REAL_PROVIDER_ALLOWED_SCENARIO_IDS)[number];

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isChatShadowRealProviderEnabled(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): boolean {
  return parseTruthy(readEnv(NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV));
}

/** Global Cloud Run / process env kill switch — not scenario-local stagingStyleShadowEnv override. */
export function isGlobalChatShadowEmergencyKillSwitchActive(
  readEnv: SalesBrainEnvReader = defaultEnvReader
): boolean {
  return parseTruthy(readEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV));
}

export function isChatShadowRealProviderScenarioAllowed(
  scenarioId: string
): scenarioId is ChatShadowRealProviderAllowedScenarioId {
  return (CHAT_SHADOW_REAL_PROVIDER_ALLOWED_SCENARIO_IDS as readonly string[]).includes(
    scenarioId
  );
}

export function canAttemptChatShadowRealProvider(input: {
  scenarioId: string;
  environment: "production" | "staging" | "local";
  readEnv?: SalesBrainEnvReader;
}): boolean {
  if (input.environment === "production") {
    return false;
  }
  if (!isChatShadowRealProviderEnabled(input.readEnv)) {
    return false;
  }
  return isChatShadowRealProviderScenarioAllowed(input.scenarioId);
}

export async function invokeChatShadowRealProvider(input: {
  userMessage: string;
  userRole: SalesBrainUserRole;
  readEnv?: SalesBrainEnvReader;
}): Promise<AdminShadowGeminiCallResult> {
  return invokeAdminShadowRealProvider({
    userMessage: input.userMessage,
    userRole: input.userRole,
    readEnv: input.readEnv,
  });
}
