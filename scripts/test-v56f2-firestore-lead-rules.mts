/**
 * v5.6F.2 — Firestore rules for lead collections (static + emulator)
 * npm run test:v56f2-firestore-lead-rules
 *
 * Requires Firebase emulators via firebase emulators:exec (see package.json).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRulesTestEnvironment,
  runRuleCase,
  assertPass,
} from "./emulator-rules/v544f-test-env.mts";
import { seedFirestoreRulesFixtures } from "./emulator-rules/v544f-firestore-seed.mts";
import { DOCS, UIDS } from "./emulator-rules/v544f-personas.mts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LEAD = {
  leadId: "blead-rules-test-1",
  logId: "bclog-rules-test-1",
  profileId: "buyer-profile-rules-test",
} as const;

const sampleLead = {
  id: LEAD.leadId,
  listingId: "listing-published-a",
  sellerId: "seller-uid",
  displayName: "Test Buyer",
  contactPhone: "0812345678",
  purchaseMethod: "cash",
  preferredContactWindow: "evening",
  buyerSummary: "test",
  status: "consented",
  contactRevealStatus: "locked",
  queuePosition: 1,
  queueLifecycle: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertLeadRulesInFile(path: string, label: string): void {
  const text = readFileSync(path, "utf8");
  ok(`${label} has buyerLeads deny`, text.includes("match /buyerLeads/{leadId}"));
  ok(`${label} buyerLeads deny all`, /match \/buyerLeads\/\{leadId\}[\s\S]*?allow read, write: if false/.test(text));
  ok(`${label} has leadContactLogs deny`, text.includes("match /leadContactLogs/{logId}"));
  ok(`${label} has buyerPurchaseProfiles deny`, text.includes("match /buyerPurchaseProfiles/{buyerUserId}"));
  const catchAll = text.indexOf('match /{document=**}');
  const buyerLeads = text.indexOf("match /buyerLeads/{leadId}");
  ok(`${label} buyerLeads before catch-all`, buyerLeads >= 0 && buyerLeads < catchAll);
  ok(`${label} no accidental buyerLeads allow`, !/match \/buyerLeads[\s\S]*?allow read: if true/.test(text));
}

console.log("=== v5.6F.2 Firestore lead collection rules ===\n");

// --- Static rules checks (no emulator) ---
console.log("--- Static rules ---");
assertLeadRulesInFile(resolve(repoRoot, "firestore.rules"), "firestore.rules");
assertLeadRulesInFile(resolve(repoRoot, "firestore.rules.draft"), "firestore.rules.draft");

const live = readFileSync(resolve(repoRoot, "firestore.rules"), "utf8");
const draft = readFileSync(resolve(repoRoot, "firestore.rules.draft"), "utf8");
ok(
  "draft and live both declare buyerLeads",
  live.includes("match /buyerLeads/{leadId}") && draft.includes("match /buyerLeads/{leadId}")
);

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.warn(
    "\nWARN: FIRESTORE_EMULATOR_HOST not set — skipping emulator cases (run via npm run test:v56f2-firestore-lead-rules)."
  );
  if (process.exitCode) process.exit(process.exitCode);
  process.exit(0);
}

// --- Emulator ---
console.log("\n--- Emulator rules ---");

async function main() {
  const env = await createRulesTestEnvironment({ firestore: true, storage: false });

  try {
    await env.clearFirestore();
    await seedFirestoreRulesFixtures(env);

    const guest = env.unauthenticatedContext();
    const guestDb = guest.firestore();
    const member = env.authenticatedContext(UIDS.member);
    const memberDb = member.firestore();
    const dealer = env.authenticatedContext(UIDS.dealerA);
    const dealerDb = dealer.firestore();
    const admin = env.authenticatedContext(UIDS.admin);
    const adminDb = admin.firestore();

    await runRuleCase(
      "guest read buyerLeads",
      guestDb.collection("buyerLeads").doc(LEAD.leadId).get(),
      "deny"
    );
    await runRuleCase(
      "member read buyerLeads",
      memberDb.collection("buyerLeads").doc(LEAD.leadId).get(),
      "deny"
    );
    await runRuleCase(
      "seller read buyerLeads",
      dealerDb.collection("buyerLeads").doc(LEAD.leadId).get(),
      "deny"
    );
    await runRuleCase(
      "admin read buyerLeads direct",
      adminDb.collection("buyerLeads").doc(LEAD.leadId).get(),
      "deny"
    );

    await runRuleCase(
      "guest create buyerLeads",
      guestDb.collection("buyerLeads").doc(LEAD.leadId).set(sampleLead),
      "deny"
    );
    await runRuleCase(
      "member create buyerLeads",
      memberDb.collection("buyerLeads").doc(LEAD.leadId).set(sampleLead),
      "deny"
    );
    await runRuleCase(
      "seller update buyerLeads",
      dealerDb.collection("buyerLeads").doc(LEAD.leadId).update({ status: "reported" }),
      "deny"
    );

    await runRuleCase(
      "guest read leadContactLogs",
      guestDb.collection("leadContactLogs").doc(LEAD.logId).get(),
      "deny"
    );
    await runRuleCase(
      "member write leadContactLogs",
      memberDb.collection("leadContactLogs").doc(LEAD.logId).set({
        id: LEAD.logId,
        buyerLeadId: LEAD.leadId,
        listingId: "x",
        sellerId: "y",
        action: "consent_recorded",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      "deny"
    );

    await runRuleCase(
      "guest read buyerPurchaseProfiles",
      guestDb.collection("buyerPurchaseProfiles").doc(LEAD.profileId).get(),
      "deny"
    );
    await runRuleCase(
      "member write buyerPurchaseProfiles",
      memberDb
        .collection("buyerPurchaseProfiles")
        .doc(UIDS.member)
        .set({
          displayName: "Member",
          purchaseMethod: "cash",
          preferredContactWindow: "day",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      "deny"
    );
    await runRuleCase(
      "admin write buyerPurchaseProfiles",
      adminDb.collection("buyerPurchaseProfiles").doc(LEAD.profileId).set({
        displayName: "Admin",
        purchaseMethod: "cash",
        preferredContactWindow: "day",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      "deny"
    );

    // Smoke: existing non-lead rules still work
    await runRuleCase(
      "smoke guest read published dealerListings",
      guestDb.collection("dealerListings").doc(DOCS.listingPublishedA).get(),
      "allow"
    );
    await runRuleCase(
      "smoke member update own displayName",
      memberDb.collection("users").doc(UIDS.member).update({ displayName: "Member v56f2" }),
      "allow"
    );
    await runRuleCase(
      "smoke admin read member profile",
      adminDb.collection("users").doc(UIDS.member).get(),
      "allow"
    );

    console.log("\nDone v5.6F.2 Firestore lead rules tests.");
  } finally {
    await env.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
