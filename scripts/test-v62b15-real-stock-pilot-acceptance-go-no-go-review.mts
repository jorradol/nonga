/**
 * v6.2B.15 — Real Stock Pilot Acceptance / Go-No-Go Review (static validation only)
 * npm run test:v62b15-real-stock-pilot-acceptance-go-no-go-review
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2B.15-real-stock-pilot-acceptance-go-no-go-review.md";
const V62B14_DOC =
  "docs/v6.2B.14-real-stock-manual-smoke-test-allowlisted-staging.md";
const V62B13_DOC =
  "docs/v6.2B.13-controlled-real-stock-import-execution-record.md";
const V62B12_DOC =
  "docs/v6.2B.12-controlled-old-listing-cleanup-archive-execution-record.md";
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

const HEAD_SHA = "b02f98fa35d3e4631b11e131e45cd5af3871c0da";
const PRIMARY_URL = "https://a.nongbot.org";
const SEARCH_PROMPT = "งบ 4 แสน มีรถอะไรน่าเล่น";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.15 Real Stock Pilot Acceptance / Go-No-Go Review ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b15-real-stock-pilot-acceptance-go-no-go-review.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b14Doc = readFileSync(V62B14_DOC, "utf8");
const v62b13Doc = readFileSync(V62B13_DOC, "utf8");
const v62b12Doc = readFileSync(V62B12_DOC, "utf8");
const v61lClosureDoc = readFileSync(V61L_CLOSURE_DOC, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 9\./,
  "## 9."
);

// --- doc exists + label ---
{
  ok("acceptance doc exists", doc.length > 5000);
  ok("doc v6.2B.15 label", doc.includes("v6.2B.15"));
  ok("doc acceptance go-no-go", /acceptance.*go-no-go|go-no-go review/i.test(doc));
  ok("doc baseline HEAD", doc.includes(HEAD_SHA) || doc.includes("b02f98f"));
  ok("doc references v62b14", /v6\.2B\.14/i.test(doc));
  ok("doc references v62b13", /v6\.2B\.13/i.test(doc));
  ok("doc staging only", /staging only/i.test(docLower));
}

// --- current staging state ---
{
  ok("doc pilot listings 10", /pilot listings.*\*\*10\*\*|pilotListings=10/i.test(doc));
  ok("doc marketplace visible 10", /marketplace visible count.*\*\*10\*\*|marketplaceVisible=10/i.test(doc));
  ok("doc old hidden", /old.*hidden|oldHidden=not visible/i.test(docLower));
  ok("doc public plate zero", /licensePlate.*\*\*0\*\*|publicPlate=0/i.test(doc));
  ok("doc wholesale zero", /wholesale.*\*\*0\*\*|publicWholesale=0/i.test(doc));
  ok("doc images 10/10", /10\/10|images=10/i.test(doc));
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL));
}

// --- smoke summary ---
{
  ok("smoke api marketplace pass", /api.*marketplace.*PASS|api\/marketplace PASS/i.test(doc));
  ok("smoke allowlisted search pass", /allowlisted search.*PASS|search=3 cards PASS/i.test(doc));
  ok("smoke search prompt ref", doc.includes(SEARCH_PROMPT));
  ok("smoke search cards 3", /search.*\*\*3\*\*|search=3 cards/i.test(doc));
  ok("smoke compare refine pass", /compare\/refine.*PASS|compare\/refine PASS/i.test(doc));
  ok("smoke no context pass", /no-context.*PASS|noContextSafe PASS/i.test(doc));
  ok("smoke guest unchanged", /guest.*unchanged|guest unchanged PASS/i.test(docLower));
}

// --- guardrails ---
{
  ok("guardrail staging only", /staging only/i.test(docLower));
  ok("guardrail allowlisted only", /allowlisted.*only|allowlisted user-visible/i.test(docLower));
  ok("guardrail public ai not enabled", /public ai.*not enabled|publicAI=false/i.test(docLower));
  ok("guardrail real gemini not enabled", /real gemini.*not enabled|realGeminiUserPath=false/i.test(docLower));
  ok("guardrail production not touched", /production.*not touched|NO-GO.*production/i.test(docLower));
  ok("guardrail rollback available", /rollback.*available|rollback path/i.test(docLower));
  ok("guardrail v61l rollback ref", /v6\.1L.*rollback|v6\.1L §6/i.test(doc));
}

// --- known limitations ---
{
  ok("limitation manual smoke", /manual smoke still limited/i.test(docLower));
  ok("limitation image hotlink", /image hotlink|hotlink\/display/i.test(docLower));
  ok("limitation legal pdpa", /legal|PDPA|สคบ/i.test(doc));
  ok("limitation no public approval", /no public launch approval|NO-GO public/i.test(docLower));
}

// --- go / no-go ---
{
  ok("go controlled staging pilot", /GO.*controlled staging pilot|GO \(controlled staging pilot\)/i.test(doc));
  ok("go lung allowlisted", /ลุง.*allowlisted|allowlisted tester/i.test(doc));
  ok("no-go public launch", /NO-GO.*public|NO-GO public/i.test(doc));
  ok("no-go production", /NO-GO.*production|NO-GO production/i.test(doc));
  ok("no-go public ai gemini", /NO-GO.*public ai|NO-GO publicAI|real Gemini/i.test(doc));
  ok("recommendation summary line", /Recommendation: GO/i.test(doc));
  ok("not public launch approval", /not.*public launch approval|ไม่ใช่ public launch approval/i.test(docLower));
}

// --- safety ---
{
  ok("no deploy env secrets", /deploy.*none|no deploy/i.test(docLower));
  ok("no import cleanup", /import.*none|no import|no cleanup/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*none|no Firestore writes/i.test(docLower));
  ok("no lead payment mutation", /lead.*none|payment.*none|mutation.*none/i.test(docLower));
  ok("compliance section", doc.includes("Compliance (v6.2B.15)"));
}

// --- git slice static only + privacy scan ---
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
  ok("v62b14 smoke complete", /smoke.*complete|verification complete/i.test(v62b14Doc.toLowerCase()));
  ok("v62b13 import 10", /importedCount.*10|import.*10 listings/i.test(v62b13Doc));
  ok("v62b12 cleanup hidden 17", /hidden count 17|hidden.*17/i.test(v62b12Doc));
  ok("v61l closure rollback", /Kill Switch & Rollback/i.test(v61lClosureDoc));
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
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok("script no firestore write", !/dealerListings.*PATCH|\.set\s*\(/.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v62b15 script",
    pkg.includes("test:v62b15-real-stock-pilot-acceptance-go-no-go-review")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b15-real-stock-pilot-acceptance-go-no-go-review.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.15 Real Stock Pilot Acceptance / Go-No-Go Review tests."
);
if (process.exitCode) process.exit(process.exitCode);
