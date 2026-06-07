/**
 * v6.0F / v6.0N — Sales Brain adapter contract (not wired to chat/orchestrator runtime).
 * Default provider = mock. Gemini real path wired behind disabled flag — no network.
 */
import { routeSalesBrainMock } from "./salesBrainMock";
import {
  routeGeminiRealProviderDisabled,
  shouldFallbackOnRealProviderError,
} from "./salesBrainRealProvider";
import type {
  SalesBrainAdapter,
  SalesBrainAdapterConfig,
  SalesBrainAdapterInput,
  SalesBrainAdapterOutput,
  SalesBrainAdapterProviderKind,
  SalesBrainMockInput,
  SalesBrainPaidProviderKind,
} from "./salesBrainTypes";
import { SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS } from "./salesBrainTypes";

export type {
  SalesBrainAdapter,
  SalesBrainAdapterConfig,
  SalesBrainAdapterInput,
  SalesBrainAdapterOutput,
  SalesBrainAdapterProviderKind,
  SalesBrainAdapterRouteVia,
  SalesBrainEnvReader,
  SalesBrainPaidProviderKind,
} from "./salesBrainTypes";

export {
  SalesBrainOpenAiFutureOnlyError,
  SalesBrainRealProviderMissingApiKeyError,
  SalesBrainRealProviderNotAvailableError,
  SalesBrainRealProviderNetworkDisabledError,
} from "./salesBrainTypes";

export {
  SALES_BRAIN_GEMINI_ENV_VAR,
  SALES_BRAIN_GEMINI_SM_RESOURCE,
  SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED,
  SALES_BRAIN_ROUND1_PAID_PROVIDER,
  geminiSecretMapping,
  shouldFallbackOnRealProviderError,
} from "./salesBrainRealProvider";

function mergeAdapterInput(
  config: SalesBrainAdapterConfig,
  input: SalesBrainAdapterInput
): SalesBrainMockInput {
  return {
    ...input,
    aiMode: input.aiMode ?? config.aiMode,
    aiFirstEnabled: input.aiFirstEnabled ?? config.aiFirstEnabled,
    emergencyKillSwitch: input.emergencyKillSwitch ?? config.emergencyKillSwitch,
    aiProvider: "mock",
  };
}

function assertNoForbiddenToolIds(output: SalesBrainAdapterOutput): void {
  const bad = output.mockToolCalls.some((t) =>
    SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS.test(t.toolId)
  );
  if (bad) {
    throw new Error("Sales Brain adapter produced forbidden tool ID — no-go zone violation");
  }
}

function toAdapterOutput(
  provider: SalesBrainAdapterProviderKind,
  mockResult: ReturnType<typeof routeSalesBrainMock>
): SalesBrainAdapterOutput {
  const routedVia = mockResult.fallback ? "fallback" : "mock";
  const output: SalesBrainAdapterOutput = {
    ...mockResult,
    provider,
    routedVia,
  };
  assertNoForbiddenToolIds(output);
  return output;
}

function routeMockProvider(
  config: SalesBrainAdapterConfig,
  input: SalesBrainAdapterInput
): SalesBrainAdapterOutput {
  const merged = mergeAdapterInput(config, input);
  const result = routeSalesBrainMock(merged);
  return toAdapterOutput("mock", result);
}

/** v6.0N — Gemini real path behind disabled flag; throws controlled errors (not user-visible). */
function routeGeminiRealProviderPath(
  config: SalesBrainAdapterConfig,
  input: SalesBrainAdapterInput
): never {
  routeGeminiRealProviderDisabled(input, { readEnv: config.readEnv });
}

/**
 * Factory for Sales Brain adapter — default provider mock.
 * Real provider uses v6.0N Gemini wiring — throws before network (disabled flag).
 */
export function createSalesBrainAdapter(
  config: SalesBrainAdapterConfig = {}
): SalesBrainAdapter {
  const provider = config.provider ?? "mock";

  return {
    provider,
    route(input: SalesBrainAdapterInput): SalesBrainAdapterOutput {
      const effectiveProvider = input.provider ?? provider;
      if (effectiveProvider === "real") {
        routeGeminiRealProviderPath(config, input);
      }
      return routeMockProvider(config, input);
    },
  };
}

let defaultAdapter: SalesBrainAdapter | undefined;

export function routeWithSalesBrainAdapter(
  input: SalesBrainAdapterInput,
  config: SalesBrainAdapterConfig = {}
): SalesBrainAdapterOutput {
  if (!defaultAdapter) {
    defaultAdapter = createSalesBrainAdapter({ provider: "mock" });
  }
  const effectiveProvider = input.provider ?? defaultAdapter.provider;
  if (effectiveProvider === "real") {
    routeGeminiRealProviderDisabled(input, { readEnv: config.readEnv });
  }
  return defaultAdapter.route(input);
}

/** Reset default adapter — test helper only */
export function resetDefaultSalesBrainAdapterForTests(): void {
  defaultAdapter = undefined;
}
