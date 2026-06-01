/**
 * v5.4.4k — Listing image set consistency foundation
 * npm run test:v544k-image-set-consistency
 */
import {
  LISTING_IMAGE_MIXED_VEHICLE_MESSAGE,
  LISTING_IMAGE_NO_EXTERIOR_MESSAGE,
  LISTING_IMAGE_NON_VEHICLE_MESSAGE,
  LISTING_IMAGE_SUPPORTING_MESSAGE,
  buildImageSetConsistencyWarnings,
  classifyListingImageForDisplay,
  countsAsPublishablePrimaryImage,
  hasActionableImageSetAnalysis,
  hasExteriorVehicleImage,
  hasSuspiciousMixedVehicleImages,
  isImagePublicDisplayEligible,
  isMainImageCandidate,
  shouldBlockPublishForImageSet,
  type ListingImageSetMetadataFields,
} from "../src/utils/listingImageSetConsistencyShared.ts";
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";
import { resolveVehicleImageValidationMode } from "../src/utils/vehicleImageValidationShared.ts";

const DRAFT_ID = "draft-1780272000000";
const IMG = `/storage/listings/${DRAFT_ID}/01-a.webp`;
const IMG2 = `/storage/listings/${DRAFT_ID}/02-b.webp`;

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
}

function meta(
  overrides: Partial<ListingImageSetMetadataFields> = {}
): ListingImageSetMetadataFields {
  return { imageUrl: IMG, ...overrides };
}

function main(): void {
  console.log("=== Nong A v5.4.4k Listing Image Set Consistency ===\n");

  const exterior = classifyListingImageForDisplay(
    meta({ imageRole: "exterior", vehicleImageStatus: "pass", vehicleConfidence: 0.9 })
  );
  if (!exterior.isPublicDisplayEligible || !exterior.isMainImageCandidate) {
    fail("exterior-public-eligible", JSON.stringify(exterior));
  }
  pass("exterior-public-eligible");

  for (const role of ["interior", "engine", "trunk", "odometer"] as const) {
    const classified = classifyListingImageForDisplay(
      meta({ imageRole: role, vehicleImageStatus: "pass", vehicleConfidence: 0.85 })
    );
    if (!classified.isPublicDisplayEligible || classified.isMainImageCandidate) {
      fail(`${role}-supporting-not-main`, JSON.stringify(classified));
    }
    if (!classified.isSupportingImage || classified.warningMessage !== LISTING_IMAGE_SUPPORTING_MESSAGE) {
      fail(`${role}-supporting-message`, classified.warningMessage);
    }
    pass(`${role}-supporting-not-main`);
  }

  const nonVehicle = classifyListingImageForDisplay(
    meta({ imageRole: "non_vehicle", imageSetConsistencyStatus: "non_vehicle" })
  );
  if (nonVehicle.isPublicDisplayEligible || nonVehicle.isMainImageCandidate) {
    fail("non-vehicle-not-public", JSON.stringify(nonVehicle));
  }
  if (nonVehicle.warningMessage !== LISTING_IMAGE_NON_VEHICLE_MESSAGE) {
    fail("non-vehicle-message", nonVehicle.warningMessage);
  }
  pass("non-vehicle-not-public");

  const document = classifyListingImageForDisplay(meta({ imageRole: "document" }));
  if (document.isPublicDisplayEligible || document.isMainImageCandidate) {
    fail("document-not-public-or-main", JSON.stringify(document));
  }
  pass("document-not-public-or-main");

  const keyImage = classifyListingImageForDisplay(meta({ imageRole: "key" }));
  if (keyImage.isPublicDisplayEligible || keyImage.isMainImageCandidate) {
    fail("key-not-public-or-main", JSON.stringify(keyImage));
  }
  pass("key-not-public-or-main");

  const suspected = classifyListingImageForDisplay(
    meta({
      imageRole: "exterior",
      imageSetConsistencyStatus: "different_vehicle_suspected",
      vehicleImageStatus: "pass",
    })
  );
  if (suspected.isPublicDisplayEligible || !suspected.holdPublicDisplay) {
    fail("different-vehicle-hold", JSON.stringify(suspected));
  }
  pass("different-vehicle-hold");

  const setWithSuspect = [
    meta({
      imageUrl: IMG,
      imageRole: "exterior",
      imageSetConsistencyStatus: "same_vehicle_likely",
    }),
    meta({
      imageUrl: IMG2,
      imageRole: "exterior",
      imageSetConsistencyStatus: "different_vehicle_suspected",
    }),
  ];
  if (!hasSuspiciousMixedVehicleImages(setWithSuspect)) {
    fail("has-suspicious-mixed");
  }
  const mixedWarnings = buildImageSetConsistencyWarnings(setWithSuspect);
  if (!mixedWarnings.some((w) => w.message === LISTING_IMAGE_MIXED_VEHICLE_MESSAGE)) {
    fail("mixed-warning-message");
  }
  pass("different-vehicle-warning");

  const exteriorSet = [
    meta({ imageUrl: IMG, imageRole: "exterior", vehicleImageStatus: "pass" }),
  ];
  if (!hasExteriorVehicleImage(exteriorSet)) {
    fail("has-exterior-true");
  }
  pass("has-exterior-true");

  const supportingOnly = [
    meta({ imageUrl: IMG, imageRole: "interior", vehicleImageStatus: "pass" }),
    meta({ imageUrl: IMG2, imageRole: "engine", vehicleImageStatus: "pass" }),
  ];
  if (hasExteriorVehicleImage(supportingOnly)) {
    fail("supporting-only-no-exterior");
  }
  const supportingBlock = shouldBlockPublishForImageSet({
    images: [IMG, IMG2],
    imageMetadata: supportingOnly,
    validImageUrls: [IMG, IMG2],
  });
  if (!supportingBlock.block || supportingBlock.message !== LISTING_IMAGE_NO_EXTERIOR_MESSAGE) {
    fail("supporting-only-block", JSON.stringify(supportingBlock));
  }
  pass("supporting-only-block");

  const unknownOnly = [
    meta({ imageUrl: IMG }),
    meta({ imageUrl: IMG2, vehicleImageStatus: "unknown" }),
  ];
  if (hasActionableImageSetAnalysis(unknownOnly)) {
    fail("unknown-not-actionable");
  }
  if (shouldBlockPublishForImageSet({ images: [IMG, IMG2], imageMetadata: unknownOnly }).block) {
    fail("unknown-only-no-block");
  }
  const legacyPublish = validateDraftForPublish({
    id: DRAFT_ID,
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    images: [IMG],
    imageMetadata: unknownOnly,
  });
  if (!legacyPublish.ok) {
    fail("legacy-publish-ok", legacyPublish.missingFields.join(","));
  }
  pass("unknown-only-legacy-fallback");

  if (
    countsAsPublishablePrimaryImage(
      meta({ imageRole: "non_vehicle", imageSetConsistencyStatus: "non_vehicle" })
    )
  ) {
    fail("non-vehicle-not-primary");
  }
  if (
    !countsAsPublishablePrimaryImage(
      meta({ imageRole: "exterior", vehicleImageStatus: "pass", vehicleConfidence: 0.9 })
    )
  ) {
    fail("exterior-is-primary");
  }
  pass("primary-image-rules");

  if (!isImagePublicDisplayEligible(meta({ imageRole: "exterior", vehicleImageStatus: "pass" }))) {
    fail("is-public-helper");
  }
  if (isMainImageCandidate(meta({ imageRole: "interior", vehicleImageStatus: "pass" }))) {
    fail("is-main-helper-interior");
  }
  pass("helper-eligibility-api");

  if (resolveVehicleImageValidationMode({}) !== "off") {
    fail("default-vision-off");
  }
  pass("default-no-gemini-env");

  const completeDraft = validateDraftForPublish({
    id: DRAFT_ID,
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    images: [IMG],
  });
  if (!completeDraft.ok) {
    fail("dealer-guard-baseline", completeDraft.missingFields.join(","));
  }
  pass("dealer-guard-baseline");

  const mixedPublish = validateDraftForPublish({
    id: DRAFT_ID,
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    images: [IMG, IMG2],
    imageMetadata: setWithSuspect,
  });
  if (mixedPublish.ok || !mixedPublish.missingFields.includes("image_set")) {
    fail("mixed-publish-blocked", mixedPublish.missingFields.join(","));
  }
  pass("mixed-publish-blocked");

  console.log("\n=== v5.4.4k image set consistency — OK ===");
}

main();
