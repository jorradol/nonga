/**
 * v22.47 — Exactly one synthetic controlled staging lead test (safe automated portion)
 * npm run test:v22.47-exactly-one-synthetic-controlled-staging-lead-test
 *
 * Read-only staging probes + doc assertions. Does NOT enable capture. Does NOT create leads.
 */
import fs from "node:fs";
import path from "node:path";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  parseBuyerLeadCreateBody,
  resolveListingSellerId,
} from "../src/services/leads/buyerLeadService.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.47-exactly-one-synthetic-controlled-staging-lead-test.md";
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

console.log("=== v22.47 Exactly One Synthetic Controlled Staging Lead Test ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc owner option C", /Option \*\*C\*\*|Owner Option \*\*C\*\*/.test(doc));
ok("doc exactly one lead", /exactly \*\*one\*\*|Leads created \|\s*\*\*1\*\*/i.test(doc));
ok("doc no dealer send", /No Dealer-facing|Automatic Dealer notification.*None/i.test(doc));
ok("doc cleanup", /skip|withdrawn|Cleanup/i.test(doc));
ok("doc returned OFF", /leadCaptureEnabled.*\*\*false\*\*|returned \*\*OFF\*\*/i.test(doc));
ok("doc marketplace 15", /\*\*15\*\*/.test(doc));
ok("doc recommendation PASS", /\*\*PASS\*\*/.test(doc));
ok("doc no raw phone pattern dump", !/0000000000|0812345678/.test(doc));
ok("doc no blead id", !/blead-/.test(doc));

ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "kill switch true only",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" }) === true &&
    isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false
);

const body = parseBuyerLeadCreateBody({
  listingId: "car-synthetic",
  displayName: "Synthetic",
  contactPhone: "0812345678",
  purchaseMethod: "cash",
  preferredContactWindow: "เช้า",
  consentConfirmed: true,
  consentVersion: "v5.6C-1",
  sellerId: "attacker",
  dealerId: "wrong",
  ownerId: "wrong",
} as Record<string, unknown>);
ok("parse ignores recipient overrides", body != null && !("sellerId" in (body as object)));
ok(
  "sellerId from listing ownership",
  resolveListingSellerId({ ownerId: "owner-nonga-dealer" }) === "owner-nonga-dealer"
);

const routes = read("src/server/buyerLeadRoutes.ts");
ok("route kill switch present", /isLeadCaptureEnabled/.test(routes));
ok("no email/sms send in buyerLeadRoutes", !/sendEmail|sendSms|twilio|nodemailer/.test(routes));

console.log("\n--- Staging read-only (post-test OFF) ---\n");
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
  ok("pilot titles = 2", pilot.length === 2);
  let prot = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
  }
  ok("public DTO no protected fields", prot === 0);
  for (const p of pilot) {
    ok(
      `Thor Auto ${p.title}`,
      p.sellerDisplayName === "Thor Auto" && p.dealerDisplayName === "Thor Auto"
    );
    ok(`images 5 ${p.title}`, Array.isArray(p.images) && p.images.length === 5);
  }

  const unauth = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", unauth.status === 401);

  // Interest stats for Corolla 2020 should be 0 after cleanup (public count only)
  const corolla = list.find((c: { title?: string }) => c.title === "Toyota Corolla 2020") as
    | { id?: string }
    | undefined;
  if (corolla?.id) {
    const stats = await (
      await fetch(
        `${STAGING}/api/listings/${encodeURIComponent(String(corolla.id))}/interest-queue-stats`
      )
    ).json();
    ok(
      "interest count 0 after cleanup",
      Number(stats?.data?.interestCount ?? -1) === 0,
      `interest=${stats?.data?.interestCount}`
    );
  } else {
    ok("corolla id available for stats", false);
  }
} catch (e) {
  ok("staging probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.47 PASS ===");
else console.log(`\n=== v22.47 FAIL (${failures}) ===`);
