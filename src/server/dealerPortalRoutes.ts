import type { Express, Request, Response } from "express";
import {
  getMarketplaceCarById,
} from "./marketplaceInventory";
import {
  getDealerDraftById,
  type DealerDraftRecord,
} from "./dealerDraftInventory";
import {
  createInventoryRepository,
  type InventoryRepository,
} from "./repositories/inventoryRepository";
import { getDealerProfile, upsertDealerProfile } from "./dealerProfile";
import {
  parseDealerRequestScope,
  requireDealerId,
  carBelongsToDealer,
  draftBelongsToDealer,
  filterCarsForDealer,
} from "./dealerAccess";
import { processSmartInventoryImport } from "./inventoryImportCommit";
import {
  fetchPreviewProxy,
  importSelectedPasteImages,
  probePasteImageCandidates,
} from "./pasteImageImportService";
import { persistPasteUploadedImages } from "./pasteUploadedImageStorage";
import type { ImageLinkCandidate } from "../utils/inventoryImport/imageLinkExtractor";
import {
  publishGuardApiBody,
  validateDraftForPublish,
} from "../utils/dealerPublishGuard";
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

async function listingIdBelongsToDealer(
  inventoryRepository: InventoryRepository,
  listingId: string,
  dealerId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (/^draft-import-[0-9]+-d\d+$/.test(listingId)) {
    return { ok: true };
  }

  const car = await inventoryRepository.listings.getById(listingId);
  if (car) {
    return carBelongsToDealer(car, dealerId)
      ? { ok: true }
      : { ok: false, status: 403, message: "ไม่มีสิทธิ์จัดการรูปของประกาศนี้" };
  }

  const draft = await inventoryRepository.drafts.getById(dealerId, listingId);
  if (draft) {
    return draftBelongsToDealer(draft, dealerId)
      ? { ok: true }
      : { ok: false, status: 403, message: "ไม่มีสิทธิ์จัดการรูปของประกาศนี้" };
  }

  if (/^(?:draft-[0-9]+|car-[0-9]+)$/.test(listingId)) {
    return { ok: false, status: 404, message: "ไม่พบประกาศ" };
  }

  return { ok: false, status: 400, message: "รหัสประกาศไม่ถูกต้อง" };
}

export interface DealerPortalRouteOptions {
  inventoryRepository?: InventoryRepository;
}

export function registerDealerPortalRoutes(
  app: Express,
  options: DealerPortalRouteOptions = {}
): void {
  const inventoryRepository =
    options.inventoryRepository ?? createInventoryRepository();

  app.post("/api/dealer/drafts/new", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const body = req.body ?? {};
    const id = `draft-${Date.now()}`;
    const profile = getDealerProfile(ctx.dealerId);

    const brand = String(body.brand ?? "").trim();
    const model = String(body.model ?? "").trim();
    const rawYear = Number(body.year);
    const rawPrice = Number(body.price);
    const rawMileage = Number(body.mileage);
    const year = Number.isFinite(rawYear) && rawYear >= 1900 ? rawYear : 0;
    const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
    const hasMileage = Number.isFinite(rawMileage) && rawMileage >= 0;
    const mileage = hasMileage ? rawMileage : 0;
    const description = String(body.description ?? "").trim();
    const images = Array.isArray(body.images)
      ? (body.images as unknown[]).filter((u): u is string => typeof u === "string")
      : [];
    const normalizedData = {
      ...createEmptyNormalizedRow(),
      brand,
      model,
      year: year > 0 ? String(year) : "",
      price: price > 0 ? String(price) : "",
      mileage: hasMileage ? String(mileage) : "",
      color: String(body.color ?? "").trim(),
      fuelType: String(body.fuelType ?? "").trim(),
      gear: String(body.transmission ?? body.condition ?? "").trim(),
      description,
      imageUrls: images.join(","),
    };
    const missing = validateDraftForPublish({
      id,
      brand,
      model,
      year,
      price,
      mileage: hasMileage ? mileage : undefined,
      images,
    }).missingFields;

    const newDraft = {
      id,
      dealerId: ctx.dealerId,
      dealerName: profile?.ownerName || profile?.showroomName || "Unknown Dealer",
      ownerName: profile?.ownerName || "Unknown Owner",
      phone: profile?.phone || "",
      showroomName: profile?.showroomName || "",
      rawRow: {},
      normalizedData,
      missingFields: missing,
      warnings:
        missing.length > 0
          ? ["บันทึกเป็นฉบับร่างแล้ว แต่ยังขาดข้อมูลก่อนส่งเข้าตลาด"]
          : [],
      confidenceScore: Math.max(10, 100 - missing.length * 15),
      status: missing.length > 0 ? ("needs_review" as const) : ("draft" as const),
      images,
      sourceImageUrls: [],
      title:
        String(body.title ?? "").trim() ||
        `${brand} ${model} ${year || ""}`.trim() ||
        "ร่างประกาศใหม่",
      brand,
      model,
      year,
      price,
      mileage,
      fuelType: String(body.fuelType ?? "").trim(),
      condition: String(body.condition ?? "").trim(),
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const created = await inventoryRepository.drafts.createDraft(ctx.dealerId, newDraft);
      if (process.env.NODE_ENV !== "production") {
        console.log("[POST /api/dealer/drafts/new] created", {
          id: created.id,
          dealerId: ctx.dealerId,
          brand,
          model,
        });
      }
      res.json({ success: true, data: created });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create draft";
      console.error("[POST /api/dealer/drafts/new] Error:", err);
      res.status(500).json({ success: false, message });
    }
  });

  app.get("/api/dealer/dashboard", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const cars = filterCarsForDealer(
      await inventoryRepository.listings.listByDealer(ctx.dealerId),
      ctx.dealerId
    );
    const drafts = await inventoryRepository.drafts.listByDealer(ctx.dealerId);
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

  app.get("/api/dealer/inventory", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    let cars = await inventoryRepository.listings.listByDealer(ctx.dealerId);
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

  app.patch("/api/dealer/inventory/:id", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = await inventoryRepository.listings.getById(req.params.id);
    if (!car || !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบรถ" });
    }
    const body = req.body ?? {};
    const updated = await inventoryRepository.listings.updateListing(ctx.dealerId, req.params.id, {
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

  app.post("/api/dealer/inventory/:id/upload-images", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = await inventoryRepository.listings.getById(req.params.id);
    if (!car || !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบรถ" });
    }

    const result = await persistPasteUploadedImages(
      ctx.dealerId,
      req.params.id,
      req.body?.files
    );
    if (result.ok === false) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[POST /api/dealer/inventory/:id/upload-images]", {
          carId: req.params.id,
          dealerId: ctx.dealerId,
          message: result.message,
        });
      }
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }
    res.json({ success: true, data: result });
  });

  app.patch("/api/dealer/inventory/:id/visibility", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = await inventoryRepository.listings.getById(req.params.id);
    if (!car || !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบรถ" });
    }
    const hidden = Boolean(req.body?.hidden);
    const updated = await inventoryRepository.listings.updateVisibility(
      ctx.dealerId,
      req.params.id,
      hidden ? "hidden" : "published"
    );
    res.json({ success: true, data: updated });
  });

  app.delete("/api/dealer/inventory/:id", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const car = await inventoryRepository.listings.getById(req.params.id);
    if (!car || !carBelongsToDealer(car, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบรถ" });
    }
    await inventoryRepository.listings.deleteListing(ctx.dealerId, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/dealer/drafts", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const data = await inventoryRepository.drafts.listByDealer(ctx.dealerId);
    res.json({ success: true, count: data.length, data });
  });

  app.patch("/api/dealer/drafts/:id", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const draft = await inventoryRepository.drafts.getById(ctx.dealerId, req.params.id);
    if (!draft || !draftBelongsToDealer(draft, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const has = (key: string) =>
      Object.prototype.hasOwnProperty.call(body, key);

    const normalized = { ...draft.normalizedData };
    if (has("brand")) normalized.brand = String(body.brand ?? "");
    if (has("model")) normalized.model = String(body.model ?? "");
    if (has("year") && body.year != null) normalized.year = String(body.year);
    if (has("price") && body.price != null) normalized.price = String(body.price);
    if (has("mileage") && body.mileage != null) {
      normalized.mileage = String(body.mileage);
    }
    if (has("sourceImageUrls")) {
      normalized.imageUrls = Array.isArray(body.sourceImageUrls)
        ? (body.sourceImageUrls as string[]).join(",")
        : draft.normalizedData.imageUrls;
    }

    const patch: Partial<DealerDraftRecord> = {
      normalizedData: normalized,
    };
    if (has("brand")) patch.brand = String(body.brand ?? "");
    if (has("model")) patch.model = String(body.model ?? "");
    if (has("year") && body.year != null) patch.year = Number(body.year);
    if (has("price") && body.price != null) patch.price = Number(body.price);
    if (has("mileage") && body.mileage != null) {
      patch.mileage = Number(body.mileage);
    }
    if (has("fuelType")) patch.fuelType = String(body.fuelType ?? "");
    if (has("title")) patch.title = String(body.title ?? "");
    if (has("description")) patch.description = String(body.description ?? "");
    if (has("images")) {
      const imgs = Array.isArray(body.images) ? (body.images as string[]) : [];
      patch.images = imgs;
      normalized.imageUrls = imgs.join(",");
    }
    if (has("sourceImageUrls")) {
      patch.sourceImageUrls = body.sourceImageUrls as string[];
    }

    const nextDraft = { ...draft, ...patch };
    patch.missingFields = validateDraftForPublish({
      id: nextDraft.id,
      brand: nextDraft.brand,
      model: nextDraft.model,
      year: nextDraft.year,
      price: nextDraft.price,
      mileage: nextDraft.mileage,
      images: nextDraft.images,
      sourceImageUrls: nextDraft.sourceImageUrls,
    }).missingFields;

    const updated = await inventoryRepository.drafts.updateDraft(ctx.dealerId, req.params.id, patch);
    res.json({ success: true, data: updated });
  });

  app.delete("/api/dealer/drafts/:id", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;

    const draftId = String(req.params.id ?? "").trim();
    if (!draftId) {
      return res.status(400).json({ success: false, message: "ไม่พบรหัสประกาศ" });
    }

    const draft = await inventoryRepository.drafts.getById(ctx.dealerId, draftId);
    if (!draft) {
      return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
    }
    if (!draftBelongsToDealer(draft, ctx.dealerId)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DELETE /api/dealer/drafts/:id] forbidden", {
          draftId,
          draftDealerId: draft.dealerId,
          ctxDealerId: ctx.dealerId,
        });
      }
      return res.status(403).json({
        success: false,
        message: "ไม่มีสิทธิ์ลบประกาศของเต็นท์อื่น",
      });
    }

    const removed = await inventoryRepository.drafts.deleteDraft(ctx.dealerId, draftId);
    if (!removed) {
      return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[DELETE /api/dealer/drafts/:id] removed", {
        draftId,
        dealerId: ctx.dealerId,
      });
      if (draft.images?.length) {
        console.log(
          "[DELETE /api/dealer/drafts/:id] TODO: cleanup draft image files",
          { count: draft.images.length }
        );
      }
    }

    res.json({
      success: true,
      message: "ลบประกาศเรียบร้อยแล้ว",
      data: { id: draftId },
    });
  });

  app.post("/api/dealer/drafts/:id/upload-images", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const draft = await inventoryRepository.drafts.getById(ctx.dealerId, req.params.id);
    if (!draft || !draftBelongsToDealer(draft, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
    }

    const result = await persistPasteUploadedImages(
      ctx.dealerId,
      req.params.id,
      req.body?.files
    );
    if (result.ok === false) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    if (result.storedUrls.length > 0) {
      const uploadSource =
        req.body?.source === "chat-image-attachment-v1"
          ? "chat-image-attachment-v1"
          : "draft-upload";
      const merged = [...(draft.images ?? []), ...result.storedUrls];
      const existingMetadata = draft.imageMetadata ?? [];
      const nextMetadata = [
        ...existingMetadata,
        ...(result.metadata ?? []).map((item, index) => ({
          ...item,
          dealerId: ctx.dealerId,
          draftId: req.params.id,
          source: uploadSource,
          sortOrder: existingMetadata.length + index,
        })),
      ];
      await inventoryRepository.drafts.updateDraft(ctx.dealerId, req.params.id, {
        images: merged,
        sourceImageUrls: merged,
        imageMetadata: nextMetadata,
      });
    }

    res.json({ success: true, data: result });
  });

  app.post("/api/dealer/drafts/:id/publish", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const draft = await inventoryRepository.drafts.getById(ctx.dealerId, req.params.id);
    if (!draft || !draftBelongsToDealer(draft, ctx.dealerId)) {
      return res.status(404).json({ success: false, message: "ไม่พบประกาศ" });
    }
    const guard = validateDraftForPublish({
      id: draft.id,
      brand: draft.brand,
      model: draft.model,
      year: draft.year,
      price: draft.price,
      mileage: draft.mileage,
      images: draft.images,
      sourceImageUrls: draft.sourceImageUrls,
    });
    if (!guard.ok) {
      return res.status(400).json(publishGuardApiBody(guard));
    }
    try {
      const result = await inventoryRepository.publishDraft(ctx.dealerId, req.params.id);
      if ("error" in result) {
        if (result.error === "missing_required_fields") {
          return res.status(400).json({
            success: false,
            error: result.error,
            message: result.message,
            missingFields: result.missingFields ?? [],
            missingLabelsThai: result.missingLabelsThai ?? [],
          });
        }
        return res.status(400).json({ success: false, message: result.error });
      }
      res.json({ success: true, data: result.car });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ลงขายไม่สำเร็จ";
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

  app.post("/api/dealer/paste-import/image-probe", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const candidates = (req.body?.candidates ?? []) as ImageLinkCandidate[];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const limited = candidates.slice(0, 12);
    const data = await probePasteImageCandidates(limited);
    res.json({ success: true, data });
  });

  app.get("/api/dealer/paste-import/preview-proxy", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const url = String(req.query.url ?? "");
    const result = await fetchPreviewProxy(url);
    if (result.ok === false) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(result.buffer);
  });

  app.post("/api/dealer/paste-import/import-selected-images", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const listingId = String(req.body?.listingId ?? "").trim();
    const candidates = (req.body?.candidates ?? []) as ImageLinkCandidate[];
    const selectedSourceUrls = (req.body?.selectedSourceUrls ?? []) as string[];
    const primarySourceUrl = req.body?.primarySourceUrl as string | undefined;

    if (!listingId) {
      return res.status(400).json({ success: false, message: "ต้องระบุ listingId" });
    }
    const listingScope = await listingIdBelongsToDealer(
      inventoryRepository,
      listingId,
      ctx.dealerId
    );
    if (listingScope.ok === false) {
      return res
        .status(listingScope.status)
        .json({ success: false, message: listingScope.message });
    }

    try {
      const data = await importSelectedPasteImages(
        listingId,
        candidates,
        selectedSourceUrls,
        primarySourceUrl
      );
      res.json({ success: true, data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "import images failed";
      res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/dealer/paste-import/upload-images", async (req, res) => {
    const ctx = scopeOr403(req, res);
    if (!ctx) return;
    const listingId = String(req.body?.listingId ?? "").trim();
    const files = req.body?.files;

    if (!listingId) {
      return res.status(400).json({ success: false, message: "ต้องระบุ listingId" });
    }
    const listingScope = await listingIdBelongsToDealer(
      inventoryRepository,
      listingId,
      ctx.dealerId
    );
    if (listingScope.ok === false) {
      return res
        .status(listingScope.status)
        .json({ success: false, message: listingScope.message });
    }

    const result = await persistPasteUploadedImages(ctx.dealerId, listingId, files);
    if (result.ok === false) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }
    res.json({ success: true, data: result });
  });
}
