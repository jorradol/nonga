/**
 * v5.6I.3b — Revenue statement refresh reliability after cancel pending sale
 * npm run test:v56i3b-revenue-statement-refresh-reliability
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
const api = readFileSync("src/services/leads/myRevenuePreviewApi.ts", "utf8");

const cancelHandler =
  my.match(/const handleCancelPendingSale = async[\s\S]*?^\  \};$/m)?.[0] ?? "";

// --- root cause: stale in-flight fetch + ordering ---
{
  ok(
    "revenue effect ignores stale responses",
    revenue.includes("let active = true") && revenue.includes("active = false")
  );
  ok(
    "revenue hides body while refreshing",
    revenue.includes("refreshing") && revenue.includes("showBody")
  );
  ok(
    "cancel bumps signal after load and fetchCars",
    /await refreshListingsAndRevenue\(\)/.test(cancelHandler) ||
      /await load\(\);[\s\S]*await fetchCars\(\);[\s\S]*setRevenueRefreshSignal\(Date\.now\(\)\)/.test(
        cancelHandler
      )
  );
  ok(
    "refresh signal uses timestamp nonce",
    my.includes("setRevenueRefreshSignal(Date.now())")
  );
}

// --- explicit revenue refetch trigger ---
{
  ok("pass refreshSignal prop", my.includes("refreshSignal={revenueRefreshSignal}"));
  ok(
    "section refetches on refreshSignal change",
    revenue.includes("[scope, refreshSignal]")
  );
  ok(
    "fetch passes refreshSignal for cache bust",
    revenue.includes("fetchMyRevenuePreview(scope, refreshSignal)")
  );
  ok("api adds _rs query", api.includes("_rs="));
}

// --- UX ---
{
  ok("updating message testid", revenue.includes("my-revenue-updating"));
  ok(
    "updating message copy",
    revenue.includes("กำลังอัปเดตยอดค่าบริการ")
  );
  ok("no browser reload", !my.includes("location.reload"));
}

// --- failure guard ---
{
  ok(
    "fail path does not bump refresh signal",
    !/catch \(e\)[\s\S]*setRevenueRefreshSignal/.test(cancelHandler)
  );
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.3b-revenue-statement-refresh-reliability.md",
    "utf8"
  );
  ok("doc mentions stale fetch", doc.toLowerCase().includes("stale"));
  ok("doc frontend only", doc.includes("frontend"));
}

console.log("\nDone v5.6I.3b revenue statement refresh reliability tests.");
if (process.exitCode) process.exit(process.exitCode);
