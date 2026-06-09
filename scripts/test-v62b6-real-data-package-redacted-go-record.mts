/**
 * v6.2B.6 — Real Data Package Redacted GO Record (static validation only)
 * npm run test:v62b6-real-data-package-redacted-go-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2B.6-real-data-package-redacted-go-record.md";
const V62B5_DOC =
  "docs/v6.2B.5-real-stock-data-package-ops-dry-run-result-review.md";
const MANIFEST_PATH =
  "docs/examples/v6.2B.1-real-stock-sample-manifest.placeholder.json";

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

const REAL_CAR_PRICE_PATTERNS = [
  /\b\d{3,7}\s*(?:บาท|baht|THB)\b/i,
  /\bprice:\s*\d{4,}/i,
];

const REAL_MAKE_MODEL_EXAMPLES = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Hilux)\b/i,
  /\bHonda\s+(?:City|Civic|Jazz|CR-V|Accord)\b/i,
  /\bMazda\s+\d/i,
  /\bIsuzu\s+D-Max\b/i,
  /\bNissan\s+(?:Almera|Navara|Terra)\b/i,
];

const IMPORT_DEPLOY_COMMAND_PATTERNS = [
  /firebase deploy/i,
  /gcloud run services update/i,
  /npm run import/i,
  /inventoryImportCommit\s*\(/,
];

const HEAD_SHA = "5f9f60a858c41f451a30b422c5b80f7171c48a91";
const APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";
const INSUFFICIENT_DATA = "ข้อมูลประกาศยังไม่พอ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2B.6 Real Data Package Redacted GO Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b6-real-data-package-redacted-go-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b5Doc = readFileSync(V62B5_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 12\./,
  ""
);

// --- doc exists + v6.2B.6 ---
{
  ok("GO record doc exists", doc.length > 8000);
  ok("doc v6.2B.6 label", doc.includes("v6.2B.6"));
  ok("doc redacted GO record", /redacted GO record|Redacted GO Record/i.test(doc));
  ok("doc HEAD 5f9f60a", doc.includes(HEAD_SHA) || doc.includes("5f9f60a"));
  ok("doc references v62b5", /v6\.2B\.5/i.test(doc));
  ok("doc not import approval", /GO Is Not Import Approval|GO is NOT import approval/i.test(doc));
}

// --- preflight PENDING to ops GO ---
{
  ok("prior preflight PENDING", /preflight.*PENDING|PENDING.*no access/i.test(doc));
  ok("ops reviewed outside repo", /ops ตรวจ.*นอก repo|ops review completed.*outside repo/i.test(doc));
  ok("redacted summary only", /redacted summary only|counts only/i.test(docLower));
}

// --- redacted GO counts ---
{
  ok("carsTotal 10", /carsTotal\s*\|\s*\*\*10\*\*|carsTotal: 10/i.test(doc));
  ok("passed 10", /passed\s*\|\s*\*\*10\*\*|passed: 10/i.test(doc));
  ok("fixRequired 0", /fixRequired\s*\|\s*\*\*0\*\*|fixRequired: 0/i.test(doc));
  ok("noGo 0", /noGo\s*\|\s*\*\*0\*\*|noGo: 0/i.test(doc));
  ok("recommendation GO", /recommendation\s*\|\s*\*\*GO\*\*|recommendation: GO/i.test(doc));
  ok("redacted GO summary block", /Redacted GO Summary/i.test(doc));
}

// --- rights consent pass ---
{
  ok("rights consent pass", /สิทธิ์ใช้ข้อมูล\/รูป.*pass|consent checked.*pass/i.test(doc));
  ok("image rights pass", /image rights checked.*pass/i.test(docLower));
}

// --- PII image pass ---
{
  ok("no phone line address in photos pass", /ไม่มีเบอร์\/LINE\/ที่อยู่\/เอกสารในรูป.*pass/i.test(doc));
  ok("plate masked pass", /ป้ายทะเบียน.*pass|plate.*pass/i.test(doc));
  ok("raw image URLs not in repo", /raw image URLs not in repo/i.test(docLower));
}

// --- data quality stale rollback pass ---
{
  ok("data enough search compare", /ค้นหา\/เทียบ\/แนะนำ.*pass|search\/compare\/refine.*pass/i.test(doc));
  ok("still for sale price current pass", /ยังขายอยู่\/ราคา.*pass|sold\/reserved checked.*pass/i.test(doc));
  ok("rollback hide delist pass", /ซ่อน\/ถอดรถ.*pass|rollback.*pass/i.test(doc));
}

// --- import gate ---
{
  ok("GO not import approval", /GO.*not import approval|GO ≠ import approval/i.test(doc));
  ok("import remains blocked", /import.*blocked|still blocked/i.test(docLower));
  ok("approval phrase required", doc.includes(APPROVAL_PHRASE));
  ok("separate import execution record", /separate import execution record/i.test(docLower));
  ok("no import command in doc", !/npm run import|inventoryImportCommit/i.test(doc));
}

// --- old listings not modified ---
{
  ok("old listing cleanup not executed", /not deleted|not hidden|not executed/i.test(docLower));
  ok("existing listings not modified section", /Existing Listings.*Not Modified/i.test(doc));
  ok("next step cleanup archive plan", /old listing cleanup.*archive plan/i.test(docLower));
}

// --- no import deploy commands ---
{
  for (const pat of IMPORT_DEPLOY_COMMAND_PATTERNS) {
    ok(`doc no import/deploy cmd ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- forbidden / scope ---
{
  ok("no runtime code", /docs\/tests\/package only|not in v6\.2B\.6/i.test(docLower));
  ok("no deploy", /deploy.*not|not in v6\.2B\.6/i.test(docLower));
  ok("no env update", /env update.*not/i.test(docLower));
  ok("no image processing runtime", /image processing.*not in v6\.2B\.6/i.test(docLower));
  ok("no AI vision API", /AI\/vision API.*not/i.test(docLower));
  ok("no production", /production.*not touched|forbidden/i.test(docLower));
  ok("no firestore rules deploy", /Firestore rules/i.test(doc));
  ok("no secrets access", /secrets versions access/i.test(doc));
  ok("no payment lead reveal outcome", /payment.*settlement|lead.*reveal/i.test(docLower));
  ok("no public signup AI", /public signup|public AI/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B\.6/i.test(doc));
}

// --- no PII/secrets/real data in doc ---
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
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate data ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  for (const pat of REAL_CAR_PRICE_PATTERNS) {
    ok(`doc no real price ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_MAKE_MODEL_EXAMPLES) {
    ok(`doc no real make/model ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  ok("doc no raw UID", /Raw UID/i.test(doc) && !/\b[A-Za-z0-9]{28}\b/.test(doc.replace(/Raw UID[\s\S]*?## 12\./, "")));
  ok("doc no prompt dump label only", /Prompt dump/i.test(doc));
}

// --- manifest placeholder ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest placeholder only", meta?.placeholderOnly === true);
  ok("no raw real stock in repo", /no real stock data|Raw real stock data/i.test(doc));
}

// --- cross-ref v62b5 ---
{
  ok("v62b5 template exists", /v6\.2B\.5/i.test(v62b5Doc));
  ok("v62b5 import blocked", /import.*blocked/i.test(v62b5Doc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62b6 script",
    pkg.includes("test:v62b6-real-data-package-redacted-go-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b6-real-data-package-redacted-go-record.mts"
    )
  );
}

console.log("\nDone v6.2B.6 Real Data Package Redacted GO Record tests.");
if (process.exitCode) process.exit(process.exitCode);
