/**
 * v6.3B.4A — Staging Hosting Deploy + Manual Smoke Execution Record (static validation only)
 * npm run test:v63b4a-staging-hosting-deploy-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.3B.4A-staging-hosting-deploy-execution-record.md";
const V63B4_DOC = "docs/v6.3B.4-buyer-friendly-sales-copy-tone-refinement.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
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

const CODE_SHA = "40cf2dff0c6a3e5bb6b3d641b9777314fb80c153";
const LIVE_JS = "index-tLeqTuup.js";
const PREV_JS = "index-B48ZSoxD.js";
const LIVE_CSS = "index-DuTflpIS.css";
const STAGING_REV = "nonga-staging-00076-hmh";
const PROD_REV = "nonga-api-00003-fg4";
const STAGING_URL = "https://a.nongbot.org";
const PREVIEW_TITLE = "น้องเอช่วยสรุปให้อ่านง่าย";
const SALES_TONE_MARKER = "ภาษาคนช่วยขาย";
const DISCLAIMER = "ข้อมูลนี้เป็นการเรียบเรียงจากประกาศเดิม";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.3B.4A Staging Hosting Deploy + Manual Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v63b4a-staging-hosting-deploy-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v63b4Doc = readFileSync(V63B4_DOC, "utf8");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/UUvg…hK2|h0xj…SC3|IjEx…l23|IcoN…0x1/g, "MASKED_UID")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.3B.4A record ---
{
  ok("execution doc exists", doc.length > 6000);
  ok("doc v6.3B.4A label", doc.includes("v6.3B.4A"));
  ok(
    "doc execution record redacted",
    /EXECUTION RECORD.*REDACTED/i.test(doc)
  );
  ok(
    "doc hosting deploy manual smoke",
    /hosting deploy.*manual smoke|manual smoke.*hosting/i.test(docLower)
  );
  ok("doc HEAD 40cf2df", doc.includes(CODE_SHA) || doc.includes("40cf2df"));
  ok("doc references v63b4", /v6\.3B\.4/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok(
    "doc no deploy in record slice",
    /record slice.*docs\/tests\/package|No additional deploy/i.test(doc)
  );
}

// --- execution metadata ---
{
  ok("metadata section", /Execution Metadata/i.test(doc));
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("hosting only deploy", /Firebase Hosting only|hosting only/i.test(docLower));
  ok("deploy command firebase hosting", /deploy --only hosting/i.test(doc));
  ok("preview flag true session", /PREVIEW_ENABLED=true|flag.*true/i.test(doc));
  ok("allowlist count 4", /allowlist.*4 UID|4 UIDs/i.test(doc));
  ok("masked uid references", doc.includes("UUvg…hK2"));
  ok("no cloud run deploy", /Cloud Run.*not deployed|not deployed/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*none/i.test(docLower));
  ok("production not touched", doc.includes(PROD_REV));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight v63b4 test", /test:v63b4-buyer-friendly-sales-copy-tone-refinement/i.test(doc));
  ok("preflight v63b3 test", /test:v63b3-buyer-friendly-preview-visibility-ux-clarity/i.test(doc));
  ok("preflight v63b test", /test:v63b-buyer-friendly-listing-copy-deterministic-helper/i.test(doc));
  ok("preflight git 40cf2df", doc.includes("40cf2df"));
}

// --- deploy summary ---
{
  ok("deploy summary section", /Deploy Summary/i.test(doc));
  ok("deploy complete", /Deploy complete/i.test(doc));
  ok("live bundle tLeqTuup", doc.includes(LIVE_JS));
  ok("live css DuTflpIS", doc.includes(LIVE_CSS));
  ok("previous bundle replaced", doc.includes(PREV_JS));
  ok("cloud run revision unchanged", doc.includes(STAGING_REV));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("preview panel testid", /buyer-friendly-copy-preview-panel/i.test(doc));
  ok("preview title", doc.includes(PREVIEW_TITLE));
  ok("sales tone marker", doc.includes(SALES_TONE_MARKER));
  ok("disclaimer marker", doc.includes(DISCLAIMER));
}

// --- automated smoke ---
{
  ok("automated smoke section", /Automated Post-deploy Smoke/i.test(doc));
  ok("automated http 200", /HTTP 200/i.test(doc));
  ok("automated bundle swap", doc.includes(LIVE_JS) && doc.includes(PREV_JS));
  ok("automated sales tone in js", doc.includes(SALES_TONE_MARKER));
  ok("automated preview title in js", doc.includes(PREVIEW_TITLE));
}

// --- manual smoke pass ---
{
  ok("manual smoke section", /Manual Browser Smoke/i.test(doc));
  ok("manual smoke pass overall", /Overall verdict.*PASS/i.test(doc));
  ok("ms-a01 pass", /MS-A01.*PASS/i.test(doc));
  ok("ms-a02 original primary", /MS-A02.*PASS/i.test(doc));
  ok("ms-a03 additive", /MS-A03.*PASS/i.test(doc));
  ok("ms-a04 sales tone pass", /MS-A04.*PASS/i.test(doc));
  ok("ms-a05 benefits pass", /MS-A05.*PASS/i.test(doc));
  ok("ms-a06 no junk tokens", /MS-A06.*PASS/i.test(doc));
  ok("ms-a10 no forbidden claims", /MS-A10.*PASS/i.test(doc));
  ok("ms-b01 guest no preview", /MS-B01.*PASS/i.test(doc));
  ok("ms-b02 guest no notice", /MS-B02.*PASS/i.test(doc));
  ok("ms-c01 card raw description", /MS-C01.*PASS/i.test(doc));
  ok("ms-c02 chat no preview", /MS-C02.*PASS/i.test(doc));
  ok("ms-c03 pass", /MS-C03.*PASS/i.test(doc) && doc.includes(LIVE_JS));
  ok("lung notes sales tone improved", /ดีขึ้น|ภาษาคนช่วยขาย/i.test(doc));
  ok("lung notes no leak", /ไม่พบคำแปลก|ข้อมูลลับ/i.test(doc));
  ok("additive preview documented", /additive below|additive.*below original/i.test(docLower));
  ok("original not replaced", /not replaced|ไม่แทนที่/i.test(doc));
}

// --- observation ---
{
  ok("observation section", /Observation.*v6\.3B\.4/i.test(doc));
  ok("observation sales tone contract", /sales-tone|sales tone/i.test(docLower));
  ok("observation bundle swap", doc.includes(PREV_JS) && doc.includes(LIVE_JS));
  ok("observation preview title", doc.includes(PREVIEW_TITLE));
}

// --- outcome safety ---
{
  ok("outcome section", /Outcome and Verdict/i.test(doc));
  ok("outcome deploy pass", /Deploy execution.*PASS|deploy.*executed/i.test(doc));
  ok("outcome manual pass", /Manual browser smoke.*PASS|Manual smoke.*PASS/i.test(doc));
  ok("outcome combined pass", /Combined.*PASS/i.test(doc));
  ok("future guest consideration only", /guest preview visibility.*future consideration|Future consideration only/i.test(doc));
  ok("rollback section", /Rollback Reference/i.test(doc));
  ok("rollback flag off hosting", /ENABLED=false.*hosting|flag off/i.test(docLower));
  ok("safety confirmations section", /Safety Confirmations/i.test(doc));
  ok("compliance section", /Compliance.*v6\.3B\.4A/i.test(doc));
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

// --- cross-ref v63b4 ---
{
  ok("v63b4 doc exists", v63b4Doc.includes("v6.3B.4"));
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
    "package v63b4a execution record script",
    pkg.includes("test:v63b4a-staging-hosting-deploy-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v63b4a-staging-hosting-deploy-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.3B.4A Staging Hosting Deploy Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
