/**
 * v5.6I.3 — Read-only revenue preview API (admin + seller scope).
 */

import { type Express, type Request, type Response } from "express";
import {
  buildAdminRevenuePreviewApiPayload,
  buildSellerRevenuePreviewApiPayload,
} from "../services/leads/revenuePreviewBackend";
import {
  resolveOwnerRequestScope,
  type OwnerRequestScope,
} from "./ownerListingAccess";
import type { InventoryRepository } from "./repositories/inventoryRepository";

export type RevenuePreviewRoutesDeps = {
  inventoryRepository: InventoryRepository;
};

function deny(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message });
}

async function ownerScopeOrDeny(
  req: Request,
  res: Response
): Promise<OwnerRequestScope | null> {
  const access = await resolveOwnerRequestScope(req);
  if (access.ok === false) {
    deny(res, access.status, access.message);
    return null;
  }
  return access.scope;
}

export function registerRevenuePreviewRoutes(
  app: Express,
  deps: RevenuePreviewRoutesDeps
): void {
  /** Admin/superadmin — full inventory pending_sale preview from backend source. */
  app.get("/api/admin/revenue/preview", async (_req, res) => {
    try {
      const listings = await deps.inventoryRepository.listings.listAll();
      const data = buildAdminRevenuePreviewApiPayload(listings);
      return res.json({ success: true, data });
    } catch (err) {
      console.error("[GET /api/admin/revenue/preview] failed:", err);
      return res.status(500).json({
        success: false,
        message: "โหลดรายได้ preview ไม่สำเร็จครับ",
      });
    }
  });

  /** Owner/dealer — scoped revenue statement preview (no buyer PII). */
  app.get("/api/my/revenue/preview", async (req, res) => {
    const scope = await ownerScopeOrDeny(req, res);
    if (!scope) return;

    const repoScope = scope.dealerId || scope.ownerId;
    if (!repoScope) {
      return res.json({
        success: true,
        data: buildSellerRevenuePreviewApiPayload([], scope),
      });
    }

    try {
      let listings;
      if (scope.dealerId) {
        listings = await deps.inventoryRepository.listings.listByDealer(scope.dealerId);
      } else if (scope.ownerId) {
        const all = await deps.inventoryRepository.listings.listAll();
        listings = all.filter(
          (car) => String(car.ownerId ?? "").trim() === String(scope.ownerId).trim()
        );
      } else {
        listings = [];
      }
      const data = buildSellerRevenuePreviewApiPayload(listings, scope);
      return res.json({ success: true, data });
    } catch (err) {
      console.error("[GET /api/my/revenue/preview] failed:", err);
      return res.status(500).json({
        success: false,
        message: "โหลดยอดค่าบริการ preview ไม่สำเร็จครับ",
      });
    }
  });
}
