import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  X,
  Loader2,
  Check,
  ImagePlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import type { Car } from "../../types";
import type { MyListingPatch } from "../../services/listings/myListingsApi";
import { resolveListingImagesForSave } from "../../services/listings/myListingsApi";
import {
  isRemoteImageUrl,
} from "../../utils/listingImageStorage";
import { useNotifyStore } from "../../stores/notifyStore";
import ListingDescription from "./ListingDescription";

export interface EditListingFormState {
  title: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  fuelType: Car["fuelType"];
  gear: string;
  color: string;
  description: string;
}

type GalleryItem =
  | { id: string; kind: "saved"; preview: string; url: string }
  | { id: string; kind: "pending"; preview: string; file: File };

function carToForm(car: Car): EditListingFormState {
  return {
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    price: car.price,
    fuelType: car.fuelType,
    gear: String(car.transmission ?? ""),
    color: car.color ?? "",
    description: car.description,
  };
}

function initGallery(car: Car): GalleryItem[] {
  return (car.images ?? []).map((url, i) => ({
    id: `saved-${i}-${url.slice(-8)}`,
    kind: "saved" as const,
    preview: url,
    url,
  }));
}

interface Props {
  car: Car;
  ownerId: string;
  isDarkMode: boolean;
  onClose: () => void;
  onSave: (patch: MyListingPatch) => Promise<void>;
}

export default function EditListingModal({
  car,
  ownerId,
  isDarkMode,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<EditListingFormState>(() => carToForm(car));
  const [gallery, setGallery] = useState<GalleryItem[]>(() => initGallery(car));
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const notifyFriendlyError = useNotifyStore((s) => s.notifyFriendlyError);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      gallery.forEach((item) => {
        if (item.kind === "pending") URL.revokeObjectURL(item.preview);
      });
    };
  }, [gallery]);

  const panel = isDarkMode
    ? "bg-slate-950 border-slate-800 text-white"
    : "bg-white border-slate-200 text-slate-900";

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDarkMode
      ? "bg-slate-900 border-slate-700"
      : "bg-slate-50 border-slate-200"
  }`;

  const set = (partial: Partial<EditListingFormState>) =>
    setForm((f) => ({ ...f, ...partial }));

  const addImageUrl = () => {
    const url = urlInput.trim();
    if (!isRemoteImageUrl(url)) {
      setFormError("ใส่ URL รูปแบบ https:// เท่านั้นนะคะ");
      return;
    }
    setGallery((g) => [
      ...g,
      { id: `saved-url-${Date.now()}`, kind: "saved", preview: url, url },
    ]);
    setUrlInput("");
    setFormError(null);
  };

  const onFilePick = (files: FileList | null) => {
    if (!files?.length) return;
    setFormError(null);
    const added: GalleryItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      added.push({
        id: `pending-${Date.now()}-${i}`,
        kind: "pending",
        preview: URL.createObjectURL(file),
        file,
      });
    }
    if (added.length === 0) {
      setFormError("เลือกไฟล์รูปภาพเท่านั้นนะคะ (JPEG, PNG, WebP)");
      return;
    }
    setGallery((g) => [...g, ...added].slice(0, 12));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setGallery((g) => {
      const item = g[index];
      if (item?.kind === "pending") URL.revokeObjectURL(item.preview);
      return g.filter((_, i) => i !== index);
    });
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= gallery.length) return;
    setGallery((g) => {
      const next = [...g];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccess(false);
    try {
      const keptUrls = gallery
        .filter((item): item is GalleryItem & { kind: "saved" } => item.kind === "saved")
        .map((item) => item.url);
      const pendingFiles = gallery
        .filter((item): item is GalleryItem & { kind: "pending" } => item.kind === "pending")
        .map((item) => item.file);

      const images = await resolveListingImagesForSave(
        ownerId,
        car.id,
        keptUrls,
        pendingFiles
      );

      await onSave({
        title: form.title.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year,
        mileage: form.mileage,
        price: form.price,
        fuelType: form.fuelType,
        gear: form.gear.trim(),
        color: form.color.trim(),
        description: form.description.trim(),
        images,
      });
      setSuccess(true);
      setTimeout(onClose, 600);
    } catch (err) {
      const friendly = notifyFriendlyError(err, "บันทึกประกาศ");
      setFormError(friendly.friendlyMessage.split("\n")[0]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-listing-title"
    >
      <div
        className={`w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl ${panel}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-inherit">
          <h2 id="edit-listing-title" className="font-bold text-base">
            แก้ไขประกาศ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800/50"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs space-y-1 sm:col-span-2">
              <span className="text-slate-500">ชื่อประกาศ</span>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                required
              />
            </label>
            {(
              [
                ["brand", "ยี่ห้อ", "text"],
                ["model", "รุ่น", "text"],
                ["year", "ปี", "number"],
                ["price", "ราคา (บาท)", "number"],
                ["mileage", "ไมล์ (กม.)", "number"],
                ["fuelType", "เชื้อเพลิง", "text"],
                ["gear", "เกียร์", "text"],
                ["color", "สี", "text"],
              ] as const
            ).map(([key, label, kind]) => (
              <label key={key} className="text-xs space-y-1">
                <span className="text-slate-500">{label}</span>
                <input
                  className={inputCls}
                  type={kind}
                  value={
                    kind === "number"
                      ? String(form[key as keyof EditListingFormState] ?? "")
                      : String(form[key as keyof EditListingFormState] ?? "")
                  }
                  onChange={(e) =>
                    set({
                      [key]:
                        kind === "number"
                          ? Number(e.target.value) || 0
                          : e.target.value,
                    } as Partial<EditListingFormState>)
                  }
                  required={key === "brand" || key === "model" || key === "price"}
                />
              </label>
            ))}
          </div>

          <label className="text-xs space-y-1 block">
            <span className="text-slate-500">รายละเอียด</span>
            <textarea
              className={`${inputCls} min-h-[100px]`}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>

          {form.description.length > 0 && (
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                ตัวอย่างการแสดงผล
              </span>
              <ListingDescription
                text={form.description}
                variant="preview"
                tone="dark"
              />
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              รูปภาพ ({gallery.length})
              {gallery.some((g) => g.kind === "pending") && (
                <span className="text-orange-400 normal-case ml-1">
                  · มีรูปใหม่รอบันทึก
                </span>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              {gallery.map((item, i) => (
                <div
                  key={item.id}
                  className="relative w-24 h-20 rounded-lg overflow-hidden bg-slate-900 border border-slate-700"
                >
                  <img
                    src={item.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {item.kind === "pending" && (
                    <span className="absolute top-1 left-1 text-[8px] bg-orange-600 text-white px-1 rounded">
                      ใหม่
                    </span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 flex justify-center gap-0.5 p-0.5 bg-black/70">
                    <button
                      type="button"
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      className="p-0.5 text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="p-0.5 text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === gallery.length - 1}
                      className="p-0.5 text-white disabled:opacity-30"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                placeholder="https://... วางลิงก์รูป"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button
                type="button"
                onClick={addImageUrl}
                className="px-3 py-2 rounded-lg border border-slate-600 text-xs flex items-center gap-1"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                เพิ่ม URL
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => onFilePick(e.target.files)}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-orange-500/40 text-orange-400 text-xs"
            >
              <ImagePlus className="w-4 h-4" />
              เลือกรูปจากเครื่อง (บันทึกเมื่อกด Save)
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> บันทึกสำเร็จ
            </p>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-inherit pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังอัปโหลด/บันทึก…
                </>
              ) : (
                "บันทึกการแก้ไข"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
