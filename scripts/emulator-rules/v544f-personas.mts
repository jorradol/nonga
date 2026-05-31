/** v5.4.4f — Firebase rules emulator test personas (UIDs only, no secrets). */

export const RULES_PROJECT_ID = "demo-nonga-v544f";

export const DEALER_A = "dealer-a";
export const DEALER_B = "dealer-b";

export const UIDS = {
  member: "member-active-uid",
  dealerA: "dealer-a-active-uid",
  dealerB: "dealer-b-active-uid",
  dealerPending: "dealer-pending-uid",
  dealerDisabled: "dealer-disabled-uid",
  suspended: "suspended-user-uid",
  admin: "admin-active-uid",
  superadmin: "superadmin-active-uid",
  memberPromoteTarget: "member-promote-target-uid",
} as const;

export function membershipId(uid: string, dealerId: string): string {
  return `${uid}_${dealerId}`;
}

export const DOCS = {
  listingPublishedA: "listing-published-a",
  listingHiddenA: "listing-hidden-a",
  listingB: "listing-b",
  draftA: "draft-a",
  draftB: "draft-b",
  chatDealerA: "chat-dealer-a",
  chatDealerB: "chat-dealer-b",
  chatUserMember: "chat-user-member",
  legacyChatA: "legacy-chat-a",
  imagePublicA: "image-public-a",
} as const;

export const STORAGE_BUCKET = `${RULES_PROJECT_ID}.appspot.com`;
