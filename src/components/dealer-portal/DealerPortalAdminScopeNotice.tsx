import { ShieldCheck, FileSpreadsheet, Store } from "lucide-react";
import { useAppStore } from "../../store";

export function DealerPortalAdminScopeNotice() {
  const { setView, isDarkMode } = useAppStore();
  const card = isDarkMode
    ? "bg-slate-900/60 border-slate-800 text-slate-200"
    : "bg-white border-slate-200 text-slate-800";

  return (
    <div
      className={`rounded-2xl border p-6 max-w-lg ${card}`}
      data-testid="dealer-portal-admin-no-scope"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-8 h-8 text-orange-400 shrink-0" />
        <div className="space-y-3 text-sm">
          <h2 className="text-lg font-display font-bold text-slate-100">
            Dealer Portal — สำหรับบัญชีดีลเลอร์
          </h2>
          <p className="text-slate-400 leading-relaxed">
            บัญชีผู้ดูแลระบบไม่ได้ผูก <strong className="text-slate-300">dealerId</strong>{" "}
            จึงไม่แสดงตัวเลขคลังรถ (0 ทุกช่องไม่ได้หมายความว่าไม่มีรถในระบบ)
          </p>
          <p className="text-slate-500 text-xs leading-relaxed">
            ใช้เมนูนำเข้าคลังรถหรือแผงควบคุมระบบสำหรับงาน admin — หรือเข้าสู่ระบบด้วยบัญชีดีลเลอร์เพื่อดูสต๊อกเต็นท์
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setView("admin-dashboard")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold"
            >
              <ShieldCheck className="w-4 h-4" />
              แผงควบคุมระบบ
            </button>
            <button
              type="button"
              onClick={() => setView("inventory-import")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-500/40 text-teal-300 text-xs font-bold"
            >
              <FileSpreadsheet className="w-4 h-4" />
              นำเข้าคลังรถ
            </button>
            <button
              type="button"
              onClick={() => setView("marketplace")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
            >
              <Store className="w-4 h-4" />
              ตลาดรถสาธารณะ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
