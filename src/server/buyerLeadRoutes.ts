/**
 * v5.6C — Buyer consent lead API (auth required; contact masked for non-owner viewers).
 */

import type { Express, Request, Response } from "express";
import type { InventoryRepository } from "./repositories/inventoryRepository";
import { createBuyerLeadRepository } from "./repositories/buyerLeadRepository";
import {
  createConsentedBuyerLead,
  parseBuyerLeadCreateBody,
} from "../services/leads/buyerLeadService";
import {
  resolveBuyerLeadViewerRole,
  toPublicBuyerLead,
} from "../services/leads/buyerLeadView";
import { getServerAuthContext, ServerAuthError } from "./serverAuthContext";
import { canAccessAdmin } from "../utils/rbac";

export function registerBuyerLeadRoutes(
  app: Express,
  deps: { inventoryRepository: InventoryRepository }
): void {
  const repository = createBuyerLeadRepository();

  app.post("/api/buyer-leads", async (req, res) => {
    try {
      const auth = await getServerAuthContext(req);
      const body = parseBuyerLeadCreateBody((req.body ?? {}) as Record<string, unknown>);
      if (!body) {
        return res.status(400).json({
          success: false,
          message: "รูปแบบข้อมูลไม่ถูกต้องครับ",
        });
      }

      const listing = await deps.inventoryRepository.listings.getById(body.listingId);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบประกาศรถที่สนใจครับ",
        });
      }
      if (listing.isSold || listing.listingStatus === "hidden") {
        return res.status(400).json({
          success: false,
          message: "ประกาศนี้ไม่พร้อมรับลีดในขณะนี้ครับ",
        });
      }

      const result = await createConsentedBuyerLead({
        input: body,
        buyerUserId: auth.uid,
        listing,
        repository,
      });

      if (result.ok === false) {
        return res.status(result.status).json({
          success: false,
          message: result.message,
          ...(result.errors ? { errors: result.errors } : {}),
        });
      }

      return res.status(201).json({
        success: true,
        message: result.buyerMessage,
        queuePosition: result.queuePosition,
        data: result.publicLead,
      });
    } catch (err) {
      if (err instanceof ServerAuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      const message = err instanceof Error ? err.message : "บันทึกลีดไม่สำเร็จ";
      return res.status(500).json({ success: false, message });
    }
  });

  app.get("/api/buyer-leads/:id", async (req, res) => {
    try {
      const leadId = String(req.params.id ?? "").trim();
      if (!leadId) {
        return res.status(400).json({ success: false, message: "ไม่พบรหัสลีด" });
      }

      let viewerUid: string | undefined;
      let viewerIsAdmin = false;
      try {
        const auth = await getServerAuthContext(req);
        viewerUid = auth.uid;
        viewerIsAdmin = canAccessAdmin(auth);
      } catch (err) {
        if (!(err instanceof ServerAuthError) || err.status !== 401) {
          throw err;
        }
      }

      const lead = await repository.getBuyerLeadById(leadId);
      if (!lead) {
        return res.status(404).json({ success: false, message: "ไม่พบลีด" });
      }

      const listing = await deps.inventoryRepository.listings.getById(lead.listingId);
      const listingSellerId = listing?.ownerId ?? lead.sellerId;

      const viewerRole = resolveBuyerLeadViewerRole({
        viewerUid,
        viewerIsAdmin,
        lead,
        listingSellerId,
      });

      if (viewerRole === "public") {
        return res.status(403).json({
          success: false,
          message: "กรุณาเข้าสู่ระบบเพื่อดูสถานะลีดของคุณครับ",
        });
      }

      return res.json({
        success: true,
        data: toPublicBuyerLead(lead, viewerRole),
      });
    } catch (err) {
      if (err instanceof ServerAuthError) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      const message = err instanceof Error ? err.message : "โหลดลีดไม่สำเร็จ";
      return res.status(500).json({ success: false, message });
    }
  });
}
