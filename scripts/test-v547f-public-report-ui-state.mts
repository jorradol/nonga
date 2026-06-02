/**
 * v5.4.7f follow-up — public report should not visually remove listing
 * npm run test:v547f-public-report-ui-state
 */
import { strict as assert } from "node:assert";
import { applyCarsFetchPayload } from "../src/services/cars/carsFetchState.ts";
import { resolveMarketplaceUiState } from "../src/utils/marketplaceUiState.ts";
import { normalizePublicMarketplaceCar } from "../src/utils/marketplaceCarMapper.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.4.7f public report UI regression ===\n");

const listing = normalizePublicMarketplaceCar({
  id: "car-1",
  title: "Toyota Corolla 2010",
  brand: "Toyota",
  model: "Corolla",
  year: 2010,
  price: 399000,
  type: "used",
  condition: "ดี",
  mileage: 120000,
  fuelType: "petrol",
  images: [],
  description: "desc",
  ownerId: "owner-1",
  ownerName: "owner",
  ownerPhone: "",
  listingStatus: "published",
  moderationStatus: "under_review",
  createdAt: new Date().toISOString(),
});

ok(
  "moderation-under-review-does-not-hide-listing",
  listing.listingStatus === "published",
  String(listing.listingStatus)
);

const successAfterReport = applyCarsFetchPayload(
  { cars: [listing] },
  { success: true, data: [listing] }
);
ok(
  "report-success-listing-stays-in-marketplace-list",
  successAfterReport.cars.some((c) => c.id === "car-1"),
  String(successAfterReport.cars.length)
);

const failedFetchKeepsPreviousCars = applyCarsFetchPayload(
  { cars: [listing] },
  { success: false, message: "temporary failure" }
);
ok(
  "failed-fetch-must-not-clear-previous-listings",
  failedFetchKeepsPreviousCars.cars.some((c) => c.id === "car-1"),
  String(failedFetchKeepsPreviousCars.cars.length)
);

ok(
  "ui-empty-state-only-when-success-and-zero",
  resolveMarketplaceUiState({
    isLoadingCars: false,
    carsLoadState: "success",
    carsCount: 0,
    filteredCarsCount: 0,
  }) === "empty",
  ""
);
ok(
  "ui-error-state-on-fetch-error-without-data",
  resolveMarketplaceUiState({
    isLoadingCars: false,
    carsLoadState: "error",
    carsCount: 0,
    filteredCarsCount: 0,
  }) === "error",
  ""
);
ok(
  "ui-ready-when-data-exists-even-if-last-fetch-failed",
  resolveMarketplaceUiState({
    isLoadingCars: false,
    carsLoadState: "error",
    carsCount: 1,
    filteredCarsCount: 1,
  }) === "ready",
  ""
);

console.log("\n=== v5.4.7f public report UI regression — done ===\n");
assert(process.exitCode !== 1, "some checks failed");
