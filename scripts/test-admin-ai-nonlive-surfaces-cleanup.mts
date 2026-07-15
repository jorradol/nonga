/**
 * Priority 4 — AI Admin Non-live Surfaces Cleanup guard (UI-only).
 *
 * npx tsx scripts/test-admin-ai-nonlive-surfaces-cleanup.mts
 */
import { existsSync, readFileSync } from "node:fs";

const DASHBOARD_PATH = "src/components/admin/AdminDashboardView.tsx";
const STATUS_PANEL_PATH = "src/components/admin/aiControl/AiControlStatusPanel.tsx";
const LEGACY_CENTER_PATH = "src/components/admin/ai/AIControlCenter.tsx";
const SUPERADMIN_PREVIEW_PATH =
  "src/components/admin/ai/SmartSalesAiControlPreview.tsx";

const HONEST_EMPTY_COPY =
  "ส่วนจัดการ AI ยังไม่ได้เชื่อมต่อกับ Runtime ที่ใช้งานจริง";
const HONEST_EMPTY_COPY_LINE2 =
  "ขณะนี้จึงยังไม่มีสถานะหรือการควบคุม AI ที่แสดงในหน้านี้";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function extractSidebar(source: string): string {
  const start = source.indexOf("{/* SIDEBAR BLOCK:");
  const end = source.indexOf("{/* RENDER ACTIVE TAB AREA */}", start);
  if (start < 0) return "";
  if (end < 0) return source.slice(start);
  return source.slice(start, end);
}

function extractAiTab(source: string): string {
  const start = source.indexOf('{adminState.activeTab === "ai-control" && (');
  if (start < 0) return "";
  const end = source.indexOf(
    '{adminState.activeTab === "revenue-preview"',
    start
  );
  if (end < 0) return source.slice(start);
  return source.slice(start, end);
}

console.log("=== Admin AI Non-live Surfaces Cleanup Guard ===\n");

ok("dashboard path exists", existsSync(DASHBOARD_PATH));
ok("static status panel source retained", existsSync(STATUS_PANEL_PATH));
ok("legacy AI control center source retained", existsSync(LEGACY_CENTER_PATH));
ok(
  "superadmin preview source retained",
  existsSync(SUPERADMIN_PREVIEW_PATH)
);

const dashboardCode = readFileSync(DASHBOARD_PATH, "utf8");
const statusPanelCode = readFileSync(STATUS_PANEL_PATH, "utf8");
const legacyCenterCode = readFileSync(LEGACY_CENTER_PATH, "utf8");
const previewCode = readFileSync(SUPERADMIN_PREVIEW_PATH, "utf8");

const sidebar = extractSidebar(dashboardCode);
const aiTab = extractAiTab(dashboardCode);

ok("sidebar section found", sidebar.length > 0);
ok("ai-control tab section found", aiTab.length > 0);

ok(
  "AI menu remains navigable",
  /setActiveTab\("ai-control"\)/.test(sidebar) &&
    /แผงควบคุม AI Nong A/.test(sidebar)
);

ok(
  "ai-control tab panel testid present",
  /data-testid="admin-ai-control-tab-panel"/.test(aiTab)
);
ok(
  "honest empty-state testid present",
  /data-testid="admin-ai-real-runtime-empty-state"/.test(aiTab)
);
ok(
  "honest empty copy constant defined",
  dashboardCode.includes(HONEST_EMPTY_COPY) &&
    dashboardCode.includes(HONEST_EMPTY_COPY_LINE2) &&
    /HONEST_AI_ADMIN_EMPTY_STATE/.test(dashboardCode)
);
ok(
  "honest empty copy rendered in ai-control tab",
  /\{HONEST_AI_ADMIN_EMPTY_STATE\}/.test(aiTab)
);

ok(
  "dashboard does not import AiControlStatusPanel",
  !/AiControlStatusPanel/.test(dashboardCode)
);
ok(
  "dashboard does not import AIControlCenter",
  !/AIControlCenter/.test(dashboardCode)
);
ok(
  "dashboard does not import SmartSalesAiControlPreview",
  !/SmartSalesAiControlPreview/.test(dashboardCode)
);

ok(
  "ai-control tab does not mount static status panel",
  !/<AiControlStatusPanel[\s>]/.test(aiTab)
);
ok(
  "ai-control tab does not mount legacy control center",
  !/<AIControlCenter[\s/>]/.test(aiTab)
);
ok(
  "ai-control tab does not mount superadmin preview",
  !/<SmartSalesAiControlPreview[\s/>]/.test(aiTab)
);

ok(
  "source status panel testid retained (read-only)",
  /data-testid="ai-control-status-panel"/.test(statusPanelCode)
);
ok(
  "source legacy center testid retained (read-only)",
  /data-testid="legacy-ai-control-center"/.test(legacyCenterCode)
);
ok(
  "source superadmin preview testid retained (read-only)",
  /data-testid="smart-sales-ai-control-preview"/.test(previewCode)
);

ok(
  "no new AI admin control system in dashboard",
  !/useAIAdmin/.test(dashboardCode) &&
    !/AISkillControlCenter/.test(dashboardCode) &&
    !/aiControlDefaults/.test(dashboardCode)
);

ok(
  "staging single-chunk retention keeps useAISkills static path",
  /import \{ useAISkills \}/.test(dashboardCode) &&
    /__NONGA_RETAIN_USE_AI_SKILLS__/.test(dashboardCode)
);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
