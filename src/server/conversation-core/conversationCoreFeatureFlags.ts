/**
 * WP-V2U-03B — Server-owned Conversation Core feature flags (env-only, testable).
 */
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../../services/ai/salesBrainRuntimeFlags";
import type { ConversationCoreFeatureFlagSnapshot } from "../../services/conversation-core/index";

export const NONGA_CONVERSATION_CORE_ENABLED_ENV = "NONGA_CONVERSATION_CORE_ENABLED";

export type ConversationCoreLegacyDelegateReason = "core-disabled" | "emergency-kill-switch";

export interface ConversationCoreResolvedFlags {
  coreEnabled: boolean;
  emergencyKillSwitchActive: boolean;
  legacyDelegateReason: ConversationCoreLegacyDelegateReason | null;
  featureFlagSnapshot: ConversationCoreFeatureFlagSnapshot;
}

function parseTruthy(raw: string | undefined): boolean {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Resolve Conversation Core server flags from env/config dependency.
 * Default OFF; emergency kill switch overrides core to OFF.
 */
export function resolveConversationCoreFeatureFlags(input: {
  readEnv: (key: string) => string | undefined;
}): ConversationCoreResolvedFlags {
  const emergencyKillSwitchActive = parseTruthy(input.readEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV));
  const coreRequested = parseTruthy(input.readEnv(NONGA_CONVERSATION_CORE_ENABLED_ENV));
  const coreEnabled = coreRequested && !emergencyKillSwitchActive;

  let legacyDelegateReason: ConversationCoreLegacyDelegateReason | null = null;
  if (emergencyKillSwitchActive) {
    legacyDelegateReason = "emergency-kill-switch";
  } else if (!coreRequested) {
    legacyDelegateReason = "core-disabled";
  }

  return {
    coreEnabled,
    emergencyKillSwitchActive,
    legacyDelegateReason,
    featureFlagSnapshot: {
      coreEnabled,
      geminiEnabled: false,
      toolsEnabled: false,
      workspaceActionsEnabled: false,
    },
  };
}
