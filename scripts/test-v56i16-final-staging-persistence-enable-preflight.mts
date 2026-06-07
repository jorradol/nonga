/**
 * v5.6I.16 — Final staging persistence enable preflight (docs/tests only; no enablement)
 * npm run test:v56i16-final-staging-persistence-enable-preflight
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  assertSettlementPersistenceReadinessDefaults,
  isDurableSettlementPersistenceActive,
  isSettlementFirestoreWritesEnabled,
  isSuccessFeeRecordEnabled,
  NONGA_SETTLEMENT_DATA_BACKEND_ENV,
  NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV,
  NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV,
  resolveSettlementDataBackend,
} from "../src/services/leads/settlementPersistenceFlags.ts";
import {
  resolveSettlementDataBackend as resolveBackendFromRepo,
} from "../src/server/repositories/settlementAdjustmentRepository.ts";
import { SETTLEMENT_COLLECTIONS } from "../src/services/leads/settlementPersistenceModel.ts";

const DOC_PATH = "docs/v5.6I.16-final-staging-persistence-enable-preflight.md";
const MIN_GIT_BASELINE = "58480495eeb688cf5fbc4a457eeffd7c9e7e7c58";
const STAGING_PROJECT = "nonga-ce93c";
const BLOCKED_PERSISTENCE_PROJECT_IDS = ["nonga-real", "nonga-prod", "nonga-production"] as const;

function dryRunPersistenceProjectAllowed(projectId: string | undefined): boolean {
  const id = String(projectId ?? "").trim();
  if (!id) return false;
  if ((BLOCKED_PERSISTENCE_PROJECT_IDS as readonly string[]).includes(id)) return false;
  return id === STAGING_PROJECT;
}

function dryRunStagingPersistenceEnv(): Record<string, string> {
  return {
    [NONGA_SETTLEMENT_DATA_BACKEND_ENV]: "firestore",
    [NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV]: "true",
    [NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV]: "true",
    FIREBASE_PROJECT_ID: STAGING_PROJECT,
  };
}

const SETTLEMENT_RULE_COLLECTIONS = [
  "successFeeRecords",
  "settlementAdjustments",
  "settlementAuditLogs",
  "settlementIdempotencyRecords",
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

console.log("=== v5.6I.16 Final staging persistence enable preflight ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const rulesSrc = readFileSync("firestore.rules", "utf8");
const fsRepoSrc = readFileSync(
  "src/server/repositories/settlementAdjustmentRepositoryFirestore.ts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const revenueRoutes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");

// --- git baseline ---
{
  ok("git head at or after 5848049", gitHeadAtOrAfterBaseline(MIN_GIT_BASELINE));
  ok("doc references git baseline 5848049", doc.includes("5848049"));
}

// --- doc scope ---
{
  ok("preflight doc exists", doc.length > 800);
  ok("doc v5.6I.16 label", doc.includes("v5.6I.16"));
  ok("doc final preflight", /final.*preflight|preflight checklist/i.test(doc));
  ok("doc still not enable", /ยังไม่เปิด|ยังไม่รัน|ยังไม่ deploy/i.test(doc));
  ok("doc staging only nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("doc production block", docLower.includes("production") && /ห้าม|block|stop/i.test(doc));
  ok("doc approval gate uncle", /ลุงอนุมัติ|approval gate/i.test(doc));
}

// --- runtime defaults ---
{
  ok("runtime default memory", resolveSettlementDataBackend({}) === "memory");
  ok("repo factory memory", resolveBackendFromRepo({}) === "memory");
  ok("durable inactive default", !isDurableSettlementPersistenceActive({}));
  ok("readiness defaults", assertSettlementPersistenceReadinessDefaults({}));
}

// --- triple flags ---
{
  ok("doc backend flag", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND"));
  ok("doc writes flag", doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED"));
  ok("doc success fee flag", doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED"));

  const triple = dryRunStagingPersistenceEnv();
  ok("triple backend firestore", resolveSettlementDataBackend(triple) === "firestore");
  ok("triple writes on", isSettlementFirestoreWritesEnabled(triple));
  ok("triple success fee on", isSuccessFeeRecordEnabled(triple));
  ok("triple durable active", isDurableSettlementPersistenceActive(triple));
}

// --- staging project gate ---
{
  ok("staging allowed", dryRunPersistenceProjectAllowed(STAGING_PROJECT));
  ok("production blocked", !dryRunPersistenceProjectAllowed("nonga-real"));
}

// --- firestore rules deny + admin sdk ---
{
  for (const col of SETTLEMENT_RULE_COLLECTIONS) {
    ok(
      `rules deny ${col}`,
      rulesSrc.includes(`match /${col}/{`) &&
        new RegExp(
          `match /${col}/\\{[^}]+\\}[\\s\\S]*?allow read, write: if false`
        ).test(rulesSrc)
    );
  }
  ok("fs repo uses admin path", fsRepoSrc.includes("firebase-admin"));
  ok("fs repo assertWritesAllowed", fsRepoSrc.includes("assertWritesAllowed"));
  ok("doc admin sdk only", /admin sdk/i.test(doc));
  ok("collections align model", SETTLEMENT_COLLECTIONS.settlementIdempotencyRecords === "settlementIdempotencyRecords");
}

// --- PII ---
{
  ok("doc pii all four collections", SETTLEMENT_RULE_COLLECTIONS.every((c) => doc.includes(c)));
  ok("doc no buyer phone", /buyer phone|no pii|pii safety/i.test(docLower));
  ok("doc assertNoBuyerPii helpers", doc.includes("assertNoBuyerPii"));
}

// --- pre-enable / post-enable / rollback sections ---
{
  ok("doc pre-enable commands", /pre-enable commands/i.test(docLower));
  ok("doc post-enable smoke", /post-enable smoke/i.test(docLower));
  ok("doc admin revenue preview smoke", /admin revenue preview/i.test(docLower));
  ok("doc admin manual adjustment", /admin manual adjustment|POST \/api\/admin\/revenue\/adjustments/i.test(doc));
  ok("doc duplicate requestId", /duplicate.*requestId|requestId.*replay/i.test(docLower));
  ok("doc conflict 409", /409|conflict fingerprint/i.test(docLower));
  ok("doc seller revenue statement", /seller revenue|GET \/api\/my\/revenue\/preview/i.test(doc));
  ok("doc buyer seller flows not broken", /buyer lead|seller reveal|outcome flow/i.test(docLower));
  ok("doc client firestore deny", /PERMISSION_DENIED|direct client/i.test(doc));
  ok("doc rollback plan", /rollback plan/i.test(docLower));
  ok("doc rollback memory backend", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND=memory"));
  ok("doc rollback writes off", doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false"));
  ok("doc rollback success fee off", doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED=false"));
  ok("doc rollback cloud run staging", /cloud run staging/i.test(docLower));
}

// --- no silent fallback ---
{
  ok("no memory fallback in fs repo", !/fallback.*memory|memory.*fallback/i.test(fsRepoSrc));
}

// --- package + no runtime mutation ---
{
  ok("package v56i16 script", pkg.includes("test:v56i16-final-staging-persistence-enable-preflight"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i16-final-staging-persistence-enable-preflight.mts")
  );
}

// --- cross-refs prior slices ---
{
  ok("references v56i15", doc.includes("v5.6I.15"));
  ok("references v56i14", doc.includes("v5.6I.14"));
  ok("references v56i13", doc.includes("v5.6I.13"));
  ok("no invoice route", !revenueRoutes.includes("/api/admin/invoices"));
  ok("no payment gateway in pkg script name", !pkg.includes("payment-gateway"));
}

console.log("\nDone v5.6I.16 final staging persistence enable preflight tests.");
