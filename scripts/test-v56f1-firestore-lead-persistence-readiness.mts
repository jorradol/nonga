/**
 * v5.6F.1 — Firestore lead persistence readiness (no rules deploy, no real Firestore writes)
 * npm run test:v56f1-firestore-lead-persistence-readiness
 */
import { readFileSync } from "node:fs";
import {
  createBuyerLeadRepository,
  resetBuyerLeadRepositoryForTests,
  resolveBuyerLeadDataBackend,
} from "../src/server/repositories/buyerLeadRepository.ts";
import { createFirestoreBuyerLeadRepository } from "../src/server/repositories/buyerLeadRepositoryFirestore.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  getSellerMaskedQueueForListing,
  listLeadsForListing,
} from "../src/services/leads/buyerLeadQueueService.ts";
import {
  publicQueuePayloadHasNoOtherBuyerPii,
  toSellerMaskedQueue,
} from "../src/services/leads/buyerLeadQueuePolicy.ts";
import { sellerMaskedQueueEntryHasNoFullPhone } from "../src/services/leads/sellerSkipQueuePolicy.ts";
import { toPublicBuyerLead } from "../src/services/leads/buyerLeadView.ts";
import { sellerSkipQueueLead } from "../src/services/leads/sellerSkipQueueService.ts";
import type { BuyerLead } from "../src/services/leads/leadTypes.ts";
import { LEAD_ENGINE_COLLECTIONS } from "../src/services/leads/leadTypes.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const listing = {
  id: "listing-f1",
  title: "Toyota Test",
  price: 800_000,
  ownerId: "seller-f1",
};

function makeLead(partial: Partial<BuyerLead> & { id: string; queuePosition: number }): BuyerLead {
  const now = new Date().toISOString();
  return {
    listingId: listing.id,
    sellerId: listing.ownerId,
    buyerUserId: "buyer-a",
    displayName: "ผู้ซื้อ A",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เย็น",
    buyerSummary: "สนใจรถ",
    consent: { version: BUYER_LEAD_CONSENT_VERSION, consentedAt: now, listingId: listing.id },
    source: "chat",
    status: "consented",
    contactRevealStatus: "locked",
    queueLifecycle: "active",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

// --- factory defaults ---
{
  ok("default backend memory", resolveBuyerLeadDataBackend({}) === "memory");
  ok(
    "env firestore resolves",
    resolveBuyerLeadDataBackend({ NONGA_LEAD_DATA_BACKEND: "firestore" }) === "firestore"
  );
  resetBuyerLeadRepositoryForTests();
  ok("singleton after reset is memory", resolveBuyerLeadDataBackend() === "memory");
}

// --- firestore without admin credentials → clear error (no silent fallback) ---
{
  const saved = {
    FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;

  let message = "";
  try {
    createFirestoreBuyerLeadRepository();
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  } finally {
    if (saved.FIREBASE_SERVICE_ACCOUNT_JSON) {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = saved.FIREBASE_SERVICE_ACCOUNT_JSON;
    }
    if (saved.GOOGLE_APPLICATION_CREDENTIALS) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = saved.GOOGLE_APPLICATION_CREDENTIALS;
    }
    if (saved.FIREBASE_CLIENT_EMAIL) process.env.FIREBASE_CLIENT_EMAIL = saved.FIREBASE_CLIENT_EMAIL;
    if (saved.FIREBASE_PRIVATE_KEY) process.env.FIREBASE_PRIVATE_KEY = saved.FIREBASE_PRIVATE_KEY;
  }

  ok("firestore init fails without admin creds", message.length > 0);
  ok(
    "firestore error mentions credentials",
    /credentials|Firebase Admin/i.test(message),
    message.slice(0, 120)
  );
}

// --- create lead redaction (memory repo, same API layer as firestore) ---
{
  resetBuyerLeadRepositoryForTests();
  const repo = createBuyerLeadRepository("memory");
  const result = await createConsentedBuyerLead({
    input: {
      listingId: listing.id,
      displayName: "ลุงทดสอบ",
      contactPhone: "0823456789",
      purchaseMethod: "cash",
      preferredContactWindow: "โทรเย็น",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
      offeredPrice: 750_000,
    },
    buyerUserId: "buyer-create-f1",
    listing,
    repository: repo,
  });
  ok("create lead ok", result.ok === true);
  if (result.ok) {
    ok("buyer_self sees real phone", result.publicLead.contactPhone.includes("082"));
    ok("buyer_self contactMasked false", result.publicLead.contactMasked === false);
    const sellerView = toPublicBuyerLead(result.lead, "listing_seller");
    ok("seller view masks phone", sellerView.contactPhone !== result.lead.contactPhone);
    ok("seller view contactMasked", sellerView.contactMasked === true);
  }
}

// --- seller masked queue: no real phone ---
{
  resetBuyerLeadRepositoryForTests();
  const repo = createBuyerLeadRepository("memory");
  await repo.createBuyerLead(
    makeLead({ id: "blead-q1", queuePosition: 1, buyerUserId: "buyer-a", contactPhone: "0811111111" })
  );
  await repo.createBuyerLead(
    makeLead({
      id: "blead-q2",
      queuePosition: 2,
      buyerUserId: "buyer-b",
      displayName: "ผู้ซื้อ B",
      contactPhone: "0822222222",
    })
  );
  const queue = await getSellerMaskedQueueForListing(repo, listing.id, listing.ownerId);
  ok("seller queue is array", Array.isArray(queue));
  if (Array.isArray(queue)) {
    ok("queue length 2", queue.length === 2);
    ok(
      "no full phone in queue rows",
      queue.every((r) => sellerMaskedQueueEntryHasNoFullPhone(r))
    );
    ok("all rows contactMasked", queue.every((r) => r.contactMasked));
    ok("head canRevealContact when locked (v5.6G)", queue[0]?.canRevealContact === true);
  }
  const direct = toSellerMaskedQueue(await listLeadsForListing(repo, listing.id), listing.id);
  ok("policy masked phone", direct[0]?.contactPhone !== "0811111111");
}

// --- skip response: no phone ---
{
  resetBuyerLeadRepositoryForTests();
  const repo = createBuyerLeadRepository("memory");
  const lead = makeLead({ id: "blead-skip", queuePosition: 1 });
  await repo.createBuyerLead(lead);
  const skip = await sellerSkipQueueLead({
    repository: repo,
    listingId: listing.id,
    sellerId: listing.ownerId,
    leadId: lead.id,
    reason: "insufficient_info",
    actorUserId: listing.ownerId,
  });
  ok("skip ok", skip.ok === true);
  if (skip.ok) {
    const payload = JSON.stringify({
      leadId: skip.lead.id,
      buyerQueueFeedback: skip.buyerQueueFeedback,
    });
    ok("skip json has no phone digits", !payload.includes("0811111111"));
  }
}

// --- public stats PII guard ---
{
  ok("public stats guard", publicQueuePayloadHasNoOtherBuyerPii({ interestCount: 3 }));
  ok("public stats rejects phone field", !publicQueuePayloadHasNoOtherBuyerPii({ contactPhone: "081" }));
}

// --- firestore collections + rules draft doc ---
{
  ok("collection buyerLeads", LEAD_ENGINE_COLLECTIONS.buyerLeads === "buyerLeads");
  ok("collection leadContactLogs", LEAD_ENGINE_COLLECTIONS.leadContactLogs === "leadContactLogs");
  ok("collection buyerPurchaseProfiles", LEAD_ENGINE_COLLECTIONS.buyerPurchaseProfiles === "buyerPurchaseProfiles");
  const rules = readFileSync("firestore.rules", "utf8");
  const draftRules = readFileSync("firestore.rules.draft", "utf8");
  ok("live rules have buyerLeads deny block", rules.includes("match /buyerLeads/{leadId}"));
  ok("draft rules have buyerLeads deny block", draftRules.includes("match /buyerLeads/{leadId}"));
  ok("live rules default deny catch-all", rules.includes("allow read, write: if false"));
  const doc = readFileSync("docs/v5.6F.1-firestore-lead-persistence-readiness.md", "utf8");
  ok("doc has staging enable plan", doc.includes("Staging enable plan"));
  ok("doc denies client buyerLeads read", doc.includes("allow read, write: if false"));
  ok("doc references v56f2 rules", doc.includes("v5.6F.2") || doc.includes("v56f2"));
}

// --- firestore repo maps collections ---
{
  const fsSource = readFileSync("src/server/repositories/buyerLeadRepositoryFirestore.ts", "utf8");
  ok("firestore uses buyerLeads collection", fsSource.includes('LEAD_ENGINE_COLLECTIONS.buyerLeads'));
  ok("firestore uses leadContactLogs collection", fsSource.includes("leadContactLogs"));
}

console.log("\nDone v5.6F.1 Firestore lead persistence readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
