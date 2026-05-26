import fs from "fs";
import os from "os";
import path from "path";
import {
  createMigrationPlan,
  runMigrationCli,
} from "./migrate-v50-file-data-to-firestore-storage.mts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function writeImage(root: string, listingId: string, fileName: string): void {
  const dir = path.join(root, "listing-images", listingId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), Buffer.from("fake-image"));
}

console.log("=== Nong A v5.0 Data/Image Migration Smoke ===");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nonga-v50-migration-"));

try {
  writeJson(path.join(tmp, "marketplace-inventory.json"), [
    {
      id: "car-a",
      dealerId: "dealer-a",
      title: "Dealer A Car",
      brand: "Toyota",
      model: "Vios",
      year: 2020,
      price: 300000,
      type: "used",
      condition: "มือสอง",
      mileage: 10000,
      fuelType: "petrol",
      images: ["/storage/listings/car-a/01-car-a.webp"],
      description: "sample",
      ownerId: "owner-dealer-a",
      ownerName: "Dealer A",
      ownerPhone: "0800000000",
      isSold: false,
      listingStatus: "published",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "car-existing",
      dealerId: "dealer-a",
      title: "Existing",
      brand: "Honda",
      model: "City",
      year: 2020,
      price: 350000,
      type: "used",
      condition: "มือสอง",
      mileage: 12000,
      fuelType: "petrol",
      images: [],
      description: "sample",
      ownerId: "owner-dealer-a",
      ownerName: "Dealer A",
      ownerPhone: "0800000000",
      isSold: false,
      listingStatus: "published",
      createdAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "car-missing-dealer",
      title: "Missing Dealer",
      brand: "Ford",
      model: "Ranger",
      year: 2020,
      price: 600000,
      type: "used",
      condition: "มือสอง",
      mileage: 10000,
      fuelType: "diesel",
      images: [],
      description: "sample",
      ownerId: "owner-unknown",
      ownerName: "Unknown",
      ownerPhone: "0800000000",
      isSold: false,
      listingStatus: "published",
      createdAt: "2026-01-03T00:00:00.000Z",
    },
  ]);

  writeJson(path.join(tmp, "dealer-draft-inventory.json"), [
    {
      id: "draft-a",
      dealerId: "dealer-a",
      dealerName: "Dealer A",
      ownerName: "Dealer A",
      phone: "0800000000",
      rawRow: {},
      normalizedData: { brand: "Toyota", model: "Yaris" },
      missingFields: [],
      warnings: [],
      confidenceScore: 100,
      status: "draft",
      images: ["/storage/listings/draft-a/01-draft-a.webp"],
      sourceImageUrls: ["/storage/listings/draft-a/01-draft-a.webp"],
      title: "Draft A",
      brand: "Toyota",
      model: "Yaris",
      year: 2021,
      price: 320000,
      mileage: 9000,
      fuelType: "petrol",
      condition: "มือสอง",
      description: "draft",
      createdAt: "2026-01-04T00:00:00.000Z",
      updatedAt: "2026-01-04T00:00:00.000Z",
    },
  ]);

  writeImage(tmp, "car-a", "01-car-a.webp");
  writeImage(tmp, "car-a", "thumb-01-car-a.webp");
  writeImage(tmp, "draft-a", "01-draft-a.webp");
  writeImage(tmp, "orphan-folder", "01-orphan.webp");

  const dryRun = createMigrationPlan({ dataDir: tmp });
  assert(dryRun.mode === "dry-run", "default migration mode should be dry-run");
  assert(dryRun.counts.marketplaceListingsFound === 3, "should read marketplace data");
  assert(dryRun.counts.draftsFound === 1, "should read draft data");
  assert(dryRun.counts.imageFoldersFound === 3, "should count image folders");
  assert(dryRun.counts.imageFilesFound === 4, "should count all image files");
  assert(dryRun.counts.imageFilesPlanned === 2, "should plan non-thumbnail images only");
  assert(dryRun.counts.recordsMissingDealerId === 1, "missing dealerId should be warned/skipped");
  assert(
    dryRun.counts.imageFoldersWithoutMatchingRecord === 1,
    "orphan image folders should be reported"
  );
  assert(
    dryRun.readiness.imageFoldersWithoutMatchingRecord.includes("orphan-folder"),
    "orphan folder should be listed in readiness report"
  );
  assert(
    dryRun.counts.duplicateStoragePathGroups === 0,
    "duplicate Storage path count should be reported"
  );
  assert(
    dryRun.warnings.some((warning) => warning.includes("explicit dealerId is missing")),
    "missing dealerId warning should be present"
  );
  console.log("PASS dry-run reads sample data and reports counts/warnings");

  const existing = createMigrationPlan(
    { dataDir: tmp },
    { listingIds: new Set(["car-existing"]) }
  );
  const existingPlan = existing.listings.find((item) => item.id === "car-existing");
  assert(existingPlan?.status === "exists", "existing records should not overwrite by default");
  assert(existing.counts.recordsExisting === 1, "existing count should be reported");
  console.log("PASS existing records are skipped without overwrite");

  const skipImages = createMigrationPlan({ dataDir: tmp, skipImages: true });
  assert(skipImages.counts.imageFilesPlanned === 0, "--skip-images should plan no images");
  assert(skipImages.listings.every((item) => item.images.length === 0), "listing image plans skipped");
  console.log("PASS --skip-images works");

  const limited = createMigrationPlan({ dataDir: tmp, limit: 1 });
  assert(limited.listings.length === 1, "--limit should limit listings");
  assert(limited.drafts.length === 1, "--limit should still allow first draft");
  console.log("PASS --limit works");

  const mapped = createMigrationPlan({
    dataDir: tmp,
    dealerId: "staging-dealer",
    dealerIdMap: { "dealer-a": "staging-dealer" },
  });
  assert(mapped.counts.listingsPlanned === 2, "--dealer-id should match mapped target dealerId");
  assert(mapped.counts.draftsPlanned === 1, "mapped target dealer should include drafts");
  const mappedCar = mapped.listings.find((item) => item.id === "car-a");
  assert(mappedCar?.dealerId === "staging-dealer", "record plan should use mapped dealerId");
  assert(mappedCar?.sourceDealerId === "dealer-a", "record plan should preserve source dealerId");
  assert(
    mappedCar?.images[0]?.storagePath ===
      "listing-images/staging-dealer/car-a/01-car-a.webp",
    "mapped dealerId should be used in Storage path"
  );
  assert(
    mapped.readiness.dealerIdMappings.some(
      (item) =>
        item.sourceDealerId === "dealer-a" &&
        item.targetDealerId === "staging-dealer" &&
        item.records === 3
    ),
    "readiness report should summarize dealerId mappings"
  );
  console.log("PASS dealerId mapping supports target dealer subset dry-run");

  const carImage = dryRun.listings.find((item) => item.id === "car-a")?.images[0];
  assert(
    carImage?.storagePath === "listing-images/dealer-a/car-a/01-car-a.webp",
    "listing image path should be dealer scoped"
  );
  const draftImage = dryRun.drafts.find((item) => item.id === "draft-a")?.images[0];
  assert(
    draftImage?.storagePath === "draft-images/dealer-a/draft-a/01-draft-a.webp",
    "draft image path should be dealer scoped"
  );
  console.log("PASS image migration plan builds Firebase Storage paths");

  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (message?: unknown) => {
    logs.push(String(message ?? ""));
  };
  try {
    await runMigrationCli(["--data-dir", tmp, "--json", "--limit", "1", "--skip-images"]);
  } finally {
    console.log = originalLog;
  }
  const parsed = JSON.parse(logs.join("\n"));
  assert(parsed.mode === "dry-run", "--json output should parse");
  assert(parsed.counts.imageFilesPlanned === 0, "--json output should reflect options");
  console.log("PASS --json output parses");

  const before = fs.readFileSync(path.join(tmp, "marketplace-inventory.json"), "utf8");
  createMigrationPlan({ dataDir: tmp });
  const after = fs.readFileSync(path.join(tmp, "marketplace-inventory.json"), "utf8");
  assert(before === after, "dry-run planning should not write source files");
  console.log("PASS dry-run does not modify source files");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
