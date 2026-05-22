/**
 * ทดสอบ owner listing edit / visibility (in-process)
 * npm run test:my-listings
 */
import assert from "node:assert/strict";
import {
  loadMarketplaceInventory,
  persistMarketplaceInventory,
  getOwnerMarketplaceCars,
  getPublishedMarketplaceCars,
  getMarketplaceCarById,
  updateMarketplaceCar,
  setMarketplaceCarListingStatus,
  removeMarketplaceCar,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { sanitizeListingImagesForId } from "../src/utils/listingImages.ts";

const OWNER = "test-owner-my-listings";
const OTHER = "other-owner-xyz";
const CAR_ID = `car-test-my-listings-${Date.now()}`;

function seedCar(): MarketplaceCarRecord {
  return {
    id: CAR_ID,
    title: "Test My Listing Edit",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 450000,
    type: "used",
    condition: "มือสอง",
    mileage: 50000,
    fuelType: "petrol",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600",
    ],
    description: "test listing",
    ownerId: OWNER,
    ownerName: "Test",
    ownerPhone: "0800000000",
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
  };
}

function cleanup() {
  persistMarketplaceInventory(
    loadMarketplaceInventory().filter((c) => c.id !== CAR_ID)
  );
}

async function main() {
  const list = loadMarketplaceInventory();
  persistMarketplaceInventory([seedCar(), ...list.filter((c) => c.id !== CAR_ID)]);

  const mine = getOwnerMarketplaceCars(OWNER);
  assert.ok(mine.some((c) => c.id === CAR_ID), "owner sees own listing");

  const updated = updateMarketplaceCar(CAR_ID, { price: 499000 });
  assert.equal(updated?.price, 499000);

  const wrongOwner = getOwnerMarketplaceCars(OTHER).find((c) => c.id === CAR_ID);
  assert.equal(wrongOwner, undefined, "other owner cannot see listing");

  setMarketplaceCarListingStatus(CAR_ID, "hidden");
  const hidden = getMarketplaceCarById(CAR_ID);
  assert.equal(hidden?.listingStatus, "hidden");

  const onMarket = getPublishedMarketplaceCars().filter((c) => c.id === CAR_ID);
  assert.equal(onMarket.length, 0, "hidden not on public marketplace");

  setMarketplaceCarListingStatus(CAR_ID, "published");
  const shown = getMarketplaceCarById(CAR_ID);
  assert.equal(shown?.listingStatus, "published");

  const crossPath = sanitizeListingImagesForId(
    [`/storage/listings/other-car/01.jpg`, ...shown!.images],
    CAR_ID
  );
  assert.ok(
    !crossPath.some((u) => u.includes("other-car")),
    "cross-car images stripped on sanitize"
  );

  removeMarketplaceCar(CAR_ID);
  assert.equal(getMarketplaceCarById(CAR_ID), null);

  cleanup();
  console.log("test:my-listings — OK");
}

main().catch((e) => {
  cleanup();
  console.error(e);
  process.exit(1);
});
