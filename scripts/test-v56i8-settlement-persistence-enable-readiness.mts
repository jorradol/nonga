/**
 * v5.6I.8 — Settlement Firestore persistence enablement readiness (no writes, no flag changes)
 * npm run test:v56i8-settlement-persistence-enable-readiness
 */
import { readFileSync } from "node:fs";
import {
  createSettlementAdjustmentRepository,
  resetSettlementAdjustmentRepositoryForTests,
  resolveSettlementDataBackend,
} from "../src/server/repositories/settlementAdjustmentRepository.ts";
import {
  createSuccessFeeRecordRepository,
  resetSuccessFeeRecordRepositoryForTests,
} from "../src/server/repositories/successFeeRecordRepository.ts";
import {
  applySettlementAdjustment,
  previewRowToAdjustmentBase,
  syntheticSettlementId,
} from "../src/services/leads/settlementAdjustmentService.ts";
import { deriveAdminRevenuePreviewRowsFromListings } from "../src/services/leads/adminRevenuePreview.ts";
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
  hasRequiredFields,
  DURABLE_AUDIT_REQUIRED_FIELDS,
  stateToDurableAdjustmentDoc,
} from "../src/services/leads/settlementPersistenceModel.ts";
import {
  createSuccessFeeRecordDraft,
  createSuccessFeeRecordDraftPreview,
} from "../src/services/leads/successFeeSettlement.ts";
import {
  assertRevenuePreviewResponseHasNoBuyerPii,
  buildAdminRevenuePreviewApiPayload,
} from "../src/services/leads/revenuePreviewBackend.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function mockPendingSaleCar(
  overrides: Pick<MarketplaceCarRecord, "id" | "ownerId" | "dealerId" | "price"> &
    Partial<MarketplaceCarRecord>
): MarketplaceCarRecord {
  return {
    id: overrides.id,
    title: overrides.title ?? "Test Car",
    brand: overrides.brand ?? "Toyota",
    model: overrides.model ?? "Corolla",
    year: overrides.year ?? 2020,
    price: overrides.price,
    type: overrides.type ?? "used",
    condition: overrides.condition ?? "good",
    mileage: overrides.mileage ?? 50_000,
    fuelType: overrides.fuelType ?? "petrol",
    images: overrides.images ?? [],
    description: overrides.description ?? "test",
    ownerId: overrides.ownerId,
    ownerName: overrides.ownerName ?? "Test Owner",
    ownerPhone: overrides.ownerPhone ?? "",
    isSold: false,
    dealerId: overrides.dealerId,
    listingStatus: overrides.listingStatus ?? "published",
    saleStatus: overrides.saleStatus ?? "pending_sale",
    createdAt: overrides.createdAt ?? "2026-06-06T00:00:00.000Z",
  };
}

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

// --- defaults: all gates off, memory backend ---
{
  ok("success fee flag off", !isSuccessFeeRecordEnabled({}));
  ok("backend memory default", resolveSettlementDataBackend({}) === "memory");
  ok("firestore writes off", !isSettlementFirestoreWritesEnabled({}));
  ok("durable persistence inactive", !isDurableSettlementPersistenceActive({}));
  ok("readiness defaults assert", assertSettlementPersistenceReadinessDefaults({}));
}

// --- triple gate matrix ---
{
  const firestoreOnly = {
    [NONGA_SETTLEMENT_DATA_BACKEND_ENV]: "firestore",
  };
  const writesOnly = {
    [NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV]: "true",
  };
  const successOnly = {
    [NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV]: "true",
  };
  const backendAndWrites = {
    ...firestoreOnly,
    ...writesOnly,
  };
  const allThree = {
    ...firestoreOnly,
    ...writesOnly,
    ...successOnly,
  };

  ok("firestore backend alone ≠ durable active", !isDurableSettlementPersistenceActive(firestoreOnly));
  ok("writes alone ≠ durable active", !isDurableSettlementPersistenceActive(writesOnly));
  ok("success fee alone ≠ durable active", !isDurableSettlementPersistenceActive(successOnly));
  ok(
    "backend+writes without success fee ≠ durable active",
    !isDurableSettlementPersistenceActive(backendAndWrites)
  );
  ok("all three flags = durable active", isDurableSettlementPersistenceActive(allThree));
}

// --- runtime success fee draft not created when flag off ---
{
  const draft = createSuccessFeeRecordDraft({
    id: "sfr-v56i8-off",
    listingId: "list-v56i8",
    buyerLeadId: "blead-v56i8",
    sellerId: "seller-v56i8",
    closedDealPrice: 600_000,
  });
  ok("success fee draft null when flag off", draft === null);
  const preview = createSuccessFeeRecordDraftPreview({
    id: "sfr-v56i8-preview",
    listingId: "list-v56i8",
    buyerLeadId: "blead-v56i8",
    sellerId: "seller-v56i8",
    closedDealPrice: 600_000,
  });
  ok("preview helper still builds for tests", preview !== null);
}

// --- memory behavior unchanged ---
{
  resetSettlementAdjustmentRepositoryForTests();
  resetSuccessFeeRecordRepositoryForTests();
  const adjRepo = createSettlementAdjustmentRepository();
  const feeRepo = createSuccessFeeRecordRepository();

  const listings = [
    mockPendingSaleCar({
      id: "list-v56i8-mem",
      price: 500_000,
      ownerId: "owner-v56i8",
      dealerId: "dealer-v56i8",
    }),
  ];
  const rows = deriveAdminRevenuePreviewRowsFromListings(listings);
  ok("derive preview rows", rows.length === 1);
  const base = previewRowToAdjustmentBase(rows[0]!, { dealerId: "dealer-v56i8" });
  const { next, audit: auditDraft } = applySettlementAdjustment(base, {
    listingId: "list-v56i8-mem",
    action: "admin_note",
    reason: "ทดสอบ readiness",
    adminNote: "note only",
    updatedBy: "admin-v56i8",
    updatedByRole: "admin",
  });
  const saved = await adjRepo.upsertState(next);
  const audit = await adjRepo.appendAudit({
    ...auditDraft,
    id: "adj-audit-v56i8",
    createdAt: new Date().toISOString(),
  });
  ok("memory adjustment saved", saved.listingId === "list-v56i8-mem");
  ok("memory audit appended", audit.listingId === "list-v56i8-mem");

  const payload = buildAdminRevenuePreviewApiPayload(listings, {
    statesByListingId: new Map([[saved.listingId, saved]]),
  });
  ok("admin payload rows", payload.rows.length === 1);
  ok("no buyer PII in API payload", assertRevenuePreviewResponseHasNoBuyerPii(payload));

  const feePreview = createSuccessFeeRecordDraftPreview({
    id: "sfr-v56i8-mem",
    listingId: "list-v56i8-mem",
    buyerLeadId: "blead-v56i8",
    sellerId: "seller-v56i8",
    closedDealPrice: 600_000,
  });
  if (feePreview) {
    await feeRepo.upsert(feePreview);
    ok(
      "memory fee repo upsert",
      (await feeRepo.getByListingId("list-v56i8-mem")) !== null
    );
  }
}

// --- adjustment requires audit invariant (route + service) ---
{
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok(
    "POST adjustments upserts state then audit",
    routes.includes("adjustmentRepo.upsertState(next)") &&
      routes.includes("adjustmentRepo.appendAudit")
  );
  ok(
    "success fee repo not wired in revenue routes",
    !routes.includes("createSuccessFeeRecordRepository") &&
      !routes.includes("SuccessFeeRecordRepository")
  );

  const auditDoc = auditEntryToDurableAuditLog({
    id: "adj-audit-inv",
    settlementId: syntheticSettlementId("list-inv"),
    listingId: "list-inv",
    sellerId: "seller-inv",
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
    reason: "บันทึกยอดทดสอบ",
    updatedBy: "admin-inv",
    updatedByRole: "admin",
    createdAt: "2026-06-06T00:00:00.000Z",
    source: "admin_manual",
  });
  ok(
    "audit has required fields",
    hasRequiredFields(auditDoc, DURABLE_AUDIT_REQUIRED_FIELDS)
  );
  ok(
    "audit before/after or sufficient reason",
    assertAuditHasBeforeAfterOrSufficientReason(auditDoc)
  );
  ok("audit doc no buyer PII", assertNoBuyerPiiInSettlementDocument(auditDoc));

  const adjOnly = stateToDurableAdjustmentDoc(
    {
      settlementId: syntheticSettlementId("list-inv"),
      listingId: "list-inv",
      sellerId: "seller-inv",
      feeAmount: 5000,
      paidAmount: 1000,
      waivedAmount: 0,
      remainingAmount: 4000,
      settlementStatus: "partially_paid",
      updatedAt: "2026-06-06T00:00:00.000Z",
    },
    {
      adjustmentType: "partial_payment",
      adjustmentAmount: 1000,
      updatedBy: "admin-inv",
      updatedByRole: "admin",
    }
  );
  ok("adjustment doc no buyer PII", assertNoBuyerPiiInSettlementDocument(adjOnly));
}

// --- write gate on Firestore repos (static) ---
{
  const feeFs = readFileSync(
    "src/server/repositories/successFeeRecordRepositoryFirestore.ts",
    "utf8"
  );
  const adjFs = readFileSync(
    "src/server/repositories/settlementAdjustmentRepositoryFirestore.ts",
    "utf8"
  );
  const writeGate =
    "NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED!=true";
  ok("fee repo write gate", feeFs.includes("assertWritesAllowed") && feeFs.includes(writeGate));
  ok("adj repo write gate on state", adjFs.includes("assertWritesAllowed"));
  ok("adj repo write gate on audit", adjFs.includes("appendAudit") && adjFs.includes(writeGate));
  ok(
    "reads do not call assertWritesAllowed on get",
    feeFs.includes("async getById") && !/async getById[\s\S]{0,120}assertWritesAllowed/.test(feeFs)
  );
}

// --- idempotency plan documented ---
{
  const doc = readFileSync(
    "docs/v5.6I.8-settlement-firestore-persistence-enablement-readiness.md",
    "utf8"
  );
  ok("v56i8 doc exists", doc.length > 500);
  ok("doc phase 0 memory", doc.includes("Phase 0"));
  ok("doc staged enablement", doc.includes("Phase 1") && doc.includes("Phase 5"));
  ok("doc flag matrix", doc.includes("Flag matrix") || doc.includes("flag matrix"));
  ok("doc idempotency", doc.toLowerCase().includes("idempotency"));
  ok("doc backfill plan", doc.toLowerCase().includes("backfill"));
  ok("doc rollback", doc.toLowerCase().includes("rollback"));
  ok("doc fail closed", doc.toLowerCase().includes("fail closed") || doc.includes("fail-closed"));
  ok("doc no PII policy", doc.includes("PII") || doc.includes("buyer phone"));
  ok("doc production hold", doc.toLowerCase().includes("production"));
  ok("doc v56i7 reference", doc.includes("v5.6I.7"));
  ok("doc deterministic record id", doc.includes("sfr-") || doc.includes("deterministic"));
  ok("doc dry-run", doc.toLowerCase().includes("dry-run") || doc.includes("dry run"));
  ok("doc no payment gateway", doc.toLowerCase().includes("payment gateway"));
  ok("doc no invoice", doc.toLowerCase().includes("invoice"));
  ok("doc client no direct firestore", doc.includes("client") && doc.includes("Firestore"));
}

// --- rules already deployed (v5.6I.7) ---
{
  const v57 = readFileSync(
    "docs/v5.6I.7-staging-firestore-rules-deploy-readiness.md",
    "utf8"
  );
  ok("v56i7 rules deploy documented", v57.includes("firestore:rules") && v57.includes("nonga-ce93c"));
  ok("v56i7 phase C pass", v57.includes("Phase C") && v57.includes("PASS"));
  const live = readFileSync("firestore.rules", "utf8");
  ok("live rules settlement deny", live.includes("match /successFeeRecords/{recordId}"));
}

// --- API uses server only (no client settlement SDK) ---
{
  const adminApi = readFileSync("src/services/leads/adminRevenuePreviewApi.ts", "utf8");
  const myApi = readFileSync("src/services/leads/myRevenuePreviewApi.ts", "utf8");
  ok("admin revenue uses /api", adminApi.includes("/api/admin/revenue/preview"));
  ok("seller revenue uses /api", myApi.includes("/api/my/revenue/preview"));
  ok("admin api no firestore sdk", !adminApi.includes("getFirestore"));
  ok("seller api no firestore sdk", !myApi.includes("getFirestore"));
}

console.log("\nDone v5.6I.8 settlement persistence enablement readiness tests.");
