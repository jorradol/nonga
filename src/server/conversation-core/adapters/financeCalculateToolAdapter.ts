/**
 * WP-V2U-03D3B — Read-only finance.calculate adapter for Conversation Core.
 * Listing-bound estimate only; inventory price; flat-rate calculator.
 */
import { calculateFlatRateFinance } from "../../../utils/financeCalculator";
import type { MarketplaceCarRecord } from "../../marketplaceInventory";
import type { InventoryRepository } from "../../repositories/inventoryRepository";
import { isPublishedDiscoveryListing } from "../../../services/ai/chat/vehicleDiscoveryMatcher";
import type { ChatInventoryCar } from "../../../services/ai/chat/marketplaceChatSearch";
import type { ConversationCoreToolHandler } from "../conversationCoreToolRegistry";
import type {
  ConversationTrustedListingContext,
  ConversationTrustedListingContextProvider,
} from "./vehicleResolveSelectionToolAdapter";

export const FINANCE_CALCULATE_ADAPTER_ERROR_CODES = {
  trustedContextUnavailable: "trusted_context_unavailable",
  missingConversationContext: "missing_conversation_context",
  malformedTrustedContext: "malformed_trusted_context",
  listingNotInTrustedSet: "listing_not_in_trusted_set",
  listingNotPublished: "listing_not_published",
  listingNotFound: "listing_not_found",
  inventoryLookupFailed: "inventory_lookup_failed",
  financePriceUnavailable: "finance_price_unavailable",
  insufficientFinanceInputs: "insufficient_finance_inputs",
  conflictingDownPaymentInputs: "conflicting_down_payment_inputs",
  invalidFinanceInputs: "invalid_finance_inputs",
  calculationFailed: "calculation_failed",
  invalidCalculationResult: "invalid_calculation_result",
} as const;

export interface FinanceCalculateToolAdapterDeps {
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

function deriveDownPaymentPercent(vehiclePrice: number, downPaymentBaht: number): number {
  if (vehiclePrice <= 0) {
    return 0;
  }
  return Math.round((downPaymentBaht / vehiclePrice) * 1000) / 10;
}

function isValidFinanceAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

async function resolvePublishedListingPrice(
  inventoryRepository: Pick<InventoryRepository, "listings">,
  listingId: string
): Promise<
  | { kind: "ok"; vehiclePrice: number }
  | { kind: "lookup_failed" }
  | { kind: "not_found" }
  | { kind: "not_published" }
  | { kind: "price_unavailable" }
> {
  let record: MarketplaceCarRecord | null;
  try {
    record = await inventoryRepository.listings.getById(listingId);
  } catch {
    return { kind: "lookup_failed" };
  }
  if (!record) {
    return { kind: "not_found" };
  }
  const car = marketplaceRecordToChatInventory(record);
  if (!isPublishedDiscoveryListing(car)) {
    return { kind: "not_published" };
  }
  const vehiclePrice = record.price;
  if (!Number.isFinite(vehiclePrice) || vehiclePrice <= 0) {
    return { kind: "price_unavailable" };
  }
  return { kind: "ok", vehiclePrice };
}

export function createFinanceCalculateToolHandler(
  deps: FinanceCalculateToolAdapterDeps
): ConversationCoreToolHandler {
  return async (request) => {
    if (request.toolName !== "finance.calculate") {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.trustedContextUnavailable,
      };
    }

    const listingId = request.input.listingId.trim();
    const conversationId = request.conversationId;
    const input = request.input;

    if (
      (input.downPayment !== undefined ? 1 : 0) +
        (input.downPaymentPercent !== undefined ? 1 : 0) !==
      1
    ) {
      return {
        status: "error",
        errorCode:
          input.downPayment !== undefined && input.downPaymentPercent !== undefined
            ? FINANCE_CALCULATE_ADAPTER_ERROR_CODES.conflictingDownPaymentInputs
            : FINANCE_CALCULATE_ADAPTER_ERROR_CODES.insufficientFinanceInputs,
      };
    }

    if (!deps.trustedContextProvider) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.trustedContextUnavailable,
      };
    }

    let context: ConversationTrustedListingContext | null;
    try {
      context = await deps.trustedContextProvider.getContext(conversationId);
    } catch {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.malformedTrustedContext,
      };
    }

    if (!context) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.missingConversationContext,
      };
    }

    if (!isTrustedContextForConversation(context, conversationId)) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.malformedTrustedContext,
      };
    }

    const allowedListingIds = normalizeAllowedListingIds(context.allowedListingIds);
    if (!allowedListingIds) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.malformedTrustedContext,
      };
    }

    if (!allowedListingIds.includes(listingId)) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.listingNotInTrustedSet,
      };
    }

    const listingState = await resolvePublishedListingPrice(
      deps.inventoryRepository,
      listingId
    );
    if (listingState.kind === "lookup_failed") {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.inventoryLookupFailed,
      };
    }
    if (listingState.kind === "not_found") {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.listingNotFound,
      };
    }
    if (listingState.kind === "not_published") {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.listingNotPublished,
      };
    }
    if (listingState.kind === "price_unavailable") {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.financePriceUnavailable,
      };
    }

    const vehiclePrice = listingState.vehiclePrice;

    if (input.downPayment !== undefined && input.downPayment > vehiclePrice) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.invalidFinanceInputs,
      };
    }

    let calcResult;
    try {
      calcResult = calculateFlatRateFinance({
        carPrice: vehiclePrice,
        ...(input.downPayment !== undefined
          ? { downPaymentBaht: input.downPayment }
          : { downPaymentPercent: input.downPaymentPercent }),
        annualFlatRatePercent: input.annualInterestRatePercent,
        termMonths: input.termMonths,
      });
    } catch {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.calculationFailed,
      };
    }

    const amounts = [
      calcResult.carPrice,
      calcResult.downPaymentBaht,
      calcResult.loanAmount,
      calcResult.totalInterest,
      calcResult.totalRepayment,
      calcResult.monthlyInstallment,
    ];
    if (!amounts.every(isValidFinanceAmount)) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.invalidCalculationResult,
      };
    }

    if (calcResult.carPrice !== vehiclePrice) {
      return {
        status: "error",
        errorCode: FINANCE_CALCULATE_ADAPTER_ERROR_CODES.invalidCalculationResult,
      };
    }

    return {
      status: "ok",
      data: {
        listingId,
        vehiclePrice,
        priceSource: "inventory",
        calculationMode: "listing-bound",
        downPaymentBaht: calcResult.downPaymentBaht,
        downPaymentPercent: deriveDownPaymentPercent(
          vehiclePrice,
          calcResult.downPaymentBaht
        ),
        loanAmount: calcResult.loanAmount,
        annualInterestRatePercent: input.annualInterestRatePercent,
        interestMethod: "flat",
        termMonths: input.termMonths,
        totalInterest: calcResult.totalInterest,
        monthlyPayment: calcResult.monthlyInstallment,
        totalPayable: calcResult.totalRepayment,
        currency: "THB",
        isEstimate: true,
        quotationStatus: "not-quotation",
        vatStatus: "not-calculated",
        additionalChargesStatus: "not-calculated",
      },
    };
  };
}
