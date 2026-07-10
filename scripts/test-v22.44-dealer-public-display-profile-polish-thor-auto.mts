/**
 * v22.44 — Dealer public display profile polish (Thor Auto)
 * npm run test:v22.44-dealer-public-display-profile-polish-thor-auto
 *
 * Read-only staging probes + doc/repo assertions. No secrets. No new listing/dealer.
 */
import fs from "node:fs";
import path from "node:path";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.44-dealer-public-display-profile-polish-thor-auto.md";
const PILOT_TITLES = ["Toyota Corolla 2020", "Toyota Corolla 2021"];
const DISPLAY = "Thor Auto";

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

console.log("=== v22.44 Dealer Public Display Profile Polish (Thor Auto) ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc owner decision Thor Auto", /Owner decision[\s\S]*Thor Auto/i.test(doc));
ok("doc root cause Unknown Owner", /Unknown Owner/.test(doc));
ok("doc minimal fix", /Minimal fix|showroomName/i.test(doc));
ok("doc marketplace 15", /\*\*15\*\*/.test(doc));
ok("doc no new dealer", /No new dealer|Did not create a new dealer/i.test(doc));
ok("doc lead remains OFF", /leadCaptureEnabled:false|Lead capture.*OFF/i.test(doc));
ok("doc recommendation PASS", /\*\*PASS\*\*/.test(doc));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);

const dto = toPublicMarketplaceCarDto({
  id: "car-synthetic",
  title: "Synthetic",
  brand: "Toyota",
  model: "Corolla",
  year: 2020,
  price: 1,
  type: "used",
  condition: "used",
  mileage: 1,
  fuelType: "petrol",
  images: [],
  description: "",
  dealerId: "nonga-dealer",
  ownerId: "owner-nonga-dealer",
  ownerName: "Thor Auto",
  showroomName: "Thor Auto",
  isSold: false,
  listingStatus: "published",
  createdAt: new Date().toISOString(),
  boosted: false,
  featured: false,
} as never);

ok(
  "unit DTO sellerDisplayName Thor Auto",
  (dto as { sellerDisplayName?: string }).sellerDisplayName === DISPLAY
);
ok(
  "unit DTO dealerDisplayName Thor Auto",
  (dto as { dealerDisplayName?: string }).dealerDisplayName === DISPLAY
);
ok(
  "unit DTO redacts ownership ids",
  !("ownerId" in (dto as object)) && !("dealerId" in (dto as object))
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
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
  }
  ok("public DTO no protected fields", prot === 0);

  for (const p of pilot) {
    ok(
      `display Thor Auto ${p.title}`,
      p.sellerDisplayName === DISPLAY && p.dealerDisplayName === DISPLAY,
      `seller=${p.sellerDisplayName} dealer=${p.dealerDisplayName}`
    );
    ok(
      `safe seller fields ${p.title}`,
      p.sellerType === "dealer" && p.dealerSlug === "nonga-dealer"
    );
    ok(
      `images preserved ${p.title}`,
      Array.isArray(p.images) && p.images.length === 5,
      `images=${p.images?.length ?? 0}`
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

if (failures === 0) console.log("\n=== v22.44 PASS ===");
else console.log(`\n=== v22.44 FAIL (${failures}) ===`);
