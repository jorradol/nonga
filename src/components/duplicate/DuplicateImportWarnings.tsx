import React from "react";
import { AlertTriangle } from "lucide-react";

interface DuplicateWarningRow {
  id: string;
  bucket: string;
  warnings: string[];
}

interface Props {
  warnings?: DuplicateWarningRow[];
  rowWarnings?: { sourceRowIndex: number; warnings: string[] }[];
}

export function DuplicateImportWarnings({ warnings, rowWarnings }: Props) {
  const dupRows =
    rowWarnings?.filter((r) =>
      r.warnings.some((w) => w.includes("[รถซ้ำ]") || w.includes("ซ้ำ"))
    ) ?? [];

  if ((!warnings || warnings.length === 0) && dupRows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
        <AlertTriangle className="w-4 h-4" />
        ตรวจพบรถที่อาจซ้ำ — ไม่ได้บล็อกการนำเข้า
      </div>
      <p className="text-xs text-amber-200/80">
        ระบบ mark เป็น possible_duplicate แล้ว กรุณาตรวจสอบใน Dealer Portal
        หรือ Admin ก่อนเผยแพร่
      </p>
      {warnings?.map((w) => (
        <div key={w.id} className="text-xs text-amber-100/90">
          <span className="font-mono text-amber-400">{w.id}</span> ({w.bucket})
          <ul className="list-disc list-inside ml-2">
            {w.warnings.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      ))}
      {dupRows.map((r) => (
        <div key={r.sourceRowIndex} className="text-xs text-amber-100/90">
          แถว {r.sourceRowIndex}: {r.warnings.join("; ")}
        </div>
      ))}
    </div>
  );
}
