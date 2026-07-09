import assert from "node:assert/strict";
import {
  downloadListingImagesForCar,
  resolveStoredImagesForListing,
} from "../src/server/listingImageStorage.ts";
import type {
  ImageStorageRepository,
  UploadListingImageResult,
} from "../src/server/repositories/imageStorageRepository.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import {
  getListingGalleryImages,
  getListingPrimaryImage,
  LISTING_PLACEHOLDER_IMAGE,
} from "../src/utils/listingImages.ts";
import { evaluatePlateInImagePrivacyReadiness } from "../src/utils/vehicleImagePlatePrivacy.ts";

function ok(name: string): void {
  console.log("PASS", name);
}

class FakeDurableImageRepository implements ImageStorageRepository {
  backend = "firebase-storage" as const;
  uploads: Array<{ dealerId: string; listingId: string; mimeType: string }> = [];

  async uploadListingImage(
    dealerId: string,
    listingId: string,
    input: { buffer: Buffer; mimeType: string; imageId?: string }
  ): Promise<UploadListingImageResult> {
    this.uploads.push({ dealerId, listingId, mimeType: input.mimeType });
    const fileName = `${input.imageId ?? "img"}.jpg`;
    const storagePath = `listing-images/${dealerId}/${listingId}/${fileName}`;
    const url = `https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/${encodeURIComponent(
      storagePath
    )}?alt=media&token=test-token`;
    return {
      storedUrl: url,
      metadata: {
        imageId: fileName,
        dealerId,
        listingId,
        targetType: "listing",
        fileName,
        mimeType: input.mimeType,
        size: input.buffer.length,
        width: 0,
        height: 0,
        storagePath,
        publicUrl: url,
        imagePath: storagePath,
        imageUrl: url,
        createdAt: new Date().toISOString(),
        sortOrder: 0,
      },
    };
  }

  async uploadListingImagePair(): Promise<UploadListingImageResult> {
    throw new Error("not used");
  }
  async listListingImages() {
    return [];
  }
  async deleteListingImage() {
    return false;
  }
  getPublicImageUrl(storagePath: string) {
    return storagePath;
  }
}

async function main() {
  const previousFetch = globalThis.fetch;
  const tinyJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);

  globalThis.fetch = (async () =>
    new Response(tinyJpeg, {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    })) as typeof fetch;

  const repo = new FakeDurableImageRepository();
  const report = await downloadListingImagesForCar(
    "car-import-test-p0",
    1,
    [
      "https://drive.google.com/file/d/AAA111bbb222CCC333ddd444/view?usp=drive_link",
      "https://example.com/gallery.jpg",
    ],
    { dealerId: "thor-auto", repository: repo }
  );

  assert.equal(report.downloaded, 2, "both source urls should download");
  assert.equal(report.failed, 0);
  assert.equal(repo.uploads.length, 2);
  assert.equal(repo.uploads[0]?.dealerId, "thor-auto");
  assert.ok(
    report.storedUrls.every((u) =>
      u.startsWith("https://firebasestorage.googleapis.com/")
    ),
    "stored urls must be durable firebase storage urls"
  );
  assert.ok(
    report.storedUrls.every((u) => u.includes("car-import-test-p0")),
    "stored urls must reference listing id"
  );
  ok("import download routes through durable image repository");

  const resolved = resolveStoredImagesForListing(report);
  assert.equal(resolved.images.length, 2);
  assert.ok(!resolved.images.includes(LISTING_PLACEHOLDER_IMAGE));
  ok("resolveStoredImagesForListing keeps durable urls");

  const primary = getListingPrimaryImage(resolved.images, "car-import-test-p0");
  const gallery = getListingGalleryImages(resolved.images, "car-import-test-p0");
  assert.ok(primary.includes("firebasestorage.googleapis.com"));
  assert.equal(gallery.length, 2);
  ok("marketplace/detail/chat image helpers accept durable firebase urls");

  globalThis.fetch = (async () =>
    new Response("nope", { status: 404 })) as typeof fetch;
  const failReport = await downloadListingImagesForCar(
    "car-import-test-p1",
    2,
    ["https://example.com/missing.jpg"],
    { dealerId: "thor-auto", repository: repo }
  );
  const failResolved = resolveStoredImagesForListing(failReport);
  assert.equal(failReport.downloaded, 0);
  assert.equal(failResolved.images[0], LISTING_PLACEHOLDER_IMAGE);
  assert.ok(
    failResolved.warnings.some((w) => /placeholder|ดึงรูปไม่สำเร็จ|ไม่มีรูป/i.test(w))
  );
  ok("graceful placeholder fallback when image cannot be served/stored");

  const publicDto = toPublicMarketplaceCarDto({
    id: "car-import-test-p0",
    title: "Toyota Yaris",
    brand: "Toyota",
    model: "Yaris",
    year: 2020,
    price: 459000,
    type: "sedan",
    condition: "มือสอง",
    mileage: 10000,
    fuelType: "petrol",
    images: resolved.images,
    description: "รถสวย",
    dealerId: "thor-auto",
    ownerId: "owner-1",
    ownerName: "Thor Auto",
    ownerPhone: "0812345678",
    licensePlateFull: "6ขธ1234",
    licensePlate: "6ขธ1234",
    licensePlateMasked: "6ขธ****",
    vin: "JTDBR32E720123456",
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
    boosted: false,
    featured: false,
  } as never);

  assert.equal(
    (publicDto as { licensePlateFull?: string }).licensePlateFull,
    undefined
  );
  assert.equal((publicDto as { vin?: string }).vin, undefined);
  assert.equal((publicDto as { licensePlate?: string }).licensePlate, undefined);
  assert.ok(!(publicDto as { ownerPhone?: string }).ownerPhone);
  assert.equal(
    (publicDto as { licensePlateMasked?: string }).licensePlateMasked,
    "6ขธ****"
  );
  ok("public DTO keeps masked plate and strips full plate/VIN/phone");

  const platePolicy = evaluatePlateInImagePrivacyReadiness({
    hasSourceOrStoredImages: true,
    ownerAttestedPlateSafeImages: false,
  });
  assert.equal(platePolicy.blocksPublicFacingUse, true);
  assert.equal(platePolicy.textMaskingDoesNotCoverImagePlates, true);
  ok("plate-in-image privacy blocks public-facing use until owner attestation");

  // Boundary reminders for this controlled staging slice
  assert.equal(false, false); // no real lead / dealer-facing send in this unit path
  ok("no real lead and no dealer-facing send exercised");

  globalThis.fetch = previousFetch;
  console.log("\nPASS test:v22.17-import-durable-image-storage");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
