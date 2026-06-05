/**
 * v5.6I.4 — Admin manual settlement adjustment modal.
 */

import { useState, type FormEvent } from "react";
import type { SettlementAdjustmentAction } from "../../../services/leads/leadTypes";
import {
  formatBaht,
  type AdminRevenuePreviewRow,
} from "../../../services/leads/adminRevenuePreview";
import type { AdminRevenueAdjustmentRequest } from "../../../services/leads/adminRevenueAdjustmentApi";
import { SETTLEMENT_ADJUSTMENT_MANUAL_WARNING } from "../../../services/leads/settlementAdjustmentService";
import { AlertTriangle, Loader2, X } from "lucide-react";

export type AdminRevenueAdjustmentActionOption = {
  action: SettlementAdjustmentAction;
  label: string;
  needsAmount?: boolean;
  needsNewFeeAmount?: boolean;
};

export const ADMIN_REVENUE_ADJUSTMENT_ACTIONS: AdminRevenueAdjustmentActionOption[] =
  [
    { action: "partial_payment", label: "บันทึกชำระบางส่วน", needsAmount: true },
    { action: "mark_paid", label: "ชำระครบ / mark paid" },
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

  const selected = ADMIN_REVENUE_ADJUSTMENT_ACTIONS.find(
    (opt) => opt.action === action
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70"
      data-testid="admin-revenue-adjustment-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0f1419] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div>
            <h3 className="text-sm font-black text-white">
              บันทึกการปรับยอดค่าบริการ
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {row.listingTitle ?? row.listingId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="ปิด"
            data-testid="admin-revenue-adjustment-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <p
            className="text-[11px] text-amber-100/90 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2"
            data-testid="admin-revenue-adjustment-warning"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>{SETTLEMENT_ADJUSTMENT_MANUAL_WARNING}</span>
          </p>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
              <p className="text-slate-500">ค่าบริการ</p>
              <p className="font-bold text-white">{formatBaht(row.feeAmount)}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
              <p className="text-slate-500">ชำระแล้ว</p>
              <p className="font-bold text-white">{formatBaht(row.paidAmount)}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3 col-span-2">
              <p className="text-slate-500">ยอดค้างชำระ</p>
              <p className="font-bold text-emerald-300">
                {formatBaht(row.remainingAmount)}
              </p>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-slate-300">การดำเนินการ</span>
            <select
              value={action}
              onChange={(e) =>
                setAction(e.target.value as SettlementAdjustmentAction)
              }
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white"
              data-testid="admin-revenue-adjustment-action"
            >
              {ADMIN_REVENUE_ADJUSTMENT_ACTIONS.map((opt) => (
                <option key={opt.action} value={opt.action}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {selected?.needsAmount ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-slate-300">
                จำนวนเงินที่ชำระ (บาท)
              </span>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white"
                data-testid="admin-revenue-adjustment-amount"
              />
            </label>
          ) : null}

          {selected?.needsNewFeeAmount ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-slate-300">
                ยอดค่าบริการใหม่ (บาท)
              </span>
              <input
                type="number"
                min={0}
                value={newFeeAmount}
                onChange={(e) => setNewFeeAmount(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white"
                data-testid="admin-revenue-adjustment-new-fee"
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-slate-300">
              เหตุผล (จำเป็น)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white"
              data-testid="admin-revenue-adjustment-reason"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-slate-300">
              หมายเหตุแอดมิน (ไม่บังคับ)
            </span>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white"
              data-testid="admin-revenue-adjustment-admin-note"
            />
          </label>

          {error ? (
            <p
              className="text-[12px] text-red-300 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2"
              data-testid="admin-revenue-adjustment-error"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[12px] font-bold text-slate-300 border border-white/10"
              data-testid="admin-revenue-adjustment-cancel"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-2"
              data-testid="admin-revenue-adjustment-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              บันทึกการปรับยอด
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminRevenueAdjustmentModal;
