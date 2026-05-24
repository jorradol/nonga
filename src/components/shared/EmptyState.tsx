import React from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4 ${className}`}
    >
      <div className="w-14 h-14 mx-auto rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-2 max-w-md mx-auto">
        <h2 className="font-bold text-base sm:text-lg text-slate-100">{title}</h2>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{description}</p>
      </div>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-5 py-2.5 min-h-[44px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-5 py-2.5 min-h-[44px] border border-slate-600 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
