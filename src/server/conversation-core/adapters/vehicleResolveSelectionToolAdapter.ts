/**
 * WP-V2U-03D2B — Read-only vehicle.resolveSelection adapter for Conversation Core.
 * Explicit listingId only; trusted server context required.
 */
import type { MarketplaceCarRecord } from "../../marketplaceInventory";
import type { InventoryRepository } from "../../repositories/inventoryRepository";
import type { ConversationCoreToolHandler } from "../conversationCoreToolRegistry";
import { isPublishedDiscoveryListing } from "../../../services/ai/chat/vehicleDiscoveryMatcher";
import type { ChatInventoryCar } from "../../../services/ai/chat/marketplaceChatSearch";

export const VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES = {
  trustedContextUnavailable: "trusted_context_unavailable",
  missingConversationContext: "missing_conversation_context",
  malformedTrustedContext: "malformed_trusted_context",
  listingNotInTrustedSet: "listing_not_in_trusted_set",
  listingNotPublished: "listing_not_published",
  listingNotFound: "listing_not_found",
  inventoryLookupFailed: "inventory_lookup_failed",
} as const;

export interface ConversationTrustedListingContext {
  readonly conversationId: string;
  readonly allowedListingIds: readonly string[];
}

export interface ConversationTrustedListingContextProvider {
  getContext(
    conversationId: string
  ): ConversationTrustedListingContext | null | Promise<ConversationTrustedListingContext | null>;
}

export interface VehicleResolveSelectionToolAdapterDeps {
  readonly inventoryRepository: Pick<InventoryRepository, "listings">;
  readonly trustedContextProvider: ConversationTrustedListingContextProvider | null;
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

function normalizeAllowedListingIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const ids: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      return null;
    }
    ids.push(entry.trim());
  }
  return ids;
}

function isTrustedContextForConversation(
  context: ConversationTrustedListingContext,
  conversationId: string
): boolean {
  return context.conversationId === conversationId;
}

async function isListingPublishedAndVisible(
  inventoryRepository: Pick<InventoryRepository, "listings">,
  listingId: string
): Promise<"published" | "not_found" | "not_published" | "lookup_failed"> {
  let record: MarketplaceCarRecord | null;
  try {
    record = await inventoryRepository.listings.getById(listingId);
  } catch {
    return "lookup_failed";
  }
  if (!record) {
    return "not_found";
  }
  const car = marketplaceRecordToChatInventory(record);
  if (!isPublishedDiscoveryListing(car)) {
    return "not_published";
  }
  return "published";
}

export function createVehicleResolveSelectionToolHandler(
  deps: VehicleResolveSelectionToolAdapterDeps
): ConversationCoreToolHandler {
  return async (request) => {
    if (request.toolName !== "vehicle.resolveSelection") {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.trustedContextUnavailable,
      };
    }

    const listingId = request.input.listingId.trim();
    const conversationId = request.conversationId;

    if (!deps.trustedContextProvider) {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.trustedContextUnavailable,
      };
    }

    let context: ConversationTrustedListingContext | null;
    try {
      context = await deps.trustedContextProvider.getContext(conversationId);
    } catch {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.malformedTrustedContext,
      };
    }

    if (!context) {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.missingConversationContext,
      };
    }

    if (!isTrustedContextForConversation(context, conversationId)) {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.malformedTrustedContext,
      };
    }

    const allowedListingIds = normalizeAllowedListingIds(context.allowedListingIds);
    if (!allowedListingIds) {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.malformedTrustedContext,
      };
    }

    if (!allowedListingIds.includes(listingId)) {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotInTrustedSet,
      };
    }

    const publishState = await isListingPublishedAndVisible(
      deps.inventoryRepository,
      listingId
    );
    if (publishState === "lookup_failed") {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.inventoryLookupFailed,
      };
    }
    if (publishState === "not_found") {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotFound,
      };
    }
    if (publishState === "not_published") {
      return {
        status: "error",
        errorCode: VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotPublished,
      };
    }

    return {
      status: "ok",
      data: {
        listingId,
        resolved: true,
      },
    };
  };
}
