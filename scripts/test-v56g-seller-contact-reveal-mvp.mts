/**
 * v5.6G — Seller contact reveal MVP (policy + API shape + UI guards)
 * npm run test:v56g-seller-contact-reveal-mvp
 */
import { readFileSync } from "node:fs";
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import { toSellerMaskedQueue } from "../src/services/leads/buyerLeadQueuePolicy.ts";
import {
  getSellerMaskedQueueForListing,
  sellerQueueListNeverShowsFullPhoneOfOthers,
  sellerRevealQueueLead,
  sellerRecordQueueOutcome,
} from "../src/services/leads/buyerLeadQueueService.ts";
import { applySuspiciousBuyerReportPolicy } from "../src/services/leads/leadPolicy.ts";
import {
  SELLER_REVEAL_CONFIRM_MESSAGE,
  SELLER_REVEAL_OUTCOME_VALUES,
  SELLER_REVEAL_PRIVACY_NOTICE,
} from "../src/services/leads/sellerLeadRevealCopy.ts";
import { sellerMaskedQueueEntryHasNoFullPhone } from "../src/services/leads/sellerSkipQueuePolicy.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const listing = {
  id: "car-v56g-reveal",
  title: "Mazda 2 2021",
  price: 380000,
  ownerId: "seller-g-1",
};

resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

async function seedLead(buyerUserId: string, name: string, phone: string) {
  return createConsentedBuyerLead({
    input: {
      listingId: listing.id,
      displayName: name,
      contactPhone: phone,
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId,
    listing,
    repository: repo,
    env: { NONGA_LEAD_CAPTURE_ENABLED: "true" },
  });
}

let lead1Id = "";
let lead2Id = "";

{
  const r1 = await seedLead("buyer-g1", "มานี", "0811111111");
  const r2 = await seedLead("buyer-g2", "สมชาย", "0822222222");
  ok("two leads seeded", r1.ok && r2.ok);
  if (r1.ok && r2.ok) {
    lead1Id = r1.lead.id;
    lead2Id = r2.lead.id;
  }
}

// --- masked queue before reveal ---
{
  const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  ok("owner queue array", Array.isArray(queue));
  if (Array.isArray(queue) && queue[0] && queue[1]) {
    ok("head can reveal", queue[0].canRevealContact === true);
    ok("second cannot reveal", queue[1].canRevealContact === false);
    ok("second waiting reason", queue[1].waitingReason === "รอผลคิวก่อนหน้า");
    ok("all masked before reveal", queue.every((r) => r.contactMasked));
    ok("no full phone before reveal", queue.every((r) => sellerMaskedQueueEntryHasNoFullPhone(r)));
    ok("needsOutcome false initially", !queue.some((r) => r.needsOutcome));
  }
}

// --- non-owner reveal denied ---
{
  const denied = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: "wrong-seller",
    leadId: lead1Id,
    actorUserId: "wrong-seller",
  });
  ok("non-owner sellerId reveal denied", denied.ok === false);
  const wrongSeller = await getSellerMaskedQueueForListing(repo, listing.id, "other-seller");
  ok("non-owner cannot load queue", !Array.isArray(wrongSeller));
}

// --- reveal not-current denied ---
{
  const notTurn = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    actorUserId: listing.ownerId,
  });
  ok("reveal queue #2 before #1 denied", notTurn.ok === false);
}

// --- owner reveal current success ---
{
  const revealed = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead1Id,
    actorUserId: listing.ownerId,
  });
  ok("owner reveal head ok", revealed.ok === true);
  if (revealed.ok) {
    ok("contactRevealedAt set", Boolean(revealed.lead.contactRevealedAt));
    ok("status contact_revealed", revealed.lead.status === "contact_revealed");
    ok("reveal status revealed", revealed.lead.contactRevealStatus === "revealed");
    ok("phone on lead entity", revealed.lead.contactPhone === "0811111111");
  }
  const serviceSrc = readFileSync("src/services/leads/buyerLeadQueueService.ts", "utf8");
  ok("append contact_revealed log on reveal", serviceSrc.includes('action: "contact_revealed"'));
}

// --- second reveal blocked until outcome ---
{
  const blocked = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    actorUserId: listing.ownerId,
  });
  ok("reveal second while outcome pending denied", blocked.ok === false);
}

// --- queue shows phone only for revealed lead ---
{
  const all = await repo.listBuyerLeadsByListingId(listing.id);
  const masked = toSellerMaskedQueue(all, listing.id);
  const unmasked = masked.filter((e) => !e.contactMasked);
  ok("exactly one unmasked row", unmasked.length === 1);
  ok("unmasked is queue 1", unmasked[0]?.queuePosition === 1);
  ok("unmasked has full phone", unmasked[0]?.contactPhone === "0811111111");
  ok("row2 still masked", masked[1]?.contactMasked === true);
  ok("list privacy guard", sellerQueueListNeverShowsFullPhoneOfOthers(masked));
  ok("head needs outcome", masked[0]?.needsOutcome === true);
  ok("cannot reveal while outcome pending", !masked.some((e) => e.canRevealContact));
}

// --- non-terminal outcome keeps next blocked ---
{
  const prog = await sellerRecordQueueOutcome({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead1Id,
    outcome: "contacting",
    actorUserId: listing.ownerId,
  });
  ok("contacting outcome saved", prog.ok === true);
  const stillBlocked = await sellerRevealQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    actorUserId: listing.ownerId,
  });
  ok("still blocked after contacting", stillBlocked.ok === false);
}

// --- terminal no_progress releases next ---
{
  const out = await sellerRecordQueueOutcome({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead1Id,
    outcome: "no_progress",
    actorUserId: listing.ownerId,
  });
  ok("no_progress outcome", out.ok === true);
  if (out.ok) {
    ok("next revealable lead2", out.nextRevealableLeadId === lead2Id);
  }
  const q2 = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  if (Array.isArray(q2)) {
    ok("lead2 can reveal after release", q2[1]?.canRevealContact === true);
    ok("lead1 phone masked again after outcome", q2[0]?.contactMasked === true);
  }
}

// --- skip before reveal does not expose phone ---
{
  const { sellerSkipQueueLead } = await import("../src/services/leads/sellerSkipQueueService.ts");
  const skipped = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    reason: "insufficient_info",
    actorUserId: listing.ownerId,
  });
  ok("skip head without reveal ok", skipped.ok === true);
  const afterSkip = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  if (Array.isArray(afterSkip)) {
    ok("no full phone after skip", afterSkip.every((e) => e.contactMasked));
    ok("skip row not exposing 0822222222", !afterSkip.some((e) => e.contactPhone.includes("22222222")));
  }
}

// --- suspicious report policy: no auto penalty ---
{
  const policy = applySuspiciousBuyerReportPolicy({
    reason: "other",
    buyerLeadId: lead1Id,
  });
  ok("suspicious no auto penalty", policy.autoPenaltyApplied === false);
  ok("requires admin review", policy.requiresAdminReview === true);
}

// --- API route returns phone on reveal only ---
{
  const routes = readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8");
  ok("reveal route returns contactPhone", routes.includes("contactPhone: result.lead.contactPhone"));
  ok("outcome uses v56g outcome set", routes.includes("SELLER_REVEAL_OUTCOME_VALUES"));
}

// --- UI guards (buyer modal untouched) ---
{
  const panel = readFileSync("src/components/leads/SellerMaskedLeadQueuePanel.tsx", "utf8");
  const buyerModal = readFileSync("src/components/chat/BuyerLeadConsentModalHost.tsx", "utf8");
  ok("reveal confirm copy wired", panel.includes("SELLER_REVEAL_CONFIRM_MESSAGE"));
  ok("privacy notice wired", panel.includes("SELLER_REVEAL_PRIVACY_NOTICE"));
  ok("reveal API wired", panel.includes("revealSellerQueueLead"));
  ok("outcome API wired", panel.includes("recordSellerQueueOutcome"));
  ok("no bulk export UI", !/export\s+(all|queue|leads)/i.test(panel));
  ok("confirm message constant", SELLER_REVEAL_CONFIRM_MESSAGE.length > 20);
  ok("privacy constant", SELLER_REVEAL_PRIVACY_NOTICE.includes("เบอร์"));
  ok("buyer modal host unchanged flow", buyerModal.includes("submitBuyerLeadConsent"));
}

// --- outcome option count ---
{
  ok("six MVP outcomes", SELLER_REVEAL_OUTCOME_VALUES.size === 6);
}

console.log("\nDone v5.6G seller contact reveal MVP tests.");
if (process.exitCode) process.exit(process.exitCode);
