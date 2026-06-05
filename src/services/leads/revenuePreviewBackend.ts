/**
 * v5.6I.3 — Read-only revenue preview from backend inventory (no payment I/O).
 */

import type { MarketplaceCarRecord } from "../../server/marketplaceInventory";
import { resolveCarDealerId } from "../../server/marketplaceInventory";
import { normalizeDealerId } from "../../utils/dealerIdentity";
import type { SettlementStatus, SuccessFeePolicyType } from "./leadTypes";
import type { SettlementAdjustmentAuditEntry, SettlementAdjustmentState } from "./leadTypes";
import {
  ADMIN_REVENUE_ESTIMATED_PRICE_LABEL,
  ADMIN_REVENUE_PENDING_SALE_PREVIEW_NOTE,
  buildAdminRevenueDashboardSummary,
  deriveAdminRevenuePreviewRowsFromListings,
  formatAdminScopeId,
  type AdminRevenueListingPreviewSource,
  type AdminRevenuePreviewRow,
} from "./adminRevenuePreview";
import { DEFAULT_SUCCESS_FEE_POLICY, SUCCESS_FEE_USER_FACING_TERM } from "./successFeePolicy";
import {
  mergeAdjustmentStateWithPreviewRow,
  SETTLEMENT_ADJUSTMENT_MANUAL_WARNING,
} from "./settlementAdjustmentService";

export const REVENUE_PREVIEW_READ_ONLY_BADGE = "Preview / Read-only";
export const REVENUE_PREVIEW_NO_PAYMENT_WARNING =
  "รอบนี้เป็น Preview ยังไม่มีการเรียกเก็บเงินจริง ไม่มี payment gateway / invoice / settlement write";

export const SELLER_REVENUE_PREVIEW_NOTICE =
  "ยอดด้านล่างเป็นค่าบริการเมื่อขายสำเร็จแบบประมาณการ — ยังไม่มีการเรียกเก็บเงินจริง";

export type RevenuePreviewPriceSource =
  | "closed_deal_price"
  | "listing_price_estimate";

export type RevenuePreviewApiRow = {
  id: string;
  listingId: string;
  listingTitle?: string;
  brand?: string;
  model?: string;
  year?: number;
  ownerScopeIdMasked: string;
  sellerScopeIdMasked: string;
  dealerScopeIdMasked?: string;
  listingPrice: number;
  closedDealPrice: number;
  priceSource: RevenuePreviewPriceSource;
  priceSourceLabel?: string;
  feePolicyType: SuccessFeePolicyType;
  feeAmount: number;
  paidAmount: number;
  remainingAmount: number;
  settlementStatus: SettlementStatus;
  saleStatus?: string;
  pendingSaleAt?: string;
  adminNote?: string;
  previewAt: string;
  hasManualAdjustment?: boolean;
  auditLogPreview?: SettlementAdjustmentAuditEntry[];
};

export type RevenuePreviewApiSummary = {
  pendingSaleCount: number;
  closedWonCount: number;
  estimatedFeeTotal: number;
  unbilledTotal: number;
  partiallyPaidTotal: number;
  paidTotal: number;
  waivedTotal: number;
  disputedTotal: number;
  cancelledTotal: number;
};

export type RevenuePreviewApiPayload = {
  summary: RevenuePreviewApiSummary;
  rows: RevenuePreviewApiRow[];
  readOnly: true;
  previewWarning: string;
  manualAdjustmentsEnabled: true;
  manualAdjustmentWarning: string;
  serviceFeeTerm: string;
};

export type SellerRevenuePreviewApiPayload = {
  summary: {
    outstandingTotal: number;
    rowCount: number;
    estimatedFeeTotal: number;
  };
  rows: RevenuePreviewApiRow[];
  readOnly: true;
  previewWarning: string;
  serviceFeeTerm: string;
  notice: string;
};

export function marketplaceCarToRevenueListingSource(
  car: MarketplaceCarRecord
): AdminRevenueListingPreviewSource {
  const extended = car as MarketplaceCarRecord & { closedDealPrice?: number };
  return {
    id: car.id,
    title: car.title,
    price: car.price,
    ownerId: car.ownerId,
    dealerId: car.dealerId ?? resolveCarDealerId(car),
    saleStatus: car.saleStatus,
    listingStatus: car.listingStatus,
    pendingSaleAt: car.pendingSaleAt,
    createdAt: car.createdAt,
    closedDealPrice: extended.closedDealPrice,
  };
}

export function filterPendingSaleListings(
  listings: MarketplaceCarRecord[]
): MarketplaceCarRecord[] {
  return listings.filter((c) => c.saleStatus === "pending_sale");
}

export function listingInOwnerScope(
  car: MarketplaceCarRecord,
  scope: { ownerId?: string | null; dealerId?: string | null }
): boolean {
  if (scope.dealerId) {
    return resolveCarDealerId(car) === normalizeDealerId(scope.dealerId);
  }
  if (scope.ownerId) {
    return String(car.ownerId ?? "").trim() === String(scope.ownerId).trim();
  }
  return false;
}

export function filterListingsForSellerRevenueScope(
  listings: MarketplaceCarRecord[],
  scope: { ownerId?: string | null; dealerId?: string | null }
): MarketplaceCarRecord[] {
  return filterPendingSaleListings(listings).filter((car) =>
    listingInOwnerScope(car, scope)
  );
}

export function adminRevenueRowToApiRow(
  row: AdminRevenuePreviewRow,
  car?: MarketplaceCarRecord,
  options?: {
    hasManualAdjustment?: boolean;
    auditLogPreview?: SettlementAdjustmentAuditEntry[];
  }
): RevenuePreviewApiRow {
  const priceSource: RevenuePreviewPriceSource = row.isEstimatedFromListingPrice
    ? "listing_price_estimate"
    : "closed_deal_price";

  return {
    id: row.id,
    listingId: row.listingId,
    listingTitle: row.listingTitle ?? car?.title,
    brand: car?.brand,
    model: car?.model,
    year: car?.year,
    ownerScopeIdMasked: formatAdminScopeId(row.ownerScopeId ?? row.sellerScopeId),
    sellerScopeIdMasked: formatAdminScopeId(row.sellerScopeId),
    dealerScopeIdMasked: car?.dealerId
      ? formatAdminScopeId(car.dealerId)
      : car
        ? formatAdminScopeId(resolveCarDealerId(car))
        : undefined,
    listingPrice: car?.price ?? row.closedDealPrice,
    closedDealPrice: row.closedDealPrice,
    priceSource,
    priceSourceLabel: row.priceSourceLabel,
    feePolicyType: row.feePolicyType,
    feeAmount: row.feeAmount,
    paidAmount: row.paidAmount,
    remainingAmount: row.remainingAmount,
    settlementStatus: row.settlementStatus,
    saleStatus: car?.saleStatus,
    pendingSaleAt: car?.pendingSaleAt,
    adminNote: row.adminNotePreview ?? ADMIN_REVENUE_PENDING_SALE_PREVIEW_NOTE,
    previewAt: row.date,
    hasManualAdjustment: options?.hasManualAdjustment,
    auditLogPreview: options?.auditLogPreview,
  };
}

export function buildRevenuePreviewApiSummary(
  rows: AdminRevenuePreviewRow[],
  pendingSaleCount: number
): RevenuePreviewApiSummary {
  const legacy = buildAdminRevenueDashboardSummary(rows, {
    pendingSaleListingsCount: pendingSaleCount,
  });

  return {
    pendingSaleCount,
    closedWonCount: rows.length,
    estimatedFeeTotal: legacy.expectedServiceFeeTotal,
    unbilledTotal: legacy.awaitingPaymentTotal,
    partiallyPaidTotal: legacy.partiallyPaidTotal,
    paidTotal: legacy.paidTotal,
    waivedTotal: legacy.waivedTotal,
    disputedTotal: legacy.disputedCount,
    cancelledTotal: legacy.cancelledCount,
  };
}

export type RevenuePreviewAdjustmentOverlay = {
  statesByListingId?: Map<string, SettlementAdjustmentState>;
  auditsByListingId?: Map<string, SettlementAdjustmentAuditEntry[]>;
};

export function buildAdminRevenuePreviewApiPayload(
  listings: MarketplaceCarRecord[],
  overlay?: RevenuePreviewAdjustmentOverlay
): RevenuePreviewApiPayload {
  const pending = filterPendingSaleListings(listings);
  const sources = pending.map(marketplaceCarToRevenueListingSource);
  const previewRows = deriveAdminRevenuePreviewRowsFromListings(sources);
  const carById = new Map(pending.map((c) => [c.id, c]));

  const mergedRows = previewRows.map((row) => {
    const state = overlay?.statesByListingId?.get(row.listingId) ?? null;
    return mergeAdjustmentStateWithPreviewRow(row, state);
  });

  const rows = mergedRows.map((row) => {
    const audits = overlay?.auditsByListingId?.get(row.listingId);
    const hasManualAdjustment = Boolean(
      overlay?.statesByListingId?.has(row.listingId)
    );
    return adminRevenueRowToApiRow(row, carById.get(row.listingId), {
      hasManualAdjustment,
      auditLogPreview: audits?.length ? audits.slice(-5) : undefined,
    });
  });

  return {
    summary: buildRevenuePreviewApiSummary(mergedRows, pending.length),
    rows,
    readOnly: true,
    previewWarning: REVENUE_PREVIEW_NO_PAYMENT_WARNING,
    manualAdjustmentsEnabled: true,
    manualAdjustmentWarning: SETTLEMENT_ADJUSTMENT_MANUAL_WARNING,
    serviceFeeTerm: SUCCESS_FEE_USER_FACING_TERM,
  };
}

export function buildSellerRevenuePreviewApiPayload(
  listings: MarketplaceCarRecord[],
  scope: { ownerId?: string | null; dealerId?: string | null },
  overlay?: RevenuePreviewAdjustmentOverlay
): SellerRevenuePreviewApiPayload {
  const scoped = filterListingsForSellerRevenueScope(listings, scope);
  const payload = buildAdminRevenuePreviewApiPayload(scoped, overlay);
  const outstandingTotal = payload.rows.reduce((sum, row) => {
    if (
      row.settlementStatus === "waived" ||
      row.settlementStatus === "cancelled" ||
      row.settlementStatus === "paid"
    ) {
      return sum;
    }
    return sum + row.remainingAmount;
  }, 0);

  return {
    summary: {
      outstandingTotal,
      rowCount: payload.rows.length,
      estimatedFeeTotal: payload.summary.estimatedFeeTotal,
    },
    rows: payload.rows.map(stripSellerRevenueRowForResponse),
    readOnly: true,
    previewWarning: REVENUE_PREVIEW_NO_PAYMENT_WARNING,
    serviceFeeTerm: SUCCESS_FEE_USER_FACING_TERM,
    notice: SELLER_REVENUE_PREVIEW_NOTICE,
  };
}

/** Seller response — no masked owner/dealer ids of other parties; listing context only. */
function stripSellerRevenueRowForResponse(
  row: RevenuePreviewApiRow
): RevenuePreviewApiRow {
  return {
    ...row,
    ownerScopeIdMasked: "—",
    sellerScopeIdMasked: "—",
    dealerScopeIdMasked: undefined,
    adminNote: undefined,
    hasManualAdjustment: undefined,
    auditLogPreview: undefined,
  };
}

export async function loadRevenuePreviewAdjustmentOverlay(
  listListingIds: string[],
  repo: {
    getStateByListingId(id: string): Promise<SettlementAdjustmentState | null>;
    listAuditByListingId(id: string): Promise<SettlementAdjustmentAuditEntry[]>;
  }
): Promise<RevenuePreviewAdjustmentOverlay> {
  const statesByListingId = new Map<string, SettlementAdjustmentState>();
  const auditsByListingId = new Map<string, SettlementAdjustmentAuditEntry[]>();

  for (const listingId of listListingIds) {
    const state = await repo.getStateByListingId(listingId);
    if (state) {
      statesByListingId.set(listingId, state);
    }
    const audits = await repo.listAuditByListingId(listingId);
    if (audits.length) {
      auditsByListingId.set(listingId, audits);
    }
  }

  return { statesByListingId, auditsByListingId };
}

export function assertRevenuePreviewResponseHasNoBuyerPii(
  payload: RevenuePreviewApiPayload | SellerRevenuePreviewApiPayload
): boolean {
  const text = JSON.stringify(payload);
  if (/\b0[689]\d{8}\b/.test(text)) return false;
  const lower = text.toLowerCase();
  if (lower.includes("buyerphone") || lower.includes("contactphone")) return false;
  if (lower.includes("ownerphone")) return false;
  return true;
}

export function assertRevenuePreviewResponseHasNoCommissionWording(
  payload: RevenuePreviewApiPayload | SellerRevenuePreviewApiPayload
): boolean {
  const lower = JSON.stringify(payload).toLowerCase();
  return (
    !lower.includes("ค่าคอมมิชชั่น") &&
    !lower.includes("คอมมิชชั่น") &&
    !lower.includes("commission")
  );
}

export const REVENUE_PREVIEW_DEFAULT_POLICY: SuccessFeePolicyType =
  DEFAULT_SUCCESS_FEE_POLICY;

export const REVENUE_ESTIMATED_PRICE_LABEL = ADMIN_REVENUE_ESTIMATED_PRICE_LABEL;
