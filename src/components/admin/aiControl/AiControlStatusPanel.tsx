/**
 * v6.4C — Admin read-only AI control status panel (static model only — no network, no writes).
 */
import {
  AI_CHAT_SHADOW_REAL_PROVIDER_FLAG_ENV,
  AI_CONTROL_ALLOWED_PROMPT_FIELDS,
  AI_CONTROL_FORBIDDEN_PROMPT_FIELDS,
  AI_CONTROL_ROLE_PERMISSIONS,
  AI_CONTROL_SURFACE_REGISTRY,
  AI_OUTPUT_GUARD_POLICY,
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
  resolveEffectiveProviderStatus,
  roleHasPermission,
} from "../../../config/aiControl/aiControlDefaults.ts";
import type {
  AiControlActorRole,
  AiControlPermission,
} from "../../../config/aiControl/aiControlTypes.ts";
import { AiControlStatusCard } from "./AiControlStatusCard.tsx";
import { AlertTriangle, Lock, Shield } from "lucide-react";

export interface AiControlStatusPanelProps {
  actorRole: AiControlActorRole;
}

const PERMISSION_LABELS: Record<AiControlPermission, string> = {
  viewStatus: "View status",
  viewUsageSummary: "View usage summary (readiness)",
  viewGuardFailFallback: "View guard fail / fallback (readiness)",
  flagIssue: "Flag issue",
  viewSurfaceStatus: "View surface status",
  changeMockOrOff: "Change mock/off (readiness)",
  approveStagingRealReadiness: "Approve staging real readiness",
  manageAllowlistReadiness: "Manage allowlist (readiness)",
  setCapsReadiness: "Set caps (readiness)",
  triggerKillSwitchReadiness: "Trigger kill switch (readiness)",
  viewAuditSummary: "View audit summary (redacted)",
};

function formatCap(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "unset (blocks real provider)";
  }
  return String(value);
}

export function AiControlStatusPanel({ actorRole }: AiControlStatusPanelProps) {
  const config = DEFAULT_AI_CONTROL_PLANE_CONFIG;
  const effectiveStatus = resolveEffectiveProviderStatus({
    providerStatus: config.providerStatus,
    killSwitchActive: config.killSwitch.active,
  });
  const productionForbidden = isProductionRealProviderForbidden("production");
  const showRoleMatrix = actorRole === "superadmin";

  return (
    <section
      className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-5 space-y-5 text-left"
      data-testid="ai-control-status-panel"
      data-readonly="true"
      data-actor-role={actorRole}
      aria-label="AI Control Status Panel read-only readiness"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Shield className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-sm font-black text-white">
            AI Control Status Panel
          </h2>
          <p className="text-[11px] text-sky-200/80 leading-relaxed">
            Read-only readiness view from v6.4B static model — no secrets, raw
            prompts, or full UID displayed
          </p>
        </div>
        <span
          className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full"
          data-testid="ai-control-status-readonly-badge"
        >
          <Lock className="w-3 h-3" />
          Read-only readiness
        </span>
      </div>

      <div
        className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90 space-y-1"
        data-testid="ai-control-status-safety-banner"
      >
        <p data-testid="ai-control-status-provider-off">
          AI provider is OFF — deterministic fallback remains active
        </p>
        <p data-testid="ai-control-status-real-gemini-off">
          Real Gemini is not enabled
        </p>
        <p data-testid="ai-control-status-production-forbidden">
          Production real provider is forbidden
        </p>
        <p data-testid="ai-control-status-staging-only-readiness">
          Staging-only real provider readiness — approval + allowlist + caps
          required in future phases
        </p>
      </div>

      <p
        className="text-[11px] text-sky-100/90 flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2"
        data-testid="ai-control-status-no-sensitive-data"
      >
        <AlertTriangle className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
        <span>
          This panel is read-only readiness. No secrets, raw prompts, or full
          UID are displayed. No write actions or provider enablement controls.
        </span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AiControlStatusCard
          title="Provider Status"
          testId="ai-control-status-provider-card"
        >
          <dl className="space-y-2 text-[11px]">
            <div>
              <dt className="text-slate-500 font-bold uppercase">Provider Status</dt>
              <dd
                className="text-white font-semibold mt-0.5"
                data-testid="ai-control-status-provider-value"
              >
                {config.providerStatus}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Effective Status</dt>
              <dd
                className="text-white font-semibold mt-0.5"
                data-testid="ai-control-status-effective-value"
              >
                {effectiveStatus}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Default</dt>
              <dd className="text-slate-300 mt-0.5">{DEFAULT_AI_PROVIDER_STATUS}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Shadow flag</dt>
              <dd
                className="text-slate-300 font-mono mt-0.5"
                data-testid="ai-control-status-shadow-flag"
              >
                {AI_CHAT_SHADOW_REAL_PROVIDER_FLAG_ENV}=false
              </dd>
            </div>
          </dl>
        </AiControlStatusCard>

        <AiControlStatusCard
          title="Environment Policy"
          testId="ai-control-status-environment-card"
        >
          <dl className="space-y-2 text-[11px]">
            <div>
              <dt className="text-slate-500 font-bold uppercase">Config environment</dt>
              <dd className="text-white font-semibold mt-0.5">{config.environment}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Production real provider</dt>
              <dd
                className="text-red-300 font-semibold mt-0.5"
                data-testid="ai-control-status-production-policy"
              >
                {productionForbidden ? "forbidden" : "allowed"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Admin can enable real provider</dt>
              <dd
                className="text-slate-300 mt-0.5"
                data-testid="ai-control-status-admin-enable-policy"
              >
                {adminCanEnableRealProvider() ? "yes" : "no"}
              </dd>
            </div>
          </dl>
        </AiControlStatusCard>

        <AiControlStatusCard
          title="Kill Switch"
          testId="ai-control-status-kill-switch-card"
        >
          <p
            className="text-[11px] text-slate-300"
            data-testid="ai-control-status-kill-switch-state"
          >
            Kill switch readiness:{" "}
            {config.killSwitch.active ? "active (DISABLED)" : "inactive (OFF)"}
          </p>
        </AiControlStatusCard>

        <AiControlStatusCard
          title="Cost Guard Readiness"
          testId="ai-control-status-cost-guard-card"
        >
          <dl className="space-y-1.5 text-[11px] text-slate-300">
            <div>
              <dt className="text-slate-500 font-bold uppercase">Daily request cap</dt>
              <dd>{formatCap(config.costCaps.dailyRequestCap)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Per-user/session cap</dt>
              <dd>{formatCap(config.costCaps.perUserSessionCap)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Cost guard USD</dt>
              <dd>{formatCap(config.costCaps.costGuardUsd)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">Cap exceeded fallback</dt>
              <dd data-testid="ai-control-status-cap-fallback">deterministic</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-bold uppercase">No-repeat generation</dt>
              <dd>
                {config.noRepeatGeneration.enabled ? "enabled" : "disabled"}
              </dd>
            </div>
          </dl>
        </AiControlStatusCard>
      </div>

      <AiControlStatusCard
        title="Surfaces"
        testId="ai-control-status-surfaces-card"
      >
        <ul
          className="space-y-2 text-[11px]"
          data-testid="ai-control-status-surface-list"
        >
          {AI_CONTROL_SURFACE_REGISTRY.map((surface) => {
            const surfaceState = config.surfaces.find(
              (entry) => entry.surfaceId === surface.id
            );
            return (
              <li
                key={surface.id}
                className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                data-testid={`ai-control-status-surface-${surface.id}`}
              >
                <span className="text-white font-semibold">{surface.id}</span>
                <span className="text-slate-500 mx-2">·</span>
                <span className="text-slate-300">{surface.label}</span>
                <span className="text-slate-500 mx-2">·</span>
                <span
                  className="text-sky-300"
                  data-testid={`ai-control-status-surface-mode-${surface.id}`}
                >
                  {surfaceState?.mode ?? "DETERMINISTIC_ONLY"}
                </span>
                {surface.stagingRealPilotCandidate && (
                  <span className="ml-2 text-[10px] text-amber-300/80">
                    (staging pilot candidate)
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </AiControlStatusCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AiControlStatusCard
          title="Prompt Boundary"
          testId="ai-control-status-prompt-boundary-card"
        >
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">
            Public-safe only
          </p>
          <p
            className="text-[11px] text-emerald-300/90 font-mono break-words"
            data-testid="ai-control-status-allowed-fields"
          >
            {AI_CONTROL_ALLOWED_PROMPT_FIELDS.join(", ")}
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 mb-1">
            Forbidden
          </p>
          <p
            className="text-[11px] text-red-300/80 font-mono break-words"
            data-testid="ai-control-status-forbidden-fields"
          >
            {AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.join(", ")}
          </p>
        </AiControlStatusCard>

        <AiControlStatusCard
          title="Output Guard"
          testId="ai-control-status-output-guard-card"
        >
          <p
            className="text-[11px] text-slate-300"
            data-testid="ai-control-status-output-guard-categories"
          >
            Forbidden: {AI_OUTPUT_GUARD_POLICY.categories.join(", ")}
          </p>
          <p
            className="text-[11px] text-slate-400 mt-2"
            data-testid="ai-control-status-output-guard-fallback"
          >
            Guard fail → {AI_OUTPUT_GUARD_POLICY.onFail} fallback
          </p>
        </AiControlStatusCard>
      </div>

      <AiControlStatusCard
        title="Audit Log Readiness"
        testId="ai-control-status-audit-card"
      >
        <p className="text-[11px] text-slate-300">
          Redacted fields only: eventType, actorRole, maskedActorId, surface,
          previousStatus, nextStatus, reason, timestamp
        </p>
        <p
          className="text-[11px] text-slate-500 mt-2"
          data-testid="ai-control-status-audit-redaction"
        >
          No full UID, raw prompt, secret, or env dump in audit events
        </p>
      </AiControlStatusCard>

      <AiControlStatusCard
        title={
          showRoleMatrix
            ? "Role Matrix (Superadmin view)"
            : "Role Summary (Admin view)"
        }
        testId="ai-control-status-role-matrix-card"
      >
        <p
          className="text-[11px] text-slate-400 mb-2"
          data-testid="ai-control-status-viewer-role"
        >
          Viewer role: {actorRole}
        </p>
        {showRoleMatrix ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            {(["superadmin", "admin"] as const).map((role) => (
              <div
                key={role}
                className="rounded-lg border border-white/5 bg-black/20 p-3"
                data-testid={`ai-control-status-role-${role}`}
              >
                <p className="text-white font-semibold uppercase mb-2">{role}</p>
                <ul className="space-y-1 text-slate-300">
                  {(
                    Array.from(AI_CONTROL_ROLE_PERMISSIONS[role]) as AiControlPermission[]
                  ).map((permission) => (
                    <li key={permission}>
                      {PERMISSION_LABELS[permission] ?? permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul
            className="space-y-1 text-[11px] text-slate-300"
            data-testid="ai-control-status-admin-permissions"
          >
            {(Array.from(AI_CONTROL_ROLE_PERMISSIONS.admin) as AiControlPermission[]).map(
              (permission) => (
                <li key={permission}>
                  {PERMISSION_LABELS[permission] ?? permission}
                  {roleHasPermission("admin", permission) ? "" : " (denied)"}
                </li>
              )
            )}
            <li className="text-red-300/90 mt-2">
              Cannot enable real provider:{" "}
              {adminCanEnableRealProvider() ? "yes" : "no"}
            </li>
          </ul>
        )}
      </AiControlStatusCard>

      <div
        className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-[10px] text-slate-500"
        data-testid="ai-control-status-usage-readiness"
      >
        Usage / guard fail / fallback metrics: readiness labels only — no live
        fetch in v6.4C
      </div>
    </section>
  );
}
