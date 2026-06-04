/**
 * v5.6F — Seller lead criteria types (future UI); negotiation floor helpers.
 */

import type { PurchaseMethod } from "./leadTypes";
import { calculateNegotiationFloor, isOfferBelowFloor } from "./leadPolicy";

export interface SellerLeadCriteria {
  minimumAcceptablePrice?: number;
  acceptsCash?: boolean;
  acceptsFinance?: boolean;
  preferredContactWindows?: string[];
  specialConditions?: string;
}

export function resolveSellerNegotiationFloor(
  listedPrice: number,
  criteria?: SellerLeadCriteria | null
): number {
  return calculateNegotiationFloor(listedPrice, criteria?.minimumAcceptablePrice);
}

export function evaluatePurchaseMethodFit(
  buyerMethod: PurchaseMethod,
  criteria?: SellerLeadCriteria | null
): "match" | "mismatch" | "unknown" {
  if (!criteria) return "unknown";
  const cash = criteria.acceptsCash !== false;
  const finance = criteria.acceptsFinance !== false;
  if (buyerMethod === "undecided") return "unknown";
  if (buyerMethod === "cash" && !cash) return "mismatch";
  if (buyerMethod === "finance" && !finance) return "mismatch";
  return "match";
}

export function isOfferBelowSellerFloor(params: {
  offeredPrice: number | undefined;
  listedPrice: number;
  criteria?: SellerLeadCriteria | null;
}): boolean {
  const { offeredPrice, listedPrice, criteria } = params;
  if (offeredPrice == null || !Number.isFinite(offeredPrice) || offeredPrice <= 0) {
    return false;
  }
  const floor = resolveSellerNegotiationFloor(listedPrice, criteria);
  return isOfferBelowFloor(offeredPrice, floor);
}
