/**
 * v6.2B.13 — Controlled Real Stock Import Execution Record (static validation only)
 * npm run test:v62b13-controlled-real-stock-import-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.13-controlled-real-stock-import-execution-record.md";
const V62B13B_DOC =
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

const HEAD_SHA = "5c1f208a9bce6ae7b20f480d75c30d24a8c2d6d2";
const IMPORT_APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2B.13 Controlled Real Stock Import Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b13-controlled-real-stock-import-execution-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b13bDoc = readFileSync(V62B13B_DOC, "utf8");
const v62b13aDoc = readFileSync(V62B13A_DOC, "utf8");
const v62b12Doc = readFileSync(V62B12_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in Repo[\s\S]*?## 10\./,
  ""
);

// --- doc exists + v6.2B.13 ---
{
  ok("execution record doc exists", doc.length > 7000);
  ok("doc v6.2B.13 label", doc.includes("v6.2B.13"));
  ok(
    "doc import execution record",
    /Controlled Real Stock Import Execution Record/i.test(doc)
  );
  ok("doc baseline HEAD", doc.includes(HEAD_SHA.slice(0, 12)));
  ok("doc references v62b13b", /v6\.2B\.13B/i.test(doc));
  ok("doc references v62b13a", /v6\.2B\.13A/i.test(doc));
  ok("doc import executed", /import.*executed|executed.*10/i.test(docLower));
  ok("doc staging only", /staging only|nonga-ce93c/i.test(docLower));
  ok("doc imported count 10", /importedCount.*\*\*10\*\*|imported count.*10/i.test(doc));
  ok("doc published 10", /published.*\*\*10\*\*/i.test(doc));
  ok("doc pre-import count 0", /marketplace.*\*\*0\*\*|count=0/i.test(doc));
  ok("doc hidden 27 unchanged", /\*\*27\*\*/.test(doc));
  ok("doc hidden cohort 17 ref", /\*\*17\*\*|prior.*17/i.test(doc));
  ok("doc pilotBatchId label", /v62b-real-pilot-001/.test(doc));
  ok("doc public plate zero", /licensePlate.*\*\*0\*\*|public licensePlate.*0/i.test(doc));
  ok("doc wholesale excluded", /wholesale.*\*\*0\*\*|wholesale.*excluded/i.test(docLower));
  ok("doc hard delete none", /hard delete.*none|hardDeleteCount.*0/i.test(docLower));
  ok("doc api cars 10", /api\/cars.*\*\*10\*\*|count=10/i.test(doc));
  ok("doc import approval granted", /import approval.*granted|granted/i.test(docLower));
  ok("doc manifest outside repo", /outside repo|secure ops/i.test(docLower));
}

// --- import approval ---
{
  ok("import approval phrase", doc.includes(IMPORT_APPROVAL_PHRASE));
  ok("import complete status", /complete.*10|importedCount.*10/i.test(docLower));
}

// --- guardrails ---
{
  ok("no production", /production.*excluded|not touched/i.test(docLower));
  ok("no deploy env secrets", /Deploy.*none|Secret access.*not done/i.test(doc));
  ok(
    "no lead payment mutation",
    /Lead.*mutation.*none|lead\/reveal\/outcome.*unchanged|unchanged.*0/i.test(docLower)
  );
  ok("no public signup AI gemini", /public signup|public AI|real Gemini/i.test(doc));
  ok("no image processing runtime", /Image processing.*not invoked|AI vision.*not invoked/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2B\.13/i.test(doc));
  ok("git slice readFileSync only", /readFileSync only/i.test(docLower));
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
  ok("v62b13b ready for import", /READY FOR IMPORT/.test(v62b13bDoc));
  ok("v62b13a exists", /v6\.2B\.13A/i.test(v62b13aDoc));
  ok("v62b12 cleanup done", /hiddenCount.*17|cleanup.*executed/i.test(v62b12Doc));
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
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok(
    "script no firestore write in test",
    !/dealerListings.*PATCH|\.set\s*\(/.test(selfCode)
  );
}

// --- package.json ---
{
  ok(
    "package v62b13 script",
    pkg.includes(
      "test:v62b13-controlled-real-stock-import-execution-record"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b13-controlled-real-stock-import-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.2B.13 Controlled Real Stock Import Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
