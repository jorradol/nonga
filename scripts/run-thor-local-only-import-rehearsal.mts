/**
 * v6.6O — Thor local-only import rehearsal (guarded)
 *
 * Default: validate-only readiness — NO import, NO persist
 * Execute: requires --confirm-local-only (separate owner approval)
 *
 * Run:
 *   npm run run:thor-local-only-import-rehearsal
 *   npm run run:thor-local-only-import-rehearsal -- --confirm-local-only
 */
import fs from "node:fs";
import path from "node:path";
import { parseCsvTextToObjects } from "../src/utils/inventoryImport/csvParser.ts";
import {
  processSmartInventoryImport,
  type CommitImportOwner,
  type CommitImportRowInput,
} from "../src/server/inventoryImportCommit.ts";
import { getDealerDraftsSorted } from "../src/server/dealerDraftInventory.ts";
import { getDealerInventoryCars } from "../src/server/marketplaceInventory.ts";
import {
  normalizeDealerId,
  resolveParentDealerGroup,
  SIMULATED_THOR_DEALER_IDS,
  type SimulatedThorDealerId,
} from "../src/utils/dealerIdentity.ts";

const PRIVATE_BATCH_DIR = path.resolve(
  process.cwd(),
  ".private/thor-auto-manual-prep/activation-batch-v1"
);
const PRIVATE_CSV = path.join(PRIVATE_BATCH_DIR, "import-ready-candidates.csv");
const READINESS_REPORT = path.join(
  PRIVATE_BATCH_DIR,
  "local-only-rehearsal-readiness.json"
);

const IMPORT_BATCH_ID = "thor-activation-batch-v1";
const EXPECTED_COUNTS: Record<SimulatedThorDealerId, number> = {
  "sim-1thor": 4,
  "sim-2thor": 4,
  "sim-3thor": 2,
};

const BLOCKED_FIRESTORE_ENVS = [
  "NONGA_DATA_BACKEND",
  "FIREBASE_PROJECT_ID",
  "NONGA_FIREBASE_PROJECT_ID",
  "GOOGLE_CLOUD_PROJECT",
  "VITE_FIREBASE_PROJECT_ID",
] as const;

const BLOCKED_PROJECT_IDS = new Set([
  "nonga-ce93c",
  "nonga-production",
  "nonga-prod",
]);

const FULL_PLATE_PATTERN = /\b[ก-ฮ]{1,2}\s?[ก-ฮ\d]{1,4}\s?[-]?\s?[ก-ฮ\d]{1,4}\b/;
const MASKED_PLATE_PATTERN = /\*\*\*\*/;

interface CsvRow {
  batchId?: string;
  plannedDealerId?: string;
  parentDealerGroup?: string;
  dealerType?: string;
  brand?: string;
  model?: string;
  year?: string;
  mileage?: string;
  price?: string;
  plateMasked?: string;
  adminReviewStatus?: string;
  importReadiness?: string;
  photoLinks?: string;
  [key: string]: string | undefined;
}

interface ReadinessSummary {
  mode: "validate-only" | "local-only-execute";
  timestamp: string;
  privateCsvExists: boolean;
  totalRows: number;
  dealerCounts: Record<string, number>;
  expectedCounts: Record<string, number>;
  envGuardsPass: boolean;
  plateMaskedPass: boolean;
  mappingPass: boolean;
  readyForLocalOnlyExecution: boolean;
  importExecuted: boolean;
  importBatchId: string;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function pass(message: string) {
  console.log(`PASS ${message}`);
}

function parseArgs(argv: string[]) {
  return {
    confirmLocalOnly: argv.includes("--confirm-local-only"),
    publish: argv.includes("--publish"),
    createAccount: argv.includes("--create-account"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function assertNoBlockedFlags(flags: ReturnType<typeof parseArgs>) {
  if (flags.publish) fail("--publish is forbidden for local-only rehearsal");
  if (flags.createAccount) fail("--create-account is forbidden for local-only rehearsal");
}

function assertLocalDataBackend() {
  const backend = String(process.env.NONGA_DATA_BACKEND ?? "file").toLowerCase();
  if (backend === "firestore") {
    fail("NONGA_DATA_BACKEND=firestore is blocked — local-only requires file backend");
  }
  pass("NONGA_DATA_BACKEND is file (or unset)");
}

function assertNoFirestoreProjectTarget() {
  for (const key of BLOCKED_FIRESTORE_ENVS) {
    const value = String(process.env[key] ?? "").trim().toLowerCase();
    if (!value) continue;
    if (key === "NONGA_DATA_BACKEND" && value !== "firestore") continue;
    if (BLOCKED_PROJECT_IDS.has(value)) {
      fail(`${key}=${value} — staging/production Firestore target blocked`);
    }
    if (key === "NONGA_DATA_BACKEND" && value === "firestore") {
      fail(`${key}=firestore — Firestore backend blocked`);
    }
  }
  pass("No blocked Firestore project/backend env detected");
}

function assertPrivateArtifacts() {
  if (!fs.existsSync(PRIVATE_BATCH_DIR)) {
    fail(`Private batch dir missing: ${PRIVATE_BATCH_DIR}`);
  }
  if (!fs.existsSync(PRIVATE_CSV)) {
    fail(`Private CSV missing: ${PRIVATE_CSV}`);
  }
  pass("Private batch dir and import-ready-candidates.csv exist");
}

function loadAndValidateCsv(): CsvRow[] {
  const raw = fs.readFileSync(PRIVATE_CSV, "utf8");
  const rows = parseCsvTextToObjects(raw) as CsvRow[];
  if (rows.length !== 10) {
    fail(`Expected 10 CSV rows, got ${rows.length}`);
  }
  pass(`CSV row count = 10`);

  const counts: Record<string, number> = {};
  for (const sim of SIMULATED_THOR_DEALER_IDS) counts[sim] = 0;

  for (const row of rows) {
    const batchId = String(row.batchId ?? "").trim();
    const dealerId = normalizeDealerId(String(row.plannedDealerId ?? ""));
    const plateMasked = String(row.plateMasked ?? "").trim();

    if (!batchId.startsWith("BATCH-V1-")) {
      fail(`Invalid batchId format: ${batchId || "(empty)"}`);
    }
    if (!SIMULATED_THOR_DEALER_IDS.includes(dealerId as SimulatedThorDealerId)) {
      fail(`Unmapped plannedDealerId for ${batchId}`);
    }
    if (row.parentDealerGroup?.trim() !== "Thor Auto") {
      fail(`parentDealerGroup must be Thor Auto for ${batchId}`);
    }
    if (row.dealerType?.trim() !== "simulated") {
      fail(`dealerType must be simulated for ${batchId}`);
    }
    if (row.adminReviewStatus?.trim() !== "admin_approved") {
      fail(`adminReviewStatus must be admin_approved for ${batchId}`);
    }
    if (row.importReadiness?.trim() !== "import_ready_candidate") {
      fail(`importReadiness must be import_ready_candidate for ${batchId}`);
    }
    if (!MASKED_PLATE_PATTERN.test(plateMasked)) {
      fail(`plateMasked must contain **** for ${batchId}`);
    }
    if (FULL_PLATE_PATTERN.test(plateMasked.replace(/\*/g, ""))) {
      fail(`plateMasked appears to contain full plate for ${batchId}`);
    }

    counts[dealerId]++;
  }

  for (const sim of SIMULATED_THOR_DEALER_IDS) {
    if (counts[sim] !== EXPECTED_COUNTS[sim]) {
      fail(`${sim} count ${counts[sim]} !== expected ${EXPECTED_COUNTS[sim]}`);
    }
    pass(`${sim} count = ${EXPECTED_COUNTS[sim]}`);
  }

  return rows;
}

function buildOwner(dealerId: SimulatedThorDealerId): CommitImportOwner {
  return {
    dealerId,
    ownerId: `owner-${dealerId}`,
    ownerName: `${dealerId} (local rehearsal)`,
    ownerPhone: "0890000000",
    showroomName: `${dealerId} simulated partition`,
    address: "Local-only rehearsal — no public address",
  };
}

function csvRowToCommitInput(row: CsvRow, index: number): CommitImportRowInput {
  const batchId = String(row.batchId ?? "").trim();
  const year = Number(row.year) || new Date().getFullYear();
  const price = Number(String(row.price ?? "").replace(/,/g, "")) || 0;
  const mileage = Number(String(row.mileage ?? "").replace(/,/g, "")) || 0;
  const plateMasked = String(row.plateMasked ?? "").trim();

  return {
    sourceRowIndex: index + 1,
    importStatus: "valid",
    disposition: "draft",
    brand: String(row.brand ?? "").trim(),
    model: String(row.model ?? "").trim(),
    year,
    price,
    mileage,
    fuelType: "petrol",
    condition: "มือสอง",
    title: `${row.brand ?? ""} ${row.model ?? ""}`.trim().slice(0, 200),
    description: `[${IMPORT_BATCH_ID}] local-only draft rehearsal`,
    commitDraftId: `draft-${IMPORT_BATCH_ID}-${batchId.toLowerCase()}`,
    skipSourceImageDownload: true,
    sourceImageUrls: [],
    rawRow: {
      batchId,
      importBatchId: IMPORT_BATCH_ID,
      plannedDealerId: String(row.plannedDealerId ?? ""),
      parentDealerGroup: "Thor Auto",
      dealerType: "simulated",
      plateMasked,
      licensePlate: plateMasked,
      photoLinks: "private_google_drive",
    },
  };
}

function backupLocalData(): string {
  const dataDir = path.resolve(process.cwd(), "data");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const checkpointDir = path.join(dataDir, "checkpoints", `pre-${IMPORT_BATCH_ID}-${ts}`);
  fs.mkdirSync(checkpointDir, { recursive: true });

  for (const file of ["dealer-draft-inventory.json", "marketplace-inventory.json"]) {
    const src = path.join(dataDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(checkpointDir, file));
    }
  }
  pass(`Checkpoint created: ${checkpointDir}`);
  return checkpointDir;
}

function writeReadinessReport(summary: ReadinessSummary) {
  fs.mkdirSync(PRIVATE_BATCH_DIR, { recursive: true });
  fs.writeFileSync(READINESS_REPORT, JSON.stringify(summary, null, 2), "utf8");
  pass(`Readiness report written (private): ${READINESS_REPORT}`);
}

async function executeLocalOnlyImport(rows: CsvRow[]) {
  console.log("\n--- Local-only execute (draft-only) ---\n");
  assertLocalDataBackend();
  assertNoFirestoreProjectTarget();

  const checkpointDir = backupLocalData();
  const grouped: Record<SimulatedThorDealerId, CommitImportRowInput[]> = {
    "sim-1thor": [],
    "sim-2thor": [],
    "sim-3thor": [],
  };

  rows.forEach((row, i) => {
    const dealerId = normalizeDealerId(String(row.plannedDealerId ?? "")) as SimulatedThorDealerId;
    grouped[dealerId].push(csvRowToCommitInput(row, i));
  });

  let totalDrafts = 0;
  let totalPublished = 0;

  for (const sim of SIMULATED_THOR_DEALER_IDS) {
    const owner = buildOwner(sim);
    const result = await processSmartInventoryImport(
      { published: [], drafts: grouped[sim] },
      owner
    );
    if (result.publishedCount !== 0) {
      fail(`${sim}: publishedCount must be 0, got ${result.publishedCount}`);
    }
    if (result.draftCount !== grouped[sim].length) {
      fail(`${sim}: draftCount ${result.draftCount} !== expected ${grouped[sim].length}`);
    }
    totalDrafts += result.draftCount;
    totalPublished += result.publishedCount;
    pass(`${sim}: imported ${result.draftCount} drafts, published ${result.publishedCount}`);
  }

  if (totalPublished !== 0) fail(`total published must be 0, got ${totalPublished}`);
  if (totalDrafts !== 10) fail(`total drafts must be 10, got ${totalDrafts}`);

  for (const sim of SIMULATED_THOR_DEALER_IDS) {
    const drafts = getDealerDraftsSorted(sim);
    const batchDrafts = drafts.filter((d) =>
      String(d.rawRow?.importBatchId ?? "").includes(IMPORT_BATCH_ID)
    );
    if (batchDrafts.length !== EXPECTED_COUNTS[sim]) {
      fail(`${sim}: post-verify batch drafts ${batchDrafts.length} !== ${EXPECTED_COUNTS[sim]}`);
    }
    const published = getDealerInventoryCars(sim).filter(
      (c) => c.listingStatus === "published"
    );
    if (published.length > 0) {
      fail(`${sim}: found published cars after draft-only import`);
    }
    const parent = resolveParentDealerGroup(sim);
    if (parent !== "Thor Auto") {
      fail(`${sim}: resolveParentDealerGroup expected Thor Auto, got ${parent}`);
    }
    pass(`${sim}: post-verify drafts=${batchDrafts.length}, published=0, parent=Thor Auto`);
  }

  const execSummary = {
    mode: "local-only-execute",
    timestamp: new Date().toISOString(),
    importBatchId: IMPORT_BATCH_ID,
    totalDrafts,
    totalPublished,
    checkpointDir,
    dealerCounts: EXPECTED_COUNTS,
  };
  const execReportPath = path.join(PRIVATE_BATCH_DIR, "local-only-execution-summary.json");
  fs.writeFileSync(execReportPath, JSON.stringify(execSummary, null, 2), "utf8");
  pass(`Execution summary written (private): ${execReportPath}`);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.help) {
    console.log(`Thor local-only import rehearsal (v6.6O)

Default: validate-only — checks private artifacts and env guards, NO import.

Flags:
  --confirm-local-only   Execute draft-only local import (requires separate owner approval)
  --publish              BLOCKED
  --create-account       BLOCKED
  --help                 Show this help
`);
    return;
  }

  console.log("=== Thor Local-Only Import Rehearsal (v6.6O) ===\n");
  assertNoBlockedFlags(flags);

  assertPrivateArtifacts();
  assertLocalDataBackend();
  assertNoFirestoreProjectTarget();
  const rows = loadAndValidateCsv();

  const summary: ReadinessSummary = {
    mode: flags.confirmLocalOnly ? "local-only-execute" : "validate-only",
    timestamp: new Date().toISOString(),
    privateCsvExists: true,
    totalRows: rows.length,
    dealerCounts: { ...EXPECTED_COUNTS },
    expectedCounts: { ...EXPECTED_COUNTS },
    envGuardsPass: true,
    plateMaskedPass: true,
    mappingPass: true,
    readyForLocalOnlyExecution: true,
    importExecuted: false,
    importBatchId: IMPORT_BATCH_ID,
  };

  if (!flags.confirmLocalOnly) {
    writeReadinessReport(summary);
    console.log("\n=== VALIDATE-ONLY PASS ===");
    console.log("No import performed. Use --confirm-local-only only after separate owner approval.");
    return;
  }

  await executeLocalOnlyImport(rows);
  summary.importExecuted = true;
  writeReadinessReport(summary);
  console.log("\n=== LOCAL-ONLY EXECUTE PASS ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
