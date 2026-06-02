/**
 * v5.4.7f — report listing + admin review
 * npm run test:v547-report-listing-admin-review
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createListingReportRepository,
  type ListingReportReason,
} from "../src/server/repositories/listingReportRepository.ts";
import {
  buildListingPatchForAdminReportAction,
  buildListingPatchForNewReport,
} from "../src/server/listingModeration.ts";
import { isVisibleOnMarketplace, type MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.4.7f report listing + admin review ===\n");

// 1) File repo behavior (minimal metadata + required reason)
const repo = createListingReportRepository("file");
const reason: ListingReportReason = "incorrect-info";
const created = await repo.create({
  listingId: "car-1",
  listingTitle: "Toyota Camry",
  reason,
  note: "ข้อมูลบางจุดไม่ตรง",
  reporterRole: "guest",
});
ok("report-created", created.status === "open" && created.listingId === "car-1", created.reportId);
ok("report-reason-required", created.reason === reason, created.reason);

const listedOpen = await repo.list("open");
ok("admin-list-open-reports", listedOpen.length >= 1, String(listedOpen.length));

const reviewed = await repo.update(created.reportId, {
  status: "reviewed",
  reviewedBy: "admin-1",
  reviewedAt: new Date().toISOString(),
});
ok("admin-mark-reviewed", reviewed?.status === "reviewed", reviewed?.status ?? "");

const dismissed = await repo.update(created.reportId, {
  status: "dismissed",
  reviewedBy: "admin-1",
});
ok("admin-dismiss", dismissed?.status === "dismissed", dismissed?.status ?? "");

const actioned = await repo.update(created.reportId, {
  status: "actioned",
  adminNote: "hide listing temporarily",
});
ok("admin-actioned-hide", actioned?.status === "actioned", actioned?.status ?? "");

const createReportPatch = buildListingPatchForNewReport(2) as Record<string, unknown>;
ok("create-report-does-not-hide-listing", !("listingStatus" in createReportPatch), "");
ok("create-report-sets-under-review", createReportPatch.moderationStatus === "under_review", "");

const hidePatch = buildListingPatchForAdminReportAction({
  action: "hide",
  nextStatus: "actioned",
  openReports: 0,
  reviewedAt: new Date().toISOString(),
  reviewer: "admin-1",
  adminNote: "reported",
}) as Record<string, unknown>;
ok("admin-hide-sets-listing-hidden", hidePatch.listingStatus === "hidden", "");

// 2) Hidden listing disappears from marketplace
const hiddenCar: MarketplaceCarRecord = {
  id: "car-hidden",
  title: "Hidden Car",
  brand: "Toyota",
  model: "Camry",
  year: 2020,
  price: 900000,
  type: "used",
  condition: "ดี",
  mileage: 100000,
  fuelType: "petrol",
  images: [],
  description: "",
  ownerId: "owner-1",
  ownerName: "o",
  ownerPhone: "",
  isSold: false,
  listingStatus: "hidden",
  createdAt: new Date().toISOString(),
};
ok("hidden-listing-not-visible", isVisibleOnMarketplace(hiddenCar) === false, "");

// 3) Public DTO should not leak report/admin/seller-consent metadata
const publicDto = toPublicMarketplaceCarDto({
  ...hiddenCar,
  listingStatus: "published",
  sellerConsentAccepted: true,
  sellerConsentAcceptedAt: new Date().toISOString(),
  sellerConsentVersion: "pilot-v1",
  sellerConsentSource: "chat-publish",
  sellerConsentTextKey: "seller-publish-consent-v1",
  moderationStatus: "under_review",
  adminHiddenBy: "admin-1",
  adminHiddenAt: new Date().toISOString(),
  adminHiddenReason: "reported",
  reportOpenCount: 2,
} as MarketplaceCarRecord) as unknown as Record<string, unknown>;
ok("public-no-seller-consent", !("sellerConsentAccepted" in publicDto), "");
ok("public-no-admin-metadata", !("adminHiddenBy" in publicDto) && !("reportOpenCount" in publicDto), "");

// 4) Source checks for routes and admin guard
const serverTs = readFileSync(resolve(process.cwd(), "server.ts"), "utf8");
ok("public-report-route-exists", serverTs.includes('app.post("/api/cars/:id/report"'), "");
ok("admin-report-list-route-exists", serverTs.includes('app.get("/api/admin/listing-reports"'), "");
ok("admin-report-patch-route-exists", serverTs.includes('app.patch("/api/admin/listing-reports/:id"'), "");
ok("admin-guard-before-admin-routes", serverTs.includes('app.use("/api/admin", adminApiAuth);'), "");
ok("report-reason-validated", serverTs.includes("LISTING_REPORT_REASONS"), "");
ok("report-message-safe-copy", serverTs.includes("การรายงานเป็นการแจ้งให้ตรวจสอบ"), "");

const appTsx = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
ok("admin-review-view-route", appTsx.includes('case "admin-reports"'), "");
const adminDash = readFileSync(resolve(process.cwd(), "src/components/admin/AdminDashboardView.tsx"), "utf8");
ok("admin-entry-point", adminDash.includes('setView("admin-reports")'), "");

// 5) Public report UX entry points on card/detail
const marketplaceView = readFileSync(resolve(process.cwd(), "src/components/MarketplaceView.tsx"), "utf8");
const detailView = readFileSync(resolve(process.cwd(), "src/components/cars/details/CarDetailsView.tsx"), "utf8");
ok("marketplace-report-action", marketplaceView.includes("รายงานประกาศ"), "");
ok("detail-report-action", detailView.includes("รายงานประกาศ"), "");

console.log("\n=== v5.4.7f report listing + admin review — done ===\n");

assert(process.exitCode !== 1, "some checks failed");

