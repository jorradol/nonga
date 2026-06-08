/**
 * v6.1K — Offline chat-path shadow sink harness (synthetic scenarios only).
 * Not wired to public /chat — admin/internal route tests only.
 */
import {
  buildRedactedChatShadowSinkPayload,
  CHAT_SHADOW_SINK_SCENARIO_IDS,
  resolveChatShadowSinkHandlerContext,
  runSalesBrainChatShadowSink,
  SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS,
  type SalesBrainChatShadowSinkScenarioId,
} from "./salesBrainServerChatShadowSink";
import type { RedactedChatShadowSinkPayload } from "./salesBrainServerChatShadowSink";

export { CHAT_SHADOW_SINK_SCENARIO_IDS };

export interface ChatShadowSinkScenarioExpectation {
  realProviderAllowed: boolean;
  guardrail?: "kill_switch" | "user_visible_blocked" | "production_off" | "none";
}

export const CHAT_SHADOW_SINK_EXPECTATIONS: Record<
  SalesBrainChatShadowSinkScenarioId,
  ChatShadowSinkScenarioExpectation
> = {
  "CP-01": { realProviderAllowed: false, guardrail: "none" },
  "CP-02": { realProviderAllowed: true, guardrail: "none" },
  "CP-03": { realProviderAllowed: false, guardrail: "kill_switch" },
  "CP-04": { realProviderAllowed: false, guardrail: "user_visible_blocked" },
  "CP-05": { realProviderAllowed: false, guardrail: "production_off" },
};

export interface ChatShadowSinkHarnessResult {
  scenarioId: SalesBrainChatShadowSinkScenarioId;
  chatPathSource: string;
  userVisibleOff: true;
  userVisibleResponse: string;
  shadowModeActive: boolean;
  shadowEvaluationAllowed: boolean;
  providerNetwork: boolean;
  realProviderGateReason?: string;
  payload: RedactedChatShadowSinkPayload;
}

export async function runChatShadowSinkScenario(input: {
  scenarioId: SalesBrainChatShadowSinkScenarioId;
  readEnv?: (key: string) => string | undefined;
}): Promise<ChatShadowSinkHarnessResult> {
  const evaluation = runSalesBrainChatShadowSink({ scenarioId: input.scenarioId });
  const handlerContext = await resolveChatShadowSinkHandlerContext({
    scenarioId: input.scenarioId,
    evaluation,
    readEnv: input.readEnv,
  });
  const payload = buildRedactedChatShadowSinkPayload(evaluation, handlerContext);
  return {
    scenarioId: input.scenarioId,
    chatPathSource: evaluation.chatPathSource,
    userVisibleOff: true,
    userVisibleResponse: evaluation.userVisibleResponse,
    shadowModeActive: evaluation.shadowModeActive,
    shadowEvaluationAllowed: evaluation.runtimeFlags.shadowEvaluationAllowed,
    providerNetwork: handlerContext.providerNetwork,
    realProviderGateReason: handlerContext.realProviderGateReason,
    payload,
  };
}

export async function runChatShadowSinkFullMatrix(input?: {
  readEnv?: (key: string) => string | undefined;
}): Promise<ChatShadowSinkHarnessResult[]> {
  const results: ChatShadowSinkHarnessResult[] = [];
  for (const scenarioId of CHAT_SHADOW_SINK_SCENARIO_IDS) {
    results.push(
      await runChatShadowSinkScenario({
        scenarioId,
        readEnv: input?.readEnv,
      })
    );
  }
  return results;
}

export function getChatShadowSinkLegacyForScenario(
  scenarioId: SalesBrainChatShadowSinkScenarioId
): string {
  return SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS[scenarioId].legacyUserVisibleResponse;
}
