import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, EyeOff, ShieldCheck, XCircle } from "lucide-react";
import { useAppStore } from "../../store";
import {
  fetchAdminListingReports,
  updateAdminListingReport,
  type ListingReportItem,
  type ListingReportReason,
} from "../../services/listings/listingReportApi";
import {
  formatListingReportReason,
  formatListingReportStatus,
} from "../../utils/listingReportLabels";

type ReportStatusFilter = "open" | "reviewed" | "dismissed" | "actioned" | "all";

const STATUS_TABS: { id: ReportStatusFilter; label: string }[] = [
  { id: "open", label: "เปิดอยู่" },
  { id: "reviewed", label: "ตรวจแล้ว" },
  { id: "dismissed", label: "ยกเลิก" },
  { id: "actioned", label: "ซ่อนแล้ว" },
  { id: "all", label: "ทั้งหมด" },
];

function statusBadgeClass(
  status: ListingReportItem["status"],
  isDarkMode: boolean
): string {
  const base = "px-2 py-0.5 rounded-full text-[11px] font-semibold border";
  switch (status) {
    case "open":
      return `${base} bg-orange-500/15 text-orange-500 border-orange-500/30`;
    case "reviewed":
      return `${base} bg-emerald-500/15 text-emerald-600 border-emerald-500/30`;
    case "dismissed":
      return `${base} ${isDarkMode ? "bg-slate-700/40 text-slate-300 border-slate-600" : "bg-slate-100 text-slate-600 border-slate-300"}`;
    case "actioned":
      return `${base} bg-amber-500/15 text-amber-600 border-amber-500/30`;
    default:
      return base;
  }
}

export default function AdminListingReportsView() {
  const { isDarkMode, setView } = useAppStore();
  const [status, setStatus] = useState<ReportStatusFilter>("open");
  const [rows, setRows] = useState<ListingReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    if (action === "hide") {
      const ok = window.confirm(
        "ซ่อนประกาศชั่วคราวจากตลาดสาธารณะ?\nรายการยังไม่ถูกลบถาวร — admin สามารถจัดการ visibility ภายหลังได้"
      );
      if (!ok) return;
    }
    setBusyId(reportId);
    setNotice(null);
    try {
      const updated = await updateAdminListingReport({ reportId, action });
      const actionLabel =
        action === "reviewed"
          ? "ทำเครื่องหมายตรวจแล้ว"
          : action === "dismiss"
            ? "ยกเลิกรายงาน"
            : "ซ่อนประกาศจากตลาด";
      setNotice(
        `${actionLabel}สำเร็จ — สถานะ: ${formatListingReportStatus(updated.status)}`
      );
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
        <h2 className="font-display font-black text-xl">ตรวจรายงานประกาศ</h2>
        <p className="text-xs opacity-80 mt-1">
          การรายงานเป็นการแจ้งให้ตรวจสอบเท่านั้น — ไม่ได้หมายความว่าประกาศผิดทันที
          ใช้ปุ่มซ่อนเมื่อต้องการนำออกจากตลาดชั่วคราว
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/25">
            เปิดอยู่ในแท็บนี้: {openCount}
          </span>
          <span className="opacity-70">ตรวจข้อมูลก่อนกด action ทุกครั้ง</span>
        </div>
      </div>

      {notice && (
        <p
          className={`text-sm rounded-xl border px-4 py-3 ${
            isDarkMode
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatus(tab.id)}
            className={`px-3 py-1.5 rounded-full border ${
              status === tab.id
                ? "bg-orange-500/15 border-orange-500/40 text-orange-500"
                : "border-slate-500/20 text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400">กำลังโหลดรายงาน...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.reportId} className={`rounded-xl border p-4 ${card}`}>
            <div className="flex flex-wrap justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] opacity-60 font-mono truncate">{r.reportId}</p>
                <p className="font-bold text-sm sm:text-base">
                  {r.listingTitle || r.listingId}
                </p>
                <p className="text-xs opacity-75">
                  รหัสประกาศ: <span className="font-mono">{r.listingId}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className={statusBadgeClass(r.status, isDarkMode)}>
                    {formatListingReportStatus(r.status)}
                  </span>
                  <span className="text-xs opacity-80">
                    เหตุผล: {formatListingReportReason(r.reason as ListingReportReason)}
                  </span>
                </div>
                {r.note && (
                  <p className="text-xs mt-1 opacity-90 rounded-lg bg-black/5 dark:bg-white/5 px-2 py-1.5">
                    หมายเหตุผู้รายงาน: {r.note}
                  </p>
                )}
                {r.reviewedAt && (
                  <p className="text-[11px] opacity-60">
                    อัปเดตล่าสุด: {new Date(r.reviewedAt).toLocaleString("th-TH")}
                    {r.reviewedBy ? ` · โดย ${r.reviewedBy}` : ""}
                  </p>
                )}
              </div>
              <div className="text-[11px] opacity-70 shrink-0 text-right">
                <p>รับรายงาน</p>
                <p>{new Date(r.createdAt).toLocaleString("th-TH")}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setView("car-details", r.listingId)}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-500/30 inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> ดูประกาศ
              </button>
              {r.status === "open" && (
                <>
                  <button
                    type="button"
                    disabled={busyId === r.reportId}
                    onClick={() => void runAction(r.reportId, "reviewed")}
                    className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> ตรวจแล้ว
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.reportId}
                    onClick={() => void runAction(r.reportId, "dismiss")}
                    className="px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-white inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> ยกเลิกรายงาน
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.reportId}
                    onClick={() => void runAction(r.reportId, "hide")}
                    className="px-3 py-1.5 rounded-lg text-xs bg-amber-600 text-white inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> ซ่อนจากตลาด
                  </button>
                </>
              )}
            </div>

            {r.status !== "open" && (
              <p className="text-[11px] mt-2 opacity-60">
                รายการนี้ปิดแล้ว — เปลี่ยนแท็บสถานะหรือ refresh เพื่อดูประวัติ
              </p>
            )}
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-slate-400">
            ยังไม่มีรายงานในสถานะนี้ — ลองสร้างรายงานจากปุ่ม «รายงานประกาศ» ในหน้ารายละเอียดรถ
          </p>
        )}
      </div>

      <p className="text-[11px] opacity-70 inline-flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        การซ่อนจากตลาดไม่ใช่การลบถาวร และไม่เปลี่ยนสิทธิ์เจ้าของประกาศ
      </p>
    </div>
  );
}
