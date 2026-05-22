import type { Express, Request, Response } from "express";
import {
  getDealerInventoryCars,
  getMarketplaceCarById,
  updateMarketplaceCar,
  removeMarketplaceCar,
  setMarketplaceCarListingStatus,
} from "./marketplaceInventory";
import {
  getDealerDraftById,
  getDealerDraftsSorted,
  updateDealerDraft,
} from "./dealerDraftInventory";
import { publishDealerDraftToMarketplace } from "./publishDraftListing";
import { getDealerProfile, upsertDealerProfile } from "./dealerProfile";
import {
  parseDealerRequestScope,
  requireDealerId,
  carBelongsToDealer,
  draftBelongsToDealer,
  filterCarsForDealer,
} from "./dealerAccess";
import { processSmartInventoryImport } from "./inventoryImportCommit";
import { getMissingPublishFields } from "../utils/inventoryImport/importConfidence";
import { createEmptyNormalizedRow } from "../utils/inventoryImport/inventoryImportSchema";
import {
  applyDuplicateReview,
  listDuplicateGroups,
  rescanRecord,
} from "./duplicateDetectionService";
import type { DuplicateReviewAction } from "../utils/duplicateDetection/types";

function scopeOr403(req: Request, res: Response) {
  const scope = parseDealerRequestScope(req);
  const auth = requireDealerId(scope);
  if (auth.ok === false) {
    res.status(403).json({ success: false, message: auth.message });
    return null;
  }
  return { scope, dealerId: auth.dealerId };
}

export function registerDealerPortalRoutes(app: Express): void {
  app.get("/api/dealer/dashboard", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const cars = filterCarsForDealer(getDealerInventoryCars(ctx.dealerId), ctx.dealerId);
    const drafts = getDealerDraftsSorted(ctx.dealerId);
    const published = cars.filter((c) => c.listingStatus !== "hidden").length;
    const hidden = cars.filter((c) => c.listingStatus === "hidden").length;
    const noImages = cars.filter(
      (c) =>
        !c.images?.length ||
        c.images.every((u) => u.includes("unsplash.com/photo-1533473359331"))
    ).length;
    const possibleDuplicates = cars.filter(
      (c) => c.duplicateStatus === "possible_duplicate"
    ).length;
    const confirmedDuplicates = cars.filter(
      (c) =>
        c.duplicateStatus === "duplicate_confirmed" ||
        c.duplicateStatus === "merged"
    ).length;

    res.json({
      success: true,
      data: {
        published,
        hidden,
        draft: drafts.filter((d) => d.status === "draft").length,
        needsReview: drafts.filter((d) => d.status === "needs_review").length,
        noImages,
        possibleDuplicates,
        confirmedDuplicates,
        draftDuplicates: drafts.filter(
          (d) => d.duplicateStatus === "possible_duplicate"
        ).length,
      },
    });
  });

  app.get("/api/dealer/inventory", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    let cars = getDealerInventoryCars(ctx.dealerId);
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    if (q) {
      cars = cars.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q)
      );
    }
    res.json({ success: true, count: cars.length, data: cars });
  });

  app.patch("/api/dealer/inventory/:id", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = getMarketplaceCarById(req.params.id);
    if (!car || !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบรถ" });
    }
    const body = req.body ?? {};
    const updated = updateMarketplaceCar(req.params.id, {
      brand: body.brand,
      model: body.model,
      year: body.year != null ? Number(body.year) : undefined,
      price: body.price != null ? Number(body.price) : undefined,
      mileage: body.mileage != null ? Number(body.mileage) : undefined,
      fuelType: body.fuelType,
      title: body.title,
      description: body.description,
      images: body.images,
    });
    res.json({ success: true, data: updated });
  });

  app.patch("/api/dealer/inventory/:id/visibility", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = getMarketplaceCarById(req.params.id);
    if (!car || !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบรถ" });
    }
    const hidden = Boolean(req.body?.hidden);
    const updated = setMarketplaceCarListingStatus(
      req.params.id,
      hidden ? "hidden" : "published"
    );
    res.json({ success: true, data: updated });
  });

  app.delete("/api/dealer/inventory/:id", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = getMarketplaceCarById(req.params.id);
    if (!car || !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบรถ" });
    }
    removeMarketplaceCar(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/dealer/drafts", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const data = getDealerDraftsSorted(ctx.dealerId);
    res.json({ success: true, count: data.length, data });
  });

  app.patch("/api/dealer/drafts/:id", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const draft = getDealerDraftById(req.params.id);
    if (!draft || !draftBelongsToDealer(draft, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบ draft" });
    }
    const body = req.body ?? {};
    const normalized = {
      ...draft.normalizedData,
      brand: body.brand ?? draft.normalizedData.brand,
      model: body.model ?? draft.normalizedData.model,
      year: body.year != null ? String(body.year) : draft.normalizedData.year,
      price: body.price != null ? String(body.price) : draft.normalizedData.price,
      mileage:
        body.mileage != null
          ? String(body.mileage)
          : draft.normalizedData.mileage,
      imageUrls: body.sourceImageUrls
        ? (body.sourceImageUrls as string[]).join(",")
        : draft.normalizedData.imageUrls,
    };
    const missingFields = getMissingPublishFields(normalized);
    const updated = updateDealerDraft(req.params.id, {
      brand: body.brand,
      model: body.model,
      year: body.year != null ? Number(body.year) : undefined,
      price: body.price != null ? Number(body.price) : undefined,
      mileage: body.mileage != null ? Number(body.mileage) : undefined,
      fuelType: body.fuelType,
      title: body.title,
      description: body.description,
      images: body.images,
      sourceImageUrls: body.sourceImageUrls,
      normalizedData: normalized,
      missingFields,
    });
    res.json({ success: true, data: updated });
  });

  app.post("/api/dealer/drafts/:id/publish", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const draft = getDealerDraftById(req.params.id);
    if (!draft || !draftBelongsToDealer(draft, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบ draft" });
    }
    const norm = draft.normalizedData ?? createEmptyNormalizedRow();
    norm.brand = draft.brand;
    norm.model = draft.model;
    norm.year = String(draft.year);
    norm.price = String(draft.price);
    const missing = getMissingPublishFields(norm);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `ข้อมูลยังไม่ครบ: ${missing.join(", ")}`,
        missingFields: missing,
      });
    }
    try {
      const result = await publishDealerDraftToMarketplace(req.params.id);
      if ("error" in result) {
        return res.status(400).json({ success: false, message: result.error });
      }
      res.json({ success: true, data: result.car });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Publish failed";
      res.status(500).json({ success: false, message });
    }
  });

  app.get("/api/dealer/profile", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const profile =
      getDealerProfile(ctx.dealerId) ??
      upsertDealerProfile(ctx.dealerId, { dealerId: ctx.dealerId });
    res.json({ success: true, data: profile });
  });

  app.patch("/api/dealer/profile", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const body = req.body ?? {};
    const updated = upsertDealerProfile(ctx.dealerId, body);
    res.json({ success: true, data: updated });
  });

  app.get("/api/dealer/duplicates", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const groups = listDuplicateGroups(ctx.dealerId);
    res.json({ success: true, data: groups });
  });

  app.post("/api/dealer/duplicates/review", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const body = req.body ?? {};
    const action = body.action as DuplicateReviewAction;
    const recordId = String(body.recordId ?? "");
    const car = getMarketplaceCarById(recordId);
    const draft = getDealerDraftById(recordId);
    const record = car ?? draft;
    if (!record) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการ" });
    }
    const belongs =
      car && carBelongsToDealer(car, ctx.dealerId)
        ? true
        : draft && draftBelongsToDealer(draft, ctx.dealerId);
    if (!belongs) {
      return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์" });
    }
    const result = applyDuplicateReview(recordId, action, {
      keepId: body.keepId,
      hideId: body.hideId,
    });
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true });
  });

  app.post("/api/dealer/duplicates/:id/rescan", (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = getMarketplaceCarById(req.params.id);
    const draft = getDealerDraftById(req.params.id);
    if (car && !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์" });
    }
    if (draft && !draftBelongsToDealer(draft, ctx.dealerId)) {
      return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์" });
    }
    const scan = rescanRecord(req.params.id);
    if (!scan) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการ" });
    }
    res.json({ success: true, data: scan });
  });

  app.post("/api/dealer/import/commit", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const { published = [], drafts = [] } = req.body ?? {};
    const profile = getDealerProfile(ctx.dealerId);
    const owner = {
      dealerId: ctx.dealerId,
      ownerId: `owner-${ctx.dealerId}`,
      ownerName: profile?.ownerName ?? req.body?.owner?.ownerName ?? "",
      ownerPhone: profile?.phone ?? req.body?.owner?.ownerPhone ?? "",
      showroomName: profile?.showroomName ?? req.body?.owner?.showroomName,
      address: profile?.address ?? req.body?.owner?.address,
    };
    try {
      const result = await processSmartInventoryImport(
        { published, drafts },
        owner
      );
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      res.status(500).json({ success: false, message });
    }
  });
}
