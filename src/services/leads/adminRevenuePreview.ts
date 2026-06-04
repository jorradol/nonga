/**
 * v5.6I.1 — Admin revenue / success fee dashboard preview (pure, no payment I/O).
 */

import type {
  SettlementStatus,
  SuccessFeePolicyType,
  SuccessFeeRecord,
} from "./leadTypes";
import {
  DEFAULT_SUCCESS_FEE_POLICY,
  SUCCESS_FEE_USER_FACING_TERM,
  calculateSuccessFeeByClosedPrice,
  computeSettlementBalance,
  deriveSettlementStatus,
} from "./successFeePolicy";
import { createSuccessFeeRecordDraftPreview } from "./successFeeSettlement";

export const ADMIN_REVENUE_PREVIEW_WARNING =
  "รอบนี้เป็น Preview สำหรับแอดมิน ยังไม่มีการเรียกเก็บเงินจริง ไม่มีการออกใบแจ้งหนี้ และไม่มีการเชื่อมต่อ payment gateway";

export const ADMIN_REVENUE_EMPTY_STATE_MESSAGE =
  "ยังไม่มีรายการค่าบริการเมื่อขายสำเร็จในรอบนี้";

/** Runtime rows for dashboard — empty until persistence/API is enabled. */
export function getAdminRevenuePreviewRows(): AdminRevenuePreviewRow[] {
  return [];
}

export type AdminRevenuePreviewRow = {
  id: string;
  date: string;
  listingId: string;
  listingTitle?: string;
  sellerScopeId: string;
  ownerScopeId?: string;
  buyerLeadId: string;
  closedDealPrice: number;
  feeAmount: number;
  feePolicyType: SuccessFeePolicyType;
  paidAmount: number;
  remainingAmount: number;
  settlementStatus: SettlementStatus;
  adminNotePreview?: string;
};

export type AdminRevenueDashboardSummary = {
  closedDealsCount: number;
  pendingSaleListingsCount: number;
  expectedServiceFeeTotal: number;
  awaitingPaymentTotal: number;
  partiallyPaidTotal: number;
  paidTotal: number;
  waivedTotal: number;
  disputedCount: number;
  cancelledCount: number;
};

export function formatAdminScopeId(scopeId: string): string {
  const id = String(scopeId ?? "").trim();
  if (!id) return "—";
  if (id.length <= 8) return "••••";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function formatBaht(amount: number): string {
  return `${Math.max(0, Math.floor(amount)).toLocaleString("th-TH")} บาท`;
}

export function successFeeRecordToPreviewRow(
  record: SuccessFeeRecord
): AdminRevenuePreviewRow {
  return {
    id: record.id,
    date: record.createdAt,
    listingId: record.listingId,
    sellerScopeId: record.sellerId,
    ownerScopeId: record.ownerId,
    buyerLeadId: record.buyerLeadId,
    closedDealPrice: record.closedDealPrice,
    feeAmount: record.feeAmount,
    feePolicyType: record.feePolicyType,
    paidAmount: record.paidAmount,
    remainingAmount: record.remainingAmount,
    settlementStatus: record.settlementStatus,
    adminNotePreview: record.adminNote,
  };
}

export function buildPreviewRowFromClosedDeal(input: {
  id: string;
  listingId: string;
  listingTitle?: string;
  buyerLeadId: string;
  sellerId: string;
  ownerId?: string;
  closedDealPrice: number;
  paidAmount?: number;
  waivedAmount?: number;
  settlementStatus?: SettlementStatus;
  adminNotePreview?: string;
  date?: string;
}): AdminRevenuePreviewRow | null {
  const draft = createSuccessFeeRecordDraftPreview({
    id: input.id,
    listingId: input.listingId,
    buyerLeadId: input.buyerLeadId,
    sellerId: input.sellerId,
    ownerId: input.ownerId,
    closedDealPrice: input.closedDealPrice,
    adminNote: input.adminNotePreview,
    now: input.date,
  });
  if (!draft) return null;

  const balance = computeSettlementBalance({
    feeAmount: draft.feeAmount,
    paidAmount: input.paidAmount ?? 0,
    waivedAmount: input.waivedAmount ?? 0,
  });

  const settlementStatus =
    input.settlementStatus ?? deriveSettlementStatus(balance);

  return {
    id: draft.id,
    date: draft.createdAt,
    listingId: draft.listingId,
    listingTitle: input.listingTitle,
    sellerScopeId: draft.sellerId,
    ownerScopeId: draft.ownerId,
    buyerLeadId: draft.buyerLeadId,
    closedDealPrice: draft.closedDealPrice,
    feeAmount: balance.feeAmount,
    feePolicyType: draft.feePolicyType,
    paidAmount: balance.paidAmount,
    remainingAmount: balance.remainingAmount,
    settlementStatus,
    adminNotePreview: input.adminNotePreview ?? draft.adminNote,
  };
}

export function buildAdminRevenueDashboardSummary(
  rows: AdminRevenuePreviewRow[],
  options?: { pendingSaleListingsCount?: number }
): AdminRevenueDashboardSummary {
  let expectedServiceFeeTotal = 0;
  let awaitingPaymentTotal = 0;
  let partiallyPaidTotal = 0;
  let paidTotal = 0;
  let waivedTotal = 0;
  let disputedCount = 0;
  let cancelledCount = 0;

  for (const row of rows) {
    expectedServiceFeeTotal += row.feeAmount;
    if (row.settlementStatus === "disputed") disputedCount += 1;
    if (row.settlementStatus === "cancelled") cancelledCount += 1;
    if (row.settlementStatus === "waived") {
      waivedTotal += row.feeAmount;
      continue;
    }
    if (row.settlementStatus === "paid") {
      paidTotal += row.paidAmount;
      continue;
    }
    if (row.settlementStatus === "partially_paid") {
      partiallyPaidTotal += row.remainingAmount;
      paidTotal += row.paidAmount;
      continue;
    }
    if (
      row.settlementStatus === "pending_payment" ||
      row.settlementStatus === "unbilled"
    ) {
      awaitingPaymentTotal += row.remainingAmount;
    }
  }

  return {
    closedDealsCount: rows.length,
    pendingSaleListingsCount: Math.max(0, options?.pendingSaleListingsCount ?? 0),
    expectedServiceFeeTotal,
    awaitingPaymentTotal,
    partiallyPaidTotal,
    paidTotal,
    waivedTotal,
    disputedCount,
    cancelledCount,
  };
}

export function assertNoBuyerPiiInRevenuePreviewText(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("buyerphone") || lower.includes("contactphone")) {
    return false;
  }
  if (/\b0[689]\d{8}\b/.test(text)) return false;
  return true;
}

export function assertNoCommissionWording(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    !lower.includes("ค่าคอมมิชชั่น") &&
    !lower.includes("คอมมิชชั่น") &&
    !lower.includes("commission")
  );
}

/** Pilot fee for dashboard tooltips/tests. */
export function previewSuccessFeeForClosedPrice(
  closedDealPrice: number
): number {
  return calculateSuccessFeeByClosedPrice(closedDealPrice);
}

export const ADMIN_REVENUE_TERM = SUCCESS_FEE_USER_FACING_TERM;
export const ADMIN_REVENUE_DEFAULT_POLICY = DEFAULT_SUCCESS_FEE_POLICY;
