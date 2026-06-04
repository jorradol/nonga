/**
 * v5.6I.1 / v5.6I.2 — Admin revenue dashboard preview
 * npm run test:v56i1-admin-revenue-dashboard-preview
 */
import { readFileSync } from "node:fs";
import {
  ADMIN_REVENUE_EMPTY_STATE_MESSAGE,
  ADMIN_REVENUE_ESTIMATED_PRICE_LABEL,
  ADMIN_REVENUE_PREVIEW_WARNING,
  ADMIN_REVENUE_TERM,
  assertNoBuyerPiiInRevenuePreviewText,
  assertNoCommissionWording,
  buildAdminRevenueDashboardSummary,
  buildPreviewRowFromClosedDeal,
  deriveAdminRevenuePreviewRowsFromListings,
  formatAdminScopeId,
  getAdminRevenuePreviewRows,
  previewSuccessFeeForClosedPrice,
} from "../src/services/leads/adminRevenuePreview.ts";
import {
  computeSettlementBalance,
  deriveSettlementStatus,
} from "../src/services/leads/successFeePolicy.ts";
import { SUCCESS_FEE_BUYER_FORBIDDEN_TERMS } from "../src/services/leads/successFeeCopy.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

// --- fee calculation ---
{
  ok(
    "calculate 1.2M -> 12000",
    previewSuccessFeeForClosedPrice(1_200_000) === 12_000
  );
}

// --- partial / paid balance ---
{
  const partial = computeSettlementBalance({
    feeAmount: 12_000,
    paidAmount: 5_000,
  });
  ok("partial remaining 7000", partial.remainingAmount === 7_000);
  ok(
    "partially_paid status",
    deriveSettlementStatus(partial) === "partially_paid"
  );
  const paid = computeSettlementBalance({
    feeAmount: 12_000,
    paidAmount: 12_000,
  });
  ok("paid remaining 0", paid.remainingAmount === 0);
  ok("paid status", deriveSettlementStatus(paid) === "paid");
}

// --- preview row builder ---
{
  const row = buildPreviewRowFromClosedDeal({
    id: "sf-i1-1",
    listingId: "car-1200k",
    buyerLeadId: "lead-abc",
    sellerId: "seller-xyz-owner",
    closedDealPrice: 1_200_000,
    paidAmount: 12_000,
    settlementStatus: "paid",
    adminNotePreview: "preview note",
  });
  ok("preview row built", Boolean(row));
  if (row) {
    ok("row fee 12000", row.feeAmount === 12_000);
    ok("row policy tier", row.feePolicyType === "hundred_thousand_floor_tier");
    ok("row paid status", row.settlementStatus === "paid");
    ok("row remaining 0", row.remainingAmount === 0);
  }
}

// --- summary aggregation ---
{
  const rows = [
    buildPreviewRowFromClosedDeal({
      id: "a",
      listingId: "l1",
      buyerLeadId: "lead-1",
      sellerId: "s1",
      closedDealPrice: 100_000,
    }),
    buildPreviewRowFromClosedDeal({
      id: "b",
      listingId: "l2",
      buyerLeadId: "lead-2",
      sellerId: "s2",
      closedDealPrice: 250_000,
      paidAmount: 500,
      settlementStatus: "partially_paid",
    }),
  ].filter(Boolean) as NonNullable<ReturnType<typeof buildPreviewRowFromClosedDeal>>[];
  const summary = buildAdminRevenueDashboardSummary(rows, {
    pendingSaleListingsCount: 3,
  });
  ok("summary closed deals", summary.closedDealsCount === rows.length);
  ok("summary pending sale count", summary.pendingSaleListingsCount === 3);
  ok("summary expected fee", summary.expectedServiceFeeTotal === 3_000);
}

// --- runtime rows / derive from pending_sale (v5.6I.2) ---
{
  ok("runtime preview rows empty without listings", getAdminRevenuePreviewRows().length === 0);
  const rows480 = deriveAdminRevenuePreviewRowsFromListings([
    {
      id: "car-480k",
      title: "Honda City",
      price: 480_000,
      ownerId: "owner-480",
      saleStatus: "pending_sale",
      listingStatus: "hidden",
      pendingSaleAt: "2026-06-01T10:00:00.000Z",
    },
  ]);
  ok("derives row from pending_sale", rows480.length === 1);
  ok("fee 480k -> 4000", rows480[0]?.feeAmount === 4_000);
  ok("estimated price label", rows480[0]?.priceSourceLabel === ADMIN_REVENUE_ESTIMATED_PRICE_LABEL);
  ok("status unbilled", rows480[0]?.settlementStatus === "unbilled");
  ok("paid zero", rows480[0]?.paidAmount === 0);
  ok("remaining equals fee", rows480[0]?.remainingAmount === rows480[0]?.feeAmount);

  const rows12 = deriveAdminRevenuePreviewRowsFromListings([
    {
      id: "car-12m",
      price: 1_200_000,
      ownerId: "owner-12m",
      saleStatus: "pending_sale",
    },
  ]);
  ok("fee 1.2M -> 12000", rows12[0]?.feeAmount === 12_000);

  const published = deriveAdminRevenuePreviewRowsFromListings([
    { id: "car-pub", price: 500_000, saleStatus: undefined, ownerId: "o1" },
  ]);
  ok("empty when no pending_sale", published.length === 0);

  const summary = buildAdminRevenueDashboardSummary(rows480, {
    pendingSaleListingsCount: 1,
  });
  ok("summary expected fee total", summary.expectedServiceFeeTotal === 4_000);
  ok("summary awaiting total", summary.awaitingPaymentTotal === 4_000);
  ok("summary paid zero", summary.paidTotal === 0);
}

// --- scope id mask ---
{
  ok("mask seller scope", formatAdminScopeId("seller-abcdefghij") === "sell…ghij");
}

// --- wording / PII guards ---
{
  ok("term uses service fee", ADMIN_REVENUE_TERM.includes("ค่าบริการ"));
  ok("warning no gateway", ADMIN_REVENUE_PREVIEW_WARNING.includes("payment gateway"));
  ok("empty state message", ADMIN_REVENUE_EMPTY_STATE_MESSAGE.length > 10);
  ok(
    "no commission in warning",
    assertNoCommissionWording(ADMIN_REVENUE_PREVIEW_WARNING)
  );
  const ui = readFileSync(
    "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
    "utf8"
  );
  ok("ui no invoice button", !ui.includes("ออกใบแจ้งหนี้"));
  ok("ui no payment request", !ui.toLowerCase().includes("paymentintent"));
  ok("ui no stripe", !ui.toLowerCase().includes("stripe"));
  ok("ui no save submit", !ui.includes('type="submit"'));
  ok("ui readonly badge", ui.includes("admin-revenue-readonly-badge"));
  ok("ui empty state testid", ui.includes("admin-revenue-empty-state"));
  ok("ui estimated note", ui.includes("admin-revenue-estimated-note"));
  ok("ui no buyer phone field", !ui.includes("buyerPhone"));
  ok("ui no commission word", assertNoCommissionWording(ui));
  ok("ui PII guard sample", assertNoBuyerPiiInRevenuePreviewText(ui));
}

// --- admin wire / role ---
{
  const dash = readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");
  ok(
    "revenue tab wired",
    dash.includes("AdminRevenueDashboardPreview") &&
      dash.includes('setActiveTab("revenue-preview")')
  );
  ok(
    "revenue no adminState.cars only",
    !dash.includes("listings={adminState.cars}")
  );
  ok(
    "admin/superadmin guard",
    dash.includes("showAdminRevenuePreview") &&
      dash.includes('effectiveAdminRole === "superadmin"') &&
      dash.includes('effectiveAdminRole === "admin"')
  );
  ok(
    "revenue tab panel testid",
    dash.includes("admin-revenue-preview-tab-panel")
  );
}

// --- v5.6I.3 backend API wiring ---
{
  const adminUi = readFileSync(
    "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
    "utf8"
  );
  ok("admin ui uses backend api", adminUi.includes("fetchAdminRevenuePreview"));
  ok("admin ui loading state", adminUi.includes("admin-revenue-loading"));
  ok("admin ui error state", adminUi.includes("admin-revenue-error"));
  ok("admin ui backend source attr", adminUi.includes('data-source="backend-api"'));

  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("admin revenue route", routes.includes("/api/admin/revenue/preview"));
  ok("seller revenue route", routes.includes("/api/my/revenue/preview"));
}

// --- member/dealer/buyer cannot see admin revenue ---
{
  const app = readFileSync("src/App.tsx", "utf8");
  ok("app no revenue in member views", !app.includes("AdminRevenueDashboardPreview"));
  const my = readFileSync("src/components/MyListingsView.tsx", "utf8");
  ok("my listings has seller statement", my.includes("MyRevenueStatementSection"));
  ok("my listings no admin preview", !my.includes("admin-revenue-dashboard-preview"));
  const modal = readFileSync("src/components/chat/BuyerLeadConsentModal.tsx", "utf8");
  for (const term of SUCCESS_FEE_BUYER_FORBIDDEN_TERMS) {
    ok(`buyer modal no ${term}`, !modal.includes(term));
  }
}

// --- no runtime write / payment ---
{
  const settlement = readFileSync(
    "src/services/leads/successFeeSettlement.ts",
    "utf8"
  );
  ok(
    "settlement still flag gated",
    settlement.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED")
  );
  const routes = readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8");
  ok(
    "outcome route no fee persist",
    !routes.includes("createSuccessFeeRecordDraft")
  );
  ok("routes no payment gateway", !routes.includes("successFeePayment"));
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.1-admin-revenue-dashboard-preview.md",
    "utf8"
  );
  ok("doc preview only", doc.includes("Preview"));
  ok("doc no payment", doc.includes("ยังไม่เปิด payment"));
  ok("doc audit before write", doc.includes("audit"));
}

console.log("\nDone v5.6I.1 admin revenue dashboard preview tests.");
if (process.exitCode) process.exit(process.exitCode);
