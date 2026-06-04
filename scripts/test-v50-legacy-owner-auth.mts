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
const TOKEN_MEMBER = "dev-firebase-token-member-a";
const UID_DEALER_A = "owner-test-dealer-a";
const UID_DEALER_B = "owner-test-dealer-b";
const UID_MEMBER = "member-test-uid-001";
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
  [TOKEN_MEMBER]: {
    uid: UID_MEMBER,
    email: "member-a@example.test",
    displayName: "Member A",
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
  [UID_MEMBER]: {
    uid: UID_MEMBER,
    email: "member-a@example.test",
    displayName: "Member A",
    role: "member",
    status: "active",
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

function makeMemberCar(id: string, ownerId: string): MarketplaceCarRecord {
  return {
    id,
    title: "Member chat listing",
    brand: "Honda",
    model: "City",
    year: 2021,
    price: 450000,
    type: "used",
    condition: "used",
    mileage: 20000,
    fuelType: "petrol",
    images: [],
    description: "member my listings test",
    ownerId,
    ownerName: "Member A",
    ownerPhone: "081",
    isSold: false,
    listingStatus: "hidden",
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
      async listAll() {
        const fromInner = await this.inner.listAll();
        const fromOnly = [...this.onlyInRepo.values()];
        const merged = new Map<string, MarketplaceCarRecord>();
        for (const car of [...fromInner, ...fromOnly]) merged.set(car.id, car);
        return [...merged.values()];
      }
      async listByDealer(dealerId: string) {
        const fromInner = await this.inner.listByDealer(dealerId);
        const fromOnly = [...this.onlyInRepo.values()].filter(
          (car) =>
            car.dealerId === dealerId ||
            car.ownerId === dealerId ||
            (!car.dealerId && car.ownerId === dealerId)
        );
        const merged = new Map<string, MarketplaceCarRecord>();
        for (const car of [...fromInner, ...fromOnly]) merged.set(car.id, car);
        return [...merged.values()];
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
    const memberListingId = `car-${Date.now()}404`;
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

      const memberCar = makeMemberCar(memberListingId, UID_MEMBER);
      await repoOnlyListingRepo.createListing(UID_MEMBER, memberCar);
      removeMarketplaceCar(memberListingId);

      res = await fetch(`${repoBaseUrl}/api/my/listings`, {
        headers: authHeaders(TOKEN_MEMBER),
      });
      if (!res.ok) {
        throw new Error(`member /api/my/listings failed with ${res.status}`);
      }
      const memberListings = (await res.json()) as {
        data?: Array<{ id: string; listingStatus?: string }>;
      };
      const memberIds = new Set((memberListings.data ?? []).map((item) => item.id));
      if (!memberIds.has(memberListingId)) {
        throw new Error(
          "hidden member listing created via repository missing from GET /api/my/listings"
        );
      }
      const hiddenMember = (memberListings.data ?? []).find(
        (item) => item.id === memberListingId
      );
      if (hiddenMember?.listingStatus !== "hidden") {
        throw new Error("member listing should remain hidden in my listings");
      }
      console.log(
        "PASS member chat listing visible in GET /api/my/listings via inventory repository"
      );
    } finally {
      await new Promise<void>((resolve) => repoServer.close(() => resolve()));
      await repoOnlyListingRepo.deleteListing(DEALER_A, repoOnlyId);
      await repoOnlyListingRepo.deleteListing(UID_MEMBER, memberListingId);
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
