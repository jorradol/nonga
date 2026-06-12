/**
 * v6.4C — Admin Read-Only AI Control Status Panel Readiness (static validation only)
 * npm run test:v64c-admin-read-only-ai-control-status-panel-readiness
 */
import { readFileSync } from "node:fs";
import {
  AI_CONTROL_SURFACE_REGISTRY,
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
} from "../src/config/aiControl/aiControlDefaults.ts";
import { AiControlStatusPanel } from "../src/components/admin/aiControl/AiControlStatusPanel.tsx";

const DOC_PATH =
  "docs/v6.4C-admin-read-only-ai-control-status-panel-readiness.md";
const PANEL_PATH = "src/components/admin/aiControl/AiControlStatusPanel.tsx";
const CARD_PATH = "src/components/admin/aiControl/AiControlStatusCard.tsx";
const ADMIN_DASH_PATH = "src/components/admin/AdminDashboardView.tsx";
const APP_PATH = "src/App.tsx";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const ENABLE_BUTTON_PATTERNS = [
  /<button[^>]*(enable|activate|start).*real.*gemini/i,
  /<button[^>]*real.*gemini.*(enable|activate|start)/i,
  /onClick=.*enableRealProvider/i,
  /onClick=.*activateRealGemini/i,
];

const HEAD_SHA = "c247974525ace42f0f7105d654a450c51beebd5e";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4C Admin Read-Only AI Control Status Panel Readiness ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const panelSrc = readFileSync(PANEL_PATH, "utf8");
const cardSrc = readFileSync(CARD_PATH, "utf8");
const adminDash = readFileSync(ADMIN_DASH_PATH, "utf8");
const appTsx = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64c-admin-read-only-ai-control-status-panel-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const combinedUi = panelSrc + cardSrc + adminDash;

// --- doc exists + v6.4C ---
{
  ok("readiness doc exists", doc.length > 3000);
  ok("doc v6.4C label", doc.includes("v6.4C"));
  ok(
    "doc admin read-only panel",
    /admin read-only ai control status panel/i.test(doc)
  );
  ok("doc HEAD c247974", doc.includes(HEAD_SHA) || doc.includes("c247974"));
  ok("doc read-only ui", /read-only/i.test(docLower));
  ok("doc no deploy", /no deploy|ยังไม่ deploy/i.test(docLower));
}

// --- component files ---
{
  ok("panel component exists", panelSrc.length > 2000);
  ok("card component exists", cardSrc.length > 200);
  ok("panel exports AiControlStatusPanel", panelSrc.includes("export function AiControlStatusPanel"));
  ok("panel data-readonly", panelSrc.includes('data-readonly="true"'));
  ok("panel testid", panelSrc.includes('data-testid="ai-control-status-panel"'));
}

// --- admin dashboard wiring ---
{
  ok("admin dash imports panel", adminDash.includes("AiControlStatusPanel"));
  ok(
    "admin dash ai-control tab wires panel",
    /activeTab === "ai-control"[\s\S]*AiControlStatusPanel/.test(adminDash)
  );
  ok(
    "panel before AIControlCenter in tab",
    adminDash.indexOf("AiControlStatusPanel") <
      adminDash.indexOf("<AIControlCenter />")
  );
  ok("no new public route in App", !appTsx.includes("AiControlStatusPanel"));
  ok("doc wired admin ai-control tab", /ai-control tab/i.test(doc));
}

// --- provider OFF / real gemini not enabled ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok(
    "config provider OFF",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.providerStatus === "OFF"
  );
  ok(
    "panel shows provider off copy",
    panelSrc.includes("AI provider is OFF")
  );
  ok(
    "panel real gemini not enabled",
    panelSrc.includes("Real Gemini is not enabled")
  );
  ok("panel testid provider off", panelSrc.includes("ai-control-status-provider-off"));
  ok(
    "panel testid real gemini off",
    panelSrc.includes("ai-control-status-real-gemini-off")
  );
  ok(
    "shadow flag false in panel",
    panelSrc.includes("AI_CHAT_SHADOW_REAL_PROVIDER_FLAG_ENV") &&
      panelSrc.includes("=false")
  );
}

// --- production forbidden / staging-only ---
{
  ok(
    "panel production forbidden copy",
    panelSrc.includes("Production real provider is forbidden")
  );
  ok(
    "panel staging-only readiness",
    /staging-only real provider readiness/i.test(panelSrc)
  );
  ok(
    "panel testid production forbidden",
    panelSrc.includes("ai-control-status-production-forbidden")
  );
  ok(
    "panel testid staging readiness",
    panelSrc.includes("ai-control-status-staging-only-readiness")
  );
}

// --- surfaces from static registry ---
{
  ok("surface registry count 5", AI_CONTROL_SURFACE_REGISTRY.length === 5);
  ok(
    "panel maps surface registry",
    /AI_CONTROL_SURFACE_REGISTRY\.map/.test(panelSrc)
  );
  ok(
    "panel dynamic surface testid",
    panelSrc.includes("ai-control-status-surface-${surface.id}")
  );
  ok(
    "panel dynamic surface mode testid",
    panelSrc.includes("ai-control-status-surface-mode-${surface.id}")
  );
  for (const surface of AI_CONTROL_SURFACE_REGISTRY) {
    ok(`registry surface ${surface.id}`, surface.id.length > 0);
  }
  ok("panel surface list testid", panelSrc.includes("ai-control-status-surface-list"));
}

// --- role matrix ---
{
  ok(
    "panel dynamic role testid",
    panelSrc.includes("ai-control-status-role-${role}")
  );
  ok("panel superadmin role branch", panelSrc.includes('"superadmin"'));
  ok("panel admin role branch", panelSrc.includes('"admin"'));
  ok("panel admin permissions list", panelSrc.includes("ai-control-status-admin-permissions"));
  ok("panel viewer role testid", panelSrc.includes("ai-control-status-viewer-role"));
  ok("admin cannot enable real", adminCanEnableRealProvider() === false);
  ok(
    "panel admin enable policy",
    panelSrc.includes("ai-control-status-admin-enable-policy")
  );
  ok("doc role visibility", /Superadmin read-only|Admin read-only/i.test(doc));
}

// --- read-only copy ---
{
  ok(
    "panel read-only readiness badge",
    panelSrc.includes("ai-control-status-readonly-badge")
  );
  ok(
    "panel no sensitive data notice",
    panelSrc.includes("ai-control-status-no-sensitive-data")
  );
  ok(
    "panel deterministic fallback copy",
    /deterministic fallback remains active/i.test(panelSrc)
  );
  ok(
    "panel no secrets raw prompt uid",
    /no secrets, raw[\s\S]*prompts, or full UID/i.test(panelSrc) &&
      /No secrets, raw prompts, or full/i.test(panelSrc)
  );
}

// --- sections: kill switch, cost guard, prompt, output, audit ---
{
  ok("kill switch card", panelSrc.includes("ai-control-status-kill-switch-card"));
  ok("cost guard card", panelSrc.includes("ai-control-status-cost-guard-card"));
  ok("prompt boundary card", panelSrc.includes("ai-control-status-prompt-boundary-card"));
  ok("output guard card", panelSrc.includes("ai-control-status-output-guard-card"));
  ok("audit card", panelSrc.includes("ai-control-status-audit-card"));
  ok("usage readiness label", panelSrc.includes("ai-control-status-usage-readiness"));
  ok("cap fallback deterministic", panelSrc.includes("ai-control-status-cap-fallback"));
}

// --- no enable buttons / write actions ---
{
  ok("panel no button elements", !/<button/i.test(panelSrc));
  ok("card no button elements", !/<button/i.test(cardSrc));
  for (const pat of ENABLE_BUTTON_PATTERNS) {
    ok(`no enable button pattern ${pat.source.slice(0, 20)}`, !pat.test(combinedUi));
  }
  ok("panel no onClick handlers", !/onClick=/.test(panelSrc));
  ok("panel no form submit", !/<form/i.test(panelSrc));
  ok("panel no fetch", !/fetch\s*\(/.test(panelSrc));
  ok("panel no generateContent", !/generateContent/.test(panelSrc));
  ok("panel no firestore", !/firestore|getDoc|setDoc|updateDoc/i.test(panelSrc));
  ok("panel imports aiControl defaults only", panelSrc.includes("aiControlDefaults"));
  ok("panel no gemini service import", !/services\/ai\/.*gemini/i.test(panelSrc));
}

// --- static model import only ---
{
  ok("panel uses DEFAULT_AI_CONTROL_PLANE_CONFIG", panelSrc.includes("DEFAULT_AI_CONTROL_PLANE_CONFIG"));
  ok("panel uses AI_CONTROL_SURFACE_REGISTRY", panelSrc.includes("AI_CONTROL_SURFACE_REGISTRY"));
  ok("panel uses resolveEffectiveProviderStatus", panelSrc.includes("resolveEffectiveProviderStatus"));
  ok("component import resolves", typeof AiControlStatusPanel === "function");
}

// --- forbidden / rollout ---
{
  ok("doc no real gemini enable", /real Gemini.*not enabled|no real Gemini/i.test(doc));
  ok("doc no write action", /write action|enable button/i.test(docLower));
  ok("doc rollout v64d v64e", /v6\.4D|v6\.4E/i.test(doc));
  ok("doc static model data source", /aiControlDefaults/i.test(doc));
}

// --- no PII/secrets in panel/doc ---
{
  for (const content of [doc, panelSrc, cardSrc]) {
    const label = content === doc ? "doc" : content === panelSrc ? "panel" : "card";
    for (const pat of SECRET_VALUE_PATTERNS) {
      ok(`${label} no secret value`, !pat.test(content));
    }
  }
  ok("panel no fullUid display field", !/"fullUid":/.test(panelSrc));
  ok("panel no rawPrompt field", !/rawPrompt/.test(panelSrc));
  ok("panel maskedActorId in audit copy", /maskedActorId/.test(panelSrc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v64c script",
    pkg.includes("test:v64c-admin-read-only-ai-control-status-panel-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64c-admin-read-only-ai-control-status-panel-readiness.mts"
    )
  );
}

console.log(
  "\nDone v6.4C Admin Read-Only AI Control Status Panel Readiness tests."
);
if (process.exitCode) process.exit(process.exitCode);
