/**
 * v5.6I.3 — Revenue backend source + seller statements
 * npm run test:v56i3-revenue-backend-source-seller-statements
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
  buildAdminRevenuePreviewApiPayload,
  buildSellerRevenuePreviewApiPayload,
  assertRevenuePreviewResponseHasNoBuyerPii,
  assertRevenuePreviewResponseHasNoCommissionWording,
  REVENUE_ESTIMATED_PRICE_LABEL,
} from "../src/services/leads/revenuePreviewBackend.ts";
import { previewSuccessFeeForClosedPrice } from "../src/services/leads/adminRevenuePreview.ts";

const ADMIN_TOKEN = "nonga-v4-dev-admin-token";
const TOKEN_MEMBER_A = "dev-firebase-token-member-a";
const TOKEN_MEMBER_B = "dev-firebase-token-member-b";
const UID_MEMBER_A = "member-test-uid-a";
const UID_MEMBER_B = "member-test-uid-b";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKEN_MEMBER_A]: {
    uid: UID_MEMBER_A,
    email: "member-a@example.test",
    displayName: "Member A",
  },
  [TOKEN_MEMBER_B]: {
    uid: UID_MEMBER_B,
    email: "member-b@example.test",
    displayName: "Member B",
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
  [UID_MEMBER_B]: {
    uid: UID_MEMBER_B,
    email: "member-b@example.test",
    displayName: "Member B",
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
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminApiAuth);
  registerRevenuePreviewRoutes(app, { inventoryRepository });
  return app;
}

// --- pure backend payload ---
{
  const car480 = makePendingCar("car-480k-api", "owner-480", 480_000, "City 480k");
  const car12m = makePendingCar("car-12m-api", "owner-12m", 1_200_000, "City 12m");
  const payload = buildAdminRevenuePreviewApiPayload([car480, car12m]);
  ok("admin payload pending count", payload.summary.pendingSaleCount === 2);
  ok("admin payload closed won count", payload.summary.closedWonCount === 2);
  ok("admin payload fee total 16000", payload.summary.estimatedFeeTotal === 16_000);
  ok("480k fee", previewSuccessFeeForClosedPrice(480_000) === 4_000);
  ok("1.2M fee", previewSuccessFeeForClosedPrice(1_200_000) === 12_000);
  ok("480k row fee", payload.rows.find((r) => r.listingId === "car-480k-api")?.feeAmount === 4_000);
  ok("1.2M row fee", payload.rows.find((r) => r.listingId === "car-12m-api")?.feeAmount === 12_000);
  ok("unbilled total", payload.summary.unbilledTotal === 16_000);
  ok("paid zero", payload.summary.paidTotal === 0);
  ok("readOnly flag", payload.readOnly === true);
  ok("price source estimate", payload.rows[0]?.priceSource === "listing_price_estimate");
  ok("price label", payload.rows[0]?.priceSourceLabel === REVENUE_ESTIMATED_PRICE_LABEL);
  ok("no buyer PII pure", assertRevenuePreviewResponseHasNoBuyerPii(payload));
  ok("no commission pure", assertRevenuePreviewResponseHasNoCommissionWording(payload));
}

// --- seller scope ---
{
  const carA = makePendingCar("car-a", UID_MEMBER_A, 480_000, "Member A car");
  const carB = makePendingCar("car-b", UID_MEMBER_B, 250_000, "Member B car");
  const sellerA = buildSellerRevenuePreviewApiPayload([carA, carB], {
    ownerId: UID_MEMBER_A,
  });
  ok("seller A one row", sellerA.summary.rowCount === 1);
  ok("seller A outstanding 4000", sellerA.summary.outstandingTotal === 4_000);
  ok("seller A no other listing", sellerA.rows.every((r) => r.listingId === "car-a"));
  ok("seller strips admin note", sellerA.rows[0]?.adminNote === undefined);
  ok("seller no buyer PII", assertRevenuePreviewResponseHasNoBuyerPii(sellerA));
}

async function runHttpRouteTests() {
  const ids = ["car-http-480", "car-http-other"];
  for (const id of ids) removeMarketplaceCar(id);
  addMarketplaceCar(makePendingCar("car-http-480", UID_MEMBER_A, 480_000, "HTTP 480k"));
  addMarketplaceCar(makePendingCar("car-http-other", UID_MEMBER_B, 300_000, "Other"));

  const inventoryRepository = createInventoryRepository();
  const app = setupApp(inventoryRepository);
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const admin = await jsonFetch(base, "/api/admin/revenue/preview", {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    ok("admin GET 200", admin.status === 200);
    const adminData = admin.body.data as ReturnType<typeof buildAdminRevenuePreviewApiPayload>;
    ok("admin GET has rows", (adminData?.rows?.length ?? 0) >= 1);
    ok(
      "admin GET includes 480k",
      Boolean(adminData?.rows?.some((r) => r.listingId === "car-http-480"))
    );

    const sellerA = await jsonFetch(base, "/api/my/revenue/preview", {
      headers: {
        Authorization: `Bearer ${TOKEN_MEMBER_A}`,
        "X-Owner-Id": UID_MEMBER_A,
      },
    });
    ok("seller A GET 200", sellerA.status === 200);
    const sellerAData = sellerA.body.data as ReturnType<
      typeof buildSellerRevenuePreviewApiPayload
    >;
    ok("seller A only own", sellerAData.rows.every((r) => r.listingId === "car-http-480"));

    const sellerB = await jsonFetch(base, "/api/my/revenue/preview", {
      headers: {
        Authorization: `Bearer ${TOKEN_MEMBER_B}`,
        "X-Owner-Id": UID_MEMBER_B,
      },
    });
    const sellerBData = sellerB.body.data as ReturnType<
      typeof buildSellerRevenuePreviewApiPayload
    >;
    ok(
      "seller B cannot see A car",
      !sellerBData.rows.some((r) => r.listingId === "car-http-480")
    );

    const noAuth = await jsonFetch(base, "/api/my/revenue/preview");
    ok("seller no auth denied", noAuth.status === 401 || noAuth.status === 403);

    const adminNoToken = await jsonFetch(base, "/api/admin/revenue/preview");
    ok("admin no token 401", adminNoToken.status === 401);
  } finally {
    server.close();
    for (const id of ids) removeMarketplaceCar(id);
  }
}

await runHttpRouteTests();

// --- UI / wiring ---
{
  const adminUi = readFileSync(
    "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
    "utf8"
  );
  ok("admin ui fetches api", adminUi.includes("fetchAdminRevenuePreview"));
  ok("admin ui loading state", adminUi.includes("admin-revenue-loading"));
  ok("admin ui error state", adminUi.includes("admin-revenue-error"));
  ok("admin ui backend source", adminUi.includes('data-source="backend-api"'));
  ok("admin ui no listings prop derive", !adminUi.includes("deriveAdminRevenuePreviewRowsFromListings"));
  ok("admin ui no submit", !adminUi.includes('type="submit"'));
  ok("admin ui no invoice", !adminUi.includes("ออกใบแจ้งหนี้"));

  const dash = readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");
  ok("dash no adminState.cars revenue", !dash.includes("listings={adminState.cars}"));

  const my = readFileSync("src/components/MyListingsView.tsx", "utf8");
  ok("my listings revenue section", my.includes("MyRevenueStatementSection"));
  ok("my listings seller statement component", my.includes("MyRevenueStatementSection"));

  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("route admin preview", routes.includes("/api/admin/revenue/preview"));
  ok("route seller preview", routes.includes("/api/my/revenue/preview"));
  ok("route no write", !routes.includes(".post(") && !routes.includes(".patch("));
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.3-revenue-backend-source-and-seller-statements.md",
    "utf8"
  );
  ok("doc read-only", doc.includes("read-only"));
  ok("doc no payment", doc.includes("ยังไม่เปิด payment"));
  ok("doc v5.6I.4", doc.includes("v5.6I.4"));
  ok("doc audit", doc.includes("audit"));
}

console.log("\nDone v5.6I.3 revenue backend source + seller statements tests.");
if (process.exitCode) process.exit(process.exitCode);
