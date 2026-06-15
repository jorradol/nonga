/**
 * v5.6D — Per-listing buyer interest queue API (masked seller queue; public count only).
 */

import type { Express } from "express";
import type { InventoryRepository } from "./repositories/inventoryRepository";
import { createBuyerLeadRepository } from "./repositories/buyerLeadRepository";
import { getServerAuthContext, ServerAuthError } from "./serverAuthContext";
import { canAccessAdmin } from "../utils/rbac";
import { publicQueuePayloadHasNoOtherBuyerPii } from "../services/leads/buyerLeadQueuePolicy";
import {
  applyListingSaleToBuyerQueue,
  getListingInterestStats,
  getSellerMaskedQueueForListing,
  sellerRecordQueueOutcome,
  sellerRevealQueueLead,
} from "../services/leads/buyerLeadQueueService";
import { resolveListingSellerId } from "../services/leads/buyerLeadService";
import { sellerSkipQueueLead } from "../services/leads/sellerSkipQueueService";
import type { LeadContactOutcome } from "../services/leads/leadTypes";
import { SELLER_REVEAL_OUTCOME_VALUES } from "../services/leads/sellerLeadRevealCopy";
import { applyClosedWonPendingSaleForListing } from "../services/leads/listingSaleOutcome";
import {
  canManageListingWithScope,
  type OwnerRequestScope,
} from "./ownerListingAccess";
import type { MarketplaceCarRecord } from "./marketplaceInventory";

function ownerScopeFromAuth(auth: Awaited<ReturnType<typeof getServerAuthContext>>): OwnerRequestScope {
  return {
    ownerId: auth.uid,
    dealerId: auth.dealerId ?? null,
    isAdmin: canAccessAdmin(auth),
    role: auth.role,
    provider: "firebase",
  };
}

function canManageBuyerLeadForListing(
  auth: Awaited<ReturnType<typeof getServerAuthContext>>,
  listing: MarketplaceCarRecord
): boolean {
  if (canAccessAdmin(auth)) return true;
  return canManageListingWithScope(ownerScopeFromAuth(auth), listing);
}

function canViewSellerQueueForListing(
  auth: Awaited<ReturnType<typeof getServerAuthContext>>,
  listing: MarketplaceCarRecord
): boolean {
  return canManageBuyerLeadForListing(auth, listing);
}

export function registerBuyerLeadQueueRoutes(
  app: Express,
  deps: { inventoryRepository: InventoryRepository }
): void {
  const repository = createBuyerLeadRepository();

  app.get("/api/listings/:listingId/interest-queue-stats", async (req, res) => {
    try {
      const listingId = String(req.params.listingId ?? "").trim();
      if (!listingId) {
        return res.status(400).json({ success: false, message: "ไม่พบรหัสประกาศ" });
      }
      const stats = await getListingInterestStats(repository, listingId);
      const payload = { interestCount: stats.interestCount };
      if (!publicQueuePayloadHasNoOtherBuyerPii(payload)) {
        return res.status(500).json({ success: false, message: "privacy guard" });
      }
      return res.json({ success: true, data: stats });
    } catch (err) {
      const message = err instanceof Error ? err.message : "โหลดสถิติคิวไม่สำเร็จ";
      return res.status(500).json({ success: false, message });
    }
  });

  app.get("/api/seller/listings/:listingId/buyer-lead-queue", async (req, res) => {
    try {
      const auth = await getServerAuthContext(req);
      const listingId = String(req.params.listingId ?? "").trim();
      const listing = await deps.inventoryRepository.listings.getById(listingId);
      if (!listing) {
        return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
      }
      if (!canViewSellerQueueForListing(auth, listing)) {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์ดูคิวนี้ครับ" });
      }
      const sellerId = resolveListingSellerId(listing);
      const queue = await getSellerMaskedQueueForListing(repository, listingId, sellerId);
      if (!Array.isArray(queue)) {
        return res.status(403).json({ success: false, message: queue.message });
      }
      return res.json({ success: true, data: queue });
    } catch (err) {
      if (err instanceof ServerAuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      const message = err instanceof Error ? err.message : "โหลดคิวไม่สำเร็จ";
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/seller/buyer-leads/:leadId/skip", async (req, res) => {
    try {
      const auth = await getServerAuthContext(req);
      const leadId = String(req.params.leadId ?? "").trim();
      const body = (req.body ?? {}) as { reason?: string; note?: string };
      const lead = await repository.getBuyerLeadById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, message: "ไม่พบลีด" });
      }
      const listing = await deps.inventoryRepository.listings.getById(lead.listingId);
      if (!listing) {
        return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
      }
      if (!canManageBuyerLeadForListing(auth, listing)) {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์ข้ามลีดนี้ครับ" });
      }
      const result = await sellerSkipQueueLead({
        repository,
        listingId: lead.listingId,
        sellerId: lead.sellerId,
        leadId,
        reason: String(body.reason ?? "").trim(),
        note: typeof body.note === "string" ? body.note : undefined,
        actorUserId: auth.uid,
      });
      if (result.ok === false) {
        return res.status(result.status).json({ success: false, message: result.message });
      }
      return res.json({
        success: true,
        data: {
          leadId: result.lead.id,
          buyerQueueFeedback: result.buyerQueueFeedback,
          nextRevealableLeadId: result.nextRevealableLeadId ?? null,
        },
      });
    } catch (err) {
      if (err instanceof ServerAuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: "ข้ามคิวไม่สำเร็จ" });
    }
  });

  app.post("/api/seller/buyer-leads/:leadId/reveal", async (req, res) => {
    try {
      const auth = await getServerAuthContext(req);
      const leadId = String(req.params.leadId ?? "").trim();
      const lead = await repository.getBuyerLeadById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, message: "ไม่พบลีด" });
      }
      const listing = await deps.inventoryRepository.listings.getById(lead.listingId);
      if (!listing) {
        return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
      }
      if (!canManageBuyerLeadForListing(auth, listing)) {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์เปิดเบอร์ลีดนี้ครับ" });
      }
      const result = await sellerRevealQueueLead({
        repository,
        listingId: lead.listingId,
        sellerId: lead.sellerId,
        leadId,
        actorUserId: auth.uid,
      });
      if (result.ok === false) {
        return res.status(result.status).json({ success: false, message: result.message });
      }
      return res.json({
        success: true,
        data: {
          leadId: result.lead.id,
          contactPhone: result.lead.contactPhone,
          displayName: result.lead.displayName,
          contactRevealStatus: result.lead.contactRevealStatus,
          contactRevealedAt: result.lead.contactRevealedAt ?? null,
        },
      });
    } catch (err) {
      if (err instanceof ServerAuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: "เปิดเบอร์ไม่สำเร็จ" });
    }
  });

  app.post("/api/seller/buyer-leads/:leadId/outcome", async (req, res) => {
    try {
      const auth = await getServerAuthContext(req);
      const leadId = String(req.params.leadId ?? "").trim();
      const outcome = String((req.body as { outcome?: string })?.outcome ?? "").trim() as LeadContactOutcome;
      if (!SELLER_REVEAL_OUTCOME_VALUES.has(outcome)) {
        return res.status(400).json({ success: false, message: "ผลลัพธ์ไม่ถูกต้องครับ" });
      }
      const lead = await repository.getBuyerLeadById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, message: "ไม่พบลีด" });
      }
      const listing = await deps.inventoryRepository.listings.getById(lead.listingId);
      if (!listing) {
        return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
      }
      if (!canManageBuyerLeadForListing(auth, listing)) {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์อัปเดตลีดนี้ครับ" });
      }
      const result = await sellerRecordQueueOutcome({
        repository,
        listingId: lead.listingId,
        sellerId: lead.sellerId,
        leadId,
        outcome,
        actorUserId: auth.uid,
      });
      if (result.ok === false) {
        return res.status(result.status).json({ success: false, message: result.message });
      }

      let listingSaleStatus: string | null = null;
      let queueSupersededCount = 0;
      if (outcome === "closed_won") {
        const pending = await applyClosedWonPendingSaleForListing({
          inventoryRepository: deps.inventoryRepository,
          buyerLeadRepository: repository,
          listingId: lead.listingId,
          sellerId: lead.sellerId,
        });
        if (pending.ok === false) {
          return res.status(400).json({ success: false, message: pending.message });
        }
        listingSaleStatus = pending.listing.saleStatus ?? "pending_sale";
        queueSupersededCount = pending.supersededCount;
      }

      return res.json({
        success: true,
        data: {
          leadId: result.lead.id,
          nextRevealableLeadId: result.nextRevealableLeadId ?? null,
          listingSaleStatus,
          queueSupersededCount,
        },
      });
    } catch (err) {
      if (err instanceof ServerAuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: "บันทึกผลไม่สำเร็จ" });
    }
  });

  /** Internal/staging hook when listing enters pending_sale or sold (no admin settlement). */
  app.post("/api/seller/listings/:listingId/queue-close", async (req, res) => {
    try {
      const auth = await getServerAuthContext(req);
      const listingId = String(req.params.listingId ?? "").trim();
      const saleStatus = String((req.body as { saleStatus?: string })?.saleStatus ?? "").trim();
      if (saleStatus !== "pending_sale" && saleStatus !== "sold") {
        return res.status(400).json({ success: false, message: "สถานะไม่รองรับ" });
      }
      const listing = await deps.inventoryRepository.listings.getById(listingId);
      if (!listing || String(listing.ownerId ?? "") !== auth.uid) {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์" });
      }
      const closed = await applyListingSaleToBuyerQueue({
        repository,
        listingId,
        saleStatus,
      });
      return res.json({ success: true, data: closed });
    } catch (err) {
      if (err instanceof ServerAuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: "ปิดคิวไม่สำเร็จ" });
    }
  });
}
