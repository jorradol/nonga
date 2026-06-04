/**
 * v5.6I.1 — Admin revenue / success fee preview (read-only, no payment I/O).
 */

import {
  ADMIN_REVENUE_EMPTY_STATE_MESSAGE,
  ADMIN_REVENUE_ESTIMATED_FROM_LISTING_NOTE,
  ADMIN_REVENUE_PREVIEW_WARNING,
  ADMIN_REVENUE_TERM,
  buildAdminRevenueDashboardSummary,
  deriveAdminRevenuePreviewRowsFromListings,
  formatAdminScopeId,
  formatBaht,
  getAdminRevenuePreviewRows,
  type AdminRevenueListingPreviewSource,
  type AdminRevenuePreviewRow,
} from "../../../services/leads/adminRevenuePreview";
import { getSuccessFeePolicyLabel } from "../../../services/leads/successFeePolicy";
import type { SettlementStatus } from "../../../services/leads/leadTypes";
import {
  AlertTriangle,
  Banknote,
  Lock,
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

export type AdminRevenueDashboardPreviewProps = {
  previewRows?: AdminRevenuePreviewRow[];
  listings?: AdminRevenueListingPreviewSource[];
  pendingSaleListingsCount?: number;
};

export function AdminRevenueDashboardPreview({
  previewRows,
  listings = [],
  pendingSaleListingsCount,
}: AdminRevenueDashboardPreviewProps) {
  const rows =
    previewRows ??
    (listings.length > 0
      ? deriveAdminRevenuePreviewRowsFromListings(listings)
      : getAdminRevenuePreviewRows());
  const pendingCount =
    pendingSaleListingsCount ??
    listings.filter((c) => c.saleStatus === "pending_sale").length;
  const summary = buildAdminRevenueDashboardSummary(rows, {
    pendingSaleListingsCount: pendingCount,
  });
  const isEmpty = rows.length === 0;

  return (
    <section
      className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-5 space-y-5 text-left"
      data-testid="admin-revenue-dashboard-preview"
      data-readonly="true"
      aria-label="Admin revenue dashboard preview"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Banknote className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-sm font-black text-white">
            รายได้ / {ADMIN_REVENUE_TERM}
          </h2>
          <p className="text-[11px] text-emerald-200/80 leading-relaxed">
            Settlement preview สำหรับแอดมิน — ไม่แสดงต่อผู้ซื้อ
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
        <span>{ADMIN_REVENUE_PREVIEW_WARNING}</span>
      </p>

      <p
        className="text-[11px] text-emerald-100/85 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
        data-testid="admin-revenue-estimated-note"
      >
        {ADMIN_REVENUE_ESTIMATED_FROM_LISTING_NOTE}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="ดีลปิดการขายได้ (preview rows)"
          value={String(summary.closedDealsCount)}
          testId="admin-revenue-summary-closed-deals"
        />
        <SummaryCard
          label="รถ pending_sale"
          value={String(summary.pendingSaleListingsCount)}
          testId="admin-revenue-summary-pending-sale"
        />
        <SummaryCard
          label="ค่าบริการคาดการณ์"
          value={formatBaht(summary.expectedServiceFeeTotal)}
          testId="admin-revenue-summary-expected-fee"
        />
        <SummaryCard
          label="ยอดรอชำระ"
          value={formatBaht(summary.awaitingPaymentTotal)}
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
          value={`${summary.disputedCount} / ${summary.cancelledCount}`}
          testId="admin-revenue-summary-disputed-cancelled"
        />
      </div>

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
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.04] text-slate-300"
                    data-testid={`admin-revenue-row-${row.id}`}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500">
        Policy: {getSuccessFeePolicyLabel("hundred_thousand_floor_tier")} (
        <span className="font-mono">hundred_thousand_floor_tier</span>)
      </p>
    </section>
  );
}

export default AdminRevenueDashboardPreview;
