import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, EyeOff, ShieldCheck, XCircle } from "lucide-react";
import { useAppStore } from "../../store";
import {
  fetchAdminListingReports,
  updateAdminListingReport,
  type ListingReportItem,
} from "../../services/listings/listingReportApi";

export default function AdminListingReportsView() {
  const { isDarkMode } = useAppStore();
  const [status, setStatus] = useState<"open" | "reviewed" | "dismissed" | "actioned" | "all">("open");
  const [rows, setRows] = useState<ListingReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminListingReports(status);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดรายงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const openCount = useMemo(() => rows.filter((r) => r.status === "open").length, [rows]);

  const runAction = async (
    reportId: string,
    action: "reviewed" | "dismiss" | "hide"
  ) => {
    const adminNote =
      action === "hide"
        ? window.prompt("เหตุผลการซ่อนประกาศชั่วคราว (optional):", "") || ""
        : "";
    setBusyId(reportId);
    try {
      await updateAdminListingReport({ reportId, action, adminNote });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const card = isDarkMode
    ? "bg-[#111214] border-white/[0.08] text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div className="space-y-5 text-left">
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h2 className="font-display font-black text-xl">Admin Review — รายงานประกาศ</h2>
        <p className="text-xs opacity-80 mt-1">
          ใช้สำหรับตรวจสอบและซ่อนประกาศแบบชั่วคราวเมื่อพบความเสี่ยง โดยไม่ลบข้อมูลถาวร
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/25">
            open: {openCount}
          </span>
          <span className="opacity-70">ควรตรวจสอบข้อมูลก่อน action ทุกครั้ง</span>
        </div>
      </div>

      <div className="flex gap-2 text-xs">
        {(["open", "reviewed", "dismissed", "actioned", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full border ${
              status === s
                ? "bg-orange-500/15 border-orange-500/40 text-orange-500"
                : "border-slate-500/20 text-slate-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400">กำลังโหลดรายงาน...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.reportId} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-xs opacity-70">{r.reportId}</p>
                <p className="font-bold text-sm">{r.listingTitle || r.listingId}</p>
                <p className="text-xs opacity-80 mt-1">
                  reason: {r.reason} | status: {r.status}
                </p>
                {r.note && <p className="text-xs mt-1 opacity-90">note: {r.note}</p>}
              </div>
              <div className="text-[11px] opacity-70">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === r.reportId}
                onClick={() => void runAction(r.reportId, "reviewed")}
                className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> mark reviewed
              </button>
              <button
                type="button"
                disabled={busyId === r.reportId}
                onClick={() => void runAction(r.reportId, "dismiss")}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-white inline-flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> dismiss
              </button>
              <button
                type="button"
                disabled={busyId === r.reportId}
                onClick={() => void runAction(r.reportId, "hide")}
                className="px-3 py-1.5 rounded-lg text-xs bg-amber-600 text-white inline-flex items-center gap-1"
              >
                <EyeOff className="w-3.5 h-3.5" /> ซ่อนประกาศแบบชั่วคราว
              </button>
            </div>
            <p className="text-[11px] mt-2 opacity-70 inline-flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              การรายงานเป็นการแจ้งให้ตรวจสอบ ไม่ได้หมายความว่าประกาศผิดทันที
            </p>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-slate-400">ยังไม่มีรายงานในสถานะนี้</p>
        )}
      </div>
    </div>
  );
}

