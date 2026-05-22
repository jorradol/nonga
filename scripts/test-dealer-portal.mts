/**
 * Phase 6 — Dealer portal isolation & publish draft
 * npx tsx scripts/test-dealer-portal.mts
 */
import fs from "fs";
import path from "path";
import {
  getDealerInventoryCars,
  getPublishedMarketplaceCars,
  getMarketplaceCarById,
  updateMarketplaceCar,
  setMarketplaceCarListingStatus,
} from "../src/server/marketplaceInventory.ts";
import {
  getDealerDraftsSorted,
  updateDealerDraft,
} from "../src/server/dealerDraftInventory.ts";
import { publishDealerDraftToMarketplace } from "../src/server/publishDraftListing.ts";

const THOR = "thor-auto";
const OTHER = "other-dealer";

async function main() {
  console.log("=== Phase 6 Dealer Portal Test ===\n");

  const published = getPublishedMarketplaceCars();
  const thorCars = getDealerInventoryCars(THOR);
  const otherCars = getDealerInventoryCars(OTHER);
  const drafts = getDealerDraftsSorted(THOR);

  console.log("Marketplace visible:", published.length);
  console.log("Thor inventory (all statuses):", thorCars.length);
  console.log("Other dealer inventory:", otherCars.length);
  console.log("Thor drafts:", drafts.length);

  const mazdaDraft = drafts.find((d) => d.brand === "Mazda" || d.model === "2");
  if (mazdaDraft) {
    console.log("\nPublish Mazda draft:", mazdaDraft.id);
    updateDealerDraft(mazdaDraft.id, {
      year: 2019,
      price: 389000,
      images: [`/storage/listings/${mazdaDraft.id}/publish-test.jpg`],
      normalizedData: {
        ...mazdaDraft.normalizedData,
        brand: "Mazda",
        model: "2",
        year: "2019",
        price: "389000",
      },
    });
    const pub = await publishDealerDraftToMarketplace(mazdaDraft.id);
    if ("error" in pub) {
      console.log("Publish failed:", pub.error);
    } else {
      console.log("Published:", pub.car.id, "dealerId:", pub.car.dealerId);
    }
  }

  const thorPublished = getDealerInventoryCars(THOR).filter(
    (c) => c.listingStatus !== "hidden"
  );
  if (thorPublished[0]) {
    const id = thorPublished[0].id;
    const newPrice = thorPublished[0].price + 1000;
    updateMarketplaceCar(id, { price: newPrice });
    console.log("\nUpdated price for", id, "→", newPrice);

    setMarketplaceCarListingStatus(id, "hidden");
    const hidden = getMarketplaceCarById(id);
    console.log("Hidden listingStatus:", hidden?.listingStatus);
    const visible = getPublishedMarketplaceCars().some((c) => c.id === id);
    console.log("Visible on marketplace after hide:", visible);

    setMarketplaceCarListingStatus(id, "published");
  }

  const ok =
    thorCars.length >= 1 &&
    otherCars.length === 0 &&
    getPublishedMarketplaceCars().every(
      (c) => !c.dealerId || c.dealerId === THOR || c.listingStatus !== "hidden"
    );

  console.log("\n===", ok ? "PASS" : "FAIL", "===");
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
