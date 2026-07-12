/**
 * Dealer paste import — ThorAuto tab-separated row parser
 * npm run test:dealer-paste-import
 */
import express from "express";
import {
  parseThorAutoPasteRow,
  splitPasteRawLine,
} from "../src/utils/inventoryImport/pasteRawVehicleParser.ts";
import { pasteParsedToDraftPayload } from "../src/utils/inventoryImport/pasteToImportPayload.ts";
import {
  createEditablePasteDraft,
  editablePasteDraftToPayload,
} from "../src/utils/inventoryImport/editablePasteDraft.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";
import {
  DEALER_DRAFTS_COLLECTION,
  FirestoreInventoryRepository,
  type FirestoreDbLike,
} from "../src/server/repositories/inventoryRepository.ts";
import { registerDealerPortalRoutes } from "../src/server/dealerPortalRoutes.ts";
import {
  mapDraftImageMetadataInput,
  mapStoredListingImageToDealerDraftMetadata,
  resolveDraftImageOriginalFileName,
} from "../src/server/dealerDraftImageMetadata.ts";
import {
  documentContainsUndefined,
  sanitizeFirestoreDocument,
} from "../src/server/firestoreDocumentSanitize.ts";
import { persistPasteUploadedImages } from "../src/server/pasteUploadedImageStorage.ts";
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const OWNER = {
  dealerId: THOR_AUTO_DEALER_ID,
  ownerId: "owner-thor-auto",
  ownerName: "Thor Auto Test",
  ownerPhone: "0815553335",
  showroomName: "Thor Auto",
};

const SAMPLE_ROW = [
  "Honda",
  "CRV",
  "8กผ2813",
  "2.4ES 4WD",
  "บ.หนังไฟฟ้าคู่หน้า + ไฟ.ลกข + ไฟหน้าLED",
  "AT",
  "2019",
  "ดำ",
  "161,392",
  "699",
  "840,000",
  "AAA",
  "18/06/2024",
  "ปกติ",
  "1",
  "TRUE",
  "TRUE",
  "11,703 / 84",
  "https://drive.google.com/drive/folders/abc123",
  "https://www.thorautocar.com/product/honda-crv-2019",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.tiktok.com/@thorautocar/video/123",
].join("\t");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
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
    const undefinedPath = documentContainsUndefined(data);
    if (undefinedPath) {
      throw new Error(
        `Cannot use "undefined" as a Firestore value (found in field "${undefinedPath}").`
      );
    }
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

function apiHeaders(dealerId = THOR_AUTO_DEALER_ID, role = "dealer") {
  return {
    "Content-Type": "application/json",
    "X-Dealer-Id": dealerId,
    "X-User-Role": role,
  };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function main() {
  console.log("=== Dealer Paste Import (ThorAuto parser) ===\n");

  const cols = splitPasteRawLine(SAMPLE_ROW);
  ok("1-tab-columns", cols.length >= 18, `cols=${cols.length}`);

  const parsed = parseThorAutoPasteRow(SAMPLE_ROW);
  ok("2-brand", parsed.brand === "Honda", parsed.brand);
  ok("3-model", parsed.model === "CRV", parsed.model);
  ok("4-plate", parsed.plateNumber === "8กผ2813", parsed.plateNumber);
  ok("5-year", parsed.year === 2019, String(parsed.year));
  ok("6-mileage", parsed.mileage === 161392, String(parsed.mileage));
  ok("7-price", parsed.price === 699000, String(parsed.price));
  ok("8-price-confidence", parsed.priceConfidence === "medium", parsed.priceConfidence);
  ok("9-reference", parsed.referencePrice === 840000, String(parsed.referencePrice));
  ok("10-gear", parsed.transmissionNormalized === "อัตโนมัติ", parsed.transmissionNormalized);
  ok("11-color", parsed.colorNormalized === "ดำ", parsed.colorNormalized);
  ok(
    "12-website-url",
    !!parsed.links.websiteUrl?.includes("thorautocar.com"),
    parsed.links.websiteUrl ?? ""
  );
  ok(
    "13-youtube",
    !!parsed.links.youtubeUrl?.includes("youtube.com"),
    parsed.links.youtubeUrl ?? ""
  );
  ok(
    "14-tiktok",
    !!parsed.links.tiktokUrl?.includes("tiktok.com"),
    parsed.links.tiktokUrl ?? ""
  );
  ok("15-drive", parsed.links.driveLinks.length >= 1, String(parsed.links.driveLinks.length));
  ok(
    "16-drive-warning",
    parsed.warnings.some((w) => w.includes("Google Drive")),
    "drive warning"
  );
  ok(
    "17-image-warnings",
    parsed.warnings.some(
      (w) => w.includes("Google Drive") || w.includes("ไม่พบ URL รูป")
    ),
    "drive or no-image warning"
  );
  ok(
    "18-suggested-draft",
    parsed.suggestedDisposition === "draft",
    parsed.suggestedDisposition
  );

  const draft = pasteParsedToDraftPayload(parsed, OWNER);
  ok("19-draft-payload", draft != null, "");
  ok(
    "20-dealer-id",
    draft?.ownerId === OWNER.ownerId,
    `owner=${draft?.ownerId}`
  );
  ok(
    "21-draft-disposition",
    draft?.disposition === "draft",
    String(draft?.disposition)
  );
  ok(
    "22-draft-price",
    draft?.price === 699000,
    String(draft?.price)
  );

  const ambiguousRow = SAMPLE_ROW.split("\t");
  ambiguousRow[9] = "389";
  const parsed389 = parseThorAutoPasteRow(ambiguousRow.join("\t"));
  ok(
    "23-ambiguous-price-warning",
    parsed389.warnings.some((w) => w.includes("ไม่ชัดเจน") || w.includes("389")),
    "price ambiguity"
  );

  const editable389 = createEditablePasteDraft(parsed389);
  editable389.price = "389000";
  editable389.mileage = "88000";
  editable389.description = "รายละเอียดทดสอบแก้ไขจากฟอร์ม";
  const edited = editablePasteDraftToPayload(editable389, OWNER, parsed389);
  ok("24-edited-price", edited.payload?.price === 389000, String(edited.payload?.price));
  ok("25-edited-mileage", edited.payload?.mileage === 88000, String(edited.payload?.mileage));
  ok(
    "26-edited-description",
    (edited.payload?.description ?? "").includes("รายละเอียดทดสอบแก้ไข"),
    edited.payload?.description?.slice(0, 40)
  );
  ok(
    "27-drive-warning-preserved",
    edited.validation.warnings.some((w) => w.includes("Google Drive")),
    "drive"
  );
  ok(
    "28-draft-only-disposition",
    edited.payload?.disposition === "draft",
    String(edited.payload?.disposition)
  );

  const shiftedColumns = SAMPLE_ROW.split("\t");
  shiftedColumns.splice(8, 0, "");
  const parsedShifted = parseThorAutoPasteRow(shiftedColumns.join("\t"));
  ok(
    "28a-shifted-mileage-recovered",
    parsedShifted.mileage === 161392,
    String(parsedShifted.mileage)
  );
  ok(
    "28aa-shifted-price-recovered",
    parsedShifted.price === 699000,
    String(parsedShifted.price)
  );
  ok(
    "28ab-shifted-remap-warning",
    parsedShifted.warnings.some((w) => w.includes("ราคา/เลขไมล์เหลื่อม")),
    parsedShifted.warnings.join(" | ")
  );

  const noMileageRow = SAMPLE_ROW.split("\t");
  noMileageRow[8] = "";
  noMileageRow[9] = "399000";
  noMileageRow[10] = "420000";
  const parsedNoMileage = parseThorAutoPasteRow(noMileageRow.join("\t"));
  ok(
    "28ac-no-mileage-stays-null",
    parsedNoMileage.mileage == null,
    String(parsedNoMileage.mileage)
  );
  ok(
    "28ad-no-mileage-price-stays-price",
    parsedNoMileage.price === 399000,
    String(parsedNoMileage.price)
  );

  const firebaseListedImage = {
    imageId: "01-abc.webp",
    dealerId: THOR_AUTO_DEALER_ID,
    listingId: "draft-import-test-d0",
    targetType: "draft" as const,
    fileName: "01-abc.webp",
    mimeType: "image/webp",
    size: 1200,
    width: 100,
    height: 80,
    storagePath: "draft-images/thor-auto/draft-import-test-d0/01-abc.webp",
    publicUrl: "https://example.com/01-abc.webp",
    imagePath: "draft-images/thor-auto/draft-import-test-d0/01-abc.webp",
    imageUrl: "https://example.com/01-abc.webp",
    createdAt: new Date().toISOString(),
    sortOrder: 0,
  };
  const mappedFromListing = mapStoredListingImageToDealerDraftMetadata(
    firebaseListedImage,
    "draft-import-test-d0",
    0,
    { source: "paste-import" }
  );
  ok(
    "28b-metadata-fallback-original-name",
    mappedFromListing.originalFileName === "01-abc.webp",
    mappedFromListing.originalFileName ?? "(missing)"
  );
  ok(
    "28c-metadata-no-undefined",
    documentContainsUndefined(mappedFromListing) === null,
    documentContainsUndefined(mappedFromListing) ?? ""
  );
  const dirty = {
    imageMetadata: [{ fileName: "01.webp", originalFileName: undefined }],
  };
  const cleaned = sanitizeFirestoreDocument(dirty);
  ok(
    "28d-sanitize-strips-undefined",
    documentContainsUndefined(cleaned) === null &&
      !("originalFileName" in (cleaned.imageMetadata as object[])[0]),
    JSON.stringify(cleaned)
  );
  ok(
    "28e-resolve-original-fallback",
    resolveDraftImageOriginalFileName({
      dealerId: THOR_AUTO_DEALER_ID,
      draftId: "d1",
      fileName: "01.webp",
    }) === "01.webp",
    ""
  );
  const explicitUndefined = mapDraftImageMetadataInput(
    {
      dealerId: THOR_AUTO_DEALER_ID,
      draftId: "draft-import-test-d0",
      fileName: "01-abc.webp",
      originalFileName: undefined,
      mimeType: "image/webp",
      imageUrl: "https://example.com/01-abc.webp",
      source: "paste-import",
    },
    0
  );
  ok(
    "28f-explicit-undefined-uses-fileName",
    explicitUndefined.originalFileName === "01-abc.webp",
    explicitUndefined.originalFileName ?? "(missing)"
  );

  if (edited.payload) {
    const db = new MemoryFirestore();
    const inventoryRepository = new FirestoreInventoryRepository(db);
    const app = express();
    app.use(express.json({ limit: "2mb" }));
    registerDealerPortalRoutes(app, { inventoryRepository });
    const server = app.listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("test server should listen on a port");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const draftId = `draft-import-${Date.now()}-d0`;
      const upload = await persistPasteUploadedImages(THOR_AUTO_DEALER_ID, draftId, [
        {
          mimeType: "image/png",
          dataBase64: TINY_PNG_B64,
          name: "paste-photo.png",
        },
      ]);
      ok(
        "28g-upload-before-save-draft",
        upload.ok === true && upload.storedUrls.length === 1,
        upload.ok === false ? upload.message : String(upload.storedUrls.length)
      );
      const storedImage =
        upload.ok === true
          ? upload.storedUrls[0]
          : `https://firebasestorage.googleapis.com/v0/b/test/o/draft-images%2F${THOR_AUTO_DEALER_ID}%2F${draftId}%2F01.webp?alt=media`;
      const draftPayload = {
        ...edited.payload,
        commitDraftId: draftId,
        images: [storedImage],
        sourceImageUrls: [],
      };

      const guest = await requestJson(baseUrl, "/api/dealer/paste-import/save-draft", {
        method: "POST",
        body: JSON.stringify({ draft: draftPayload }),
      });
      ok("29-guest-save-blocked", guest.status === 403, String(guest.status));

      const member = await requestJson(baseUrl, "/api/dealer/paste-import/save-draft", {
        method: "POST",
        headers: apiHeaders(THOR_AUTO_DEALER_ID, "member"),
        body: JSON.stringify({ draft: draftPayload }),
      });
      ok("30-member-save-blocked", member.status === 403, String(member.status));

      const saved = await requestJson(baseUrl, "/api/dealer/paste-import/save-draft", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ draft: draftPayload }),
      });
      ok(
        "31-save-draft-api",
        saved.status === 200 && saved.body.success === true,
        JSON.stringify(saved.body).slice(0, 160)
      );
      ok("32-save-draft-id", saved.body.drafts?.[0]?.id === draftId, saved.body.drafts?.[0]?.id);

      const storedSnap = await db.collection(DEALER_DRAFTS_COLLECTION).doc(draftId).get();
      ok("33-created-in-dealerDrafts", storedSnap.exists, draftId);
      const storedData = storedSnap.data() as {
        imageMetadata?: Array<Record<string, unknown>>;
        missingFields?: string[];
      } | undefined;
      ok(
        "33b-stored-doc-no-undefined",
        documentContainsUndefined(storedData) === null,
        documentContainsUndefined(storedData) ?? ""
      );
      ok(
        "33c-stored-has-image-metadata",
        (storedData?.imageMetadata?.length ?? 0) >= 1,
        String(storedData?.imageMetadata?.length ?? 0)
      );
      if (storedData?.imageMetadata?.length) {
        ok(
          "33d-stored-metadata-original-name",
          typeof storedData.imageMetadata[0]?.originalFileName === "string",
          JSON.stringify(storedData.imageMetadata[0])
        );
      }

      const list = await requestJson(baseUrl, "/api/dealer/drafts", {
        headers: apiHeaders(),
      });
      const drafts = (list.body.data ?? []) as Array<{
        id: string;
        dealerId: string;
        images: string[];
        missingFields: string[];
        brand: string;
        model: string;
        year: number;
        price: number;
        mileage: number;
      }>;
      const created = drafts.find((item) => item.id === draftId);
      ok("34-draft-list-sees-new", Boolean(created), `count=${drafts.length}`);
      ok("35-draft-dealer-scope", created?.dealerId === THOR_AUTO_DEALER_ID, created?.dealerId);
      ok("36-draft-image-attached", created?.images?.[0] === storedImage, created?.images?.[0]);
      const publishCheck = created
        ? validateDraftForPublish({
            id: created.id,
            brand: created.brand,
            model: created.model,
            year: created.year,
            price: created.price,
            mileage: created.mileage,
            images: created.images,
          })
        : null;
      ok(
        "37-image-not-missing",
        Boolean(publishCheck && !publishCheck.missingFields.includes("image")),
        publishCheck?.missingFields.join(",") ?? "no draft"
      );

      const otherList = await requestJson(baseUrl, "/api/dealer/drafts", {
        headers: apiHeaders("other-dealer"),
      });
      const otherDrafts = (otherList.body.data ?? []) as Array<{ id: string }>;
      ok(
        "38-other-dealer-isolated",
        !otherDrafts.some((item) => item.id === draftId),
        `otherCount=${otherDrafts.length}`
      );
    } finally {
      server.close();
    }
  }

  const BASE = process.env.APP_URL ?? "http://localhost:3000";
  const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
  const allowImportWrite = process.env.NONGA_ALLOW_IMPORT_WRITE_SMOKE === "true";

  if (!allowImportWrite) {
    console.log(
      "\nSkip API draft commit — set NONGA_ALLOW_IMPORT_WRITE_SMOKE=true only for file-backend write smoke"
    );
    process.exit(process.exitCode === 1 ? 1 : 0);
  }

  try {
    const ping = await fetch(BASE);
    ok("29-server", ping.ok, String(ping.status));
  } catch (e) {
    ok("29-server", false, String(e));
    console.log("\nSkip API draft commit — server not running");
    process.exit(process.exitCode === 1 ? 1 : 0);
  }

  const apiDraft = edited.payload ?? draft;
  if (apiDraft) {
    const res = await fetch(`${BASE}/api/dealer/import/commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "X-Dealer-Id": THOR_AUTO_DEALER_ID,
        "X-User-Role": "dealer",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        published: [],
        drafts: [apiDraft],
        owner: OWNER,
      }),
    });
    const body = await res.json();
    ok("30-api-draft-commit", res.ok && body.success === true, JSON.stringify(body).slice(0, 120));
    ok(
      "31-draft-count",
      (body.draftCount ?? 0) >= 1,
      `draftCount=${body.draftCount}`
    );
    ok(
      "32-api-published-zero",
      (body.publishedCount ?? 0) === 0,
      `published=${body.publishedCount}`
    );
  }

  console.log("\nDone.");
  process.exit(process.exitCode === 1 ? 1 : 0);
}

main();
