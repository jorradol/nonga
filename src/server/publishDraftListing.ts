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

export async function publishDealerDraftToMarketplace(
  draftId: string
): Promise<{ car: MarketplaceCarRecord } | { error: string }> {
  const draft = getDealerDraftById(draftId);
  if (!draft) return { error: "ไม่พบรถ draft" };

  const brand = draft.brand?.trim();
  const model = draft.model?.trim();
  const year = Number(draft.year);
  const price = Number(draft.price);

  if (!brand) return { error: "ต้องมี brand ก่อนเผยแพร่" };
  if (!model) return { error: "ต้องมี model ก่อนเผยแพร่" };
  if (!year || year < 1980 || year > new Date().getFullYear() + 2) {
    return { error: "ต้องมีปีรถที่ถูกต้องก่อนเผยแพร่" };
  }
  if (!price || price <= 0) {
    return { error: "ต้องมีราคาก่อนเผยแพร่" };
  }

  const carId = `car-${Date.now()}`;
  const images = migrateListingImagesToCarId(
    draftId,
    carId,
    draft.images ?? []
  );

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
    description: draft.description || draft.title,
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
