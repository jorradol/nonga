import React, { memo, useCallback } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  CarPostRegenerateMode,
  REGENERATE_MODE_OPTIONS,
} from "../../../services/ai/post-generator/regenerateStyle";

const COOLDOWN_MS = 1200;

interface CarPostRegenerateActionsProps {
  onRegenerate: (mode: CarPostRegenerateMode) => void;
  isRegenerating?: boolean;
  disabled?: boolean;
  activeMode?: CarPostRegenerateMode | null;
  compact?: boolean;
}

function CarPostRegenerateActionsComponent({
  onRegenerate,
  isRegenerating = false,
  disabled = false,
  activeMode = null,
  compact = false,
}: CarPostRegenerateActionsProps) {
  const handleClick = useCallback(
    (mode: CarPostRegenerateMode) => {
      if (disabled || isRegenerating) return;
      onRegenerate(mode);
    },
    [disabled, isRegenerating, onRegenerate]
  );

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm ${
        compact ? "p-3 space-y-2" : "p-4 space-y-3"
      }`}
      role="group"
      aria-label="สร้างโพสต์ใหม่"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
          {isRegenerating ? (
            <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-orange-400" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <h4 className="text-xs font-extrabold text-slate-100">
            สร้างโพสต์ใหม่ (Regenerate)
          </h4>
          <p className="text-[10px] text-slate-500">
            ใช้ข้อมูลเดิม — ไม่ต้องกรอกใหม่
          </p>
        </div>
      </div>

      {/* Mobile: 2-column grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {REGENERATE_MODE_OPTIONS.map((opt) => {
          const isActive = activeMode === opt.id;
          const isBusy = isRegenerating && isActive;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled || isRegenerating}
              onClick={() => handleClick(opt.id)}
              className={`px-2.5 py-2.5 rounded-xl text-left border text-[10px] font-bold transition flex items-center gap-2 min-h-[44px] ${
                isBusy
                  ? "bg-orange-500/15 border-orange-500/50 text-orange-300"
                  : isActive
                  ? "bg-orange-500/10 border-orange-500/40 text-orange-200"
                  : disabled || isRegenerating
                  ? "bg-slate-950/40 border-white/5 text-slate-600 cursor-not-allowed opacity-60"
                  : "bg-slate-950/60 border-white/8 text-slate-300 hover:border-orange-500/30 hover:bg-slate-900 cursor-pointer active:scale-[0.98]"
              }`}
              title={opt.label}
            >
              <span className="text-base shrink-0">{opt.emoji}</span>
              <span className="leading-tight">{opt.shortLabel}</span>
              {isBusy && (
                <RefreshCw className="w-3 h-3 ml-auto animate-spin shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {isRegenerating && (
        <p className="text-[10px] text-orange-400/90 text-center animate-pulse">
          น้องเอกำลังร่างโพสต์แนวใหม่ให้ครับ...
        </p>
      )}
    </div>
  );
}

export default memo(CarPostRegenerateActionsComponent);

export { COOLDOWN_MS };
