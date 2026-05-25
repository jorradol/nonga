import fs from "fs";
import path from "path";
import {
  buildFirebaseImageStoragePath,
  DEALER_IMAGE_STORAGE_COLLECTIONS,
  FileImageStorageRepository,
  FirebaseStorageImageRepository,
  resolveImageStorageBackend,
} from "../src/server/repositories/imageStorageRepository.ts";
import { getListingImagesRoot } from "../src/server/listingImageStorage.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

class MemoryFile {
  metadata: {
    size?: string | number;
    contentType?: string;
    timeCreated?: string;
    metadata?: Record<string, string>;
  } = {};

  constructor(
    readonly name: string,
    private readonly bucket: MemoryBucket
  ) {}

  async save(
    buffer: Buffer,
    options: {
      contentType: string;
      resumable: false;
      metadata?: {
        cacheControl?: string;
        metadata?: Record<string, string>;
      };
    }
  ) {
    this.metadata = {
      size: buffer.length,
      contentType: options.contentType,
      timeCreated: new Date().toISOString(),
      metadata: options.metadata?.metadata ?? {},
    };
    this.bucket.saved.set(this.name, this);
  }

  async delete() {
    this.bucket.saved.delete(this.name);
    this.bucket.deleted.push(this.name);
  }
}

class MemoryBucket {
  name = "nonga-test.appspot.com";
  saved = new Map<string, MemoryFile>();
  deleted: string[] = [];

  file(name: string): MemoryFile {
    return this.saved.get(name) ?? new MemoryFile(name, this);
  }

  async getFiles(options: { prefix: string }): Promise<[MemoryFile[]]> {
    return [[...this.saved.values()].filter((file) => file.name.startsWith(options.prefix))];
  }
}

console.log("=== Nong A v5.0 Image Storage Repository Smoke ===");

assert(resolveImageStorageBackend({}) === "file", "default image backend should be file");
assert(
  resolveImageStorageBackend({ NONGA_IMAGE_BACKEND: "firebase-storage" }) ===
    "firebase-storage",
  "firebase-storage env should select Firebase Storage backend"
);
console.log("PASS backend flag defaults to file and accepts firebase-storage");

assert(
  DEALER_IMAGE_STORAGE_COLLECTIONS.listing === "listing-images" &&
    DEALER_IMAGE_STORAGE_COLLECTIONS.draft === "draft-images",
  "storage collection constants should match rules draft"
);
assert(
  buildFirebaseImageStoragePath("dealer-a", "car-1", "01-test.webp", "listing") ===
    "listing-images/dealer-a/car-1/01-test.webp",
  "listing storage path should include dealerId and listingId"
);
assert(
  buildFirebaseImageStoragePath("dealer-a", "draft-1", "01-test.webp", "draft") ===
    "draft-images/dealer-a/draft-1/01-test.webp",
  "draft storage path should include dealerId and draftId"
);
console.log("PASS Firebase Storage paths match rules draft");

const fileRepo = new FileImageStorageRepository();
const dealerId = "repo-image-dealer";
const listingId = `repo-image-${Date.now()}`;
let fileName = "";
try {
  const uploaded = await fileRepo.uploadListingImage(dealerId, listingId, {
    buffer: Buffer.from("fake-image-bytes"),
    mimeType: "image/webp",
    originalFileName: "dealer-upload.webp",
    seed: "dealer-upload.webp",
    width: 1200,
    height: 800,
    sortOrder: 2,
  });
  fileName = uploaded.metadata.fileName;
  assert(
    uploaded.storedUrl.startsWith(`/storage/listings/${listingId}/`),
    "file backend should keep legacy /storage/listings URL"
  );
  assert(uploaded.metadata.dealerId === dealerId, "file metadata should include dealerId");
  assert(uploaded.metadata.listingId === listingId, "file metadata should include listingId");
  assert(uploaded.metadata.mimeType === "image/webp", "file metadata should include mimeType");
  assert(uploaded.metadata.width === 1200, "file metadata should include width");
  assert(uploaded.metadata.height === 800, "file metadata should include height");

  const listed = await fileRepo.listListingImages(dealerId, listingId);
  assert(
    listed.some((item) => item.fileName === uploaded.metadata.fileName),
    "file backend should list uploaded image"
  );
  assert(
    !(await fileRepo.deleteListingImage("dealer-b", "dealer-b-listing", fileName)),
    "file backend should not delete a different listing path"
  );
  assert(
    await fileRepo.deleteListingImage(dealerId, listingId, fileName),
    "file backend should delete uploaded image"
  );
  console.log("PASS file backend upload/list/delete and metadata");
} finally {
  const dir = path.join(getListingImagesRoot(), listingId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

const memoryBucket = new MemoryBucket();
const firebaseRepo = new FirebaseStorageImageRepository(memoryBucket);
const pair = await firebaseRepo.uploadListingImagePair("dealer-a", "car-9", {
  mainBuffer: Buffer.from("optimized-main"),
  thumbBuffer: Buffer.from("optimized-thumb"),
  ext: ".webp",
  mimeType: "image/webp",
  width: 1600,
  height: 900,
  originalFileName: "original.jpg",
  seed: "original.jpg",
  sortOrder: 1,
  targetType: "listing",
});

assert(
  pair.metadata.storagePath.startsWith("listing-images/dealer-a/car-9/"),
  "firebase backend should scope path by dealerId"
);
assert(
  pair.thumbnailUrl?.includes("firebasestorage.googleapis.com"),
  "firebase backend should produce thumbnail download URL"
);
assert(pair.metadata.downloadUrl?.includes("token="), "firebase metadata should include token URL");
assert(pair.metadata.width === 1600 && pair.metadata.height === 900, "metadata should include size");
assert(
  [...memoryBucket.saved.keys()].some((key) => key.startsWith("listing-images/dealer-a/car-9/")),
  "firebase backend should save under dealer scoped path"
);

const beforeWrongDealerDelete = memoryBucket.saved.size;
await firebaseRepo.deleteListingImage("dealer-b", "car-9", pair.metadata.imageId);
assert(
  memoryBucket.saved.size === beforeWrongDealerDelete,
  "dealer B delete should not remove dealer A storage path"
);
await firebaseRepo.deleteListingImage("dealer-a", "car-9", pair.metadata.imageId);
assert(
  !memoryBucket.saved.has(pair.metadata.storagePath),
  "dealer A delete should remove dealer A storage path"
);
console.log("PASS firebase-storage dry-run scoped upload/delete and metadata");
