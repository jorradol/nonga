/**
 * v5.6E.5 — Seller queue empty state + buyer lead target binding
 * npm run test:v56e5-seller-queue-empty-state-target-lead
 */
import { readFileSync } from "node:fs";
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  getListingInterestQueueStats,
} from "../src/services/leads/buyerLeadQueuePolicy.ts";
import { getSellerMaskedQueueForListing } from "../src/services/leads/buyerLeadQueueService.ts";
import {
  checkBuyerLeadTargetBinding,
  formatBuyerLeadTargetDebugLine,
} from "../src/services/leads/buyerLeadTargetDebug.ts";
import {
  mapSellerQueueFetchError,
  SELLER_QUEUE_NO_LEADS_MESSAGE,
  SELLER_QUEUE_SYNC_MISMATCH_MESSAGE,
  shouldHideSellerQueuePanel,
} from "../src/services/leads/sellerLeadQueuePanelMessages.ts";
import { sellerMaskedQueueEntryHasNoFullPhone } from "../src/services/leads/sellerSkipQueuePolicy.ts";
import { beginBuyerLeadCaptureWithListing } from "../src/services/leads/buyerLeadCaptureFlow.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

// --- empty / error copy ---
{
  ok(
    "owner 403 maps to sync not forbidden",
    mapSellerQueueFetchError({
      status: 403,
      message: "ไม่มีสิทธิ์ดูคิวนี้ครับ",
      interestCount: 1,
      isListingOwnerContext: true,
    }).message === SELLER_QUEUE_SYNC_MISMATCH_MESSAGE
  );
  ok(
    "owner empty hides panel",
    shouldHideSellerQueuePanel({
      interestCount: 0,
      entryCount: 0,
      hidePanel: mapSellerQueueFetchError({
        status: 403,
        interestCount: 0,
        isListingOwnerContext: true,
      }).hidePanel,
    })
  );
  ok(
    "non-owner 403 forbidden",
    mapSellerQueueFetchError({
      status: 403,
      interestCount: 0,
      isListingOwnerContext: false,
    }).kind === "forbidden"
  );
  ok(
    "owner empty queue message",
    mapSellerQueueFetchError({
      status: 403,
      interestCount: 0,
      isListingOwnerContext: true,
    }).message === SELLER_QUEUE_NO_LEADS_MESSAGE
  );
  ok(
    "interest sync mismatch message",
    mapSellerQueueFetchError({
      status: 500,
      interestCount: 2,
      isListingOwnerContext: true,
    }).message === SELLER_QUEUE_SYNC_MISMATCH_MESSAGE
  );
  ok(
    "no leads hides panel",
    shouldHideSellerQueuePanel({ interestCount: 0, entryCount: 0 })
  );
}

// --- buyer lead target binding ---
resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const repo = createBuyerLeadRepository();

const listingA = {
  id: "car-target-a-e5",
  title: "Honda City",
  price: 420000,
  ownerId: "seller-e5-owner",
  isSold: false,
  listingStatus: "published" as const,
};
const listingB = {
  id: "car-target-b-e5",
  title: "Toyota Yaris",
  price: 350000,
  ownerId: "seller-e5-owner",
};

{
  const ctx = beginBuyerLeadCaptureWithListing("sess-e5", listingA.id);
  ok("CTA sets listingId on capture", ctx.fields.listingId === listingA.id);
}

{
  const r1 = await createConsentedBuyerLead({
    input: {
      listingId: listingA.id,
      displayName: "ดล",
      contactPhone: "0812345678",
      purchaseMethod: "finance",
      budgetMax: 400000,
      preferredContactWindow: "ตลอดเวลา",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId: "buyer-e5",
    listing: listingA,
    repository: repo,
    env: { NONGA_LEAD_CAPTURE_ENABLED: "true" },
  });
  ok("lead created on listing A", r1.ok === true);
  if (r1.ok) {
    const allA = await repo.listBuyerLeadsByListingId(listingA.id);
    const check = checkBuyerLeadTargetBinding({
      lead: r1.lead,
      listing: listingA,
      allLeadsForListing: allA,
    });
    ok("target binding ok", check.ok);
    ok("sellerId matches ownerId", check.sellerMatches);
    ok("queue position 1", check.queuePosition === 1);
    ok("interestCount 1 on A", check.interestCount === 1);
    ok("debug line", formatBuyerLeadTargetDebugLine(check).includes(listingA.id));

    const statsB = getListingInterestQueueStats(
      await repo.listBuyerLeadsByListingId(listingB.id),
      listingB.id
    );
    ok("listing B still zero interest", statsB.interestCount === 0);

    const queue = await getSellerMaskedQueueForListing(
      repo,
      listingA.id,
      listingA.ownerId
    );
    ok("seller queue only on A", Array.isArray(queue) && queue.length === 1);
    if (Array.isArray(queue) && queue[0]) {
      ok("masked row no full phone", sellerMaskedQueueEntryHasNoFullPhone(queue[0]));
    }
  }
}

// --- empty seller queue returns [] not forbidden ---
{
  const empty = await getSellerMaskedQueueForListing(
    repo,
    listingB.id,
    listingB.ownerId
  );
  ok("empty listing returns array", Array.isArray(empty) && empty.length === 0);
}

// --- UI wiring ---
{
  const panel = readFileSync("src/components/leads/SellerMaskedLeadQueuePanel.tsx", "utf8");
  ok("panel hidden when checking", panel.includes('"checking"') && panel.includes('"hidden"'));
  ok("owner context prop", panel.includes("isListingOwnerContext"));
  ok("notice state not big error for empty", panel.includes("seller-lead-queue-notice"));
  ok("stats-first via api", readFileSync("src/services/leads/sellerLeadQueueApi.ts", "utf8").includes("fetchListingInterestCount"));
  ok(
    "route uses canManageListingWithScope",
    readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8").includes(
      "canManageListingWithScope"
    )
  );
  ok(
    "my listings passes owner context",
    readFileSync("src/components/MyListingsView.tsx", "utf8").includes("isListingOwnerContext")
  );
}

console.log("\nDone v5.6E.5 seller queue empty state & target lead tests.");
if (process.exitCode) process.exit(process.exitCode);
