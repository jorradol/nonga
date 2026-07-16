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
  /** Kept for caller compatibility; colors use semantic tokens via `.dark`. */
  isDarkMode?: boolean;
  compact?: boolean;
}

/**
 * เลือกสไตล์โพสต์ขายรถ — responsive (chip บนมือถือ, card บน desktop)
 */
export default function CarPostStyleSelector({
  value,
  onChange,
  compact = false,
}: CarPostStyleSelectorProps) {
  const selected =
    CAR_POST_STYLE_OPTIONS.find((o) => o.id === value) ??
    CAR_POST_STYLE_OPTIONS.find((o) => o.id === DEFAULT_CAR_POST_STYLE)!;

  return (
    <div
      className="space-y-3 nonga-text-primary"
      role="group"
      aria-label="เลือกสไตล์โพสต์ขายรถ"
    >
      <div className="flex items-center gap-2 border-b nonga-border pb-2">
        <Palette className="w-4 h-4 text-[var(--nonga-brand)] shrink-0" />
        <div className="text-left min-w-0">
          <h4 className="text-xs font-extrabold text-[var(--nonga-action-primary)]">
            เลือกสไตล์โพสต์ขายรถ (ก่อนสร้างด้วย AI)
          </h4>
          {!compact && (
            <p className="text-[10px] nonga-text-secondary mt-0.5">
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
              className={`shrink-0 px-3 py-2 rounded-full text-[10px] font-bold border transition flex items-center gap-1.5 nonga-focus-ring ${
                active
                  ? "bg-[color-mix(in_srgb,var(--nonga-brand)_14%,var(--nonga-bg-surface))] border-[var(--nonga-brand)] text-[var(--nonga-action-primary)]"
                  : "nonga-bg-subtle border nonga-border nonga-text-secondary hover:border-[var(--nonga-border-strong)]"
              }`}
            >
              <span>{opt.emoji}</span>
              <span className="whitespace-nowrap">{opt.label}</span>
              {active && <Check className="w-3 h-3 text-[var(--nonga-brand)]" />}
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
              className={`p-3 rounded-xl text-left border transition flex items-start gap-2.5 nonga-focus-ring ${
                active
                  ? "bg-[color-mix(in_srgb,var(--nonga-brand)_8%,var(--nonga-bg-surface))] border-[var(--nonga-brand)] ring-1 ring-[color-mix(in_srgb,var(--nonga-brand)_35%,transparent)]"
                  : "nonga-bg-subtle border nonga-border hover:border-[var(--nonga-border-strong)] nonga-text-secondary"
              }`}
            >
              <span className="text-lg shrink-0">{opt.emoji}</span>
              <div className="min-w-0 flex-1">
                <span
                  className={`text-[11px] font-extrabold block leading-tight ${
                    active
                      ? "text-[var(--nonga-action-primary)]"
                      : "nonga-text-primary"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[9.5px] nonga-text-muted leading-snug block mt-0.5">
                  {opt.shortDesc}
                </span>
              </div>
              {active && (
                <Check className="w-4 h-4 text-[var(--nonga-brand)] shrink-0 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] nonga-text-muted md:hidden">
        เลือกแล้ว:{" "}
        <span className="text-[var(--nonga-action-primary)] font-bold">
          {selected.label}
        </span>
      </p>
    </div>
  );
}
