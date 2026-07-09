/**
 * v22.35 — Controlled live TEST dealer posting (owner-browser packet)
 * npm run test:v22.35-controlled-live-test-dealer-posting-owner-browser
 *
 * STAGING ONLY / TEST DATA ONLY / LEAD CAPTURE OFF
 * - Read-only live staging probes (health, cars, unauth lead)
 * - Unit/policy proofs for pending → approve/hold → public DTO → cleanup
 * - Does NOT write live listings (owner signed-in browser required for that)
 * - Does NOT set NONGA_LEAD_CAPTURE_ENABLED=true
 * - Does NOT create real leads or dealer-facing sends
 */
import fs from "node:fs";
import path from "node:path";
import {
  assertCanPublishDealerListingToMarketplace,
  dealerListingStatusAfterSubmit,
  isPendingOwnerReview,
} from "../src/utils/dealerListingApprovalGate.ts";
import { isVisibleOnMarketplace } from "../src/server/marketplaceInventory.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import {
  DEALER_PENDING_REVIEW_GUIDANCE_TH,
  inventoryListingStatusVariant,
} from "../src/components/shared/ListingStatusBadge.tsx";
import { resolveViewFromPathname } from "../src/utils/appRouteSync.ts";

const STAGING = "https://a.nongbot.org";
const TEST_TITLE =
  "ทดสอบระบบประกาศ - ห้ามติดต่อจริง / TEST OWNER PREVIEW - DO NOT CONTACT";
const TEST_ID = "car-test-owner-browser-v2235";

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

async function getJson(url: string): Promise<{ status: number; json: any }> {
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function postJson(
  url: string,
  body: unknown
): Promise<{ status: number; json: any }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

console.log("=== v22.35 Controlled Live TEST Dealer Posting (Owner-Browser) ===\n");
console.log("TEST title:", TEST_TITLE);
console.log("Live write: NOT performed by this script (owner browser session required)\n");

// --- Policy / UI proofs (no live write) ---
ok(
  "submit status pending_review",
  dealerListingStatusAfterSubmit() === "pending_review" &&
    isPendingOwnerReview("pending_review")
);
ok(
  "dealer cannot self-approve",
  assertCanPublishDealerListingToMarketplace({
    isAdmin: false,
    isDealerScopedListing: true,
  }).ok === false
);
ok(
  "admin can approve",
  assertCanPublishDealerListingToMarketplace({
    isAdmin: true,
    isDealerScopedListing: true,
  }).ok === true
);
ok(
  "badge รออนุมัติ",
  inventoryListingStatusVariant("pending_review") === "pending-review" &&
    DEALER_PENDING_REVIEW_GUIDANCE_TH.includes("ยังไม่แสดงในตลาด")
);
ok(
  "route /admin/pending-listings",
  resolveViewFromPathname("/admin/pending-listings") === "admin-pending-listings"
);
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);

const pendingCar = {
  id: TEST_ID,
  title: TEST_TITLE,
  brand: "TEST Toyota",
  model: "Preview",
  year: 2021,
  price: 199000,
  type: "used" as const,
  condition: "มือสอง",
  mileage: 12000,
  fuelType: "petrol",
  images: [`https://example.test/listings/${TEST_ID}/placeholder.jpg`],
  description:
    "TEST / OWNER BROWSER ONLY — fake listing. ห้ามติดต่อจริง. No real PII.",
  ownerId: "owner-test-dealer-v2235",
  ownerName: "Synthetic Test Dealer",
  ownerPhone: "0810000000",
  showroomName: "Synthetic Test Showroom",
  dealerId: "test-dealer-v2235",
  province: "กรุงเทพมหานคร",
  isSold: false,
  listingStatus: "pending_review" as const,
  createdAt: "2026-07-09T00:00:00.000Z",
  vin: "TESTVINSHOULDNOTLEAK",
  licensePlateFull: "1กข1234",
};

ok("pending not marketplace-visible", isVisibleOnMarketplace(pendingCar) === false);

const published = { ...pendingCar, listingStatus: "published" as const };
ok("published marketplace-visible", isVisibleOnMarketplace(published) === true);

const held = { ...pendingCar, listingStatus: "hidden" as const };
ok("hold/hidden not marketplace-visible", isVisibleOnMarketplace(held) === false);

const dto = toPublicMarketplaceCarDto(published) as unknown as Record<
  string,
  unknown
>;
ok("public DTO omits ownerId", !("ownerId" in dto));
ok("public DTO omits dealerId", !("dealerId" in dto));
ok("public DTO omits vin", !("vin" in dto));
ok("public DTO omits licensePlateFull", !("licensePlateFull" in dto));
ok(
  "public DTO clears ownerPhone",
  !dto.ownerPhone || String(dto.ownerPhone).trim() === ""
);
ok(
  "public DTO dealerDisplayName",
  typeof dto.dealerDisplayName === "string" &&
    String(dto.dealerDisplayName).length > 0
);
ok(
  "public DTO sellerDisplayName",
  typeof dto.sellerDisplayName === "string" &&
    String(dto.sellerDisplayName).length > 0
);
ok("public DTO sellerType", dto.sellerType === "dealer");

const inventoryUi = read("src/components/dealer-portal/DealerInventoryPage.tsx");
const draftsUi = read("src/components/dealer-portal/DealerDraftsPage.tsx");
const adminUi = read("src/components/admin/AdminPendingListingsView.tsx");
const adminApi = read("src/services/admin/adminListingReviewApi.ts");
const docPath = "docs/v22.35-controlled-live-test-dealer-posting-owner-browser.md";
ok("doc exists", fs.existsSync(path.resolve(process.cwd(), docPath)));
ok(
  "dealer inventory blocks self-unhide while pending",
  inventoryUi.includes('listingStatus === "pending_review"') &&
    inventoryUi.includes("รออนุมัติ")
);
ok(
  "drafts toast pending copy",
  draftsUi.includes("ส่งประกาศเข้ารออนุมัติแล้ว") &&
    draftsUi.includes("ยังไม่แสดงในตลาด")
);
ok(
  "admin UI approve + hold",
  adminUi.includes("อนุมัติขึ้นตลาด") && adminUi.includes("พักไว้ก่อน")
);
ok(
  "admin API Firebase session headers",
  adminApi.includes("getFirebaseAuthHeaders") &&
    adminApi.includes("/api/admin/listings/pending-review") &&
    adminApi.includes("/approve") &&
    adminApi.includes("/hold")
);
ok(
  "doc has owner-browser checklist",
  read(docPath).includes("Owner-browser checklist") ||
    read(docPath).includes("## Owner-browser checklist")
);

// --- Live staging read-only ---
console.log("\n--- Staging read-only probes ---\n");
try {
  const health = await getJson(`${STAGING}/api/health`);
  ok("staging health ok", health.status === 200 && health.json?.ok === true);
  ok(
    "leadCaptureEnabled false",
    health.json?.leadCaptureEnabled === false,
    String(health.json?.leadCaptureEnabled)
  );
  ok(
    "publicSignupEnabled false",
    health.json?.publicSignupEnabled === false,
    String(health.json?.publicSignupEnabled)
  );

  const cars = await getJson(`${STAGING}/api/cars`);
  const list = Array.isArray(cars.json?.data) ? cars.json.data : [];
  const count = Number(cars.json?.count ?? list.length);
  ok("marketplace count 13", count === 13, `count=${count}`);

  let protectedHits = 0;
  let nonemptyPhone = 0;
  let displayNames = 0;
  let thor = 0;
  let thorImg = 0;
  let testInMarket = 0;
  for (const c of list) {
    for (const p of [
      "ownerId",
      "dealerId",
      "vin",
      "licensePlateFull",
      "phone",
      "address",
    ]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) protectedHits += 1;
    }
    if (c.ownerPhone && String(c.ownerPhone).trim()) nonemptyPhone += 1;
    if (c.dealerDisplayName || c.sellerDisplayName) displayNames += 1;
    if (String(c.id || "").startsWith("car-import-")) {
      thor += 1;
      const imgs = Array.isArray(c.images)
        ? c.images
        : String(c.images || "")
            .split(/\s+/)
            .filter(Boolean);
      if (imgs[0]) thorImg += 1;
    }
    if (
      /TEST OWNER PREVIEW|ทดสอบระบบประกาศ|DO NOT CONTACT/i.test(
        String(c.title || "")
      )
    ) {
      testInMarket += 1;
    }
  }
  ok("public DTO no protected fields", protectedHits === 0, `hits=${protectedHits}`);
  ok("public ownerPhone empty", nonemptyPhone === 0, `n=${nonemptyPhone}`);
  ok(
    "display names present",
    displayNames === count,
    `${displayNames}/${count}`
  );
  ok("Thor imports present", thor === 3, `thor=${thor}`);
  ok("Thor images present", thorImg === 3, `thorImg=${thorImg}`);
  ok(
    "no TEST title in marketplace (pre-owner-browser)",
    testInMarket === 0,
    `testInMarket=${testInMarket}`
  );

  const lead = await postJson(`${STAGING}/api/buyer-leads`, {
    listingId: "x",
  });
  ok("unauth buyer-lead 401", lead.status === 401, `status=${lead.status}`);

  const htmlRes = await fetch(STAGING + "/");
  const html = await htmlRes.text();
  const asset = html.match(/assets\/(index-[^"]+\.js)/)?.[1] ?? "unknown";
  ok(
    "hosting asset index-APBJgg5j.js (or current staging)",
    asset.includes("index-"),
    asset
  );
  console.log("staging_hosting_asset", asset);
  console.log("staging_marketplace_count", count);
  console.log("staging_test_titles_in_market", testInMarket);
} catch (e) {
  ok("staging probes reachable", false, String(e));
}

console.log("\n--- Owner-browser live steps (manual; not executed here) ---");
console.log("1. Sign in as invite dealer on https://a.nongbot.org");
console.log("2. Dealer Portal → Drafts → create TEST title → ลงขาย");
console.log("3. Confirm badge รออนุมัติ; marketplace still 13");
console.log("4. Sign in as owner/admin → /admin/pending-listings");
console.log("5. Approve or Hold; verify marketplace; cleanup/hide");
console.log("6. Keep lead capture OFF; no real lead / dealer send\n");

if (failures === 0) {
  console.log("=== v22.35 automated checks PASS ===");
  console.log(
    "LIVE OWNER-BROWSER SUBMIT/APPROVE: pending owner signed-in session (see doc)"
  );
} else {
  console.log(`=== v22.35 automated checks FAIL (${failures}) ===`);
}
