/**
 * v6.6M — Sim dealer import dry-run (in-memory only)
 * NO persist · NO Firestore · NO publish · fake rows only
 * Run: npm run test:sim-dealer-import-dry-run
 */
import {
  resolveDealerIdForImport,
  type CommitImportOwner,
  type CommitImportRowInput,
} from "../src/server/inventoryImportCommit.ts";
import {
  resolveCarDealerId,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import {
  normalizeDealerId,
  resolveParentDealerGroup,
  THOR_AUTO_DEALER_ID,
  THOR_AUTO_PARENT_DEALER_GROUP,
} from "../src/utils/dealerIdentity.ts";

const SIM_DEALERS = [
  {
    dealerId: "sim-1thor",
    label: "1Thor simulated",
    brand: "DryRun",
    model: "SimPartition-Alpha",
    vin: "FAKEVIN0000000001",
  },
  {
    dealerId: "sim-2thor",
    label: "2Thor simulated",
    brand: "DryRun",
    model: "SimPartition-Beta",
    vin: "FAKEVIN0000000002",
  },
  {
    dealerId: "sim-3thor",
    label: "3Thor simulated",
    brand: "DryRun",
    model: "SimPartition-Gamma",
    vin: "FAKEVIN0000000003",
  },
] as const;

function assertEq(label: string, actual: string | null, expected: string | null) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${label}`);
}

function assertTrue(label: string, value: boolean) {
  if (!value) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${label}`);
}

function makeOwner(dealerId: string): CommitImportOwner {
  return {
    dealerId,
    ownerId: `owner-${dealerId}`,
    ownerName: `DryRun ${dealerId}`,
    ownerPhone: "0890000000",
    showroomName: `${dealerId} (dry-run)`,
    address: "Dry-run address placeholder",
  };
}

function makeFakeRow(
  sourceRowIndex: number,
  brand: string,
  model: string,
  vin: string
): CommitImportRowInput {
  return {
    sourceRowIndex,
    importStatus: "valid",
    disposition: "draft",
    brand,
    model,
    year: 2020,
    price: 100000,
    mileage: 50000,
    fuelType: "petrol",
    condition: "มือสอง",
    title: `${brand} ${model} ปี 2020 (dry-run)`,
    description: `Dry-run listing — placeholder VIN ${vin}`,
    images: [],
    skipSourceImageDownload: true,
    rawRow: {
      licensePlate: "XX-****",
      plate: "XX-****",
    },
  };
}

function simulatePartitionFilter(
  cars: MarketplaceCarRecord[],
  dealerId: string
): MarketplaceCarRecord[] {
  const target = normalizeDealerId(dealerId);
  return cars.filter((c) => resolveCarDealerId(c) === target);
}

function main() {
  console.log("=== Sim Dealer Import Dry-Run (v6.6M) ===");
  console.log("Mode: in-memory · NO persist · NO Firestore · NO publish\n");

  const inMemoryCars: MarketplaceCarRecord[] = [];

  for (let i = 0; i < SIM_DEALERS.length; i++) {
    const sim = SIM_DEALERS[i];
    const owner = makeOwner(sim.dealerId);
    const row = makeFakeRow(i + 1, sim.brand, sim.model, sim.vin);

    const dealerId = resolveDealerIdForImport(owner, row);
    assertEq(`resolveDealerIdForImport → ${sim.dealerId}`, dealerId, sim.dealerId);
    assertEq(
      `resolveParentDealerGroup(${sim.dealerId})`,
      resolveParentDealerGroup(dealerId),
      THOR_AUTO_PARENT_DEALER_GROUP
    );
    assertTrue(
      `${sim.dealerId} not collapsed to thor-auto`,
      dealerId !== THOR_AUTO_DEALER_ID
    );

    inMemoryCars.push({
      id: `dry-run-car-${sim.dealerId}`,
      title: row.title ?? "",
      brand: sim.brand,
      model: sim.model,
      year: 2020,
      price: 100000,
      type: "used",
      condition: "มือสอง",
      mileage: 50000,
      fuelType: "petrol",
      images: [],
      description: row.description ?? "",
      ownerId: owner.ownerId ?? `owner-${sim.dealerId}`,
      ownerName: owner.ownerName ?? "DryRun",
      ownerPhone: owner.ownerPhone ?? "0890000000",
      dealerId,
      isSold: false,
      listingStatus: "hidden",
      createdAt: new Date().toISOString(),
    });
  }

  console.log("\n--- Partition isolation (in-memory) ---");
  for (const sim of SIM_DEALERS) {
    const partition = simulatePartitionFilter(inMemoryCars, sim.dealerId);
    assertTrue(
      `partition ${sim.dealerId} has exactly 1 car`,
      partition.length === 1
    );
    assertEq(
      `partition ${sim.dealerId} car dealerId`,
      partition[0]?.dealerId ?? null,
      sim.dealerId
    );
  }

  const cross = simulatePartitionFilter(inMemoryCars, "sim-1thor");
  assertTrue(
    "sim-1thor partition excludes sim-2thor cars",
    !cross.some((c) => c.dealerId === "sim-2thor")
  );

  console.log("\n--- thor-auto regression ---");
  const thorOwner = makeOwner(THOR_AUTO_DEALER_ID);
  const thorRow = makeFakeRow(99, "DryRun", "ThorAuto-Regression", "FAKEVIN0000000099");
  assertEq(
    "resolveDealerIdForImport(thor-auto)",
    resolveDealerIdForImport(thorOwner, thorRow),
    THOR_AUTO_DEALER_ID
  );
  assertEq(
    "resolveParentDealerGroup(thor-auto)",
    resolveParentDealerGroup(THOR_AUTO_DEALER_ID),
    THOR_AUTO_PARENT_DEALER_GROUP
  );

  console.log("\n===", process.exitCode ? "FAIL" : "PASS", "===");
  if (process.exitCode) process.exit(process.exitCode);
}

main();
