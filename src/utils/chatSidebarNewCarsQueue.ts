import type { Car } from "../types";
import {
  resolveChatListingImageUrls,
  toChatCarSummary,
  summaryToChatCarCardData,
  type ChatInventoryCar,
} from "../services/ai/chat/marketplaceChatSearch";
import type { ChatCarCardData } from "../types";

export const SIDEBAR_NEW_CARS_QUEUE_MAX = 10;
export const SIDEBAR_NEW_CARS_ROTATE_MS = 17_000;

export interface SidebarNewCarSlide {
  id: string;
  imageUrl: string;
  brand: string;
  model: string;
  year: number;
}

export function carToChatInventoryCar(car: Car): ChatInventoryCar {
  return {
    id: car.id,
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    color: car.color,
    fuelType: car.fuelType,
    transmission: car.transmission,
    type: car.type,
    condition: car.condition,
    bodyType: car.bodyType,
    description: car.description,
    images: car.images,
    showroomName: car.showroomName,
    ownerName: car.ownerName,
    isSold: car.isSold,
    listingStatus: car.listingStatus,
    saleStatus: car.saleStatus,
  };
}

/**
 * Fail-closed marketplace visibility for the sidebar discovery rail.
 * Source: useAppStore.cars (GET /api/cars → marketplace inventory).
 */
export function isSidebarNewCarSaleReady(car: Car): boolean {
  if (!car || typeof car.id !== "string" || car.id.trim().length === 0) {
    return false;
  }
  if (car.isSold) return false;
  if (car.listingStatus === "hidden" || car.listingStatus === "pending_review") {
    return false;
  }
  if (car.saleStatus === "pending_sale" || car.saleStatus === "sold") {
    return false;
  }
  if (
    car.listingStatus != null &&
    car.listingStatus !== "" &&
    car.listingStatus !== "published"
  ) {
    return false;
  }
  const inv = carToChatInventoryCar(car);
  return resolveChatListingImageUrls(inv).length > 0;
}

export function isPublishedCarWithRealImage(car: Car): boolean {
  return isSidebarNewCarSaleReady(car);
}

/** Newest first; falls back to API order when createdAt is missing/invalid. */
export function sortCarsByRecency(cars: readonly Car[]): Car[] {
  return [...cars].sort((a, b) => {
    const ta = Date.parse(String(a.createdAt ?? ""));
    const tb = Date.parse(String(b.createdAt ?? ""));
    const aValid = Number.isFinite(ta);
    const bValid = Number.isFinite(tb);
    if (aValid && bValid && tb !== ta) return tb - ta;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return 0;
  });
}

export function buildSidebarNewCarsQueue(
  cars: readonly Car[]
): SidebarNewCarSlide[] {
  const withImages = sortCarsByRecency(cars.filter(isSidebarNewCarSaleReady));
  const slides: SidebarNewCarSlide[] = [];
  const seenIds = new Set<string>();
  for (const car of withImages) {
    if (seenIds.has(car.id)) continue;
    const inv = carToChatInventoryCar(car);
    const urls = resolveChatListingImageUrls(inv);
    const imageUrl = urls[0];
    if (!imageUrl) continue;
    seenIds.add(car.id);
    slides.push({
      id: car.id,
      imageUrl,
      brand: car.brand,
      model: car.model,
      year: car.year,
    });
    if (slides.length >= SIDEBAR_NEW_CARS_QUEUE_MAX) break;
  }
  return slides;
}

export function buildSidebarCarCardFromCar(car: Car): ChatCarCardData {
  const inv = carToChatInventoryCar(car);
  return summaryToChatCarCardData(toChatCarSummary(inv), "exact");
}

export function sidebarCarIntroLine(car: Pick<Car, "brand" | "model" | "year">): string {
  return `${car.brand} ${car.model} ปี ${car.year} — กดดูรายละเอียดในแชทด้านล่างได้เลยครับ`;
}
