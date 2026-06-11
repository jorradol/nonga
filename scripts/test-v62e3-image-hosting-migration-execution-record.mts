/**
 * v6.2E.3 — Image Hosting Migration Execution Record (static validation only)
 * npm run test:v62e3-image-hosting-migration-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2E.3-image-hosting-migration-execution-record.md";
const V62E2_DOC = "docs/v6.2E.2-image-hosting-migration-readiness-plan.md";
const V62E1A_DOC = "docs/v6.2E.1A-hosting-deploy-execution-record.md";
const V62B13_DOC =
  "docs/v6.2B.13-controlled-real-stock-import-execution-record.md";

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
  /drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]{10,}/i,
  /firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^"'\s]{30,}/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const FIREBASE_UID_PATTERNS = [/\b[a-zA-Z0-9]{28}\b/];

const HEAD_SHA = "d8f9a7bc5e92e8806540b2f829fc3685c186a375";
const PILOT_BATCH_ID = "v62b-real-pilot-001";
const STAGING_URL = "https://a.nongbot.org";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2E.3 Image Hosting Migration Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e3-image-hosting-migration-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62e2Doc = readFileSync(V62E2_DOC, "utf8");
const v62e1aDoc = readFileSync(V62E1A_DOC, "utf8");
const v62b13Doc = readFileSync(V62B13_DOC, "utf8");

// --- doc exists + v6.2E.3 ---
{
  ok("execution doc exists", doc.length > 8000);
  ok("doc v6.2E.3 label", doc.includes("v6.2E.3"));
  ok(
    "doc image hosting migration execution",
    /image hosting migration execution record/i.test(doc)
  );
  ok("doc HEAD d8f9a7b", doc.includes(HEAD_SHA) || doc.includes("d8f9a7b"));
  ok("doc references v62e2", /v6\.2E\.2/i.test(doc));
  ok("doc execution record redacted", /EXECUTION RECORD.*REDACTED/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok("doc migration executed", /migration.*executed/i.test(docLower));
}

// --- execution metadata ---
{
  ok("metadata section", /Execution Metadata/i.test(doc));
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("pilotBatchId", doc.includes(PILOT_BATCH_ID));
  ok("storage path pattern", /listing-images\/v62b-real-pilot-001/i.test(doc));
  ok("manifest outside repo", /outside repo|secure ops/i.test(docLower));
  ok("images field only", /images\[\].*only|images\[\]` only/i.test(doc));
  ok("no hosting deploy required", /hosting deploy.*not required|not required/i.test(docLower));
  ok("no backend deploy", /backend.*none|Cloud Run.*none/i.test(docLower));
  ok("no env update", /env update.*none/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight git d8f9a7b", doc.includes("d8f9a7b"));
  ok("preflight pilot count 10", /pilot count.*\*\*10\*\*|count = \*\*10\*\*/i.test(doc));
  ok("preflight production excluded", /production.*excluded/i.test(docLower));
}

// --- dry-run ---
{
  ok("dry-run section", /Dry-run Summary/i.test(doc));
  ok("dry-run pilotListings 10", /pilotListings.*\*\*10\*\*|pilotListings=10/i.test(doc));
  ok("dry-run image slots 39", /imageSlotsToMigrate.*\*\*39\*\*|imageSlotsToMigrate=39/i.test(doc));
  ok("dry-run source access pass", /sourceAccessSample.*pass|sourceAccess=pass/i.test(docLower));
  ok("dry-run no per-car in repo", /no per-car|Per-car details/i.test(doc));
}

// --- migration summary ---
{
  ok("migration summary section", /Migration Summary/i.test(doc));
  ok("migratedListings 10", /migratedListings.*\*\*10\*\*|migratedListings=10/i.test(doc));
  ok("migratedImageSlots 39", /migratedImageSlots.*\*\*39\*\*|migratedImageSlots=39/i.test(doc));
  ok("failedImageSlots 0", /failedImageSlots.*\*\*0\*\*|failedImageSlots=0/i.test(doc));
  ok("publicDriveLinksAfter 0", /publicDriveLinksAfter.*\*\*0\*\*|publicDriveLinksAfter=0/i.test(doc));
  ok("sharp no ai provider", /sharp.*no AI|no AI provider/i.test(doc));
  ok("rollback not needed", /rollback.*not needed/i.test(docLower));
}

// --- post-migration verification ---
{
  ok("verification section", /Post-migration Verification/i.test(doc));
  ok("apiCarsCount 10", /apiCarsCount.*\*\*10\*\*|apiCarsCount=10/i.test(doc));
  ok("images 10/10", /10\/10/i.test(doc));
  ok("public plate zero", /publicPlate.*\*\*0\*\*|publicPlate=0/i.test(doc));
  ok("public wholesale zero", /publicWholesale.*\*\*0\*\*|publicWholesale=0/i.test(doc));
  ok("hidden 27 unchanged", /hidden.*\*\*27\*\*|hidden=27/i.test(doc));
  ok("sidebar รถมาใหม่ real image", /รถมาใหม่.*real image|sidebar.*PASS/i.test(doc));
  ok("marketplace cards real image", /marketplace.*real image|marketplace cards/i.test(docLower));
  ok("storage url sample pass", /Storage URL.*PASS|10\/10/i.test(doc));
}

// --- rollback ---
{
  ok("rollback section", /Rollback Readiness/i.test(doc));
  ok("rollback backup outside repo", /outside repo/i.test(docLower));
  ok("rollback path documented", /rollback method|ops script/i.test(docLower));
}

// --- safety / forbidden ---
{
  ok("safety section", /Safety Confirmations/i.test(doc));
  ok("forbidden in repo section", /Forbidden in Repo/i.test(doc));
  ok("forbidden no raw image url", /Raw.*URL|raw URL/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2E\.3/i.test(doc));
  ok("no production", /production.*not touched|production.*excluded/i.test(docLower));
  ok("no secrets access", /secrets versions access.*none|Secret access.*none/i.test(docLower));
  ok("no import cleanup hide", /import.*none|cleanup.*none/i.test(docLower));
  ok("no lead reveal outcome payment", /lead\/reveal\/outcome|payment.*none/i.test(docLower));
  ok("no public ai gemini", /public AI|real Gemini.*not enabled/i.test(doc));
}

// --- redacted summary block ---
{
  ok("redacted summary block", /Redacted Execution Summary/i.test(doc));
  ok("summary pilotListings=10", /pilotListings=10/.test(doc));
  ok("summary migratedImageSlots=39", /migratedImageSlots=39/.test(doc));
  ok("summary publicDriveLinksAfter=0", /publicDriveLinksAfter=0/.test(doc));
  ok("summary staging url a.nongbot", doc.includes(STAGING_URL) || /a\.nongbot\.org/.test(doc));
}

// --- no PII/secrets in doc ---
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
    ok(`doc no raw image ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of FIREBASE_UID_PATTERNS) {
    ok(`doc no firebase uid ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok("doc no secure ops full path leak", !/D:\\\\secure-ops/i.test(doc));
}

// --- cross-ref ---
{
  ok("v62e2 firebase storage recommendation", /Firebase Storage/i.test(v62e2Doc));
  ok("v62e1a drive hotlink open before", /Drive hotlink|not reliably hotlinkable/i.test(v62e1aDoc));
  ok("v62b13 pilot batch id", v62b13Doc.includes(PILOT_BATCH_ID));
}

// --- script static only ---
{
  const selfCode = selfSrc.split("// --- script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase admin", !/firebase-admin/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62e3 script",
    pkg.includes("test:v62e3-image-hosting-migration-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62e3-image-hosting-migration-execution-record.mts")
  );
}

console.log("\nDone v6.2E.3 Image Hosting Migration Execution Record tests.");
if (process.exitCode) process.exit(process.exitCode);
