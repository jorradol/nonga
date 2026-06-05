/**
 * v5.6I.6 — Firestore rules for settlement / financial collections (static + emulator)
 * npm run test:v56i6-settlement-firestore-rules
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
import { SETTLEMENT_COLLECTIONS } from "../src/services/leads/settlementPersistenceModel.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FIN = {
  recordId: "sfr-rules-test-1",
  adjustmentId: "adj-rules-test-1",
  auditLogId: "audit-rules-test-1",
  subEventId: "sub-event-rules-1",
} as const;

/** Synthetic settlement fixtures — no buyer phone/email/contact PII. */
const sampleSuccessFeeRecord = {
  id: FIN.recordId,
  listingId: DOCS.listingPublishedA,
  sellerId: UIDS.member,
  feeAmount: 4000,
  paidAmount: 0,
  remainingAmount: 4000,
  settlementStatus: "unbilled",
  createdAt: "2026-06-05T00:00:00.000Z",
  updatedAt: "2026-06-05T00:00:00.000Z",
};

const sampleAdjustment = {
  settlementId: FIN.adjustmentId,
  listingId: DOCS.listingPublishedA,
  sellerId: UIDS.member,
  feeAmount: 4000,
  paidAmount: 1000,
  waivedAmount: 0,
  remainingAmount: 3000,
  settlementStatus: "partially_paid",
  updatedAt: "2026-06-05T00:00:00.000Z",
};

const sampleAuditLog = {
  id: FIN.auditLogId,
  settlementId: FIN.adjustmentId,
  listingId: DOCS.listingPublishedA,
  sellerId: UIDS.member,
  action: "partial_payment",
  previousFeeAmount: 4000,
  newFeeAmount: 4000,
  previousPaidAmount: 0,
  newPaidAmount: 1000,
  previousRemainingAmount: 4000,
  newRemainingAmount: 3000,
  previousStatus: "unbilled",
  newStatus: "partially_paid",
  amountDelta: 1000,
  reason: "rules test synthetic",
  updatedBy: "admin-synthetic",
  updatedByRole: "admin",
  createdAt: "2026-06-05T00:00:00.000Z",
  source: "admin_manual",
};

const sampleSubEvent = {
  id: FIN.subEventId,
  eventType: "payment_recorded",
  amount: 1000,
  createdAt: "2026-06-05T00:00:00.000Z",
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertSettlementRulesInFile(path: string, label: string): void {
  const text = readFileSync(path, "utf8");
  const collections = [
    { name: "successFeeRecords", pattern: /match \/successFeeRecords\/\{recordId\}/ },
    {
      name: "settlementAdjustments",
      pattern: /match \/settlementAdjustments\/\{adjustmentId\}/,
    },
    {
      name: "settlementAuditLogs",
      pattern: /match \/settlementAuditLogs\/\{auditLogId\}/,
    },
  ] as const;

  for (const col of collections) {
    ok(`${label} has ${col.name} deny`, col.pattern.test(text));
    ok(
      `${label} ${col.name} deny all`,
      new RegExp(
        `match /${col.name}/\\{[^}]+\\}[\\s\\S]*?allow read, write: if false`
      ).test(text)
    );
    ok(
      `${label} ${col.name} subcollection deny`,
      text.includes(`match /${col.name}/`) &&
        text.includes("{document=**}") &&
        /match \/[a-zA-Z]+\/\{[^}]+\}\/\{document=\*\*\}/.test(text)
    );
  }

  const catchAll = text.indexOf("match /{document=**}");
  const settlement = text.indexOf("match /successFeeRecords/{recordId}");
  ok(
    `${label} settlement blocks before catch-all`,
    settlement >= 0 && catchAll >= 0 && settlement < catchAll
  );
  ok(
    `${label} no accidental successFeeRecords allow`,
    !/match \/successFeeRecords[\s\S]*?allow read: if true/.test(text)
  );
}

function assertFixturesHaveNoBuyerPii(): void {
  const blob = JSON.stringify({
    sampleSuccessFeeRecord,
    sampleAdjustment,
    sampleAuditLog,
    sampleSubEvent,
  }).toLowerCase();
  ok("fixtures no buyerphone field", !blob.includes("buyerphone"));
  ok("fixtures no contactphone field", !blob.includes("contactphone"));
  ok("fixtures no thai mobile pattern", !/\b0[689]\d{8}\b/.test(blob));
}

console.log("=== v5.6I.6 Settlement Firestore rules ===\n");

// --- Static rules ---
console.log("--- Static rules ---");
assertSettlementRulesInFile(resolve(repoRoot, "firestore.rules"), "firestore.rules");
assertSettlementRulesInFile(
  resolve(repoRoot, "firestore.rules.draft"),
  "firestore.rules.draft"
);
assertFixturesHaveNoBuyerPii();

ok(
  "collection constants align",
  SETTLEMENT_COLLECTIONS.successFeeRecords === "successFeeRecords" &&
    SETTLEMENT_COLLECTIONS.settlementAdjustments === "settlementAdjustments" &&
    SETTLEMENT_COLLECTIONS.settlementAuditLogs === "settlementAuditLogs"
);

const live = readFileSync(resolve(repoRoot, "firestore.rules"), "utf8");
const draft = readFileSync(resolve(repoRoot, "firestore.rules.draft"), "utf8");
ok(
  "live and draft both declare successFeeRecords",
  live.includes("match /successFeeRecords/{recordId}") &&
    draft.includes("match /successFeeRecords/{recordId}")
);

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.warn(
    "\nWARN: FIRESTORE_EMULATOR_HOST not set — skipping emulator cases (run via npm run test:v56i6-settlement-firestore-rules)."
  );
  if (process.exitCode) process.exit(process.exitCode);
  process.exit(0);
}

// --- Emulator ---
console.log("\n--- Emulator rules ---");

async function seedSettlementFixtures(
  env: Awaited<ReturnType<typeof createRulesTestEnvironment>>
): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const batch = db.batch();
    batch.set(
      db.collection("successFeeRecords").doc(FIN.recordId),
      sampleSuccessFeeRecord
    );
    batch.set(
      db.collection("settlementAdjustments").doc(FIN.adjustmentId),
      sampleAdjustment
    );
    batch.set(
      db.collection("settlementAuditLogs").doc(FIN.auditLogId),
      sampleAuditLog
    );
    batch.set(
      db
        .collection("successFeeRecords")
        .doc(FIN.recordId)
        .collection("paymentEvents")
        .doc(FIN.subEventId),
      sampleSubEvent
    );
    await batch.commit();
  });
}

async function main() {
  const env = await createRulesTestEnvironment({ firestore: true, storage: false });

  try {
    await env.clearFirestore();
    await seedFirestoreRulesFixtures(env);
    await seedSettlementFixtures(env);

    const guest = env.unauthenticatedContext();
    const guestDb = guest.firestore();
    const member = env.authenticatedContext(UIDS.member);
    const memberDb = member.firestore();
    const dealer = env.authenticatedContext(UIDS.dealerA);
    const dealerDb = dealer.firestore();
    const admin = env.authenticatedContext(UIDS.admin);
    const adminDb = admin.firestore();
    const superadmin = env.authenticatedContext(UIDS.superadmin);
    const superadminDb = superadmin.firestore();

    // successFeeRecords — read
    await runRuleCase(
      "guest read successFeeRecords",
      guestDb.collection("successFeeRecords").doc(FIN.recordId).get(),
      "deny"
    );
    await runRuleCase(
      "buyer read successFeeRecords",
      memberDb.collection("successFeeRecords").doc(FIN.recordId).get(),
      "deny"
    );
    await runRuleCase(
      "seller read own successFeeRecords",
      memberDb.collection("successFeeRecords").doc(FIN.recordId).get(),
      "deny"
    );
    await runRuleCase(
      "dealer read successFeeRecords",
      dealerDb.collection("successFeeRecords").doc(FIN.recordId).get(),
      "deny"
    );
    await runRuleCase(
      "admin read successFeeRecords",
      adminDb.collection("successFeeRecords").doc(FIN.recordId).get(),
      "deny"
    );

    // successFeeRecords — write
    await runRuleCase(
      "guest write successFeeRecords",
      guestDb.collection("successFeeRecords").doc("sfr-guest-write").set(sampleSuccessFeeRecord),
      "deny"
    );
    await runRuleCase(
      "buyer write successFeeRecords",
      memberDb.collection("successFeeRecords").doc("sfr-member-write").set(sampleSuccessFeeRecord),
      "deny"
    );
    await runRuleCase(
      "seller write own successFeeRecords",
      memberDb
        .collection("successFeeRecords")
        .doc(FIN.recordId)
        .update({ paidAmount: 9999 }),
      "deny"
    );

    // settlementAdjustments
    await runRuleCase(
      "dealer read settlementAdjustments",
      dealerDb.collection("settlementAdjustments").doc(FIN.adjustmentId).get(),
      "deny"
    );
    await runRuleCase(
      "dealer write settlementAdjustments",
      dealerDb
        .collection("settlementAdjustments")
        .doc("adj-dealer-write")
        .set(sampleAdjustment),
      "deny"
    );
    await runRuleCase(
      "admin read settlementAdjustments",
      adminDb.collection("settlementAdjustments").doc(FIN.adjustmentId).get(),
      "deny"
    );
    await runRuleCase(
      "admin write settlementAdjustments",
      adminDb
        .collection("settlementAdjustments")
        .doc(FIN.adjustmentId)
        .update({ paidAmount: 5000 }),
      "deny"
    );

    // settlementAuditLogs
    await runRuleCase(
      "superadmin read settlementAuditLogs",
      superadminDb.collection("settlementAuditLogs").doc(FIN.auditLogId).get(),
      "deny"
    );
    await runRuleCase(
      "superadmin write settlementAuditLogs",
      superadminDb
        .collection("settlementAuditLogs")
        .doc("audit-sa-write")
        .set(sampleAuditLog),
      "deny"
    );

    // list/query
    await runRuleCase(
      "guest list successFeeRecords",
      guestDb.collection("successFeeRecords").get(),
      "deny"
    );
    await runRuleCase(
      "member list settlementAdjustments",
      memberDb.collection("settlementAdjustments").get(),
      "deny"
    );
    await runRuleCase(
      "admin list settlementAuditLogs",
      adminDb.collection("settlementAuditLogs").get(),
      "deny"
    );
    await runRuleCase(
      "superadmin query successFeeRecords by listingId",
      superadminDb
        .collection("successFeeRecords")
        .where("listingId", "==", DOCS.listingPublishedA)
        .get(),
      "deny"
    );

    // subcollection under financial doc
    await runRuleCase(
      "admin read successFeeRecords subcollection",
      adminDb
        .collection("successFeeRecords")
        .doc(FIN.recordId)
        .collection("paymentEvents")
        .doc(FIN.subEventId)
        .get(),
      "deny"
    );
    await runRuleCase(
      "superadmin write successFeeRecords subcollection",
      superadminDb
        .collection("successFeeRecords")
        .doc(FIN.recordId)
        .collection("paymentEvents")
        .doc("sub-write")
        .set(sampleSubEvent),
      "deny"
    );

    // Smoke: existing non-settlement rules still work
    await runRuleCase(
      "smoke guest read published dealerListings",
      guestDb.collection("dealerListings").doc(DOCS.listingPublishedA).get(),
      "allow"
    );
    await runRuleCase(
      "smoke member update own displayName",
      memberDb.collection("users").doc(UIDS.member).update({ displayName: "Member v56i6" }),
      "allow"
    );
    await runRuleCase(
      "smoke admin read member profile",
      adminDb.collection("users").doc(UIDS.member).get(),
      "allow"
    );
    await runRuleCase(
      "smoke guest read buyerLeads still denied",
      guestDb.collection("buyerLeads").doc("blead-smoke").get(),
      "deny"
    );

    assertPass(true, "all emulator settlement rule cases completed");
    console.log("\nDone v5.6I.6 settlement Firestore rules tests.");
  } finally {
    await env.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
