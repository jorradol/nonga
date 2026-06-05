/**
 * v5.6I.3 — Admin revenue dashboard preview (backend API source).
 */

import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_REVENUE_EMPTY_STATE_MESSAGE,
  ADMIN_REVENUE_ESTIMATED_FROM_LISTING_NOTE,
  ADMIN_REVENUE_PREVIEW_WARNING,
  ADMIN_REVENUE_TERM,
  formatAdminScopeId,
  formatBaht,
  type AdminRevenuePreviewRow,
} from "../../../services/leads/adminRevenuePreview";
import { fetchAdminRevenuePreview } from "../../../services/leads/adminRevenuePreviewApi";
import {
  postAdminRevenueAdjustment,
  type AdminRevenueAdjustmentRequest,
} from "../../../services/leads/adminRevenueAdjustmentApi";
import type {
  RevenuePreviewApiPayload,
  RevenuePreviewApiRow,
} from "../../../services/leads/revenuePreviewBackend";
import { SETTLEMENT_ADJUSTMENT_MANUAL_WARNING } from "../../../services/leads/settlementAdjustmentService";
import { getSuccessFeePolicyLabel } from "../../../services/leads/successFeePolicy";
import type { SettlementStatus } from "../../../services/leads/leadTypes";
import { AdminRevenueAdjustmentModal } from "./AdminRevenueAdjustmentModal";
import {
  AlertTriangle,
  Banknote,
  Loader2,
  Lock,
  Pencil,
  Receipt,
} from "lucide-react";

const STATUS_LABELS: Record<SettlementStatus, string> = {
  unbilled: "ยังไม่วางบิล",
  pending_payment: "รอชำระ",
  partially_paid: "ชำระบางส่วน",
  paid: "ชำระแล้ว",
  waived: "ยกเว้น",
  disputed: "โต้แย้ง",
  cancelled: "ยกเลิก",
};

function SummaryCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-black/30 p-3"
      data-testid={testId}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-sm font-black text-white mt-1">{value}</p>
    </div>
  );
}

function apiRowToDisplayRow(row: RevenuePreviewApiRow): AdminRevenuePreviewRow {
  return {
    id: row.id,
    date: row.previewAt,
    listingId: row.listingId,
    listingTitle: row.listingTitle,
    sellerScopeId: row.sellerScopeIdMasked,
    ownerScopeId: row.ownerScopeIdMasked,
    buyerLeadId: "preview",
    closedDealPrice: row.closedDealPrice,
    feeAmount: row.feeAmount,
    feePolicyType: row.feePolicyType,
    paidAmount: row.paidAmount,
    remainingAmount: row.remainingAmount,
    settlementStatus: row.settlementStatus,
    isEstimatedFromListingPrice: row.priceSource === "listing_price_estimate",
    priceSourceLabel: row.priceSourceLabel,
    adminNotePreview: row.adminNote,
  };
}

export type AdminRevenueDashboardPreviewProps = {
  /** Test / story override — skips API fetch when provided. */
  previewPayload?: RevenuePreviewApiPayload;
};

export function AdminRevenueDashboardPreview({
  previewPayload,
}: AdminRevenueDashboardPreviewProps = {}) {
  const [payload, setPayload] = useState<RevenuePreviewApiPayload | null>(
    previewPayload ?? null
  );
  const [loading, setLoading] = useState(!previewPayload);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adjustRow, setAdjustRow] = useState<AdminRevenuePreviewRow | null>(
    null
  );
  const [apiRowsById, setApiRowsById] = useState<
    Record<string, RevenuePreviewApiRow>
  >({});

  const load = useCallback(async () => {
    if (previewPayload) {
      setPayload(previewPayload);
      setApiRowsById(
        Object.fromEntries(previewPayload.rows.map((r) => [r.id, r]))
      );
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminRevenuePreview();
      setPayload(data);
      setApiRowsById(Object.fromEntries(data.rows.map((r) => [r.id, r])));
    } catch (err) {
      setPayload(null);
      setError(
        err instanceof Error
          ? err.message
          : "โหลดรายได้ preview ไม่สำเร็จครับ"
      );
    } finally {
      setLoading(false);
    }
  }, [previewPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdjustmentSubmit = useCallback(
    async (body: AdminRevenueAdjustmentRequest) => {
      await postAdminRevenueAdjustment(body);
      setAdjustRow(null);
      setSuccessMessage("บันทึกการปรับยอดสำเร็จ — กำลังอัปเดตรายงาน…");
      await load();
      setSuccessMessage("บันทึกการปรับยอดสำเร็จ");
    },
    [load]
  );

  const summary = payload?.summary;
  const rows = payload?.rows.map(apiRowToDisplayRow) ?? [];
  const isEmpty = !loading && !error && rows.length === 0;

  return (
    <section
      className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-5 space-y-5 text-left"
      data-testid="admin-revenue-dashboard-preview"
      data-readonly="true"
      data-source="backend-api"
      data-manual-adjustments-enabled="true"
      aria-label="Admin revenue dashboard preview"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Banknote className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-sm font-black text-white">
            รายได้ / {ADMIN_REVENUE_TERM}
          </h2>
          <p className="text-[11px] text-emerald-200/80 leading-relaxed">
            Settlement preview จาก backend inventory — ไม่แสดงต่อผู้ซื้อ
          </p>
        </div>
        <span
          className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full"
          data-testid="admin-revenue-readonly-badge"
        >
          <Lock className="w-3 h-3" />
          Preview / Read-only
        </span>
      </div>

      <p
        className="text-[11px] text-amber-100/90 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2"
        data-testid="admin-revenue-preview-warning"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
        <span>{payload?.previewWarning ?? ADMIN_REVENUE_PREVIEW_WARNING}</span>
      </p>

      <p
        className="text-[11px] text-emerald-100/85 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
        data-testid="admin-revenue-manual-adjustment-warning"
      >
        {payload?.manualAdjustmentWarning ?? SETTLEMENT_ADJUSTMENT_MANUAL_WARNING}
      </p>

      {successMessage ? (
        <p
          className="text-[12px] text-emerald-200 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"
          data-testid="admin-revenue-adjustment-success"
        >
          {successMessage}
        </p>
      ) : null}

      <p
        className="text-[11px] text-emerald-100/85 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
        data-testid="admin-revenue-estimated-note"
      >
        {ADMIN_REVENUE_ESTIMATED_FROM_LISTING_NOTE}
      </p>

      {loading ? (
        <div
          className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm"
          data-testid="admin-revenue-loading"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          กำลังโหลดรายได้จาก backend…
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200"
          data-testid="admin-revenue-error"
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="รถ pending_sale"
            value={String(summary.pendingSaleCount)}
            testId="admin-revenue-summary-pending-sale"
          />
          <SummaryCard
            label="ดีลปิดการขายได้ (closed_won preview)"
            value={String(summary.closedWonCount)}
            testId="admin-revenue-summary-closed-deals"
          />
          <SummaryCard
            label="ค่าบริการคาดการณ์"
            value={formatBaht(summary.estimatedFeeTotal)}
            testId="admin-revenue-summary-expected-fee"
          />
          <SummaryCard
            label="ยอดค้างชำระ (unbilled)"
            value={formatBaht(summary.unbilledTotal)}
            testId="admin-revenue-summary-awaiting"
          />
          <SummaryCard
            label="ชำระบางส่วน (คงเหลือ)"
            value={formatBaht(summary.partiallyPaidTotal)}
            testId="admin-revenue-summary-partial"
          />
          <SummaryCard
            label="ชำระแล้ว"
            value={formatBaht(summary.paidTotal)}
            testId="admin-revenue-summary-paid"
          />
          <SummaryCard
            label="ยกเว้น"
            value={formatBaht(summary.waivedTotal)}
            testId="admin-revenue-summary-waived"
          />
          <SummaryCard
            label="โต้แย้ง / ยกเลิก"
            value={`${summary.disputedTotal} / ${summary.cancelledTotal}`}
            testId="admin-revenue-summary-disputed-cancelled"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2 bg-black/20">
          <Receipt className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold text-slate-300">
            ตาราง {ADMIN_REVENUE_TERM} (preview)
          </span>
        </div>

        {isEmpty ? (
          <p
            className="p-6 text-center text-[12px] text-slate-400"
            data-testid="admin-revenue-empty-state"
          >
            {ADMIN_REVENUE_EMPTY_STATE_MESSAGE}
          </p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table
              className="w-full text-[10px] text-left"
              data-testid="admin-revenue-preview-table"
            >
              <thead>
                <tr className="text-slate-500 border-b border-white/[0.06]">
                  <th className="px-2 py-2 font-bold">วันที่</th>
                  <th className="px-2 py-2 font-bold">รถ / listing</th>
                  <th className="px-2 py-2 font-bold">seller scope</th>
                  <th className="px-2 py-2 font-bold">leadId</th>
                  <th className="px-2 py-2 font-bold">ราคาปิด</th>
                  <th className="px-2 py-2 font-bold">{ADMIN_REVENUE_TERM}</th>
                  <th className="px-2 py-2 font-bold">policy</th>
                  <th className="px-2 py-2 font-bold">paid</th>
                  <th className="px-2 py-2 font-bold">คงเหลือ</th>
                  <th className="px-2 py-2 font-bold">สถานะ</th>
                  <th className="px-2 py-2 font-bold">admin note</th>
                  <th className="px-2 py-2 font-bold">audit</th>
                  <th className="px-2 py-2 font-bold">ปรับยอด</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const apiRow = apiRowsById[row.id] ?? payload?.rows.find((r) => r.id === row.id);
                  const auditPreview = apiRow?.auditLogPreview ?? [];
                  return (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.04] text-slate-300"
                    data-testid={`admin-revenue-row-${row.id}`}
                    data-has-manual-adjustment={apiRow?.hasManualAdjustment ? "true" : "false"}
                  >
                    <td className="px-2 py-2 whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString("th-TH")}
                    </td>
                    <td className="px-2 py-2 font-mono">
                      {row.listingTitle ? (
                        <span className="block text-white truncate max-w-[120px]">
                          {row.listingTitle}
                        </span>
                      ) : null}
                      <span>{formatAdminScopeId(row.listingId)}</span>
                    </td>
                    <td className="px-2 py-2 font-mono">
                      {formatAdminScopeId(row.sellerScopeId)}
                    </td>
                    <td className="px-2 py-2 font-mono">
                      {row.buyerLeadId === "preview"
                        ? "—"
                        : formatAdminScopeId(row.buyerLeadId)}
                    </td>
                    <td className="px-2 py-2">
                      <span>{formatBaht(row.closedDealPrice)}</span>
                      {row.priceSourceLabel ? (
                        <span
                          className="block text-[9px] text-amber-300/90 mt-0.5"
                          data-testid={`admin-revenue-price-source-${row.id}`}
                        >
                          {row.priceSourceLabel}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{formatBaht(row.feeAmount)}</td>
                    <td className="px-2 py-2 font-mono">{row.feePolicyType}</td>
                    <td className="px-2 py-2">{formatBaht(row.paidAmount)}</td>
                    <td className="px-2 py-2">{formatBaht(row.remainingAmount)}</td>
                    <td className="px-2 py-2">
                      {STATUS_LABELS[row.settlementStatus]}
                    </td>
                    <td className="px-2 py-2 text-slate-500 max-w-[140px] truncate">
                      {row.adminNotePreview ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-slate-500 max-w-[160px]">
                      {auditPreview.length ? (
                        <span
                          className="block truncate"
                          data-testid={`admin-revenue-audit-preview-${row.id}`}
                          title={auditPreview
                            .map(
                              (a) =>
                                `${a.action}: ${a.previousRemainingAmount}→${a.newRemainingAmount} (${a.reason})`
                            )
                            .join(" | ")}
                        >
                          {auditPreview[auditPreview.length - 1]?.action} —{" "}
                          {auditPreview[auditPreview.length - 1]?.reason}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setAdjustRow(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/10"
                        data-testid={`admin-revenue-adjust-btn-${row.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                        ปรับยอด
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <p className="text-[10px] text-slate-500">
        Policy: {getSuccessFeePolicyLabel("hundred_thousand_floor_tier")} (
        <span className="font-mono">hundred_thousand_floor_tier</span>)
      </p>

      {adjustRow ? (
        <AdminRevenueAdjustmentModal
          row={adjustRow}
          onClose={() => setAdjustRow(null)}
          onSubmit={handleAdjustmentSubmit}
        />
      ) : null}
    </section>
  );
}

export default AdminRevenueDashboardPreview;
