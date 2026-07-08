import {
  bulkAddMarketplaceCars,
  type MarketplaceCarRecord,
  devMarketplaceLog,
} from "./marketplaceInventory";
import {
  bulkAddDealerDrafts,
  type DealerDraftRecord,
  type DraftInventoryStatus,
} from "./dealerDraftInventory";
import { inferMarketplaceCategoryType } from "../utils/marketplaceCarMapper";
import {
  createEmptyNormalizedRow,
  type NormalizedInventoryRow,
} from "../utils/inventoryImport/inventoryImportSchema";
import { normalizeDealerId } from "../utils/dealerIdentity";
import {
  extractVinFromText,
  normalizePlate,
} from "../utils/duplicateDetection/textSimilarity";
import type { ImportDisposition } from "../utils/inventoryImport/importConfidence";
import { runImportDuplicateChecks } from "./duplicateDetectionService";
import {
  downloadListingImagesForCar,
  isLocalListingImageUrl,
  resolveStoredImagesForListing,
  type BulkImageDownloadSummary,
  type RowImageDownloadReport,
} from "./listingImageStorage";
import {
  extractStorageListingId,
  sanitizeListingImagesForId,
} from "../utils/listingImages";
import { THOR_AUTO_DEALER_ID } from "../utils/dealerIdentity";
import { isForbiddenRawKey } from "../utils/inventoryImport/import/forbiddenRawKeys";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600";

interface ImportPolicy {
  thorControlledStagingGuard: boolean;
  allowSensitiveVehicleFields: boolean;
  allowPrivateContactFields: boolean;
  allowOwnerAddressInDescription: boolean;
  forceNoPublicListingActivation: boolean;
  blockForbiddenRawKeys: boolean;
}

function resolveImportPolicy(
  owner: CommitImportOwner,
  input: SmartCommitInput
): ImportPolicy {
  const dealerSet = new Set<string>();
  const addDealer = (value: unknown) => {
    const normalized = normalizeDealerId(String(value ?? "").trim());
    if (normalized) dealerSet.add(normalized);
  };

  addDealer(owner.dealerId);
  for (const row of [...(input.published ?? []), ...(input.drafts ?? [])]) {
    addDealer(row.ownerId);
    addDealer(row.rawRow?.dealerId);
  }
  const thorControlled = dealerSet.has(THOR_AUTO_DEALER_ID);
  const thorForceHiddenRaw = String(
    process.env.NONGA_THOR_IMPORT_FORCE_HIDDEN ?? ""
  )
    .trim()
    .toLowerCase();
  const thorForceHidden =
    thorControlled &&
    (thorForceHiddenRaw === "1" ||
      thorForceHiddenRaw === "true" ||
      thorForceHiddenRaw === "yes");

  return {
    thorControlledStagingGuard: thorControlled,
    allowSensitiveVehicleFields: !thorControlled,
    allowPrivateContactFields: !thorControlled,
    allowOwnerAddressInDescription: !thorControlled,
    forceNoPublicListingActivation: thorForceHidden,
    blockForbiddenRawKeys: thorControlled,
  };
}

function sanitizeOwnerForPolicy(
  owner: CommitImportOwner,
  policy: ImportPolicy
): CommitImportOwner {
  if (!policy.thorControlledStagingGuard) return owner;
  const safeDisplayName = String(owner.showroomName ?? owner.ownerName ?? "")
    .trim()
    .slice(0, 120);
  return {
    ...owner,
    ownerName: safeDisplayName || "Thor Auto",
    ownerPhone: undefined,
    address: undefined,
  };
}

function scrubPublicSaleSafeText(value: string, policy: ImportPolicy): string {
  const text = String(value ?? "");
  if (!policy.thorControlledStagingGuard) return text;
  return text
    .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/gi, "[redacted-vin]")
    .replace(/(?:\+?66|0)\d{8,10}/g, "[redacted-phone]")
    .replace(
      /(?:ที่อยู่|address|plate|ทะเบียน|vin|owner|seller|customer|buyer|private|หมายเหตุส่วนตัว|internal note|private note)\s*[:：]?\s*[^\n]*/gi,
      "[redacted-private]"
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeRowForPolicy(
  row: CommitImportRowInput,
  policy: ImportPolicy
): { row: CommitImportRowInput; strippedRawKeys: string[] } {
  if (!policy.thorControlledStagingGuard) {
    return { row, strippedRawKeys: [] };
  }

  const raw = row.rawRow ?? {};
  const nextRaw: Record<string, string> = {};
  const strippedRawKeys: string[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (policy.blockForbiddenRawKeys && isForbiddenRawKey(k)) {
      strippedRawKeys.push(k);
      continue;
    }
    nextRaw[k] = v;
  }

  return {
    row: {
      ...row,
      title: scrubPublicSaleSafeText(String(row.title ?? ""), policy),
      description: scrubPublicSaleSafeText(String(row.description ?? ""), policy),
      ownerName: undefined,
      showroomName: row.showroomName
        ? scrubPublicSaleSafeText(String(row.showroomName), policy)
        : undefined,
      ownerPhone: undefined,
      rawRow: nextRaw,
    },
    strippedRawKeys,
  };
}

export function resolveDealerIdForImport(
  owner: CommitImportOwner,
  row: CommitImportRowInput
): string {
  if (owner.dealerId?.trim()) return normalizeDealerId(owner.dealerId);
  const raw = String(row.ownerId ?? owner.ownerId ?? "").trim();
  return normalizeDealerId(raw || "thor-auto");
}

export interface CommitImportRowInput {
  sourceRowIndex: number;
  importStatus?: "valid" | "warning";
  disposition?: ImportDisposition;
  confidenceScore?: number;
  missingFields?: string[];
  rawRow?: Record<string, string>;
  warnings?: string[];
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  type?: string;
  condition?: string;
  mileage?: number;
  fuelType?: string;
  sourceImageUrls?: string[];
  images?: string[];
  description?: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  showroomName?: string;
  /** รหัส Draft ที่กำหนดล่วงหน้า (paste image import) */
  commitDraftId?: string;
  /** Paste: ห้ามดาวน์โหลดรูปจาก sourceImageUrls อัตโนมัติ */
  skipSourceImageDownload?: boolean;
}

export interface SmartCommitInput {
  published?: CommitImportRowInput[];
  drafts?: CommitImportRowInput[];
}

export interface CommitImportOwner {
  dealerId?: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  showroomName?: string;
  address?: string;
}

export interface CommitImportResultPayload {
  success: boolean;
  importedCount: number;
  publishedCount: number;
  draftCount: number;
  skippedCount: number;
  warningCount: number;
  errorCount: number;
  imported: {
    id: string;
    title: string;
    sourceRowIndex: number;
    imageDownloaded?: number;
    imageFailed?: number;
    bucket?: "published" | "draft";
  }[];
  drafts: {
    id: string;
    title: string;
    sourceRowIndex: number;
    status: string;
    confidenceScore: number;
  }[];
  failed: { sourceRowIndex: number; message: string }[];
  imageStats?: BulkImageDownloadSummary;
  rowWarnings?: { sourceRowIndex: number; warnings: string[] }[];
  duplicateWarnings?: {
    id: string;
    bucket: string;
    warnings: string[];
  }[];
  message?: string;
}

function buildCarRecord(
  row: CommitImportRowInput,
  owner: CommitImportOwner,
  carId: string,
  images: string[],
  policy: ImportPolicy
): MarketplaceCarRecord {
  const brand = String(row.brand ?? "").trim();
  const model = String(row.model ?? "").trim();
  const year = Number(row.year) || new Date().getFullYear();
  const price = Number(row.price) || 0;
  const fuelType = String(row.fuelType ?? "petrol");

  let description = scrubPublicSaleSafeText(
    String(row.description ?? "").slice(0, 4000),
    policy
  );
  if (policy.allowOwnerAddressInDescription && owner.address?.trim()) {
    description = description
      ? `${description}\nที่อยู่: ${owner.address.trim()}`
      : `ที่อยู่: ${owner.address.trim()}`;
  }

  const raw = row.rawRow ?? {};
  const licensePlate = policy.allowSensitiveVehicleFields
    ? normalizePlate(String(raw.licensePlate ?? raw["ทะเบียน"] ?? raw.plate ?? ""))
    : "";
  const vin = policy.allowSensitiveVehicleFields
    ? extractVinFromText(String(row.description ?? "")) ||
      extractVinFromText(JSON.stringify(raw))
    : "";

  return {
    id: carId,
    title: scrubPublicSaleSafeText(
      String(row.title ?? `${brand} ${model} ปี ${year}`).slice(0, 200),
      policy
    ),
    vin: vin || undefined,
    licensePlate: licensePlate || undefined,
    brand,
    model,
    year,
    price,
    type: inferMarketplaceCategoryType({
      type: row.type,
      fuelType,
      condition: row.condition,
      price,
    }),
    condition: String(row.condition ?? "มือสอง").slice(0, 120),
    mileage: Math.max(0, Number(row.mileage) || 0),
    fuelType,
    images: images.length > 0 ? images : [PLACEHOLDER_IMAGE],
    description,
    dealerId: resolveDealerIdForImport(owner, row),
    ownerId: String(row.ownerId ?? owner.ownerId ?? "import-admin"),
    ownerName: scrubPublicSaleSafeText(
      policy.thorControlledStagingGuard
        ? String(row.showroomName ?? owner.showroomName ?? owner.ownerName ?? "Thor Auto")
        : String(row.ownerName ?? owner.ownerName ?? "Admin Import"),
      policy
    ),
    ownerPhone: policy.allowPrivateContactFields
      ? String(row.ownerPhone ?? owner.ownerPhone ?? "")
      : "",
    showroomName: row.showroomName
      ? String(row.showroomName)
      : owner.showroomName,
    isSold: false,
    listingStatus: policy.forceNoPublicListingActivation ? "hidden" : "published",
    createdAt: new Date().toISOString(),
    boosted: false,
    featured: false,
  };
}

function buildDraftRecord(
  row: CommitImportRowInput,
  owner: CommitImportOwner,
  draftId: string,
  images: string[],
  normalizedData: NormalizedInventoryRow,
  policy: ImportPolicy
): DealerDraftRecord {
  const now = new Date().toISOString();
  const status: DraftInventoryStatus =
    row.disposition === "needs_review" ? "needs_review" : "draft";

  const raw = row.rawRow ?? {};
  const licensePlate = policy.allowSensitiveVehicleFields
    ? normalizePlate(
        String(raw.licensePlate ?? raw["ทะเบียน"] ?? normalizedData.licensePlate ?? "")
      )
    : "";
  const vin = policy.allowSensitiveVehicleFields
    ? extractVinFromText(String(row.description ?? "")) ||
      extractVinFromText(String(normalizedData.notes ?? ""))
    : "";

  return {
    id: draftId,
    vin: vin || undefined,
    licensePlate: licensePlate || undefined,
    dealerId: resolveDealerIdForImport(owner, row),
    dealerName: owner.showroomName ?? "Dealer",
    ownerName: scrubPublicSaleSafeText(
      policy.thorControlledStagingGuard
        ? String(row.showroomName ?? owner.showroomName ?? owner.ownerName ?? "Thor Auto")
        : String(row.ownerName ?? owner.ownerName ?? ""),
      policy
    ),
    phone: policy.allowPrivateContactFields
      ? String(row.ownerPhone ?? owner.ownerPhone ?? "")
      : "",
    showroomName: row.showroomName ?? owner.showroomName,
    rawRow: row.rawRow ?? {},
    normalizedData,
    missingFields: row.missingFields ?? [],
    warnings: [...(row.warnings ?? [])],
    confidenceScore: row.confidenceScore ?? 0,
    status,
    images,
    sourceImageUrls: row.sourceImageUrls,
    title: String(row.title ?? "").slice(0, 200),
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    year: Number(row.year) || new Date().getFullYear(),
    price: Number(row.price) || 0,
    mileage: Math.max(0, Number(row.mileage) || 0),
    fuelType: String(row.fuelType ?? "petrol"),
    condition: String(row.condition ?? "มือสอง"),
    description: scrubPublicSaleSafeText(
      String(row.description ?? "").slice(0, 4000),
      policy
    ),
    createdAt: now,
    updatedAt: now,
  };
}

function rowToNormalized(row: CommitImportRowInput): NormalizedInventoryRow {
  const data = createEmptyNormalizedRow();
  data.brand = row.brand ?? "";
  data.model = row.model ?? "";
  data.year = String(row.year ?? "");
  data.price = String(row.price ?? "");
  data.mileage = String(row.mileage ?? "");
  data.fuelType = row.fuelType ?? "";
  data.imageUrls = (row.sourceImageUrls ?? []).join(",");
  data.description = row.description ?? "";
  return data;
}

function validatePublishRow(
  row: CommitImportRowInput
): { ok: true } | { ok: false; message: string } {
  const brand = String(row.brand ?? "").trim();
  const model = String(row.model ?? "").trim();
  const year = Number(row.year);
  const price = Number(row.price);

  if (!brand) return { ok: false, message: "ไม่มี brand" };
  if (!model) return { ok: false, message: "ไม่มี model" };
  if (!year || Number.isNaN(year) || year < 1980 || year > new Date().getFullYear() + 2) {
    return { ok: false, message: "ปีรถไม่ถูกต้อง" };
  }
  if (!price || Number.isNaN(price) || price <= 0) {
    return { ok: false, message: "ราคาไม่ถูกต้อง" };
  }
  return { ok: true };
}

function validateDraftRow(
  row: CommitImportRowInput
): { ok: true } | { ok: false; message: string } {
  const brand = String(row.brand ?? "").trim();
  const model = String(row.model ?? "").trim();
  if (!brand && !model) return { ok: false, message: "ไม่มี brand/model" };
  return { ok: true };
}

async function resolveImagesForRow(
  carId: string,
  row: CommitImportRowInput
): Promise<{
  images: string[];
  warnings: string[];
  report: RowImageDownloadReport | null;
}> {
  const existingLocal = (row.images ?? []).filter((u) => {
    const url = String(u);
    return (
      isLocalListingImageUrl(url) && extractStorageListingId(url) === carId
    );
  });
  if (existingLocal.length > 0) {
    return {
      images: sanitizeListingImagesForId(existingLocal, carId),
      warnings: [],
      report: null,
    };
  }

  if (row.skipSourceImageDownload) {
    return { images: [], warnings: [], report: null };
  }

  const sourceUrls = row.sourceImageUrls ?? row.images ?? [];
  const report = await downloadListingImagesForCar(
    carId,
    row.sourceRowIndex ?? 0,
    sourceUrls
  );
  const resolved = resolveStoredImagesForListing(report);
  return {
    images: sanitizeListingImagesForId(resolved.images, carId),
    warnings: resolved.warnings,
    report,
  };
}

/** Legacy: array of publish rows only */
export async function processBulkInventoryImport(
  rows: CommitImportRowInput[],
  owner: CommitImportOwner = {}
): Promise<CommitImportResultPayload> {
  return processSmartInventoryImport({ published: rows, drafts: [] }, owner);
}

export async function processSmartInventoryImport(
  input: SmartCommitInput,
  owner: CommitImportOwner = {}
): Promise<CommitImportResultPayload> {
  const policy = resolveImportPolicy(owner, input);
  if (policy.thorControlledStagingGuard && process.env.NODE_ENV === "production") {
    throw new Error(
      "Thor Auto controlled import is restricted to staging only; production import is blocked"
    );
  }
  const safeOwner = sanitizeOwnerForPolicy(owner, policy);

  const publishedRows = input.published ?? [];
  const draftRows = input.drafts ?? [];

  const failed: { sourceRowIndex: number; message: string }[] = [];
  const toPublish: MarketplaceCarRecord[] = [];
  const toDraft: DealerDraftRecord[] = [];
  const importedMeta: CommitImportResultPayload["imported"] = [];
  const draftsMeta: CommitImportResultPayload["drafts"] = [];
  const imageReports: RowImageDownloadReport[] = [];
  const rowWarnings: { sourceRowIndex: number; warnings: string[] }[] = [];
  let warningCount = 0;

  const baseId = Date.now();

  for (let i = 0; i < publishedRows.length; i++) {
    const originalRow = publishedRows[i];
    const { row, strippedRawKeys } = sanitizeRowForPolicy(originalRow, policy);
    const srcIdx = row.sourceRowIndex ?? i + 1;
    const basics = validatePublishRow(row);
    if (basics.ok === false) {
      failed.push({ sourceRowIndex: srcIdx, message: basics.message });
      continue;
    }

    const carId = `car-import-${baseId}-p${i}`;
    const { images, warnings, report } = await resolveImagesForRow(carId, row);
    if (report) imageReports.push(report);
    const allWarnings = [
      ...warnings,
      ...(row.warnings ?? []),
      ...strippedRawKeys.map((key) => `[guard] stripped forbidden raw key: ${key}`),
    ];
    if (row.importStatus === "warning" || allWarnings.length) warningCount++;
    if (allWarnings.length) {
      rowWarnings.push({ sourceRowIndex: srcIdx, warnings: allWarnings });
    }

    const car = buildCarRecord(row, safeOwner, carId, images, policy);
    toPublish.push(car);
    importedMeta.push({
      id: car.id,
      title: car.title,
      sourceRowIndex: srcIdx,
      imageDownloaded: report?.downloaded,
      imageFailed: report?.failed,
      bucket: "published",
    });
  }

  for (let i = 0; i < draftRows.length; i++) {
    const originalRow = draftRows[i];
    const { row, strippedRawKeys } = sanitizeRowForPolicy(originalRow, policy);
    const srcIdx = row.sourceRowIndex ?? i + 1;
    const basics = validateDraftRow(row);
    if (basics.ok === false) {
      failed.push({ sourceRowIndex: srcIdx, message: basics.message });
      continue;
    }

    const draftId =
      row.commitDraftId?.trim() || `draft-import-${baseId}-d${i}`;
    const { images, warnings, report } = await resolveImagesForRow(draftId, row);
    if (report) imageReports.push(report);
    const allWarnings = [
      ...warnings,
      ...(row.warnings ?? []),
      ...strippedRawKeys.map((key) => `[guard] stripped forbidden raw key: ${key}`),
    ];
    if (allWarnings.length) {
      warningCount++;
      rowWarnings.push({ sourceRowIndex: srcIdx, warnings: allWarnings });
    }

    const draft = buildDraftRecord(
      row,
      safeOwner,
      draftId,
      images,
      rowToNormalized(row),
      policy
    );
    toDraft.push(draft);
    draftsMeta.push({
      id: draft.id,
      title: draft.title,
      sourceRowIndex: srcIdx,
      status: draft.status,
      confidenceScore: draft.confidenceScore,
    });
    importedMeta.push({
      id: draft.id,
      title: draft.title,
      sourceRowIndex: srcIdx,
      imageDownloaded: report?.downloaded,
      imageFailed: report?.failed,
      bucket: "draft",
    });
  }

  const dupChecked = runImportDuplicateChecks(toPublish, toDraft);
  const duplicateWarnings = dupChecked.duplicateWarnings;

  for (const dw of duplicateWarnings) {
    const meta = dupChecked.cars.find((c) => c.id === dw.id);
    const draftMeta = dupChecked.drafts.find((d) => d.id === dw.id);
    const srcIdx =
      importedMeta.find((m) => m.id === dw.id)?.sourceRowIndex ??
      draftsMeta.find((m) => m.id === dw.id)?.sourceRowIndex;
    if (srcIdx != null) {
      rowWarnings.push({
        sourceRowIndex: srcIdx,
        warnings: [`[รถซ้ำ] ${dw.warnings.join("; ")}`],
      });
      warningCount++;
    }
    if (meta?.duplicateStatus === "possible_duplicate") {
      devMarketplaceLog("duplicate-import", {
        id: dw.id,
        score: meta.duplicateScore,
      });
    }
    void draftMeta;
  }

  bulkAddMarketplaceCars(dupChecked.cars);
  bulkAddDealerDrafts(dupChecked.drafts);

  const imageStats: BulkImageDownloadSummary = {
    totalSourceUrls: imageReports.reduce((s, r) => s + r.totalUrls, 0),
    downloaded: imageReports.reduce((s, r) => s + r.downloaded, 0),
    failed: imageReports.reduce((s, r) => s + r.failed, 0),
    carsWithoutImages: imageReports.filter((r) => r.totalUrls === 0).length,
    rows: imageReports,
  };

  const publishedCount = toPublish.length;
  const draftCount = toDraft.length;
  const importedCount = publishedCount + draftCount;

  devMarketplaceLog("smart-commit", {
    published: publishedCount,
    draft: draftCount,
    failed: failed.length,
    imagesDownloaded: imageStats.downloaded,
  });

  return {
    success: importedCount > 0,
    importedCount,
    publishedCount,
    draftCount,
    skippedCount: failed.length,
    warningCount,
    errorCount: failed.length,
    imported: importedMeta,
    drafts: draftsMeta,
    failed,
    imageStats,
    rowWarnings,
    duplicateWarnings,
    message:
      importedCount > 0
        ? `นำเข้า ${publishedCount} คัน → ตลาด, ${draftCount} คัน → Draft (รูป ${imageStats.downloaded}/${imageStats.totalSourceUrls})`
        : "ไม่มีแถวที่นำเข้าได้",
  };
}
