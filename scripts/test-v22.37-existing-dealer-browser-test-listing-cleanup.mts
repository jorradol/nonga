/**
 * v22.37 — Existing dealer browser TEST listing + cleanup (safe automated portion)
 * npm run test:v22.37-existing-dealer-browser-test-listing-cleanup
 *
 * Does NOT create listings, does NOT login, does NOT require secrets.
 * Live write/submit/approve/cleanup remain owner-browser only.
 */
import fs from "node:fs";
import path from "node:path";
import { dealerListingStatusAfterSubmit } from "../src/utils/dealerListingApprovalGate.ts";
import { isVisibleOnMarketplace } from "../src/server/marketplaceInventory.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import {
  DEALER_PENDING_REVIEW_GUIDANCE_TH,
  inventoryListingStatusVariant,
} from "../src/components/shared/ListingStatusBadge.tsx";
import { resolveViewFromPathname } from "../src/utils/appRouteSync.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.37-existing-dealer-browser-test-listing-cleanup.md";
const TEST_TITLE = "TEST-v22.37-nonga-dealer-delete-me";
const EXISTING_DEALER_ID = "nonga-dealer";

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

async function get(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status };
}

console.log("=== v22.37 Existing Dealer Browser TEST Listing Cleanup ===\n");
console.log("Existing dealer only:", EXISTING_DEALER_ID);
console.log("TEST title marker:", TEST_TITLE);
console.log("Live write: NOT performed by this script\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "submit status pending_review",
  dealerListingStatusAfterSubmit() === "pending_review"
);
ok(
  "badge รออนุมัติ",
  inventoryListingStatusVariant("pending_review") === "pending-review"
);
ok(
  "pending guidance",
  DEALER_PENDING_REVIEW_GUIDANCE_TH.includes("ยังไม่แสดงในตลาด")
);
ok(
  "admin pending route",
  resolveViewFromPathname("/admin/pending-listings") ===
    "admin-pending-listings"
);

const pending = {
  id: "car-test-v2237-placeholder",
  title: TEST_TITLE,
  brand: "TEST Toyota",
  model: "Preview",
  year: 2021,
  price: 199000,
  type: "used" as const,
  condition: "มือสอง",
  mileage: 12000,
  fuelType: "petrol",
  images: [],
  description: "TEST ONLY — delete me",
  ownerId: `owner-${EXISTING_DEALER_ID}`,
  ownerName: "Nong A Staging Dealer",
  ownerPhone: "0810000000",
  showroomName: "Nong A Staging Dealer",
  dealerId: EXISTING_DEALER_ID,
  isSold: false,
  listingStatus: "pending_review" as const,
  createdAt: "2026-07-10T00:00:00.000Z",
  vin: "SHOULDNOTLEAK",
  licensePlateFull: "1กข9999",
};
ok("pending not marketplace-visible", isVisibleOnMarketplace(pending) === false);
const published = { ...pending, listingStatus: "published" as const };
ok("published marketplace-visible", isVisibleOnMarketplace(published) === true);
const held = { ...pending, listingStatus: "hidden" as const };
ok("held/hidden not marketplace-visible", isVisibleOnMarketplace(held) === false);

const dto = toPublicMarketplaceCarDto(published) as unknown as Record<
  string,
  unknown
>;
ok("public DTO omits ownerId", !("ownerId" in dto));
ok("public DTO omits dealerId", !("dealerId" in dto));
ok("public DTO omits vin", !("vin" in dto));
ok("public DTO omits licensePlateFull", !("licensePlateFull" in dto));

const doc = read(DOC);
ok("doc names existing dealer nonga-dealer", doc.includes("nonga-dealer"));
ok("doc forbids new dealer", /do not create a new dealer|No new dealer/i.test(doc));
ok("doc requires cleanup", /cleanup/i.test(doc));
ok(
  "doc records HOLD or PASS recommendation",
  /\*\*HOLD\*\*|\*\*PASS\*\*|\*\*NEED REVIEW\*\*/.test(doc)
);

console.log("\n--- Staging read-only ---\n");
try {
  const health = await get(`${STAGING}/api/health`);
  ok("health ok", health.status === 200 && health.json?.ok === true);
  ok("leadCaptureEnabled false", health.json?.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.json?.publicSignupEnabled === false);

  const cars = await get(`${STAGING}/api/cars`);
  const list = Array.isArray(cars.json?.data) ? cars.json.data : [];
  const count = Number(cars.json?.count ?? list.length);
  ok("marketplace count 13 (or restored)", count === 13, `count=${count}`);

  let prot = 0;
  let phone = 0;
  let thor = 0;
  let thorImg = 0;
  let testPublic = 0;
  for (const c of list) {
    for (const p of [
      "ownerId",
      "dealerId",
      "vin",
      "licensePlateFull",
      "phone",
      "address",
    ]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
    if (c.ownerPhone && String(c.ownerPhone).trim()) phone++;
    if (String(c.id || "").startsWith("car-import-")) {
      thor++;
      const imgs = Array.isArray(c.images)
        ? c.images
        : String(c.images || "")
            .split(/\s+/)
            .filter(Boolean);
      if (imgs[0]) thorImg++;
    }
    if (
      /TEST-v22\.37|delete-me|ทดสอบระบบประกาศ/i.test(String(c.title || ""))
    ) {
      testPublic++;
    }
  }
  ok("public DTO no protected fields", prot === 0, `hits=${prot}`);
  ok("public phones empty", phone === 0);
  ok("Thor imports 3", thor === 3, `thor=${thor}`);
  ok("Thor images 3", thorImg === 3, `thorImg=${thorImg}`);
  ok("no TEST title public", testPublic === 0, `testPublic=${testPublic}`);
  ok(
    "unauth lead 401",
    (await post(`${STAGING}/api/buyer-leads`, { listingId: "x" })).status ===
      401
  );

  const html = (await get(`${STAGING}/`)).text;
  const asset = html.match(/assets\/(index-[^"]+\.js)/)?.[1] || "unknown";
  console.log("staging_hosting_asset", asset);
  console.log("final_marketplace_count", count);
} catch (e) {
  ok("staging probes", false, String(e));
}

console.log("\n--- Live browser submit/approve/cleanup ---");
console.log("Requires signed-in nonga-dealer browser session (not this script).");
console.log("See doc for HOLD/PASS evidence.\n");

if (failures === 0) {
  console.log("=== v22.37 automated checks PASS ===");
} else {
  console.log(`=== v22.37 automated checks FAIL (${failures}) ===`);
}
