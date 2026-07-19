/**
 * Priority 3B — Four Admin Mock Workspaces Surface Cleanup guard.
 *
 * npx tsx scripts/test-admin-four-mock-workspaces-cleanup.mts
 */
import { readFileSync } from "node:fs";

const DASHBOARD_PATH = "src/components/admin/AdminDashboardView.tsx";
const ADMIN_STORE_PATH = "src/stores/admin/adminStore.ts";
const APP_STORE_PATH = "src/store.ts";

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

function extractTab(source: string, tabKey: string, nextMarker: string): string {
  const start = source.indexOf(`{adminState.activeTab === "${tabKey}" && (`);
  if (start < 0) return "";
  const end = source.indexOf(nextMarker, start);
  if (end < 0) return source.slice(start);
  return source.slice(start, end);
}

function extractSidebar(source: string): string {
  const start = source.indexOf("{/* SIDEBAR BLOCK:");
  const end = source.indexOf("{/* RENDER ACTIVE TAB AREA */}", start);
  if (start < 0) return "";
  if (end < 0) return source.slice(start);
  return source.slice(start, end);
}

console.log("=== Admin Four Mock Workspaces Cleanup Guard ===\n");

const dashboardCode = readFileSync(DASHBOARD_PATH, "utf8");
const adminStoreCode = readFileSync(ADMIN_STORE_PATH, "utf8");
const appStoreCode = readFileSync(APP_STORE_PATH, "utf8");

const usersTab = extractTab(dashboardCode, "users", "{/* TAB 3: CARS LISTING MANAGEMENT */}");
const dealersTab = extractTab(dashboardCode, "dealers", "{/* TAB 5: SUPPORT TICKETS LIST */}");
const ticketsTab = extractTab(dashboardCode, "tickets", "{/* TAB 6: CONTENT MODERATION QUEUE");
const moderationTab = extractTab(dashboardCode, "moderation", "{/* TAB 7: ADMINISTRATIVE AUDIT LOGS */}");
const sidebar = extractSidebar(dashboardCode);
const summaryTab = extractTab(dashboardCode, "dashboard", "{/* TAB 2: USER MANAGEMENT */}");

ok("users tab section found", usersTab.length > 0);
ok("dealers tab section found", dealersTab.length > 0);
ok("tickets tab section found", ticketsTab.length > 0);
ok("moderation tab section found", moderationTab.length > 0);
ok("sidebar section found", sidebar.length > 0);

ok(
  "users empty-state testid present",
  /data-testid="admin-users-real-data-empty-state"/.test(usersTab)
);
ok(
  "dealers empty-state testid present",
  /data-testid="admin-dealers-real-data-empty-state"/.test(dealersTab)
);
ok(
  "moderation empty-state testid present",
  /data-testid="admin-moderation-real-data-empty-state"/.test(moderationTab)
);
ok(
  "tickets empty-state testid present",
  /data-testid="admin-tickets-real-data-empty-state"/.test(ticketsTab)
);

ok(
  "users honest empty copy present",
  /หน้านี้ยังไม่ได้เชื่อมต่อกับแหล่งข้อมูลผู้ใช้งานจริง จึงยังไม่แสดงรายชื่อผู้ใช้งาน/.test(
    usersTab
  )
);
ok(
  "dealers honest empty copy present",
  /หน้านี้ยังไม่ได้เชื่อมต่อกับแหล่งข้อมูลดีลเลอร์จริง จึงยังไม่แสดงรายการดีลเลอร์/.test(
    dealersTab
  )
);
ok(
  "moderation honest empty copy present",
  /หน้านี้ยังไม่ได้เชื่อมต่อกับคิวรายงานจริง จึงยังไม่มีรายการให้ตรวจสอบ/.test(
    moderationTab
  )
);
ok(
  "tickets honest empty copy present",
  /หน้านี้ยังไม่ได้เชื่อมต่อกับระบบตั๋วช่วยเหลือจริง จึงยังไม่มีรายการให้ดำเนินการ/.test(
    ticketsTab
  )
);

ok(
  "users tab does not map platformUsers",
  !/platformUsers/.test(usersTab) && !/filteredUsers/.test(usersTab)
);
ok(
  "dealers tab does not map dealers",
  !/adminState\.dealers/.test(dealersTab) && !/\.dealers\.map/.test(dealersTab)
);
ok(
  "tickets tab does not map tickets",
  !/adminState\.tickets/.test(ticketsTab) && !/filteredTickets/.test(ticketsTab)
);
ok(
  "moderation tab does not map reportedItems",
  !/reportedItems/.test(moderationTab)
);

ok(
  "no Create User Simulation button/modal",
  !/จำลองสร้างบัญชีผู้ใช้บุคคล/.test(dashboardCode) &&
    !/Create User Simulation/.test(dashboardCode) &&
    !/showCreateUserModal/.test(dashboardCode) &&
    !/addPlatformUser/.test(dashboardCode)
);

ok(
  "UI does not call mock user/ticket/moderation actions",
  !/updateUserStatus/.test(dashboardCode) &&
    !/changeUserRole/.test(dashboardCode) &&
    !/bulkActionUsers/.test(dashboardCode) &&
    !/moderateReport/.test(dashboardCode) &&
    !/triggerAIModerationCheck/.test(dashboardCode) &&
    !/replyToTicket/.test(dashboardCode) &&
    !/updateTicketStatus/.test(dashboardCode) &&
    !/toggleDealerVerification/.test(dashboardCode)
);

ok(
  "sidebar has no platformUsers.length",
  !/platformUsers\.length/.test(sidebar)
);
ok(
  "sidebar has no dealers.length",
  !/dealers\.length/.test(sidebar)
);
ok(
  "sidebar has no tickets.length",
  !/tickets\.length/.test(sidebar)
);
ok(
  "sidebar has no pending reportedItems mock badge",
  !/reportedItems/.test(sidebar) && !/\d+\s*คิว/.test(sidebar)
);
ok(
  "sidebar keeps live cars.length for listings menu",
  /adminState\.cars\.length/.test(sidebar) &&
    /จดประกาศรถ \(\{adminState\.cars\.length\}\)/.test(sidebar)
);

ok(
  "dashboard summary honest metric empty state retained",
  /ยังไม่มีข้อมูลสถิติจริงสำหรับรายการนี้/.test(dashboardCode) &&
    /HONEST_METRIC_EMPTY_STATE/.test(summaryTab) &&
    /adminState\.cars\.length/.test(summaryTab)
);

// Production Foundation B2: the admin store must ship an honest empty state and
// must not bundle synthetic platform-user / ticket / report seed data.
ok(
  "admin store ships no synthetic platform seed (B2 production-clean)",
  /platformUsers:\s*\[\s*\]/.test(adminStoreCode) &&
    !/u-e102/.test(adminStoreCode) &&
    !/t-701/.test(adminStoreCode) &&
    !/rep-201/.test(adminStoreCode) &&
    !/suradech_spam100/.test(adminStoreCode)
);
ok(
  "seed dealers still present in app store (read-only)",
  /dealers:\s*\[/.test(appStoreCode) && /dealer-001/.test(appStoreCode)
);

ok(
  "four workspace tabs remain navigable",
  /setActiveTab\("users"\)/.test(sidebar) &&
    /setActiveTab\("dealers"\)/.test(sidebar) &&
    /setActiveTab\("tickets"\)/.test(sidebar) &&
    /setActiveTab\("moderation"\)/.test(sidebar)
);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
