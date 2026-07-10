/**
 * v6.1L.2b — Allowlist-gated user-visible chat path (mock provider only, side-effect-free).
 * Legacy fallback when gate fails, mock fallback/no_go, or provider error.
 */
import { createSalesBrainAdapter } from "./salesBrainAdapter";
import { redactPiiForSalesBrainLog } from "./salesBrainMock";
import {
  resolveSalesBrainRuntimeFlags,
  type SalesBrainRuntimeEnvironment,
  type SalesBrainRuntimeFlags,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainFlowContext, SalesBrainListingContext, SalesBrainUserRole } from "./salesBrainTypes";
import {
  evaluateUserVisibleGate,
  type UserVisibleGateRedactedDiagnostics,
  type UserVisibleGateResult,
} from "./salesBrainUserVisibleGate";
import {
  buildPilotBuyerUserVisibleCopy,
  buildPilotFollowUpNoContextCopy,
  assertNoPilotDebugMarker,
  assertPilotCopySafe,
  assertPilotFollowUpCopySafe,
} from "./salesBrainUserVisiblePilotBuyerCopy";
import {
  isPilotBuyerFinanceFollowUp,
  isPilotBuyerFollowUpMessage,
} from "./chat/chatPilotBuyerFollowUp";
import { isNamedInventoryCompareIntent } from "./chat/inventoryBackedCompare";
import type { UserVisiblePilotOrchestrationHint } from "./salesBrainUserVisiblePilotTypes";
export type { UserVisiblePilotOrchestrationHint } from "./salesBrainUserVisiblePilotTypes";

export const SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID = "v6.1L.2j";

/** Internal/debug marker — must never appear in user-visible pilot text (v6.1L.2g+) */
export const SALES_BRAIN_USER_VISIBLE_PILOT_MARKER = "nonga-pilot:";

export interface ResolveUserVisibleChatResponseInput {
  userMessage: string;
  legacyUserVisibleResponse: string;
  userRole?: SalesBrainUserRole;
  flowContext?: SalesBrainFlowContext;
  listingContext?: SalesBrainListingContext;
  firebaseUid?: string | null;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  readEnv?: (key: string) => string | undefined;
  runtimeFlags?: SalesBrainRuntimeFlags;
  userVisibleGate?: UserVisibleGateResult;
  /** v6.1L.2g — orchestration context for buyer pitch copy (car cards shown separately) */
  pilotOrchestration?: UserVisiblePilotOrchestrationHint;
}

export interface ResolveUserVisibleChatResponseResult {
  userVisibleText: string;
  legacyUserVisibleText: string;
  pilotPathActive: boolean;
  fallbackToLegacy: boolean;
  pilotSliceId: string;
  userVisibleGateDiagnostics: UserVisibleGateRedactedDiagnostics;
  pilotIntent?: string;
  pilotProviderError?: boolean;
}

function pilotSessionCardCount(
  pilotOrchestration: UserVisiblePilotOrchestrationHint | undefined
): number {
  const cards = pilotOrchestration?.recentCarCards?.length ?? 0;
  if (cards > 0) return cards;
  return pilotOrchestration?.carCardCount ?? 0;
}

/** v6.8E.5 — session cards ground finance fallback; mock askFollowUp must not win. */
function shouldUseAskFollowUpInsteadOfPilotCopy(
  userMessage: string,
  pilotOrchestration: UserVisiblePilotOrchestrationHint | undefined,
  askFollowUp?: string
): askFollowUp is string {
  if (!askFollowUp) return false;
  if (pilotSessionCardCount(pilotOrchestration) <= 0) return true;
  return !isPilotBuyerFinanceFollowUp(userMessage);
}

/**
 * v22.62 — named inventory compare is resolved by the orchestrator
 * (`buildInventoryBackedCompareReply`). Pilot copy intentionally returns null
 * to defer; that must keep legacy pair text, never the generic
 * "ยังไม่เห็นชุดรถล่าสุด / เทียบคันที่ 1 กับ 2" no-context fallback.
 */
function preferNamedCompareLegacyText(
  userMessage: string,
  legacy: string
): string | null {
  if (!isNamedInventoryCompareIntent(userMessage)) return null;
  const t = legacy.trim();
  if (!t) return null;
  if (/ยังไม่เห็นชุดรถล่าสุด/i.test(t)) return null;
  return t;
}

function buildPilotUserVisibleText(
  legacy: string,
  intent: string,
  userMessage: string,
  pilotOrchestration: UserVisiblePilotOrchestrationHint | undefined,
  askFollowUp?: string,
  fallback?: boolean,
  safetyDecision?: string
): { text: string; pilotPathActive: boolean } {
  if (shouldUseAskFollowUpInsteadOfPilotCopy(userMessage, pilotOrchestration, askFollowUp)) {
    return { text: askFollowUp, pilotPathActive: true };
  }

  const polished = buildPilotBuyerUserVisibleCopy({
    userMessage,
    intent,
    carCardCount: pilotOrchestration?.carCardCount ?? 0,
    hasMoreCars: pilotOrchestration?.hasMoreCars,
    recentCarCards: pilotOrchestration?.recentCarCards,
    lastSearchBudgetMax: pilotOrchestration?.lastSearchBudgetMax,
  });
  const cardCount =
    pilotOrchestration?.recentCarCards?.length ?? pilotOrchestration?.carCardCount ?? 0;
  const followUp = isPilotBuyerFollowUpMessage(userMessage);
  const namedCompareLegacy = preferNamedCompareLegacyText(userMessage, legacy);

  if (polished) {
    // Never let session-index / no-context pilot templates overwrite a valid
    // inventory-backed named-compare answer already on the canonical pair.
    if (
      namedCompareLegacy &&
      (/ยังไม่เห็นชุดรถล่าสุด|อยากให้เทียบกับรุ่นหรือปีไหน|เทียบคันที่\s*1\s*กับ\s*2/i.test(
        polished.text
      ) ||
        !assertPilotCopySafe(polished.text, cardCount, userMessage))
    ) {
      return { text: namedCompareLegacy, pilotPathActive: true };
    }
    if (!assertPilotCopySafe(polished.text, cardCount, userMessage)) {
      if (followUp) {
        return { text: buildPilotFollowUpNoContextCopy(), pilotPathActive: true };
      }
      return { text: legacy, pilotPathActive: false };
    }
    return polished;
  }

  // Named compare deferred (null) → keep orchestrator pair text.
  if (namedCompareLegacy) {
    return { text: namedCompareLegacy, pilotPathActive: true };
  }

  if (followUp) {
    return { text: buildPilotFollowUpNoContextCopy(), pilotPathActive: true };
  }

  if (fallback || safetyDecision === "no_go") {
    return { text: legacy, pilotPathActive: false };
  }

  // v6.1L.2h — never expose debug marker; keep orchestrator legacy when no template
  return { text: legacy, pilotPathActive: true };
}

function logPilotPathDebug(payload: Record<string, unknown>): void {
  const redacted = redactPiiForSalesBrainLog(JSON.stringify(payload));
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    console.debug("[sales-brain-user-visible-chat-path]", redacted);
  }
}

/**
 * Resolve user-visible chat text — pilot mock path only when allowlist gate passes.
 */
export function resolveUserVisibleChatResponse(
  input: ResolveUserVisibleChatResponseInput
): ResolveUserVisibleChatResponseResult {
  const legacyUserVisibleText = input.legacyUserVisibleResponse;
  const flags =
    input.runtimeFlags ??
    resolveSalesBrainRuntimeFlags({
      environment: input.environment,
      env: input.env,
      readEnv: input.readEnv,
    });
  const userVisibleGate =
    input.userVisibleGate ??
    evaluateUserVisibleGate({
      firebaseUid: input.firebaseUid,
      environment: input.environment,
      env: input.env,
      readEnv: input.readEnv,
      runtimeFlags: flags,
    });

  if (!flags.userVisibleEnabled || userVisibleGate.fallbackToLegacy) {
    logPilotPathDebug({
      pilotPathActive: false,
      fallbackToLegacy: true,
      blockedReason: userVisibleGate.blockedReason,
      flagsUserVisible: flags.userVisibleEnabled,
    });
    return {
      userVisibleText: legacyUserVisibleText,
      legacyUserVisibleText,
      pilotPathActive: false,
      fallbackToLegacy: true,
      pilotSliceId: SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
      userVisibleGateDiagnostics: userVisibleGate.redactedDiagnostics,
    };
  }

  const userRole = input.userRole ?? "buyer";
  try {
    const adapter = createSalesBrainAdapter({ provider: "mock" });
    const output = adapter.route({
      userMessage: input.userMessage,
      userRole,
      flowContext: input.flowContext,
      listingContext: input.listingContext,
      aiMode: flags.mode,
      aiFirstEnabled: flags.aiFirstEnabled,
      emergencyKillSwitch: flags.emergencyKillSwitch,
      provider: "mock",
    });

    const built = buildPilotUserVisibleText(
      legacyUserVisibleText,
      output.intent,
      input.userMessage,
      input.pilotOrchestration,
      output.askFollowUp,
      output.fallback,
      output.safetyDecision
    );

    if (!assertNoPilotDebugMarker(built.text)) {
      return {
        userVisibleText: legacyUserVisibleText,
        legacyUserVisibleText,
        pilotPathActive: false,
        fallbackToLegacy: true,
        pilotSliceId: SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
        userVisibleGateDiagnostics: userVisibleGate.redactedDiagnostics,
      };
    }

    const cardCount =
      input.pilotOrchestration?.recentCarCards?.length ??
      input.pilotOrchestration?.carCardCount ??
      0;
    if (
      isPilotBuyerFollowUpMessage(input.userMessage) &&
      !assertPilotFollowUpCopySafe(built.text, cardCount)
    ) {
      // v22.62 — named compare fail-closed to pair legacy, not budget-search CTA.
      const namedLegacy = preferNamedCompareLegacyText(
        input.userMessage,
        legacyUserVisibleText
      );
      const safeFollowUp = namedLegacy ?? buildPilotFollowUpNoContextCopy();
      return {
        userVisibleText: safeFollowUp,
        legacyUserVisibleText,
        pilotPathActive: true,
        fallbackToLegacy: false,
        pilotSliceId: SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
        userVisibleGateDiagnostics: userVisibleGate.redactedDiagnostics,
        pilotIntent: output.intent,
      };
    }

    logPilotPathDebug({
      pilotPathActive: built.pilotPathActive,
      fallbackToLegacy: !built.pilotPathActive,
      intent: output.intent,
      routedVia: output.routedVia,
      provider: output.provider,
    });

    return {
      userVisibleText: built.text,
      legacyUserVisibleText,
      pilotPathActive: built.pilotPathActive,
      fallbackToLegacy: !built.pilotPathActive,
      pilotSliceId: SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
      userVisibleGateDiagnostics: userVisibleGate.redactedDiagnostics,
      pilotIntent: output.intent,
    };
  } catch {
    logPilotPathDebug({
      pilotPathActive: false,
      fallbackToLegacy: true,
      pilotProviderError: true,
    });
    return {
      userVisibleText: legacyUserVisibleText,
      legacyUserVisibleText,
      pilotPathActive: false,
      fallbackToLegacy: true,
      pilotSliceId: SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
      userVisibleGateDiagnostics: userVisibleGate.redactedDiagnostics,
      pilotProviderError: true,
    };
  }
}
