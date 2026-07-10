/**
 * v22.42 — Owner-browser dealer posting flow PASS closure (safe automated portion)
 * npm run test:v22.42-owner-browser-dealer-posting-flow-pass-closure
 *
 * Read-only staging probes + doc/repo assertions. No secrets. No listing create.
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
const HOSTING = "https://nonga-ce93c.web.app";
const DOC = "docs/v22.42-owner-browser-dealer-posting-flow-pass-closure.md";

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

console.log("=== v22.42 Owner-Browser Dealer Posting Flow PASS Closure ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc records owner-browser PASS", /Owner-browser PASS|owner-reported/i.test(doc));
ok("doc mentions ยังไม่ลงขาย", /ยังไม่ลงขาย/.test(doc));
ok("doc mentions รออนุมัติ", /รออนุมัติ/.test(doc));
ok("doc mentions pending-listings", /pending-listings/.test(doc));
ok("doc records cleanup to 13", /Marketplace after cleanup \|\s*\*\*13\*\*|Marketplace final \|\s*\*\*13\*\*/i.test(doc));
ok("doc has pilot prep plan only", /PLANNING ONLY|do not execute/i.test(doc));
ok("doc recommends nonga-dealer first", /nonga-dealer/.test(doc));
ok("doc keeps lead capture OFF", /Lead capture.*OFF|leadCaptureEnabled:false/i.test(doc));
ok("doc recommendation PASS", /\*\*PASS\*\*/.test(doc));
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

const adminPending = read("src/components/admin/AdminPendingListingsView.tsx");
ok("admin pending has approve", adminPending.includes("approveAdminPendingListing"));
ok("admin pending has hold", adminPending.includes("holdAdminPendingListing"));

console.log("\n--- Staging read-only ---\n");
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
  let pajeroPublic = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
    if (/TEST-v22\.|delete-me/i.test(String(c.title || ""))) test++;
    if (/Pajero/i.test(String(c.title || ""))) pajeroPublic++;
    if (Array.isArray(c.images) && c.images.length > 0) withImages++;
  }
  ok("public DTO no protected fields", prot === 0);
  ok("no TEST title public", test === 0);
  ok("owner-proof Pajero not public", pajeroPublic === 0);
  ok("images preserved", withImages === 13, `withImages=${withImages}`);
  const lead = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", lead.status === 401);
  const html = await (await fetch(`${HOSTING}/`, { cache: "no-store" })).text();
  ok("hosting still CHSJ9MTc", html.includes("index-CHSJ9MTc.js"));
} catch (e) {
  ok("staging probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.42 PASS ===");
else console.log(`\n=== v22.42 FAIL (${failures}) ===`);
