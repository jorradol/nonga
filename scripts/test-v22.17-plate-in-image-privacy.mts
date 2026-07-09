import assert from "node:assert/strict";
import {
  evaluatePlateInImagePrivacyReadiness,
  PLATE_IN_IMAGE_PRIVACY_IMPORT_WARNING,
  PLATE_IN_IMAGE_PRIVACY_POLICY_ID,
} from "../src/utils/vehicleImagePlatePrivacy.ts";
import { PILOT_POLICY_DOCUMENTS } from "../src/content/pilotPolicyContent.ts";
import { readFileSync } from "node:fs";

function ok(name: string): void {
  console.log("PASS", name);
}

function main() {
  const none = evaluatePlateInImagePrivacyReadiness({
    hasSourceOrStoredImages: false,
  });
  assert.equal(none.status, "not_applicable");
  assert.equal(none.blocksPublicFacingUse, false);
  ok("no images => plate-in-image not applicable");

  const needs = evaluatePlateInImagePrivacyReadiness({
    hasSourceOrStoredImages: true,
    ownerAttestedPlateSafeImages: false,
  });
  assert.equal(needs.policyId, PLATE_IN_IMAGE_PRIVACY_POLICY_ID);
  assert.equal(needs.status, "needs_owner_plate_safe_images");
  assert.equal(needs.blocksPublicFacingUse, true);
  assert.equal(needs.textMaskingDoesNotCoverImagePlates, true);
  assert.ok(needs.warnings.includes(PLATE_IN_IMAGE_PRIVACY_IMPORT_WARNING));
  ok("source images without attestation block public-facing use");

  const attested = evaluatePlateInImagePrivacyReadiness({
    hasSourceOrStoredImages: true,
    ownerAttestedPlateSafeImages: true,
  });
  assert.equal(attested.status, "owner_attested_plate_safe");
  assert.equal(attested.blocksPublicFacingUse, false);
  ok("owner plate-safe attestation clears public-facing block");

  const listingPolicy = JSON.stringify(PILOT_POLICY_DOCUMENTS.listing);
  assert.match(listingPolicy, /plate-in-image|ป้ายในรูป|เบลอ\/ครอป/i);
  assert.match(listingPolicy, /ข้อความไม่ปิดป้ายในรูป|text masking/i);
  ok("pilot listing policy documents plate-in-image warning");

  const guide = readFileSync("public/samples/dealer-import-guide.md", "utf8");
  assert.match(guide, /ป้ายทะเบียนในรูป|plate-safe|เบลอ/);
  assert.match(guide, /firebase-storage|Firebase Storage/);
  ok("dealer import guide warns plate-in-image and durable storage");

  console.log("\nPASS test:v22.17-plate-in-image-privacy");
}

main();
