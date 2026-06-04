/**
 * v5.6I — Manual success fee settlement foundation (no payment I/O).
 * Not wired to closed_won routes until explicitly enabled.
 */

import type { SuccessFeeRecord, SuccessFeePolicyType } from "./leadTypes";
import {
  computeSettlementBalance,
  DEFAULT_SUCCESS_FEE_POLICY,
  calculateSuccessFee,
  validateClosedDealPrice,
} from "./successFeePolicy";

export const NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV =
  "NONGA_SUCCESS_FEE_RECORD_ENABLED";

export function isSuccessFeeRecordEnabled(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  return env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV] === "true";
}

export function shouldAutoCreateSuccessFeeOnClosedWon(
  env?: Record<string, string | undefined>
): boolean {
  return isSuccessFeeRecordEnabled(env);
}

export type SuccessFeeRecordDraftInput = {
  id: string;
  listingId: string;
  buyerLeadId: string;
  sellerId: string;
  ownerId?: string;
  dealOutcomeId?: string;
  closedDealPrice: number;
  feePolicyType?: SuccessFeePolicyType;
  feeAmountOverride?: number;
  adminNote?: string;
  dueAt?: string;
  now?: string;
};

/**
 * Build an in-memory settlement draft for admin preview.
 * Does not persist; runtime must not call when auto-create flag is off.
 */
export function createSuccessFeeRecordDraft(
  input: SuccessFeeRecordDraftInput
): SuccessFeeRecord | null {
  if (!shouldAutoCreateSuccessFeeOnClosedWon()) {
    return null;
  }

  const validated = validateClosedDealPrice(input.closedDealPrice);
  if (validated.ok === false) {
    return null;
  }

  const policy = input.feePolicyType ?? DEFAULT_SUCCESS_FEE_POLICY;
  const feeAmount =
    policy === "manual_adjusted" && input.feeAmountOverride != null
      ? Math.max(0, Math.floor(input.feeAmountOverride))
      : calculateSuccessFee(validated.closedDealPrice, policy);

  const now = input.now ?? new Date().toISOString();
  const balance = computeSettlementBalance({ feeAmount });

  return {
    id: input.id,
    listingId: input.listingId,
    buyerLeadId: input.buyerLeadId,
    sellerId: input.sellerId,
    ownerId: input.ownerId ?? input.sellerId,
    dealOutcomeId: input.dealOutcomeId ?? "",
    closedDealPrice: validated.closedDealPrice,
    closedPrice: validated.closedDealPrice,
    feeAmount,
    feePolicyType: policy,
    feeModel: policy === "percent" ? "percent_1" : "tier_b",
    settlementStatus: "unbilled",
    paidAmount: balance.paidAmount,
    remainingAmount: balance.remainingAmount,
    amountDue: balance.feeAmount,
    amountReceived: 0,
    amountWaived: 0,
    paymentLogs: [],
    adminNote: input.adminNote,
    dueAt: input.dueAt,
    createdAt: now,
    updatedAt: now,
  };
}

/** Preview draft for tests/admin tools even when runtime flag is off. */
export function createSuccessFeeRecordDraftPreview(
  input: SuccessFeeRecordDraftInput
): SuccessFeeRecord | null {
  const prev = process.env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV];
  process.env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV] = "true";
  try {
    return createSuccessFeeRecordDraft(input);
  } finally {
    if (prev === undefined) {
      delete process.env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV];
    } else {
      process.env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV] = prev;
    }
  }
}
