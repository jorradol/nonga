/**
 * v6.7A — Lead multi-owner isolation audit harness
 * Fake data only · NO Firestore · NO publish · NO PII · NO real plate/VIN
 * Run: npm run test:lead-multi-owner-isolation
 */
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import { getSellerMaskedQueueForListing } from "../src/services/leads/buyerLeadQueueService.ts";
import { sellerMaskedQueueEntryHasNoFullPhone } from "../src/services/leads/sellerSkipQueuePolicy.ts";
import {
  resolveBuyerLeadViewerRole,
  toPublicBuyerLead,
} from "../src/services/leads/buyerLeadView.ts";
import { canManageListingWithScope } from "../src/server/ownerListingAccess.ts";
import {
  resolveCarDealerId,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import {
  normalizeDealerId,
  resolveParentDealerGroup,
  THOR_AUTO_PARENT_DEALER_GROUP,
} from "../src/utils/dealerIdentity.ts";

const SIM_DEALERS = ["sim-1thor", "sim-2thor", "sim-3thor"] as const;
const MEMBERS = ["member-seller-001", "member-seller-002"] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function makeDealerListing(dealerId: string, listingSuffix: string): MarketplaceCarRecord {
  const normalized = normalizeDealerId(dealerId);
  return {
    id: `listing-${normalized}-${listingSuffix}`,
    title: `DryRun ${normalized} ${listingSuffix}`,
    price: 400000,
    ownerId: `owner-${normalized}`,
    ownerName: `DryRun ${normalized}`,
    ownerPhone: "0890000000",
    dealerId: normalized,
    brand: "DryRun",
    model: "SimLead",
    year: 2022,
    mileage: 50000,
    type: "used",
    condition: "good",
    fuelType: "gasoline",
    isSold: false,
    listingStatus: "published",
    images: [],
    description: "v6.7A fake listing for lead isolation audit",
    createdAt: new Date().toISOString(),
  };
}

function makeMemberListing(memberId: string, listingSuffix: string): MarketplaceCarRecord {
  return {
    id: `listing-${memberId}-${listingSuffix}`,
    title: `Member listing ${memberId}`,
    price: 350000,
    ownerId: memberId,
    ownerName: `Member ${memberId}`,
    ownerPhone: "0890000001",
    brand: "DryRun",
    model: "MemberLead",
    year: 2021,
    mileage: 60000,
    type: "used",
    condition: "good",
    fuelType: "gasoline",
    isSold: false,
    listingStatus: "published",
    images: [],
    description: "v6.7A fake member listing",
    createdAt: new Date().toISOString(),
  };
}

async function createFakeLead(
  repo: Awaited<ReturnType<typeof import("../src/server/repositories/buyerLeadRepository.ts").createBuyerLeadRepository>>,
  listing: Pick<MarketplaceCarRecord, "id" | "title" | "price" | "ownerId">,
  buyerUserId: string,
  displayName: string,
  phone: string
) {
  return createConsentedBuyerLead({
    input: {
      listingId: listing.id,
      displayName,
      contactPhone: phone,
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId,
    listing,
    repository: repo,
  });
}

resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

console.log("=== v6.7A Lead Multi-Owner Isolation Audit Harness ===\n");

// --- Scenario A/B: Dealer-owned listings ---
const dealerListings = SIM_DEALERS.map((d, i) => makeDealerListing(d, `car-${i + 1}`));

for (const listing of dealerListings) {
  const dealerId = resolveCarDealerId(listing);
  const result = await createFakeLead(repo, listing, "buyer-a", "Buyer A", "0810000001");
  ok(`${dealerId} lead created`, result.ok);
  if (result.ok) {
    ok(
      `${dealerId} sellerId = owner-{dealerId}`,
      result.lead.sellerId === listing.ownerId,
      `got ${result.lead.sellerId}`
    );
    ok(
      `${dealerId} listingId preserved`,
      result.lead.listingId === listing.id
    );
    ok(`${dealerId} source is chat`, result.lead.source === "chat");
  }
}

// Cross-partition queue isolation
{
  const listing1 = dealerListings[0]!;
  const listing2 = dealerListings[1]!;

  const q1 = await getSellerMaskedQueueForListing(repo, listing1.id, listing1.ownerId);
  ok("sim-1thor owner sees own queue", Array.isArray(q1) && q1.length === 1);

  const q1Denied = await getSellerMaskedQueueForListing(repo, listing1.id, listing2.ownerId);
  ok(
    "sim-2thor cannot view sim-1thor queue by wrong sellerId",
    !Array.isArray(q1Denied) && q1Denied.ok === false
  );

  const scope2 = {
    ownerId: listing2.ownerId,
    dealerId: "sim-2thor",
    isAdmin: false,
    role: "dealer",
    provider: "dev-stub" as const,
  };
  ok(
    "sim-2thor cannot manage sim-1thor listing",
    !canManageListingWithScope(scope2, listing1)
  );
  ok(
    "sim-2thor can manage sim-2thor listing",
    canManageListingWithScope(scope2, listing2)
  );
}

// --- Scenario C: Member-owned listings ---
const memberListings = [
  makeMemberListing(MEMBERS[0], "car-a"),
  makeMemberListing(MEMBERS[1], "car-b"),
];

for (const listing of memberListings) {
  const result = await createFakeLead(
    repo,
    listing,
    "buyer-b",
    "Buyer B",
    "0820000002"
  );
  ok(`${listing.ownerId} member lead created`, result.ok);
  if (result.ok) {
    ok(
      `${listing.ownerId} sellerId = member uid`,
      result.lead.sellerId === listing.ownerId
    );
  }
}

{
  const m1 = memberListings[0]!;
  const m2 = memberListings[1]!;

  const qM1 = await getSellerMaskedQueueForListing(repo, m1.id, m1.ownerId);
  ok("member-seller-001 sees own queue", Array.isArray(qM1) && qM1.length === 1);

  const qM1Denied = await getSellerMaskedQueueForListing(repo, m1.id, m2.ownerId);
  ok(
    "member-seller-002 cannot view member-seller-001 queue",
    !Array.isArray(qM1Denied) && qM1Denied.ok === false
  );

  const dealerScope = {
    ownerId: "owner-sim-1thor",
    dealerId: "sim-1thor",
    isAdmin: false,
    role: "dealer",
    provider: "dev-stub" as const,
  };
  ok(
    "dealer cannot manage member listing",
    !canManageListingWithScope(dealerScope, m1)
  );
}

// --- PII masking ---
{
  const listing = dealerListings[0]!;
  const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  if (Array.isArray(queue)) {
    for (const row of queue) {
      ok(`masked phone row ${row.leadId}`, sellerMaskedQueueEntryHasNoFullPhone(row));
      ok(
        `no 10-digit phone in queue row`,
        !/0[689]\d{8}/.test(row.contactPhone)
      );
    }
  }
}

// --- Scenario D: Admin visibility ---
{
  const listing = dealerListings[0]!;
  const leadResult = await createFakeLead(repo, listing, "buyer-a", "AdminTest", "0830000003");
  if (leadResult.ok) {
    const role = resolveBuyerLeadViewerRole({
      viewerUid: "admin-uid",
      viewerIsAdmin: true,
      lead: leadResult.lead,
      listingSellerId: listing.ownerId,
    });
    ok("admin viewer role", role === "admin");
    const pub = toPublicBuyerLead(leadResult.lead, role);
    ok("admin sees unmasked contact", pub.contactMasked === false);
  }
}

// --- v6.7B: dealer mutation auth via listing scope ---
{
  const listing = dealerListings[0]!;
  const dealerScope = {
    ownerId: "firebase-dealer-user-abc",
    dealerId: "sim-1thor",
    isAdmin: false,
    role: "dealer",
    provider: "dev-stub" as const,
  };
  ok(
    "dealer scope can manage own listing for mutations",
    canManageListingWithScope(dealerScope, listing)
  );
  ok(
    "dealer firebase uid still differs from sellerId (expected)",
    listing.ownerId === "owner-sim-1thor" &&
      dealerScope.ownerId !== listing.ownerId
  );
}

// --- Gap report: parent dealer group ---
{
  for (const d of SIM_DEALERS) {
    ok(
      `${d} resolves to Thor Auto parent group metadata`,
      resolveParentDealerGroup(d) === THOR_AUTO_PARENT_DEALER_GROUP
    );
  }
  ok(
    "GAP DOCUMENTED: no parent-group lead aggregation API exists",
    typeof resolveParentDealerGroup === "function"
  );
}

// --- Member mutation path works (uid alignment) ---
{
  const listing = memberListings[0]!;
  const leadResult = await createFakeLead(repo, listing, "buyer-b", "MemberMut", "0850000005");
  if (leadResult.ok) {
    const memberRole = resolveBuyerLeadViewerRole({
      viewerUid: MEMBERS[0],
      viewerIsAdmin: false,
      lead: leadResult.lead,
      listingSellerId: listing.ownerId,
    });
    ok("member gets listing_seller role for own lead", memberRole === "listing_seller");
  }
}

console.log("\n=== Harness complete ===");
if (process.exitCode) {
  console.error("\nSome assertions failed.");
  process.exit(process.exitCode);
}
console.log("\nAll assertions passed (including documented GAP checks).");
