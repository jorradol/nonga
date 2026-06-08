/**
 * v6.1G — Real Gemini Shadow Call Dry-run Readiness (static validation only)
 * npm run test:v61g-real-gemini-shadow-call-dry-run-readiness
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.1G-real-gemini-shadow-call-dry-run-readiness.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "c8f8a3399a13dfa4b377b0aab38ec16953a0750e";
const WEBAPP_BASE = "https://nonga-ce93c.web.app";
const ADMIN_ROUTE = "/api/admin/sales-brain-shadow-smoke";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE_V61H =
  "อนุมัติให้ทดสอบ real Gemini shadow call เฉพาะ admin-only บน staging โดยไม่แสดงผลให้ผู้ใช้ทั่วไป ตาม v6.1H";
const SS_CASE_IDS = [
  "SS-01",
  "SS-02",
  "SS-03",
  "SS-04",
  "SS-05",
  "SS-06",
  "SS-07",
  "SS-08",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1G Real Gemini Shadow Call Dry-run Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61g-real-gemini-shadow-call-dry-run-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.1G ---
{
  ok("dry-run doc exists", doc.length > 5000);
  ok("doc v6.1G label", doc.includes("v6.1G"));
  ok("doc dry-run readiness title", /dry-run readiness/i.test(doc));
  ok("doc admin-only user-visible off", /admin-only.*user-visible off|User-visible Off/i.test(doc));
  ok("doc docs tests only", /docs\/tests only|dry-run docs only/i.test(docLower));
  ok("doc HEAD c8f8a33", doc.includes(HEAD_SHA) || doc.includes("c8f8a33"));
  ok("doc references v61f", doc.includes("v6.1F"));
}

// --- v6.1F manual smoke passed ---
{
  ok("manual smoke passed section", /v6\.1F Manual Smoke.*Passed|manual smoke.*ผ่าน/i.test(doc));
  ok("smoke guest gate passed", /Guest gate.*PASS|Guest gate ผ่าน/i.test(doc));
  ok("smoke dealer 403 passed", /Dealer.*403.*PASS|dealer.*block.*403/i.test(docLower));
  ok("smoke admin SS-01 SS-08", /SS-01\.\.SS-08.*PASS|Admin UI SS-01/i.test(doc));
  ok("smoke chat legacy exact", doc.includes(LEGACY_START_OVER));
  ok("smoke no AI gemini public", /No AI\/Gemini.*public|legacy 100%/i.test(doc));
  ok("smoke no PII secret dump", /No PII|no PII.*secret dump/i.test(doc));
  ok("smoke real stock blocked", /Real stock import.*blocked|still blocked/i.test(docLower));
}

// --- staging scope ---
{
  ok("staging project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("service nonga-staging", doc.includes("nonga-staging"));
  ok("region asia-southeast1", doc.includes("asia-southeast1"));
  ok("production excluded", /production.*excluded|ไม่แตะ production/i.test(docLower));
  ok("primary URL web.app", doc.includes(WEBAPP_BASE));
}

// --- dry-run readiness checklist ---
{
  ok("readiness checklist section", /Real Gemini Dry-run Readiness Checklist|dry-run readiness checklist/i.test(doc));
  ok("checklist user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("checklist provider gemini", /NONGA_AI_PROVIDER.*gemini|provider.*gemini/i.test(docLower));
  ok("checklist shadow true", /NONGA_AI_SHADOW_MODE_ENABLED.*true|shadow.*true/i.test(docLower));
  ok("checklist budget daily 5", /NONGA_AI_BUDGET_DAILY_LIMIT.*5|budget daily.*5/i.test(doc));
  ok("checklist budget monthly 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*50|budget monthly.*50/i.test(doc));
  ok("checklist kill switch", /NONGA_AI_EMERGENCY_KILL_SWITCH|kill switch/i.test(doc));
  ok("checklist rollback path", /rollback/i.test(docLower));
  ok("checklist admin route 401", /401/.test(doc));
  ok("checklist admin route 403", /403/.test(doc));
  ok("checklist admin route 200", /200/.test(doc));
  ok("checklist admin route 400", /400/.test(doc));
  ok("checklist no public endpoint", /no public endpoint|ไม่มี public route/i.test(docLower));
  for (const caseId of SS_CASE_IDS) {
    ok(`checklist fixed case ${caseId}`, doc.includes(caseId));
  }
  ok("checklist no custom prompt", /no custom prompt|ไม่มี custom prompt/i.test(docLower));
  ok("checklist no PII real stock", /no PII|real stock|ไม่มี phone/i.test(docLower));
  ok("checklist redaction before provider", /redact|redaction before provider/i.test(docLower));
  ok(
    "checklist admin debug panel only",
    /admin debug panel|แสดงเฉพาะ admin debug/i.test(docLower)
  );
  ok(
    "checklist provider output not replace userVisible",
    /ไม่แทน.*userVisibleResponse|must not replace.*userVisibleResponse/i.test(doc)
  );
  ok(
    "checklist logs no raw prompt PII secret",
    /logs.*ต้องไม่เก็บ|must not store.*raw prompt/i.test(doc)
  );
}

// --- DO NOT RUN YET ---
{
  ok("DO NOT RUN YET label", /DO NOT RUN YET/i.test(doc));
  ok("DO NOT RUN in v6.1G", /v6\.1G ห้ามรัน|not done in v6\.1G|DO NOT RUN in v6\.1G/i.test(doc));
  ok("future slice v6.1H", doc.includes("v6.1H"));
  ok(
    "future flag ADMIN_SHADOW_REAL_PROVIDER",
    doc.includes("NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED")
  );
  ok(
    "future user visible must stay false",
    /NONGA_AI_USER_VISIBLE_ENABLED.*false.*ต้องคง|must stay false|ต้องคงไว้/i.test(doc)
  );
  ok("future gcloud run services update", /gcloud run services update nonga-staging/.test(doc));
  ok("future kill switch rollback command", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("future no public chat change", /ไม่เปลี่ยน.*public chat|public chat path.*ไม่เปลี่ยน/i.test(doc));
}

// --- approval phrase v6.1H ---
{
  ok("approval phrase section", /Future v6\.1H Approval Phrase|approval phrase/i.test(doc));
  ok("approval phrase exact v61h", doc.includes(APPROVAL_PHRASE_V61H));
  ok("v61g dry-run only no real call", /v6\.1G.*dry-run|ห้าม real Gemini call/i.test(doc));
  ok(
    "approval required before real call",
    /ยังไม่ได้ approval phrase|ห้าม real Gemini call จนกว่า/i.test(doc)
  );
}

// --- future v6.1H acceptance criteria ---
{
  ok("acceptance criteria section", /Future v6\.1H Acceptance Criteria|v6\.1H Acceptance/i.test(doc));
  ok("acceptance SS-01 real gemini", /SS-01.*real Gemini|real Gemini shadow call/i.test(doc));
  ok("acceptance providerNetwork true admin", /providerNetwork.*true.*admin|true.*เฉพาะ admin/i.test(doc));
  ok("acceptance userVisibleOff true", /userVisibleOff.*true/i.test(docLower));
  ok("acceptance public chat legacy", /public chat.*legacy|ยัง legacy/i.test(docLower));
  ok("acceptance no raw PII", /no raw PII|ไม่มี phone\/email จริง/i.test(docLower));
  ok("acceptance no secret dump", /no secret dump|ไม่มี env\/secret value/i.test(docLower));
  ok("acceptance budget observed", /budget observed|budget limits/i.test(docLower));
  ok("acceptance kill switch rollback", /kill switch rollback/i.test(docLower));
  ok("acceptance no payment lead reveal", /no payment|lead.*reveal|outcome/i.test(docLower));
  ok("acceptance no real stock", /no real stock|real stock still blocked/i.test(docLower));
}

// --- real stock import gate ---
{
  ok("real stock import gate section", /Real Stock Import Gate|สต๊อกจริง/i.test(doc));
  ok("stock still blocked", /still blocked|ยังห้าม/i.test(docLower));
  ok("stock gate real gemini admin smoke", /real Gemini admin-only smoke/i.test(doc));
  ok(
    "stock gate AI conversation smoke",
    /AI conversation smoke.*user-visible controlled/i.test(doc)
  );
  ok(
    "stock gate sanitized approved dataset",
    /sanitized|approved dataset/i.test(docLower)
  );
}

// --- forbidden / no deploy / no env ---
{
  ok("forbidden no paid gemini real", /paid Gemini.*not done|ยังไม่เรียก paid Gemini/i.test(docLower));
  ok("forbidden no fetch AI provider", /fetch.*AI provider|fetch network/i.test(docLower));
  ok("forbidden no deploy", /Cloud Run.*not done|ยังไม่ deploy/i.test(docLower));
  ok(
    "forbidden no gcloud env update",
    /gcloud run services update.*not done|not done.*gcloud/i.test(docLower)
  );
  ok(
    "forbidden no NONGA_AI changes",
    /NONGA_AI_\*.*not done|NONGA_AI_\* env changes.*not/i.test(docLower)
  );
  ok(
    "forbidden user visible not true",
    /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc)
  );
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok(
    "forbidden no user visible chat change",
    /user-visible chat.*not changed|legacy 100%/i.test(docLower)
  );
  ok("forbidden no production", /production.*not touched|not touched/i.test(docLower));
  ok(
    "forbidden no payment settlement",
    /payment.*invoice.*settlement/i.test(docLower)
  );
  ok(
    "forbidden no lead reveal outcome",
    /buyer lead.*seller reveal|outcome/i.test(docLower)
  );
  ok("forbidden no public signup", /public signup/i.test(docLower));
}

// --- admin route documented ---
{
  ok("admin route documented", doc.includes(ADMIN_ROUTE));
  ok("providerNetwork false current", /providerNetwork.*false|mock.*read-only/i.test(docLower));
}

// --- compliance ---
{
  ok("compliance section", /Compliance.*v6\.1G|## 10\. Compliance/i.test(doc));
  ok("compliance dry-run docs only", /dry-run readiness|docs\/tests only/i.test(docLower));
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
  ok(
    "package v61g script",
    pkg.includes("test:v61g-real-gemini-shadow-call-dry-run-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61g-real-gemini-shadow-call-dry-run-readiness.mts")
  );
}

console.log("\nDone v6.1G Real Gemini Shadow Call Dry-run Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
