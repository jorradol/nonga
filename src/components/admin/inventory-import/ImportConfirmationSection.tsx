import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Car,
  X,
  ImageIcon,
  Download,
} from "lucide-react";
import type {
  ImportCommitResult,
  SmartImportPreparationSummary,
} from "../../../utils/inventoryImport/import/types";
import { DuplicateImportWarnings } from "../../duplicate/DuplicateImportWarnings";

type ImportUiPhase = "confirm" | "loading" | "success" | "error";

interface ImportConfirmationSectionProps {
  smartPreparation: SmartImportPreparationSummary;
  phase: ImportUiPhase;
  errorMessage: string | null;
  commitResult: ImportCommitResult | null;
  isDarkMode: boolean;
  onBackToCleaned: () => void;
  onConfirmImport: () => void;
  onGoToMarketplace: () => void;
  onGoToDraftInventory?: () => void;
  commitEnabled?: boolean;
  commitDisabledMessage?: string;
}

export function ImportConfirmationSection({
  smartPreparation: preparation,
  phase,
  errorMessage,
  commitResult,
  isDarkMode,
  onBackToCleaned,
  onConfirmImport,
  onGoToMarketplace,
  onGoToDraftInventory,
  commitEnabled = true,
  commitDisabledMessage,
}: ImportConfirmationSectionProps) {
  const border = isDarkMode ? "border-slate-800" : "border-slate-200";
  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800"
    : "bg-white border-slate-200";

  const canConfirm =
    preparation.importableCount > 0 && phase !== "loading" && commitEnabled;

  const stats = [
    { label: "แถวทั้งหมด", value: preparation.totalRows, color: "text-slate-200" },
    {
      label: "→ ตลาด",
      value: preparation.publishedCount,
      color: "text-green-400",
    },
    {
      label: "→ Draft",
      value: preparation.draftCount + preparation.needsReviewCount,
      color: "text-amber-400",
    },
    {
      label: "Rejected",
      value: preparation.rejectedCount,
      color: "text-red-400",
    },
    {
      label: "นำเข้ารวม",
      value: preparation.importableCount,
      color: "text-orange-400",
    },
  ];

  return (
    <div className={`rounded-2xl border overflow-hidden ${panel}`}>
      <div className={`p-5 sm:p-6 border-b ${border} space-y-4`}>
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="font-bold text-sm">Import Preview / Confirmation</h3>
            <p className="text-xs text-slate-400">
              Smart Import — เผยแพร่ {preparation.publishedCount} · Draft{" "}
              {preparation.draftCount + preparation.needsReviewCount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center"
            >
              <p className="text-[10px] text-slate-500">{s.label}</p>
              <p className={`text-lg font-black font-mono ${s.color}`}>
                {s.value.toLocaleString("th-TH")}
              </p>
            </div>
          ))}
        </div>

        {!commitEnabled && commitDisabledMessage && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{commitDisabledMessage}</span>
          </div>
        )}

        {phase !== "success" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onBackToCleaned}
              disabled={phase === "loading"}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Cleaned Data
            </button>
            <button
              type="button"
              onClick={onConfirmImport}
              disabled={!canConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {phase === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {commitEnabled ? "Confirm Import" : "นำเข้าสต๊อกจริง (ยังไม่เปิด)"}
            </button>
          </div>
        )}

        <AnimatePresence>
          {phase === "error" && errorMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
            >
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
          {phase === "success" && commitResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3"
            >
              <div className="flex items-center gap-2 text-green-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                นำเข้า Marketplace สำเร็จ!
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Published</span>
                  <p className="font-mono text-green-400 text-lg">
                    {commitResult.publishedCount ?? commitResult.importedCount}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Draft</span>
                  <p className="font-mono text-amber-400 text-lg">
                    {commitResult.draftCount ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">รวม</span>
                  <p className="font-mono text-slate-300 text-lg">
                    {commitResult.importedCount}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Skipped</span>
                  <p className="font-mono text-red-400 text-lg">
                    {commitResult.skippedCount}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Warning</span>
                  <p className="font-mono text-amber-400 text-lg">
                    {commitResult.warningCount}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Failed</span>
                  <p className="font-mono text-slate-400 text-lg">
                    {commitResult.errorCount}
                  </p>
                </div>
              </div>

              <DuplicateImportWarnings
                warnings={commitResult.duplicateWarnings}
                rowWarnings={commitResult.rowWarnings}
              />

              {commitResult.imageStats && (
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <ImageIcon className="w-4 h-4 text-orange-400" />
                    สถานะดาวน์โหลดรูปภาพ
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">URL ทั้งหมด</span>
                      <p className="font-mono text-slate-200">
                        {commitResult.imageStats.totalSourceUrls}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        ดาวน์โหลดสำเร็จ
                      </span>
                      <p className="font-mono text-green-400">
                        {commitResult.imageStats.downloaded}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">ล้มเหลว</span>
                      <p className="font-mono text-amber-400">
                        {commitResult.imageStats.failed}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">ไม่มีรูปในไฟล์</span>
                      <p className="font-mono text-slate-300">
                        {commitResult.imageStats.carsWithoutImages}
                        <span className="text-slate-500 text-[10px]"> คัน</span>
                      </p>
                    </div>
                  </div>
                  <ul className="max-h-36 overflow-y-auto space-y-1 text-[10px] text-slate-400">
                    {commitResult.imageStats.rows.map((row) => (
                      <li
                        key={`${row.carId}-${row.sourceRowIndex}`}
                        className="flex justify-between gap-2 border-b border-slate-800/40 py-0.5"
                      >
                        <span>
                          แถว #{row.sourceRowIndex}: ดาวน์โหลด {row.downloaded}/
                          {row.totalUrls}
                          {row.failed > 0 && (
                            <span className="text-amber-400"> (ล้ม {row.failed})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {commitResult.rowWarnings && commitResult.rowWarnings.length > 0 && (
                <details className="text-[10px] text-amber-300/90">
                  <summary className="cursor-pointer font-semibold">
                    คำเตือนรูป/ข้อมูล ({commitResult.rowWarnings.length} แถว)
                  </summary>
                  <ul className="mt-1 max-h-28 overflow-y-auto space-y-1 text-slate-400">
                    {commitResult.rowWarnings.slice(0, 20).map((rw) => (
                      <li key={rw.sourceRowIndex}>
                        #{rw.sourceRowIndex}: {rw.warnings.join(" · ")}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onGoToMarketplace}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
                >
                  <Car className="w-4 h-4" />
                  Marketplace →
                </button>
                {(commitResult.draftCount ?? 0) > 0 && onGoToDraftInventory && (
                  <button
                    type="button"
                    onClick={onGoToDraftInventory}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/10"
                  >
                    Draft Inventory →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "confirm" && (
        <div className="grid md:grid-cols-2 gap-0 md:divide-x divide-slate-800">
          <div className="p-4 sm:p-5">
            <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Publish + Draft ({preparation.importableCount})
            </h4>
            <ul className="max-h-48 overflow-y-auto space-y-1 text-[11px] text-slate-300">
              {[
                ...preparation.readyToPublish,
                ...preparation.draftRows,
                ...preparation.needsReview,
              ]
                .slice(0, 50)
                .map((r) => (
                  <li
                    key={r.sourceRowIndex}
                    className="flex justify-between gap-2 border-b border-slate-800/50 py-1"
                  >
                    <span className="font-mono text-slate-500">#{r.sourceRowIndex}</span>
                    <span className="truncate flex-1">{r.previewTitle}</span>
                    <span className="text-[10px] text-orange-400">{r.disposition}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="p-4 sm:p-5">
            <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
              <X className="w-3.5 h-3.5" />
              Rejected ({preparation.rejected.length})
            </h4>
            <ul className="max-h-48 overflow-y-auto space-y-1 text-[11px] text-slate-400">
              {preparation.rejected.length === 0 ? (
                <li className="text-slate-600">— ไม่มี —</li>
              ) : (
                preparation.rejected.slice(0, 30).map((s) => (
                  <li
                    key={s.sourceRowIndex}
                    className="border-b border-slate-800/50 py-1"
                  >
                    <span className="font-mono text-slate-500">#{s.sourceRowIndex}</span>{" "}
                    {s.previewTitle} — {s.reason}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
