/**
 * v6.2B.3 — Real Stock Data Package Intake Dry-run Plan (static validation only)
 * npm run test:v62b3-real-stock-data-package-intake-dry-run-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2B.3-real-stock-data-package-intake-dry-run-plan.md";
const V62B2_DOC = "docs/v6.2B.2-data-package-review-checklist-ops-intake-guide.md";
const V62B1_DOC = "docs/v6.2B.1-pre-import-data-package-template.md";
const MANIFEST_PATH =
  "docs/examples/v6.2B.1-real-stock-sample-manifest.placeholder.json";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "66b5fa7dc10a41f10a5487f14f35384034da326c";
const APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2B.3 Real Stock Data Package Intake Dry-run Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b3-real-stock-data-package-intake-dry-run-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b2Doc = readFileSync(V62B2_DOC, "utf8");
const v62b1Doc = readFileSync(V62B1_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

// --- doc exists + v6.2B.3 ---
{
  ok("dry-run plan doc exists", doc.length > 8000);
  ok("doc v6.2B.3 label", doc.includes("v6.2B.3"));
  ok("doc intake dry-run", /intake dry-run|dry-run plan/i.test(doc));
  ok("doc docs tests only", /docs\/tests\/package only|dry-run plan only/i.test(docLower));
  ok("doc HEAD 66b5fa7", doc.includes(HEAD_SHA) || doc.includes("66b5fa7"));
  ok("doc references v62b2", /v6\.2B\.2/i.test(doc));
  ok("doc not import step", /ไม่ใช่ import step|not import/i.test(docLower));
}

// --- dry-run input location ---
{
  ok("input location section", /Dry-run Input Location/i.test(doc));
  ok("real data outside repo", /data package จริงต้องอยู่นอก repo|real data.*outside repo|นอก repo/i.test(docLower));
  ok("forbid commit raw real data", /ห้าม commit raw real data|raw real data.*forbidden|ห้าม commit/i.test(docLower));
  ok("forbid secret uid prompt customer", /ห้ามแนบ secret|secret.*UID.*prompt/i.test(doc));
  ok("placeholder redacted only in repo", /placeholder.*redacted|placeholder\/redacted/i.test(docLower));
}

// --- dry-run before import ---
{
  ok("dry-run before import", /dry-run before import|dry-run ก่อน|ก่อน import/i.test(docLower));
  ok("import blocked v62b3", /import in v6\.2B\.3.*blocked|import blocked/i.test(docLower));
  ok("import remains blocked", /real stock import remains blocked|import still blocked|still blocked/i.test(docLower));
  ok("no import even if dry-run pass", /ยังไม่ import แม้ dry-run ผ่าน|still no import|still blocked/i.test(docLower));
}

// --- intake dry-run checklist ---
{
  ok("intake checklist section", /Intake Dry-run Checklist/i.test(doc));
  ok("check batch 5-10", /5.*10.*คัน|5–10/i.test(doc));
  ok("check source and owner", /source และผู้รับผิดชอบ|ทุกคันมี source/i.test(doc));
  ok("check seller consent", /seller.*consent|dealer consent/i.test(docLower));
  ok("check image rights", /image rights/i.test(docLower));
  ok("check PII forbidden", /PII.*forbidden|forbidden fields/i.test(docLower));
  ok("check still for sale", /ขายอยู่|still.*sale/i.test(docLower));
  ok("check not reserved", /ไม่จอง|not reserved/i.test(docLower));
  ok("check price updated", /ราคาอัปเดต|price.*updated/i.test(docLower));
  ok("check photo match car", /รูปตรงกับรถ|photo match/i.test(docLower));
  ok("check data quality v62b", /v6\.2B\.1.*v6\.2B\.2|data quality/i.test(doc));
  ok("check rollback delist", /rollback.*delist|delist contact/i.test(docLower));
}

// --- redaction rules ---
{
  ok("redaction section", /Redaction Rules/i.test(doc));
  ok("redact phone mask", /เบอร์โทร.*mask|mask.*ตัดออก/i.test(doc));
  ok("redact owner name", /ชื่อเจ้าของจริง/i.test(doc));
  ok("redact LINE", /LINE ID จริง/i.test(doc));
  ok("redact address", /ที่อยู่จริง/i.test(doc));
  ok("redact plate mask", /ทะเบียน.*mask|mask.*ทะเบียน/i.test(doc));
  ok("redact reject documents", /เอกสาร.*บัตร.*ใบเล่ม|สัญญา.*หลักฐาน/i.test(doc));
  ok("redact reject customer", /customer data.*reject/i.test(docLower));
}

// --- dry-run output ---
{
  ok("dry-run output section", /Dry-run Output/i.test(doc));
  ok("output pass fail count", /carsPassed|carsFailed|ผ่าน.*ไม่ผ่าน/i.test(docLower));
  ok("output no-go reasons no pii", /no-go.*no PII|no PII|code only/i.test(docLower));
  ok("output reviewer sign-off", /reviewer sign-off/i.test(docLower));
  ok("output rollback status", /rollback readiness status|rollback readiness/i.test(docLower));
  ok("output GO", /\*\*GO\*\*|recommendation.*GO/i.test(doc));
  ok("output FIX REQUIRED", /FIX REQUIRED/i.test(doc));
  ok("output NO-GO", /\*\*NO-GO\*\*|recommendation.*NO-GO/i.test(doc));
}

// --- approval gate ---
{
  ok("approval gate section", /Approval Gate/i.test(doc));
  ok("approval phrase required", doc.includes(APPROVAL_PHRASE));
  ok("separate execution record", /separate execution record|execution record.*before.*after/i.test(docLower));
  ok("v62b3 no phrase required", /v6\.2B\.3.*ไม่ต้องการ approval|ไม่ต้องการ approval phrase/i.test(doc));
}

// --- pilot scope ---
{
  ok("pilot scope section", /Pilot Scope Reminder/i.test(doc));
  ok("staging only", /staging only/i.test(docLower));
  ok("closed pilot only", /closed pilot only/i.test(docLower));
  ok("allowlist only", /allowlisted tester only|allowlist only/i.test(docLower));
  ok("batch 5-10 scope", /5.*10/i.test(doc));
  ok("no production", /production.*excluded|not touched/i.test(docLower));
  ok("no public AI", /public ai.*not|public AI/i.test(docLower));
  ok("no real gemini", /real gemini user-visible.*not/i.test(docLower));
  ok("chat shadow false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
}

// --- rights consent cross-ref ---
{
  ok("v62b2 rights consent", /Rights and Consent|seller consent/i.test(v62b2Doc));
  ok("v62b2 PII review", /PII and Forbidden/i.test(v62b2Doc));
  ok("v62b2 stale listing", /Stale Listing Review/i.test(v62b2Doc));
}

// --- no real stock in repo ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest placeholder only", meta?.placeholderOnly === true);
  ok("manifest import blocked flag", meta?.realStockImportBlocked === true);
  ok("v62b1 no real data commit", /ห้าม commit.*ข้อมูลจริง|raw real data/i.test(v62b1Doc));
  ok("no real stock data in repo doc", /real stock data in repo.*none|forbidden/i.test(docLower));
}

// --- forbidden slice ---
{
  ok("forbidden no runtime", /runtime code.*not done|not in this slice/i.test(docLower));
  ok("forbidden no deploy", /deploy.*not done|ไม่ deploy/i.test(docLower));
  ok("forbidden no env update", /env update.*not done/i.test(docLower));
  ok("forbidden no production", /production.*not touched|excluded/i.test(docLower));
  ok("forbidden no firestore rules", /firestore rules.*not done/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no payment lead", /payment.*settlement|lead.*reveal/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B\.3/i.test(doc));
}

// --- no secrets in doc ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v62b3 script",
    pkg.includes("test:v62b3-real-stock-data-package-intake-dry-run-plan")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62b3-real-stock-data-package-intake-dry-run-plan.mts")
  );
}

console.log("\nDone v6.2B.3 Real Stock Data Package Intake Dry-run Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
