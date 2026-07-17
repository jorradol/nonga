/**
 * v6.0V — Shadow chat path wiring (browser-safe flags-only debug).
 * v6.1L.2b — user-visible pilot resolution lives in salesBrainUserVisibleChatPath (Node/server/tests).
 * Browser bundle: NONGA_AI_* env is on Cloud Run only — userVisibleText stays legacy here.
 */
import {
  resolveSalesBrainRuntimeFlags,
  type SalesBrainRuntimeEnvironment,
  type SalesBrainRuntimeFlags,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainFlowContext, SalesBrainUserRole } from "./salesBrainTypes";
import { evaluateUserVisibleGate } from "./salesBrainUserVisibleGate";
import type { UserVisiblePilotOrchestrationHint } from "./salesBrainUserVisiblePilotTypes";

/** v6.1L.2b — allowlist-gated pilot may replace user-visible text on server/Node path */
export const SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY = false;

export type SalesBrainShadowChatPathSource =
  | "chatSearchOrchestrator"
  | "useChat.orchestrated"
  | "useChat.gemini_fallback";

export interface SalesBrainShadowChatPathInput {
  userMessage: string;
  legacyUserVisibleResponse: string;
  userRole?: SalesBrainUserRole;
  flowContext?: SalesBrainFlowContext;
  source: SalesBrainShadowChatPathSource;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  /** v6.1L.1 — Firebase Auth UID for allowlist gate (redacted diagnostics only) */
  firebaseUid?: string | null;
  /** v6.1L.2f — car cards from orchestration for buyer pitch copy */
  pilotOrchestration?: UserVisiblePilotOrchestrationHint;
  /** Orchestrator already logged flags — useChat second pass */
  shadowAlreadyEvaluated?: boolean;
}

export interface SalesBrainShadowChatPathResult {
  legacyUserVisibleText: string;
  /** Browser: always legacy. Server pilot: use resolveUserVisibleChatResponse */
  userVisibleText: string;
  pilotPathActive: boolean;
  fallbackToLegacy: boolean;
  flagsOnlyDebug?: string;
}

function redactPiiForLog(text: string): string {
  return text
    .replace(/0[689]\d[\d\s-]{7,}/g, "[phone-redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "[email-redacted]");
}

function summarizeShadowRuntimeFlags(flags: SalesBrainRuntimeFlags): string {
  return redactPiiForLog(
    JSON.stringify({
      provider: flags.provider,
      mode: flags.mode,
      shadow: flags.shadowModeEnabled,
      userVisible: flags.userVisibleEnabled,
      killSwitch: flags.emergencyKillSwitch,
      budgetsConfigured:
        flags.budgetDailyLimit !== null && flags.budgetMonthlyLimit !== null,
    })
  );
}

export function resolveSalesBrainRuntimeEnvironmentFromProcess(): SalesBrainRuntimeEnvironment {
  const read = (key: string): string | undefined => {
    if (typeof process === "undefined") {
      return undefined;
    }
    return process.env[key];
  };
  const appUrl = String(read("APP_URL") ?? "").toLowerCase();
  const productionProjectMarker = ["nonga", "ce93c"].join("-");
  if (appUrl.includes(productionProjectMarker) || appUrl.includes("staging")) {
    return "staging";
  }
  if (read("NODE_ENV") === "production") {
    return "production";
  }
  return "local";
}

export function mapChatRoleToSalesBrainUserRole(input: {
  role?: string | null;
  isAdmin?: boolean;
  isDealer?: boolean;
}): SalesBrainUserRole {
  if (input.isAdmin) {
    return "admin";
  }
  if (input.isDealer) {
    return "dealer";
  }
  const role = String(input.role ?? "").toLowerCase();
  if (role === "superadmin") {
    return "superadmin";
  }
  if (role === "admin") {
    return "admin";
  }
  if (role === "dealer") {
    return "dealer";
  }
  if (role === "seller") {
    return "seller";
  }
  return "buyer";
}

function logShadowChatPathDebug(payload: Record<string, unknown>): void {
  const redacted = redactPiiForLog(JSON.stringify(payload));
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    console.debug("[sales-brain-shadow-chat-path]", redacted);
  }
}

/**
 * Wire shadow runtime into chat path — browser-safe flags-only debug.
 * User-visible pilot text: resolveUserVisibleChatResponse (Node/server) or evaluateSalesBrainShadowRuntime.
 */
export function wireShadowChatPath(
  input: SalesBrainShadowChatPathInput
): SalesBrainShadowChatPathResult {
  const environment = input.environment ?? resolveSalesBrainRuntimeEnvironmentFromProcess();
  const legacyUserVisibleText = input.legacyUserVisibleResponse;
  const flags = resolveSalesBrainRuntimeFlags({ environment, env: input.env });
  const userVisibleGate = evaluateUserVisibleGate({
    firebaseUid: input.firebaseUid,
    environment,
    env: input.env,
    runtimeFlags: flags,
  });
  const flagsOnlyDebug = redactPiiForLog(
    JSON.stringify({
      runtimeFlags: JSON.parse(summarizeShadowRuntimeFlags(flags)),
      userVisibleGate: userVisibleGate.redactedDiagnostics,
      pilotPathActive: false,
      browserSafe: typeof window !== "undefined",
    })
  );

  logShadowChatPathDebug({
    source: input.source,
    flagsOnly: true,
    duplicatePass: Boolean(input.shadowAlreadyEvaluated),
    flags: flagsOnlyDebug,
    legacyLen: legacyUserVisibleText.length,
    shadowEvaluationAllowed: flags.shadowEvaluationAllowed,
    enablementBlockedReason: flags.enablementBlockedReason,
    userVisibleGateBlockedReason: userVisibleGate.blockedReason,
    userVisibleGateFallback: userVisibleGate.fallbackToLegacy,
    pilotPathActive: false,
    clientSafe: typeof window !== "undefined",
  });

  return {
    legacyUserVisibleText,
    userVisibleText: legacyUserVisibleText,
    pilotPathActive: false,
    fallbackToLegacy: true,
    flagsOnlyDebug,
  };
}
