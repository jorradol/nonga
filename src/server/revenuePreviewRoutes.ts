/**
 * v5.6I.3 / v5.6I.4 — Revenue preview API (admin + seller scope) + manual adjustments.
 */

import { type Express, type Request, type Response } from "express";
import { resolveCarDealerId } from "./marketplaceInventory";
import { deriveAdminRevenuePreviewRowsFromListings } from "../services/leads/adminRevenuePreview";
import type { SettlementAdjustmentAction } from "../services/leads/leadTypes";
import {
  buildAdminRevenuePreviewApiPayload,
  buildSellerRevenuePreviewApiPayload,
  filterPendingSaleListings,
  loadRevenuePreviewAdjustmentOverlay,
  marketplaceCarToRevenueListingSource,
} from "../services/leads/revenuePreviewBackend";
import { SettlementAdjustmentAuditInvariantError } from "../services/leads/settlementAdjustmentApply";
import {
  previewRowToAdjustmentBase,
  validateSettlementAdjustmentInput,
} from "../services/leads/settlementAdjustmentService";
import {
  resolveSettlementRequestId,
  SettlementAdjustmentIdempotencyConflictError,
} from "../services/leads/settlementIdempotency";
import {
  resolveOwnerRequestScope,
  type OwnerRequestScope,
} from "./ownerListingAccess";
import type { InventoryRepository } from "./repositories/inventoryRepository";
import {
  createSettlementAdjustmentRepository,
  type SettlementAdjustmentRepository,
} from "./repositories/settlementAdjustmentRepository";

export type RevenuePreviewRoutesDeps = {
  inventoryRepository: InventoryRepository;
  settlementAdjustmentRepository?: SettlementAdjustmentRepository;
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

function parseAdjustmentAction(value: unknown): SettlementAdjustmentAction | null {
  const actions: SettlementAdjustmentAction[] = [
    "record_payment",
    "partial_payment",
    "mark_paid",
    "waive_fee",
    "dispute_fee",
    "cancel_fee",
    "manual_adjustment",
    "admin_note",
  ];
  const action = String(value ?? "").trim() as SettlementAdjustmentAction;
  return actions.includes(action) ? action : null;
}

function adminActorFromRequest(req: Request): {
  updatedBy: string;
  updatedByRole: "admin" | "superadmin";
} | null {
  const role = req.apiAuth?.role;
  if (role !== "admin" && role !== "superadmin") return null;
  return {
    updatedBy: String(req.apiAuth?.uid ?? req.apiAuth?.email ?? "admin").trim(),
    updatedByRole: role,
  };
}

export function registerRevenuePreviewRoutes(
  app: Express,
  deps: RevenuePreviewRoutesDeps
): void {
  const adjustmentRepo =
    deps.settlementAdjustmentRepository ?? createSettlementAdjustmentRepository();

  /** Admin/superadmin — full inventory pending_sale preview from backend source. */
  app.get("/api/admin/revenue/preview", async (_req, res) => {
    try {
      const listings = await deps.inventoryRepository.listings.listAll();
      const pending = filterPendingSaleListings(listings);
      const overlay = await loadRevenuePreviewAdjustmentOverlay(
        pending.map((c) => c.id),
        adjustmentRepo
      );
      const data = buildAdminRevenuePreviewApiPayload(listings, overlay);
      return res.json({ success: true, data });
    } catch (err) {
      console.error("[GET /api/admin/revenue/preview] failed:", err);
      return res.status(500).json({
        success: false,
        message: "โหลดรายได้ preview ไม่สำเร็จครับ",
      });
    }
  });

  /** Admin/superadmin — record manual settlement adjustment + audit log. */
  app.post("/api/admin/revenue/adjustments", async (req, res) => {
    const actor = adminActorFromRequest(req);
    if (!actor) {
      return deny(res, 403, "บัญชีนี้ไม่มีสิทธิ์ปรับยอดค่าบริการครับ");
    }

    const listingId = String(req.body?.listingId ?? "").trim();
    const action = parseAdjustmentAction(req.body?.action);
    if (!listingId) {
      return deny(res, 400, "กรุณาระบุ listingId ครับ");
    }
    if (!action) {
      return deny(res, 400, "action ไม่ถูกต้องครับ");
    }

    try {
      const listings = await deps.inventoryRepository.listings.listAll();
      const car = listings.find((c) => c.id === listingId);
      if (!car || car.saleStatus !== "pending_sale") {
        return deny(
          res,
          404,
          "ไม่พบรายการรถ pending_sale สำหรับปรับยอดครับ"
        );
      }

      const source = marketplaceCarToRevenueListingSource(car);
      const previewRows = deriveAdminRevenuePreviewRowsFromListings([source]);
      const baseRow = previewRows[0];
      if (!baseRow) {
        return deny(res, 422, "ไม่สามารถคำนวณยอดค่าบริการจากรายการนี้ได้ครับ");
      }

      const existing = await adjustmentRepo.getStateByListingId(listingId);
      const current =
        existing ??
        previewRowToAdjustmentBase(baseRow, {
          dealerId: car.dealerId ?? resolveCarDealerId(car),
        });

      const input = {
        listingId,
        leadId: req.body?.leadId ? String(req.body.leadId).trim() : undefined,
        action,
        amount:
          req.body?.amount !== undefined ? Number(req.body.amount) : undefined,
        newFeeAmount:
          req.body?.newFeeAmount !== undefined
            ? Number(req.body.newFeeAmount)
            : undefined,
        reason: String(req.body?.reason ?? "").trim(),
        adminNote: req.body?.adminNote
          ? String(req.body.adminNote).trim()
          : undefined,
        updatedBy: actor.updatedBy,
        updatedByRole: actor.updatedByRole,
      };

      const preflight = validateSettlementAdjustmentInput(input, current);
      if (preflight.ok === false) {
        return deny(res, 400, preflight.message);
      }

      const requestId = resolveSettlementRequestId(req.body?.requestId);
      const result = await adjustmentRepo.applyAdjustmentWithAudit({
        current,
        input,
        requestId,
      });

      const overlay = await loadRevenuePreviewAdjustmentOverlay(
        [listingId],
        adjustmentRepo
      );
      const preview = buildAdminRevenuePreviewApiPayload(listings, overlay);
      const previewRow = preview.rows.find((r) => r.listingId === listingId);

      return res.json({
        success: true,
        data: {
          adjustment: result.state,
          audit: result.audit,
          previewRow,
          idempotency: {
            requestId: result.requestId,
            outcome: result.outcome,
          },
        },
      });
    } catch (err) {
      if (err instanceof SettlementAdjustmentIdempotencyConflictError) {
        return deny(res, 409, err.message);
      }
      if (err instanceof SettlementAdjustmentAuditInvariantError) {
        return deny(res, 400, err.message);
      }
      const message =
        err instanceof Error ? err.message : "บันทึกการปรับยอดไม่สำเร็จครับ";
      console.error("[POST /api/admin/revenue/adjustments] failed:", err);
      return res.status(400).json({ success: false, message });
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
        listings = await deps.inventoryRepository.listings.listByDealer(
          scope.dealerId
        );
      } else if (scope.ownerId) {
        const all = await deps.inventoryRepository.listings.listAll();
        listings = all.filter(
          (car) =>
            String(car.ownerId ?? "").trim() === String(scope.ownerId).trim()
        );
      } else {
        listings = [];
      }

      const scopedPending = filterPendingSaleListings(listings).filter((car) => {
        if (scope.dealerId) {
          return resolveCarDealerId(car) === scope.dealerId;
        }
        return (
          String(car.ownerId ?? "").trim() === String(scope.ownerId).trim()
        );
      });
      const overlay = await loadRevenuePreviewAdjustmentOverlay(
        scopedPending.map((c) => c.id),
        adjustmentRepo
      );
      const data = buildSellerRevenuePreviewApiPayload(listings, scope, overlay);
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
