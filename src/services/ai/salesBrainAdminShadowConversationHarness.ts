/**
 * v6.1J — Admin-only synthetic conversation smoke harness (fixed scenarios, no custom prompt).
 * Uses existing SS-01..SS-08 case definitions — not wired to public chat.
 */
import {
  buildRedactedAdminShadowSmokePayload,
  resolveAdminShadowSmokeHandlerContext,
  runSalesBrainAdminShadowSmoke,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES,
  type RedactedAdminShadowSmokePayload,
  type SalesBrainAdminShadowSmokeCaseId,
} from "./salesBrainServerShadowSmoke";
import type { SalesBrainEnvReader } from "./salesBrainRealProvider";

export const ADMIN_SHADOW_CONVERSATION_SCENARIO_IDS = ["SC-01", "SC-02", "SC-03"] as const;

export type AdminShadowConversationScenarioId =
  (typeof ADMIN_SHADOW_CONVERSATION_SCENARIO_IDS)[number];

/** Fixed multi-turn synthetic conversations — each turn maps to an existing SS case. */
export const ADMIN_SHADOW_CONVERSATION_SCENARIOS: Record<
  AdminShadowConversationScenarioId,
  { label: string; turnCaseIds: readonly SalesBrainAdminShadowSmokeCaseId[] }
> = {
  "SC-01": {
    label: "Buyer search then mock listing detail",
    turnCaseIds: ["SS-01", "SS-02"],
  },
  "SC-02": {
    label: "Seller start-over single turn",
    turnCaseIds: ["SS-03"],
  },
  "SC-03": {
    label: "Dealer inventory then kill-switch guardrail",
    turnCaseIds: ["SS-04", "SS-05"],
  },
};

export const ADMIN_SHADOW_FULL_MATRIX_CASE_IDS = [
  "SS-01",
  "SS-02",
  "SS-03",
  "SS-04",
  "SS-05",
  "SS-06",
  "SS-07",
  "SS-08",
] as const satisfies readonly SalesBrainAdminShadowSmokeCaseId[];

export interface AdminShadowConversationTurnResult {
  turnIndex: number;
  caseId: SalesBrainAdminShadowSmokeCaseId;
  providerNetwork: boolean;
  realProviderGateReason?: string;
  userVisibleOff: true;
  payload: RedactedAdminShadowSmokePayload;
}

export interface AdminShadowConversationScenarioResult {
  scenarioId: AdminShadowConversationScenarioId;
  label: string;
  turns: AdminShadowConversationTurnResult[];
}

export function isAdminShadowConversationScenarioId(
  id: string
): id is AdminShadowConversationScenarioId {
  return Object.prototype.hasOwnProperty.call(ADMIN_SHADOW_CONVERSATION_SCENARIOS, id);
}

export async function runAdminShadowConversationScenario(input: {
  scenarioId: AdminShadowConversationScenarioId;
  readEnv?: SalesBrainEnvReader;
}): Promise<AdminShadowConversationScenarioResult> {
  const scenario = ADMIN_SHADOW_CONVERSATION_SCENARIOS[input.scenarioId];
  const turns: AdminShadowConversationTurnResult[] = [];

  for (let i = 0; i < scenario.turnCaseIds.length; i++) {
    const caseId = scenario.turnCaseIds[i];
    const evaluation = runSalesBrainAdminShadowSmoke({ caseId });
    const handlerContext = await resolveAdminShadowSmokeHandlerContext({
      caseId,
      evaluation,
      readEnv: input.readEnv,
    });
    const payload = buildRedactedAdminShadowSmokePayload(evaluation, handlerContext);
    turns.push({
      turnIndex: i,
      caseId,
      providerNetwork: handlerContext.providerNetwork,
      realProviderGateReason: handlerContext.realProviderGateReason,
      userVisibleOff: true,
      payload,
    });
  }

  return {
    scenarioId: input.scenarioId,
    label: scenario.label,
    turns,
  };
}

export interface AdminShadowFullMatrixCaseResult {
  caseId: SalesBrainAdminShadowSmokeCaseId;
  providerNetwork: boolean;
  realProviderGateReason?: string;
  userVisibleOff: true;
  shadowEvaluationAllowed: boolean;
  shadowModeActive: boolean;
  userVisibleResponse: string;
  payload: RedactedAdminShadowSmokePayload;
}

export async function runAdminShadowFullMatrix(input: {
  readEnv?: SalesBrainEnvReader;
} = {}): Promise<AdminShadowFullMatrixCaseResult[]> {
  const results: AdminShadowFullMatrixCaseResult[] = [];

  for (const caseId of ADMIN_SHADOW_FULL_MATRIX_CASE_IDS) {
    const evaluation = runSalesBrainAdminShadowSmoke({ caseId });
    const handlerContext = await resolveAdminShadowSmokeHandlerContext({
      caseId,
      evaluation,
      readEnv: input.readEnv,
    });
    const payload = buildRedactedAdminShadowSmokePayload(evaluation, handlerContext);
    results.push({
      caseId,
      providerNetwork: handlerContext.providerNetwork,
      realProviderGateReason: handlerContext.realProviderGateReason,
      userVisibleOff: true,
      shadowEvaluationAllowed: evaluation.runtimeFlags.shadowEvaluationAllowed,
      shadowModeActive: evaluation.shadowModeActive,
      userVisibleResponse: evaluation.userVisibleResponse,
      payload,
    });
  }

  return results;
}

/** Expected matrix metadata for docs/tests — no secrets. */
export const ADMIN_SHADOW_MATRIX_EXPECTATIONS: Record<
  SalesBrainAdminShadowSmokeCaseId,
  {
    realProviderAllowed: boolean;
    expectMockProvider: boolean;
    guardrail?: "kill_switch" | "budget_missing" | "user_visible_blocked" | "production_off";
  }
> = {
  "SS-01": { realProviderAllowed: true, expectMockProvider: false },
  "SS-02": { realProviderAllowed: false, expectMockProvider: true },
  "SS-03": { realProviderAllowed: false, expectMockProvider: true },
  "SS-04": { realProviderAllowed: false, expectMockProvider: true },
  "SS-05": { realProviderAllowed: false, expectMockProvider: true, guardrail: "kill_switch" },
  "SS-06": { realProviderAllowed: false, expectMockProvider: true, guardrail: "budget_missing" },
  "SS-07": { realProviderAllowed: false, expectMockProvider: true, guardrail: "user_visible_blocked" },
  "SS-08": { realProviderAllowed: false, expectMockProvider: true, guardrail: "production_off" },
};

export function getAdminShadowCaseLabel(caseId: SalesBrainAdminShadowSmokeCaseId): string {
  const def = SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES[caseId];
  return `${caseId}:${def.userRole}`;
}
