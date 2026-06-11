/**
 * v6.2E.1A — Hosting Deploy Execution Record (static validation only)
 * npm run test:v62e1a-hosting-deploy-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2E.1A-hosting-deploy-execution-record.md";
const V62E1_DOC =
  "docs/v6.2E.1-real-stock-preview-image-diagnosis-copy-polish.md";
const V62B15_DOC =
  "docs/v6.2B.15-real-stock-pilot-acceptance-go-no-go-review.md";

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
  /firebasestorage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const FIREBASE_UID_PATTERNS = [/\b[a-zA-Z0-9]{28}\b/];

const HEAD_SHA = "e78d200cd496babb2d1b975f44acb0682363f797";
const LIVE_BUNDLE = "index-B-EmIZG8.js";
const STAGING_URL = "https://a.nongbot.org";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2E.1A Hosting Deploy Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e1a-hosting-deploy-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62e1Doc = readFileSync(V62E1_DOC, "utf8");
const v62b15Doc = readFileSync(V62B15_DOC, "utf8");

// --- doc exists + v6.2E.1A ---
{
  ok("execution doc exists", doc.length > 5000);
  ok("doc v6.2E.1A label", doc.includes("v6.2E.1A"));
  ok("doc hosting deploy execution", /hosting deploy execution record/i.test(doc));
  ok("doc HEAD e78d200", doc.includes(HEAD_SHA) || doc.includes("e78d200"));
  ok("doc references v62e1", /v6\.2E\.1/i.test(doc));
  ok("doc execution record redacted", /EXECUTION RECORD.*REDACTED/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok("doc no runtime in slice", /runtime code changes.*none|no runtime/i.test(docLower));
}

// --- execution metadata ---
{
  ok("metadata section", /Execution Metadata/i.test(doc));
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("deploy hosting only", /Hosting only|hosting only/i.test(doc));
  ok("deploy command firebase hosting", /deploy --only hosting/i.test(doc));
  ok("commit fix ui normalize drive", /normalize Drive preview images/i.test(doc));
  ok("no backend deploy", /backend.*not deployed|Cloud Run.*none/i.test(docLower));
  ok("no env update", /env update.*none/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*none/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight test v62e1", /test:v62e1/i.test(doc));
  ok("preflight build staging hosting", /build:staging:hosting/i.test(doc));
  ok("preflight git e78d200", doc.includes("e78d200"));
}

// --- deploy summary ---
{
  ok("deploy summary section", /Deploy Summary/i.test(doc));
  ok("deploy complete", /Deploy complete/i.test(doc));
  ok("live bundle marker", doc.includes(LIVE_BUNDLE));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("firebase hosting url web.app", /nonga-ce93c\.web\.app/i.test(doc));
  ok("bundle label รถมาใหม่", doc.includes("รถมาใหม่"));
  ok("bundle no legacy label", /Legacy label.*รถเข้าใหม่.*absent/i.test(doc));
}

// --- smoke results ---
{
  ok("smoke section", /Post-deploy Smoke/i.test(doc));
  ok("smoke api success count 10", /success.*true|count.*\*\*10\*\*/i.test(doc));
  ok("smoke images 10/10", /10\/10/i.test(doc));
  ok("smoke public plate zero", /licensePlate.*\*\*0\*\*|publicPlate=0/i.test(doc));
  ok("smoke public wholesale zero", /wholesale.*\*\*0\*\*|publicWholesale=0/i.test(doc));
  ok("smoke sidebar slider present", /sidebar-new-cars-slider|slider present/i.test(docLower));
  ok("smoke placeholder fallback pass", /placeholder fallback.*PASS|onError.*placeholder/i.test(docLower));
  ok("smoke drive hotlink open", /Drive hotlink.*NOT RELIABLE|not reliably hotlinkable/i.test(docLower));
}

// --- outcome / next slice ---
{
  ok("outcome section", /Outcome and Next Slice/i.test(doc));
  ok("hosting deploy executed", /hosting deploy.*executed/i.test(docLower));
  ok("next image hosting migration", /image hosting migration|Firebase Storage/i.test(doc));
  ok("no-go public production unchanged", /NO-GO.*unchanged|unchanged/i.test(docLower));
}

// --- safety / forbidden ---
{
  ok("safety section", /Safety Confirmations/i.test(doc));
  ok("forbidden in repo section", /Forbidden in Repo/i.test(doc));
  ok("forbidden no raw image url", /Raw image URL/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2E\.1A/i.test(doc));
  ok("no additional deploy in slice", /Additional deploy.*none/i.test(doc));
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
}

// --- cross-ref ---
{
  ok("v62e1 hosting deploy required", /hosting deploy.*YES|Hosting deploy/i.test(v62e1Doc));
  ok("v62b15 staging pilot go", /GO.*controlled staging pilot/i.test(v62b15Doc));
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
    "package v62e1a script",
    pkg.includes("test:v62e1a-hosting-deploy-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62e1a-hosting-deploy-execution-record.mts")
  );
}

console.log("\nDone v6.2E.1A Hosting Deploy Execution Record tests.");
if (process.exitCode) process.exit(process.exitCode);
