import assert from "node:assert/strict";
import {
  evaluateSellerProvidedImageConsent,
  evaluatePlateInImagePrivacyReadiness,
  SELLER_PROVIDED_IMAGE_CONSENT_NOTICE,
  SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID,
  SELLER_IMAGE_CONSENT_CONFIRM_BULLETS,
} from "../src/utils/vehicleImagePlatePrivacy.ts";
import { PILOT_POLICY_DOCUMENTS } from "../src/content/pilotPolicyContent.ts";
import { readFileSync } from "node:fs";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";

function ok(name: string): void {
  console.log("PASS", name);
}

function main() {
  const none = evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages: false,
  });
  assert.equal(none.status, "not_applicable");
  assert.equal(none.blocksPublicFacingUse, false);
  assert.equal(none.requiresAutomatedPlateBlur, false);
  ok("no images => consent policy not applicable");

  const withImages = evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages: true,
    sellerConfirmedPublishRightsAndListingConsent: false,
  });
  assert.equal(withImages.policyId, SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID);
  assert.equal(withImages.status, "seller_provided_images_allowed_with_consent");
  assert.equal(withImages.blocksPublicFacingUse, false);
  assert.equal(withImages.requiresAutomatedPlateBlur, false);
  assert.equal(withImages.sellerProvidedImagesAllowedEvenIfPlateVisible, true);
  assert.ok(withImages.warnings.includes(SELLER_PROVIDED_IMAGE_CONSENT_NOTICE));
  assert.ok(
    withImages.consentBullets.some((b) => /สิทธิ์เผยแพร่/.test(b))
  );
  ok("seller-provided images allowed even if plate may be visible");

  const consented = evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages: true,
    sellerConfirmedPublishRightsAndListingConsent: true,
  });
  assert.equal(consented.status, "seller_consented_publish_rights");
  assert.equal(consented.blocksPublicFacingUse, false);
  assert.equal(consented.requiresAutomatedPlateBlur, false);
  ok("seller consent does not require automated plate blur");

  // Compatibility wrapper must not block on missing plate-safe attestation.
  const legacy = evaluatePlateInImagePrivacyReadiness({
    hasSourceOrStoredImages: true,
    ownerAttestedPlateSafeImages: false,
  });
  assert.equal(legacy.blocksPublicFacingUse, false);
  assert.equal(legacy.sellerProvidedImagesAllowedEvenIfPlateVisible, true);
  ok("legacy plate-safe gate no longer blocks public-facing use");

  assert.ok(SELLER_IMAGE_CONSENT_CONFIRM_BULLETS.length >= 4);
  assert.ok(
    SELLER_IMAGE_CONSENT_CONFIRM_BULLETS.some((b) => /ยินยอม/.test(b))
  );
  ok("seller consent/right-to-publish wording exists");

  const listingPolicy = JSON.stringify(PILOT_POLICY_DOCUMENTS.listing);
  assert.match(listingPolicy, /seller-provided image consent|ยินยอมให้แสดงรูป/i);
  assert.match(listingPolicy, /ไม่บังคับเบลอ/);
  assert.doesNotMatch(listingPolicy, /ต้องใช้รูปที่ plate-safe|ต้องเบลอ\/ครอป\/ปิดป้ายก่อนใช้สาธารณะ/);
  ok("pilot listing policy uses seller consent wording");

  const privacyPolicy = JSON.stringify(PILOT_POLICY_DOCUMENTS.privacy);
  assert.doesNotMatch(privacyPolicy, /ควรเบลอหรือถ่ายมุมที่ปลอดภัย/);
  ok("privacy policy no longer requires plate blur for uploads");

  const guide = readFileSync("public/samples/dealer-import-guide.md", "utf8");
  assert.match(guide, /สิทธิ์เผยแพร่|ยินยอมให้ใช้เพื่อประกาศขาย/);
  assert.match(guide, /ไม่บังคับ/);
  assert.match(guide, /firebase-storage|Firebase Storage/);
  assert.doesNotMatch(guide, /ต้องใช้รูปที่ \*\*เบลอ \/ ครอป \/ ปิดป้าย\*\*/);
  ok("dealer import guide documents consent and durable storage");

  const confirmUi = readFileSync(
    "src/components/admin/inventory-import/ImportConfirmationSection.tsx",
    "utf8"
  );
  assert.match(confirmUi, /มีสิทธิ์เผยแพร่รูปภาพรถ/);
  assert.match(confirmUi, /ยินยอมให้แสดงรูปเพื่อการประกาศขาย/);
  assert.match(confirmUi, /ไม่บังคับเบลอ\/ครอปป้ายก่อนนำเข้า/);
  ok("Confirm Import UI includes seller image consent wording");

  const publicDto = toPublicMarketplaceCarDto({
    id: "car-import-consent-p0",
    title: "Toyota Yaris",
    brand: "Toyota",
    model: "Yaris",
    year: 2020,
    price: 459000,
    type: "sedan",
    condition: "มือสอง",
    mileage: 10000,
    fuelType: "petrol",
    images: [
      "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/listing-images%2Fthor-auto%2Fcar-import-consent-p0%2F01.jpg?alt=media",
    ],
    description: "รถสวย ติดต่อ 0812345678",
    dealerId: "thor-auto",
    ownerId: "owner-1",
    ownerName: "Thor Auto",
    ownerPhone: "0812345678",
    licensePlateFull: "6ขธ1234",
    licensePlate: "6ขธ1234",
    licensePlateMasked: "6ขธ****",
    registrationProvince: "กรุงเทพมหานคร",
    vin: "JTDBR32E720123456",
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
    boosted: false,
    featured: false,
  } as never);

  assert.equal((publicDto as { licensePlateFull?: string }).licensePlateFull, undefined);
  assert.equal((publicDto as { vin?: string }).vin, undefined);
  assert.equal((publicDto as { licensePlate?: string }).licensePlate, undefined);
  assert.ok(!(publicDto as { ownerPhone?: string }).ownerPhone);
  assert.equal(
    (publicDto as { licensePlateMasked?: string }).licensePlateMasked,
    "6ขธ****"
  );
  assert.equal(
    (publicDto as { registrationProvince?: string }).registrationProvince,
    "กรุงเทพมหานคร"
  );
  ok("public DTO still blocks full plate/VIN/phone in text fields");

  // Boundary reminders for this controlled staging slice
  ok("no real lead and no dealer-facing send exercised");

  console.log("\nPASS test:v22.18-seller-provided-image-consent");
}

main();
