/** v5.4.8c — buyer scored marketplace search reply (deterministic, no Gemini) */

import type { ChatCarCardData } from "../../../types";
import { parseBuyerSearchIntent, type BuyerSearchIntent } from "./buyerSearchIntentParser";
import {
  scoreBuyerMarketplaceCandidates,
  type BuyerMarketplaceScoredCandidate,
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
  buildAllScoredPitchLines,
  buildScoredCarPitchCopy,
} from "./buyerCarPitchCopy";
import { buildStableSeed, pickStableVariant } from "./thaiSalesCopyVariation";

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
  hasMoreCars?: boolean;
}

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

function assertSafeReplyText(text: string): void {
  if (FORBIDDEN_REPLY_CLAIM.test(text)) {
    throw new Error(`Forbidden claim in buyer scored search reply: ${text.slice(0, 80)}`);
  }
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
  const ctas = hasMore
    ? [
        "น้องเอจัดการ์ดด้านล่างให้แล้ว กด 'ดูรายละเอียดในแชท' หรือกด 'ดูเพิ่ม' เพื่อดูตัวเลือกอื่นได้ครับ",
        "ลองดูการ์ดรถด้านล่างก่อนนะครับ สนใจคันไหนกดดูรายละเอียดในแชท หรือกดดูเพิ่มได้",
      ]
    : [
        "ลองดูการ์ดรถด้านล่างได้เลยครับ สนใจคันไหนกด 'ดูรายละเอียดในแชท' เพื่อดูข้อมูลเพิ่มได้ครับ",
        "น้องเอจัดการ์ดไว้ด้านล่างแล้ว กดดูรายละเอียดในแชทได้เลยครับ",
      ];
  const ctaLine = pickStableVariant(seed, "buyerScored.cta", ctas);

  const text = buildScoredCarPitchCopy(message, intent, scoring, {
    hasMore,
    ctaLine,
    displayCount,
  });
  assertSafeReplyText(text);
  assertBuyerPitchSafe(text);
  return text;
}

function buildNoMatchReply(intent: BuyerSearchIntent): string {
  const parts = [
    "ตอนนี้ยังไม่เจอรถที่ตรงกับเงื่อนไขในตลาด Nong A ครับ",
    "น้องเอค้นจากรายการจริงเท่านั้น — ไม่ได้แต่งรายการขึ้นมา",
  ];
  if (intent.budgetMax != null) {
    parts.push(
      `ลองปรับงบ ยี่ห้อ/รุ่น หรือประเภทรถ (เช่น ขยายงบจาก ${formatPrice(intent.budgetMax)} บาท) แล้วถามใหม่ได้ครับ`
    );
  } else {
    parts.push(
      "ลองบอกงบประมาณ ยี่ห้อ หรือประเภทรถเพิ่ม (เช่น รถเมือง / ครอบครัว 7 ที่นั่ง) แล้วน้องเอช่วยค้นใหม่ได้ครับ"
    );
  }
  const text = parts.join("\n\n");
  assertSafeReplyText(text);
  return text;
}

function toSummaries(
  scoring: BuyerMarketplaceScoringResult
): ChatCarSummary[] {
  return scoring.candidates.map((c) => toChatCarSummary(c.car));
}

/** True when buyer parser says this is a vehicle search (not advisor-only). */
export function shouldUseBuyerScoredMarketplaceSearch(message: string): boolean {
  return parseBuyerSearchIntent(message).isVehicleSearch;
}

/**
 * Build orchestrated buyer search from intent + scoring.
 * Returns null when not a buyer vehicle search (caller may use legacy marketplace search).
 */
export function tryBuyerScoredMarketplaceReply(
  message: string,
  inventory: ChatInventoryCar[]
): BuyerScoredMarketplaceReply | null {
  const intent = parseBuyerSearchIntent(message);
  if (!intent.isVehicleSearch) return null;

  const { pool, criteriaBrandModel } = narrowInventoryByBrandModel(
    inventory,
    message
  );

  if (criteriaBrandModel && pool.length === 0) {
    const legacy = runMarketplaceChatSearch(message, inventory);
    const text =
      legacy?.introText ??
      buildNoMatchReply(intent);
    assertSafeReplyText(text);
    return { text, carCards: [], allCarCards: [] };
  }

  const scoring = scoreBuyerMarketplaceCandidates(intent, pool, { limit: 5 });
  if (scoring.candidates.length === 0) {
    return {
      text: buildNoMatchReply(intent),
      carCards: [],
      allCarCards: [],
    };
  }

  const summaries = toSummaries(scoring);
  const allCarCards = summariesToCarCards(summaries, []);
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

  return {
    text: introText,
    carCards: initialCards,
    allCarCards,
    pitchLines,
    hasMoreCars: hasMore,
  };
}
