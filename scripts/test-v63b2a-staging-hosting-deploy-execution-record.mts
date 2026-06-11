/**
 * v6.3B.2A — Staging Hosting Deploy + Manual Smoke Execution Record (static validation only)
 * npm run test:v63b2a-staging-hosting-deploy-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.3B.2A-staging-hosting-deploy-execution-record.md";
const READINESS_DOC =
  "docs/v6.3B.2A-buyer-friendly-listing-copy-staging-preview-deploy-readiness-plan.md";

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
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V)\b/i,
];

const CODE_SHA = "ca4eae76722cd422a63133ccd00d0487802e410d";
const UI_SHA = "3f2ebeb93bea6df347fe2fd1f9c4611a6a3960b1";
const LIVE_JS = "index-9TBqPe8h.js";
const PREV_JS = "index-NgZWJuv3.js";
const LIVE_CSS = "index-DuTflpIS.css";
const STAGING_REV = "nonga-staging-00076-hmh";
const PROD_REV = "nonga-api-00003-fg4";
const STAGING_URL = "https://a.nongbot.org";
const MASKED_UID = "UUvg…hK2";
const PREVIEW_BADGE = "Preview · Staging · Deterministic";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.3B.2A Staging Hosting Deploy + Manual Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v63b2a-staging-hosting-deploy-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const readinessDoc = readFileSync(READINESS_DOC, "utf8");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/UUvg…hK2/g, "MASKED_UID")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.3B.2A record ---
{
  ok("execution doc exists", doc.length > 9000);
  ok("doc v6.3B.2A label", doc.includes("v6.3B.2A"));
  ok(
    "doc execution record redacted",
    /EXECUTION RECORD.*REDACTED/i.test(doc)
  );
  ok(
    "doc hosting deploy manual smoke",
    /hosting deploy.*manual smoke|manual smoke.*hosting/i.test(docLower)
  );
  ok("doc HEAD ca4eae7", doc.includes(CODE_SHA) || doc.includes("ca4eae7"));
  ok("doc references v63b2", /v6\.3B\.2/i.test(doc));
  ok("doc references readiness", /v6\.3B\.2A.*Readiness|Deploy Readiness/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok("doc no deploy in record slice", /record slice.*docs\/tests\/package|No additional deploy/i.test(doc));
}

// --- execution metadata ---
{
  ok("metadata section", /Execution Metadata/i.test(doc));
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("underlying ui 3f2ebeb", doc.includes(UI_SHA) || doc.includes("3f2ebeb"));
  ok("hosting only deploy", /Firebase Hosting only|hosting only/i.test(docLower));
  ok("deploy command firebase hosting", /deploy --only hosting/i.test(doc));
  ok("preview flag true session", /PREVIEW_ENABLED=true|flag.*true/i.test(doc));
  ok("masked uid only", doc.includes(MASKED_UID));
  ok("allowlist count not full uid", /1 UID|allowlist.*1/i.test(doc));
  ok("no cloud run deploy", /Cloud Run.*not deployed|not deployed/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*none/i.test(docLower));
  ok("production not touched", doc.includes(PROD_REV));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight v63b2a readiness test", /test:v63b2a-buyer-friendly-listing-copy-staging-preview-deploy-readiness/i.test(doc));
  ok("preflight v63b2 test", /test:v63b2-buyer-friendly-listing-copy-staging-ui-preview/i.test(doc));
  ok("preflight v63b test", /test:v63b-buyer-friendly-listing-copy-deterministic-helper/i.test(doc));
  ok("preflight git ca4eae7", doc.includes("ca4eae7"));
}

// --- deploy summary ---
{
  ok("deploy summary section", /Deploy Summary/i.test(doc));
  ok("deploy complete", /Deploy complete/i.test(doc));
  ok("live bundle 9TBqPe8h", doc.includes(LIVE_JS));
  ok("live css DuTflpIS", doc.includes(LIVE_CSS));
  ok("previous bundle replaced", doc.includes(PREV_JS));
  ok("cloud run revision unchanged", doc.includes(STAGING_REV));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("preview panel testid", /buyer-friendly-copy-preview-panel/i.test(doc));
  ok("preview fallback testid", /buyer-friendly-copy-preview-fallback/i.test(doc));
  ok("preview badge", doc.includes(PREVIEW_BADGE));
}

// --- automated smoke ---
{
  ok("automated smoke section", /Automated Post-deploy Smoke/i.test(doc));
  ok("automated http 200", /HTTP 200/i.test(doc));
  ok("automated bundle swap", doc.includes(LIVE_JS) && doc.includes(PREV_JS));
}

// --- manual smoke ---
{
  ok("manual smoke section", /Manual Browser Smoke/i.test(doc));
  ok("manual smoke pass overall", /Overall.*PASS|verdict.*PASS/i.test(doc));
  ok("ms01 pass", /MS-01.*PASS/i.test(doc));
  ok("ms02 original primary", /MS-02.*PASS|primary/i.test(doc));
  ok("ms03 preview below", /MS-03.*PASS/i.test(doc));
  ok("ms04 badge", /MS-04.*PASS/i.test(doc) && doc.includes(PREVIEW_BADGE));
  ok("ms05 no forbidden claims", /MS-05.*PASS|ไม่เคยชน|km\/l/i.test(doc));
  ok("ms06 no pii", /MS-06.*PASS|plate.*phone/i.test(doc));
  ok("ms07 guest hidden", /MS-07.*PASS|Guest.*hidden/i.test(doc));
  ok("ms08 not tested", /MS-08.*not tested/i.test(doc));
  ok("ms09 not tested", /MS-09.*not tested/i.test(doc));
  ok("ms10 not tested", /MS-10.*not tested/i.test(doc));
}

// --- observation ---
{
  ok("observation section", /Observation.*Source vs Preview/i.test(doc));
  ok("observation industry spec pattern", /ภาษาวงการรถ|spec shorthand/i.test(doc));
  ok("observation ab2 pattern redacted", /AB2|spec codes/i.test(doc));
  ok("observation original unchanged contract", /original.*primary|ไม่แทนที่/i.test(docLower));
  ok("observation preview buyer friendly", /buyer-friendly|อ่านง่าย/i.test(docLower));
  ok("improvement note future only", /Improvement note|future slice/i.test(doc));
  ok("improvement not this slice", /not in this record|not this slice/i.test(docLower));
}

// --- outcome safety ---
{
  ok("outcome section", /Outcome and Verdict/i.test(doc));
  ok("outcome manual pass", /Manual browser smoke.*PASS/i.test(doc));
  ok("outcome guest hidden", /Guest preview.*hidden|Guest.*hidden/i.test(doc));
  ok("outcome no public rollout", /NO-GO|unchanged/i.test(doc));
  ok("rollback section", /Rollback Reference/i.test(doc));
  ok("rollback flag off hosting", /ENABLED=false.*hosting|flag off/i.test(docLower));
  ok("safety confirmations section", /Safety Confirmations/i.test(doc));
  ok("compliance section", /Compliance.*v6\.3B\.2A/i.test(doc));
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
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production nongbot.org url", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate data ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- cross-ref readiness ---
{
  ok("readiness references execution record", /v6\.3B\.2A-staging-hosting-deploy-execution-record/i.test(readinessDoc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v63b2a execution record script",
    pkg.includes("test:v63b2a-staging-hosting-deploy-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v63b2a-staging-hosting-deploy-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.3B.2A Staging Hosting Deploy Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
