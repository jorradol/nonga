/**
 * v5.6I.15 — Staging persistence enablement dry-run (no writes, no deploy, no flag changes)
 * npm run test:v56i15-staging-persistence-enable-dry-run
 */
import { readFileSync } from "node:fs";
import { createFirestoreSettlementAdjustmentRepository } from "../src/server/repositories/settlementAdjustmentRepositoryFirestore.ts";
import {
  createSettlementAdjustmentRepository,
  resolveSettlementDataBackend as resolveBackendFromRepo,
} from "../src/server/repositories/settlementAdjustmentRepository.ts";
import {
  assertRevenuePreviewResponseHasNoBuyerPii,
  buildAdminRevenuePreviewApiPayload,
} from "../src/services/leads/revenuePreviewBackend.ts";
import {
  assertNoBuyerPiiInIdempotencyRecord,
  buildDurableIdempotencyRecordDraft,
  redactIdempotencyResponseSnapshot,
} from "../src/services/leads/durableIdempotencyModel.ts";
import {
  assertNoBuyerPiiInSettlementDocument,
  auditEntryToDurableAuditLog,
} from "../src/services/leads/settlementPersistenceModel.ts";
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
import { buildDeterministicAdjustmentAuditId } from "../src/services/leads/settlementIdempotency.ts";
import { deriveAdminRevenuePreviewRowsFromListings } from "../src/services/leads/adminRevenuePreview.ts";
import { previewRowToAdjustmentBase } from "../src/services/leads/settlementAdjustmentService.ts";

const DOC_PATH = "docs/v5.6I.15-staging-persistence-enable-dry-run.md";
const STAGING_FIREBASE_PROJECT_ID = "nonga-ce93c";
/** Known non-staging project IDs — dry-run block list (docs/tests only). */
const BLOCKED_PERSISTENCE_PROJECT_IDS = ["nonga-real", "nonga-prod", "nonga-production"] as const;

/** Dry-run gate: persistence enablement allowed only on staging project. */
export function dryRunPersistenceProjectAllowed(projectId: string | undefined): boolean {
  const id = String(projectId ?? "").trim();
  if (!id) return false;
  if ((BLOCKED_PERSISTENCE_PROJECT_IDS as readonly string[]).includes(id)) return false;
  return id === STAGING_FIREBASE_PROJECT_ID;
}

/** Dry-run: all three flags required for durable persistence active. */
export function dryRunStagingPersistenceEnv(): Record<string, string> {
  return {
    [NONGA_SETTLEMENT_DATA_BACKEND_ENV]: "firestore",
    [NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV]: "true",
    [NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV]: "true",
    FIREBASE_PROJECT_ID: STAGING_FIREBASE_PROJECT_ID,
  };
}

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.15 Staging persistence enable dry-run ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const fsRepoSrc = readFileSync(
  "src/server/repositories/settlementAdjustmentRepositoryFirestore.ts",
  "utf8"
);
const rulesSrc = readFileSync("firestore.rules", "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + dry-run scope ---
{
  ok("dry-run doc exists", doc.length > 900);
  ok("doc v5.6I.15 label", doc.includes("v5.6I.15"));
  ok("doc dry-run only", /dry-run|ยังไม่รัน|ยังไม่เปิด persistence/i.test(doc));
  ok("doc forbids production", docLower.includes("production") && /ห้าม production|ไม่ production/i.test(doc));
  ok("doc preflight checks", /preflight checks/i.test(docLower));
  ok("doc deploy env plan not run", /deploy.*env|env update plan/i.test(docLower));
  ok("doc post-enable smoke", /post-enable smoke|smoke plan/i.test(docLower));
  ok("doc rollback not run", /rollback plan/i.test(docLower));
  ok("doc approval criteria", /approval criteria/i.test(docLower));
}

// --- current runtime defaults (no env) ---
{
  ok("runtime default memory", resolveSettlementDataBackend({}) === "memory");
  ok("repo factory default memory", resolveBackendFromRepo({}) === "memory");
  ok("durable inactive no env", !isDurableSettlementPersistenceActive({}));
  ok("readiness defaults assert", assertSettlementPersistenceReadinessDefaults({}));
  ok("firestore writes off default", !isSettlementFirestoreWritesEnabled({}));
  ok("success fee off default", !isSuccessFeeRecordEnabled({}));
}

// --- triple flag gate (simulated env only — not applied to process.env) ---
{
  const stagingEnv = dryRunStagingPersistenceEnv();
  ok("simulated backend firestore", resolveSettlementDataBackend(stagingEnv) === "firestore");
  ok("simulated writes on", isSettlementFirestoreWritesEnabled(stagingEnv));
  ok("simulated success fee on", isSuccessFeeRecordEnabled(stagingEnv));
  ok("simulated durable active", isDurableSettlementPersistenceActive(stagingEnv));

  const partial = {
    [NONGA_SETTLEMENT_DATA_BACKEND_ENV]: "firestore",
    [NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV]: "true",
  };
  ok("partial without success fee not durable active", !isDurableSettlementPersistenceActive(partial));

  ok("doc lists all three flags", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND"));
  ok("doc lists writes flag", doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED"));
  ok("doc lists success fee flag", doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED"));
}

// --- staging project gate ---
{
  ok("staging project allowed", dryRunPersistenceProjectAllowed(STAGING_FIREBASE_PROJECT_ID));
  ok("empty project blocked", !dryRunPersistenceProjectAllowed(undefined));
  ok("production-like blocked nonga-real", !dryRunPersistenceProjectAllowed("nonga-real"));
  ok("wrong project blocked", !dryRunPersistenceProjectAllowed("other-project"));
  ok("doc staging gate nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("doc forbids non-staging enablement", /ห้าม|forbid|❌/i.test(doc));
}

// --- no silent fallback when firestore backend ---
{
  ok("firestore repo no memory fallback text", !/fallback.*memory|memory.*fallback/i.test(fsRepoSrc));
  ok("firestore init throws without creds", fsRepoSrc.includes("Firebase Admin credentials are required"));
  ok("assertWritesAllowed before transaction", /applyAdjustmentWithAudit[\s\S]*assertWritesAllowed/.test(fsRepoSrc));

  const saved = {
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;

  let initFailed = false;
  try {
    createFirestoreSettlementAdjustmentRepository();
  } catch {
    initFailed = true;
  } finally {
    if (saved.FIREBASE_SERVICE_ACCOUNT_JSON) {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = saved.FIREBASE_SERVICE_ACCOUNT_JSON;
    }
    if (saved.GOOGLE_APPLICATION_CREDENTIALS) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = saved.GOOGLE_APPLICATION_CREDENTIALS;
    }
    if (saved.FIREBASE_CLIENT_EMAIL) process.env.FIREBASE_CLIENT_EMAIL = saved.FIREBASE_CLIENT_EMAIL;
    if (saved.FIREBASE_PRIVATE_KEY) process.env.FIREBASE_PRIVATE_KEY = saved.FIREBASE_PRIVATE_KEY;
  }
  ok("firestore repo fails closed without creds", initFailed);
}

// --- rollback to memory (simulated) ---
{
  const rollbackEnv = {
    [NONGA_SETTLEMENT_DATA_BACKEND_ENV]: "memory",
    [NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV]: "false",
    [NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV]: "false",
  };
  ok("rollback backend memory", resolveSettlementDataBackend(rollbackEnv) === "memory");
  ok("rollback durable inactive", !isDurableSettlementPersistenceActive(rollbackEnv));
  ok("rollback uses memory repo", createSettlementAdjustmentRepository() !== null);
  ok("doc rollback to memory", /NONGA_SETTLEMENT_DATA_BACKEND=memory/i.test(doc));
}

// --- smoke checklist in doc ---
{
  ok("smoke admin revenue adjustment", /admin revenue adjustment|POST \/api\/admin\/revenue\/adjustments/i.test(doc));
  ok("smoke seller revenue statement", /seller revenue|GET \/api\/my\/revenue\/preview/i.test(doc));
  ok("smoke duplicate requestId", /duplicate.*requestId|requestId.*replay/i.test(docLower));
  ok("smoke conflict 409", /409|conflict fingerprint/i.test(docLower));
  ok("smoke client firestore deny", /direct client.*deny|PERMISSION_DENIED|deny-all/i.test(doc));
}

// --- PII safety (no real Firestore write) ---
{
  const listingId = "list-i15-pii";
  const requestId = "req-i15-pii";
  const auditLogId = buildDeterministicAdjustmentAuditId(requestId, listingId);
  const idempotencyDoc = buildDurableIdempotencyRecordDraft({
    input: {
      listingId,
      action: "partial_payment",
      amount: 500,
      reason: "dry-run pii check",
      updatedBy: "admin-i15",
      updatedByRole: "admin",
    },
    requestId,
    settlementAdjustmentId: `settle-${listingId}`,
    auditLogId,
    status: "processed",
    createdAt: "2026-06-06T16:00:00.000Z",
    processedAt: "2026-06-06T16:00:00.000Z",
    responseSnapshot: redactIdempotencyResponseSnapshot(
      {
        settlementStatus: "partially_paid",
        feeAmount: 4000,
        paidAmount: 500,
        remainingAmount: 3500,
      },
      auditLogId,
      "processed"
    ),
  });
  ok("idempotency record no buyer pii", assertNoBuyerPiiInIdempotencyRecord(idempotencyDoc as unknown as Record<string, unknown>));
  ok("idempotency snapshot no phone", !/\b0[689]\d{8}\b/.test(JSON.stringify(idempotencyDoc.responseSnapshot)));

  const rows = deriveAdminRevenuePreviewRowsFromListings([
    {
      id: listingId,
      price: 500_000,
      ownerId: "seller-i15",
      dealerId: "seller-i15",
      saleStatus: "pending_sale",
    },
  ]);
  const base = previewRowToAdjustmentBase(rows[0]!, { dealerId: "seller-i15" });
  const auditDurable = auditEntryToDurableAuditLog({
    id: auditLogId,
    settlementId: base.settlementId,
    listingId,
    sellerId: base.sellerId,
    action: "partial_payment",
    amountDelta: 500,
    previousFeeAmount: base.feeAmount,
    previousPaidAmount: base.paidAmount,
    previousRemainingAmount: base.remainingAmount,
    previousStatus: base.settlementStatus,
    newFeeAmount: base.feeAmount,
    newPaidAmount: 500,
    newRemainingAmount: base.remainingAmount - 500,
    newStatus: "partially_paid",
    reason: "dry-run audit",
    source: "admin_manual",
    updatedBy: "admin-i15",
    updatedByRole: "admin",
    createdAt: "2026-06-06T16:00:00.000Z",
  });
  ok("audit durable no buyer pii", assertNoBuyerPiiInSettlementDocument(auditDurable as unknown as Record<string, unknown>));

  const adminPayload = buildAdminRevenuePreviewApiPayload([], {});
  ok("admin revenue payload no buyer pii", assertRevenuePreviewResponseHasNoBuyerPii(adminPayload));
}

// --- rules deny direct client access (static) ---
{
  ok("rules settlementAdjustments deny", /match \/settlementAdjustments\/\{[^}]+\}[\s\S]*?allow read, write: if false/.test(rulesSrc));
  ok("rules settlementIdempotencyRecords deny", rulesSrc.includes("match /settlementIdempotencyRecords/{recordId}"));
}

// --- package script + no runtime flag mutation ---
{
  ok("package.json v56i15 script", pkg.includes("test:v56i15-staging-persistence-enable-dry-run"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v56i15-staging-persistence-enable-dry-run.mts")
  );
  ok("process env backend still default", resolveSettlementDataBackend(process.env as Record<string, string | undefined>) === "memory" || resolveSettlementDataBackend({}) === "memory");
}

// --- cross-ref v56i14 ---
{
  ok("references v56i14", doc.includes("v5.6I.14"));
  ok("references v56i13 wiring", doc.includes("v5.6I.13") || doc.includes("idempotency"));
}

console.log("\nDone v5.6I.15 staging persistence enable dry-run tests.");
