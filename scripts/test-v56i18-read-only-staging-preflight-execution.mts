/**
 * v5.6I.18 — Read-only staging preflight execution record (static validation only)
 * npm run test:v56i18-read-only-staging-preflight-execution
 *
 * Validates docs record from manual read-only preflight — does NOT call gcloud/firebase/deploy.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.18-read-only-staging-preflight-execution.md";
const BASELINE_COMMIT = "8fddd298a07390021c41e5636bba2a6079f79c1d";
const STAGING_PROJECT = "nonga-ce93c";
const STAGING_SERVICE = "nonga-staging";
const STAGING_REGION = "asia-southeast1";

const SETTLEMENT_COLLECTIONS = [
  "successFeeRecords",
  "settlementAdjustments",
  "settlementAuditLogs",
  "settlementIdempotencyRecords",
] as const;

const SETTLEMENT_FLAGS = [
  "NONGA_SETTLEMENT_DATA_BACKEND",
  "NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED",
  "NONGA_SUCCESS_FEE_RECORD_ENABLED",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.18 Read-only staging preflight execution record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v56i18-read-only-staging-preflight-execution.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v5.6I.18 ---
{
  ok("record doc exists", doc.length > 800);
  ok("doc v5.6I.18 label", doc.includes("v5.6I.18"));
  ok("doc read-only preflight", /read-only.*preflight|preflight execution/i.test(doc));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
}

// --- git baseline ---
{
  ok("doc baseline 8fddd29 full", doc.includes(BASELINE_COMMIT));
  ok("doc baseline 8fddd29 short", doc.includes("8fddd29"));
  ok("doc git clean", /git status.*clean|clean.*synced/i.test(docLower));
  ok("doc synced origin", /synced|ตรงกับ head|origin/i.test(docLower));
}

// --- cloud run staging target ---
{
  ok("doc staging project", doc.includes(STAGING_PROJECT));
  ok("doc staging service", doc.includes(STAGING_SERVICE));
  ok("doc staging region", doc.includes(STAGING_REGION));
  ok("doc gcloud describe read-only", doc.includes("gcloud run services describe"));
  ok("doc no services update in execution", !/services update[\s\S]{0,80}(executed|รันแล้ว|completed)/i.test(doc));
}

// --- settlement flags absent/off ---
{
  for (const flag of SETTLEMENT_FLAGS) {
    ok(`doc mentions flag ${flag}`, doc.includes(flag));
  }
  ok("doc flags absent on cloud run", /absent|ไม่มีบน cloud run/i.test(docLower));
  ok("doc default memory", /default.*memory|memory.*default/i.test(docLower));
  ok("doc writes off", /writes off|off.*writes/i.test(docLower));
  ok("doc durable inactive", /isDurableSettlementPersistenceActive.*false|false/i.test(doc));
}

// --- API status recorded ---
{
  ok("doc health 200", /\/api\/health[\s\S]*200|health.*200/i.test(doc));
  ok("doc cars 200", /\/api\/cars[\s\S]*200|cars.*200/i.test(doc));
  ok("doc admin revenue 401", /admin\/revenue\/preview[\s\S]*401|401.*admin/i.test(doc));
  ok("doc seller revenue 401", /my\/revenue\/preview[\s\S]*401|401.*seller/i.test(doc));
  ok("doc staging web app base", doc.includes("nonga-ce93c.web.app"));
}

// --- firestore deny 403 all collections ---
{
  for (const col of SETTLEMENT_COLLECTIONS) {
    ok(`doc collection ${col}`, doc.includes(col));
    ok(`doc ${col} deny 403`, new RegExp(`${col}[\\s\\S]{0,120}403`).test(doc));
  }
  ok("doc firestore unauth rest", /firestore.*unauth|unauth.*rest/i.test(docLower));
}

// --- forbidden changes section ---
{
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy|ไม่ได้ deploy/i.test(doc));
  ok("doc forbidden no gcloud run deploy", doc.includes("gcloud run deploy"));
  ok("doc forbidden no services update", doc.includes("gcloud run services update"));
  ok("doc forbidden no env flags", /ไม่เปิด env|no env flags/i.test(docLower));
  ok("doc forbidden no firestore write", /ไม่เขียน firestore|no firestore write/i.test(docLower));
  ok("doc forbidden no production", /ไม่แตะ production|no production/i.test(docLower));
  ok("doc forbidden no payment invoice gemini", docLower.includes("payment") && docLower.includes("invoice"));
}

// --- test script static only ---
{
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no firebase deploy", !/execSync\s*\(\s*[`'"]firebase deploy/.test(selfSrc));
  ok("script no fetch staging live", !/fetch\s*\(\s*[`'"]https:\/\/nonga-ce93c/.test(selfSrc));
  ok("script no shell gcloud invoke", !/(?:execSync|spawnSync|spawn)\s*\([^)]*gcloud/.test(selfSrc));
}

// --- package.json ---
{
  ok("package v56i18 script", pkg.includes("test:v56i18-read-only-staging-preflight-execution"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i18-read-only-staging-preflight-execution.mts")
  );
}

// --- cross-ref prior slices ---
{
  ok("references v56i17", doc.includes("v5.6I.17"));
  ok("references v56i16 or next step", doc.includes("v5.6I.16") || doc.includes("DO NOT RUN YET"));
}

console.log("\nDone v5.6I.18 read-only staging preflight execution record tests.");
