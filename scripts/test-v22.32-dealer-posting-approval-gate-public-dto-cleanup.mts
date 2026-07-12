/**
 * v22.32 — Dealer posting approval gate + public DTO ownership cleanup
 * npm run test:v22.32-dealer-posting-approval-gate-public-dto-cleanup
 *
 * TEST / OWNER APPROVAL ONLY — fake data only; no live lead; no dealer send.
 */
import {
  isVisibleOnMarketplace,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import {
  DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE,
  assertCanPublishDealerListingToMarketplace,
  canActorPublishDealerListingToMarketplace,
  dealerListingStatusAfterSubmit,
  isMarketplacePublicListingStatus,
  isPendingOwnerReview,
} from "../src/utils/dealerListingApprovalGate.ts";
import {
  PUBLIC_LISTING_REDACTED_OWNERSHIP_ID_FIELDS,
  toPublicMarketplaceCarDto,
} from "../src/utils/publicMarketplaceListingPrivacy.ts";
import {
  canonicalDealerOwnerId,
  toPublicDealerSlug,
  THOR_AUTO_DEALER_ID,
} from "../src/utils/dealerIdentity.ts";
import {
  isLeadCaptureEnabled,
  BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
} from "../src/services/leads/leadCaptureFlags.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  resetBuyerLeadRepositoryForTests,
  createBuyerLeadRepository,
} from "../src/server/repositories/buyerLeadRepository.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v22.32 Dealer Approval Gate + Public DTO Cleanup ===\n");

// --- Approval gate policy ---
ok(
  "dealer submit status is pending_review",
  dealerListingStatusAfterSubmit() === "pending_review"
);
ok(
  "pending_review is not marketplace-public",
  isMarketplacePublicListingStatus("pending_review") === false
);
ok(
  "published is marketplace-public",
  isMarketplacePublicListingStatus("published") === true
);
ok("isPendingOwnerReview", isPendingOwnerReview("pending_review") === true);
ok(
  "dealer cannot self-approve",
  canActorPublishDealerListingToMarketplace({
    isAdmin: false,
    isDealerScopedListing: true,
  }) === false
);
ok(
  "admin can approve dealer listing",
  canActorPublishDealerListingToMarketplace({
    isAdmin: true,
    isDealerScopedListing: true,
  }) === true
);
ok(
  "member listing not blocked by dealer gate",
  canActorPublishDealerListingToMarketplace({
    isAdmin: false,
    isDealerScopedListing: false,
  }) === true
);
const deny = assertCanPublishDealerListingToMarketplace({
  isAdmin: false,
  isDealerScopedListing: true,
});
ok(
  "assert self-approve forbidden message",
  deny.ok === false && deny.message === DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE
);

// --- Visibility helper ---
const pendingCar: MarketplaceCarRecord = {
  id: "car-test-pending-v2232",
  title: "TEST OWNER APPROVAL ONLY — Synthetic Pending",
  brand: "Toyota",
  model: "Yaris",
  year: 2020,
  price: 399000,
  type: "used",
  condition: "มือสอง",
  mileage: 30000,
  fuelType: "petrol",
  images: ["https://example.test/car-test-pending-v2232.jpg"],
  description: "TEST / OWNER APPROVAL ONLY — fake listing",
  ownerId: canonicalDealerOwnerId("test-dealer-v2232"),
  ownerName: "Synthetic Dealer",
  ownerPhone: "0810000000",
  showroomName: "Synthetic Test Showroom",
  dealerId: "test-dealer-v2232",
  isSold: false,
  listingStatus: "pending_review",
  createdAt: "2026-07-09T00:00:00.000Z",
};
ok(
  "pending_review not visible on marketplace",
  isVisibleOnMarketplace(pendingCar) === false
);
ok(
  "published visible on marketplace",
  isVisibleOnMarketplace({ ...pendingCar, listingStatus: "published" }) === true
);
ok(
  "hidden not visible",
  isVisibleOnMarketplace({ ...pendingCar, listingStatus: "hidden" }) === false
);

// --- ownerId / dealerId convention ---
ok(
  "canonical portal ownerId",
  canonicalDealerOwnerId(THOR_AUTO_DEALER_ID) === "owner-thor-auto"
);
ok(
  "public dealer slug for thor",
  toPublicDealerSlug("dealer-thor-auto") === "thor-auto"
);
ok(
  "firebase-style uid not exposed as public slug",
  toPublicDealerSlug("UUvgeBfP4tb1WaLXIvB59ChOYhK2") === undefined
);

// --- Public DTO ---
const dto = toPublicMarketplaceCarDto({
  ...pendingCar,
  listingStatus: "published",
  vin: "ZZZZZZZZZZZZZZZZZ",
  licensePlateFull: "กข-9999",
  ownerAddress: "123 Fake Street",
} as MarketplaceCarRecord) as unknown as Record<string, unknown>;

for (const key of PUBLIC_LISTING_REDACTED_OWNERSHIP_ID_FIELDS) {
  ok(`public DTO omits ${key}`, !(key in dto));
}
ok("public DTO omits vin", !("vin" in dto));
ok("public DTO omits licensePlateFull", !("licensePlateFull" in dto));
ok("public DTO clears ownerPhone", dto.ownerPhone === "");
ok(
  "public DTO dealerDisplayName",
  dto.dealerDisplayName === "Synthetic Test Showroom"
);
ok(
  "public DTO sellerDisplayName",
  dto.sellerDisplayName === "Synthetic Test Showroom"
);
ok("public DTO sellerType dealer", dto.sellerType === "dealer");
ok("public DTO dealerSlug safe", dto.dealerSlug === "test-dealer-v2232");
ok("brand preserved", dto.brand === "Toyota");
ok("images preserved", Array.isArray(dto.images) && dto.images.length === 1);

// --- Lead capture remains OFF ---
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "kill switch false OFF",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false
);

resetBuyerLeadRepositoryForTests();
const repo = createBuyerLeadRepository("memory");
const leadBlocked = await createConsentedBuyerLead({
  listing: {
    id: pendingCar.id,
    title: pendingCar.title,
    price: pendingCar.price,
    ownerId: pendingCar.ownerId,
    isSold: false,
    listingStatus: "published" as const,
  },
  input: {
    listingId: pendingCar.id,
    displayName: "Synthetic Buyer",
    contactPhone: "0890000000",
    purchaseMethod: "cash",
    preferredContactWindow: "เย็น",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
  buyerUserId: "buyer-synthetic-v2232",
  repository: repo,
  env: { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" },
});
ok("authenticated create blocked while OFF", leadBlocked.ok === false);
ok(
  "blocked status 403",
  leadBlocked.ok === false && leadBlocked.status === 403
);
ok(
  "blocked message is kill-switch copy",
  leadBlocked.ok === false &&
    leadBlocked.message === BUYER_LEAD_CAPTURE_DISABLED_MESSAGE
);

console.log("\n=== v22.32 done ===");
