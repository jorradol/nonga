import React from "react";
import { AlertTriangle, Copy, CheckCircle2, GitMerge } from "lucide-react";
import type { DuplicateStatus } from "../../utils/duplicateDetection/types";

const CONFIG: Record<
  DuplicateStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  unique: {
    label: "ไม่ซ้ำ",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  possible_duplicate: {
    label: "อาจซ้ำ",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  duplicate_confirmed: {
    label: "ซ้ำยืนยัน",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: <Copy className="w-3 h-3" />,
  },
  merged: {
    label: "รวมแล้ว",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    icon: <GitMerge className="w-3 h-3" />,
  },
};

interface Props {
  status?: DuplicateStatus;
  score?: number;
  compact?: boolean;
}

export function DuplicateBadge({ status = "unique", score, compact }: Props) {
  if (status === "unique" && !score) return null;
  const cfg = CONFIG[status] ?? CONFIG.unique;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.className}`}
      title={score != null ? `คะแนนความซ้ำ ${score}/100` : undefined}
    >
      {cfg.icon}
      {!compact && cfg.label}
      {score != null && score > 0 ? ` ${score}` : ""}
    </span>
  );
}
