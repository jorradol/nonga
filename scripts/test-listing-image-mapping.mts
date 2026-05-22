/**
 * ตรวจ image mapping — ไม่ cross-car path, ไม่ placeholder แบบ index
 * npm run test:listing-images
 */
import assert from "node:assert/strict";
import {
  sanitizeListingImagesForId,
  getListingPrimaryImage,
  LISTING_PLACEHOLDER_IMAGE,
} from "../src/utils/listingImages.ts";

const CAR_A = "car-import-100-p0";
const CAR_B = "car-import-200-p0";

// cross-car local path ต้องถูกตัดออก
const mixed = sanitizeListingImagesForId(
  [
    `/storage/listings/${CAR_B}/01-abc.jpg`,
    `/storage/listings/${CAR_A}/02-def.jpg`,
    "https://example.com/ok.jpg",
  ],
  CAR_A
);
assert.equal(mixed.length, 2);
assert.ok(mixed[0].includes(CAR_A), "preserves array order for valid urls");
assert.ok(mixed[1].includes("example.com"));
assert.ok(!mixed.some((u) => u.includes(CAR_B)));

// invalid slot ไม่กลายเป็น placeholder คนละแบบตาม index
const invalidOnly = sanitizeListingImagesForId(
  ["blob:fake", "data:image/png;base64,xx", ""],
  CAR_A
);
assert.deepEqual(invalidOnly, [LISTING_PLACEHOLDER_IMAGE]);

// primary เสมอจากชุดของรถคันนั้น
const primary = getListingPrimaryImage(
  [`/storage/listings/${CAR_A}/01-x.jpg`],
  CAR_A
);
assert.ok(primary.includes(CAR_A));

console.log("test:listing-images — OK");
