/**
 * v22.38 — Owner-browser existing dealer assisted run (safe automated portion)
 * npm run test:v22.38-owner-browser-existing-dealer-assisted-run
 *
 * No login, no listing write, no secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";
import { resolveViewFromPathname } from "../src/utils/appRouteSync.ts";
import { dealerListingStatusAfterSubmit } from "../src/utils/dealerListingApprovalGate.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.38-owner-browser-existing-dealer-assisted-run.md";

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

console.log("=== v22.38 Owner-Browser Existing Dealer Assisted Run ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc forbids password in chat", /password.*chat|Do not.*password/i.test(doc));
ok("doc requires nonga-dealer", doc.includes("nonga-dealer"));
ok("doc forbids Thor demo", /Thor demo|do not use Thor/i.test(doc));
ok("doc has HOLD or PASS", /\*\*HOLD\*\*|\*\*PASS\*\*/.test(doc));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "pending after submit policy",
  dealerListingStatusAfterSubmit() === "pending_review"
);
ok(
  "admin pending route",
  resolveViewFromPathname("/admin/pending-listings") ===
    "admin-pending-listings"
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
  ok("marketplace 13", count === 13, `count=${count}`);

  let prot = 0;
  let testPublic = 0;
  let thor = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
    if (/TEST-v22\.37|delete-me/i.test(String(c.title || ""))) testPublic++;
    if (String(c.id || "").startsWith("car-import-")) thor++;
  }
  ok("no protected fields", prot === 0);
  ok("no TEST public", testPublic === 0);
  ok("Thor 3", thor === 3, `thor=${thor}`);
  ok(
    "unauth lead 401",
    (await post(`${STAGING}/api/buyer-leads`, { listingId: "x" })).status ===
      401
  );
} catch (e) {
  ok("staging probes", false, String(e));
}

console.log("\nLive dealer login/submit: owner-browser only (see doc).\n");
if (failures === 0) console.log("=== v22.38 automated checks PASS ===");
else console.log(`=== v22.38 automated checks FAIL (${failures}) ===`);
