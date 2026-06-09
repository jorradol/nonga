/**
 * v6.2B.8 — Read-only Old Listing Cleanup Preflight (static validation only)
 * npm run test:v62b8-read-only-old-listing-cleanup-preflight
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2B.8-read-only-old-listing-cleanup-preflight.md";
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

const HEAD_SHA = "14907c6dbc546f6876f2055b6d9b6c6f72394d66";
const CLEANUP_APPROVAL_PHRASE =
  "อนุมัติให้ cleanup/archive old staging listings บน staging เท่านั้น แบบ controlled rollback ได้ ตาม v6.2B.7";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2B.8 Read-only Old Listing Cleanup Preflight ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b8-read-only-old-listing-cleanup-preflight.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b7Doc = readFileSync(V62B7_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 8\./,
  ""
);

// --- doc exists + v6.2B.8 ---
{
  ok("preflight doc exists", doc.length > 7000);
  ok("doc v6.2B.8 label", doc.includes("v6.2B.8"));
  ok("doc read-only preflight", /read-only.*preflight|Read-only Old Listing/i.test(doc));
  ok("doc HEAD 14907c6", doc.includes(HEAD_SHA) || doc.includes("14907c6"));
  ok("doc references v62b7", /v6\.2B\.7/i.test(doc));
  ok("doc read-only only", /read-only only/i.test(docLower));
}

// --- preflight metadata ---
{
  ok("preflight metadata section", /Preflight Metadata/i.test(doc));
  ok("metadata staging only", /staging only/i.test(docLower));
  ok("metadata branch head origin", /branch|head.*origin|14907c6/i.test(docLower));
  ok("metadata working tree clean", /clean.*synced|working tree/i.test(docLower));
  ok("metadata no cleanup import deploy", /no cleanup.*import|cleanup executed.*none/i.test(docLower));
}

// --- redacted count summary ---
{
  ok("count summary section", /Old Listing Count Summary/i.test(doc));
  ok("count total visible published", /totalVisiblePublished|total visible/i.test(doc));
  ok("count candidate old test", /candidateOldTest|candidate old\/test/i.test(doc));
  ok("count unknown needs review", /unknownNeedsReview|needs-review/i.test(doc));
  ok("count protected new real batch zero", /protectedNewRealBatch.*\*\*0\*\*|protectedNewRealBatch.*0/i.test(doc));
  ok("redacted count summary only", /redacted summary|counts only|PENDING/i.test(docLower));
  ok("no per-car in git", /ห้ามบันทึกข้อมูลรายคัน|per-car.*forbidden/i.test(doc));
}

// --- candidate criteria ---
{
  ok("candidate criteria section", /Candidate Criteria Review/i.test(doc));
  ok("criteria createdBefore", /createdBefore/i.test(doc));
  ok("criteria sourceTag", /sourceTag/i.test(doc));
  ok("criteria pilotBatchId", /pilotBatchId/i.test(doc));
  ok("criteria ownerUid", /ownerUid/i.test(doc));
  ok("criteria status", /status/i.test(doc));
  ok("criteria test demo marker", /test\/demo marker/i.test(doc));
  ok("criteria count only no expose", /count เท่านั้น|counting only/i.test(doc));
}

// --- safety risk summary ---
{
  ok("safety risk section", /Safety Risk Summary/i.test(doc));
  ok("risk lead references", /lead references/i.test(docLower));
  ok("risk reveal references", /reveal references/i.test(docLower));
  ok("risk outcome references", /outcome references/i.test(docLower));
  ok("risk payment settlement", /payment references|settlement references/i.test(docLower));
  ok("risk no mutation", /no mutation|ห้าม mutate/i.test(doc));
  ok("risk FIX REQUIRED if present", /FIX REQUIRED.*reference|reference risk/i.test(docLower));
}

// --- cleanup recommendation ---
{
  ok("cleanup recommendation section", /Cleanup Readiness Recommendation/i.test(doc));
  ok("rec READY FIX NO-GO PENDING", /READY FOR CLEANUP APPROVAL.*FIX REQUIRED.*NO-GO.*PENDING/is.test(doc));
  ok("cleanup approval phrase required", doc.includes(CLEANUP_APPROVAL_PHRASE));
  ok("cleanup approval separate", /separately|approval phrase.*required/i.test(docLower));
}

// --- import gate ---
{
  ok("import gate section", /Import Gate/i.test(doc));
  ok("import still blocked", /import.*blocked|still blocked/i.test(docLower));
  ok("import approval phrase required", doc.includes(IMPORT_APPROVAL_PHRASE));
  ok("import waits cleanup preflight", /cleanup preflight|preflight.*approval/i.test(docLower));
}

// --- read-only / no execution ---
{
  ok("read-only only", /read-only only|read-only preflight/i.test(docLower));
  ok("no runtime code", /docs\/tests\/package only|not in v6\.2B\.8/i.test(docLower));
  ok("no deploy", /deploy.*none|no deploy/i.test(docLower));
  ok("no env update", /env update.*none/i.test(docLower));
  ok("no import", /import executed.*none|import.*blocked/i.test(docLower));
  ok("no cleanup executed", /cleanup executed.*none|no cleanup executed/i.test(docLower));
  ok("no hard delete", /Hard delete.*none|hard delete/i.test(docLower));
  ok("no Firestore writes", /Firestore writes.*none|no Firestore writes/i.test(docLower));
}

// --- forbidden scope ---
{
  ok("staging only compliance", /staging only/i.test(docLower));
  ok("production forbidden", /production.*excluded|forbidden/i.test(docLower));
  ok("no firestore rules deploy", /Firestore rules/i.test(doc));
  ok("no secrets access", /Secret access.*not done|secrets versions access/i.test(docLower));
  ok("no payment lead reveal outcome mutation", /Payment.*mutation.*none|no mutation/i.test(docLower));
  ok("no public signup AI", /public signup|public AI/i.test(docLower));
  ok("no real gemini path", /Real Gemini|real Gemini/i.test(doc));
  ok("no image processing AI vision", /Image processing.*not|AI vision API.*not/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B\.8/i.test(doc));
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
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
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

// --- cross-ref v62b7 ---
{
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
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase admin", !/firebase-admin|getFirestore\s*\(/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62b8 script",
    pkg.includes("test:v62b8-read-only-old-listing-cleanup-preflight")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b8-read-only-old-listing-cleanup-preflight.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.8 Read-only Old Listing Cleanup Preflight tests."
);
if (process.exitCode) process.exit(process.exitCode);
