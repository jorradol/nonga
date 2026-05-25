import { type Express, type Request, type Response } from "express";
import {
  getMarketplaceCarById,
  getOwnerMarketplaceCars,
  removeMarketplaceCar,
  setMarketplaceCarListingStatus,
  updateMarketplaceCar,
} from "./marketplaceInventory";
import { inferMarketplaceCategoryType } from "../utils/marketplaceCarMapper";
import { sanitizeListingImagesForId } from "../utils/listingImages";
import {
  canManageListingWithScope,
  getListingsForScope,
  resolveOwnerRequestScope,
  type OwnerRequestScope,
} from "./ownerListingAccess";
import {
  decodeListingImageFiles,
  persistListingImageUploads,
} from "./listingImageUploadBody";

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

async function getCarOr404(req: Request, res: Response) {
  const scope = await ownerScopeOrDeny(req, res);
  if (!scope) return null;
  const car = getMarketplaceCarById(req.params.id);
  if (!car) {
    deny(res, 404, "ไม่พบประกาศ");
    return null;
  }
  if (!canManageListingWithScope(scope, car)) {
    deny(res, 403, "ไม่มีสิทธิ์แก้ไขประกาศนี้");
    return null;
  }
  return car;
}

export function registerOwnerListingRoutes(app: Express): void {
  /** ประกาศของเจ้าของ — รวมที่ซ่อนแล้ว */
  app.get("/api/my/listings", async (req, res) => {
    const scope = await ownerScopeOrDeny(req, res);
    if (!scope) return;
    const data = getListingsForScope(scope);
    res.json({ success: true, count: data.length, data });
  });

  /** อัปโหลดรูปจาก edit listing — เก็บ data/listing-images/{carId}/ */
  app.post("/api/cars/:id/images", async (req, res) => {
    const car = await getCarOr404(req, res);
    if (!car) return;

    const body = req.body ?? {};
    const decoded = decodeListingImageFiles(body.files);
    if (decoded.ok === false) {
      return res.status(decoded.status).json({
        ok: false,
        success: false,
        error: decoded.error,
        message: decoded.message,
      });
    }

    const persisted = persistListingImageUploads(car.id, decoded.items);
    if (persisted.ok === false) {
      return res.status(persisted.status).json({
        ok: false,
        success: false,
        message: persisted.message,
      });
    }

    res.json({ success: true, data: { storedUrls: persisted.storedUrls } });
  });

  app.patch("/api/cars/:id", async (req, res) => {
    const car = await getCarOr404(req, res);
    if (!car) return;

    const body = req.body ?? {};
    const nextType = inferMarketplaceCategoryType({
      type: body.type ?? car.type,
      fuelType: body.fuelType ?? car.fuelType,
      bodyType: body.bodyType,
      condition: body.condition ?? car.condition,
      price: body.price != null ? Number(body.price) : car.price,
    });

    const patch: Parameters<typeof updateMarketplaceCar>[1] = {};
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

    const updated = updateMarketplaceCar(req.params.id, patch);
    res.json({ success: true, data: updated });
  });

  app.patch("/api/cars/:id/visibility", async (req, res) => {
    const car = await getCarOr404(req, res);
    if (!car) return;

    const hidden = Boolean(req.body?.hidden);
    const updated = setMarketplaceCarListingStatus(
      req.params.id,
      hidden ? "hidden" : "published"
    );
    res.json({ success: true, data: updated });
  });

  app.delete("/api/cars/:id", async (req, res) => {
    const car = await getCarOr404(req, res);
    if (!car) return;

    const soft = req.query.soft !== "0" && req.body?.soft !== false;
    if (soft) {
      const updated = setMarketplaceCarListingStatus(req.params.id, "hidden");
      return res.json({
        success: true,
        softDeleted: true,
        data: updated,
        message: "ซ่อนประกาศแล้ว",
      });
    }

    removeMarketplaceCar(req.params.id);
    res.json({ success: true, message: "ลบประกาศแล้ว" });
  });
}
