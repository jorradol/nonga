/**
 * v6.2B.13B — Sanitized Import Manifest Preparation (static validation only)
 * npm run test:v62b13b-sanitized-import-manifest-preparation
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.13B-sanitized-import-manifest-preparation.md";
const V62B13A_DOC =
  "docs/v6.2B.13A-real-stock-package-validation-normalization-pre-import.md";
const V62B12_DOC =
  "docs/v6.2B.12-controlled-old-listing-cleanup-archive-execution-record.md";
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

const HEAD_SHA = "1130e9df20c4a131415a20a9e2f7caaaf74b23fb";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.13B Sanitized Import Manifest Preparation ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b13b-sanitized-import-manifest-preparation.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b13aDoc = readFileSync(V62B13A_DOC, "utf8");
const v62b12Doc = readFileSync(V62B12_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 12\./,
  ""
);

// --- doc exists + v6.2B.13B ---
{
  ok("manifest prep doc exists", doc.length > 6000);
  ok("doc v6.2B.13B label", doc.includes("v6.2B.13B"));
  ok(
    "doc manifest preparation record",
    /MANIFEST PREPARATION RECORD|manifest preparation/i.test(doc)
  );
  ok("doc baseline HEAD", doc.includes(HEAD_SHA.slice(0, 12)));
  ok("doc references v62b13a", /v6\.2B\.13A/i.test(doc));
  ok("doc staging only", /staging only|nonga-ce93c/i.test(docLower));
  ok("doc outside repo manifest", /outside repo|secure ops/i.test(docLower));
  ok("doc sourceRowCountTotal 18", /sourceRowCountTotal.*\*\*18\*\*/.test(doc));
  ok("doc eligibleCount 18", /eligibleCount.*\*\*18\*\*/.test(doc));
  ok("doc selectedPilotCount 10", /selectedPilotCount.*\*\*10\*\*/.test(doc));
  ok("doc pilot range yes", /5–10|5-10/i.test(doc) && /yes/i.test(docLower));
  ok(
    "doc recommendation READY FOR IMPORT",
    /READY FOR IMPORT/.test(doc) && /Recommendation/.test(doc)
  );
  ok("doc not FIX REQUIRED final", !/recommendation.*FIX REQUIRED/i.test(doc));
  ok("doc import not executed", /import.*not executed|ยังไม่ import/i.test(docLower));
  ok("doc no Firestore writes", /Firestore writes.*none|ไม่ Firestore writes/i.test(doc));
  ok("doc sanitizedManifestCreated yes", /sanitizedManifestCreated.*yes/i.test(docLower));
  ok("doc sellingPointsStatus pass", /sellingPointsStatus.*pass/i.test(docLower));
  ok("doc uidMappingStatus pass", /uidMappingStatus.*pass/i.test(docLower));
  ok("doc sellerDisplayNameStatus pass", /sellerDisplayNameStatus.*pass/i.test(docLower));
  ok("doc listingStatusStatus pass", /listingStatusStatus.*pass/i.test(docLower));
  ok("doc pilotBatchIdStatus pass", /pilotBatchIdStatus.*pass/i.test(docLower));
  ok("doc fuelStatus pass", /fuelStatus.*pass/i.test(docLower));
  ok("doc plateFieldHandling internal", /internal-only masked|internal-only/i.test(docLower));
  ok("doc wholesale excluded", /wholesaleFieldHandling.*excluded|excluded from public/i.test(docLower));
  ok("doc imageLinksStatus pass", /imageLinksStatus.*pass/i.test(docLower));
  ok("doc pilotBatchId label", /v62b-real-pilot-001/.test(doc));
  ok("doc import gate blocked", /Import Gate.*Blocked|import execution.*not done/i.test(doc));
}

// --- report fields ---
{
  ok("report sourceRowCountTotal", /sourceRowCountTotal/.test(doc));
  ok("report eligibleCount", /eligibleCount/.test(doc));
  ok("report selectedPilotCount", /selectedPilotCount/.test(doc));
  ok("report plateFieldHandling", /plateFieldHandling/.test(doc));
  ok("report wholesaleFieldHandling", /wholesaleFieldHandling/.test(doc));
  ok("report sanitizedManifestCreated", /sanitizedManifestCreated/.test(doc));
}

// --- guardrails ---
{
  ok("no import executed", /real stock import.*not executed/i.test(docLower));
  ok("no production", /production.*excluded|not touched/i.test(docLower));
  ok("no deploy env secrets", /Deploy.*none|Secret access.*not done/i.test(doc));
  ok(
    "no lead payment mutation",
    /Lead.*mutation.*none|lead\/reveal\/outcome/i.test(docLower)
  );
  ok("no public signup AI gemini", /public signup|public AI|real Gemini/i.test(doc));
  ok("no image processing runtime", /Image processing.*not run|AI vision.*not run/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2B\.13B/i.test(doc));
  ok("git slice readFileSync only", /readFileSync only/i.test(docLower));
  ok("import phrase referenced", doc.includes(IMPORT_APPROVAL_PHRASE));
}

// --- no PII / real data in doc ---
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
    ok(
      `doc no raw image URL ${pat.source.slice(0, 15)}`,
      !pat.test(doc)
    );
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of FIREBASE_UID_PATTERNS) {
    ok(`doc no raw UID ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok("doc no secure ops full path leak", !/D:\\\\secure-ops/i.test(doc));
  ok("doc no sanitized manifest filename in repo", !/sanitized-import-manifest\.json/.test(doc) || /outside repo/i.test(doc));
}

// --- cross-ref ---
{
  ok("v62b13a exists", /v6\.2B\.13A/i.test(v62b13aDoc));
  ok("v62b13a was FIX REQUIRED", /FIX REQUIRED/.test(v62b13aDoc));
  ok("v62b12 cleanup done", /cleanup.*executed|hiddenCount.*17/i.test(v62b12Doc));
}

// --- manifest placeholder in repo ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("repo manifest placeholder only", meta?.placeholderOnly === true);
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok(
    "script no execSync gcloud",
    !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode)
  );
  ok(
    "script no firebase admin",
    !/firebase-admin|getFirestore\s*\(/.test(selfCode)
  );
  ok("script no xlsx read", !/XLSX|readFile.*xlsx/i.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok(
    "script no import execution",
    !/\bimportRealStock\s*\(|\brunImport\s*\(/.test(selfCode)
  );
  ok(
    "script no write manifest",
    !/writeFileSync\s*\(\s*[`'"].*sanitized-import-manifest/.test(selfCode)
  );
}

// --- package.json ---
{
  ok(
    "package v62b13b script",
    pkg.includes(
      "test:v62b13b-sanitized-import-manifest-preparation"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b13b-sanitized-import-manifest-preparation.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.13B Sanitized Import Manifest Preparation tests."
);
if (process.exitCode) process.exit(process.exitCode);
