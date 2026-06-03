/**
 * v5.6C — Mask buyer lead for API responses by viewer role.
 */

import { maskBuyerContact } from "./leadPolicy";
import type { BuyerLead } from "./leadTypes";

export type BuyerLeadViewerRole =
  | "buyer_self"
  | "listing_seller"
  | "admin"
  | "public";

export interface PublicBuyerLead {
  id: string;
  listingId: string;
  sellerId: string;
  displayName: string;
  contactPhone: string;
  budgetMin?: number;
  budgetMax?: number;
  purchaseMethod: BuyerLead["purchaseMethod"];
  offeredPrice?: number;
  preferredContactWindow: string;
  buyerSummary: string;
  status: BuyerLead["status"];
  contactRevealStatus: BuyerLead["contactRevealStatus"];
  createdAt: string;
  updatedAt: string;
  contactMasked: boolean;
  queuePosition?: number;
  queueLifecycle?: BuyerLead["queueLifecycle"];
}

export function resolveBuyerLeadViewerRole(params: {
  viewerUid?: string | null;
  viewerIsAdmin?: boolean;
  lead: Pick<BuyerLead, "buyerUserId" | "sellerId">;
  listingSellerId: string;
}): BuyerLeadViewerRole {
  if (params.viewerIsAdmin) return "admin";
  const uid = params.viewerUid?.trim();
  if (uid && params.lead.buyerUserId === uid) return "buyer_self";
  if (uid && (params.lead.sellerId === uid || params.listingSellerId === uid)) {
    return "listing_seller";
  }
  return "public";
}

export function toPublicBuyerLead(
  lead: BuyerLead,
  viewerRole: BuyerLeadViewerRole
): PublicBuyerLead {
  const revealContact = viewerRole === "buyer_self" || viewerRole === "admin";
  const masked = maskBuyerContact({
    displayName: lead.displayName,
    contactPhone: lead.contactPhone,
    revealContact,
  });
  return {
    id: lead.id,
    listingId: lead.listingId,
    sellerId: lead.sellerId,
    displayName: masked.displayName,
    contactPhone: masked.contactPhone,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    purchaseMethod: lead.purchaseMethod,
    offeredPrice: lead.offeredPrice,
    preferredContactWindow: lead.preferredContactWindow,
    buyerSummary: lead.buyerSummary,
    status: lead.status,
    contactRevealStatus: lead.contactRevealStatus,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    contactMasked: masked.phoneMasked || masked.nameMasked,
    ...(viewerRole === "buyer_self"
      ? {
          queuePosition: lead.queuePosition,
          queueLifecycle: lead.queueLifecycle,
        }
      : {}),
  };
}
