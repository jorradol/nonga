/**
 * v6.2E — Pilot Monitoring & Feedback Loop Readiness Plan (static validation only)
 * npm run test:v62e-pilot-monitoring-feedback-loop-readiness-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2E-pilot-monitoring-feedback-loop-readiness-plan.md";
const V62D_DOC =
  "docs/v6.2D-thailand-used-car-legal-compliance-readiness-plan.md";
const V62B15_DOC =
  "docs/v6.2B.15-real-stock-pilot-acceptance-go-no-go-review.md";
const V62B14_DOC =
  "docs/v6.2B.14-real-stock-manual-smoke-test-allowlisted-staging.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
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
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis|Revo|Vigo)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V|Accord)\b/i,
  /\bFord\s+Everest\b/i,
  /\bMitsubishi\s+Pajero\b/i,
  /\bIsuzu\s+(?:D-Max|Mu-X)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const FIREBASE_UID_PATTERNS = [/\b[a-zA-Z0-9]{28}\b/];

const HEAD_SHA = "d80846dd497743271a763cf2eee3dc497d6351db";
const SEARCH_PROMPT = "งบ 4 แสน มีรถอะไรน่าเล่น";
const INSUFFICIENT_DATA_MSG = "ข้อมูลประกาศยังไม่พอ";
const STAGING_URL = "https://a.nongbot.org";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2E Pilot Monitoring & Feedback Loop Readiness Plan ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e-pilot-monitoring-feedback-loop-readiness-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62dDoc = readFileSync(V62D_DOC, "utf8");
const v62b15Doc = readFileSync(V62B15_DOC, "utf8");
const v62b14Doc = readFileSync(V62B14_DOC, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in feedback[\s\S]*?## 4\./,
  "## 4."
);

// --- doc exists + v6.2E ---
{
  ok("readiness doc exists", doc.length > 10000);
  ok("doc v6.2E label", doc.includes("v6.2E"));
  ok(
    "doc pilot monitoring feedback loop",
    /pilot monitoring.*feedback loop/i.test(doc)
  );
  ok(
    "doc docs tests only",
    /docs\/tests\/package only|docs\/tests only/i.test(docLower)
  );
  ok("doc HEAD d80846d", doc.includes(HEAD_SHA) || doc.includes("d80846d"));
  ok("doc references v62d", /v6\.2D/i.test(doc));
  ok("doc references v62b15", /v6\.2B\.15/i.test(doc));
  ok("doc planning not runtime", /planning only|not implemented/i.test(docLower));
  ok("doc checklist requirements only", /checklist\/requirements only/i.test(docLower));
}

// --- pilot monitoring goal ---
{
  ok("monitoring goal section", /Pilot Monitoring Goal/i.test(doc));
  ok("controlled staging pilot only", /controlled staging pilot only/i.test(docLower));
  ok("tester lung allowlisted", /ลุง.*allowlisted|allowlisted tester/i.test(doc));
  ok("inventory 10 listings", /10.*listings|listings.*10/i.test(docLower));
  ok("not public launch readiness", /not public launch|ไม่ใช่ public launch/i.test(docLower));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("evaluate search compare refine", /ค้นหา.*เทียบ.*refine|search.*compare.*refine/i.test(docLower));
}

// --- tester task list ---
{
  ok("tester task list section", /Tester Task List/i.test(doc));
  ok("task budget search prompt", doc.includes(SEARCH_PROMPT));
  ok("task fuel efficient", /ประหยัดน้ำมัน/i.test(doc));
  ok("task family car", /รถครอบครัว/i.test(doc));
  ok("task city driving", /ขับในเมือง/i.test(doc));
  ok("task compare 1 vs 2", /เทียบคันที่ 1 กับ 2/i.test(doc));
  ok("task refine fuel", /เอาประหยัดน้ำมันกว่า/i.test(doc));
  ok("task refine maintenance", /เอาดูแลง่ายกว่า/i.test(doc));
  ok("task refine interest", /น่าสนใจกว่า/i.test(doc));
  ok("task new chat no-context", /no-context|เปิดแชทใหม่/i.test(docLower));
  ok("task view cards images", /รูป.*การ์ด|cards.*images/i.test(docLower));
  ok("task guest legacy safe", /guest.*legacy|non-allowlisted/i.test(docLower));
}

// --- feedback capture fields ---
{
  ok("feedback capture section", /Feedback Capture Fields/i.test(doc));
  ok("field testerRole", /testerRole/i.test(doc));
  ok("field testDate", /testDate/i.test(doc));
  ok("field scenario", /scenario/i.test(doc));
  ok("field userPrompt redacted", /userPrompt.*redacted/i.test(docLower));
  ok("field resultCategory", /resultCategory/i.test(doc));
  ok("field severity", /severity.*low.*medium.*high.*blocker/i.test(docLower));
  ok("field expectedBehavior", /expectedBehavior/i.test(doc));
  ok("field actualBehavior no PII", /actualBehavior.*no PII|actualBehavior/i.test(doc));
  ok("field screenshotAllowed redact", /screenshotAllowed.*redact/i.test(docLower));
  ok("field recommendedFix", /recommendedFix/i.test(doc));
  ok("field owner product data frontend", /owner.*product.*data.*frontend/i.test(docLower));
}

// --- issue taxonomy ---
{
  ok("issue taxonomy section", /Issue Taxonomy/i.test(doc));
  ok("taxonomy bug", /### 4\.1 Bug|ระบบพัง|การ์ดไม่ขึ้น/i.test(doc));
  ok("taxonomy data issue", /data issue|ข้อมูลรถไม่ครบ/i.test(docLower));
  ok("taxonomy AI wording", /AI wording issue|แต่งข้อมูล/i.test(docLower));
  ok("taxonomy UX", /UX issue/i.test(doc));
  ok("taxonomy legal compliance", /legal\/compliance issue/i.test(doc));
  ok("taxonomy image issue", /image issue|รูปไม่โหลด/i.test(docLower));
}

// --- AI grounding checks ---
{
  ok("AI grounding section", /AI Grounding Checks/i.test(doc));
  ok("ground from listing first", /ข้อมูลประกาศจริง|listing.*ก่อน/i.test(doc));
  ok("no fabricate outside listing", /ห้ามแต่งข้อมูล/i.test(doc));
  ok("insufficient data message", doc.includes(INSUFFICIENT_DATA_MSG));
  ok("no warranty crash flood mileage", /ชนหนัก|น้ำท่วม|เลขไมล์/i.test(doc));
  ok("no overpromise", /คุ้มค่าแน่นอน|ดีที่สุดแน่นอน|overpromise/i.test(doc));
  ok("nong a tone warm trustworthy", /อบอุ่น.*น่าเชื่อถือ|tone.*น้องเอ/i.test(doc));
  ok("no real gemini public", /real Gemini.*not enabled|no real Gemini/i.test(docLower));
}

// --- privacy and legal monitoring ---
{
  ok("privacy legal monitoring section", /Privacy and Legal Monitoring/i.test(doc));
  ok("feedback no plate uid phone", /ห้าม.*ทะเบียน|No full plate in feedback/i.test(doc));
  ok("screenshot redact required", /screenshot.*redact|redact before store/i.test(docLower));
  ok("flag public licensePlate", /licensePlate.*blocker|public.*licensePlate/i.test(doc));
  ok("flag public wholesale", /wholesale.*blocker|public wholesale/i.test(doc));
  ok("legal high blocker pause pilot", /pause pilot|หยุดขยาย pilot/i.test(doc));
}

// --- metrics and acceptance ---
{
  ok("metrics section", /Metrics and Acceptance Criteria/i.test(doc));
  ok("metric search pass rate", /search pass rate/i.test(docLower));
  ok("metric compare refine pass rate", /compare\/refine pass rate/i.test(docLower));
  ok("metric no-context safe rate", /no-context safe rate/i.test(docLower));
  ok("metric card image display", /card\/image display pass rate/i.test(docLower));
  ok("metric data issue count", /data issue count/i.test(docLower));
  ok("metric AI wording count", /AI wording issue count/i.test(docLower));
  ok("metric legal compliance count", /legal\/compliance issue count/i.test(docLower));
  ok("metric blocker count", /blocker count/i.test(docLower));
  ok("criteria continue controlled pilot", /continue controlled pilot/i.test(docLower));
  ok("criteria fix required", /FIX REQUIRED|fix required/i.test(doc));
  ok("criteria pause pilot", /pause pilot|PAUSE PILOT/i.test(doc));
}

// --- go/no-go gate ---
{
  ok("go no-go section", /Go\/No-go Gate/i.test(doc));
  ok("GO continue controlled staging", /GO.*continue controlled staging|continue controlled staging pilot/i.test(doc));
  ok("FIX REQUIRED gate", /FIX REQUIRED/i.test(doc));
  ok("NO-GO pause PII plate fabrication", /PII leak|plate leak|fabrication|pause pilot/i.test(docLower));
  ok("NO-GO public launch", /public launch.*NO-GO|NO-GO.*public launch/i.test(docLower));
  ok("NO-GO production", /production.*NO-GO|NO-GO.*production/i.test(docLower));
  ok("NO-GO public AI gemini", /public AI.*NO-GO|real Gemini.*NO-GO/i.test(docLower));
}

// --- reporting cadence ---
{
  ok("reporting cadence section", /Reporting Cadence/i.test(doc));
  ok("redacted summary only", /redacted summary/i.test(docLower));
  ok("no per-car in git", /no per-car|Per-car make/i.test(doc));
  ok("aggregate sanitized examples", /aggregate.*sanitized|sanitized examples/i.test(docLower));
  ok("feedback outside repo", /outside repo|not in git/i.test(docLower));
}

// --- scope guards / forbidden ---
{
  ok("docs-first only", /docs\/tests\/package only/i.test(docLower));
  ok("no runtime code", /runtime.*not|not in v6\.2E|not implemented/i.test(docLower));
  ok("no deploy", /deploy.*not done|no deploy/i.test(docLower));
  ok("no env update", /env update.*not done|env update/i.test(docLower));
  ok("no import additional", /import.*not done|import เพิ่ม/i.test(docLower));
  ok("no cleanup hide additional", /cleanup.*not done|hide เพิ่ม/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*not done|no Firestore writes/i.test(docLower));
  ok("forbidden no firestore rules", /Firestore rules deploy/i.test(doc));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok(
    "forbidden no payment settlement lead reveal outcome",
    /payment.*settlement|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no public AI", /public AI/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2E/i.test(doc));
}

// --- no PII/secrets/real car data in doc ---
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
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate data ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car data ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of FIREBASE_UID_PATTERNS) {
    ok(`doc no firebase uid ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- cross-ref v62d / v62b15 / v62b14 ---
{
  ok("v62d insufficient data msg", v62dDoc.includes(INSUFFICIENT_DATA_MSG));
  ok("v62b15 GO controlled staging", /GO.*controlled staging pilot/i.test(v62b15Doc));
  ok("v62b14 search prompt", v62b14Doc.includes(SEARCH_PROMPT));
  ok("v62b14 compare refine", /compare.*refine/i.test(v62b14Doc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62e script",
    pkg.includes("test:v62e-pilot-monitoring-feedback-loop-readiness-plan")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62e-pilot-monitoring-feedback-loop-readiness-plan.mts"
    )
  );
}

console.log(
  "\nDone v6.2E Pilot Monitoring & Feedback Loop Readiness Plan tests."
);
if (process.exitCode) process.exit(process.exitCode);
