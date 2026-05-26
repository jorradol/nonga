import {
  addMarketplaceCar,
  type MarketplaceCarRecord,
} from "./marketplaceInventory";
import {
  getDealerDraftById,
  removeDealerDraft,
} from "./dealerDraftInventory";
import { inferMarketplaceCategoryType } from "../utils/marketplaceCarMapper";
import { normalizeDealerId } from "../utils/dealerIdentity";
import {
  scanCarAgainstCorpus,
  duplicateFieldsFromMeta,
} from "./duplicateDetectionService";
import { migrateListingImagesToCarId } from "./listingImageStorage";
import { resolveImageStorageBackend } from "./repositories/imageStorageRepository";
import {
  validateDraftForPublish,
  type PublishRequiredFieldKey,
} from "../utils/dealerPublishGuard";

export type PublishDraftFailure =
  | { error: string }
  | {
      error: "missing_required_fields";
      missingFields: PublishRequiredFieldKey[];
      missingLabelsThai: string[];
      message: string;
    };

export async function publishDealerDraftToMarketplace(
  draftId: string
): Promise<{ car: MarketplaceCarRecord } | PublishDraftFailure> {
  const draft = getDealerDraftById(draftId);
  if (!draft) return { error: "ไม่พบรถ draft" };

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
    return {
      error: "missing_required_fields",
      missingFields: guard.missingFields,
      missingLabelsThai: guard.missingLabelsThai,
      message: "กรุณาเติมข้อมูลจำเป็นให้ครบก่อนส่งรถคันนี้เข้าตลาด",
    };
  }

  const brand = draft.brand.trim();
  const model = draft.model.trim();
  const price = Number(draft.price);
  const yearRaw = Number(draft.year);
  const maxYear = new Date().getFullYear() + 2;
  const year =
    yearRaw >= 1980 && yearRaw <= maxYear
      ? yearRaw
      : new Date().getFullYear();

  const carId = `car-${Date.now()}`;
  const images =
    resolveImageStorageBackend() === "firebase-storage"
      ? draft.images ?? []
      : migrateListingImagesToCarId(draftId, carId, draft.images ?? []);

  const car: MarketplaceCarRecord = {
    id: carId,
    title: draft.title || `${brand} ${model} ปี ${year}`,
    brand,
    model,
    year,
    price,
    type: inferMarketplaceCategoryType({
      fuelType: draft.fuelType,
      condition: draft.condition,
      price,
    }),
    condition: draft.condition || "มือสอง",
    mileage: draft.mileage || 0,
    fuelType: draft.fuelType || "petrol",
    images,
    imageMetadata: draft.imageMetadata,
    description: draft.description?.trim() || draft.title || "",
    dealerId: normalizeDealerId(draft.dealerId),
    ownerId: `owner-${normalizeDealerId(draft.dealerId)}`,
    ownerName: draft.ownerName,
    ownerPhone: draft.phone,
    showroomName: draft.showroomName,
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
    boosted: false,
    featured: false,
  };

  const scan = scanCarAgainstCorpus(car, false);
  const withDup = { ...car, ...duplicateFieldsFromMeta(scan) };
  addMarketplaceCar(withDup);
  removeDealerDraft(draftId);

  return { car: withDup };
}
