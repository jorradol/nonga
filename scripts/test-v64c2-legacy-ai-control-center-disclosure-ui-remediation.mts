/**
 * v6.4C.2 — Legacy AI Control Center Disclosure UI Remediation (static validation only)
 * npm run test:v64c2-legacy-ai-control-center-disclosure-ui-remediation
 */
import { readFileSync, existsSync } from "node:fs";

const DOC_PATH =
  "docs/v6.4C.2-legacy-ai-control-center-disclosure-ui-remediation.md";
const V64C1_DOC =
  "docs/v6.4C.1-legacy-ai-control-center-disclosure-safety-audit.md";
const PANEL_PATH = "src/components/admin/aiControl/AiControlStatusPanel.tsx";
const LEGACY_PATH = "src/components/admin/ai/AIControlCenter.tsx";
const ADMIN_DASH = "src/components/admin/AdminDashboardView.tsx";
const APP_PATH = "src/App.tsx";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
];

const ENABLE_BUTTON_PATTERNS = [
  /<button[^>]*(enable|activate|start).*real.*gemini/i,
  /onClick=.*enableRealProvider/i,
];

const HEAD_SHA = "8ea2c1ed63998d654163e6062393fcf121d03719";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4C.2 Legacy AI Control Center Disclosure UI Remediation ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const legacy = readFileSync(LEGACY_PATH, "utf8");
const panel = readFileSync(PANEL_PATH, "utf8");
const adminDash = readFileSync(ADMIN_DASH, "utf8");
const appTsx = readFileSync(APP_PATH, "utf8");
const v64c1Doc = readFileSync(V64C1_DOC, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64c2-legacy-ai-control-center-disclosure-ui-remediation.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE");

// --- doc ---
{
  ok("remediation doc exists", doc.length > 3000);
  ok("doc v6.4C.2 label", doc.includes("v6.4C.2"));
  ok("doc disclosure remediation", /disclosure ui remediation/i.test(doc));
  ok("doc HEAD 8ea2c1e", doc.includes(HEAD_SHA) || doc.includes("8ea2c1e"));
  ok("doc before after copy", /Before.*After/i.test(doc));
  ok("doc consolidation section", /Consolidation Readiness/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged until separate deploy/i.test(docLower));
}

// --- legacy safety banner ---
{
  ok("legacy section testid", legacy.includes('data-testid="legacy-ai-control-center"'));
  ok(
    "legacy safety banner",
    legacy.includes('data-testid="legacy-ai-control-safety-banner"')
  );
  ok("banner provider OFF", /provider remains.*OFF/i.test(legacy));
  ok(
    "banner real gemini not enabled",
    /Real Gemini[\s\S]{0,80}not enabled/i.test(legacy)
  );
  ok("banner mock placeholder", /mock\/placeholder/i.test(legacy));
  ok("banner no secrets uid", /No secrets.*full UID/i.test(legacy));
}

// --- no LIVE SYNC / misleading Gemini ---
{
  ok("no LIVE SYNC string", !legacy.includes("LIVE SYNC"));
  ok("demo not connected badge", legacy.includes("Demo / Not connected"));
  ok("legacy admin config badge", legacy.includes("Legacy admin config"));
  ok(
    "no gemini flash core speed",
    !legacy.includes("Gemini 3.5 Flash Core Speed")
  );
  ok(
    "gemini not connected copy",
    /Not connected.*Gemini|Gemini runtime not enabled/i.test(legacy)
  );
  ok("not connected real gemini header", /not connected to real Gemini/i.test(legacy));
}

// --- analytics mock disclosure ---
{
  ok(
    "analytics mock banner",
    legacy.includes('data-testid="legacy-ai-control-analytics-mock-banner"')
  );
  ok("mock analytics title", /Mock AI Analytics/i.test(legacy));
  ok("no live data source", /no live data source/i.test(legacy));
  ok("placeholder labels", legacy.includes("Placeholder"));
  ok("fine tuning future ready", /Future-ready/i.test(legacy));
  ok("datasets compiled mock", /Datasets Compiled — mock/i.test(legacy));
  ok("moderation mock summary", /Moderation Logs — mock/i.test(legacy));
}

// --- write warning ---
{
  ok(
    "write warning testid",
    legacy.includes('data-testid="legacy-ai-control-write-warning"')
  );
  ok(
    "legacy config persistence warning",
    /Legacy config persistence/i.test(legacy)
  );
  ok(
    "not real provider runtime",
    /not.*real provider|not connected to real provider runtime/i.test(legacy)
  );
  ok("not call gemini api warning", /ไม่เรียก Gemini API/i.test(legacy));
}

// --- no new gemini/fetch/enable ---
{
  ok("legacy no generateContent", !/generateContent/i.test(legacy));
  ok("legacy no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(legacy));
  for (const pat of ENABLE_BUTTON_PATTERNS) {
    ok(`legacy no enable button ${pat.source.slice(0, 20)}`, !pat.test(legacy));
  }
}

// --- v6.4C panel preserved ---
{
  ok("panel unchanged testid", panel.includes('data-testid="ai-control-status-panel"'));
  ok("panel data-readonly", panel.includes('data-readonly="true"'));
  ok("panel provider off", panel.includes("AI provider is OFF"));
  ok("panel no button", !/<button\b/i.test(panel));
  ok("panel no onClick", !/onClick/.test(panel));
  ok(
    "admin dash panel before legacy",
    adminDash.indexOf("AiControlStatusPanel") <
      adminDash.indexOf("<AIControlCenter />")
  );
  ok("no new public route", !appTsx.includes("legacy-ai-control-center"));
}

// --- cross-ref v64c1 audit ---
{
  ok("v64c1 audit doc exists", v64c1Doc.includes("v6.4C.1"));
}

// --- doc no secrets ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- static script ---
{
  const selfCode =
    selfSrc.split("// --- static script ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package ---
{
  ok(
    "package v64c2 script",
    pkg.includes("test:v64c2-legacy-ai-control-center-disclosure-ui-remediation")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64c2-legacy-ai-control-center-disclosure-ui-remediation.mts"
    )
  );
}

console.log(
  "\nDone v6.4C.2 Legacy AI Control Center Disclosure UI Remediation tests."
);
if (process.exitCode) process.exit(process.exitCode);
