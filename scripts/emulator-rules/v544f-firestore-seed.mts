/** v5.4.4f — Seed Firestore fixtures for rules emulator tests (admin context). */
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  DEALER_A,
  DEALER_B,
  DOCS,
  UIDS,
  membershipId,
} from "./v544f-personas.mts";

export async function seedFirestoreRulesFixtures(
  env: RulesTestEnvironment
): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const batch = db.batch();

    const user = (uid: string, role: string, status: string) => ({
      uid,
      role,
      status,
      displayName: uid,
    });

    batch.set(db.collection("users").doc(UIDS.member), user(UIDS.member, "member", "active"));
    batch.set(
      db.collection("users").doc(UIDS.memberPromoteTarget),
      user(UIDS.memberPromoteTarget, "member", "active")
    );
    batch.set(db.collection("users").doc(UIDS.dealerA), user(UIDS.dealerA, "dealer", "active"));
    batch.set(db.collection("users").doc(UIDS.dealerB), user(UIDS.dealerB, "dealer", "active"));
    batch.set(
      db.collection("users").doc(UIDS.dealerPending),
      user(UIDS.dealerPending, "dealer", "active")
    );
    batch.set(
      db.collection("users").doc(UIDS.dealerDisabled),
      user(UIDS.dealerDisabled, "dealer", "active")
    );
    batch.set(
      db.collection("users").doc(UIDS.suspended),
      user(UIDS.suspended, "member", "suspended")
    );
    batch.set(
      db.collection("users").doc(UIDS.suspendedDealer),
      user(UIDS.suspendedDealer, "dealer", "suspended")
    );
    batch.set(db.collection("users").doc(UIDS.admin), user(UIDS.admin, "admin", "active"));
    batch.set(
      db.collection("users").doc(UIDS.superadmin),
      user(UIDS.superadmin, "superadmin", "active")
    );

    const member = (
      uid: string,
      dealerId: string,
      status: string,
      roleInDealer: string
    ) => ({
      uid,
      dealerId,
      status,
      roleInDealer,
    });

    batch.set(
      db.collection("dealerMembers").doc(membershipId(UIDS.dealerA, DEALER_A)),
      member(UIDS.dealerA, DEALER_A, "active", "owner")
    );
    batch.set(
      db.collection("dealerMembers").doc(membershipId(UIDS.dealerB, DEALER_B)),
      member(UIDS.dealerB, DEALER_B, "active", "owner")
    );
    batch.set(
      db.collection("dealerMembers").doc(membershipId(UIDS.dealerPending, DEALER_A)),
      member(UIDS.dealerPending, DEALER_A, "pending", "member")
    );
    batch.set(
      db.collection("dealerMembers").doc(membershipId(UIDS.dealerDisabled, DEALER_A)),
      member(UIDS.dealerDisabled, DEALER_A, "disabled", "member")
    );
    batch.set(
      db.collection("dealerMembers").doc(membershipId(UIDS.suspendedDealer, DEALER_A)),
      member(UIDS.suspendedDealer, DEALER_A, "active", "owner")
    );

    const listing = (dealerId: string, listingStatus: string) => ({
      dealerId,
      listingStatus,
      title: "fixture listing",
    });

    batch.set(
      db.collection("dealerListings").doc(DOCS.listingPublishedA),
      listing(DEALER_A, "published")
    );
    batch.set(
      db.collection("cars").doc(DOCS.listingPublishedA),
      listing(DEALER_A, "published")
    );
    batch.set(
      db.collection("dealerListings").doc(DOCS.listingHiddenA),
      listing(DEALER_A, "hidden")
    );
    batch.set(
      db.collection("dealerListings").doc(DOCS.listingB),
      listing(DEALER_B, "hidden")
    );

    batch.set(db.collection("dealerDrafts").doc(DOCS.draftA), {
      dealerId: DEALER_A,
      title: "draft a",
    });
    batch.set(db.collection("dealerDrafts").doc(DOCS.draftB), {
      dealerId: DEALER_B,
      title: "draft b",
    });

    batch.set(db.collection("listingImages").doc(DOCS.imagePublicA), {
      dealerId: DEALER_A,
      listingId: DOCS.listingPublishedA,
      visibility: "public",
    });

    batch.set(db.collection("chatSessions").doc(DOCS.chatDealerA), {
      sessionId: DOCS.chatDealerA,
      scope: "dealer",
      uid: UIDS.dealerA,
      dealerId: DEALER_A,
      status: "active",
    });
    batch.set(db.collection("chatSessions").doc(DOCS.chatDealerB), {
      sessionId: DOCS.chatDealerB,
      scope: "dealer",
      uid: UIDS.dealerB,
      dealerId: DEALER_B,
      status: "active",
    });
    batch.set(db.collection("chatSessions").doc(DOCS.chatUserMember), {
      sessionId: DOCS.chatUserMember,
      scope: "user",
      uid: UIDS.member,
      status: "active",
    });

    batch.set(db.collection("chats").doc(DOCS.legacyChatA), {
      scope: "dealer",
      uid: UIDS.dealerA,
      dealerId: DEALER_A,
      status: "active",
    });

    batch.set(db.collection("ai_preferences").doc(`user:${UIDS.member}`), {
      userId: UIDS.member,
      focusArea: "general",
    });
    batch.set(
      db.collection("ai_preferences").doc(`dealer:${DEALER_A}:${UIDS.dealerA}`),
      {
        dealerId: DEALER_A,
        userId: UIDS.dealerA,
        focusArea: "general",
      }
    );

    await batch.commit();
  });
}
