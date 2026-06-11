/**
 * v6.2B.13A — Real Stock Package Validation / Normalization Pre-import (static validation only)
 * npm run test:v62b13a-real-stock-package-validation-normalization-pre-import
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.13A-real-stock-package-validation-normalization-pre-import.md";
const V62B12_DOC =
  "docs/v6.2B.12-controlled-old-listing-cleanup-archive-execution-record.md";
const V62B6_DOC = "docs/v6.2B.6-real-data-package-redacted-go-record.md";
const V62B1_DOC = "docs/v6.2B.1-pre-import-data-package-template.md";
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

const HEAD_SHA = "8a409c3bc8027df1521f7b8bb41ec6c642932ccd";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.13A Real Stock Package Validation / Normalization Pre-import ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b13a-real-stock-package-validation-normalization-pre-import.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b12Doc = readFileSync(V62B12_DOC, "utf8");
const v62b6Doc = readFileSync(V62B6_DOC, "utf8");
const v62b1Doc = readFileSync(V62B1_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 14\./,
  ""
);

// --- doc exists + v6.2B.13A ---
{
  ok("validation record doc exists", doc.length > 6000);
  ok("doc v6.2B.13A label", doc.includes("v6.2B.13A"));
  ok(
    "doc pre-import validation status",
    /VALIDATION RECORD|validation.*pre-import/i.test(doc)
  );
  ok("doc baseline HEAD", doc.includes(HEAD_SHA.slice(0, 12)));
  ok("doc staging only", /staging only|nonga-ce93c/i.test(docLower));
  ok("doc outside repo source", /outside repo|secure ops/i.test(docLower));
  ok("doc sheet name", /Car_Database_Template/.test(doc));
  ok("doc rowCountTotal 18", /\*\*18\*\*/.test(doc) && /rowCountTotal/.test(doc));
  ok(
    "doc selectedPilotCount 10",
    /selectedPilotCount.*\*\*10\*\*|selectedPilotCount.*10/i.test(doc)
  );
  ok(
    "doc recommendation FIX REQUIRED",
    /FIX REQUIRED/.test(doc) && /Recommendation/.test(doc)
  );
  ok("doc import not executed", /import.*not executed|ยังไม่ import/i.test(docLower));
  ok("doc no Firestore writes", /Firestore writes.*none|ไม่ Firestore writes/i.test(doc));
  ok(
    "doc plateFieldHandling exclude mask",
    /exclude.*mask|internal-only/i.test(docLower)
  );
  ok("doc imageLinksStatus pass", /imageLinksStatus.*pass/i.test(docLower));
  ok("doc uidMappingStatus fix", /uidMappingStatus.*fix required/i.test(docLower));
  ok("doc selling points fix", /selling points.*1|missing.*1/i.test(docLower));
  ok("doc pilot eligible 17", /\*\*17\*\*/.test(doc));
  ok("doc normalization plan", /Normalization Plan/i.test(doc));
  ok("doc import gate blocked", /Import Gate.*Blocked|still blocked/i.test(doc));
}

// --- required report fields ---
{
  ok("report rowCountTotal", /rowCountTotal/.test(doc));
  ok("report selectedPilotCount", /selectedPilotCount/.test(doc));
  ok("report requiredFieldsPass", /requiredFieldsPass|required fields/i.test(doc));
  ok("report plateFieldHandling", /plateFieldHandling/.test(doc));
  ok("report imageLinksStatus", /imageLinksStatus/.test(doc));
  ok("report uidMappingStatus", /uidMappingStatus/.test(doc));
  ok("report recommendation", /READY FOR IMPORT|FIX REQUIRED|NO-GO/.test(doc));
}

// --- guardrails ---
{
  ok("no import approval as executed", !/import executed.*yes/i.test(docLower));
  ok("no production", /production.*excluded|not touched/i.test(docLower));
  ok("no deploy env secrets", /Deploy.*none|Secret access.*not done/i.test(doc));
  ok(
    "no lead payment mutation",
    /Lead.*mutation.*none|lead\/reveal\/outcome/i.test(docLower)
  );
  ok("no public signup AI gemini", /public signup|public AI|real Gemini/i.test(doc));
  ok("no image processing runtime", /Image processing.*not run|AI vision.*not run/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2B\.13A/i.test(doc));
  ok("git slice readFileSync only", /readFileSync only/i.test(docLower));
  ok("import phrase referenced not granted execute", doc.includes(IMPORT_APPROVAL_PHRASE));
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
}

// --- cross-ref ---
{
  ok("v62b12 cleanup complete ref", /v6\.2B\.12|cleanup.*executed/i.test(v62b12Doc));
  ok("v62b6 GO record exists", /v6\.2B\.6|recommendation.*GO/i.test(v62b6Doc));
  ok("v62b1 template exists", /v6\.2B\.1|placeholder only/i.test(v62b1Doc));
}

// --- manifest still placeholder ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest placeholder only", meta?.placeholderOnly === true);
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
}

// --- package.json ---
{
  ok(
    "package v62b13a script",
    pkg.includes(
      "test:v62b13a-real-stock-package-validation-normalization-pre-import"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b13a-real-stock-package-validation-normalization-pre-import.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.13A Real Stock Package Validation / Normalization Pre-import tests."
);
if (process.exitCode) process.exit(process.exitCode);
