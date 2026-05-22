import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  CleanedInventoryRow,
  CleaningSummary,
} from "../../../utils/inventoryImport/cleaning/types";
import { INVENTORY_IMPORT_FIELD_LABELS } from "../../../utils/inventoryImport/inventoryImportSchema";

interface CleanedDataPreviewSectionProps {
  previewRows: CleanedInventoryRow[];
  summary: CleaningSummary;
  isDarkMode: boolean;
  onBackToMapping: () => void;
  onRenormalize: () => void;
  onPrepareImport: () => void;
  prepareDisabled?: boolean;
}

const PREVIEW_FIELDS = [
  "brand",
  "model",
  "year",
  "price",
  "mileage",
  "color",
  "fuelType",
  "gear",
  "imageUrls",
] as const;

function StatusBadge({ status }: { status: CleanedInventoryRow["status"] }) {
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold border border-green-500/30">
        <CheckCircle2 className="w-3 h-3" />
        ผ่าน
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30">
        <AlertTriangle className="w-3 h-3" />
        warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 text-[10px] font-bold border border-red-500/30">
      <XCircle className="w-3 h-3" />
      error
    </span>
  );
}

export function CleanedDataPreviewSection({
  previewRows,
  summary,
  isDarkMode,
  onBackToMapping,
  onRenormalize,
  onPrepareImport,
  prepareDisabled = false,
}: CleanedDataPreviewSectionProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const border = isDarkMode ? "border-slate-800" : "border-slate-200";
  const panel = isDarkMode
    ? "bg-slate-950/80 border-slate-800"
    : "bg-white border-slate-200";

  const statCards = [
    { label: "แถวทั้งหมด", value: summary.totalRows, color: "text-slate-200" },
    { label: "Publish", value: summary.publishedCount ?? 0, color: "text-green-400" },
    { label: "Draft", value: summary.draftCount ?? 0, color: "text-amber-400" },
    { label: "Review", value: summary.needsReviewCount ?? 0, color: "text-orange-300" },
    { label: "Rejected", value: summary.rejectedCount ?? 0, color: "text-red-400" },
  ];

  return (
    <div className={`rounded-2xl border overflow-hidden ${panel}`}>
      <div className={`p-5 sm:p-6 border-b ${border} space-y-4`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="font-bold text-sm">
              Smart Clean & Validate
            </h3>
            <p className="text-xs text-slate-400">
              ตัวอย่าง {previewRows.length} แถว · Publish {summary.publishedCount ?? 0} ·
              Draft {summary.draftCount ?? 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center"
            >
              <p className="text-[10px] text-slate-500 uppercase">{s.label}</p>
              <p className={`text-lg font-black font-mono ${s.color}`}>
                {s.value.toLocaleString("th-TH")}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBackToMapping}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs font-semibold hover:bg-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Mapping
          </button>
          <button
            type="button"
            onClick={onRenormalize}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-500/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-normalize
          </button>
          <button
            type="button"
            onClick={onPrepareImport}
            disabled={prepareDisabled || summary.readyToImportCount === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Package className="w-3.5 h-3.5" />
            Prepare Import
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px] sm:text-[11px] min-w-[900px]">
          <thead>
            <tr
              className={
                isDarkMode
                  ? "bg-slate-900/80 text-slate-400"
                  : "bg-slate-100 text-slate-600"
              }
            >
              <th className="px-3 py-2.5 font-semibold w-8">#</th>
              <th className="px-3 py-2.5 font-semibold w-24">สถานะ</th>
              {PREVIEW_FIELDS.map((f) => (
                <th key={f} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                  {f}
                </th>
              ))}
              <th className="px-3 py-2.5 font-semibold w-16">Issues</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => {
              const isExpanded = expandedRow === row.rowIndex;
              const rowBg =
                row.status === "error"
                  ? "bg-red-500/5"
                  : row.status === "warning"
                    ? "bg-amber-500/5"
                    : "";

              return (
                <React.Fragment key={row.rowIndex}>
                  <tr className={`border-t ${border} ${rowBg}`}>
                    <td className="px-3 py-2 font-mono text-slate-500">
                      {row.rowIndex}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    {PREVIEW_FIELDS.map((f) => (
                      <td
                        key={f}
                        className="px-3 py-2 text-slate-300 max-w-[140px] truncate"
                        title={row.data[f] ?? ""}
                      >
                        {row.data[f] || "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {row.issues.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRow(isExpanded ? null : row.rowIndex)
                          }
                          className="text-orange-400 hover:text-orange-300 flex items-center gap-0.5"
                        >
                          {row.issues.length}
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && row.issues.length > 0 && (
                    <tr className={`border-t ${border} ${rowBg}`}>
                      <td colSpan={PREVIEW_FIELDS.length + 3} className="px-4 py-2">
                        <ul className="space-y-1 text-[11px]">
                          {row.issues.map((iss, i) => (
                            <li
                              key={`${iss.code}-${i}`}
                              className={
                                iss.level === "error"
                                  ? "text-red-300"
                                  : "text-amber-300"
                              }
                            >
                              [{iss.level}] {iss.message}
                              {iss.field
                                ? ` (${INVENTORY_IMPORT_FIELD_LABELS[iss.field]})`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {summary.totalRows > previewRows.length && (
        <p className={`p-4 text-center text-[11px] text-slate-500 border-t ${border}`}>
          สรุปจากทั้งหมด {summary.totalRows.toLocaleString("th-TH")} แถว — แสดงตัวอย่าง{" "}
          {previewRows.length} แถว
        </p>
      )}
    </div>
  );
}
