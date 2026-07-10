/**
 * v22.52 — Firestore Emulator concurrent / multi-instance duplicate hardening.
 * Run via: npm run test:v22.52-emulator
 * Synthetic fixtures only. Never touches live Staging/Production.
 */
import {
  assertNoLiveFirestoreProject,
  createIsolatedEmulatorLeadRepository,
} from "./v22.49-firestore-lead-emulator-harness.mts";
import {
  createConsentedBuyerLead,
  parseBuyerLeadCreateBody,
  resolveListingSellerId,
} from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  getListingInterestStats,
  getSellerMaskedQueueForListing,
} from "../src/services/leads/buyerLeadQueueService.ts";
import { sellerSkipQueueLead } from "../src/services/leads/sellerSkipQueueService.ts";
import { sellerMaskedQueueEntryHasNoFullPhone } from "../src/services/leads/sellerSkipQueuePolicy.ts";
import { NONGA_LEAD_CAPTURE_ENABLED_ENV } from "../src/services/leads/leadCaptureFlags.ts";
import { LEAD_ENGINE_COLLECTIONS } from "../src/services/leads/leadTypes.ts";
import {
  assertBuyerLeadTestCleanupAllowed,
  type FirestoreBuyerLeadRepository,
} from "../src/server/repositories/buyerLeadRepositoryFirestore.ts";
import { getFirestore } from "firebase-admin/firestore";

let failures = 0;
function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) {
    failures += 1;
    process.exitCode = 1;
  }
}

const SYNTH_PHONE = "0811111111";
const captureOn = { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" };

const listingA = {
  id: "listing-v2252-em-a",
  title: "Synthetic Emulator Listing A",
  price: 500_000,
  ownerId: "seller-v2252-em-a",
};
const listingB = {
  id: "listing-v2252-em-b",
  title: "Synthetic Emulator Listing B",
  price: 600_000,
  ownerId: "seller-v2252-em-b",
};

console.log("=== v22.52 Firestore Emulator Duplicate Hardening ===\n");

if (!process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
  console.error("FAIL FIRESTORE_EMULATOR_HOST required — abort (no live fallback)");
  process.exit(1);
}

try {
  assertNoLiveFirestoreProject();
  ok("isolation guard ok", true);
} catch (e) {
  ok("isolation guard ok", false, String(e));
  process.exit(1);
}

const { repository, app, dispose } = await createIsolatedEmulatorLeadRepository();
const fsRepo = repository as FirestoreBuyerLeadRepository;

async function countContactLogs(buyerLeadId: string): Promise<number> {
  const db = getFirestore(app);
  const snap = await db
    .collection(LEAD_ENGINE_COLLECTIONS.leadContactLogs)
    .where("buyerLeadId", "==", buyerLeadId)
    .get();
  return snap.size;
}

async function countSlots(): Promise<number> {
  const db = getFirestore(app);
  const snap = await db
    .collection(LEAD_ENGINE_COLLECTIONS.buyerLeadIdempotencyRecords)
    .get();
  return snap.size;
}

try {
  // Kill switch before repository write
  const off = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-v2252-em",
    listing: listingA,
    env: {},
    input: {
      listingId: listingA.id,
      displayName: "Synthetic",
      contactPhone: SYNTH_PHONE,
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
  });
  ok("kill switch OFF blocks", off.ok === false && off.status === 403);
  ok(
    "no lead after OFF",
    (await repository.listBuyerLeadsByListingId(listingA.id)).length === 0
  );
  ok("no slots after OFF", (await countSlots()) === 0);

  // Recipient override ignored
  const parsed = parseBuyerLeadCreateBody({
    listingId: listingA.id,
    displayName: "Synthetic Buyer",
    contactPhone: SYNTH_PHONE,
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
    sellerId: "attacker",
  } as Record<string, unknown>);
  ok("parse drops recipient", parsed != null && !("sellerId" in (parsed as object)));
  ok("seller from ownership", resolveListingSellerId(listingA) === listingA.ownerId);

  // One request → one Lead
  const created = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-v2252-em",
    listing: listingA,
    env: captureOn,
    input: {
      listingId: listingA.id,
      displayName: "Synthetic Buyer",
      contactPhone: SYNTH_PHONE,
      purchaseMethod: "finance",
      preferredContactWindow: "เย็น",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
      buyerSummary: "v22.52 synthetic emulator — not real PII",
    },
  });
  ok("create ok", created.ok === true && created.ok && created.duplicate !== true);
  if (!created.ok) throw new Error("create failed");
  const leadAId = created.lead.id;
  ok("server-derived sellerId", created.lead.sellerId === listingA.ownerId);
  ok("contact locked", created.lead.contactRevealStatus === "locked");
  ok("one contact log", (await countContactLogs(leadAId)) === 1);
  ok("one active slot", (await countSlots()) === 1);

  // Sequential identical retry
  const seq = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-v2252-em",
    listing: listingA,
    env: captureOn,
    input: {
      listingId: listingA.id,
      displayName: "Synthetic Buyer",
      contactPhone: SYNTH_PHONE,
      purchaseMethod: "finance",
      preferredContactWindow: "เย็น",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
  });
  ok("sequential duplicate", seq.ok === true && seq.ok && seq.duplicate === true);
  ok("sequential same id", seq.ok && seq.lead.id === leadAId);
  ok(
    "still one lead",
    (await repository.listBuyerLeadsByListingId(listingA.id)).length === 1
  );
  ok("contact logs still one", (await countContactLogs(leadAId)) === 1);

  // Concurrent identical (same process, shared Emulator = multi-writer race)
  const concurrentListing = {
    id: "listing-v2252-em-concurrent",
    title: "Concurrent Listing",
    price: 1,
    ownerId: "seller-v2252-em-a",
  };
  const concurrent = await Promise.all(
    Array.from({ length: 10 }, () =>
      createConsentedBuyerLead({
        repository,
        buyerUserId: "buyer-v2252-em-concurrent",
        listing: concurrentListing,
        env: captureOn,
        input: {
          listingId: concurrentListing.id,
          displayName: "Concurrent Buyer",
          contactPhone: "0822222222",
          purchaseMethod: "cash",
          preferredContactWindow: "เช้า",
          consentConfirmed: true,
          consentVersion: BUYER_LEAD_CONSENT_VERSION,
        },
      })
    )
  );
  const concurrentLeads = await repository.listBuyerLeadsByListingId(
    concurrentListing.id
  );
  ok("concurrent lead count 1", concurrentLeads.length === 1);
  const createdN = concurrent.filter((r) => r.ok && r.duplicate !== true).length;
  const dupN = concurrent.filter((r) => r.ok && r.duplicate === true).length;
  ok("concurrent one created", createdN === 1, `created=${createdN}`);
  ok("concurrent nine duplicates", dupN === 9, `dups=${dupN}`);
  if (concurrentLeads[0]) {
    ok(
      "concurrent contact log 1",
      (await countContactLogs(concurrentLeads[0].id)) === 1
    );
  }
  const interestConcurrent = await getListingInterestStats(
    repository,
    concurrentListing.id
  );
  ok("concurrent interest 1", interestConcurrent.interestCount === 1);

  // Multi-instance simulation: new repository on same Emulator DB
  const { repository: repoB, dispose: disposeB } =
    await createIsolatedEmulatorLeadRepository();
  try {
    const fromB = await repoB.getBuyerLeadById(leadAId);
    ok("instance B reads lead", fromB != null && fromB.id === leadAId);

    const dupFromB = await createConsentedBuyerLead({
      repository: repoB,
      buyerUserId: "buyer-v2252-em",
      listing: listingA,
      env: captureOn,
      input: {
        listingId: listingA.id,
        displayName: "Synthetic Buyer",
        contactPhone: SYNTH_PHONE,
        purchaseMethod: "finance",
        preferredContactWindow: "เย็น",
        consentConfirmed: true,
        consentVersion: BUYER_LEAD_CONSENT_VERSION,
      },
    });
    ok(
      "instance B duplicate protected",
      dupFromB.ok === true && dupFromB.ok && dupFromB.duplicate === true
    );
    ok(
      "instance B same lead id",
      dupFromB.ok && dupFromB.lead.id === leadAId
    );
    ok(
      "listing A still one after instance B",
      (await repoB.listBuyerLeadsByListingId(listingA.id)).length === 1
    );

    // Different listing distinct
    const other = await createConsentedBuyerLead({
      repository: repoB,
      buyerUserId: "buyer-v2252-em",
      listing: listingB,
      env: captureOn,
      input: {
        listingId: listingB.id,
        displayName: "Synthetic Buyer",
        contactPhone: SYNTH_PHONE,
        purchaseMethod: "cash",
        preferredContactWindow: "เช้า",
        consentConfirmed: true,
        consentVersion: BUYER_LEAD_CONSENT_VERSION,
      },
    });
    ok(
      "different listing distinct",
      other.ok === true && other.ok && other.duplicate !== true && other.lead.id !== leadAId
    );

    // Seller isolation / masking
    const queue = await getSellerMaskedQueueForListing(
      repoB,
      listingA.id,
      listingA.ownerId
    );
    ok("queue length 1", Array.isArray(queue) && queue.length === 1);
    if (Array.isArray(queue) && queue[0]) {
      ok(
        "masked",
        sellerMaskedQueueEntryHasNoFullPhone(queue[0]) &&
          !String(queue[0].contactPhone ?? "").includes(SYNTH_PHONE)
      );
    }
    const wrong = await getSellerMaskedQueueForListing(
      repoB,
      listingA.id,
      listingB.ownerId
    );
    ok("wrong seller 403-path", !Array.isArray(wrong) && wrong.ok === false);

    // Legitimate later inquiry after skip/withdraw
    const skipped = await sellerSkipQueueLead({
      repository: repoB,
      listingId: listingA.id,
      sellerId: listingA.ownerId,
      leadId: leadAId,
      reason: "insufficient_info",
      actorUserId: listingA.ownerId,
    });
    ok("skip ok", skipped.ok === true);
    const later = await createConsentedBuyerLead({
      repository: repoB,
      buyerUserId: "buyer-v2252-em",
      listing: listingA,
      env: captureOn,
      input: {
        listingId: listingA.id,
        displayName: "Synthetic Buyer Later",
        contactPhone: SYNTH_PHONE,
        purchaseMethod: "cash",
        preferredContactWindow: "เช้า",
        consentConfirmed: true,
        consentVersion: BUYER_LEAD_CONSENT_VERSION,
      },
    });
    ok(
      "later inquiry allowed",
      later.ok === true && later.ok && later.duplicate !== true && later.lead.id !== leadAId
    );

    // Targeted cleanup of fixtures only
    process.env.NONGA_LEAD_TEST_CLEANUP = "1";
    assertBuyerLeadTestCleanupAllowed();
    const fixtures: Array<{ leadId: string; listingId: string; buyerUserId: string }> = [
      { leadId: leadAId, listingId: listingA.id, buyerUserId: "buyer-v2252-em" },
    ];
    if (concurrentLeads[0]) {
      fixtures.push({
        leadId: concurrentLeads[0].id,
        listingId: concurrentListing.id,
        buyerUserId: "buyer-v2252-em-concurrent",
      });
    }
    if (other.ok) {
      fixtures.push({
        leadId: other.lead.id,
        listingId: listingB.id,
        buyerUserId: "buyer-v2252-em",
      });
    }
    if (later.ok) {
      fixtures.push({
        leadId: later.lead.id,
        listingId: listingA.id,
        buyerUserId: "buyer-v2252-em",
      });
    }
    for (const f of fixtures) {
      await fsRepo.deleteBuyerLeadFixturesForControlledCleanup(f);
    }
    // Also clean via repoB for leads created there if needed
    ok(
      "listing A cleaned",
      (await repoB.listBuyerLeadsByListingId(listingA.id)).length === 0
    );
    ok(
      "listing B cleaned",
      (await repoB.listBuyerLeadsByListingId(listingB.id)).length === 0
    );
    ok(
      "concurrent cleaned",
      (await repoB.listBuyerLeadsByListingId(concurrentListing.id)).length === 0
    );
  } finally {
    await disposeB();
  }

  console.log(
    failures === 0
      ? "\n=== v22.52 Emulator PASS ===\n"
      : `\n=== v22.52 Emulator FAIL (${failures}) ===\n`
  );
} finally {
  await dispose();
  delete process.env.NONGA_LEAD_TEST_CLEANUP;
}

process.exit(failures === 0 ? 0 : 1);
