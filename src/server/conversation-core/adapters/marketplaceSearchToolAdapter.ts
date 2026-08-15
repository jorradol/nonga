/**
 * WP-V2U-03D2B — Read-only marketplace.search adapter for Conversation Core.
 * WP-V2U-03D2B-R3 — Pure vehicle discovery with approved legacy fallback only.
 */
import type { MarketplaceCarRecord } from "../../marketplaceInventory";
import type { InventoryRepository } from "../../repositories/inventoryRepository";
import type { ConversationCoreToolHandler } from "../conversationCoreToolRegistry";
import {
  runMarketplaceChatSearch,
  type ChatInventoryCar,
} from "../../../services/ai/chat/marketplaceChatSearch";
import { isPublishedDiscoveryListing } from "../../../services/ai/chat/vehicleDiscoveryMatcher";
import {
  runVehicleDiscovery,
  type VehicleDiscoveryContext,
  type VehicleDiscoveryResult,
} from "../../../services/ai/chat/vehicleDiscoveryIndex";

const MAX_MARKETPLACE_TOOL_RESULTS = 10;

export const MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES = {
  emptyQuery: "empty_query",
  inventoryLoadFailed: "inventory_load_failed",
  searchInfrastructureFailure: "search_infrastructure_failure",
  malformedSearchResult: "malformed_search_result",
} as const;

export type VehicleDiscoverySearchFn = (
  message: string,
  inventory: ChatInventoryCar[],
  context?: VehicleDiscoveryContext
) => VehicleDiscoveryResult | null;

/** Retained for factory DI field name compatibility (WP-V2U-03D2B). */
export type ScoredMarketplaceSearchFn = VehicleDiscoverySearchFn;

export type LegacyMarketplaceSearchFn = typeof runMarketplaceChatSearch;

export interface MarketplaceSearchToolAdapterDeps {
  readonly inventoryRepository: Pick<InventoryRepository, "listings">;
  readonly loadPublishedInventory?: () => Promise<ChatInventoryCar[]>;
  readonly scoredMarketplaceSearch?: VehicleDiscoverySearchFn;
  readonly legacyMarketplaceSearch?: LegacyMarketplaceSearchFn;
}

function marketplaceRecordToChatInventory(record: MarketplaceCarRecord): ChatInventoryCar {
  return {
    id: record.id,
    title: record.title,
    brand: record.brand,
    model: record.model,
    year: record.year,
    price: record.price,
    mileage: record.mileage,
    color: record.color,
    fuelType: record.fuelType,
    transmission: record.transmission,
    type: record.type,
    condition: record.condition,
    description: record.description,
    images: record.images,
    showroomName: record.showroomName,
    ownerName: record.ownerName,
    isSold: record.isSold,
    listingStatus: record.listingStatus,
    saleStatus: record.saleStatus,
  };
}

function dedupeListingIdsPreserveOrder(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    const normalized = id.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function limitToolListingIds(ids: readonly string[]): string[] {
  return dedupeListingIdsPreserveOrder(ids).slice(0, MAX_MARKETPLACE_TOOL_RESULTS);
}

function extractListingIdsFromDiscoveryResult(result: VehicleDiscoveryResult): string[] {
  const rankedSource =
    result.exactMatches.length > 0 ? result.exactMatches : result.nearAlternatives;
  const ids: string[] = [];
  for (const candidate of rankedSource) {
    const listingId = candidate.listingId?.trim();
    if (!listingId) {
      throw new Error(MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.malformedSearchResult);
    }
    ids.push(listingId);
  }
  return limitToolListingIds(ids);
}

function extractListingIdsFromLegacySearch(
  message: string,
  inventory: ChatInventoryCar[],
  legacySearch: LegacyMarketplaceSearchFn
): string[] {
  const legacy = legacySearch(message, inventory);
  if (!legacy) {
    return [];
  }
  const ids = [...legacy.primary, ...legacy.alternatives].map((summary) => summary.id);
  return limitToolListingIds(ids);
}

async function defaultLoadPublishedInventory(
  inventoryRepository: Pick<InventoryRepository, "listings">
): Promise<ChatInventoryCar[]> {
  const records = await inventoryRepository.listings.listPublished();
  if (!Array.isArray(records)) {
    throw new Error("inventory_load_failed");
  }
  const inventory: ChatInventoryCar[] = [];
  for (const record of records) {
    if (!record || typeof record.id !== "string" || record.id.trim().length === 0) {
      throw new Error("malformed_inventory_record");
    }
    const car = marketplaceRecordToChatInventory(record);
    if (isPublishedDiscoveryListing(car)) {
      inventory.push(car);
    }
  }
  return inventory;
}

export function createMarketplaceSearchToolHandler(
  deps: MarketplaceSearchToolAdapterDeps
): ConversationCoreToolHandler {
  const vehicleDiscovery = deps.scoredMarketplaceSearch ?? runVehicleDiscovery;
  const legacySearch = deps.legacyMarketplaceSearch ?? runMarketplaceChatSearch;
  const loadInventory =
    deps.loadPublishedInventory ??
    (() => defaultLoadPublishedInventory(deps.inventoryRepository));

  return async (request) => {
    if (request.toolName !== "marketplace.search") {
      return {
        status: "error",
        errorCode: MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.searchInfrastructureFailure,
      };
    }

    const rawQuery = request.input.query;
    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
    if (!query) {
      return {
        status: "error",
        errorCode: MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.emptyQuery,
      };
    }

    let inventory: ChatInventoryCar[];
    try {
      inventory = await loadInventory();
    } catch {
      return {
        status: "error",
        errorCode: MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.inventoryLoadFailed,
      };
    }

    let listingIds: string[];
    try {
      const discovery = vehicleDiscovery(query, inventory);
      if (discovery) {
        listingIds = extractListingIdsFromDiscoveryResult(discovery);
      } else {
        listingIds = extractListingIdsFromLegacySearch(query, inventory, legacySearch);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.malformedSearchResult
      ) {
        return {
          status: "error",
          errorCode: MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.malformedSearchResult,
        };
      }
      return {
        status: "error",
        errorCode: MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.searchInfrastructureFailure,
      };
    }

    return {
      status: "ok",
      data: {
        listingIds,
        query,
      },
    };
  };
}
