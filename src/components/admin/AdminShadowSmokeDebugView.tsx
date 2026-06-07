import { useCallback, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  FlaskConical,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "../../store";
import {
  ADMIN_SHADOW_SMOKE_CASE_IDS,
  ADMIN_SHADOW_SMOKE_CASE_LABELS,
  type AdminShadowSmokeApiResponse,
  type AdminShadowSmokeCaseId,
  runAdminShadowSmokeCase,
} from "../../services/ai/adminShadowSmokeApi";

function FlagBadge({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | boolean;
  tone?: "ok" | "warn" | "neutral";
}) {
  const display = typeof value === "boolean" ? (value ? "true" : "false") : value;
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "border-slate-500/30 bg-slate-500/10 text-slate-300";

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-left ${toneClass}`}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{display}</div>
    </div>
  );
}

export default function AdminShadowSmokeDebugView() {
  const { isDarkMode, setView } = useAppStore();
  const [activeCaseId, setActiveCaseId] = useState<AdminShadowSmokeCaseId | null>(null);
  const [loadingCaseId, setLoadingCaseId] = useState<AdminShadowSmokeCaseId | null>(null);
  const [result, setResult] = useState<AdminShadowSmokeApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCase = useCallback(async (caseId: AdminShadowSmokeCaseId) => {
    setActiveCaseId(caseId);
    setLoadingCaseId(caseId);
    setError(null);
    setResult(null);
    try {
      const response = await runAdminShadowSmokeCase(caseId);
      setResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เรียก shadow smoke ไม่สำเร็จ");
    } finally {
      setLoadingCaseId(null);
    }
  }, []);

  const cardClass = isDarkMode
    ? "rounded-2xl border border-white/[0.08] bg-white/[0.03]"
    : "rounded-2xl border border-slate-200 bg-white";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10 text-left">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setView("admin-dashboard")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-orange-400"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับแผง Admin
          </button>
          <h1 className="flex items-center gap-2 font-display text-2xl font-black">
            <FlaskConical className="h-7 w-7 text-violet-400" />
            AI Shadow Smoke (Read-only)
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            แผง debug สำหรับ admin/superadmin เท่านั้น — เรียก synthetic cases SS-01..SS-08
            ผ่าน server-side mock evaluation ไม่มีช่องกรอกข้อความเอง, ไม่มี paid Gemini, และไม่เปลี่ยน
            user-visible chat
          </p>
        </div>
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
            isDarkMode
              ? "border-violet-500/20 bg-violet-500/10 text-violet-200"
              : "border-violet-200 bg-violet-50 text-violet-800"
          }`}
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Admin-only · readOnly · userVisibleOff · providerNetwork false · mock provider only
          </span>
        </div>
      </div>

      <div
        className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
          isDarkMode
            ? "border-amber-500/20 bg-amber-500/5 text-amber-100"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="space-y-1">
          <p className="font-semibold">Safety notice</p>
          <p className="text-xs leading-relaxed opacity-90">
            ใช้ปุ่ม fixed cases เท่านั้น — ห้ามกรอกข้อความเอง, ห้ามอัปโหลดไฟล์, ห้ามใส่ข้อมูลลูกค้า/สต๊อกจริง.
            ผลลัพธ์เป็น redacted debug payload ไม่ใช่ AI response ที่ผู้ใช้เห็นในแชท
          </p>
        </div>
      </div>

      <section className={`${cardClass} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Synthetic smoke cases
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ADMIN_SHADOW_SMOKE_CASE_IDS.map((caseId) => {
            const busy = loadingCaseId === caseId;
            const selected = activeCaseId === caseId;
            return (
              <button
                key={caseId}
                type="button"
                disabled={busy}
                onClick={() => void runCase(caseId)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  selected
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-100"
                    : isDarkMode
                      ? "border-white/10 bg-white/[0.02] hover:border-violet-500/30 hover:bg-violet-500/10"
                      : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50"
                } ${busy ? "opacity-60" : ""}`}
              >
                <div className="font-mono text-xs font-black text-violet-400">{caseId}</div>
                <div className="mt-1 text-[11px] leading-snug text-slate-400">
                  {ADMIN_SHADOW_SMOKE_CASE_LABELS[caseId]}
                </div>
                {busy && (
                  <div className="mt-2 text-[10px] font-semibold text-orange-400">Running…</div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <section className={`${cardClass} space-y-4 p-5`}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Redacted result — {result.data.caseId}
          </h2>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FlagBadge label="success" value={result.success} tone="ok" />
            <FlagBadge label="readOnly" value={result.readOnly} tone="ok" />
            <FlagBadge label="userVisibleOff" value={result.userVisibleOff} tone="ok" />
            <FlagBadge label="providerNetwork" value={result.providerNetwork} tone="warn" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlagBadge label="shadowModeActive" value={result.data.shadowModeActive} />
            <FlagBadge
              label="shadowEvaluationAllowed"
              value={result.data.shadowEvaluationAllowed}
            />
            <FlagBadge
              label="provider"
              value={result.data.shadowDebugResult?.provider ?? "mock"}
              tone="ok"
            />
            <FlagBadge label="caseId" value={result.data.caseId} />
          </div>

          {result.data.runtimeFlagsSummary && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                runtimeFlagsSummary
              </div>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
                {result.data.runtimeFlagsSummary}
              </pre>
            </div>
          )}

          {(result.data.skippedReason || result.data.enablementBlockedReason) && (
            <div className="space-y-2 text-xs text-amber-200">
              {result.data.skippedReason && (
                <p>
                  <span className="font-semibold">skippedReason:</span> {result.data.skippedReason}
                </p>
              )}
              {result.data.enablementBlockedReason && (
                <p>
                  <span className="font-semibold">enablementBlockedReason:</span>{" "}
                  {result.data.enablementBlockedReason}
                </p>
              )}
              {result.data.userVisibleBlockedReason && (
                <p>
                  <span className="font-semibold">userVisibleBlockedReason:</span>{" "}
                  {result.data.userVisibleBlockedReason}
                </p>
              )}
            </div>
          )}

          {result.data.shadowDebugResult && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                shadowDebugResult (mock metadata)
              </div>
              <pre className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-300">
                {JSON.stringify(
                  {
                    salesBrainIntent: result.data.shadowDebugResult.salesBrainIntent,
                    legacyRouteLabel: result.data.shadowDebugResult.legacyRouteLabel,
                    routesAlign: result.data.shadowDebugResult.routesAlign,
                    provider: result.data.shadowDebugResult.provider,
                    routedVia: result.data.shadowDebugResult.routedVia,
                    selectedCapabilities: result.data.shadowDebugResult.selectedCapabilities,
                    safetyDecision: result.data.shadowDebugResult.safetyDecision,
                    paramsHash: result.data.shadowDebugResult.paramsHash,
                    comparisonNotes: result.data.shadowDebugResult.comparisonNotes,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          <div className="rounded-lg border border-dashed border-slate-600/40 p-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-400">legacy reference (unchanged): </span>
            {result.data.userVisibleResponse}
          </div>
        </section>
      )}
    </div>
  );
}
