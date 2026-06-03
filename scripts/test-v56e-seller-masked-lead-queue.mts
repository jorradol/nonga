/**
 * v5.6E — Seller masked lead queue + skip before reveal
 * npm run test:v56e-seller-masked-lead-queue
 */
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  getListingInterestQueueStats,
  publicQueuePayloadHasNoOtherBuyerPii,
  toSellerMaskedQueue,
} from "../src/services/leads/buyerLeadQueuePolicy.ts";
import {
  getSellerMaskedQueueForListing,
  sellerQueueListNeverShowsFullPhoneOfOthers,
} from "../src/services/leads/buyerLeadQueueService.ts";
import {
  buildBuyerSkipFeedbackMessage,
  sellerMaskedQueueEntryHasNoFullPhone,
  SELLER_SKIP_REASON_OPTIONS,
} from "../src/services/leads/sellerSkipQueuePolicy.ts";
import { sellerSkipQueueLead } from "../src/services/leads/sellerSkipQueueService.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const listing = {
  id: "car-seller-queue-e1",
  title: "Toyota Yaris 2019",
  price: 350000,
  ownerId: "seller-e-1",
};

resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

async function createLead(buyerUserId: string, displayName: string, phone: string) {
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

let lead1Id = "";
let lead2Id = "";
let lead3Id = "";

{
  const r1 = await createLead("buyer-e1", "มานี", "0811111111");
  const r2 = await createLead("buyer-e2", "สมชาย", "0822222222");
  const r3 = await createLead("buyer-e3", "วิชัย", "0833333333");
  ok("three leads for seller queue", r1.ok && r2.ok && r3.ok);
  if (r1.ok && r2.ok && r3.ok) {
    lead1Id = r1.lead.id;
    lead2Id = r2.lead.id;
    lead3Id = r3.lead.id;
  }
}

// --- owner sees masked queue ordered ---
{
  const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  ok("owner gets array", Array.isArray(queue));
  if (Array.isArray(queue)) {
    ok("three active rows", queue.length === 3);
    ok("ordered by position", queue[0]?.queuePosition === 1 && queue[2]?.queuePosition === 3);
    ok("first is seller turn", queue[0]?.isCurrentSellerTurn === true);
    ok("second waits", queue[1]?.waitingReason === "รอผลคิวก่อนหน้า");
    ok("can skip only current", queue[0]?.canSkip === true && queue[1]?.canSkip === false);
    ok("reveal disabled in MVP", queue.every((e) => e.canRevealContact === false));
    ok("list never shows full phones", sellerQueueListNeverShowsFullPhoneOfOthers(queue));
    for (const row of queue) {
      ok(`row ${row.queuePosition} masked phone`, sellerMaskedQueueEntryHasNoFullPhone(row));
      ok(`row ${row.queuePosition} no 10-digit phone`, !/0[689]\d{8}/.test(row.contactPhone));
    }
  }
}

// --- non-owner denied ---
{
  const denied = await getSellerMaskedQueueForListing(repo, listing.id, "other-seller");
  ok("non-owner cannot view queue", !Array.isArray(denied) && denied.ok === false);
}

// --- skip requires reason ---
{
  const bad = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead1Id,
    reason: "",
    actorUserId: listing.ownerId,
  });
  ok("skip without reason rejected", bad.ok === false);
}

// --- skip before reveal ---
{
  const skipped = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead1Id,
    reason: "offer_below_expectation",
    actorUserId: listing.ownerId,
  });
  ok("skip lead1 ok", skipped.ok === true);
  if (skipped.ok) {
    ok("feedback polite", skipped.buyerQueueFeedback.includes("ผู้ขายยังไม่ได้เลือกติดต่อกลับ"));
    ok("feedback offer line", skipped.buyerQueueFeedback.includes("ต่ำกว่าที่ผู้ขายพิจารณา"));
    ok("next is lead2", skipped.nextRevealableLeadId === lead2Id);
    const lead1 = await repo.getBuyerLeadById(lead1Id);
    ok("lead1 withdrawn", lead1?.queueLifecycle === "withdrawn");
    ok("contact still locked", lead1?.contactRevealStatus === "locked");
    ok("no phone reveal fields", lead1?.contactRevealedAt === undefined);
    ok("feedback stored on lead", Boolean(lead1?.buyerQueueFeedback));
    ok("skip reason stored", lead1?.sellerSkipReason === "offer_below_expectation");
  }
}

// --- skip not your turn ---
{
  const blocked = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead3Id,
    reason: "insufficient_info",
    actorUserId: listing.ownerId,
  });
  ok("cannot skip queue #3 before #2", blocked.ok === false);
}

// --- after skip #1, lead2 is turn ---
{
  const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  if (Array.isArray(queue)) {
    ok("active count is 2", queue.length === 2);
    ok("lead2 is turn", queue[0]?.leadId === lead2Id && queue[0]?.isCurrentSellerTurn);
  }
}

// --- suspicious skip no penalty ---
{
  const skipped2 = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead2Id,
    reason: "suspected_inaccurate",
    actorUserId: listing.ownerId,
  });
  ok("skip lead2 suspicious ok", skipped2.ok === true);
  if (skipped2.ok) {
    const lead2 = await repo.getBuyerLeadById(lead2Id);
    ok("suspicious skip reason stored", lead2?.sellerSkipReason === "suspected_inaccurate");
    ok("suspicious feedback copy", skipped2.buyerQueueFeedback.includes("ตรวจสอบเพิ่มเติม"));
    ok("suspicious still no phone reveal", lead2?.contactRevealStatus === "locked");
  }
}

// --- feedback copy per reason ---
{
  ok("purchase method feedback", buildBuyerSkipFeedbackMessage("purchase_method_mismatch").includes("วิธีซื้อ"));
  ok("insufficient info feedback", buildBuyerSkipFeedbackMessage("insufficient_info").includes("ไม่พอ"));
  ok("other with note", buildBuyerSkipFeedbackMessage("other", "รอบนี้ยังไม่สะดวก").includes("รอบนี้ยังไม่สะดวก"));
  ok("skip reason options count", SELLER_SKIP_REASON_OPTIONS.length === 5);
}

// --- public stats still count-only ---
{
  const all = await repo.listBuyerLeadsByListingId(listing.id);
  const stats = getListingInterestQueueStats(all, listing.id);
  ok("interest count active only", stats.interestCount === 1);
  ok("public stats no PII", publicQueuePayloadHasNoOtherBuyerPii(stats));
}

// --- masked policy direct ---
{
  const all = await repo.listBuyerLeadsByListingId(listing.id);
  const masked = toSellerMaskedQueue(all, listing.id);
  ok("only active in masked list", masked.length === 1 && masked[0]?.leadId === lead3Id);
}

console.log("\nDone v5.6E seller masked lead queue tests.");
if (process.exitCode) process.exit(process.exitCode);
