/**
 * v5.6I.4a — Revenue UX refresh + admin action visibility
 * npm run test:v56i4a-revenue-ux-refresh-admin-action-visibility
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const my = readFileSync("src/components/MyListingsView.tsx", "utf8");
const queue = readFileSync(
  "src/components/leads/SellerMaskedLeadQueuePanel.tsx",
  "utf8"
);
const section = readFileSync(
  "src/components/leads/ListingLeadQueueSection.tsx",
  "utf8"
);
const revenue = readFileSync(
  "src/components/leads/MyRevenueStatementSection.tsx",
  "utf8"
);
const admin = readFileSync(
  "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
  "utf8"
);
const v56i3a = readFileSync(
  "scripts/test-v56i3a-my-listings-cancel-pending-sale-refresh.mts",
  "utf8"
);

// --- closed_won refresh wiring ---
{
  ok("panel accepts onRevenueRelevantChange", queue.includes("onRevenueRelevantChange"));
  ok(
    "closed_won calls parent refresh",
    /recordedOutcome === "closed_won"[\s\S]*onRevenueRelevantChange/.test(queue)
  );
  ok(
    "outcome handler does not reload browser",
    !queue.includes("location.reload") && !queue.includes("window.location.reload")
  );
  ok("section passes callback", section.includes("onRevenueRelevantChange={onRevenueRelevantChange}"));
  ok(
    "my listings passes refreshListingsAndRevenue",
    my.includes("onRevenueRelevantChange={refreshListingsAndRevenue}")
  );
  ok("shared refresh helper", my.includes("refreshListingsAndRevenue"));
  ok(
    "refresh helper loads listings",
    /refreshListingsAndRevenue[\s\S]*await load\(\)/.test(my)
  );
  ok(
    "refresh helper fetchCars",
    /refreshListingsAndRevenue[\s\S]*await fetchCars\(\)/.test(my)
  );
  ok(
    "refresh helper bumps revenue signal",
    /refreshListingsAndRevenue[\s\S]*setRevenueRefreshSignal\(Date\.now\(\)\)/.test(
      my
    )
  );
  ok(
    "cancel uses shared refresh helper",
    /handleCancelPendingSale[\s\S]*await refreshListingsAndRevenue\(\)/.test(my)
  );
  ok("revenue section refreshSignal deps", revenue.includes("[scope, refreshSignal]"));
  ok(
    "revenue stale guard active",
    revenue.includes("let active = true") && revenue.includes("if (!active) return")
  );
}

// --- cancel pending sale regression ---
{
  ok(
    "v56i3a cancel still refetches",
    v56i3a.includes("cancel success refetches listings")
  );
}

// --- admin action visibility ---
{
  ok(
    "adjust button near listing column",
    admin.includes("admin-revenue-adjust-btn-${row.id}") &&
      admin.includes("admin-revenue-listing-column-header")
  );
  ok(
    "adjust button not only at table end",
    !admin.match(/<th[^>]*>ปรับยอด<\/th>\s*<\/tr>\s*<\/thead>/)
  );
  ok("mobile revenue cards", admin.includes("admin-revenue-preview-cards"));
  ok(
    "mobile card adjust button",
    admin.includes("admin-revenue-adjust-btn-card-")
  );
  ok("scroll hint", admin.includes("admin-revenue-table-scroll-hint"));
  ok(
    "desktop table wrapper",
    admin.includes("admin-revenue-preview-table-wrap")
  );
  ok(
    "no payment gateway button",
    !admin.toLowerCase().includes("stripe") && !admin.includes("paymentIntent")
  );
  ok("no invoice button", !admin.includes("createInvoice"));
  ok("no extra save submit", !admin.includes('type="submit"'));

  const lastTh = admin.match(/<thead>[\s\S]*?<th[^>]*>([^<]+)<\/th>\s*<\/tr>/);
  ok(
    "last header column is audit not adjust",
    lastTh ? lastTh[1].trim() === "audit" : false,
    lastTh?.[1] ?? ""
  );
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.4a-revenue-ux-refresh-admin-action-visibility.md",
    "utf8"
  );
  ok("doc closed_won", doc.includes("closed_won"));
  ok("doc frontend only", doc.includes("frontend-only"));
  ok("doc admin action", doc.includes("ปรับยอด"));
  ok("doc no backend policy", doc.includes("policy"));
}

console.log("\nDone v5.6I.4a revenue UX refresh + admin action visibility tests.");
if (process.exitCode) process.exit(process.exitCode);
