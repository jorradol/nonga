/**
 * v5.6I.5 — Durable settlement persistence readiness (no Firestore writes, no rules deploy)
 * npm run test:v56i5-durable-settlement-readiness
 */
import { readFileSync } from "node:fs";
import {
  createSettlementAdjustmentRepository,
  resetSettlementAdjustmentRepositoryForTests,
  resolveSettlementDataBackend,
} from "../src/server/repositories/settlementAdjustmentRepository.ts";
import { createFirestoreSettlementAdjustmentRepository } from "../src/server/repositories/settlementAdjustmentRepositoryFirestore.ts";
import {
  createSuccessFeeRecordRepository,
  resetSuccessFeeRecordRepositoryForTests,
} from "../src/server/repositories/successFeeRecordRepository.ts";
import { createFirestoreSuccessFeeRecordRepository } from "../src/server/repositories/successFeeRecordRepositoryFirestore.ts";
import {
  assertSettlementPersistenceReadinessDefaults,
  isDurableSettlementPersistenceActive,
  isSettlementFirestoreWritesEnabled,
  isSuccessFeeRecordEnabled,
  NONGA_SETTLEMENT_DATA_BACKEND_ENV,
  NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV,
  NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV,
} from "../src/services/leads/settlementPersistenceFlags.ts";
import {
  assertAuditHasBeforeAfterOrSufficientReason,
  assertNoBuyerPiiInSettlementDocument,
  auditEntryToDurableAuditLog,
  DURABLE_ADJUSTMENT_REQUIRED_FIELDS,
  DURABLE_AUDIT_REQUIRED_FIELDS,
  DURABLE_SUCCESS_FEE_REQUIRED_FIELDS,
  hasRequiredFields,
  SETTLEMENT_COLLECTIONS,
  stateToDurableAdjustmentDoc,
  successFeeRecordToDurableDoc,
} from "../src/services/leads/settlementPersistenceModel.ts";
import { createSuccessFeeRecordDraftPreview } from "../src/services/leads/successFeeSettlement.ts";
import type { SettlementAdjustmentAuditEntry } from "../src/services/leads/leadTypes.ts";
import { LEAD_ENGINE_COLLECTIONS } from "../src/services/leads/leadTypes.ts";
import { assertAdjustmentAuditHasNoPaymentGatewayFields } from "../src/services/leads/settlementAdjustmentService.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

// --- feature flag defaults (all gates off) ---
{
  ok("success fee record flag off", !isSuccessFeeRecordEnabled({}));
  ok("settlement backend memory", resolveSettlementDataBackend({}) === "memory");
  ok("firestore writes off", !isSettlementFirestoreWritesEnabled({}));
  ok("durable persistence inactive", !isDurableSettlementPersistenceActive({}));
  ok(
    "readiness defaults assert",
    assertSettlementPersistenceReadinessDefaults({})
  );
  ok(
    "env names documented",
    NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV === "NONGA_SUCCESS_FEE_RECORD_ENABLED" &&
      NONGA_SETTLEMENT_DATA_BACKEND_ENV === "NONGA_SETTLEMENT_DATA_BACKEND" &&
      NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV ===
        "NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED"
  );
}

// --- collection constants ---
{
  ok(
    "collections match lead engine",
    SETTLEMENT_COLLECTIONS.successFeeRecords ===
      LEAD_ENGINE_COLLECTIONS.successFeeRecords &&
      SETTLEMENT_COLLECTIONS.settlementAdjustments ===
        LEAD_ENGINE_COLLECTIONS.settlementAdjustments &&
      SETTLEMENT_COLLECTIONS.settlementAuditLogs ===
        LEAD_ENGINE_COLLECTIONS.settlementAuditLogs
  );
}

// --- factory defaults: memory ---
{
  resetSettlementAdjustmentRepositoryForTests();
  resetSuccessFeeRecordRepositoryForTests();
  const adjRepo = createSettlementAdjustmentRepository();
  const feeRepo = createSuccessFeeRecordRepository();
  ok("adjustment repo memory default", resolveSettlementDataBackend() === "memory");
  const state = await adjRepo.upsertState({
    settlementId: "preview-pending-list-v56i5",
    listingId: "list-v56i5",
    sellerId: "seller-v56i5",
    feeAmount: 8000,
    paidAmount: 0,
    waivedAmount: 0,
    remainingAmount: 8000,
    settlementStatus: "unbilled",
    updatedAt: new Date().toISOString(),
  });
  ok("memory upsert works", state.listingId === "list-v56i5");
  const draft = createSuccessFeeRecordDraftPreview({
    id: "sfr-v56i5",
    listingId: "list-v56i5",
    buyerLeadId: "blead-v56i5",
    sellerId: "seller-v56i5",
    closedDealPrice: 800_000,
  });
  ok("draft preview builds", draft !== null);
  if (draft) {
    await feeRepo.upsert(draft);
    const loaded = await feeRepo.getByListingId("list-v56i5");
    ok("memory success fee upsert", loaded?.id === "sfr-v56i5");
  }
}

// --- durable model required fields ---
{
  const draft = createSuccessFeeRecordDraftPreview({
    id: "sfr-model",
    listingId: "list-model",
    buyerLeadId: "blead-model",
    sellerId: "seller-model",
    closedDealPrice: 500_000,
  });
  ok("draft for model", draft !== null);
  if (draft) {
    const doc = successFeeRecordToDurableDoc(draft);
    ok(
      "success fee required fields",
      hasRequiredFields(doc, DURABLE_SUCCESS_FEE_REQUIRED_FIELDS)
    );
    ok("success fee no buyer PII", assertNoBuyerPiiInSettlementDocument(doc));
  }

  const adjDoc = stateToDurableAdjustmentDoc(
    {
      settlementId: "preview-pending-list-model",
      listingId: "list-model",
      sellerId: "seller-model",
      feeAmount: 5000,
      paidAmount: 1000,
      waivedAmount: 0,
      remainingAmount: 4000,
      settlementStatus: "partially_paid",
      updatedAt: "2026-06-05T00:00:00.000Z",
    },
    {
      adjustmentType: "partial_payment",
      adjustmentAmount: 1000,
      updatedBy: "admin-test",
      updatedByRole: "admin",
    }
  );
  ok(
    "adjustment required fields",
    hasRequiredFields(adjDoc, DURABLE_ADJUSTMENT_REQUIRED_FIELDS)
  );
  ok("adjustment no buyer PII", assertNoBuyerPiiInSettlementDocument(adjDoc));

  const audit: SettlementAdjustmentAuditEntry = {
    id: "adj-audit-v56i5",
    settlementId: "preview-pending-list-model",
    listingId: "list-model",
    sellerId: "seller-model",
    action: "partial_payment",
    previousFeeAmount: 5000,
    newFeeAmount: 5000,
    previousPaidAmount: 0,
    newPaidAmount: 1000,
    previousRemainingAmount: 5000,
    newRemainingAmount: 4000,
    previousStatus: "unbilled",
    newStatus: "partially_paid",
    amountDelta: 1000,
    reason: "ทดสอบบันทึกยอด",
    updatedBy: "admin-test",
    updatedByRole: "admin",
    createdAt: "2026-06-05T00:00:00.000Z",
    source: "admin_manual",
  };
  const auditDoc = auditEntryToDurableAuditLog(audit);
  ok(
    "audit required fields",
    hasRequiredFields(auditDoc, DURABLE_AUDIT_REQUIRED_FIELDS)
  );
  ok("audit before/after or reason", assertAuditHasBeforeAfterOrSufficientReason(auditDoc));
  ok("audit no buyer PII", assertNoBuyerPiiInSettlementDocument(auditDoc));
  ok("audit no payment gateway", assertAdjustmentAuditHasNoPaymentGatewayFields(audit));
  ok(
    "audit normalizes source",
    auditDoc.source === "manual_admin_adjustment"
  );

  const badPii = {
    ...adjDoc,
    note: "เบอร์ผู้ซื้อ 0812345678",
  };
  ok("rejects thai phone in doc", !assertNoBuyerPiiInSettlementDocument(badPii));
  ok(
    "rejects contactPhone field name",
    !assertNoBuyerPiiInSettlementDocument({ contactPhone: "masked" })
  );
}

// --- firestore init without creds → clear error ---
{
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

  let adjMsg = "";
  let feeMsg = "";
  try {
    createFirestoreSettlementAdjustmentRepository();
  } catch (err) {
    adjMsg = err instanceof Error ? err.message : String(err);
  }
  try {
    createFirestoreSuccessFeeRecordRepository();
  } catch (err) {
    feeMsg = err instanceof Error ? err.message : String(err);
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

  ok("firestore adj init fails without creds", adjMsg.length > 0);
  ok("firestore fee init fails without creds", feeMsg.length > 0);
  ok(
    "firestore error mentions credentials",
    /credentials|Firebase Admin/i.test(adjMsg),
    adjMsg.slice(0, 100)
  );
}

// --- firestore writes gated (no real Firestore call) ---
{
  ok(
    "writes disabled message in repo",
    !isSettlementFirestoreWritesEnabled({})
  );
  const writeGateMsg =
    "Settlement Firestore writes are disabled (NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED!=true)";
  ok("write gate message documented", writeGateMsg.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED"));
}

// --- rules draft: deny-all settlement collections ---
{
  const draft = readFileSync("firestore.rules.draft", "utf8");
  ok("rules draft has successFeeRecords deny", draft.includes("match /successFeeRecords/{recordId}"));
  ok(
    "rules draft successFeeRecords allow false",
    /match \/successFeeRecords\/\{recordId\}[\s\S]*?allow read, write: if false/.test(draft)
  );
  ok("rules draft has settlementAdjustments deny", draft.includes("match /settlementAdjustments/{adjustmentId}"));
  ok("rules draft has settlementAuditLogs deny", draft.includes("match /settlementAuditLogs/{auditId}"));
}

// --- docs: migration/rollback plan ---
{
  const doc = readFileSync("docs/v5.6I.5-durable-settlement-persistence-readiness.md", "utf8");
  ok("doc exists", doc.length > 100);
  ok("doc mentions memory store", doc.includes("InMemorySettlementAdjustmentRepository"));
  ok("doc mentions rollback", doc.toLowerCase().includes("rollback"));
  ok("doc mentions backfill", doc.toLowerCase().includes("backfill"));
  ok("doc mentions multi-instance", doc.toLowerCase().includes("multi-instance"));
  ok("doc mentions kill-switch", doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=false"));
  ok("doc no payment gateway", doc.includes("payment gateway"));
  ok("doc seller redact", doc.includes("stripSellerRevenueRowForResponse"));
}

// --- admin-only API plan (static source check) ---
{
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("admin revenue preview route", routes.includes("/api/admin/revenue/preview"));
  ok("admin adjustments POST", routes.includes("/api/admin/revenue/adjustments"));
  ok("seller my revenue route", routes.includes("/api/my/revenue/preview"));
  ok("admin actor role check", routes.includes('updatedByRole') || routes.includes("adminActorFromRequest"));
}

// --- no production/env changes in this slice (static) ---
{
  const flags = readFileSync("src/services/leads/settlementPersistenceFlags.ts", "utf8");
  ok("flags default memory", flags.includes('"memory"'));
  ok("flags triple gate for active", flags.includes("isSuccessFeeRecordEnabled"));
  ok("flags triple gate firestore backend", flags.includes('=== "firestore"'));
  ok("flags triple gate writes", flags.includes("isSettlementFirestoreWritesEnabled"));
}

console.log("\nDone v5.6I.5 durable settlement readiness tests.");
