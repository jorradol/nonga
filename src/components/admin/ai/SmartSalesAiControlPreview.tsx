/**
 * v5.6J / v5.6J.1 — Read-only Smart Sales AI control preview (no persistence, no API).
 */

import {
  getDefaultAiControlConfig,
  getAiControlModeLabel,
  resolveAiControlConfig,
} from "../../../services/ai/aiControlConfig";
import type { AiControlMode } from "../../../services/ai/aiControlTypes";
import { AI_FLOW_TOGGLE_KEYS } from "../../../services/ai/aiControlTypes";
import {
  BUYER_LEAD_AI_TEXT_PARSE_ENABLED,
  NONGA_SMART_SALES_MODE,
} from "../../../services/leads/smartSalesMode";
import { AlertTriangle, Cpu, Lock, Shield } from "lucide-react";

const MODE_OPTIONS: AiControlMode[] = [
  "off",
  "economy",
  "balanced",
  "smart_sales",
  "full_ai",
];

export function SmartSalesAiControlPreview() {
  const config = getDefaultAiControlConfig();
  const envPreview = resolveAiControlConfig({});

  return (
    <section
      className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-4 text-left"
      data-testid="smart-sales-ai-control-preview"
      data-readonly="true"
      aria-label="Smart Sales AI Control Center preview"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-sm font-black text-white">
            Smart Sales AI Control Center
          </h2>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            แยกจากแผง &quot;แผงควบคุม AI Nong A&quot; (prompts/moods/skills) —
            นี่คือ Smart Sales revenue AI flags (foundation preview)
          </p>
        </div>
        <span
          className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full"
          data-testid="smart-sales-ai-control-readonly-badge"
        >
          <Lock className="w-3 h-3" />
          Preview / Read-only
        </span>
      </div>

      <p
        className="text-[11px] text-amber-100/90 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2"
        data-testid="smart-sales-ai-control-api-warning"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
        <span>
          การเพิ่มพลัง AI อาจเพิ่มค่า API จึงต้องเปิดผ่าน SuperAdmin และ guardrails
          เท่านั้น — รอบนี้ยังไม่บันทึกค่าและไม่เรียก Gemini
        </span>
      </p>

      <div className="rounded-lg border border-red-500/25 bg-red-950/30 px-3 py-2 text-[11px] text-red-200/90">
        <span className="font-bold text-red-300">full_ai</span> ยังถูกปิดในรอบนี้
        (blocked ใน runtime assert) — ไม่ใช่ค่าเริ่มต้น
      </div>

      <div className="space-y-2">
        <label
          htmlFor="smart-sales-ai-mode-preview"
          className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
        >
          Mode (preview — disabled)
        </label>
        <select
          id="smart-sales-ai-mode-preview"
          className="w-full max-w-xs rounded-lg border border-white/10 bg-black/40 text-[11px] text-slate-400 px-3 py-2 cursor-not-allowed opacity-70"
          value={config.mode}
          disabled
          aria-disabled="true"
          data-testid="smart-sales-ai-control-mode-select"
        >
          {MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} — {getAiControlModeLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div className="rounded-lg bg-black/30 border border-white/5 p-3">
          <dt className="text-slate-500 font-bold uppercase tracking-wide">
            Current default mode
          </dt>
          <dd
            className="text-white font-semibold mt-1"
            data-testid="smart-sales-ai-control-default-mode"
          >
            {config.mode} — {getAiControlModeLabel(config.mode)}
          </dd>
        </div>
        <div className="rounded-lg bg-black/30 border border-white/5 p-3">
          <dt className="text-slate-500 font-bold uppercase tracking-wide">
            Compile-time flags
          </dt>
          <dd className="text-slate-300 mt-1 font-mono">
            NONGA_SMART_SALES_MODE={NONGA_SMART_SALES_MODE}
            <br />
            BUYER_LEAD_AI_TEXT_PARSE_ENABLED=
            {String(BUYER_LEAD_AI_TEXT_PARSE_ENABLED)}
          </dd>
        </div>
        <div className="rounded-lg bg-black/30 border border-white/5 p-3 sm:col-span-2">
          <dt className="text-slate-500 font-bold uppercase tracking-wide mb-2">
            Flow toggles (preview — all disabled)
          </dt>
          <dd className="flex flex-wrap gap-2">
            {AI_FLOW_TOGGLE_KEYS.map((key) => (
              <label
                key={key}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-600 text-slate-500 bg-slate-900/50 cursor-not-allowed opacity-60"
              >
                <input
                  type="checkbox"
                  checked={envPreview.flows[key]}
                  disabled
                  readOnly
                  className="pointer-events-none"
                  data-testid={`smart-sales-ai-flow-${key}`}
                />
                <span className="text-[10px] font-mono">
                  {key}: {envPreview.flows[key] ? "on" : "off"}
                </span>
              </label>
            ))}
          </dd>
        </div>
      </dl>

      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-amber-400" />
        Rollback: ตั้งโหมด economy/off + fallbackToTemplate — ไม่กระทบ lead submit /
        reveal / pending sale
      </p>
    </section>
  );
}

export default SmartSalesAiControlPreview;
