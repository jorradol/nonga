/**
 * v6.2E.4C.1A — Staging Hosting Deploy + Manual Smoke Record (static validation only)
 * npm run test:v62e4c1a-staging-hosting-deploy-tts-button-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2E.4C.1A-staging-hosting-deploy-tts-button-execution-record.md";
const V62E4C_DOC = "scripts/test-v62e4c-advisor-criteria-tts-button.mts";

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

const CODE_SHA = "4d9b0270c8a1f72456bc6307f3d1259a2f7df226";
const LIVE_JS = "index-NgZWJuv3.js";
const PREV_JS = "index-CiAQ3a1H.js";
const LIVE_CSS = "index-CtahMPWK.css";
const STAGING_REV = "nonga-staging-00076-hmh";
const PROD_REV = "nonga-api-00003-fg4";
const STAGING_URL = "https://a.nongbot.org";
const CURATED_TITLE = "บทเกณฑ์คัดสรรของน้องเอ";
const ARIA_LABEL = "ฟังบทเกณฑ์คัดสรรของน้องเอ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2E.4C.1A Staging Hosting Deploy + Manual Smoke Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e4c1a-staging-hosting-deploy-tts-button-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62e4cTest = readFileSync(V62E4C_DOC, "utf8");

// --- doc exists + v6.2E.4C.1A ---
{
  ok("execution doc exists", doc.length > 7000);
  ok("doc v6.2E.4C.1A label", doc.includes("v6.2E.4C.1A"));
  ok(
    "doc hosting deploy manual smoke record",
    /hosting deploy.*manual smoke|manual smoke.*hosting deploy/i.test(doc)
  );
  ok("doc HEAD 4d9b027 code", doc.includes(CODE_SHA) || doc.includes("4d9b027"));
  ok("doc references v62e4c", /v6\.2E\.4C/i.test(doc));
  ok("doc references v62e4c1 deploy", /v6\.2E\.4C\.1/i.test(doc));
  ok("doc execution record redacted", /EXECUTION RECORD.*REDACTED/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok("doc no runtime in slice", /runtime code changes.*none|no runtime/i.test(docLower));
  ok("doc no deploy in record slice", /deploy in v6\.2E\.4C\.1A slice.*none|record only/i.test(docLower));
}

// --- execution metadata ---
{
  ok("metadata section", /Execution Metadata/i.test(doc));
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("code commit tts button", /add TTS speaker button to advisor criteria panel/i.test(doc));
  ok("hosting only deploy", /Firebase Hosting only|hosting only/i.test(docLower));
  ok("deploy command firebase hosting", /deploy --only hosting/i.test(doc));
  ok("no cloud run deploy", /Cloud Run.*not deployed|not deployed/i.test(docLower));
  ok("no env update", /env update.*none/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*none/i.test(docLower));
  ok("no firestore rules", /Firestore rules deploy.*none|rules deploy.*none/i.test(docLower));
  ok("production not touched", doc.includes(PROD_REV) || /production.*not touched/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight test v62e4c", /test:v62e4c/i.test(doc));
  ok("preflight lint", /npm run lint/i.test(doc));
  ok("preflight build staging hosting", /build:staging:hosting/i.test(doc));
  ok("preflight git 4d9b027", doc.includes("4d9b027"));
}

// --- deploy summary ---
{
  ok("deploy summary section", /Deploy Summary/i.test(doc));
  ok("deploy complete", /Deploy complete/i.test(doc));
  ok("live bundle NgZWJuv3", doc.includes(LIVE_JS));
  ok("live css CtahMPWK", doc.includes(LIVE_CSS));
  ok("previous bundle replaced", doc.includes(PREV_JS));
  ok("cloud run revision unchanged", doc.includes(STAGING_REV));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("bundle marker tts btn", /chat-car-curated-tts-btn/i.test(doc));
  ok("bundle marker aria label", doc.includes(ARIA_LABEL));
}

// --- automated smoke ---
{
  ok("automated smoke section", /Automated Post-deploy Smoke/i.test(doc));
  ok("automated bundle check", /index-NgZWJuv3/i.test(doc));
  ok("automated previous absent", /index-CiAQ3a1H.*absent|previous.*replaced/i.test(docLower));
}

// --- manual smoke ---
{
  ok("manual smoke section", /Manual Browser Smoke/i.test(doc));
  ok("tester ลุง", doc.includes("ลุง"));
  ok("allowlisted session", /allowlisted.*session/i.test(docLower));
  ok("manual hard refresh PASS", /MS-01.*PASS|Hard refresh.*PASS/i.test(doc));
  ok("manual speaker visible PASS", /MS-04.*PASS|Speaker icon visible.*PASS/i.test(doc));
  ok("manual reads box PASS", /MS-05.*PASS|reads text in that box.*PASS/i.test(doc));
  ok("manual no private data PASS", /MS-06.*PASS|hidden.*private.*PASS/i.test(doc));
  ok("manual layout PASS", /MS-07.*PASS|Layout not broken.*PASS/i.test(doc));
  ok("manual message tts PASS", /MS-08.*PASS|message speaker still works.*PASS/i.test(doc));
  ok("manual overall PASS", /Overall.*PASS|manual browser smoke.*PASS/i.test(doc));
  ok("curated title documented", doc.includes(CURATED_TITLE));
}

// --- screenshots ---
{
  ok("screenshots section", /Screenshots/i.test(doc));
  ok("no screenshots no FAIL", /Screenshots captured.*none|none.*no FAIL/i.test(docLower));
}

// --- outcome / version note ---
{
  ok("outcome section", /Outcome and Pilot Verdict/i.test(doc));
  ok("hosting deploy executed", /hosting deploy.*executed/i.test(docLower));
  ok("tts verified staging", /TTS.*verified|Advisor criteria TTS.*live/i.test(doc));
  ok("controlled staging pilot GO", /Controlled staging pilot.*GO|staging pilot.*GO/i.test(doc));
  ok("public launch NO-GO", /Public launch.*NO-GO/i.test(doc));
  ok("production NO-GO", /Production.*NO-GO|production deploy.*NO-GO/i.test(doc));
  ok("public AI NO-GO", /Public AI.*NO-GO|real Gemini.*NO-GO/i.test(docLower));
  ok("next slice v63a note", /v6\.3A/i.test(doc));
}

// --- safety / compliance ---
{
  ok("safety section", /Safety Confirmations/i.test(doc));
  ok("forbidden in repo section", /Forbidden in Repo/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2E\.4C\.1A/i.test(doc));
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

// --- cross-ref v62e4c ---
{
  ok("v62e4c test script exists", v62e4cTest.includes("v6.2E.4C"));
  ok("v62e4c aria label in test", v62e4cTest.includes(ARIA_LABEL));
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
    "package v62e4c1a script",
    pkg.includes("test:v62e4c1a-staging-hosting-deploy-tts-button-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62e4c1a-staging-hosting-deploy-tts-button-record.mts"
    )
  );
}

console.log(
  "\nDone v6.2E.4C.1A Staging Hosting Deploy + Manual Smoke Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
