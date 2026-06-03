/**
 * v5.6B — AI Sales Lead Engine foundation tests (pure policy, no Firestore/Gemini)
 * npm run test:v56b-lead-engine-foundation
 */
import {
  applySuspiciousBuyerReportPolicy,
  assertOutcomeUiLabelPolicy,
  canRelistAfterSaleCancelled,
  canRevealNextLeadForListing,
  getNextLeadOutcomeRequiredMessage,
  hasTerminalLeadContactOutcome,
  isLeadBlockingNextReveal,
  maskBuyerContact,
  normalizeLeadOutcomeLabel,
  shouldHideListingFromMarketplace,
  LEAD_OUTCOME_UI_LABELS,
} from "../src/services/leads/leadPolicy.ts";
import type { BuyerLeadRevealState } from "../src/services/leads/leadTypes.ts";
import {
  calculateSuccessFeeByTier,
  computeSettlementBalance,
  deriveSettlementStatus,
  SUCCESS_FEE_TIER_EXAMPLES,
} from "../src/services/leads/successFeePolicy.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function lead(
  partial: Partial<BuyerLeadRevealState> & Pick<BuyerLeadRevealState, "id" | "listingId">
): BuyerLeadRevealState {
  return {
    contactRevealStatus: "locked",
    status: "consented",
    ...partial,
  };
}

const LISTING = "listing-abc";

// --- reveal: one at a time per listing ---
{
  const leads: BuyerLeadRevealState[] = [
    lead({
      id: "l1",
      listingId: LISTING,
      contactRevealStatus: "revealed",
    }),
    lead({ id: "l2", listingId: LISTING, contactRevealStatus: "locked" }),
  ];
  ok("reveal blocked while first lead awaiting outcome", !canRevealNextLeadForListing(leads, LISTING));
  ok("first lead blocks next reveal", isLeadBlockingNextReveal(leads[0]!));
}

{
  const leads: BuyerLeadRevealState[] = [
    lead({
      id: "l1",
      listingId: LISTING,
      contactRevealStatus: "revealed",
      leadContactOutcome: "no_progress",
    }),
    lead({ id: "l2", listingId: LISTING, contactRevealStatus: "locked" }),
  ];
  ok("reveal allowed after terminal outcome on prior lead", canRevealNextLeadForListing(leads, LISTING));
  ok("no_progress is terminal", hasTerminalLeadContactOutcome(leads[0]!));
}

{
  const leads: BuyerLeadRevealState[] = [
    lead({ id: "l1", listingId: LISTING, contactRevealStatus: "locked" }),
    lead({ id: "l2", listingId: LISTING, contactRevealStatus: "locked" }),
  ];
  ok("reveal allowed when none active", canRevealNextLeadForListing(leads, LISTING));
}

ok(
  "outcome required message is non-empty",
  getNextLeadOutcomeRequiredMessage().includes("อัปเดตผลการติดต่อ")
);

// --- UI label: ไม่ได้ไปต่อ not ไม่จบ ---
{
  const noProgressLabel = normalizeLeadOutcomeLabel("no_progress");
  ok('no_progress label is "ไม่ได้ไปต่อ"', noProgressLabel === "ไม่ได้ไปต่อ");
  ok('policy rejects label "ไม่จบ"', !assertOutcomeUiLabelPolicy("ไม่จบ"));
  ok('policy accepts "ไม่ได้ไปต่อ"', assertOutcomeUiLabelPolicy(noProgressLabel));
  ok(
    "LEAD_OUTCOME_UI_LABELS never uses ไม่จบ",
    !Object.values(LEAD_OUTCOME_UI_LABELS).includes("ไม่จบ")
  );
}

// --- marketplace hide / relist ---
ok("pending_sale hides from marketplace", shouldHideListingFromMarketplace("pending_sale"));
ok("sold hides from marketplace", shouldHideListingFromMarketplace("sold"));
ok("published visible", !shouldHideListingFromMarketplace("published"));
ok("sale_cancelled can relist", canRelistAfterSaleCancelled("sale_cancelled"));
ok(
  "sale_cancelled not hidden by pending/sold rule",
  !shouldHideListingFromMarketplace("sale_cancelled")
);

// --- success fee tiers ---
for (const { maxClosePrice, fee } of SUCCESS_FEE_TIER_EXAMPLES) {
  ok(`tier fee at ${maxClosePrice}`, calculateSuccessFeeByTier(maxClosePrice) === fee);
}
ok("tier at 100_001", calculateSuccessFeeByTier(100_001) === 1_000);
ok("tier at 1", calculateSuccessFeeByTier(1) === 500);

// --- suspicious report: no auto penalty ---
{
  const result = applySuspiciousBuyerReportPolicy({
    reason: "scam_behavior",
    buyerLeadId: "lead-x",
  });
  ok("suspicious report: no auto penalty", result.autoPenaltyApplied === false);
  ok("suspicious report: admin review required", result.requiresAdminReview === true);
}

// --- mask contact ---
{
  const masked = maskBuyerContact({
    displayName: "สมชาย",
    contactPhone: "0812345678",
  });
  ok("masked phone hides middle digits", masked.phoneMasked && masked.contactPhone.includes("5678"));
  ok("masked name differs from raw", masked.nameMasked);
  const revealed = maskBuyerContact({
    displayName: "สมชาย",
    contactPhone: "0812345678",
    revealContact: true,
  });
  ok("revealed shows full phone", revealed.contactPhone === "0812345678");
}

// --- settlement balance (foundation) ---
{
  const balance = computeSettlementBalance({
    feeAmount: 1_000,
    amountReceived: 400,
    amountWaived: 0,
  });
  ok("partial payment outstanding", balance.outstanding === 600);
  ok("partially_paid status", deriveSettlementStatus(balance) === "partially_paid");
}

console.log("\nDone v5.6B lead engine foundation tests.");
if (process.exitCode) process.exit(process.exitCode);
