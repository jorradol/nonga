/**
 * v6.2B.11 — Controlled Old Listing Cleanup/Archive Execution Plan (static validation only)
 * npm run test:v62b11-controlled-old-listing-cleanup-archive-execution-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.11-controlled-old-listing-cleanup-archive-execution-plan.md";
const V62B10_DOC =
  "docs/v6.2B.10-authenticated-reference-count-review-read-only.md";
const V62B7_DOC =
  "docs/v6.2B.7-controlled-old-listing-cleanup-archive-plan.md";
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

const FIRESTORE_WRITE_PATTERNS = [
  /\.set\s*\(/,
  /\.update\s*\(/,
  /\.delete\s*\(/,
  /batch\.commit\s*\(/,
];

const HEAD_SHA = "f197189e63f0975b463ebab647b7186095b007f1";
const CLEANUP_APPROVAL_PHRASE =
  "อนุมัติให้ cleanup/archive old staging listings บน staging เท่านั้น แบบ controlled rollback ได้ ตาม v6.2B.7";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.11 Controlled Old Listing Cleanup/Archive Execution Plan ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b11-controlled-old-listing-cleanup-archive-execution-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b10Doc = readFileSync(V62B10_DOC, "utf8");
const v62b7Doc = readFileSync(V62B7_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 14\./,
  ""
);

// --- doc exists + v6.2B.11 ---
{
  ok("execution plan doc exists", doc.length > 8000);
  ok("doc v6.2B.11 label", doc.includes("v6.2B.11"));
  ok(
    "doc cleanup archive execution plan",
    /Cleanup.*Archive Execution Plan/i.test(doc)
  );
  ok("doc HEAD f197189", doc.includes(HEAD_SHA) || doc.includes("f197189"));
  ok("doc references v62b10", /v6\.2B\.10/i.test(doc));
  ok("doc references v62b7", /v6\.2B\.7/i.test(doc));
  ok("doc execution plan only", /execution plan only|DOCS ONLY/i.test(doc));
  ok("doc not cleanup executed", /cleanup executed.*none|not executed/i.test(docLower));
}

// --- metadata ---
{
  ok("execution plan metadata section", /Execution Plan Metadata/i.test(doc));
  ok("metadata staging only", /staging only/i.test(docLower));
  ok(
    "metadata branch head origin",
    /branch|head.*origin|f197189/i.test(docLower)
  );
  ok("metadata v62b10 ready", /READY FOR CLEANUP APPROVAL/i.test(doc));
  ok("metadata found-count-only", /found-count-only/i.test(doc));
  ok(
    "metadata no cleanup import deploy",
    /no cleanup.*import|cleanup executed.*none/i.test(docLower)
  );
}

// --- candidate summary ---
{
  ok("candidate summary section", /Candidate Summary/i.test(doc));
  ok(
    "candidate count 17",
    /candidateOldTest.*\*\*17\*\*|candidateOldTest: 17/i.test(doc)
  );
  ok(
    "protected batch zero",
    /protectedNewRealBatch.*\*\*0\*\*|protectedNewRealBatch.*0/i.test(doc)
  );
  ok(
    "reference counts zero blocking",
    /buyerLeadRefs.*\*\*0\*\*|buyerLeadRefs.*0/i.test(doc)
  );
  ok(
    "report refs found-count-only",
    /reportModerationRefs.*\*\*6\*\*|found-count-only/i.test(doc)
  );
  ok(
    "no per-car in git",
    /ห้ามบันทึกข้อมูลรายคัน|no listingId|per-car.*forbidden/i.test(doc)
  );
}

// --- preflight ---
{
  ok("preflight section", /Preflight Before Cleanup/i.test(doc));
  ok("preflight git clean", /git clean|PF-01/i.test(doc));
  ok("preflight staging only", /staging only|PF-02/i.test(doc));
  ok("preflight backup", /backup|PF-06/i.test(doc));
  ok("preflight candidate count 17", /PF-07|count.*17/i.test(doc));
  ok("preflight cleanup approval required", doc.includes(CLEANUP_APPROVAL_PHRASE));
  ok("preflight no cleanup until approval", /No cleanup until|not granted/i.test(doc));
}

// --- strategy ---
{
  ok("archive hide strategy section", /Archive.*Hide.*Deactivate Strategy/i.test(doc));
  ok("strategy hide listingStatus", /listingStatus=hidden|hidden/i.test(doc));
  ok("strategy archive flag", /archive|archived/i.test(docLower));
  ok("strategy no hard delete", /hard delete.*not|no hard delete/i.test(docLower));
  ok("strategy rollbackable", /rollback|reversible/i.test(docLower));
  ok("strategy no lead mutation", /No mutation.*lead|lead.*unchanged/i.test(doc));
}

// --- dry-run ---
{
  ok("dry-run section", /Dry-run Procedure/i.test(doc));
  ok("dry-run count 17", /DR-01|expect.*17/i.test(doc));
  ok("dry-run protected batch", /DR-02|protectedNewRealBatch/i.test(doc));
  ok("dry-run reviewer sign-off", /sign-off|DR-05/i.test(doc));
}

// --- execute procedure ---
{
  ok("execute procedure section", /Execute Procedure/i.test(doc));
  ok("execute do not run until approval", /DO NOT RUN|After Approval/i.test(doc));
  ok("execute hide not delete", /listingStatus=hidden|No hard delete/i.test(doc));
  ok("execute no lead payment mutation", /No mutation.*lead|payment/i.test(doc));
}

// --- rollback ---
{
  ok("rollback plan section", /Rollback Plan/i.test(doc));
  ok("rollback restore status", /restore.*listingStatus|RB-02/i.test(doc));
  ok("rollback verify marketplace", /marketplace.*restored|RB-03/i.test(doc));
  ok("rollback triggers", /Rollback triggers/i.test(doc));
}

// --- verification ---
{
  ok("verification section", /Verification After Cleanup/i.test(doc));
  ok("verify marketplace not visible", /not visible|VF-01/i.test(doc));
  ok("verify api cars count", /GET \/api\/cars|VF-02/i.test(doc));
  ok("verify smoke required", /Smoke §9|smoke §9/i.test(doc));
}

// --- smoke plan ---
{
  ok("smoke plan section", /Marketplace.*Search.*Chat Smoke/i.test(doc));
  ok("smoke marketplace", /SM-01|Marketplace browse/i.test(doc));
  ok("smoke search", /SM-02|Search/i.test(doc));
  ok("smoke chat allowlisted", /SM-04|allowlisted pilot/i.test(doc));
  ok("smoke chat guest legacy", /SM-05|guest path/i.test(doc));
  ok("smoke admin revenue", /SM-07|revenue/i.test(doc));
  ok("smoke pass before import", /before.*import|import approval/i.test(docLower));
}

// --- import gate ---
{
  ok("import gate section", /Import Gate/i.test(doc));
  ok("cleanup approval phrase", doc.includes(CLEANUP_APPROVAL_PHRASE));
  ok("cleanup approval not granted", /not granted|required separately/i.test(docLower));
  ok("import approval phrase", doc.includes(IMPORT_APPROVAL_PHRASE));
  ok("import still blocked", /import.*blocked|still blocked/i.test(docLower));
  ok("import after cleanup smoke", /cleanup.*smoke|after.*cleanup/i.test(docLower));
}

// --- post-cleanup execution record ---
{
  ok("post-cleanup record section", /Post-cleanup Execution Record/i.test(doc));
  ok("future slice execution record", /future slice|v6\.2B\.12/i.test(doc));
  ok("execution record redacted counts", /redacted|counts only/i.test(docLower));
  ok("v62b11 does not create record", /v6\.2B\.11 does not create/i.test(doc));
}

// --- forbidden / compliance ---
{
  ok("forbidden actions section", /Forbidden Actions.*v6\.2B\.11/i.test(doc));
  ok("no runtime code", /Runtime code.*not done|docs\/tests\/package/i.test(docLower));
  ok("no deploy", /Deploy.*not done|no deploy/i.test(docLower));
  ok("no env update", /Env update.*not done/i.test(docLower));
  ok("no cleanup executed", /Cleanup.*not done|not executed/i.test(docLower));
  ok("no hard delete executed", /Hard delete.*not done|no hard delete/i.test(docLower));
  ok("no Firestore writes", /Firestore writes.*none|no Firestore writes/i.test(docLower));
  ok("staging only compliance", /staging only/i.test(docLower));
  ok("production forbidden", /production.*excluded|not touched/i.test(docLower));
  ok("no firestore rules deploy", /Firestore rules/i.test(doc));
  ok("no secrets access", /secrets versions access.*not done/i.test(docLower));
  ok(
    "no payment lead reveal outcome mutation",
    /Payment.*mutation.*none|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("no public signup AI", /public signup|public AI/i.test(docLower));
  ok("no real gemini path", /Real Gemini|real Gemini/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2B\.11/i.test(doc));
}

// --- no PII/real data ---
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

// --- no firestore writes in doc/script ---
{
  for (const pat of FIRESTORE_WRITE_PATTERNS) {
    ok(`doc no firestore write ${pat.source}`, !pat.test(doc));
  }
}

// --- cross-ref ---
{
  ok("v62b10 ready recommendation", /READY FOR CLEANUP APPROVAL/i.test(v62b10Doc));
  ok("v62b7 plan exists", /v6\.2B\.7/i.test(v62b7Doc));
  ok("v62b7 cleanup not executed in plan", /not executed|plan only/i.test(v62b7Doc));
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
    "package v62b11 script",
    pkg.includes(
      "test:v62b11-controlled-old-listing-cleanup-archive-execution-plan"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b11-controlled-old-listing-cleanup-archive-execution-plan.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.11 Controlled Old Listing Cleanup/Archive Execution Plan tests."
);
if (process.exitCode) process.exit(process.exitCode);
