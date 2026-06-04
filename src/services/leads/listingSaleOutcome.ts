/**
 * v5.6H — Apply pending_sale to listing when seller records closed_won outcome.
 */

import type { InventoryRepository } from "../../server/repositories/inventoryRepository";
import type { BuyerLeadRepository } from "../../server/repositories/buyerLeadRepository";
import type { MarketplaceCarRecord } from "../../server/marketplaceInventory";
import type { ListingSaleStatus } from "./leadTypes";
import { applyListingSaleToBuyerQueue } from "./buyerLeadQueueService";

export function isListingSaleBlockingPublic(
  saleStatus?: ListingSaleStatus
): boolean {
  return saleStatus === "pending_sale" || saleStatus === "sold";
}

export function buildPendingSaleListingPatch(
  now: string
): Partial<MarketplaceCarRecord> {
  return {
    saleStatus: "pending_sale",
    listingStatus: "hidden",
    pendingSaleAt: now,
  };
}

export async function applyClosedWonPendingSaleForListing(params: {
  inventoryRepository: InventoryRepository;
  buyerLeadRepository: BuyerLeadRepository;
  listingId: string;
  sellerId: string;
}): Promise<
  | {
      ok: true;
      listing: MarketplaceCarRecord;
      supersededCount: number;
    }
  | { ok: false; message: string }
> {
  const listing = await params.inventoryRepository.listings.getById(params.listingId);
  if (!listing) {
    return { ok: false, message: "ไม่พบประกาศครับ" };
  }
  if (String(listing.ownerId ?? "").trim() !== params.sellerId) {
    return { ok: false, message: "ไม่มีสิทธิ์อัปเดตประกาศนี้ครับ" };
  }

  const now = new Date().toISOString();
  const updated = await params.inventoryRepository.listings.updateListing(
    params.sellerId,
    params.listingId,
    buildPendingSaleListingPatch(now)
  );
  if (!updated) {
    return { ok: false, message: "อัปเดตสถานะประกาศไม่สำเร็จครับ" };
  }

  const queueClose = await applyListingSaleToBuyerQueue({
    repository: params.buyerLeadRepository,
    listingId: params.listingId,
    saleStatus: "pending_sale",
  });

  return {
    ok: true,
    listing: updated,
    supersededCount: queueClose.supersededCount,
  };
}
