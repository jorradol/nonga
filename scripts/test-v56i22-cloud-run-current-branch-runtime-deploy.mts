/**
 * v5.6I.22 — Cloud Run current branch runtime deploy record (static validation only)
 * npm run test:v56i22-cloud-run-current-branch-runtime-deploy
 *
 * Validates execution record — does NOT fetch staging, call gcloud/firebase, or write Firestore.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.22-cloud-run-current-branch-runtime-deploy.md";
const BASELINE_COMMIT = "cebc7a607cae5fcdd22fd6807bee03e77d5aa4f3";
const STAGING_PROJECT = "nonga-ce93c";
const STAGING_SERVICE = "nonga-staging";
const STAGING_REGION = "asia-southeast1";
const CLOUD_BUILD_ID = "0d07e080-5a31-4b62-af58-5fac248730ba";
const IMAGE_TAG = "v5.6I.22-current-branch-runtime-cebc7a6";
const IMAGE_DIGEST =
  "sha256:30cd341c3320aaad428c935816064351f5d0e5a3bf61cf3aedf7f2cf8d015e03";
const REV_BEFORE = "nonga-staging-00045-78f";
const REV_AFTER = "nonga-staging-00046-rh7";
const IMAGE_BEFORE = "v5.6I.4-manual-settlement-adjustments-8bf49fd";

const SETTLEMENT_COLLECTIONS = [
  "settlementAdjustments",
  "settlementAuditLogs",
  "settlementIdempotencyRecords",
  "successFeeRecords",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.22 Cloud Run current branch runtime deploy record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v56i22-cloud-run-current-branch-runtime-deploy.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v5.6I.22 ---
{
  ok("deploy record doc exists", doc.length > 1200);
  ok("doc v5.6I.22 label", doc.includes("v5.6I.22"));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc cloud run deploy", /cloud run.*deploy|deploy.*cloud run/i.test(docLower));
}

// --- preflight git @ cebc7a6 ---
{
  ok("doc baseline cebc7a6 full", doc.includes(BASELINE_COMMIT));
  ok("doc baseline cebc7a6 short", doc.includes("cebc7a6"));
  ok("doc git clean origin", /git.*clean|HEAD.*origin|origin.*HEAD/i.test(docLower));
  ok("doc staging project", doc.includes(STAGING_PROJECT));
  ok("doc staging service", doc.includes(STAGING_SERVICE));
  ok("doc staging region", doc.includes(STAGING_REGION));
}

// --- before deploy rev 00045 + old image ---
{
  ok("doc revision before 00045", doc.includes(REV_BEFORE));
  ok("doc image before v56i4", doc.includes(IMAGE_BEFORE));
  ok("doc flags before memory false", /00045[\s\S]{0,400}memory[\s\S]{0,200}false/i.test(doc));
}

// --- tests/build passed ---
{
  ok("doc test v56i21", doc.includes("test:v56i21"));
  ok("doc test v56i13", doc.includes("test:v56i13"));
  ok("doc lint", doc.includes("npm run lint"));
  ok("doc build staging hosting", doc.includes("build:staging:hosting"));
}

// --- cloud build + image tag/digest ---
{
  ok("doc cloud build id", doc.includes(CLOUD_BUILD_ID));
  ok("doc image tag v56i22", doc.includes(IMAGE_TAG));
  ok("doc image digest sha256", doc.includes(IMAGE_DIGEST));
  ok("doc cloudbuild v53f config", doc.includes("cloudbuild.v53f.yaml"));
}

// --- revision 00046-rh7 traffic 100% ---
{
  ok("doc revision 00046-rh7", doc.includes(REV_AFTER));
  ok("doc traffic 100 percent", /100%|100 percent/i.test(doc));
}

// --- health/API smoke ---
{
  ok("doc health 200", /\/api\/health[\s\S]{0,120}200|health.*200/i.test(doc));
  ok("doc cars 200", /\/api\/cars[\s\S]{0,120}200|cars.*200/i.test(doc));
  ok("doc admin revenue 401", /admin\/revenue\/preview[\s\S]{0,120}401|401.*admin/i.test(doc));
  ok("doc seller revenue 401", /my\/revenue\/preview[\s\S]{0,120}401|401.*seller/i.test(doc));
}

// --- settlement flags memory/false/false after deploy ---
{
  ok("doc after NONGA_SETTLEMENT_DATA_BACKEND=memory", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=memory") || /NONGA_SETTLEMENT_DATA_BACKEND` \| \*\*`memory`\*\*/.test(doc));
  ok(
    "doc after NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false") ||
      /NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED` \| \*\*`false`\*\*/.test(doc)
  );
  ok(
    "doc after NONGA_SUCCESS_FEE_RECORD_ENABLED=false",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=false") ||
      /NONGA_SUCCESS_FEE_RECORD_ENABLED` \| \*\*`false`\*\*/.test(doc)
  );
  ok("doc settlement still off", /settlement.*ยังปิด|persistence.*ยังปิด|still.*off/i.test(docLower));
}

// --- collection counts 0 ---
{
  for (const col of SETTLEMENT_COLLECTIONS) {
    ok(`doc collection ${col} zero docs`, new RegExp(`${col}[\\s\\S]{0,80}0`).test(doc));
  }
  ok("doc zero docs summary", /0 docs|doc count.*0/i.test(docLower));
}

// --- next step re-enable + smoke ---
{
  ok("doc next step re-enable quoted env", /quoted env|re-enable.*flags/i.test(docLower));
  ok("doc next step smoke v56i19", doc.includes("v5.6I.19"));
  ok("doc next step revision 00046", doc.includes(REV_AFTER));
  ok("doc DO NOT RE-DEPLOY", /DO NOT RE-DEPLOY|do not re-deploy/i.test(doc));
}

// --- forbidden changes ---
{
  ok("doc no hosting deploy", /ไม่ Hosting deploy|no Hosting deploy|ไม่ hosting deploy/i.test(doc));
  ok("doc no rules deploy", /ไม่ Firestore rules|no Firestore rules|rules deploy/i.test(docLower));
  ok("doc no persistence enablement", /ไม่ persistence enablement|no persistence enablement|persistence enablement/i.test(docLower));
  ok("doc no production", /ไม่แตะ production|no production/i.test(docLower));
  ok("doc no firestore write", /ไม่เขียน Firestore|no firestore write/i.test(docLower));
  ok("doc no migration backfill", /migration|backfill/i.test(docLower));
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
  ok("package v56i22 script", pkg.includes("test:v56i22-cloud-run-current-branch-runtime-deploy"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i22-cloud-run-current-branch-runtime-deploy.mts")
  );
}

// --- cross-ref prior slices ---
{
  ok("references v56i21", doc.includes("v5.6I.21"));
  ok("references v56i13", doc.includes("v5.6I.13"));
  ok("references v56i19", doc.includes("v5.6I.19"));
}

console.log("\nDone v5.6I.22 Cloud Run current branch runtime deploy record tests.");
