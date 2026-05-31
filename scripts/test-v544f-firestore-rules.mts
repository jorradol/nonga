/**
 * v5.4.4f / v5.4.4g — Firestore rules emulator tests
 * npm run test:v544f-firestore-rules
 *
 * Requires Firebase emulators (started via firebase emulators:exec in npm script).
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
  UIDS,
} from "./emulator-rules/v544f-personas.mts";

console.log("=== Nong A v5.4.4g Firestore Rules Emulator (C1) ===");

async function main() {
  const env = await createRulesTestEnvironment({ firestore: true, storage: false });

  try {
    await env.clearFirestore();
    await seedFirestoreRulesFixtures(env);

    const guest = env.unauthenticatedContext();
    const guestDb = guest.firestore();

    await runRuleCase(
      "guest read published dealerListings",
      guestDb.collection("dealerListings").doc(DOCS.listingPublishedA).get(),
      "allow"
    );
    await runRuleCase(
      "guest read published cars",
      guestDb.collection("cars").doc(DOCS.listingPublishedA).get(),
      "allow"
    );
    await runRuleCase(
      "guest read hidden dealerListings",
      guestDb.collection("dealerListings").doc(DOCS.listingHiddenA).get(),
      "deny"
    );
    await runRuleCase(
      "guest create cars listing",
      guestDb.collection("cars").doc("guest-new").set({ dealerId: DEALER_A }),
      "deny"
    );
    await runRuleCase(
      "guest create dealerListings",
      guestDb.collection("dealerListings").doc("guest-new").set({ dealerId: DEALER_A }),
      "deny"
    );
    await runRuleCase(
      "guest create dealerDrafts",
      guestDb.collection("dealerDrafts").doc("guest-draft").set({ dealerId: DEALER_A }),
      "deny"
    );
    await runRuleCase(
      "guest create chatSessions",
      guestDb
        .collection("chatSessions")
        .doc("guest-chat")
        .set({ sessionId: "guest-chat", scope: "user", uid: "x", status: "active" }),
      "deny"
    );
    await runRuleCase(
      "guest create users",
      guestDb.collection("users").doc("guest-user").set({ role: "member" }),
      "deny"
    );
    await runRuleCase(
      "guest create dealerMembers",
      guestDb.collection("dealerMembers").doc("x").set({ uid: "x", dealerId: DEALER_A }),
      "deny"
    );

    const member = env.authenticatedContext(UIDS.member);
    const memberDb = member.firestore();

    await runRuleCase(
      "member read published dealerListings",
      memberDb.collection("dealerListings").doc(DOCS.listingPublishedA).get(),
      "allow"
    );
    await runRuleCase(
      "member update own displayName",
      memberDb
        .collection("users")
        .doc(UIDS.member)
        .update({ displayName: "Member Updated" }),
      "allow"
    );
    await runRuleCase(
      "member update own role",
      memberDb.collection("users").doc(UIDS.member).update({ role: "admin" }),
      "deny"
    );
    await runRuleCase(
      "member update own status",
      memberDb.collection("users").doc(UIDS.member).update({ status: "suspended" }),
      "deny"
    );
    await runRuleCase(
      "member update own dealerId",
      memberDb.collection("users").doc(UIDS.member).update({ dealerId: DEALER_A }),
      "deny"
    );
    await runRuleCase(
      "member read own user-scoped chatSessions",
      memberDb.collection("chatSessions").doc(DOCS.chatUserMember).get(),
      "allow"
    );
    await runRuleCase(
      "member read dealer B chatSessions",
      memberDb.collection("chatSessions").doc(DOCS.chatDealerB).get(),
      "deny"
    );
    await runRuleCase(
      "member create own user-scoped chatSessions",
      memberDb
        .collection("chatSessions")
        .doc("chat-user-member-new")
        .set({
          sessionId: "chat-user-member-new",
          scope: "user",
          uid: UIDS.member,
          status: "active",
        }),
      "allow"
    );
    await runRuleCase(
      "member create chatSessions for another user",
      memberDb
        .collection("chatSessions")
        .doc("chat-other-user")
        .set({
          sessionId: "chat-other-user",
          scope: "user",
          uid: UIDS.dealerA,
          status: "active",
        }),
      "deny"
    );

    const dealerA = env.authenticatedContext(UIDS.dealerA);
    const dealerADb = dealerA.firestore();

    await runRuleCase(
      "dealer A read own hidden dealerListings",
      dealerADb.collection("dealerListings").doc(DOCS.listingHiddenA).get(),
      "allow"
    );
    await runRuleCase(
      "dealer A read dealer B dealerListings",
      dealerADb.collection("dealerListings").doc(DOCS.listingB).get(),
      "deny"
    );
    await runRuleCase(
      "dealer A create dealerListings for dealer A",
      dealerADb
        .collection("dealerListings")
        .doc("listing-new-a")
        .set({ dealerId: DEALER_A, listingStatus: "hidden" }),
      "allow"
    );
    await runRuleCase(
      "dealer A create dealerListings for dealer B",
      dealerADb
        .collection("dealerListings")
        .doc("listing-cross-b")
        .set({ dealerId: DEALER_B, listingStatus: "hidden" }),
      "deny"
    );
    await runRuleCase(
      "dealer A update own dealerDrafts",
      dealerADb.collection("dealerDrafts").doc(DOCS.draftA).update({ title: "updated" }),
      "allow"
    );
    await runRuleCase(
      "dealer A update dealer B dealerDrafts",
      dealerADb.collection("dealerDrafts").doc(DOCS.draftB).update({ title: "hack" }),
      "deny"
    );
    await runRuleCase(
      "dealer A read own dealer chatSessions",
      dealerADb.collection("chatSessions").doc(DOCS.chatDealerA).get(),
      "allow"
    );
    await runRuleCase(
      "dealer A read dealer B chatSessions",
      dealerADb.collection("chatSessions").doc(DOCS.chatDealerB).get(),
      "deny"
    );
    await runRuleCase(
      "dealer A update own role to admin",
      dealerADb.collection("users").doc(UIDS.dealerA).update({ role: "admin" }),
      "deny"
    );

    const dealerPending = env.authenticatedContext(UIDS.dealerPending);
    const dealerPendingDb = dealerPending.firestore();
    await runRuleCase(
      "pending dealer create dealerListings",
      dealerPendingDb
        .collection("dealerListings")
        .doc("pending-listing")
        .set({ dealerId: DEALER_A, listingStatus: "hidden" }),
      "deny"
    );

    const dealerDisabled = env.authenticatedContext(UIDS.dealerDisabled);
    const dealerDisabledDb = dealerDisabled.firestore();
    await runRuleCase(
      "disabled dealer create dealerDrafts",
      dealerDisabledDb
        .collection("dealerDrafts")
        .doc("disabled-draft")
        .set({ dealerId: DEALER_A }),
      "deny"
    );

    const suspended = env.authenticatedContext(UIDS.suspended);
    const suspendedDb = suspended.firestore();
    await runRuleCase(
      "suspended user create dealerListings",
      suspendedDb
        .collection("dealerListings")
        .doc("suspended-listing")
        .set({ dealerId: DEALER_A, listingStatus: "hidden" }),
      "deny"
    );
    await runRuleCase(
      "suspended user update own displayName",
      suspendedDb
        .collection("users")
        .doc(UIDS.suspended)
        .update({ displayName: "Still Suspended" }),
      "deny"
    );

    const suspendedDealer = env.authenticatedContext(UIDS.suspendedDealer);
    const suspendedDealerDb = suspendedDealer.firestore();
    await runRuleCase(
      "suspended dealer with active membership create dealerListings",
      suspendedDealerDb
        .collection("dealerListings")
        .doc("suspended-dealer-listing")
        .set({ dealerId: DEALER_A, listingStatus: "hidden" }),
      "deny"
    );
    await runRuleCase(
      "suspended dealer with active membership update dealerDrafts",
      suspendedDealerDb
        .collection("dealerDrafts")
        .doc(DOCS.draftA)
        .update({ title: "blocked" }),
      "deny"
    );
    await runRuleCase(
      "guest read public listingImages",
      guestDb.collection("listingImages").doc(DOCS.imagePublicA).get(),
      "allow"
    );

    const admin = env.authenticatedContext(UIDS.admin);
    const adminDb = admin.firestore();

    await runRuleCase(
      "admin read member profile",
      adminDb.collection("users").doc(UIDS.member).get(),
      "allow"
    );
    await runRuleCase(
      "admin create dealerMembers",
      adminDb
        .collection("dealerMembers")
        .doc("admin-created-member")
        .set({ uid: UIDS.member, dealerId: DEALER_A, status: "active", roleInDealer: "member" }),
      "allow"
    );
    await runRuleCase(
      "admin promote member to admin",
      adminDb.collection("users").doc(UIDS.memberPromoteTarget).update({ role: "admin" }),
      "deny"
    );

    const superadmin = env.authenticatedContext(UIDS.superadmin);
    const superadminDb = superadmin.firestore();

    await runRuleCase(
      "superadmin promote member to admin",
      superadminDb
        .collection("users")
        .doc(UIDS.memberPromoteTarget)
        .update({ role: "admin" }),
      "allow"
    );
    await runRuleCase(
      "member create dealerMembers (admin action)",
      memberDb
        .collection("dealerMembers")
        .doc("member-tamper")
        .set({ uid: UIDS.member, dealerId: DEALER_A, status: "active" }),
      "deny"
    );

    await runRuleCase(
      "dealer A read legacy chats",
      dealerADb.collection("chats").doc(DOCS.legacyChatA).get(),
      "allow"
    );
    await runRuleCase(
      "dealer A create legacy chats",
      dealerADb.collection("chats").doc("legacy-new").set({ scope: "dealer", uid: UIDS.dealerA }),
      "deny"
    );
    await runRuleCase(
      "dealer A update legacy chats",
      dealerADb.collection("chats").doc(DOCS.legacyChatA).update({ status: "closed" }),
      "deny"
    );

    await runRuleCase(
      "guest read unknown collection",
      guestDb.collection("unknownCollection").doc("doc1").get(),
      "deny"
    );
    await runRuleCase(
      "member write unknown collection",
      memberDb.collection("mysteryData").doc("x").set({ a: 1 }),
      "deny"
    );

    await runRuleCase(
      "guest write ai_preferences",
      guestDb
        .collection("ai_preferences")
        .doc(`user:${UIDS.member}`)
        .set({ focusArea: "general" }),
      "deny"
    );
    await runRuleCase(
      "member read own ai_preferences",
      memberDb.collection("ai_preferences").doc(`user:${UIDS.member}`).get(),
      "allow"
    );
    await runRuleCase(
      "member write own ai_preferences",
      memberDb
        .collection("ai_preferences")
        .doc(`user:${UIDS.member}`)
        .set({ focusArea: "ev", userId: UIDS.member }),
      "allow"
    );
    await runRuleCase(
      "member read other user ai_preferences",
      memberDb.collection("ai_preferences").doc(`user:${UIDS.dealerA}`).get(),
      "deny"
    );
    await runRuleCase(
      "member write other user ai_preferences",
      memberDb
        .collection("ai_preferences")
        .doc(`user:${UIDS.dealerA}`)
        .set({ focusArea: "hack" }),
      "deny"
    );
    await runRuleCase(
      "suspended user write own ai_preferences",
      suspendedDb
        .collection("ai_preferences")
        .doc(`user:${UIDS.suspended}`)
        .set({ focusArea: "general" }),
      "deny"
    );
    await runRuleCase(
      "dealer A read own dealer ai_preferences",
      dealerADb
        .collection("ai_preferences")
        .doc(`dealer:${DEALER_A}:${UIDS.dealerA}`)
        .get(),
      "allow"
    );
    await runRuleCase(
      "dealer A write own dealer ai_preferences",
      dealerADb
        .collection("ai_preferences")
        .doc(`dealer:${DEALER_A}:${UIDS.dealerA}`)
        .set({ dealerId: DEALER_A, focusArea: "luxury" }),
      "allow"
    );
    await runRuleCase(
      "dealer A write dealer B ai_preferences scope",
      dealerADb
        .collection("ai_preferences")
        .doc(`dealer:${DEALER_B}:${UIDS.dealerA}`)
        .set({ dealerId: DEALER_B, focusArea: "hack" }),
      "deny"
    );
    await runRuleCase(
      "admin read member ai_preferences",
      adminDb.collection("ai_preferences").doc(`user:${UIDS.member}`).get(),
      "allow"
    );

    assertPass(true, "Firestore rules emulator suite complete");
  } finally {
    await env.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
