/**
 * v6.0V — Shadow chat path wiring (mock/debug only — user-visible legacy unchanged).
 * Browser-safe: flags-only debug hook in client chat UI; no paid API, no network.
 * Full mock shadow eval remains in salesBrainShadowRuntime (Node/tests/server).
 */
import {
  resolveSalesBrainRuntimeFlags,
  type SalesBrainRuntimeEnvironment,
  type SalesBrainRuntimeFlags,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainFlowContext, SalesBrainUserRole } from "./salesBrainTypes";

/** v6.0V — user-visible chat text always legacy; shadow never replaces it */
export const SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY = true;

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
  /** Orchestrator already logged flags — useChat second pass */
  shadowAlreadyEvaluated?: boolean;
}

export interface SalesBrainShadowChatPathResult {
  legacyUserVisibleText: string;
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
  if (appUrl.includes("nonga-ce93c") || appUrl.includes("staging")) {
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
 * Wire shadow runtime into chat path — returns legacy user-visible text unchanged.
 * Client chat UI: flags-only debug (NONGA_AI_* env lives on Cloud Run, not in browser bundle).
 */
export function wireShadowChatPath(
  input: SalesBrainShadowChatPathInput
): SalesBrainShadowChatPathResult {
  const environment = input.environment ?? resolveSalesBrainRuntimeEnvironmentFromProcess();
  const legacyUserVisibleText = input.legacyUserVisibleResponse;
  const flags = resolveSalesBrainRuntimeFlags({ environment, env: input.env });
  const flagsOnlyDebug = summarizeShadowRuntimeFlags(flags);

  logShadowChatPathDebug({
    source: input.source,
    flagsOnly: true,
    duplicatePass: Boolean(input.shadowAlreadyEvaluated),
    flags: flagsOnlyDebug,
    legacyLen: legacyUserVisibleText.length,
    shadowEvaluationAllowed: flags.shadowEvaluationAllowed,
    enablementBlockedReason: flags.enablementBlockedReason,
    clientSafe: typeof window !== "undefined",
  });

  return { legacyUserVisibleText, flagsOnlyDebug };
}
