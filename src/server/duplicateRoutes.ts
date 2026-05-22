import type { Express, Request, Response } from "express";
import {
  listDuplicateGroups,
  applyDuplicateReview,
  rescanRecord,
  scanCarAgainstCorpus,
} from "./duplicateDetectionService";
import {
  getMarketplaceCarById,
  loadMarketplaceInventory,
} from "./marketplaceInventory";
import { loadDealerDraftInventory } from "./dealerDraftInventory";
import type { DuplicateReviewAction } from "../utils/duplicateDetection/types";

export function registerDuplicateRoutes(app: Express): void {
  app.get("/api/admin/duplicates", (_req, res) => {
    const dealerId =
      typeof _req.query.dealerId === "string"
        ? _req.query.dealerId.trim()
        : undefined;
    const groups = listDuplicateGroups(dealerId);
    const flagged = loadMarketplaceInventory().filter(
      (c) =>
        c.duplicateStatus &&
        c.duplicateStatus !== "unique"
    ).length;
    const draftFlagged = loadDealerDraftInventory().filter(
      (d) => d.duplicateStatus && d.duplicateStatus !== "unique"
    ).length;
    res.json({
      success: true,
      data: {
        groups,
        flaggedCars: flagged,
        flaggedDrafts: draftFlagged,
      },
    });
  });

  app.post("/api/admin/duplicates/:id/rescan", (req, res) => {
    const scan = rescanRecord(req.params.id);
    if (!scan) {
      return res.status(404).json({ success: false, message: "ไม่พบรายการ" });
    }
    res.json({ success: true, data: scan });
  });

  app.post("/api/admin/duplicates/review", (req, res) => {
    const body = req.body ?? {};
    const action = body.action as DuplicateReviewAction;
    const recordId = String(body.recordId ?? "");
    if (!recordId || !action) {
      return res.status(400).json({
        success: false,
        message: "ต้องระบุ recordId และ action",
      });
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

  app.get("/api/admin/duplicates/:id", (req, res) => {
    const car = getMarketplaceCarById(req.params.id);
    if (car) {
      const scan = scanCarAgainstCorpus(car);
      return res.json({ success: true, data: { record: car, scan } });
    }
    return res.status(404).json({ success: false, message: "ไม่พบรายการ" });
  });
}
