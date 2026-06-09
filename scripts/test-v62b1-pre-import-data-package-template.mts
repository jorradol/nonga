/**
 * v6.2B.1 — Pre-import Data Package Template / Sample Manifest (static validation only)
 * npm run test:v62b1-pre-import-data-package-template
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2B.1-pre-import-data-package-template.md";
const MANIFEST_PATH =
  "docs/examples/v6.2B.1-real-stock-sample-manifest.placeholder.json";
const V62B_DOC = "docs/v6.2B-real-stock-import-execution-plan.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b\+66[89]\d{8}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [
  /@[a-z][a-z0-9._-]{3,20}\b/i,
  /line\.me\/ti\/p\//i,
];

const FIREBASE_UID_PATTERN = /\b[a-zA-Z0-9]{28}\b/;

const PRODUCTION_URL_PATTERNS = [
  /https?:\/\/(?:www\.)?nongbot\.org\b/i,
  /https?:\/\/nonga\.(com|co\.th)/i,
];

const FORBIDDEN_COMMAND_PATTERNS = [
  /gcloud\s+run\s+services\s+update/i,
  /gcloud\s+secrets\s+versions\s+access/i,
  /firebase\s+deploy/i,
  /firebase-tools\s+deploy/i,
  /npm run import/i,
  /importRealStock\s*\(/i,
  /"command"\s*:\s*"import/i,
];

const HEAD_SHA = "8c2fc8a8567208ad28a350c0d7873b77d1a003ed";
const APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2B.1 Pre-import Data Package Template ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");
const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
const selfSrc = readFileSync(
  "scripts/test-v62b1-pre-import-data-package-template.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62bDoc = readFileSync(V62B_DOC, "utf8");

// --- doc exists + v6.2B.1 ---
{
  ok("template doc exists", doc.length > 4000);
  ok("doc v6.2B.1 label", doc.includes("v6.2B.1"));
  ok("doc pre-import data package", /pre-import data package/i.test(doc));
  ok("doc template only", /template only|placeholder only/i.test(docLower));
  ok("doc HEAD 8c2fc8a", doc.includes(HEAD_SHA) || doc.includes("8c2fc8a"));
  ok("doc references v62b", /v6\.2B/i.test(doc));
  ok("doc not real import", /ไม่ใช่การ import|not.*import|import.*blocked/i.test(docLower));
}

// --- manifest placeholder only ---
{
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest parses", typeof manifest === "object");
  ok("meta placeholderOnly true", meta?.placeholderOnly === true);
  ok("meta realStockImportBlocked true", meta?.realStockImportBlocked === true);
  ok("meta schemaVersion", String(meta?.schemaVersion).includes("placeholder"));
  ok("batch manifest present", typeof manifest.batchManifest === "object");
  ok("vehicles array present", Array.isArray(manifest.vehicles));
  ok("vehicles count sample", (manifest.vehicles as unknown[]).length >= 1);
  ok("vehicles count under batch max", (manifest.vehicles as unknown[]).length <= 10);
}

// --- vehicle placeholder fields ---
{
  const vehicles = manifest.vehicles as Record<string, unknown>[];
  const v0 = vehicles[0];
  ok("v0 listingId placeholder", String(v0.listingId).startsWith("pilot-placeholder-"));
  ok("v0 sourceId placeholder", String(v0.sourceId).startsWith("pilot-placeholder-"));
  ok("v0 make", typeof v0.make === "string" && v0.make.length > 0);
  ok("v0 model", typeof v0.model === "string");
  ok("v0 year", typeof v0.year === "number");
  ok("v0 trim", typeof v0.trim === "string");
  ok("v0 price", typeof v0.price === "number");
  ok("v0 mileage", typeof v0.mileage === "number");
  ok("v0 transmission", typeof v0.transmission === "string");
  ok("v0 fuel", typeof v0.fuel === "string");
  ok("v0 color", typeof v0.color === "string");
  ok("v0 province", typeof v0.province === "string");
  ok("v0 photoPlaceholders", Array.isArray(v0.photoPlaceholders));
  ok("v0 highlights", typeof v0.highlights === "string");
  ok("v0 checkNotes", typeof v0.checkNotes === "string");
  ok("v0 listingStatus", v0.listingStatus === "available");
  ok("v0 sellerDisplayName non-pii", /ตัวอย่าง|placeholder/i.test(String(v0.sellerDisplayName)));
  ok("v0 sourceUpdatedAt", typeof v0.sourceUpdatedAt === "string");
  ok("v0 consent object", typeof v0.consent === "object");
}

// --- consent flags placeholder (all false) ---
{
  const vehicles = manifest.vehicles as Record<string, unknown>[];
  const consentKeys = [
    "sellerConsent",
    "imageRightsConfirmed",
    "piiReviewed",
    "staleChecked",
    "rollbackReady",
  ];
  for (const v of vehicles) {
    const c = v.consent as Record<string, boolean>;
    for (const key of consentKeys) {
      ok(`consent ${String(v.listingId)} ${key} false`, c[key] === false);
    }
  }
}

// --- photo placeholders not real URLs ---
{
  const vehicles = manifest.vehicles as Record<string, unknown>[];
  for (const v of vehicles) {
    const photos = v.photoPlaceholders as string[];
    for (const p of photos) {
      ok(`photo placeholder ${p}`, /^placeholder-photo-/.test(p));
      ok(`photo no http ${p}`, !/^https?:\/\//i.test(p));
    }
  }
}

// --- forbidden fields documented ---
{
  ok("forbidden phone doc", /เบอร์โทรจริง/i.test(doc));
  ok("forbidden owner name doc", /ชื่อเจ้าของจริง/i.test(doc));
  ok("forbidden LINE doc", /LINE ID จริง/i.test(doc));
  ok("forbidden address doc", /ที่อยู่จริง/i.test(doc));
  ok("forbidden plate doc", /เลขทะเบียนเต็ม/i.test(doc));
  ok("forbidden docs photos doc", /บัตร.*ใบเล่ม|เอกสาร/i.test(doc));
  ok("forbidden uid doc", /UID จริง/i.test(doc));
  ok("forbidden prompt doc", /prompt จริง/i.test(doc));
  ok("forbidden secret doc", /secret.*env dump/i.test(docLower));
  ok("forbidden customer data doc", /customer data จริง|ข้อมูลลูกค้าจริง/i.test(doc));
}

// --- no real PII/secrets in manifest ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`manifest no phone ${pat.source.slice(0, 15)}`, !pat.test(manifestRaw));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`manifest no LINE ${pat.source.slice(0, 15)}`, !pat.test(manifestRaw));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`manifest no secret ${pat.source.slice(0, 15)}`, !pat.test(manifestRaw));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok(`manifest no production URL ${pat.source.slice(0, 20)}`, !pat.test(manifestRaw));
  }
  // exclude known placeholder IDs from false-positive UID match
  const withoutPlaceholders = manifestRaw.replace(/pilot-placeholder-[a-z0-9-]+/gi, "");
  ok("manifest no raw firebase UID", !FIREBASE_UID_PATTERN.test(withoutPlaceholders));
}

// --- no forbidden commands in manifest/doc ---
{
  for (const pat of FORBIDDEN_COMMAND_PATTERNS) {
    ok(`manifest no command ${pat.source.slice(0, 20)}`, !pat.test(manifestRaw));
  }
  ok("doc no gcloud deploy command", !/```[\s\S]*gcloud run services update[\s\S]*```/.test(doc));
  ok("doc no firebase deploy command", !/```[\s\S]*firebase deploy[\s\S]*```/.test(doc));
}

// --- import blocked + approval ---
{
  ok("import still blocked doc", /import.*blocked|still blocked/i.test(docLower));
  ok("v62b1 requires explicit approval", /explicit approval.*ข้อมูลจริง|approval.*real data/i.test(docLower));
  ok("approval phrase documented", doc.includes(APPROVAL_PHRASE));
  ok("next step review not import", /review data package.*NOT import|review data package/i.test(doc));
  ok("v62b import blocked cross-ref", /import.*blocked|still blocked/i.test(v62bDoc));
}

// --- template workflow ---
{
  ok("consent flags template section", /Consent Flags Template/i.test(doc));
  ok("placeholder vs real rules", /Placeholder vs Real Data/i.test(doc));
  ok("manifest path in doc", doc.includes(MANIFEST_PATH));
  ok("batch limit 5-10", /5.*10|batchLimitMin.*5/i.test(doc));
}

// --- forbidden slice compliance ---
{
  ok("forbidden no runtime", /runtime code.*not done|not in this slice/i.test(docLower));
  ok("forbidden no deploy", /deploy.*not done|ไม่ deploy/i.test(docLower));
  ok("forbidden no env update", /env update.*not done/i.test(docLower));
  ok("forbidden no production", /production.*not touched|not touched/i.test(docLower));
  ok("forbidden no firestore rules", /firestore rules.*not done/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no payment lead", /payment.*settlement|lead.*reveal/i.test(docLower));
  ok("forbidden no public AI", /public ai.*not|public signup/i.test(docLower));
  ok("forbidden no real gemini", /real gemini user-visible.*not/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B\.1/i.test(doc));
}

// --- no secret values in doc ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  const selfCodeNoPatterns = selfCode.replace(
    /const FORBIDDEN_COMMAND_PATTERNS = \[[\s\S]*?\];/,
    ""
  );
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok(
    "script no import execution",
    !/\bimportRealStock\s*\(|\brunImport\s*\(/.test(selfCodeNoPatterns)
  );
}

// --- package.json ---
{
  ok(
    "package v62b1 script",
    pkg.includes("test:v62b1-pre-import-data-package-template")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62b1-pre-import-data-package-template.mts")
  );
}

console.log("\nDone v6.2B.1 Pre-import Data Package Template tests.");
if (process.exitCode) process.exit(process.exitCode);
