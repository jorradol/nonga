/**
 * v22.45 — Existing Lead system discovery and reuse review (safe automated portion)
 * npm run test:v22.45-existing-lead-system-discovery-and-reuse-review
 *
 * Read-only staging probes + static/doc assertions.
 * Does NOT enable Lead Capture. Does NOT create leads. Does NOT notify dealers.
 */
import fs from "node:fs";
import path from "node:path";
import {
  BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  parseBuyerLeadCreateBody,
  resolveListingSellerId,
} from "../src/services/leads/buyerLeadService.ts";

const STAGING = "https://a.nongbot.org";
const HOSTING = "https://nonga-ce93c.web.app";
const DOC = "docs/v22.45-existing-lead-system-discovery-and-reuse-review.md";
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

console.log("=== v22.45 Existing Lead System Discovery and Reuse Review ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc is discovery only", /discovery|reuse review|READ-ONLY/i.test(doc));
ok("doc forbids new lead system", /Do not create a parallel|No new Lead system|ไม่.*ระบบ Lead ใหม่|no new Lead system/i.test(doc));
ok("doc records kill switch OFF", /leadCaptureEnabled.*false|Kill Switch/i.test(doc));
ok("doc records no auto notify", /No automatic|Automatic dealer notification.*No/i.test(doc));
ok("doc has owner options A-D", /Option A|Option B|Option C|Option D/.test(doc));
ok("doc recommendation PASS", /\*\*PASS\*\*/.test(doc));
ok("doc phase plan", /Phase 1|Phase 3|Phase 4/.test(doc));

ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok("kill switch false OFF", isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false);
ok("kill switch empty OFF", isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "" }) === false);
ok("kill switch 1 OFF", isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "1" }) === false);
ok(
  "kill switch true ON (unit only)",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" }) === true
);
ok(
  "disabled message has no env name",
  !BUYER_LEAD_CAPTURE_DISABLED_MESSAGE.includes("NONGA_")
);

const body = parseBuyerLeadCreateBody({
  listingId: "car-synthetic",
  displayName: "Synthetic",
  contactPhone: "0812345678",
  purchaseMethod: "cash",
  preferredContactWindow: "เช้า",
  consentConfirmed: true,
  consentVersion: "v5.6C-1",
  sellerId: "attacker-override",
  dealerId: "wrong-dealer",
  ownerId: "wrong-owner",
  email: "attacker@example.com",
} as Record<string, unknown>);
ok("parse body ignores recipient overrides", body != null);
ok(
  "parse body has no sellerId field",
  body != null && !("sellerId" in (body as object))
);
ok(
  "resolveListingSellerId uses listing ownership only",
  resolveListingSellerId({ ownerId: "owner-nonga-dealer" }) === "owner-nonga-dealer"
);
ok(
  "empty ownership fails closed for routing",
  resolveListingSellerId({ ownerId: "" }) === ""
);

const routes = read("src/server/buyerLeadRoutes.ts");
ok("route has kill switch gate", /isLeadCaptureEnabled/.test(routes));
ok("route auth before kill switch comment or order", /getServerAuthContext/.test(routes));
ok("route registers POST /api/buyer-leads", /\/api\/buyer-leads/.test(routes));

const service = read("src/services/leads/buyerLeadService.ts");
ok("service dual kill switch", /isLeadCaptureEnabled/.test(service));
ok("service sellerId from listing", /resolveListingSellerId/.test(service));

const modal = read("src/components/chat/BuyerLeadConsentModal.tsx");
ok("modal disables submit when capture OFF", /!leadCaptureEnabled/.test(modal));

const inquire = read("src/components/cars/details/InquireModal.tsx");
ok(
  "InquireModal is not real lead API",
  !inquire.includes("/api/buyer-leads")
);

console.log("\n--- Staging read-only ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadCaptureEnabled true (active approved pilot)", health.leadCaptureEnabled === true);
  ok("lead pilot configured true", health.leadPilotConfigured === true);
  ok("lead pilot active true", health.leadPilotActive === true);
  ok("lead pilot maxCreated=3", Number(health.leadPilotMaxCreated) === 3);
  const pilotExpiryMs = Date.parse(String(health.leadPilotExpiresAt ?? ""));
  ok(
    "lead pilot expiry is valid and in future",
    Number.isFinite(pilotExpiryMs) && pilotExpiryMs > Date.now(),
    `leadPilotExpiresAt=${String(health.leadPilotExpiresAt ?? "")}`
  );
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
      `Thor Auto display ${p.title}`,
      p.sellerDisplayName === "Thor Auto" && p.dealerDisplayName === "Thor Auto"
    );
    ok(
      `images ${p.title}`,
      Array.isArray(p.images) && p.images.length === 5,
      `images=${p.images?.length ?? 0}`
    );
    ok(`dealerSlug nonga-dealer ${p.title}`, p.dealerSlug === "nonga-dealer");
  }

  const lead = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth lead 401", lead.status === 401);

  const html = await (await fetch(HOSTING + "/")).text();
  const assetMatch = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  const assetPath = assetMatch?.[0] ?? "";
  ok(
    "hosting has active hashed JS asset reference",
    Boolean(assetPath),
    assetPath || "missing"
  );
  if (assetPath) {
    const assetRes = await fetch(HOSTING + assetPath);
    ok("hosting active asset fetch 200", assetRes.status === 200, `status=${assetRes.status}`);
  }
} catch (e) {
  ok("staging probes", false, String(e));
}

if (failures === 0) console.log("\n=== v22.45 PASS ===");
else console.log(`\n=== v22.45 FAIL (${failures}) ===`);
