/**
 * WP-V2U-03D2B — Factory for bounded vehicle business tool adapters.
 * No module-import side effects; explicit dependency injection only.
 */
import type { InventoryRepository } from "../repositories/inventoryRepository";
import {
  createConversationCoreToolRegistry,
  type ConversationCoreToolRegistration,
  type ConversationCoreToolRegistry,
} from "./conversationCoreToolRegistry";
import {
  createInventoryFetchToolHandler,
  type InventoryFetchToolAdapterDeps,
} from "./adapters/inventoryFetchToolAdapter";
import {
  createMarketplaceSearchToolHandler,
  type MarketplaceSearchToolAdapterDeps,
  type LegacyMarketplaceSearchFn,
  type ScoredMarketplaceSearchFn,
} from "./adapters/marketplaceSearchToolAdapter";
import {
  createVehicleResolveSelectionToolHandler,
  type ConversationTrustedListingContextProvider,
  type VehicleResolveSelectionToolAdapterDeps,
} from "./adapters/vehicleResolveSelectionToolAdapter";

export type {
  ConversationTrustedListingContext,
  ConversationTrustedListingContextProvider,
} from "./adapters/vehicleResolveSelectionToolAdapter";

export type {
  MarketplaceSearchToolAdapterDeps,
  ScoredMarketplaceSearchFn,
  LegacyMarketplaceSearchFn,
} from "./adapters/marketplaceSearchToolAdapter";

export type { InventoryFetchToolAdapterDeps } from "./adapters/inventoryFetchToolAdapter";
export type { VehicleResolveSelectionToolAdapterDeps } from "./adapters/vehicleResolveSelectionToolAdapter";

export {
  MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES,
} from "./adapters/marketplaceSearchToolAdapter";
export {
  INVENTORY_FETCH_ADAPTER_ERROR_CODES,
} from "./adapters/inventoryFetchToolAdapter";
export {
  VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES,
} from "./adapters/vehicleResolveSelectionToolAdapter";

export interface ConversationCoreVehicleToolAdapterDeps {
  readonly inventoryRepository: InventoryRepository;
  readonly trustedContextProvider?: ConversationTrustedListingContextProvider | null;
  readonly loadPublishedInventory?: MarketplaceSearchToolAdapterDeps["loadPublishedInventory"];
  readonly scoredMarketplaceSearch?: ScoredMarketplaceSearchFn;
  readonly legacyMarketplaceSearch?: LegacyMarketplaceSearchFn;
}

function hasInventoryRepository(
  deps: ConversationCoreVehicleToolAdapterDeps | null | undefined
): deps is ConversationCoreVehicleToolAdapterDeps {
  return Boolean(
    deps &&
      deps.inventoryRepository &&
      deps.inventoryRepository.listings &&
      typeof deps.inventoryRepository.listings.listPublished === "function" &&
      typeof deps.inventoryRepository.listings.getById === "function"
  );
}

export function createConversationCoreVehicleToolRegistrations(
  deps: ConversationCoreVehicleToolAdapterDeps
): ConversationCoreToolRegistration[] | null {
  if (!hasInventoryRepository(deps)) {
    return null;
  }

  const inventoryRepository = deps.inventoryRepository;
  const marketplaceDeps: MarketplaceSearchToolAdapterDeps = {
    inventoryRepository,
    ...(deps.loadPublishedInventory
      ? { loadPublishedInventory: deps.loadPublishedInventory }
      : {}),
    ...(deps.scoredMarketplaceSearch
      ? { scoredMarketplaceSearch: deps.scoredMarketplaceSearch }
      : {}),
    ...(deps.legacyMarketplaceSearch
      ? { legacyMarketplaceSearch: deps.legacyMarketplaceSearch }
      : {}),
  };
  const inventoryDeps: InventoryFetchToolAdapterDeps = { inventoryRepository };
  const selectionDeps: VehicleResolveSelectionToolAdapterDeps = {
    inventoryRepository,
    trustedContextProvider: deps.trustedContextProvider ?? null,
  };

  return [
    {
      toolName: "marketplace.search",
      handler: createMarketplaceSearchToolHandler(marketplaceDeps),
    },
    {
      toolName: "inventory.fetch",
      handler: createInventoryFetchToolHandler(inventoryDeps),
    },
    {
      toolName: "vehicle.resolveSelection",
      handler: createVehicleResolveSelectionToolHandler(selectionDeps),
    },
  ];
}

export function createConversationCoreVehicleToolRegistry(
  deps: ConversationCoreVehicleToolAdapterDeps
): ConversationCoreToolRegistry | null {
  const registrations = createConversationCoreVehicleToolRegistrations(deps);
  if (!registrations) {
    return null;
  }
  return createConversationCoreToolRegistry(registrations);
}
