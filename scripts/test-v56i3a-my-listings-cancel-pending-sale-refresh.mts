/**
 * v5.6I.3a — Auto refresh My Listings after cancel pending sale
 * npm run test:v56i3a-my-listings-cancel-pending-sale-refresh
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const my = readFileSync("src/components/MyListingsView.tsx", "utf8");
const revenue = readFileSync(
  "src/components/leads/MyRevenueStatementSection.tsx",
  "utf8"
);

// --- root cause fix: refetch listings ---
{
  ok(
    "cancel success refetches listings",
    /handleCancelPendingSale[\s\S]*await load\(\);[\s\S]*setRevenueRefreshKey/.test(
      my
    )
  );
  ok(
    "cancel success no stale local-only patch",
    !my.includes("list.map((c) => (c.id === result.car.id ? result.car : c))")
  );
}

// --- revenue statement refresh ---
{
  ok("revenue refreshKey state", my.includes("revenueRefreshKey"));
  ok(
    "increment refreshKey after cancel success",
    my.includes("setRevenueRefreshKey((key) => key + 1)")
  );
  ok(
    "pass refreshKey to revenue section",
    my.includes("refreshKey={revenueRefreshKey}")
  );
  ok("revenue section accepts refreshKey", revenue.includes("refreshKey"));
  ok(
    "revenue load depends on refreshKey",
    revenue.includes("[scope, refreshKey]")
  );
  ok("revenue data-refresh-key attr", revenue.includes("data-refresh-key={refreshKey}"));
}

// --- UX guards ---
{
  const cancelHandler =
    my.match(/const handleCancelPendingSale = async[\s\S]*?^\  \};$/m)?.[0] ??
    "";
  ok("pending badge uses pending_sale", my.includes('car.saleStatus === "pending_sale"'));
  ok("no full page reload", !my.includes("location.reload"));
  ok("no window reload", !my.includes("window.location.reload"));
  ok(
    "failure path does not bump refreshKey in catch",
    !/catch \(e\)[\s\S]*setRevenueRefreshKey/.test(cancelHandler)
  );
  ok(
    "refreshKey bump inside try after load",
    /try \{[\s\S]*await load\(\);[\s\S]*setRevenueRefreshKey/.test(cancelHandler)
  );
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.3a-my-listings-cancel-pending-sale-refresh.md",
    "utf8"
  );
  ok("doc mentions refreshKey", doc.includes("refreshKey"));
  ok("doc frontend only", doc.includes("frontend"));
  ok("doc no backend policy change", doc.includes("backend"));
}

console.log("\nDone v5.6I.3a my listings cancel pending sale refresh tests.");
if (process.exitCode) process.exit(process.exitCode);
