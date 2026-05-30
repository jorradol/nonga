import type { SavedMemberListingCardData } from "../../types";

/** Pending publish context TTL — refresh หรือกด publish ใหม่หลังหมดอายุ */
export const PENDING_PUBLISH_LISTING_TTL_MS = 30 * 60 * 1000;

export type PendingPublishListingContext = {
  sessionId: string;
  listingId: string;
  publicRefCode: string;
  card: SavedMemberListingCardData;
  createdAt: number;
};

const bySession = new Map<string, PendingPublishListingContext>();

export function setPendingPublishListingContext(params: {
  sessionId: string;
  listingId: string;
  publicRefCode: string;
  card: SavedMemberListingCardData;
}): PendingPublishListingContext {
  const listingId = params.listingId.trim();
  const publicRefCode = params.publicRefCode.trim();
  const existing = bySession.get(params.sessionId);

  if (
    existing &&
    existing.listingId === listingId &&
    existing.publicRefCode === publicRefCode
  ) {
    return existing;
  }

  const next: PendingPublishListingContext = {
    sessionId: params.sessionId,
    listingId,
    publicRefCode,
    card: params.card,
    createdAt: Date.now(),
  };
  bySession.set(params.sessionId, next);
  return next;
}

export function getPendingPublishListingContext(
  sessionId: string
): PendingPublishListingContext | null {
  const ctx = bySession.get(sessionId);
  if (!ctx) return null;

  if (Date.now() - ctx.createdAt > PENDING_PUBLISH_LISTING_TTL_MS) {
    bySession.delete(sessionId);
    return null;
  }

  return ctx;
}

export function isPendingPublishListingContextExpired(
  ctx: PendingPublishListingContext
): boolean {
  return Date.now() - ctx.createdAt > PENDING_PUBLISH_LISTING_TTL_MS;
}

export function clearPendingPublishListingContext(sessionId: string): void {
  bySession.delete(sessionId);
}

/** Test-only reset */
export function clearAllPendingPublishListingContextsForTest(): void {
  bySession.clear();
}
