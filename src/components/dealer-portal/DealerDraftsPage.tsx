import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store";
import { Loader2, Send, AlertTriangle, ImagePlus, Trash2, FileEdit } from "lucide-react";
import { EmptyState } from "../shared/EmptyState";
import {
  ListingStatusBadge,
  draftRecordStatusVariant,
} from "../shared/ListingStatusBadge";
import { logTechnicalError, toUserFacingError } from "../../utils/userFacingErrors";
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
    year: d.year,
    price: d.price,
    mileage: d.mileage,
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
  const { setView } = useAppStore();
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
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const scrollToStatus = () => {
    requestAnimationFrame(() => {
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDrafts(await fetchDealerDrafts(apiHeaders));
    } catch (e) {
      logTechnicalError("DealerDraftsPage.load", e);
      setError(toUserFacingError(e, "โหลดรายการประกาศไม่สำเร็จครับ"));
    } finally {
      setLoading(false);
    }
  }, [apiHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onDraftSaved = (event: Event) => {
      const draftId =
        event instanceof CustomEvent && typeof event.detail?.draftId === "string"
          ? event.detail.draftId
          : null;
      void load().then(() => {
        if (draftId) {
          requestAnimationFrame(() => {
            document
              .getElementById(`dealer-draft-card-${draftId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        }
      });
    };
    window.addEventListener("nonga-dealer-draft-saved", onDraftSaved);
    return () => window.removeEventListener("nonga-dealer-draft-saved", onDraftSaved);
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
    setSaveSuccess(null);
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
      logTechnicalError("DealerDraftsPage.publish", e);
      setPublishError(toUserFacingError(e, "ลงขายไม่สำเร็จครับ รบกวนลองใหม่อีกครั้ง"));
      scrollToStatus();
    }
  };

  const confirmDeleteDraft = async () => {
    if (!deleteConfirmId || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    setSaveSuccess(null);
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
      scrollToStatus();
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
      scrollToStatus();
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
    setSaveSuccess(null);
    setDeleteSuccess(null);
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
      setSaveSuccess("บันทึกประกาศเรียบร้อยแล้วครับ");
      scrollToStatus();
    } catch (e) {
      logTechnicalError("DealerDraftsPage.save", e);
      setError(toUserFacingError(e, "บันทึกประกาศไม่สำเร็จครับ"));
      scrollToStatus();
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
      <h1 className="text-xl sm:text-2xl font-bold">ประกาศที่ยังไม่ลงขาย</h1>
      <p className="text-xs sm:text-sm text-slate-400">
        เติมรูป ยี่ห้อ รุ่น ราคา และปีรถให้ครบก่อนกดลงขาย — ระบบจะบอกว่ายังขาดอะไร
      </p>

      <div ref={statusRef} className="scroll-mt-24 space-y-2">
        {(saveSuccess || deleteSuccess) && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm">
            {saveSuccess || deleteSuccess}
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
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto" />
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={FileEdit}
          title="ยังไม่มีประกาศที่บันทึกไว้"
          description="คุยกับน้องเอเพื่อสร้างประกาศจากข้อความ หรือนำเข้ารายการรถจากเมนูนำเข้า แล้วกลับมาแก้ไขและลงขายที่นี่"
          actionLabel="ไปคุยกับน้องเอ"
          onAction={() => setView("chat")}
        />
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => {
            const publishCheck = draftPublishCheck(d);
            const missingImage = publishCheck.missingLabelsThai.includes(
              "ขาดรูปภาพสินค้า"
            );
            const statusVariant = draftRecordStatusVariant(
              d.status,
              publishCheck.ok,
              missingImage
            );
            const fieldLabels: Record<string, string> = {
              brand: "ยี่ห้อ",
              model: "รุ่น",
              year: "ปีรถ",
              price: "ราคา",
              mileage: "เลขไมล์",
            };
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
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm">{d.title}</h3>
                    <ListingStatusBadge variant={statusVariant} />
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
                    ความมั่นใจของข้อมูล {d.confidenceScore}%
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
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 text-xs text-slate-300 font-semibold"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => tryPublish(d.id)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold"
                  >
                    <Send className="w-4 h-4" />
                    ลงขาย
                  </button>
                </div>
              </div>

              {editingId === d.id && imageEdit && (
                <div className="mt-3 grid sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                  {(["brand", "model", "year", "price", "mileage"] as const).map(
                    (key) => (
                      <label key={key} className="text-[11px]">
                        <span className="text-slate-500">{fieldLabels[key] ?? key}</span>
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
                        className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {saving ? "กำลังบันทึก…" : "บันทึกประกาศ"}
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={closeEdit}
                        className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-xs disabled:opacity-50"
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
                      className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 text-xs font-bold disabled:opacity-50 w-full sm:w-auto justify-center"
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
