import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import type { DealerApiHeaders } from "../../../services/dealer/dealerApi";
import { probePasteImages } from "../../../services/dealer/pasteImageApi";
import {
  driveFolderWarnings,
  extractImageLinkCandidates,
  splitDriveLinks,
  type ImageLinkCandidate,
} from "../../../utils/inventoryImport/imageLinkExtractor";
import {
  DRIVE_PREVIEW_PERMISSION_MESSAGE,
  DRIVE_SHARE_STEPS,
  firstDriveFileLinkForPermission,
  isDrivePermissionProbeStatus,
  PREVIEW_STATUS_LABELS,
} from "../../../utils/inventoryImport/googleDrivePermissionGuidance";
import type { PasteImagePreviewResult } from "../../../utils/inventoryImport/pasteImagePreview";
import type { ParsedPasteVehicle } from "../../../utils/inventoryImport/pasteRawVehicleTypes";
import {
  type PasteImageSelectionState,
  type PasteImagePrimaryKey,
  linkPrimaryKey,
  uploadPrimaryKey,
} from "../../../utils/inventoryImport/pasteImageSelectionState";
import {
  canSelectMore,
  countTotalSelected,
  createQueuedUpload,
  isAllowedPasteUploadFile,
  PASTE_MAX_IMAGES_TOTAL,
  PASTE_UPLOAD_HELP_TEXT,
  PASTE_UPLOAD_STATUS_LABEL,
  revokeQueuedUploadPreview,
  type PasteQueuedUpload,
} from "../../../utils/inventoryImport/pasteUploadedImageQueue";

export type { PasteImageSelectionState };

interface Props {
  parsed: ParsedPasteVehicle;
  imageLinksText: string;
  driveLinksText: string;
  dealerApiHeaders: DealerApiHeaders;
  isDarkMode: boolean;
  onSelectionChange: (state: PasteImageSelectionState) => void;
  onSaveDraftLater?: () => void;
  saveDraftLaterDisabled?: boolean;
  saveDraftLaterLoading?: boolean;
}

function kindLabel(kind: ImageLinkCandidate["kind"]): string {
  if (kind === "direct") return "รูปตรง (direct)";
  if (kind === "drive_file") return "Google Drive (ไฟล์)";
  return "Google Drive";
}

function cardStatusLabel(
  preview: PasteImagePreviewResult | undefined,
  probing: boolean
): string {
  if (probing && !preview) return PREVIEW_STATUS_LABELS.pending;
  if (!preview) return PREVIEW_STATUS_LABELS.pending;
  return PREVIEW_STATUS_LABELS[preview.status];
}

export function PasteImagePreviewSection({
  parsed,
  imageLinksText,
  driveLinksText,
  dealerApiHeaders,
  isDarkMode,
  onSelectionChange,
  onSaveDraftLater,
  saveDraftLaterDisabled = false,
  saveDraftLaterLoading = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const driveLinkLines = useMemo(
    () =>
      driveLinksText
        .split(/[\n\r,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [driveLinksText]
  );

  const candidates = useMemo(
    () =>
      extractImageLinkCandidates(parsed, imageLinksText, driveLinksText),
    [parsed, imageLinksText, driveLinksText]
  );

  const folderWarnings = useMemo(
    () => driveFolderWarnings(driveLinkLines),
    [driveLinkLines]
  );

  const { driveFileLinks } = useMemo(
    () => splitDriveLinks(driveLinkLines),
    [driveLinkLines]
  );

  const [previews, setPreviews] = useState<PasteImagePreviewResult[]>([]);
  const [probing, setProbing] = useState(false);
  const [probeGeneration, setProbeGeneration] = useState(0);
  const [selectedSourceUrls, setSelectedSourceUrls] = useState<Set<string>>(
    () => new Set()
  );
  const [uploads, setUploads] = useState<PasteQueuedUpload[]>([]);
  const [selectedUploadIds, setSelectedUploadIds] = useState<Set<string>>(
    () => new Set()
  );
  const [primaryKey, setPrimaryKey] = useState<PasteImagePrimaryKey | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);

  const totalSelected = countTotalSelected(
    selectedSourceUrls.size,
    selectedUploadIds.size
  );

  const runProbe = useCallback(async () => {
    if (candidates.length === 0) {
      setPreviews([]);
      setProbing(false);
      return;
    }
    setProbing(true);
    try {
      const data = await probePasteImages(dealerApiHeaders, candidates);
      setPreviews(data);
      const okUrls = data
        .filter((p) => p.status === "ok")
        .map((p) => p.sourceUrl);
      setSelectedSourceUrls(new Set(okUrls));
      setPrimaryKey((pk) => pk ?? (okUrls[0] ? linkPrimaryKey(okUrls[0]) : null));
    } catch {
      setPreviews(
        candidates.map((c) => ({
          id: c.id,
          sourceUrl: c.sourceUrl,
          kind: c.kind,
          status:
            c.kind === "drive_file"
              ? ("needs_permission" as const)
              : ("failed" as const),
          error:
            c.kind === "drive_file"
              ? DRIVE_PREVIEW_PERMISSION_MESSAGE
              : "โหลด preview ไม่สำเร็จ",
        }))
      );
    } finally {
      setProbing(false);
    }
  }, [candidates, dealerApiHeaders]);

  useEffect(() => {
    void runProbe();
  }, [runProbe, probeGeneration]);

  const handleRetryProbe = () => setProbeGeneration((n) => n + 1);

  useEffect(() => {
    onSelectionChange({
      candidates,
      previews,
      selectedSourceUrls,
      uploads,
      selectedUploadIds,
      primaryKey,
      probing,
      uploadWarnings,
    });
  }, [
    candidates,
    previews,
    selectedSourceUrls,
    uploads,
    selectedUploadIds,
    primaryKey,
    probing,
    uploadWarnings,
    onSelectionChange,
  ]);

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const warnings: string[] = [];
    const added: PasteQueuedUpload[] = [];

    for (const file of files) {
      const err = isAllowedPasteUploadFile(file);
      if (err) {
        warnings.push(`${file.name}: ${err}`);
        continue;
      }
      if (uploads.length + added.length >= PASTE_MAX_IMAGES_TOTAL) {
        warnings.push(`จำนวนรูปเกิน ${PASTE_MAX_IMAGES_TOTAL} รูปต่อคัน`);
        break;
      }
      const item = createQueuedUpload(file);
      added.push(item);
    }

    if (warnings.length) setUploadWarnings((w) => [...w, ...warnings]);
    if (added.length === 0) return;

    setUploads((prev) => [...prev, ...added]);
    setSelectedUploadIds((prev) => {
      const next = new Set(prev);
      for (const item of added) {
        if (canSelectMore(selectedSourceUrls.size, next.size)) {
          next.add(item.id);
          if (!primaryKey) setPrimaryKey(uploadPrimaryKey(item.id));
        }
      }
      return next;
    });
  };

  const toggleLink = (url: string, canSelect: boolean) => {
    if (!canSelect) return;
    setSelectedSourceUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
        if (primaryKey === linkPrimaryKey(url)) {
          const rest = next.values().next().value;
          setPrimaryKey(rest ? linkPrimaryKey(rest) : null);
        }
      } else {
        if (!canSelectMore(next.size, selectedUploadIds.size)) {
          setUploadWarnings((w) => [
            ...w,
            `เลือกรูปได้ไม่เกิน ${PASTE_MAX_IMAGES_TOTAL} รูปรวมทั้งลิงก์และอัปโหลด`,
          ]);
          return prev;
        }
        next.add(url);
        if (!primaryKey) setPrimaryKey(linkPrimaryKey(url));
      }
      return next;
    });
  };

  const toggleUpload = (id: string) => {
    setSelectedUploadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primaryKey === uploadPrimaryKey(id)) {
          const rest = next.values().next().value;
          setPrimaryKey(rest ? uploadPrimaryKey(rest) : null);
        }
      } else {
        if (!canSelectMore(selectedSourceUrls.size, next.size)) {
          setUploadWarnings((w) => [
            ...w,
            `เลือกรูปได้ไม่เกิน ${PASTE_MAX_IMAGES_TOTAL} รูปรวมทั้งลิงก์และอัปโหลด`,
          ]);
          return prev;
        }
        next.add(id);
        if (!primaryKey) setPrimaryKey(uploadPrimaryKey(id));
      }
      return next;
    });
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item) revokeQueuedUploadPreview(item);
      return prev.filter((u) => u.id !== id);
    });
    setSelectedUploadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (primaryKey === uploadPrimaryKey(id)) setPrimaryKey(null);
  };

  const previewByUrl = useMemo(() => {
    const m = new Map<string, PasteImagePreviewResult>();
    for (const p of previews) m.set(p.sourceUrl, p);
    return m;
  }, [previews]);

  const hasDrivePermissionIssue = useMemo(
    () =>
      previews.some((p) => isDrivePermissionProbeStatus(p.kind, p.status)) ||
      (driveFileLinks.length > 0 &&
        !probing &&
        previews.filter((p) => p.kind === "drive_file" && p.status === "ok")
          .length === 0),
    [previews, driveFileLinks.length, probing]
  );

  const openDriveUrl =
    firstDriveFileLinkForPermission([
      ...driveFileLinks,
      ...candidates.filter((c) => c.kind === "drive_file").map((c) => c.sourceUrl),
    ]) ?? driveLinkLines.find((u) => u.includes("drive.google.com")) ?? null;

  const cardCls = isDarkMode
    ? "border-slate-700 bg-slate-900/40"
    : "border-slate-200 bg-slate-50";

  const btnCls =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition disabled:opacity-50";
  const btnPrimary = `${btnCls} border-orange-500/50 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20`;
  const btnSecondary = `${btnCls} border-slate-600 text-slate-300 hover:bg-slate-800/50`;

  const dropCls = `rounded-lg border-2 border-dashed p-6 text-center transition ${
    dragOver
      ? "border-orange-500 bg-orange-500/10"
      : isDarkMode
        ? "border-slate-600 hover:border-slate-500"
        : "border-slate-300 hover:border-slate-400"
  }`;

  return (
    <div className={`rounded-xl border p-4 space-y-4 ${cardCls}`}>
      <div>
        <h4 className="font-bold text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-orange-400" />
          เลือกรูปภาพสำหรับประกาศ
        </h4>
        <p className="text-[11px] text-slate-400 mt-1">
          คุณสามารถผสมรูปจากลิงก์และรูปที่อัปโหลดเองได้ — สูงสุด{" "}
          {PASTE_MAX_IMAGES_TOTAL} รูปต่อคัน (เลือกแล้ว {totalSelected} รูป)
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          หากรูปจากลิงก์แสดงไม่ได้ สามารถอัปโหลดรูปจากเครื่องเพิ่มเติมได้
        </p>
      </div>

      {uploadWarnings.length > 0 && (
        <ul className="text-[11px] text-rose-300/90 space-y-1 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
          {[...new Set(uploadWarnings)].slice(-5).map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {folderWarnings.length > 0 && (
        <ul className="text-[11px] text-amber-300/90 space-y-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          {folderWarnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <span className="font-bold">ไม่รองรับอัตโนมัติ — </span>
                {w}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasDrivePermissionIssue && !probing && (
        <div className="space-y-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/25">
          <p className="text-xs text-sky-100/95 leading-relaxed">
            {DRIVE_PREVIEW_PERMISSION_MESSAGE}
          </p>
          <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5 pl-1">
            {DRIVE_SHARE_STEPS.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleRetryProbe}
          disabled={probing || candidates.length === 0}
          className={btnPrimary}
        >
          {probing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          ตรวจรูปอีกครั้ง
        </button>
        {openDriveUrl && (
          <a
            href={openDriveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            เปิดลิงก์ Drive เพื่อตั้งค่าสิทธิ์
          </a>
        )}
        {onSaveDraftLater && (
          <button
            type="button"
            onClick={onSaveDraftLater}
            disabled={saveDraftLaterDisabled || saveDraftLaterLoading}
            className={btnSecondary}
          >
            {saveDraftLaterLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            บันทึก Draft แล้วอัปโหลดรูปภายหลัง
          </button>
        )}
      </div>

      {candidates.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-slate-400">จากลิงก์</p>
          {probing && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              กำลังโหลดตัวอย่างรูปจากลิงก์…
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {candidates.map((c) => {
              const preview = previewByUrl.get(c.sourceUrl);
              const selected = selectedSourceUrls.has(c.sourceUrl);
              const isPrimary = primaryKey === linkPrimaryKey(c.sourceUrl);
              const canSelect = preview?.status === "ok";
              const statusText = cardStatusLabel(preview, probing);
              const showDriveHint =
                c.kind === "drive_file" &&
                preview &&
                (preview.status === "needs_permission" ||
                  preview.status === "failed");

              return (
                <div
                  key={c.id}
                  className={`relative rounded-lg border overflow-hidden ${
                    selected
                      ? "border-orange-500 ring-1 ring-orange-500/50"
                      : "border-slate-600/50"
                  }`}
                >
                  <span className="absolute top-1 left-1 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300">
                    จากลิงก์
                  </span>
                  <div className="aspect-[4/3] bg-slate-800/50 flex items-center justify-center">
                    {probing && !preview ? (
                      <div className="text-center text-[10px] text-slate-400">
                        <Loader2 className="w-5 h-5 mx-auto mb-1 animate-spin" />
                        {PREVIEW_STATUS_LABELS.pending}
                      </div>
                    ) : preview?.status === "ok" && preview.proxyPath ? (
                      <img
                        src={preview.proxyPath}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="p-2 text-center text-[10px] text-slate-400">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                        {showDriveHint
                          ? "ต้องตั้งค่าสิทธิ์แชร์"
                          : (preview?.error ?? statusText)}
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 truncate">
                      {kindLabel(c.kind)}
                    </p>
                    <p className="text-[10px] text-slate-500">{statusText}</p>
                    <div className="flex flex-wrap gap-1">
                      <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={!canSelect}
                          onChange={() => toggleLink(c.sourceUrl, canSelect)}
                        />
                        เลือก
                      </label>
                      {selected && canSelect && (
                        <button
                          type="button"
                          onClick={() => setPrimaryKey(linkPrimaryKey(c.sourceUrl))}
                          className={`text-[10px] flex items-center gap-0.5 px-1 rounded ${
                            isPrimary
                              ? "text-amber-300 bg-amber-500/20"
                              : "text-slate-400 hover:text-amber-300"
                          }`}
                        >
                          <Star className="w-3 h-3" />
                          หลัก
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="space-y-2 pt-2 border-t border-slate-700/50">
        <h5 className="text-[11px] font-bold text-slate-400 flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          อัปโหลดรูปภาพเพิ่มเติม
        </h5>
        <p className="text-[10px] text-slate-500">
          {PASTE_UPLOAD_HELP_TEXT}
        </p>
        <div
          className={dropCls}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") fileInputRef.current?.click();
          }}
        >
          <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
          <p className="text-xs text-slate-400">
            ลากไฟล์มาวาง หรือคลิกเพื่อเลือกรูปจากเครื่อง
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {uploads.length > 0 && (
          <>
            <p className="text-[11px] font-bold text-slate-400">อัปโหลดเอง</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {uploads.map((u) => {
                const selected = selectedUploadIds.has(u.id);
                const isPrimary = primaryKey === uploadPrimaryKey(u.id);
                return (
                  <div
                    key={u.id}
                    className={`relative rounded-lg border overflow-hidden ${
                      selected
                        ? "border-orange-500 ring-1 ring-orange-500/50"
                        : "border-slate-600/50"
                    }`}
                  >
                    <span className="absolute top-1 left-1 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-200">
                      อัปโหลดเอง
                    </span>
                    <button
                      type="button"
                      title="ลบออกจากรายการ"
                      onClick={() => removeUpload(u.id)}
                      className="absolute top-1 right-1 z-10 p-1 rounded bg-slate-900/80 text-rose-300 hover:text-rose-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="aspect-[4/3] bg-slate-800/50">
                      <img
                        src={u.previewUrl}
                        alt={u.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] text-slate-500 truncate">
                        {u.name}
                      </p>
                      <p
                        className={`text-[10px] font-medium ${
                          saveDraftLaterLoading && selected
                            ? "text-amber-300"
                            : u.clientStatus === "pending"
                              ? "text-emerald-400"
                              : "text-slate-400"
                        }`}
                      >
                        {saveDraftLaterLoading && selected
                          ? PASTE_UPLOAD_STATUS_LABEL.preparing
                          : u.statusMessage}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleUpload(u.id)}
                          />
                          เลือก
                        </label>
                        {selected && (
                          <button
                            type="button"
                            onClick={() => setPrimaryKey(uploadPrimaryKey(u.id))}
                            className={`text-[10px] flex items-center gap-0.5 px-1 rounded ${
                              isPrimary
                                ? "text-amber-300 bg-amber-500/20"
                                : "text-slate-400 hover:text-amber-300"
                            }`}
                          >
                            <Star className="w-3 h-3" />
                            หลัก
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {totalSelected === 0 && !probing && (
        <p className="text-[11px] text-amber-300/90 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          กรุณาเลือกรูปสำหรับประกาศอย่างน้อย 1 รูป — บันทึก Draft ได้แต่เผยแพร่ไม่ได้จนกว่าจะมีรูปในระบบ
        </p>
      )}
    </div>
  );
}
