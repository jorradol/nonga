/**
 * v22.53 — Controlled Real Lead Pilot guard + activation readiness (no live Lead writes).
 * npm run test:v22.53-static
 */
import fs from "node:fs";
import path from "node:path";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  createConsentedBuyerLead,
  parseBuyerLeadCreateBody,
  resolveListingSellerId,
} from "../src/services/leads/buyerLeadService.ts";
import {
  resetBuyerLeadRepositoryForTests,
  createBuyerLeadRepository,
} from "../src/server/repositories/buyerLeadRepository.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  BUYER_LEAD_PILOT_LIMIT_MESSAGE,
  BUYER_LEAD_PILOT_NOT_ELIGIBLE_MESSAGE,
  BUYER_LEAD_PILOT_EXPIRED_MESSAGE,
  BUYER_LEAD_PILOT_CONFIG_INVALID_MESSAGE,
  DEFAULT_LEAD_PILOT_COUNTER_ID,
  NONGA_LEAD_PILOT_LISTING_IDS_ENV,
  NONGA_LEAD_PILOT_MAX_CREATED_ENV,
  NONGA_LEAD_PILOT_EXPIRES_AT_ENV,
  NONGA_LEAD_PILOT_STARTED_AT_ENV,
  NONGA_LEAD_PILOT_DEALER_IDS_ENV,
  NONGA_LEAD_PILOT_COUNTER_ID_ENV,
  evaluatePilotCreateGate,
  parseLeadPilotConfig,
  getLeadPilotHealthSnapshot,
} from "../src/services/leads/leadPilotGuard.ts";
import { LEAD_ENGINE_COLLECTIONS } from "../src/services/leads/leadTypes.ts";

const STAGING = "https://nonga-staging-dpf3rexexq-as.a.run.app";
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

function pilotEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true",
    [NONGA_LEAD_PILOT_LISTING_IDS_ENV]: "listing-pilot-a,listing-pilot-b",
    [NONGA_LEAD_PILOT_DEALER_IDS_ENV]: "nonga-dealer",
    [NONGA_LEAD_PILOT_MAX_CREATED_ENV]: "3",
    [NONGA_LEAD_PILOT_STARTED_AT_ENV]: start.toISOString(),
    [NONGA_LEAD_PILOT_EXPIRES_AT_ENV]: end.toISOString(),
    [NONGA_LEAD_PILOT_COUNTER_ID_ENV]: DEFAULT_LEAD_PILOT_COUNTER_ID,
    ...overrides,
  };
}

console.log("=== v22.53 Pilot Guard Static ===\n");

ok(
  "counter collection registered",
  LEAD_ENGINE_COLLECTIONS.buyerLeadPilotCounters === "buyerLeadPilotCounters"
);
ok(
  "rules deny pilot counters",
  /buyerLeadPilotCounters/.test(read("firestore.rules"))
);

const missing = parseLeadPilotConfig({});
ok("config missing fail closed", missing.ok === false);

const badMax = parseLeadPilotConfig(
  pilotEnv({ [NONGA_LEAD_PILOT_MAX_CREATED_ENV]: "4" })
);
ok("max>3 invalid", badMax.ok === false);

const good = parseLeadPilotConfig(pilotEnv());
ok("config parses", good.ok === true);
ok(
  "health snapshot configured",
  getLeadPilotHealthSnapshot(pilotEnv()).leadPilotConfigured === true
);

const listingA = {
  id: "listing-pilot-a",
  title: "Pilot A",
  price: 1,
  ownerId: "owner-nonga-dealer",
  dealerId: "nonga-dealer",
  listingStatus: "published" as const,
  isSold: false,
};
const listingOther = {
  id: "listing-other",
  title: "Other",
  price: 1,
  ownerId: "owner-nonga-dealer",
  dealerId: "nonga-dealer",
  listingStatus: "published" as const,
  isSold: false,
};

const gateOk = evaluatePilotCreateGate({
  env: pilotEnv(),
  listing: listingA,
  createdCount: 0,
});
ok("gate allows eligible", gateOk.ok === true);

const gateOther = evaluatePilotCreateGate({
  env: pilotEnv(),
  listing: listingOther,
  createdCount: 0,
});
ok(
  "gate blocks non-allowlist",
  gateOther.ok === false &&
    gateOther.message === BUYER_LEAD_PILOT_NOT_ELIGIBLE_MESSAGE
);

const gateLimit = evaluatePilotCreateGate({
  env: pilotEnv(),
  listing: listingA,
  createdCount: 3,
});
ok(
  "gate blocks at max",
  gateLimit.ok === false && gateLimit.message === BUYER_LEAD_PILOT_LIMIT_MESSAGE
);

const expired = evaluatePilotCreateGate({
  env: pilotEnv({
    [NONGA_LEAD_PILOT_STARTED_AT_ENV]: "2026-01-01T00:00:00.000Z",
    [NONGA_LEAD_PILOT_EXPIRES_AT_ENV]: "2026-01-02T00:00:00.000Z",
  }),
  listing: listingA,
  createdCount: 0,
  nowMs: Date.parse("2026-01-10T00:00:00.000Z"),
});
ok(
  "gate blocks expired",
  expired.ok === false && expired.message === BUYER_LEAD_PILOT_EXPIRED_MESSAGE
);

const wrongDealer = evaluatePilotCreateGate({
  env: pilotEnv(),
  listing: { ...listingA, dealerId: "other-dealer", ownerId: "owner-other" },
  createdCount: 0,
});
ok("gate blocks wrong dealer", wrongDealer.ok === false);

// Capture ON without pilot config → fail closed
resetBuyerLeadRepositoryForTests();
const repo = createBuyerLeadRepository("memory");
const noConfig = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-1",
  listing: listingA,
  env: { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" },
  input: {
    listingId: listingA.id,
    displayName: "Synthetic",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok(
  "capture ON without pilot config blocked",
  noConfig.ok === false &&
    noConfig.status === 403 &&
    noConfig.message === BUYER_LEAD_PILOT_CONFIG_INVALID_MESSAGE
);
ok(
  "no lead written without config",
  (await repo.listBuyerLeadsByListingId(listingA.id)).length === 0
);

const env = pilotEnv();
const first = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-1",
  listing: listingA,
  env,
  input: {
    listingId: listingA.id,
    displayName: "Synthetic",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
    buyerSummary: "v22.53 synthetic — not real PII",
  },
});
ok("pilot create ok", first.ok === true && first.ok && first.duplicate !== true);
ok(
  "counter 1",
  (await repo.getPilotCreatedCount(DEFAULT_LEAD_PILOT_COUNTER_ID)) === 1
);

// Duplicate does not consume slot
const dup = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-1",
  listing: listingA,
  env,
  input: {
    listingId: listingA.id,
    displayName: "Synthetic",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("duplicate flagged", dup.ok === true && dup.ok && dup.duplicate === true);
ok(
  "counter still 1 after duplicate",
  (await repo.getPilotCreatedCount(DEFAULT_LEAD_PILOT_COUNTER_ID)) === 1
);

// Fill to max 3 with distinct buyers
const second = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-2",
  listing: listingA,
  env,
  input: {
    listingId: listingA.id,
    displayName: "Synthetic 2",
    contactPhone: "0822222222",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("second create", second.ok === true && second.ok && second.duplicate !== true);

const listingB = {
  ...listingA,
  id: "listing-pilot-b",
  title: "Pilot B",
};
const third = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-3",
  listing: listingB,
  env,
  input: {
    listingId: listingB.id,
    displayName: "Synthetic 3",
    contactPhone: "0833333333",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("third create", third.ok === true && third.ok && third.duplicate !== true);
ok(
  "counter 3",
  (await repo.getPilotCreatedCount(DEFAULT_LEAD_PILOT_COUNTER_ID)) === 3
);

const fourth = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-4",
  listing: listingB,
  env,
  input: {
    listingId: listingB.id,
    displayName: "Synthetic 4",
    contactPhone: "0844444444",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok(
  "fourth blocked",
  fourth.ok === false &&
    fourth.status === 403 &&
    fourth.message === BUYER_LEAD_PILOT_LIMIT_MESSAGE
);
ok(
  "counter stays 3",
  (await repo.getPilotCreatedCount(DEFAULT_LEAD_PILOT_COUNTER_ID)) === 3
);

// Recipient override ignored
const parsed = parseBuyerLeadCreateBody({
  listingId: listingA.id,
  displayName: "X",
  contactPhone: "0812345678",
  purchaseMethod: "cash",
  preferredContactWindow: "เช้า",
  consentConfirmed: true,
  consentVersion: BUYER_LEAD_CONSENT_VERSION,
  sellerId: "attacker",
} as Record<string, unknown>);
ok("parse drops sellerId", parsed != null && !("sellerId" in (parsed as object)));
ok("seller from ownership", resolveListingSellerId(listingA) === listingA.ownerId);

ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);

const serviceSrc = read("src/services/leads/buyerLeadService.ts");
ok(
  "pilot gate before atomic",
  serviceSrc.indexOf("evaluatePilotCreateGate") <
    serviceSrc.indexOf("createBuyerLeadAtomic")
);
ok("no notification code", !/sendEmail|twilio|nodemailer|webhook/.test(serviceSrc));

console.log("\n--- Staging read-only pre-activation (expect Capture OFF) ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("backend firestore", health.leadDataBackend === "firestore");
  ok("signup OFF", health.publicSignupEnabled === false);
  // During this suite run, Capture may still be OFF (pre-deploy) or ON (post-deploy).
  ok(
    "capture boolean present",
    typeof health.leadCaptureEnabled === "boolean"
  );
  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  ok("marketplace 15", Number(cars.count) === 15);
  const list = cars.data || [];
  let prot = 0;
  for (const c of list) {
    for (const p of ["ownerId", "dealerId", "vin", "licensePlateFull", "sellerPhone"]) {
      if (Object.prototype.hasOwnProperty.call(c, p)) prot++;
    }
  }
  ok("DTO safe", prot === 0);
  const pilot = list.filter((c: { title?: string }) =>
    PILOT_TITLES.includes(String(c.title || ""))
  );
  ok("pilot listings 2", pilot.length === 2);
  for (const p of pilot) {
    ok(
      `Thor Auto ${p.title}`,
      p.sellerDisplayName === "Thor Auto" && p.dealerDisplayName === "Thor Auto"
    );
    ok(`images 5 ${p.title}`, Array.isArray(p.images) && p.images.length === 5);
  }
} catch (e) {
  ok("staging read-only", false, String(e));
}

console.log(
  failures === 0
    ? "\n=== v22.53 Static PASS ===\n"
    : `\n=== v22.53 Static FAIL (${failures}) ===\n`
);
process.exit(failures === 0 ? 0 : 1);
