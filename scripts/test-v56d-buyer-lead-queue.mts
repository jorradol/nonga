/**
 * v5.6D — per-listing buyer interest queue
 * npm run test:v56d-buyer-lead-queue
 */
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  buildBuyerJoinedQueueMessage,
  computeNextQueuePosition,
  filterBuyerVisibleQueueFields,
  getListingInterestQueueStats,
  getNextRevealableLead,
  publicQueuePayloadHasNoOtherBuyerPii,
  toSellerMaskedQueue,
} from "../src/services/leads/buyerLeadQueuePolicy.ts";
import {
  applyListingSaleToBuyerQueue,
  getListingInterestStats,
  sellerQueueListNeverShowsFullPhoneOfOthers,
  sellerRecordQueueOutcome,
  sellerRevealQueueLead,
} from "../src/services/leads/buyerLeadQueueService.ts";
import { canRevealNextLeadForListing } from "../src/services/leads/leadPolicy.ts";
import type { BuyerLead } from "../src/services/leads/leadTypes.ts";
import { toPublicBuyerLead } from "../src/services/leads/buyerLeadView.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const listing = {
  id: "car-queue-1",
  title: "Honda City 2020",
  price: 420000,
  ownerId: "seller-q-1",
  isSold: false,
  listingStatus: "published" as const,
};

resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

async function createLead(buyerUserId: string, displayName: string) {
  return createConsentedBuyerLead({
    input: {
      listingId: listing.id,
      displayName,
      contactPhone: "0812345678",
      purchaseMethod: "cash",
      preferredContactWindow: "เย็น",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId,
    listing,
    repository: repo,
    env: { NONGA_LEAD_CAPTURE_ENABLED: "true" },
  });
}

// --- queue position on create ---
let lead1Id = "";
let lead2Id = "";
let lead3Id = "";
{
  const r1 = await createLead("buyer-a", "มานี");
  const r2 = await createLead("buyer-b", "สมชาย");
  const r3 = await createLead("buyer-c", "วิชัย");
  ok("three leads created", r1.ok && r2.ok && r3.ok);
  if (r1.ok && r2.ok && r3.ok) {
    ok("lead1 queue position 1", r1.queuePosition === 1);
    ok("lead2 queue position 2", r2.queuePosition === 2);
    ok("lead3 queue position 3", r3.queuePosition === 3);
    lead1Id = r1.lead.id;
    lead2Id = r2.lead.id;
    lead3Id = r3.lead.id;
    // v7.3 — buyer-facing message must confirm submission WITHOUT exposing the
    // queue position number (backend queuePosition above is unchanged).
    ok("buyer message confirms submission", r2.buyerMessage.includes("ส่งข้อมูลให้ผู้ขายแล้ว"));
    ok("buyer message hides queue position (v7.3)", !/ลำดับที่\s*\d/.test(r2.buyerMessage));
  }
}

// --- public stats: count only ---
{
  const stats = await getListingInterestStats(repo, listing.id);
  ok("interest count is 3", stats.interestCount === 3);
  ok("public payload has no PII", publicQueuePayloadHasNoOtherBuyerPii(stats));
  ok(
    "joined-queue message hides position number (v7.3)",
    buildBuyerJoinedQueueMessage(2).includes("ส่งข้อมูลให้ผู้ขายแล้ว") &&
      !/ลำดับที่\s*\d/.test(buildBuyerJoinedQueueMessage(2))
  );
}

// --- buyer sees only own queue fields ---
{
  const all = await repo.listBuyerLeadsByListingId(listing.id);
  const own = filterBuyerVisibleQueueFields(all[1]!, "buyer-b");
  ok("buyer-b sees own position", own?.queuePosition === 2);
  const sellerViewB = toPublicBuyerLead(all[1]!, "listing_seller");
  ok("seller view has no queue position field", sellerViewB.queuePosition === undefined);
}

// --- seller reveal one at a time ---
{
  const blocked = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    actorUserId: listing.ownerId,
  });
  ok("cannot reveal queue #2 first", !blocked.ok);

  const r1 = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead1Id,
    actorUserId: listing.ownerId,
  });
  ok("reveal queue #1 ok", r1.ok === true);

  const all = await repo.listBuyerLeadsByListingId(listing.id);
  ok("still cannot reveal #2 without outcome", !canRevealNextLeadForListing(all, listing.id));

  const r2attempt = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    actorUserId: listing.ownerId,
  });
  ok("reveal #2 blocked until outcome", !r2attempt.ok);
}

// --- outcome unlocks next ---
{
  const out = await sellerRecordQueueOutcome({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead1Id,
    outcome: "no_progress",
    actorUserId: listing.ownerId,
  });
  ok("outcome recorded", out.ok === true);
  if (out.ok) {
    ok("next revealable is lead2", out.nextRevealableLeadId === lead2Id);
  }
  const r2 = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    actorUserId: listing.ownerId,
  });
  ok("reveal queue #2 after outcome", r2.ok === true);
}

// --- seller masked queue: no full phone flood ---
{
  const all = await repo.listBuyerLeadsByListingId(listing.id);
  const masked = toSellerMaskedQueue(all, listing.id);
  const fullPhones = masked.filter((e) => !e.contactMasked);
  ok("seller list at most one unmasked (v5.6G)", fullPhones.length <= 1);
  ok("seller list privacy guard", sellerQueueListNeverShowsFullPhoneOfOthers(masked));
  ok("masked rows have queue order", masked[0]?.queuePosition === 1);
}

// --- pending_sale / sold supersede ---
{
  const closed = await applyListingSaleToBuyerQueue({
    repository: repo,
    listingId: listing.id,
    saleStatus: "sold",
  });
  ok("supersede on sold", closed.supersededCount >= 1);
  ok("buyer notifications", closed.buyerNotifications.length >= 1);
  const stats = getListingInterestQueueStats(
    await repo.listBuyerLeadsByListingId(listing.id),
    listing.id
  );
  ok("active count drops after sold", stats.interestCount === 0);
  const lead3 = await repo.getBuyerLeadById(lead3Id);
  ok("lead3 superseded", lead3?.queueLifecycle === "superseded");
}

// --- policy: next position after supersede only counts active ---
{
  const leads: BuyerLead[] = [
    {
      id: "x1",
      listingId: listing.id,
      sellerId: listing.ownerId,
      displayName: "a",
      contactPhone: "0811111111",
      purchaseMethod: "cash",
      preferredContactWindow: "x",
      buyerSummary: "x",
      consent: { version: BUYER_LEAD_CONSENT_VERSION, consentedAt: "", listingId: listing.id },
      source: "chat",
      status: "consented",
      contactRevealStatus: "locked",
      queuePosition: 1,
      queueLifecycle: "superseded",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "x2",
      listingId: listing.id,
      sellerId: listing.ownerId,
      displayName: "b",
      contactPhone: "0822222222",
      purchaseMethod: "cash",
      preferredContactWindow: "x",
      buyerSummary: "x",
      consent: { version: BUYER_LEAD_CONSENT_VERSION, consentedAt: "", listingId: listing.id },
      source: "chat",
      status: "consented",
      contactRevealStatus: "locked",
      queuePosition: 5,
      queueLifecycle: "active",
      createdAt: "",
      updatedAt: "",
    },
  ];
  ok("next position after superseded is 6", computeNextQueuePosition(leads, listing.id) === 6);
  ok("next revealable is active lowest", getNextRevealableLead(leads, listing.id)?.id === "x2");
}

console.log("\nDone v5.6D buyer lead queue tests.");
if (process.exitCode) process.exit(process.exitCode);
