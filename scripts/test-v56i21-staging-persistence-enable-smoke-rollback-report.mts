/**
 * v5.6I.21 — Staging persistence enable + smoke + rollback report (static validation only)
 * npm run test:v56i21-staging-persistence-enable-smoke-rollback-report
 *
 * Validates execution record — does NOT fetch staging, call gcloud/firebase, or write Firestore.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.21-staging-persistence-enable-smoke-rollback-report.md";
const BASELINE_COMMIT = "a8b08bc6b1b4615d3ae70d0d1a1c14776da16acf";
const STAGING_PROJECT = "nonga-ce93c";
const STAGING_SERVICE = "nonga-staging";
const STAGING_REGION = "asia-southeast1";

const REVISIONS = {
  before: "nonga-staging-00042-wv8",
  badEnv: "nonga-staging-00043-t5h",
  enabled: "nonga-staging-00044-x7j",
  rollback: "nonga-staging-00045-78f",
} as const;

const SETTLEMENT_COLLECTIONS = [
  "successFeeRecords",
  "settlementAdjustments",
  "settlementAuditLogs",
  "settlementIdempotencyRecords",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.21 Staging persistence enable smoke rollback report ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v56i21-staging-persistence-enable-smoke-rollback-report.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v5.6I.21 ---
{
  ok("execution report doc exists", doc.length > 1200);
  ok("doc v5.6I.21 label", doc.includes("v5.6I.21"));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc smoke rollback report", /smoke.*rollback|rollback.*smoke/i.test(docLower));
}

// --- preflight passed ---
{
  ok("doc baseline a8b08bc full", doc.includes(BASELINE_COMMIT));
  ok("doc baseline a8b08bc short", doc.includes("a8b08bc"));
  ok("doc git clean synced", /git.*clean|clean.*synced|synced.*a8b08bc/i.test(docLower));
  ok("doc staging project", doc.includes(STAGING_PROJECT));
  ok("doc staging service", doc.includes(STAGING_SERVICE));
  ok("doc staging region", doc.includes(STAGING_REGION));
  ok("doc preflight passed", /preflight.*pass|preflight passed/i.test(docLower));
}

// --- before enable flags absent/off ---
{
  ok("doc revision before 00042", doc.includes(REVISIONS.before));
  ok("doc flags absent before enable", /absent|off.*before|ก่อนเปิด/i.test(docLower));
  ok("doc default memory before", /default.*memory|memory.*default/i.test(docLower));
}

// --- revisions 00043/00044/00045 ---
{
  ok("doc revision 00043 bad env", doc.includes(REVISIONS.badEnv));
  ok("doc revision 00044 enabled", doc.includes(REVISIONS.enabled));
  ok("doc revision 00045 rollback", doc.includes(REVISIONS.rollback));
}

// --- PowerShell quoted env lesson ---
{
  ok("doc powershell comma quoting", /powershell.*comma|comma.*quoting|powershell comma quoting/i.test(docLower));
  ok("doc env merge mistake", /env.*merge|merge.*ค่าเดียว|merge เป็นค่าเดียว/i.test(docLower));
  ok("doc quoted update-env-vars", /--update-env-vars="/.test(doc));
  ok("doc powershell lesson section", /quoted env|powerShell lesson/i.test(doc));
}

// --- enable flags on 00044 ---
{
  ok("doc enable NONGA_SETTLEMENT_DATA_BACKEND=firestore", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=firestore"));
  ok(
    "doc enable NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true")
  );
  ok(
    "doc enable NONGA_SUCCESS_FEE_RECORD_ENABLED=true",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=true")
  );
  ok("doc health after enable 200", /health.*enable[\s\S]{0,200}200|หลัง enable[\s\S]{0,200}200/i.test(doc));
}

// --- smoke pass items ---
{
  ok("doc smoke pass health", /S1.*health|health.*pass/i.test(docLower));
  ok("doc smoke pass admin preview", /admin revenue preview.*pass|S2.*admin/i.test(docLower));
  ok("doc smoke pass seller preview", /seller revenue preview|S3.*seller/i.test(docLower));
  ok("doc smoke pass manual adjustment", /manual adjustment|S4/i.test(docLower));
  ok("doc smoke pass seller scope", /seller scope|S7/i.test(docLower));
  for (const col of SETTLEMENT_COLLECTIONS) {
    ok(`doc smoke firestore deny ${col}`, doc.includes(col) && /403/.test(doc));
  }
  ok("doc smoke pass PII safety", /PII safety|S12/i.test(docLower));
}

// --- smoke fail items ---
{
  ok("doc smoke fail duplicate requestId", /duplicate.*requestId|S5.*fail|fail.*duplicate/i.test(docLower));
  ok("doc smoke fail conflict 409", /conflict.*409|S6.*409|409.*conflict/i.test(docLower));
  ok("doc smoke fail durable writes 0 docs", /0 docs|durable.*firestore.*0|firestore writes.*0/i.test(docLower));
}

// --- partial expected ---
{
  ok("doc buyer lead 401 expected", /buyer lead.*401|401.*buyer|S13/i.test(docLower));
  ok("doc core E2E partial", /partial.*E2E|E2E.*partial|S14.*S16/i.test(docLower));
}

// --- rollback memory/false/false ---
{
  ok("doc rollback section", /rollback/i.test(docLower));
  ok("doc rollback NONGA_SETTLEMENT_DATA_BACKEND=memory", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=memory"));
  ok(
    "doc rollback NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false")
  );
  ok(
    "doc rollback NONGA_SUCCESS_FEE_RECORD_ENABLED=false",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=false")
  );
  ok("doc health after rollback 200", /health.*rollback[\s\S]{0,200}200|หลัง rollback[\s\S]{0,200}200/i.test(doc));
}

// --- root cause + next step ---
{
  ok("doc root cause v56i13", /v5\.6I\.13|durable.*firestore.*wiring/i.test(doc));
  ok("doc in-memory per-instance", /in-memory|in-memory per-instance/i.test(docLower));
  ok("doc next deploy before re-enable", /deploy.*before|ก่อน.*เปิด flags|deploy Cloud Run staging image/i.test(docLower));
  ok("doc DO NOT RE-ENABLE", /DO NOT RE-ENABLE|do not re-enable/i.test(doc));
}

// --- forbidden changes ---
{
  ok("doc forbidden no deploy in slice", /ไม่ deploy|no deploy/i.test(doc));
  ok("doc forbidden no gcloud run deploy", doc.includes("gcloud run deploy"));
  ok("doc forbidden no services update in slice", doc.includes("gcloud run services update"));
  ok("doc forbidden no env re-enable", /ไม่เปิด env|no env flags/i.test(docLower));
  ok("doc forbidden no persistence re-enable", /ไม่เปิด.*persistence|persistence อีก/i.test(docLower));
  ok("doc forbidden no firestore write", /ไม่เขียน firestore|no firestore write/i.test(docLower));
  ok("doc forbidden no production", /ไม่แตะ production|no production/i.test(docLower));
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
  ok("package v56i21 script", pkg.includes("test:v56i21-staging-persistence-enable-smoke-rollback-report"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i21-staging-persistence-enable-smoke-rollback-report.mts")
  );
}

// --- cross-ref prior slices ---
{
  ok("references v56i20", doc.includes("v5.6I.20"));
  ok("references v56i19", doc.includes("v5.6I.19"));
}

console.log("\nDone v5.6I.21 staging persistence enable smoke rollback report tests.");
