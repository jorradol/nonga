/**
 * v22.57 — Inventory-backed named compare (e.g. "เทียบกับ Corolla 2021").
 * v22.58 — Canonical pair is the single source for cards + text + Gemini grounding.
 * Reuses marketplace search + active-vehicle session resolution.
 * Fail-closed: never compare a listing with itself.
 */

import type { ChatCarCardData } from "../../../types";
import {
  loadLastSelectedCarId,
  loadRecentlyViewedCarIds,
} from "../../../utils/chatCarContext";
import { extractNumberedComparePair } from "./chatPilotBuyerFollowUp";
import { isPilotBuyerGeneralKnowledgeFollowUp } from "./chatPilotBuyerFollowUp";
import { isCompareIntent } from "../../../utils/chatCarContext";
import {
  parseMarketplaceSearchQuery,
  searchMarketplaceForChat,
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
  type ChatSearchCriteria,
} from "./marketplaceChatSearch";
import { buildCompareReplyCopy } from "./chatSearchReplyCopy";

export type InventoryCompareFailReason =
  | "no_base"
  | "no_target"
  | "same_listing"
  | "target_mismatch"
  | "duplicate_facts"
  | "ambiguous_target"
  | "not_named_compare";

export type InventoryCompareResolution =
  | {
      ok: true;
      base: ChatCarCardData;
      target: ChatCarCardData;
      criteria: ChatSearchCriteria;
    }
  | {
      ok: false;
      reason: InventoryCompareFailReason;
      clarification: string;
      cards: ChatCarCardData[];
    };

/** Stable internal identity — never expose in user-visible copy. */
export function listingIdentityKey(car: Pick<ChatCarCardData, "id">): string {
  return String(car.id ?? "").trim();
}

export function assertDistinctCompareListings(
  base: ChatCarCardData,
  target: ChatCarCardData
): boolean {
  const a = listingIdentityKey(base);
  const b = listingIdentityKey(target);
  if (!a || !b) return false;
  return a !== b;
}

/** Detect accidental full-fact duplication (same listing rendered twice). */
export function hasIdenticalCompareFactSet(
  a: ChatCarCardData,
  b: ChatCarCardData
): boolean {
  return (
    a.brand === b.brand &&
    a.model === b.model &&
    a.year === b.year &&
    a.price === b.price &&
    a.mileage === b.mileage &&
    (a.bodyClassLabel ?? "") === (b.bodyClassLabel ?? "")
  );
}

/**
 * Rehydrate session/pilot cards onto real inventory listings (server has no
 * sessionStorage). Prefer listingId, then brand/model/year + price/mileage.
 * Restores public image metadata from the canonical listing.
 */
export function rehydrateSessionCarsFromInventory(
  sessionCars: ChatCarCardData[],
  inventory: ChatInventoryCar[]
): ChatCarCardData[] {
  if (!sessionCars.length || !inventory.length) return sessionCars;

  return sessionCars.map((card) => {
    const id = listingIdentityKey(card);
    if (id && !/^pilot-session-|ctx-/i.test(id)) {
      const byId = inventory.find((inv) => String(inv.id ?? "").trim() === id);
      if (byId) return summaryToChatCarCardData(toChatCarSummary(byId), "exact");
    }

    const model = String(card.model ?? "")
      .toLowerCase()
      .replace(/-/g, "");
    const brand = String(card.brand ?? "").toLowerCase();
    const candidates = inventory.filter((inv) => {
      if (Number(inv.year) !== Number(card.year)) return false;
      const invModel = String(inv.model ?? "")
        .toLowerCase()
        .replace(/-/g, "");
      const invBrand = String(inv.brand ?? "").toLowerCase();
      if (!invModel.includes(model) && !model.includes(invModel)) return false;
      if (brand && !invBrand.includes(brand) && !brand.includes(invBrand)) {
        return false;
      }
      return true;
    });

    if (candidates.length === 0) return card;

    const exact = candidates.filter(
      (inv) =>
        Number(inv.price) === Number(card.price) &&
        (card.mileage <= 0 ||
          Number(inv.mileage ?? 0) === Number(card.mileage))
    );
    const pick = exact[0] ?? candidates[0]!;
    return summaryToChatCarCardData(toChatCarSummary(pick), "exact");
  });
}

/** True when a card carries at least one renderable public image URL. */
export function chatCardHasRenderableImage(
  car: Pick<ChatCarCardData, "imageUrl" | "imageUrls" | "hasImage">
): boolean {
  if ((car.imageUrls ?? []).some((u) => typeof u === "string" && u.trim())) {
    return true;
  }
  return Boolean(car.hasImage && car.imageUrl?.trim());
}

/**
 * v22.59 — when merging local + server cards for the same listing, never
 * downgrade an image-complete card to an image-less duplicate.
 */
export function mergeChatCarCardsPreferImages(
  preferredComplete: ChatCarCardData[] | undefined,
  incoming: ChatCarCardData[]
): ChatCarCardData[] {
  if (!incoming.length) return preferredComplete?.slice() ?? [];
  if (!preferredComplete?.length) return incoming;

  return incoming.map((remote, index) => {
    const local =
      preferredComplete.find(
        (c) =>
          listingIdentityKey(c) &&
          listingIdentityKey(c) === listingIdentityKey(remote)
      ) ?? preferredComplete[index];
    if (!local) return remote;
    if (chatCardHasRenderableImage(remote)) return remote;
    if (!chatCardHasRenderableImage(local)) return remote;
    return {
      ...remote,
      ...(local.imageUrl?.trim() ? { imageUrl: local.imageUrl } : {}),
      ...(local.imageUrls && local.imageUrls.length > 0
        ? { imageUrls: local.imageUrls }
        : {}),
      hasImage: true,
    };
  });
}

/**
 * "เทียบกับ Corolla 2021" / "เปรียบเทียบกับ …" — named inventory target,
 * not numbered session-card compare and not general market knowledge.
 */
export function isNamedInventoryCompareIntent(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (extractNumberedComparePair(t)) return false;
  if (isPilotBuyerGeneralKnowledgeFollowUp(t)) return false;
  if (!isCompareIntent(t) && !/เทียบกับ|เปรียบเทียบกับ/i.test(t)) return false;
  if (!/เทียบ|เปรียบเทียบ/i.test(t)) return false;

  const criteria = parseMarketplaceSearchQuery(t);
  if (!criteria) return false;
  const hasModel = Boolean(criteria.model?.trim());
  const hasBrandYear = Boolean(criteria.brand?.trim() && criteria.year != null);
  return hasModel || hasBrandYear;
}

function targetLabel(criteria: ChatSearchCriteria): string {
  return [criteria.brand, criteria.model, criteria.year != null ? `ปี ${criteria.year}` : null]
    .filter(Boolean)
    .join(" ");
}

function resolveActiveBaseVehicle(
  _inventory: ChatInventoryCar[],
  contextCars: ChatCarCardData[]
): ChatCarCardData | null {
  // v22.57 — require session-scoped cards for compare base (chat isolation).
  // lastSelectedCarId alone must not resurrect a compare after hard reload / new chat.
  if (contextCars.length === 0) return null;

  // Active vehicle only — do not parse the compare-target from the user message.
  let selectedId = loadLastSelectedCarId();
  if (!selectedId) {
    const viewed = loadRecentlyViewedCarIds();
    if (viewed.length > 0) selectedId = viewed[0]!;
  }
  if (!selectedId && contextCars.length > 0) {
    selectedId = contextCars[0]!.id;
  }
  if (!selectedId) return null;

  const fromContext = contextCars.find((c) => c.id === selectedId);
  if (fromContext) return fromContext;

  // Selected id not in current session cards — use newest session card
  // rather than inventing a base from a stale global selection alone.
  return contextCars[0] ?? null;
}

function targetSatisfiesCriteria(
  car: ChatCarCardData,
  criteria: ChatSearchCriteria
): boolean {
  if (criteria.year != null && car.year !== criteria.year) return false;
  if (criteria.model?.trim()) {
    const m = criteria.model.toLowerCase().replace(/-/g, "");
    const cm = car.model.toLowerCase().replace(/-/g, "");
    if (!cm.includes(m) && !m.includes(cm)) return false;
  }
  if (criteria.brand?.trim()) {
    if (!car.brand.toLowerCase().includes(criteria.brand.toLowerCase())) {
      return false;
    }
  }
  return true;
}

export function resolveInventoryBackedComparePair(
  message: string,
  inventory: ChatInventoryCar[],
  contextCars: ChatCarCardData[]
): InventoryCompareResolution {
  if (!isNamedInventoryCompareIntent(message)) {
    return {
      ok: false,
      reason: "not_named_compare",
      clarification: "อยากให้เทียบกับรุ่นหรือปีไหนเป็นพิเศษครับ?",
      cards: contextCars.slice(0, 1),
    };
  }

  const criteria = parseMarketplaceSearchQuery(message);
  if (!criteria || (!criteria.model?.trim() && !criteria.brand?.trim())) {
    return {
      ok: false,
      reason: "no_target",
      clarification:
        "อยากให้เทียบกับรุ่นหรือปีไหนเป็นพิเศษครับ? เช่น “เทียบกับ Corolla 2021”",
      cards: contextCars.slice(0, 1),
    };
  }

  const hydrated = rehydrateSessionCarsFromInventory(contextCars, inventory);
  const base = resolveActiveBaseVehicle(inventory, hydrated);
  if (!base) {
    return {
      ok: false,
      reason: "no_base",
      clarification:
        "ยังไม่มีรถคันที่กำลังดูอยู่ให้เทียบครับ ลองค้นหารถคันแรกก่อน แล้วค่อยพิมพ์เทียบกับรุ่น/ปีที่สนใจได้เลยครับ",
      cards: [],
    };
  }

  const label = targetLabel(criteria) || "รถที่ขอเทียบ";
  const { primary } = searchMarketplaceForChat(inventory, {
    ...criteria,
    limit: 6,
  });

  const candidates = primary
    .map((c) => summaryToChatCarCardData(c, "exact"))
    .filter((c) => listingIdentityKey(c) !== listingIdentityKey(base))
    .filter((c) => targetSatisfiesCriteria(c, criteria));

  if (candidates.length === 0) {
    return {
      ok: false,
      reason: "no_target",
      clarification: `ตอนนี้ยังไม่เจอ ${label} ในตลาดให้เทียบกับคันที่กำลังดูอยู่ครับ — น้องเอจะไม่เทียบคันเดิมกับตัวเองนะครับ`,
      cards: [base],
    };
  }

  // Reuse existing deterministic ranking (searchMarketplaceForChat sort) — take top.
  const target = candidates[0]!;

  if (!assertDistinctCompareListings(base, target)) {
    return {
      ok: false,
      reason: "same_listing",
      clarification: `ยังเทียบ ${label} ให้ไม่ได้ครับ เพราะได้รถคันเดียวกับที่กำลังดูอยู่ — ลองระบุรุ่น/ปีอื่น หรือเปิดดูการ์ดคันอื่นก่อนครับ`,
      cards: [base],
    };
  }

  if (!targetSatisfiesCriteria(target, criteria)) {
    return {
      ok: false,
      reason: "target_mismatch",
      clarification: `ยังไม่เจอ ${label} ตรงตามที่ขอเทียบครับ`,
      cards: [base],
    };
  }

  if (hasIdenticalCompareFactSet(base, target)) {
    return {
      ok: false,
      reason: "duplicate_facts",
      clarification:
        "ข้อมูลเทียบซ้ำกันจนแยกคันไม่ได้ครับ ขอน้องเอตรวจรายการใหม่ก่อน — ลองระบุรุ่น/ปีอีกครั้งได้ครับ",
      cards: [base],
    };
  }

  return { ok: true, base, target, criteria };
}

export function buildInventoryBackedCompareReply(
  resolution: Extract<InventoryCompareResolution, { ok: true }>
): { text: string; carCards: ChatCarCardData[] } {
  const pair = [resolution.base, resolution.target];
  return {
    text: buildCompareReplyCopy(pair),
    carCards: pair,
  };
}

export function buildInventoryCompareUnavailableReply(
  resolution: Extract<InventoryCompareResolution, { ok: false }>
): { text: string; carCards: ChatCarCardData[] } {
  return {
    text: resolution.clarification,
    carCards: resolution.cards,
  };
}

/**
 * v22.58 — card/text/pair must derive from the same canonical vehicle set.
 * Returns true when the answer contradicts rendered/grounded cards.
 */
export function hasCardAnswerConsistencyFailure(
  text: string,
  cards: Array<
    Pick<ChatCarCardData, "year" | "price" | "mileage" | "model" | "brand">
  >
): boolean {
  const t = text.trim();
  if (!t || cards.length === 0) return false;

  const years = [...new Set(cards.map((c) => c.year).filter((y) => y > 1980))];
  for (const y of years) {
    const missingClaim = new RegExp(
      `(?:ยังไม่(?:เจอ|มี)|ไม่มี(?:ข้อมูล)?|หาไม่(?:เจอ|พบ)|unavailable).{0,24}${y}|${y}.{0,24}(?:ยังไม่(?:เจอ|มี)|ไม่มี(?:ใน(?:ระบบ|ตลาด|listing))?|หาไม่(?:เจอ|พบ)|unavailable)`,
      "i"
    );
    if (missingClaim.test(t)) return true;
  }

  if (cards.length >= 2) {
    const distinctFactKeys = new Set(
      cards.map((c) =>
        [c.brand, c.model, c.year, c.price, c.mileage].join("|")
      )
    );
    if (distinctFactKeys.size >= 2) {
      for (const y of years) {
        if (!new RegExp(String(y)).test(t)) return true;
      }
      const prices = cards.map((c) => c.price).filter((p) => p > 0);
      if (prices.length >= 2) {
        const formatted = prices.map((p) => p.toLocaleString("th-TH"));
        const mentioned = formatted.filter((p) => t.includes(p));
        if (mentioned.length < Math.min(2, formatted.length)) return true;
      }
    }
  }

  return false;
}
