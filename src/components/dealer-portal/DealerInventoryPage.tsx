import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Search, EyeOff, Eye, Trash2, ExternalLink, Car } from "lucide-react";
import { EmptyState } from "../shared/EmptyState";
import { ListingStatusBadge } from "../shared/ListingStatusBadge";
import { logTechnicalError, toUserFacingError } from "../../utils/userFacingErrors";
import { useAppStore } from "../../store";
import type { DealerApiHeaders, DealerInventoryCar } from "../../services/dealer/dealerApi";
import { DuplicateBadge } from "../duplicate/DuplicateBadge";
import {
  fetchDealerInventory,
  patchDealerInventory,
  hideDealerInventory,
  deleteDealerInventory,
} from "../../services/dealer/dealerApi";

interface Props {
  apiHeaders: DealerApiHeaders;
}

export function DealerInventoryPage({ apiHeaders }: Props) {
  const { setView, setFilters, isDarkMode } = useAppStore();
  const [cars, setCars] = useState<DealerInventoryCar[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<DealerInventoryCar>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCars(await fetchDealerInventory(apiHeaders, q));
    } catch (e) {
      logTechnicalError("DealerInventoryPage.load", e);
      setError(toUserFacingError(e, "โหลดรายการรถไม่สำเร็จครับ"));
    } finally {
      setLoading(false);
    }
  }, [apiHeaders, q]);

  useEffect(() => {
    load();
  }, [load]);

  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800"
    : "bg-white border-slate-200";

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">รถที่ลงขายแล้ว</h1>
      <p className="text-xs text-slate-400">
        รายการที่แสดงในตลาดรถ — ซ่อน แก้ไข หรือลบได้จากหน้านี้
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            placeholder="ค้นหายี่ห้อ รุ่น หรือชื่อประกาศ"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={load}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shrink-0"
        >
          ค้นหา
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto" />
      ) : cars.length === 0 ? (
        <EmptyState
          icon={Car}
          title="ยังไม่มีรถที่ลงขายในตลาด"
          description="เมื่อลงขายประกาศจากเมนู «ยังไม่ลงขาย» รถจะมาแสดงที่นี่ หรือนำเข้ารายการจากเมนูนำเข้า"
          secondaryActionLabel="ไปจัดการประกาศรอลงขาย"
          onSecondaryAction={() => {
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", "/dealer/drafts");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {cars.map((c) => (
            <div key={c.id} className={`rounded-xl border p-4 ${panel}`}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm">{c.title}</h3>
                    <DuplicateBadge
                      status={
                        (c.duplicateStatus as
                          | "unique"
                          | "possible_duplicate"
                          | "duplicate_confirmed"
                          | "merged") ?? "unique"
                      }
                      score={c.duplicateScore}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {c.brand} {c.model} · {c.year} · ฿{c.price.toLocaleString("th-TH")}
                  </p>
                  <ListingStatusBadge
                    variant={
                      c.listingStatus === "hidden" ? "hidden" : "published"
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    type="button"
                    title="ดูในตลาด"
                    onClick={() => {
                      setFilters({ search: c.title });
                      setView("marketplace");
                    }}
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-orange-400"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      hideDealerInventory(
                        apiHeaders,
                        c.id,
                        c.listingStatus !== "hidden"
                      ).then(load)
                    }
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-slate-700 text-slate-400"
                  >
                    {c.listingStatus === "hidden" ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(c.id);
                      setForm(c);
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 font-semibold"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("ลบรถคันนี้?")) {
                        deleteDealerInventory(apiHeaders, c.id).then(load);
                      }
                    }}
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-red-500/30 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {editingId === c.id && (
                <div className="mt-3 grid sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                  {(["price", "year", "mileage"] as const).map((key) => (
                    <label key={key} className="text-[11px]">
                      <span className="text-slate-500">
                        {key === "price"
                          ? "ราคา"
                          : key === "year"
                            ? "ปีรถ"
                            : "เลขไมล์"}
                      </span>
                      <input
                        className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                        value={String(form[key] ?? "")}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [key]: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </label>
                  ))}
                  <div className="sm:col-span-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        patchDealerInventory(apiHeaders, c.id, form).then(() => {
                          setEditingId(null);
                          load();
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
