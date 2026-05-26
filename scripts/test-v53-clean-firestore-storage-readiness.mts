import express from "express";
import {
  DEALER_DRAFTS_COLLECTION,
  DEALER_LISTINGS_COLLECTION,
  FirestoreInventoryRepository,
  type FirestoreDbLike,
} from "../src/server/repositories/inventoryRepository.ts";
import { registerDealerPortalRoutes } from "../src/server/dealerPortalRoutes.ts";
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

async function requestJson(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Dealer-Id": "clean-dealer",
      "X-User-Role": "dealer",
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

console.log("=== V5.3D Clean Firestore/Storage Readiness ===");

const db = new MemoryFirestore();
const inventoryRepository = new FirestoreInventoryRepository(db);
const app = express();
app.use(express.json({ limit: "2mb" }));
registerDealerPortalRoutes(app, { inventoryRepository });

const server = app.listen(0);

try {
  const address = server.address();
  assert(address && typeof address !== "string", "test server should listen");
  const port = typeof address === "string" ? 0 : address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const create = await requestJson(baseUrl, "/api/dealer/drafts/new", {
    method: "POST",
    body: JSON.stringify({
      title: "Clean Firestore Draft",
      brand: "Toyota",
      model: "Yaris",
      year: 2022,
      price: 420000,
      mileage: 18000,
      description: "created through dealer route using memory firestore",
    }),
  });
  assert(create.status === 200 && create.body.data?.id, "dealer route should create draft");
  const draftId = String(create.body.data.id);
  assert(
    db.collection(DEALER_DRAFTS_COLLECTION).getData(draftId)?.dealerId === "clean-dealer",
    "draft should be written to dealerDrafts with dealer scope"
  );
  console.log("PASS route creates dealer draft through repository");

  const missingImagePublish = await requestJson(
    baseUrl,
    `/api/dealer/drafts/${draftId}/publish`,
    { method: "POST" }
  );
  assert(
    missingImagePublish.status === 400 &&
      missingImagePublish.body.error === "missing_required_fields" &&
      missingImagePublish.body.missingFields.includes("image"),
    "publish guard should still block missing image"
  );
  console.log("PASS publish guard still blocks incomplete Firestore draft");

  const storageUrl =
    "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.appspot.com/o/draft-images%2Fclean-dealer%2F" +
    encodeURIComponent(draftId) +
    "%2F01-clean.webp?alt=media&token=test-token";
  const metadata = [
    {
      dealerId: "clean-dealer",
      draftId,
      fileName: "01-clean.webp",
      mimeType: "image/webp",
      width: 1200,
      height: 800,
      size: 12345,
      imagePath: `draft-images/clean-dealer/${draftId}/01-clean.webp`,
      imageUrl: storageUrl,
      thumbnailPath: `draft-images/clean-dealer/${draftId}/thumb-01-clean.webp`,
      thumbnailUrl: storageUrl.replace("01-clean.webp", "thumb-01-clean.webp"),
      createdAt: new Date().toISOString(),
      sortOrder: 0,
      source: "v5.3d-test",
    },
  ];
  const patched = await inventoryRepository.drafts.updateDraft("clean-dealer", draftId, {
    images: [storageUrl],
    sourceImageUrls: [storageUrl],
    imageMetadata: metadata,
  } as Partial<DealerDraftRecord>);
  assert(patched?.imageMetadata?.[0]?.imageUrl === storageUrl, "image metadata should attach");
  console.log("PASS storage image metadata attaches to Firestore draft");

  const publish = await requestJson(baseUrl, `/api/dealer/drafts/${draftId}/publish`, {
    method: "POST",
  });
  assert(publish.status === 200 && publish.body.data?.id, "publish should succeed");
  const carId = String(publish.body.data.id);
  assert(
    publish.body.data.images?.[0] === storageUrl,
    "publish should preserve Firebase Storage URL without local copy"
  );
  assert(
    publish.body.data.imageMetadata?.[0]?.imageUrl === storageUrl,
    "publish should preserve image metadata"
  );
  assert(
    !(await inventoryRepository.drafts.getById("clean-dealer", draftId)),
    "published draft should be removed from Firestore drafts"
  );
  console.log("PASS publish creates Firestore listing preserving Storage URL/metadata");

  const inventory = await requestJson(baseUrl, "/api/dealer/inventory");
  assert(
    inventory.status === 200 &&
      inventory.body.data.some((item: { id: string }) => item.id === carId),
    "published listing should appear in dealer inventory route"
  );
  const published = await inventoryRepository.listings.listPublished();
  assert(
    published.some((item) => item.id === carId && item.images[0] === storageUrl),
    "published listing should appear in marketplace repository read path"
  );
  console.log("PASS listing appears in dealer inventory and marketplace read path");

  const updated = await requestJson(baseUrl, `/api/dealer/inventory/${carId}`, {
    method: "PATCH",
    body: JSON.stringify({ price: 430000, title: "Updated Clean Listing" }),
  });
  assert(
    updated.status === 200 &&
      updated.body.data.price === 430000 &&
      updated.body.data.title === "Updated Clean Listing",
    "dealer inventory update should use repository"
  );
  console.log("PASS dealer inventory update uses repository");

  const otherDealer = await requestJson(baseUrl, `/api/dealer/inventory/${carId}`, {
    method: "PATCH",
    headers: { "X-Dealer-Id": "other-dealer" },
    body: JSON.stringify({ price: 1 }),
  });
  assert(otherDealer.status === 404, "cross-dealer update should be blocked");
  console.log("PASS dealer isolation remains enforced");
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
