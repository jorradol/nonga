import express from "express";
import {
  addMarketplaceCar,
  removeMarketplaceCar,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { registerOwnerListingRoutes } from "../src/server/ownerListingRoutes.ts";

const TOKEN_DEALER_A = "dev-firebase-token-owner-dealer-a";
const TOKEN_DEALER_B = "dev-firebase-token-owner-dealer-b";
const UID_DEALER_A = "owner-test-dealer-a";
const UID_DEALER_B = "owner-test-dealer-b";
const DEALER_A = "owner-secure-a";
const DEALER_B = "owner-secure-b";

process.env.NONGA_DEALER_TOKEN_MAP = "";
process.env.NONGA_BETA_DEALER_ID = "";
process.env.NONGA_DEALER_API_TOKEN = "";
process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKEN_DEALER_A]: {
    uid: UID_DEALER_A,
    email: "dealer-a@example.test",
    displayName: "Owner Dealer A",
  },
  [TOKEN_DEALER_B]: {
    uid: UID_DEALER_B,
    email: "dealer-b@example.test",
    displayName: "Owner Dealer B",
  },
});
process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [UID_DEALER_A]: {
    uid: UID_DEALER_A,
    email: "dealer-a@example.test",
    displayName: "Owner Dealer A",
    role: "dealer",
    status: "active",
    dealerId: DEALER_A,
  },
  [UID_DEALER_B]: {
    uid: UID_DEALER_B,
    email: "dealer-b@example.test",
    displayName: "Owner Dealer B",
    role: "dealer",
    status: "active",
    dealerId: DEALER_B,
  },
});
process.env.NONGA_DEV_DEALER_MEMBERSHIP_MAP = JSON.stringify({
  [UID_DEALER_A]: [
    {
      uid: UID_DEALER_A,
      dealerId: DEALER_A,
      roleInDealer: "owner",
      status: "active",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    },
  ],
  [UID_DEALER_B]: [
    {
      uid: UID_DEALER_B,
      dealerId: DEALER_B,
      roleInDealer: "owner",
      status: "active",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    },
  ],
});

function makeCar(id: string, dealerId: string): MarketplaceCarRecord {
  return {
    id,
    title: `Test ${dealerId}`,
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 300000,
    type: "used",
    condition: "used",
    mileage: 10000,
    fuelType: "petrol",
    images: [],
    description: "owner route auth test",
    dealerId,
    ownerId: `owner-${dealerId}`,
    ownerName: dealerId,
    ownerPhone: "000",
    showroomName: dealerId,
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
  };
}

function authHeaders(token: string, extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function run() {
  console.log("=== Nong A v5.0 Legacy Owner Auth Smoke ===");

  const carAId = `car-${Date.now()}101`;
  const carBId = `car-${Date.now()}202`;
  addMarketplaceCar(makeCar(carAId, DEALER_A));
  addMarketplaceCar(makeCar(carBId, DEALER_B));

  const app = express();
  app.use(express.json({ limit: "10mb" }));
  registerOwnerListingRoutes(app);

  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to start test server");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    let res = await fetch(`${baseUrl}/api/cars/${carAId}`, {
      method: "PATCH",
      headers: authHeaders(TOKEN_DEALER_A),
      body: JSON.stringify({
        title: "Dealer A patched",
        ownerId: `owner-${DEALER_B}`,
      }),
    });
    if (!res.ok) throw new Error("dealer A could not edit dealer A car");
    console.log("PASS dealer A edits dealer A car");

    res = await fetch(`${baseUrl}/api/cars/${carBId}`, {
      method: "PATCH",
      headers: authHeaders(TOKEN_DEALER_A),
      body: JSON.stringify({
        title: "spoofed",
        ownerId: `owner-${DEALER_B}`,
      }),
    });
    if (res.status !== 403) throw new Error("dealer A edited dealer B car");
    console.log("PASS dealer A cannot edit dealer B car");

    res = await fetch(`${baseUrl}/api/my/listings`, {
      headers: authHeaders(TOKEN_DEALER_A, {
        "X-Owner-Id": `owner-${DEALER_B}`,
      }),
    });
    if (!res.ok) throw new Error("/api/my/listings failed for dealer A");
    const listings = (await res.json()) as {
      data?: Array<{ id: string; dealerId?: string }>;
    };
    const ids = new Set((listings.data ?? []).map((item) => item.id));
    if (!ids.has(carAId) || ids.has(carBId)) {
      throw new Error("/api/my/listings leaked another dealer listing");
    }
    console.log("PASS /api/my/listings ignores spoofed X-Owner-Id");

    res = await fetch(`${baseUrl}/api/cars/${carBId}/images`, {
      method: "POST",
      headers: authHeaders(TOKEN_DEALER_A),
      body: JSON.stringify({ files: [] }),
    });
    if (res.status !== 403) {
      throw new Error("dealer A uploaded images to dealer B car");
    }
    console.log("PASS image upload across dealer blocked");

    res = await fetch(`${baseUrl}/api/cars/${carAId}/visibility`, {
      method: "PATCH",
      headers: authHeaders(TOKEN_DEALER_A),
      body: JSON.stringify({ hidden: true, ownerId: `owner-${DEALER_B}` }),
    });
    if (!res.ok) throw new Error("dealer A visibility update failed");
    console.log("PASS visibility update uses auth scope");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    removeMarketplaceCar(carAId);
    removeMarketplaceCar(carBId);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
