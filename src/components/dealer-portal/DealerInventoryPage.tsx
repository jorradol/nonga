import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Search,
  EyeOff,
  Eye,
  Trash2,
  ExternalLink,
  Car,
  ArrowLeft,
} from "lucide-react";
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
import { DeleteDraftConfirmModal } from "./DeleteDraftConfirmModal";
import {
  buildListingImagesForSave,
  createDraftImageEditState,
  DealerDraftImageSection,
  focusDraftImageSection,
  revokeDraftImageEditState,
  type DraftImageEditState,
} from "./DealerDraftImageSection";

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
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [imageEdit, setImageEdit] = useState<DraftImageEditState | null>(null);
  const [imageEditDirty, setImageEditDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageSectionRef = useRef<HTMLDivElement>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

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

  const closeEdit = () => {
    if (imageEdit) revokeDraftImageEditState(imageEdit);
    setEditingId(null);
    setImageEdit(null);
    setImageEditDirty(false);
    setUploadingImages(false);
  };

  const openEdit = (c: DealerInventoryCar, focusImages = false) => {
    if (imageEdit && editingId !== c.id) revokeDraftImageEditState(imageEdit);
    setEditingId(c.id);
    setForm({
      brand: c.brand,
      model: c.model,
      year: c.year,
      price: c.price,
      mileage: c.mileage,
    });
    setImageEdit(createDraftImageEditState(c.images));
    setImageEditDirty(false);
    setDeleteError(null);
    if (focusImages) {
      requestAnimationFrame(() => focusDraftImageSection(imageSectionRef));
    }
  };

  const saveCar = async (c: DealerInventoryCar) => {
    setSaving(true);
    setUploadingImages(false);
    setError(null);
    setSaveSuccess(null);
    try {
      const patch: Record<string, unknown> = {
        brand: String(form.brand ?? c.brand),
        model: String(form.model ?? c.model),
        year: Number(form.year ?? c.year),
        price: Number(form.price ?? c.price),
        mileage: Number(form.mileage ?? c.mileage),
      };
      if (imageEditDirty && imageEdit) {
        setUploadingImages(true);
        patch.images = await buildListingImagesForSave(
          apiHeaders,
          c.id,
          "inventory",
          imageEdit
        );
        setUploadingImages(false);
      }
      await patchDealerInventory(apiHeaders, c.id, patch);
      if (imageEdit) revokeDraftImageEditState(imageEdit);
      setEditingId(null);
      setImageEdit(null);
      setImageEditDirty(false);
      setSaveSuccess("บันทึกประกาศเรียบร้อยแล้วครับ");
      await load();
    } catch (e) {
      logTechnicalError("DealerInventoryPage.save", e);
      setError(
        toUserFacingError(e, "บันทึกประกาศไม่สำเร็จครับ กรุณาลองใหม่อีกครั้ง")
      );
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDealerInventory(apiHeaders, deleteConfirmId);
      if (editingId === deleteConfirmId) closeEdit();
      setDeleteConfirmId(null);
      setSaveSuccess("ลบประกาศเรียบร้อยแล้วครับ");
      await load();
    } catch (e) {
      logTechnicalError("DealerInventoryPage.delete", e);
      setDeleteError(
        toUserFacingError(e, "ลบประกาศไม่สำเร็จครับ กรุณาลองใหม่อีกครั้ง")
      );
    } finally {
      setDeleting(false);
    }
  };

  const toggleVisibility = async (c: DealerInventoryCar) => {
    const hide = c.listingStatus !== "hidden";
    const label = hide ? "ปิดประกาศ" : "แสดงในตลาด";
    if (
      hide &&
      !confirm(
        "ปิดประกาศนี้จากตลาดรถชั่วคราวใช่ไหมครับ?\nรายการจะไม่แสดงจนกว่าจะเปิดอีกครั้ง"
      )
    ) {
      return;
    }
    try {
      await hideDealerInventory(apiHeaders, c.id, hide);
      setSaveSuccess(`${label}เรียบร้อยแล้วครับ`);
      await load();
    } catch (e) {
      logTechnicalError("DealerInventoryPage.visibility", e);
      setError(toUserFacingError(e, "อัปเดตสถานะไม่สำเร็จครับ"));
    }
  };

  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800"
    : "bg-white border-slate-200";

  const fieldLabels: Record<string, string> = {
    brand: "ยี่ห้อ",
    model: "รุ่น",
    year: "ปีรถ",
    price: "ราคา",
    mileage: "เลขไมล์",
  };

  return (
    <div className="space-y-4">
      <DeleteDraftConfirmModal
        open={!!deleteConfirmId}
        deleting={deleting}
        draftTitle={cars.find((c) => c.id === deleteConfirmId)?.title}
        onClose={() => {
          if (!deleting) setDeleteConfirmId(null);
        }}
        onConfirm={() => void confirmDelete()}
      />

      <h1 className="text-xl sm:text-2xl font-bold">รถที่ลงขายแล้ว</h1>
      <p className="text-xs text-slate-400">
        รายการที่แสดงในตลาดรถ — แก้ไขข้อมูลและรูปภาพได้จากหน้านี้
      </p>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm">
          {saveSuccess}
        </div>
      )}
      {deleteError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          {deleteError}
        </div>
      )}

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
            <div
              key={c.id}
              id={`dealer-inventory-card-${c.id}`}
              className={`rounded-xl border p-4 ${panel} ${
                editingId === c.id
                  ? "border-orange-500/60 ring-1 ring-orange-500/30"
                  : ""
              }`}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0 flex-1">
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
                    {c.brand} {c.model} · {c.year} · ฿
                    {c.price.toLocaleString("th-TH")}
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
                  {editingId !== c.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => void toggleVisibility(c)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-slate-700 text-slate-400"
                        title={
                          c.listingStatus === "hidden"
                            ? "แสดงในตลาด"
                            : "ปิดประกาศ"
                        }
                      >
                        {c.listingStatus === "hidden" ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 font-semibold"
                      >
                        แก้ไข
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === c.id && imageEdit && (
                <div className="mt-3 grid sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                  {(["brand", "model", "year", "price", "mileage"] as const).map(
                    (key) => (
                      <label key={key} className="text-[11px]">
                        <span className="text-slate-500">
                          {fieldLabels[key] ?? key}
                        </span>
                        <input
                          className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                          value={String(form[key] ?? "")}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              [key]:
                                key === "year" ||
                                key === "price" ||
                                key === "mileage"
                                  ? Number(e.target.value) || 0
                                  : e.target.value,
                            }))
                          }
                          disabled={saving || deleting}
                        />
                      </label>
                    )
                  )}
                  <DealerDraftImageSection
                    draftId={c.id}
                    apiHeaders={apiHeaders}
                    state={imageEdit}
                    imageTarget="inventory"
                    uploading={uploadingImages}
                    sectionRef={imageSectionRef}
                    onChange={(next) => {
                      setImageEdit(next);
                      setImageEditDirty(true);
                    }}
                  />
                  <div className="sm:col-span-2 pt-2 mt-1 border-t border-slate-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center order-2 sm:order-1">
                        <button
                          type="button"
                          disabled={saving || deleting}
                          onClick={() => void toggleVisibility(c)}
                          className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-500/40 text-amber-200 text-xs font-semibold hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          {c.listingStatus === "hidden"
                            ? "แสดงในตลาด"
                            : "ปิดประกาศ"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters({ search: c.title });
                            setView("marketplace");
                          }}
                          className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-xs hover:bg-slate-800/60 hover:text-orange-300"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          ดูในตลาดรถ
                        </button>
                        <button
                          type="button"
                          disabled={saving || deleting}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteConfirmId(c.id);
                          }}
                          className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 text-xs font-bold disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          ลบประกาศ
                        </button>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center order-1 sm:order-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          disabled={saving || deleting}
                          onClick={closeEdit}
                          className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-xs font-semibold hover:bg-slate-800/60 disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={saving || deleting || uploadingImages}
                          onClick={() => void saveCar(c)}
                          className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50 shadow-sm"
                        >
                          {saving
                            ? uploadingImages
                              ? "กำลังอัปโหลดรูป…"
                              : "กำลังบันทึก…"
                            : "บันทึกประกาศ"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", "/dealer");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        }}
        className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-orange-400"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        กลับแดชบอร์ดเต็นท์
      </button>
    </div>
  );
}
