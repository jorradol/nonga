/**
 * v22.41 — Staging roll v22.39 dealer pending-review copy proof
 * npm run test:v22.41-staging-roll-v2239-dealer-pending-review-copy-proof
 *
 * Read-only staging probes + repo/doc assertions. No listing create. No secrets.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE,
  DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE,
} from "../src/utils/dealerListingApprovalGate.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import { toUserFacingMessage } from "../src/utils/userFacingErrors.ts";

const STAGING = "https://a.nongbot.org";
const HOSTING = "https://nonga-ce93c.web.app";
const DOC = "docs/v22.41-staging-roll-v2239-dealer-pending-review-copy-proof.md";
const NEW_REV = "nonga-staging-00192-6th";
const NEW_ASSET = "index-CHSJ9MTc.js";

let failures = 0;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) {
    failures += 1;
    process.exitCode = 1;
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

console.log("=== v22.41 Staging Roll Dealer Pending-Review Copy Proof ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc records prior NEED REVIEW", /NEED REVIEW/.test(doc));
ok("doc records new Cloud Run revision", doc.includes(NEW_REV));
ok("doc records new Hosting asset", doc.includes(NEW_ASSET));
ok("doc says no new listing", /No new listing this packet|None\./i.test(doc));
ok("doc recommendation PASS", /\*\*PASS\*\*/.test(doc));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "canonical success copy",
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE.includes("รอผู้ดูแลอนุมัติ") &&
    DEALER_SUBMITTED_FOR_REVIEW_MESSAGE.includes("ก่อนแสดงในตลาด")
);
ok(
  "safe system-not-ready",
  DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE.includes("ยังไม่พร้อมส่งรายการ")
);
ok(
  "raw token mapped",
  toUserFacingMessage(
    "Missing admin API token for server mode",
    DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE
  ) === DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE
);

const draftsUi = read("src/components/dealer-portal/DealerDraftsPage.tsx");
ok(
  "dealer drafts toast uses canonical waiting copy",
  draftsUi.includes("รอผู้ดูแลอนุมัติ") && draftsUi.includes("ก่อนแสดงในตลาด")
);

console.log("\n--- Staging / Hosting read-only ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);

  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  const list = cars.data || [];
  ok("marketplace 13", Number(cars.count) === 13, `count=${cars.count}`);
  let prot = 0;
  let test = 0;
  let withImages = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
    if (/TEST-v22\.40|TEST-v22\.41|delete-me/i.test(String(c.title || ""))) {
      test++;
    }
    if (Array.isArray(c.images) && c.images.length > 0) withImages++;
  }
  ok("public DTO no protected fields", prot === 0);
  ok("no TEST title public", test === 0);
  ok("images preserved", withImages === 13, `withImages=${withImages}`);

  const lead = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", lead.status === 401);

  const html = await (await fetch(`${HOSTING}/`, { cache: "no-store" })).text();
  ok("hosting html points to new asset", html.includes(NEW_ASSET));
  ok("hosting html not old asset", !html.includes("index-APBJgg5j.js"));

  const js = await (
    await fetch(`${HOSTING}/assets/${NEW_ASSET}`, { cache: "no-store" })
  ).text();
  ok("hosting asset size sane", js.length > 1_000_000, `len=${js.length}`);
  ok(
    "live hosting has canonical copy",
    js.includes(DEALER_SUBMITTED_FOR_REVIEW_MESSAGE)
  );
  ok(
    "live hosting has system-not-ready Thai",
    js.includes(DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE)
  );
  ok("live hosting has รออนุมัติ", js.includes("รออนุมัติ"));
  ok("live hosting has ยังไม่ลงขาย", js.includes("ยังไม่ลงขาย"));
} catch (e) {
  ok("staging/hosting probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.41 PASS ===");
else console.log(`\n=== v22.41 FAIL (${failures}) ===`);
