import React from "react";
import { Palette, Check } from "lucide-react";
import {
  CarPostStyle,
  CAR_POST_STYLE_OPTIONS,
  DEFAULT_CAR_POST_STYLE,
} from "../../../services/ai/post-generator/postStyle";

interface CarPostStyleSelectorProps {
  value: CarPostStyle;
  onChange: (style: CarPostStyle) => void;
  isDarkMode?: boolean;
  compact?: boolean;
}

/**
 * เลือกสไตล์โพสต์ขายรถ — responsive (chip บนมือถือ, card บน desktop)
 */
export default function CarPostStyleSelector({
  value,
  onChange,
  isDarkMode = true,
  compact = false,
}: CarPostStyleSelectorProps) {
  const selected =
    CAR_POST_STYLE_OPTIONS.find((o) => o.id === value) ??
    CAR_POST_STYLE_OPTIONS.find((o) => o.id === DEFAULT_CAR_POST_STYLE)!;

  return (
    <div
      className={`space-y-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}
      role="group"
      aria-label="เลือกสไตล์โพสต์ขายรถ"
    >
      <div className="flex items-center gap-2 border-b border-orange-500/10 pb-2">
        <Palette className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="text-left min-w-0">
          <h4 className="text-xs font-extrabold text-orange-500">
            เลือกสไตล์โพสต์ขายรถ (ก่อนสร้างด้วย AI)
          </h4>
          {!compact && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              น้องเอจะปรับโทน ความยาว และ CTA ตามแนวที่เลือก — ค่าเริ่มต้น: Marketplace
            </p>
          )}
        </div>
      </div>

      {/* Mobile: horizontal scroll chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:hidden scrollbar-thin">
        {CAR_POST_STYLE_OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`shrink-0 px-3 py-2 rounded-full text-[10px] font-bold border transition flex items-center gap-1.5 ${
                active
                  ? "bg-orange-600/20 border-orange-500 text-orange-300"
                  : "bg-slate-900/60 border-white/10 text-slate-400"
              }`}
            >
              <span>{opt.emoji}</span>
              <span className="whitespace-nowrap">{opt.label}</span>
              {active && <Check className="w-3 h-3 text-orange-400" />}
            </button>
          );
        })}
      </div>

      {/* Desktop: card grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-2">
        {CAR_POST_STYLE_OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`p-3 rounded-xl text-left border transition flex items-start gap-2.5 ${
                active
                  ? "bg-orange-500/10 border-orange-500/60 ring-1 ring-orange-500/20"
                  : "bg-slate-900/40 border-white/5 hover:border-white/15 text-slate-400"
              }`}
            >
              <span className="text-lg shrink-0">{opt.emoji}</span>
              <div className="min-w-0 flex-1">
                <span
                  className={`text-[11px] font-extrabold block leading-tight ${
                    active ? "text-orange-300" : "text-slate-200"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[9.5px] text-slate-500 leading-snug block mt-0.5">
                  {opt.shortDesc}
                </span>
              </div>
              {active && (
                <Check className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 md:hidden">
        เลือกแล้ว: <span className="text-orange-400 font-bold">{selected.label}</span>
      </p>
    </div>
  );
}
