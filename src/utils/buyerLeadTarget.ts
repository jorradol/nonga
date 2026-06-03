/**
 * v5.6C.1 — Explicit buyer lead target car (session-scoped).
 */

import type { ChatCarCardData } from "../types";

const STORAGE_KEY = "nonga:buyer-lead-target";

export interface BuyerLeadTargetCar {
  listingId: string;
  brand: string;
  model: string;
  year: number;
  price: number;
}

export function buyerLeadTargetTitle(target: BuyerLeadTargetCar): string {
  return `${target.brand} ${target.model}`.trim() + ` ปี ${target.year}`;
}

export function setBuyerLeadTargetFromCar(car: ChatCarCardData): BuyerLeadTargetCar {
  const target: BuyerLeadTargetCar = {
    listingId: car.id,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
  };
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target));
  }
  return target;
}

export function getBuyerLeadTarget(): BuyerLeadTargetCar | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuyerLeadTargetCar;
    if (!parsed?.listingId?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearBuyerLeadTarget(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
