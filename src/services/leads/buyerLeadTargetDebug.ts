/**
 * v5.6E.5 — Debug helpers for buyer lead listing/seller binding (tests + staging logs).
 */

import type { BuyerLead } from "./leadTypes";
import { getListingInterestQueueStats } from "./buyerLeadQueuePolicy";
import { resolveListingSellerId } from "./buyerLeadService";

export type BuyerLeadTargetCheck = {
  ok: boolean;
  listingId: string;
  expectedSellerId: string;
  leadSellerId: string;
  sellerMatches: boolean;
  queuePosition: number;
  interestCount: number;
  issues: string[];
};

export function checkBuyerLeadTargetBinding(params: {
  lead: BuyerLead;
  listing: { id: string; ownerId?: string | null };
  allLeadsForListing: BuyerLead[];
}): BuyerLeadTargetCheck {
  const expectedSellerId = resolveListingSellerId({
    ownerId: String(params.listing.ownerId ?? ""),
  });
  const issues: string[] = [];

  if (params.lead.listingId !== params.listing.id) {
    issues.push(`listingId mismatch: lead=${params.lead.listingId} expected=${params.listing.id}`);
  }
  if (params.lead.sellerId !== expectedSellerId) {
    issues.push(
      `sellerId mismatch: lead=${params.lead.sellerId} expected=${expectedSellerId}`
    );
  }
  if (params.lead.queuePosition < 1) {
    issues.push(`invalid queuePosition: ${params.lead.queuePosition}`);
  }

  const stats = getListingInterestQueueStats(
    params.allLeadsForListing,
    params.listing.id
  );

  return {
    ok: issues.length === 0,
    listingId: params.listing.id,
    expectedSellerId,
    leadSellerId: params.lead.sellerId,
    sellerMatches: params.lead.sellerId === expectedSellerId,
    queuePosition: params.lead.queuePosition,
    interestCount: stats.interestCount,
    issues,
  };
}

export function formatBuyerLeadTargetDebugLine(check: BuyerLeadTargetCheck): string {
  return [
    `listing=${check.listingId}`,
    `seller=${check.leadSellerId}`,
    `expectedSeller=${check.expectedSellerId}`,
    `queue=#${check.queuePosition}`,
    `interestCount=${check.interestCount}`,
    check.ok ? "ok" : `issues=${check.issues.join("; ")}`,
  ].join(" ");
}
