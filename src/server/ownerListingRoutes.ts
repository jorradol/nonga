import { type Express, type Request, type Response } from "express";
import {
  resolveCarDealerId,
  type MarketplaceCarRecord,
} from "./marketplaceInventory";
import { inferMarketplaceCategoryType } from "../utils/marketplaceCarMapper";
import { sanitizeListingImagesForId } from "../utils/listingImages";
import {
  canManageListingWithScope,
  resolveOwnerRequestScope,
  type OwnerRequestScope,
} from "./ownerListingAccess";
import {
  decodeListingImageFiles,
  persistListingImageUploads,
} from "./listingImageUploadBody";
import type { InventoryRepository } from "./repositories/inventoryRepository";
import { validateMemberListingRecordReadyToPublish } from "../services/listings/memberListingPublishGuard";
import { cancelPendingSaleAndRelist } from "../services/leads/listingSaleOutcome";
import { CANCEL_PENDING_SALE_GUARD_FAIL_MESSAGE } from "../services/leads/listingSaleCopy";
import {
  DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE,
  DEALER_SUBMITTED_FOR_REVIEW_MESSAGE,
  assertCanPublishDealerListingToMarketplace,
  dealerListingStatusAfterSubmit,
} from "../utils/dealerListingApprovalGate";

export type OwnerListingRoutesDeps = {
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

function listingRepoScope(
  scope: OwnerRequestScope,
  car: MarketplaceCarRecord
): string {
  return scope.dealerId || scope.ownerId || resolveCarDealerId(car);
}

function toPublishConsentPatch(body: unknown): Partial<MarketplaceCarRecord> {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  const next: Partial<MarketplaceCarRecord> = {};
  if (b.sellerConsentAccepted === true) next.sellerConsentAccepted = true;
  if (typeof b.sellerConsentAcceptedAt === "string") {
    next.sellerConsentAcceptedAt = b.sellerConsentAcceptedAt;
  }
  if (typeof b.sellerConsentVersion === "string") {
    next.sellerConsentVersion = b.sellerConsentVersion;
  }
  if (typeof b.sellerConsentSource === "string") {
    next.sellerConsentSource = b.sellerConsentSource;
  }
  if (typeof b.sellerConsentTextKey === "string") {
    next.sellerConsentTextKey = b.sellerConsentTextKey;
  }
  return next;
}

async function getCarAccessOrDeny(
  req: Request,
  res: Response,
  deps: OwnerListingRoutesDeps
): Promise<{ car: MarketplaceCarRecord; scope: OwnerRequestScope } | null> {
  const scope = await ownerScopeOrDeny(req, res);
  if (!scope) return null;

  const carId = req.params.id;
  const car = await deps.inventoryRepository.listings.getById(carId);
  if (!car) {
    console.warn("[ownerListing] listing not found for manage request", {
      carId,
      dataBackend: deps.inventoryRepository.backend,
      ownerId: scope.ownerId ?? undefined,
      dealerId: scope.dealerId ?? undefined,
    });
    deny(res, 404, "ไม่พบประกาศ");
    return null;
  }
  if (!canManageListingWithScope(scope, car)) {
    console.warn("[ownerListing] listing owner mismatch", {
      carId,
      dataBackend: deps.inventoryRepository.backend,
      requestOwnerId: scope.ownerId ?? undefined,
      carOwnerId: car.ownerId,
    });
    deny(res, 403, "ไม่มีสิทธิ์แก้ไขประกาศนี้");
    return null;
  }
  return { car, scope };
}

export function registerOwnerListingRoutes(
  app: Express,
  deps: OwnerListingRoutesDeps
): void {
  /** ประกาศของเจ้าของ — รวมที่ซ่อนแล้ว (same inventoryRepository as POST /api/cars) */
  app.get("/api/my/listings", async (req, res) => {
    const scope = await ownerScopeOrDeny(req, res);
    if (!scope) return;
    const repoScope = scope.dealerId || scope.ownerId;
    if (!repoScope) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const data = await deps.inventoryRepository.listings.listByDealer(repoScope);
    res.json({ success: true, count: data.length, data });
  });

  /** อัปโหลดรูปจาก edit listing / member chat save */
  app.post("/api/cars/:id/images", async (req, res) => {
    const access = await getCarAccessOrDeny(req, res, deps);
    if (!access) return;
    const { car } = access;
    const carId = car.id;
    const endpoint = `/api/cars/${carId}/images`;

    const body = req.body ?? {};
    const decoded = decodeListingImageFiles(body.files);
    if (decoded.ok === false) {
      console.warn("[ownerListing] image upload decode failed", {
        carId,
        endpoint,
        status: decoded.status,
        message: decoded.message,
        fileCount: Array.isArray(body.files) ? body.files.length : 0,
      });
      return res.status(decoded.status).json({
        ok: false,
        success: false,
        error: decoded.error,
        message: decoded.message,
      });
    }

    const persisted = await persistListingImageUploads(
      resolveCarDealerId(car),
      carId,
      decoded.items
    );
    if (persisted.ok === false) {
      console.warn("[ownerListing] image upload storage failed", {
        carId,
        endpoint,
        status: persisted.status,
        message: persisted.message,
        fileCount: decoded.items.length,
      });
      return res.status(persisted.status).json({
        ok: false,
        success: false,
        message: persisted.message,
      });
    }

    const failedFiles = persisted.failedFiles ?? [];
    console.info("[ownerListing] image upload ok", {
      carId,
      endpoint,
      uploadedCount: persisted.storedUrls.length,
      requestedCount: decoded.items.length,
      failedFileCount: failedFiles.length,
      failedFileNames: failedFiles.map((f) => f.name),
    });

    res.json({
      success: true,
      data: {
        storedUrls: persisted.storedUrls,
        ...(failedFiles.length > 0 ? { failedFiles } : {}),
      },
    });
  });

  app.post("/api/my/listings/:id/cancel-pending-sale", async (req, res) => {
    const access = await getCarAccessOrDeny(req, res, deps);
    if (!access) return;
    const { car, scope } = access;

    const reason =
      typeof req.body?.reason === "string" ? req.body.reason : undefined;
    const result = await cancelPendingSaleAndRelist({
      inventoryRepository: deps.inventoryRepository,
      listingId: car.id,
      repoScopeId: listingRepoScope(scope, car),
      reason,
    });

    if (result.ok === false) {
      const payload: Record<string, unknown> = {
        success: false,
        message: result.message,
        published: result.published,
      };
      if (result.listing) {
        payload.data = result.listing;
      }
      if (result.status === 422) {
        payload.message = CANCEL_PENDING_SALE_GUARD_FAIL_MESSAGE;
      }
      return res.status(result.status).json(payload);
    }

    return res.json({
      success: true,
      data: result.listing,
      published: result.published,
      message: result.published
        ? "ยกเลิกสถานะรอขายแล้ว รถกลับแสดงในตลาดครับ"
        : "ยกเลิกสถานะรอขายแล้วครับ",
    });
  });

  app.patch("/api/cars/:id", async (req, res) => {
    const access = await getCarAccessOrDeny(req, res, deps);
    if (!access) return;
    const { car, scope } = access;

    const body = req.body ?? {};
    const nextType = inferMarketplaceCategoryType({
      type: body.type ?? car.type,
      fuelType: body.fuelType ?? car.fuelType,
      bodyType: body.bodyType,
      condition: body.condition ?? car.condition,
      price: body.price != null ? Number(body.price) : car.price,
    });

    const patch: Partial<MarketplaceCarRecord> = {};
    if (body.title != null) patch.title = String(body.title);
    if (body.brand != null) patch.brand = String(body.brand);
    if (body.model != null) patch.model = String(body.model);
    if (body.year != null) patch.year = Number(body.year);
    if (body.price != null) patch.price = Number(body.price);
    if (body.mileage != null) patch.mileage = Number(body.mileage);
    if (body.fuelType != null) patch.fuelType = String(body.fuelType);
    if (body.description != null) {
      patch.description = String(body.description).slice(0, 4000);
    }
    if (body.condition != null) patch.condition = String(body.condition);
    if (body.images != null) {
      patch.images = sanitizeListingImagesForId(body.images, car.id);
    }
    patch.type = nextType;

    const gear = body.gear ?? body.transmission;
    if (gear != null) patch.transmission = String(gear);
    if (body.color != null) patch.color = String(body.color);

    const updated = await deps.inventoryRepository.listings.updateListing(
      listingRepoScope(scope, car),
      car.id,
      patch
    );
    if (!updated) {
      return deny(res, 404, "ไม่พบประกาศ");
    }
    res.json({ success: true, data: updated });
  });

  app.patch("/api/cars/:id/visibility", async (req, res) => {
    const access = await getCarAccessOrDeny(req, res, deps);
    if (!access) return;
    const { car, scope } = access;

    const hidden = Boolean(req.body?.hidden);
    const isDealerScoped = Boolean(resolveCarDealerId(car));
    if (!hidden) {
      const gate = assertCanPublishDealerListingToMarketplace({
        isAdmin: scope.isAdmin,
        isDealerScopedListing: isDealerScoped,
      });
      if (gate.ok === false) {
        return res.status(403).json({
          success: false,
          error: "dealer_self_approve_forbidden",
          message: gate.message ?? DEALER_SELF_APPROVE_FORBIDDEN_MESSAGE,
        });
      }
      const guard = validateMemberListingRecordReadyToPublish(car);
      if (guard.ok === false) {
        return res.status(422).json({
          success: false,
          error: "listing_not_ready_to_publish",
          reason: guard.reason,
          message: guard.message,
          ...(guard.missingCoreLabels?.length
            ? { missingCoreLabels: guard.missingCoreLabels }
            : {}),
        });
      }
    }

    const nextStatus = hidden
      ? "hidden"
      : isDealerScoped && !scope.isAdmin
        ? dealerListingStatusAfterSubmit()
        : "published";

    const patch: Partial<MarketplaceCarRecord> = {
      listingStatus: nextStatus,
      ...(hidden || nextStatus === "pending_review"
        ? {}
        : toPublishConsentPatch(req.body)),
    };
    const updated = await deps.inventoryRepository.listings.updateListing(
      listingRepoScope(scope, car),
      car.id,
      patch
    );
    if (!updated) {
      return deny(res, 404, "ไม่พบประกาศ");
    }
    res.json({
      success: true,
      data: updated,
      ...(nextStatus === "pending_review"
        ? { message: DEALER_SUBMITTED_FOR_REVIEW_MESSAGE }
        : {}),
    });
  });

  app.delete("/api/cars/:id", async (req, res) => {
    const access = await getCarAccessOrDeny(req, res, deps);
    if (!access) return;
    const { car, scope } = access;

    const soft = req.query.soft !== "0" && req.body?.soft !== false;
    if (soft) {
      const updated = await deps.inventoryRepository.listings.updateVisibility(
        listingRepoScope(scope, car),
        car.id,
        "hidden"
      );
      if (!updated) {
        return deny(res, 404, "ไม่พบประกาศ");
      }
      return res.json({
        success: true,
        softDeleted: true,
        data: updated,
        message: "ซ่อนประกาศแล้ว",
      });
    }

    const deleted = await deps.inventoryRepository.listings.deleteListing(
      listingRepoScope(scope, car),
      car.id
    );
    if (!deleted) {
      return deny(res, 404, "ไม่พบประกาศ");
    }
    res.json({ success: true, message: "ลบประกาศแล้ว" });
  });
}
