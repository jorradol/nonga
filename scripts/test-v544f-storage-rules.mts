/**
 * v5.4.4f — Storage rules emulator tests
 * npm run test:v544f-storage-rules
 *
 * Requires Firestore + Storage emulators (Storage rules call firestore.get).
 */
import {
  createRulesTestEnvironment,
  runRuleCase,
  assertPass,
} from "./emulator-rules/v544f-test-env.mts";
import { seedFirestoreRulesFixtures } from "./emulator-rules/v544f-firestore-seed.mts";
import {
  DEALER_A,
  DEALER_B,
  DOCS,
  STORAGE_BUCKET,
  UIDS,
} from "./emulator-rules/v544f-personas.mts";

console.log("=== Nong A v5.4.4g Storage Rules Emulator (C1) ===");

function tinyJpeg(): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
    0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b,
    0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31,
    0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff,
    0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
    0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9,
  ]);
}

function oversizeImage(): Uint8Array {
  const base = tinyJpeg();
  const pad = new Uint8Array(5 * 1024 * 1024 + 1);
  pad.set(base);
  return pad;
}

async function seedPublishedListingImage(env: Awaited<ReturnType<typeof createRulesTestEnvironment>>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const storage = ctx.storage(`gs://${STORAGE_BUCKET}`);
    await storage
      .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/seed.jpg`)
      .put(tinyJpeg(), { contentType: "image/jpeg" });
  });
}

async function main() {
  const env = await createRulesTestEnvironment({ firestore: true, storage: true });

  try {
    await env.clearFirestore();
    await env.clearStorage();
    await seedFirestoreRulesFixtures(env);
    await seedPublishedListingImage(env);

    const bucket = `gs://${STORAGE_BUCKET}`;
    const guest = env.unauthenticatedContext();
    const guestStorage = guest.storage(bucket);

    await runRuleCase(
      "guest read published listing image",
      guestStorage
        .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/seed.jpg`)
        .getDownloadURL(),
      "allow"
    );
    await runRuleCase(
      "guest upload listing-images",
      guestStorage
        .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/guest.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "deny"
    );
    await runRuleCase(
      "guest upload draft-images",
      guestStorage
        .ref(`draft-images/${DEALER_A}/${DOCS.draftA}/guest.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "deny"
    );
    await runRuleCase(
      "guest upload chat-attachments",
      guestStorage
        .ref(`chat-attachments/${DEALER_A}/${DOCS.chatDealerA}/guest.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "deny"
    );

    const dealerA = env.authenticatedContext(UIDS.dealerA);
    const dealerAStorage = dealerA.storage(bucket);

    await runRuleCase(
      "dealer A upload own listing-images",
      dealerAStorage
        .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/dealer-a.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "allow"
    );
    await runRuleCase(
      "dealer A upload dealer B listing-images",
      dealerAStorage
        .ref(`listing-images/${DEALER_B}/${DOCS.listingB}/cross.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "deny"
    );
    await runRuleCase(
      "dealer A upload own draft-images",
      dealerAStorage
        .ref(`draft-images/${DEALER_A}/${DOCS.draftA}/draft.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "allow"
    );
    await runRuleCase(
      "dealer A upload non-image contentType",
      dealerAStorage
        .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/bad.pdf`)
        .put(new Uint8Array([1, 2, 3]), { contentType: "application/pdf" }),
      "deny"
    );
    await runRuleCase(
      "dealer A upload oversize image",
      dealerAStorage
        .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/huge.jpg`)
        .put(oversizeImage(), { contentType: "image/jpeg" }),
      "deny"
    );

    const dealerPending = env.authenticatedContext(UIDS.dealerPending);
    const dealerPendingStorage = dealerPending.storage(bucket);
    await runRuleCase(
      "pending dealer upload listing-images",
      dealerPendingStorage
        .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/pending.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "deny"
    );

    const suspendedDealer = env.authenticatedContext(UIDS.suspendedDealer);
    const suspendedDealerStorage = suspendedDealer.storage(bucket);
    await runRuleCase(
      "suspended dealer with active membership upload listing-images",
      suspendedDealerStorage
        .ref(`listing-images/${DEALER_A}/${DOCS.listingPublishedA}/suspended-dealer.jpg`)
        .put(tinyJpeg(), { contentType: "image/jpeg" }),
      "deny"
    );

    const member = env.authenticatedContext(UIDS.member);
    const memberStorage = member.storage(bucket);
    await runRuleCase(
      "member upload own user-avatars",
      memberStorage.ref(`user-avatars/${UIDS.member}/avatar.jpg`).put(tinyJpeg(), {
        contentType: "image/jpeg",
      }),
      "allow"
    );
    await runRuleCase(
      "member upload another user avatar",
      memberStorage.ref(`user-avatars/${UIDS.dealerA}/avatar.jpg`).put(tinyJpeg(), {
        contentType: "image/jpeg",
      }),
      "deny"
    );

    await runRuleCase(
      "dealer A upload unknown storage path",
      dealerAStorage.ref("private-secrets/leak.jpg").put(tinyJpeg(), { contentType: "image/jpeg" }),
      "deny"
    );

    assertPass(true, "Storage rules emulator suite complete");
  } finally {
    await env.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
