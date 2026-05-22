/**
 * Version 4 — Smart import E2E (Thor sample CSV)
 * 4 published + 1 draft — ไม่ใช่ bulk 5 คัน
 * Run: npm run test:import-sample
 */
import fs from "fs";
import path from "path";
import { parseCsvTextToObjects } from "../src/utils/inventoryImport/csvParser.ts";
import { buildSmartColumnMappings } from "../src/utils/inventoryImport/smartFieldDetection.ts";
import { runInventoryCleanPipeline } from "../src/utils/inventoryImport/cleaning/cleanAndValidate.ts";
import {
  prepareSmartInventoryImport,
  flattenSmartPrepForCommit,
} from "../src/utils/inventoryImport/import/prepareSmartImport.ts";
import { processSmartInventoryImport } from "../src/server/inventoryImportCommit.ts";
import { getListingImagesRoot } from "../src/server/listingImageStorage.ts";
import {
  getMarketplaceInventorySorted,
  getPublishedMarketplaceCars,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { getDealerDraftsSorted } from "../src/server/dealerDraftInventory.ts";
import { normalizeDealerId, THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";
import { resolveCarDealerId } from "../src/server/marketplaceInventory.ts";

const SAMPLE_PATH = path.resolve(
  process.cwd(),
  "public/samples/ThorAuto-sample-with-data.csv"
);

async function main() {
  console.log("=== Version 4: Thor Smart Import Sample Test ===\n");

  if (!fs.existsSync(SAMPLE_PATH)) {
    console.error("Missing sample:", SAMPLE_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(SAMPLE_PATH, "utf8");
  const rows = parseCsvTextToObjects(raw);
  const columns = Object.keys(rows[0] ?? {});
  const mappings = buildSmartColumnMappings(columns, rows);
  const clean = runInventoryCleanPipeline(rows, mappings);

  const rawMap: Record<number, Record<string, string>> = {};
  rows.forEach((r, i) => {
    rawMap[i + 1] = r;
  });

  const owner = {
    dealerId: THOR_AUTO_DEALER_ID,
    ownerId: "owner-thor-auto",
    ownerName: "คุณณรงค์ จรดล",
    ownerPhone: "0815553335",
    showroomName: "Thor Auto (ธอร์ ออโต้)",
    address: "เขตมีนบุรี จังหวัดกรุงเทพ",
  };

  const prep = prepareSmartInventoryImport(clean.allRows, owner, rawMap);
  console.log("Smart disposition:", {
    published: prep.publishedCount,
    draft: prep.draftCount,
    rejected: prep.rejectedCount,
  });

  const { published, drafts } = flattenSmartPrepForCommit(prep);
  const result = await processSmartInventoryImport({ published, drafts }, owner);

  console.log("\n--- Commit ---");
  console.log("success:", result.success);
  console.log("published:", result.publishedCount);
  console.log("draft:", result.draftCount);
  console.log("imported total:", result.importedCount);
  console.log("images downloaded:", result.imageStats?.downloaded);

  const importedIds = new Set(result.imported.map((i) => i.id));
  const inventory = getMarketplaceInventorySorted();
  const newCars = inventory.filter((c) => importedIds.has(c.id));
  const thorDrafts = getDealerDraftsSorted(THOR_AUTO_DEALER_ID);
  const mazdaDraft = thorDrafts.find(
    (d) => d.brand === "Mazda" || d.model === "2"
  );

  let storageCount = 0;
  for (const car of newCars) {
    for (const img of car.images) {
      if (img.startsWith("/storage/listings/")) storageCount++;
    }
  }

  const publishedBatch = newCars.filter((c) =>
    result.imported.some((m) => m.id === c.id && m.bucket === "published")
  );
  const allThorDealerIds =
    newCars.every((c) => resolveCarDealerId(c) === THOR_AUTO_DEALER_ID) &&
    thorDrafts.every((d) => normalizeDealerId(d.dealerId) === THOR_AUTO_DEALER_ID);

  console.log("\n--- Verify ---");
  console.log("new published cars:", publishedBatch.length);
  console.log("thor drafts (portal):", thorDrafts.length);
  console.log("Mazda draft visible:", Boolean(mazdaDraft));
  if (mazdaDraft) {
    console.log("  draft dealerId:", mazdaDraft.dealerId, "→", normalizeDealerId(mazdaDraft.dealerId));
  }
  console.log("storage URLs:", storageCount);
  console.log(
    "resolveCarDealerId sample:",
    newCars[0] ? resolveCarDealerId(newCars[0]) : "n/a"
  );

  const imgRoot = getListingImagesRoot();
  const carDirs = fs.existsSync(imgRoot)
    ? fs.readdirSync(imgRoot).filter((d) => d.startsWith("car-import-"))
    : [];

  const ok =
    result.success &&
    prep.publishedCount === 4 &&
    prep.draftCount === 1 &&
    result.publishedCount === 4 &&
    result.draftCount === 1 &&
    result.importedCount === 5 &&
    publishedBatch.length === 4 &&
    thorDrafts.length >= 1 &&
    Boolean(mazdaDraft) &&
    normalizeDealerId(mazdaDraft!.dealerId) === THOR_AUTO_DEALER_ID &&
    allThorDealerIds &&
    (result.imageStats?.downloaded ?? 0) >= 5 &&
    storageCount >= 5 &&
    getPublishedMarketplaceCars().length >= 4;

  console.log("\n===", ok ? "PASS" : "FAIL", "===");
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
