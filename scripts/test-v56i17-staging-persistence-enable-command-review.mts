/**
 * v5.6I.17 — Staging persistence enablement command review (no gcloud/deploy execution)
 * npm run test:v56i17-staging-persistence-enable-command-review
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v5.6I.17-staging-persistence-enable-command-review.md";
const MIN_GIT_BASELINE = "3b4c5690f97a6141e8d0ebf0616858d5076c3ce9";
const STAGING_PROJECT = "nonga-ce93c";
const STAGING_SERVICE = "nonga-staging";
const STAGING_REGION = "asia-southeast1";

/** Production-like project IDs that must NOT appear as enablement targets in the doc. */
const FORBIDDEN_PRODUCTION_PROJECT_IDS = [
  "nonga-real",
  "nonga-prod",
  "nonga-production",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function gitHeadAtOrAfterBaseline(baseline: string): boolean {
  try {
    const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    if (head === baseline) return true;
    execSync(`git merge-base --is-ancestor ${baseline} HEAD`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("=== v5.6I.17 Staging persistence enable command review ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v56i17-staging-persistence-enable-command-review.mts",
  "utf8"
);

// --- git baseline ---
{
  ok("git head at or after 3b4c569", gitHeadAtOrAfterBaseline(MIN_GIT_BASELINE));
  ok("doc baseline 3b4c569", doc.includes("3b4c569"));
}

// --- doc scope ---
{
  ok("command review doc exists", doc.length > 900);
  ok("doc v5.6I.17 label", doc.includes("v5.6I.17"));
  ok("doc staging project nonga-ce93c", doc.includes(STAGING_PROJECT));
  ok("doc cloud run service", doc.includes(STAGING_SERVICE));
  ok("doc cloud run region", doc.includes(STAGING_REGION));
  ok("doc production block", /production block|ห้าม.*production|production project/i.test(doc));
}

// --- no production project id in doc ---
{
  for (const forbidden of FORBIDDEN_PRODUCTION_PROJECT_IDS) {
    ok(`doc forbids prod id ${forbidden}`, !doc.includes(forbidden));
  }
}

// --- DO NOT RUN YET enablement ---
{
  ok("doc DO NOT RUN YET", doc.includes("DO NOT RUN YET"));
  ok("enablement uses gcloud run services update", doc.includes("gcloud run services update"));
  ok("enablement project nonga-ce93c", /--project=nonga-ce93c/.test(doc));
  ok("doc forbids gcloud run deploy in slice", /DO NOT RUN YET.*gcloud run deploy|ห้าม gcloud run deploy/i.test(doc));
  ok("doc forbids firebase deploy", /DO NOT RUN YET.*firebase deploy|ห้าม firebase deploy/i.test(doc));
}

// --- triple flags ---
{
  ok("doc NONGA_SETTLEMENT_DATA_BACKEND=firestore", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=firestore"));
  ok(
    "doc NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true")
  );
  ok(
    "doc NONGA_SUCCESS_FEE_RECORD_ENABLED=true",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=true")
  );
}

// --- rollback ---
{
  ok("rollback section smoke fail", /ใช้เมื่อ smoke fail/i.test(doc));
  ok("rollback NONGA_SETTLEMENT_DATA_BACKEND=memory", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=memory"));
  ok(
    "rollback NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false")
  );
  ok(
    "rollback NONGA_SUCCESS_FEE_RECORD_ENABLED=false",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=false")
  );
}

// --- preflight read-only + post-enable smoke ---
{
  ok("preflight read-only describe", doc.includes("gcloud run services describe"));
  ok("preflight npm tests listed", doc.includes("test:v56i16"));
  ok("post-enable smoke admin preview", /admin revenue preview/i.test(docLower));
  ok("post-enable admin adjustment", /admin manual adjustment|POST \/api\/admin\/revenue\/adjustments/i.test(doc));
  ok("post-enable duplicate requestId", /duplicate.*requestId/i.test(docLower));
  ok("post-enable conflict 409", /409|conflict fingerprint/i.test(docLower));
  ok("post-enable seller revenue", /seller revenue|GET \/api\/my\/revenue\/preview/i.test(doc));
  ok("post-enable client firestore deny", /PERMISSION_DENIED|direct client/i.test(doc));
}

// --- test script does not execute gcloud/deploy ---
{
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfSrc));
  ok("script no firebase deploy call", !/execSync\s*\(\s*[`'"]firebase deploy/.test(selfSrc));
  ok("script no shell gcloud invoke", !/(?:execSync|spawnSync|spawn)\s*\([^)]*gcloud/.test(selfSrc));
}

// --- package.json ---
{
  ok("package v56i17 script", pkg.includes("test:v56i17-staging-persistence-enable-command-review"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i17-staging-persistence-enable-command-review.mts")
  );
}

// --- cross-ref v56i16 ---
{
  ok("references v56i16", doc.includes("v5.6I.16"));
}

console.log("\nDone v5.6I.17 staging persistence enable command review tests.");
