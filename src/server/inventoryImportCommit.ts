import {
  bulkAddMarketplaceCars,
  getMarketplaceCarById,
  getMarketplaceInventorySorted,
  updateMarketplaceCar,
  type MarketplaceCarRecord,
  devMarketplaceLog,
} from "./marketplaceInventory";
import {
  bulkAddDealerDrafts,
  getDealerDraftById,
  getDealerDraftsSorted,
  updateDealerDraft,
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
import { extractRegistrationFields } from "../utils/vehicleRegistrationPrivacy";
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
  LISTING_PLACEHOLDER_IMAGE,
  sanitizeListingImagesForId,
} from "../utils/listingImages";
import { THOR_AUTO_DEALER_ID } from "../utils/dealerIdentity";
import {
  isForbiddenRawKey,
  isSensitiveRegistrationKey,
} from "../utils/inventoryImport/import/forbiddenRawKeys";
import {
  SELLER_PROVIDED_IMAGE_CONSENT_NOTICE,
  evaluateSellerProvidedImageConsent,
} from "../utils/vehicleImagePlatePrivacy";
import type { InventoryRepository } from "./repositories/inventoryRepository";
import {
  extractImportIdentityFromDraft,
  extractImportIdentityFromListing,
  extractImportIdentityFromRow,
  mergeImportListingFields,
  resolveImportUpsertMatch,
  type ImportIdentityCandidate,
  type ImportMatchDecision,
} from "./listingImportIdentity";

const PLACEHOLDER_IMAGE = LISTING_PLACEHOLDER_IMAGE;

interface ImportPolicy {
  thorControlledStagingGuard: boolean;
  allowSensitiveVehicleFields: boolean;
  allowVinField: boolean;
  allowPrivateContactFields: boolean;
  allowOwnerAddressInDescription: boolean;
  forceNoPublicListingActivation: boolean;
  /** v22.32 — dealer-path import must not land as marketplace-public */
  requireOwnerApprovalBeforePublic: boolean;
  blockForbiddenRawKeys: boolean;
}

/**
 * Staging Cloud Run images set NODE_ENV=production for Node runtime hardening,
 * but Thor Auto controlled import must still run on staging. Block only true
 * production deploy targets — never treat staging hosts/services as production.
 */
export function isTrueProductionImportRuntime(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const deployEnv = String(
    env.NONGA_DEPLOY_ENV ?? env.NONGA_RUNTIME_ENV ?? ""
  )
    .trim()
    .toLowerCase();
  if (
    deployEnv === "staging" ||
    deployEnv === "dev" ||
    deployEnv === "development" ||
    deployEnv === "local"
  ) {
    return false;
  }
  if (deployEnv === "production" || deployEnv === "prod") {
    return true;
  }

  const service = String(env.K_SERVICE ?? "").trim().toLowerCase();
  if (service.includes("staging")) {
    return false;
  }

  const appUrl = String(env.APP_URL ?? "").trim().toLowerCase();
  if (
    appUrl.includes("a.nongbot.org") ||
    appUrl.includes("nonga-ce93c.web.app") ||
    appUrl.includes("nonga-staging") ||
    appUrl.includes("localhost") ||
    appUrl.includes("127.0.0.1")
  ) {
    return false;
  }

  return String(env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

function resolveImportPolicy(
  owner: CommitImportOwner,
  input: SmartCommitInput,
  options: CommitImportOptions = {}
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
    allowSensitiveVehicleFields: true,
    allowVinField: !thorControlled,
    allowPrivateContactFields: !thorControlled,
    allowOwnerAddressInDescription: !thorControlled,
    forceNoPublicListingActivation: thorForceHidden,
    requireOwnerApprovalBeforePublic:
      options.requireOwnerApprovalBeforePublic === true,
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
): {
  row: CommitImportRowInput;
  strippedRawKeys: string[];
  sensitiveRegistrationKeys: string[];
} {
  if (!policy.thorControlledStagingGuard) {
    const sensitiveRegistrationKeys = Object.keys(row.rawRow ?? {}).filter((key) =>
      isSensitiveRegistrationKey(key)
    );
    return { row, strippedRawKeys: [], sensitiveRegistrationKeys };
  }

  const raw = row.rawRow ?? {};
  const nextRaw: Record<string, string> = {};
  const strippedRawKeys: string[] = [];
  const sensitiveRegistrationKeys: string[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (isSensitiveRegistrationKey(k)) {
      sensitiveRegistrationKeys.push(k);
    }
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
    sensitiveRegistrationKeys,
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
  registrationProvince?: string;
  licensePlateMasked?: string;
  licensePlateFull?: string;
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
  updatedCount: number;
  createdCount: number;
  heldForReviewCount: number;
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
    action?: "created" | "updated" | "held_for_review";
    importKey?: string;
  }[];
  drafts: {
    id: string;
    title: string;
    sourceRowIndex: number;
    status: string;
    confidenceScore: number;
  }[];
  failed: { sourceRowIndex: number; message: string }[];
  heldForReview?: {
    sourceRowIndex: number;
    reason: string;
    candidateIds: string[];
  }[];
  imageStats?: BulkImageDownloadSummary;
  rowWarnings?: { sourceRowIndex: number; warnings: string[] }[];
  duplicateWarnings?: {
    id: string;
    bucket: string;
    warnings: string[];
  }[];
  persistenceBackend?: "file-direct" | "file" | "firestore";
  message?: string;
  requestId?: string;
  errorCode?: string;
}

export interface CommitImportOptions {
  inventoryRepository?: InventoryRepository;
  /**
   * When true (dealer self-import), newly created rows use pending_review
   * instead of published. Existing listingStatus is preserved on upsert so
   * live Thor marketplace rows are not accidentally hidden.
   */
  requireOwnerApprovalBeforePublic?: boolean;
}

type PersistAction = "create" | "update";

interface PersistCarItem {
  record: MarketplaceCarRecord;
  action: PersistAction;
}

interface PersistDraftItem {
  record: DealerDraftRecord;
  action: PersistAction;
}

async function loadImportMatchCorpus(
  options: CommitImportOptions,
  dealerIds: string[] = []
): Promise<ImportIdentityCandidate[]> {
  const repo = options.inventoryRepository;
  const cars = repo
    ? await repo.listings.listAll()
    : getMarketplaceInventorySorted();

  let drafts: DealerDraftRecord[] = [];
  if (repo && dealerIds.length > 0) {
    const seen = new Set<string>();
    for (const dealerId of dealerIds) {
      const list = await repo.drafts.listByDealer(dealerId);
      for (const d of list) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        drafts.push(d);
      }
    }
  } else {
    drafts = getDealerDraftsSorted();
  }

  const out: ImportIdentityCandidate[] = [];
  for (const car of cars) {
    const identity = extractImportIdentityFromListing(car);
    out.push({
      id: car.id,
      dealerId: identity.dealerId,
      licensePlateFull: identity.licensePlateFull,
      licensePlate: car.licensePlate,
      registrationProvince: identity.registrationProvince,
      vin: identity.vin,
      brand: identity.brand,
      model: identity.model,
      year: identity.year,
      color: identity.color,
      mileage: identity.mileage,
      price: identity.price,
      description: car.description,
      createdAt: car.createdAt,
    });
  }
  for (const draft of drafts) {
    const identity = extractImportIdentityFromDraft(draft);
    out.push({
      id: draft.id,
      dealerId: identity.dealerId,
      licensePlateFull: identity.licensePlateFull,
      licensePlate: draft.licensePlate,
      registrationProvince: identity.registrationProvince,
      vin: identity.vin,
      brand: identity.brand,
      model: identity.model,
      year: identity.year,
      color: identity.color,
      mileage: identity.mileage,
      price: identity.price,
      description: draft.description,
      createdAt: draft.createdAt,
    });
  }
  return out;
}

async function persistImportedRecords(
  cars: PersistCarItem[],
  drafts: PersistDraftItem[],
  options: CommitImportOptions
): Promise<CommitImportResultPayload["persistenceBackend"]> {
  const repo = options.inventoryRepository;
  if (!repo) {
    const creates = cars.filter((c) => c.action === "create").map((c) => c.record);
    const updates = cars.filter((c) => c.action === "update");
    if (creates.length) bulkAddMarketplaceCars(creates);
    for (const item of updates) {
      updateMarketplaceCar(item.record.id, item.record);
    }
    const draftCreates = drafts
      .filter((d) => d.action === "create")
      .map((d) => d.record);
    if (draftCreates.length) bulkAddDealerDrafts(draftCreates);
    for (const item of drafts.filter((d) => d.action === "update")) {
      updateDealerDraft(item.record.id, item.record);
    }
    return "file-direct";
  }

  for (const item of cars) {
    const dealerId = item.record.dealerId || item.record.ownerId;
    if (item.action === "update") {
      await repo.listings.updateListing(dealerId, item.record.id, item.record);
    } else {
      await repo.listings.createListing(dealerId, item.record);
    }
  }
  for (const item of drafts) {
    if (item.action === "update") {
      await repo.drafts.updateDraft(
        item.record.dealerId,
        item.record.id,
        item.record
      );
    } else {
      await repo.drafts.createDraft(item.record.dealerId, item.record);
    }
  }
  return repo.backend;
}

async function findExistingListing(
  match: ImportMatchDecision,
  options: CommitImportOptions
): Promise<MarketplaceCarRecord | null> {
  if (!match.matchedId) return null;
  const repo = options.inventoryRepository;
  if (repo) return repo.listings.getById(match.matchedId);
  return getMarketplaceCarById(match.matchedId);
}

async function findExistingDraft(
  match: ImportMatchDecision,
  dealerId: string,
  options: CommitImportOptions
): Promise<DealerDraftRecord | null> {
  if (!match.matchedId) return null;
  const repo = options.inventoryRepository;
  if (repo) return repo.drafts.getById(dealerId, match.matchedId);
  const draft = getDealerDraftById(match.matchedId);
  return draft && normalizeDealerId(draft.dealerId) === normalizeDealerId(dealerId)
    ? draft
    : null;
}

function applyImportKey(
  record: MarketplaceCarRecord | DealerDraftRecord,
  match: ImportMatchDecision
): void {
  if (match.importKey) {
    record.importKey = match.importKey;
    record.importKeyKind = match.keyKind;
  }
}

function isWorkingImageUrl(url: string): boolean {
  const u = String(url ?? "").trim();
  if (!u || u === PLACEHOLDER_IMAGE) return false;
  if (u.includes("unsplash.com/photo-1533473359331-0135ef1b58bf")) return false;
  return true;
}

function corpusWithoutId(
  corpus: ImportIdentityCandidate[],
  id: string
): ImportIdentityCandidate[] {
  return corpus.filter((c) => c.id !== id);
}

function pushCorpusCandidate(
  corpus: ImportIdentityCandidate[],
  record: MarketplaceCarRecord | DealerDraftRecord,
  kind: "listing" | "draft"
): void {
  const identity =
    kind === "listing"
      ? extractImportIdentityFromListing(record as MarketplaceCarRecord)
      : extractImportIdentityFromDraft(record as DealerDraftRecord);
  corpus.push({
    id: record.id,
    dealerId: identity.dealerId,
    licensePlateFull: identity.licensePlateFull,
    licensePlate:
      "licensePlate" in record ? String(record.licensePlate ?? "") : undefined,
    registrationProvince: identity.registrationProvince,
    vin: identity.vin,
    brand: identity.brand,
    model: identity.model,
    year: identity.year,
    color: identity.color,
    mileage: identity.mileage,
    price: identity.price,
    description: record.description,
    createdAt: record.createdAt,
  });
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
  const registration = extractRegistrationFields({
    plateValue:
      row.licensePlateFull ??
      String(raw.licensePlate ?? raw["ทะเบียน"] ?? raw.plate ?? raw["ทะเบียน/จังหวัด"] ?? ""),
    provinceValue:
      row.registrationProvince ??
      String(raw.registrationProvince ?? raw["จังหวัดทะเบียน"] ?? raw.province ?? ""),
  });
  const licensePlateFull = policy.allowSensitiveVehicleFields
    ? normalizePlate(registration.licensePlateFull)
    : "";
  const licensePlateMasked = registration.licensePlateMasked;
  const registrationProvince = registration.registrationProvince;
  const vin = policy.allowVinField
    ? extractVinFromText(String(row.description ?? "")) ||
      extractVinFromText(JSON.stringify(raw))
    : "";
  const color = String(raw.color ?? raw["สี"] ?? "").trim().slice(0, 80);

  return {
    id: carId,
    title: scrubPublicSaleSafeText(
      String(row.title ?? `${brand} ${model} ปี ${year}`).slice(0, 200),
      policy
    ),
    vin: vin || undefined,
    licensePlate: licensePlateFull || undefined,
    licensePlateFull: licensePlateFull || undefined,
    licensePlateMasked: licensePlateMasked || undefined,
    registrationProvince: registrationProvince || undefined,
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
    color: color || undefined,
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
    listingStatus: policy.forceNoPublicListingActivation
      ? "hidden"
      : policy.requireOwnerApprovalBeforePublic
        ? "pending_review"
        : "published",
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
  const registration = extractRegistrationFields({
    plateValue:
      row.licensePlateFull ??
      String(
        raw.licensePlate ??
          raw["ทะเบียน"] ??
          raw.plate ??
          raw["ทะเบียน/จังหวัด"] ??
          normalizedData.licensePlate ??
          normalizedData.licensePlateFull
      ),
    provinceValue:
      row.registrationProvince ??
      String(
        raw.registrationProvince ??
          raw["จังหวัดทะเบียน"] ??
          raw.province ??
          normalizedData.registrationProvince ??
          normalizedData.province
      ),
  });
  const licensePlateFull = policy.allowSensitiveVehicleFields
    ? normalizePlate(registration.licensePlateFull)
    : "";
  const vin = policy.allowVinField
    ? extractVinFromText(String(row.description ?? "")) ||
      extractVinFromText(String(normalizedData.notes ?? ""))
    : "";

  return {
    id: draftId,
    vin: vin || undefined,
    licensePlate: licensePlateFull || undefined,
    licensePlateFull: licensePlateFull || undefined,
    licensePlateMasked: registration.licensePlateMasked || undefined,
    registrationProvince: registration.registrationProvince || undefined,
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
  data.registrationProvince = row.registrationProvince ?? "";
  data.licensePlateMasked = row.licensePlateMasked ?? "";
  data.licensePlateFull = row.licensePlateFull ?? "";
  data.licensePlate = row.licensePlateFull ?? "";
  data.province = row.registrationProvince ?? "";
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

function isReusableStoredListingImageUrl(url: string, carId: string): boolean {
  const u = String(url ?? "").trim();
  if (!u) return false;
  if (isLocalListingImageUrl(u)) {
    return extractStorageListingId(u) === carId;
  }
  // Durable Firebase Storage URLs already persisted for this listing id.
  if (/^https?:\/\/firebasestorage\.googleapis\.com\//i.test(u)) {
    return u.includes(carId);
  }
  return false;
}

async function resolveImagesForRow(
  carId: string,
  row: CommitImportRowInput,
  owner: CommitImportOwner = {},
  existingImages: string[] = []
): Promise<{
  images: string[];
  warnings: string[];
  report: RowImageDownloadReport | null;
  imageFailed: boolean;
}> {
  const reusableExisting = existingImages.filter((u) => isWorkingImageUrl(u));
  const existingStored = (row.images ?? []).filter((u) =>
    isReusableStoredListingImageUrl(String(u), carId)
  );
  if (existingStored.length > 0) {
    return {
      images: sanitizeListingImagesForId(existingStored, carId),
      warnings: [SELLER_PROVIDED_IMAGE_CONSENT_NOTICE],
      report: null,
      imageFailed: false,
    };
  }

  if (row.skipSourceImageDownload) {
    return {
      images: reusableExisting,
      warnings: [],
      report: null,
      imageFailed: false,
    };
  }

  const sourceUrls = row.sourceImageUrls ?? row.images ?? [];
  if (sourceUrls.length === 0) {
    return {
      images: reusableExisting,
      warnings:
        reusableExisting.length > 0
          ? ["preserved existing images — no new source image URLs in CSV"]
          : [],
      report: null,
      imageFailed: false,
    };
  }

  const dealerId = resolveDealerIdForImport(owner, row);
  const report = await downloadListingImagesForCar(
    carId,
    row.sourceRowIndex ?? 0,
    sourceUrls,
    { dealerId }
  );
  const resolved = resolveStoredImagesForListing(report);
  const imageConsent = evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages:
      sourceUrls.length > 0 || resolved.images.length > 0,
    // Confirm Import itself is the seller/owner consent action for this flow.
    sellerConfirmedPublishRightsAndListingConsent: true,
  });

  const downloadedOk = resolved.images.filter((u) => isWorkingImageUrl(u));
  const imageFailed = report.failed > 0 && downloadedOk.length === 0;

  if (imageFailed && reusableExisting.length > 0) {
    return {
      images: sanitizeListingImagesForId(reusableExisting, carId),
      warnings: [
        ...resolved.warnings,
        ...imageConsent.warnings,
        "image upload/download failed — preserved existing working image URLs",
      ],
      report,
      imageFailed: true,
    };
  }

  // Prefer durable Firebase URLs when download succeeded; keep any still-working
  // existing durable URLs that were not replaced only when download fully failed.
  const images =
    downloadedOk.length > 0
      ? downloadedOk
      : reusableExisting.length > 0
        ? reusableExisting
        : resolved.images;

  return {
    images: sanitizeListingImagesForId(images, carId),
    warnings: [...resolved.warnings, ...imageConsent.warnings],
    report,
    imageFailed,
  };
}

/** Legacy: array of publish rows only */
export async function processBulkInventoryImport(
  rows: CommitImportRowInput[],
  owner: CommitImportOwner = {},
  options: CommitImportOptions = {}
): Promise<CommitImportResultPayload> {
  return processSmartInventoryImport({ published: rows, drafts: [] }, owner, options);
}

export async function processSmartInventoryImport(
  input: SmartCommitInput,
  owner: CommitImportOwner = {},
  options: CommitImportOptions = {}
): Promise<CommitImportResultPayload> {
  const policy = resolveImportPolicy(owner, input, options);
  if (policy.thorControlledStagingGuard && isTrueProductionImportRuntime()) {
    const err = new Error(
      "Thor Auto controlled import is restricted to staging only; production import is blocked"
    );
    (err as Error & { errorCode?: string }).errorCode =
      "THOR_IMPORT_PRODUCTION_BLOCKED";
    throw err;
  }
  const safeOwner = sanitizeOwnerForPolicy(owner, policy);

  const publishedRows = input.published ?? [];
  const draftRows = input.drafts ?? [];

  const failed: { sourceRowIndex: number; message: string }[] = [];
  const heldForReview: NonNullable<CommitImportResultPayload["heldForReview"]> =
    [];
  const persistCars: PersistCarItem[] = [];
  const persistDrafts: PersistDraftItem[] = [];
  const toPublish: MarketplaceCarRecord[] = [];
  const toDraft: DealerDraftRecord[] = [];
  const importedMeta: CommitImportResultPayload["imported"] = [];
  const draftsMeta: CommitImportResultPayload["drafts"] = [];
  const imageReports: RowImageDownloadReport[] = [];
  const rowWarnings: { sourceRowIndex: number; warnings: string[] }[] = [];
  let warningCount = 0;
  let updatedCount = 0;
  let createdCount = 0;
  let heldForReviewCount = 0;

  const baseId = Date.now();
  const dealerIdsForCorpus = new Set<string>();
  for (const row of [...publishedRows, ...draftRows]) {
    dealerIdsForCorpus.add(resolveDealerIdForImport(safeOwner, row));
  }
  if (safeOwner.dealerId) {
    dealerIdsForCorpus.add(normalizeDealerId(safeOwner.dealerId));
  }
  const corpus = await loadImportMatchCorpus(
    options,
    [...dealerIdsForCorpus]
  );

  for (let i = 0; i < publishedRows.length; i++) {
    const originalRow = publishedRows[i];
    const { row, strippedRawKeys, sensitiveRegistrationKeys } = sanitizeRowForPolicy(
      originalRow,
      policy
    );
    const srcIdx = row.sourceRowIndex ?? i + 1;
    const basics = validatePublishRow(row);
    if (basics.ok === false) {
      failed.push({ sourceRowIndex: srcIdx, message: basics.message });
      continue;
    }

    const dealerId = resolveDealerIdForImport(safeOwner, row);
    const identity = extractImportIdentityFromRow(row, dealerId);
    const match = resolveImportUpsertMatch(identity, corpus);

    if (match.confidence === "ambiguous") {
      heldForReviewCount++;
      heldForReview.push({
        sourceRowIndex: srcIdx,
        reason: match.reason,
        candidateIds: match.candidateIds,
      });
      rowWarnings.push({
        sourceRowIndex: srcIdx,
        warnings: [
          `[NEED REVIEW] ambiguous duplicate match (${match.reason}) — not creating duplicate; candidates: ${match.candidateIds.join(", ") || "none"}`,
        ],
      });
      warningCount++;
      continue;
    }

    const existing =
      match.confidence === "high"
        ? await findExistingListing(match, options)
        : null;
    // If matched id is a draft, treat as create for published bucket (do not guess).
    const existingIsListing = Boolean(existing);

    if (match.confidence === "high" && !existingIsListing) {
      heldForReviewCount++;
      heldForReview.push({
        sourceRowIndex: srcIdx,
        reason: "matched_id_not_found_or_not_listing",
        candidateIds: match.candidateIds,
      });
      rowWarnings.push({
        sourceRowIndex: srcIdx,
        warnings: [
          `[NEED REVIEW] matched listing ${match.matchedId ?? ""} not found for update — held`,
        ],
      });
      warningCount++;
      continue;
    }

    const carId = existing?.id ?? `car-import-${baseId}-p${i}`;
    const { images, warnings, report, imageFailed } = await resolveImagesForRow(
      carId,
      row,
      safeOwner,
      existing?.images ?? []
    );
    if (report) imageReports.push(report);
    const allWarnings = [
      ...warnings,
      ...(row.warnings ?? []),
      ...strippedRawKeys.map((key) => `[guard] stripped forbidden raw key: ${key}`),
      ...(sensitiveRegistrationKeys.length > 0
        ? [
            "พบข้อมูลทะเบียนรถ ระบบจะแสดงเฉพาะแบบปิดบางส่วนในตลาด และไม่แสดงทะเบียนเต็มโดยอัตโนมัติ",
          ]
        : []),
    ];
    if (row.importStatus === "warning" || allWarnings.length) warningCount++;
    if (allWarnings.length) {
      rowWarnings.push({ sourceRowIndex: srcIdx, warnings: allWarnings });
    }

    const built = buildCarRecord(row, safeOwner, carId, images, policy);
    applyImportKey(built, match);

    let car: MarketplaceCarRecord;
    let action: PersistAction;
    if (existing) {
      car = mergeImportListingFields(
        existing as unknown as Record<string, unknown>,
        built as unknown as Record<string, unknown>,
        {
          preserveExistingImages: true,
          imageFailed,
          incomingImages: images.filter(isWorkingImageUrl),
          placeholderUrl: PLACEHOLDER_IMAGE,
        }
      ) as unknown as MarketplaceCarRecord;
      // Ensure identity + listing status from merge rules stay coherent.
      car.id = existing.id;
      car.createdAt = existing.createdAt;
      car.dealerId = existing.dealerId ?? built.dealerId;
      car.ownerId = existing.ownerId || built.ownerId;
      // Never demote/promote existing marketplace visibility on upsert —
      // preserves live Thor published rows (marketplace count 13).
      car.listingStatus = existing.listingStatus ?? built.listingStatus;
      if (match.importKey) {
        car.importKey = match.importKey;
        car.importKeyKind = match.keyKind;
      }
      action = "update";
      updatedCount++;
    } else {
      car = built;
      action = "create";
      createdCount++;
    }

    toPublish.push(car);
    persistCars.push({ record: car, action });
    // Keep in-batch corpus current so later rows do not duplicate this car.
    const nextCorpus = corpusWithoutId(corpus, car.id);
    corpus.length = 0;
    corpus.push(...nextCorpus);
    pushCorpusCandidate(corpus, car, "listing");

    importedMeta.push({
      id: car.id,
      title: car.title,
      sourceRowIndex: srcIdx,
      imageDownloaded: report?.downloaded,
      imageFailed: report?.failed,
      bucket: "published",
      action: action === "update" ? "updated" : "created",
      importKey: car.importKey,
    });
  }

  for (let i = 0; i < draftRows.length; i++) {
    const originalRow = draftRows[i];
    const { row, strippedRawKeys, sensitiveRegistrationKeys } = sanitizeRowForPolicy(
      originalRow,
      policy
    );
    const srcIdx = row.sourceRowIndex ?? i + 1;
    const basics = validateDraftRow(row);
    if (basics.ok === false) {
      failed.push({ sourceRowIndex: srcIdx, message: basics.message });
      continue;
    }

    const dealerId = resolveDealerIdForImport(safeOwner, row);
    const identity = extractImportIdentityFromRow(row, dealerId);
    const match = resolveImportUpsertMatch(identity, corpus);

    if (match.confidence === "ambiguous") {
      heldForReviewCount++;
      heldForReview.push({
        sourceRowIndex: srcIdx,
        reason: match.reason,
        candidateIds: match.candidateIds,
      });
      rowWarnings.push({
        sourceRowIndex: srcIdx,
        warnings: [
          `[NEED REVIEW] ambiguous duplicate match (${match.reason}) — not creating duplicate`,
        ],
      });
      warningCount++;
      continue;
    }

    const existingDraft =
      match.confidence === "high"
        ? await findExistingDraft(match, dealerId, options)
        : null;
    // Prefer updating an existing draft; if match points at a listing, hold.
    if (match.confidence === "high" && !existingDraft) {
      const listingHit = await findExistingListing(match, options);
      if (listingHit) {
        heldForReviewCount++;
        heldForReview.push({
          sourceRowIndex: srcIdx,
          reason: "draft_row_matched_existing_listing",
          candidateIds: match.candidateIds,
        });
        rowWarnings.push({
          sourceRowIndex: srcIdx,
          warnings: [
            `[NEED REVIEW] draft row matched existing listing ${listingHit.id} — held (no guess)`,
          ],
        });
        warningCount++;
        continue;
      }
    }

    const draftId =
      existingDraft?.id ||
      row.commitDraftId?.trim() ||
      `draft-import-${baseId}-d${i}`;
    const { images, warnings, report, imageFailed } = await resolveImagesForRow(
      draftId,
      row,
      safeOwner,
      existingDraft?.images ?? []
    );
    if (report) imageReports.push(report);
    const allWarnings = [
      ...warnings,
      ...(row.warnings ?? []),
      ...strippedRawKeys.map((key) => `[guard] stripped forbidden raw key: ${key}`),
      ...(sensitiveRegistrationKeys.length > 0
        ? [
            "พบข้อมูลทะเบียนรถ ระบบจะแสดงเฉพาะแบบปิดบางส่วนในตลาด และไม่แสดงทะเบียนเต็มโดยอัตโนมัติ",
          ]
        : []),
    ];
    if (allWarnings.length) {
      warningCount++;
      rowWarnings.push({ sourceRowIndex: srcIdx, warnings: allWarnings });
    }

    const built = buildDraftRecord(
      row,
      safeOwner,
      draftId,
      images,
      rowToNormalized(row),
      policy
    );
    applyImportKey(built, match);

    let draft: DealerDraftRecord;
    let action: PersistAction;
    if (existingDraft) {
      draft = mergeImportListingFields(
        existingDraft as unknown as Record<string, unknown>,
        built as unknown as Record<string, unknown>,
        {
          preserveExistingImages: true,
          imageFailed,
          incomingImages: images.filter(isWorkingImageUrl),
          placeholderUrl: PLACEHOLDER_IMAGE,
        }
      ) as unknown as DealerDraftRecord;
      draft.id = existingDraft.id;
      draft.createdAt = existingDraft.createdAt;
      draft.dealerId = existingDraft.dealerId;
      draft.updatedAt = new Date().toISOString();
      if (match.importKey) {
        draft.importKey = match.importKey;
        draft.importKeyKind = match.keyKind;
      }
      action = "update";
      updatedCount++;
    } else {
      draft = built;
      action = "create";
      createdCount++;
    }

    toDraft.push(draft);
    persistDrafts.push({ record: draft, action });
    const nextCorpus = corpusWithoutId(corpus, draft.id);
    corpus.length = 0;
    corpus.push(...nextCorpus);
    pushCorpusCandidate(corpus, draft, "draft");

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
      action: action === "update" ? "updated" : "created",
      importKey: draft.importKey,
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

  // Re-bind scanned duplicate metadata onto persist payloads.
  const carById = new Map(dupChecked.cars.map((c) => [c.id, c]));
  for (const item of persistCars) {
    const scanned = carById.get(item.record.id);
    if (scanned) item.record = scanned;
  }
  const draftById = new Map(dupChecked.drafts.map((d) => [d.id, d]));
  for (const item of persistDrafts) {
    const scanned = draftById.get(item.record.id);
    if (scanned) item.record = scanned;
  }

  const persistenceBackend = await persistImportedRecords(
    persistCars,
    persistDrafts,
    options
  );

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
    updated: updatedCount,
    created: createdCount,
    heldForReview: heldForReviewCount,
    failed: failed.length,
    imagesDownloaded: imageStats.downloaded,
  });

  return {
    success: importedCount > 0 || heldForReviewCount > 0,
    importedCount,
    publishedCount,
    draftCount,
    updatedCount,
    createdCount,
    heldForReviewCount,
    skippedCount: failed.length + heldForReviewCount,
    warningCount,
    errorCount: failed.length,
    imported: importedMeta,
    drafts: draftsMeta,
    failed,
    heldForReview,
    imageStats,
    rowWarnings,
    duplicateWarnings,
    persistenceBackend,
    message:
      importedCount > 0
        ? `นำเข้า/อัปเดต ${publishedCount} คัน → ตลาด, ${draftCount} คัน → Draft (สร้าง ${createdCount}, อัปเดต ${updatedCount}, รอตรวจ ${heldForReviewCount}; รูป ${imageStats.downloaded}/${imageStats.totalSourceUrls})`
        : heldForReviewCount > 0
          ? `ไม่มีแถวที่นำเข้าได้ — รอตรวจ ${heldForReviewCount} แถว (ไม่สร้างซ้ำ)`
          : "ไม่มีแถวที่นำเข้าได้",
  };
}
