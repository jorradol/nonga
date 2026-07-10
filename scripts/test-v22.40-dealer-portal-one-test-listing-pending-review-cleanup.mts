/**
 * v22.40 — Dealer Portal one TEST listing → pending review → hold → cleanup (safe automated portion)
 * npm run test:v22.40-dealer-portal-one-test-listing-pending-review-cleanup
 *
 * Does NOT create listings / mint tokens / require owner secrets.
 * Asserts gates, copy, and live staging read-only safety after the controlled run.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE,
  DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE,
  dealerListingStatusAfterSubmit,
  isMarketplacePublicListingStatus,
  assertCanPublishDealerListingToMarketplace,
} from "../src/utils/dealerListingApprovalGate.ts";
import { isVisibleOnMarketplace } from "../src/server/marketplaceInventory.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import { toUserFacingMessage } from "../src/utils/userFacingErrors.ts";
import { inventoryListingStatusVariant } from "../src/components/shared/ListingStatusBadge.tsx";

const STAGING = "https://a.nongbot.org";
const DOC =
  "docs/v22.40-dealer-portal-one-test-listing-pending-review-cleanup.md";
const TEST_TITLE = "TEST-v22.40-nonga-dealer-delete-me";

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

console.log("=== v22.40 Dealer Portal One TEST Listing Pending Review Cleanup ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc names nonga-dealer", /nonga-dealer/.test(doc));
ok("doc uses ยังไม่ลงขาย path", /ยังไม่ลงขาย/.test(doc));
ok("doc forbids admin Draft Inventory", /Did \*\*not\*\* use admin Draft Inventory|admin Draft Inventory used\? \|\s*\*\*No\*\*/i.test(doc));
ok("doc records pending_review", /pending_review/.test(doc));
ok("doc records hold", /พักไว้ก่อน|admin-hold|listingStatus.*hidden/i.test(doc));
ok("doc marketplace 13", /Marketplace.*\*\*13\*\*|marketplace.*\*\*13\*\*|Marketplace final \|\s*\*\*13\*\*/i.test(doc));
ok("doc recommendation NEED REVIEW or PASS or HOLD", /\*\*(PASS|NEED REVIEW|HOLD)\*\*/.test(doc));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "submit status pending_review",
  dealerListingStatusAfterSubmit() === "pending_review"
);
ok(
  "pending_review not marketplace public",
  isMarketplacePublicListingStatus("pending_review") === false
);
ok(
  "hidden not marketplace public",
  isMarketplacePublicListingStatus("hidden") === false
);
ok(
  "canonical success waits for approval",
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE.includes("รอผู้ดูแลอนุมัติ") &&
    DEALER_SUBMITTED_FOR_REVIEW_MESSAGE.includes("ก่อนแสดงในตลาด") &&
    !/ลงตลาดสำเร็จ|ขึ้นตลาดแล้ว|แสดงในตลาดแล้ว/.test(
      DEALER_SUBMITTED_FOR_REVIEW_MESSAGE
    )
);
ok(
  "safe system-not-ready message",
  DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE.includes("ยังไม่พร้อมส่งรายการ")
);
ok(
  "raw admin token error mapped",
  toUserFacingMessage(
    "Missing admin API token for server mode",
    DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE
  ) === DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE
);
ok(
  "dealer cannot self-approve",
  assertCanPublishDealerListingToMarketplace({
    isAdmin: false,
    isDealerScopedListing: true,
  }).ok === false
);
ok(
  "badge pending-review",
  inventoryListingStatusVariant("pending_review") === "pending-review"
);

const draftsUi = read("src/components/dealer-portal/DealerDraftsPage.tsx");
ok(
  "dealer drafts page wires publishDealerDraft",
  draftsUi.includes("publishDealerDraft")
);
ok(
  "dealer drafts page uses pending approval success copy",
  draftsUi.includes("รอผู้ดูแลอนุมัติ") && draftsUi.includes("ก่อนแสดงในตลาด")
);
ok("dealer drafts page title is ยังไม่ลงขาย", draftsUi.includes("ยังไม่ลงขาย"));

const layout = read("src/components/dealer-portal/DealerPortalLayout.tsx");
ok(
  "nav label ยังไม่ลงขาย → /dealer/drafts",
  layout.includes("ยังไม่ลงขาย") && layout.includes("/dealer/drafts")
);

const adminPending = read("src/components/admin/AdminPendingListingsView.tsx");
ok("admin pending has พักไว้ก่อน", adminPending.includes("พักไว้ก่อน"));
ok("admin pending holds via holdAdminPendingListing", adminPending.includes("holdAdminPendingListing"));

const pending = {
  id: "car-v2240-pending",
  title: TEST_TITLE,
  brand: "Toyota",
  model: "Yaris",
  year: 2020,
  price: 1,
  type: "used" as const,
  condition: "มือสอง",
  mileage: 1,
  fuelType: "petrol",
  images: [],
  description: "TEST",
  ownerId: "owner-nonga-dealer",
  ownerName: "Synthetic",
  ownerPhone: "0810000000",
  showroomName: "Synthetic",
  dealerId: "nonga-dealer",
  isSold: false,
  listingStatus: "pending_review" as const,
  createdAt: "2026-07-10T00:00:00.000Z",
  vin: "X",
  licensePlateFull: "1กข1",
};
ok("pending not marketplace visible", isVisibleOnMarketplace(pending) === false);
ok(
  "hidden not marketplace visible",
  isVisibleOnMarketplace({ ...pending, listingStatus: "hidden" }) === false
);
const dto = toPublicMarketplaceCarDto({
  ...pending,
  listingStatus: "published",
}) as unknown as Record<string, unknown>;
ok("public DTO omits ownerId", !("ownerId" in dto));
ok("public DTO omits dealerId", !("dealerId" in dto));

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
  let thorImages = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
    if (new RegExp(TEST_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(String(c.title || "")) ||
      /delete-me/i.test(String(c.title || ""))) {
      test++;
    }
    if (Array.isArray(c.images) && c.images.length > 0) thorImages++;
  }
  ok("public DTO no protected fields", prot === 0);
  ok("no TEST title public", test === 0);
  ok("listings with images preserved", thorImages === 13, `withImages=${thorImages}`);
  const lead = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", lead.status === 401);
} catch (e) {
  ok("staging probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.40 PASS ===");
else console.log(`\n=== v22.40 FAIL (${failures}) ===`);
