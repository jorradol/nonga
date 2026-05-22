/**
 * Phase Final — Duplicate detection E2E (no auto-delete)
 */
import {
  loadMarketplaceInventory,
  persistMarketplaceInventory,
  getPublishedMarketplaceCars,
  addMarketplaceCar,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory";
import {
  loadDealerDraftInventory,
  persistDealerDrafts,
  bulkAddDealerDrafts,
  type DealerDraftRecord,
} from "../src/server/dealerDraftInventory";
import {
  runImportDuplicateChecks,
  applyDuplicateReview,
  fingerprintFromCar,
} from "../src/server/duplicateDetectionService";
import { scanForDuplicates } from "../src/utils/duplicateDetection/duplicateEngine";
import { shouldHideFromMarketplace } from "../src/utils/duplicateDetection/duplicateEngine";
import { compareImageSets } from "../src/utils/duplicateDetection/imageSignals";
import { scoreDuplicatePair } from "../src/utils/duplicateDetection/duplicateEngine";

const TEST_IMG = "https://example.com/cars/test-honda-1.jpg";
const TEST_IMG2 = "https://example.com/cars/test-honda-1.jpg?w=800";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("OK:", msg);
}

console.log("=== Duplicate Detection Test ===\n");

const imgScore = compareImageSets([TEST_IMG], [TEST_IMG2]);
assert(imgScore.score >= 75, "image URL normalized match");

const base = loadMarketplaceInventory();
const baseDrafts = loadDealerDraftInventory();

const existing = base[0];
if (existing) {
  const fp = fingerprintFromCar(existing);
  const clone: MarketplaceCarRecord = {
    ...existing,
    id: `dup-test-${Date.now()}`,
    title: existing.title,
    createdAt: new Date().toISOString(),
  };
  const scan = scanForDuplicates(
    fingerprintFromCar(clone),
    [fingerprintFromCar(existing)],
    { importMode: true }
  );
  assert(
    scan.score >= 55,
    `similar car scores ${scan.score} (possible_duplicate)`
  );
  assert(
    scan.status === "possible_duplicate",
    "import mode marks possible_duplicate not auto-delete"
  );
}

const exactCar: MarketplaceCarRecord = {
  id: `dup-exact-${Date.now()}`,
  title: "Honda Civic 2020 Test Dup",
  brand: "Honda",
  model: "Civic",
  year: 2020,
  price: 550000,
  type: "used",
  condition: "มือสอง",
  mileage: 45000,
  fuelType: "petrol",
  images: [TEST_IMG],
  description: "VIN 1HGBH41JXMN109186 test duplicate",
  vin: "1HGBH41JXMN109186",
  licensePlate: "กข1234",
  ownerId: "owner-thor-auto",
  ownerName: "Test",
  ownerPhone: "0812345678",
  dealerId: "thor-auto",
  isSold: false,
  listingStatus: "published",
  createdAt: new Date().toISOString(),
};

const exactClone: MarketplaceCarRecord = {
  ...exactCar,
  id: `dup-exact-clone-${Date.now()}`,
  title: "Honda Civic 2020 Test Dup Copy",
};

addMarketplaceCar(exactCar);
const { cars } = runImportDuplicateChecks([exactClone], []);
assert(
  cars[0].duplicateStatus === "possible_duplicate",
  `import exact VIN marks possible_duplicate (score ${cars[0].duplicateScore})`
);
assert(
  (cars[0].duplicateScore ?? 0) >= 55,
  "exact VIN match score >= 55"
);
const published = getPublishedMarketplaceCars();
const visibleExact = published.some((c) => c.id === exactCar.id);
assert(visibleExact, "possible_duplicate still visible on marketplace");

const draftDup: DealerDraftRecord = {
  id: `dup-draft-${Date.now()}`,
  dealerId: "thor-auto",
  dealerName: "Thor",
  ownerName: "T",
  phone: "0812345678",
  rawRow: {},
  normalizedData: {} as DealerDraftRecord["normalizedData"],
  missingFields: [],
  warnings: [],
  confidenceScore: 40,
  status: "draft",
  images: [TEST_IMG],
  title: exactCar.title,
  brand: exactCar.brand,
  model: exactCar.model,
  year: exactCar.year,
  price: exactCar.price,
  mileage: exactCar.mileage,
  fuelType: "petrol",
  condition: "มือสอง",
  description: exactCar.description,
  vin: exactCar.vin,
  licensePlate: exactCar.licensePlate,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const draftChecked = runImportDuplicateChecks([], [draftDup]);
assert(
  draftChecked.drafts[0].duplicateMatches.length > 0,
  "draft duplicates against published"
);

applyDuplicateReview(exactClone.id, "hide_duplicate", {
  hideId: exactClone.id,
  keepId: exactCar.id,
});

const hiddenCar = loadMarketplaceInventory().find((c) => c.id === exactClone.id);
if (hiddenCar) {
  const updated = {
    ...hiddenCar,
    duplicateStatus: "duplicate_confirmed" as const,
    duplicateCanonicalId: exactCar.id,
  };
  persistMarketplaceInventory(
    loadMarketplaceInventory().map((c) =>
      c.id === exactClone.id ? updated : c
    )
  );
}

const confirmed = loadMarketplaceInventory().find((c) => c.id === exactClone.id);
if (confirmed) {
  assert(
    shouldHideFromMarketplace({
      duplicateStatus: "duplicate_confirmed",
      duplicateCanonicalId: exactCar.id,
      id: exactClone.id,
    }),
    "duplicate_confirmed non-canonical hidden from marketplace"
  );
}

const visibleAfterConfirm = getPublishedMarketplaceCars().some(
  (c) => c.id === exactClone.id
);
assert(!visibleAfterConfirm, "confirmed duplicate not in marketplace");

persistMarketplaceInventory(
  base.filter((c) => !c.id.startsWith("dup-"))
);
persistDealerDrafts(
  baseDrafts.filter((d) => !d.id.startsWith("dup-"))
);

console.log("\n=== PASS ===\n");
