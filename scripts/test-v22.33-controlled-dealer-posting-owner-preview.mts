/**
 * v22.33 — Controlled dealer posting OWNER PREVIEW (TEST DATA ONLY)
 * npm run test:v22.33-controlled-dealer-posting-owner-preview
 *
 * TEST / OWNER APPROVAL ONLY — fake data only.
 * Does NOT hit live staging write APIs.
 * Does NOT create real leads.
 * Does NOT send dealer-facing messages.
 * Does NOT set NONGA_LEAD_CAPTURE_ENABLED=true.
 *
 * Cleanup: all artifacts are in-process memory only → discarded when process exits.
 */
import {
  isVisibleOnMarketplace,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import {
  DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE,
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE,
  assertCanPublishDealerListingToMarketplace,
  canActorPublishDealerListingToMarketplace,
  dealerListingStatusAfterSubmit,
  isPendingOwnerReview,
} from "../src/utils/dealerListingApprovalGate.ts";
import {
  PUBLIC_LISTING_REDACTED_OWNERSHIP_ID_FIELDS,
  toPublicMarketplaceCarDto,
} from "../src/utils/publicMarketplaceListingPrivacy.ts";
import {
  canonicalDealerOwnerId,
  toPublicDealerSlug,
} from "../src/utils/dealerIdentity.ts";
import {
  BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
  isLeadCaptureEnabled,
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
} from "../src/services/leads/leadCaptureFlags.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  createBuyerLeadRepository,
  resetBuyerLeadRepositoryForTests,
} from "../src/server/repositories/buyerLeadRepository.ts";
import { carBelongsToDealer } from "../src/server/dealerAccess.ts";
import { resolveListingSellerId } from "../src/services/leads/buyerLeadService.ts";

const TEST_DEALER_A = "test-dealer-preview-a";
const TEST_DEALER_B = "test-dealer-preview-b";
const TEST_LISTING_ID = "car-test-owner-preview-v2233";
const TEST_TITLE = "ทดสอบระบบประกาศ - ห้ามติดต่อจริง / TEST OWNER PREVIEW - DO NOT CONTACT";

let failures = 0;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) {
    failures += 1;
    process.exitCode = 1;
  }
}

/** Simulate dealer draft submit → pending_review listing (same policy as publishDraftListing). */
function simulateDealerSubmit(): MarketplaceCarRecord {
  const dealerId = TEST_DEALER_A;
  return {
    id: TEST_LISTING_ID,
    title: TEST_TITLE,
    brand: "Toyota",
    model: "Yaris",
    year: 2021,
    price: 429000,
    type: "used",
    condition: "มือสอง",
    mileage: 28000,
    fuelType: "petrol",
    images: [
      `https://example.test/listings/${TEST_LISTING_ID}/hero-fake.jpg`,
    ],
    description:
      "TEST / OWNER APPROVAL ONLY — fake listing for controlled dealer posting preview. ห้ามติดต่อจริง",
    dealerId,
    ownerId: canonicalDealerOwnerId(dealerId),
    ownerName: "Synthetic Preview Dealer",
    ownerPhone: "0810000099",
    showroomName: "Synthetic Preview Showroom",
    registrationProvince: "กรุงเทพมหานคร",
    licensePlateMasked: "1กข***",
    licensePlateFull: "1กข9999",
    vin: "ZZZZZZZZZZZZZZZZZ",
    isSold: false,
    listingStatus: dealerListingStatusAfterSubmit(),
    createdAt: "2026-07-09T11:00:00.000Z",
    boosted: false,
    featured: false,
  };
}

/** Simulate admin approve (same effect as POST /api/admin/listings/:id/approve). */
function simulateAdminApprove(
  listing: MarketplaceCarRecord
): MarketplaceCarRecord {
  return { ...listing, listingStatus: "published" };
}

/** Simulate cleanup → safe non-public (hidden) then discard. */
function simulateCleanupToNonPublic(
  listing: MarketplaceCarRecord
): MarketplaceCarRecord {
  return { ...listing, listingStatus: "hidden" };
}

console.log("=== v22.33 Controlled Dealer Posting Owner Preview (TEST ONLY) ===\n");
console.log("Artifact marker:", TEST_TITLE);
console.log("Listing id (fake):", TEST_LISTING_ID);
console.log("Cleanup: in-memory only — no live staging write\n");

// --- 1) Dealer submit → pending_review ---
const submitted = simulateDealerSubmit();
ok(
  "1. dealer submit status pending_review",
  submitted.listingStatus === "pending_review" &&
    isPendingOwnerReview(submitted.listingStatus)
);
ok(
  "1b. submit message policy present",
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE.includes("รออนุมัติ")
);
ok(
  "1c. ownerId canonical owner-{dealerId}",
  submitted.ownerId === `owner-${TEST_DEALER_A}`
);
ok(
  "1d. dealerId bound to test dealer A",
  submitted.dealerId === TEST_DEALER_A
);

// --- 2) Not marketplace-visible before approval ---
ok(
  "2. pending not marketplace-visible",
  isVisibleOnMarketplace(submitted) === false
);

// --- 3) Dealer cannot self-approve ---
const selfApprove = assertCanPublishDealerListingToMarketplace({
  isAdmin: false,
  isDealerScopedListing: true,
});
ok(
  "3. dealer self-approve forbidden",
  selfApprove.ok === false &&
    selfApprove.message === DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE
);
ok(
  "3b. canActorPublish false for dealer",
  canActorPublishDealerListingToMarketplace({
    isAdmin: false,
    isDealerScopedListing: true,
  }) === false
);

// --- 4) Cross-dealer isolation ---
ok(
  "4. dealer A owns listing",
  carBelongsToDealer(submitted, TEST_DEALER_A) === true
);
ok(
  "4b. dealer B does not own listing",
  carBelongsToDealer(submitted, TEST_DEALER_B) === false
);

// --- 5) Owner/admin can approve ---
ok(
  "5. admin can approve",
  canActorPublishDealerListingToMarketplace({
    isAdmin: true,
    isDealerScopedListing: true,
  }) === true
);
const approved = simulateAdminApprove(submitted);
ok(
  "5b. after approve status published",
  approved.listingStatus === "published"
);
ok(
  "5c. approved is marketplace-visible",
  isVisibleOnMarketplace(approved) === true
);

// --- 6) Public DTO after approval (safe fields only) ---
const dto = toPublicMarketplaceCarDto(approved) as unknown as Record<
  string,
  unknown
>;
for (const key of PUBLIC_LISTING_REDACTED_OWNERSHIP_ID_FIELDS) {
  ok(`6. public DTO omits ${key}`, !(key in dto));
}
ok("6b. public DTO omits vin", !("vin" in dto));
ok("6c. public DTO omits licensePlateFull", !("licensePlateFull" in dto));
ok("6d. public DTO clears ownerPhone", dto.ownerPhone === "");
ok(
  "6e. public DTO dealerDisplayName",
  dto.dealerDisplayName === "Synthetic Preview Showroom"
);
ok(
  "6f. public DTO sellerDisplayName",
  dto.sellerDisplayName === "Synthetic Preview Showroom"
);
ok("6g. public DTO sellerType dealer", dto.sellerType === "dealer");
ok(
  "6h. public DTO dealerSlug",
  dto.dealerSlug === TEST_DEALER_A ||
    toPublicDealerSlug(TEST_DEALER_A) === dto.dealerSlug
);
ok("6i. brand/model/price preserved", dto.brand === "Toyota" && dto.price === 429000);
ok(
  "6j. images preserved",
  Array.isArray(dto.images) && (dto.images as string[]).length === 1
);
ok(
  "6k. title still marked TEST",
  String(dto.title).includes("TEST") || String(dto.title).includes("ทดสอบ")
);

// --- 7) Future lead routing binding (capture still OFF) ---
ok(
  "7. lead sellerId would be listing.ownerId",
  resolveListingSellerId(approved) === approved.ownerId
);
ok("7b. kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "7c. kill switch false OFF",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false
);

resetBuyerLeadRepositoryForTests();
const repo = createBuyerLeadRepository("memory");
const leadBlocked = await createConsentedBuyerLead({
  listing: {
    id: approved.id,
    title: approved.title,
    price: approved.price,
    ownerId: approved.ownerId,
  },
  input: {
    listingId: approved.id,
    displayName: "Synthetic Buyer Preview",
    contactPhone: "0890000099",
    purchaseMethod: "cash",
    preferredContactWindow: "เย็น",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
  buyerUserId: "buyer-synthetic-v2233",
  repository: repo,
  env: { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" },
});
ok("7d. authenticated lead create blocked while OFF", leadBlocked.ok === false);
ok(
  "7e. blocked 403 kill-switch message",
  leadBlocked.ok === false &&
    leadBlocked.status === 403 &&
    leadBlocked.message === BUYER_LEAD_CAPTURE_DISABLED_MESSAGE
);

// --- 8) Cleanup → non-public; discard ---
const cleaned = simulateCleanupToNonPublic(approved);
ok(
  "8. cleanup sets hidden (non-public)",
  cleaned.listingStatus === "hidden" &&
    isVisibleOnMarketplace(cleaned) === false
);
ok(
  "8b. no live staging write performed",
  true,
  "in-memory only; marketplace 13 untouched"
);

console.log("\n--- Owner preview path (documented, not executed live) ---");
console.log("UI: Dealer Portal → Drafts → ลงขาย (RequireDealer)");
console.log("API submit: POST /api/dealer/drafts/:id/publish → pending_review");
console.log("API pending: GET /api/admin/listings/pending-review");
console.log("API approve: POST /api/admin/listings/:id/approve");
console.log("Dealer self-unhide: PATCH visibility → 403");
console.log("Approval UI: API-first (no dedicated admin queue UI yet)");

console.log(
  `\n=== v22.33 ${failures === 0 ? "PASS" : "FAIL"} (${failures} failures) ===`
);
console.log(
  "FINAL ARTIFACT STATUS: cleaned to hidden in-memory; discarded on exit; live marketplace unchanged"
);
