/**
 * v5.6I.9 — Settlement adjustment transaction + idempotency guardrails
 * npm run test:v56i9-settlement-transaction-idempotency
 */
import { readFileSync } from "node:fs";
import express from "express";
import {
  createSettlementAdjustmentRepository,
  resetSettlementAdjustmentRepositoryForTests,
} from "../src/server/repositories/settlementAdjustmentRepository.ts";
import { createFirestoreSettlementAdjustmentRepository } from "../src/server/repositories/settlementAdjustmentRepositoryFirestore.ts";
import {
  SettlementAdjustmentAuditInvariantError,
  computeAdjustmentWithAuditDraft,
} from "../src/services/leads/settlementAdjustmentApply.ts";
import {
  applySettlementAdjustment,
  previewRowToAdjustmentBase,
} from "../src/services/leads/settlementAdjustmentService.ts";
import { deriveAdminRevenuePreviewRowsFromListings } from "../src/services/leads/adminRevenuePreview.ts";
import {
  assertSettlementPersistenceReadinessDefaults,
  isSettlementFirestoreWritesEnabled,
} from "../src/services/leads/settlementPersistenceFlags.ts";
import {
  SettlementAdjustmentIdempotencyConflictError,
  buildDeterministicAdjustmentAuditId,
  generateServerSettlementRequestId,
  resolveSettlementRequestId,
} from "../src/services/leads/settlementIdempotency.ts";
import { adminApiAuth } from "../src/server/apiAuth.ts";
import { registerRevenuePreviewRoutes } from "../src/server/revenuePreviewRoutes.ts";
import {
  createInventoryRepository,
  type InventoryRepository,
} from "../src/server/repositories/inventoryRepository.ts";
import {
  addMarketplaceCar,
  removeMarketplaceCar,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";

const ADMIN_TOKEN = "nonga-v4-dev-admin-token";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function makePendingCar(
  id: string,
  ownerId: string,
  price: number,
  title: string
): MarketplaceCarRecord {
  return {
    id,
    title,
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price,
    type: "used",
    condition: "good",
    mileage: 50_000,
    fuelType: "petrol",
    images: [],
    description: "test",
    ownerId,
    ownerName: "Test Owner",
    ownerPhone: "",
    isSold: false,
    dealerId: ownerId,
    listingStatus: "published",
    saleStatus: "pending_sale",
    createdAt: "2026-06-06T00:00:00.000Z",
  };
}

function baseStateFromListing(car: MarketplaceCarRecord) {
  const rows = deriveAdminRevenuePreviewRowsFromListings([
    {
      id: car.id,
      title: car.title,
      price: car.price,
      ownerId: car.ownerId,
      dealerId: car.dealerId,
      saleStatus: car.saleStatus,
    },
  ]);
  return previewRowToAdjustmentBase(rows[0]!, { dealerId: car.dealerId });
}

async function jsonFetch(
  base: string,
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${base}${path}`, init);
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

function setupApp(inventoryRepository: InventoryRepository) {
  const app = express();
  app.use(express.json());
  app.use(adminApiAuth);
  registerRevenuePreviewRoutes(app, { inventoryRepository });
  return app;
}

// --- flags still default ---
{
  ok("persistence defaults off", assertSettlementPersistenceReadinessDefaults({}));
  ok("firestore writes off", !isSettlementFirestoreWritesEnabled({}));
}

// --- applyAdjustmentWithAudit atomic memory ---
{
  resetSettlementAdjustmentRepositoryForTests();
  const repo = createSettlementAdjustmentRepository();
  const car = makePendingCar("list-i9-atomic", "seller-i9", 500_000, "Atomic");
  const current = baseStateFromListing(car);
  const requestId = "req-i9-atomic-1";

  const first = await repo.applyAdjustmentWithAudit({
    current,
    requestId,
    input: {
      listingId: car.id,
      action: "partial_payment",
      amount: 500,
      reason: "atomic test",
      updatedBy: "admin-i9",
      updatedByRole: "admin",
    },
  });
  ok("processed outcome", first.outcome === "processed");
  ok("state written", first.state.paidAmount === 500);
  ok("audit written", first.audit.amountDelta === 500);

  const audits = await repo.listAuditByListingId(car.id);
  ok("single audit row", audits.length === 1);
  ok(
    "deterministic audit id",
    first.audit.id === buildDeterministicAdjustmentAuditId(requestId, car.id)
  );
}

// --- duplicate same requestId ---
{
  resetSettlementAdjustmentRepositoryForTests();
  const repo = createSettlementAdjustmentRepository();
  const car = makePendingCar("list-i9-dup", "seller-i9", 500_000, "Dup");
  const current = baseStateFromListing(car);
  const requestId = "req-i9-dup-1";
  const input = {
    listingId: car.id,
    action: "partial_payment" as const,
    amount: 700,
    reason: "dup test",
    updatedBy: "admin-i9",
    updatedByRole: "admin" as const,
  };

  const a = await repo.applyAdjustmentWithAudit({ current, requestId, input });
  const b = await repo.applyAdjustmentWithAudit({
    current: a.state,
    requestId,
    input,
  });
  ok("second is duplicate", b.outcome === "duplicate");
  ok("same audit id", a.audit.id === b.audit.id);
  const audits = await repo.listAuditByListingId(car.id);
  ok("no duplicate audit append", audits.length === 1);
}

// --- conflict same requestId different payload ---
{
  resetSettlementAdjustmentRepositoryForTests();
  const repo = createSettlementAdjustmentRepository();
  const car = makePendingCar("list-i9-conflict", "seller-i9", 500_000, "Conflict");
  const current = baseStateFromListing(car);
  const requestId = "req-i9-conflict-1";

  await repo.applyAdjustmentWithAudit({
    current,
    requestId,
    input: {
      listingId: car.id,
      action: "partial_payment",
      amount: 100,
      reason: "first",
      updatedBy: "admin-i9",
      updatedByRole: "admin",
    },
  });

  let conflict = false;
  try {
    await repo.applyAdjustmentWithAudit({
      current,
      requestId,
      input: {
        listingId: car.id,
        action: "partial_payment",
        amount: 200,
        reason: "second",
        updatedBy: "admin-i9",
        updatedByRole: "admin",
      },
    });
  } catch (err) {
    conflict = err instanceof SettlementAdjustmentIdempotencyConflictError;
  }
  ok("conflict on payload mismatch", conflict);
}

// --- audit invariant fail does not write state ---
{
  resetSettlementAdjustmentRepositoryForTests();
  const repo = createSettlementAdjustmentRepository();
  const car = makePendingCar("list-i9-inv", "seller-i9", 500_000, "Inv");
  const current = baseStateFromListing(car);

  let threw = false;
  try {
    await repo.applyAdjustmentWithAudit({
      current,
      requestId: "req-i9-pii",
      input: {
        listingId: car.id,
        action: "admin_note",
        reason: "เบอร์ 0812345678",
        updatedBy: "admin-i9",
        updatedByRole: "admin",
      },
    });
  } catch (err) {
    threw = err instanceof SettlementAdjustmentAuditInvariantError;
  }
  ok("pii in reason rejected", threw);
  const state = await repo.getStateByListingId(car.id);
  ok("state unchanged after invariant fail", state === null);
  const audits = await repo.listAuditByListingId(car.id);
  ok("no audit after invariant fail", audits.length === 0);
}

// --- computeAdjustmentWithAuditDraft validates before write path ---
{
  const car = makePendingCar("list-i9-draft", "seller-i9", 500_000, "Draft");
  const current = baseStateFromListing(car);
  let draftErr = false;
  try {
    computeAdjustmentWithAuditDraft({
      current,
      requestId: "req-draft",
      input: {
        listingId: car.id,
        action: "partial_payment",
        amount: 0,
        reason: "",
        updatedBy: "admin-i9",
        updatedByRole: "admin",
      },
    });
  } catch {
    draftErr = true;
  }
  ok("draft validation fails on bad input", draftErr);
}

// --- missing requestId backward compatible (server generates) ---
{
  const generated = resolveSettlementRequestId(undefined);
  ok("server generates requestId", generated.startsWith("srv-"));
  const provided = resolveSettlementRequestId("client-req-abc");
  ok("client requestId preserved", provided === "client-req-abc");
}

// --- Firestore repo still write-gated ---
{
  const fsRepoSrc = readFileSync(
    "src/server/repositories/settlementAdjustmentRepositoryFirestore.ts",
    "utf8"
  );
  ok("firestore uses runTransaction", fsRepoSrc.includes("runTransaction"));
  ok("firestore applyAdjustmentWithAudit exists", fsRepoSrc.includes("applyAdjustmentWithAudit"));
  ok("firestore assertWritesAllowed in apply", /applyAdjustmentWithAudit[\s\S]*assertWritesAllowed/.test(fsRepoSrc));

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
  ok("firestore init still needs creds", initFailed);
}

// --- route uses applyAdjustmentWithAudit ---
{
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("route calls applyAdjustmentWithAudit", routes.includes("applyAdjustmentWithAudit"));
  ok("route resolves requestId", routes.includes("resolveSettlementRequestId"));
  ok("route 409 conflict", routes.includes("SettlementAdjustmentIdempotencyConflictError"));
  ok("route returns idempotency outcome", routes.includes("idempotency:"));
}

// --- frontend requestId ---
{
  const modal = readFileSync(
    "src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx",
    "utf8"
  );
  ok("modal requestId ref", modal.includes("requestIdRef"));
  ok("modal passes requestId", modal.includes("requestId: requestIdRef.current"));
  ok("modal submitting guard", modal.includes("submitting"));
}

// --- HTTP idempotency ---
async function runHttpTests() {
  resetSettlementAdjustmentRepositoryForTests();
  const inventoryRepository = createInventoryRepository();
  const app = setupApp(inventoryRepository);
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;
  const carId = "car-i9-http";
  const car = makePendingCar(carId, "member-i9", 480_000, "HTTP i9");

  try {
    await addMarketplaceCar(car);
    const headers = {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    };
    const body = {
      listingId: carId,
      action: "partial_payment",
      amount: 400,
      reason: "http idempotency",
      requestId: "req-i9-http-1",
    };

    const first = await jsonFetch(base, "/api/admin/revenue/adjustments", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    ok("http first 200", first.status === 200);
    const data1 = first.body.data as Record<string, unknown>;
    const idem1 = data1?.idempotency as { outcome?: string };
    ok("http first processed", idem1?.outcome === "processed");

    const second = await jsonFetch(base, "/api/admin/revenue/adjustments", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    ok("http duplicate 200", second.status === 200);
    const data2 = second.body.data as Record<string, unknown>;
    const idem2 = data2?.idempotency as { outcome?: string };
    ok("http duplicate outcome", idem2?.outcome === "duplicate");

    const conflict = await jsonFetch(base, "/api/admin/revenue/adjustments", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, amount: 999 }),
    });
    ok("http conflict 409", conflict.status === 409);
  } finally {
    removeMarketplaceCar(carId);
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

await runHttpTests();

// --- preview derive still works ---
{
  const car = makePendingCar("list-i9-preview", "seller-i9", 600_000, "Preview");
  const rows = deriveAdminRevenuePreviewRowsFromListings([
    {
      id: car.id,
      price: car.price,
      ownerId: car.ownerId,
      dealerId: car.dealerId,
      saleStatus: "pending_sale",
    },
  ]);
  ok("preview derive unchanged", rows.length === 1);
  const { next } = applySettlementAdjustment(baseStateFromListing(car), {
    listingId: car.id,
    action: "mark_paid",
    reason: "paid",
    updatedBy: "admin",
    updatedByRole: "admin",
  });
  ok("pure apply still works", next.settlementStatus === "paid");
}

// --- doc ---
{
  const doc = readFileSync(
    "docs/v5.6I.9-settlement-transaction-idempotency-guardrails.md",
    "utf8"
  );
  ok("doc exists", doc.length > 400);
  ok("doc transaction invariant", doc.toLowerCase().includes("transaction"));
  ok("doc idempotency", doc.toLowerCase().includes("idempotency"));
  ok("doc no pii", doc.includes("PII"));
  ok("doc production hold", doc.toLowerCase().includes("production"));
}

console.log("\nDone v5.6I.9 settlement transaction + idempotency tests.");
