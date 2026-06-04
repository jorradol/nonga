/**
 * v5.6I.3 — Seller/member read-only revenue statement preview.
 */

import { useCallback, useEffect, useState } from "react";
import { formatBaht } from "../../services/leads/adminRevenuePreview";
import { fetchMyRevenuePreview } from "../../services/leads/myRevenuePreviewApi";
import type { SellerRevenuePreviewApiPayload } from "../../services/leads/revenuePreviewBackend";
import type { MyListingsApiScope } from "../../services/listings/myListingsApi";
import { AlertTriangle, Banknote, Loader2, Lock } from "lucide-react";

export type MyRevenueStatementSectionProps = {
  scope: MyListingsApiScope;
  isDarkMode?: boolean;
};

export function MyRevenueStatementSection({
  scope,
  isDarkMode = true,
}: MyRevenueStatementSectionProps) {
  const [payload, setPayload] = useState<SellerRevenuePreviewApiPayload | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!scope.ownerId) {
      setPayload(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyRevenuePreview(scope);
      setPayload(data);
    } catch (err) {
      setPayload(null);
      setError(
        err instanceof Error ? err.message : "โหลดยอดค่าบริการ preview ไม่สำเร็จครับ"
      );
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const border = isDarkMode ? "border-emerald-500/25 bg-emerald-950/10" : "border-emerald-200 bg-emerald-50/50";

  return (
    <section
      className={`rounded-2xl border p-5 space-y-4 text-left ${border}`}
      data-testid="my-revenue-statement-preview"
      data-readonly="true"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Banknote className="w-5 h-5 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-black">ยอดค่าบริการเมื่อขายสำเร็จ</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {payload?.notice ?? "Preview จากรถที่อยู่สถานะรอดำเนินการขาย"}
          </p>
        </div>
        <span
          className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full"
          data-testid="my-revenue-readonly-badge"
        >
          <Lock className="w-3 h-3" />
          Preview / Read-only
        </span>
      </div>

      <p
        className="text-[11px] text-amber-100/90 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2"
        data-testid="my-revenue-preview-warning"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
        <span>{payload?.previewWarning ?? "ยังไม่มีการเรียกเก็บเงินจริง"}</span>
      </p>

      {loading ? (
        <div
          className="flex items-center gap-2 text-sm text-slate-400 py-4"
          data-testid="my-revenue-loading"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          กำลังโหลดยอดค้างชำระ…
        </div>
      ) : null}

      {error ? (
        <p
          className="text-[12px] text-red-300 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2"
          data-testid="my-revenue-error"
        >
          {error}
        </p>
      ) : null}

      {!loading && !error && payload ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
              data-testid="my-revenue-outstanding-total"
            >
              <p className="text-[10px] font-bold uppercase text-slate-500">
                ยอดค้างชำระรวม
              </p>
              <p className="text-lg font-black text-white mt-1">
                {formatBaht(payload.summary.outstandingTotal)}
              </p>
            </div>
            <div
              className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
              data-testid="my-revenue-row-count"
            >
              <p className="text-[10px] font-bold uppercase text-slate-500">
                รายการรถ
              </p>
              <p className="text-lg font-black text-white mt-1">
                {payload.summary.rowCount}
              </p>
            </div>
            <div
              className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
              data-testid="my-revenue-estimated-fee-total"
            >
              <p className="text-[10px] font-bold uppercase text-slate-500">
                ค่าบริการคาดการณ์
              </p>
              <p className="text-lg font-black text-white mt-1">
                {formatBaht(payload.summary.estimatedFeeTotal)}
              </p>
            </div>
          </div>

          {payload.rows.length === 0 ? (
            <p
              className="text-center text-[12px] text-slate-400 py-4"
              data-testid="my-revenue-empty-state"
            >
              ยังไม่มีรายการรอดำเนินการขายที่ต้องชำระค่าบริการในรอบ preview นี้
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table
                className="w-full text-[11px] text-left"
                data-testid="my-revenue-preview-table"
              >
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.06]">
                    <th className="px-3 py-2 font-bold">รถ</th>
                    <th className="px-3 py-2 font-bold">ราคา</th>
                    <th className="px-3 py-2 font-bold">ค่าบริการ</th>
                    <th className="px-3 py-2 font-bold">ค้างชำระ</th>
                    <th className="px-3 py-2 font-bold">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] text-slate-300"
                      data-testid={`my-revenue-row-${row.id}`}
                    >
                      <td className="px-3 py-2">
                        <span className="block text-white font-semibold">
                          {row.listingTitle ??
                            [row.brand, row.model, row.year].filter(Boolean).join(" ")}
                        </span>
                        {row.priceSourceLabel ? (
                          <span className="text-[10px] text-amber-300/90">
                            {row.priceSourceLabel}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{formatBaht(row.closedDealPrice)}</td>
                      <td className="px-3 py-2">{formatBaht(row.feeAmount)}</td>
                      <td className="px-3 py-2">{formatBaht(row.remainingAmount)}</td>
                      <td className="px-3 py-2">ยังไม่เรียกเก็บเงินจริง</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

export default MyRevenueStatementSection;
