/**
 * v6.2B.14 — Real Stock Manual Smoke Test Allowlisted Staging (static validation only)
 * npm run test:v62b14-real-stock-manual-smoke-test-allowlisted-staging
 */
import { readFileSync } from "node:fs";
import { SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH =
  "docs/v6.2B.14-real-stock-manual-smoke-test-allowlisted-staging.md";
const V62B13_DOC =
  "docs/v6.2B.13-controlled-real-stock-import-execution-record.md";
const V61L_CLOSURE_DOC =
  "docs/v6.1L-controlled-user-visible-ai-pilot-execution-closure-record.md";

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
  /drive\.google\.com/i,
  /docs\.google\.com/i,
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis|Revo|Vigo)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V|Accord)\b/i,
  /\bFord\s+Everest\b/i,
  /\bMitsubishi\s+Pajero\b/i,
  /\bIsuzu\s+(?:D-Max|Mu-X)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const FIREBASE_UID_PATTERNS = [/\b[a-zA-Z0-9]{28}\b/];

const HEAD_SHA = "76ffeaf468e2440dd130d12b8eba58dd909e206b";
const PRIMARY_URL = "https://a.nongbot.org";
const NO_CONTEXT_SNIPPET = "น้องเอยังไม่เห็นชุดรถล่าสุดให้เทียบในแชทนี้ครับ";
const SEARCH_PROMPT = "งบ 4 แสน มีรถอะไรน่าเล่น";
const COMPARE_PROMPT = "เทียบคันที่ 1 กับ 2";
const REFINE_PROMPT = "เอาประหยัดน้ำมัน";
const INSUFFICIENT_DATA_PHRASE = "ข้อมูลประกาศยังไม่พอ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.14 Real Stock Manual Smoke Test Allowlisted Staging ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b14-real-stock-manual-smoke-test-allowlisted-staging.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b13Doc = readFileSync(V62B13_DOC, "utf8");
const v61lClosureDoc = readFileSync(V61L_CLOSURE_DOC, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 10\./,
  "## 10."
);

// --- doc exists + label ---
{
  ok("smoke doc exists", doc.length > 4000);
  ok("doc v6.2B.14 label", doc.includes("v6.2B.14"));
  ok("doc smoke test record", /smoke test record|manual smoke/i.test(doc));
  ok("doc baseline HEAD", doc.includes(HEAD_SHA) || doc.includes("76ffeaf"));
  ok("doc references v62b13", /v6\.2B\.13/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
  ok("doc smoke complete", /smoke.*complete|verification complete/i.test(docLower));
}

// --- API / marketplace ---
{
  ok("doc api cars count 10", /count.*\*\*10\*\*|count=10/i.test(doc));
  ok("doc api success true", /success.*true/i.test(docLower));
  ok("doc pilot tagged 10", /pilot.*\*\*10\*\*|pilotTagged=10/i.test(doc));
  ok("doc non pilot 0", /non-pilot.*\*\*0\*\*|nonPilot=0/i.test(doc));
  ok("doc old hidden not visible", /old.*hidden.*not visible|not visible.*marketplace/i.test(docLower));
  ok("doc images 10/10", /10\/10|images=10/i.test(doc));
  ok("doc license plate zero", /licensePlate.*\*\*0\*\*|licensePlate=0/i.test(doc));
  ok("doc wholesale zero", /wholesale.*\*\*0\*\*|wholesale=0/i.test(doc));
  ok("doc brands aggregate 2", /brands.*\*\*2\*\*|brands=2/i.test(doc));
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL));
}

// --- allowlisted chat ---
{
  ok("allowlisted search prompt", doc.includes(SEARCH_PROMPT));
  ok("allowlisted search cards 3", /search cards=3|cards.*\*\*3\*\*.*cards/i.test(doc));
  ok("allowlisted pilot path", /pilot.*true|pilot path active/i.test(docLower));
  ok("no nonga-pilot marker", /no `nonga-pilot:`|no nonga-pilot/i.test(doc));
  ok("thai tone", /ครับ|นะครับ|thai.*tone/i.test(docLower));
  ok("insufficient data phrase ref", doc.includes(INSUFFICIENT_DATA_PHRASE));
  ok("orchestration replay method", /orchestration replay|replay against/i.test(docLower));
}

// --- compare / refine ---
{
  ok("compare prompt", doc.includes(COMPARE_PROMPT));
  ok("refine prompt", doc.includes(REFINE_PROMPT));
  ok("compare pass", /CR-01.*PASS|compare.*PASS/i.test(doc));
  ok("refine pass", /CR-06.*PASS|refine.*PASS/i.test(doc));
  ok("no zero claim pass", /zeroClaim=false|no zero-inventory|not “0 คัน”/i.test(doc));
}

// --- new chat no-context ---
{
  ok("no context snippet", doc.includes(NO_CONTEXT_SNIPPET));
  ok("new chat no context pass", /NC-01.*PASS|no-context safe copy/i.test(doc));
  ok("no stale cards", /staleCards=0|no stale/i.test(docLower));
}

// --- guest / safety ---
{
  ok("bridge route documented", doc.includes(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE));
  ok("guest bridge 401", /401|unauthenticated/i.test(doc));
  ok("public signup closed", /invite-only|public signup.*false|signup closed/i.test(docLower));
  ok("guest search cards", /guest search cards=3|guest budget search/i.test(docLower));
  ok("no production", !/production.*touched/i.test(docLower) || /production.*not touched/i.test(docLower));
  ok("no deploy env secrets", /deploy.*none|no deploy/i.test(docLower));
  ok("no import cleanup", /import.*none|no import/i.test(docLower));
  ok("no lead payment mutation", /lead.*none|payment.*none|mutation.*none/i.test(docLower));
  ok("no public signup AI gemini enabled", /public ai.*not enabled|real gemini.*not enabled/i.test(docLower));
  ok("compliance section", doc.includes("Compliance (v6.2B.14)"));
}

// --- git slice static only ---
{
  ok("git slice readFileSync only", selfSrc.includes("readFileSync"));
  for (const pattern of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pattern.source.slice(0, 12)}`, !pattern.test(docForPlateScan));
  }
  for (const pattern of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pattern.source.slice(0, 12)}`, !pattern.test(docForPlateScan));
  }
  for (const pattern of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pattern.source.slice(0, 12)}`, !pattern.test(docForPlateScan));
  }
  for (const pattern of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw image URL ${pattern.source.slice(0, 12)}`, !pattern.test(docForPlateScan));
  }
  ok("doc no production URL", !PRODUCTION_URL_PATTERNS.some((p) => p.test(docForPlateScan)));
  for (const pattern of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate ${pattern.source.slice(0, 12)}`, !pattern.test(docForPlateScan));
  }
  for (const pattern of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pattern.source.slice(0, 12)}`, !pattern.test(docForPlateScan));
  }
  const docSansShas = docForPlateScan.replace(/\b[a-f0-9]{40}\b/g, "");
  ok("doc no raw UID", !FIREBASE_UID_PATTERNS.some((p) => p.test(docSansShas)));
  ok("doc no secure ops full path leak", !/D:\\\\secure-ops/i.test(doc));
}

// --- upstream refs ---
{
  ok("v62b13 import 10", /importedCount.*10|import.*10 listings/i.test(v62b13Doc));
  ok("v61l closure exists", v61lClosureDoc.length > 5000);
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok(
    "script no execSync gcloud",
    !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode)
  );
  ok(
    "script no firebase admin",
    !/firebase-admin|getFirestore\s*\(/.test(selfCode)
  );
  ok("script no runtime smoke imports", !/runUserVisibleOrchestrationBridge/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok("script no firestore write", !/dealerListings.*PATCH|\.set\s*\(/.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v62b14 script",
    pkg.includes("test:v62b14-real-stock-manual-smoke-test-allowlisted-staging")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b14-real-stock-manual-smoke-test-allowlisted-staging.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.14 Real Stock Manual Smoke Test Allowlisted Staging tests."
);
if (process.exitCode) process.exit(process.exitCode);
