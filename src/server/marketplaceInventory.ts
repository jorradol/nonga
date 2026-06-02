import fs from "fs";
import path from "path";
import type { DuplicateMeta } from "../utils/duplicateDetection/types";
import { shouldHideFromMarketplace } from "../utils/duplicateDetection/duplicateEngine";
import { normalizeDealerId } from "../utils/dealerIdentity";
import { withSanitizedListingImages } from "../utils/listingImages";

/** บันทึกรถตลาด — source of truth เดียวกับ GET/POST /api/cars */
export interface MarketplaceCarRecord {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: "new" | "used" | "ev" | "luxury" | "motorcycle";
  condition: string;
  mileage: number;
  fuelType: string;
  transmission?: string;
  color?: string;
  images: string[];
  imageMetadata?: unknown[];
  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  showroomName?: string;
  isSold: boolean;
  /** รหัสเต็นท์ — ใช้แยกข้อมูล (เช่น thor-auto) */
  dealerId?: string;
  /** published = ตลาด; hidden = ซ่อนจากตลาด */
  listingStatus?: "published" | "hidden";
  /**
   * v5.4.7e — seller publish consent (closed pilot)
   * Optional: legacy listings may not have these fields.
   */
  sellerConsentAccepted?: true;
  sellerConsentAcceptedAt?: string;
  sellerConsentVersion?: string;
  sellerConsentSource?: string;
  sellerConsentTextKey?: string;
  /** v5.4.7f moderation metadata (internal) */
  moderationStatus?: "none" | "under_review" | "actioned";
  adminHiddenReason?: string;
  adminHiddenAt?: string;
  adminHiddenBy?: string;
  reportOpenCount?: number;
  createdAt: string;
  boosted?: boolean;
  featured?: boolean;
  /** Phase Final — duplicate detection */
  duplicateStatus?: DuplicateMeta["duplicateStatus"];
  duplicateScore?: number;
  duplicateGroupId?: string;
  duplicateCanonicalId?: string;
  duplicateMatches?: DuplicateMeta["duplicateMatches"];
  duplicateReviewedAt?: string;
  duplicateReviewAction?: DuplicateMeta["duplicateReviewAction"];
  vin?: string;
  licensePlate?: string;
}

export function isPublishedListing(car: MarketplaceCarRecord): boolean {
  return !car.listingStatus || car.listingStatus === "published";
}

export function isVisibleOnMarketplace(car: MarketplaceCarRecord): boolean {
  if (
    shouldHideFromMarketplace({
      duplicateStatus: car.duplicateStatus,
      duplicateCanonicalId: car.duplicateCanonicalId,
      id: car.id,
    })
  ) {
    return false;
  }
  return isPublishedListing(car) && !car.isSold;
}

export function resolveCarDealerId(car: MarketplaceCarRecord): string {
  if (car.dealerId?.trim()) return normalizeDealerId(car.dealerId);
  const oid = String(car.ownerId ?? "").trim();
  return normalizeDealerId(oid) || oid;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const INVENTORY_FILE = path.join(DATA_DIR, "marketplace-inventory.json");

let memoryCache: MarketplaceCarRecord[] | null = null;

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function devMarketplaceLog(label: string, detail?: Record<string, unknown>): void {
  if (!isDev()) return;
  const payload = detail ? ` ${JSON.stringify(detail)}` : "";
  console.debug(`[marketplace:${label}]${payload}`);
}

function readFileInventory(): MarketplaceCarRecord[] {
  try {
    if (!fs.existsSync(INVENTORY_FILE)) return [];
    const raw = fs.readFileSync(INVENTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MarketplaceCarRecord[]) : [];
  } catch (err) {
    console.warn("[marketplace] failed to read inventory file:", err);
    return [];
  }
}

function writeFileInventory(cars: MarketplaceCarRecord[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(cars, null, 2), "utf8");
}

export function loadMarketplaceInventory(): MarketplaceCarRecord[] {
  if (memoryCache === null) {
    memoryCache = readFileInventory();
    devMarketplaceLog("load", {
      source: INVENTORY_FILE,
      count: memoryCache.length,
    });
  }
  return memoryCache;
}

function decorateCar(car: MarketplaceCarRecord): MarketplaceCarRecord {
  return withSanitizedListingImages(car);
}

export function getMarketplaceInventorySorted(): MarketplaceCarRecord[] {
  return loadMarketplaceInventory()
    .map(decorateCar)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/** รถที่แสดงในตลาดเท่านั้น — published, ไม่ซ่อน, ไม่ขายแล้ว */
export function getPublishedMarketplaceCars(): MarketplaceCarRecord[] {
  return getMarketplaceInventorySorted().filter(isVisibleOnMarketplace);
}

/** ประกาศทั้งหมดของเจ้าของ (รวม hidden) — หน้า "ประกาศของฉัน" */
export function getOwnerMarketplaceCars(ownerId: string): MarketplaceCarRecord[] {
  const oid = String(ownerId ?? "").trim();
  if (!oid) return [];
  return getMarketplaceInventorySorted().filter((c) => c.ownerId === oid);
}

export function getDealerInventoryCars(dealerId: string): MarketplaceCarRecord[] {
  return getMarketplaceInventorySorted().filter(
    (c) => resolveCarDealerId(c) === dealerId
  );
}

export function getMarketplaceCarById(
  id: string
): MarketplaceCarRecord | null {
  const car = loadMarketplaceInventory().find((c) => c.id === id);
  return car ? decorateCar(car) : null;
}

export function updateMarketplaceCar(
  id: string,
  patch: Partial<MarketplaceCarRecord>
): MarketplaceCarRecord | null {
  const list = loadMarketplaceInventory();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const merged = { ...list[idx], ...patch, id: list[idx].id };
  const updated = decorateCar(merged);
  const next = [...list];
  next[idx] = updated;
  persistMarketplaceInventory(next);
  return updated;
}

export function setMarketplaceCarListingStatus(
  id: string,
  listingStatus: "published" | "hidden"
): MarketplaceCarRecord | null {
  return updateMarketplaceCar(id, { listingStatus });
}

export function persistMarketplaceInventory(cars: MarketplaceCarRecord[]): void {
  memoryCache = cars;
  writeFileInventory(cars);
  devMarketplaceLog("persist", { count: cars.length, file: INVENTORY_FILE });
}

export function addMarketplaceCar(
  car: MarketplaceCarRecord
): MarketplaceCarRecord {
  const safe = decorateCar(car);
  const list = loadMarketplaceInventory();
  const next = [safe, ...list];
  persistMarketplaceInventory(next);
  devMarketplaceLog("publish-success", {
    id: car.id,
    title: car.title,
    total: next.length,
  });
  return safe;
}

/** Bulk import — prepend รถใหม่ทั้งชุด (inventory import Phase 4) */
export function bulkAddMarketplaceCars(
  cars: MarketplaceCarRecord[]
): MarketplaceCarRecord[] {
  if (cars.length === 0) return [];
  const safeCars = cars.map(decorateCar);
  const list = loadMarketplaceInventory();
  const next = [...safeCars, ...list];
  persistMarketplaceInventory(next);
  devMarketplaceLog("bulk-import", {
    added: cars.length,
    total: next.length,
  });
  return safeCars;
}

export function removeMarketplaceCar(id: string): boolean {
  const list = loadMarketplaceInventory();
  const next = list.filter((c) => c.id !== id);
  if (next.length === list.length) return false;
  persistMarketplaceInventory(next);
  devMarketplaceLog("delete", { id, total: next.length });
  return true;
}

/** สรุป inventory สำหรับ AI — ห้าม hallucinate นอกจากนี้ */
export function buildAIInventoryContext(
  cars: MarketplaceCarRecord[]
): string {
  const active = cars.filter((c) => isVisibleOnMarketplace(c));
  if (active.length === 0) {
    return (
      "[ตลาดรถยนต์ Nong A — ข้อมูลจริง]\n" +
      "ตอนนี้ยังไม่มีรถในตลาด (0 คัน)\n" +
      "กฎ: ห้ามแนะนำ อ้างอิง หรือสร้างรายการรถยี่ห้อ/รุ่นใดๆ ที่ไม่มีในข้อมูลนี้\n" +
      "ถ้าลูกค้าถามรถในตลาด ให้ตอบว่า ตอนนี้ยังไม่มีรถใหม่ในตลาดครับ"
    );
  }

  const summary = active.slice(0, 25).map((c) => ({
    id: c.id,
    title: c.title,
    brand: c.brand,
    model: c.model,
    year: c.year,
    price: c.price,
    mileage: c.mileage,
    fuelType: c.fuelType,
    type: c.type,
    condition: c.condition,
    createdAt: c.createdAt,
  }));

  return (
    `[ตลาดรถยนต์ Nong A — ข้อมูลจริง ${active.length} คัน เท่านั้น]\n` +
    `กฎ: ตอบและแนะนำได้เฉพาะรถใน JSON นี้ ห้ามสร้างรถ Tesla/Fortuner/Civic หรือรุ่นอื่นที่ไม่อยู่ในรายการ\n` +
    JSON.stringify(summary)
  );
}
