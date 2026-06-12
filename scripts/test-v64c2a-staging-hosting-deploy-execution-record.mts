/**
 * v6.4C.2A — Staging Hosting Deploy + Manual Smoke Execution Record (static validation only)
 * npm run test:v64c2a-staging-hosting-deploy-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.4C.2A-staging-hosting-deploy-execution-record.md";
const V64C2_DOC =
  "docs/v6.4C.2-legacy-ai-control-center-disclosure-ui-remediation.md";
const V64CA_DOC =
  "docs/v6.4C.A-staging-hosting-deploy-execution-record.md";

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

const CODE_SHA = "676baada30f02cf7dd181ca6d635032773618d21";
const LIVE_JS = "index-CHVc8agp.js";
const PREV_JS = "index-DMz8UVjA.js";
const LIVE_CSS = "index-D9QT0jB9.css";
const STAGING_REV = "nonga-staging-00076-hmh";
const PROD_REV = "nonga-api-00003-fg4";
const STAGING_URL = "https://a.nongbot.org";
const PANEL_TITLE = "AI Control Status Panel";
const PROVIDER_OFF = "AI provider is OFF";
const REAL_GEMINI_OFF = "Real Gemini is not enabled";
const PROD_FORBIDDEN = "Production real provider is forbidden";
const READONLY_BADGE = "Read-only readiness";
const LEGACY_BANNER = "legacy-ai-control-safety-banner";
const DEMO_NOT_CONNECTED = "Demo / Not connected";
const LEGACY_ADMIN_CONFIG = "Legacy admin config";
const LEGACY_CONFIG_PERSISTENCE = "Legacy config persistence";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4C.2A Staging Hosting Deploy + Manual Smoke Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v64c2a-staging-hosting-deploy-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v64c2Doc = readFileSync(V64C2_DOC, "utf8");
const v64caDoc = readFileSync(V64CA_DOC, "utf8");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/UUvg…hK2|h0xj…SC3|IjEx…l23|IcoN…0x1/g, "MASKED_UID")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.4C.2A record ---
{
  ok("execution doc exists", doc.length > 6000);
  ok("doc v6.4C.2A label", doc.includes("v6.4C.2A"));
  ok(
    "doc execution record redacted",
    /EXECUTION RECORD.*REDACTED/i.test(doc)
  );
  ok(
    "doc hosting deploy manual smoke",
    /hosting deploy.*manual smoke|manual smoke.*hosting/i.test(docLower)
  );
  ok("doc HEAD 676baad", doc.includes(CODE_SHA) || doc.includes("676baad"));
  ok("doc references v64c2", /v6\.4C\.2/i.test(doc));
  ok("doc legacy disclosure ui", /Legacy AI Control Center Disclosure/i.test(doc));
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
  ok(
    "untracked deploy plan docs not staged",
    /untracked deploy plan|readiness plans remain untracked/i.test(doc)
  );
}

// --- preflight ---
{
  ok("preflight section", /Preflight/i.test(doc));
  ok(
    "preflight v64c2 test",
    /test:v64c2-legacy-ai-control-center-disclosure-ui-remediation/i.test(doc)
  );
  ok(
    "preflight v64c1 test",
    /test:v64c1-legacy-ai-control-center-disclosure-safety-audit/i.test(doc)
  );
  ok(
    "preflight v64c test",
    /test:v64c-admin-read-only-ai-control-status-panel-readiness/i.test(doc)
  );
  ok(
    "preflight v64b test",
    /test:v64b-ai-control-model-types-static-readiness/i.test(doc)
  );
  ok(
    "preflight v63b6 test",
    /test:v63b6-golden-seller-voice-refinement/i.test(doc)
  );
  ok(
    "preflight v63b5 test",
    /test:v63b5-in-chat-curated-sales-copy-weave/i.test(doc)
  );
  ok("preflight git 676baad", doc.includes("676baad"));
}

// --- deploy summary ---
{
  ok("deploy summary section", /Deploy Summary/i.test(doc));
  ok("deploy complete", /Deploy complete/i.test(doc));
  ok("live bundle CHVc8agp", doc.includes(LIVE_JS));
  ok("live css D9QT0jB9", doc.includes(LIVE_CSS));
  ok("previous bundle replaced", doc.includes(PREV_JS));
  ok("cloud run revision unchanged", doc.includes(STAGING_REV));
  ok("staging url a.nongbot", doc.includes(STAGING_URL));
  ok("legacy safety banner marker", doc.includes(LEGACY_BANNER));
  ok("demo not connected marker", doc.includes(DEMO_NOT_CONNECTED));
  ok("legacy admin config marker", doc.includes(LEGACY_ADMIN_CONFIG));
  ok("legacy config persistence marker", doc.includes(LEGACY_CONFIG_PERSISTENCE));
  ok("no live data source marker", /no live data source/i.test(doc));
  ok("not connected real gemini marker", /Not connected to real Gemini/i.test(doc));
  ok("panel testid marker", /ai-control-status-panel/i.test(doc));
  ok("panel title", doc.includes(PANEL_TITLE));
  ok("provider off marker", doc.includes(PROVIDER_OFF));
  ok("real gemini off marker", doc.includes(REAL_GEMINI_OFF));
  ok("production forbidden marker", doc.includes(PROD_FORBIDDEN));
  ok("readonly badge marker", doc.includes(READONLY_BADGE));
  ok("deterministic only marker", /DETERMINISTIC_ONLY/i.test(doc));
  ok("golden hook marker", /จุดที่น่าดู|featureWeave/i.test(doc));
  ok("live sync absent in bundle markers", /LIVE SYNC.*absent/i.test(doc));
  ok(
    "gemini flash speed absent in bundle markers",
    /Gemini 3\.5 Flash Core Speed.*absent/i.test(doc)
  );
}

// --- automated smoke ---
{
  ok("automated smoke section", /Automated Post-deploy Smoke/i.test(doc));
  ok("automated http 200", /HTTP 200/i.test(doc));
  ok("automated bundle swap", doc.includes(LIVE_JS) && doc.includes(PREV_JS));
  ok("automated legacy banner in js", doc.includes(LEGACY_BANNER));
  ok("automated demo not connected", doc.includes(DEMO_NOT_CONNECTED));
  ok("automated panel testid in js", /ai-control-status-panel/i.test(doc));
  ok("automated provider off in js", doc.includes(PROVIDER_OFF));
  ok("automated live sync absent", /LIVE SYNC.*absent|no `LIVE SYNC`/i.test(doc));
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
  ok("ms-a07 provider effective off pass", /MS-A07.*PASS/i.test(doc));
  ok("ms-a08 deterministic pass", /MS-A08.*PASS/i.test(doc));
  ok("ms-a09 no enable pass", /MS-A09.*PASS/i.test(doc));
  ok("ms-a10 no write pass", /MS-A10.*PASS/i.test(doc));
  ok("ms-a11 no leaks pass", /MS-A11.*PASS/i.test(doc));
  ok("ms-b01 safety banner pass", /MS-B01.*PASS/i.test(doc));
  ok("ms-b02 demo not connected pass", /MS-B02.*PASS/i.test(doc));
  ok("ms-b03 legacy admin config pass", /MS-B03.*PASS/i.test(doc));
  ok("ms-b04 write warning pass", /MS-B04.*PASS/i.test(doc));
  ok("ms-b05 no live sync pass", /MS-B05.*PASS/i.test(doc));
  ok("ms-b06 no gemini speed pass", /MS-B06.*PASS/i.test(doc));
  ok("ms-b07 mock labels pass", /MS-B07.*PASS/i.test(doc));
  ok("ms-b08 no enable pass", /MS-B08.*PASS/i.test(doc));
  ok("ms-b09 no new write pass", /MS-B09.*PASS/i.test(doc));
  ok("ms-b10 no leaks pass", /MS-B10.*PASS/i.test(doc));
  ok("ms-c01 bundle pass", /MS-C01.*PASS/i.test(doc));
  ok("ms-c02 real gemini off pass", /MS-C02.*PASS/i.test(doc));
  ok("ms-c03 infra pass", /MS-C03.*PASS/i.test(doc));
  ok("ms-c04 golden seller pass", /MS-C04.*PASS/i.test(doc));
  ok("ms-c05 buyer preview pass", /MS-C05.*PASS/i.test(doc));
  ok("lung notes disclosure clarity", /Demo \/ Not connected|disclosure remediation/i.test(doc));
  ok("lung notes no live sync", /ไม่เห็น.*LIVE SYNC/i.test(doc));
  ok("lung notes no enable button", /ไม่พบปุ่มเปิด real Gemini/i.test(doc));
  ok("lung notes no secrets", /ไม่พบ secret/i.test(doc));
  ok("lung notes golden seller preview", /golden seller weave|buyer-friendly preview/i.test(doc));
}

// --- observation ---
{
  ok("observation section", /Observation.*v6\.4C\.2/i.test(doc));
  ok("observation legacy disclosure contract", /Legacy Disclosure Contract/i.test(doc));
  ok("observation bundle swap", doc.includes(PREV_JS) && doc.includes(LIVE_JS));
  ok("observation v64ca diff", doc.includes(PREV_JS));
  ok("observation misleading copy removed", /LIVE SYNC|Gemini 3\.5 Flash/i.test(doc));
  ok("observation panel unchanged", /unchanged behavior|ไม่ regression/i.test(doc));
}

// --- outcome safety ---
{
  ok("outcome section", /Outcome and Verdict/i.test(doc));
  ok("outcome deploy pass", /Deploy execution.*PASS|deploy.*executed/i.test(doc));
  ok("outcome manual pass", /Manual browser smoke.*PASS|Manual smoke.*PASS/i.test(doc));
  ok("outcome combined pass", /Combined.*PASS/i.test(doc));
  ok("outcome legacy disclosure pass", /legacy disclosure.*PASS/i.test(doc));
  ok("rollback section", /Rollback Reference/i.test(doc));
  ok("rollback DMz8UVjA hosting", doc.includes(PREV_JS) && /hosting/i.test(docLower));
  ok("safety confirmations section", /Safety Confirmations/i.test(doc));
  ok("compliance section", /Compliance.*v6\.4C\.2A/i.test(doc));
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

// --- cross-ref ---
{
  ok("v64c2 doc exists", v64c2Doc.includes("v6.4C.2"));
  ok("v64ca doc exists", v64caDoc.includes("v6.4C.A"));
  ok("v64ca previous bundle referenced", v64caDoc.includes(PREV_JS));
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
    "package v64c2a execution record script",
    pkg.includes("test:v64c2a-staging-hosting-deploy-execution-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64c2a-staging-hosting-deploy-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.4C.2A Staging Hosting Deploy Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
