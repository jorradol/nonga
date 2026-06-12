/**
 * v6.4D — Offline shadow harness for mock AI provider readiness (synthetic fixtures only).
 * Not wired to useChat, orchestrator, Firestore, or backend — no network, no persistence.
 */
import type { AiControlSurfaceId } from "../../config/aiControl/aiControlTypes.ts";
import { DEFAULT_AI_PROVIDER_STATUS } from "../../config/aiControl/aiControlDefaults.ts";
import {
  applyMockOutputGuardChain,
  deterministicMockHash,
  runMockAiProvider,
  type MockAiProviderResult,
  type MockAiPublicSafeInput,
} from "./mockAiProvider.ts";

export type AiShadowHarnessScenarioId =
  | "SH-01-buyer-friendly-mock"
  | "SH-02-golden-seller-weave-mock"
  | "SH-03-forbidden-field-blocked"
  | "SH-04-output-guard-fallback"
  | "SH-05-deterministic-repeat"
  | "SH-06-provider-default-off";

export interface AiShadowHarnessScenario {
  id: AiShadowHarnessScenarioId;
  label: string;
  surfaceId: AiControlSurfaceId;
  input: MockAiPublicSafeInput;
  shadowSimulation: boolean;
}

export interface AiShadowHarnessExpectation {
  mockLabeled: boolean;
  shadowLabeled: boolean;
  realGeminiEnabled: false;
  network: false;
  persistence: false;
  deterministicHash?: string;
  textNonEmpty?: boolean;
  guardFallback?: boolean;
  forbiddenBlocked?: boolean;
}

export interface AiShadowHarnessScenarioResult {
  scenarioId: AiShadowHarnessScenarioId;
  pass: boolean;
  result: MockAiProviderResult;
  failures: string[];
}

const SYNTHETIC_BRAND = "ยี่ห้อตัวอย่าง";
const SYNTHETIC_MODEL = "รุ่นตัวอย่าง";

const BASE_SYNTHETIC_FIELDS = {
  brand: SYNTHETIC_BRAND,
  model: SYNTHETIC_MODEL,
  year: 2021,
  price: 750_000,
  bodyType: "suv",
  fuelType: "hybrid",
  mileage: 42_000,
  sanitizedPublicDescription:
    "SUV ไฮบริด เบาะหนัง พวงมาลัยมัลติฟังก์ชัน Cruise Control Engine Start Smart Keyless",
  normalizedPublicFeatures:
    "leather,cruise-control,engine-start,smart-key",
} as const;

export const AI_SHADOW_HARNESS_SCENARIOS: readonly AiShadowHarnessScenario[] = [
  {
    id: "SH-01-buyer-friendly-mock",
    label: "Buyer-friendly detail preview — mock shadow simulation",
    surfaceId: "buyerFriendlyDetailPreview",
    shadowSimulation: true,
    input: {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: { ...BASE_SYNTHETIC_FIELDS },
      sessionSeed: "shadow-fixture-01",
    },
  },
  {
    id: "SH-02-golden-seller-weave-mock",
    label: "In-chat golden seller weave — mock shadow simulation",
    surfaceId: "inChatGoldenSellerWeave",
    shadowSimulation: true,
    input: {
      surfaceId: "inChatGoldenSellerWeave",
      fields: { ...BASE_SYNTHETIC_FIELDS },
      sessionSeed: "shadow-fixture-02",
    },
  },
  {
    id: "SH-03-forbidden-field-blocked",
    label: "Forbidden prompt fields blocked at boundary",
    surfaceId: "buyerFriendlyDetailPreview",
    shadowSimulation: true,
    input: {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: {
        ...BASE_SYNTHETIC_FIELDS,
        phone: "0812345678",
        fullUid: "must-not-pass-through",
      } as Record<string, string | number>,
      sessionSeed: "shadow-fixture-03",
    },
  },
  {
    id: "SH-04-output-guard-fallback",
    label: "Output guard fail → deterministic fallback",
    surfaceId: "buyerFriendlyDetailPreview",
    shadowSimulation: true,
    input: {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: {
        brand: SYNTHETIC_BRAND,
        model: SYNTHETIC_MODEL,
        sanitizedPublicDescription: "รถไม่เคยชนประหยัดน้ำมันสุดๆ ล้านเปอร์เซ็นต์",
      },
      sessionSeed: "shadow-fixture-04",
    },
  },
  {
    id: "SH-05-deterministic-repeat",
    label: "Deterministic hash stable across repeated runs",
    surfaceId: "sellerListingCopy",
    shadowSimulation: true,
    input: {
      surfaceId: "sellerListingCopy",
      fields: { ...BASE_SYNTHETIC_FIELDS },
      sessionSeed: "shadow-fixture-05",
    },
  },
  {
    id: "SH-06-provider-default-off",
    label: "Default provider OFF — gate path without shadow simulation",
    surfaceId: "buyerFriendlyDetailPreview",
    shadowSimulation: false,
    input: {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: { ...BASE_SYNTHETIC_FIELDS },
      sessionSeed: "shadow-fixture-06",
    },
  },
] as const;

export const AI_SHADOW_HARNESS_EXPECTATIONS: Record<
  AiShadowHarnessScenarioId,
  AiShadowHarnessExpectation
> = {
  "SH-01-buyer-friendly-mock": {
    mockLabeled: true,
    shadowLabeled: true,
    realGeminiEnabled: false,
    network: false,
    persistence: false,
    textNonEmpty: true,
  },
  "SH-02-golden-seller-weave-mock": {
    mockLabeled: true,
    shadowLabeled: true,
    realGeminiEnabled: false,
    network: false,
    persistence: false,
    textNonEmpty: true,
  },
  "SH-03-forbidden-field-blocked": {
    mockLabeled: true,
    shadowLabeled: true,
    realGeminiEnabled: false,
    network: false,
    persistence: false,
    forbiddenBlocked: true,
  },
  "SH-04-output-guard-fallback": {
    mockLabeled: true,
    shadowLabeled: true,
    realGeminiEnabled: false,
    network: false,
    persistence: false,
    guardFallback: true,
  },
  "SH-05-deterministic-repeat": {
    mockLabeled: true,
    shadowLabeled: true,
    realGeminiEnabled: false,
    network: false,
    persistence: false,
    deterministicHash: deterministicMockHash({
      surfaceId: "sellerListingCopy",
      fields: { ...BASE_SYNTHETIC_FIELDS },
      sessionSeed: "shadow-fixture-05",
    }),
  },
  "SH-06-provider-default-off": {
    mockLabeled: false,
    shadowLabeled: false,
    realGeminiEnabled: false,
    network: false,
    persistence: false,
    textNonEmpty: true,
  },
};

function evaluateScenario(
  scenario: AiShadowHarnessScenario
): AiShadowHarnessScenarioResult {
  const expectation = AI_SHADOW_HARNESS_EXPECTATIONS[scenario.id];
  const result = runMockAiProvider(scenario.input, {
    shadowSimulation: scenario.shadowSimulation,
  });
  const failures: string[] = [];

  if (result.metadata.mock !== expectation.mockLabeled) {
    failures.push(`mock=${result.metadata.mock} expected ${expectation.mockLabeled}`);
  }
  if (result.metadata.shadow !== expectation.shadowLabeled) {
    failures.push(`shadow=${result.metadata.shadow} expected ${expectation.shadowLabeled}`);
  }
  if (result.metadata.realGeminiEnabled !== false) {
    failures.push("realGeminiEnabled must be false");
  }
  if (result.metadata.network !== false) {
    failures.push("network must be false");
  }
  if (result.metadata.persistence !== false) {
    failures.push("persistence must be false");
  }
  if (expectation.textNonEmpty && !result.text.trim()) {
    failures.push("expected non-empty text");
  }
  if (expectation.forbiddenBlocked && result.blockedForbiddenFields.length === 0) {
    failures.push("expected forbidden fields blocked");
  }
  if (expectation.guardFallback) {
    const chain = applyMockOutputGuardChain(
      "รถไม่เคยชนจริง 100% ประหยัดสุดๆ ล้านเปอร์เซ็นต์"
    );
    if (!chain.fallbackUsed) {
      failures.push("expected guard fallback chain");
    }
    if (chain.guardPass) {
      failures.push("guard chain should fail on forbidden claims");
    }
  }
  if (
    expectation.deterministicHash &&
    result.metadata.deterministicHash !== expectation.deterministicHash
  ) {
    failures.push("deterministic hash mismatch");
  }
  if (scenario.id === "SH-06-provider-default-off") {
    if (DEFAULT_AI_PROVIDER_STATUS !== "OFF") {
      failures.push("DEFAULT_AI_PROVIDER_STATUS must be OFF");
    }
    if (result.metadata.providerKind !== "disabled") {
      failures.push(`providerKind=${result.metadata.providerKind} expected disabled`);
    }
  }

  return {
    scenarioId: scenario.id,
    pass: failures.length === 0,
    result,
    failures,
  };
}

export function runAiShadowHarnessScenario(
  scenarioId: AiShadowHarnessScenarioId
): AiShadowHarnessScenarioResult {
  const scenario = AI_SHADOW_HARNESS_SCENARIOS.find((item) => item.id === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown shadow harness scenario: ${scenarioId}`);
  }
  return evaluateScenario(scenario);
}

export function runAiShadowHarnessFullMatrix(): AiShadowHarnessScenarioResult[] {
  return AI_SHADOW_HARNESS_SCENARIOS.map((scenario) => evaluateScenario(scenario));
}
