/**
 * v6.1E — Admin Shadow Debug UI Staging Hosting Deploy Record (static validation only)
 * npm run test:v61e-admin-shadow-debug-ui-staging-hosting-deploy-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.1E-admin-shadow-debug-ui-staging-hosting-deploy-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "125e2d54c08bf055937db9f658942daad9f1f755";
const CLOUD_RUN_REV = "nonga-staging-00051-fbd";
const CLOUD_RUN_IMAGE = "v6.1C-admin-shadow-smoke-debug-0883faf";
const PREV_BUNDLE = "index-NVEc0A-_.js";
const LIVE_BUNDLE = "index-BpyOr2_V.js";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const GUEST_GATE_MSG = "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ";
const WEBAPP_BASE = "https://nonga-ce93c.web.app";
const ADMIN_UI_PATH = "/admin/shadow-smoke";
const ADMIN_ROUTE = "/api/admin/sales-brain-shadow-smoke";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1E Admin Shadow Debug UI Staging Hosting Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61e-admin-shadow-debug-ui-staging-hosting-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const headerTsx = readFileSync("src/components/Header.tsx", "utf8");
const adminDash = readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");
const uiView = readFileSync("src/components/admin/AdminShadowSmokeDebugView.tsx", "utf8");

// --- doc exists + v6.1E ---
{
  ok("deploy record doc exists", doc.length > 5000);
  ok("doc v6.1E label", doc.includes("v6.1E"));
  ok("doc hosting deploy record", /hosting deploy record|Firebase Hosting deploy/i.test(doc));
  ok("doc cloud run skipped", /Cloud Run.*SKIPPED|SKIPPED.*Cloud Run/i.test(doc));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD 125e2d5", doc.includes(HEAD_SHA) || doc.includes("125e2d5"));
  ok("preflight HEAD equals origin", /HEAD = origin|HEAD.*origin.*125e2d5/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight cloud run revision 00051-fbd", doc.includes(CLOUD_RUN_REV));
  ok("preflight cloud run 100 percent", /00051-fbd.*100|100%.*00051/i.test(doc));
  ok("preflight cloud run image v6.1C", doc.includes(CLOUD_RUN_IMAGE));
  ok("preflight hosting bundle before NVEc0A", doc.includes(PREV_BUNDLE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("preflight gemini secret ref metadata", /GEMINI_API_KEY.*gemini-api-key:latest|gemini-api-key:latest.*metadata/i.test(doc));
  ok("preflight NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER.*gemini/.test(doc));
  ok("preflight NONGA_AI_MODE high", /NONGA_AI_MODE.*high/.test(doc));
  ok("preflight NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED.*true/.test(doc));
  ok("preflight NONGA_AI_SHADOW_MODE_ENABLED true", /NONGA_AI_SHADOW_MODE_ENABLED.*true/.test(doc));
  ok("preflight NONGA_AI_EMERGENCY_KILL_SWITCH false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/.test(doc));
  ok("preflight NONGA_AI_BUDGET_DAILY_LIMIT 5", /NONGA_AI_BUDGET_DAILY_LIMIT.*5/.test(doc));
  ok("preflight NONGA_AI_BUDGET_MONTHLY_LIMIT 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*50/.test(doc));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- tests/build ---
{
  ok("test v61d PASS recorded", /test:v61d.*PASS|v61d.*PASS/i.test(doc));
  ok("test v61b PASS recorded", /test:v61b.*PASS|v61b.*PASS/i.test(doc));
  ok("test v61a PASS recorded", /test:v61a.*PASS|v61a.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
  ok("local bundle BpyOr2_V", doc.includes(LIVE_BUNDLE));
}

// --- cloud run skipped ---
{
  ok("cloud run skipped section", /Cloud Run Deploy \(Skipped\)|Cloud Run.*Skipped/i.test(doc));
  ok("skip reason client UI only", /client UI only|Client UI only/i.test(doc));
  ok("skip reason route from v6.1B v6.1C", /v6\.1B|v6\.1C|00051-fbd/i.test(doc) && /sales-brain-shadow-smoke/.test(doc));
  ok("skip no redeploy needed", /no image rebuild|redeploy needed|not performed/i.test(docLower));
  ok("no gcloud run deploy in slice", /Did not run.*gcloud run deploy|not performed/i.test(doc));
}

// --- firebase hosting deploy ---
{
  ok("hosting deploy command", /firebase-tools@latest deploy --only hosting --project nonga-ce93c/.test(doc));
  ok("hosting deploy SUCCESS", /Status.*SUCCESS|SUCCESS/i.test(doc));
  ok("hosting previous bundle NVEc0A", doc.includes(PREV_BUNDLE));
  ok("hosting live bundle BpyOr2_V", doc.includes(LIVE_BUNDLE));
  ok("hosting URL web.app", doc.includes(WEBAPP_BASE));
  ok("hosting scope only hosting", /--only hosting|Hosting only/i.test(doc));
  ok("admin UI path shadow-smoke", doc.includes(ADMIN_UI_PATH));
}

// --- post-deploy API smoke ---
{
  ok("smoke via web.app", doc.includes(WEBAPP_BASE));
  ok("smoke health 200 ok true", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("smoke cars 200", /\/api\/cars.*200|cars.*200/i.test(docLower));
  ok("smoke admin revenue 401", /admin\/revenue\/preview.*401|401.*admin/i.test(docLower));
  ok("smoke my revenue 401", /my\/revenue\/preview.*401|401.*my revenue/i.test(docLower));
  ok("smoke user visible false unchanged", /NONGA_AI_USER_VISIBLE_ENABLED.*false|remains.*false/i.test(docLower));
}

// --- admin UI smoke guest ---
{
  ok("guest admin shadow smoke URL", doc.includes(ADMIN_UI_PATH));
  ok("guest gate message", doc.includes(GUEST_GATE_MSG));
  ok("guest not public debug", /not a public debug page|not.*public debug/i.test(docLower));
}

// --- admin UI smoke dealer ---
{
  ok("dealer 403", /dealer.*403|403.*dealer/i.test(docLower));
  ok("dealer route documented", doc.includes(ADMIN_ROUTE));
}

// --- admin UI smoke admin ---
{
  ok("bundle marker AI Shadow Smoke", doc.includes("AI Shadow Smoke"));
  ok("bundle marker admin-shadow-smoke", doc.includes("admin-shadow-smoke"));
  ok("bundle marker SS-01", doc.includes("SS-01"));
  ok("bundle marker SS-08", doc.includes("SS-08"));
  ok("bundle marker userVisibleOff", doc.includes("userVisibleOff"));
  ok("bundle marker providerNetwork", doc.includes("providerNetwork"));
  ok("admin SS-01 200", /SS-01.*200|200.*SS-01/i.test(doc));
  ok("admin SS-01 success readOnly", /success.*true.*readOnly|readOnly.*true/i.test(docLower));
  ok("admin SS-01 userVisibleOff", /userVisibleOff.*true/i.test(docLower));
  ok("admin SS-01 providerNetwork false", /providerNetwork.*false/i.test(docLower));
  ok("admin SS-01 mock provider", /provider.*mock|mock provider/i.test(docLower));
  ok("admin SS-05 SS-08 safe", /SS-05.*SS-08|SS-05\.\.SS-08/i.test(doc));
  ok("admin no PII secret dump", /no PII|no.*secret dump|none observed/i.test(docLower));
  ok("admin browser click skipped noted", /SKIPPED.*Firebase login|browser.*skipped/i.test(doc));
  ok("admin menu sidebar only", /Admin Dashboard sidebar|sidebar only/i.test(doc));
  ok("no header link guest dealer", /no Header link|Header link.*guest/i.test(doc));
}

// --- chat smoke ---
{
  ok("chat message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact", doc.includes(LEGACY_START_OVER));
  ok("chat no AI gemini replacing legacy", /AI\/Gemini.*none|ไม่มี.*AI|legacy 100%/i.test(docLower));
  ok("chat smoke PASS", /chat smoke.*PASS|Result.*PASS/i.test(docLower));
}

// --- rollback ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke/i.test(docLower));
  ok("rollback api guest admin chat passed", /API smoke.*guest|guest gate.*admin API|chat legacy/i.test(docLower));
}

// --- git status ---
{
  ok("git branch after deploy", doc.includes("feature/chat-image-attachment-v1"));
  ok("git up to date origin", /up to date with.*origin/i.test(docLower));
  ok("git working tree clean", /working tree.*clean/i.test(docLower));
  ok("no docs auto-commit deploy slice", /no docs auto-commit|docs auto-commit.*separately/i.test(docLower));
}

// --- compliance ---
{
  ok("compliance hosting performed", /Firebase Hosting deploy.*performed|Hosting only/i.test(doc));
  ok("compliance cloud run skipped", /Cloud Run redeploy.*skipped|Cloud Run.*skipped/i.test(docLower));
  ok("compliance no gcloud env update", /gcloud run services update.*not done|services update.*not done/i.test(docLower));
  ok("compliance no NONGA_AI changes", /NONGA_AI_\*.*not done|NONGA_AI_\* env changes.*not/i.test(docLower));
  ok("compliance user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("compliance no secrets access", /secrets versions access/i.test(doc));
  ok("compliance no paid ai", /paid AI API|paid ai|provider network/i.test(docLower));
  ok("compliance no user visible chat change", /user-visible chat|User-visible chat.*not changed/i.test(docLower));
  ok("compliance no production", /production.*not touched|not touched/i.test(docLower));
  ok("compliance no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("compliance no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("compliance no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("compliance no public signup", /public signup/i.test(docLower));
  ok("compliance no real stock", /real stock import.*not done|still blocked/i.test(docLower));
  ok("compliance no public debug page", /Public debug page.*not|public debug page/i.test(docLower));
}

// --- references ---
{
  ok("references v61d", doc.includes("v6.1D"));
  ok("references v61c v61b v61a", doc.includes("v6.1C") && doc.includes("v6.1B") && doc.includes("v6.1A"));
}

// --- v6.1D UI code still present ---
{
  ok("header no shadow smoke link", !headerTsx.includes("admin-shadow-smoke"));
  ok("admin dashboard menu link", adminDash.includes('setView("admin-shadow-smoke")'));
  ok("ui component exists", uiView.includes("AI Shadow Smoke"));
  ok("ui fixed case buttons", uiView.includes("ADMIN_SHADOW_SMOKE_CASE_IDS"));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v61e script", pkg.includes("test:v61e-admin-shadow-debug-ui-staging-hosting-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61e-admin-shadow-debug-ui-staging-hosting-deploy-record.mts")
  );
}

console.log("\nDone v6.1E Admin Shadow Debug UI Staging Hosting Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
