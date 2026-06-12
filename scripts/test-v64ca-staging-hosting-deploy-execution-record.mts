/**
 * v6.4C.A — Staging Hosting Deploy + Manual Smoke Execution Record (static validation only)
 * npm run test:v64ca-staging-hosting-deploy-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.4C.A-staging-hosting-deploy-execution-record.md";
const V64C_DOC =
  "docs/v6.4C-admin-read-only-ai-control-status-panel-readiness.md";

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

const CODE_SHA = "de05625f1e9d4c7389ab7e60e81d980bf77e5d31";
const LIVE_JS = "index-DMz8UVjA.js";
const PREV_JS = "index-CLCq6RnQ.js";
const LIVE_CSS = "index-CtTXHG2V.css";
const STAGING_REV = "nonga-staging-00076-hmh";
const PROD_REV = "nonga-api-00003-fg4";
const STAGING_URL = "https://a.nongbot.org";
const PANEL_TITLE = "AI Control Status Panel";
const PROVIDER_OFF = "AI provider is OFF";
const REAL_GEMINI_OFF = "Real Gemini is not enabled";
const PROD_FORBIDDEN = "Production real provider is forbidden";
const READONLY_BADGE = "Read-only readiness";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4C.A Staging Hosting Deploy + Manual Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v64ca-staging-hosting-deploy-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v64cDoc = readFileSync(V64C_DOC, "utf8");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/UUvg…hK2|h0xj…SC3|IjEx…l23|IcoN…0x1/g, "MASKED_UID")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.4C.A record ---
{
  ok("execution doc exists", doc.length > 6000);
  ok("doc v6.4C.A label", doc.includes("v6.4C.A"));
  ok(
    "doc execution record redacted",
    /EXECUTION RECORD.*REDACTED/i.test(doc)
  );
  ok(
    "doc hosting deploy manual smoke",
    /hosting deploy.*manual smoke|manual smoke.*hosting/i.test(docLower)
  );
  ok("doc HEAD de05625", doc.includes(CODE_SHA) || doc.includes("de05625"));
  ok("doc references v64c", /v6\.4C/i.test(doc));
  ok("doc ai control status panel", /AI Control Status Panel/i.test(doc));
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
  ok("no new public route", /public route.*none|ไม่มี public route/i.test(doc));
  ok("no enable button", /enable.*real Gemini.*none|ไม่มี.*enable/i.test(doc));
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok(
    "preflight v64c test",
    /test:v64c-admin-read-only-ai-control-status-panel-readiness/i.test(doc)
  );
  ok(
    "preflight v64b test",
    /test:v64b-ai-control-model-types-static-readiness/i.test(doc)
  );
  ok(
    "preflight v64a test",
    /test:v64a-controlled-ai-gemini-admin-control-readiness/i.test(doc)
  );
  ok(
    "preflight v63b6 test",
    /test:v63b6-golden-seller-voice-refinement/i.test(doc)
  );
  ok(
    "preflight v63b5 test",
    /test:v63b5-in-chat-curated-sales-copy-weave/i.test(doc)
  );
  ok("preflight git de05625", doc.includes("de05625"));
}

// --- deploy summary ---
{
  ok("deploy summary section", /Deploy Summary/i.test(doc));
  ok("deploy complete", /Deploy complete/i.test(doc));
  ok("live bundle DMz8UVjA", doc.includes(LIVE_JS));
  ok("live css CtTXHG2V", doc.includes(LIVE_CSS));
  ok("previous bundle replaced", doc.includes(PREV_JS));
  ok("cloud run revision unchanged", doc.includes(STAGING_REV));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("panel testid marker", /ai-control-status-panel/i.test(doc));
  ok("panel title", doc.includes(PANEL_TITLE));
  ok("provider off marker", doc.includes(PROVIDER_OFF));
  ok("real gemini off marker", doc.includes(REAL_GEMINI_OFF));
  ok("production forbidden marker", doc.includes(PROD_FORBIDDEN));
  ok("readonly badge marker", doc.includes(READONLY_BADGE));
  ok("deterministic only marker", /DETERMINISTIC_ONLY/i.test(doc));
  ok("golden hook marker", /จุดที่น่าดู|featureWeave/i.test(doc));
}

// --- automated smoke ---
{
  ok("automated smoke section", /Automated Post-deploy Smoke/i.test(doc));
  ok("automated http 200", /HTTP 200/i.test(doc));
  ok("automated bundle swap", doc.includes(LIVE_JS) && doc.includes(PREV_JS));
  ok("automated panel testid in js", /ai-control-status-panel/i.test(doc));
  ok("automated provider off in js", doc.includes(PROVIDER_OFF));
  ok("automated real gemini off in js", doc.includes(REAL_GEMINI_OFF));
}

// --- manual smoke pass ---
{
  ok("manual smoke section", /Manual Browser Smoke/i.test(doc));
  ok("manual smoke pass overall", /Overall verdict.*PASS/i.test(doc));
  ok("ms-a01 pass", /MS-A01.*PASS/i.test(doc));
  ok("ms-a02 panel pass", /MS-A02.*PASS/i.test(doc));
  ok("ms-a03 readonly pass", /MS-A03.*PASS/i.test(doc));
  ok("ms-a04 provider off pass", /MS-A04.*PASS/i.test(doc));
  ok("ms-a05 real gemini pass", /MS-A05.*PASS/i.test(doc));
  ok("ms-a06 prod forbidden pass", /MS-A06.*PASS/i.test(doc));
  ok("ms-a10 surfaces pass", /MS-A10.*PASS/i.test(doc));
  ok("ms-a11 deterministic pass", /MS-A11.*PASS/i.test(doc));
  ok("ms-a18 no enable pass", /MS-A18.*PASS/i.test(doc));
  ok("ms-a19 no write pass", /MS-A19.*PASS/i.test(doc));
  ok("ms-a20 no leaks pass", /MS-A20.*PASS/i.test(doc));
  ok("ms-b03 admin summary pass", /MS-B03.*PASS/i.test(doc));
  ok("ms-b04 admin no write pass", /MS-B04.*PASS/i.test(doc));
  ok("ms-b01 not tested noted", /MS-B01.*not tested/i.test(doc));
  ok("ms-c04 real gemini off pass", /MS-C04.*PASS/i.test(doc));
  ok("lung notes read-only clarity", /read-only readiness/i.test(doc));
  ok("lung notes no enable button", /ไม่พบปุ่มเปิด real Gemini/i.test(doc));
  ok("lung notes no secrets", /ไม่พบ secret/i.test(doc));
}

// --- observation ---
{
  ok("observation section", /Observation.*v6\.4C/i.test(doc));
  ok("observation panel contract", /AI Control Status Panel Contract/i.test(doc));
  ok("observation bundle swap", doc.includes(PREV_JS) && doc.includes(LIVE_JS));
  ok("observation no new public route", /no new public route|none/i.test(doc));
}

// --- legacy AI control center observation (§6.3) ---
{
  ok(
    "legacy observation section title",
    /Legacy Enterprise Co-Pilot Core.*Nong A AI Control Center visible below read-only panel/i.test(
      doc
    )
  );
  ok("legacy enterprise co-pilot copy", /Enterprise Co-Pilot Core/i.test(doc));
  ok("legacy nong a control center copy", /Nong A AI Control Center/i.test(doc));
  ok("legacy live sync copy", /LIVE SYNC/i.test(doc));
  ok("legacy gemini flash copy", /Gemini 3\.5 Flash Core Speed/i.test(doc));
  ok("legacy ai response success rate", /AI Response Success Rate/i.test(doc));
  ok("legacy deals driven by ai", /Deals Driven by AI/i.test(doc));
  ok("legacy memory profiles", /AI Active Memory Profiles/i.test(doc));
  ok("legacy fine tuning module", /Fine-Tuning Module/i.test(doc));
  ok("legacy datasets compiled", /Datasets Compiled/i.test(doc));
  ok("legacy moderation logs summary", /Moderation Logs summary/i.test(doc));
  ok(
    "legacy not added in v6.4C",
    /ไม่ใช่.*ส่วนที่เพิ่มใน v6.4C|not.*added in v6\.4C/i.test(doc)
  );
  ok(
    "legacy mock placeholder rule",
    /mock.*placeholder|placeholder.*mock/i.test(docLower)
  );
  ok(
    "legacy must not imply real gemini",
    /ห้ามตีความ|must not.*interpret|not.*real/i.test(doc)
  );
  ok(
    "v64c1 follow-up slice named",
    /v6\.4C\.1.*Legacy AI Control Center Disclosure/i.test(doc)
  );
  ok(
    "v64c1 audit mock vs live",
    /Mock vs live|mock.*live/i.test(doc)
  );
  ok(
    "v64c1 audit write actions",
    /Write actions|write action/i.test(doc)
  );
  ok(
    "v64c1 audit persistence",
    /localStorage|Firestore write/i.test(doc)
  );
  ok(
    "v64c1 audit ai gemini calls",
    /AI\/Gemini|Gemini API/i.test(doc)
  );
  ok(
    "v64c1 audit disclosure ux",
    /Mock.*Demo.*Not connected|Not connected/i.test(doc)
  );
  ok(
    "legacy observation does not overturn panel pass",
    /panel ใหม่ยัง.*PASS|primary panel.*PASS|read-only.*OFF.*safe/i.test(doc)
  );
  ok(
    "outcome legacy not audited deferred",
    /not audited|deferred to v6\.4C\.1/i.test(doc)
  );
}

// --- outcome safety ---
{
  ok("outcome section", /Outcome and Verdict/i.test(doc));
  ok("outcome deploy pass", /Deploy execution.*PASS|deploy.*executed/i.test(doc));
  ok("outcome manual pass", /Manual browser smoke.*PASS|Manual smoke.*PASS/i.test(doc));
  ok("outcome combined pass", /Combined.*PASS/i.test(doc));
  ok("outcome primary panel pass", /primary panel.*PASS/i.test(doc));
  ok("rollback section", /Rollback Reference/i.test(doc));
  ok("rollback CLCq6RnQ hosting", doc.includes(PREV_JS) && /hosting/i.test(docLower));
  ok("safety confirmations section", /Safety Confirmations/i.test(doc));
  ok("compliance section", /Compliance.*v6\.4C\.A/i.test(doc));
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

// --- cross-ref v64c ---
{
  ok("v64c doc exists", v64cDoc.includes("v6.4C"));
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
    "package v64ca execution record script",
    pkg.includes("test:v64ca-staging-hosting-deploy-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64ca-staging-hosting-deploy-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.4C.A Staging Hosting Deploy Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
