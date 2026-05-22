/**
 * npm run test:marketplace-image-priority
 */
import assert from "node:assert/strict";
import {
  getListingPrimaryImage,
  sanitizeListingImagesForId,
  LISTING_PLACEHOLDER_IMAGE,
  LEGACY_STOCK_IMAGE_URLS,
} from "../src/utils/listingImages.ts";

const CAR_A = "car-A-priority";
const CAR_B = "car-B-priority";
const LEGACY = [...LEGACY_STOCK_IMAGE_URLS][0];
const NEW_A = `/storage/listings/${CAR_A}/new.jpg`;
const OLD_B = `/storage/listings/${CAR_B}/old.jpg`;

// A: legacy อยู่ [0] แต่มีรูป upload จริง → ต้องใช้ upload
const primaryA = getListingPrimaryImage([LEGACY, NEW_A], CAR_A);
assert.ok(primaryA === NEW_A, "skip legacy, use uploaded storage");

// B: ต้องใช้รูป B เท่านั้น ไม่ใช้รูป A
const primaryB = getListingPrimaryImage([OLD_B, NEW_A], CAR_B);
assert.ok(primaryB === OLD_B);

// คงลำดับ — ไม่สลับ local มาก่อน remote ถ้า remote valid อยู่ [0]
const userHttps = "https://example.com/user-car-photo.jpg";
const ordered = getListingPrimaryImage([userHttps, NEW_A], CAR_A);
assert.ok(ordered === userHttps);

// ว่าง → placeholder เดียว
assert.equal(
  getListingPrimaryImage([], CAR_A),
  LISTING_PLACEHOLDER_IMAGE
);

// sanitize ไม่มี blob/data
const clean = sanitizeListingImagesForId(
  ["blob:x", NEW_A, "data:image/png;base64,xx"],
  CAR_A
);
assert.deepEqual(clean, [NEW_A]);

console.log("test:marketplace-image-priority — OK");
