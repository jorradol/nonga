import React, { useEffect, useState } from "react";
import {
  Car,
  FileEdit,
  AlertTriangle,
  ImageIcon,
  Upload,
  Loader2,
  Copy,
} from "lucide-react";
import type { DealerApiHeaders } from "../../services/dealer/dealerApi";
import {
  fetchDealerDashboard,
  type DealerDashboardStats,
} from "../../services/dealer/dealerApi";
import { navigateDealerTab } from "./DealerPortalLayout";

interface Props {
  apiHeaders: DealerApiHeaders;
  isDarkMode: boolean;
}

export function DealerPortalHome({ apiHeaders, isDarkMode }: Props) {
  const [stats, setStats] = useState<DealerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDealerDashboard(apiHeaders)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [apiHeaders]);

  const card = isDarkMode
    ? "bg-slate-900/60 border-slate-800"
    : "bg-slate-50 border-slate-200";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">แดชบอร์ดเต็นท์</h1>
        <p className="text-sm text-slate-400 mt-1">
          สรุปรถของคุณ — ลงขายแล้ว ยังไม่ลงขาย และที่ต้องตรวจสอบ
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "ลงขายแล้ว", value: stats.published, icon: Car, color: "text-green-400" },
            { label: "ยังไม่ลงขาย", value: stats.draft, icon: FileEdit, color: "text-amber-400" },
            { label: "ต้องตรวจสอบ", value: stats.needsReview, icon: AlertTriangle, color: "text-orange-300" },
            { label: "ซ่อนจากตลาด", value: stats.hidden, icon: Car, color: "text-slate-400" },
            { label: "ไม่มีรูป", value: stats.noImages, icon: ImageIcon, color: "text-red-300" },
            {
              label: "อาจซ้ำ",
              value: (stats.possibleDuplicates ?? 0) + (stats.draftDuplicates ?? 0),
              icon: Copy,
              color: "text-amber-400",
            },
          ].map((s) => (
            <div key={s.label} className={`p-4 rounded-xl border ${card}`}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-[10px] text-slate-500">{s.label}</p>
              <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            navigateDealerTab("import");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-orange-600 text-white text-xs font-bold"
        >
          <Upload className="w-4 h-4" />
          นำเข้ารถเพิ่ม
        </button>
        <button
          type="button"
          onClick={() => {
            navigateDealerTab("drafts");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className="px-4 py-2.5 min-h-[44px] rounded-xl border border-amber-500/40 text-amber-300 text-xs font-bold"
        >
          จัดการประกาศรอลงขาย
        </button>
        {(stats?.possibleDuplicates ?? 0) + (stats?.draftDuplicates ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => {
              navigateDealerTab("duplicates");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-300 text-xs font-bold"
          >
            ตรวจรถซ้ำ
          </button>
        )}
      </div>
    </div>
  );
}
