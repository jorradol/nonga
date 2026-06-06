/**
 * v5.6I.10 — Durable Firestore idempotency record readiness (no writes, no flag changes)
 * npm run test:v56i10-durable-idempotency-readiness
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
  assertIdempotencyKeyHasNoPii,
  assertNoBuyerPiiInIdempotencyRecord,
  buildDurableIdempotencyDocId,
  buildDurableIdempotencyKey,
  buildDurableIdempotencyRecordDraft,
  computeIdempotencyExpiresAt,
  classifyIdempotencyReplay as classifyDurableReplay,
  DURABLE_IDEMPOTENCY_REQUIRED_FIELDS,
  DURABLE_IDEMPOTENCY_TRANSACTION_STEPS,
  redactIdempotencyResponseSnapshot,
  SETTLEMENT_IDEMPOTENCY_COLLECTION,
  SETTLEMENT_IDEMPOTENCY_RETENTION_DAYS,
} from "../src/services/leads/durableIdempotencyModel.ts";
import { hasRequiredFields } from "../src/services/leads/settlementPersistenceModel.ts";
import { SETTLEMENT_COLLECTIONS } from "../src/services/leads/settlementPersistenceModel.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.6I.10 Durable idempotency readiness ===\n");

// --- flags still default ---
{
  ok("persistence defaults off", assertSettlementPersistenceReadinessDefaults({}));
  ok("firestore writes off", !isSettlementFirestoreWritesEnabled({}));
  ok("success fee off", !isSuccessFeeRecordEnabled({}));
  ok("durable persistence inactive", !isDurableSettlementPersistenceActive({}));
  ok("runtime backend memory", resolveSettlementDataBackend({}) === "memory");
}

// --- collection + model ---
{
  ok(
    "collection constant",
    SETTLEMENT_IDEMPOTENCY_COLLECTION === "settlementIdempotencyRecords"
  );
  ok(
    "settlement collections align",
    SETTLEMENT_COLLECTIONS.settlementIdempotencyRecords ===
      SETTLEMENT_IDEMPOTENCY_COLLECTION
  );

  const now = "2026-06-06T12:00:00.000Z";
  const draft = buildDurableIdempotencyRecordDraft({
    input: {
      listingId: "list-i10",
      action: "partial_payment",
      amount: 500,
      reason: "test adjustment",
      updatedBy: "admin-i10",
      updatedByRole: "admin",
    },
    requestId: "req-i10-abc",
    settlementAdjustmentId: "settle-list-i10",
    auditLogId: buildDeterministicAdjustmentAuditId("req-i10-abc", "list-i10"),
    status: "processed",
    createdAt: now,
    processedAt: now,
    responseSnapshot: redactIdempotencyResponseSnapshot(
      {
        settlementStatus: "partially_paid",
        feeAmount: 4000,
        paidAmount: 500,
        remainingAmount: 3500,
      },
      buildDeterministicAdjustmentAuditId("req-i10-abc", "list-i10"),
      "processed"
    ),
  });

  ok("draft has required fields", hasRequiredFields(draft, DURABLE_IDEMPOTENCY_REQUIRED_FIELDS));
  ok("draft links auditLogId", draft.auditLogId === draft.responseSnapshot?.auditLogId);
  ok("draft no buyer pii", assertNoBuyerPiiInIdempotencyRecord(draft as unknown as Record<string, unknown>));
  ok("draft operation type", draft.operationType === "settlement_adjustment");
  ok("draft expiresAt future", draft.expiresAt > now);
  ok(
    "retention days",
    computeIdempotencyExpiresAt(now) ===
      new Date(new Date(now).getTime() + SETTLEMENT_IDEMPOTENCY_RETENTION_DAYS * 86400000).toISOString()
  );
}

// --- deterministic key no PII ---
{
  const key = buildDurableIdempotencyKey("list-1", "admin-1", "req-uuid-123");
  ok("key deterministic", key === "list-1|admin-1|req-uuid-123");
  ok("key no pii pass", assertIdempotencyKeyHasNoPii(key));
  ok("key pii phone fail", !assertIdempotencyKeyHasNoPii("list|admin|0812345678"));
  ok("key pii email fail", !assertIdempotencyKeyHasNoPii("list|admin|foo@bar.com"));

  const docId = buildDurableIdempotencyDocId("list-1", "admin-1", "req-uuid-123");
  ok("doc id prefix", docId.startsWith("idem-list-1-"));
  ok("doc id no slash", !docId.includes("/"));
}

// --- payload fingerprint stable ---
{
  const input = {
    listingId: "list-fp",
    action: "partial_payment" as const,
    amount: 700,
    reason: "stable",
    adminNote: "note",
    leadId: "lead-1",
    updatedBy: "admin",
    updatedByRole: "admin" as const,
  };
  const fp1 = buildAdjustmentPayloadFingerprint(input);
  const fp2 = buildAdjustmentPayloadFingerprint({ ...input });
  ok("fingerprint stable", fp1 === fp2);
  ok("fingerprint changes on amount", fp1 !== buildAdjustmentPayloadFingerprint({ ...input, amount: 701 }));
}

// --- replay classification ---
{
  const compositeKey = buildSettlementIdempotencyCompositeKey("list-r", "admin-r", "req-r");
  const fp = buildAdjustmentPayloadFingerprint({
    listingId: "list-r",
    action: "partial_payment",
    amount: 100,
    reason: "r",
  });
  const record = {
    compositeKey,
    listingId: "list-r",
    updatedBy: "admin-r",
    requestId: "req-r",
    payloadFingerprint: fp,
    auditId: "audit-r",
    processedAt: "2026-06-06T00:00:00.000Z",
  };

  ok("new when absent", classifyDurableReplay(null, fp).kind === "new");
  ok("duplicate same fp", classifyDurableReplay(record, fp).kind === "duplicate");
  ok("conflict diff fp", classifyDurableReplay(record, fp + "-x").kind === "conflict");
}

// --- memory repo v5.6I.9 guardrails still pass ---
{
  resetSettlementAdjustmentRepositoryForTests();
  const repo = createSettlementAdjustmentRepository();
  const requestId = "req-i10-mem";
  const input = {
    listingId: "list-i10-mem",
    action: "partial_payment" as const,
    amount: 200,
    reason: "mem test",
    updatedBy: "admin-i10",
    updatedByRole: "admin" as const,
  };
  const current = {
    settlementId: "settle-list-i10-mem",
    listingId: "list-i10-mem",
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

  let conflict = false;
  try {
    await repo.applyAdjustmentWithAudit({
      current: first.state,
      requestId,
      input: { ...input, amount: 999 },
    });
  } catch (err) {
    conflict = err instanceof SettlementAdjustmentIdempotencyConflictError;
  }
  ok("memory conflict", conflict);
}

// --- firestore repo durable wiring (v5.6I.13) ---
{
  const fsRepoSrc = readFileSync(
    "src/server/repositories/settlementAdjustmentRepositoryFirestore.ts",
    "utf8"
  );
  ok("firestore no in-process idempotency cache", !fsRepoSrc.includes("idempotencyCache"));
  ok("firestore writes gated", fsRepoSrc.includes("assertWritesAllowed"));
  ok("firestore uses settlementIdempotencyRecords", fsRepoSrc.includes("settlementIdempotencyRecords"));
  ok("firestore reads idempotency in transaction", /tx\.get\(idempotencyRef\)/.test(fsRepoSrc));
}

// --- rules deny-all documented ---
{
  const rules = readFileSync("firestore.rules", "utf8");
  ok("rules has settlementIdempotencyRecords", rules.includes("match /settlementIdempotencyRecords/{recordId}"));
  ok(
    "rules idempotency deny all",
    /match \/settlementIdempotencyRecords\/\{recordId\}[\s\S]*?allow read, write: if false/.test(rules)
  );
  ok("rules idempotency subcollection deny", rules.includes("settlementIdempotencyRecords/{recordId}/{document=**}"));

  const draft = readFileSync("firestore.rules.draft", "utf8");
  ok("draft rules aligned", draft.includes("match /settlementIdempotencyRecords/{recordId}"));
}

// --- transaction plan documented ---
{
  ok("transaction steps defined", DURABLE_IDEMPOTENCY_TRANSACTION_STEPS.length >= 8);
  const doc = readFileSync(
    "docs/v5.6I.10-durable-firestore-idempotency-readiness.md",
    "utf8"
  );
  ok("doc exists", doc.length > 500);
  ok("doc in-process risk", doc.toLowerCase().includes("in-process"));
  ok("doc transaction flow", doc.toLowerCase().includes("transaction"));
  ok("doc retention", doc.toLowerCase().includes("retention"));
  ok("doc legacy requestId", doc.toLowerCase().includes("requestid"));
  ok("doc production hold", doc.toLowerCase().includes("production"));
  ok("doc no deploy", doc.toLowerCase().includes("deploy"));
}

// --- no payment/invoice ---
{
  const pkg = readFileSync("package.json", "utf8");
  ok("no payment gateway script", !/payment-gateway|stripe|omise/i.test(pkg));
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("no invoice route", !routes.includes("/api/admin/invoices"));
}

// --- frontend requestId ---
{
  const modal = readFileSync(
    "src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx",
    "utf8"
  );
  ok("modal requestId ref", modal.includes("requestIdRef"));
  ok("modal passes requestId", modal.includes("requestId: requestIdRef.current"));
}

// --- legacy missing requestId risk ---
{
  const idemSrc = readFileSync("src/services/leads/settlementIdempotency.ts", "utf8");
  ok("server generates requestId", idemSrc.includes("generateServerSettlementRequestId"));
  ok("resolve fallback documented in code", idemSrc.includes("resolveSettlementRequestId"));
}

console.log("\nDone v5.6I.10 durable idempotency readiness tests.");
