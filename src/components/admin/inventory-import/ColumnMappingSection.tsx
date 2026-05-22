import React from "react";
import { GitMerge, AlertTriangle, RotateCcw, Wand2, ArrowRight } from "lucide-react";
import type { ColumnMappingEntry, DuplicateMappingWarning } from "../../../utils/inventoryImport/columnMapping";
import {
  INVENTORY_IMPORT_FIELD_KEYS,
  INVENTORY_IMPORT_FIELD_LABELS,
  type InventoryImportFieldKey,
} from "../../../utils/inventoryImport/inventoryImportSchema";

interface ColumnMappingSectionProps {
  entries: ColumnMappingEntry[];
  duplicateWarnings: DuplicateMappingWarning[];
  onMappingChange: (column: string, field: InventoryImportFieldKey) => void;
  onResetMapping: () => void;
  onApplyAutoMapping: () => void;
  onContinueNormalize: () => void;
  isDarkMode: boolean;
}

export function ColumnMappingSection({
  entries,
  duplicateWarnings,
  onMappingChange,
  onResetMapping,
  onApplyAutoMapping,
  onContinueNormalize,
  isDarkMode,
}: ColumnMappingSectionProps) {
  const border = isDarkMode ? "border-slate-800" : "border-slate-200";

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className={`p-5 sm:p-6 border-b ${border} space-y-3`}>
        <div className="flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-teal-400" />
          <div>
            <h3 className="font-bold text-sm">Column Mapping (Phase 2)</h3>
            <p className="text-xs text-slate-400">
              จับคู่คอลัมน์จากไฟล์เต็นท์ → schema กลาง Nong A
            </p>
          </div>
        </div>
        <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          ระบบนี้ยังเป็นการจัด mapping เบื้องต้น ก่อนนำเข้าข้อมูลจริง — ยังไม่บันทึกลง marketplace หรือ Firestore
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApplyAutoMapping}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600/20 border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-600/30"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Apply Auto Mapping
          </button>
          <button
            type="button"
            onClick={onResetMapping}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-xs font-semibold hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Mapping
          </button>
          <button
            type="button"
            onClick={onContinueNormalize}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-bold"
          >
            Continue to Clean & Validate
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {duplicateWarnings.length > 0 && (
        <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            พบ field ที่ map ซ้ำกัน (ยังดำเนินการต่อได้)
          </div>
          <ul className="list-disc list-inside text-amber-200/90 space-y-0.5">
            {duplicateWarnings.map((w) => (
              <li key={w.field}>
                <span className="font-mono text-amber-300">{w.field}</span>
                {" ← "}
                {w.columns.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] sm:text-xs min-w-[720px]">
          <thead>
            <tr className={`${isDarkMode ? "bg-slate-900/80 text-slate-400" : "bg-slate-100 text-slate-600"} uppercase tracking-wide`}>
              <th className="px-4 py-3 font-semibold">Original Column</th>
              <th className="px-4 py-3 font-semibold">Sample Value</th>
              <th className="px-4 py-3 font-semibold">Suggested</th>
              <th className="px-4 py-3 font-semibold">Final Mapping</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isDuplicateTarget = duplicateWarnings.some(
                (w) =>
                  w.field === entry.finalMapping &&
                  w.columns.includes(entry.originalColumn)
              );
              return (
                <tr
                  key={entry.originalColumn}
                  className={`border-t ${border} ${isDuplicateTarget ? "bg-amber-500/5" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-orange-300/90 max-w-[160px] truncate" title={entry.originalColumn}>
                    {entry.originalColumn}
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate" title={entry.sampleValue}>
                    {entry.sampleValue}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px]">
                      {entry.suggestedMapping}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry.finalMapping}
                      onChange={(e) =>
                        onMappingChange(
                          entry.originalColumn,
                          e.target.value as InventoryImportFieldKey
                        )
                      }
                      className={`w-full max-w-[220px] px-2 py-1.5 rounded-lg border text-xs font-medium ${
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      {INVENTORY_IMPORT_FIELD_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {INVENTORY_IMPORT_FIELD_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
