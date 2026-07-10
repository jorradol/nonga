/**
 * v22.49 — Static + read-only staging readiness (Phase 2 D1)
 * npm run test:v22.49
 *
 * Does NOT enable capture. Does NOT switch live repository.
 * Does NOT write live Firestore. Emulator suite is separate (test:v22.49-emulator).
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
  createConsentedBuyerLead,
} from "../src/services/leads/buyerLeadService.ts";
import {
  resolveBuyerLeadDataBackend,
  resetBuyerLeadRepositoryForTests,
  createBuyerLeadRepository,
  getActiveBuyerLeadDataBackend,
} from "../src/server/repositories/buyerLeadRepository.ts";
import {
  assertBuyerLeadFirestoreEmulatorIsolation,
  assertBuyerLeadTestCleanupAllowed,
} from "../src/server/repositories/buyerLeadRepositoryFirestore.ts";
import {
  findActiveDuplicateBuyerLead,
  BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE,
} from "../src/services/leads/buyerLeadDuplicateGuard.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import type { BuyerLead } from "../src/services/leads/leadTypes.ts";

const STAGING = "https://a.nongbot.org";
const DOC = "docs/v22.49-firestore-lead-repository-emulator-and-static-readiness-completion.md";
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

console.log("=== v22.49 Static Readiness ===\n");

ok("doc exists", fs.existsSync(path.resolve(process.cwd(), DOC)));
const doc = read(DOC);
ok("doc has recommendation", /PASS|NEED REVIEW|HOLD/.test(doc));
ok("doc D1 scope", /D1|Phase 2/i.test(doc));
ok("doc operator checklist", /Operator checklist|Pre-switch/i.test(doc));
ok("doc no live switch", /No live Staging repository switch|did not switch|not switch live/i.test(doc));
ok("doc capture OFF", /Lead Capture.*OFF|leadCaptureEnabled.*false/i.test(doc));
ok("doc no blead dump", !/blead-[0-9]{10,}/.test(doc));
ok("doc marketplace 15", /\*\*15\*\*/.test(doc));

// Selection / health helpers
ok("default memory", resolveBuyerLeadDataBackend({}) === "memory");
ok(
  "firestore when set",
  resolveBuyerLeadDataBackend({ NONGA_LEAD_DATA_BACKEND: "firestore" }) === "firestore"
);
ok(
  "invalid stays memory",
  resolveBuyerLeadDataBackend({ NONGA_LEAD_DATA_BACKEND: "redis" }) === "memory"
);
resetBuyerLeadRepositoryForTests();
ok("active backend memory after reset", getActiveBuyerLeadDataBackend() === "memory");

const healthSrc = read("server.ts");
ok("health exposes leadDataBackend", /leadDataBackend:\s*getActiveBuyerLeadDataBackend/.test(healthSrc));
ok("health no projectId field", !/leadDataBackend:[\s\S]{0,80}projectId/.test(healthSrc));

// Isolation guards
try {
  assertBuyerLeadFirestoreEmulatorIsolation({
    FIRESTORE_EMULATOR_HOST: "",
    FIREBASE_PROJECT_ID: "demo-x",
  });
  ok("isolation requires emulator host", false);
} catch {
  ok("isolation requires emulator host", true);
}
try {
  assertBuyerLeadFirestoreEmulatorIsolation({
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8085",
    FIREBASE_PROJECT_ID: "nonga-ce93c",
  });
  ok("isolation blocks live project", false);
} catch {
  ok("isolation blocks live project", true);
}
try {
  assertBuyerLeadFirestoreEmulatorIsolation({
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8085",
    FIREBASE_PROJECT_ID: "demo-nonga-v2249",
  });
  ok("isolation allows demo project", true);
} catch (e) {
  ok("isolation allows demo project", false, String(e));
}

try {
  assertBuyerLeadTestCleanupAllowed({});
  ok("cleanup blocked without gate", false);
} catch {
  ok("cleanup blocked without gate", true);
}
try {
  assertBuyerLeadTestCleanupAllowed({
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8085",
    FIREBASE_PROJECT_ID: "demo-nonga-v2249",
  });
  ok("cleanup allowed with emulator", true);
} catch (e) {
  ok("cleanup allowed with emulator", false, String(e));
}

// Duplicate guard (memory)
resetBuyerLeadRepositoryForTests();
const repo = createBuyerLeadRepository("memory");
const listing = {
  id: "listing-dup-static",
  title: "Static Dup",
  price: 1,
  ownerId: "seller-static",
};
const envOn = { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" };
const first = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-static",
  listing,
  env: envOn,
  input: {
    listingId: listing.id,
    displayName: "Static",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("static create ok", first.ok === true && first.ok && first.duplicate !== true);
const second = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-static",
  listing,
  env: envOn,
  input: {
    listingId: listing.id,
    displayName: "Static",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("static duplicate flagged", second.ok === true && second.ok && second.duplicate === true);
ok(
  "static duplicate message",
  second.ok && second.buyerMessage === BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE
);
ok(
  "static still one lead",
  (await repo.listBuyerLeadsByListingId(listing.id)).length === 1
);

const existing: BuyerLead[] = first.ok ? [first.lead] : [];
ok(
  "findActiveDuplicate helper",
  findActiveDuplicateBuyerLead({
    existing,
    listingId: listing.id,
    buyerUserId: "buyer-static",
    contactPhone: "0811111111",
  }) != null
);

// Ownership / kill switch
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
const body = parseBuyerLeadCreateBody({
  listingId: "x",
  displayName: "Y",
  contactPhone: "0812345678",
  purchaseMethod: "cash",
  preferredContactWindow: "เช้า",
  consentConfirmed: true,
  consentVersion: BUYER_LEAD_CONSENT_VERSION,
  sellerId: "attacker",
} as Record<string, unknown>);
ok("parse ignores sellerId", body != null && !("sellerId" in (body as object)));
ok("seller from ownerId", resolveListingSellerId({ ownerId: "owner-1" }) === "owner-1");

const skipSrc = read("src/services/leads/sellerSkipQueueService.ts");
ok("skip checks sellerId mismatch", /owned\.sellerId !== params\.sellerId/.test(skipSrc));

const firestoreSrc = read("src/server/repositories/buyerLeadRepositoryFirestore.ts");
ok("emulator init path present", /FIRESTORE_EMULATOR_HOST/.test(firestoreSrc));
ok("targeted delete gated", /deleteBuyerLeadByIdForControlledCleanup/.test(firestoreSrc));
ok("no notification in firestore repo", !/sendEmail|twilio|nodemailer|webhook/.test(firestoreSrc));

const routes = read("src/server/buyerLeadRoutes.ts");
ok("no email in create routes", !/sendEmail|twilio|nodemailer/.test(routes));

console.log("\n--- Staging read-only ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);
  // v22.49 packet left Staging on memory; v22.50 may report firestore after C2.
  // This suite only requires capture OFF and a known backend value when present.
  ok(
    "live lead backend known or legacy-absent",
    health.leadDataBackend === undefined ||
      health.leadDataBackend === "memory" ||
      health.leadDataBackend === "firestore"
  );
  ok("live capture remains OFF regardless of backend", health.leadCaptureEnabled === false);

  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  const list = cars.data || [];
  ok("marketplace 15", Number(cars.count) === 15, `count=${cars.count}`);
  const pilot = list.filter((c: { title?: string }) =>
    PILOT_TITLES.includes(String(c.title || ""))
  );
  ok("pilot = 2", pilot.length === 2);
  let prot = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull", "sellerPhone"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
  }
  ok("DTO safe", prot === 0);
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
  ok("unauth 401", unauth.status === 401);
} catch (e) {
  ok("staging probes", false, String(e));
}

console.log(
  failures === 0 ? "\n=== v22.49 static PASS ===\n" : `\n=== v22.49 static FAIL (${failures}) ===\n`
);
