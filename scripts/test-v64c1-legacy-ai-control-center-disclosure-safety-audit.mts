/**
 * v6.4C.1 — Legacy AI Control Center Disclosure & Safety Audit (static validation only)
 * npm run test:v64c1-legacy-ai-control-center-disclosure-safety-audit
 */
import { readFileSync, existsSync } from "node:fs";

const DOC_PATH =
  "docs/v6.4C.1-legacy-ai-control-center-disclosure-safety-audit.md";
const V64C_DOC =
  "docs/v6.4C-admin-read-only-ai-control-status-panel-readiness.md";
const V64CA_DOC =
  "docs/v6.4C.A-staging-hosting-deploy-execution-record.md";

const AI_CONTROL_CENTER = "src/components/admin/ai/AIControlCenter.tsx";
const AI_SKILL_CENTER = "src/components/admin/ai/AISkillControlCenter.tsx";
const SMART_SALES_PREVIEW =
  "src/components/admin/ai/SmartSalesAiControlPreview.tsx";
const AI_STATUS_PANEL =
  "src/components/admin/aiControl/AiControlStatusPanel.tsx";
const ADMIN_DASH = "src/components/admin/AdminDashboardView.tsx";
const USE_AI_ADMIN = "src/hooks/admin/ai/useAIAdmin.ts";
const AI_ADMIN_SERVICE = "src/services/ai/admin/aiAdminService.ts";
const AI_SKILL_SERVICE = "src/services/ai/skills/aiSkillService.ts";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [/@line[a-z0-9._-]{2,}/i, /line\.me\/ti\/p\//i];

const FULL_PLATE_DATA_PATTERNS = [/\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V)\b/i,
];

const HEAD_SHA = "cafe966cb954052e746989a70d9eef6df334616e";

const LEGACY_LABELS = [
  "Enterprise Co-Pilot Core",
  "Nong A AI Control Center",
  "LIVE SYNC",
  "Gemini 3.5 Flash Core Speed",
  "AI Response Success Rate",
  "Deals Driven by AI",
  "AI Active Memory Profiles",
  "Fine-Tuning Module",
  "Datasets Compiled",
  "Moderation Logs summary",
];

const HARDCODED_METRICS = ["99.82%", "74.2%", "1,480", "8,420"];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readSrc(path: string): string {
  return readFileSync(path, "utf8");
}

console.log(
  "=== v6.4C.1 Legacy AI Control Center Disclosure & Safety Audit ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v64c1-legacy-ai-control-center-disclosure-safety-audit.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v64cDoc = readFileSync(V64C_DOC, "utf8");
const v64caDoc = readFileSync(V64CA_DOC, "utf8");

const controlCenter = readSrc(AI_CONTROL_CENTER);
const skillCenter = readSrc(AI_SKILL_CENTER);
const smartPreview = readSrc(SMART_SALES_PREVIEW);
const statusPanel = readSrc(AI_STATUS_PANEL);
const adminDash = readSrc(ADMIN_DASH);
const useAiAdmin = readSrc(USE_AI_ADMIN);
const aiAdminSvc = readSrc(AI_ADMIN_SERVICE);
const aiSkillSvc = readSrc(AI_SKILL_SERVICE);

const adminAiBundle =
  controlCenter + skillCenter + smartPreview + useAiAdmin + aiAdminSvc + aiSkillSvc;

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.4C.1 audit ---
{
  ok("audit doc exists", doc.length > 5000);
  ok("doc v6.4C.1 label", doc.includes("v6.4C.1"));
  ok(
    "doc legacy disclosure safety audit",
    /legacy ai control center disclosure.*safety audit/i.test(doc)
  );
  ok("doc audit redacted", /AUDIT.*REDACTED/i.test(doc));
  ok("doc docs tests package", /docs\/tests\/package|audit.*readiness/i.test(docLower));
  ok("doc HEAD cafe966", doc.includes(HEAD_SHA) || doc.includes("cafe966"));
  ok("doc no runtime ui change", /no runtime\/UI change|no UI change/i.test(doc));
  ok(
    "doc untracked deploy plan noted",
    /v6\.4C\.A-admin-read-only-ai-control-status-panel-staging-hosting-deploy-readiness-plan/i.test(
      doc
    )
  );
}

// --- legacy labels in doc ---
{
  for (const label of LEGACY_LABELS) {
    ok(`doc legacy label ${label.slice(0, 24)}`, doc.includes(label));
  }
}

// --- legacy labels in source AIControlCenter ---
{
  ok("source AIControlCenter exists", existsSync(AI_CONTROL_CENTER));
  for (const label of LEGACY_LABELS) {
    ok(
      `source legacy label ${label.slice(0, 24)}`,
      controlCenter.includes(label)
    );
  }
  ok(
    "source simulated stats comment",
    /Simulated stats card row/i.test(controlCenter)
  );
}

// --- hardcoded mock metrics in source ---
{
  for (const metric of HARDCODED_METRICS) {
    ok(`source hardcoded metric ${metric}`, controlCenter.includes(metric));
  }
  ok(
    "doc hardcoded metrics verdict",
    /hardcoded|MOCK.*placeholder|placeholder.*mock/i.test(doc)
  );
}

// --- component map ---
{
  ok("doc AIControlCenter path", doc.includes("AIControlCenter.tsx"));
  ok("doc aiAdminService path", doc.includes("aiAdminService.ts"));
  ok("doc useAIAdmin path", doc.includes("useAIAdmin.ts"));
  ok("doc AISkillControlCenter path", doc.includes("AISkillControlCenter.tsx"));
  ok("doc AdminDashboardView layout", /AdminDashboardView/i.test(doc));
  {
    const tabMatch = adminDash.match(
      /activeTab === "ai-control"[\s\S]*?admin-ai-control-tab-panel[\s\S]*?<\/div>\s*\)\}/
    );
    const tabBlock = tabMatch?.[0] ?? "";
    ok("admin dash ai-control tab block found", tabBlock.length > 100);
    const idxPanel = tabBlock.indexOf("AiControlStatusPanel");
    const idxLegacy = tabBlock.indexOf("AIControlCenter");
    const idxSmart = tabBlock.indexOf("SmartSalesAiControlPreview");
    ok(
      "admin dash v64c panel before legacy",
      idxPanel > -1 && idxLegacy > -1 && idxPanel < idxLegacy
    );
    ok(
      "admin dash smart preview between panel and legacy",
      idxSmart > -1 && idxPanel < idxSmart && idxSmart < idxLegacy
    );
  }
  ok("admin dash imports AIControlCenter", adminDash.includes("AIControlCenter"));
}

// --- mock/live verdict ---
{
  ok("doc mock vs live section", /Mock vs Live Verdict/i.test(doc));
  ok("doc analytics mock verdict", /analytics.*MOCK|MOCK.*analytics/i.test(doc));
  ok("doc live sync misleading", /LIVE SYNC.*misleading|misleading.*LIVE SYNC/i.test(doc));
  ok("doc gemini label only", /Gemini.*label only|copy เท่านั้น/i.test(doc));
  ok(
    "doc config crud live persistence",
    /LIVE persistence|real CRUD|Firestore.*localStorage/i.test(doc)
  );
  ok(
    "doc v64c panel authoritative",
    /authoritative|authoritative read-only|single source of truth/i.test(docLower)
  );
  ok(
    "doc real gemini not enabled",
    /NOT ENABLED|not enabled|provider OFF/i.test(doc)
  );
}

// --- no Gemini / generateContent ---
{
  ok(
    "admin ai bundle no generateContent",
    !/generateContent/i.test(adminAiBundle)
  );
  ok(
    "AIControlCenter no generateContent",
    !/generateContent/i.test(controlCenter)
  );
  ok(
    "aiAdminService no generateContent",
    !/generateContent/i.test(aiAdminSvc)
  );
  ok(
    "doc no gemini api in legacy path",
    /ไม่มี.*Gemini|no Gemini.*legacy|not connected/i.test(doc)
  );
}

// --- no HTTP fetch in admin ai legacy ---
{
  ok(
    "AIControlCenter no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(controlCenter)
  );
  ok(
    "aiAdminService no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(aiAdminSvc)
  );
  ok(
    "aiSkillService no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(aiSkillSvc)
  );
  ok("doc no http fetch legacy", /ไม่มี HTTP.*fetch|no HTTP.*fetch/i.test(doc));
}

// --- Firestore / localStorage writes ---
{
  ok("aiAdminService setDoc", aiAdminSvc.includes("setDoc"));
  ok("aiAdminService localStorage setItem", aiAdminSvc.includes("localStorage.setItem"));
  ok("aiAdminService getDocs", aiAdminSvc.includes("getDocs"));
  ok("aiSkillService setDoc", aiSkillSvc.includes("setDoc"));
  ok("aiSkillService localStorage", aiSkillSvc.includes("localStorage"));
  ok("useAIAdmin savePrompt", useAiAdmin.includes("savePrompt"));
  ok("doc firestore collections listed", /ai_prompts|ai_personalities/i.test(doc));
  ok("doc localStorage keys documented", /nonga_ai_/i.test(doc));
}

// --- write actions / buttons ---
{
  ok("AIControlCenter onClick handlers", /onClick/.test(controlCenter));
  ok("AIControlCenter reloadAll button", /reloadAll/.test(controlCenter));
  ok("AIControlCenter create config button", /สร้างคอนฟิกใหม่/.test(controlCenter));
  ok("doc write actions documented", /รีบูตประสาท|สร้างคอนฟิก|save\/delete/i.test(doc));
}

// --- v6.4C panel still read-only safe ---
{
  ok("status panel data-readonly", statusPanel.includes('data-readonly="true"'));
  ok("status panel no onClick", !/onClick/.test(statusPanel));
  ok("status panel provider off copy", statusPanel.includes("AI provider is OFF"));
  ok("status panel no button tag", !/<button\b/i.test(statusPanel));
  ok(
    "doc v64c panel safe preserved",
    /v6\.4C.*read-only|AiControlStatusPanel.*safe|authoritative OFF/i.test(doc)
  );
}

// --- SmartSales preview read-only ---
{
  ok("smart preview data-readonly", smartPreview.includes('data-readonly="true"'));
  ok("smart preview disabled select", smartPreview.includes("disabled"));
  ok("smart preview no gemini call warning", /ไม่เรียก Gemini/i.test(smartPreview));
}

// --- disclosure recommendations ---
{
  ok("doc disclosure recommendations", /Recommendations/i.test(doc));
  ok("doc mock demo not connected", /Mock.*Demo.*Not connected|Not connected/i.test(doc));
  ok("doc hide analytics recommendation", /hide.*analytics|Analytics tab/i.test(doc));
  ok("doc write-protect recommendation", /write-protect|Write-protect/i.test(doc));
}

// --- future consolidation ---
{
  ok("doc consolidation section", /Future Consolidation/i.test(doc));
  ok("doc v64c2 proposed", /v6\.4C\.2/i.test(doc));
  ok("doc v64d mock harness", /v6\.4D/i.test(doc));
  ok("doc single source of truth", /single source of truth|authoritative/i.test(docLower));
}

// --- risks ---
{
  ok("doc risks section", /## 6\. Risks|Risks/i.test(doc));
  ok("doc disclosure gap risk", /R-01|Disclosure gap/i.test(doc));
  ok("doc cognitive dissonance risk", /R-02|cognitive dissonance/i.test(doc));
}

// --- no public route ---
{
  ok("doc no new public route", /no new public route|existing admin route/i.test(doc));
  ok(
    "status panel not in App public routes",
    !readSrc("src/App.tsx").includes("AIControlCenter")
  );
}

// --- cross-ref v6.4C / v6.4C.A ---
{
  ok("v64c doc exists", v64cDoc.includes("v6.4C"));
  ok("v64ca doc legacy section", /Legacy Enterprise Co-Pilot/i.test(v64caDoc));
}

// --- no PII in audit doc ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production nongbot.org url", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate data ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v64c1 audit script",
    pkg.includes("test:v64c1-legacy-ai-control-center-disclosure-safety-audit")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64c1-legacy-ai-control-center-disclosure-safety-audit.mts"
    )
  );
}

console.log(
  "\nDone v6.4C.1 Legacy AI Control Center Disclosure & Safety Audit tests."
);
if (process.exitCode) process.exit(process.exitCode);
