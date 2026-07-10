/**
 * v22.52 — Static + memory duplicate-hardening readiness (no live Lead writes).
 * npm run test:v22.52-static
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
  resetBuyerLeadRepositoryForTests,
  createBuyerLeadRepository,
  getMemoryBuyerLeadContactLogCountForTests,
} from "../src/server/repositories/buyerLeadRepository.ts";
import {
  findActiveDuplicateBuyerLead,
  BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE,
} from "../src/services/leads/buyerLeadDuplicateGuard.ts";
import {
  assertBuyerLeadIdempotencyKeyHasNoPii,
  assertNoBuyerPiiInActiveSlotRecord,
  buildBuyerLeadActiveSlotDocId,
  buildBuyerLeadActiveSlotDraft,
  buildBuyerLeadContactFingerprint,
  resolveActiveSlotTransactionDecision,
} from "../src/services/leads/buyerLeadIdempotencyModel.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import { sellerSkipQueueLead } from "../src/services/leads/sellerSkipQueueService.ts";
import { getSellerMaskedQueueForListing } from "../src/services/leads/buyerLeadQueueService.ts";
import { sellerMaskedQueueEntryHasNoFullPhone } from "../src/services/leads/sellerSkipQueuePolicy.ts";
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

console.log("=== v22.52 Static + Memory Duplicate Hardening ===\n");

// Model / PII
const slotId = buildBuyerLeadActiveSlotDocId("listing-a", "buyer-1");
ok("slot id has no raw phone", assertBuyerLeadIdempotencyKeyHasNoPii(slotId));
ok("slot id deterministic", slotId === buildBuyerLeadActiveSlotDocId("listing-a", "buyer-1"));
ok(
  "different listing different slot",
  buildBuyerLeadActiveSlotDocId("listing-b", "buyer-1") !== slotId
);
const fp = buildBuyerLeadContactFingerprint("0811111111");
ok("fingerprint not raw phone", fp !== "0811111111" && !fp.includes("0811"));
ok(
  "fingerprint stable",
  fp === buildBuyerLeadContactFingerprint("0811111111")
);
const draft = buildBuyerLeadActiveSlotDraft({
  listingId: "listing-a",
  buyerUserId: "buyer-1",
  contactFingerprint: fp,
  leadId: "blead-x",
  contactLogId: "bclog-x",
  createdAt: new Date().toISOString(),
});
ok(
  "slot draft no PII fields",
  assertNoBuyerPiiInActiveSlotRecord(draft as unknown as Record<string, unknown>)
);
ok(
  "decision create when empty",
  resolveActiveSlotTransactionDecision(null).kind === "create"
);
ok(
  "decision duplicate when active",
  resolveActiveSlotTransactionDecision({ status: "active", leadId: "blead-x" })
    .kind === "duplicate"
);
ok(
  "decision reuse when released",
  resolveActiveSlotTransactionDecision({ status: "released", leadId: "blead-x" })
    .kind === "reuse_slot"
);

ok(
  "collection registered",
  LEAD_ENGINE_COLLECTIONS.buyerLeadIdempotencyRecords ===
    "buyerLeadIdempotencyRecords"
);
const rules = read("firestore.rules");
ok("rules deny buyerLeadIdempotencyRecords", /buyerLeadIdempotencyRecords/.test(rules));

// Kill switch before write
ok("kill switch default OFF", isLeadCaptureEnabled({}) === false);
resetBuyerLeadRepositoryForTests();
const repo = createBuyerLeadRepository("memory");
const listing = {
  id: "listing-v2252-a",
  title: "Synthetic A",
  price: 100,
  ownerId: "seller-v2252-a",
};
const listingB = {
  id: "listing-v2252-b",
  title: "Synthetic B",
  price: 200,
  ownerId: "seller-v2252-b",
};
const envOn = { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" };

const blocked = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-v2252",
  listing,
  env: {},
  input: {
    listingId: listing.id,
    displayName: "Synthetic",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("OFF blocks before write", blocked.ok === false && blocked.status === 403);
ok(
  "OFF left zero leads",
  (await repo.listBuyerLeadsByListingId(listing.id)).length === 0
);

// One create
const first = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-v2252",
  listing,
  env: envOn,
  input: {
    listingId: listing.id,
    displayName: "Synthetic",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
    buyerSummary: "v22.52 synthetic — not real PII",
  },
});
ok("one create", first.ok === true && first.ok && first.duplicate !== true);
const leadId = first.ok ? first.lead.id : "";
ok(
  "one contact log",
  getMemoryBuyerLeadContactLogCountForTests(leadId) === 1
);

// Sequential duplicate
const second = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-v2252",
  listing,
  env: envOn,
  input: {
    listingId: listing.id,
    displayName: "Synthetic",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok("sequential duplicate", second.ok === true && second.ok && second.duplicate === true);
ok(
  "duplicate same id",
  second.ok && second.lead.id === leadId
);
ok(
  "duplicate message",
  second.ok && second.buyerMessage === BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE
);
ok(
  "still one lead",
  (await repo.listBuyerLeadsByListingId(listing.id)).length === 1
);
ok(
  "contact logs not duplicated",
  getMemoryBuyerLeadContactLogCountForTests(leadId) === 1
);

// Different phone same buyer+listing still duplicate (active-slot)
const phoneChange = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-v2252",
  listing,
  env: envOn,
  input: {
    listingId: listing.id,
    displayName: "Synthetic",
    contactPhone: "0899999999",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok(
  "phone change still active duplicate",
  phoneChange.ok === true && phoneChange.ok && phoneChange.duplicate === true
);

// Concurrent identical
const concurrent = await Promise.all(
  Array.from({ length: 8 }, () =>
    createConsentedBuyerLead({
      repository: repo,
      buyerUserId: "buyer-v2252-concurrent",
      listing: { ...listing, id: "listing-v2252-concurrent" },
      env: envOn,
      input: {
        listingId: "listing-v2252-concurrent",
        displayName: "Concurrent",
        contactPhone: "0822222222",
        purchaseMethod: "finance",
        preferredContactWindow: "เย็น",
        consentConfirmed: true,
        consentVersion: BUYER_LEAD_CONSENT_VERSION,
      },
    })
  )
);
const concurrentListingLeads = await repo.listBuyerLeadsByListingId(
  "listing-v2252-concurrent"
);
ok("concurrent → one lead", concurrentListingLeads.length === 1);
ok(
  "concurrent all ok",
  concurrent.every((r) => r.ok === true)
);
const createdCount = concurrent.filter((r) => r.ok && r.duplicate !== true).length;
const dupCount = concurrent.filter((r) => r.ok && r.duplicate === true).length;
ok("concurrent exactly one created", createdCount === 1, `created=${createdCount}`);
ok("concurrent rest duplicates", dupCount === 7, `dups=${dupCount}`);

// Different listing distinct
const otherListing = await createConsentedBuyerLead({
  repository: repo,
  buyerUserId: "buyer-v2252",
  listing: listingB,
  env: envOn,
  input: {
    listingId: listingB.id,
    displayName: "Synthetic",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
});
ok(
  "different listing distinct",
  otherListing.ok === true &&
    otherListing.ok &&
    otherListing.duplicate !== true &&
    otherListing.lead.id !== leadId
);

// Recipient override ignored
const parsed = parseBuyerLeadCreateBody({
  listingId: listing.id,
  displayName: "X",
  contactPhone: "0812345678",
  purchaseMethod: "cash",
  preferredContactWindow: "เช้า",
  consentConfirmed: true,
  consentVersion: BUYER_LEAD_CONSENT_VERSION,
  sellerId: "attacker",
  dealerId: "wrong",
} as Record<string, unknown>);
ok("parse drops sellerId", parsed != null && !("sellerId" in (parsed as object)));
ok("seller from ownership", resolveListingSellerId(listing) === listing.ownerId);

// Seller isolation + masking
const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
ok("queue length 1", Array.isArray(queue) && queue.length === 1);
if (Array.isArray(queue) && queue[0]) {
  ok(
    "masked phone",
    sellerMaskedQueueEntryHasNoFullPhone(queue[0]) &&
      !String(queue[0].contactPhone ?? "").includes("0811111111")
  );
}
const wrong = await getSellerMaskedQueueForListing(repo, listing.id, listingB.ownerId);
ok("wrong seller denied", !Array.isArray(wrong) && wrong.ok === false);

// Legitimate later inquiry after skip
if (first.ok) {
  const skipped = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: first.lead.id,
    reason: "insufficient_info",
    actorUserId: listing.ownerId,
  });
  ok("skip ok", skipped.ok === true);
  const later = await createConsentedBuyerLead({
    repository: repo,
    buyerUserId: "buyer-v2252",
    listing,
    env: envOn,
    input: {
      listingId: listing.id,
      displayName: "Synthetic Later",
      contactPhone: "0811111111",
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
  });
  ok(
    "later inquiry after withdraw allowed",
    later.ok === true && later.ok && later.duplicate !== true && later.lead.id !== leadId
  );
}

ok(
  "findActiveDuplicate helper",
  findActiveDuplicateBuyerLead({
    existing: (await repo.listBuyerLeadsByListingId(listing.id)).filter(
      (l) => l.queueLifecycle === "active"
    ),
    listingId: listing.id,
    buyerUserId: "buyer-v2252",
  }) != null
);

// Source guards
const serviceSrc = read("src/services/leads/buyerLeadService.ts");
ok(
  "kill switch before atomic",
  serviceSrc.indexOf("isLeadCaptureEnabled") <
    serviceSrc.indexOf("createBuyerLeadAtomic")
);
ok("no notification in service", !/sendEmail|twilio|nodemailer|webhook/.test(serviceSrc));
const firestoreSrc = read("src/server/repositories/buyerLeadRepositoryFirestore.ts");
ok("firestore uses runTransaction", /runTransaction/.test(firestoreSrc));
ok("no memory-only lock as sole path", /buyerLeadIdempotencyRecords/.test(firestoreSrc));

console.log("\n--- Staging read-only (Capture OFF) ---\n");
try {
  const health = await (await fetch(`${STAGING}/api/health`)).json();
  ok("health ok", health.ok === true);
  ok("leadCaptureEnabled false", health.leadCaptureEnabled === false);
  ok("publicSignupEnabled false", health.publicSignupEnabled === false);
  ok("leadDataBackend firestore", health.leadDataBackend === "firestore");

  const unauth = await fetch(`${STAGING}/api/buyer-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId: "x" }),
  });
  ok("unauth 401", unauth.status === 401);

  const cars = await (await fetch(`${STAGING}/api/cars`)).json();
  ok("marketplace 15", Number(cars.count) === 15, `count=${cars.count}`);
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
  ok("pilot = 2", pilot.length === 2);
  for (const p of pilot) {
    ok(
      `Thor Auto ${p.title}`,
      p.sellerDisplayName === "Thor Auto" && p.dealerDisplayName === "Thor Auto"
    );
    ok(`images 5 ${p.title}`, Array.isArray(p.images) && p.images.length === 5);
    const stats = await (
      await fetch(`${STAGING}/api/listings/${p.id}/interest-queue-stats`)
    ).json();
    ok(
      `interest 0 ${p.title}`,
      stats?.data?.interestCount === 0,
      `interest=${stats?.data?.interestCount}`
    );
  }
} catch (e) {
  ok("staging read-only", false, String(e));
}

console.log(
  failures === 0
    ? "\n=== v22.52 Static PASS ===\n"
    : `\n=== v22.52 Static FAIL (${failures}) ===\n`
);
process.exit(failures === 0 ? 0 : 1);
