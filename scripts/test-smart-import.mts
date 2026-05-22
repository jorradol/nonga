/**
 * Phase 5 Smart Import tests
 * npx tsx scripts/test-smart-import.mts
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
import { getDealerDraftsSorted } from "../src/server/dealerDraftInventory.ts";
import { getPublishedMarketplaceCars } from "../src/server/marketplaceInventory.ts";

const SAMPLE = path.resolve(process.cwd(), "public/samples/ThorAuto-sample-with-data.csv");
const PARTIAL = path.resolve(process.cwd(), "public/samples/ThorAuto-partial-rows.csv");

async function runFile(label: string, filePath: string) {
  console.log(`\n--- ${label} ---`);
  const raw = fs.readFileSync(filePath, "utf8");
  const rows = parseCsvTextToObjects(raw);
  const columns = Object.keys(rows[0] ?? {});
  const mappings = buildSmartColumnMappings(columns, rows);
  const clean = runInventoryCleanPipeline(rows, mappings);
  const rawMap: Record<number, Record<string, string>> = {};
  rows.forEach((r, i) => {
    rawMap[i + 1] = r;
  });
  const owner = {
    dealerId: "thor-auto",
    ownerId: "owner-thor-auto",
    ownerName: "คุณณรงค์ จรดล",
    ownerPhone: "0815553335",
    showroomName: "Thor Auto (ธอร์ ออโต้)",
  };
  const prep = prepareSmartInventoryImport(clean.allRows, owner, rawMap);
  console.log("disposition:", {
    publish: prep.publishedCount,
    draft: prep.draftCount,
    review: prep.needsReviewCount,
    rejected: prep.rejectedCount,
  });
  clean.allRows.forEach((r) => {
    console.log(
      `  #${r.rowIndex} ${r.disposition} score=${r.confidenceScore} missing=[${r.missingFields.join(",")}]`
    );
  });
  return prep;
}

async function main() {
  console.log("=== Smart Import Tests ===");

  const prep1 = await runFile("Full sample (5 rows)", SAMPLE);
  const { published, drafts } = flattenSmartPrepForCommit(prep1);
  const result = await processSmartInventoryImport({ published, drafts }, {
    ownerId: "dealer-thor-auto",
    ownerName: "คุณณรงค์ จรดล",
    ownerPhone: "0815553335",
    showroomName: "Thor Auto (ธอร์ ออโต้)",
  });
  console.log("commit:", {
    published: result.publishedCount,
    draft: result.draftCount,
    failed: result.failed.length,
  });

  const marketplace = getPublishedMarketplaceCars();
  const allHaveStorage = marketplace
    .filter((c) => c.ownerId === "dealer-thor-auto")
    .every(
      (c) =>
        c.images.length === 0 ||
        c.images.some((u) => u.startsWith("/storage/listings/") || u.includes("unsplash"))
    );
  const draftList = getDealerDraftsSorted("thor-auto");
  console.log("marketplace published (thor):", marketplace.filter((c) => c.ownerId === "dealer-thor-auto").length);
  console.log("draft records:", draftList.length);

  const prep2 = await runFile("Partial (no price row)", PARTIAL);
  const draftRow = prep2.draftRows[0] ?? prep2.needsReview[0];
  const ok =
    prep1.publishedCount === 4 &&
    prep1.draftCount === 1 &&
    prep2.draftRows.length >= 1 &&
    result.publishedCount >= 4 &&
    result.draftCount >= 1;

  console.log("\n===", ok ? "PASS" : "FAIL", "===");
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
