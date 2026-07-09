/**
 * v22.34 — Owner/admin pending listing review queue (browser UI).
 * Approve / hold only — no secrets, no terminal.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "../../store";
import {
  approveAdminPendingListing,
  fetchAdminPendingListings,
  holdAdminPendingListing,
  type AdminPendingListingItem,
} from "../../services/admin/adminListingReviewApi";
import { ListingCoverImage } from "../listings/ListingCoverImage";
import {
  DEALER_PENDING_REVIEW_GUIDANCE_TH,
  ListingStatusBadge,
} from "../shared/ListingStatusBadge";
import { EmptyState } from "../shared/EmptyState";
import { logTechnicalError, toUserFacingError } from "../../utils/userFacingErrors";

function sellerLabel(row: AdminPendingListingItem): string {
  return (
    String(row.showroomName ?? "").trim() ||
    String(row.ownerName ?? "").trim() ||
    "เต็นท์ (ไม่ระบุชื่อแสดง)"
  );
}

export default function AdminPendingListingsView() {
  const { isDarkMode, setView } = useAppStore();
  const [rows, setRows] = useState<AdminPendingListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminPendingListings());
    } catch (e) {
      logTechnicalError("AdminPendingListingsView.load", e);
      setError(toUserFacingError(e, "โหลดคิวรออนุมัติไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onApprove = async (row: AdminPendingListingItem) => {
    const ok = window.confirm(
      `อนุมัติประกาศนี้ให้แสดงในตลาด?\n\n${row.title}\n${row.brand} ${row.model} · ${row.year}\n฿${Number(row.price || 0).toLocaleString("th-TH")}`
    );
    if (!ok) return;
    setBusyId(row.id);
    setNotice(null);
    setError(null);
    try {
      await approveAdminPendingListing(row.id);
      setNotice("อนุมัติแล้ว — ประกาศแสดงในตลาดได้");
      await load();
    } catch (e) {
      logTechnicalError("AdminPendingListingsView.approve", e);
      setError(toUserFacingError(e, "อนุมัติไม่สำเร็จ"));
    } finally {
      setBusyId(null);
    }
  };

  const onHold = async (row: AdminPendingListingItem) => {
    const ok = window.confirm(
      `พักประกาศนี้ไว้ก่อน?\nจะไม่แสดงในตลาดจนกว่าจะอนุมัติภายหลัง\n\n${row.title}`
    );
    if (!ok) return;
    setBusyId(row.id);
    setNotice(null);
    setError(null);
    try {
      await holdAdminPendingListing(row.id);
      setNotice("พักประกาศแล้ว — ยังไม่แสดงในตลาด");
      await load();
    } catch (e) {
      logTechnicalError("AdminPendingListingsView.hold", e);
      setError(toUserFacingError(e, "พักประกาศไม่สำเร็จ"));
    } finally {
      setBusyId(null);
    }
  };

  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800"
    : "bg-white border-slate-200";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <button
        type="button"
        onClick={() => setView("admin-dashboard")}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        กลับแดชบอร์ดแอดมิน
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30">
          <ShieldCheck className="w-5 h-5 text-violet-300" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">คิวรออนุมัติประกาศเต็นท์</h1>
          <p className="text-xs text-slate-400 mt-1">
            ตรวจรายการที่เต็นท์ส่งมาแล้วกดอนุมัติให้ขึ้นตลาด หรือพักไว้ก่อน
            — ประกาศที่รออนุมัติยังไม่แสดงต่อผู้ซื้อ
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Clock3 className="w-3.5 h-3.5" />
          รอตรวจ {rows.length} รายการ
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-[40px] px-3 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
        >
          รีเฟรช
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="ยังไม่มีประกาศรออนุมัติ"
          description="เมื่อเต็นท์กดส่งประกาศ รายการจะมาแสดงที่นี่ก่อนขึ้นตลาด"
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const busy = busyId === row.id;
            return (
              <div
                key={row.id}
                className={`rounded-xl border p-4 ${panel}`}
                data-testid={`admin-pending-listing-${row.id}`}
              >
                <div className="flex gap-3">
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                    <ListingCoverImage
                      listingId={row.id}
                      images={row.images ?? []}
                      alt={row.title}
                      className="w-full h-full object-cover"
                      showPlaceholderIcon
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-sm truncate">{row.title}</h2>
                      <ListingStatusBadge variant="pending-review" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {row.brand} {row.model} · {row.year} · ฿
                      {Number(row.price || 0).toLocaleString("th-TH")}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      เต็นท์: {sellerLabel(row)}
                    </p>
                    <p className="text-[11px] text-violet-300/90">
                      {DEALER_PENDING_REVIEW_GUIDANCE_TH}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      สาธารณะหลังอนุมัติ: แสดงชื่อเต็นท์/รุ่น/ราคา/รูป —
                      ไม่เปิดเบอร์โทร · VIN · ทะเบียนเต็ม · รหัสภายใน
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onApprove(row)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    อนุมัติขึ้นตลาด
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onHold(row)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    พักไว้ก่อน
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
