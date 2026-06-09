/**
 * v6.2B.10 — Authenticated Reference Count Review Read-only (static validation only)
 * npm run test:v62b10-authenticated-reference-count-review-read-only
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.10-authenticated-reference-count-review-read-only.md";
const V62B9_DOC =
  "docs/v6.2B.9-read-only-old-listing-aggregate-query-execution-record.md";
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

const HEAD_SHA = "06b9ad3a9041a4679458d068fcd458b8498128b1";
const CLEANUP_APPROVAL_PHRASE =
  "อนุมัติให้ cleanup/archive old staging listings บน staging เท่านั้น แบบ controlled rollback ได้ ตาม v6.2B.7";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.10 Authenticated Reference Count Review Read-only ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b10-authenticated-reference-count-review-read-only.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b9Doc = readFileSync(V62B9_DOC, "utf8");
const v62b7Doc = readFileSync(V62B7_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 8\./,
  ""
);

// --- doc exists + v6.2B.10 ---
{
  ok("review record doc exists", doc.length > 7000);
  ok("doc v6.2B.10 label", doc.includes("v6.2B.10"));
  ok(
    "doc authenticated reference count review",
    /Authenticated Reference Count Review/i.test(doc)
  );
  ok("doc HEAD 06b9ad3", doc.includes(HEAD_SHA) || doc.includes("06b9ad3"));
  ok("doc references v62b9", /v6\.2B\.9/i.test(doc));
  ok("doc references v62b7", /v6\.2B\.7/i.test(doc));
  ok(
    "doc authenticated read-only only",
    /authenticated read-only only/i.test(docLower)
  );
}

// --- preflight metadata ---
{
  ok("preflight metadata section", /Preflight Metadata/i.test(doc));
  ok("metadata staging only", /staging only/i.test(docLower));
  ok(
    "metadata branch head origin",
    /branch|head.*origin|06b9ad3/i.test(docLower)
  );
  ok(
    "metadata working tree clean",
    /clean.*synced|working tree/i.test(docLower)
  );
  ok(
    "metadata v62b9 fix required prior",
    /FIX REQUIRED|needs-review/i.test(doc)
  );
  ok(
    "metadata no secrets versions access",
    /secrets versions access.*not done|not.*gcloud secrets/i.test(docLower)
  );
  ok(
    "metadata no cleanup import deploy",
    /no cleanup.*import|cleanup executed.*none/i.test(docLower)
  );
}

// --- reference count summary (executed counts) ---
{
  ok("reference count summary section", /Reference Count Summary/i.test(doc));
  ok(
    "count candidate old test 17",
    /candidateOldTest.*\*\*17\*\*|candidateOldTest: 17/i.test(doc)
  );
  ok(
    "count buyerLeadRefs 0",
    /buyerLeadRefs.*\*\*0\*\*|buyerLeadRefs: 0/i.test(doc)
  );
  ok(
    "count sellerRevealRefs 0",
    /sellerRevealRefs.*\*\*0\*\*|sellerRevealRefs: 0/i.test(doc)
  );
  ok(
    "count outcomeRefs 0",
    /outcomeRefs.*\*\*0\*\*|outcomeRefs: 0/i.test(doc)
  );
  ok(
    "count pendingSaleRefs 0",
    /pendingSaleRefs.*\*\*0\*\*|pendingSaleRefs: 0/i.test(doc)
  );
  ok(
    "count paymentSettlementRefs 0",
    /paymentSettlementRefs.*\*\*0\*\*|paymentSettlementRefs: 0/i.test(doc)
  );
  ok(
    "count revenueRefs 0",
    /revenueRefs.*\*\*0\*\*|revenueRefs: 0/i.test(doc)
  );
  ok(
    "count reportModerationRefs 6",
    /reportModerationRefs.*\*\*6\*\*|reportModerationRefs: 6/i.test(doc)
  );
  ok(
    "reference risk found-count-only",
    /referenceRisk.*found-count-only|found-count-only/i.test(doc)
  );
  ok(
    "no per-car listingId in git",
    /no listingId|listingId.*forbidden|ห้ามบันทึกข้อมูลรายคัน/i.test(doc)
  );
}

// --- query method ---
{
  ok("query method section", /Query Method/i.test(doc));
  ok("query staging project", /nonga-ce93c/i.test(doc));
  ok("query criteria createdBefore", /createdBefore/i.test(doc));
  ok("query criteria sourceTag", /sourceTag/i.test(doc));
  ok("query criteria pilotBatchId", /pilotBatchId/i.test(doc));
  ok("query criteria status", /status|published cohort/i.test(doc));
  ok("query criteria test demo marker", /test\/demo marker/i.test(doc));
  ok("query counts only", /counts only|count-only/i.test(docLower));
}

// --- safety interpretation ---
{
  ok("safety interpretation section", /Safety Interpretation/i.test(doc));
  ok("interpret buyer lead zero", /buyerLead.*0|buyer lead.*0/i.test(docLower));
  ok(
    "interpret report found-count-only",
    /report.*found-count-only|reportModerationRefs/i.test(doc)
  );
  ok(
    "interpret admin revenue zero",
    /admin.*revenue|seller statement.*0/i.test(docLower)
  );
  ok("interpret not NO-GO", /not NO-GO/i.test(doc));
}

// --- cleanup recommendation ---
{
  ok(
    "cleanup recommendation section",
    /Cleanup Readiness Recommendation/i.test(doc)
  );
  ok(
    "rec READY FIX NO-GO",
    /READY FOR CLEANUP APPROVAL.*FIX REQUIRED.*NO-GO/is.test(doc)
  );
  ok(
    "rec READY for this record",
    /This review record.*READY FOR CLEANUP APPROVAL/i.test(doc)
  );
  ok("cleanup approval phrase required", doc.includes(CLEANUP_APPROVAL_PHRASE));
  ok(
    "cleanup approval separate",
    /separately|approval phrase.*required/i.test(docLower)
  );
}

// --- import gate ---
{
  ok("import gate section", /Import Gate/i.test(doc));
  ok("import still blocked", /import.*blocked|still blocked/i.test(docLower));
  ok("import approval phrase required", doc.includes(IMPORT_APPROVAL_PHRASE));
  ok(
    "import waits cleanup path",
    /cleanup.*approval|cleanup execution/i.test(docLower)
  );
}

// --- read-only / no execution ---
{
  ok(
    "authenticated read-only only",
    /authenticated read-only only/i.test(docLower)
  );
  ok(
    "no runtime code",
    /docs\/tests\/package only|not in v6\.2B\.10/i.test(docLower)
  );
  ok("no deploy", /deploy.*none|no deploy/i.test(docLower));
  ok("no env update", /env update.*none/i.test(docLower));
  ok("no import", /import executed.*none|import.*blocked/i.test(docLower));
  ok(
    "no cleanup executed",
    /cleanup executed.*none|no cleanup executed/i.test(docLower)
  );
  ok("no hard delete", /Hard delete.*none|hard delete/i.test(docLower));
  ok(
    "no Firestore writes",
    /Firestore writes.*none|no Firestore writes/i.test(docLower)
  );
}

// --- forbidden scope ---
{
  ok("staging only compliance", /staging only/i.test(docLower));
  ok("production forbidden", /production.*excluded|forbidden/i.test(docLower));
  ok("no firestore rules deploy", /Firestore rules/i.test(doc));
  ok(
    "no secrets versions access",
    /secrets versions access.*not done|not done/i.test(docLower)
  );
  ok(
    "no payment lead reveal outcome mutation",
    /Payment.*mutation.*none|no mutation/i.test(docLower)
  );
  ok("no public signup AI", /public signup|public AI/i.test(docLower));
  ok("no real gemini path", /Real Gemini|real Gemini/i.test(doc));
  ok(
    "no image processing AI vision",
    /Image processing.*not|AI vision API.*not/i.test(docLower)
  );
  ok("compliance section", /Compliance.*v6\.2B\.10/i.test(doc));
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

// --- cross-ref v62b9 / v62b7 ---
{
  ok("v62b9 execution record exists", /v6\.2B\.9/i.test(v62b9Doc));
  ok("v62b7 plan exists", /v6\.2B\.7/i.test(v62b7Doc));
  ok("v62b7 cleanup not executed", /not executed|plan only/i.test(v62b7Doc));
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
    "package v62b10 script",
    pkg.includes(
      "test:v62b10-authenticated-reference-count-review-read-only"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b10-authenticated-reference-count-review-read-only.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.10 Authenticated Reference Count Review Read-only tests."
);
if (process.exitCode) process.exit(process.exitCode);
