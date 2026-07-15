/**
 * Priority 3 — Admin Dashboard Summary must not show misleading mock metrics.
 *
 * npm run test:admin-dashboard-no-mock-metrics
 */
import { readFileSync } from "node:fs";

const DASHBOARD_PATH = "src/components/admin/AdminDashboardView.tsx";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function extractDashboardSummaryTab(source: string): string {
  const start = source.indexOf('{adminState.activeTab === "dashboard" && (');
  if (start < 0) return "";
  const end = source.indexOf('{/* TAB 2: USER MANAGEMENT */}', start);
  if (end < 0) return source.slice(start);
  return source.slice(start, end);
}

console.log("=== Admin Dashboard No Mock Metrics Guard ===\n");

const dashboardCode = readFileSync(DASHBOARD_PATH, "utf8");
const summaryTab = extractDashboardSummaryTab(dashboardCode);

ok("dashboard summary tab section found", summaryTab.length > 0);

ok("no mock user total 1475", !/\b1[, ]?475\b/.test(summaryTab));
ok("no mock growth rate 14.5%", !/14\.5\s*%/.test(summaryTab));
ok("no mock reservation value 345000", !/345[, ]?000/.test(summaryTab));

ok(
  "no mock growthTrendData fixture",
  !/growthTrendData/.test(dashboardCode)
);
ok(
  "no mock aiRequestData fixture",
  !/aiRequestData/.test(dashboardCode)
);

ok(
  "no Revenue/Traffic mock chart mount in summary",
  !/<AreaChart/.test(summaryTab) &&
    !/<ResponsiveContainer/.test(summaryTab) &&
    !/Marketplace Revenue & Traffic/.test(summaryTab)
);

ok(
  "no AI Chat/CarVision mock chart mount in summary",
  !/<BarChart/.test(summaryTab) &&
    !/CarVision Analyzer/.test(summaryTab)
);

ok(
  "no Top Performing claim without real source",
  !/Top Performing/i.test(summaryTab) &&
    !/ความนิยมสูงสุด/.test(summaryTab) &&
    !/adminState\.cars\.slice\(0,\s*3\)/.test(summaryTab)
);

ok(
  "no static active dealer count widget in summary",
  !/ดีลเลอร์แอคทีฟ/.test(summaryTab) &&
    !/adminState\.dealers\.length\s*\}\s*ดีลเลอร์/.test(summaryTab)
);

ok(
  "no mock analytics totals in summary",
  !/adminState\.analytics/.test(summaryTab)
);

ok(
  "live cars count bound to adminState.cars.length",
  /adminState\.cars\.length/.test(summaryTab) &&
    !/\b15\s*คัน/.test(summaryTab)
);

ok(
  "honest empty state present for unavailable metrics",
  /ยังไม่มีข้อมูลสถิติจริงสำหรับรายการนี้/.test(dashboardCode) &&
    /HONEST_METRIC_EMPTY_STATE/.test(summaryTab)
);

ok(
  "Owner Helper not imported on dashboard",
  !/OwnerFirebaseTokenHelperPanel/.test(dashboardCode)
);

ok(
  "Owner Helper not mounted on dashboard",
  !/<OwnerFirebaseTokenHelperPanel/.test(dashboardCode)
);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
