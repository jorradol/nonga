/**
 * v5.6I.4 — Admin manual settlement adjustments + audit log
 * npm run test:v56i4-admin-manual-settlement-adjustments
 */
import express from "express";
import { readFileSync } from "node:fs";
import { adminApiAuth } from "../src/server/apiAuth.ts";
import {
  addMarketplaceCar,
  removeMarketplaceCar,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { registerRevenuePreviewRoutes } from "../src/server/revenuePreviewRoutes.ts";
import {
  createInventoryRepository,
  type InventoryRepository,
} from "../src/server/repositories/inventoryRepository.ts";
import {
  resetSettlementAdjustmentRepositoryForTests,
} from "../src/server/repositories/settlementAdjustmentRepository.ts";
import {
  applySettlementAdjustment,
  assertAdjustmentAuditHasNoPaymentGatewayFields,
  previewRowToAdjustmentBase,
  SETTLEMENT_ADJUSTMENT_MANUAL_WARNING,
  validateSettlementAdjustmentInput,
} from "../src/services/leads/settlementAdjustmentService.ts";
import {
  buildAdminRevenuePreviewApiPayload,
  buildSellerRevenuePreviewApiPayload,
  assertRevenuePreviewResponseHasNoBuyerPii,
} from "../src/services/leads/revenuePreviewBackend.ts";
import { deriveAdminRevenuePreviewRowsFromListings } from "../src/services/leads/adminRevenuePreview.ts";
import { marketplaceCarToRevenueListingSource } from "../src/services/leads/revenuePreviewBackend.ts";

const ADMIN_TOKEN = "nonga-v4-dev-admin-token";
const TOKEN_MEMBER_A = "dev-firebase-token-member-a";
const UID_MEMBER_A = "member-test-uid-a";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKEN_MEMBER_A]: {
    uid: UID_MEMBER_A,
    email: "member-a@example.test",
    displayName: "Member A",
  },
});
process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [UID_MEMBER_A]: {
    uid: UID_MEMBER_A,
    email: "member-a@example.test",
    displayName: "Member A",
    role: "member",
    status: "active",
  },
});

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
    brand: "Honda",
    model: "City",
    year: 2020,
    price,
    type: "used",
    condition: "good",
    mileage: 50000,
    fuelType: "gasoline",
    description: "test",
    images: [],
    ownerId,
    ownerName: "Test Owner",
    ownerPhone: "0812345678",
    isSold: false,
    listingStatus: "hidden",
    saleStatus: "pending_sale",
    pendingSaleAt: "2026-06-03T10:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
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
  resetSettlementAdjustmentRepositoryForTests();
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminApiAuth);
  registerRevenuePreviewRoutes(app, { inventoryRepository });
  return app;
}

function baseStateFromListing(car: MarketplaceCarRecord) {
  const row = deriveAdminRevenuePreviewRowsFromListings([
    marketplaceCarToRevenueListingSource(car),
  ])[0]!;
  return previewRowToAdjustmentBase(row);
}

// --- pure apply / validation ---
{
  const car = makePendingCar("car-pure", UID_MEMBER_A, 480_000, "Pure");
  const current = baseStateFromListing(car);
  ok("base fee 4000", current.feeAmount === 4_000);
  ok("base remaining 4000", current.remainingAmount === 4_000);

  const partial = applySettlementAdjustment(current, {
    listingId: car.id,
    action: "partial_payment",
    amount: 1_500,
    reason: "ชำระบางส่วนผ่านโอน",
    updatedBy: "admin",
    updatedByRole: "admin",
  });
  ok("partial paid 1500", partial.next.paidAmount === 1_500);
  ok("partial remaining 2500", partial.next.remainingAmount === 2_500);
  ok("partial status", partial.next.settlementStatus === "partially_paid");
  ok(
    "audit previous remaining",
    partial.audit.previousRemainingAmount === 4_000
  );
  ok("audit new remaining", partial.audit.newRemainingAmount === 2_500);
  ok("audit action", partial.audit.action === "partial_payment");
  ok("audit reason", partial.audit.reason.includes("ชำระ"));
  ok("audit updatedBy", partial.audit.updatedBy === "admin");
  ok("no gateway fields", assertAdjustmentAuditHasNoPaymentGatewayFields({
    ...partial.audit,
    id: "a1",
    createdAt: new Date().toISOString(),
  }));

  const paid = applySettlementAdjustment(partial.next, {
    listingId: car.id,
    action: "mark_paid",
    reason: "ชำระครบแล้ว",
    updatedBy: "admin",
    updatedByRole: "superadmin",
  });
  ok("mark paid remaining 0", paid.next.remainingAmount === 0);
  ok("mark paid status", paid.next.settlementStatus === "paid");

  const waived = applySettlementAdjustment(current, {
    listingId: car.id,
    action: "waive_fee",
    reason: "ยกเว้นตามข้อตกลง",
    updatedBy: "admin",
    updatedByRole: "admin",
  });
  ok("waive remaining 0", waived.next.remainingAmount === 0);
  ok("waive status", waived.next.settlementStatus === "waived");

  const disputed = applySettlementAdjustment(current, {
    listingId: car.id,
    action: "dispute_fee",
    reason: "ผู้ขายโต้แย้งยอด",
    updatedBy: "admin",
    updatedByRole: "admin",
  });
  ok("dispute status", disputed.next.settlementStatus === "disputed");

  const cancelled = applySettlementAdjustment(current, {
    listingId: car.id,
    action: "cancel_fee",
    reason: "ยกเลิกรายการ",
    updatedBy: "admin",
    updatedByRole: "admin",
  });
  ok("cancel status", cancelled.next.settlementStatus === "cancelled");
  ok("cancel remaining 0", cancelled.next.remainingAmount === 0);

  const manual = applySettlementAdjustment(current, {
    listingId: car.id,
    action: "manual_adjustment",
    newFeeAmount: 3_000,
    reason: "ปรับตามข้อตกลง",
    updatedBy: "admin",
    updatedByRole: "admin",
  });
  ok("manual fee 3000", manual.next.feeAmount === 3_000);
  ok(
    "manual audit prev fee",
    manual.audit.previousFeeAmount === 4_000 &&
      manual.audit.newFeeAmount === 3_000
  );

  const noReason = validateSettlementAdjustmentInput(
    {
      listingId: car.id,
      action: "partial_payment",
      amount: 100,
      reason: "",
      updatedBy: "admin",
      updatedByRole: "admin",
    },
    current
  );
  ok("reason required", noReason.ok === false);

  const negative = validateSettlementAdjustmentInput(
    {
      listingId: car.id,
      action: "partial_payment",
      amount: -100,
      reason: "bad",
      updatedBy: "admin",
      updatedByRole: "admin",
    },
    current
  );
  ok("invalid negative amount", negative.ok === false);

  const overpay = validateSettlementAdjustmentInput(
    {
      listingId: car.id,
      action: "partial_payment",
      amount: 9_999,
      reason: "too much",
      updatedBy: "admin",
      updatedByRole: "admin",
    },
    current
  );
  ok("remaining never negative guard", overpay.ok === false);
}

// --- overlay on preview payload ---
{
  const car = makePendingCar("car-overlay", UID_MEMBER_A, 480_000, "Overlay");
  const base = buildAdminRevenuePreviewApiPayload([car]);
  ok("payload manual enabled", base.manualAdjustmentsEnabled === true);
  ok("payload manual warning", base.manualAdjustmentWarning.includes("Manual"));

  const current = baseStateFromListing(car);
  const { next } = applySettlementAdjustment(current, {
    listingId: car.id,
    action: "partial_payment",
    amount: 1_000,
    reason: "overlay test",
    updatedBy: "admin",
    updatedByRole: "admin",
  });
  const overlay = {
    statesByListingId: new Map([[car.id, next]]),
    auditsByListingId: new Map(),
  };
  const merged = buildAdminRevenuePreviewApiPayload([car], overlay);
  const row = merged.rows[0];
  ok("overlay paid 1000", row?.paidAmount === 1_000);
  ok("overlay remaining 3000", row?.remainingAmount === 3_000);
  ok("overlay hasManualAdjustment", row?.hasManualAdjustment === true);

  const seller = buildSellerRevenuePreviewApiPayload([car], {
    ownerId: UID_MEMBER_A,
  }, overlay);
  ok("seller outstanding 3000", seller.summary.outstandingTotal === 3_000);
  ok("seller no admin note", seller.rows[0]?.adminNote === undefined);
  ok("seller no audit", seller.rows[0]?.auditLogPreview === undefined);
  ok("seller no buyer PII", assertRevenuePreviewResponseHasNoBuyerPii(seller));
}

async function runHttpTests() {
  resetSettlementAdjustmentRepositoryForTests();
  const inventoryRepository = createInventoryRepository();
  const app = setupApp(inventoryRepository);
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;
  const carId = "car-i4-http";
  const car = makePendingCar(carId, UID_MEMBER_A, 480_000, "HTTP car");

  try {
    await addMarketplaceCar(car);

    const adminHeaders = {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    };
    const superHeaders = {
      ...adminHeaders,
      "X-User-Role": "superadmin",
    };
    const memberHeaders = {
      Authorization: `Bearer ${TOKEN_MEMBER_A}`,
      "Content-Type": "application/json",
    };

    const partial = await jsonFetch(base, "/api/admin/revenue/adjustments", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        listingId: carId,
        action: "partial_payment",
        amount: 500,
        reason: "admin partial",
      }),
    });
    ok("admin partial 200", partial.status === 200);
    ok("admin partial success", partial.body.success === true);

    const superPartial = await jsonFetch(base, "/api/admin/revenue/adjustments", {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        listingId: carId,
        action: "partial_payment",
        amount: 500,
        reason: "superadmin partial",
      }),
    });
    ok("superadmin partial 200", superPartial.status === 200);

    const denied = await jsonFetch(base, "/api/admin/revenue/adjustments", {
      method: "POST",
      headers: memberHeaders,
      body: JSON.stringify({
        listingId: carId,
        action: "partial_payment",
        amount: 100,
        reason: "member hack",
      }),
    });
    ok("non-admin denied", denied.status === 401 || denied.status === 403);

    const noReason = await jsonFetch(base, "/api/admin/revenue/adjustments", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        listingId: carId,
        action: "mark_paid",
        reason: "",
      }),
    });
    ok("reason required http", noReason.status === 400);

    const preview = await jsonFetch(base, "/api/admin/revenue/preview", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    ok("preview after adjust 200", preview.status === 200);
    const data = preview.body.data as {
      rows: Array<{ listingId: string; paidAmount: number; auditLogPreview?: unknown[] }>;
    };
    const row = data.rows.find((r) => r.listingId === carId);
    ok("preview row paid 1000", row?.paidAmount === 1_000);
    ok("preview audit present", (row?.auditLogPreview?.length ?? 0) >= 2);

    const sellerPreview = await jsonFetch(base, "/api/my/revenue/preview", {
      headers: {
        Authorization: `Bearer ${TOKEN_MEMBER_A}`,
        "X-Owner-Id": UID_MEMBER_A,
      },
    });
    ok("seller preview 200", sellerPreview.status === 200);
    const sellerData = sellerPreview.body.data as {
      summary: { outstandingTotal: number };
      rows: Array<{ remainingAmount: number }>;
    };
    ok(
      "seller reflects adjusted balance",
      sellerData.summary.outstandingTotal === 3_000
    );
    ok("seller row remaining 3000", sellerData.rows[0]?.remainingAmount === 3_000);
  } finally {
    await removeMarketplaceCar(carId);
    server.close();
  }
}

// --- static UI / route wiring ---
{
  const adminUi = readFileSync(
    "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
    "utf8"
  );
  const modal = readFileSync(
    "src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx",
    "utf8"
  );
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("admin adjust btn", adminUi.includes("admin-revenue-adjust-btn"));
  ok("admin refetch after adjust", adminUi.includes("postAdminRevenueAdjustment"));
  ok("admin success message", adminUi.includes("admin-revenue-adjustment-success"));
  ok("modal reason field", modal.includes("admin-revenue-adjustment-reason"));
  ok("modal submit confirm label", modal.includes("ยืนยันปรับยอด"));
  ok("modal footer area", modal.includes("admin-revenue-adjustment-modal-footer"));
  ok("modal error stays open", modal.includes("admin-revenue-adjustment-error"));
  ok(
    "failure no optimistic local patch",
    !adminUi.includes("setPayload((prev)") &&
      !adminUi.includes("setPayload(prev =>")
  );
  ok("post route", routes.includes('app.post("/api/admin/revenue/adjustments"'));
  ok("no payment gateway route", !routes.includes("paymentIntent"));
  ok("no invoice write", !routes.includes("createInvoice"));
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.4-admin-manual-settlement-adjustments.md",
    "utf8"
  );
  ok("doc no payment gateway", doc.includes("Payment gateway"));
  ok("doc no invoice", doc.includes("invoice"));
  ok("doc audit log", doc.includes("audit"));
  ok("doc memory restart", doc.includes("restart"));
  ok("doc production policy", doc.includes("production"));
  ok("doc manual warning", doc.includes("Manual"));
}

await runHttpTests();

console.log("\nDone v5.6I.4 admin manual settlement adjustments tests.");
