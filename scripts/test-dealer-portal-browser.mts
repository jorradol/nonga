/**
 * Dealer Portal checklist — ต้องมี dev server ที่ http://localhost:3000
 * npx playwright install chromium
 * npx tsx scripts/test-dealer-portal-browser.mts
 */
import { chromium, type Page, type ConsoleMessage, type Response } from "playwright";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DEALER_UID = "dealer-thor-auto";
const MEMBER_UID = "sim-member-test";

type Result = { id: string; pass: boolean; detail: string };

const results: Result[] = [];

function record(id: string, pass: boolean, detail = "") {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL", id, detail ? `— ${detail}` : "");
}

async function seedDealerSession(page: Page) {
  const session = {
    uid: DEALER_UID,
    email: "thor.dealer@test.local",
    displayName: "Thor Auto Test",
    photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=ThorDealer",
    providerId: "password",
    isSimulated: true,
    role: "dealer",
    membershipType: "dealer",
    dealerId: "thor-auto",
    postLimit: 999999,
    totalPosts: 0,
    favoriteCars: [] as string[],
    aiPersona: "Professional",
  };
  const profile = {
    ...session,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    premiumExpireDate: null,
    showroomName: "Thor Auto (ธอร์ ออโต้)",
  };
  await page.addInitScript(
    ({ sess, prof, uid }) => {
      localStorage.setItem("nonga_auth_session", JSON.stringify(sess));
      localStorage.setItem(
        "nonga_simulated_users",
        JSON.stringify({ [uid]: prof })
      );
    },
    { sess: session, prof: profile, uid: DEALER_UID }
  );
}

async function seedMemberSession(page: Page) {
  const session = {
    uid: MEMBER_UID,
    email: "member.test@local",
    displayName: "Member Test",
    providerId: "password",
    isSimulated: true,
    role: "member",
    membershipType: "free",
    postLimit: 5,
    totalPosts: 0,
    favoriteCars: [] as string[],
  };
  const profile = {
    ...session,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
  await page.addInitScript(
    ({ sess, prof, uid }) => {
      localStorage.setItem("nonga_auth_session", JSON.stringify(sess));
      localStorage.setItem(
        "nonga_simulated_users",
        JSON.stringify({ [uid]: prof })
      );
    },
    { sess: session, prof: profile, uid: MEMBER_UID }
  );
}

async function main() {
  console.log("=== Dealer Portal Browser Checklist ===\n", BASE);

  try {
    const ping = await fetch(BASE);
    record("0-server-up", ping.ok, `status=${ping.status}`);
  } catch (e) {
    record("0-server-up", false, String(e));
    printSummary();
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  // --- Dealer flow ---
  const dealerContext = await browser.newContext();
  const dealerPage = await dealerContext.newPage();
  dealerPage.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!t.includes("favicon") && !t.includes("404")) {
        consoleErrors.push(t.slice(0, 200));
      }
    }
  });
  dealerPage.on("response", (res: Response) => {
    const url = res.url();
    if (
      res.status() >= 400 &&
      url.includes(BASE) &&
      !url.includes("favicon") &&
      !url.endsWith(".map")
    ) {
      networkErrors.push(`${res.status()} ${url.slice(0, 120)}`);
    }
  });

  await seedDealerSession(dealerPage);
  await dealerPage.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });

  // 1 Login / session loaded
  const loginBtn = dealerPage.getByRole("button", { name: /เข้าสู่ระบบ|Login/i });
  const hasLoginCta = await loginBtn.isVisible().catch(() => false);
  record(
    "1-login-session",
    !hasLoginCta,
    hasLoginCta ? "ยังเห็นปุ่มเข้าสู่ระบบ" : "มี session dealer แล้ว"
  );

  // 2 role dealer — เปิดโปรไฟล์หรือตรวจจาก DOM
  await dealerPage.goto(`${BASE}/dealer`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  const portalBlocked = await dealerPage
    .getByText(/เฉพาะบัญชี Dealer/)
    .isVisible()
    .catch(() => false);
  record("2-role-dealer", !portalBlocked, portalBlocked ? "ถูกบล็อก" : "เข้า portal ได้");

  // 3 Header Dealer Portal link (ในเมนูโปรไฟล์)
  const avatar = dealerPage.locator("header button").filter({ has: dealerPage.locator("img") }).first();
  if (await avatar.isVisible().catch(() => false)) {
    await avatar.click();
  } else {
    const anyProfile = dealerPage.getByRole("button").filter({ hasText: /โปรไฟล์|Profile/i }).first();
    if (await anyProfile.isVisible().catch(() => false)) await anyProfile.click();
  }
  const dealerLink = dealerPage.getByText(/Dealer Portal \(คลังรถ\)/i);
  record(
    "3-header-dealer-link",
    await dealerLink.isVisible().catch(() => false),
    "เมนูโปรไฟล์"
  );
  if (await dealerLink.isVisible().catch(() => false)) {
    await dealerLink.click();
    await dealerPage.waitForTimeout(800);
  }

  // 4 /dealer URL
  await dealerPage.goto(`${BASE}/dealer`, { waitUntil: "networkidle" });
  record("4-url-dealer", dealerPage.url().includes("/dealer"), dealerPage.url());

  // 5 menus
  const menuChecks: [string, RegExp][] = [
    ["โปรไฟล์เต็นท์", /โปรไฟล์/i],
    ["รถในตลาด", /รถในตลาด/i],
    ["Draft", /Draft/i],
    ["รถซ้ำ", /รถซ้ำ/i],
    ["นำเข้าไฟล์", /นำเข้า/i],
  ];
  for (const [label, re] of menuChecks) {
    const visible = await dealerPage.getByRole("button", { name: re }).first().isVisible().catch(() => false);
    record(`5-menu-${label}`, visible);
  }

  // 6 refresh session
  await dealerPage.reload({ waitUntil: "networkidle" });
  const stillPortal = !(await dealerPage
    .getByText(/เฉพาะบัญชี Dealer/)
    .isVisible()
    .catch(() => false));
  const stillDealerNav = await dealerPage
    .getByRole("button", { name: /รถในตลาด/i })
    .first()
    .isVisible()
    .catch(() => false);
  record(
    "6-refresh-session",
    stillPortal && stillDealerNav,
    stillPortal ? "portal+nav ok" : "session หลุดหลัง refresh"
  );

  await dealerContext.close();

  // --- Member isolation ---
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await seedMemberSession(memberPage);
  await memberPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await memberPage.waitForTimeout(2500);
  await memberPage.goto(`${BASE}/dealer`, { waitUntil: "domcontentloaded" });
  await memberPage.waitForTimeout(1500);
  const memberBlocked = await memberPage
    .getByText(/เฉพาะบัญชี Dealer/)
    .isVisible()
    .catch(() => false);
  const memberDealerSidebar = await memberPage
    .locator("aside")
    .getByRole("button", { name: /^รถในตลาด$/i })
    .isVisible()
    .catch(() => false);
  const memberDealerPortalTitle = await memberPage
    .locator("aside")
    .getByText(/^Dealer Portal$/i)
    .isVisible()
    .catch(() => false);
  record(
    "7-non-dealer-blocked",
    memberBlocked && !memberDealerSidebar && !memberDealerPortalTitle,
    memberBlocked
      ? "เห็นข้อความปิดกั้น ไม่มี sidebar dealer"
      : "อาจเข้า portal ได้"
  );
  await memberContext.close();

  // 8 console / network (dealer run)
  const criticalConsole = consoleErrors.filter(
    (e) =>
      !e.includes("Firestore") &&
      !e.includes("firebase") &&
      !e.includes("GEMINI") &&
      !e.includes("Content Security Policy")
  );
  record(
    "8-console-errors",
    criticalConsole.length === 0,
    criticalConsole.length ? criticalConsole.slice(0, 3).join(" | ") : "none"
  );
  const apiNet = networkErrors.filter((n) => n.includes("/api/dealer"));
  record(
    "8-network-dealer-api",
    apiNet.length === 0,
    apiNet.length ? apiNet.slice(0, 3).join(" | ") : "ok"
  );

  await browser.close();
  printSummary();
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

function printSummary() {
  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}`, r.id, r.detail);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
