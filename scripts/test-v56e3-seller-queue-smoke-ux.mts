/**
 * v5.6E.3 — Seller queue smoke & UX hardening guards
 * npm run test:v56e3-seller-queue-smoke-ux
 */
import { readFileSync } from "node:fs";
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  getListingInterestQueueStats,
  publicQueuePayloadHasNoOtherBuyerPii,
} from "../src/services/leads/buyerLeadQueuePolicy.ts";
import { getSellerMaskedQueueForListing } from "../src/services/leads/buyerLeadQueueService.ts";
import {
  buildBuyerSkipFeedbackMessage,
  sellerMaskedQueueEntryHasNoFullPhone,
  validateSellerSkipNote,
} from "../src/services/leads/sellerSkipQueuePolicy.ts";
import { sellerSkipQueueLead } from "../src/services/leads/sellerSkipQueueService.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const listing = {
  id: "car-seller-queue-e3",
  title: "Honda City 2020",
  price: 420000,
  ownerId: "seller-e3-owner",
};

resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

const r1 = await createConsentedBuyerLead({
  input: {
    listingId: listing.id,
    displayName: "ดล",
    contactPhone: "0812345678",
    purchaseMethod: "finance",
    budgetMax: 400000,
    preferredContactWindow: "ตลอดเวลา",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
  buyerUserId: "buyer-e3-1",
  listing,
  repository: repo,
});
ok("seed lead for smoke", r1.ok === true);
const leadId = r1.ok ? r1.lead.id : "";

// --- masked queue field completeness ---
{
  const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  ok("owner sees queue", Array.isArray(queue) && queue.length === 1);
  if (Array.isArray(queue) && queue[0]) {
    const row = queue[0];
    ok("displayName present", row.displayName.length > 0);
    ok("purchaseMethod present", row.purchaseMethod === "finance");
    ok("budget label present", row.budgetLabel.includes("400"));
    ok("contact window present", row.preferredContactWindow === "ตลอดเวลา");
    ok("buyer summary present", row.buyerSummary.length > 0);
    ok("waiting label for non-turn N/A", row.isCurrentSellerTurn || row.waitingReason === "รอผลคิวก่อนหน้า");
    ok("no full phone in row", sellerMaskedQueueEntryHasNoFullPhone(row));
    ok("reveal disabled", row.canRevealContact === false);
    ok("skip enabled on turn", row.canSkip === true);
  }
}

// --- non-owner cannot view queue ---
{
  const denied = await getSellerMaskedQueueForListing(repo, listing.id, "intruder-seller");
  ok("non-owner queue denied", !Array.isArray(denied) && denied.ok === false);
}

// --- skip other requires note ---
{
  const noteCheck = validateSellerSkipNote("other", "");
  ok("other without note rejected", noteCheck.ok === false);
  const skip = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId,
    reason: "other",
    note: undefined,
    actorUserId: listing.ownerId,
  });
  ok("skip other without note rejected", skip.ok === false);
}

// --- skip with other + note, feedback polite ---
{
  const skipped = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId,
    reason: "other",
    note: "รอบนี้ยังไม่สะดวก",
    actorUserId: listing.ownerId,
  });
  ok("skip other with note ok", skipped.ok === true);
  if (skipped.ok) {
    ok("feedback has polite opener", skipped.buyerQueueFeedback.includes("ผู้ขายยังไม่ได้เลือกติดต่อกลับ"));
    ok("feedback includes note", skipped.buyerQueueFeedback.includes("รอบนี้ยังไม่สะดวก"));
    ok("feedback avoids harsh reject word", !skipped.buyerQueueFeedback.includes("ถูกปฏิเสธ"));
    const lead = await repo.getBuyerLeadById(leadId);
    ok("buyerQueueFeedback stored", Boolean(lead?.buyerQueueFeedback));
    ok("contact still locked", lead?.contactRevealStatus === "locked");
    ok("withdrawn from queue", lead?.queueLifecycle === "withdrawn");
  }
}

// --- cannot skip out-of-order lead, then reorder after skip ---
{
  resetBuyerLeadRepositoryForTests();
  const rA = await createConsentedBuyerLead({
    input: {
      listingId: listing.id,
      displayName: "A",
      contactPhone: "0811111111",
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId: "buyer-e3-a",
    listing,
    repository: repo,
  });
  const rB = await createConsentedBuyerLead({
    input: {
      listingId: listing.id,
      displayName: "B",
      contactPhone: "0822222222",
      purchaseMethod: "cash",
      preferredContactWindow: "บ่าย",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId: "buyer-e3-b",
    listing,
    repository: repo,
  });
  ok("two fresh leads", rA.ok === true && rB.ok === true);
  if (rA.ok && rB.ok) {
    const blocked = await sellerSkipQueueLead({
      repository: repo,
      listingId: listing.id,
      sellerId: listing.ownerId,
      leadId: rB.lead.id,
      reason: "insufficient_info",
      actorUserId: listing.ownerId,
    });
    ok("cannot skip queue #2 before #1", blocked.ok === false);

    const skipA = await sellerSkipQueueLead({
      repository: repo,
      listingId: listing.id,
      sellerId: listing.ownerId,
      leadId: rA.lead.id,
      reason: "offer_below_expectation",
      actorUserId: listing.ownerId,
    });
    ok("skip queue #1 ok", skipA.ok === true);

    const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
    ok("only B remains active", Array.isArray(queue) && queue.length === 1 && queue[0]?.leadId === rB.lead.id);
    ok("B is current turn", Array.isArray(queue) && queue[0]?.isCurrentSellerTurn === true);
  }
}

// --- public stats count-only ---
{
  const all = await repo.listBuyerLeadsByListingId(listing.id);
  const stats = getListingInterestQueueStats(all, listing.id);
  ok("public stats shape", publicQueuePayloadHasNoOtherBuyerPii({ interestCount: stats.interestCount }));
}

// --- feedback copy sweep ---
for (const reason of [
  "offer_below_expectation",
  "purchase_method_mismatch",
  "insufficient_info",
  "suspected_inaccurate",
] as const) {
  const msg = buildBuyerSkipFeedbackMessage(reason);
  ok(`feedback ${reason} polite`, msg.includes("ผู้ขายยังไม่ได้เลือกติดต่อกลับ"));
  ok(`feedback ${reason} no harsh reject`, !msg.includes("ถูกปฏิเสธ"));
}

// --- UI hardening strings present in panel source ---
{
  const src = readFileSync("src/components/leads/SellerMaskedLeadQueuePanel.tsx", "utf8");
  ok("reveal disabled label in UI", src.includes("เปิดข้อมูลติดต่อ — ยังไม่เปิดในรอบนี้"));
  ok("waiting reason label in UI", src.includes("รอผลคิวก่อนหน้า") || src.includes("waitingReason"));
  ok("skip other note gate in UI", src.includes('skipReason === "other"') && src.includes("skipNote.trim().length"));
  ok("error retry in UI", src.includes("seller-lead-queue-retry"));
}

// --- route auth guard strings (skip/reveal owner-only) ---
{
  const routes = readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8");
  ok("skip route checks sellerId", routes.includes("lead.sellerId !== auth.uid"));
  ok("queue route checks listing owner", routes.includes("sellerId !== auth.uid"));
}

console.log("\nDone v5.6E.3 seller queue smoke & UX hardening tests.");
if (process.exitCode) process.exit(process.exitCode);
