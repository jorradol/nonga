import React, { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardPaste,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Save,
  RotateCcw,
} from "lucide-react";
import { parseThorAutoPasteRow } from "../../../utils/inventoryImport/pasteRawVehicleParser";
import type { ParsedPasteVehicle } from "../../../utils/inventoryImport/pasteRawVehicleTypes";
import {
  createEditablePasteDraft,
  editablePasteDraftToPayload,
  validateEditablePasteDraft,
  type EditablePasteDraft,
} from "../../../utils/inventoryImport/editablePasteDraft";
import type {
  ImportCommitResult,
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "../../../utils/inventoryImport/import/types";
import type { DealerApiHeaders } from "../../../services/dealer/dealerApi";
import {
  importSelectedPasteImagesApi,
  uploadPasteImagesApi,
} from "../../../services/dealer/pasteImageApi";
import { fileToPasteUploadPayload } from "../../../utils/inventoryImport/pasteUploadedImageQueue";
import { mergeLinkAndUploadStoredUrls } from "../../../utils/inventoryImport/pasteImageSelectionState";
import {
  PasteImagePreviewSection,
  type PasteImageSelectionState,
} from "./PasteImagePreviewSection";
import { useNotifyStore } from "../../../stores/notifyStore";
import { shouldRedirectAfterPasteDraftSave } from "../../../utils/dealer/dealerPasteSaveRedirect";

export interface DealerPasteImportSectionProps {
  ownerContext: ImportOwnerContext;
  dealerApiHeaders: DealerApiHeaders;
  commitImport: (
    published: MarketplaceImportPayload[],
    drafts: MarketplaceImportPayload[],
    owner: ImportOwnerContext
  ) => Promise<ImportCommitResult>;
  onGoToDrafts?: () => void;
  isDarkMode: boolean;
}

function confidenceBadge(level: string) {
  const colors: Record<string, string> = {
    high: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    medium: "text-amber-400 border-amber-500/40 bg-amber-500/10",
    low: "text-rose-400 border-rose-500/40 bg-rose-500/10",
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors[level] ?? "text-slate-400"}`}
    >
      {level}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  isDarkMode,
  type = "text",
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  isDarkMode: boolean;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDarkMode
      ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
      : "bg-white border-slate-300 text-slate-900"
  } ${error ? "border-rose-500/60" : ""}`;

  return (
    <div className="space-y-1 text-left">
      <label className="text-[11px] font-bold text-slate-500">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className={`${inputCls} resize-y min-h-[72px]`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
      {error && <p className="text-[10px] text-rose-400">{error}</p>}
    </div>
  );
}

export function DealerPasteImportSection({
  ownerContext,
  dealerApiHeaders,
  commitImport,
  onGoToDrafts,
  isDarkMode,
}: DealerPasteImportSectionProps) {
  const [rawText, setRawText] = useState("");
  const [sourceParsed, setSourceParsed] = useState<ParsedPasteVehicle | null>(
    null
  );
  const [editable, setEditable] = useState<EditablePasteDraft | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const notifySuccess = useNotifyStore((s) => s.notifySuccess);
  const [imageSelection, setImageSelection] =
    useState<PasteImageSelectionState | null>(null);
  const [saveImageSummary, setSaveImageSummary] = useState<string | null>(null);

  const handleImageSelectionChange = useCallback(
    (state: PasteImageSelectionState) => {
      setImageSelection(state);
    },
    []
  );

  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800 text-white"
    : "bg-white border-slate-200 text-slate-900";

  const validation = useMemo(() => {
    if (!editable || !sourceParsed) return null;
    return validateEditablePasteDraft(editable, sourceParsed.warnings);
  }, [editable, sourceParsed]);

  const resetPreview = () => {
    setSourceParsed(null);
    setEditable(null);
    setSaveOk(false);
    setSaveError(null);
  };

  const onParse = () => {
    setParseError(null);
    setSaveOk(false);
    setSaveError(null);
    const t = rawText.trim();
    if (!t) {
      setParseError("กรุณาวางข้อมูลจาก Excel / Google Sheet ก่อน");
      resetPreview();
      return;
    }
    if (!t.includes("\t") && t.split("\t").length < 8) {
      setParseError(
        "ไม่พบคอลัมน์แบบ Tab — คัดลอกทั้งแถวจาก Excel แล้ววาง (Ctrl+V)"
      );
      resetPreview();
      return;
    }
    try {
      const result = parseThorAutoPasteRow(t);
      if (!result.brand && !result.model) {
        setParseError("ไม่สามารถอ่านยี่ห้อ/รุ่นได้ — ตรวจสอบว่าคัดลอกครบแถว");
        resetPreview();
        return;
      }
      setSourceParsed(result);
      setEditable(createEditablePasteDraft(result));
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : "แปลงข้อมูลไม่สำเร็จ"
      );
      resetPreview();
    }
  };

  const onClearAll = () => {
    setRawText("");
    resetPreview();
    setParseError(null);
  };

  const patchEditable = (patch: Partial<EditablePasteDraft>) => {
    setEditable((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveOk(false);
  };

  const onSaveDraft = async () => {
    if (!editable || !sourceParsed) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveOk(false);
    setSaveImageSummary(null);

    const baseId = Date.now();
    const commitDraftId = `draft-import-${baseId}-d0`;
    let storedImages: string[] = [];
    const imageImportWarnings: string[] = [];

    const selectedUrls = imageSelection
      ? [...imageSelection.selectedSourceUrls]
      : [];
    const selectedUploads =
      imageSelection?.uploads.filter((u) =>
        imageSelection.selectedUploadIds.has(u.id)
      ) ?? [];

    let linkStored: string[] = [];
    const uploadIdToUrl = new Map<string, string>();

    const linkPrimary =
      imageSelection?.primaryKey?.startsWith("link:") === true
        ? imageSelection.primaryKey.slice(5)
        : undefined;

    if (selectedUrls.length > 0 && imageSelection) {
      try {
        const imp = await importSelectedPasteImagesApi(
          dealerApiHeaders,
          commitDraftId,
          imageSelection.candidates,
          selectedUrls,
          linkPrimary
        );
        linkStored = imp.storedUrls;
        imageImportWarnings.push(...imp.warnings);
        if (imp.failed.length > 0) {
          imageImportWarnings.push(
            `รูปจากลิงก์โหลดไม่ได้ ${imp.failed.length} รูป — ใช้รูปอัปโหลดเองแทนได้`
          );
        }
      } catch (e) {
        imageImportWarnings.push(
          e instanceof Error
            ? e.message
            : "ดาวน์โหลดรูปจากลิงก์ไม่สำเร็จ — Draft ยังบันทึกได้"
        );
      }
    }

    let uploadStored: string[] = [];
    if (selectedUploads.length > 0) {
      try {
        const payloads = await Promise.all(
          selectedUploads.map((u) => fileToPasteUploadPayload(u.file))
        );
        const up = await uploadPasteImagesApi(
          dealerApiHeaders,
          commitDraftId,
          payloads
        );
        uploadStored = up.storedUrls;
        selectedUploads.forEach((u, i) => {
          if (up.storedUrls[i]) uploadIdToUrl.set(u.id, up.storedUrls[i]);
        });
      } catch (e) {
        imageImportWarnings.push(
          e instanceof Error
            ? e.message
            : "อัปโหลดรูปจากเครื่องไม่สำเร็จ — Draft ยังบันทึกได้"
        );
      }
    }

    storedImages = mergeLinkAndUploadStoredUrls(
      linkStored,
      uploadStored,
      imageSelection?.primaryKey ?? null,
      uploadIdToUrl
    );

    if (storedImages.length > 0) {
      setSaveImageSummary(
        `บันทึกรูป ${storedImages.length} รูป (ลิงก์ ${linkStored.length} + อัปโหลด ${uploadStored.length})`
      );
    }

    const externalImageLinks = [
      ...(imageSelection?.candidates ?? [])
        .filter((c) => !selectedUrls.includes(c.sourceUrl))
        .map((c) => c.sourceUrl),
    ];

    const { payload, validation: v } = editablePasteDraftToPayload(
      editable,
      ownerContext,
      sourceParsed,
      {
        commitDraftId,
        storedImages,
        externalImageLinks,
        imageImportWarnings,
      }
    );
    if (!payload) {
      setSaveError("สร้างข้อมูล Draft ไม่ได้ — ตรวจสอบยี่ห้อและรุ่น");
      setIsSaving(false);
      return;
    }
    if (!v.canSaveDraft) {
      setSaveError("ไม่สามารถบันทึก Draft ได้");
      setIsSaving(false);
      return;
    }

    try {
      const result = await commitImport([], [payload], ownerContext);
      if (!result.success) {
        setSaveError(result.message ?? "บันทึก Draft ไม่สำเร็จ");
        return;
      }
      setSaveOk(true);
      notifySuccess("บันทึก Draft สำเร็จ", "กำลังพาไปหน้า Draft / รอเติมข้อมูล");
      if (shouldRedirectAfterPasteDraftSave(true)) {
        onGoToDrafts?.();
      }
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "บันทึก Draft ไม่สำเร็จ"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-6 sm:p-8 space-y-5 ${panel}`}>
      <div>
        <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-orange-400" />
          วางข้อมูลดิบจาก Excel (ThorAuto)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          คัดลอก 1 แถวจาก Sheet แล้ววาง — แปลง → แก้ไขใน Preview → บันทึกเป็น
          Draft เท่านั้น (ยังไม่เผยแพร่)
        </p>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          if (sourceParsed) resetPreview();
          setSaveOk(false);
        }}
        rows={8}
        placeholder="วางแถวข้อมูลรถ 1 คันที่นี่ (คั่นด้วย Tab จาก Excel)…"
        className={`w-full rounded-xl border px-4 py-3 text-sm font-mono resize-y min-h-[160px] ${
          isDarkMode
            ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600"
            : "bg-slate-50 border-slate-300 text-slate-900"
        }`}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onParse}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition"
        >
          แปลงข้อมูล
        </button>
        {editable && (
          <>
            <button
              type="button"
              disabled={isSaving}
              onClick={onSaveDraft}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-300 text-sm font-bold disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              บันทึกเป็น Draft
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold hover:bg-slate-800/50"
            >
              <RotateCcw className="w-4 h-4" />
              ล้างข้อมูล / เริ่มใหม่
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {parseError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-rose-400 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {parseError}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editable && sourceParsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 sm:p-5 space-y-4 ${
              isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm">
                  แก้ไขข้อมูลก่อนบันทึก Draft
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  ระบบแปลงข้อมูลให้เบื้องต้นแล้ว กรุณาตรวจสอบและแก้ไขก่อนบันทึกเป็น
                  Draft
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {confidenceBadge(sourceParsed.confidenceLevel)}
                <span className="text-xs text-slate-500">
                  {sourceParsed.confidenceScore}/100
                </span>
              </div>
            </div>

            {validation && validation.warnings.length > 0 && (
              <ul className="space-y-1.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
                {validation.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-300/95 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {w}
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="ยี่ห้อ (brand)"
                value={editable.brand}
                onChange={(v) => patchEditable({ brand: v })}
                error={validation?.fieldErrors.brand}
                isDarkMode={isDarkMode}
              />
              <Field
                label="รุ่น (model)"
                value={editable.model}
                onChange={(v) => patchEditable({ model: v })}
                error={validation?.fieldErrors.model}
                isDarkMode={isDarkMode}
              />
              <Field
                label="รุ่นย่อย / trim"
                value={editable.subModel}
                onChange={(v) => patchEditable({ subModel: v })}
                isDarkMode={isDarkMode}
              />
              <Field
                label="ทะเบียน"
                value={editable.licensePlate}
                onChange={(v) => patchEditable({ licensePlate: v })}
                isDarkMode={isDarkMode}
              />
              <Field
                label="ปีรถ"
                value={editable.year}
                onChange={(v) => patchEditable({ year: v })}
                error={validation?.fieldErrors.year}
                isDarkMode={isDarkMode}
                placeholder="เช่น 2019"
              />
              <Field
                label="สี"
                value={editable.color}
                onChange={(v) => patchEditable({ color: v })}
                isDarkMode={isDarkMode}
              />
              <Field
                label="เกียร์"
                value={editable.transmission}
                onChange={(v) => patchEditable({ transmission: v })}
                isDarkMode={isDarkMode}
                placeholder="อัตโนมัติ / เกียร์ธรรมดา"
              />
              <Field
                label="เลขไมล์"
                value={editable.mileage}
                onChange={(v) => patchEditable({ mileage: v })}
                error={validation?.fieldErrors.mileage}
                isDarkMode={isDarkMode}
                placeholder="161392"
              />
              <Field
                label="ราคา (บาท)"
                value={editable.price}
                onChange={(v) => patchEditable({ price: v })}
                error={validation?.fieldErrors.price}
                isDarkMode={isDarkMode}
                placeholder="389000"
              />
              <Field
                label="ราคาอ้างอิง / ราคากลาง"
                value={editable.referencePrice}
                onChange={(v) => patchEditable({ referencePrice: v })}
                error={validation?.fieldErrors.referencePrice}
                isDarkMode={isDarkMode}
              />
            </div>

            <PasteImagePreviewSection
              parsed={sourceParsed}
              imageLinksText={editable.imageLinksText}
              driveLinksText={editable.driveLinksText}
              dealerApiHeaders={dealerApiHeaders}
              isDarkMode={isDarkMode}
              onSelectionChange={handleImageSelectionChange}
              onSaveDraftLater={onSaveDraft}
              saveDraftLaterDisabled={isSaving}
              saveDraftLaterLoading={isSaving}
            />

            <Field
              label="อุปกรณ์เสริม / features"
              value={editable.features}
              onChange={(v) => patchEditable({ features: v })}
              isDarkMode={isDarkMode}
              multiline
            />
            <Field
              label="รายละเอียดขาย"
              value={editable.description}
              onChange={(v) => patchEditable({ description: v })}
              isDarkMode={isDarkMode}
              multiline
            />

            <div className="grid grid-cols-1 gap-3">
              <Field
                label="เว็บไซต์ (websiteUrl)"
                value={editable.websiteUrl}
                onChange={(v) => patchEditable({ websiteUrl: v })}
                error={validation?.fieldErrors.websiteUrl}
                isDarkMode={isDarkMode}
              />
              <Field
                label="YouTube"
                value={editable.youtubeUrl}
                onChange={(v) => patchEditable({ youtubeUrl: v })}
                error={validation?.fieldErrors.youtubeUrl}
                isDarkMode={isDarkMode}
              />
              <Field
                label="TikTok"
                value={editable.tiktokUrl}
                onChange={(v) => patchEditable({ tiktokUrl: v })}
                error={validation?.fieldErrors.tiktokUrl}
                isDarkMode={isDarkMode}
              />
              <Field
                label="Google Drive (หลายลิงก์ — บรรทัดละ 1)"
                value={editable.driveLinksText}
                onChange={(v) => patchEditable({ driveLinksText: v })}
                error={validation?.fieldErrors.driveLinksText}
                isDarkMode={isDarkMode}
                multiline
                placeholder="https://drive.google.com/..."
              />
              <Field
                label="ลิงก์รูปตรง (หลายลิงก์)"
                value={editable.imageLinksText}
                onChange={(v) => patchEditable({ imageLinksText: v })}
                error={validation?.fieldErrors.imageLinksText}
                isDarkMode={isDarkMode}
                multiline
              />
              <Field
                label="หมายเหตุเพิ่มเติม"
                value={editable.notes}
                onChange={(v) => patchEditable({ notes: v })}
                isDarkMode={isDarkMode}
                multiline
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {saveError && <p className="text-sm text-rose-400">{saveError}</p>}
      {saveImageSummary && (
        <p className="text-xs text-amber-300/90">{saveImageSummary}</p>
      )}
      {saveOk && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            บันทึกเป็น Draft แล้ว (dealer: {ownerContext.dealerId})
          </p>
          {onGoToDrafts && (
            <button
              type="button"
              onClick={onGoToDrafts}
              className="text-xs font-bold text-emerald-300 underline"
            >
              ไปหน้า Draft
            </button>
          )}
        </div>
      )}
    </div>
  );
}
