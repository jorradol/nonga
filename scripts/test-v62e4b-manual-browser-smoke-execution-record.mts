/**
 * v6.2E.4B — Manual Browser Smoke Execution Record (static validation only)
 * npm run test:v62e4b-manual-browser-smoke-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2E.4B-manual-browser-smoke-execution-record.md";
const V62E4A_DOC = "docs/v6.2E.4A-staging-deploy-execution-record.md";
const V62E4_DOC =
  "docs/v6.2E.4-real-stock-refine-intent-fuel-economy-smoke-fix.md";
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
  /drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]{10,}/i,
  /firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^"'\s]{30,}/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Vios)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
  /\bMazda\s+2\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const FIREBASE_UID_PATTERNS = [/\b[a-zA-Z0-9]{28}\b/];

const HEAD_SHA = "a5ad7885bdd8ca7f3f54f725f3e752e9d7b799a5";
const STAGING_REV = "nonga-staging-00076-hmh";
const LIVE_JS = "index-CiAQ3a1H.js";
const LIVE_CSS = "index-CtahMPWK.css";
const STAGING_URL = "https://a.nongbot.org";
const REFINE_MSG = "เอาประหยัดน้ำมัน";
const SEARCH_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const COMPARE_MSG = "เทียบคันที่ 1 กับ 2";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2E.4B Manual Browser Smoke Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e4b-manual-browser-smoke-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62e4aDoc = readFileSync(V62E4A_DOC, "utf8");
const v62e4Doc = readFileSync(V62E4_DOC, "utf8");
const v62b14Doc = readFileSync(V62B14_DOC, "utf8");

// --- doc exists + v6.2E.4B ---
{
  ok("execution doc exists", doc.length > 7000);
  ok("doc v6.2E.4B label", doc.includes("v6.2E.4B"));
  ok(
    "doc manual browser smoke execution",
    /manual browser smoke execution record/i.test(doc)
  );
  ok("doc HEAD a5ad788", doc.includes(HEAD_SHA) || doc.includes("a5ad788"));
  ok("doc references v62e4a", /v6\.2E\.4A/i.test(doc));
  ok("doc execution record redacted", /EXECUTION RECORD.*REDACTED/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok("doc no runtime in slice", /runtime code changes.*none|no runtime/i.test(docLower));
  ok("doc no deploy in slice", /deploy in v6\.2E\.4B slice.*none|no deploy/i.test(docLower));
}

// --- smoke metadata ---
{
  ok("smoke metadata section", /Smoke Metadata/i.test(doc));
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("tester ลุง", doc.includes("ลุง"));
  ok("allowlisted session", /allowlisted.*session|allowlisted signed-in/i.test(docLower));
  ok("manual browser smoke", /manual browser smoke/i.test(docLower));
  ok("smoke url a.nongbot", doc.includes(STAGING_URL));
  ok("no env update", /env update.*none/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*none/i.test(docLower));
  ok("no secret access", /secret access.*none/i.test(docLower));
}

// --- staging baseline ---
{
  ok("baseline section", /Staging Baseline/i.test(doc));
  ok("cloud run revision 00076-hmh", doc.includes(STAGING_REV));
  ok("image tag v6.2E.4", doc.includes("v6.2E.4-fuel-economy-refine-fix"));
  ok("live JS bundle", doc.includes(LIVE_JS));
  ok("live CSS bundle", doc.includes(LIVE_CSS));
  ok("production nonga-api untouched", /nonga-api.*not touched|production.*not touched/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight git a5ad788", doc.includes("a5ad788"));
  ok("preflight v62e4a deploy live", /v6\.2E\.4A deploy live/i.test(doc));
  ok("preflight pilot count 10", /\*\*10\*\* listings|count.*10/i.test(doc));
}

// --- manual smoke MB-01 to MB-10 PASS ---
{
  ok("manual results section", /Manual Browser Smoke Results/i.test(doc));
  ok("MB-01 PASS", /MB-01.*PASS/i.test(doc));
  ok("MB-02 PASS sidebar label", /MB-02.*PASS|รถมาใหม่.*PASS/i.test(doc));
  ok("MB-03 PASS sidebar images", /MB-03.*PASS/i.test(doc));
  ok("MB-04 PASS marketplace 10", /MB-04.*PASS/i.test(doc));
  ok("MB-05 PASS no old test", /MB-05.*PASS/i.test(doc));
  ok("MB-06 PASS privacy", /MB-06.*PASS/i.test(doc));
  ok("MB-07 PASS search", /MB-07.*PASS/i.test(doc));
  ok("MB-08 PASS compare", /MB-08.*PASS/i.test(doc));
  ok("MB-09 PASS refine", /MB-09.*PASS/i.test(doc));
  ok("MB-10 PASS no-context", /MB-10.*PASS/i.test(doc));
  ok("overall MB-01 MB-10 PASS", /MB-01.*MB-10.*PASS|MB-01–MB-10.*PASS/i.test(doc));
}

// --- chat prompts documented ---
{
  ok("search prompt documented", doc.includes(SEARCH_MSG));
  ok("compare prompt documented", doc.includes(COMPARE_MSG));
  ok("refine prompt documented", doc.includes(REFINE_MSG));
  ok("refine no km/l", /no invented km\/l|invented km/i.test(docLower));
  ok("refine no certainty", /certainty claim|ประหยัดแน่นอน/i.test(docLower));
  ok("no-context stale cards", /no stale|stale carCards/i.test(docLower));
  ok("no-context safe copy", /ยังไม่เห็นชุดรถล่าสุด|safe no-context/i.test(docLower));
}

// --- MB-11 N/A ---
{
  ok("MB-11 N/A documented", /MB-11.*N\/A|MB-11.*not included/i.test(doc));
}

// --- screenshots none ---
{
  ok("screenshots section", /Screenshots/i.test(doc));
  ok("no screenshots no FAIL", /Screenshots captured.*none|none.*no FAIL/i.test(docLower));
  ok("no attachments in repo", /Attachments in repo.*none/i.test(docLower));
}

// --- outcome / pilot verdict ---
{
  ok("outcome section", /Outcome and Pilot Verdict/i.test(doc));
  ok("manual smoke complete PASS", /manual browser smoke.*complete.*PASS|complete — PASS/i.test(docLower));
  ok("controlled staging pilot GO", /Controlled staging pilot.*GO|staging pilot.*GO/i.test(doc));
  ok("public launch NO-GO", /Public launch.*NO-GO/i.test(doc));
  ok("production NO-GO", /Production.*NO-GO|production deploy.*NO-GO/i.test(doc));
  ok("public AI NO-GO", /Public AI.*NO-GO|real Gemini.*NO-GO/i.test(docLower));
  ok("v62e4 refine verified browser", /v6\.2E\.4.*browser|browser.*verified/i.test(docLower));
}

// --- safety / forbidden / compliance ---
{
  ok("safety section", /Safety Confirmations/i.test(doc));
  ok("forbidden in repo section", /Forbidden in Repo/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2E\.4B/i.test(doc));
  ok("no import cleanup hide", /import.*cleanup.*hide.*none/i.test(docLower));
  ok("no payment lead mutation", /payment|lead|reveal|outcome/i.test(doc));
  ok("forbidden no tester uid", /Tester allowlist UID/i.test(doc));
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
  ok("v62e4a deploy record exists", v62e4aDoc.includes("v6.2E.4A"));
  ok("v62e4 refine fix doc exists", v62e4Doc.includes("v6.2E.4"));
  ok("v62b14 allowlisted smoke pattern", /allowlisted/i.test(v62b14Doc.toLowerCase()));
}

// --- script static only ---
{
  const selfCode = selfSrc.split("// --- script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase admin", !/firebase-admin/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62e4b script",
    pkg.includes("test:v62e4b-manual-browser-smoke-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62e4b-manual-browser-smoke-execution-record.mts")
  );
}

console.log("\nDone v6.2E.4B Manual Browser Smoke Execution Record tests.");
if (process.exitCode) process.exit(process.exitCode);
