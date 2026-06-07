/**
 * v5.6I.23 — Staging persistence re-enable success record (static validation only)
 * npm run test:v56i23-staging-persistence-reenable-success
 *
 * Validates execution record — does NOT fetch staging, call gcloud/firebase, or write Firestore.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.23-staging-persistence-reenable-success.md";
const BASELINE_COMMIT = "e088e40fffe61921d7b8d232257f5f1634fff5d7";
const STAGING_PROJECT = "nonga-ce93c";
const STAGING_SERVICE = "nonga-staging";
const STAGING_REGION = "asia-southeast1";
const REV_BEFORE = "nonga-staging-00046-rh7";
const REV_AFTER = "nonga-staging-00047-7xc";
const IMAGE_TAG = "v5.6I.22-current-branch-runtime-cebc7a6";

const SETTLEMENT_COLLECTIONS = [
  "successFeeRecords",
  "settlementAdjustments",
  "settlementAuditLogs",
  "settlementIdempotencyRecords",
] as const;

const DURABLE_COUNTS: Record<(typeof SETTLEMENT_COLLECTIONS)[number], number> = {
  settlementAdjustments: 1,
  settlementAuditLogs: 4,
  settlementIdempotencyRecords: 4,
  successFeeRecords: 0,
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.23 Staging persistence re-enable success record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v56i23-staging-persistence-reenable-success.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v5.6I.23 ---
{
  ok("execution record doc exists", doc.length > 1200);
  ok("doc v5.6I.23 label", doc.includes("v5.6I.23"));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc re-enable success", /re-enable.*success|reenable.*success|สำเร็จ/i.test(docLower));
}

// --- preflight git @ e088e40 ---
{
  ok("doc baseline e088e40 full", doc.includes(BASELINE_COMMIT));
  ok("doc baseline e088e40 short", doc.includes("e088e40"));
  ok("doc git clean origin", /git.*clean|HEAD.*origin|origin.*HEAD/i.test(docLower));
  ok("doc staging project", doc.includes(STAGING_PROJECT));
  ok("doc staging service", doc.includes(STAGING_SERVICE));
  ok("doc staging region", doc.includes(STAGING_REGION));
  ok("doc preflight passed", /preflight.*pass|preflight passed/i.test(docLower));
}

// --- before enable rev 00046 + image + flags memory/false/false ---
{
  ok("doc revision before 00046", doc.includes(REV_BEFORE));
  ok("doc image v56i22", doc.includes(IMAGE_TAG));
  ok("doc flags before memory", /00046[\s\S]{0,500}memory[\s\S]{0,300}false/i.test(doc));
  ok("doc before NONGA_SETTLEMENT_DATA_BACKEND=memory", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=memory") || /NONGA_SETTLEMENT_DATA_BACKEND` \| \*\*`memory`\*\*/.test(doc));
  ok(
    "doc before NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false") ||
      /NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED` \| \*\*`false`\*\*/.test(doc)
  );
  ok(
    "doc before NONGA_SUCCESS_FEE_RECORD_ENABLED=false",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=false") ||
      /NONGA_SUCCESS_FEE_RECORD_ENABLED` \| \*\*`false`\*\*/.test(doc)
  );
}

// --- quoted enable command ---
{
  ok("doc quoted update-env-vars", /--update-env-vars="/.test(doc));
  ok("doc enable NONGA_SETTLEMENT_DATA_BACKEND=firestore", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=firestore"));
  ok(
    "doc enable NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true")
  );
  ok(
    "doc enable NONGA_SUCCESS_FEE_RECORD_ENABLED=true",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=true")
  );
}

// --- after enable rev 00047 traffic 100% flags firestore/true/true ---
{
  ok("doc revision after 00047", doc.includes(REV_AFTER));
  ok("doc traffic 100 percent", /100%|100 percent/i.test(doc));
  ok("doc after NONGA_SETTLEMENT_DATA_BACKEND=firestore", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=firestore"));
  ok(
    "doc after NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true")
  );
  ok(
    "doc after NONGA_SUCCESS_FEE_RECORD_ENABLED=true",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=true")
  );
}

// --- health 200 ---
{
  ok("doc health 200 ok", /\/api\/health[\s\S]{0,120}200|health.*200|ok: true/i.test(doc));
}

// --- smoke pass 23/23 ---
{
  ok("doc smoke pass 23/23", /23\/23|PASS 23/i.test(doc));
  ok("doc smoke pass health S1", /S1.*health|health.*200/i.test(docLower));
  ok("doc smoke pass admin preview S2", /S2.*admin|admin revenue preview.*200/i.test(docLower));
  ok("doc smoke pass seller preview S3", /S3.*seller|seller revenue preview.*200/i.test(docLower));
  ok("doc smoke pass manual adjustment S4", /S4.*adjustment|manual adjustment.*200/i.test(docLower));
  ok("doc smoke pass seller scope S7", /S7.*seller scope|seller scope/i.test(docLower));
}

// --- S5 duplicate outcome duplicate ---
{
  ok("doc S5 duplicate requestId", /S5.*duplicate|duplicate.*requestId/i.test(docLower));
  ok("doc S5 outcome duplicate", /outcome.*duplicate|duplicate.*outcome/i.test(docLower));
  ok("doc S5 no duplicate audit idempotency", /ไม่สร้าง.*audit|audit.*idempotency.*ซ้ำ|no duplicate/i.test(docLower));
}

// --- S6 conflict 409 ---
{
  ok("doc S6 conflict fingerprint", /S6.*conflict|conflict fingerprint/i.test(docLower));
  ok("doc S6 status 409", /409/.test(doc) && /S6|conflict/i.test(doc));
}

// --- Firestore durable docs count 1/4/4/0 ---
{
  for (const col of SETTLEMENT_COLLECTIONS) {
    const count = DURABLE_COUNTS[col];
    ok(
      `doc durable count ${col}=${count}`,
      new RegExp(`${col}[\\s\\S]{0,80}\\*\\*${count}\\*\\*|${col}[\\s\\S]{0,80}\\| \\*\\*${count}\\*\\*`).test(doc)
    );
  }
  ok("doc successFeeRecords zero reason", /successFeeRecords[\s\S]{0,120}0[\s\S]{0,120}success-fee event/i.test(doc));
}

// --- client deny 403 all 4 collections ---
{
  for (const col of SETTLEMENT_COLLECTIONS) {
    ok(`doc client deny 403 ${col}`, doc.includes(col) && /403/.test(doc));
  }
  ok("doc client deny section", /client direct deny|Firestore client deny/i.test(docLower));
}

// --- PII safety ---
{
  ok("doc PII safety S12", /PII safety|S12/i.test(docLower));
  ok("doc no buyer phone", /ไม่มี.*buyer phone|no buyer phone/i.test(docLower));
}

// --- buyer lead 401 expected ---
{
  ok("doc buyer lead 401 expected", /buyer lead.*401|401.*expected|S13.*401/i.test(docLower));
}

// --- no rollback + standby rollback command ---
{
  ok("doc no rollback executed", /ไม่มี rollback|no rollback/i.test(docLower));
  ok("doc rollback standby not run", /rollback command สำรอง|standby|ยังไม่รัน|DO NOT RUN/i.test(doc));
  ok("doc rollback NONGA_SETTLEMENT_DATA_BACKEND=memory", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=memory"));
  ok(
    "doc rollback NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false")
  );
  ok(
    "doc rollback NONGA_SUCCESS_FEE_RECORD_ENABLED=false",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=false")
  );
}

// --- comparison v5.6I.21 ---
{
  ok("doc compares v56i21", doc.includes("v5.6I.21"));
  ok("doc v56i21 fail vs v56i23 pass", /v5\.6I\.21[\s\S]{0,800}FAIL[\s\S]{0,800}PASS/i.test(doc));
}

// --- forbidden changes ---
{
  ok("doc forbidden no deploy in slice", /ไม่ deploy|no deploy/i.test(doc));
  ok("doc forbidden no gcloud run deploy", doc.includes("gcloud run deploy"));
  ok("doc forbidden no services update in slice", doc.includes("gcloud run services update"));
  ok("doc forbidden no env change in slice", /ไม่เปิด env flags อีก|no env flags|ไม่ update env/i.test(docLower));
  ok("doc forbidden no secrets", /ไม่แก้ secrets|no secrets/i.test(docLower));
  ok("doc forbidden no migration backfill", /migration|backfill/i.test(docLower));
  ok("doc forbidden no delete smoke records", /ไม่ลบ.*Firestore|no delete.*firestore/i.test(docLower));
  ok("doc forbidden no production", /ไม่แตะ production|no production/i.test(docLower));
  ok("doc forbidden no hosting rules", /Hosting|Firestore rules/i.test(doc));
  ok("doc forbidden no image deploy", /image deploy|gcloud run deploy/i.test(docLower));
  ok("doc forbidden payment invoice gemini", docLower.includes("payment") && docLower.includes("invoice"));
  ok("doc forbidden no runtime code change", /ไม่แก้ runtime|runtime code/i.test(docLower));
}

// --- test script static only ---
{
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no firebase deploy", !/execSync\s*\(\s*[`'"]firebase deploy/.test(selfSrc));
  ok("script no fetch staging", !/fetch\s*\(\s*[`'"]https:\/\/nonga-ce93c/.test(selfSrc));
  ok("script no shell gcloud invoke", !/(?:execSync|spawnSync|spawn)\s*\([^)]*gcloud/.test(selfSrc));
  ok("script no firebase app import", !/from\s+["']firebase\/app["']/.test(selfSrc));
  ok("script no firestore import", !/from\s+["']firebase\/firestore["']/.test(selfSrc));
}

// --- package.json ---
{
  ok("package v56i23 script", pkg.includes("test:v56i23-staging-persistence-reenable-success"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i23-staging-persistence-reenable-success.mts")
  );
}

// --- cross-ref prior slices ---
{
  ok("references v56i22", doc.includes("v5.6I.22"));
  ok("references v56i21", doc.includes("v5.6I.21"));
  ok("references v56i19", doc.includes("v5.6I.19"));
  ok("references v56i20", doc.includes("v5.6I.20"));
}

console.log("\nDone v5.6I.23 staging persistence re-enable success record tests.");
