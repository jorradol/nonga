/**
 * v5.6I.24 — Final revenue monitoring guardrail checkpoint (static validation only)
 * npm run test:v56i24-final-revenue-monitoring-guardrail-checkpoint
 *
 * Validates execution record — does NOT fetch staging, call gcloud/firebase, or write Firestore.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.24-final-revenue-monitoring-guardrail-checkpoint.md";
const BASELINE_COMMIT = "e49032d184888db485d83bb976cb36f09136e38a";
const STAGING_PROJECT = "nonga-ce93c";
const STAGING_SERVICE = "nonga-staging";
const STAGING_REGION = "asia-southeast1";
const REV_CURRENT = "nonga-staging-00047-7xc";

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

const FORBIDDEN_PII_FIELDS = [
  "buyerPhone",
  "buyerEmail",
  "buyerName",
  "contactPhone",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.24 Final revenue monitoring guardrail checkpoint ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v56i24-final-revenue-monitoring-guardrail-checkpoint.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v5.6I.24 ---
{
  ok("guardrail checkpoint doc exists", doc.length > 1200);
  ok("doc v5.6I.24 label", doc.includes("v5.6I.24"));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc guardrail checkpoint", /guardrail checkpoint|monitoring.*guardrail/i.test(docLower));
  ok("doc read-only checks", /read-only|read only/i.test(docLower));
}

// --- preflight git @ e49032d ---
{
  ok("doc baseline e49032d full", doc.includes(BASELINE_COMMIT));
  ok("doc baseline e49032d short", doc.includes("e49032d"));
  ok("doc git clean origin", /git.*clean|HEAD.*origin|origin.*HEAD/i.test(docLower));
  ok("doc staging project", doc.includes(STAGING_PROJECT));
  ok("doc staging service", doc.includes(STAGING_SERVICE));
  ok("doc staging region", doc.includes(STAGING_REGION));
}

// --- revision 00047 traffic 100% flags firestore/true/true ---
{
  ok("doc revision 00047-7xc", doc.includes(REV_CURRENT));
  ok("doc traffic 100 percent", /100%|100 percent/i.test(doc));
  ok(
    "doc NONGA_SETTLEMENT_DATA_BACKEND=firestore",
    doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=firestore") ||
      /NONGA_SETTLEMENT_DATA_BACKEND` \| \*\*`firestore`\*\*/.test(doc)
  );
  ok(
    "doc NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true") ||
      /NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED` \| \*\*`true`\*\*/.test(doc)
  );
  ok(
    "doc NONGA_SUCCESS_FEE_RECORD_ENABLED=true",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=true") ||
      /NONGA_SUCCESS_FEE_RECORD_ENABLED` \| \*\*`true`\*\*/.test(doc)
  );
  ok("doc public signup false", /VITE_NONGA_PUBLIC_SIGNUP_ENABLED.*false|public signup.*false/i.test(docLower));
}

// --- API status 200/200/401/401 ---
{
  ok("doc health 200", /\/api\/health[\s\S]{0,120}200|health.*200/i.test(doc));
  ok("doc cars 200", /\/api\/cars[\s\S]{0,120}200|cars.*200/i.test(doc));
  ok("doc admin revenue 401", /admin\/revenue\/preview[\s\S]{0,120}401|401.*admin/i.test(doc));
  ok("doc seller revenue 401", /my\/revenue\/preview[\s\S]{0,120}401|401.*seller/i.test(doc));
}

// --- Firestore deny 403 all 4 collections ---
{
  for (const col of SETTLEMENT_COLLECTIONS) {
    ok(`doc client deny 403 ${col}`, doc.includes(col) && /403/.test(doc));
  }
  ok("doc client deny section", /client direct deny|Firestore client deny/i.test(docLower));
}

// --- counts 1/4/4/0 + match v5.6I.23 ---
{
  for (const col of SETTLEMENT_COLLECTIONS) {
    const count = DURABLE_COUNTS[col];
    ok(
      `doc count ${col}=${count}`,
      new RegExp(`${col}[\\s\\S]{0,80}\\*\\*${count}\\*\\*|${col}[\\s\\S]{0,80}\\| \\*\\*${count}\\*\\*`).test(doc)
    );
  }
  ok("doc counts match v56i23", /v5\.6I\.23|ตรง v5\.6I\.23|match v5\.6I\.23/i.test(doc));
  ok("doc no docs added removed", /ไม่มี docs เพิ่ม\/ลด|no docs added|counts.*ตรง/i.test(docLower));
}

// --- PII forbidden fields ---
{
  for (const field of FORBIDDEN_PII_FIELDS) {
    ok(`doc PII forbidden field ${field}`, doc.includes(field));
  }
  ok("doc PII safety pass", /PII safety.*PASS|PII safety[\s\S]{0,200}PASS/i.test(doc));
  ok("doc admin revenue no buyer PII", /admin revenue preview.*ไม่มี buyer PII|admin.*revenue.*PII/i.test(docLower));
  ok("doc seller revenue no buyer PII", /seller revenue preview.*ไม่มี buyer PII|seller.*revenue.*PII/i.test(docLower));
}

// --- rollback present but not run ---
{
  ok("doc rollback command present", /--update-env-vars="NONGA_SETTLEMENT_DATA_BACKEND=memory/.test(doc));
  ok("doc rollback NONGA_SETTLEMENT_DATA_BACKEND=memory", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=memory"));
  ok(
    "doc rollback NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false")
  );
  ok(
    "doc rollback NONGA_SUCCESS_FEE_RECORD_ENABLED=false",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=false")
  );
  ok("doc rollback not run", /ยังไม่รัน|not run|not executed|DO NOT RUN/i.test(doc));
}

// --- guardrail summary ---
{
  ok("doc guardrail summary section", /guardrail summary|ปิดหมวด/i.test(docLower));
  ok("doc auth gate pass", /401.*unauth|auth gate.*PASS/i.test(docLower));
}

// --- forbidden changes ---
{
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy/i.test(doc));
  ok("doc forbidden no gcloud run deploy", doc.includes("gcloud run deploy"));
  ok("doc forbidden no services update", doc.includes("gcloud run services update"));
  ok("doc forbidden no env change", /ไม่เปลี่ยน env|no env flags|ไม่ update env/i.test(docLower));
  ok("doc forbidden no secrets", /ไม่.*secrets|no secrets/i.test(docLower));
  ok("doc forbidden no firestore write delete edit", /ไม่เขียน Firestore|ลบ.*แก้ smoke|no firestore write/i.test(docLower));
  ok("doc forbidden no migration backfill", /migration|backfill/i.test(docLower));
  ok("doc forbidden no production", /ไม่แตะ production|no production/i.test(docLower));
  ok("doc forbidden no hosting rules", /Hosting|Firestore rules/i.test(doc));
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
  ok("package v56i24 script", pkg.includes("test:v56i24-final-revenue-monitoring-guardrail-checkpoint"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i24-final-revenue-monitoring-guardrail-checkpoint.mts")
  );
}

// --- cross-ref prior slices ---
{
  ok("references v56i23", doc.includes("v5.6I.23"));
  ok("references v56i19", doc.includes("v5.6I.19"));
  ok("references v56i20", doc.includes("v5.6I.20"));
}

console.log("\nDone v5.6I.24 final revenue monitoring guardrail checkpoint tests.");
