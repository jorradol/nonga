import fs from "fs";
import os from "os";
import path from "path";
import {
  createMigrationPlan,
  evaluateWriteSafety,
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

async function captureLogs(run: () => Promise<unknown>): Promise<string> {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (message?: unknown) => logs.push(String(message ?? ""));
  try {
    await run();
  } finally {
    console.log = originalLog;
  }
  return logs.join("\n");
}

console.log("=== Nong A v5.0 Migration Integration Safety Smoke ===");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nonga-v50-migration-it-"));
const envBackup = { ...process.env };

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
  writeImage(tmp, "draft-a", "01-draft-a.webp");

  const dryRun = createMigrationPlan({ dataDir: tmp });
  assert(dryRun.mode === "dry-run", "integration plan should default to dry-run");
  assert(dryRun.counts.listingsPlanned === 1, "dry-run should plan valid listing");
  assert(dryRun.counts.draftsPlanned === 1, "dry-run should plan valid draft");
  assert(dryRun.counts.recordsMissingDealerId === 1, "missing dealerId should be counted");
  assert(dryRun.counts.imageFilesPlanned === 2, "dry-run should plan images");
  console.log("PASS migration dry-run output covers records, warnings, and images");

  const jsonOutput = await captureLogs(() =>
    runMigrationCli(["--data-dir", tmp, "--json", "--limit", "1"])
  );
  const parsed = JSON.parse(jsonOutput);
  assert(parsed.mode === "dry-run", "json output should parse as dry-run");
  assert(parsed.counts.listingsPlanned === 1, "json output should include planned listing");
  console.log("PASS --json output parses");

  const limited = createMigrationPlan({ dataDir: tmp, limit: 1 });
  assert(limited.listings.length === 1, "--limit should limit listing plan");
  const noImages = createMigrationPlan({ dataDir: tmp, skipImages: true });
  assert(noImages.counts.imageFilesPlanned === 0, "--skip-images should suppress image plan");
  const noListings = createMigrationPlan({ dataDir: tmp, skipListings: true });
  assert(noListings.counts.marketplaceListingsFound === 0, "--skip-listings should suppress listings");
  const noDrafts = createMigrationPlan({ dataDir: tmp, skipDrafts: true });
  assert(noDrafts.counts.draftsFound === 0, "--skip-drafts should suppress drafts");
  console.log("PASS limit and skip switches work");

  const existing = createMigrationPlan(
    { dataDir: tmp },
    { listingIds: new Set(["car-a"]), draftIds: new Set(["draft-a"]) }
  );
  assert(existing.counts.recordsExisting === 2, "existing records should be skipped");
  const overwrite = createMigrationPlan(
    { dataDir: tmp, overwrite: true },
    { listingIds: new Set(["car-a"]), draftIds: new Set(["draft-a"]) }
  );
  assert(overwrite.counts.recordsExisting === 0, "--overwrite should allow planning existing records");
  console.log("PASS existing records skip unless --overwrite is set");

  assert(
    dryRun.listings[0]?.images[0]?.storagePath ===
      "listing-images/dealer-a/car-a/01-car-a.webp",
    "listing image path should match storage rules"
  );
  assert(
    dryRun.drafts[0]?.images[0]?.storagePath ===
      "draft-images/dealer-a/draft-a/01-draft-a.webp",
    "draft image path should match storage rules"
  );
  console.log("PASS image paths match storage rules");

  const missingConfirm = evaluateWriteSafety(
    { write: true, skipImages: false, confirmStaging: false, allowProductionWrite: false },
    {
      FIREBASE_PROJECT_ID: "nonga-staging",
      FIREBASE_STORAGE_BUCKET: "nonga-staging.appspot.com",
      FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
    } as NodeJS.ProcessEnv
  );
  assert(!missingConfirm.ok, "--write should require --confirm-staging");

  const missingBucket = evaluateWriteSafety(
    { write: true, skipImages: false, confirmStaging: true, allowProductionWrite: false },
    {
      FIREBASE_PROJECT_ID: "nonga-staging",
      FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
    } as NodeJS.ProcessEnv
  );
  assert(!missingBucket.ok, "--write with images should require storage bucket");

  const prodGuard = evaluateWriteSafety(
    { write: true, skipImages: true, confirmStaging: true, allowProductionWrite: false },
    {
      FIREBASE_PROJECT_ID: "nonga-production",
      FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
    } as NodeJS.ProcessEnv
  );
  assert(!prodGuard.ok, "production-like project should be blocked");

  const stagingOk = evaluateWriteSafety(
    { write: true, skipImages: false, confirmStaging: true, allowProductionWrite: false },
    {
      FIREBASE_PROJECT_ID: "nonga-staging",
      FIREBASE_STORAGE_BUCKET: "nonga-staging.appspot.com",
      FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
    } as NodeJS.ProcessEnv
  );
  assert(stagingOk.ok, "staging-like write with bucket and confirm should pass safety");
  console.log("PASS write safety and project guards work");

  process.env = {
    ...envBackup,
    FIREBASE_PROJECT_ID: "",
    FIREBASE_STORAGE_BUCKET: "",
    FIREBASE_SERVICE_ACCOUNT_JSON: "",
  };
  const blockedWriteOutput = await captureLogs(() =>
    runMigrationCli(["--data-dir", tmp, "--write", "--json"])
  );
  const blockedWrite = JSON.parse(blockedWriteOutput);
  assert(blockedWrite.mode === "write", "blocked write should still return write plan");
  assert(blockedWrite.errors.some((err: string) => err.includes("--confirm-staging")), "blocked write should report confirm gate");
  assert(
    blockedWrite.existingCheck === "skipped-dry-run-no-credentials",
    "blocked write should not contact Firestore before safety passes"
  );
  console.log("PASS blocked --write does not contact Firebase");

  const before = fs.readFileSync(path.join(tmp, "marketplace-inventory.json"), "utf8");
  createMigrationPlan({ dataDir: tmp });
  const after = fs.readFileSync(path.join(tmp, "marketplace-inventory.json"), "utf8");
  assert(before === after, "dry-run should not modify source files");
  console.log("PASS dry-run does not write source data");

  const docs = fs.readFileSync(
    path.resolve(process.cwd(), "docs/v5-migration-integration-and-backend-switch-plan.md"),
    "utf8"
  );
  for (const needle of [
    "Migration Emulator / Integration Test Plan",
    "Staging Dry-run Checklist",
    "Backend Switch Test Plan",
    "NONGA_DATA_BACKEND=firestore",
    "NONGA_IMAGE_BACKEND=firebase-storage",
    "--confirm-staging",
  ]) {
    assert(docs.includes(needle), `integration doc missing: ${needle}`);
  }
  console.log("PASS backend switch and staging plans documented");
} finally {
  process.env = envBackup;
  fs.rmSync(tmp, { recursive: true, force: true });
}
