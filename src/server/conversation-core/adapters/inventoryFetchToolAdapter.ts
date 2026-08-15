/**
 * WP-V2U-03D2B — Read-only inventory.fetch adapter for Conversation Core.
 */
import type { MarketplaceCarRecord } from "../../marketplaceInventory";
import type { InventoryRepository } from "../../repositories/inventoryRepository";
import type { ConversationCoreToolHandler } from "../conversationCoreToolRegistry";
import { isPublishedDiscoveryListing } from "../../../services/ai/chat/vehicleDiscoveryMatcher";
import type { ChatInventoryCar } from "../../../services/ai/chat/marketplaceChatSearch";

export const INVENTORY_FETCH_ADAPTER_ERROR_CODES = {
  inventoryLoadFailed: "inventory_load_failed",
  malformedInventoryRecord: "malformed_inventory_record",
} as const;

export interface InventoryFetchToolAdapterDeps {
  readonly inventoryRepository: Pick<InventoryRepository, "listings">;
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

function extractPublishedListingIds(records: MarketplaceCarRecord[]): string[] {
  const ids: string[] = [];
  for (const record of records) {
    if (!record || typeof record.id !== "string" || record.id.trim().length === 0) {
      throw new Error(INVENTORY_FETCH_ADAPTER_ERROR_CODES.malformedInventoryRecord);
    }
    const car = marketplaceRecordToChatInventory(record);
    if (isPublishedDiscoveryListing(car)) {
      ids.push(record.id.trim());
    }
  }
  return dedupeListingIdsPreserveOrder(ids);
}

export function createInventoryFetchToolHandler(
  deps: InventoryFetchToolAdapterDeps
): ConversationCoreToolHandler {
  return async (request) => {
    if (request.toolName !== "inventory.fetch") {
      return {
        status: "error",
        errorCode: INVENTORY_FETCH_ADAPTER_ERROR_CODES.inventoryLoadFailed,
      };
    }

    void request.input.refresh;

    let records: MarketplaceCarRecord[];
    try {
      records = await deps.inventoryRepository.listings.listPublished();
    } catch {
      return {
        status: "error",
        errorCode: INVENTORY_FETCH_ADAPTER_ERROR_CODES.inventoryLoadFailed,
      };
    }

    if (!Array.isArray(records)) {
      return {
        status: "error",
        errorCode: INVENTORY_FETCH_ADAPTER_ERROR_CODES.inventoryLoadFailed,
      };
    }

    let listingIds: string[];
    try {
      listingIds = extractPublishedListingIds(records);
    } catch {
      return {
        status: "error",
        errorCode: INVENTORY_FETCH_ADAPTER_ERROR_CODES.malformedInventoryRecord,
      };
    }

    return {
      status: "ok",
      data: { listingIds },
    };
  };
}
