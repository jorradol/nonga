import { processSmartInventoryImport } from "../src/server/inventoryImportCommit.ts";
import {
  FirestoreInventoryRepository,
  type FirestoreDbLike,
} from "../src/server/repositories/inventoryRepository.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";

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

async function main() {
  const db = new MemoryFirestore();
  const repository = new FirestoreInventoryRepository(db);
  const owner = {
    dealerId: "thor-auto",
    ownerId: "owner-thor-auto",
    ownerName: "Thor Auto",
    ownerPhone: "0812345678",
    showroomName: "Thor Auto",
  };

  const commit = await processSmartInventoryImport(
    {
      published: [
        {
          sourceRowIndex: 1,
          importStatus: "valid",
          title: "Toyota Vios ปี 2021",
          brand: "Toyota",
          model: "Vios",
          year: 2021,
          price: 369000,
          mileage: 127101,
          fuelType: "petrol",
          description: "รถสภาพดี VIN: JT2BG22K1V0123456",
          sourceImageUrls: [
            "https://drive.google.com/uc?export=download&id=AAA111bbb222CCC333",
            "https://drive.google.com/uc?export=download&id=DDD444eee555FFF666",
          ],
          skipSourceImageDownload: true,
          registrationProvince: "กรุงเทพมหานคร",
          licensePlateMasked: "2ขร***",
          licensePlateFull: "2ขร3120",
          rawRow: {
            ทะเบียน: "2ขร3120",
            จังหวัดทะเบียน: "กรุงเทพมหานคร",
          },
        },
        {
          sourceRowIndex: 2,
          importStatus: "valid",
          title: "Toyota Corolla ปี 2020",
          brand: "Toyota",
          model: "Corolla",
          year: 2020,
          price: 399000,
          mileage: 0,
          fuelType: "petrol",
          description: "รถบ้านใช้งานทั่วไป",
          sourceImageUrls: [
            "https://drive.google.com/uc?export=download&id=GGG777hhh888III999",
          ],
          skipSourceImageDownload: true,
          registrationProvince: "ปทุมธานี",
          licensePlateMasked: "1กข***",
          licensePlateFull: "1กข9999",
          rawRow: {
            ทะเบียน: "1กข9999",
            จังหวัดทะเบียน: "ปทุมธานี",
          },
        },
      ],
      drafts: [],
    },
    owner,
    { inventoryRepository: repository }
  );

  assert(commit.success, "commit should succeed");
  assert(commit.importedCount === 2, "must import two listings");
  assert(
    commit.persistenceBackend === "firestore",
    "commit should persist through firestore repository"
  );
  const importedIds = commit.imported.map((item) => item.id).filter(Boolean);
  assert(importedIds.length === 2, "commit should return two imported ids");

  const request1Listings = await repository.listings.listPublished();
  assert(
    importedIds.every((id) => request1Listings.some((row) => row.id === id)),
    "all listings should be visible immediately after commit"
  );

  const request2Repo = new FirestoreInventoryRepository(db);
  const request2Listings = await request2Repo.listings.listPublished();
  const persisted = request2Listings.find((row) => row.id === importedIds[0]);
  assert(Boolean(persisted), "first listing should survive fresh repository request");
  const persistedNoMileage = request2Listings.find((row) => row.id === importedIds[1]);
  assert(Boolean(persistedNoMileage), "second listing should survive fresh repository request");
  assert(persisted?.listingStatus === "published", "listing must stay published");
  assert(
    (persisted?.images?.length ?? 0) > 0,
    "listing must keep persisted images field"
  );
  assert(
    String(persisted?.licensePlateMasked ?? "").trim().length > 0,
    "licensePlateMasked must persist with non-empty value"
  );
  assert(
    persisted?.registrationProvince === "กรุงเทพมหานคร",
    "registrationProvince must persist"
  );
  const priceLabel =
    (persisted?.price ?? 0) > 0
      ? `${(persisted?.price ?? 0).toLocaleString("th-TH")} บาท`
      : "ติดต่อสอบถาม";
  const mileageLabel =
    (persisted?.mileage ?? 0) > 0
      ? `${(persisted?.mileage ?? 0).toLocaleString("th-TH")} กม.`
      : "—";
  assert(priceLabel === "369,000 บาท", "price label should use price field");
  assert(mileageLabel === "127,101 กม.", "mileage label should use mileage field");

  const noMileagePriceLabel =
    (persistedNoMileage?.price ?? 0) > 0
      ? `${(persistedNoMileage?.price ?? 0).toLocaleString("th-TH")} บาท`
      : "ติดต่อสอบถาม";
  const noMileageMileageLabel =
    (persistedNoMileage?.mileage ?? 0) > 0
      ? `${(persistedNoMileage?.mileage ?? 0).toLocaleString("th-TH")} กม.`
      : "—";
  assert(
    noMileagePriceLabel === "399,000 บาท",
    "price should stay correct when mileage is missing"
  );
  assert(
    noMileageMileageLabel === "—",
    "missing mileage should not fallback to price"
  );

  const publicDto = toPublicMarketplaceCarDto(persisted!);
  assert(
    String((publicDto as unknown as { ownerPhone?: string }).ownerPhone ?? "") === "",
    "public dto must redact ownerPhone"
  );
  assert(!("licensePlateFull" in publicDto), "public dto must hide full plate");
  assert(!("vin" in publicDto), "public dto must hide vin");
  assert(
    String(publicDto.licensePlateMasked ?? "").trim().length > 0,
    "public dto should keep masked plate only"
  );

  const chatCardFetch = await request2Repo.listings.getById(importedIds[0]!);
  assert(Boolean(chatCardFetch), "chat card source fetch should resolve persisted listing");
  assert(
    (chatCardFetch?.images?.length ?? 0) > 0,
    "chat card source should include persisted images"
  );

  console.log("PASS test-marketplace-import-persistence");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
