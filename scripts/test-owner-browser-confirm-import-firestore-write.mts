import {
  isTrueProductionImportRuntime,
  processSmartInventoryImport,
} from "../src/server/inventoryImportCommit.ts";
import {
  FirestoreInventoryRepository,
  type FirestoreDbLike,
} from "../src/server/repositories/inventoryRepository.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { toUserFacingMessage } from "../src/utils/userFacingErrors.ts";

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
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    K_SERVICE: process.env.K_SERVICE,
    NONGA_DEPLOY_ENV: process.env.NONGA_DEPLOY_ENV,
    NONGA_THOR_IMPORT_FORCE_HIDDEN: process.env.NONGA_THOR_IMPORT_FORCE_HIDDEN,
  };

  try {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://a.nongbot.org";
    process.env.K_SERVICE = "nonga-staging";
    process.env.NONGA_DEPLOY_ENV = "staging";
    delete process.env.NONGA_THOR_IMPORT_FORCE_HIDDEN;

    assert(
      isTrueProductionImportRuntime() === false,
      "staging Cloud Run with NODE_ENV=production must not count as true production"
    );
    assert(
      isTrueProductionImportRuntime({
        NODE_ENV: "production",
        APP_URL: "https://nonga.app",
        NONGA_DEPLOY_ENV: "production",
      }) === true,
      "explicit production deploy env must still block Thor import"
    );

    const productionBlockMessage =
      "Thor Auto controlled import is restricted to staging only; production import is blocked";
    const friendly = toUserFacingMessage(
      productionBlockMessage,
      "ระบบยังไม่พร้อมบันทึกข้อมูลใน staging กรุณาแจ้งผู้ดูแลระบบ",
      { requestId: "imp-test-001" }
    );
    assert(
      friendly.includes("ระบบยังไม่พร้อมบันทึกข้อมูลใน staging"),
      "owner-facing message must stay friendly"
    );
    assert(
      friendly.includes("imp-test-001"),
      "owner-facing message must include request id"
    );

    const db = new MemoryFirestore();
    // Seed 10 existing marketplace listings (owner-reported baseline).
    for (let i = 1; i <= 10; i++) {
      await db.collection("dealerListings").doc(`existing-${i}`).set({
        id: `existing-${i}`,
        title: `Existing Car ${i}`,
        brand: "Honda",
        model: `City ${i}`,
        year: 2020,
        price: 400000 + i,
        mileage: 50000,
        fuelType: "petrol",
        type: "used",
        condition: "มือสอง",
        images: ["https://example.com/car.jpg"],
        description: "existing",
        dealerId: "pilot-dealer",
        ownerId: "owner-pilot",
        ownerName: "Pilot",
        ownerPhone: "",
        isSold: false,
        listingStatus: "published",
        createdAt: new Date(2026, 0, i).toISOString(),
        boosted: false,
        featured: false,
      });
    }

    const repository = new FirestoreInventoryRepository(db);
    const existing = await repository.listings.listPublished();
    assert(existing.length === 10, "marketplace should already have 10 listings");

    const owner = {
      dealerId: "thor-auto",
      ownerId: "owner-thor-auto",
      ownerName: "Thor Auto",
      ownerPhone: "0812345678",
      showroomName: "Thor Auto",
    };

    const thorRows = [
      {
        sourceRowIndex: 1,
        importStatus: "valid" as const,
        title: "Toyota Vios ปี 2021",
        brand: "Toyota",
        model: "Vios",
        year: 2021,
        price: 369000,
        mileage: 127101,
        fuelType: "petrol",
        description: "รถสภาพดี",
        sourceImageUrls: [
          "https://drive.google.com/uc?export=download&id=AAA111bbb222CCC333",
        ],
        skipSourceImageDownload: true,
        warnings: ["financeStatus: ปิดบัญชีแล้ว (warning only)"],
        registrationProvince: "กรุงเทพมหานคร",
        licensePlateMasked: "2ขร***",
        licensePlateFull: "2ขร3120",
        rawRow: { ทะเบียน: "2ขร3120", จังหวัดทะเบียน: "กรุงเทพมหานคร" },
      },
      {
        sourceRowIndex: 2,
        importStatus: "valid" as const,
        title: "Honda City ปี 2020",
        brand: "Honda",
        model: "City",
        year: 2020,
        price: 429000,
        mileage: 88000,
        fuelType: "petrol",
        description: "พร้อมใช้",
        sourceImageUrls: [
          "https://drive.google.com/file/d/private-link/view",
        ],
        skipSourceImageDownload: true,
        warnings: [],
        registrationProvince: "ชลบุรี",
        licensePlateMasked: "9ฆอ***",
        licensePlateFull: "9ฆอ9999",
        rawRow: { ทะเบียน: "9ฆอ9999", จังหวัดทะเบียน: "ชลบุรี" },
      },
      {
        sourceRowIndex: 3,
        importStatus: "warning" as const,
        title: "Mazda 2 ปี 2019",
        brand: "Mazda",
        model: "2",
        year: 2019,
        price: 389000,
        mileage: 72000,
        fuelType: "petrol",
        description: "แกลเลอรี่ครบ",
        sourceImageUrls: [],
        skipSourceImageDownload: true,
        warnings: ["ไม่มีรูปจาก CSV — จะใช้ placeholder"],
        registrationProvince: "นนทบุรี",
        licensePlateMasked: "1กข***",
        licensePlateFull: "1กข1234",
        rawRow: { ทะเบียน: "1กข1234", จังหวัดทะเบียน: "นนทบุรี" },
      },
    ];

    const commit = await processSmartInventoryImport(
      { published: thorRows, drafts: [] },
      owner,
      { inventoryRepository: repository }
    );

    assert(commit.success, "confirm import must succeed on staging runtime");
    assert(commit.importedCount === 3, "must import all 3 Thor rows");
    assert(commit.publishedCount === 3, "all 3 rows should publish");
    assert(
      commit.persistenceBackend === "firestore",
      "commit must write through firestore repository"
    );
    assert(
      (commit.warningCount ?? 0) >= 1,
      "financeStatus / image warnings must not block import"
    );

    const afterCommit = await repository.listings.listPublished();
    assert(
      afterCommit.length === 13,
      "marketplace fetch must see previous 10 + new 3"
    );
    for (const imported of commit.imported) {
      assert(
        afterCommit.some((row) => row.id === imported.id),
        `imported listing ${imported.id} must appear in /api/cars source`
      );
    }

    const freshRepo = new FirestoreInventoryRepository(db);
    const afterRefresh = await freshRepo.listings.listPublished();
    assert(
      afterRefresh.length === 13,
      "refresh/new request must still see all listings"
    );

    const sample = afterRefresh.find((row) => row.id === commit.imported[0]?.id);
    assert(Boolean(sample), "imported listing must persist");
    const publicDto = toPublicMarketplaceCarDto(sample!);
    assert(!("licensePlateFull" in publicDto), "public dto must hide full plate");
    assert(!("vin" in publicDto), "public dto must hide vin");
    assert(
      String((publicDto as unknown as { ownerPhone?: string }).ownerPhone ?? "") ===
        "",
      "public dto must hide phone"
    );

    // Invalid row must surface row-level failure, not only generic staging error.
    const invalid = await processSmartInventoryImport(
      {
        published: [
          {
            sourceRowIndex: 99,
            brand: "",
            model: "MissingBrand",
            year: 2021,
            price: 100000,
            skipSourceImageDownload: true,
          },
        ],
        drafts: [],
      },
      owner,
      { inventoryRepository: repository }
    );
    assert(invalid.success === false, "invalid row must not report success");
    assert(
      invalid.failed.some((row) => row.message.includes("brand")),
      "invalid row must return row-level error"
    );

    // True production must still block Thor controlled import.
    process.env.NONGA_DEPLOY_ENV = "production";
    process.env.APP_URL = "https://nonga.app";
    process.env.K_SERVICE = "nonga-production";
    let blocked = false;
    try {
      await processSmartInventoryImport(
        {
          published: [
            {
              sourceRowIndex: 1,
              brand: "Toyota",
              model: "Vios",
              year: 2021,
              price: 100000,
              skipSourceImageDownload: true,
            },
          ],
          drafts: [],
        },
        owner,
        { inventoryRepository: repository }
      );
    } catch (error) {
      blocked = true;
      assert(
        error instanceof Error &&
          error.message.includes("restricted to staging only"),
        "true production must keep Thor block"
      );
    }
    assert(blocked, "true production Thor import must throw");
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }

  console.log("PASS test-owner-browser-confirm-import-firestore-write");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
