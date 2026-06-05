/**
 * v5.6I.4c — Admin revenue dashboard container fit / no horizontal overflow
 * npm run test:v56i4c-admin-revenue-container-fit-no-horizontal-overflow
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const adminDash = readFileSync(
  "src/components/admin/AdminDashboardView.tsx",
  "utf8"
);
const revenue = readFileSync(
  "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
  "utf8"
);
const modal = readFileSync(
  "src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx",
  "utf8"
);
const v56i4a = readFileSync(
  "scripts/test-v56i4a-revenue-ux-refresh-admin-action-visibility.mts",
  "utf8"
);

// --- page-level containment ---
{
  ok(
    "admin dashboard root min-w-0",
    adminDash.includes("selection:bg-orange-500/30 w-full max-w-full min-w-0")
  );
  ok(
    "admin tab area overflow-x-hidden",
    adminDash.includes("overflow-x-hidden space-y-6")
  );
  ok(
    "revenue tab panel min-w-0",
    adminDash.includes('data-testid="admin-revenue-preview-tab-panel"') &&
      adminDash.includes("min-w-0 w-full max-w-full")
  );
  ok(
    "revenue section max-w-full",
    revenue.includes("w-full max-w-full min-w-0 overflow-x-hidden")
  );
  ok("no w-screen in revenue", !revenue.includes("w-screen"));
  ok("no w-screen in admin dash revenue area", !adminDash.match(/revenue-preview[\s\S]{0,200}w-screen/));
}

// --- summary responsive ---
{
  ok("summary grid testid", revenue.includes("admin-revenue-summary-grid"));
  ok(
    "summary mobile 1 col",
    revenue.includes("grid-cols-1 sm:grid-cols-2")
  );
  ok("summary cards min-w-0", revenue.includes("bg-black/30 p-3 min-w-0"));
  ok("summary label break-words", revenue.includes("break-words"));
}

// --- table scroll contained ---
{
  ok("table container", revenue.includes("admin-revenue-table-container"));
  ok(
    "table wrapper overflow-x-auto",
    revenue.includes("admin-revenue-preview-table-wrap") &&
      revenue.includes("overflow-x-auto")
  );
  ok(
    "table wrapper max-w-full min-w-0",
    revenue.includes("admin-revenue-preview-table-wrap") &&
      revenue.includes("w-full max-w-full min-w-0 overflow-x-auto")
  );
  ok("table still min-w inside wrapper", revenue.includes("min-w-[720px]"));
  ok("scroll hint retained", revenue.includes("admin-revenue-table-scroll-hint"));
}

// --- long text / ids ---
{
  ok("mobile listing id break-all", revenue.includes("font-mono break-all"));
  ok("policy footer break-words", revenue.includes("break-words min-w-0"));
  ok("warning break-words", revenue.includes("break-words min-w-0"));
}

// --- v5.6I.4a action visibility regression ---
{
  ok(
    "adjust btn under listing",
    revenue.includes("admin-revenue-adjust-btn-${row.id}")
  );
  ok(
    "mobile card adjust",
    revenue.includes("admin-revenue-adjust-btn-card-")
  );
  ok(
    "listing column header",
    revenue.includes("admin-revenue-listing-column-header")
  );
}

// --- modal no horizontal overflow (v5.6I.4b) ---
{
  ok("modal body overflow-x-hidden", modal.includes("overflow-x-hidden"));
  ok("modal no w-screen", !modal.includes("w-screen"));
}

// --- no payment / invoice ---
{
  ok("no payment gateway", !revenue.toLowerCase().includes("stripe"));
  ok("no invoice button", !revenue.includes("createInvoice"));
}

// --- no business logic change ---
{
  ok("still fetches api", revenue.includes("fetchAdminRevenuePreview"));
  ok("still post adjustment", revenue.includes("postAdminRevenueAdjustment"));
  ok(
    "v56i4a tests still reference adjust btn",
    v56i4a.includes("admin-revenue-adjust-btn")
  );
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.4c-admin-revenue-container-fit-no-horizontal-overflow.md",
    "utf8"
  );
  ok("doc frontend only", doc.includes("frontend-only"));
  ok("doc table wrapper", doc.includes("admin-revenue-preview-table-wrap"));
  ok("doc manual smoke", doc.includes("Manual smoke"));
}

console.log("\nDone v5.6I.4c admin revenue container fit tests.");
if (process.exitCode) process.exit(process.exitCode);
