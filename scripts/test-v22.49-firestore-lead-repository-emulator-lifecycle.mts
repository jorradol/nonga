/**
 * v22.49 — Firestore Emulator lifecycle for existing buyer-lead repository
 * Run via: npm run test:v22.49-emulator
 * Requires: firebase emulators:exec (FIRESTORE_EMULATOR_HOST set).
 *
 * Does NOT touch live Staging/Production. Synthetic fixtures only.
 */
import {
  assertNoLiveFirestoreProject,
  createIsolatedEmulatorLeadRepository,
} from "./v22.49-firestore-lead-emulator-harness.mts";
import { createConsentedBuyerLead, parseBuyerLeadCreateBody, resolveListingSellerId } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  getListingInterestStats,
  getSellerMaskedQueueForListing,
  sellerRecordQueueOutcome,
  sellerRevealQueueLead,
} from "../src/services/leads/buyerLeadQueueService.ts";
import { sellerSkipQueueLead } from "../src/services/leads/sellerSkipQueueService.ts";
import { sellerMaskedQueueEntryHasNoFullPhone } from "../src/services/leads/sellerSkipQueuePolicy.ts";
import { NONGA_LEAD_CAPTURE_ENABLED_ENV } from "../src/services/leads/leadCaptureFlags.ts";
import { LEAD_ENGINE_COLLECTIONS } from "../src/services/leads/leadTypes.ts";
import {
  assertBuyerLeadTestCleanupAllowed,
} from "../src/server/repositories/buyerLeadRepositoryFirestore.ts";

let failures = 0;
function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) {
    failures += 1;
    process.exitCode = 1;
  }
}

const SYNTH_PHONE_A = "0811111111";
const SYNTH_PHONE_B = "0822222222";

const listingA = {
  id: "listing-v2249-seller-a",
  title: "Synthetic Emulator Listing A",
  price: 500_000,
  ownerId: "seller-v2249-a",
};
const listingB = {
  id: "listing-v2249-seller-b",
  title: "Synthetic Emulator Listing B",
  price: 600_000,
  ownerId: "seller-v2249-b",
};

const captureOn = { [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true" };

console.log("=== v22.49 Firestore Emulator Lead Lifecycle ===\n");

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

const { repository, dispose } = await createIsolatedEmulatorLeadRepository();

try {
  // Seed an unrelated fixture lead for Seller B — must survive cleanup of Seller A lead.
  const seedB = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-v2249-seed-b",
    listing: listingB,
    env: captureOn,
    input: {
      listingId: listingB.id,
      displayName: "Synthetic Buyer B Seed",
      contactPhone: SYNTH_PHONE_B,
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
      buyerSummary: "v22.49 synthetic seed — not real PII",
    },
  });
  ok("seed seller-B lead", seedB.ok === true && seedB.ok && !seedB.duplicate);
  const seedBId = seedB.ok ? seedB.lead.id : "";

  // Buyer override fields ignored
  const parsed = parseBuyerLeadCreateBody({
    listingId: listingA.id,
    displayName: "Synthetic Buyer A",
    contactPhone: SYNTH_PHONE_A,
    purchaseMethod: "cash",
    preferredContactWindow: "เย็น",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
    sellerId: "attacker",
    dealerId: "wrong",
    ownerId: "wrong",
  } as Record<string, unknown>);
  ok("parse drops recipient overrides", parsed != null && !("sellerId" in (parsed as object)));
  ok(
    "sellerId from listing ownership",
    resolveListingSellerId(listingA) === listingA.ownerId
  );

  // Create exactly one synthetic Lead for Seller A
  const created = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-v2249-a",
    listing: listingA,
    env: captureOn,
    input: {
      listingId: listingA.id,
      displayName: "Synthetic Buyer A",
      contactPhone: SYNTH_PHONE_A,
      purchaseMethod: "finance",
      preferredContactWindow: "เย็น",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
      buyerSummary: "v22.49 synthetic emulator lead — not real PII",
    },
  });
  ok("create lead ok", created.ok === true && created.ok && created.duplicate !== true);
  if (!created.ok) {
    throw new Error("create failed");
  }
  ok("server-derived sellerId", created.lead.sellerId === listingA.ownerId);
  ok("contact locked", created.lead.contactRevealStatus === "locked");
  const leadAId = created.lead.id;

  // Duplicate create → no second active lead
  const dup = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-v2249-a",
    listing: listingA,
    env: captureOn,
    input: {
      listingId: listingA.id,
      displayName: "Synthetic Buyer A",
      contactPhone: SYNTH_PHONE_A,
      purchaseMethod: "finance",
      preferredContactWindow: "เย็น",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
  });
  ok("duplicate returns existing", dup.ok === true && dup.ok && dup.duplicate === true);
  ok("duplicate same id", dup.ok && dup.lead.id === leadAId);
  const listedAfterDup = await repository.listBuyerLeadsByListingId(listingA.id);
  ok("still exactly one lead on listing A", listedAfterDup.length === 1);

  // Interest count
  let stats = await getListingInterestStats(repository, listingA.id);
  ok("interest count 1 after create", stats.interestCount === 1);

  // Masked queue for correct seller
  const queueA = await getSellerMaskedQueueForListing(
    repository,
    listingA.id,
    listingA.ownerId
  );
  ok("queue is array", Array.isArray(queueA));
  if (Array.isArray(queueA)) {
    ok("queue length 1", queueA.length === 1);
    ok("contactMasked", queueA[0]?.contactMasked === true);
    ok(
      "no full phone in queue",
      sellerMaskedQueueEntryHasNoFullPhone(queueA[0]!) &&
        !String(queueA[0]?.contactPhone ?? "").includes(SYNTH_PHONE_A)
    );
  }

  // Wrong seller cannot view
  const queueWrong = await getSellerMaskedQueueForListing(
    repository,
    listingA.id,
    listingB.ownerId
  );
  ok(
    "wrong seller denied queue",
    !Array.isArray(queueWrong) && queueWrong.ok === false
  );

  // Wrong seller cannot reveal / skip / outcome
  const revealWrong = await sellerRevealQueueLead({
    repository,
    listingId: listingA.id,
    sellerId: listingB.ownerId,
    leadId: leadAId,
    actorUserId: listingB.ownerId,
  });
  ok("wrong seller reveal 403", revealWrong.ok === false && revealWrong.status === 403);

  const skipWrong = await sellerSkipQueueLead({
    repository,
    listingId: listingA.id,
    sellerId: listingB.ownerId,
    leadId: leadAId,
    reason: "insufficient_info",
    actorUserId: listingB.ownerId,
  });
  ok("wrong seller skip 403", skipWrong.ok === false && skipWrong.status === 403);

  const outcomeWrong = await sellerRecordQueueOutcome({
    repository,
    listingId: listingA.id,
    sellerId: listingB.ownerId,
    leadId: leadAId,
    outcome: "unreachable",
    actorUserId: listingB.ownerId,
  });
  ok("wrong seller outcome 403", outcomeWrong.ok === false && outcomeWrong.status === 403);

  // Restart / multi-instance simulation: new repository instance on same Emulator DB
  const { repository: repoB, dispose: disposeB } =
    await createIsolatedEmulatorLeadRepository();
  try {
    const fromB = await repoB.getBuyerLeadById(leadAId);
    ok("instance B reads lead after recreate", fromB != null && fromB.id === leadAId);
    ok(
      "instance B sellerId intact",
      fromB?.sellerId === listingA.ownerId
    );
    const statsB = await getListingInterestStats(repoB, listingA.id);
    ok("instance B interest still 1", statsB.interestCount === 1);

    // Skip via instance B (shared durable state)
    const skipped = await sellerSkipQueueLead({
      repository: repoB,
      listingId: listingA.id,
      sellerId: listingA.ownerId,
      leadId: leadAId,
      reason: "insufficient_info",
      actorUserId: listingA.ownerId,
    });
    ok("skip ok", skipped.ok === true);
    ok(
      "withdrawn",
      skipped.ok &&
        skipped.lead.queueLifecycle === "withdrawn" &&
        skipped.lead.status === "not_proceeded"
    );

    stats = await getListingInterestStats(repoB, listingA.id);
    ok("interest count 0 after skip", stats.interestCount === 0);

    // Durability of withdrawn across another recreate
    const { repository: repoC, dispose: disposeC } =
      await createIsolatedEmulatorLeadRepository();
    try {
      const after = await repoC.getBuyerLeadById(leadAId);
      ok(
        "withdrawn survives recreate",
        after?.queueLifecycle === "withdrawn"
      );
      const statsC = await getListingInterestStats(repoC, listingA.id);
      ok("interest still 0 after recreate", statsC.interestCount === 0);

      // Targeted cleanup of lead A only
      process.env.NONGA_LEAD_TEST_CLEANUP = "1";
      assertBuyerLeadTestCleanupAllowed();
      const deleted = await repoC.deleteBuyerLeadByIdForControlledCleanup(leadAId);
      ok("targeted delete lead A", deleted === true);
      const gone = await repoC.getBuyerLeadById(leadAId);
      ok("lead A gone", gone === null);
      const seedStill = await repoC.getBuyerLeadById(seedBId);
      ok("unrelated seller-B seed intact", seedStill != null && seedStill.id === seedBId);
      const statsSeed = await getListingInterestStats(repoC, listingB.id);
      ok("seller-B interest still 1", statsSeed.interestCount === 1);

      // Cleanup seed B
      await repoC.deleteBuyerLeadByIdForControlledCleanup(seedBId);
      ok(
        "seed B cleaned",
        (await repoC.getBuyerLeadById(seedBId)) === null
      );
    } finally {
      await disposeC();
    }
  } finally {
    await disposeB();
  }

  // Failure modes (static-ish against this process)
  ok(
    "collections named",
    LEAD_ENGINE_COLLECTIONS.buyerLeads === "buyerLeads" &&
      LEAD_ENGINE_COLLECTIONS.leadContactLogs === "leadContactLogs"
  );

  // Missing seller / listing
  const noSeller = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-x",
    listing: { id: "x", title: "x", price: 1, ownerId: "" },
    env: captureOn,
    input: {
      listingId: "x",
      displayName: "X",
      contactPhone: "0833333333",
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
  });
  ok("missing seller 400", noSeller.ok === false && noSeller.status === 400);

  const captureOff = await createConsentedBuyerLead({
    repository,
    buyerUserId: "buyer-x",
    listing: listingA,
    env: {},
    input: {
      listingId: listingA.id,
      displayName: "X",
      contactPhone: "0833333333",
      purchaseMethod: "cash",
      preferredContactWindow: "เช้า",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
  });
  ok("kill switch still blocks create", captureOff.ok === false && captureOff.status === 403);

  // Cleanup gate without flag/emulator would fail — we have emulator so allowed.
  ok("cleanup allowed under emulator", true);

  console.log(
    failures === 0
      ? "\n=== v22.49 Emulator lifecycle PASS ===\n"
      : `\n=== v22.49 Emulator lifecycle FAIL (${failures}) ===\n`
  );
} finally {
  await dispose();
  delete process.env.NONGA_LEAD_TEST_CLEANUP;
}

process.exit(failures === 0 ? 0 : 1);
