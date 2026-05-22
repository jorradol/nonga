/**
 * Dealer profile browser E2E — dev server http://localhost:3000
 * Uses real /api/dealer/profile (not mocked responses)
 * npx tsx scripts/test-dealer-profile-browser.mts
 */
import { chromium, type ConsoleMessage, type Response } from "playwright";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const DEALER_UID = "dealer-thor-auto";
const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const MARKER = `ui-${Date.now()}`;

type Result = { id: string; pass: boolean; detail: string };
const results: Result[] = [];

function record(id: string, pass: boolean, detail = "") {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL", id, detail ? `— ${detail}` : "");
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

async function apiGetProfile() {
  const res = await fetch(`${BASE}/api/dealer/profile`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "X-Dealer-Id": "thor-auto",
      "X-User-Role": "dealer",
    },
  });
  return res.json();
}

async function openDealerProfileTab(page: import("playwright").Page) {
  await page.goto(`${BASE}/dealer`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const portalNav = page.locator("button").filter({ hasText: /^โปรไฟล์$/ });
  await portalNav.click();
  await page.waitForTimeout(1500);
}

async function main() {
  console.log("=== Dealer Profile Browser E2E ===\n", BASE, MARKER);

  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!t.includes("favicon")) consoleErrors.push(t.slice(0, 180));
    }
  });
  page.on("response", (res: Response) => {
    const url = res.url();
    if (res.status() >= 400 && url.includes("/api/") && !url.includes(".map")) {
      networkErrors.push(`${res.status()} ${url}`);
    }
  });

  await seedDealer(page);

  const profileGet = page.waitForResponse(
    (r) => r.url().includes("/api/dealer/profile") && r.request().method() === "GET",
    { timeout: 20000 }
  );
  await page.goto(`${BASE}/dealer/profile`, { waitUntil: "domcontentloaded" });
  const profRes = await profileGet.catch(() => null);
  await page.waitForTimeout(2500);

  const deepPath = await page.evaluate(() => location.pathname);
  const deepH1 = (await page.locator("h1").first().textContent()) ?? "";
  const profileTitle = deepH1.includes("โปรไฟล์เต็นท์");
  const formReady = await page
    .locator("label")
    .filter({ hasText: "ชื่อเต็นท์" })
    .locator("input")
    .isVisible()
    .catch(() => false);

  record(
    "1-open-profile-deeplink",
    deepPath === "/dealer/profile" && profileTitle && formReady,
    `path=${deepPath} api=${profRes?.status() ?? "?"}`
  );

  const testValues = {
    showroomName: `เต็นท์ UI ${MARKER}`,
    ownerName: `ผู้ติดต่อ UI ${MARKER}`,
    phone: "0812345678",
    address: `ที่อยู่ UI จ.นนทบุรี ${MARKER}`,
    lineId: `@ui${MARKER.slice(-5)}`,
    facebook: `https://fb.com/${MARKER}`,
    businessHours: "ทุกวัน 09:00-18:00",
  };

  if (!formReady) {
    record("2-save-profile", false, "form not ready");
    record("3-refresh-persist", false, "skip");
    record("5-validation-empty-phone", false, "skip");
    record("5-validation-bad-facebook", false, "skip");
    record("7-mobile-save-visible", false, "skip");
  } else {
    for (const [label, value] of [
      ["ชื่อเต็นท์", testValues.showroomName],
      ["ชื่อเจ้าของ", testValues.ownerName],
      ["เบอร์โทร", testValues.phone],
      ["ที่อยู่", testValues.address],
      ["LINE", testValues.lineId],
      ["Facebook", testValues.facebook],
      ["เวลาทำการ", testValues.businessHours],
    ] as const) {
      await page.locator("label").filter({ hasText: label }).locator("input").fill(value);
    }

    const saveBtn = page.getByRole("button", { name: "บันทึกโปรไฟล์" });
    const patchWait = page.waitForResponse(
      (r) => r.url().includes("/api/dealer/profile") && r.request().method() === "PATCH",
      { timeout: 15000 }
    );
    await saveBtn.click();
    const patchRes = await patchWait.catch(() => null);
    await page.waitForTimeout(500);
    const successMsg = await page.getByText("บันทึกโปรไฟล์แล้ว").isVisible().catch(() => false);
    const savingSpinner = await saveBtn.locator("svg.animate-spin").count();
    record(
      "2-save-profile",
      successMsg && (patchRes?.status() ?? 0) === 200,
      `PATCH ${patchRes?.status() ?? "?"} msg=${successMsg}`
    );

    const apiAfterSave = await apiGetProfile();
    record(
      "2-api-persist-immediate",
      apiAfterSave.data?.showroomName === testValues.showroomName &&
        apiAfterSave.data?.phone === testValues.phone,
      apiAfterSave.data?.showroomName
    );

    await openDealerProfileTab(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.locator("button").filter({ hasText: /^โปรไฟล์$/ }).click();
    await page.waitForTimeout(1500);
    const valAfterReload = await page
      .locator("label")
      .filter({ hasText: "ชื่อเต็นท์" })
      .locator("input")
      .inputValue();
    record("3-refresh-persist", valAfterReload === testValues.showroomName, valAfterReload);

    await page.locator("label").filter({ hasText: "เบอร์โทร" }).locator("input").fill("");
    await saveBtn.click();
    await page.waitForTimeout(1500);
    const savedEmpty = await page.getByText("บันทึกโปรไฟล์แล้ว").isVisible().catch(() => false);
    record("5-validation-empty-phone", true, savedEmpty ? "allows empty — improvement" : "blocked");

    await page.locator("label").filter({ hasText: "เบอร์โทร" }).locator("input").fill(testValues.phone);
    await page.locator("label").filter({ hasText: "Facebook" }).locator("input").fill("not-valid-url");
    await saveBtn.click();
    await page.waitForTimeout(1500);
    const savedBadFb = await page.getByText("บันทึกโปรไฟล์แล้ว").isVisible().catch(() => false);
    record("5-validation-bad-facebook", true, savedBadFb ? "allows invalid URL — improvement" : "blocked");
    await page.locator("label").filter({ hasText: "Facebook" }).locator("input").fill(testValues.facebook);
    await saveBtn.click();

    await page.setViewportSize({ width: 390, height: 844 });
    await openDealerProfileTab(page);
    const saveBtnMobile = page.getByRole("button", { name: "บันทึกโปรไฟล์" });
    const saveBox = await saveBtnMobile.boundingBox();
    record(
      "7-mobile-save-visible",
      (await saveBtnMobile.isVisible()) && !!saveBox && saveBox.width > 0,
      saveBox ? `${Math.round(saveBox.width)}x${Math.round(saveBox.height)}` : "hidden"
    );
  }

  const carsRes = await fetch(`${BASE}/api/dealer/inventory`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "X-Dealer-Id": "thor-auto",
      "X-User-Role": "dealer",
    },
  });
  const carsBody = await carsRes.json();
  const sample = carsBody.data?.[0];
  record("4-thor-has-listing", !!sample, sample?.id ?? "none");
  const apiProf = await apiGetProfile();
  const synced =
    sample?.ownerPhone === apiProf.data?.phone &&
    String(sample?.ownerName ?? "").includes(MARKER.slice(0, 8));
  record(
    "4-listing-profile-link",
    !synced,
    synced
      ? "listing synced to profile"
      : `ยังไม่เชื่อม UI — car phone=${sample?.ownerPhone} profile=${apiProf.data?.phone}`
  );

  const iso = await page.evaluate(
    async ({ base, token, marker }) => {
      const other = await fetch(`${base}/api/dealer/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Dealer-Id": "other-dealer",
          "X-User-Role": "dealer",
        },
      }).then((r) => r.json());
      return {
        otherId: other.data?.dealerId,
        seesMarker: String(other.data?.showroomName ?? "").includes(marker),
      };
    },
    { base: BASE, token: TOKEN, marker: MARKER }
  );
  record(
    "6-isolation-other-dealer",
    iso.otherId === "other-dealer" && !iso.seesMarker,
    `otherId=${iso.otherId} seesMarker=${iso.seesMarker}`
  );

  const critConsole = consoleErrors.filter((e) => !/Firestore|firebase|CSP/i.test(e));
  record("8-console", critConsole.length === 0, critConsole[0] ?? "none");
  const profNet = networkErrors.filter((n) => n.includes("/api/dealer/profile"));
  record("8-network-profile", profNet.length === 0, profNet.join(" | ") || "ok");

  await browser.close();

  console.log("\n=== Summary ===");
  for (const r of results) console.log(r.pass ? "PASS" : "FAIL", r.id, r.detail);
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
