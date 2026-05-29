import express from "express";
import {
  addMarketplaceCar,
  removeMarketplaceCar,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { registerOwnerListingRoutes } from "../src/server/ownerListingRoutes.ts";
import {
  createInventoryRepository,
  type InventoryRepository,
  type ListingRepository,
  type ListingVisibility,
} from "../src/server/repositories/inventoryRepository.ts";

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
  const inventoryRepository = createInventoryRepository("file");
  registerOwnerListingRoutes(app, { inventoryRepository });

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

    /** Listing exists only in inventory repository (Firestore path) — must not 404 on image upload */
    class RepoOnlyListingRepository implements ListingRepository {
      private readonly inner = inventoryRepository.listings;
      private readonly onlyInRepo = new Map<string, MarketplaceCarRecord>();

      async listPublished() {
        return this.inner.listPublished();
      }
      async listByDealer(dealerId: string) {
        return this.inner.listByDealer(dealerId);
      }
      async getById(id: string) {
        return this.onlyInRepo.get(id) ?? this.inner.getById(id);
      }
      async createListing(dealerId: string, record: MarketplaceCarRecord) {
        const created = await this.inner.createListing(dealerId, record);
        this.onlyInRepo.set(created.id, created);
        return created;
      }
      async updateListing(
        dealerId: string,
        id: string,
        patch: Partial<MarketplaceCarRecord>
      ) {
        return this.inner.updateListing(dealerId, id, patch);
      }
      async updateVisibility(
        dealerId: string,
        id: string,
        visibility: ListingVisibility
      ) {
        return this.inner.updateVisibility(dealerId, id, visibility);
      }
      async deleteListing(dealerId: string, id: string) {
        this.onlyInRepo.delete(id);
        return this.inner.deleteListing(dealerId, id);
      }
    }

    const repoOnlyId = `car-${Date.now()}303`;
    const repoOnlyCar = makeCar(repoOnlyId, DEALER_A);
    const repoOnlyListingRepo = new RepoOnlyListingRepository();
    const repoOnlyInventory: InventoryRepository = {
      backend: "firestore",
      listings: repoOnlyListingRepo,
      drafts: inventoryRepository.drafts,
      publishDraft: inventoryRepository.publishDraft.bind(inventoryRepository),
    };
    await repoOnlyListingRepo.createListing(DEALER_A, repoOnlyCar);
    removeMarketplaceCar(repoOnlyId);

    const repoApp = express();
    repoApp.use(express.json({ limit: "10mb" }));
    registerOwnerListingRoutes(repoApp, { inventoryRepository: repoOnlyInventory });
    const repoServer = repoApp.listen(0);
    const repoAddress = repoServer.address();
    if (!repoAddress || typeof repoAddress === "string") {
      throw new Error("failed to start repo-only test server");
    }
    const repoBaseUrl = `http://127.0.0.1:${repoAddress.port}`;
    try {
      res = await fetch(`${repoBaseUrl}/api/cars/${repoOnlyId}/images`, {
        method: "POST",
        headers: authHeaders(TOKEN_DEALER_A),
        body: JSON.stringify({ files: [] }),
      });
      if (res.status !== 400) {
        throw new Error(
          `repo-only listing should reach upload handler (400), got ${res.status}`
        );
      }
      console.log("PASS image upload resolves listing via inventory repository");
    } finally {
      await new Promise<void>((resolve) => repoServer.close(() => resolve()));
      await repoOnlyListingRepo.deleteListing(DEALER_A, repoOnlyId);
    }
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
