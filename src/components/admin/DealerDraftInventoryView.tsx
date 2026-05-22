import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  FileEdit,
  Loader2,
  RefreshCw,
  Send,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "../../store";
import { DuplicateReviewSection } from "../duplicate/DuplicateReviewSection";
import { adminAuthHeaders } from "../../utils/apiAuthHeaders";
import { normalizeDealerId } from "../../utils/dealerIdentity";

interface DraftRecord {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  description: string;
  images: string[];
  missingFields: string[];
  warnings: string[];
  confidenceScore: number;
  status: "draft" | "needs_review";
  ownerName: string;
  phone: string;
  showroomName?: string;
}

export default function DealerDraftInventoryView() {
  const { setView, isDarkMode, fetchCars, user } = useAppStore();
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<DraftRecord>>({});
  const [publishing, setPublishing] = useState(false);

  const dealerId = normalizeDealerId(user?.dealerId ?? user?.uid ?? "thor-auto");

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/draft-inventory?dealerId=${encodeURIComponent(dealerId)}`,
        { headers: adminAuthHeaders() }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "โหลดไม่สำเร็จ");
      setDrafts(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลด draft ล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const startEdit = (d: DraftRecord) => {
    setEditingId(d.id);
    setForm({ ...d });
  };

  const saveDraft = async () => {
    if (!editingId) return;
    const res = await fetch(`/api/admin/draft-inventory/${editingId}`, {
      method: "PATCH",
      headers: adminAuthHeaders(),
      body: JSON.stringify({
        brand: form.brand,
        model: form.model,
        year: form.year,
        price: form.price,
        mileage: form.mileage,
        fuelType: form.fuelType,
        description: form.description,
        title: form.title,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message ?? "บันทึกไม่สำเร็จ");
    setEditingId(null);
    await loadDrafts();
  };

  const publishDraft = async (id: string) => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/draft-inventory/${id}/publish`, {
        method: "POST",
        headers: adminAuthHeaders(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "เผยแพร่ไม่สำเร็จ");
      setEditingId(null);
      await loadDrafts();
      await fetchCars();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เผยแพร่ล้มเหลว");
    } finally {
      setPublishing(false);
    }
  };

  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800 text-white"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 text-left">
      <button
        type="button"
        onClick={() => setView("admin-dashboard")}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        กลับแผง Admin
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold uppercase mb-2">
            <FileEdit className="w-3.5 h-3.5" />
            Draft Inventory
          </div>
          <h1 className="text-2xl font-display font-bold">คลังรถรอแก้ไข</h1>
          <p className="text-sm text-slate-400 mt-1">
            รถที่นำเข้าแล้วแต่ยังไม่แสดงในตลาด — เติมข้อมูลแล้วกด Publish
          </p>
        </div>
        <button
          type="button"
          onClick={loadDrafts}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        </div>
      ) : drafts.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${panel}`}>
          <p className="text-slate-400 text-sm">ไม่มีรถ Draft — นำเข้าจาก Smart Import</p>
          <button
            type="button"
            onClick={() => setView("inventory-import")}
            className="mt-4 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
          >
            ไปหน้านำเข้า
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border p-4 ${panel}`}
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm">{d.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {d.brand} {d.model} · คะแนน {d.confidenceScore}% ·{" "}
                    <span
                      className={
                        d.status === "needs_review"
                          ? "text-orange-400"
                          : "text-amber-400"
                      }
                    >
                      {d.status}
                    </span>
                  </p>
                  {d.missingFields.length > 0 && (
                    <p className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      ขาด: {d.missingFields.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(d)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    disabled={publishing}
                    onClick={() => publishDraft(d.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Publish
                  </button>
                </div>
              </div>

              {editingId === d.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 grid sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800"
                >
                  {(
                    [
                      ["brand", "ยี่ห้อ"],
                      ["model", "รุ่น"],
                      ["year", "ปี"],
                      ["price", "ราคา"],
                      ["mileage", "ไมล์"],
                      ["fuelType", "เชื้อเพลิง"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-[11px]">
                      <span className="text-slate-500">{label}</span>
                      <input
                        className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                        value={String(form[key] ?? "")}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [key]:
                              key === "year" || key === "price" || key === "mileage"
                                ? Number(e.target.value) || 0
                                : e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                  <label className="text-[11px] sm:col-span-2">
                    <span className="text-slate-500">รายละเอียด</span>
                    <textarea
                      className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm min-h-[60px]"
                      value={form.description ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </label>
                  <div className="sm:col-span-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveDraft().catch((e) => setError(String(e)))}
                      className="px-4 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold"
                    >
                      บันทึก Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </motion.div>
              )}

              {d.images?.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {d.images.slice(0, 4).map((img) => (
                    <img
                      key={img}
                      src={img}
                      alt=""
                      className="w-16 h-12 object-cover rounded-lg border border-slate-800"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-2xl border p-6 mt-8 ${panel}`}>
        <DuplicateReviewSection apiBase="admin" />
      </div>
    </div>
  );
}
