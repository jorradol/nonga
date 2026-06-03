/**
 * v5.6B — Success fee calculation (pure, no payment I/O).
 * User-facing term: “ค่าบริการเมื่อขายสำเร็จ” (not “คอมมิชชั่น”).
 */

import type { SettlementStatus, SuccessFeeModel } from "./leadTypes";

export const SUCCESS_FEE_USER_FACING_TERM = "ค่าบริการเมื่อขายสำเร็จ";

const TIER_BASE_BAHT = 500;
const TIER_STEP_BAHT = 100_000;

/**
 * Model B — tier table (v5.6A §10 / Appendix A).
 * Bracket n (each 100k baht) maps to: 500, 1_000, 2_000, 3_000, …
 * Implemented as: 500 * tier + 500 * max(0, tier - 2) where tier = ceil(closePrice / 100k).
 */
export function calculateSuccessFeeByTier(closePrice: number): number {
  if (!Number.isFinite(closePrice) || closePrice < 1) {
    throw new RangeError("closePrice must be a finite number >= 1");
  }
  const tier = Math.ceil(closePrice / TIER_STEP_BAHT);
  return TIER_BASE_BAHT * tier + TIER_BASE_BAHT * Math.max(0, tier - 2);
}

/** Model A — 1% of close price (optional future pilot). */
export function calculateSuccessFeeByPercent(
  closePrice: number,
  rate = 0.01
): number {
  if (!Number.isFinite(closePrice) || closePrice < 1) {
    throw new RangeError("closePrice must be a finite number >= 1");
  }
  return Math.round(closePrice * rate);
}

export function calculateSuccessFee(
  closePrice: number,
  model: SuccessFeeModel
): number {
  if (model === "percent_1") {
    return calculateSuccessFeeByPercent(closePrice);
  }
  return calculateSuccessFeeByTier(closePrice);
}

export interface SettlementBalance {
  amountDue: number;
  amountReceived: number;
  amountWaived: number;
  outstanding: number;
}

export function computeSettlementBalance(input: {
  feeAmount: number;
  amountReceived: number;
  amountWaived: number;
}): SettlementBalance {
  const amountDue = Math.max(0, input.feeAmount);
  const amountReceived = Math.max(0, input.amountReceived);
  const amountWaived = Math.max(0, input.amountWaived);
  const outstanding = Math.max(
    0,
    amountDue - amountReceived - amountWaived
  );
  return { amountDue, amountReceived, amountWaived, outstanding };
}

export function deriveSettlementStatus(
  balance: SettlementBalance
): SettlementStatus {
  if (balance.amountDue === 0) return "unbilled";
  if (balance.amountWaived >= balance.amountDue) return "waived";
  if (balance.outstanding <= 0) return "paid";
  if (balance.amountReceived > 0) return "partially_paid";
  return "pending_payment";
}

/** Example tier boundaries for tests and admin docs. */
export const SUCCESS_FEE_TIER_EXAMPLES: ReadonlyArray<{
  maxClosePrice: number;
  fee: number;
}> = [
  { maxClosePrice: 100_000, fee: 500 },
  { maxClosePrice: 200_000, fee: 1_000 },
  { maxClosePrice: 300_000, fee: 2_000 },
  { maxClosePrice: 400_000, fee: 3_000 },
  { maxClosePrice: 500_000, fee: 4_000 },
  { maxClosePrice: 600_000, fee: 5_000 },
];
