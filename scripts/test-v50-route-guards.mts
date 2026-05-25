import { chromium, type Browser, type Page } from "playwright";

type TestRole =
  | "guest"
  | "member"
  | "premium"
  | "dealer"
  | "admin"
  | "superadmin";

type TestUser = ReturnType<typeof buildUser>;

const BASE_URL = process.env.NONGA_TEST_BASE_URL || "http://localhost:3000";

function buildUser(
  uid: string,
  role: Exclude<TestRole, "guest">,
  extra: Record<string, unknown> = {}
) {
  return {
    uid,
    email: `${uid}@test.local`,
    displayName: `${role} test`,
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
    providerId: "password",
    isSimulated: true,
    role,
    status: "active",
    membershipType:
      role === "dealer"
        ? "dealer"
        : role === "premium"
          ? "pro"
          : role === "admin" || role === "superadmin"
            ? "enterprise"
            : "free",
    postLimit: role === "member" ? 5 : 999999,
    totalPosts: 0,
    favoriteCars: [],
    ...(role === "dealer"
      ? { dealerId: "thor-auto", showroomName: "Thor Auto Demo" }
      : {}),
    ...extra,
  };
}

async function openPage(browser: Browser, session: TestUser | null) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(({ session }) => {
    if (session) {
      localStorage.setItem("nonga_auth_session", JSON.stringify(session));
      localStorage.setItem(
        "nonga_simulated_users",
        JSON.stringify({ [session.uid]: session })
      );
      return;
    }
    localStorage.removeItem("nonga_auth_session");
    localStorage.removeItem("nonga_simulated_users");
  }, { session });
  return page;
}

async function expectBodyContains(page: Page, path: string, expected: string) {
  await page.goto(`${BASE_URL}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes(expected)) {
    throw new Error(`Expected ${path} to contain "${expected}"`);
  }
}

async function run() {
  console.log("=== Nong A v5.0 Route Guard Smoke ===");
  console.log(BASE_URL);

  const browser = await chromium.launch({ headless: true });
  try {
    let page = await openPage(browser, null);
    await expectBodyContains(
      page,
      "/dealer",
      "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ"
    );
    console.log("PASS guest dealer guard");

    page = await openPage(browser, buildUser("member-route", "member"));
    await expectBodyContains(
      page,
      "/dealer",
      "บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ"
    );
    console.log("PASS member dealer guard");

    page = await openPage(browser, buildUser("premium-route", "premium"));
    await expectBodyContains(
      page,
      "/dealer",
      "บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ"
    );
    console.log("PASS premium dealer guard");

    page = await openPage(browser, buildUser("dealer-route", "dealer"));
    await expectBodyContains(page, "/dealer", "ศูนย์จัดการเต็นท์");
    console.log("PASS dealer portal access");

    page = await openPage(browser, buildUser("dealer-admin-route", "dealer"));
    await expectBodyContains(
      page,
      "/admin/inventory-import",
      "บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบครับ"
    );
    console.log("PASS dealer admin guard");

    page = await openPage(browser, buildUser("admin-route", "admin"));
    await expectBodyContains(page, "/admin/inventory-import", "นำเข้าคลังรถ");
    console.log("PASS admin access");

    page = await openPage(browser, buildUser("superadmin-route", "superadmin"));
    await expectBodyContains(page, "/admin/inventory-import", "นำเข้าคลังรถ");
    console.log("PASS superadmin access");

    page = await openPage(
      browser,
      buildUser("suspended-route", "dealer", { status: "suspended" })
    );
    await expectBodyContains(
      page,
      "/dealer",
      "บัญชีนี้ถูกระงับการใช้งานครับ กรุณาติดต่อผู้ดูแลระบบ"
    );
    console.log("PASS suspended guard");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
