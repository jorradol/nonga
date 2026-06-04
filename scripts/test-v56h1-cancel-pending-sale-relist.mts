/**
 * v5.6H.1 — Cancel pending_sale / relist safety
 * npm run test:v56h1-cancel-pending-sale-relist
 */
import { readFileSync } from "node:fs";
import {
  addMarketplaceCar,
  getMarketplaceCarById,
  getPublishedMarketplaceCars,
  isVisibleOnMarketplace,
  persistMarketplaceInventory,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { createInventoryRepository } from "../src/server/repositories/inventoryRepository.ts";
import {
  applyClosedWonPendingSaleForListing,
  buildPendingSaleListingPatch,
  cancelPendingSaleAndRelist,
} from "../src/services/leads/listingSaleOutcome.ts";
import {
  searchMarketplaceForChat,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const ownerId = "seller-h1-relist";
const otherOwner = "other-seller-h1";
const listingId = "car-h1-relist-pending";

function baseCar(id: string, owner: string): MarketplaceCarRecord {
  return {
    id,
    title: "Toyota Vios 2018",
    brand: "Toyota",
    model: "Vios",
    year: 2018,
    price: 320000,
    type: "used",
    condition: "used",
    mileage: 60000,
    fuelType: "petrol",
    transmission: "เกียร์ออโต้",
    images: [`/storage/listings/${id}/01-a.webp`],
    description: "รถสภาพดี",
    ownerId: owner,
    ownerName: "Seller",
    ownerPhone: "0810000000",
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
  };
}

persistMarketplaceInventory([]);
const inventoryRepo = createInventoryRepository();
resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const leadRepo = createBuyerLeadRepository();

const car = addMarketplaceCar(baseCar(listingId, ownerId));
ok("seed published", car.listingStatus === "published");

const now = new Date().toISOString();
const pendingPatch = buildPendingSaleListingPatch(now);
await inventoryRepo.listings.updateListing(ownerId, listingId, pendingPatch);
const pending = getMarketplaceCarById(listingId)!;
ok("pending_sale set", pending.saleStatus === "pending_sale");
ok("hidden while pending", pending.listingStatus === "hidden");
ok("pendingSaleAt kept path", Boolean(pending.pendingSaleAt));
ok("not isSold", pending.isSold === false);
ok("not visible public", !isVisibleOnMarketplace(pending));

// --- owner relist success ---
{
  const result = await cancelPendingSaleAndRelist({
    inventoryRepository: inventoryRepo,
    listingId,
    repoScopeId: ownerId,
  });
  ok("owner relist ok", result.ok === true);
  if (result.ok) {
    ok("published true", result.published === true);
    ok("sale_cancelled", result.listing.saleStatus === "sale_cancelled");
    ok("listing published", result.listing.listingStatus === "published");
    ok("saleCancelledAt set", Boolean(result.listing.saleCancelledAt));
    ok("pendingSaleAt preserved", Boolean(result.listing.pendingSaleAt));
    ok("still not isSold", result.listing.isSold === false);
    ok("images preserved", result.listing.images.length >= 1);
    ok("no adminHidden touch", !result.listing.adminHiddenReason);
    ok("visible again", isVisibleOnMarketplace(result.listing));
    ok("in published list", getPublishedMarketplaceCars().some((c) => c.id === listingId));
  }
}

// --- chat search includes after relist ---
{
  const c = getMarketplaceCarById(listingId)!;
  const search = searchMarketplaceForChat(
    [
      {
        id: c.id,
        title: c.title,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price: c.price,
        listingStatus: c.listingStatus,
        saleStatus: c.saleStatus,
      } as ChatInventoryCar,
    ],
    { limit: 5 }
  );
  ok("chat includes relisted", search.primary.some((r) => r.id === listingId));
}

// --- non-owner denied ---
{
  persistMarketplaceInventory([]);
  addMarketplaceCar(baseCar("car-h1-other", ownerId));
  await inventoryRepo.listings.updateListing(
    ownerId,
    "car-h1-other",
    buildPendingSaleListingPatch(now)
  );
  const denied = await cancelPendingSaleAndRelist({
    inventoryRepository: inventoryRepo,
    listingId: "car-h1-other",
    repoScopeId: otherOwner,
  });
  ok("non-owner update scope denied", denied.ok === false);
}

// --- non-pending cannot cancel ---
{
  persistMarketplaceInventory([]);
  addMarketplaceCar(baseCar("car-h1-published", ownerId));
  const bad = await cancelPendingSaleAndRelist({
    inventoryRepository: inventoryRepo,
    listingId: "car-h1-published",
    repoScopeId: ownerId,
  });
  ok("non-pending rejected", bad.ok === false);
}

// --- guard fail keeps hidden ---
{
  persistMarketplaceInventory([]);
  const incomplete = addMarketplaceCar({
    ...baseCar("car-h1-incomplete", ownerId),
    brand: "",
    model: "",
    images: [],
  });
  await inventoryRepo.listings.updateListing(
    ownerId,
    incomplete.id,
    buildPendingSaleListingPatch(now)
  );
  const fail = await cancelPendingSaleAndRelist({
    inventoryRepository: inventoryRepo,
    listingId: incomplete.id,
    repoScopeId: ownerId,
  });
  ok("guard fail status 422", fail.ok === false && fail.status === 422);
  if (fail.ok === false && fail.listing) {
    ok("guard fail sale_cancelled", fail.listing.saleStatus === "sale_cancelled");
    ok("guard fail stays hidden", fail.listing.listingStatus === "hidden");
    ok("guard fail message present", Boolean(fail.message));
  }
}

// --- closed_won path still applies pending (regression) ---
{
  persistMarketplaceInventory([]);
  const lid = "car-h1-closed-won";
  addMarketplaceCar(baseCar(lid, ownerId));
  const applied = await applyClosedWonPendingSaleForListing({
    inventoryRepository: inventoryRepo,
    buyerLeadRepository: leadRepo,
    listingId: lid,
    sellerId: ownerId,
  });
  ok("closed_won pending apply", applied.ok === true);
}

// --- UI / route ---
{
  const panel = readFileSync("src/components/MyListingsView.tsx", "utf8");
  const routes = readFileSync("src/server/ownerListingRoutes.ts", "utf8");
  ok("cancel route", routes.includes("cancel-pending-sale"));
  ok("cancel btn", panel.includes("my-listings-cancel-pending-sale-btn"));
  ok("confirm copy", panel.includes("CANCEL_PENDING_SALE_CONFIRM_MESSAGE"));
  ok("no payment", !routes.includes("successFee"));
}

console.log("\nDone v5.6H.1 cancel pending sale relist tests.");
if (process.exitCode) process.exit(process.exitCode);
