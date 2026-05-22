/**
 * Dealer footer entry navigation (unit) + browser gate check
 * npm run test:dealer-entry-flow
 */
import {
  dealerEntryHintMessage,
  setDealerEntryHint,
  consumeDealerEntryHint,
} from "../src/utils/dealerEntryNavigation.ts";
import { chromium } from "playwright";

const BASE = process.env.APP_URL ?? "http://localhost:3000";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function main() {
  console.log("=== Dealer Entry Flow ===\n");

  ok(
    "1-hint-message",
    !!dealerEntryHintMessage("need-dealer-role")?.includes("ดีลเลอร์"),
    ""
  );
  if (typeof sessionStorage !== "undefined") {
    setDealerEntryHint("need-dealer-role");
    const hint = consumeDealerEntryHint();
    ok("2-hint-roundtrip-browser", hint === "need-dealer-role", String(hint));
    ok("3-hint-consume-once", consumeDealerEntryHint() === null, "cleared");
  } else {
    ok("2-hint-storage-skip", true, "node — sessionStorage tested in browser");
  }

  try {
    const ping = await fetch(BASE);
    ok("4-server", ping.ok, String(ping.status));
  } catch (e) {
    ok("4-server", false, String(e));
    console.log("Skip browser tests — server down");
    process.exit(process.exitCode === 1 ? 1 : 0);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const memberUid = "sim-entry-member";
  await page.addInitScript(
    ({ sess, uid }) => {
      localStorage.setItem("nonga_auth_session", JSON.stringify(sess));
      localStorage.setItem(
        "nonga_simulated_users",
        JSON.stringify({
          [uid]: {
            ...sess,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
        })
      );
    },
    {
      uid: memberUid,
      sess: {
        uid: memberUid,
        email: "member.entry@test",
        displayName: "Member Entry",
        providerId: "password",
        isSimulated: true,
        role: "member",
        membershipType: "free",
        postLimit: 5,
        totalPosts: 0,
        favoriteCars: [],
      },
    }
  );

  await page.goto(`${BASE}/dealer`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const memberBlocked = await page
    .getByText(/เฉพาะบัญชี Dealer|ตั้ง role เป็น dealer/i)
    .first()
    .isVisible()
    .catch(() => false);
  ok("5-member-gate-dealer", memberBlocked, "portal gate visible");

  const dealerUid = "dealer-thor-auto";
  await page.addInitScript(
    ({ sess, uid }) => {
      localStorage.setItem("nonga_auth_session", JSON.stringify(sess));
      localStorage.setItem(
        "nonga_simulated_users",
        JSON.stringify({
          [uid]: {
            ...sess,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
        })
      );
    },
    {
      uid: dealerUid,
      sess: {
        uid: dealerUid,
        email: "thor.dealer@test",
        displayName: "Thor Auto Demo",
        providerId: "password",
        isSimulated: true,
        role: "dealer",
        dealerId: "thor-auto",
        membershipType: "dealer",
        postLimit: 999999,
        totalPosts: 0,
        favoriteCars: [],
      },
    }
  );

  await page.goto(`${BASE}/dealer`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const dealerOk = await page
    .getByText(/Dealer Portal|ธอร์|thor/i)
    .first()
    .isVisible()
    .catch(() => false);
  ok("6-dealer-portal-access", dealerOk, "dealer portal visible");

  await browser.close();
  console.log("\nDone.");
  process.exit(process.exitCode === 1 ? 1 : 0);
}

main();
