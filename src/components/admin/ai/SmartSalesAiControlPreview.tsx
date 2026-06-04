/**
 * v5.6J — Read-only SuperAdmin preview (NOT wired to dashboard until review).
 * Import manually in a future release; default export unused in v5.6J.
 */

import {
  getDefaultAiControlConfig,
  getAiControlModeLabel,
  resolveAiControlConfig,
} from "../../../services/ai/aiControlConfig";
import { AI_FLOW_TOGGLE_KEYS } from "../../../services/ai/aiControlTypes";
import {
  BUYER_LEAD_AI_TEXT_PARSE_ENABLED,
  NONGA_SMART_SALES_MODE,
} from "../../../services/leads/smartSalesMode";
import { Shield, Cpu, Lock } from "lucide-react";

export function SmartSalesAiControlPreview() {
  const config = getDefaultAiControlConfig();
  const envPreview = resolveAiControlConfig({});

  return (
    <section
      className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-4 text-left"
      data-testid="smart-sales-ai-control-preview"
      data-readonly="true"
    >
      <div className="flex items-start gap-3">
        <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <h2 className="text-sm font-black text-white">
            Smart Sales AI Control — Foundation Preview (v5.6J)
          </h2>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            โหมดอ่านอย่างเดียว — ยังไม่บันทึกค่า ไม่เปิด Gemini เพิ่ม ค่าเริ่มต้นยังเป็น economy/off
          </p>
        </div>
        <span className="ml-auto shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
          <Lock className="w-3 h-3" />
          READ ONLY
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div className="rounded-lg bg-black/30 border border-white/5 p-3">
          <dt className="text-slate-500 font-bold uppercase tracking-wide">
            Default mode
          </dt>
          <dd className="text-white font-semibold mt-1">
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
            Flow toggles (preview)
          </dt>
          <dd className="flex flex-wrap gap-2">
            {AI_FLOW_TOGGLE_KEYS.map((key) => (
              <span
                key={key}
                className={`px-2 py-0.5 rounded border text-[10px] font-mono ${
                  envPreview.flows[key]
                    ? "border-green-500/30 text-green-300 bg-green-500/10"
                    : "border-slate-600 text-slate-500 bg-slate-900/50"
                }`}
              >
                {key}: {envPreview.flows[key] ? "on" : "off"}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-amber-400" />
        Rollback: ตั้งโหมด economy/off + fallbackToTemplate — ไม่กระทบ lead submit / reveal /
        pending sale
      </p>
    </section>
  );
}

export default SmartSalesAiControlPreview;
