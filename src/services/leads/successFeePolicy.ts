/**
 * v5.6I — Success fee policy (pure, no payment I/O).
 * Pilot default: hundred_thousand_floor_tier
 * User-facing term: “ค่าบริการเมื่อขายสำเร็จ” (not “คอมมิชชั่น”).
 */

import type { SettlementStatus, SuccessFeePolicyType } from "./leadTypes";

export const SUCCESS_FEE_USER_FACING_TERM = "ค่าบริการเมื่อขายสำเร็จ";

export const DEFAULT_SUCCESS_FEE_POLICY: SuccessFeePolicyType =
  "hundred_thousand_floor_tier";

const PILOT_TIER_THRESHOLD_BAHT = 100_000;
const PILOT_BELOW_TIER_FEE_BAHT = 500;
const PILOT_PER_HUNDRED_THOUSAND_BAHT = 1_000;

export type ClosedDealPriceValidation =
  | { ok: true; closedDealPrice: number }
  | { ok: false; message: string };

export function validateClosedDealPrice(
  value: unknown
): ClosedDealPriceValidation {
  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(price) || price < 1) {
    return {
      ok: false,
      message: "ราคาปิดดีลต้องเป็นตัวเลขมากกว่า 0 ครับ",
    };
  }
  if (price > 99_999_999) {
    return {
      ok: false,
      message: "ราคาปิดดีลสูงเกินกว่าที่ระบบรองรับในรอบทดลองครับ",
    };
  }
  return { ok: true, closedDealPrice: Math.floor(price) };
}

/**
 * Pilot default — hundred_thousand_floor_tier:
 * - ต่ำกว่า 100,000 → 500
 * - ตั้งแต่ 100,000 → floor(price / 100,000) × 1,000 (ไม่ปัดขึ้น)
 */
export function calculateSuccessFeeByClosedPrice(closePrice: number): number {
  const validated = validateClosedDealPrice(closePrice);
  if (validated.ok === false) {
    throw new RangeError(validated.message);
  }
  const price = validated.closedDealPrice;
  if (price < PILOT_TIER_THRESHOLD_BAHT) {
    return PILOT_BELOW_TIER_FEE_BAHT;
  }
  return (
    Math.floor(price / PILOT_TIER_THRESHOLD_BAHT) * PILOT_PER_HUNDRED_THOUSAND_BAHT
  );
}

/** @deprecated v5.6B name — delegates to pilot tier formula (v5.6I). */
export function calculateSuccessFeeByTier(closePrice: number): number {
  return calculateSuccessFeeByClosedPrice(closePrice);
}

/** Future option — 1% of close price (not pilot default). */
export function calculateSuccessFeeByPercent(
  closePrice: number,
  rate = 0.01
): number {
  const validated = validateClosedDealPrice(closePrice);
  if (validated.ok === false) {
    throw new RangeError(validated.message);
  }
  return Math.round(validated.closedDealPrice * rate);
}

export function calculateSuccessFee(
  closePrice: number,
  policy: SuccessFeePolicyType
): number {
  if (policy === "percent") {
    return calculateSuccessFeeByPercent(closePrice);
  }
  if (policy === "manual_adjusted") {
    throw new Error(
      "manual_adjusted fee must be set by admin; use calculateSuccessFeeByClosedPrice for preview only"
    );
  }
  return calculateSuccessFeeByClosedPrice(closePrice);
}

export function getSuccessFeePolicyLabel(
  policy: SuccessFeePolicyType = DEFAULT_SUCCESS_FEE_POLICY
): string {
  switch (policy) {
    case "hundred_thousand_floor_tier":
      return "เรททุก ๆ แสนบาทของราคาปิด (ต่ำกว่าแสน = 500 บาท)";
    case "percent":
      return "1% ของราคาปิดดีล (ตัวเลือกอนาคต)";
    case "manual_adjusted":
      return "ปรับยอดโดยแอดมิน";
    default:
      return SUCCESS_FEE_USER_FACING_TERM;
  }
}

export interface SettlementBalance {
  feeAmount: number;
  paidAmount: number;
  waivedAmount: number;
  remainingAmount: number;
  /** @deprecated use paidAmount */
  amountDue: number;
  /** @deprecated use paidAmount */
  amountReceived: number;
  /** @deprecated use waivedAmount */
  amountWaived: number;
  /** @deprecated use remainingAmount */
  outstanding: number;
}

export function computeSettlementBalance(input: {
  feeAmount: number;
  paidAmount?: number;
  amountReceived?: number;
  waivedAmount?: number;
  amountWaived?: number;
}): SettlementBalance {
  const feeAmount = Math.max(0, input.feeAmount);
  const paidAmount = Math.max(0, input.paidAmount ?? input.amountReceived ?? 0);
  const waivedAmount = Math.max(0, input.waivedAmount ?? input.amountWaived ?? 0);
  const remainingAmount = Math.max(0, feeAmount - paidAmount - waivedAmount);
  return {
    feeAmount,
    paidAmount,
    waivedAmount,
    remainingAmount,
    amountDue: feeAmount,
    amountReceived: paidAmount,
    amountWaived: waivedAmount,
    outstanding: remainingAmount,
  };
}

export function deriveSettlementStatus(
  balance: SettlementBalance
): SettlementStatus {
  if (balance.feeAmount === 0) return "unbilled";
  if (balance.waivedAmount >= balance.feeAmount) return "waived";
  if (balance.remainingAmount <= 0) return "paid";
  if (balance.paidAmount > 0) return "partially_paid";
  return "pending_payment";
}

/** Pilot examples for tests and admin docs (v5.6I). */
export const SUCCESS_FEE_PILOT_EXAMPLES: ReadonlyArray<{
  closedDealPrice: number;
  fee: number;
}> = [
  { closedDealPrice: 80_000, fee: 500 },
  { closedDealPrice: 99_999, fee: 500 },
  { closedDealPrice: 100_000, fee: 1_000 },
  { closedDealPrice: 150_000, fee: 1_000 },
  { closedDealPrice: 250_000, fee: 2_000 },
  { closedDealPrice: 480_000, fee: 4_000 },
  { closedDealPrice: 999_000, fee: 9_000 },
  { closedDealPrice: 1_000_000, fee: 10_000 },
  { closedDealPrice: 1_200_000, fee: 12_000 },
];

/** @deprecated use SUCCESS_FEE_PILOT_EXAMPLES */
export const SUCCESS_FEE_TIER_EXAMPLES = SUCCESS_FEE_PILOT_EXAMPLES.map(
  (row) => ({
    maxClosePrice: row.closedDealPrice,
    fee: row.fee,
  })
);
