/**
 * v6.1L.2g — Client/server-safe pilot session context from last shown car cards.
 */
import type { ChatCarCardData } from "../../../types";
import {
  loadChatCarContext,
  loadInChatBuyerContext,
} from "../../../utils/chatCarContext";

export interface PilotGroundedCarCard {
  /** 1-based index in last shown batch */
  index: number;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage?: number;
  fuelType?: string;
  bodyClassLabel?: string;
  description?: string;
}

export interface PilotBuyerSessionContext {
  recentCarCards: PilotGroundedCarCard[];
  lastSearchBudgetMax?: number;
}

const MAX_CARDS = 5;
const MAX_DESC = 200;

function truncate(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined;
  const t = text.trim();
  if (!t) return undefined;
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function toPilotGroundedCarCard(
  car: ChatCarCardData,
  index: number
): PilotGroundedCarCard {
  return {
    index,
    brand: String(car.brand ?? "").slice(0, 64),
    model: String(car.model ?? "").slice(0, 64),
    year: Number(car.year) || 0,
    price: Number(car.price) || 0,
    ...(car.mileage != null && car.mileage > 0 ? { mileage: car.mileage } : {}),
    ...(car.fuelType ? { fuelType: String(car.fuelType).slice(0, 32) } : {}),
    ...(car.bodyClassLabel ? { bodyClassLabel: String(car.bodyClassLabel).slice(0, 64) } : {}),
    ...(car.description ? { description: truncate(car.description, MAX_DESC) } : {}),
  };
}

export function buildPilotSessionContextFromCarCards(
  cars: ChatCarCardData[],
  lastSearchBudgetMax?: number
): PilotBuyerSessionContext | undefined {
  if (!cars.length) return undefined;
  return {
    recentCarCards: cars.slice(0, MAX_CARDS).map((c, i) => toPilotGroundedCarCard(c, i + 1)),
    ...(lastSearchBudgetMax != null && lastSearchBudgetMax > 0
      ? { lastSearchBudgetMax }
      : {}),
  };
}

/** Browser: read sessionStorage last car batch for pilot bridge */
export function buildPilotSessionContextFromStorage(): PilotBuyerSessionContext | undefined {
  const cars = loadChatCarContext();
  const hint = loadInChatBuyerContext();
  return buildPilotSessionContextFromCarCards(
    cars,
    hint?.budgetMax ?? undefined
  );
}

export function sanitizePilotSessionContext(
  raw: unknown
): PilotBuyerSessionContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const cards = (raw as PilotBuyerSessionContext).recentCarCards;
  if (!Array.isArray(cards) || cards.length === 0) return undefined;
  const recentCarCards = cards
    .slice(0, MAX_CARDS)
    .map((c, i) => {
      if (!c || typeof c !== "object") return null;
      const card = c as PilotGroundedCarCard;
      if (!card.brand || !card.model || !card.year || !card.price) return null;
      return toPilotGroundedCarCard(
        {
          id: `ctx-${i}`,
          brand: card.brand,
          model: card.model,
          year: card.year,
          price: card.price,
          mileage: card.mileage ?? 0,
          fuelType: card.fuelType,
          bodyClassLabel: card.bodyClassLabel ?? "",
          color: "",
          condition: "",
          transmission: "",
          bodyClass: "",
          imageUrl: "",
          imageUrls: [],
          hasImage: false,
          detailPath: "",
          matchKind: "exact",
          description: card.description,
        },
        card.index > 0 ? card.index : i + 1
      );
    })
    .filter((c): c is PilotGroundedCarCard => c != null);
  if (!recentCarCards.length) return undefined;
  const budget = (raw as PilotBuyerSessionContext).lastSearchBudgetMax;
  return {
    recentCarCards,
    ...(typeof budget === "number" && budget > 0 ? { lastSearchBudgetMax: budget } : {}),
  };
}

export function resolveCarCardsFromSessionContext(
  cards: PilotGroundedCarCard[],
  indices: number[]
): PilotGroundedCarCard[] {
  const byIndex = new Map(cards.map((c) => [c.index, c]));
  return indices
    .map((idx) => byIndex.get(idx) ?? cards[idx - 1])
    .filter((c): c is PilotGroundedCarCard => c != null);
}
