import React from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { SmartImportPreparationSummary } from "../../../utils/inventoryImport/import/types";

interface SmartImportReviewSectionProps {
  preparation: SmartImportPreparationSummary;
  isDarkMode: boolean;
  onBack: () => void;
  onContinueConfirm: () => void;
}

function RowList({
  rows,
  emptyText,
}: {
  rows: { sourceRowIndex: number; previewTitle: string; confidenceScore: number; missingFields: string[] }[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="text-[11px] text-slate-500">{emptyText}</p>;
  }
  return (
    <ul className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
      {rows.map((r) => (
        <li
          key={r.sourceRowIndex}
          className="flex justify-between gap-2 border-b border-slate-800/50 py-1"
        >
          <span className="font-mono text-slate-500 shrink-0">#{r.sourceRowIndex}</span>
          <span className="truncate flex-1 text-slate-300">{r.previewTitle}</span>
          <span className="font-mono text-orange-400/80 shrink-0">{r.confidenceScore}%</span>
        </li>
      ))}
    </ul>
  );
}

export function SmartImportReviewSection({
  preparation,
  isDarkMode,
  onBack,
  onContinueConfirm,
}: SmartImportReviewSectionProps) {
  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800"
    : "bg-white border-slate-200";

  const canContinue = preparation.importableCount > 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${panel}`}>
      <div className="p-5 sm:p-6 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className="font-bold text-sm">Smart Import Review</h3>
            <p className="text-xs text-slate-400">
              AI Smart Detection — จัดกลุ่มตามความครบของข้อมูลและคะแนนความมั่นใจ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-[10px] text-slate-500">Publish</p>
            <p className="text-lg font-black text-green-400">
              {preparation.publishedCount}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] text-slate-500">Draft</p>
            <p className="text-lg font-black text-amber-400">
              {preparation.draftCount}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-[10px] text-slate-500">Review</p>
            <p className="text-lg font-black text-orange-300">
              {preparation.needsReviewCount}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[10px] text-slate-500">Rejected</p>
            <p className="text-lg font-black text-red-400">
              {preparation.rejectedCount}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs hover:bg-slate-800"
          >
            กลับ Cleaned Data
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinueConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold disabled:opacity-40"
          >
            Continue to Confirm
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-0 md:divide-x divide-slate-800">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 sm:p-5"
        >
          <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready to Publish ({preparation.readyToPublish.length})
          </h4>
          <p className="text-[10px] text-slate-500 mb-2">
            ครบ brand, model, year, price — ขึ้นตลาดทันที
          </p>
          <RowList rows={preparation.readyToPublish} emptyText="— ไม่มี —" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="p-4 sm:p-5"
        >
          <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
            <FileEdit className="w-3.5 h-3.5" />
            Draft / Needs Info ({preparation.draftRows.length + preparation.needsReview.length})
          </h4>
          <p className="text-[10px] text-slate-500 mb-2">
            เข้าคลัง Draft — แก้ไขและ Publish ภายหลัง
          </p>
          <RowList
            rows={[...preparation.draftRows, ...preparation.needsReview]}
            emptyText="— ไม่มี —"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 sm:p-5"
        >
          <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Rejected ({preparation.rejected.length})
          </h4>
          <p className="text-[10px] text-slate-500 mb-2">แถวว่างหรือไม่ใช่ข้อมูลรถ</p>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-[11px] text-slate-500">
            {preparation.rejected.length === 0 ? (
              <li>— ไม่มี —</li>
            ) : (
              preparation.rejected.map((r) => (
                <li key={r.sourceRowIndex} className="border-b border-slate-800/40 py-1">
                  #{r.sourceRowIndex} {r.previewTitle}
                  {r.reason && (
                    <span className="text-red-400/80"> — {r.reason}</span>
                  )}
                </li>
              ))
            )}
          </ul>
          {preparation.needsReview.length > 0 && (
            <p className="mt-3 text-[10px] text-orange-300/90 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              แถว Needs Review เก็บใน Draft จนกว่าจะตรวจและเติมข้อมูล
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
