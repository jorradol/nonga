import React, { useCallback, useRef, useState } from "react";
import { Star, Trash2, Upload } from "lucide-react";
import type { DealerApiHeaders } from "../../services/dealer/dealerApi";
import {
  canAddDraftImages,
  countDraftEditImages,
  DRAFT_MAX_IMAGES,
  mergeUploadedPendingUrls,
  orderDraftImagesWithPrimary,
  resolveDraftPrimaryUrl,
} from "../../utils/dealer/dealerDraftImageEdit";
import {
  createQueuedUpload,
  fileToPasteUploadPayload,
  isAllowedPasteUploadFile,
  PASTE_UPLOAD_HELP_TEXT,
  revokeQueuedUploadPreview,
  type PasteQueuedUpload,
} from "../../utils/inventoryImport/pasteUploadedImageQueue";
import { uploadDraftImagesApi } from "../../services/dealer/dealerDraftImageApi";

export type DraftImagePrimaryKey = `stored:${string}` | `pending:${string}`;

export interface DraftImageEditState {
  storedUrls: string[];
  pendingUploads: PasteQueuedUpload[];
  primaryKey: DraftImagePrimaryKey | null;
}

export function createDraftImageEditState(
  images: string[] | undefined
): DraftImageEditState {
  const storedUrls = [...(images ?? [])];
  const primaryKey: DraftImagePrimaryKey | null = storedUrls[0]
    ? `stored:${storedUrls[0]}`
    : null;
  return { storedUrls, pendingUploads: [], primaryKey };
}

export function revokeDraftImageEditState(state: DraftImageEditState): void {
  for (const p of state.pendingUploads) revokeQueuedUploadPreview(p);
}

export async function buildDraftImagesForSave(
  apiHeaders: DealerApiHeaders,
  draftId: string,
  state: DraftImageEditState
): Promise<string[]> {
  let storedUrls = [...state.storedUrls];
  let pendingIdToUrl = new Map<string, string>();

  if (state.pendingUploads.length > 0) {
    const payloads = await Promise.all(
      state.pendingUploads.map((p) => fileToPasteUploadPayload(p.file))
    );
    const result = await uploadDraftImagesApi(apiHeaders, draftId, payloads);
    const merged = mergeUploadedPendingUrls(
      storedUrls,
      state.pendingUploads,
      result.storedUrls
    );
    storedUrls = merged.urls;
    pendingIdToUrl = merged.pendingIdToUrl;
  }

  let primaryUrl: string | undefined;
  if (state.primaryKey?.startsWith("stored:")) {
    primaryUrl = state.primaryKey.slice(7);
  } else if (state.primaryKey?.startsWith("pending:")) {
    primaryUrl = resolveDraftPrimaryUrl(
      storedUrls,
      null,
      state.primaryKey.slice(8),
      pendingIdToUrl
    );
  } else {
    primaryUrl = resolveDraftPrimaryUrl(storedUrls, null, null, pendingIdToUrl);
  }

  return orderDraftImagesWithPrimary(storedUrls, primaryUrl);
}

interface Props {
  draftId: string;
  apiHeaders: DealerApiHeaders;
  state: DraftImageEditState;
  onChange: (state: DraftImageEditState) => void;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

function isPrimary(
  key: DraftImagePrimaryKey,
  state: DraftImageEditState
): boolean {
  return state.primaryKey === key;
}

function pickPrimaryAfterRemoval(
  storedUrls: string[],
  pendingUploads: PasteQueuedUpload[],
  removedKey: DraftImagePrimaryKey | null,
  current: DraftImagePrimaryKey | null
): DraftImagePrimaryKey | null {
  if (removedKey && current === removedKey) {
    if (storedUrls[0]) return `stored:${storedUrls[0]}`;
    if (pendingUploads[0]) return `pending:${pendingUploads[0].id}`;
    return null;
  }
  if (current?.startsWith("stored:")) {
    const url = current.slice(7);
    if (!storedUrls.includes(url)) {
      if (storedUrls[0]) return `stored:${storedUrls[0]}`;
      if (pendingUploads[0]) return `pending:${pendingUploads[0].id}`;
      return null;
    }
  }
  if (current?.startsWith("pending:")) {
    const id = current.slice(8);
    if (!pendingUploads.some((p) => p.id === id)) {
      if (storedUrls[0]) return `stored:${storedUrls[0]}`;
      if (pendingUploads[0]) return `pending:${pendingUploads[0].id}`;
      return null;
    }
  }
  if (!current && storedUrls[0]) return `stored:${storedUrls[0]}`;
  return current;
}

export function DealerDraftImageSection({
  draftId: _draftId,
  apiHeaders: _apiHeaders,
  state,
  onChange,
  sectionRef,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const total = countDraftEditImages(state.storedUrls, state.pendingUploads);
  const hasImages = total > 0;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setLocalError(null);
      const list = Array.from(files);
      if (list.length === 0) return;

      if (!canAddDraftImages(state.storedUrls, state.pendingUploads, list.length)) {
        setLocalError(`เพิ่มได้ไม่เกิน ${DRAFT_MAX_IMAGES} รูปต่อคัน`);
        return;
      }

      const nextPending = [...state.pendingUploads];
      let primaryKey = state.primaryKey;
      let added = 0;

      for (const file of list) {
        if (!canAddDraftImages(state.storedUrls, nextPending, 1)) {
          setLocalError(`เพิ่มได้ไม่เกิน ${DRAFT_MAX_IMAGES} รูปต่อคัน`);
          break;
        }
        const err = isAllowedPasteUploadFile(file);
        if (err) {
          setLocalError(err);
          continue;
        }
        const queued = createQueuedUpload(file);
        nextPending.push(queued);
        if (!primaryKey) primaryKey = `pending:${queued.id}`;
        added += 1;
      }

      if (added > 0) {
        onChange({
          storedUrls: state.storedUrls,
          pendingUploads: nextPending,
          primaryKey,
        });
        showToast("เพิ่มรูปภาพแล้ว อย่าลืมกดบันทึก");
      }
    },
    [onChange, state]
  );

  const removeStored = (url: string) => {
    const key: DraftImagePrimaryKey = `stored:${url}`;
    const storedUrls = state.storedUrls.filter((u) => u !== url);
    const primaryKey = pickPrimaryAfterRemoval(
      storedUrls,
      state.pendingUploads,
      key,
      state.primaryKey
    );
    onChange({ ...state, storedUrls, primaryKey });
  };

  const removePending = (id: string) => {
    const item = state.pendingUploads.find((p) => p.id === id);
    if (item) revokeQueuedUploadPreview(item);
    const key: DraftImagePrimaryKey = `pending:${id}`;
    const pendingUploads = state.pendingUploads.filter((p) => p.id !== id);
    const primaryKey = pickPrimaryAfterRemoval(
      state.storedUrls,
      pendingUploads,
      key,
      state.primaryKey
    );
    onChange({ ...state, pendingUploads, primaryKey });
  };

  return (
    <div
      ref={sectionRef}
      tabIndex={-1}
      id="draft-images-section"
      className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-3 outline-none"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-bold text-slate-200">รูปภาพประกาศ</h4>
        <span className="text-[10px] text-slate-500">
          {total}/{DRAFT_MAX_IMAGES} รูป
        </span>
      </div>

      <p className="text-[10px] text-slate-500">{PASTE_UPLOAD_HELP_TEXT}</p>

      {!hasImages && (
        <p className="text-[11px] text-amber-300/95 flex items-start gap-1.5">
          <Upload className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ยังไม่มีรูปภาพสินค้า กรุณาเพิ่มรูปอย่างน้อย 1 รูปก่อนเผยแพร่
        </p>
      )}

      <p className="text-[10px] text-slate-500">
        เพิ่มรูปภาพรถอย่างน้อย 1 รูป เพื่อให้ประกาศพร้อมเผยแพร่
      </p>

      {(localError || toast) && (
        <p
          className={`text-[11px] ${
            localError ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {localError ?? toast}
        </p>
      )}

      <div
        className={`grid grid-cols-3 sm:grid-cols-4 gap-2 ${
          dragOver ? "ring-2 ring-orange-500/50 rounded-lg p-1" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        {state.storedUrls.map((url) => {
          const key: DraftImagePrimaryKey = `stored:${url}`;
          const primary = isPrimary(key, state);
          return (
            <div
              key={url}
              className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-700 bg-slate-950"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {primary && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-orange-600 text-[9px] text-white font-bold flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  หลัก
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 flex gap-0.5 p-1 bg-black/60">
                {!primary && (
                  <button
                    type="button"
                    title="ตั้งเป็นรูปหลัก"
                    onClick={() => onChange({ ...state, primaryKey: key })}
                    className="flex-1 py-0.5 rounded bg-slate-800 text-[9px] text-slate-200"
                  >
                    หลัก
                  </button>
                )}
                <button
                  type="button"
                  title="ลบรูป"
                  onClick={() => removeStored(url)}
                  className="px-1.5 py-0.5 rounded bg-red-900/80 text-red-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {state.pendingUploads.map((p) => {
          const key: DraftImagePrimaryKey = `pending:${p.id}`;
          const primary = isPrimary(key, state);
          return (
            <div
              key={p.id}
              className="relative aspect-[4/3] rounded-lg overflow-hidden border border-dashed border-orange-500/40 bg-slate-950"
            >
              <img
                src={p.previewUrl}
                alt={p.name}
                className="w-full h-full object-cover opacity-90"
              />
              <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-slate-900/90 text-[8px] text-orange-300">
                ใหม่
              </span>
              {primary && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-orange-600 text-[9px] text-white font-bold flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />
                  หลัก
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 flex gap-0.5 p-1 bg-black/60">
                {!primary && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...state, primaryKey: key })}
                    className="flex-1 py-0.5 rounded bg-slate-800 text-[9px] text-slate-200"
                  >
                    หลัก
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePending(p.id)}
                  className="px-1.5 py-0.5 rounded bg-red-900/80 text-red-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={total >= DRAFT_MAX_IMAGES}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-40"
      >
        <Upload className="w-3.5 h-3.5" />
        เพิ่มรูปจากเครื่อง
      </button>
    </div>
  );
}

export function focusDraftImageSection(
  ref: React.RefObject<HTMLDivElement | null>
): void {
  ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  ref.current?.focus();
}
