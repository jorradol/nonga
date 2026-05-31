import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  addMarketplaceCar,
  getDealerInventoryCars,
  getMarketplaceCarById,
  getPublishedMarketplaceCars,
  removeMarketplaceCar,
  resolveCarDealerId,
  setMarketplaceCarListingStatus,
  updateMarketplaceCar,
  type MarketplaceCarRecord,
} from "../marketplaceInventory";
import {
  bulkAddDealerDrafts,
  getDealerDraftById,
  getDealerDraftsSorted,
  removeDealerDraft,
  updateDealerDraft,
  type DealerDraftRecord,
} from "../dealerDraftInventory";
import { publishDealerDraftToMarketplace } from "../publishDraftListing";
import { normalizeDealerId } from "../../utils/dealerIdentity";
import { inferMarketplaceCategoryType } from "../../utils/marketplaceCarMapper";
import {
  validateDraftForPublish,
  publishGuardVehicleImageMessage,
} from "../../utils/dealerPublishGuard";
import { sanitizeFirestoreDocument } from "../firestoreDocumentSanitize.ts";

export type NongaDataBackend = "file" | "firestore";
export type ListingVisibility = "published" | "hidden";

export interface ListingRepository {
  listPublished(): Promise<MarketplaceCarRecord[]>;
  listByDealer(dealerId: string): Promise<MarketplaceCarRecord[]>;
  getById(id: string): Promise<MarketplaceCarRecord | null>;
  createListing(dealerId: string, record: MarketplaceCarRecord): Promise<MarketplaceCarRecord>;
  updateListing(
    dealerId: string,
    id: string,
    patch: Partial<MarketplaceCarRecord>
  ): Promise<MarketplaceCarRecord | null>;
  updateVisibility(
    dealerId: string,
    id: string,
    visibility: ListingVisibility
  ): Promise<MarketplaceCarRecord | null>;
  deleteListing(dealerId: string, id: string): Promise<boolean>;
}

export interface DraftRepository {
  listByDealer(dealerId: string): Promise<DealerDraftRecord[]>;
  getById(dealerId: string, id: string): Promise<DealerDraftRecord | null>;
  createDraft(dealerId: string, record: DealerDraftRecord): Promise<DealerDraftRecord>;
  updateDraft(
    dealerId: string,
    id: string,
    patch: Partial<DealerDraftRecord>
  ): Promise<DealerDraftRecord | null>;
  deleteDraft(dealerId: string, id: string): Promise<boolean>;
}

export interface PublishDraftResult {
  car?: MarketplaceCarRecord;
  error?: string;
  message?: string;
  missingFields?: string[];
  missingLabelsThai?: string[];
}

export interface InventoryRepository {
  backend: NongaDataBackend;
  listings: ListingRepository;
  drafts: DraftRepository;
  publishDraft(dealerId: string, draftId: string): Promise<PublishDraftResult>;
}

export const DEALER_LISTINGS_COLLECTION = "dealerListings";
export const DEALER_DRAFTS_COLLECTION = "dealerDrafts";

export function resolveInventoryDataBackend(
  env: Partial<Pick<NodeJS.ProcessEnv, "NONGA_DATA_BACKEND">> = process.env
): NongaDataBackend {
  return String(env.NONGA_DATA_BACKEND ?? "file").toLowerCase() === "firestore"
    ? "firestore"
    : "file";
}

function normalizeScope(dealerId: string): string {
  return normalizeDealerId(dealerId);
}

function listingBelongsToDealer(car: MarketplaceCarRecord, dealerId: string): boolean {
  return resolveCarDealerId(car) === normalizeScope(dealerId);
}

function draftBelongsToDealer(draft: DealerDraftRecord, dealerId: string): boolean {
  return normalizeScope(draft.dealerId) === normalizeScope(dealerId);
}

function sortListings(list: MarketplaceCarRecord[]): MarketplaceCarRecord[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function sortDrafts(list: DealerDraftRecord[]): DealerDraftRecord[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export class FileListingRepository implements ListingRepository {
  async listPublished(): Promise<MarketplaceCarRecord[]> {
    return getPublishedMarketplaceCars();
  }

  async listByDealer(dealerId: string): Promise<MarketplaceCarRecord[]> {
    return getDealerInventoryCars(normalizeScope(dealerId));
  }

  async getById(id: string): Promise<MarketplaceCarRecord | null> {
    return getMarketplaceCarById(id);
  }

  async createListing(
    dealerId: string,
    record: MarketplaceCarRecord
  ): Promise<MarketplaceCarRecord> {
    return addMarketplaceCar({
      ...record,
      dealerId: normalizeScope(dealerId),
      ownerId: record.ownerId || `owner-${normalizeScope(dealerId)}`,
    });
  }

  async updateListing(
    dealerId: string,
    id: string,
    patch: Partial<MarketplaceCarRecord>
  ): Promise<MarketplaceCarRecord | null> {
    const existing = getMarketplaceCarById(id);
    if (!existing || !listingBelongsToDealer(existing, dealerId)) return null;
    const safePatch = { ...patch, dealerId: existing.dealerId, ownerId: existing.ownerId };
    return updateMarketplaceCar(id, safePatch);
  }

  async updateVisibility(
    dealerId: string,
    id: string,
    visibility: ListingVisibility
  ): Promise<MarketplaceCarRecord | null> {
    const existing = getMarketplaceCarById(id);
    if (!existing || !listingBelongsToDealer(existing, dealerId)) return null;
    return setMarketplaceCarListingStatus(id, visibility);
  }

  async deleteListing(dealerId: string, id: string): Promise<boolean> {
    const existing = getMarketplaceCarById(id);
    if (!existing || !listingBelongsToDealer(existing, dealerId)) return false;
    return removeMarketplaceCar(id);
  }
}

export class FileDraftRepository implements DraftRepository {
  async listByDealer(dealerId: string): Promise<DealerDraftRecord[]> {
    return getDealerDraftsSorted(normalizeScope(dealerId));
  }

  async getById(dealerId: string, id: string): Promise<DealerDraftRecord | null> {
    const draft = getDealerDraftById(id);
    return draft && draftBelongsToDealer(draft, dealerId) ? draft : null;
  }

  async createDraft(dealerId: string, record: DealerDraftRecord): Promise<DealerDraftRecord> {
    const draft = { ...record, dealerId: normalizeScope(dealerId) };
    bulkAddDealerDrafts([draft]);
    return draft;
  }

  async updateDraft(
    dealerId: string,
    id: string,
    patch: Partial<DealerDraftRecord>
  ): Promise<DealerDraftRecord | null> {
    const existing = getDealerDraftById(id);
    if (!existing || !draftBelongsToDealer(existing, dealerId)) return null;
    return updateDealerDraft(id, { ...patch, dealerId: existing.dealerId });
  }

  async deleteDraft(dealerId: string, id: string): Promise<boolean> {
    const existing = getDealerDraftById(id);
    if (!existing || !draftBelongsToDealer(existing, dealerId)) return false;
    return removeDealerDraft(id);
  }
}

export class FileInventoryRepository implements InventoryRepository {
  backend: NongaDataBackend = "file";
  listings: ListingRepository = new FileListingRepository();
  drafts: DraftRepository = new FileDraftRepository();

  async publishDraft(dealerId: string, draftId: string): Promise<PublishDraftResult> {
    const draft = getDealerDraftById(draftId);
    if (!draft || !draftBelongsToDealer(draft, dealerId)) {
      return { error: "not_found", message: "ไม่พบประกาศ" };
    }
    return publishDealerDraftToMarketplace(draftId);
  }
}

type FirestoreDocumentData = Record<string, unknown>;

interface FirestoreDocumentSnapshotLike {
  id: string;
  exists: boolean;
  data(): FirestoreDocumentData | undefined;
}

interface FirestoreQuerySnapshotLike {
  docs: FirestoreDocumentSnapshotLike[];
}

interface FirestoreDocumentRefLike {
  get(): Promise<FirestoreDocumentSnapshotLike>;
  set(data: FirestoreDocumentData, options?: { merge?: boolean }): Promise<unknown>;
  delete(): Promise<unknown>;
}

interface FirestoreQueryLike {
  where(field: string, op: FirebaseFirestore.WhereFilterOp, value: unknown): FirestoreQueryLike;
  orderBy(field: string, direction?: "asc" | "desc"): FirestoreQueryLike;
  get(): Promise<FirestoreQuerySnapshotLike>;
}

interface FirestoreCollectionLike extends FirestoreQueryLike {
  doc(id: string): FirestoreDocumentRefLike;
}

export interface FirestoreDbLike {
  collection(name: string): FirestoreCollectionLike;
}

function snapshotToListing(
  snap: FirestoreDocumentSnapshotLike
): MarketplaceCarRecord | null {
  if (!snap.exists) return null;
  const data = snap.data();
  return data ? ({ id: snap.id, ...data } as MarketplaceCarRecord) : null;
}

function snapshotToDraft(snap: FirestoreDocumentSnapshotLike): DealerDraftRecord | null {
  if (!snap.exists) return null;
  const data = snap.data();
  return data ? ({ id: snap.id, ...data } as DealerDraftRecord) : null;
}

export class FirestoreListingRepository implements ListingRepository {
  constructor(private readonly db: FirestoreDbLike) {}

  private collection(): FirestoreCollectionLike {
    return this.db.collection(DEALER_LISTINGS_COLLECTION);
  }

  async listPublished(): Promise<MarketplaceCarRecord[]> {
    const snap = await this.collection().where("listingStatus", "==", "published").get();
    return sortListings(snap.docs.map(snapshotToListing).filter(Boolean) as MarketplaceCarRecord[]);
  }

  async listByDealer(dealerId: string): Promise<MarketplaceCarRecord[]> {
    const snap = await this.collection()
      .where("dealerId", "==", normalizeScope(dealerId))
      .get();
    return sortListings(snap.docs.map(snapshotToListing).filter(Boolean) as MarketplaceCarRecord[]);
  }

  async getById(id: string): Promise<MarketplaceCarRecord | null> {
    return snapshotToListing(await this.collection().doc(id).get());
  }

  async createListing(
    dealerId: string,
    record: MarketplaceCarRecord
  ): Promise<MarketplaceCarRecord> {
    const safe = sanitizeFirestoreDocument({
      ...record,
      dealerId: record.dealerId
        ? normalizeScope(record.dealerId)
        : normalizeScope(dealerId),
      ownerId: record.ownerId || `owner-${normalizeScope(dealerId)}`,
    });
    await this.collection().doc(safe.id).set(safe as unknown as FirestoreDocumentData);
    return safe;
  }

  async updateListing(
    dealerId: string,
    id: string,
    patch: Partial<MarketplaceCarRecord>
  ): Promise<MarketplaceCarRecord | null> {
    const existing = await this.getById(id);
    if (!existing || !listingBelongsToDealer(existing, dealerId)) return null;
    const safePatch = sanitizeFirestoreDocument({
      ...patch,
      dealerId: existing.dealerId,
      ownerId: existing.ownerId,
    });
    await this.collection().doc(id).set(safePatch as FirestoreDocumentData, { merge: true });
    return this.getById(id);
  }

  async updateVisibility(
    dealerId: string,
    id: string,
    visibility: ListingVisibility
  ): Promise<MarketplaceCarRecord | null> {
    return this.updateListing(dealerId, id, { listingStatus: visibility });
  }

  async deleteListing(dealerId: string, id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing || !listingBelongsToDealer(existing, dealerId)) return false;
    await this.collection().doc(id).delete();
    return true;
  }
}

export class FirestoreDraftRepository implements DraftRepository {
  constructor(private readonly db: FirestoreDbLike) {}

  private collection(): FirestoreCollectionLike {
    return this.db.collection(DEALER_DRAFTS_COLLECTION);
  }

  async listByDealer(dealerId: string): Promise<DealerDraftRecord[]> {
    const snap = await this.collection()
      .where("dealerId", "==", normalizeScope(dealerId))
      .get();
    return sortDrafts(snap.docs.map(snapshotToDraft).filter(Boolean) as DealerDraftRecord[]);
  }

  async getById(dealerId: string, id: string): Promise<DealerDraftRecord | null> {
    const draft = snapshotToDraft(await this.collection().doc(id).get());
    return draft && draftBelongsToDealer(draft, dealerId) ? draft : null;
  }

  async createDraft(dealerId: string, record: DealerDraftRecord): Promise<DealerDraftRecord> {
    const draft = sanitizeFirestoreDocument({
      ...record,
      dealerId: normalizeScope(dealerId),
      updatedAt: record.updatedAt || new Date().toISOString(),
    });
    await this.collection().doc(draft.id).set(draft as unknown as FirestoreDocumentData);
    return draft;
  }

  async updateDraft(
    dealerId: string,
    id: string,
    patch: Partial<DealerDraftRecord>
  ): Promise<DealerDraftRecord | null> {
    const existing = await this.getById(dealerId, id);
    if (!existing) return null;
    await this.collection().doc(id).set(
      sanitizeFirestoreDocument({
        ...patch,
        dealerId: existing.dealerId,
        updatedAt: new Date().toISOString(),
      }) as FirestoreDocumentData,
      { merge: true }
    );
    return this.getById(dealerId, id);
  }

  async deleteDraft(dealerId: string, id: string): Promise<boolean> {
    const existing = await this.getById(dealerId, id);
    if (!existing) return false;
    await this.collection().doc(id).delete();
    return true;
  }
}

export class FirestoreInventoryRepository implements InventoryRepository {
  backend: NongaDataBackend = "firestore";
  listings: ListingRepository;
  drafts: DraftRepository;

  constructor(private readonly db: FirestoreDbLike) {
    this.listings = new FirestoreListingRepository(db);
    this.drafts = new FirestoreDraftRepository(db);
  }

  async publishDraft(dealerId: string, draftId: string): Promise<PublishDraftResult> {
    const draft = await this.drafts.getById(dealerId, draftId);
    if (!draft) return { error: "not_found", message: "ไม่พบประกาศ" };

    const guard = validateDraftForPublish({
      id: draft.id,
      brand: draft.brand,
      model: draft.model,
      year: draft.year,
      price: draft.price,
      mileage: draft.mileage,
      images: draft.images,
      sourceImageUrls: draft.sourceImageUrls,
      imageMetadata: draft.imageMetadata,
    });
    if (!guard.ok) {
      return {
        error: "missing_required_fields",
        message: publishGuardVehicleImageMessage(guard),
        missingFields: [...guard.missingFields],
        missingLabelsThai: [...guard.missingLabelsThai],
      };
    }

    const brand = draft.brand.trim();
    const model = draft.model.trim();
    const year = Number(draft.year) || new Date().getFullYear();
    const price = Number(draft.price) || 0;
    const carId = `car-${Date.now()}`;
    const car: MarketplaceCarRecord = {
      id: carId,
      title: draft.title || `${brand} ${model} ปี ${year}`,
      brand,
      model,
      year,
      price,
      type: inferMarketplaceCategoryType({
        fuelType: draft.fuelType,
        condition: draft.condition,
        price,
      }),
      condition: draft.condition || "มือสอง",
      mileage: draft.mileage || 0,
      fuelType: draft.fuelType || "petrol",
      images: draft.images ?? [],
      imageMetadata: draft.imageMetadata,
      description: draft.description?.trim() || draft.title || "",
      dealerId: normalizeScope(draft.dealerId),
      ownerId: `owner-${normalizeScope(draft.dealerId)}`,
      ownerName: draft.ownerName,
      ownerPhone: draft.phone,
      showroomName: draft.showroomName,
      isSold: false,
      listingStatus: "published",
      createdAt: new Date().toISOString(),
      boosted: false,
      featured: false,
    };
    const created = await this.listings.createListing(dealerId, car);
    await this.drafts.deleteDraft(dealerId, draft.id);
    return { car: created };
  }
}

function initializeInventoryRepositoryAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      ...(projectId ? { projectId } : {}),
    });
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  }
  throw new Error("Firebase Admin credentials are required for NONGA_DATA_BACKEND=firestore");
}

export function createInventoryRepository(
  backend: NongaDataBackend = resolveInventoryDataBackend()
): InventoryRepository {
  if (backend === "firestore") {
    const app = initializeInventoryRepositoryAdminApp();
    return new FirestoreInventoryRepository(getFirestore(app) as unknown as FirestoreDbLike);
  }
  return new FileInventoryRepository();
}
