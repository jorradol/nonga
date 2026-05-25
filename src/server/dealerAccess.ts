import type { Request } from "express";
import type { MarketplaceCarRecord } from "./marketplaceInventory";
import { resolveCarDealerId } from "./marketplaceInventory";
import type { DealerDraftRecord } from "./dealerDraftInventory";
import { normalizeDealerId } from "../utils/dealerIdentity";

export interface DealerRequestScope {
  dealerId: string | null;
  isAdmin: boolean;
  role: string;
  uid?: string;
  provider?: "stub" | "firebase" | "dev-legacy";
}

export function parseDealerRequestScope(req: Request): DealerRequestScope {
  if (req.apiAuth?.role === "dealer" && req.apiAuth.dealerId) {
    return {
      dealerId: normalizeDealerId(req.apiAuth.dealerId),
      isAdmin: false,
      role: "dealer",
      uid: req.apiAuth.uid,
      provider: req.apiAuth.provider,
    };
  }
  if (
    req.apiAuth?.role === "admin" ||
    req.apiAuth?.role === "superadmin"
  ) {
    const headerDealer = req.headers["x-dealer-id"];
    const queryDealer = req.query.dealerId;
    const dealerId =
      typeof headerDealer === "string" && headerDealer.trim()
        ? normalizeDealerId(headerDealer)
        : typeof queryDealer === "string" && queryDealer.trim()
          ? normalizeDealerId(queryDealer)
          : null;
    return {
      dealerId,
      isAdmin: true,
      role: req.apiAuth.role,
      uid: req.apiAuth.uid,
      provider: req.apiAuth.provider,
    };
  }

  if (process.env.NODE_ENV === "production") {
    return { dealerId: null, isAdmin: false, role: "guest" };
  }

  // DEV-only compatibility for older direct route tests. Deployed dealer APIs
  // must receive req.apiAuth from dealerApiAuth/adminApiAuth before reaching here.
  const role = String(req.headers["x-user-role"] ?? req.query.role ?? "dealer");
  const isAdmin = role === "admin" || role === "superadmin";
  const headerDealer = req.headers["x-dealer-id"];
  const queryDealer = req.query.dealerId;
  const dealerId =
    typeof headerDealer === "string" && headerDealer.trim()
      ? normalizeDealerId(headerDealer)
      : typeof queryDealer === "string" && queryDealer.trim()
        ? normalizeDealerId(queryDealer)
        : null;

  return { dealerId, isAdmin, role, provider: "dev-legacy" };
}

export function requireDealerId(
  scope: DealerRequestScope
): { ok: true; dealerId: string } | { ok: false; message: string } {
  if (scope.isAdmin && scope.dealerId) {
    return { ok: true, dealerId: scope.dealerId };
  }
  if (scope.isAdmin && !scope.dealerId) {
    return { ok: false, message: "Admin ต้องระบุ dealerId" };
  }
  if (!scope.dealerId) {
    return { ok: false, message: "ไม่พบ dealerId" };
  }
  return { ok: true, dealerId: normalizeDealerId(scope.dealerId) };
}

export function carBelongsToDealer(
  car: MarketplaceCarRecord,
  dealerId: string
): boolean {
  return resolveCarDealerId(car) === dealerId;
}

export function draftBelongsToDealer(
  draft: DealerDraftRecord,
  dealerId: string
): boolean {
  return normalizeDealerId(draft.dealerId) === normalizeDealerId(dealerId);
}

export function filterCarsForDealer(
  cars: MarketplaceCarRecord[],
  dealerId: string
): MarketplaceCarRecord[] {
  return cars.filter((c) => carBelongsToDealer(c, dealerId));
}
