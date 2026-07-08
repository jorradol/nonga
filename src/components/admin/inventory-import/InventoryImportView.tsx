import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  FileSpreadsheet,
  Table2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import { useAppStore } from "../../../store";
import { parseInventoryFile } from "../../../utils/inventoryImport/parseInventoryFile";
import {
  InventoryImportError,
  isAllowedInventoryExtension,
} from "../../../utils/inventoryImport/fileValidators";
import {
  PREVIEW_ROW_LIMIT,
  type ParsedInventoryFile,
} from "../../../utils/inventoryImport/types";
import {
  findDuplicateMappingWarnings,
  resetMappingsToIgnore,
  applyAutoMappingFromParsed,
  type ColumnMappingEntry,
} from "../../../utils/inventoryImport/columnMapping";
import { buildSmartColumnMappings } from "../../../utils/inventoryImport/smartFieldDetection";
import type { InventoryImportFieldKey } from "../../../utils/inventoryImport/inventoryImportSchema";
import { runInventoryCleanPipeline } from "../../../utils/inventoryImport/cleaning/cleanAndValidate";
import type { InventoryCleanPipelineResult } from "../../../utils/inventoryImport/cleaning/cleanAndValidate";
import { prepareSmartInventoryImport } from "../../../utils/inventoryImport/import/prepareSmartImport";
import { flattenSmartPrepForCommit } from "../../../utils/inventoryImport/import/prepareSmartImport";
import { commitInventoryImport } from "../../../utils/inventoryImport/import/commitImport";
import { evaluateMappingContinueGate } from "../../../utils/inventoryImport/import/mappingContinueGate";
import type { DealerApiHeaders } from "../../../services/dealer/dealerApi";
import type {
  ImportCommitResult,
  ImportOwnerContext,
  MarketplaceImportPayload,
  SmartImportPreparationSummary,
} from "../../../utils/inventoryImport/import/types";
import {
  THOR_AUTO_DEALER_ID,
  buildThorAutoOwnerContext,
} from "../../../utils/dealerIdentity";
import { ColumnMappingSection } from "./ColumnMappingSection";
import { CleanedDataPreviewSection } from "./CleanedDataPreviewSection";
import { ImportConfirmationSection } from "./ImportConfirmationSection";
import { DealerImportHelpSection } from "./DealerImportHelpSection";
import { DealerPasteImportSection } from "./DealerPasteImportSection";
import { SmartImportReviewSection } from "./SmartImportReviewSection";
import { DEALER_FINAL_IMPORT_DISABLED_MESSAGE } from "../../../utils/dealer/dealerImportMessages";

type DealerImportSourceTab = "file" | "paste";

type ImportUiPhase =
  | "idle"
  | "review"
  | "confirm"
  | "loading"
  | "success"
  | "error";

export interface InventoryImportViewProps {
  mode?: "admin" | "dealer";
  ownerContextOverride?: ImportOwnerContext;
  commitImport?: (
    published: MarketplaceImportPayload[],
    drafts: MarketplaceImportPayload[],
    owner: ImportOwnerContext
  ) => Promise<ImportCommitResult>;
  savePasteDraft?: (
    draft: MarketplaceImportPayload,
    owner: ImportOwnerContext
  ) => Promise<ImportCommitResult>;
  finalCommitEnabled?: boolean;
  finalCommitDisabledMessage?: string;
  onGoToDrafts?: () => void;
  compact?: boolean;
  dealerApiHeaders?: DealerApiHeaders;
}

export default function InventoryImportView({
  mode = "admin",
  ownerContextOverride,
  commitImport: commitImportFn,
  savePasteDraft,
  finalCommitEnabled,
  finalCommitDisabledMessage,
  onGoToDrafts,
  compact = false,
  dealerApiHeaders,
}: InventoryImportViewProps = {}) {
  const { setView, isDarkMode, fetchCars, setFilters, user } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedInventoryFile | null>(null);
  const [mappingEntries, setMappingEntries] = useState<ColumnMappingEntry[]>([]);
  const [cleanResult, setCleanResult] =
    useState<InventoryCleanPipelineResult | null>(null);
  const [smartPrep, setSmartPrep] =
    useState<SmartImportPreparationSummary | null>(null);
  const [importPhase, setImportPhase] = useState<ImportUiPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(
    null
  );
  const [dealerSourceTab, setDealerSourceTab] =
    useState<DealerImportSourceTab>("file");

  const accept = ".csv,.xlsx";
  const canCommitImport = finalCommitEnabled ?? mode !== "dealer";
  const commitDisabledMessage =
    finalCommitDisabledMessage ?? DEALER_FINAL_IMPORT_DISABLED_MESSAGE;
  const doCommit =
    commitImportFn ??
    ((published, drafts, owner) =>
      commitInventoryImport(published, drafts, owner));

  const resetAll = () => {
    setParsed(null);
    setMappingEntries([]);
    setCleanResult(null);
    setSmartPrep(null);
    setImportPhase("idle");
    setImportError(null);
    setCommitResult(null);
    setError(null);
  };

  const ownerContext: ImportOwnerContext =
    ownerContextOverride ??
    (() => {
      const ctx = buildThorAutoOwnerContext({
        ownerId: user?.uid ?? `owner-${THOR_AUTO_DEALER_ID}`,
        ownerName: user?.displayName ?? undefined,
      });
      return {
        dealerId: ctx.dealerId,
        ownerId: ctx.ownerId,
        ownerName: ctx.ownerName,
        ownerPhone: ctx.ownerPhone,
        showroomName: ctx.showroomName,
        address: ctx.address,
      };
    })();

  const handleFile = useCallback((file: File | null) => {
    resetAll();
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!isAllowedInventoryExtension(ext)) {
      setSelectedFile(null);
      setError("รองรับเฉพาะไฟล์ .csv และ .xlsx เท่านั้น");
      return;
    }
    setSelectedFile(file);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      handleFile(file);
    },
    [handleFile]
  );

  const initMappings = useCallback((result: ParsedInventoryFile) => {
    const entries = buildSmartColumnMappings(result.columns, result.rows);
    setMappingEntries(entries);
    setCleanResult(null);
    setSmartPrep(null);
    setImportPhase("idle");
  }, []);

  const onPreview = async () => {
    if (!selectedFile) {
      setError("กรุณาเลือกไฟล์ก่อนกด Preview");
      return;
    }

    setIsParsing(true);
    setError(null);
    resetAll();

    try {
      const result = await parseInventoryFile(selectedFile);
      setParsed(result);
      initMappings(result);
    } catch (err) {
      const msg =
        err instanceof InventoryImportError
          ? err.message
          : err instanceof Error
            ? err.message
            : "ไม่สามารถอ่านไฟล์ได้";
      setError(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const duplicateWarnings = useMemo(
    () => findDuplicateMappingWarnings(mappingEntries),
    [mappingEntries]
  );

  const mappingContinueGate = useMemo(
    () =>
      evaluateMappingContinueGate(
        mappingEntries,
        parsed?.totalRows ?? 0,
        canCommitImport
      ),
    [mappingEntries, parsed?.totalRows, canCommitImport]
  );

  const runCleanPipeline = useCallback(() => {
    if (!parsed || mappingEntries.length === 0) return;
    if (!mappingContinueGate.canContinue) {
      return;
    }
    const result = runInventoryCleanPipeline(parsed.rows, mappingEntries);
    setCleanResult(result);
    setSmartPrep(null);
    setImportPhase("idle");
    setCommitResult(null);
  }, [parsed, mappingEntries, mappingContinueGate.canContinue]);

  const rawRowsByIndex = useMemo(() => {
    if (!parsed) return {};
    const map: Record<number, Record<string, string>> = {};
    parsed.rows.forEach((row, i) => {
      map[i + 1] = row;
    });
    return map;
  }, [parsed]);

  const handlePrepareSmartReview = useCallback(() => {
    if (!cleanResult) return;
    const prep = prepareSmartInventoryImport(
      cleanResult.allRows,
      ownerContext,
      rawRowsByIndex
    );
    setSmartPrep(prep);
    setImportPhase("review");
    setImportError(null);
    setCommitResult(null);
  }, [cleanResult, ownerContext, rawRowsByIndex]);

  const handleContinueToConfirm = useCallback(() => {
    if (!smartPrep || smartPrep.importableCount === 0) return;
    setImportPhase("confirm");
    setImportError(null);
  }, [smartPrep]);

  const handleConfirmImport = useCallback(async () => {
    if (!smartPrep || smartPrep.importableCount === 0) return;
    if (!canCommitImport) {
      setImportPhase("error");
      setImportError(commitDisabledMessage);
      return;
    }

    setImportPhase("loading");
    setImportError(null);

    try {
      const { published, drafts } = flattenSmartPrepForCommit(smartPrep);
      const result = await doCommit(published, drafts, ownerContext);

      if (!result.success || result.importedCount === 0) {
        throw new Error(
          result.message ?? "นำเข้าไม่สำเร็จ — ไม่มีรถที่บันทึกได้"
        );
      }

      setCommitResult(result);
      setImportPhase("success");
      await fetchCars();
    } catch (err) {
      setImportPhase("error");
      setCommitResult(null);
      setImportError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการนำเข้า"
      );
    }
  }, [smartPrep, ownerContext, fetchCars, canCommitImport, commitDisabledMessage]);

  const handleGoToDraftInventory = useCallback(() => {
    if (onGoToDrafts) {
      onGoToDrafts();
      return;
    }
    setView(mode === "dealer" ? "dealer-portal" : "dealer-draft-inventory");
  }, [setView, onGoToDrafts, mode]);

  const handleGoToMarketplace = useCallback(() => {
    setFilters({ sortBy: "latest" });
    setView("marketplace");
  }, [setFilters, setView]);

  const handleMappingChange = (
    column: string,
    field: InventoryImportFieldKey
  ) => {
    setMappingEntries((prev) =>
      prev.map((e) =>
        e.originalColumn === column ? { ...e, finalMapping: field } : e
      )
    );
    setCleanResult(null);
    setSmartPrep(null);
    setImportPhase("idle");
  };

  const handleApplyAutoMapping = () => {
    if (!parsed) return;
    setMappingEntries(
      applyAutoMappingFromParsed(parsed.columns, parsed.rows)
    );
    setCleanResult(null);
    setSmartPrep(null);
    setImportPhase("idle");
  };

  const handleResetMapping = () => {
    setMappingEntries((prev) => resetMappingsToIgnore(prev));
    setCleanResult(null);
    setSmartPrep(null);
    setImportPhase("idle");
  };

  const previewRows = parsed?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];
  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800 text-white"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div
      className={`${compact ? "" : "max-w-6xl"} mx-auto space-y-8 pb-20 text-left`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {!compact && (
          <button
            type="button"
            onClick={() =>
              setView(mode === "dealer" ? "dealer-portal" : "admin-dashboard")
            }
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400 mb-3 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {mode === "dealer" ? "กลับ Dealer Portal" : "กลับแผง Admin"}
          </button>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Phase 5 — AI Smart Import
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {mode === "dealer" ? "นำเข้าสต๊อกรถ" : "นำเข้าคลังรถ (Inventory Import)"}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            {mode === "dealer"
              ? "นำเข้าสต๊อกรถจากไฟล์ Excel/CSV หรือวางข้อมูลจากแหล่งเดิมของเต็นท์ เพื่อให้ระบบช่วยจัดข้อมูลก่อนบันทึกเข้าสต๊อก"
              : "อัปโหลด → Preview → Column Mapping → Clean → Confirm (ดาวน์โหลดรูปเข้า storage) → Marketplace"}
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-500 border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/50">
          {mode === "dealer" ? "/dealer/import" : "/admin/inventory-import"}
        </div>
      </div>

      <DealerImportHelpSection isDarkMode={isDarkMode} />

      {mode === "dealer" && !canCommitImport && dealerSourceTab === "file" && (
        <div
          className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm"
          data-testid="dealer-final-import-disabled-banner"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-100/95">นำเข้าสต๊อกจริง (หลายคันจากไฟล์) — ยังไม่เปิดใช้งาน</p>
            <p className="mt-1 text-amber-200/90">{commitDisabledMessage}</p>
          </div>
        </div>
      )}

      {mode === "dealer" && (
        <div
          className={`flex rounded-xl border p-1 gap-1 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-100"}`}
          role="tablist"
          aria-label="วิธีนำเข้า"
        >
          <button
            type="button"
            role="tab"
            aria-selected={dealerSourceTab === "file"}
            onClick={() => setDealerSourceTab("file")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
              dealerSourceTab === "file"
                ? "bg-orange-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            อัปโหลดไฟล์ Excel/CSV
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dealerSourceTab === "paste"}
            onClick={() => setDealerSourceTab("paste")}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
              dealerSourceTab === "paste"
                ? "bg-orange-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            วางข้อมูลแบบข้อความ
          </button>
        </div>
      )}

      {mode === "dealer" && dealerSourceTab === "paste" ? (
        dealerApiHeaders ? (
          <DealerPasteImportSection
            ownerContext={ownerContext}
            dealerApiHeaders={dealerApiHeaders}
            savePasteDraft={savePasteDraft}
            onGoToDrafts={onGoToDrafts}
            isDarkMode={isDarkMode}
          />
        ) : (
          <p className="text-sm text-rose-400">
            ต้องเข้าสู่ระบบ Dealer เพื่อใช้ Paste Import
          </p>
        )
      ) : (
      <>
      <div
        className={`rounded-2xl border p-6 sm:p-8 ${panel}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        <div
          className={`relative rounded-xl border-2 border-dashed transition-all p-10 sm:p-14 text-center ${
            isDragging
              ? "border-orange-500 bg-orange-500/5 scale-[1.01]"
              : isDarkMode
                ? "border-slate-700 hover:border-orange-500/50 bg-slate-900/40"
                : "border-slate-300 hover:border-orange-400 bg-slate-50"
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/20 mb-4">
            <Upload className="w-7 h-7" />
          </div>
          <h2 className="font-bold text-base sm:text-lg">
            ลากไฟล์มาวาง หรือเลือกจากเครื่อง
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            รองรับ .csv และ .xlsx · ภาษาไทยในหัวคอลัมน์และข้อมูล · สูงสุด 15 MB
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition shadow-md shadow-orange-600/20"
          >
            เลือกไฟล์
          </button>
        </div>

        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="w-8 h-8 text-orange-400 shrink-0" />
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                  {selectedFile.name.toLowerCase().endsWith(".csv") ? "CSV" : "XLSX"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  resetAll();
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isParsing}
                onClick={onPreview}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-bold disabled:opacity-60"
              >
                {isParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Preview Data
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {parsed && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-2xl border overflow-hidden ${panel}`}
            >
              <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <h3 className="font-bold text-sm">ผลการอ่านไฟล์ (Raw Preview)</h3>
                    <p className="text-xs text-slate-400">
                      ทั้งหมด {parsed.totalRows.toLocaleString("th-TH")} แถว · แสดง{" "}
                      {Math.min(PREVIEW_ROW_LIMIT, parsed.totalRows)} แถวแรก
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-orange-400/80 uppercase">
                  {parsed.fileType}
                </span>
              </div>

              <div className="p-5 sm:p-6 border-b border-slate-800/60">
                <div className="flex items-center gap-2 mb-3">
                  <Table2 className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-slate-300">
                    คอลัมน์ทั้งหมด ({parsed.columns.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsed.columns.map((col) => (
                    <span
                      key={col}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-900 border border-slate-700 text-orange-300/90"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] sm:text-xs min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 uppercase tracking-wide">
                      <th className="px-3 py-2.5 font-semibold w-10 sticky left-0 bg-slate-900/95">
                        #
                      </th>
                      {parsed.columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2.5 font-semibold whitespace-nowrap max-w-[200px] truncate"
                          title={col}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="border-t border-slate-800/60 hover:bg-orange-500/5"
                      >
                        <td className="px-3 py-2 text-slate-500 font-mono sticky left-0 bg-slate-950/90">
                          {rowIdx + 1}
                        </td>
                        {parsed.columns.map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 text-slate-300 max-w-[220px] truncate"
                            title={row[col] ?? ""}
                          >
                            {row[col] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsed.totalRows > PREVIEW_ROW_LIMIT && (
                <p className="p-4 text-center text-[11px] text-slate-500 border-t border-slate-800/60">
                  และอีก {(parsed.totalRows - PREVIEW_ROW_LIMIT).toLocaleString("th-TH")}{" "}
                  แถว
                </p>
              )}
            </motion.div>

            {mappingEntries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ColumnMappingSection
                  entries={mappingEntries}
                  duplicateWarnings={duplicateWarnings}
                  onMappingChange={handleMappingChange}
                  onResetMapping={handleResetMapping}
                  onApplyAutoMapping={handleApplyAutoMapping}
                  onContinueNormalize={runCleanPipeline}
                  canContinueNormalize={mappingContinueGate.canContinue}
                  continueBlockedReasons={mappingContinueGate.reasons}
                  isDarkMode={isDarkMode}
                />
              </motion.div>
            )}

            {cleanResult &&
              importPhase !== "review" &&
              importPhase !== "confirm" &&
              importPhase !== "loading" &&
              importPhase !== "success" &&
              importPhase !== "error" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CleanedDataPreviewSection
                  previewRows={cleanResult.previewRows}
                  summary={cleanResult.summary}
                  isDarkMode={isDarkMode}
                  onBackToMapping={() => {
                    setCleanResult(null);
                    setSmartPrep(null);
                    setImportPhase("idle");
                  }}
                  onRenormalize={runCleanPipeline}
                  onPrepareImport={handlePrepareSmartReview}
                  prepareDisabled={cleanResult.summary.totalRows === 0}
                />
              </motion.div>
            )}

            {smartPrep && importPhase === "review" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SmartImportReviewSection
                  preparation={smartPrep}
                  isDarkMode={isDarkMode}
                  onBack={() => {
                    setImportPhase("idle");
                    setSmartPrep(null);
                  }}
                  onContinueConfirm={handleContinueToConfirm}
                />
              </motion.div>
            )}

            {smartPrep &&
              (importPhase === "confirm" ||
                importPhase === "loading" ||
                importPhase === "success" ||
                importPhase === "error") && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ImportConfirmationSection
                  smartPreparation={smartPrep}
                  phase={
                    importPhase === "idle" || importPhase === "review"
                      ? "confirm"
                      : importPhase
                  }
                  errorMessage={importError}
                  commitResult={commitResult}
                  isDarkMode={isDarkMode}
                  onBackToCleaned={() => {
                    setImportPhase("review");
                    setImportError(null);
                    setCommitResult(null);
                  }}
                  onConfirmImport={handleConfirmImport}
                  onGoToMarketplace={handleGoToMarketplace}
                  onGoToDraftInventory={handleGoToDraftInventory}
                  commitEnabled={canCommitImport}
                  commitDisabledMessage={commitDisabledMessage}
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
}
