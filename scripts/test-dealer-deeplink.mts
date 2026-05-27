/**
 * Dealer portal deep links — ต้องมี dev server ที่ http://localhost:3000
 * npx tsx scripts/test-dealer-deeplink.mts
 */
import { chromium } from "playwright";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DEALER_UID = "dealer-thor-auto";
const MEMBER_UID = "sim-member-test";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function seedDealer(page: import("playwright").Page) {
  const session = {
    uid: DEALER_UID,
    email: "thor.dealer@test.local",
    displayName: "Thor Auto Test",
    providerId: "password",
    isSimulated: true,
    role: "dealer",
    dealerId: "thor-auto",
    membershipType: "dealer",
    postLimit: 999999,
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
    { sess: session, prof: profile, uid: DEALER_UID }
  );
}

async function seedMember(page: import("playwright").Page) {
  const session = {
    uid: MEMBER_UID,
    email: "member@test.local",
    displayName: "Member",
    providerId: "password",
    isSimulated: true,
    role: "member",
    membershipType: "free",
    postLimit: 5,
    totalPosts: 0,
    favoriteCars: [] as string[],
  };
  await page.addInitScript(
    ({ sess, uid }) => {
      localStorage.setItem("nonga_auth_session", JSON.stringify(sess));
      localStorage.setItem(
        "nonga_simulated_users",
        JSON.stringify({ [uid]: { ...sess, createdAt: new Date().toISOString() } })
      );
    },
    { sess: session, uid: MEMBER_UID }
  );
}

async function waitPortal(page: import("playwright").Page) {
  await page.waitForTimeout(2500);
}

async function main() {
  console.log("=== Dealer Portal Deep Link Test ===\n", BASE);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await seedDealer(page);

  const cases: { path: string; h1: RegExp; name: string }[] = [
    { path: "/dealer/profile", h1: /โปรไฟล์เต็นท์/, name: "profile" },
    { path: "/dealer/import", h1: /นำเข้า|Import|คลัง/i, name: "import" },
    { path: "/dealer", h1: /แดชบอร์ด/, name: "home" },
  ];

  for (const c of cases) {
    await page.goto(`${BASE}${c.path}`, { waitUntil: "domcontentloaded" });
    await waitPortal(page);
    const path = await page.evaluate(() => location.pathname);
    const h1 = (await page.locator("h1").first().textContent()) ?? "";
    ok(
      `deeplink-${c.name}-path`,
      path === c.path,
      `expected=${c.path} got=${path}`
    );
    ok(
      `deeplink-${c.name}-content`,
      c.h1.test(h1),
      `h1=${h1.slice(0, 40)}`
    );
  }

  await page.goto(`${BASE}/dealer`, { waitUntil: "domcontentloaded" });
  await waitPortal(page);
  await page.locator("button").filter({ hasText: /ยังไม่ลงขาย|Draft/ }).first().click();
  await page.waitForTimeout(1500);
  ok(
    "sidebar-draft-url",
    (await page.evaluate(() => location.pathname)) === "/dealer/drafts",
    await page.evaluate(() => location.pathname)
  );

  await page.goto(`${BASE}/dealer/profile`, { waitUntil: "domcontentloaded" });
  await waitPortal(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitPortal(page);
  const afterReload = await page.evaluate(() => location.pathname);
  const h1Reload = (await page.locator("h1").first().textContent()) ?? "";
  ok("refresh-profile-path", afterReload === "/dealer/profile", afterReload);
  ok("refresh-profile-content", /โปรไฟล์เต็นท์/.test(h1Reload), h1Reload.slice(0, 40));

  await ctx.close();

  const memberCtx = await browser.newContext();
  const memberPage = await memberCtx.newPage();
  await seedMember(memberPage);
  await memberPage.goto(`${BASE}/dealer/profile`, { waitUntil: "domcontentloaded" });
  await waitPortal(memberPage);
  const blocked = await memberPage
    .getByText(/เฉพาะบัญชี Dealer|บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์/)
    .isVisible()
    .catch(() => false);
  const dealerForm = await memberPage
    .locator("label")
    .filter({ hasText: "ชื่อเต็นท์" })
    .locator("input")
    .isVisible()
    .catch(() => false);
  ok(
    "member-blocked-on-profile",
    blocked && !dealerForm,
    `blocked=${blocked} form=${dealerForm}`
  );
  ok(
    "member-profile-path",
    (await memberPage.evaluate(() => location.pathname)) === "/dealer/profile",
    await memberPage.evaluate(() => location.pathname)
  );

  await browser.close();
  console.log(process.exitCode ? "\n=== FAIL ===" : "\n=== PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
