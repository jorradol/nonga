/**
 * v22.43 — Revenue-safe real dealer staging pilot (safe automated portion)
 * npm run test:v22.43-revenue-safe-real-dealer-staging-pilot
 *
 * Read-only staging probes + doc/repo assertions. No secrets. No new listing create.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE,
  assertCanPublishDealerListingToMarketplace,
  dealerListingStatusAfterSubmit,
  isMarketplacePublicListingStatus,
} from "../src/utils/dealerListingApprovalGate.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.43-revenue-safe-real-dealer-staging-pilot.md";
const PILOT_TITLES = ["Toyota Corolla 2020", "Toyota Corolla 2021"];

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

console.log("=== v22.43 Revenue-Safe Real Dealer Staging Pilot ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc records owner approval", /Owner approval|explicitly approved/i.test(doc));
ok("doc uses nonga-dealer", /nonga-dealer/.test(doc));
ok("doc batch size 2", /Batch size: \*\*2\*\*|batchSize|Corolla 2020/.test(doc));
ok("doc pending_review", /pending_review/.test(doc));
ok("doc canonical wait copy", /รอผู้ดูแลอนุมัติ/.test(doc));
ok("doc marketplace 15", /\*\*15\*\*/.test(doc));
ok("doc rollback path", /hold|hidden|Rollback/i.test(doc));
ok("doc recommendation PASS", /\*\*PASS\*\*/.test(doc));
ok("doc lead remains OFF", /leadCaptureEnabled.*false|Lead capture.*OFF/i.test(doc));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok("submit status pending_review", dealerListingStatusAfterSubmit() === "pending_review");
ok(
  "pending not public",
  isMarketplacePublicListingStatus("pending_review") === false
);
ok(
  "dealer cannot self-approve",
  assertCanPublishDealerListingToMarketplace({
    isAdmin: false,
    isDealerScopedListing: true,
  }).ok === false
);
ok(
  "canonical waiting copy",
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE.includes("รอผู้ดูแลอนุมัติ") &&
    DEALER_SUBMITTED_FOR_REVIEW_MESSAGE.includes("ก่อนแสดงในตลาด")
);

console.log("\n--- Staging read-only ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);

  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  const list = cars.data || [];
  ok("marketplace 15", Number(cars.count) === 15, `count=${cars.count}`);

  const pilot = list.filter((c: { title?: string }) =>
    PILOT_TITLES.includes(String(c.title || ""))
  );
  ok("pilot titles public = 2", pilot.length === 2, `found=${pilot.length}`);

  let prot = 0;
  let test = 0;
  let withImages = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
    if (/TEST-v22\.|delete-me/i.test(String(c.title || ""))) test++;
    if (Array.isArray(c.images) && c.images.length > 0) withImages++;
  }
  ok("public DTO no protected fields", prot === 0);
  ok("no TEST title public", test === 0);
  ok("all listings have images", withImages === 15, `withImages=${withImages}`);

  for (const p of pilot) {
    ok(
      `pilot images ${p.title}`,
      Array.isArray(p.images) && p.images.length >= 1,
      `images=${p.images?.length ?? 0}`
    );
    ok(
      `pilot sellerType dealer ${p.title}`,
      p.sellerType === "dealer" || p.dealerSlug === "nonga-dealer"
    );
  }

  const lead = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", lead.status === 401);
} catch (e) {
  ok("staging probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.43 PASS ===");
else console.log(`\n=== v22.43 FAIL (${failures}) ===`);
