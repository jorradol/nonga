import React from "react";
import { Layers, CheckCircle2 } from "lucide-react";
import {
  INVENTORY_IMPORT_FIELD_KEYS,
  INVENTORY_IMPORT_FIELD_LABELS,
  type NormalizedInventoryRow,
} from "../../../utils/inventoryImport/inventoryImportSchema";

interface NormalizePreviewSectionProps {
  rows: NormalizedInventoryRow[];
  totalSourceRows: number;
  mappedFieldCount: number;
  isDarkMode: boolean;
}

const DISPLAY_FIELDS = INVENTORY_IMPORT_FIELD_KEYS.filter((k) => k !== "ignore");

export function NormalizePreviewSection({
  rows,
  totalSourceRows,
  mappedFieldCount,
  isDarkMode,
}: NormalizePreviewSectionProps) {
  const activeFields = DISPLAY_FIELDS.filter((field) =>
    rows.some((r) => (r[field] ?? "").trim().length > 0)
  );

  const columns = activeFields.length > 0 ? activeFields : DISPLAY_FIELDS.slice(0, 8);
  const border = isDarkMode ? "border-slate-800" : "border-slate-200";

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className={`p-5 sm:p-6 border-b ${border}`}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="font-bold text-sm">Normalize Preview</h3>
            <p className="text-xs text-slate-400">
              ตัวอย่าง {rows.length} แถวแรก ในรูปแบบ schema กลาง · จากทั้งหมด{" "}
              {totalSourceRows.toLocaleString("th-TH")} แถว · map แล้ว{" "}
              {mappedFieldCount} field
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ยังไม่บันทึกข้อมูลจริง — Phase 3 จะนำเข้า marketplace
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px] sm:text-[11px] min-w-[800px]">
          <thead>
            <tr className={`${isDarkMode ? "bg-slate-900/80 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
              <th className="px-3 py-2.5 font-semibold w-8 sticky left-0 bg-inherit">#</th>
              {columns.map((field) => (
                <th
                  key={field}
                  className="px-3 py-2.5 font-semibold whitespace-nowrap"
                  title={INVENTORY_IMPORT_FIELD_LABELS[field]}
                >
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={`border-t ${border}`}>
                <td className={`px-3 py-2 font-mono text-slate-500 sticky left-0 ${isDarkMode ? "bg-slate-950/95" : "bg-white"}`}>
                  {idx + 1}
                </td>
                {columns.map((field) => (
                  <td
                    key={field}
                    className="px-3 py-2 text-slate-300 max-w-[180px] truncate"
                    title={row[field] ?? ""}
                  >
                    {row[field] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
