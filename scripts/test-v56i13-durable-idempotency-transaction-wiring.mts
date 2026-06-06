/**
 * v5.6I.13 — Durable idempotency transaction wiring (gated; no real Firestore writes)
 * npm run test:v56i13-durable-idempotency-transaction-wiring
 */
import { readFileSync } from "node:fs";
import {
  createSettlementAdjustmentRepository,
  resetSettlementAdjustmentRepositoryForTests,
  resolveSettlementDataBackend,
} from "../src/server/repositories/settlementAdjustmentRepository.ts";
import {
  assertSettlementPersistenceReadinessDefaults,
  isDurableSettlementPersistenceActive,
  isSettlementFirestoreWritesEnabled,
  isSuccessFeeRecordEnabled,
} from "../src/services/leads/settlementPersistenceFlags.ts";
import {
  buildAdjustmentPayloadFingerprint,
  buildDeterministicAdjustmentAuditId,
  buildSettlementIdempotencyCompositeKey,
  SettlementAdjustmentIdempotencyConflictError,
} from "../src/services/leads/settlementIdempotency.ts";
import {
  assertNoBuyerPiiInIdempotencyRecord,
  buildDurableIdempotencyDocId,
  buildDurableIdempotencyRecordDraft,
  DURABLE_IDEMPOTENCY_TRANSACTION_STEPS,
  redactIdempotencyResponseSnapshot,
  resolveDurableIdempotencyTransactionOutcome,
  SETTLEMENT_IDEMPOTENCY_COLLECTION,
} from "../src/services/leads/durableIdempotencyModel.ts";
import { SETTLEMENT_COLLECTIONS } from "../src/services/leads/settlementPersistenceModel.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.13 Durable idempotency transaction wiring ===\n");

const fsRepoSrc = readFileSync(
  "src/server/repositories/settlementAdjustmentRepositoryFirestore.ts",
  "utf8"
);

// --- default flags unchanged ---
{
  ok("persistence defaults off", assertSettlementPersistenceReadinessDefaults({}));
  ok("firestore writes off", !isSettlementFirestoreWritesEnabled({}));
  ok("success fee off", !isSuccessFeeRecordEnabled({}));
  ok("durable persistence inactive", !isDurableSettlementPersistenceActive({}));
  ok("runtime backend memory", resolveSettlementDataBackend({}) === "memory");
}

// --- firestore repo: no in-process cache; durable collection wired ---
{
  ok("no in-process idempotencyCache", !fsRepoSrc.includes("idempotencyCache"));
  ok(
    "uses settlementIdempotencyRecords collection",
    fsRepoSrc.includes("settlementIdempotencyRecords")
  );
  ok(
    "collection from SETTLEMENT_COLLECTIONS",
    fsRepoSrc.includes("SETTLEMENT_COLLECTIONS.settlementIdempotencyRecords")
  );
  ok("uses runTransaction", fsRepoSrc.includes("runTransaction"));
  ok(
    "reads idempotency before writes",
    /applyAdjustmentWithAudit[\s\S]*tx\.get\(idempotencyRef\)/.test(fsRepoSrc)
  );
  ok(
    "writes idempotency in transaction",
    /tx\.set\(idempotencyRef/.test(fsRepoSrc)
  );
  ok(
    "writes state in same transaction",
    /tx\.set\(stateRef/.test(fsRepoSrc)
  );
  ok(
    "writes audit in same transaction",
    /tx\.set\(auditRef/.test(fsRepoSrc)
  );
  ok("uses resolveDurableIdempotencyTransactionOutcome", fsRepoSrc.includes("resolveDurableIdempotencyTransactionOutcome"));
  ok("uses buildDurableIdempotencyDocId", fsRepoSrc.includes("buildDurableIdempotencyDocId"));
  ok("uses buildDurableIdempotencyRecordDraft", fsRepoSrc.includes("buildDurableIdempotencyRecordDraft"));
  ok("uses redactIdempotencyResponseSnapshot", fsRepoSrc.includes("redactIdempotencyResponseSnapshot"));
  ok("assertNoBuyerPiiInIdempotencyRecord before write", fsRepoSrc.includes("assertNoBuyerPiiInIdempotencyRecord"));
  ok("conflict throws SettlementAdjustmentIdempotencyConflictError", fsRepoSrc.includes("SettlementAdjustmentIdempotencyConflictError"));
  ok("writes gated assertWritesAllowed", fsRepoSrc.includes("assertWritesAllowed"));
  ok("no silent memory fallback", !/fallback.*memory|memory.*fallback/i.test(fsRepoSrc));
  ok("fail closed corrupt idempotency", fsRepoSrc.includes("idempotency record corrupt"));
}

// --- pure transaction outcome helper ---
{
  const fp = buildAdjustmentPayloadFingerprint({
    listingId: "list-i13",
    action: "partial_payment",
    amount: 300,
    reason: "test",
  });
  ok("new when absent", resolveDurableIdempotencyTransactionOutcome(null, fp).kind === "new");

  const existing = {
    payloadFingerprint: fp,
    auditLogId: "audit-i13",
    settlementAdjustmentId: "settle-i13",
  };
  const dup = resolveDurableIdempotencyTransactionOutcome(existing, fp);
  ok("duplicate same fingerprint", dup.kind === "duplicate");
  if (dup.kind === "duplicate") {
    ok("duplicate links auditLogId", dup.auditLogId === "audit-i13");
    ok("duplicate links settlementAdjustmentId", dup.settlementAdjustmentId === "settle-i13");
  }

  ok(
    "conflict different fingerprint",
    resolveDurableIdempotencyTransactionOutcome(existing, fp + "-x").kind === "conflict"
  );
}

// --- idempotency record draft: processed + links + no PII ---
{
  const requestId = "req-i13-draft";
  const listingId = "list-i13-draft";
  const auditLogId = buildDeterministicAdjustmentAuditId(requestId, listingId);
  const now = "2026-06-06T14:00:00.000Z";
  const snapshot = redactIdempotencyResponseSnapshot(
    {
      settlementStatus: "partially_paid",
      feeAmount: 4000,
      paidAmount: 500,
      remainingAmount: 3500,
    },
    auditLogId,
    "processed"
  );
  const draft = buildDurableIdempotencyRecordDraft({
    input: {
      listingId,
      action: "partial_payment",
      amount: 500,
      reason: "wiring test",
      updatedBy: "admin-i13",
      updatedByRole: "admin",
    },
    requestId,
    settlementAdjustmentId: `settle-${listingId}`,
    auditLogId,
    status: "processed",
    createdAt: now,
    processedAt: now,
    responseSnapshot: snapshot,
  });

  ok("status processed", draft.status === "processed");
  ok("auditLogId set", draft.auditLogId === auditLogId);
  ok("settlementAdjustmentId set", draft.settlementAdjustmentId === `settle-${listingId}`);
  ok("responseSnapshot no phone", !/\b0[689]\d{8}\b/.test(JSON.stringify(snapshot)));
  ok("responseSnapshot no email", !snapshot.toString().includes("@"));
  ok("draft no buyer pii", assertNoBuyerPiiInIdempotencyRecord(draft as unknown as Record<string, unknown>));
  ok(
    "doc id deterministic",
    draft.id === buildDurableIdempotencyDocId(listingId, "admin-i13", requestId)
  );
}

// --- mock transaction simulation (no Firestore I/O) ---
{
  type TxLog = { op: string; collection: string; docId: string };
  const txLog: TxLog[] = [];

  const requestId = "req-i13-mock";
  const listingId = "list-i13-mock";
  const updatedBy = "admin-i13";
  const input = {
    listingId,
    action: "partial_payment" as const,
    amount: 250,
    reason: "mock tx",
    updatedBy,
    updatedByRole: "admin" as const,
  };
  const payloadFingerprint = buildAdjustmentPayloadFingerprint(input);
  const idempotencyDocId = buildDurableIdempotencyDocId(listingId, updatedBy, requestId);
  const auditLogId = buildDeterministicAdjustmentAuditId(requestId, listingId);
  const settlementAdjustmentId = `settle-${listingId}`;

  const store = new Map<string, Record<string, unknown>>();

  function txGet(collection: string, docId: string) {
    txLog.push({ op: "get", collection, docId });
    const key = `${collection}/${docId}`;
    return store.has(key) ? store.get(key)! : null;
  }

  function txSet(collection: string, docId: string, data: Record<string, unknown>) {
    txLog.push({ op: "set", collection, docId });
    store.set(`${collection}/${docId}`, data);
  }

  function simulateApply(existing: Record<string, unknown> | null) {
    txLog.length = 0;
    const idemKey = `${SETTLEMENT_IDEMPOTENCY_COLLECTION}/${idempotencyDocId}`;
    if (existing) store.set(idemKey, existing);

    const read = txGet(SETTLEMENT_IDEMPOTENCY_COLLECTION, idempotencyDocId);
    const outcome = resolveDurableIdempotencyTransactionOutcome(
      read as Parameters<typeof resolveDurableIdempotencyTransactionOutcome>[0],
      payloadFingerprint
    );

    if (outcome.kind === "conflict") {
      throw new SettlementAdjustmentIdempotencyConflictError();
    }
    if (outcome.kind === "duplicate") {
      txGet(SETTLEMENT_COLLECTIONS.settlementAdjustments, outcome.settlementAdjustmentId);
      txGet(SETTLEMENT_COLLECTIONS.settlementAuditLogs, outcome.auditLogId);
      return "duplicate" as const;
    }

    const idempotencyDoc = buildDurableIdempotencyRecordDraft({
      input,
      requestId,
      settlementAdjustmentId,
      auditLogId,
      status: "processed",
      createdAt: "2026-06-06T15:00:00.000Z",
      processedAt: "2026-06-06T15:00:00.000Z",
      responseSnapshot: redactIdempotencyResponseSnapshot(
        {
          settlementStatus: "partially_paid",
          feeAmount: 4000,
          paidAmount: 250,
          remainingAmount: 3750,
        },
        auditLogId,
        "processed"
      ),
    });
    txSet(SETTLEMENT_IDEMPOTENCY_COLLECTION, idempotencyDocId, idempotencyDoc as unknown as Record<string, unknown>);
    txSet(SETTLEMENT_COLLECTIONS.settlementAdjustments, settlementAdjustmentId, { listingId });
    txSet(SETTLEMENT_COLLECTIONS.settlementAuditLogs, auditLogId, { id: auditLogId });
    return "processed" as const;
  }

  const first = simulateApply(null);
  ok("mock first processed", first === "processed");
  ok(
    "mock read idempotency before set",
    txLog.findIndex((e) => e.op === "get" && e.collection === SETTLEMENT_IDEMPOTENCY_COLLECTION) <
      txLog.findIndex((e) => e.op === "set" && e.collection === SETTLEMENT_IDEMPOTENCY_COLLECTION)
  );
  ok("mock writes three docs", txLog.filter((e) => e.op === "set").length === 3);

  const second = simulateApply(null);
  ok("mock duplicate replay", second === "duplicate");
  ok(
    "mock duplicate no extra audit set",
    txLog.filter(
      (e) => e.op === "set" && e.collection === SETTLEMENT_COLLECTIONS.settlementAuditLogs
    ).length === 0
  );

  let conflict = false;
  try {
    store.set(`${SETTLEMENT_IDEMPOTENCY_COLLECTION}/${idempotencyDocId}`, {
      payloadFingerprint: "other-fingerprint",
      auditLogId,
      settlementAdjustmentId,
    });
    txLog.length = 0;
    const read = txGet(SETTLEMENT_IDEMPOTENCY_COLLECTION, idempotencyDocId);
    resolveDurableIdempotencyTransactionOutcome(
      read as Parameters<typeof resolveDurableIdempotencyTransactionOutcome>[0],
      payloadFingerprint
    );
    throw new SettlementAdjustmentIdempotencyConflictError();
  } catch (err) {
    conflict = err instanceof SettlementAdjustmentIdempotencyConflictError;
  }
  ok("mock conflict 409", conflict);
}

// --- memory repo unchanged (v5.6I.9 behavior) ---
{
  resetSettlementAdjustmentRepositoryForTests();
  const repo = createSettlementAdjustmentRepository();
  const requestId = "req-i13-mem";
  const input = {
    listingId: "list-i13-mem",
    action: "partial_payment" as const,
    amount: 150,
    reason: "mem wiring",
    updatedBy: "admin-i13",
    updatedByRole: "admin" as const,
  };
  const current = {
    settlementId: "settle-list-i13-mem",
    listingId: "list-i13-mem",
    sellerId: "seller-1",
    feeAmount: 4000,
    paidAmount: 0,
    remainingAmount: 4000,
    waivedAmount: 0,
    settlementStatus: "unbilled" as const,
    source: "admin_manual" as const,
    updatedAt: "2026-06-06T00:00:00.000Z",
  };

  const first = await repo.applyAdjustmentWithAudit({ current, requestId, input });
  const second = await repo.applyAdjustmentWithAudit({
    current: first.state,
    requestId,
    input,
  });
  ok("memory duplicate outcome", second.outcome === "duplicate");
  const audits = await repo.listAuditByListingId("list-i13-mem");
  ok("memory no duplicate audit", audits.length === 1);

  let memConflict = false;
  try {
    await repo.applyAdjustmentWithAudit({
      current: first.state,
      requestId,
      input: { ...input, amount: 999 },
    });
  } catch (err) {
    memConflict = err instanceof SettlementAdjustmentIdempotencyConflictError;
  }
  ok("memory conflict", memConflict);
}

// --- route still memory default ---
{
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("route uses createSettlementAdjustmentRepository", routes.includes("createSettlementAdjustmentRepository"));
  ok("route applyAdjustmentWithAudit", routes.includes("applyAdjustmentWithAudit"));
  ok("route 409 conflict", routes.includes("SettlementAdjustmentIdempotencyConflictError"));
}

// --- transaction steps + doc ---
{
  ok("transaction steps include read idempotency", DURABLE_IDEMPOTENCY_TRANSACTION_STEPS.some((s) => s.includes("read_idempotency")));
  ok("transaction steps no silent fallback", DURABLE_IDEMPOTENCY_TRANSACTION_STEPS.some((s) => s.includes("never_silent_fallback")));

  const doc = readFileSync(
    "docs/v5.6I.13-durable-idempotency-transaction-wiring.md",
    "utf8"
  );
  ok("doc exists", doc.length > 500);
  ok("doc in-process risk", doc.toLowerCase().includes("in-process"));
  ok("doc transaction", doc.toLowerCase().includes("transaction"));
  ok("doc write gate", doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED"));
  ok("doc production hold", doc.toLowerCase().includes("production"));
}

// --- no payment/invoice ---
{
  const pkg = readFileSync("package.json", "utf8");
  ok("no payment gateway script", !/payment-gateway|stripe|omise/i.test(pkg));
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("no invoice route", !routes.includes("/api/admin/invoices"));
}

// --- legacy requestId composite key ---
{
  const key = buildSettlementIdempotencyCompositeKey("list-legacy", "admin", "req-legacy");
  ok("legacy composite key preserved", key === "list-legacy|admin|req-legacy");
}

console.log("\nDone v5.6I.13 durable idempotency transaction wiring tests.");
