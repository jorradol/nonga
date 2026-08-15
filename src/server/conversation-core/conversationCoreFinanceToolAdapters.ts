/**
 * WP-V2U-03D3B — Factory for bounded finance business tool adapters.
 * No module-import side effects; explicit dependency injection only.
 */
import type { InventoryRepository } from "../repositories/inventoryRepository";
import {
  createFinanceCalculateToolHandler,
  FINANCE_CALCULATE_ADAPTER_ERROR_CODES,
  type FinanceCalculateToolAdapterDeps,
} from "./adapters/financeCalculateToolAdapter";
import {
  createConversationCoreToolRegistry,
  type ConversationCoreToolRegistration,
  type ConversationCoreToolRegistry,
} from "./conversationCoreToolRegistry";
import type { ConversationTrustedListingContextProvider } from "./adapters/vehicleResolveSelectionToolAdapter";

export { FINANCE_CALCULATE_ADAPTER_ERROR_CODES };
export type { FinanceCalculateToolAdapterDeps };

export interface ConversationCoreFinanceToolAdapterDeps {
  readonly inventoryRepository: InventoryRepository;
  readonly trustedContextProvider?: ConversationTrustedListingContextProvider | null;
}

function hasInventoryRepository(
  deps: ConversationCoreFinanceToolAdapterDeps | null | undefined
): deps is ConversationCoreFinanceToolAdapterDeps {
  return Boolean(
    deps &&
      deps.inventoryRepository &&
      deps.inventoryRepository.listings &&
      typeof deps.inventoryRepository.listings.getById === "function"
  );
}

export function createConversationCoreFinanceToolRegistrations(
  deps: ConversationCoreFinanceToolAdapterDeps
): ConversationCoreToolRegistration[] | null {
  if (!hasInventoryRepository(deps)) {
    return null;
  }

  const financeDeps: FinanceCalculateToolAdapterDeps = {
    inventoryRepository: deps.inventoryRepository,
    trustedContextProvider: deps.trustedContextProvider ?? null,
  };

  return [
    {
      toolName: "finance.calculate",
      handler: createFinanceCalculateToolHandler(financeDeps),
    },
  ];
}

export function createConversationCoreFinanceToolRegistry(
  deps: ConversationCoreFinanceToolAdapterDeps
): ConversationCoreToolRegistry | null {
  const registrations = createConversationCoreFinanceToolRegistrations(deps);
  if (!registrations) {
    return null;
  }
  return createConversationCoreToolRegistry(registrations);
}
