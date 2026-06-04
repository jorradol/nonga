/**
 * v5.6H — Apply pending_sale to listing when seller records closed_won outcome.
 */

import type { InventoryRepository } from "../../server/repositories/inventoryRepository";
import type { BuyerLeadRepository } from "../../server/repositories/buyerLeadRepository";
import type { MarketplaceCarRecord } from "../../server/marketplaceInventory";
import type { ListingSaleStatus } from "./leadTypes";
import { applyListingSaleToBuyerQueue } from "./buyerLeadQueueService";
import { validateMemberListingRecordReadyToPublish } from "../listings/memberListingPublishGuard";
import { CANCEL_PENDING_SALE_NOT_PENDING_MESSAGE } from "./listingSaleCopy";

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

export function buildCancelPendingSaleRelistPatch(params: {
  listing: MarketplaceCarRecord;
  now: string;
  reason?: string;
}): {
  patch: Partial<MarketplaceCarRecord>;
  canPublish: boolean;
  guardMessage?: string;
} {
  const forGuard: MarketplaceCarRecord = {
    ...params.listing,
    saleStatus: "sale_cancelled",
    listingStatus: "hidden",
  };
  const guard = validateMemberListingRecordReadyToPublish(forGuard);
  const canPublish = guard.ok === true;
  return {
    canPublish,
    guardMessage: canPublish ? undefined : guard.message,
    patch: {
      saleStatus: "sale_cancelled",
      saleCancelledAt: params.now,
      ...(params.reason?.trim()
        ? { saleCancelReason: params.reason.trim().slice(0, 200) }
        : {}),
      listingStatus: canPublish ? "published" : "hidden",
    },
  };
}

export async function cancelPendingSaleAndRelist(params: {
  inventoryRepository: InventoryRepository;
  listingId: string;
  repoScopeId: string;
  reason?: string;
}): Promise<
  | { ok: true; listing: MarketplaceCarRecord; published: boolean }
  | {
      ok: false;
      status: 400 | 403 | 404 | 422;
      message: string;
      listing?: MarketplaceCarRecord;
      published: false;
    }
> {
  const listing = await params.inventoryRepository.listings.getById(params.listingId);
  if (!listing) {
    return {
      ok: false,
      status: 404,
      message: "ไม่พบประกาศครับ",
      published: false,
    };
  }
  if (listing.saleStatus !== "pending_sale") {
    return {
      ok: false,
      status: 400,
      message: CANCEL_PENDING_SALE_NOT_PENDING_MESSAGE,
      published: false,
    };
  }

  const now = new Date().toISOString();
  const { patch, canPublish, guardMessage } = buildCancelPendingSaleRelistPatch({
    listing,
    now,
    reason: params.reason,
  });

  const updated = await params.inventoryRepository.listings.updateListing(
    params.repoScopeId,
    params.listingId,
    patch
  );
  if (!updated) {
    return {
      ok: false,
      status: 404,
      message: "อัปเดตประกาศไม่สำเร็จครับ",
      published: false,
    };
  }

  if (!canPublish) {
    return {
      ok: false,
      status: 422,
      message: guardMessage ?? "ข้อมูลประกาศยังไม่พร้อมลงตลาดครับ",
      listing: updated,
      published: false,
    };
  }

  return { ok: true, listing: updated, published: true };
}
