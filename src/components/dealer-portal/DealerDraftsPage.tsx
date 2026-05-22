import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import type { DealerApiHeaders, DealerDraftRecord } from "../../services/dealer/dealerApi";
import { DuplicateBadge } from "../duplicate/DuplicateBadge";
import {
  fetchDealerDrafts,
  patchDealerDraft,
  publishDealerDraft,
  PublishDraftBlockedError,
} from "../../services/dealer/dealerApi";
import { validateDraftForPublish } from "../../utils/dealerPublishGuard";
import { PublishBlockedModal } from "./PublishBlockedModal";

interface Props {
  apiHeaders: DealerApiHeaders;
  onPublished?: () => void;
}

export function DealerDraftsPage({ apiHeaders, onPublished }: Props) {
  const [drafts, setDrafts] = useState<DealerDraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [publishError, setPublishError] = useState<string | null>(null);
  const [blockedLabels, setBlockedLabels] = useState<string[]>([]);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedEditId, setBlockedEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDrafts(await fetchDealerDrafts(apiHeaders));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [apiHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const showBlocked = (labels: string[], editId?: string) => {
    setBlockedLabels(labels);
    setBlockedEditId(editId ?? null);
    setBlockedOpen(true);
  };

  const tryPublish = async (id: string) => {
    setPublishError(null);
    const draft = drafts.find((d) => d.id === id);
    if (draft) {
      const guard = validateDraftForPublish({
        id: draft.id,
        brand: draft.brand,
        model: draft.model,
        price: draft.price,
        images: draft.images,
      });
      if (!guard.ok) {
        showBlocked(guard.missingLabelsThai, id);
        return;
      }
    }
    try {
      await publishDealerDraft(apiHeaders, id);
      await load();
      onPublished?.();
    } catch (e) {
      if (e instanceof PublishDraftBlockedError) {
        showBlocked(
          e.missingLabelsThai.length
            ? e.missingLabelsThai
            : e.missingFields.map((f) => f),
          id
        );
        return;
      }
      setPublishError(e instanceof Error ? e.message : "Publish ล้มเหลว");
    }
  };

  return (
    <div className="space-y-4">
      <PublishBlockedModal
        open={blockedOpen}
        missingLabelsThai={blockedLabels}
        onClose={() => {
          setBlockedOpen(false);
          setBlockedEditId(null);
        }}
        onEdit={() => {
          if (blockedEditId) setEditingId(blockedEditId);
        }}
      />
      <h1 className="text-xl font-bold">Draft / รอเติมข้อมูล</h1>
      <p className="text-xs text-slate-400">
        ต้องมีรูปจริง ยี่ห้อ รุ่น และราคาก่อน Publish — ระบบจะแจ้งรายการที่ขาด
      </p>

      {publishError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {publishError}
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto" />
      ) : drafts.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">ไม่มี Draft</p>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm">{d.title}</h3>
                    <DuplicateBadge
                      status={
                        (d.duplicateStatus as
                          | "unique"
                          | "possible_duplicate"
                          | "duplicate_confirmed"
                          | "merged") ?? "unique"
                      }
                      score={d.duplicateScore}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    คะแนน {d.confidenceScore}% · {d.status}
                  </p>
                  {d.missingFields.length > 0 && (
                    <p className="text-[10px] text-amber-400 mt-1">
                      ขาด: {d.missingFields.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(d.id);
                      setForm({
                        brand: d.brand,
                        model: d.model,
                        year: d.year,
                        price: d.price,
                        mileage: d.mileage,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => tryPublish(d.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Publish
                  </button>
                </div>
              </div>

              {editingId === d.id && (
                <div className="mt-3 grid sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                  {(["brand", "model", "year", "price", "mileage"] as const).map(
                    (key) => (
                      <label key={key} className="text-[11px]">
                        <span className="text-slate-500">{key}</span>
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
                    )
                  )}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() =>
                        patchDealerDraft(apiHeaders, d.id, form).then(() => {
                          setEditingId(null);
                          load();
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold"
                    >
                      บันทึก Draft
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
