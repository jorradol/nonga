/**
 * v22.34 — Dealer pending UI + admin approval UI polish checks
 * npm run test:v22.34-dealer-pending-review-admin-approval-ui
 *
 * TEST / OWNER APPROVAL ONLY — no live write, no real lead, no dealer send.
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEALER_PENDING_REVIEW_GUIDANCE_TH,
  inventoryListingStatusVariant,
} from "../src/components/shared/ListingStatusBadge.tsx";
import {
  assertCanPublishDealerListingToMarketplace,
  dealerListingStatusAfterSubmit,
  isPendingOwnerReview,
} from "../src/utils/dealerListingApprovalGate.ts";
import { isVisibleOnMarketplace } from "../src/server/marketplaceInventory.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import { resolveViewFromPathname, resolvePathnameForView } from "../src/utils/appRouteSync.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function read(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

console.log("=== v22.34 Dealer Pending + Admin Approval UI ===\n");

ok(
  "pending badge variant",
  inventoryListingStatusVariant("pending_review") === "pending-review"
);
ok(
  "published badge variant",
  inventoryListingStatusVariant("published") === "published"
);
ok(
  "hidden badge variant",
  inventoryListingStatusVariant("hidden") === "hidden"
);
ok(
  "dealer guidance Thai",
  DEALER_PENDING_REVIEW_GUIDANCE_TH.includes("ยังไม่แสดงในตลาด")
);

ok(
  "submit still pending_review",
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

const pendingCar = {
  id: "car-ui-test-pending",
  title: "ทดสอบระบบประกาศ - ห้ามติดต่อจริง",
  brand: "Toyota",
  model: "Yaris",
  year: 2021,
  price: 1,
  type: "used" as const,
  condition: "มือสอง",
  mileage: 1,
  fuelType: "petrol",
  images: [],
  description: "TEST",
  ownerId: "owner-test-dealer-ui",
  ownerName: "Synthetic",
  ownerPhone: "0810000000",
  showroomName: "Synthetic Showroom",
  dealerId: "test-dealer-ui",
  isSold: false,
  listingStatus: "pending_review" as const,
  createdAt: "2026-07-09T00:00:00.000Z",
};
ok("pending not marketplace visible", isVisibleOnMarketplace(pendingCar) === false);
const dto = toPublicMarketplaceCarDto({
  ...pendingCar,
  listingStatus: "published",
}) as unknown as Record<string, unknown>;
ok("public DTO omits ownerId", !("ownerId" in dto));
ok("public DTO omits dealerId", !("dealerId" in dto));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);

ok(
  "route pending-listings resolves",
  resolveViewFromPathname("/admin/pending-listings") === "admin-pending-listings"
);
ok(
  "pathname for pending view",
  resolvePathnameForView("admin-pending-listings", "/") ===
    "/admin/pending-listings"
);

const inventoryUi = read("src/components/dealer-portal/DealerInventoryPage.tsx");
ok(
  "dealer inventory uses pending variant helper",
  inventoryUi.includes("inventoryListingStatusVariant")
);
ok(
  "dealer inventory shows pending guidance",
  inventoryUi.includes("DEALER_PENDING_REVIEW_GUIDANCE_TH")
);
ok(
  "dealer inventory blocks marketplace jump while pending",
  inventoryUi.includes('c.listingStatus === "pending_review"')
);

const draftsUi = read("src/components/dealer-portal/DealerDraftsPage.tsx");
ok(
  "drafts success mentions pending approval",
  draftsUi.includes("ส่งประกาศเข้ารออนุมัติแล้ว")
);

const adminUi = read("src/components/admin/AdminPendingListingsView.tsx");
ok("admin pending view exists", adminUi.includes("คิวรออนุมัติประกาศเต็นท์"));
ok("admin approve button", adminUi.includes("อนุมัติขึ้นตลาด"));
ok("admin hold button", adminUi.includes("พักไว้ก่อน"));

const adminApi = read("src/services/admin/adminListingReviewApi.ts");
ok(
  "admin API uses pending-review endpoint",
  adminApi.includes("/api/admin/listings/pending-review")
);
ok(
  "admin API uses approve endpoint",
  adminApi.includes("/api/admin/listings/") && adminApi.includes("/approve")
);
ok(
  "admin API uses hold endpoint",
  adminApi.includes("/hold")
);
ok(
  "admin API uses Firebase session headers (no token paste)",
  adminApi.includes("getFirebaseAuthHeaders")
);

const server = read("server.ts");
ok("server has hold route", server.includes('/api/admin/listings/:id/hold'));
ok(
  "server has pending-review route",
  server.includes('/api/admin/listings/pending-review')
);

const dash = read("src/components/admin/AdminDashboardView.tsx");
ok(
  "admin dashboard links pending queue",
  dash.includes('setView("admin-pending-listings")')
);

console.log("\n=== v22.34 done ===");
