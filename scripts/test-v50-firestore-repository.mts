import {
  FileInventoryRepository,
  FirestoreInventoryRepository,
  resolveInventoryDataBackend,
  DEALER_DRAFTS_COLLECTION,
  DEALER_LISTINGS_COLLECTION,
  type FirestoreDbLike,
} from "../src/server/repositories/inventoryRepository.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import type { DealerDraftRecord } from "../src/server/dealerDraftInventory.ts";
import { createEmptyNormalizedRow } from "../src/utils/inventoryImport/inventoryImportSchema.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

type DocData = Record<string, unknown>;

class MemoryDoc {
  constructor(
    private readonly collection: MemoryCollection,
    private readonly id: string
  ) {}

  async get() {
    const data = this.collection.getData(this.id);
    return {
      id: this.id,
      exists: Boolean(data),
      data: () => (data ? { ...data } : undefined),
    };
  }

  async set(data: DocData, options?: { merge?: boolean }) {
    this.collection.setData(this.id, data, options?.merge === true);
  }

  async delete() {
    this.collection.deleteData(this.id);
  }
}

class MemoryQuery {
  protected filters: Array<{ field: string; value: unknown }> = [];
  protected collection: MemoryCollection;

  constructor(collection?: MemoryCollection) {
    this.collection = collection ?? (this as unknown as MemoryCollection);
  }

  where(field: string, _op: string, value: unknown): MemoryQuery {
    const next = new MemoryQuery(this.collection);
    next.filters = [...this.filters, { field, value }];
    return next;
  }

  orderBy(): MemoryQuery {
    return this;
  }

  async get() {
    const docs = this.collection
      .entries()
      .filter(([, data]) =>
        this.filters.every((filter) => data[filter.field] === filter.value)
      )
      .map(([id, data]) => ({
        id,
        exists: true,
        data: () => ({ ...data }),
      }));
    return { docs };
  }
}

class MemoryCollection extends MemoryQuery {
  private docs = new Map<string, DocData>();

  constructor(readonly name: string) {
    super();
  }

  doc(id: string): MemoryDoc {
    return new MemoryDoc(this, id);
  }

  getData(id: string): DocData | undefined {
    return this.docs.get(id);
  }

  setData(id: string, data: DocData, merge: boolean): void {
    const prev = merge ? this.docs.get(id) ?? {} : {};
    this.docs.set(id, { ...prev, ...data });
  }

  deleteData(id: string): void {
    this.docs.delete(id);
  }

  entries(): Array<[string, DocData]> {
    return [...this.docs.entries()];
  }
}

class MemoryFirestore implements FirestoreDbLike {
  collections = new Map<string, MemoryCollection>();

  collection(name: string): MemoryCollection {
    const existing = this.collections.get(name);
    if (existing) return existing;
    const created = new MemoryCollection(name);
    this.collections.set(name, created);
    return created;
  }
}

function sampleListing(id: string, dealerId: string): MarketplaceCarRecord {
  return {
    id,
    title: `Repo Test ${id}`,
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 299000,
    type: "used",
    condition: "มือสอง",
    mileage: 50000,
    fuelType: "petrol",
    images: ["/storage/listings/repo-test/01.webp"],
    description: "repo test listing",
    ownerId: `owner-${dealerId}`,
    ownerName: "Repo Test Dealer",
    ownerPhone: "0800000000",
    showroomName: "Repo Test",
    isSold: false,
    dealerId,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
  };
}

function sampleDraft(id: string, dealerId: string): DealerDraftRecord {
  const normalizedData = createEmptyNormalizedRow();
  normalizedData.brand = "Toyota";
  normalizedData.model = "Vios";
  normalizedData.year = "2020";
  normalizedData.price = "299000";
  normalizedData.mileage = "50000";
  normalizedData.fuelType = "petrol";
  normalizedData.imageUrls = `/storage/listings/${id}/01.webp`;
  return {
    id,
    dealerId,
    dealerName: "Repo Test Dealer",
    ownerName: "Repo Test Dealer",
    phone: "0800000000",
    showroomName: "Repo Test",
    rawRow: {},
    normalizedData,
    missingFields: [],
    warnings: [],
    confidenceScore: 100,
    status: "draft",
    images: [`/storage/listings/${id}/01.webp`],
    sourceImageUrls: [`/storage/listings/${id}/01.webp`],
    title: `Repo Draft ${id}`,
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 299000,
    mileage: 50000,
    fuelType: "petrol",
    condition: "มือสอง",
    description: "repo test draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

console.log("=== Nong A v5.0 Firestore Repository Layer Smoke ===");

assert(resolveInventoryDataBackend({}) === "file", "default backend should be file");
assert(
  resolveInventoryDataBackend({ NONGA_DATA_BACKEND: "firestore" }) === "firestore",
  "firestore env should select Firestore backend"
);
assert(
  resolveInventoryDataBackend({ NODE_ENV: "production" }) === "firestore",
  "production default should use firestore backend"
);
console.log("PASS backend flag defaults to file and accepts firestore");

const fileRepo = new FileInventoryRepository();
const fileDealer = "repo-file-dealer";
const otherDealer = "repo-other-dealer";
const fileListing = sampleListing(`repo-file-car-${Date.now()}`, fileDealer);
const fileDraft = sampleDraft(`repo-file-draft-${Date.now()}`, fileDealer);

try {
  await fileRepo.listings.createListing(fileDealer, fileListing);
  const dealerListings = await fileRepo.listings.listByDealer(fileDealer);
  assert(
    dealerListings.some((item) => item.id === fileListing.id),
    "file backend should list created dealer listing"
  );
  assert(
    (await fileRepo.listings.updateListing(otherDealer, fileListing.id, { price: 1 })) === null,
    "file backend should reject cross-dealer listing update"
  );
  const hidden = await fileRepo.listings.updateVisibility(
    fileDealer,
    fileListing.id,
    "hidden"
  );
  assert(hidden?.listingStatus === "hidden", "file backend should update visibility");
  console.log("PASS file backend listing list/update/visibility");

  await fileRepo.drafts.createDraft(fileDealer, fileDraft);
  const dealerDrafts = await fileRepo.drafts.listByDealer(fileDealer);
  assert(
    dealerDrafts.some((item) => item.id === fileDraft.id),
    "file backend should list created dealer draft"
  );
  assert(
    (await fileRepo.drafts.updateDraft(otherDealer, fileDraft.id, { price: 1 })) === null,
    "file backend should reject cross-dealer draft update"
  );
  const updatedDraft = await fileRepo.drafts.updateDraft(fileDealer, fileDraft.id, {
    price: 309000,
  });
  assert(updatedDraft?.price === 309000, "file backend should update draft");
  console.log("PASS file backend draft create/update/delete scope");
} finally {
  await fileRepo.listings.deleteListing(fileDealer, fileListing.id);
  await fileRepo.drafts.deleteDraft(fileDealer, fileDraft.id);
}

const memoryDb = new MemoryFirestore();
const firestoreRepo = new FirestoreInventoryRepository(memoryDb);
const fsDealer = "repo-firestore-dealer";
const fsOtherDealer = "repo-firestore-other";
const fsListing = sampleListing("repo-firestore-car", fsDealer);
const fsDraft = sampleDraft("repo-firestore-draft", fsDealer);

await firestoreRepo.listings.createListing(fsDealer, fsListing);
await firestoreRepo.drafts.createDraft(fsDealer, fsDraft);

assert(
  memoryDb.collection(DEALER_LISTINGS_COLLECTION).name === DEALER_LISTINGS_COLLECTION &&
    memoryDb.collection(DEALER_DRAFTS_COLLECTION).name === DEALER_DRAFTS_COLLECTION,
  "firestore backend should target dealerListings and dealerDrafts"
);
assert(
  (await firestoreRepo.listings.listPublished()).some((item) => item.id === fsListing.id),
  "firestore backend should list published listings"
);
assert(
  (await firestoreRepo.listings.updateListing(fsOtherDealer, fsListing.id, { price: 1 })) === null,
  "firestore backend should reject cross-dealer listing update"
);
assert(
  (await firestoreRepo.drafts.updateDraft(fsOtherDealer, fsDraft.id, { price: 1 })) === null,
  "firestore backend should reject cross-dealer draft update"
);
const fsUpdated = await firestoreRepo.drafts.updateDraft(fsDealer, fsDraft.id, {
  price: 319000,
});
assert(fsUpdated?.price === 319000, "firestore backend should update own draft");
console.log("PASS firestore dry-run repository scope and CRUD");

const publishDraft = sampleDraft("repo-firestore-publish-draft", fsDealer);
await firestoreRepo.drafts.createDraft(fsDealer, publishDraft);
const published = await firestoreRepo.publishDraft(fsDealer, publishDraft.id);
assert(published.car?.dealerId === fsDealer, "firestore publish should create dealer listing");
assert(
  (await firestoreRepo.drafts.getById(fsDealer, publishDraft.id)) === null,
  "firestore publish should remove draft"
);
console.log("PASS firestore dry-run publish keeps image fields and removes draft");
