/**
 * WP-NVB-03B — Search-owned marketplace.search match + ToolResult execution.
 * Receives the exact parsed criteria object and must not re-parse the query.
 */
import {
  executeConversationCoreTool,
  type ConversationCoreToolExecutorOutcome,
} from "../../../server/conversation-core/conversationCoreToolExecutor";
import { createConversationCoreToolRegistry } from "../../../server/conversation-core/conversationCoreToolRegistry";
import type { ConversationCoreToolHandler } from "../../../server/conversation-core/conversationCoreToolRegistry";
import type { MarketplaceSearchToolResult, ToolResult } from "../../conversation-core/toolEnvelope";
import type { ChatInventoryCar } from "./marketplaceChatSearch";
import {
  inferVehicleBodyClass,
  type VehicleBodyClass,
} from "./vehicleBodyClassifier";
import {
  SEARCH_GROUNDING_PAGE_SIZE,
  type ServerDirectedSearchBodyClass,
  type ServerDirectedSearchCriteria,
  type ServerDirectedSearchFuel,
  type ServerDirectedSearchTransmission,
} from "./chatV2V3SearchGroundingCriteria";

export interface ServerDirectedSearchMatch {
  readonly outcome: ConversationCoreToolExecutorOutcome;
  readonly toolResult?: MarketplaceSearchToolResult;
  readonly matchedListingIds: readonly string[];
}

export const SEARCH_GROUNDING_TOOL_ERROR_CODES = {
  inventoryUnavailable: "search_inventory_unavailable",
  handlerFailure: "search_handler_failure",
} as const;

function isPublishedTrustedListing(car: ChatInventoryCar): boolean {
  if (!car || typeof car.id !== "string" || car.id.trim().length === 0) {
    return false;
  }
  if (car.isSold) return false;
  if (car.listingStatus === "hidden") return false;
  if (car.listingStatus === "pending_review") return false;
  if (car.saleStatus === "pending_sale" || car.saleStatus === "sold") {
    return false;
  }
  if (
    car.listingStatus != null &&
    car.listingStatus !== "" &&
    car.listingStatus !== "published"
  ) {
    return false;
  }
  return true;
}

function resolveExplicitTransmission(
  car: ChatInventoryCar
): ServerDirectedSearchTransmission | null {
  const parts = [car.transmission, car.condition, car.description]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const blob = parts.join(" ").toLowerCase();
  const isAuto = /ออโต|อัตโนมัติ|\bat\b|cvt|automatic|auto/.test(blob);
  const isManual = /ธรรมดา|แมนนวล|\bmt\b|manual/.test(blob);
  if (isAuto && !isManual) return "auto";
  if (isManual && !isAuto) return "manual";
  return null;
}

function resolveExplicitFuel(car: ChatInventoryCar): ServerDirectedSearchFuel | null {
  const raw = String(car.fuelType ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (/ไฟฟ้า|\bev\b|electric/.test(raw)) return "ev";
  if (/hybrid|ไฮบริด/.test(raw)) return "hybrid";
  if (/diesel|ดีเซล/.test(raw)) return "diesel";
  if (/เบนซิน|gasoline|petrol/.test(raw)) return "gasoline";
  return null;
}

function listingMatchesBodyClass(
  car: ChatInventoryCar,
  want: ServerDirectedSearchBodyClass
): boolean {
  const inferred = inferVehicleBodyClass(car);
  if (inferred === "unknown") return false;
  return inferred === (want as VehicleBodyClass);
}

function listingMatchesCriteria(
  car: ChatInventoryCar,
  criteria: ServerDirectedSearchCriteria
): boolean {
  if (!isPublishedTrustedListing(car)) return false;
  if (
    typeof car.brand !== "string" ||
    typeof car.model !== "string" ||
    !Number.isFinite(car.year) ||
    !Number.isFinite(car.price)
  ) {
    return false;
  }

  if (criteria.brand) {
    if (!car.brand.toLowerCase().includes(criteria.brand.toLowerCase())) {
      return false;
    }
  }

  if (criteria.model) {
    const want = criteria.model.toLowerCase().replace(/-/g, "");
    const have = car.model.toLowerCase().replace(/-/g, "");
    if (!have.includes(want)) return false;
  }

  if (criteria.bodyClass) {
    if (!listingMatchesBodyClass(car, criteria.bodyClass)) return false;
  }

  if (criteria.transmission) {
    const resolved = resolveExplicitTransmission(car);
    if (resolved !== criteria.transmission) return false;
  }

  if (criteria.maxPrice != null && car.price > criteria.maxPrice) return false;
  if (criteria.minPrice != null && car.price < criteria.minPrice) return false;

  if (criteria.minYear != null && car.year < criteria.minYear) return false;
  if (criteria.maxYear != null && car.year > criteria.maxYear) return false;

  if (criteria.maxMileage != null) {
    if (!Number.isFinite(car.mileage) || (car.mileage as number) <= 0) {
      return false;
    }
    if ((car.mileage as number) > criteria.maxMileage) return false;
  }

  if (criteria.fuel) {
    const resolved = resolveExplicitFuel(car);
    if (resolved !== criteria.fuel) return false;
  }

  return true;
}

export function filterServerDirectedSearchMatches(
  inventory: readonly ChatInventoryCar[],
  criteria: ServerDirectedSearchCriteria
): ChatInventoryCar[] {
  const matches: ChatInventoryCar[] = [];
  for (const car of inventory) {
    if (listingMatchesCriteria(car, criteria)) {
      matches.push(car);
    }
  }
  return matches;
}

function pageListingIds(
  matches: readonly ChatInventoryCar[],
  pageIndex: number
): string[] {
  const start = Math.max(0, pageIndex) * SEARCH_GROUNDING_PAGE_SIZE;
  return matches
    .slice(start, start + SEARCH_GROUNDING_PAGE_SIZE)
    .map((car) => car.id.trim());
}

export function createServerDirectedMarketplaceSearchHandler(input: {
  readonly criteria: ServerDirectedSearchCriteria;
  readonly inventory: readonly ChatInventoryCar[];
}): ConversationCoreToolHandler {
  const criteria = input.criteria;
  const inventory = input.inventory;
  return (request) => {
    if (request.toolName !== "marketplace.search") {
      return {
        status: "error",
        errorCode: SEARCH_GROUNDING_TOOL_ERROR_CODES.handlerFailure,
      };
    }
    try {
      const matches = filterServerDirectedSearchMatches(inventory, criteria);
      const listingIds = pageListingIds(matches, criteria.pageIndex);
      const query = String(request.input && "query" in request.input ? request.input.query : "")
        .trim();
      return {
        status: "ok",
        data: {
          query: query || criteria.query,
          listingIds,
        },
      };
    } catch {
      return {
        status: "error",
        errorCode: SEARCH_GROUNDING_TOOL_ERROR_CODES.handlerFailure,
      };
    }
  };
}

function asMarketplaceSearchResult(
  result: ToolResult
): MarketplaceSearchToolResult | undefined {
  if (result.toolName !== "marketplace.search") return undefined;
  return result;
}

export async function runServerDirectedMarketplaceMatch(input: {
  readonly requestId: string;
  readonly conversationId: string;
  readonly criteria: ServerDirectedSearchCriteria;
  readonly inventory: readonly ChatInventoryCar[];
  readonly executeTool?: typeof executeConversationCoreTool;
}): Promise<ServerDirectedSearchMatch> {
  const handler = createServerDirectedMarketplaceSearchHandler({
    criteria: input.criteria,
    inventory: input.inventory,
  });
  const registry = createConversationCoreToolRegistry([
    { toolName: "marketplace.search", handler },
  ]);
  const execute = input.executeTool ?? executeConversationCoreTool;
  const outcome = await execute(
    {
      rawRequest: {
        toolName: "marketplace.search",
        requestId: input.requestId,
        conversationId: input.conversationId,
        input: { query: input.criteria.query },
      },
      trustedBinding: {
        requestId: input.requestId,
        conversationId: input.conversationId,
        toolName: "marketplace.search",
      },
      trustedToolAllowlist: ["marketplace.search"],
    },
    { registry }
  );

  if (outcome.kind !== "completed") {
    return { outcome, matchedListingIds: [] };
  }
  const toolResult = asMarketplaceSearchResult(outcome.result);
  if (!toolResult || toolResult.status !== "ok" || !toolResult.data) {
    return { outcome, toolResult, matchedListingIds: [] };
  }
  return {
    outcome,
    toolResult,
    matchedListingIds: toolResult.data.listingIds,
  };
}
