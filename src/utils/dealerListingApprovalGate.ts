/**
 * v22.32 — Dealer listing owner/admin approval gate.
 *
 * Dealer-created listings must not become marketplace-visible until an
 * admin/owner approves them. Dealers cannot self-approve.
 */

export const DEALER_LISTING_STATUS_PENDING_REVIEW = "pending_review" as const;
export const DEALER_LISTING_STATUS_PUBLISHED = "published" as const;
export const DEALER_LISTING_STATUS_HIDDEN = "hidden" as const;

export type DealerListingApprovalStatus =
  | typeof DEALER_LISTING_STATUS_PENDING_REVIEW
  | typeof DEALER_LISTING_STATUS_PUBLISHED
  | typeof DEALER_LISTING_STATUS_HIDDEN;

export const DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE =
  "ประกาศของเต็นท์ต้องรอเจ้าของระบบอนุมัติก่อนลงตลาดครับ";

export const DEALER_SUBMITTED_FOR_REVIEW_MESSAGE =
  "ส่งประกาศเข้ารออนุมัติแล้ว — ยังไม่แสดงในตลาดจนกว่าเจ้าของระบบจะอนุมัติ";

/** Default status when a dealer submits a listing for marketplace. */
export function dealerListingStatusAfterSubmit(): typeof DEALER_LISTING_STATUS_PENDING_REVIEW {
  return DEALER_LISTING_STATUS_PENDING_REVIEW;
}

/** Only `published` (or legacy missing status) is marketplace-public. */
export function isMarketplacePublicListingStatus(
  listingStatus: string | null | undefined
): boolean {
  if (!listingStatus) return true; // legacy rows without status remain visible
  return listingStatus === DEALER_LISTING_STATUS_PUBLISHED;
}

export function isPendingOwnerReview(
  listingStatus: string | null | undefined
): boolean {
  return listingStatus === DEALER_LISTING_STATUS_PENDING_REVIEW;
}

/** Dealers must never promote their own listing to published. */
export function canActorPublishDealerListingToMarketplace(params: {
  isAdmin: boolean;
  /** True when the listing is dealer-scoped (has dealerId). */
  isDealerScopedListing: boolean;
}): boolean {
  if (!params.isDealerScopedListing) return true; // member listings use existing consent path
  return params.isAdmin === true;
}

export function assertCanPublishDealerListingToMarketplace(params: {
  isAdmin: boolean;
  isDealerScopedListing: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (canActorPublishDealerListingToMarketplace(params)) {
    return { ok: true };
  }
  return { ok: false, message: DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE };
}
