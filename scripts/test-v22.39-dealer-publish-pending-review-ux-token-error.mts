/**
 * v22.39 — Dealer publish pending-review UX + hide admin-token error
 * npm run test:v22.39-dealer-publish-pending-review-ux-token-error
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE,
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE,
  assertCanPublishDealerListingToMarketplace,
  dealerListingStatusAfterSubmit,
} from "../src/utils/dealerListingApprovalGate.ts";
import { isVisibleOnMarketplace } from "../src/server/marketplaceInventory.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import { toUserFacingMessage } from "../src/utils/userFacingErrors.ts";
import { inventoryListingStatusVariant } from "../src/components/shared/ListingStatusBadge.tsx";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.39-dealer-publish-pending-review-ux-token-error.md";

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

console.log("=== v22.39 Dealer Publish Pending UX + Token Error ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "submit status pending_review",
  dealerListingStatusAfterSubmit() === "pending_review"
);
ok(
  "success message waits for approval",
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
  "raw admin token error mapped to safe Thai",
  toUserFacingMessage(
    "Missing admin API token for server mode",
    DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE
  ) === DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE
);
ok(
  "invalid admin token mapped to safe Thai",
  toUserFacingMessage(
    "Invalid admin token (NONGA_ADMIN_API_TOKEN): empty",
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

const pending = {
  id: "car-v2239-pending",
  title: "TEST pending",
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
const dto = toPublicMarketplaceCarDto({
  ...pending,
  listingStatus: "published",
}) as unknown as Record<string, unknown>;
ok("public DTO omits ownerId", !("ownerId" in dto));
ok("public DTO omits dealerId", !("dealerId" in dto));

const draftInv = read("src/components/admin/DealerDraftInventoryView.tsx");
const draftsUi = read("src/components/dealer-portal/DealerDraftsPage.tsx");
const userFacing = read("src/utils/userFacingErrors.ts");
const gate = read("src/utils/dealerListingApprovalGate.ts");

ok(
  "draft inventory uses Firebase session headers async",
  draftInv.includes("adminAuthHeadersAsync") &&
    !draftInv.includes("adminAuthHeaders()")
);
ok(
  "draft inventory maps errors via toUserFacingError",
  draftInv.includes("toUserFacingError") &&
    draftInv.includes("DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE")
);
ok(
  "draft inventory success uses pending-review message",
  draftInv.includes("DEALER_SUBMITTED_FOR_REVIEW_MESSAGE") &&
    draftInv.includes("รออนุมัติ")
);
ok(
  "draft inventory does not claim live marketplace success",
  !/ลงตลาดสำเร็จ/.test(draftInv)
);
ok(
  "dealer drafts success mentions pending approval",
  draftsUi.includes("รอผู้ดูแลอนุมัติ") &&
    draftsUi.includes("ก่อนแสดงในตลาด")
);
ok(
  "userFacingErrors catches Missing admin API token",
  userFacing.includes("Missing admin API token for server mode")
);
ok(
  "gate exports system-not-ready constant",
  gate.includes("DEALER_PUBLISH_SYSTEM_NOT_READY_MESSAGE")
);

console.log("\n--- Staging read-only ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);
  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  const list = cars.data || [];
  // Post-v22.43 pilot baseline is 15 (13 Thor + 2 nonga-dealer Corollas)
  ok(
    "marketplace baseline >=13",
    Number(cars.count) >= 13,
    `count=${cars.count}`
  );
  let prot = 0;
  let test = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
    if (/TEST-v22\.37|delete-me/i.test(String(c.title || ""))) test++;
  }
  ok("public DTO no protected fields", prot === 0);
  ok("no TEST title public", test === 0);
  const lead = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", lead.status === 401);
} catch (e) {
  ok("staging probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.39 PASS ===");
else console.log(`\n=== v22.39 FAIL (${failures}) ===`);
