import "dotenv/config";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  DEALER_DRAFTS_COLLECTION,
  DEALER_LISTINGS_COLLECTION,
} from "../src/server/repositories/inventoryRepository.ts";
import {
  buildFirebaseImageStoragePath,
  createImageStorageRepository,
  type ListingImageTargetType,
  type StoredListingImageMetadata,
} from "../src/server/repositories/imageStorageRepository.ts";
import { processListingImageUpload } from "../src/server/listingImageProcessor.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import type { DealerDraftRecord } from "../src/server/dealerDraftInventory.ts";
import { normalizeDealerId } from "../src/utils/dealerIdentity.ts";

export interface MigrationCliOptions {
  dryRun: boolean;
  write: boolean;
  json: boolean;
  confirmStaging: boolean;
  allowProductionWrite: boolean;
  dealerId?: string;
  dealerIdMap: Record<string, string>;
  limit?: number;
  skipImages: boolean;
  skipListings: boolean;
  skipDrafts: boolean;
  overwrite: boolean;
  dataDir: string;
}

export interface MigrationExistingState {
  listingIds?: Set<string>;
  draftIds?: Set<string>;
}

export interface MigrationImagePlan {
  listingId: string;
  dealerId: string;
  targetType: ListingImageTargetType;
  sourcePath: string;
  fileName: string;
  imageId: string;
  storagePath: string;
  thumbnailStoragePath: string;
  size: number;
  mimeType: string;
  status: "planned" | "skipped" | "exists" | "error" | "uploaded";
  warning?: string;
}

export interface MigrationRecordPlan {
  id: string;
  dealerId?: string;
  sourceDealerId?: string;
  targetCollection: typeof DEALER_LISTINGS_COLLECTION | typeof DEALER_DRAFTS_COLLECTION;
  targetType: ListingImageTargetType;
  status: "planned" | "skipped" | "exists" | "written" | "error";
  reason?: string;
  images: MigrationImagePlan[];
  sourceImageCount: number;
  migratedImageCount: number;
  warnings: string[];
}

export interface MigrationPlan {
  mode: "dry-run" | "write";
  options: Omit<MigrationCliOptions, "json">;
  sources: {
    marketplaceFile: string;
    draftsFile: string;
    imageRoot: string;
  };
  targets: {
    listingsCollection: typeof DEALER_LISTINGS_COLLECTION;
    draftsCollection: typeof DEALER_DRAFTS_COLLECTION;
    listingImagePath: "listing-images/{dealerId}/{listingId}/{fileName}";
    draftImagePath: "draft-images/{dealerId}/{draftId}/{fileName}";
  };
  counts: {
    marketplaceListingsFound: number;
    draftsFound: number;
    imageFoldersFound: number;
    imageFilesFound: number;
    imageFilesPlanned: number;
    recordsWithDealerId: number;
    recordsMissingDealerId: number;
    listingsPlanned: number;
    draftsPlanned: number;
    recordsPointingToMissingImageFiles: number;
    imageFoldersWithoutMatchingRecord: number;
    duplicateStoragePathGroups: number;
    recordsExisting: number;
    recordsSkipped: number;
    warnings: number;
    errors: number;
  };
  existingCheck:
    | "provided"
    | "checked-firestore"
    | "skipped-dry-run-no-credentials";
  safety: MigrationWriteSafety;
  listings: MigrationRecordPlan[];
  drafts: MigrationRecordPlan[];
  readiness: MigrationReadinessReport;
  warnings: string[];
  errors: string[];
}

type SourceRecord = MarketplaceCarRecord | DealerDraftRecord;

export interface MigrationWriteSafety {
  ok: boolean;
  projectId: string;
  storageBucket?: string;
  targetKind: "dry-run" | "staging" | "production-like" | "unknown";
  warnings: string[];
  errors: string[];
}

export interface MigrationDealerDistributionRow {
  dealerId: string;
  listings: number;
  drafts: number;
  total: number;
  mappedTo?: string;
}

export interface MigrationDealerMappingReport {
  sourceDealerId: string;
  targetDealerId: string;
  records: number;
}

export interface MigrationMissingImageRecordReport {
  id: string;
  targetType: ListingImageTargetType;
  dealerId?: string;
  sourceDealerId?: string;
  sourceImageCount: number;
}

export interface MigrationDuplicateStoragePathReport {
  storagePath: string;
  count: number;
}

export interface MigrationReadinessReport {
  dealerIds: MigrationDealerDistributionRow[];
  dealerIdMappings: MigrationDealerMappingReport[];
  recordsPointingToMissingImageFiles: MigrationMissingImageRecordReport[];
  imageFoldersWithoutMatchingRecord: string[];
  duplicateStoragePaths: MigrationDuplicateStoragePathReport[];
}

function parseArgs(argv: string[]): MigrationCliOptions {
  const opts: MigrationCliOptions = {
    dryRun: true,
    write: false,
    json: false,
    confirmStaging: false,
    allowProductionWrite: false,
    dealerIdMap: {},
    skipImages: false,
    skipListings: false,
    skipDrafts: false,
    overwrite: false,
    dataDir: path.resolve(process.cwd(), "data"),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--write") {
      opts.write = true;
      opts.dryRun = false;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
      opts.write = false;
    } else if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--confirm-staging") {
      opts.confirmStaging = true;
    } else if (arg === "--allow-production-write") {
      opts.allowProductionWrite = true;
    } else if (arg === "--map-dealer-id") {
      const [source, target] = parseDealerIdMapping(argv[++i] ?? "");
      opts.dealerIdMap[source] = target;
    } else if (arg.startsWith("--map-dealer-id=")) {
      const [source, target] = parseDealerIdMapping(arg.slice("--map-dealer-id=".length));
      opts.dealerIdMap[source] = target;
    } else if (arg === "--skip-images") {
      opts.skipImages = true;
    } else if (arg === "--skip-listings") {
      opts.skipListings = true;
    } else if (arg === "--skip-drafts") {
      opts.skipDrafts = true;
    } else if (arg === "--overwrite") {
      opts.overwrite = true;
    } else if (arg === "--dealer-id") {
      opts.dealerId = normalizeDealerId(argv[++i] ?? "");
    } else if (arg.startsWith("--dealer-id=")) {
      opts.dealerId = normalizeDealerId(arg.slice("--dealer-id=".length));
    } else if (arg === "--limit") {
      opts.limit = Number(argv[++i] ?? 0) || undefined;
    } else if (arg.startsWith("--limit=")) {
      opts.limit = Number(arg.slice("--limit=".length)) || undefined;
    } else if (arg === "--data-dir") {
      opts.dataDir = path.resolve(argv[++i] ?? opts.dataDir);
    } else if (arg.startsWith("--data-dir=")) {
      opts.dataDir = path.resolve(arg.slice("--data-dir=".length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (opts.write && opts.dryRun) opts.dryRun = false;
  return opts;
}

function parseDealerIdMapping(value: string): [string, string] {
  const [sourceRaw, targetRaw, ...rest] = value.split("=");
  const source = normalizeDealerId(sourceRaw ?? "");
  const target = normalizeDealerId(targetRaw ?? "");
  if (!source || !target || rest.length > 0) {
    throw new Error("--map-dealer-id requires source=target");
  }
  return [source, target];
}

export function evaluateWriteSafety(
  options: Pick<
    MigrationCliOptions,
    "write" | "skipImages" | "confirmStaging" | "allowProductionWrite"
  >,
  env: NodeJS.ProcessEnv = process.env
): MigrationWriteSafety {
  const projectId =
    env.FIREBASE_PROJECT_ID?.trim() ||
    env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    env.GOOGLE_CLOUD_PROJECT?.trim() ||
    env.GCLOUD_PROJECT?.trim() ||
    "";
  const storageBucket =
    env.FIREBASE_STORAGE_BUCKET?.trim() ||
    env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
    "";
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!options.write) {
    return {
      ok: true,
      projectId,
      ...(storageBucket ? { storageBucket } : {}),
      targetKind: "dry-run",
      warnings,
      errors,
    };
  }

  if (!options.confirmStaging) {
    errors.push("--write requires --confirm-staging after reviewing dry-run output");
  }
  if (!projectId) {
    errors.push("Missing FIREBASE_PROJECT_ID for --write");
  }
  const projectLooksProduction = /(^|[-_])(prod|production|live)([-_]|$)/i.test(
    projectId
  );
  if (projectLooksProduction && !options.allowProductionWrite) {
    errors.push(
      `Refusing --write to production-like Firebase project "${projectId}" without --allow-production-write`
    );
  }
  if (!options.skipImages && !storageBucket) {
    errors.push("Missing FIREBASE_STORAGE_BUCKET for image migration; use --skip-images to skip");
  }

  if (options.allowProductionWrite) {
    warnings.push(
      "--allow-production-write was provided; this should not be used before Online Beta sign-off"
    );
  }

  return {
    ok: errors.length === 0,
    projectId,
    ...(storageBucket ? { storageBucket } : {}),
    targetKind: projectLooksProduction
      ? "production-like"
      : projectId
        ? "staging"
        : "unknown",
    warnings,
    errors,
  };
}

function readJsonArray<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function explicitDealerId(record: SourceRecord): string {
  const dealerId = normalizeDealerId(String(record.dealerId ?? ""));
  return dealerId;
}

function mapDealerId(sourceDealerId: string, dealerIdMap: Record<string, string>): string {
  return dealerIdMap[sourceDealerId] ?? sourceDealerId;
}

function isMigratableImage(fileName: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(fileName) && !fileName.startsWith("thumb-");
}

function mimeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function imageIdFromFileName(fileName: string): string {
  return fileName.replace(/\.(jpe?g|png|webp|gif)$/i, "");
}

function plannedUploadFileName(fileName: string): string {
  return `${imageIdFromFileName(fileName)}.webp`;
}

function imageFolderStats(imageRoot: string): { folders: number; files: number } {
  if (!fs.existsSync(imageRoot)) return { folders: 0, files: 0 };
  let folders = 0;
  let files = 0;
  for (const entry of fs.readdirSync(imageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    folders++;
    const dir = path.join(imageRoot, entry.name);
    files += fs
      .readdirSync(dir)
      .filter((name) => /\.(jpe?g|png|webp|gif)$/i.test(name)).length;
  }
  return { folders, files };
}

function collectRecordImages(params: {
  dataDir: string;
  recordId: string;
  dealerId: string;
  targetType: ListingImageTargetType;
  skipImages: boolean;
}): MigrationImagePlan[] {
  if (params.skipImages) return [];
  const dir = path.join(params.dataDir, "listing-images", params.recordId);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter(isMigratableImage)
    .sort()
    .map((fileName, index) => {
      const sourcePath = path.join(dir, fileName);
      const uploadFileName = plannedUploadFileName(fileName);
      const storagePath = buildFirebaseImageStoragePath(
        params.dealerId,
        params.recordId,
        uploadFileName,
        params.targetType
      );
      const thumbnailStoragePath = buildFirebaseImageStoragePath(
        params.dealerId,
        params.recordId,
        `thumb-${uploadFileName}`,
        params.targetType
      );
      return {
        listingId: params.recordId,
        dealerId: params.dealerId,
        targetType: params.targetType,
        sourcePath,
        fileName,
        imageId: imageIdFromFileName(fileName),
        storagePath,
        thumbnailStoragePath,
        size: fs.statSync(sourcePath).size,
        mimeType: mimeFromFileName(fileName),
        status: "planned",
        sortOrder: index,
      } satisfies MigrationImagePlan & { sortOrder: number };
    });
}

function buildRecordPlan(params: {
  record: SourceRecord;
  dataDir: string;
  targetCollection: typeof DEALER_LISTINGS_COLLECTION | typeof DEALER_DRAFTS_COLLECTION;
  targetType: ListingImageTargetType;
  existingIds?: Set<string>;
  skipImages: boolean;
  overwrite: boolean;
  dealerIdMap: Record<string, string>;
}): MigrationRecordPlan {
  const sourceDealerId = explicitDealerId(params.record);
  const dealerId = sourceDealerId ? mapDealerId(sourceDealerId, params.dealerIdMap) : "";
  const warnings: string[] = [];
  const recordId = String(params.record.id ?? "").trim();

  if (!recordId) {
    return {
      id: "",
      targetCollection: params.targetCollection,
      targetType: params.targetType,
      status: "skipped",
      reason: "missing_id",
      images: [],
      sourceImageCount: 0,
      migratedImageCount: 0,
      warnings: ["Record is missing id"],
    };
  }

  if (!sourceDealerId) {
    return {
      id: recordId,
      targetCollection: params.targetCollection,
      targetType: params.targetType,
      status: "skipped",
      reason: "missing_dealer_id",
      images: [],
      sourceImageCount: Array.isArray(params.record.images)
        ? params.record.images.length
        : 0,
      migratedImageCount: 0,
      warnings: [`${recordId} skipped: explicit dealerId is missing`],
    };
  }

  if (params.existingIds?.has(recordId) && !params.overwrite) {
    return {
      id: recordId,
      dealerId,
      ...(sourceDealerId !== dealerId ? { sourceDealerId } : {}),
      targetCollection: params.targetCollection,
      targetType: params.targetType,
      status: "exists",
      reason: "target_exists_no_overwrite",
      images: [],
      sourceImageCount: Array.isArray(params.record.images)
        ? params.record.images.length
        : 0,
      migratedImageCount: 0,
      warnings: [`${recordId} exists in ${params.targetCollection}; skipping`],
    };
  }

  const images = collectRecordImages({
    dataDir: params.dataDir,
    recordId,
    dealerId,
    targetType: params.targetType,
    skipImages: params.skipImages,
  });
  if (!params.skipImages && images.length === 0 && (params.record.images?.length ?? 0) > 0) {
    warnings.push(`${recordId} has image URLs but no local image files were found`);
  }

  return {
    id: recordId,
    dealerId,
    ...(sourceDealerId !== dealerId ? { sourceDealerId } : {}),
    targetCollection: params.targetCollection,
    targetType: params.targetType,
    status: "planned",
    images,
    sourceImageCount: Array.isArray(params.record.images) ? params.record.images.length : 0,
    migratedImageCount: images.length,
    warnings,
  };
}

export function createMigrationPlan(
  options: Partial<MigrationCliOptions> = {},
  existing: MigrationExistingState = {},
  safety?: MigrationWriteSafety
): MigrationPlan {
  const opts: MigrationCliOptions = {
    dryRun: true,
    write: false,
    json: false,
    confirmStaging: false,
    allowProductionWrite: false,
    dealerIdMap: {},
    skipImages: false,
    skipListings: false,
    skipDrafts: false,
    overwrite: false,
    dataDir: path.resolve(process.cwd(), "data"),
    ...options,
  };
  const marketplaceFile = path.join(opts.dataDir, "marketplace-inventory.json");
  const draftsFile = path.join(opts.dataDir, "dealer-draft-inventory.json");
  const imageRoot = path.join(opts.dataDir, "listing-images");
  const marketplace = opts.skipListings
    ? []
    : readJsonArray<MarketplaceCarRecord>(marketplaceFile);
  const drafts = opts.skipDrafts ? [] : readJsonArray<DealerDraftRecord>(draftsFile);
  const filterDealer = opts.dealerId ? normalizeDealerId(opts.dealerId) : undefined;

  const filteredListings = marketplace
    .filter((item) => {
      const sourceDealerId = explicitDealerId(item);
      const targetDealerId = mapDealerId(sourceDealerId, opts.dealerIdMap);
      return !filterDealer || sourceDealerId === filterDealer || targetDealerId === filterDealer;
    })
    .slice(0, opts.limit ?? marketplace.length);
  const filteredDrafts = drafts
    .filter((item) => {
      const sourceDealerId = explicitDealerId(item);
      const targetDealerId = mapDealerId(sourceDealerId, opts.dealerIdMap);
      return !filterDealer || sourceDealerId === filterDealer || targetDealerId === filterDealer;
    })
    .slice(0, opts.limit ?? drafts.length);

  const listingPlans = filteredListings.map((record) =>
    buildRecordPlan({
      record,
      dataDir: opts.dataDir,
      targetCollection: DEALER_LISTINGS_COLLECTION,
      targetType: "listing",
      existingIds: existing.listingIds,
      skipImages: opts.skipImages,
      overwrite: opts.overwrite,
      dealerIdMap: opts.dealerIdMap,
    })
  );
  const draftPlans = filteredDrafts.map((record) =>
    buildRecordPlan({
      record,
      dataDir: opts.dataDir,
      targetCollection: DEALER_DRAFTS_COLLECTION,
      targetType: "draft",
      existingIds: existing.draftIds,
      skipImages: opts.skipImages,
      overwrite: opts.overwrite,
      dealerIdMap: opts.dealerIdMap,
    })
  );
  const imageStats = imageFolderStats(imageRoot);
  const allPlans = [...listingPlans, ...draftPlans];
  const readiness = buildReadinessReport({
    marketplace,
    drafts,
    imageRoot,
    plans: allPlans,
    dealerIdMap: opts.dealerIdMap,
  });
  const warnings = allPlans.flatMap((plan) => plan.warnings);
  const errors: string[] = [];

  return {
    mode: opts.write ? "write" : "dry-run",
    options: {
      dryRun: !opts.write,
      write: opts.write,
      confirmStaging: opts.confirmStaging,
      allowProductionWrite: opts.allowProductionWrite,
      dealerId: opts.dealerId,
      dealerIdMap: opts.dealerIdMap,
      limit: opts.limit,
      skipImages: opts.skipImages,
      skipListings: opts.skipListings,
      skipDrafts: opts.skipDrafts,
      overwrite: opts.overwrite,
      dataDir: opts.dataDir,
    },
    sources: { marketplaceFile, draftsFile, imageRoot },
    targets: {
      listingsCollection: DEALER_LISTINGS_COLLECTION,
      draftsCollection: DEALER_DRAFTS_COLLECTION,
      listingImagePath: "listing-images/{dealerId}/{listingId}/{fileName}",
      draftImagePath: "draft-images/{dealerId}/{draftId}/{fileName}",
    },
    counts: {
      marketplaceListingsFound: marketplace.length,
      draftsFound: drafts.length,
      imageFoldersFound: imageStats.folders,
      imageFilesFound: imageStats.files,
      imageFilesPlanned: allPlans.reduce((sum, plan) => sum + plan.images.length, 0),
      recordsWithDealerId: allPlans.filter((plan) => Boolean(plan.dealerId)).length,
      recordsMissingDealerId: allPlans.filter((plan) => plan.reason === "missing_dealer_id")
        .length,
      listingsPlanned: listingPlans.filter((plan) => plan.status === "planned").length,
      draftsPlanned: draftPlans.filter((plan) => plan.status === "planned").length,
      recordsPointingToMissingImageFiles:
        readiness.recordsPointingToMissingImageFiles.length,
      imageFoldersWithoutMatchingRecord: readiness.imageFoldersWithoutMatchingRecord.length,
      duplicateStoragePathGroups: readiness.duplicateStoragePaths.length,
      recordsExisting: allPlans.filter((plan) => plan.status === "exists").length,
      recordsSkipped: allPlans.filter((plan) =>
        ["skipped", "exists"].includes(plan.status)
      ).length,
      warnings: warnings.length,
      errors: errors.length,
    },
    existingCheck:
      existing.listingIds || existing.draftIds
        ? "provided"
        : "skipped-dry-run-no-credentials",
    safety:
      safety ??
      evaluateWriteSafety({
        write: opts.write,
        skipImages: opts.skipImages,
        confirmStaging: opts.confirmStaging,
        allowProductionWrite: opts.allowProductionWrite,
      }),
    listings: listingPlans,
    drafts: draftPlans,
    readiness,
    warnings: [...warnings, ...(safety?.warnings ?? [])],
    errors: [...errors, ...(safety?.errors ?? [])],
  };
}

function buildReadinessReport(params: {
  marketplace: MarketplaceCarRecord[];
  drafts: DealerDraftRecord[];
  imageRoot: string;
  plans: MigrationRecordPlan[];
  dealerIdMap: Record<string, string>;
}): MigrationReadinessReport {
  const dealerRows = new Map<string, MigrationDealerDistributionRow>();
  const touchDealer = (
    sourceDealerId: string,
    targetType: ListingImageTargetType
  ): void => {
    const key = sourceDealerId || "(missing)";
    const existing =
      dealerRows.get(key) ??
      ({
        dealerId: key,
        listings: 0,
        drafts: 0,
        total: 0,
        ...(sourceDealerId && params.dealerIdMap[sourceDealerId]
          ? { mappedTo: params.dealerIdMap[sourceDealerId] }
          : {}),
      } satisfies MigrationDealerDistributionRow);
    if (targetType === "listing") existing.listings += 1;
    else existing.drafts += 1;
    existing.total += 1;
    dealerRows.set(key, existing);
  };

  for (const record of params.marketplace) touchDealer(explicitDealerId(record), "listing");
  for (const record of params.drafts) touchDealer(explicitDealerId(record), "draft");

  const sourceIds = new Set(
    [...params.marketplace, ...params.drafts]
      .map((record) => String(record.id ?? "").trim())
      .filter(Boolean)
  );
  const imageFoldersWithoutMatchingRecord = fs.existsSync(params.imageRoot)
    ? fs
        .readdirSync(params.imageRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !sourceIds.has(entry.name))
        .map((entry) => entry.name)
        .sort()
    : [];

  const recordsPointingToMissingImageFiles = params.plans
    .filter((plan) => plan.status === "planned")
    .filter((plan) => plan.sourceImageCount > 0 && plan.images.length === 0)
    .map((plan) => ({
      id: plan.id,
      targetType: plan.targetType,
      ...(plan.dealerId ? { dealerId: plan.dealerId } : {}),
      ...(plan.sourceDealerId ? { sourceDealerId: plan.sourceDealerId } : {}),
      sourceImageCount: plan.sourceImageCount,
    }));

  const storagePathCounts = new Map<string, number>();
  for (const image of params.plans.flatMap((plan) => plan.images)) {
    for (const storagePath of [image.storagePath, image.thumbnailStoragePath]) {
      storagePathCounts.set(storagePath, (storagePathCounts.get(storagePath) ?? 0) + 1);
    }
  }
  const duplicateStoragePaths = [...storagePathCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([storagePath, count]) => ({ storagePath, count }))
    .sort((a, b) => b.count - a.count || a.storagePath.localeCompare(b.storagePath));

  const mappedRecords = new Map<string, MigrationDealerMappingReport>();
  for (const plan of params.plans) {
    if (!plan.sourceDealerId || !plan.dealerId || plan.sourceDealerId === plan.dealerId) continue;
    const key = `${plan.sourceDealerId}=>${plan.dealerId}`;
    const existing =
      mappedRecords.get(key) ??
      ({
        sourceDealerId: plan.sourceDealerId,
        targetDealerId: plan.dealerId,
        records: 0,
      } satisfies MigrationDealerMappingReport);
    existing.records += 1;
    mappedRecords.set(key, existing);
  }

  return {
    dealerIds: [...dealerRows.values()].sort(
      (a, b) => b.total - a.total || a.dealerId.localeCompare(b.dealerId)
    ),
    dealerIdMappings: [...mappedRecords.values()],
    recordsPointingToMissingImageFiles,
    imageFoldersWithoutMatchingRecord,
    duplicateStoragePaths,
  };
}

function firebaseEnvReady(skipImages: boolean): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  const hasCred =
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) ||
    (Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim()) &&
      Boolean(process.env.FIREBASE_PRIVATE_KEY?.trim())) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
  if (!hasCred) {
    missing.push(
      "FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS"
    );
  }
  if (!skipImages) {
    const bucket =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
    if (!bucket) missing.push("FIREBASE_STORAGE_BUCKET");
  }
  return missing.length ? { ok: false, missing } : { ok: true };
}

function initializeAdminForMigration() {
  if (getApps().length > 0) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId,
      ...(storageBucket ? { storageBucket } : {}),
    });
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
      ...(storageBucket ? { storageBucket } : {}),
    });
  }
  return initializeApp({
    credential: applicationDefault(),
    projectId,
    ...(storageBucket ? { storageBucket } : {}),
  });
}

async function readExistingStateFromFirestore(
  listingIds: string[],
  draftIds: string[]
): Promise<MigrationExistingState> {
  const db = getFirestore(initializeAdminForMigration());
  const listingSet = new Set<string>();
  const draftSet = new Set<string>();
  for (const id of listingIds) {
    if ((await db.collection(DEALER_LISTINGS_COLLECTION).doc(id).get()).exists) {
      listingSet.add(id);
    }
  }
  for (const id of draftIds) {
    if ((await db.collection(DEALER_DRAFTS_COLLECTION).doc(id).get()).exists) {
      draftSet.add(id);
    }
  }
  return { listingIds: listingSet, draftIds: draftSet };
}

async function uploadImagesForRecord(
  recordPlan: MigrationRecordPlan
): Promise<StoredListingImageMetadata[]> {
  const repo = createImageStorageRepository("firebase-storage");
  const metadata: StoredListingImageMetadata[] = [];
  for (const image of recordPlan.images) {
    try {
      const buffer = fs.readFileSync(image.sourcePath);
      const processed = await processListingImageUpload(buffer, image.mimeType, image.fileName);
      if (processed.ok === false) {
        image.status = "error";
        image.warning = processed.error;
        continue;
      }
      const uploaded = await repo.uploadListingImagePair(
        image.dealerId,
        image.listingId,
        {
          mainBuffer: processed.data.mainBuffer,
          thumbBuffer: processed.data.thumbBuffer,
          ext: processed.data.mainExt,
          mimeType: processed.data.mainExt === ".webp" ? "image/webp" : "image/jpeg",
          imageId: image.imageId,
          originalFileName: image.fileName,
          seed: image.fileName,
          width: processed.data.mainWidth,
          height: processed.data.mainHeight,
          sortOrder: metadata.length,
          targetType: image.targetType,
        }
      );
      image.status = "uploaded";
      image.storagePath = uploaded.metadata.storagePath;
      image.thumbnailStoragePath = uploaded.metadata.thumbnailPath ?? image.thumbnailStoragePath;
      metadata.push(uploaded.metadata);
    } catch (err: unknown) {
      image.status = "error";
      image.warning = err instanceof Error ? err.message : "upload failed";
    }
  }
  return metadata;
}

function recordWithMigratedImages(
  source: SourceRecord,
  imageMetadata: StoredListingImageMetadata[],
  targetDealerId: string
): Record<string, unknown> {
  const sourceRecord = source as unknown as Record<string, unknown>;
  if (imageMetadata.length === 0) return { ...sourceRecord, dealerId: targetDealerId };
  const imageUrls = imageMetadata.map((item) => item.imageUrl);
  const next = {
    ...sourceRecord,
    dealerId: targetDealerId,
    images: imageUrls,
    sourceImageUrls: Array.isArray(source.images) ? [...source.images] : [],
    imageMetadata,
  };
  return next;
}

async function writePlan(plan: MigrationPlan): Promise<MigrationPlan> {
  const env = firebaseEnvReady(plan.options.skipImages);
  if (env.ok === false) {
    plan.errors.push(`Missing required Firebase env for --write: ${env.missing.join(", ")}`);
    plan.counts.errors = plan.errors.length;
    return plan;
  }
  const db = getFirestore(initializeAdminForMigration());
  const marketplace = readJsonArray<MarketplaceCarRecord>(plan.sources.marketplaceFile);
  const drafts = readJsonArray<DealerDraftRecord>(plan.sources.draftsFile);
  const byId = new Map<string, SourceRecord>(
    [...marketplace, ...drafts].map((record) => [String(record.id), record])
  );

  for (const recordPlan of [...plan.listings, ...plan.drafts]) {
    if (recordPlan.status !== "planned") continue;
    const source = byId.get(recordPlan.id);
    if (!source || !recordPlan.dealerId) {
      recordPlan.status = "error";
      recordPlan.reason = "source_missing";
      plan.errors.push(`${recordPlan.id}: source record missing during write`);
      continue;
    }
    const doc = db.collection(recordPlan.targetCollection).doc(recordPlan.id);
    const existing = await doc.get();
    if (existing.exists && !plan.options.overwrite) {
      recordPlan.status = "exists";
      recordPlan.reason = "target_exists_no_overwrite";
      recordPlan.warnings.push(`${recordPlan.id} exists; not overwritten`);
      continue;
    }
    const imageMetadata = plan.options.skipImages
      ? []
      : await uploadImagesForRecord(recordPlan);
    await doc.set(recordWithMigratedImages(source, imageMetadata, recordPlan.dealerId));
    recordPlan.status = "written";
    recordPlan.migratedImageCount = imageMetadata.length;
  }

  plan.warnings = [...plan.listings, ...plan.drafts].flatMap((item) => item.warnings);
  plan.errors.push(
    ...[...plan.listings, ...plan.drafts]
      .flatMap((item) => item.images)
      .filter((item) => item.status === "error")
      .map((item) => `${item.listingId}/${item.fileName}: ${item.warning ?? "image failed"}`)
  );
  plan.counts.recordsExisting = [...plan.listings, ...plan.drafts].filter(
    (item) => item.status === "exists"
  ).length;
  plan.counts.recordsSkipped = [...plan.listings, ...plan.drafts].filter((item) =>
    ["skipped", "exists"].includes(item.status)
  ).length;
  plan.counts.errors = plan.errors.length;
  plan.counts.warnings = plan.warnings.length;
  return plan;
}

function printHuman(plan: MigrationPlan): void {
  console.log("=== Nong A v5.0 File Data To Firestore/Storage Migration ===");
  console.log(`Mode: ${plan.mode}`);
  console.log(`Source marketplace: ${plan.sources.marketplaceFile}`);
  console.log(`Source drafts: ${plan.sources.draftsFile}`);
  console.log(`Source images: ${plan.sources.imageRoot}`);
  console.log(`Target Firestore: ${plan.targets.listingsCollection}, ${plan.targets.draftsCollection}`);
  console.log(`Target Storage: ${plan.targets.listingImagePath}, ${plan.targets.draftImagePath}`);
  if (Object.keys(plan.options.dealerIdMap).length > 0) {
    console.log(
      `Dealer ID mappings: ${Object.entries(plan.options.dealerIdMap)
        .map(([source, target]) => `${source}=>${target}`)
        .join(", ")}`
    );
  }
  if (plan.mode === "write") {
    console.log(`Firebase project: ${plan.safety.projectId || "(missing)"}`);
    console.log(`Firebase target kind: ${plan.safety.targetKind}`);
    console.log(`Firebase storage bucket: ${plan.safety.storageBucket || "(missing)"}`);
  }
  console.log("");
  console.log(`Marketplace listings found: ${plan.counts.marketplaceListingsFound}`);
  console.log(`Drafts found: ${plan.counts.draftsFound}`);
  console.log(`Image folders/files found: ${plan.counts.imageFoldersFound}/${plan.counts.imageFilesFound}`);
  console.log(`Records with dealerId: ${plan.counts.recordsWithDealerId}`);
  console.log(`Records missing dealerId: ${plan.counts.recordsMissingDealerId}`);
  console.log(`Listings planned: ${plan.counts.listingsPlanned}`);
  console.log(`Drafts planned: ${plan.counts.draftsPlanned}`);
  console.log(`Images planned: ${plan.counts.imageFilesPlanned}`);
  console.log(
    `Records pointing to missing image files: ${plan.counts.recordsPointingToMissingImageFiles}`
  );
  console.log(
    `Image folders without matching record: ${plan.counts.imageFoldersWithoutMatchingRecord}`
  );
  console.log(`Duplicate planned Storage path groups: ${plan.counts.duplicateStoragePathGroups}`);
  console.log(`Existing/skipped: ${plan.counts.recordsExisting}/${plan.counts.recordsSkipped}`);
  if (plan.warnings.length) {
    console.log("");
    console.log("Warnings:");
    for (const warning of plan.warnings.slice(0, 20)) console.log(`- ${warning}`);
    if (plan.warnings.length > 20) console.log(`- ... ${plan.warnings.length - 20} more`);
  }
  if (plan.errors.length) {
    console.log("");
    console.log("Errors:");
    for (const error of plan.errors.slice(0, 20)) console.log(`- ${error}`);
  }
  if (plan.mode === "dry-run") {
    console.log("");
    console.log("Dry-run only. No Firestore documents, Storage objects, or local files were changed.");
    console.log("Use --write to write, and --overwrite only after reviewing existing records.");
  } else {
    console.log("");
    console.log("Write mode confirmed. Source data files are still preserved and never deleted.");
  }
}

export async function runMigrationCli(argv = process.argv.slice(2)): Promise<MigrationPlan> {
  const options = parseArgs(argv);
  const initialSafety = evaluateWriteSafety({
    write: options.write,
    skipImages: options.skipImages,
    confirmStaging: options.confirmStaging,
    allowProductionWrite: options.allowProductionWrite,
  });
  let existing: MigrationExistingState = {};
  let plan = createMigrationPlan(options, existing, initialSafety);

  if (options.write && !initialSafety.ok) {
    plan.counts.errors = plan.errors.length;
    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      printHuman(plan);
    }
    return plan;
  }

  if (options.write) {
    const marketplaceFile = path.join(options.dataDir, "marketplace-inventory.json");
    const draftsFile = path.join(options.dataDir, "dealer-draft-inventory.json");
    const listingIds = options.skipListings
      ? []
      : readJsonArray<MarketplaceCarRecord>(marketplaceFile).map((record) => String(record.id));
    const draftIds = options.skipDrafts
      ? []
      : readJsonArray<DealerDraftRecord>(draftsFile).map((record) => String(record.id));
    existing = await readExistingStateFromFirestore(listingIds, draftIds);
    plan = createMigrationPlan(options, existing, initialSafety);
  }

  plan.existingCheck = options.write ? "checked-firestore" : plan.existingCheck;
  const result = options.write ? await writePlan(plan) : plan;

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runMigrationCli().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
