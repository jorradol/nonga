import type { Car } from "../types";
import { mergeListingRecordImages } from "./listingImages";
import { redactListingPrivateContactFields } from "./publicMarketplaceListingPrivacy";

const VALID_TYPES = new Set<Car["type"]>([
  "new",
  "used",
  "ev",
  "luxury",
  "motorcycle",
]);

const VALID_FUEL = new Set<Car["fuelType"]>([
  "petrol",
  "diesel",
  "electric",
  "hybrid",
  "plug-in-hybrid",
]);

function normalizeFuelType(raw: unknown): Car["fuelType"] {
  const s = String(raw ?? "petrol").toLowerCase();
  if (s === "ev" || s === "bev") return "electric";
  if (VALID_FUEL.has(s as Car["fuelType"])) return s as Car["fuelType"];
  if (s.includes("electric")) return "electric";
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("diesel")) return "diesel";
  return "petrol";
}

/** แปลง type จากฟอร์ม/API เป็นหมวดที่ marketplace ใช้กรอง */
export function inferMarketplaceCategoryType(input: {
  type?: string;
  fuelType?: string;
  bodyType?: string;
  condition?: string;
  price?: number;
}): Car["type"] {
  const rawType = String(input.type ?? "").toLowerCase();
  if (VALID_TYPES.has(rawType as Car["type"]) && rawType !== "used") {
    return rawType as Car["type"];
  }

  const body = String(input.bodyType ?? "").toLowerCase();
  if (body.includes("motor") || body.includes("bike")) return "motorcycle";

  const fuel = normalizeFuelType(input.fuelType);
  if (fuel === "electric") return "ev";

  const cond = String(input.condition ?? "").toLowerCase();
  if (cond === "new" || rawType === "new") return "new";

  if (input.price && input.price >= 3_000_000) return "luxury";

  return "used";
}

export function normalizeMarketplaceCar(raw: Record<string, unknown>): Car {
  const id = String(raw.id ?? `car-${Date.now()}`);

  const fuelType = normalizeFuelType(raw.fuelType);
  const categoryType = inferMarketplaceCategoryType({
    type: raw.type as string | undefined,
    fuelType,
    bodyType: raw.bodyType as string | undefined,
    condition: raw.condition as string | undefined,
    price: Number(raw.price) || 0,
  });

  const images = mergeListingRecordImages(id, raw);

  return {
    id,
    title: String(raw.title ?? "ประกาศขายรถ"),
    brand: String(raw.brand ?? ""),
    model: String(raw.model ?? ""),
    year: Number(raw.year) || new Date().getFullYear(),
    price: Number(raw.price) || 0,
    type: categoryType,
    condition: String(raw.condition ?? ""),
    mileage: Number(raw.mileage) || 0,
    fuelType,
    images,
    description: String(raw.description ?? ""),
    ownerId: String(raw.ownerId ?? ""),
    ownerName: String(raw.ownerName ?? ""),
    ownerPhone: String(raw.ownerPhone ?? ""),
    showroomName: raw.showroomName ? String(raw.showroomName) : undefined,
    registrationProvince: raw.registrationProvince
      ? String(raw.registrationProvince)
      : undefined,
    licensePlateMasked: raw.licensePlateMasked
      ? String(raw.licensePlateMasked)
      : undefined,
    isSold: Boolean(raw.isSold),
    listingStatus:
      raw.listingStatus === "hidden" ? "hidden" : "published",
    saleStatus:
      raw.saleStatus === "pending_sale" ||
      raw.saleStatus === "sold" ||
      raw.saleStatus === "sale_cancelled"
        ? raw.saleStatus
        : undefined,
    pendingSaleAt:
      typeof raw.pendingSaleAt === "string" ? raw.pendingSaleAt : undefined,
    saleCancelledAt:
      typeof raw.saleCancelledAt === "string" ? raw.saleCancelledAt : undefined,
    saleCancelReason:
      typeof raw.saleCancelReason === "string" ? raw.saleCancelReason : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    boosted: Boolean(raw.boosted),
    featured: Boolean(raw.featured),
    sellerType: raw.sellerType as Car["sellerType"],
    dealerId: raw.dealerId ? String(raw.dealerId) : undefined,
    province: raw.province ? String(raw.province) : undefined,
    bodyType: raw.bodyType ? String(raw.bodyType) : undefined,
    transmission: raw.transmission as Car["transmission"],
    color: raw.color ? String(raw.color) : undefined,
    negotiable: raw.negotiable as boolean | undefined,
    features: Array.isArray(raw.features) ? (raw.features as string[]) : undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined,
  };
}

/** Normalize listing from public marketplace API — strips private contact fields. */
export function normalizePublicMarketplaceCar(
  raw: Record<string, unknown>
): Car {
  return normalizeMarketplaceCar(
    redactListingPrivateContactFields(raw)
  );
}

export function isDevMarketplaceLogEnabled(): boolean {
  return (
    typeof import.meta !== "undefined" &&
    Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)
  );
}

export function devClientMarketplaceLog(
  label: string,
  detail?: Record<string, unknown>
): void {
  if (!isDevMarketplaceLogEnabled()) return;
  console.debug(`[marketplace:client:${label}]`, detail ?? "");
}
