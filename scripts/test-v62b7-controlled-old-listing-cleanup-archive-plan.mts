/**
 * v6.2B.7 — Controlled Old Listing Cleanup / Archive Plan (static validation only)
 * npm run test:v62b7-controlled-old-listing-cleanup-archive-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.7-controlled-old-listing-cleanup-archive-plan.md";
const V62B6_DOC = "docs/v6.2B.6-real-data-package-redacted-go-record.md";
const MANIFEST_PATH =
  "docs/examples/v6.2B.1-real-stock-sample-manifest.placeholder.json";

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

const REAL_MAKE_MODEL_PRICE = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht|THB)\b/i,
];

const CLEANUP_EXECUTED_PATTERNS = [
  /firebase deploy/i,
  /gcloud run services update/i,
  /deleteDoc\s*\(/,
  /batch\.delete\s*\(/,
];

const HEAD_SHA = "122c00e6060a9b7a26678fa1cd5a64bb628708a5";
const CLEANUP_APPROVAL_PHRASE =
  "อนุมัติให้ cleanup/archive old staging listings บน staging เท่านั้น แบบ controlled rollback ได้ ตาม v6.2B.7";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.7 Controlled Old Listing Cleanup / Archive Plan ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b7-controlled-old-listing-cleanup-archive-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b6Doc = readFileSync(V62B6_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 10\./,
  ""
);

// --- doc exists + v6.2B.7 ---
{
  ok("cleanup plan doc exists", doc.length > 8000);
  ok("doc v6.2B.7 label", doc.includes("v6.2B.7"));
  ok(
    "doc controlled old listing cleanup archive",
    /controlled old listing cleanup|cleanup.*archive plan/i.test(doc)
  );
  ok(
    "doc docs tests only",
    /docs\/tests\/package only|PLANNING/i.test(doc)
  );
  ok("doc HEAD 122c00e", doc.includes(HEAD_SHA) || doc.includes("122c00e"));
  ok("doc references v62b6", /v6\.2B\.6/i.test(doc));
  ok("doc plan not execution", /plan only|not executed|PLANNING/i.test(doc));
}

// --- cleanup goal ---
{
  ok("cleanup goal section", /Cleanup Goal/i.test(doc));
  ok("goal separate old test from real pilot", /แยก old\/test|old\/test staging listings/i.test(doc));
  ok("goal prevent mixed search AI", /buyer search|น้องเอ.*แนะนำ/i.test(doc));
  ok("goal prepare staging before import 10", /เตรียม staging|import 10 real/i.test(doc));
  ok("goal not delete in v62b7", /ยังไม่ลบจริง|not executed/i.test(docLower));
}

// --- preferred strategy ---
{
  ok("preferred strategy section", /Preferred Strategy/i.test(doc));
  ok("archive hide deactivate first", /archive.*hide.*deactivate|archive\/hide/i.test(docLower));
  ok("hard delete separate approval", /hard delete.*separate approval|approval แยก/i.test(docLower));
  ok("rollback required", /rollback path|rollback required/i.test(docLower));
  ok("execution record separate", /execution record.*separate|separate.*execution record/i.test(docLower));
}

// --- candidate identification ---
{
  ok("candidate identification section", /Candidate Identification/i.test(doc));
  ok("criteria createdBefore", /createdBefore/i.test(doc));
  ok("criteria sourceTag", /sourceTag/i.test(doc));
  ok("criteria pilotBatchId", /pilotBatchId/i.test(doc));
  ok("criteria ownerUid", /ownerUid/i.test(doc));
  ok("criteria status", /CI-05.*status|status.*published/i.test(doc));
  ok("criteria test demo marker", /test.*demo marker|test\/demo marker/i.test(doc));
  ok("no per-car make model price plate in git", /ห้ามระบุ make\/model\/price\/plate/i.test(doc));
}

// --- safety checks ---
{
  ok("safety checks section", /Safety Checks/i.test(doc));
  ok("verify old test listing", /old\/test listing/i.test(docLower));
  ok("do not hide new 10 batch", /Do not hide new 10|ห้ามซ่อนรถใน batch ใหม่/i.test(doc));
  ok("no lead reveal outcome mutation", /lead.*reveal.*outcome|No lead\/reveal/i.test(doc));
  ok("no payment settlement mutation", /payment.*settlement|No payment/i.test(doc));
  ok("admin revenue statement integrity", /admin.*revenue|seller statement/i.test(docLower));
  ok("smoke marketplace search chat", /smoke test marketplace|marketplace\/search\/chat/i.test(docLower));
}

// --- cleanup execution plan ---
{
  ok("cleanup execution plan section", /Cleanup Execution Plan/i.test(doc));
  ok(
    "preflight git clean staging backup",
    /PF-01.*git clean|git clean\/synced/i.test(doc) &&
      /backup|PF-03/i.test(doc) &&
      /query count|PF-04/i.test(docLower)
  );
  ok("dry-run count", /dry-run count/i.test(docLower));
  ok("archive hide rollbackable flag", /archive\/hide.*status or flag|status or flag/i.test(docLower));
  ok("verify marketplace not show old", /old\/test listings.*not shown|not shown/i.test(docLower));
  ok("verify admin can inspect", /owner\/admin.*inspect|admin.*inspect/i.test(docLower));
  ok("rollback restore status flag", /restore previous.*status\/flag|Rollback/i.test(doc));
}

// --- import ordering ---
{
  ok("import ordering section", /Import Ordering/i.test(doc));
  ok("cleanup before import", /cleanup.*before.*import|cleanup pass.*import/i.test(docLower));
  ok("import 10 after cleanup", /import 10 real cars.*after|หลัง cleanup/i.test(doc));
  ok("smoke test real cars after import", /smoke test real cars/i.test(docLower));
  ok("hard delete later", /hard delete.*later|consider later/i.test(docLower));
}

// --- approval gate ---
{
  ok("approval gate section", /Approval Gate/i.test(doc));
  ok("v62b7 plan only", /v6\.2B\.7 is plan only|plan only/i.test(doc));
  ok("cleanup approval phrase required", doc.includes(CLEANUP_APPROVAL_PHRASE));
  ok("import approval phrase required", doc.includes(IMPORT_APPROVAL_PHRASE));
  ok("cleanup approval separate from import", /separate from import|approval phrase แยก/i.test(docLower));
  ok("import still blocked", /import.*blocked|still blocked/i.test(docLower));
}

// --- docs-first / no execution ---
{
  ok("docs-first only", /docs\/tests\/package only/i.test(docLower));
  ok("no runtime code", /runtime code.*not|not done/i.test(docLower));
  ok("no deploy", /deploy.*not done|Deploy.*not/i.test(docLower));
  ok("no env update", /env update.*not/i.test(docLower));
  ok("no real stock import", /real stock import.*blocked|still blocked/i.test(docLower));
  ok("no listing cleanup executed", /cleanup.*not executed|Listing cleanup executed.*not/i.test(docLower));
  ok("no hard delete executed", /Hard delete executed.*not|hard delete.*not done/i.test(docLower));
  ok("archive preferred over delete", /archive.*before.*hard delete|preferred first/i.test(docLower));
}

// --- forbidden scope ---
{
  ok("staging only", /staging only/i.test(docLower));
  ok("production forbidden", /production.*not touched|production excluded/i.test(docLower));
  ok("no firestore rules deploy", /Firestore rules/i.test(doc));
  ok("no secrets access", /secrets versions access/i.test(doc));
  ok("no payment lead reveal outcome", /payment.*settlement|lead.*reveal/i.test(docLower));
  ok("no public signup AI", /public signup|public AI/i.test(docLower));
  ok("no real gemini user visible", /Real Gemini user-visible|real gemini/i.test(docLower));
  ok("no image processing runtime", /image processing.*not in v6\.2B\.7/i.test(docLower));
  ok("no AI vision API", /AI\/vision API.*not/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B\.7/i.test(doc));
}

// --- no PII/real data in doc ---
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
  for (const pat of REAL_MAKE_MODEL_PRICE) {
    ok(`doc no real car data ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- no cleanup executed commands ---
{
  for (const pat of CLEANUP_EXECUTED_PATTERNS) {
    ok(`doc no cleanup exec ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
}

// --- manifest + v62b6 cross-ref ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest placeholder only", meta?.placeholderOnly === true);
  ok("v62b6 old listings not modified", /not deleted|not hidden|not modified/i.test(v62b6Doc));
  ok("v62b6 import blocked", /import.*blocked/i.test(v62b6Doc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62b7 script",
    pkg.includes("test:v62b7-controlled-old-listing-cleanup-archive-plan")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b7-controlled-old-listing-cleanup-archive-plan.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.7 Controlled Old Listing Cleanup / Archive Plan tests."
);
if (process.exitCode) process.exit(process.exitCode);
