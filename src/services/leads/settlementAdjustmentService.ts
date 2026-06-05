/**
 * v5.6I.4 — Manual settlement adjustment logic (pure + validation; no payment I/O).
 */

import type {
  SettlementAdjustmentAction,
  SettlementAdjustmentAuditEntry,
  SettlementAdjustmentState,
  SettlementStatus,
} from "./leadTypes";
import type { AdminRevenuePreviewRow } from "./adminRevenuePreview";
import {
  computeSettlementBalance,
  deriveSettlementStatus,
} from "./successFeePolicy";

export const SETTLEMENT_ADJUSTMENT_MANUAL_WARNING =
  "ระบบนี้เป็นการบันทึกยอดแบบ Manual สำหรับแอดมิน ยังไม่มีการชำระเงินจริงผ่านระบบ และยังไม่มีการออกใบแจ้งหนี้อัตโนมัติ";

export type ApplySettlementAdjustmentInput = {
  listingId: string;
  leadId?: string;
  action: SettlementAdjustmentAction;
  amount?: number;
  newFeeAmount?: number;
  reason: string;
  adminNote?: string;
  updatedBy: string;
  updatedByRole: "admin" | "superadmin";
};

export type SettlementAdjustmentValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function syntheticSettlementId(listingId: string): string {
  return `preview-pending-${listingId.trim()}`;
}

export function previewRowToAdjustmentBase(
  row: AdminRevenuePreviewRow,
  options?: { dealerId?: string }
): SettlementAdjustmentState {
  const waivedAmount = Math.max(
    0,
    row.feeAmount - row.paidAmount - row.remainingAmount
  );
  return {
    settlementId: row.id || syntheticSettlementId(row.listingId),
    listingId: row.listingId,
    leadId: row.buyerLeadId === "preview" ? undefined : row.buyerLeadId,
    sellerId: row.sellerScopeId,
    ownerId: row.ownerScopeId,
    dealerId: options?.dealerId,
    feeAmount: row.feeAmount,
    paidAmount: row.paidAmount,
    waivedAmount,
    remainingAmount: row.remainingAmount,
    settlementStatus: row.settlementStatus,
    adminNote: row.adminNotePreview,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeAdjustmentStateWithPreviewRow(
  row: AdminRevenuePreviewRow,
  state: SettlementAdjustmentState | null
): AdminRevenuePreviewRow {
  if (!state) return row;
  return {
    ...row,
    feeAmount: state.feeAmount,
    paidAmount: state.paidAmount,
    remainingAmount: state.remainingAmount,
    settlementStatus: state.settlementStatus,
    adminNotePreview: state.adminNote ?? row.adminNotePreview,
  };
}

export function validateSettlementAdjustmentInput(
  input: ApplySettlementAdjustmentInput,
  current: SettlementAdjustmentState
): SettlementAdjustmentValidationResult {
  const reason = String(input.reason ?? "").trim();
  const changesAmount =
    input.action !== "admin_note" &&
    input.action !== "dispute_fee";

  if (input.action !== "admin_note" && !reason) {
    return { ok: false, message: "กรุณาระบุเหตุผลสำหรับการปรับยอดครับ" };
  }

  if (input.action === "admin_note" && !reason && !input.adminNote?.trim()) {
    return {
      ok: false,
      message: "กรุณาระบุเหตุผลหรือหมายเหตุแอดมินครับ",
    };
  }

  if (
    input.action === "partial_payment" ||
    input.action === "record_payment"
  ) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, message: "จำนวนเงินต้องเป็นตัวเลขไม่ติดลบครับ" };
    }
    if (amount <= 0) {
      return { ok: false, message: "กรุณาระบุจำนวนเงินที่ชำระครับ" };
    }
    if (amount > current.remainingAmount) {
      return {
        ok: false,
        message: "จำนวนเงินเกินยอดค้างชำระที่เหลือครับ",
      };
    }
  }

  if (input.action === "manual_adjustment") {
    const newFee = Number(input.newFeeAmount);
    if (!Number.isFinite(newFee) || newFee < 0) {
      return {
        ok: false,
        message: "ยอดค่าบริการใหม่ต้องเป็นตัวเลขไม่ติดลบครับ",
      };
    }
    const balance = computeSettlementBalance({
      feeAmount: newFee,
      paidAmount: current.paidAmount,
      waivedAmount: current.waivedAmount,
    });
    if (balance.remainingAmount < 0) {
      return {
        ok: false,
        message: "ยอดค้างชำระต้องไม่ติดลบหลังปรับยอดครับ",
      };
    }
  }

  if (changesAmount && input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, message: "จำนวนเงินต้องเป็นตัวเลขไม่ติดลบครับ" };
    }
  }

  if (
    current.settlementStatus === "cancelled" &&
    input.action !== "admin_note"
  ) {
    return {
      ok: false,
      message: "รายการนี้ถูกยกเลิกแล้ว — ปรับยอดเพิ่มไม่ได้ครับ",
    };
  }

  return { ok: true };
}

function computeAmountDelta(
  previous: SettlementAdjustmentState,
  next: SettlementAdjustmentState
): number {
  return next.paidAmount - previous.paidAmount;
}

export function applySettlementAdjustment(
  current: SettlementAdjustmentState,
  input: ApplySettlementAdjustmentInput,
  now = new Date().toISOString()
): {
  next: SettlementAdjustmentState;
  audit: Omit<SettlementAdjustmentAuditEntry, "id" | "createdAt">;
} {
  const validation = validateSettlementAdjustmentInput(input, current);
  if (validation.ok === false) {
    throw new Error(validation.message);
  }

  const previous = { ...current };
  let next: SettlementAdjustmentState = { ...current, updatedAt: now };

  switch (input.action) {
    case "partial_payment":
    case "record_payment": {
      const payment = Math.floor(Number(input.amount));
      const balance = computeSettlementBalance({
        feeAmount: current.feeAmount,
        paidAmount: current.paidAmount + payment,
        waivedAmount: current.waivedAmount,
      });
      next = {
        ...next,
        paidAmount: balance.paidAmount,
        waivedAmount: balance.waivedAmount,
        remainingAmount: balance.remainingAmount,
        settlementStatus: deriveSettlementStatus(balance),
        adminNote: input.adminNote?.trim() || current.adminNote,
      };
      break;
    }
    case "mark_paid": {
      const balance = computeSettlementBalance({
        feeAmount: current.feeAmount,
        paidAmount: current.feeAmount,
        waivedAmount: 0,
      });
      next = {
        ...next,
        paidAmount: balance.paidAmount,
        waivedAmount: 0,
        remainingAmount: 0,
        settlementStatus: "paid",
        adminNote: input.adminNote?.trim() || current.adminNote,
      };
      break;
    }
    case "waive_fee": {
      const balance = computeSettlementBalance({
        feeAmount: current.feeAmount,
        paidAmount: current.paidAmount,
        waivedAmount: current.feeAmount - current.paidAmount,
      });
      next = {
        ...next,
        waivedAmount: balance.waivedAmount,
        remainingAmount: 0,
        settlementStatus: "waived",
        adminNote: input.adminNote?.trim() || current.adminNote,
      };
      break;
    }
    case "dispute_fee": {
      next = {
        ...next,
        settlementStatus: "disputed",
        adminNote: input.adminNote?.trim() || current.adminNote,
      };
      break;
    }
    case "cancel_fee": {
      next = {
        ...next,
        remainingAmount: 0,
        settlementStatus: "cancelled",
        adminNote: input.adminNote?.trim() || current.adminNote,
      };
      break;
    }
    case "manual_adjustment": {
      const newFee = Math.floor(Number(input.newFeeAmount));
      const balance = computeSettlementBalance({
        feeAmount: newFee,
        paidAmount: current.paidAmount,
        waivedAmount: current.waivedAmount,
      });
      next = {
        ...next,
        feeAmount: balance.feeAmount,
        remainingAmount: balance.remainingAmount,
        settlementStatus: deriveSettlementStatus(balance),
        adminNote: input.adminNote?.trim() || current.adminNote,
      };
      break;
    }
    case "admin_note": {
      next = {
        ...next,
        adminNote: input.adminNote?.trim() || current.adminNote,
      };
      break;
    }
    default: {
      const _exhaustive: never = input.action;
      throw new Error(`Unknown action: ${_exhaustive}`);
    }
  }

  if (next.remainingAmount < 0) {
    throw new Error("ยอดค้างชำระต้องไม่ติดลบครับ");
  }

  const audit: Omit<SettlementAdjustmentAuditEntry, "id" | "createdAt"> = {
    settlementId: next.settlementId,
    listingId: next.listingId,
    leadId: input.leadId?.trim() || next.leadId,
    sellerId: next.sellerId,
    ownerId: next.ownerId,
    dealerId: next.dealerId,
    action: input.action,
    previousFeeAmount: previous.feeAmount,
    newFeeAmount: next.feeAmount,
    previousPaidAmount: previous.paidAmount,
    newPaidAmount: next.paidAmount,
    previousRemainingAmount: previous.remainingAmount,
    newRemainingAmount: next.remainingAmount,
    previousStatus: previous.settlementStatus,
    newStatus: next.settlementStatus,
    amountDelta: computeAmountDelta(previous, next),
    reason: String(input.reason ?? "").trim() || "admin note",
    adminNote: input.adminNote?.trim() || undefined,
    updatedBy: input.updatedBy,
    updatedByRole: input.updatedByRole,
    source: "admin_manual",
  };

  return { next, audit };
}

export function assertAdjustmentAuditHasNoPaymentGatewayFields(
  entry: SettlementAdjustmentAuditEntry
): boolean {
  const json = JSON.stringify(entry).toLowerCase();
  return (
    !json.includes("stripe") &&
    !json.includes("paymentintent") &&
    !json.includes("gatewaytransaction") &&
    !json.includes("invoiceid")
  );
}

export function sellerSettlementStatusLabel(status: SettlementStatus): string {
  switch (status) {
    case "unbilled":
    case "pending_payment":
      return "ยอดค้างชำระ";
    case "partially_paid":
      return "ชำระบางส่วน";
    case "paid":
      return "ชำระครบแล้ว";
    case "waived":
      return "ยกเว้นค่าบริการแล้ว";
    case "disputed":
      return "โต้แย้งยอด";
    case "cancelled":
      return "ยกเลิกรายการค่าบริการ";
    default:
      return "ยังไม่เรียกเก็บเงินจริง";
  }
}
