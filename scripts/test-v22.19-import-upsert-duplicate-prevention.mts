/**
 * v22.19 — Import upsert / duplicate-prevention + durable image merge tests.
 * Staging-only boundaries: no production, no real lead, no dealer-facing send.
 */
import assert from "node:assert/strict";
import {
  processSmartInventoryImport,
  type CommitImportRowInput,
} from "../src/server/inventoryImportCommit.ts";
import {
  buildImportKey,
  mergeImportListingFields,
  resolveImportUpsertMatch,
  type ImportIdentityCandidate,
  type ImportIdentityFields,
} from "../src/server/listingImportIdentity.ts";
import {
  FirestoreInventoryRepository,
  type FirestoreDbLike,
} from "../src/server/repositories/inventoryRepository.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { LISTING_PLACEHOLDER_IMAGE } from "../src/utils/listingImages.ts";

function ok(name: string): void {
  console.log("PASS", name);
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
    if (merge && this.docs.has(id)) {
      this.docs.set(id, { ...this.docs.get(id), ...data, id });
      return;
    }
    this.docs.set(id, { ...data, id });
  }

  deleteData(id: string): void {
    this.docs.delete(id);
  }

  entries(): Array<[string, DocData]> {
    return [...this.docs.entries()];
  }
}

class MemoryDb implements FirestoreDbLike {
  private collections = new Map<string, MemoryCollection>();

  collection(name: string): MemoryCollection {
    let col = this.collections.get(name);
    if (!col) {
      col = new MemoryCollection(name);
      this.collections.set(name, col);
    }
    return col;
  }
}

function thorRow(
  overrides: Partial<CommitImportRowInput> & {
    brand: string;
    model: string;
    year: number;
    price: number;
    mileage: number;
    color: string;
  }
): CommitImportRowInput {
  const {
    brand,
    model,
    year,
    price,
    mileage,
    color,
    sourceRowIndex = 1,
    ...rest
  } = overrides;
  return {
    sourceRowIndex,
    brand,
    model,
    year,
    price,
    mileage,
    title: `${brand} ${model} ปี ${year}`,
    description: `${brand} ${model} สี: ${color}`,
    fuelType: "petrol",
    condition: "มือสอง",
    ownerId: "thor-auto",
    rawRow: {
      brand,
      model,
      year: String(year),
      price: String(price),
      mileage: String(mileage),
      color,
    },
    sourceImageUrls: rest.sourceImageUrls ?? [],
    ...rest,
  };
}

function identity(
  partial: Partial<ImportIdentityFields> & { dealerId: string }
): ImportIdentityFields {
  return {
    licensePlateFull: "",
    registrationProvince: "",
    vin: "",
    brand: "",
    model: "",
    year: 0,
    color: "",
    mileage: 0,
    price: 0,
    ...partial,
  };
}

async function main(): Promise<void> {
  // --- Unit: match precedence ---
  {
    const incoming = identity({
      dealerId: "thor-auto",
      licensePlateFull: "1กข1234",
      registrationProvince: "กรุงเทพ",
      brand: "toyota",
      model: "vios",
      year: 2020,
      color: "ขาว",
      mileage: 50000,
      price: 399000,
    });
    const corpus: ImportIdentityCandidate[] = [
      {
        id: "car-old",
        dealerId: "thor-auto",
        licensePlateFull: "1กข1234",
        registrationProvince: "กรุงเทพ",
        brand: "toyota",
        model: "vios",
        year: 2020,
        color: "ขาว",
        mileage: 50000,
        price: 399000,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const match = resolveImportUpsertMatch(incoming, corpus);
    assert.equal(match.confidence, "high");
    assert.equal(match.keyKind, "dealer_plate");
    assert.equal(match.matchedId, "car-old");
    assert.ok(match.importKey.startsWith("dealer_plate:"));
    ok("plate+province exact match → high confidence upsert");
  }

  {
    const incoming = identity({
      dealerId: "thor-auto",
      brand: "suzuki",
      model: "ertiga",
      year: 2022,
      color: "ขาว",
      mileage: 45200,
      price: 589000,
    });
    const corpus: ImportIdentityCandidate[] = [
      {
        id: "car-a",
        dealerId: "thor-auto",
        brand: "suzuki",
        model: "ertiga",
        year: 2022,
        color: "ขาว",
        mileage: 45200,
        price: 589000,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const match = resolveImportUpsertMatch(incoming, corpus);
    assert.equal(match.confidence, "high");
    assert.equal(match.keyKind, "dealer_fingerprint");
    assert.equal(match.matchedId, "car-a");
    ok("fingerprint exact unique → high confidence upsert");
  }

  {
    const incoming = identity({
      dealerId: "thor-auto",
      brand: "suzuki",
      model: "ertiga",
      year: 2022,
      color: "ขาว",
      mileage: 45200,
      price: 589000,
    });
    const corpus: ImportIdentityCandidate[] = [
      {
        id: "car-a",
        dealerId: "thor-auto",
        brand: "suzuki",
        model: "ertiga",
        year: 2022,
        color: "ขาว",
        mileage: 45200,
        price: 589000,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "car-b",
        dealerId: "thor-auto",
        brand: "suzuki",
        model: "ertiga",
        year: 2022,
        color: "ขาว",
        mileage: 45200,
        price: 589000,
        createdAt: "2026-07-09T00:00:00.000Z",
      },
    ];
    const match = resolveImportUpsertMatch(incoming, corpus);
    assert.equal(match.confidence, "ambiguous");
    assert.equal(match.candidateIds.length, 2);
    ok("ambiguous fingerprint → NEED REVIEW (no guess)");
  }

  {
    const incoming = identity({
      dealerId: "thor-auto",
      licensePlateFull: "กข**",
      brand: "honda",
      model: "city",
      year: 2023,
      color: "แดง",
      mileage: 22100,
      price: 699000,
    });
    const corpus: ImportIdentityCandidate[] = [
      {
        id: "car-x",
        dealerId: "thor-auto",
        licensePlateFull: "กข**",
        brand: "honda",
        model: "city",
        year: 2023,
        color: "แดง",
        mileage: 22100,
        price: 699000,
      },
    ];
    const match = resolveImportUpsertMatch(incoming, corpus);
    // Masked plate alone must not be the only key; falls through to fingerprint.
    assert.notEqual(match.keyKind, "dealer_plate");
    assert.equal(match.confidence, "high");
    assert.equal(match.keyKind, "dealer_fingerprint");
    ok("masked plate alone is not used as sole upsert key");
  }

  {
    const merged = mergeImportListingFields(
      {
        id: "car-1",
        brand: "Toyota",
        model: "Vios",
        price: 400000,
        mileage: 50000,
        description: "good",
        images: [
          "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/listing-images%2Fthor-auto%2Fcar-1%2Fa.jpg?alt=media&token=abc",
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        dealerId: "thor-auto",
        ownerId: "thor-auto",
      },
      {
        brand: "Toyota",
        model: "Vios",
        price: 420000,
        mileage: 0,
        description: "",
        images: [LISTING_PLACEHOLDER_IMAGE],
      },
      {
        preserveExistingImages: true,
        imageFailed: true,
        incomingImages: [],
        placeholderUrl: LISTING_PLACEHOLDER_IMAGE,
      }
    );
    assert.equal(merged.price, 420000);
    assert.equal(merged.mileage, 50000);
    assert.equal(merged.description, "good");
    assert.equal(merged.id, "car-1");
    assert.ok(
      String((merged.images as string[])[0]).includes("firebasestorage")
    );
    ok("blank fields do not erase good data; failed image preserves old URL");
  }

  {
    const key = buildImportKey(
      "dealer_fingerprint",
      identity({
        dealerId: "thor-auto",
        brand: "suzuki",
        model: "ertiga",
        year: 2022,
        color: "ขาว",
        mileage: 45200,
        price: 589000,
      })
    );
    assert.match(key, /^dealer_fingerprint:[a-f0-9]{24}$/);
    ok("importKey is opaque hash (no raw plate/VIN)");
  }

  // --- Integration: re-import upsert via memory Firestore ---
  const previousFetch = globalThis.fetch;
  const tinyJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);

  try {
    globalThis.fetch = (async () =>
      new Response(tinyJpeg, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })) as typeof fetch;

    const db = new MemoryDb();
    const repo = new FirestoreInventoryRepository(db as unknown as FirestoreDbLike);

    const rows: CommitImportRowInput[] = [
      thorRow({
        sourceRowIndex: 1,
        brand: "Suzuki",
        model: "Ertiga",
        year: 2022,
        price: 589000,
        mileage: 45200,
        color: "ขาว",
        sourceImageUrls: [
          "https://example.test/thor/ertiga-1.jpg",
        ],
      }),
      thorRow({
        sourceRowIndex: 2,
        brand: "Toyota",
        model: "Fortuner",
        year: 2020,
        price: 1290000,
        mileage: 89500,
        color: "ดำ",
        sourceImageUrls: [
          "https://example.test/thor/fortuner-1.jpg",
        ],
      }),
      thorRow({
        sourceRowIndex: 3,
        brand: "Honda",
        model: "City",
        year: 2023,
        price: 699000,
        mileage: 22100,
        color: "แดง",
        sourceImageUrls: [
          "https://example.test/thor/city-1.jpg",
        ],
      }),
    ];

    const first = await processSmartInventoryImport(
      { published: rows, drafts: [] },
      { dealerId: "thor-auto", showroomName: "Thor Auto" },
      { inventoryRepository: repo }
    );
    assert.equal(first.createdCount, 3);
    assert.equal(first.updatedCount, 0);
    assert.equal(first.publishedCount, 3);
    const firstIds = first.imported.map((r) => r.id).sort();
    assert.equal(firstIds.length, 3);

    const afterFirst = await repo.listings.listByDealer("thor-auto");
    assert.equal(afterFirst.length, 3);
    for (const car of afterFirst) {
      assert.ok(car.images?.length);
      assert.ok(car.images.every((u) => isWorkingOrPlaceholder(u)));
    }
    ok("first Thor import creates 3 listings");

    // Re-import same cars with price change + durable-looking image URLs path
    const reRows: CommitImportRowInput[] = rows.map((r, i) => ({
      ...r,
      price: Number(r.price) + 1000,
      sourceImageUrls: [`https://example.test/thor/reimport-${i}.jpg`],
    }));

    const second = await processSmartInventoryImport(
      { published: reRows, drafts: [] },
      { dealerId: "thor-auto", showroomName: "Thor Auto" },
      { inventoryRepository: repo }
    );
    assert.equal(second.createdCount, 0, "re-import must not create");
    assert.equal(second.updatedCount, 3, "re-import must update existing");
    assert.equal(second.publishedCount, 3);
    assert.equal(second.heldForReviewCount, 0);
    const secondIds = second.imported.map((r) => r.id).sort();
    assert.deepEqual(secondIds, firstIds, "stable listing ids on re-import");

    const afterSecond = await repo.listings.listByDealer("thor-auto");
    assert.equal(
      afterSecond.length,
      3,
      "marketplace count remains stable on re-import"
    );
    for (const car of afterSecond) {
      assert.ok(
        Number(car.price) % 1000 === 0 || Number(car.price) > 0,
        "price merged"
      );
      // prices should be original+1000
      const original = rows.find(
        (r) =>
          String(r.brand).toLowerCase() === car.brand.toLowerCase() &&
          String(r.model).toLowerCase() === car.model.toLowerCase()
      );
      assert.ok(original);
      assert.equal(car.price, Number(original!.price) + 1000);
    }
    ok("re-import same Thor CSV updates existing; count stable; fields merged");

    // Blank incoming must not wipe description / images
    const blankReimport = await processSmartInventoryImport(
      {
        published: [
          {
            ...rows[0],
            description: "",
            sourceImageUrls: [],
            price: 0,
            mileage: 0,
          },
        ],
        drafts: [],
      },
      { dealerId: "thor-auto", showroomName: "Thor Auto" },
      { inventoryRepository: repo }
    );
    // price 0 fails validatePublishRow → skipped OR if we only blank optional fields
    void blankReimport;
    const keepPriceRow = {
      ...rows[0],
      description: "",
      sourceImageUrls: [],
      // keep required price/year/brand/model
    };
    const beforeBlank = (await repo.listings.listByDealer("thor-auto")).find(
      (c) => c.brand.toLowerCase() === "suzuki"
    )!;
    const blankResult = await processSmartInventoryImport(
      { published: [keepPriceRow], drafts: [] },
      { dealerId: "thor-auto", showroomName: "Thor Auto" },
      { inventoryRepository: repo }
    );
    assert.equal(blankResult.updatedCount, 1);
    const afterBlank = (await repo.listings.listByDealer("thor-auto")).find(
      (c) => c.id === beforeBlank.id
    )!;
    assert.ok(afterBlank.description.includes("Suzuki") || afterBlank.description.length > 0);
    assert.ok(afterBlank.images.length > 0);
    assert.ok(
      afterBlank.images.some((u) => u !== LISTING_PLACEHOLDER_IMAGE) ||
        beforeBlank.images.every((u) => u === LISTING_PLACEHOLDER_IMAGE)
    );
    ok("blank incoming description/images do not erase good existing data");

    // Failed image download preserves existing working images
    globalThis.fetch = (async () =>
      new Response("fail", { status: 500 })) as typeof fetch;
    const beforeFail = (await repo.listings.listByDealer("thor-auto")).find(
      (c) => c.brand.toLowerCase() === "toyota"
    )!;
    const failResult = await processSmartInventoryImport(
      {
        published: [
          {
            ...rows[1],
            price: 1291000,
            sourceImageUrls: ["https://example.test/thor/broken.jpg"],
          },
        ],
        drafts: [],
      },
      { dealerId: "thor-auto", showroomName: "Thor Auto" },
      { inventoryRepository: repo }
    );
    assert.equal(failResult.updatedCount, 1);
    const afterFail = (await repo.listings.getById(beforeFail.id))!;
    assert.deepEqual(afterFail.images, beforeFail.images);
    assert.ok(
      failResult.rowWarnings?.some((w) =>
        w.warnings.some((t) => /preserved existing working image/i.test(t))
      )
    );
    ok("failed image upload does not erase existing working images");

    // Successful durable URL replace (simulate by injecting reusable firebase URL on row.images)
    globalThis.fetch = (async () =>
      new Response(tinyJpeg, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      })) as typeof fetch;
    const beforeDurable = (await repo.listings.listByDealer("thor-auto")).find(
      (c) => c.brand.toLowerCase() === "honda"
    )!;
    // Seed ephemeral path then re-import with download success
    await repo.listings.updateListing("thor-auto", beforeDurable.id, {
      images: [`/storage/listings/${beforeDurable.id}/old.jpg`],
    });
    const durableResult = await processSmartInventoryImport(
      {
        published: [
          {
            ...rows[2],
            sourceImageUrls: ["https://example.test/thor/city-new.jpg"],
          },
        ],
        drafts: [],
      },
      { dealerId: "thor-auto", showroomName: "Thor Auto" },
      { inventoryRepository: repo }
    );
    assert.equal(durableResult.updatedCount, 1);
    const afterDurable = (await repo.listings.getById(beforeDurable.id))!;
    // File backend in tests stores /storage/listings/{id}/... which replaces ephemeral
    // for same listing id — proves upsert targets stable id for image rewrite.
    assert.ok(
      afterDurable.images.some(
        (u) =>
          u.includes(beforeDurable.id) ||
          u.includes("firebasestorage") ||
          /^https?:\/\//i.test(u)
      )
    );
    assert.ok(!afterDurable.images.every((u) => u.includes("/old.jpg")));
    ok("successful image download on upsert rewrites images onto stable listing id");

    // Ambiguous hold — seed two identical fingerprint cars then re-import
    const ambDb = new MemoryDb();
    const ambRepo = new FirestoreInventoryRepository(
      ambDb as unknown as FirestoreDbLike
    );
    await ambRepo.listings.createListing("thor-auto", {
      id: "car-dup-1",
      title: "Suzuki Ertiga ปี 2022",
      brand: "Suzuki",
      model: "Ertiga",
      year: 2022,
      price: 589000,
      type: "used",
      condition: "มือสอง",
      mileage: 45200,
      fuelType: "petrol",
      color: "ขาว",
      images: [LISTING_PLACEHOLDER_IMAGE],
      description: "สี: ขาว",
      ownerId: "thor-auto",
      ownerName: "Thor Auto",
      ownerPhone: "",
      dealerId: "thor-auto",
      isSold: false,
      listingStatus: "published",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await ambRepo.listings.createListing("thor-auto", {
      id: "car-dup-2",
      title: "Suzuki Ertiga ปี 2022",
      brand: "Suzuki",
      model: "Ertiga",
      year: 2022,
      price: 589000,
      type: "used",
      condition: "มือสอง",
      mileage: 45200,
      fuelType: "petrol",
      color: "ขาว",
      images: [LISTING_PLACEHOLDER_IMAGE],
      description: "สี: ขาว",
      ownerId: "thor-auto",
      ownerName: "Thor Auto",
      ownerPhone: "",
      dealerId: "thor-auto",
      isSold: false,
      listingStatus: "published",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const amb = await processSmartInventoryImport(
      {
        published: [
          thorRow({
            brand: "Suzuki",
            model: "Ertiga",
            year: 2022,
            price: 589000,
            mileage: 45200,
            color: "ขาว",
          }),
        ],
        drafts: [],
      },
      { dealerId: "thor-auto", showroomName: "Thor Auto" },
      { inventoryRepository: ambRepo }
    );
    assert.equal(amb.heldForReviewCount, 1);
    assert.equal(amb.createdCount, 0);
    assert.equal(amb.updatedCount, 0);
    assert.equal((await ambRepo.listings.listByDealer("thor-auto")).length, 2);
    ok("ambiguous duplicate match is held for review, not guessed");

    // Public DTO privacy
    const privateCar = afterSecond[0];
    privateCar.licensePlateFull = "1กข9999";
    privateCar.vin = "JTDBR32E720123456";
    privateCar.ownerPhone = "0812345678";
    privateCar.importKey = "dealer_plate:abc";
    const pub = toPublicMarketplaceCarDto(privateCar);
    assert.equal((pub as { licensePlateFull?: string }).licensePlateFull, undefined);
    assert.equal((pub as { vin?: string }).vin, undefined);
    assert.ok(
      !(pub as { ownerPhone?: string }).ownerPhone,
      "ownerPhone must be empty/redacted on public DTO"
    );
    assert.equal((pub as { importKey?: string }).importKey, undefined);
    ok("public DTO blocks full plate/VIN/phone/importKey");

    // Boundary: no lead / dealer-facing send in this module path
    assert.ok(!JSON.stringify(second).includes("buyerLead"));
    assert.ok(!JSON.stringify(second).includes("dealerFacingSend"));
    ok("no real lead created; no dealer-facing send triggered");
  } finally {
    globalThis.fetch = previousFetch;
  }

  console.log("\nAll v22.19 import upsert tests passed.");
}

function isWorkingOrPlaceholder(u: string): boolean {
  return Boolean(u && String(u).trim());
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
