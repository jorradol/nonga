/**
 * v6.1L.2b — Node-only shadow chat path with allowlist-gated user-visible pilot.
 * Not imported from browser client bundle (useChat / Vite).
 */
import type { SalesBrainShadowChatPathInput, SalesBrainShadowChatPathResult } from "./salesBrainShadowChatPath";
import { wireShadowChatPath } from "./salesBrainShadowChatPath";
import { resolveUserVisibleChatResponse } from "./salesBrainUserVisibleChatPath";
import { evaluateUserVisibleGate } from "./salesBrainUserVisibleGate";
import { resolveSalesBrainRuntimeFlags } from "./salesBrainRuntimeFlags";

/**
 * Wire shadow chat path with pilot user-visible resolution (Node/tests/server).
 */
export function wireShadowChatPathWithPilot(
  input: SalesBrainShadowChatPathInput
): SalesBrainShadowChatPathResult {
  const flagsOnly = wireShadowChatPath(input);
  const flags = resolveSalesBrainRuntimeFlags({
    environment: input.environment,
    env: input.env,
  });
  const userVisibleGate = evaluateUserVisibleGate({
    firebaseUid: input.firebaseUid,
    environment: input.environment,
    env: input.env,
    runtimeFlags: flags,
  });
  const resolved = resolveUserVisibleChatResponse({
    userMessage: input.userMessage,
    legacyUserVisibleResponse: input.legacyUserVisibleResponse,
    userRole: input.userRole,
    flowContext: input.flowContext,
    firebaseUid: input.firebaseUid,
    environment: input.environment,
    env: input.env,
    runtimeFlags: flags,
    userVisibleGate,
  });

  return {
    legacyUserVisibleText: flagsOnly.legacyUserVisibleText,
    userVisibleText: resolved.userVisibleText,
    pilotPathActive: resolved.pilotPathActive,
    fallbackToLegacy: resolved.fallbackToLegacy,
    flagsOnlyDebug: flagsOnly.flagsOnlyDebug,
  };
}
