/**
 * v6.0F — Sales Brain adapter contract (not wired to chat/orchestrator runtime).
 * Default provider = mock (delegates to routeSalesBrainMock). Real provider stub only — no network.
 */
import { routeSalesBrainMock } from "./salesBrainMock";
import { routeRealProviderStub } from "./salesBrainRealProvider";
import type {
  SalesBrainAdapter,
  SalesBrainAdapterConfig,
  SalesBrainAdapterInput,
  SalesBrainAdapterOutput,
  SalesBrainAdapterProviderKind,
  SalesBrainMockInput,
  SalesBrainPaidProviderKind,
} from "./salesBrainTypes";
import {
  SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS,
} from "./salesBrainTypes";

export type {
  SalesBrainAdapter,
  SalesBrainAdapterConfig,
  SalesBrainAdapterInput,
  SalesBrainAdapterOutput,
  SalesBrainAdapterProviderKind,
  SalesBrainAdapterRouteVia,
  SalesBrainPaidProviderKind,
} from "./salesBrainTypes";

export { SalesBrainRealProviderNotAvailableError, SalesBrainRealProviderNetworkDisabledError } from "./salesBrainTypes";

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
  const bad = output.mockToolCalls.some((t) => SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS.test(t.toolId));
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

function routeRealProviderPath(
  config: SalesBrainAdapterConfig,
  input: SalesBrainAdapterInput
): never {
  routeRealProviderStub(input, config.realPaidProvider ?? "gemini");
}

/**
 * Factory for Sales Brain adapter — default provider mock.
 * Real provider uses v6.0J stub — throws SalesBrainRealProviderNetworkDisabledError (no network).
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
        routeRealProviderPath(config, input);
      }
      return routeMockProvider(config, input);
    },
  };
}

let defaultAdapter: SalesBrainAdapter | undefined;

/**
 * Convenience route using default mock adapter (v6.0F contract entry point).
 */
export function routeWithSalesBrainAdapter(
  input: SalesBrainAdapterInput
): SalesBrainAdapterOutput {
  if (!defaultAdapter) {
    defaultAdapter = createSalesBrainAdapter({ provider: "mock" });
  }
  const effectiveProvider = input.provider ?? defaultAdapter.provider;
  if (effectiveProvider === "real") {
    routeRealProviderStub(input, input.paidProvider ?? "gemini");
  }
  return defaultAdapter.route(input);
}

/** Reset default adapter — test helper only */
export function resetDefaultSalesBrainAdapterForTests(): void {
  defaultAdapter = undefined;
}
