/** v5.4.8c — buyer scored marketplace search reply (deterministic, no Gemini)
 * WP-VD01 — routes richer Thai discovery through runVehicleDiscovery first.
 */

import type { ChatCarCardData } from "../../../types";
import type { ChatDiscoveryCriteriaSnapshot } from "../../../utils/chatCarContext";
import { parseBuyerSearchIntent, type BuyerSearchIntent } from "./buyerSearchIntentParser";
import {
  scoreBuyerMarketplaceCandidates,
  type BuyerMarketplaceScoringResult,
} from "./buyerMarketplaceScoring";
import {
  parseMarketplaceSearchQuery,
  runMarketplaceChatSearch,
  searchMarketplaceForChat,
  summariesToCarCards,
  toChatCarSummary,
  type ChatInventoryCar,
  type ChatCarSummary,
} from "./marketplaceChatSearch";
import {
  assertBuyerPitchSafe,
  buildAllCardFitReasons,
  buildAllScoredPitchLines,
  buildScoredCarPitchCopy,
} from "./buyerCarPitchCopy.ts";
import { buildStableSeed, pickStableVariant } from "./thaiSalesCopyVariation";
import {
  isVehicleDiscoveryIntent,
  parseVehicleDiscoveryCriteria,
  runVehicleDiscovery,
  type VehicleDiscoveryContext,
  type VehicleDiscoveryCriteria,
} from "./vehicleDiscoveryIndex";

const FORBIDDEN_REPLY_CLAIM =
  /(?:ไม่เคยชน|ไม่เคยน้ำท่วม|ไม่จุกจิกแน่นอน|ไม่เสียแน่นอน|km\/l|กม\.\/ลิตร|กิโลเมตรต่อลิตร|รวยแน่นอน|เนื้อคู่ชัวร์)/i;

export interface BuyerScoredMarketplaceReply {
  text: string;
  /** First batch for display (up to 3) */
  carCards: ChatCarCardData[];
  /** Full ranked set for show-more context (up to 5) */
  allCarCards: ChatCarCardData[];
  /** Warm pitch per ranked car (parallel to allCarCards) */
  pitchLines?: string[];
  /** v7.4 — compact grounded fit reason per ranked car (parallel to allCarCards) */
  fitReasons?: string[];
  hasMoreCars?: boolean;
  /** WP-VD01 — structured criteria snapshot for refine continuity */
  discoveryCriteria?: ChatDiscoveryCriteriaSnapshot;
}

export interface BuyerScoredMarketplaceOptions {
  discoveryContext?: VehicleDiscoveryContext;
}

function assertSafeReplyText(text: string): void {
  if (FORBIDDEN_REPLY_CLAIM.test(text)) {
    throw new Error(`Forbidden claim in buyer scored search reply: ${text.slice(0, 80)}`);
  }
}

function toDiscoverySnapshot(
  criteria: VehicleDiscoveryCriteria
): ChatDiscoveryCriteriaSnapshot {
  return {
    ...(criteria.budgetMax != null ? { budgetMax: criteria.budgetMax } : {}),
    ...(criteria.budgetMin != null ? { budgetMin: criteria.budgetMin } : {}),
    ...(criteria.estimatedMonthlyMax != null
      ? { estimatedMonthlyMax: criteria.estimatedMonthlyMax }
      : {}),
    ...(criteria.brand ? { brand: criteria.brand } : {}),
    ...(criteria.model ? { model: criteria.model } : {}),
    ...(criteria.yearExact != null ? { yearExact: criteria.yearExact } : {}),
    ...(criteria.minYear != null ? { minYear: criteria.minYear } : {}),
    ...(criteria.maxAgeYears != null ? { maxAgeYears: criteria.maxAgeYears } : {}),
    ...(criteria.bodyHints?.length ? { bodyHints: [...criteria.bodyHints] } : {}),
    ...(criteria.transmission ? { transmission: criteria.transmission } : {}),
    ...(criteria.usageTags?.length ? { usageTags: [...criteria.usageTags] } : {}),
    ...(criteria.fuelEfficient ? { fuelEfficient: true } : {}),
    ...(criteria.appliedLabels?.length
      ? { appliedLabels: [...criteria.appliedLabels] }
      : {}),
  };
}

export function snapshotToPriorCriteria(
  snap: ChatDiscoveryCriteriaSnapshot | null | undefined
): VehicleDiscoveryCriteria | null {
  if (!snap) return null;
  return {
    isDiscovery: true,
    ...snap,
    bodyHints: snap.bodyHints as VehicleDiscoveryCriteria["bodyHints"],
  };
}

function narrowInventoryByBrandModel(
  inventory: ChatInventoryCar[],
  message: string
): { pool: ChatInventoryCar[]; criteriaBrandModel: boolean } {
  const criteria = parseMarketplaceSearchQuery(message);
  if (!criteria) {
    return { pool: inventory, criteriaBrandModel: false };
  }
  const hasBrandModel = Boolean(criteria.brand?.trim() || criteria.model?.trim());
  if (!hasBrandModel) {
    return { pool: inventory, criteriaBrandModel: false };
  }
  const { primary, alternatives } = searchMarketplaceForChat(inventory, criteria);
  const ids = new Set(
    [...primary, ...alternatives].map((c) => c.id)
  );
  if (ids.size === 0) {
    return { pool: [], criteriaBrandModel: true };
  }
  return {
    pool: inventory.filter((c) => ids.has(c.id)),
    criteriaBrandModel: true,
  };
}

function buildScoredSearchIntro(
  message: string,
  intent: BuyerSearchIntent,
  scoring: BuyerMarketplaceScoringResult,
  hasMore: boolean,
  displayCount: number
): string {
  const seed = buildStableSeed([message, "buyerScored", String(scoring.candidates.length)]);
  const softFollowUps = hasMore
    ? [
        "น้องเอคัดมาให้ดูก่อนชุดแรกครับ ถ้าสนใจคันไหน บอกได้เลย เดี๋ยวช่วยประสานนัดดูรถหรือทดลองขับต่อ",
        "ถ้าอยากดูชุดถัดไป หรืออยากให้น้องเอคัดตามงบ/ไมล์แล้วช่วยนัดชมรถ บอกได้เลยครับ",
      ]
    : displayCount >= 2
      ? [
          "ถ้าสนใจคันไหนเป็นพิเศษ น้องเอช่วยเทียบให้ชัด หรือประสานนัดดูรถ/ทดลองขับกับผู้ขายให้ต่อได้ครับ",
          "อยากให้น้องเอช่วยคัดคันที่คุ้มสุด ไมล์น้อยสุด หรือเหมาะครอบครัว แล้วต่อนัดชมรถไหมครับ",
        ]
      : [
          "ถ้าสนใจคันนี้ น้องเอช่วยประสานนัดดูรถ ทดลองขับ หรือคุยเรื่องไฟแนนซ์เบื้องต้นกับผู้ขายให้ต่อได้ครับ",
          "อยากให้น้องเอช่วยสรุปจุดเด่นสั้น ๆ หรือนัดดูรถจริงไหมครับ — บอกได้เลย",
        ];
  const ctaLine = pickStableVariant(seed, "buyerScored.soft", softFollowUps);

  const text = buildScoredCarPitchCopy(message, intent, scoring, {
    hasMore,
    ctaLine,
    displayCount,
    // v22.26 — always include per-car sales explanations in assistant text.
  });
  assertSafeReplyText(text);
  assertBuyerPitchSafe(text);
  return text;
}

function buildNoMatchReply(intent: BuyerSearchIntent): string {
  const seed = buildStableSeed([
    intent.budgetMax != null ? String(intent.budgetMax) : "none",
    "buyerScored.empty",
  ]);
  const text = pickStableVariant(seed, "buyerScored.empty", [
    "ตอนนี้ยังไม่เจอรุ่นนี้ในตลาดครับ ถ้ารับรุ่นใกล้เคียงได้ น้องเอช่วยหาแบรนด์ใกล้เคียง ปีใกล้กัน หรืองบใกล้กันให้ได้ครับ",
    "ยังไม่เจอตามที่ถามในตลาดตอนนี้ครับ ถ้ารับรุ่นใกล้เคียง น้องเอช่วยหาปีใกล้กันหรืองบใกล้กันให้ได้ครับ",
    "ตอนนี้ยังไม่มีคันที่ตรงเป๊ะครับ แต่บอกงบหรือแนวรถที่รับได้ได้เลย น้องเอช่วยหาทางเลือกใกล้เคียงให้ครับ",
  ]);
  assertSafeReplyText(text);
  return text;
}

/** Brand/model availability lookup — natural sales wording, not scored pitch + UI CTA. */
function isBrandModelAvailabilityLookup(message: string): boolean {
  const criteria = parseMarketplaceSearchQuery(message);
  if (!criteria) return false;
  const hasBrandModel = Boolean(criteria.brand?.trim() || criteria.model?.trim());
  if (!hasBrandModel) return false;
  // Budget / usage searches stay on scored path.
  if (criteria.maxPrice != null || criteria.minPrice != null) return false;
  if (criteria.suvOnly || criteria.pickupOnly || criteria.familyUse) return false;
  if (criteria.sevenSeats || criteria.commercialUse) return false;
  // WP-VD01 — transmission / age / monthly are discovery, not bare availability
  const discovery = parseVehicleDiscoveryCriteria(message);
  if (discovery.transmission) return false;
  if (discovery.maxAgeYears != null) return false;
  if (discovery.estimatedMonthlyMax != null) return false;
  return true;
}

function toSummaries(
  scoring: BuyerMarketplaceScoringResult
): ChatCarSummary[] {
  return scoring.candidates.map((c) => toChatCarSummary(c.car));
}

function shouldPreferVehicleDiscovery(
  message: string,
  discoveryContext?: VehicleDiscoveryContext
): boolean {
  const criteria = parseVehicleDiscoveryCriteria(message, discoveryContext);
  if (!criteria.isDiscovery) return false;
  // Keep classic scored pitch path for budget/usage searches that already
  // have frozen UX (v5.4.8c). Prefer discovery only for new hard filters /
  // refine / monthly affordability / age / transmission.
  if (criteria.refineKind && criteria.refineKind !== "showMore") return true;
  if (criteria.estimatedMonthlyMax != null) return true;
  if (criteria.transmission != null) return true;
  if (criteria.maxAgeYears != null || criteria.minYear != null) return true;
  return false;
}

/** True when buyer parser / discovery says this is a vehicle search. */
export function shouldUseBuyerScoredMarketplaceSearch(
  message: string,
  discoveryContext?: VehicleDiscoveryContext
): boolean {
  if (parseBuyerSearchIntent(message).isVehicleSearch) return true;
  return isVehicleDiscoveryIntent(message, discoveryContext);
}

/**
 * Build orchestrated buyer search from intent + scoring.
 * Returns null when not a buyer vehicle search (caller may use legacy marketplace search).
 */
export function tryBuyerScoredMarketplaceReply(
  message: string,
  inventory: ChatInventoryCar[],
  options?: BuyerScoredMarketplaceOptions
): BuyerScoredMarketplaceReply | null {
  const discoveryContext = options?.discoveryContext;
  const intent = parseBuyerSearchIntent(message);
  const discoveryIntent = isVehicleDiscoveryIntent(message, discoveryContext);

  if (!intent.isVehicleSearch && !discoveryIntent) return null;

  // Exact brand/model availability ("มี Honda CRV 2019 ไหม") → natural inventory copy.
  // Keep frozen inventory Q&A path — skip when discovery-specific constraints present.
  if (
    isBrandModelAvailabilityLookup(message) &&
    !shouldPreferVehicleDiscovery(message, discoveryContext)
  ) {
    const legacy = runMarketplaceChatSearch(message, inventory);
    if (legacy) {
      const allCarCards = summariesToCarCards(legacy.primary, legacy.alternatives);
      const initialCards = allCarCards.slice(0, 3);
      assertSafeReplyText(legacy.introText);
      return {
        text: legacy.introText,
        carCards: initialCards,
        allCarCards,
        hasMoreCars: allCarCards.length > 3,
      };
    }
  }

  // WP-VD01 — structured discovery foundation (criteria → match → rank → relax)
  if (
    shouldPreferVehicleDiscovery(message, discoveryContext) ||
    (!intent.isVehicleSearch && discoveryIntent)
  ) {
    const discovery = runVehicleDiscovery(
      message,
      inventory,
      discoveryContext ?? {}
    );
    if (discovery && discovery.criteria.refineKind !== "showMore") {
      assertSafeReplyText(discovery.summaryText);
      const snap = toDiscoverySnapshot(discovery.criteria);
      return {
        text: discovery.summaryText,
        carCards: discovery.carCards,
        allCarCards: discovery.allCarCards,
        hasMoreCars: discovery.hasMoreCars,
        fitReasons: discovery.allCarCards.map((c) => c.fitReason ?? ""),
        discoveryCriteria: snap,
      };
    }
  }

  if (!intent.isVehicleSearch) return null;

  const { pool, criteriaBrandModel } = narrowInventoryByBrandModel(
    inventory,
    message
  );

  if (criteriaBrandModel && pool.length === 0) {
    const legacy = runMarketplaceChatSearch(message, inventory);
    const text = legacy?.introText ?? buildNoMatchReply(intent);
    assertSafeReplyText(text);
    return { text, carCards: [], allCarCards: [] };
  }

  const scoring = scoreBuyerMarketplaceCandidates(intent, pool, { limit: 5 });
  if (scoring.candidates.length === 0) {
    // WP-VD01 — prefer discovery no-result with near alternatives when possible
    const discovery = runVehicleDiscovery(
      message,
      inventory,
      discoveryContext ?? {}
    );
    if (discovery && (discovery.nearAlternatives.length > 0 || discovery.isRelaxed)) {
      assertSafeReplyText(discovery.summaryText);
      return {
        text: discovery.summaryText,
        carCards: discovery.carCards,
        allCarCards: discovery.allCarCards,
        hasMoreCars: false,
        discoveryCriteria: toDiscoverySnapshot(discovery.criteria),
      };
    }
    return {
      text: buildNoMatchReply(intent),
      carCards: [],
      allCarCards: [],
    };
  }

  const summaries = toSummaries(scoring);
  const baseCards = summariesToCarCards(summaries, []);
  // v7.4 — narrative fusion: attach a grounded, guarded fit reason to each card.
  // fitReasons are parallel to scoring.candidates → parallel to baseCards order.
  const fitReasons = buildAllCardFitReasons(intent, scoring);
  const allCarCards = baseCards.map((card, i) => {
    const fitReason = fitReasons[i];
    return fitReason ? { ...card, fitReason } : card;
  });
  const initialCards = allCarCards.slice(0, 3);
  const hasMore = allCarCards.length > 3;
  const displayCount = initialCards.length;
  const introText = buildScoredSearchIntro(
    message,
    intent,
    scoring,
    hasMore,
    displayCount
  );
  const pitchLines = buildAllScoredPitchLines(message, intent, scoring);
  const discoverySnap = toDiscoverySnapshot(
    parseVehicleDiscoveryCriteria(message, discoveryContext)
  );

  return {
    text: introText,
    carCards: initialCards,
    allCarCards,
    pitchLines,
    fitReasons,
    hasMoreCars: hasMore,
    discoveryCriteria: discoverySnap,
  };
}
