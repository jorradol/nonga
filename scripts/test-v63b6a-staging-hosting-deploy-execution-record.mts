/**
 * v6.3B.6A — Staging Hosting Deploy + Manual Smoke Execution Record (static validation only)
 * npm run test:v63b6a-staging-hosting-deploy-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.3B.6A-staging-hosting-deploy-execution-record.md";
const V636_DOC = "docs/v6.3B.6-golden-seller-voice-refinement.md";

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

const CODE_SHA = "a75a7bf0ab75f864e207b30b4b1edcd8100e36f4";
const LIVE_JS = "index-CLCq6RnQ.js";
const PREV_JS = "index-CPoVE1cX.js";
const LIVE_CSS = "index-DuTflpIS.css";
const STAGING_REV = "nonga-staging-00076-hmh";
const PROD_REV = "nonga-api-00003-fg4";
const STAGING_URL = "https://a.nongbot.org";
const CURATED_TITLE = "บทเกณฑ์คัดสรรของน้องเอ";
const PREVIEW_TITLE = "น้องเอช่วยสรุปให้อ่านง่าย";
const STEERING_CANONICAL = "พวงมาลัยมัลติฟังก์ชัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.3B.6A Staging Hosting Deploy + Manual Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v63b6a-staging-hosting-deploy-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v636Doc = readFileSync(V636_DOC, "utf8");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/UUvg…hK2|h0xj…SC3|IjEx…l23|IcoN…0x1/g, "MASKED_UID")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.3B.6A record ---
{
  ok("execution doc exists", doc.length > 6000);
  ok("doc v6.3B.6A label", doc.includes("v6.3B.6A"));
  ok(
    "doc execution record redacted",
    /EXECUTION RECORD.*REDACTED/i.test(doc)
  );
  ok(
    "doc hosting deploy manual smoke",
    /hosting deploy.*manual smoke|manual smoke.*hosting/i.test(docLower)
  );
  ok("doc HEAD a75a7bf", doc.includes(CODE_SHA) || doc.includes("a75a7bf"));
  ok("doc references v636", /v6\.3B\.6/i.test(doc));
  ok("doc golden seller voice", /Golden Seller Voice|golden seller/i.test(doc));
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
  ok("no new chat panel", /new chat panel.*none|panel ใหม่/i.test(doc));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok("preflight v63b6 test", /test:v63b6-golden-seller-voice-refinement/i.test(doc));
  ok("preflight v63b5 test", /test:v63b5-in-chat-curated-sales-copy-weave/i.test(doc));
  ok("preflight v63b4 test", /test:v63b4-buyer-friendly-sales-copy-tone-refinement/i.test(doc));
  ok("preflight v63b3 test", /test:v63b3-buyer-friendly-preview-visibility-ux-clarity/i.test(doc));
  ok("preflight v62e4c test", /test:v62e4c-advisor-criteria-tts-button/i.test(doc));
  ok("preflight v549c test", /test:v549c-in-chat-curated-analysis/i.test(doc));
  ok("preflight git a75a7bf", doc.includes("a75a7bf"));
}

// --- deploy summary ---
{
  ok("deploy summary section", /Deploy Summary/i.test(doc));
  ok("deploy complete", /Deploy complete/i.test(doc));
  ok("live bundle CLCq6RnQ", doc.includes(LIVE_JS));
  ok("live css DuTflpIS", doc.includes(LIVE_CSS));
  ok("previous bundle replaced", doc.includes(PREV_JS));
  ok("cloud run revision unchanged", doc.includes(STAGING_REV));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("curated panel testid", /chat-car-curated-analysis/i.test(doc));
  ok("curated title", doc.includes(CURATED_TITLE));
  ok("featureWeave marker", /featureWeave/i.test(doc));
  ok("golden hook marker", /จุดที่น่าดู|จุดที่น่าสนใจ/i.test(doc));
  ok("steering canonical", doc.includes(STEERING_CANONICAL));
  ok("tts testid marker", /chat-car-curated-tts-btn/i.test(doc));
}

// --- automated smoke ---
{
  ok("automated smoke section", /Automated Post-deploy Smoke/i.test(doc));
  ok("automated http 200", /HTTP 200/i.test(doc));
  ok("automated bundle swap", doc.includes(LIVE_JS) && doc.includes(PREV_JS));
  ok("automated golden hook in js", /golden seller hook|จุดที่น่าดู/i.test(doc));
  ok("automated featureWeave in js", /featureWeave/i.test(doc));
  ok("automated curated title in js", doc.includes(CURATED_TITLE));
}

// --- manual smoke pass ---
{
  ok("manual smoke section", /Manual Browser Smoke/i.test(doc));
  ok("manual smoke pass overall", /Overall verdict.*PASS/i.test(doc));
  ok("ms-a01 pass", /MS-A01.*PASS/i.test(doc));
  ok("ms-a02 no new panel", /MS-A02.*PASS/i.test(doc));
  ok("ms-a03 featureWeave pass", /MS-A03.*PASS/i.test(doc));
  ok("ms-a04 golden voice pass", /MS-A04.*PASS/i.test(doc) && /Golden Seller|จุดที่น่าดู|จุดที่น่าสนใจ/i.test(doc));
  ok("ms-a05 no report lead", /MS-A05.*PASS/i.test(doc));
  ok("ms-a08 tts pass", /MS-A08.*PASS/i.test(doc));
  ok("ms-a09 no junk tokens", /MS-A09.*PASS/i.test(doc));
  ok("ms-a10 steering pass", /MS-A10.*PASS/i.test(doc) && doc.includes(STEERING_CANONICAL));
  ok("ms-a12 no forbidden claims", /MS-A12.*PASS/i.test(doc));
  ok("ms-a13 no hype", /MS-A13.*PASS/i.test(doc));
  ok("ms-b01 preview pass", /MS-B01.*PASS/i.test(doc) && doc.includes(PREVIEW_TITLE));
  ok("ms-b02 hook first pass", /MS-B02.*PASS/i.test(doc));
  ok("ms-c01 guest pass", /MS-C01.*PASS/i.test(doc));
  ok("ms-c04 bundle pass", /MS-C04.*PASS/i.test(doc) && doc.includes(LIVE_JS));
  ok("lung notes golden voice improved", /ดีขึ้นกว่าเดิม|Golden Seller Voice/i.test(doc));
  ok("lung notes natural tone", /ธรรมชาติกว่าเดิม/i.test(doc));
  ok("lung notes no garble", /ไม่พบคำเพี้ยน/i.test(doc));
}

// --- observation ---
{
  ok("observation section", /Observation.*v6\.3B\.6/i.test(doc));
  ok("observation golden voice contract", /golden seller|Golden Seller/i.test(doc));
  ok("observation bundle swap", doc.includes(PREV_JS) && doc.includes(LIVE_JS));
  ok("observation no new panel", /no new panel|panel เดิม/i.test(doc));
}

// --- outcome safety ---
{
  ok("outcome section", /Outcome and Verdict/i.test(doc));
  ok("outcome deploy pass", /Deploy execution.*PASS|deploy.*executed/i.test(doc));
  ok("outcome manual pass", /Manual browser smoke.*PASS|Manual smoke.*PASS/i.test(doc));
  ok("outcome combined pass", /Combined.*PASS/i.test(doc));
  ok("rollback section", /Rollback Reference/i.test(doc));
  ok("rollback CPoVE1cX hosting", doc.includes(PREV_JS) && /hosting/i.test(docLower));
  ok("safety confirmations section", /Safety Confirmations/i.test(doc));
  ok("compliance section", /Compliance.*v6\.3B\.6A/i.test(doc));
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

// --- cross-ref v636 ---
{
  ok("v636 doc exists", v636Doc.includes("v6.3B.6"));
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
    "package v636a execution record script",
    pkg.includes("test:v63b6a-staging-hosting-deploy-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v63b6a-staging-hosting-deploy-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.3B.6A Staging Hosting Deploy Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
