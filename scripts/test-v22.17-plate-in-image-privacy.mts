import assert from "node:assert/strict";
import {
  evaluateSellerProvidedImageConsent,
  SELLER_PROVIDED_IMAGE_CONSENT_NOTICE,
} from "../src/utils/vehicleImagePlatePrivacy.ts";
import { PILOT_POLICY_DOCUMENTS } from "../src/content/pilotPolicyContent.ts";
import { readFileSync } from "node:fs";

function ok(name: string): void {
  console.log("PASS", name);
}

function main() {
  // Keep v22.17 script green under the new consent policy (no blur gate).
  const none = evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages: false,
  });
  assert.equal(none.status, "not_applicable");
  assert.equal(none.blocksPublicFacingUse, false);
  ok("no images => plate-in-image not applicable");

  const needs = evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages: true,
    sellerConfirmedPublishRightsAndListingConsent: false,
  });
  assert.equal(needs.blocksPublicFacingUse, false);
  assert.equal(needs.sellerProvidedImagesAllowedEvenIfPlateVisible, true);
  assert.ok(needs.warnings.includes(SELLER_PROVIDED_IMAGE_CONSENT_NOTICE));
  ok("source images without blur attestation do not block public-facing use");

  const attested = evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages: true,
    sellerConfirmedPublishRightsAndListingConsent: true,
  });
  assert.equal(attested.status, "seller_consented_publish_rights");
  assert.equal(attested.blocksPublicFacingUse, false);
  ok("seller consent status recorded without blur requirement");

  const listingPolicy = JSON.stringify(PILOT_POLICY_DOCUMENTS.listing);
  assert.match(listingPolicy, /seller-provided image consent|ยินยอมให้แสดงรูป|ป้ายในรูป|เบลอ/i);
  assert.match(listingPolicy, /ข้อความ|VIN|เบอร์โทร/);
  ok("pilot listing policy documents plate-in-image warning");

  const guide = readFileSync("public/samples/dealer-import-guide.md", "utf8");
  assert.match(guide, /ป้ายทะเบียน|สิทธิ์เผยแพร่|ยินยอม/);
  assert.match(guide, /firebase-storage|Firebase Storage/);
  ok("dealer import guide warns plate-in-image and durable storage");

  console.log("\nPASS test:v22.17-plate-in-image-privacy");
}

main();
