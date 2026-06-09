/**
 * v6.2B.12 — Controlled Old Listing Cleanup/Archive Execution Record (static validation only)
 * npm run test:v62b12-controlled-old-listing-cleanup-archive-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.12-controlled-old-listing-cleanup-archive-execution-record.md";
const V62B11_DOC =
  "docs/v6.2B.11-controlled-old-listing-cleanup-archive-execution-plan.md";
const V62B10_DOC =
  "docs/v6.2B.10-authenticated-reference-count-review-read-only.md";
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

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla)\b/i,
  /\bHonda\s+(?:City|Civic)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const HEAD_SHA = "88db6a99d3f53d7a17459057cfa9d951c7abc6f0";
const CLEANUP_APPROVAL_PHRASE =
  "อนุมัติให้ cleanup/archive old staging listings บน staging เท่านั้น แบบ controlled rollback ได้ ตาม v6.2B.7";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.12 Controlled Old Listing Cleanup/Archive Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b12-controlled-old-listing-cleanup-archive-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b11Doc = readFileSync(V62B11_DOC, "utf8");
const v62b10Doc = readFileSync(V62B10_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 10\./,
  ""
);

// --- doc exists + v6.2B.12 ---
{
  ok("execution record doc exists", doc.length > 7000);
  ok("doc v6.2B.12 label", doc.includes("v6.2B.12"));
  ok(
    "doc cleanup archive execution record",
    /Cleanup.*Archive Execution Record/i.test(doc)
  );
  ok("doc HEAD 88db6a9", doc.includes(HEAD_SHA) || doc.includes("88db6a9"));
  ok("doc references v62b11", /v6\.2B\.11/i.test(doc));
  ok("doc references v62b10", /v6\.2B\.10/i.test(doc));
  ok("doc execution completed", /cleanup.*executed|executed.*hide/i.test(docLower));
}

// --- execution metadata ---
{
  ok("execution metadata section", /Execution Metadata/i.test(doc));
  ok("metadata staging only", /staging only/i.test(docLower));
  ok(
    "metadata branch head origin",
    /branch|head.*origin|88db6a9/i.test(docLower)
  );
  ok("metadata cleanup approval granted", /cleanup approval.*granted|granted.*v6\.2B\.7/i.test(doc));
  ok("metadata hide strategy", /listingStatus.*hidden|hide/i.test(doc));
  ok("metadata no hard delete", /hard delete.*none|hardDeleteCount.*0/i.test(doc));
  ok("metadata no deploy env", /deploy.*none|env update.*none/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight section", /Preflight.*Completed/i.test(doc));
  ok("preflight staging only", /staging only|nonga-ce93c/i.test(doc));
  ok("preflight candidate 17", /candidate.*17|17.*candidate/i.test(doc));
  ok("preflight protected batch zero", /protectedNewRealBatch.*0/i.test(doc));
}

// --- dry-run ---
{
  ok("dry-run section", /Dry-run Summary/i.test(doc));
  ok("dry-run count 17", /candidateOldTest.*17|wouldHide.*17/i.test(doc));
  ok("dry-run no hard delete", /wouldHardDelete.*0|hardDelete.*0/i.test(doc));
}

// --- execution summary ---
{
  ok("execution summary section", /Execution Summary/i.test(doc));
  ok("hidden count 17", /hiddenCount.*\*\*17\*\*|hiddenCount: 17/i.test(doc));
  ok("hard delete count 0", /hardDeleteCount.*\*\*0\*\*|hardDeleteCount: 0/i.test(doc));
  ok(
    "published before 17 after 0",
    /publishedBefore.*17/i.test(doc) && /publishedAfter.*0/i.test(doc)
  );
  ok(
    "no listingId in git",
    /ห้ามบันทึก listingId|no listingId|listingId.*forbidden/i.test(doc)
  );
}

// --- verification ---
{
  ok("verification section", /Verification After Cleanup/i.test(doc));
  ok("verify marketplace zero", /published.*0|count.*0/i.test(doc));
  ok("verify hidden 17", /hidden.*17|17.*hidden/i.test(doc));
  ok("verify no hard delete", /hard delete.*0|VF-05/i.test(doc));
}

// --- smoke ---
{
  ok("smoke test section", /Smoke Test Results/i.test(doc));
  ok("smoke api cars pass", /GET \/api\/cars.*PASS|count=0/i.test(doc));
  ok("smoke old listings not visible", /none visible|count=0/i.test(docLower));
}

// --- rollback ---
{
  ok("rollback section", /Rollback Readiness/i.test(doc));
  ok("rollback backup not in git", /not in git|ops local/i.test(docLower));
  ok("rollback not executed", /Rollback executed.*none|rollback.*successful/i.test(docLower));
}

// --- import gate ---
{
  ok("import gate section", /Import Gate/i.test(doc));
  ok("cleanup approval phrase", doc.includes(CLEANUP_APPROVAL_PHRASE));
  ok("cleanup execution complete", /cleanup execution.*complete|complete.*hide 17/i.test(docLower));
  ok("import approval phrase", doc.includes(IMPORT_APPROVAL_PHRASE));
  ok("import still blocked", /import.*blocked|still blocked/i.test(docLower));
  ok("import approval not granted", /not granted|pending/i.test(docLower));
}

// --- forbidden / compliance ---
{
  ok("forbidden in repo section", /Forbidden in Repo/i.test(doc));
  ok("staging only compliance", /staging only/i.test(docLower));
  ok("production not touched", /production.*not touched|excluded/i.test(docLower));
  ok("no deploy rules secrets", /Deploy.*none|Firestore rules deploy.*none|Secret access.*not done/i.test(doc));
  ok(
    "no lead payment mutation",
    /Lead.*mutation.*none|lead\/reveal\/outcome/i.test(docLower)
  );
  ok("no public signup AI gemini", /public signup|public AI|real Gemini/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2B\.12/i.test(doc));
  ok("git slice readFileSync only", /readFileSync only/i.test(docLower));
}

// --- no PII ---
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
    ok(
      `doc no raw image URL ${pat.source.slice(0, 15)}`,
      !pat.test(doc)
    );
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- cross-ref ---
{
  ok("v62b11 plan exists", /v6\.2B\.11/i.test(v62b11Doc));
  ok("v62b10 ready", /READY FOR CLEANUP APPROVAL/i.test(v62b10Doc));
}

// --- manifest ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest placeholder only", meta?.placeholderOnly === true);
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok(
    "script no execSync gcloud",
    !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode)
  );
  ok(
    "script no firebase admin",
    !/firebase-admin|getFirestore\s*\(/.test(selfCode)
  );
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62b12 script",
    pkg.includes(
      "test:v62b12-controlled-old-listing-cleanup-archive-execution-record"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b12-controlled-old-listing-cleanup-archive-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.12 Controlled Old Listing Cleanup/Archive Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
