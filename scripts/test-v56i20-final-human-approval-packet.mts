/**
 * v5.6I.20 — Final human approval packet (static/offline validation only)
 * npm run test:v56i20-final-human-approval-packet
 *
 * Does NOT fetch staging, call gcloud/firebase, or write Firestore.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.20-final-human-approval-packet.md";
const MIN_GIT_BASELINE = "99ac07a858a80ffe9357a89c048e59e2701f5f42";
const STAGING_PROJECT = "nonga-ce93c";
const STAGING_SERVICE = "nonga-staging";
const STAGING_REGION = "asia-southeast1";

const EXPLICIT_APPROVAL_PHRASE =
  "อนุมัติให้เปิด Firestore settlement persistence บน staging เท่านั้น ตาม v5.6I.20";

const TRIPLE_FLAGS = [
  "NONGA_SETTLEMENT_DATA_BACKEND=firestore",
  "NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true",
  "NONGA_SUCCESS_FEE_RECORD_ENABLED=true",
] as const;

const ROLLBACK_FLAGS = [
  "NONGA_SETTLEMENT_DATA_BACKEND=memory",
  "NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false",
  "NONGA_SUCCESS_FEE_RECORD_ENABLED=false",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.20 Final human approval packet (static only) ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v56i20-final-human-approval-packet.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v5.6I.20 ---
{
  ok("approval packet doc exists", doc.length > 1000);
  ok("doc v5.6I.20 label", doc.includes("v5.6I.20"));
  ok("doc human approval packet", /human approval packet|approval packet/i.test(doc));
}

// --- not enabled yet ---
{
  ok("doc still not enabled", /ยังไม่เปิดจริง|ยังไม่เปิด env|not.*enable/i.test(docLower));
  ok("doc not actual enablement", /ยังไม่ใช่การเปิดจริง|does not enable|ไม่เปลี่ยน runtime/i.test(docLower));
  ok("doc DO NOT RUN YET", doc.includes("DO NOT RUN YET"));
}

// --- current state memory/off/off ---
{
  ok("doc current memory backend", /memory.*default|default.*memory|ตอนนี้.*memory/i.test(docLower));
  ok("doc current writes off", /writes.*off|off.*writes|firestore writes.*off/i.test(docLower));
  ok("doc current success fee off", /success fee.*off|off.*success fee/i.test(docLower));
}

// --- staging only ---
{
  ok("doc staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("doc staging only", /staging.*เท่านั้น|staging only|staging \*\*`nonga-ce93c`\*\* เท่านั้น/i.test(doc));
  ok("doc cloud run service", doc.includes(STAGING_SERVICE));
  ok("doc cloud run region", doc.includes(STAGING_REGION));
}

// --- production block ---
{
  ok("doc production block", /production block|ห้าม.*production|production project/i.test(docLower));
  ok("doc production not touched", /ไม่แตะ production|production.*ไม่แตะ/i.test(docLower));
  ok("doc stop if wrong project", /STOP|≠.*nonga-ce93c/i.test(doc));
}

// --- triple flags enablement ---
{
  for (const flag of TRIPLE_FLAGS) {
    ok(`doc enablement flag ${flag}`, doc.includes(flag));
  }
}

// --- main risks ---
{
  ok("doc main risks section", /ความเสี่ยงหลัก|main risk/i.test(docLower));
  ok("doc risk idempotency", /idempotency|requestId/i.test(docLower));
  ok("doc risk PII", /PII|privacy/i.test(docLower));
}

// --- rollback plan ---
{
  ok("doc rollback plan section", /rollback plan/i.test(docLower));
  ok("doc rollback when smoke fail", /ใช้เมื่อ smoke fail|smoke fail/i.test(docLower));
  for (const flag of ROLLBACK_FLAGS) {
    ok(`doc rollback flag ${flag}`, doc.includes(flag));
  }
  ok("doc rollback gcloud example", doc.includes("gcloud run services update"));
}

// --- smoke checklist reference v5.6I.19 ---
{
  ok("doc references v5.6I.19", doc.includes("v5.6I.19"));
  ok("doc smoke checklist section", /smoke checklist/i.test(docLower));
  ok("doc smoke S1 health", /S1.*health|GET \/api\/health/i.test(doc));
  ok("doc smoke idempotency", /duplicate.*requestId|S5|S6/i.test(doc));
  ok("doc test v56i19 command", pkg.includes("test:v56i19-staging-persistence-smoke-harness"));
}

// --- pass/fail criteria ---
{
  ok("doc pass fail criteria", /เกณฑ์ผ่าน|pass.*fail|ไม่ผ่าน/i.test(docLower));
  ok("doc pass criteria smoke", /S1.*S16|S1–S16/i.test(doc));
  ok("doc fail rollback", /rollback.*ทันที|ต้อง rollback/i.test(doc));
}

// --- explicit approval phrase ---
{
  ok("doc explicit approval phrase", doc.includes(EXPLICIT_APPROVAL_PHRASE));
  ok("doc approval before enablement", /ห้ามรัน.*enablement|ops.*ห้าม/i.test(docLower));
}

// --- forbidden changes ---
{
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy/i.test(doc));
  ok("doc forbidden gcloud run deploy", doc.includes("gcloud run deploy"));
  ok("doc forbidden no env flags", /ไม่เปิด env|no env flags/i.test(docLower));
  ok("doc forbidden no firestore write", /ไม่เขียน firestore|no firestore write/i.test(docLower));
  ok("doc forbidden payment invoice gemini", docLower.includes("payment") && docLower.includes("invoice"));
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
  ok("package v56i20 script", pkg.includes("test:v56i20-final-human-approval-packet"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i20-final-human-approval-packet.mts")
  );
}

// --- cross-ref prior slices ---
{
  ok("references v56i19", doc.includes("v5.6I.19"));
  ok("references v56i18", doc.includes("v5.6I.18"));
  ok("references v56i17", doc.includes("v5.6I.17"));
  ok("doc baseline 99ac07a", doc.includes(MIN_GIT_BASELINE) || doc.includes("99ac07a"));
}

console.log("\nDone v5.6I.20 final human approval packet static tests.");
