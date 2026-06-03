/**
 * v5.4.10 — Seller & Dealer readiness priority fixes
 * npm run test:v5410-seller-dealer-readiness-fixes
 */
import fs from "node:fs";
import express from "express";
import {
  validateMemberListingRecordReadyToPublish,
  MEMBER_PUBLISH_MISSING_IMAGES_MESSAGE,
} from "../src/services/listings/memberListingPublishGuard.ts";
import {
  resolveChatDealerDraftScopeBlockMessage,
  CHAT_DEALER_INVENTORY_SCOPE_REQUIRED_MESSAGE,
  CHAT_MEMBER_SELLER_FLOW_MESSAGE,
} from "../src/services/ai/chat/chatDraftAccess.ts";
import { buildMemberListingApiPayload } from "../src/services/chat/saveMemberListingFromChat.ts";
import { registerOwnerListingRoutes } from "../src/server/ownerListingRoutes.ts";
import {
  createInventoryRepository,
  type InventoryRepository,
} from "../src/server/repositories/inventoryRepository.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.4.10 Bug #1 — member publish guard ===");

const incompleteCar = {
  id: "car-incomplete-1",
  brand: "Toyota",
  model: "",
  year: 2020,
  price: 0,
  mileage: 0,
  images: [] as string[],
  listingStatus: "hidden" as const,
  condition: "",
  description: "",
};

const completeHiddenCar = {
  id: "car-complete-1",
  brand: "Honda",
  model: "Civic",
  year: 2020,
  price: 450000,
  mileage: 50000,
  transmission: "AT",
  images: ["/storage/listings/car-complete-1/01.webp"],
  listingStatus: "hidden" as const,
  condition: "เกียร์ AT",
  description: "รถบ้าน",
};

const incompleteGuard = validateMemberListingRecordReadyToPublish(incompleteCar);
ok("incomplete-listing-blocked", incompleteGuard.ok === false, incompleteGuard.ok === false ? incompleteGuard.reason : "");
ok(
  "incomplete-mentions-missing",
  incompleteGuard.ok === false &&
    (incompleteGuard.missingCoreLabels?.length ?? 0) > 0,
  ""
);

const completeGuard = validateMemberListingRecordReadyToPublish(completeHiddenCar);
ok("complete-hidden-listing-ok", completeGuard.ok === true, "");

const noImageGuard = validateMemberListingRecordReadyToPublish({
  ...completeHiddenCar,
  images: [],
});
ok(
  "missing-images-blocked",
  noImageGuard.ok === false && noImageGuard.message.includes("รูป"),
  noImageGuard.ok === false ? noImageGuard.message.slice(0, 40) : ""
);

const myListingsSource = fs.readFileSync("src/components/MyListingsView.tsx", "utf8");
ok(
  "my-listings-client-guard",
  myListingsSource.includes("validateMemberListingRecordReadyToPublish") &&
    myListingsSource.includes("!hidden"),
  ""
);

console.log("\n=== v5.4.10 Bug #1 — server visibility PATCH ===");

process.env.NONGA_DEALER_TOKEN_MAP = "";
process.env.NONGA_BETA_DEALER_ID = "";
process.env.NONGA_DEALER_API_TOKEN = "";
const TOKEN_MEMBER = "dev-firebase-token-v5410-member";
const UID_MEMBER = "member-v5410-uid";
process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKEN_MEMBER]: {
    uid: UID_MEMBER,
    email: "member-v5410@test.local",
    displayName: "Member V5410",
  },
});
process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [UID_MEMBER]: {
    uid: UID_MEMBER,
    email: "member-v5410@test.local",
    displayName: "Member V5410",
    role: "member",
    status: "active",
  },
});

const repo: InventoryRepository = createInventoryRepository("file");
const incompleteListing: MarketplaceCarRecord = {
  id: "car-v5410-incomplete",
  title: "Incomplete",
  brand: "Toyota",
  model: "",
  year: 2020,
  price: 0,
  type: "used",
  condition: "",
  mileage: 0,
  fuelType: "petrol",
  images: [],
  description: "",
  ownerId: UID_MEMBER,
  ownerName: "Member",
  ownerPhone: "",
  isSold: false,
  listingStatus: "hidden",
  createdAt: new Date().toISOString(),
};
const completeListing: MarketplaceCarRecord = {
  ...incompleteListing,
  id: "car-v5410-complete",
  title: "Honda Civic",
  brand: "Honda",
  model: "Civic",
  year: 2019,
  price: 389000,
  mileage: 88000,
  condition: "เกียร์ AT",
  transmission: "AT",
  images: ["/storage/listings/car-v5410-complete/01.webp"],
};

await repo.listings.createListing(UID_MEMBER, incompleteListing);
await repo.listings.createListing(UID_MEMBER, completeListing);

const app = express();
app.use(express.json());
registerOwnerListingRoutes(app, { inventoryRepository: repo });
const server = app.listen(0);
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}`;

try {
  let res = await fetch(`${base}/api/cars/car-v5410-incomplete/visibility`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN_MEMBER}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hidden: false }),
  });
  ok("server-rejects-incomplete-unhide", res.status === 422, String(res.status));
  const rejectBody = (await res.json()) as { error?: string; message?: string };
  ok(
    "server-reject-error-code",
    rejectBody.error === "listing_not_ready_to_publish",
    rejectBody.error ?? ""
  );

  res = await fetch(`${base}/api/cars/car-v5410-complete/visibility`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN_MEMBER}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hidden: false }),
  });
  ok("server-allows-complete-unhide", res.ok, String(res.status));
  if (res.ok) {
    const published = (await res.json()) as { data?: { listingStatus?: string } };
    ok(
      "server-published-status",
      published.data?.listingStatus === "published",
      published.data?.listingStatus ?? ""
    );
  }
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log("\n=== v5.4.10 Bug #2 — admin chat dealer scope ===");

const adminNoScope = resolveChatDealerDraftScopeBlockMessage({
  isSignedIn: true,
  chatScope: { mode: "dealer" as const, storageKey: "admin", userId: "admin1", dealerId: null },
  isDealer: false,
  isAdmin: true,
  user: { uid: "admin1", role: "admin" },
  role: "admin",
});
ok(
  "admin-without-dealer-scope-blocked",
  adminNoScope === CHAT_DEALER_INVENTORY_SCOPE_REQUIRED_MESSAGE,
  adminNoScope?.slice(0, 50) ?? ""
);

const dealerScope = resolveChatDealerDraftScopeBlockMessage({
  isSignedIn: true,
  chatScope: { mode: "dealer" as const, storageKey: "d1", userId: "d1", dealerId: "thor-auto" },
  isDealer: true,
  isAdmin: false,
  user: { uid: "dealer-1", role: "dealer", dealerId: "thor-auto" },
  role: "dealer",
});
ok("dealer-with-scope-allowed", dealerScope === null, dealerScope ?? "");

const memberBlock = resolveChatDealerDraftScopeBlockMessage({
  isSignedIn: true,
  chatScope: { mode: "consumer" as const, storageKey: "m1", userId: "m1", dealerId: null },
  isDealer: false,
  isAdmin: false,
  user: { uid: "m1", role: "member" },
  role: "member",
});
ok(
  "member-seller-flow-unchanged",
  memberBlock === CHAT_MEMBER_SELLER_FLOW_MESSAGE,
  memberBlock?.slice(0, 40) ?? ""
);

const useChatSource = fs.readFileSync("src/hooks/chat/useChat.ts", "utf8");
ok(
  "use-chat-uses-inventory-scope",
  useChatSource.includes("resolveDealerInventoryScopeId") &&
    !useChatSource.includes("resolveDealerIdFromUser"),
  ""
);

console.log("\n=== v5.4.10 Bug #3 — member create hidden ===");

const memberPayload = buildMemberListingApiPayload({
  fields: {
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 350000,
    mileage: 60000,
    transmission: "AT",
  },
  ownerId: UID_MEMBER,
  ownerName: "Member",
  ownerPhone: "0812345678",
});
ok(
  "member-payload-listing-status-hidden",
  (memberPayload.payload as { listingStatus?: string }).listingStatus === "hidden",
  JSON.stringify(memberPayload.payload).slice(0, 80)
);

const serverTs = fs.readFileSync("server.ts", "utf8");
ok(
  "post-api-cars-member-default-hidden",
  serverTs.includes("!ownership.dealerId") && serverTs.includes('listingStatus = "hidden"'),
  ""
);

const saveSource = fs.readFileSync("src/services/chat/saveMemberListingFromChat.ts", "utf8");
ok(
  "member-save-no-post-hide-call",
  !saveSource.includes("setMyListingVisibility(params.ownerId, listingId, true)"),
  ""
);

console.log("\nDone v5.4.10 seller/dealer readiness fixes.");
