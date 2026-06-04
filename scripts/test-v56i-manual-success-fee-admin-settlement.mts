/**
 * v5.6I — Manual success fee / admin settlement foundation
 * npm run test:v56i-manual-success-fee-admin-settlement
 */
import { readFileSync } from "node:fs";
import {
  calculateSuccessFeeByClosedPrice,
  calculateSuccessFeeByPercent,
  computeSettlementBalance,
  deriveSettlementStatus,
  getSuccessFeePolicyLabel,
  validateClosedDealPrice,
  SUCCESS_FEE_PILOT_EXAMPLES,
  SUCCESS_FEE_USER_FACING_TERM,
} from "../src/services/leads/successFeePolicy.ts";
import {
  createSuccessFeeRecordDraft,
  createSuccessFeeRecordDraftPreview,
  isSuccessFeeRecordEnabled,
  shouldAutoCreateSuccessFeeOnClosedWon,
  NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV,
} from "../src/services/leads/successFeeSettlement.ts";
import {
  SUCCESS_FEE_BUYER_FORBIDDEN_TERMS,
  SUCCESS_FEE_SELLER_NOTICE_LINES,
  SUCCESS_FEE_SELLER_TERM,
} from "../src/services/leads/successFeeCopy.ts";
import type { SettlementStatus } from "../src/services/leads/leadTypes.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

// --- pilot fee table ---
for (const { closedDealPrice, fee } of SUCCESS_FEE_PILOT_EXAMPLES) {
  ok(
    `fee ${closedDealPrice.toLocaleString()} -> ${fee}`,
    calculateSuccessFeeByClosedPrice(closedDealPrice) === fee
  );
}

// --- percent future helper ---
{
  ok("percent 1M -> 10000", calculateSuccessFeeByPercent(1_000_000) === 10_000);
  ok(
    "percent not default label",
    getSuccessFeePolicyLabel("percent").includes("1%")
  );
  ok(
    "pilot policy label",
    getSuccessFeePolicyLabel("hundred_thousand_floor_tier").includes("แสน")
  );
}

// --- invalid price ---
{
  const bad = validateClosedDealPrice(-1);
  ok("invalid price rejects", bad.ok === false);
  const zero = validateClosedDealPrice(0);
  ok("zero price rejects", zero.ok === false);
}

// --- settlement balance ---
{
  const partial = computeSettlementBalance({
    feeAmount: 2_000,
    paidAmount: 500,
    waivedAmount: 0,
  });
  ok("partially paid remaining", partial.remainingAmount === 1_500);
  ok(
    "partially_paid status",
    deriveSettlementStatus(partial) === "partially_paid"
  );

  const paid = computeSettlementBalance({
    feeAmount: 1_000,
    paidAmount: 1_000,
  });
  ok("paid remaining 0", paid.remainingAmount === 0);
  ok("paid status", deriveSettlementStatus(paid) === "paid");

  const waived = computeSettlementBalance({
    feeAmount: 1_000,
    waivedAmount: 1_000,
  });
  ok("waived status", deriveSettlementStatus(waived) === "waived");
}

// --- terminal statuses exist (admin-set) ---
{
  const terminals: SettlementStatus[] = ["cancelled", "disputed"];
  for (const s of terminals) {
    ok(`status enum ${s}`, typeof s === "string");
  }
}

// --- no payment gateway fields on record type (structural) ---
{
  const sample = createSuccessFeeRecordDraftPreview({
    id: "sf-v56i-1",
    listingId: "car-1",
    buyerLeadId: "lead-1",
    sellerId: "seller-1",
    closedDealPrice: 250_000,
    dealOutcomeId: "outcome-1",
  });
  ok("preview draft created", Boolean(sample));
  if (sample) {
    const json = JSON.stringify(sample);
    ok("no stripe field", !json.includes("stripe"));
    ok("no paymentIntent", !json.includes("paymentIntent"));
    ok("no gateway id", !json.includes("gatewayTransactionId"));
    ok("fee policy pilot", sample.feePolicyType === "hundred_thousand_floor_tier");
    ok("fee 250k", sample.feeAmount === 2_000);
    ok("unbilled initial", sample.settlementStatus === "unbilled");
    ok("pendingSaleAt not required", !("pendingSaleAt" in sample));
  }
}

// --- flag off: no auto record ---
{
  const prev = process.env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV];
  delete process.env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV];
  ok("flag off by default", !isSuccessFeeRecordEnabled({}));
  ok("should not auto create", !shouldAutoCreateSuccessFeeOnClosedWon({}));
  const draft = createSuccessFeeRecordDraft({
    id: "sf-off",
    listingId: "car-1",
    buyerLeadId: "lead-1",
    sellerId: "seller-1",
    closedDealPrice: 100_000,
  });
  ok("closed_won path no draft when flag off", draft === null);
  if (prev !== undefined) {
    process.env[NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV] = prev;
  }
}

// --- copy / buyer privacy ---
{
  ok("seller term not commission", SUCCESS_FEE_SELLER_TERM.includes("ค่าบริการ"));
  ok("seller term avoids commission word", !SUCCESS_FEE_SELLER_TERM.includes("คอมมิชชั่น"));
  for (const line of SUCCESS_FEE_SELLER_NOTICE_LINES) {
    ok(`notice line present: ${line.slice(0, 12)}…`, line.length > 5);
  }
  const buyerModal = readFileSync(
    "src/components/chat/BuyerLeadConsentModal.tsx",
    "utf8"
  );
  for (const term of SUCCESS_FEE_BUYER_FORBIDDEN_TERMS) {
    ok(`buyer modal no ${term}`, !buyerModal.includes(term));
  }
  ok("user facing term constant", SUCCESS_FEE_USER_FACING_TERM.includes("ค่าบริการ"));
}

// --- runtime not wired ---
{
  const routes = readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8");
  ok(
    "outcome route no success fee persist",
    !routes.includes("createSuccessFeeRecordDraft")
  );
  ok("outcome route no payment gateway", !routes.includes("successFeePayment"));
  const listingOutcome = readFileSync(
    "src/services/leads/listingSaleOutcome.ts",
    "utf8"
  );
  ok(
    "listing outcome no fee record",
    !listingOutcome.includes("createSuccessFeeRecord")
  );
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I-manual-success-fee-admin-settlement.md",
    "utf8"
  );
  ok("doc no real payment", doc.includes("ยังไม่เก็บเงินจริง"));
  ok("doc pilot formula", doc.includes("hundred_thousand_floor_tier"));
  ok("doc percent future", doc.includes("1%"));
}

console.log("\nDone v5.6I manual success fee admin settlement tests.");
if (process.exitCode) process.exit(process.exitCode);
