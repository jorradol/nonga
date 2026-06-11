/**
 * v6.2E.2 — Image Hosting Migration Readiness Plan (static validation only)
 * npm run test:v62e2-image-hosting-migration-readiness-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2E.2-image-hosting-migration-readiness-plan.md";
const V62E1A_DOC = "docs/v6.2E.1A-hosting-deploy-execution-record.md";
const V62E1_DOC =
  "docs/v6.2E.1-real-stock-preview-image-diagnosis-copy-polish.md";
const V62C_DOC =
  "docs/v6.2C-privacy-safe-auto-redaction-readiness-plan.md";

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

const HEAD_SHA = "96c4714d6e761f129650b68b38d4741d226d4468";
const PILOT_BATCH_ID = "v62b-real-pilot-001";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2E.2 Image Hosting Migration Readiness Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e2-image-hosting-migration-readiness-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62e1aDoc = readFileSync(V62E1A_DOC, "utf8");
const v62e1Doc = readFileSync(V62E1_DOC, "utf8");
const v62cDoc = readFileSync(V62C_DOC, "utf8");

// --- doc exists + v6.2E.2 ---
{
  ok("readiness doc exists", doc.length > 10000);
  ok("doc v6.2E.2 label", doc.includes("v6.2E.2"));
  ok(
    "doc image hosting migration",
    /image hosting migration readiness/i.test(doc)
  );
  ok(
    "doc docs tests only",
    /docs\/tests\/package only|docs\/tests only/i.test(docLower)
  );
  ok("doc HEAD 96c4714", doc.includes(HEAD_SHA) || doc.includes("96c4714"));
  ok("doc references v62e1a", /v6\.2E\.1A/i.test(doc));
  ok("doc planning not migrate", /not in v6\.2E\.2|not started/i.test(docLower));
  ok("doc checklist requirements only", /checklist\/requirements only/i.test(docLower));
}

// --- problem statement ---
{
  ok("problem statement section", /Problem Statement/i.test(doc));
  ok("problem drive hotlink unreliable", /Drive.*not reliable|hotlink.*not reliable/i.test(docLower));
  ok("problem placeholder fallback", /placeholder fallback/i.test(docLower));
  ok("problem pilot needs real photos", /real car photos|รูปรถจริง/i.test(doc));
  ok("problem pilot 10 listings", /10.*listings|listings.*10/i.test(docLower));
  ok("problem pilotBatchId", doc.includes(PILOT_BATCH_ID));
}

// --- candidate solutions ---
{
  ok("candidate solutions section", /Candidate Solutions/i.test(doc));
  ok("option firebase storage", /Firebase Storage migration|OPT-A/i.test(doc));
  ok("option image proxy", /image proxy|OPT-B/i.test(doc));
  ok("option import-time download", /import-time download|OPT-C/i.test(doc));
  ok("option manual upload", /manual curated upload|OPT-D/i.test(doc));
  ok("options pros cons risks", /Pros.*Cons|ข้อดี.*ข้อเสีย/i.test(doc));
}

// --- recommended approach ---
{
  ok("recommended approach section", /Recommended Approach/i.test(doc));
  ok("recommend firebase storage primary", /Primary recommendation.*Firebase Storage/i.test(doc));
  ok("staging only nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("storage path convention", /listing-images.*pilotBatchId|listing-images\/\{pilotBatchId\}/i.test(doc));
  ok("no pii in storage path", /no plate.*PII in path|ไม่เปิด PII/i.test(doc));
  ok("original drive ops-only", /ops-only|Original Drive URL/i.test(doc));
  ok("not in git public payload drive", /not in git|no raw Drive URLs/i.test(docLower));
}

// --- image privacy safety ---
{
  ok("privacy safety section", /Image Privacy.*Safety/i.test(doc));
  ok("no plate in image", /ทะเบียนเต็ม|plate.*visible/i.test(doc));
  ok("no phone line address docs", /เบอร์.*LINE.*ที่อยู่|phone.*LINE/i.test(docLower));
  ok("reject or redaction", /reject.*redaction|require redaction/i.test(docLower));
  ok("no ai vision runtime v62e2", /AI vision.*not in v6\.2E\.2|not in v6\.2E\.2/i.test(doc));
  ok("public plate zero rule", /licensePlate.*0|stay \*\*0\*\*/i.test(doc));
}

// --- data model readiness ---
{
  ok("data model section", /Data Model.*Readiness/i.test(doc));
  ok("public images array field", /images\[\]/i.test(doc));
  ok("drive to storage mapping", /Drive slots.*Storage|mapping/i.test(docLower));
  ok("fallback placeholder behavior", /fallback behavior|LISTING_PLACEHOLDER/i.test(doc));
  ok("rollback plan", /rollback plan|Rollback plan/i.test(doc));
  ok("slot order preserved", /slot order|images\[0\]/i.test(docLower));
}

// --- execution gate ---
{
  ok("execution gate section", /Execution Gate/i.test(doc));
  ok("separate approval required", /separate.*approval|Separate explicit approval/i.test(doc));
  ok("staging only gate", /staging only/i.test(docLower));
  ok("dry-run count", /dry-run count|Dry-run count/i.test(doc));
  ok("post-migration verification", /post-migration verification/i.test(docLower));
  ok("no production rules secrets env", /production.*excluded|rules deploy.*unless/i.test(docLower));
}

// --- tests smoke plan ---
{
  ok("smoke plan section", /Tests.*Smoke Plan/i.test(doc));
  ok("smoke api count 10", /count.*\*\*10\*\*|count=10/i.test(doc));
  ok("smoke images 10/10", /10\/10/i.test(doc));
  ok("smoke sidebar real image", /sidebar.*รถมาใหม่|Sidebar.*รถมาใหม่/i.test(doc));
  ok("smoke car cards real image", /car cards.*real image|Chat car cards/i.test(doc));
  ok("smoke no public plate wholesale", /licensePlate.*0|wholesale.*0/i.test(doc));
  ok("smoke guest unchanged", /guest.*unchanged|non-allowlisted/i.test(docLower));
}

// --- go no-go ---
{
  ok("go no-go section", /Go\/No-go/i.test(doc));
  ok("go planning slice", /GO.*migration execution.*planning|planning.*this slice/i.test(docLower));
  ok("go future migration criteria", /actual migration execution/i.test(docLower));
  ok("no-go production secrets", /Requires production|secret access/i.test(doc));
  ok("no-go public launch", /Public launch.*NO-GO|NO-GO.*public launch/i.test(doc));
  ok("pilot continues", /continues.*planning|Controlled staging pilot/i.test(doc));
}

// --- scope guards ---
{
  ok("docs-first only", /docs\/tests\/package only/i.test(docLower));
  ok("no runtime code", /runtime code.*not done|not in v6\.2E\.2/i.test(docLower));
  ok("no deploy", /deploy.*not done|no deploy/i.test(docLower));
  ok("no upload migrate", /Upload.*migrate.*not done|not in v6\.2E\.2/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*not/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2E\.2/i.test(doc));
}

// --- no PII in doc ---
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
}

// --- cross-ref ---
{
  ok("v62e1a drive hotlink open", /Drive hotlink.*NOT RELIABLE|not reliably hotlinkable/i.test(v62e1aDoc));
  ok("v62e1 firebase storage next", /image hosting migration|Firebase Storage/i.test(v62e1Doc));
  ok("v62c plate redaction", /ป้ายทะเบียน/i.test(v62cDoc));
}

// --- script static only ---
{
  const selfCode = selfSrc.split("// --- script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62e2 script",
    pkg.includes("test:v62e2-image-hosting-migration-readiness-plan")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62e2-image-hosting-migration-readiness-plan.mts"
    )
  );
}

console.log("\nDone v6.2E.2 Image Hosting Migration Readiness Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
