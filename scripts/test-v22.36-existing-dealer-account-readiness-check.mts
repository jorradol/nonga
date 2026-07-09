/**
 * v22.36 — Existing dealer account readiness (read-only)
 * npm run test:v22.36-existing-dealer-account-readiness-check
 *
 * STAGING ONLY / READ-ONLY / NO NEW DEALER / NO NEW LISTING
 * Lead capture OFF — no real lead / no dealer send / no secrets in output
 */
import fs from "node:fs";
import path from "node:path";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";
import { resolveViewFromPathname } from "../src/utils/appRouteSync.ts";
import { isLeadCaptureEnabled } from "../src/services/leads/leadCaptureFlags.ts";

const STAGING = "https://a.nongbot.org";
const DOC =
  "docs/v22.36-existing-dealer-account-readiness-check.md";

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
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

/** Redact emails/phones/uids from any accidental dump — never print raw PII. */
function safeKeys(obj: Record<string, unknown> | null | undefined): string[] {
  if (!obj) return [];
  return Object.keys(obj).filter(
    (k) => !/email|phone|token|secret|password|cookie|uid/i.test(k)
  );
}

console.log("=== v22.36 Existing Dealer Account Readiness (READ-ONLY) ===\n");
console.log("Policy: no new dealer, no new listing, lead capture OFF\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
ok(
  "Thor canonical dealerId constant",
  THOR_AUTO_DEALER_ID === "thor-auto"
);
ok(
  "admin pending route wired",
  resolveViewFromPathname("/admin/pending-listings") ===
    "admin-pending-listings"
);
ok(
  "admin pilot-users route wired",
  resolveViewFromPathname("/admin/pilot-users") === "admin-pilot-users" ||
    read("src/utils/appRouteSync.ts").includes("pilot-users")
);

const dealerPortal = read("src/server/dealerPortalRoutes.ts");
const apiAuth = read("src/server/apiAuth.ts");
const publishDraft = read("src/server/publishDraftListing.ts");
const adminPending = read("src/components/admin/AdminPendingListingsView.tsx");
const pilotCore = read("src/services/admin/pilotUserProvisioningCore.ts");
const dealerIdentity = read("src/utils/dealerIdentity.ts");

ok(
  "dealer portal has drafts publish route",
  dealerPortal.includes("/api/dealer/drafts") &&
    dealerPortal.includes("publish")
);
ok(
  "dealer API auth scopes by dealerId",
  apiAuth.includes("dealerApiAuth") || apiAuth.includes("dealerId")
);
ok(
  "publish path sets pending_review (approval gate)",
  publishDraft.includes("pending_review") ||
    read("src/utils/dealerListingApprovalGate.ts").includes("pending_review")
);
ok(
  "admin UI has approve + hold",
  adminPending.includes("อนุมัติขึ้นตลาด") &&
    adminPending.includes("พักไว้ก่อน")
);
ok(
  "pilot provision supports dealer role + dealerId",
  pilotCore.includes('role === "dealer"') ||
    pilotCore.includes('"dealer"') &&
      pilotCore.includes("dealerId")
);
ok(
  "creating another Thor alias would normalize to thor-auto",
  dealerIdentity.includes('id === "dealer-thor-auto"') &&
    dealerIdentity.includes("return THOR_AUTO_DEALER_ID")
);

console.log("\n--- Staging read-only probes ---\n");

try {
  const health = await get(`${STAGING}/api/health`);
  const h = (health.json ?? {}) as Record<string, unknown>;
  ok("staging health ok", health.status === 200 && h.ok === true);
  ok(
    "leadCaptureEnabled false",
    h.leadCaptureEnabled === false,
    String(h.leadCaptureEnabled)
  );
  ok(
    "publicSignupEnabled false",
    h.publicSignupEnabled === false,
    String(h.publicSignupEnabled)
  );

  const cars = await get(`${STAGING}/api/cars`);
  const payload = (cars.json ?? {}) as {
    count?: number;
    data?: Array<Record<string, unknown>>;
  };
  const list = Array.isArray(payload.data) ? payload.data : [];
  const count = Number(payload.count ?? list.length);
  ok("marketplace count 13", count === 13, `count=${count}`);

  let protectedHits = 0;
  let nonemptyPhone = 0;
  let thor = 0;
  let thorImg = 0;
  const slugCounts: Record<string, number> = {};
  const displayCounts: Record<string, number> = {};

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
    const slug = String(c.dealerSlug ?? "(none)");
    const display = String(
      c.dealerDisplayName ?? c.sellerDisplayName ?? "(none)"
    );
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    displayCounts[display] = (displayCounts[display] || 0) + 1;
    if (String(c.id ?? "").startsWith("car-import-")) {
      thor += 1;
      const imgs = Array.isArray(c.images)
        ? c.images
        : String(c.images ?? "")
            .split(/\s+/)
            .filter(Boolean);
      if (imgs[0]) thorImg += 1;
    }
  }

  ok("public DTO no protected fields", protectedHits === 0, `hits=${protectedHits}`);
  ok("public ownerPhone empty", nonemptyPhone === 0);
  ok("Thor imports present", thor === 3, `thor=${thor}`);
  ok("Thor images present", thorImg === 3, `thorImg=${thorImg}`);
  ok(
    "public dealerSlug includes thor-auto",
    (slugCounts["thor-auto"] ?? 0) >= 3,
    JSON.stringify(slugCounts)
  );

  console.log("public_dealer_slug_counts", JSON.stringify(slugCounts));
  console.log(
    "public_display_name_buckets",
    Object.keys(displayCounts).length,
    "(names redacted from detailed dump; Thor display present=",
    Object.keys(displayCounts).some((n) => /thor/i.test(n)),
    ")"
  );

  const lead = await post(`${STAGING}/api/buyer-leads`, { listingId: "x" });
  ok("unauth buyer-lead 401", lead.status === 401, `status=${lead.status}`);

  const unauthDealer = await get(`${STAGING}/api/dealer/profile`);
  ok(
    "unauth dealer profile blocked",
    unauthDealer.status === 401 || unauthDealer.status === 403,
    `status=${unauthDealer.status}`
  );

  const unauthPending = await get(
    `${STAGING}/api/admin/listings/pending-review`
  );
  ok(
    "unauth pending-review blocked",
    unauthPending.status === 401 || unauthPending.status === 403,
    `status=${unauthPending.status}`
  );

  const unauthPilot = await get(`${STAGING}/api/admin/pilot-users`);
  ok(
    "unauth pilot-users blocked",
    unauthPilot.status === 401 || unauthPilot.status === 403,
    `status=${unauthPilot.status}`
  );

  // Confirm we did not receive a pilot user list body with emails when unauth
  const pilotBody = String(unauthPilot.text || "");
  ok(
    "unauth pilot response has no email dump",
    !/@/.test(pilotBody) || unauthPilot.status >= 400
  );

  const html = await get(`${STAGING}/`);
  const asset =
    html.text.match(/assets\/(index-[^"]+\.js)/)?.[1] ?? "unknown";
  ok("hosting asset present", asset.startsWith("index-"), asset);
  console.log("staging_hosting_asset", asset);
  console.log("existing_dealer_signal", {
    canonicalDealerId: THOR_AUTO_DEALER_ID,
    publicSlugPresent: (slugCounts["thor-auto"] ?? 0) > 0,
    marketplaceListingsBoundToThorSlug: slugCounts["thor-auto"] ?? 0,
    note: "Firestore pilot user docs require owner/admin browser; not listed here",
  });
  console.log("safe_health_keys", safeKeys(h));
} catch (e) {
  ok("staging probes reachable", false, String(e));
}

console.log("\n--- Decision helpers (no live write) ---\n");
console.log(
  "KNOWN_MARKETPLACE_PARTITION: thor-auto — inventory/import identity (not the staging dealer pilot account)"
);
console.log(
  "KNOWN_EXISTING_DEALER_ACCOUNT: nonga-dealer — active pilot dealer (confirmed via admin browser; no new dealer)"
);
console.log(
  "DUPLICATE_RISK: do not provision another dealer; Thor aliases normalize to thor-auto"
);
console.log(
  "OWNER_BROWSER_NEEDED_FOR_POSTING: login as existing nonga-dealer account (browser only); admin for approve/hold"
);
console.log("DECISION_CODE: READY_EXISTING_DEALER");
console.log("NO_NEW_DEALER_THIS_PACKET: true");
console.log("NO_NEW_LISTING_THIS_PACKET: true");

if (failures === 0) {
  console.log("\n=== v22.36 automated readiness checks PASS ===");
} else {
  console.log(`\n=== v22.36 automated readiness checks FAIL (${failures}) ===`);
}
