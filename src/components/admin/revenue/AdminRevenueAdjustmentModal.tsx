/**
 * v5.6I.4 / v5.6I.4b — Admin manual settlement adjustment modal (UX polish).
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  SettlementAdjustmentAction,
  SettlementStatus,
} from "../../../services/leads/leadTypes";
import {
  formatBaht,
  type AdminRevenuePreviewRow,
} from "../../../services/leads/adminRevenuePreview";
import type { AdminRevenueAdjustmentRequest } from "../../../services/leads/adminRevenueAdjustmentApi";
import { SETTLEMENT_ADJUSTMENT_MANUAL_WARNING } from "../../../services/leads/settlementAdjustmentService";
import { AlertTriangle, Banknote, Loader2, Lock, X } from "lucide-react";

export const ADMIN_REVENUE_ADJUSTMENT_MODAL_TITLE = "ปรับยอดค่าบริการ";

export const ADMIN_REVENUE_ADJUSTMENT_NO_REAL_PAYMENT_NOTE =
  "ยังไม่มีการชำระเงินจริงผ่านระบบ";

export type AdminRevenueAdjustmentActionOption = {
  action: SettlementAdjustmentAction;
  label: string;
  needsAmount?: boolean;
  needsNewFeeAmount?: boolean;
};

export const ADMIN_REVENUE_ADJUSTMENT_ACTIONS: AdminRevenueAdjustmentActionOption[] =
  [
    { action: "partial_payment", label: "บันทึกชำระบางส่วน", needsAmount: true },
    { action: "mark_paid", label: "ชำระครบ" },
    { action: "waive_fee", label: "ยกเว้นค่าบริการ" },
    { action: "dispute_fee", label: "โต้แย้งยอด" },
    { action: "cancel_fee", label: "ยกเลิกรายการค่าบริการ" },
    {
      action: "manual_adjustment",
      label: "ปรับยอดค่าบริการเอง",
      needsNewFeeAmount: true,
    },
    { action: "admin_note", label: "เพิ่มหมายเหตุแอดมิน" },
  ];

export const ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS: Record<
  SettlementAdjustmentAction,
  string
> = {
  record_payment:
    "ใช้เมื่อผู้ขายชำระมาแล้วบางส่วน ยอดค้างจะลดลง",
  partial_payment:
    "ใช้เมื่อผู้ขายชำระมาแล้วบางส่วน ยอดค้างจะลดลง",
  mark_paid: "ตั้งยอดค้างเป็น 0",
  waive_fee: "ใช้เมื่อ admin ยกเว้นยอดนี้",
  dispute_fee: "ใช้เมื่อยอดอยู่ระหว่างตรวจสอบ",
  cancel_fee: "ใช้เมื่อไม่ควรเรียกเก็บรายการนี้",
  manual_adjustment:
    "ใช้เมื่อ admin ต้องแก้ยอดค่าบริการตามข้อตกลงพิเศษ",
  admin_note: "บันทึก note ภายใน ไม่เปลี่ยนยอด",
};

const STATUS_LABELS: Record<SettlementStatus, string> = {
  unbilled: "ยังไม่วางบิล",
  pending_payment: "รอชำระ",
  partially_paid: "ชำระบางส่วน",
  paid: "ชำระครบแล้ว",
  waived: "ยกเว้นแล้ว",
  disputed: "โต้แย้งยอด",
  cancelled: "ยกเลิกรายการ",
};

function formatBahtNumber(amount: number): string {
  return `${Math.max(0, Math.floor(amount)).toLocaleString("th-TH")}`;
}

function remainingDisplay(row: AdminRevenuePreviewRow): {
  value: string;
  sub?: string;
} {
  if (row.settlementStatus === "waived" || row.settlementStatus === "cancelled") {
    return { value: STATUS_LABELS[row.settlementStatus], sub: formatBaht(0) };
  }
  if (row.remainingAmount <= 0 && row.settlementStatus === "paid") {
    return { value: "ชำระครบแล้ว", sub: formatBaht(row.paidAmount) };
  }
  return { value: `${formatBahtNumber(row.remainingAmount)} บาท` };
}

export type AdminRevenueAdjustmentModalProps = {
  row: AdminRevenuePreviewRow;
  onClose: () => void;
  onSubmit: (body: AdminRevenueAdjustmentRequest) => Promise<void>;
};

export function AdminRevenueAdjustmentModal({
  row,
  onClose,
  onSubmit,
}: AdminRevenueAdjustmentModalProps) {
  const [action, setAction] = useState<SettlementAdjustmentAction>(
    "partial_payment"
  );
  const [amount, setAmount] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState(String(row.feeAmount));
  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const selected = ADMIN_REVENUE_ADJUSTMENT_ACTIONS.find(
    (opt) => opt.action === action
  );

  const fieldErrors = useMemo(() => {
    const errors: {
      amount?: string;
      newFeeAmount?: string;
      reason?: string;
      adminNote?: string;
    } = {};
    if (action === "admin_note") {
      if (!reason.trim() && !adminNote.trim()) {
        errors.reason = "กรุณาระบุเหตุผลหรือหมายเหตุแอดมิน";
      }
      return errors;
    }
    if (!reason.trim()) {
      errors.reason = "กรุณาระบุเหตุผล";
    }
    if (selected?.needsAmount) {
      const n = Number(amount);
      if (!amount.trim() || !Number.isFinite(n) || n <= 0) {
        errors.amount = "กรุณาระบุจำนวนเงินที่ชำระ (มากกว่า 0)";
      }
    }
    if (selected?.needsNewFeeAmount) {
      const n = Number(newFeeAmount);
      if (!Number.isFinite(n) || n < 0) {
        errors.newFeeAmount = "ยอดค่าบริการใหม่ต้องไม่ติดลบ";
      }
    }
    return errors;
  }, [action, adminNote, amount, newFeeAmount, reason, selected]);

  const canSubmit =
    Object.keys(fieldErrors).length === 0 && !submitting;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, submitting]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        listingId: row.listingId,
        leadId: row.buyerLeadId === "preview" ? undefined : row.buyerLeadId,
        action,
        amount: selected?.needsAmount ? Number(amount) : undefined,
        newFeeAmount: selected?.needsNewFeeAmount
          ? Number(newFeeAmount)
          : undefined,
        reason: reason.trim(),
        adminNote: adminNote.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "บันทึกการปรับยอดไม่สำเร็จครับ"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = remainingDisplay(row);
  const showFieldError = touched || Boolean(error);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      data-testid="admin-revenue-adjustment-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-revenue-adjustment-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col w-full max-w-3xl max-h-[min(90vh,52rem)] rounded-2xl border border-emerald-500/35 bg-[#0b1218] shadow-2xl shadow-black/60 overflow-hidden"
        data-testid="admin-revenue-adjustment-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="shrink-0 border-b border-white/[0.08] bg-[#0b1218]/95 px-4 sm:px-5 py-4 space-y-2"
          data-testid="admin-revenue-adjustment-modal-header"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="admin-revenue-adjustment-modal-title"
                  className="text-base sm:text-lg font-black text-white"
                >
                  {ADMIN_REVENUE_ADJUSTMENT_MODAL_TITLE}
                </h2>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 rounded-full"
                  data-testid="admin-revenue-adjustment-manual-badge"
                >
                  <Lock className="w-3 h-3" />
                  Manual / Admin only
                </span>
              </div>
              <p
                className="text-sm font-semibold text-emerald-100/90 truncate"
                data-testid="admin-revenue-adjustment-listing-title"
              >
                {row.listingTitle ?? row.listingId}
              </p>
              <p className="text-[11px] text-slate-500">
                {ADMIN_REVENUE_ADJUSTMENT_NO_REAL_PAYMENT_NOTE}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
              aria-label="ปิด"
              data-testid="admin-revenue-adjustment-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-4 space-y-5 min-h-0"
          data-testid="admin-revenue-adjustment-modal-body"
        >
          <p
            className="text-[11px] text-amber-100/90 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2"
            data-testid="admin-revenue-adjustment-warning"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>{SETTLEMENT_ADJUSTMENT_MANUAL_WARNING}</span>
          </p>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            data-testid="admin-revenue-adjustment-summary"
          >
            <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" />
                ค่าบริการทั้งหมด
              </p>
              <p
                className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums"
                data-testid="admin-revenue-adjustment-summary-fee"
              >
                {formatBahtNumber(row.feeAmount)}
                <span className="text-sm font-bold text-slate-400 ml-1">บาท</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/30 p-3 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                ชำระแล้ว
              </p>
              <p
                className="text-xl sm:text-2xl font-black text-slate-200 mt-1 tabular-nums"
                data-testid="admin-revenue-adjustment-summary-paid"
              >
                {formatBahtNumber(row.paidAmount)}
                <span className="text-sm font-bold text-slate-400 ml-1">บาท</span>
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 p-3 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400/90">
                ยอดค้างชำระ
              </p>
              <p
                className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 tabular-nums leading-tight"
                data-testid="admin-revenue-adjustment-summary-remaining"
              >
                {remaining.value}
              </p>
              {remaining.sub ? (
                <p className="text-[10px] text-slate-500 mt-0.5">{remaining.sub}</p>
              ) : null}
              <p className="text-[10px] text-slate-500 mt-1">
                สถานะ: {STATUS_LABELS[row.settlementStatus]}
              </p>
            </div>
          </div>

          <section className="space-y-4" data-testid="admin-revenue-adjustment-form">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                ขั้นที่ 1 — เลือกรายการดำเนินการ
              </p>
              <label className="block space-y-1.5">
                <span className="text-[12px] font-semibold text-slate-200">
                  การดำเนินการ
                </span>
                <select
                  value={action}
                  disabled={submitting}
                  onChange={(e) => {
                    setAction(e.target.value as SettlementAdjustmentAction);
                    setTouched(false);
                    setError(null);
                  }}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] text-white focus:border-emerald-500/50 focus:outline-none"
                  data-testid="admin-revenue-adjustment-action"
                >
                  {ADMIN_REVENUE_ADJUSTMENT_ACTIONS.map((opt) => (
                    <option key={opt.action} value={opt.action}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <p
                className="text-[11px] text-emerald-200/80 leading-relaxed rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2"
                data-testid="admin-revenue-adjustment-action-helper"
              >
                {ADMIN_REVENUE_ADJUSTMENT_ACTION_HELPERS[action]}
              </p>
            </div>

            {selected?.needsAmount || selected?.needsNewFeeAmount ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  ขั้นที่ 2 — ระบุยอด
                </p>
                {selected?.needsAmount ? (
                  <label className="block space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-200">
                      จำนวนเงินที่ชำระ
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1}
                        value={amount}
                        disabled={submitting}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="เช่น 1000"
                        className="w-full rounded-lg border border-white/15 bg-black/40 pl-3 pr-12 py-2.5 text-[13px] text-white tabular-nums focus:border-emerald-500/50 focus:outline-none"
                        data-testid="admin-revenue-adjustment-amount"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 pointer-events-none">
                        บาท
                      </span>
                    </div>
                    {showFieldError && fieldErrors.amount ? (
                      <p
                        className="text-[11px] text-red-300"
                        data-testid="admin-revenue-adjustment-amount-error"
                      >
                        {fieldErrors.amount}
                      </p>
                    ) : null}
                  </label>
                ) : null}
                {selected?.needsNewFeeAmount ? (
                  <label className="block space-y-1.5">
                    <span className="text-[12px] font-semibold text-slate-200">
                      ยอดค่าบริการใหม่
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1}
                        value={newFeeAmount}
                        disabled={submitting}
                        onChange={(e) => setNewFeeAmount(e.target.value)}
                        placeholder="เช่น 4000"
                        className="w-full rounded-lg border border-white/15 bg-black/40 pl-3 pr-12 py-2.5 text-[13px] text-white tabular-nums focus:border-emerald-500/50 focus:outline-none"
                        data-testid="admin-revenue-adjustment-new-fee"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 pointer-events-none">
                        บาท
                      </span>
                    </div>
                    {showFieldError && fieldErrors.newFeeAmount ? (
                      <p
                        className="text-[11px] text-red-300"
                        data-testid="admin-revenue-adjustment-new-fee-error"
                      >
                        {fieldErrors.newFeeAmount}
                      </p>
                    ) : null}
                  </label>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {selected?.needsAmount || selected?.needsNewFeeAmount
                  ? "ขั้นที่ 3"
                  : "ขั้นที่ 2"}{" "}
                — เหตุผล
              </p>
              <label className="block space-y-1.5">
                <span className="text-[12px] font-semibold text-slate-200">
                  เหตุผล (จำเป็น)
                  {action === "admin_note" ? (
                    <span className="text-slate-500 font-normal">
                      {" "}
                      — หรือใช้หมายเหตุด้านล่าง
                    </span>
                  ) : null}
                </span>
                <textarea
                  value={reason}
                  disabled={submitting}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="ระบุเหตุผลสำหรับการปรับยอด"
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] text-white resize-y min-h-[4.5rem] focus:border-emerald-500/50 focus:outline-none"
                  data-testid="admin-revenue-adjustment-reason"
                />
                {showFieldError && fieldErrors.reason ? (
                  <p
                    className="text-[11px] text-red-300"
                    data-testid="admin-revenue-adjustment-reason-error"
                  >
                    {fieldErrors.reason}
                  </p>
                ) : null}
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {selected?.needsAmount || selected?.needsNewFeeAmount
                  ? "ขั้นที่ 4"
                  : "ขั้นที่ 3"}{" "}
                — หมายเหตุ
              </p>
              <label className="block space-y-1.5">
                <span className="text-[12px] font-semibold text-slate-200">
                  หมายเหตุ admin (ไม่บังคับ)
                </span>
                <textarea
                  value={adminNote}
                  disabled={submitting}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  placeholder="บันทึกภายใน admin (ไม่แสดงต่อผู้ขาย)"
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-[13px] text-white resize-y focus:border-emerald-500/50 focus:outline-none"
                  data-testid="admin-revenue-adjustment-admin-note"
                />
              </label>
            </div>
          </section>
        </div>

        <footer
          className="shrink-0 border-t border-white/[0.08] bg-[#0b1218]/95 px-4 sm:px-5 py-4 space-y-3"
          data-testid="admin-revenue-adjustment-modal-footer"
        >
          {error ? (
            <p
              className="text-[12px] text-red-200 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2"
              data-testid="admin-revenue-adjustment-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto min-h-[2.75rem] px-5 rounded-xl text-[13px] font-bold text-slate-300 border border-white/15 hover:bg-white/5 disabled:opacity-40"
              data-testid="admin-revenue-adjustment-cancel"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full sm:w-auto min-h-[2.75rem] px-5 rounded-xl text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="admin-revenue-adjustment-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก…
                </>
              ) : (
                "ยืนยันปรับยอด"
              )}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

export default AdminRevenueAdjustmentModal;
