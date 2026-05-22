/**
 * npm run test:edit-listing-images
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadMarketplaceInventory,
  persistMarketplaceInventory,
  getMarketplaceCarById,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { saveListingImageUpload, getListingImagesRoot } from "../src/server/listingImageStorage.ts";
import { sanitizeListingImagesForId } from "../src/utils/listingImages.ts";

const CAR_ID = `car-test-edit-img-${Date.now()}`;
const OWNER = "test-owner-edit-img";

function tinyPng(): Buffer {
  // 1x1 PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

function cleanup(carId: string) {
  persistMarketplaceInventory(
    loadMarketplaceInventory().filter((c) => c.id !== carId)
  );
  const dir = path.join(getListingImagesRoot(), carId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

async function main() {
  const seed: MarketplaceCarRecord = {
    id: CAR_ID,
    title: "Test Edit Image Upload",
    brand: "Test",
    model: "Car",
    year: 2020,
    price: 100000,
    type: "used",
    condition: "มือสอง",
    mileage: 0,
    fuelType: "petrol",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600",
    ],
    description: "test",
    ownerId: OWNER,
    ownerName: "T",
    ownerPhone: "0",
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
  };

  persistMarketplaceInventory([
    seed,
    ...loadMarketplaceInventory().filter((c) => c.id !== CAR_ID),
  ]);

  const saved = saveListingImageUpload(CAR_ID, tinyPng(), "image/png", "test-upload");
  assert.equal(saved.ok, true);
  if (!saved.ok) throw new Error("upload failed");
  assert.ok(saved.storedUrl.startsWith(`/storage/listings/${CAR_ID}/`));

  const diskPath = path.join(
    getListingImagesRoot(),
    CAR_ID,
    saved.storedUrl.split("/").pop()!
  );
  assert.ok(fs.existsSync(diskPath), "file on disk");

  const merged = sanitizeListingImagesForId(
    [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600",
      saved.storedUrl,
      "blob:http://localhost/fake",
      "data:image/png;base64,xx",
    ],
    CAR_ID
  );
  assert.ok(merged.includes(saved.storedUrl));
  assert.ok(!merged.some((u) => u.startsWith("blob:")));
  assert.ok(!merged.some((u) => u.startsWith("data:")));

  const inv = loadMarketplaceInventory();
  const raw = JSON.stringify(inv);
  assert.ok(!raw.includes("blob:"));
  assert.ok(!raw.includes("data:image"));

  const badMime = saveListingImageUpload(CAR_ID, tinyPng(), "application/pdf", "x");
  assert.equal(badMime.ok, false);

  cleanup(CAR_ID);
  assert.equal(getMarketplaceCarById(CAR_ID), null);

  console.log("test:edit-listing-images — OK");
}

main().catch((e) => {
  cleanup(CAR_ID);
  console.error(e);
  process.exit(1);
});
