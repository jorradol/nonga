/**
 * v6.7B — Dealer mutation auth guard (listing scope, not raw uid)
 * Fake data only · NO Firestore · NO publish
 * Run: npm run test:v67b-dealer-mutation-auth-guard
 */
import { readFileSync } from "node:fs";
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import { sellerSkipQueueLead } from "../src/services/leads/sellerSkipQueueService.ts";
import { canManageListingWithScope } from "../src/server/ownerListingAccess.ts";
import {
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { normalizeDealerId } from "../src/utils/dealerIdentity.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function makeDealerListing(dealerId: string): MarketplaceCarRecord {
  const normalized = normalizeDealerId(dealerId);
  return {
    id: `listing-${normalized}-v67b`,
    title: `DryRun ${normalized}`,
    price: 400000,
    ownerId: `owner-${normalized}`,
    ownerName: `DryRun ${normalized}`,
    ownerPhone: "0890000000",
    dealerId: normalized,
    brand: "DryRun",
    model: "MutationAuth",
    year: 2022,
    mileage: 50000,
    type: "used",
    condition: "good",
    fuelType: "gasoline",
    isSold: false,
    listingStatus: "published",
    images: [],
    description: "v6.7B fake dealer listing",
    createdAt: new Date().toISOString(),
  };
}

function makeMemberListing(memberId: string): MarketplaceCarRecord {
  return {
    id: `listing-${memberId}-v67b`,
    title: `Member ${memberId}`,
    price: 350000,
    ownerId: memberId,
    ownerName: `Member ${memberId}`,
    ownerPhone: "0890000001",
    brand: "DryRun",
    model: "MemberMutation",
    year: 2021,
    mileage: 60000,
    type: "used",
    condition: "good",
    fuelType: "gasoline",
    isSold: false,
    listingStatus: "published",
    images: [],
    description: "v6.7B fake member listing",
    createdAt: new Date().toISOString(),
  };
}

console.log("=== v6.7B Dealer Mutation Auth Guard ===\n");

// --- Route source uses listing scope guard (not raw uid) ---
{
  const routes = readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8");
  ok("skip route uses canManageBuyerLeadForListing", routes.includes("canManageBuyerLeadForListing(auth, listing)"));
  ok("reveal route uses canManageBuyerLeadForListing", (routes.match(/canManageBuyerLeadForListing\(auth, listing\)/g) ?? []).length >= 3);
  ok("skip route no raw lead.sellerId !== auth.uid", !routes.includes("lead.sellerId !== auth.uid"));
}

const dealerListing = makeDealerListing("sim-1thor");
const otherDealerListing = makeDealerListing("sim-2thor");
const memberListing = makeMemberListing("member-seller-001");

const dealerScope = {
  ownerId: "firebase-dealer-user-abc",
  dealerId: "sim-1thor",
  isAdmin: false,
  role: "dealer",
  provider: "dev-stub" as const,
};
const otherDealerScope = {
  ownerId: "firebase-dealer-user-xyz",
  dealerId: "sim-2thor",
  isAdmin: false,
  role: "dealer",
  provider: "dev-stub" as const,
};
const memberScope = {
  ownerId: "member-seller-001",
  dealerId: null,
  isAdmin: false,
  role: "member",
  provider: "firebase" as const,
};
const otherMemberScope = {
  ownerId: "member-seller-002",
  dealerId: null,
  isAdmin: false,
  role: "member",
  provider: "firebase" as const,
};
const adminScope = {
  ownerId: null,
  dealerId: null,
  isAdmin: true,
  role: "admin",
  provider: "dev-stub" as const,
};

ok("dealer can manage own sim-1thor listing", canManageListingWithScope(dealerScope, dealerListing));
ok("dealer cannot manage sim-2thor listing", !canManageListingWithScope(dealerScope, otherDealerListing));
ok("sim-2thor cannot manage sim-1thor listing", !canManageListingWithScope(otherDealerScope, dealerListing));
ok("dealer cannot manage member listing", !canManageListingWithScope(dealerScope, memberListing));
ok("member can manage own listing", canManageListingWithScope(memberScope, memberListing));
ok("member A cannot manage member B listing", !canManageListingWithScope(otherMemberScope, memberListing));
ok("admin can manage dealer listing", canManageListingWithScope(adminScope, dealerListing));
ok("admin can manage member listing", canManageListingWithScope(adminScope, memberListing));

// --- Service-level skip still works when sellerId matches listing owner (dealer path) ---
resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

const leadResult = await createConsentedBuyerLead({
  input: {
    listingId: dealerListing.id,
    displayName: "Buyer A",
    contactPhone: "0810000001",
    purchaseMethod: "cash",
    preferredContactWindow: "เย็น",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
  buyerUserId: "buyer-a",
  listing: dealerListing,
  repository: repo,
    env: { NONGA_LEAD_CAPTURE_ENABLED: "true" },
});

ok("dealer listing lead created", leadResult.ok);
if (leadResult.ok) {
  ok(
    "lead sellerId is owner-{dealerId}",
    leadResult.lead.sellerId === dealerListing.ownerId
  );

  const skip = await sellerSkipQueueLead({
    repository: repo,
    listingId: dealerListing.id,
    sellerId: dealerListing.ownerId,
    leadId: leadResult.lead.id,
    reason: "insufficient_info",
    actorUserId: dealerScope.ownerId,
  });
  ok("dealer-path skip succeeds with listing owner sellerId", skip.ok === true);
}

// --- Member skip unchanged ---
const memberLead = await createConsentedBuyerLead({
  input: {
    listingId: memberListing.id,
    displayName: "Buyer B",
    contactPhone: "0820000002",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
  buyerUserId: "buyer-b",
  listing: memberListing,
  repository: repo,
    env: { NONGA_LEAD_CAPTURE_ENABLED: "true" },
});

ok("member listing lead created", memberLead.ok);
if (memberLead.ok) {
  const skip = await sellerSkipQueueLead({
    repository: repo,
    listingId: memberListing.id,
    sellerId: memberListing.ownerId,
    leadId: memberLead.lead.id,
    reason: "insufficient_info",
    actorUserId: memberScope.ownerId,
  });
  ok("member-path skip succeeds with member uid as sellerId", skip.ok === true);
}

console.log("\n=== Harness complete ===");
if (process.exitCode) {
  console.error("\nSome assertions failed.");
  process.exit(process.exitCode);
}
console.log("\nAll v6.7B dealer mutation auth guard checks passed.");
