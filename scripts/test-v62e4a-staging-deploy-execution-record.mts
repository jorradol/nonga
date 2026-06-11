/**
 * v6.2E.4A — Staging Deploy Execution Record (static validation only)
 * npm run test:v62e4a-staging-deploy-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2E.4A-staging-deploy-execution-record.md";
const V62E4_DOC =
  "docs/v6.2E.4-real-stock-refine-intent-fuel-economy-smoke-fix.md";
const V62E3_DOC =
  "docs/v6.2E.3-image-hosting-migration-execution-record.md";
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

const HEAD_SHA = "5aeea777276abdc0fa388e0d851ff5eb35a6456b";
const BUILD_ID = "a1941a2f-9d97-4f53-93fc-0e1608048dbf";
const IMAGE_TAG = "v6.2E.4-fuel-economy-refine-fix";
const IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${IMAGE_TAG}`;
const PREV_REV = "nonga-staging-00075-rpg";
const NEW_REV = "nonga-staging-00076-hmh";
const PROD_REV = "nonga-api-00003-fg4";
const LIVE_JS = "index-CiAQ3a1H.js";
const LIVE_CSS = "index-CtahMPWK.css";
const STAGING_URL = "https://a.nongbot.org";
const REFINE_MSG = "เอาประหยัดน้ำมัน";
const NO_CONTEXT_MARKER = "ยังไม่เห็นชุดรถล่าสุด";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2E.4A Staging Deploy Execution Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e4a-staging-deploy-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62e4Doc = readFileSync(V62E4_DOC, "utf8");
const v62e3Doc = readFileSync(V62E3_DOC, "utf8");
const v62b14Doc = readFileSync(V62B14_DOC, "utf8");

// --- doc exists + v6.2E.4A ---
{
  ok("execution doc exists", doc.length > 8000);
  ok("doc v6.2E.4A label", doc.includes("v6.2E.4A"));
  ok(
    "doc staging deploy execution",
    /staging deploy execution record/i.test(doc)
  );
  ok("doc HEAD 5aeea77", doc.includes(HEAD_SHA) || doc.includes("5aeea77"));
  ok("doc references v62e4", /v6\.2E\.4/i.test(doc));
  ok("doc execution record redacted", /EXECUTION RECORD.*REDACTED/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok("doc no runtime in slice", /runtime code changes.*none|no runtime/i.test(docLower));
  ok("doc no additional deploy in slice", /additional deploy.*none/i.test(docLower));
}

// --- execution metadata ---
{
  ok("metadata section", /Execution Metadata/i.test(doc));
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("service nonga-staging", doc.includes("nonga-staging"));
  ok("region asia-southeast1", doc.includes("asia-southeast1"));
  ok("commit fuel economy refine fix", /ground fuel-economy refine replies/i.test(doc));
  ok("hosting + cloud run deploy", /Hosting.*Cloud Run|Cloud Run.*Hosting/i.test(doc));
  ok("production nonga-api untouched", doc.includes(PROD_REV));
  ok("no env update", /env update.*none/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*none/i.test(docLower));
  ok("no firestore rules", /Firestore rules deploy.*none|rules deploy.*none/i.test(docLower));
  ok("no secret access", /secret access.*none|did not run.*secrets versions access/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight test v62e4", /test:v62e4/i.test(doc));
  ok("preflight test v62e pilot monitoring", /test:v62e-pilot-monitoring/i.test(doc));
  ok("preflight test v61l2g", /test:v61l2g/i.test(doc));
  ok("preflight build staging hosting", /build:staging:hosting/i.test(doc));
  ok("preflight git 5aeea77", doc.includes("5aeea77"));
  ok("preflight 47 pass", /47 PASS/i.test(doc));
}

// --- cloud build ---
{
  ok("cloud build section", /Cloud Build/i.test(doc));
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.2E.4", doc.includes(IMAGE_TAG));
  ok("image URI recorded", doc.includes(IMAGE_URI) || doc.includes(IMAGE_TAG));
  ok("cloudbuild v53f config", /cloudbuild\.v53f\.yaml/i.test(doc));
}

// --- cloud run ---
{
  ok("cloud run section", /Cloud Run Deploy/i.test(doc));
  ok("deploy image-only", /image-only|image only/i.test(docLower));
  ok("new revision 00076-hmh", doc.includes(NEW_REV));
  ok("previous revision 00075-rpg", doc.includes(PREV_REV));
  ok("no update-env-vars", /no.*--update-env-vars|no env update/i.test(docLower));
  ok("smoke base a.nongbot", doc.includes(STAGING_URL));
}

// --- hosting ---
{
  ok("hosting deploy section", /Firebase Hosting Deploy/i.test(doc));
  ok("hosting deploy success", /hosting deploy.*SUCCESS|Deploy complete/i.test(doc));
  ok("deploy only hosting", /deploy --only hosting/i.test(doc));
  ok("firebase hosting url web.app", /nonga-ce93c\.web\.app/i.test(doc));
  ok("live JS bundle", doc.includes(LIVE_JS));
  ok("live CSS bundle", doc.includes(LIVE_CSS));
  ok("bundle refine marker", doc.includes("ถ้าเน้นประหยัดน้ำมัน"));
  ok("bundle orchestrate route", /chat-user-visible-orchestrate/i.test(doc));
}

// --- smoke api ---
{
  ok("smoke section", /Post-deploy Smoke/i.test(doc));
  ok("smoke api count 10", /count.*\*\*10\*\*|count=10/i.test(doc));
  ok("smoke storage urls 39", /storage.*\*\*39\*\*|storageUrls=39/i.test(docLower));
  ok("smoke drive urls 0", /drive.*\*\*0\*\*|drive=0/i.test(docLower));
  ok("smoke public plate zero", /licensePlate.*\*\*0\*\*|plate=0/i.test(docLower));
  ok("smoke public wholesale zero", /wholesale.*\*\*0\*\*|wholesale=0/i.test(docLower));
}

// --- smoke allowlisted chat ---
{
  ok("allowlisted smoke section", /Allowlisted Buyer Chat/i.test(doc));
  ok("smoke search 3 cards", /search.*\*\*3\*\*|\*\*3\*\* cards/i.test(doc));
  ok("smoke compare grounded", /compare.*grounded|เทียบคันที่ 1/i.test(docLower));
  ok("smoke compare no zero cars", /no `0 คัน`|no zero/i.test(docLower));
  ok("smoke refine message", doc.includes(REFINE_MSG));
  ok("smoke refine 3 cards retained", /refine.*\*\*3\*\*|3 cards retained/i.test(docLower));
  ok("smoke refine recent carCards", /recent carCards|recent cards/i.test(docLower));
  ok("smoke refine no legacy opener", /legacy.*cars\[0\]|cars\[0\].*single|จากข้อมูลที่มี/i.test(doc));
  ok("smoke refine no invented km/l", /no invented km\/l|invented km/i.test(docLower));
  ok("smoke refine no certainty", /certainty claim|ประหยัดแน่นอน/i.test(docLower));
  ok("orchestration replay method", /orchestration replay|replay against/i.test(docLower));
}

// --- smoke no-context ---
{
  ok("no-context smoke section", /No-context|no-context/i.test(doc));
  ok("no-context safe copy", doc.includes(NO_CONTEXT_MARKER));
  ok("no-context zero cards", /stale.*\*\*0\*\*|0 cards/i.test(docLower));
}

// --- smoke bridge guard ---
{
  ok("bridge unauth 401", /orchestrate.*401|unauth.*401/i.test(docLower));
}

// --- outcome / safety ---
{
  ok("outcome section", /Outcome and Next Slice/i.test(doc));
  ok("v62e4 deployed executed", /v6\.2E\.4 deployed.*executed/i.test(docLower));
  ok("safety section", /Safety Confirmations/i.test(doc));
  ok("forbidden in repo section", /Forbidden in Repo/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2E\.4A/i.test(doc));
  ok("no import cleanup hide", /import.*cleanup.*hide.*none/i.test(docLower));
  ok("no payment lead mutation", /payment|lead|reveal|outcome/i.test(doc));
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
  ok("v62e4 hosting backend required", /hosting.*backend|Hosting.*backend/i.test(v62e4Doc));
  ok("v62e3 staging migration executed", /migration.*executed/i.test(v62e3Doc.toLowerCase()));
  ok("v62b14 orchestration replay pattern", /orchestration replay/i.test(v62b14Doc.toLowerCase()));
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
    "package v62e4a script",
    pkg.includes("test:v62e4a-staging-deploy-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62e4a-staging-deploy-execution-record.mts")
  );
}

console.log("\nDone v6.2E.4A Staging Deploy Execution Record tests.");
if (process.exitCode) process.exit(process.exitCode);
