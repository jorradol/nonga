import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, AlertTriangle, ImagePlus, Trash2 } from "lucide-react";
import type { DealerApiHeaders, DealerDraftRecord } from "../../services/dealer/dealerApi";
import { DuplicateBadge } from "../duplicate/DuplicateBadge";
import {
  fetchDealerDrafts,
  deleteDealerDraft,
  patchDealerDraft,
  publishDealerDraft,
  PublishDraftBlockedError,
} from "../../services/dealer/dealerApi";
import { validateDraftForPublish } from "../../utils/dealerPublishGuard";
import { PublishBlockedModal } from "./PublishBlockedModal";
import { DeleteDraftConfirmModal } from "./DeleteDraftConfirmModal";
import { DEALER_DRAFTS_PATH } from "../../utils/dealer/dealerDraftNavigation";
import {
  buildDraftImagesForSave,
  createDraftImageEditState,
  DealerDraftImageSection,
  focusDraftImageSection,
  revokeDraftImageEditState,
  type DraftImageEditState,
} from "./DealerDraftImageSection";

function draftPublishCheck(d: DealerDraftRecord) {
  return validateDraftForPublish({
    id: d.id,
    brand: d.brand,
    model: d.model,
    price: d.price,
    images: d.images,
  });
}

interface Props {
  apiHeaders: DealerApiHeaders;
  /** จากแชทหรือ deep link ?focus=draft-xxx */
  initialFocusDraftId?: string | null;
  onFocusDraftConsumed?: () => void;
  onPublished?: () => void;
}

export function DealerDraftsPage({
  apiHeaders,
  initialFocusDraftId,
  onFocusDraftConsumed,
  onPublished,
}: Props) {
  const [drafts, setDrafts] = useState<DealerDraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [imageEdit, setImageEdit] = useState<DraftImageEditState | null>(null);
  const [imageEditDirty, setImageEditDirty] = useState(false);
  const [focusImagesOnEdit, setFocusImagesOnEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const imageSectionRef = useRef<HTMLDivElement>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [blockedLabels, setBlockedLabels] = useState<string[]>([]);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedEditId, setBlockedEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    if (editingId && focusImagesOnEdit) {
      focusDraftImageSection(imageSectionRef);
      setFocusImagesOnEdit(false);
    }
  }, [editingId, focusImagesOnEdit]);

  const openEdit = (d: DealerDraftRecord, focusImages = false) => {
    if (imageEdit && editingId !== d.id) revokeDraftImageEditState(imageEdit);
    setEditingId(d.id);
    setForm({
      brand: d.brand,
      model: d.model,
      year: d.year,
      price: d.price,
      mileage: d.mileage,
    });
    setImageEdit(createDraftImageEditState(d.images));
    setImageEditDirty(false);
    if (focusImages) setFocusImagesOnEdit(true);
  };

  useEffect(() => {
    if (!initialFocusDraftId || loading) return;
    const target = drafts.find((d) => d.id === initialFocusDraftId);
    if (!target) return;

    openEdit(target);
    requestAnimationFrame(() => {
      document
        .getElementById(`dealer-draft-card-${target.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", DEALER_DRAFTS_PATH);
    }
    onFocusDraftConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when draft list + focus id ready
  }, [initialFocusDraftId, loading, drafts]);

  const closeEdit = () => {
    if (imageEdit) revokeDraftImageEditState(imageEdit);
    setEditingId(null);
    setImageEdit(null);
    setImageEditDirty(false);
  };

  const showBlocked = (labels: string[], editId?: string) => {
    setBlockedLabels(labels);
    setBlockedEditId(editId ?? null);
    setBlockedOpen(true);
  };

  const tryPublish = async (id: string) => {
    setPublishError(null);
    const draft = drafts.find((d) => d.id === id);
    if (draft) {
      const guard = draftPublishCheck(draft);
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

  const confirmDeleteDraft = async () => {
    if (!deleteConfirmId || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDealerDraft(apiHeaders, deleteConfirmId);
      if (imageEdit && editingId === deleteConfirmId) {
        revokeDraftImageEditState(imageEdit);
        setImageEdit(null);
        setEditingId(null);
      }
      setDrafts((prev) => prev.filter((x) => x.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      setDeleteSuccess("ลบประกาศเรียบร้อยแล้วครับ");
      onFocusDraftConsumed?.();
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", DEALER_DRAFTS_PATH);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "ลบประกาศไม่สำเร็จครับ รบกวนลองใหม่อีกครั้ง";
      setDeleteError(msg);
      try {
        const env = (import.meta as { env?: { DEV?: boolean } }).env;
        if (env?.DEV) console.error("[DealerDraftsPage] delete failed", e);
      } catch {
        // ignore
      }
    } finally {
      setDeleting(false);
    }
  };

  const saveDraft = async (d: DealerDraftRecord) => {
    setSaving(true);
    setError(null);
    try {
      const patch: Record<string, unknown> = {
        brand: String(form.brand ?? d.brand),
        model: String(form.model ?? d.model),
        year: Number(form.year ?? d.year),
        price: Number(form.price ?? d.price),
        mileage: Number(form.mileage ?? d.mileage),
      };
      if (imageEditDirty && imageEdit) {
        patch.images = await buildDraftImagesForSave(apiHeaders, d.id, imageEdit);
      }
      await patchDealerDraft(apiHeaders, d.id, patch);
      if (imageEdit) revokeDraftImageEditState(imageEdit);
      setEditingId(null);
      setImageEdit(null);
      setImageEditDirty(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
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
          if (blockedEditId) {
            const d = drafts.find((x) => x.id === blockedEditId);
            if (d) openEdit(d, blockedLabels.includes("ขาดรูปภาพสินค้า"));
          }
        }}
      />
      <DeleteDraftConfirmModal
        open={!!deleteConfirmId}
        deleting={deleting}
        draftTitle={drafts.find((d) => d.id === deleteConfirmId)?.title}
        onClose={() => {
          if (!deleting) setDeleteConfirmId(null);
        }}
        onConfirm={() => void confirmDeleteDraft()}
      />
      <h1 className="text-xl font-bold">Draft / รอเติมข้อมูล</h1>
      <p className="text-xs text-slate-400">
        ต้องมีรูปจริง ยี่ห้อ รุ่น ราคา และปีรถก่อน Publish — ระบบจะแจ้งรายการที่ขาด
      </p>

      {deleteSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm">
          {deleteSuccess}
        </div>
      )}
      {publishError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {publishError}
        </div>
      )}
      {deleteError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {deleteError}
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto" />
      ) : drafts.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">ไม่มี Draft</p>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => {
            const publishCheck = draftPublishCheck(d);
            const missingImage = publishCheck.missingLabelsThai.includes(
              "ขาดรูปภาพสินค้า"
            );
            return (
            <div
              key={d.id}
              id={`dealer-draft-card-${d.id}`}
              className={`rounded-xl border bg-slate-950/60 p-4 transition ${
                editingId === d.id
                  ? "border-orange-500/60 ring-1 ring-orange-500/30"
                  : "border-slate-800"
              }`}
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
                  {publishCheck.ok ? (
                    <p className="text-[10px] text-emerald-400/90 mt-1.5">
                      ข้อมูลพร้อมเผยแพร่
                    </p>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[10px] text-amber-400/95 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        ยังขาดข้อมูลจำเป็นก่อนเผยแพร่
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {publishCheck.missingLabelsThai.map((label) => (
                          <li
                            key={label}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/25"
                          >
                            {label}
                          </li>
                        ))}
                      </ul>
                      {missingImage && (
                        <button
                          type="button"
                          onClick={() => openEdit(d, true)}
                          className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-500/40 text-[10px] text-orange-200 hover:bg-orange-500/10"
                        >
                          <ImagePlus className="w-3 h-3" />
                          เพิ่มรูปภาพ
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
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

              {editingId === d.id && imageEdit && (
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
                  <DealerDraftImageSection
                    draftId={d.id}
                    apiHeaders={apiHeaders}
                    state={imageEdit}
                    sectionRef={imageSectionRef}
                    onChange={(next) => {
                      setImageEdit(next);
                      setImageEditDirty(true);
                    }}
                  />
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving || deleting}
                        onClick={() => saveDraft(d)}
                        className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {saving ? "กำลังบันทึก…" : "บันทึกประกาศ"}
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={closeEdit}
                        className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-xs disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={saving || deleting}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteConfirmId(d.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 text-xs font-bold disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ลบประกาศ
                    </button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
