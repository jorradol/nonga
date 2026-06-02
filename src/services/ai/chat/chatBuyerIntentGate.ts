/** v5.4.6.1+ — buyer intent gate before marketplace search (no seller flow) */

import type { ChatCarCardData } from "../../../types";
import {
  buildBuyerAdvisorReply,
  detectBuyerAdvisorTopic,
  normalizeBuyerAdvisorMessage,
  shouldDeferAdvisorToCarFacts,
  type BuyerAdvisorTopic,
} from "./chatBuyerAdvisorTemplates";
import { classifyBuyerFactsQuestion } from "./chatBuyerFactsQa";
import {
  parseBuyerSearchIntent,
  type BuyerSearchIntent,
} from "./buyerSearchIntentParser";
import {
  hasSufficientSearchCriteria,
  parseMarketplaceSearchQuery,
} from "./marketplaceChatSearch";

export interface BuyerIntentGateReply {
  text: string;
  skipGemini: true;
}

export interface BuyerIntentGateOptions {
  /** When set, mileage questions defer to car facts Q&A instead of general advisor. */
  hasTargetCarForFacts?: boolean;
  /** Selected car for advisor copy (e.g. คันนี้ต้องดูอะไร) — never attaches cards */
  selectedCarForAdvisor?: ChatCarCardData | null;
}

export type { BuyerAdvisorTopic };

const VAGUE_UNCLEAR =
  /^(?:ช่วยหน่อย|แนะนำหน่อย|มีอะไรบ้าง|มีอะไรน่าสนใจ(?:บ้าง)?|เอาแบบไหนดี|อยากได้รถ(?:หน่อย)?|หาหน่อย|แนะนำรถหน่อย|แนะนำหน่อยครับ|ช่วยแนะนำหน่อย|อยากได้รถดี\s*ๆ|อยากได้รถดีๆ)$/i;

const VAGUE_WITH_SOFT_ADVISE =
  /^(?:แนะนำ(?:รถ)?(?:ให้)?(?:หน่อย)?|ช่วยแนะนำ(?:รถ)?(?:หน่อย)?|มีอะไร(?:น่าสนใจ|ดี)(?:บ้าง)?)(?:ครับ|ค่ะ|นะ)?$/i;

const EXPLICIT_SEARCH_REQUEST =
  /(?:มี|หา|ค้นหา|ช่วยหา|ช่วยค้นหา).{0,80}(?:ไหม|มั้ย|หรือเปล่า|ให้หน่อย|ให้ที|ได้ไหม)/i;

const SOFT_SEARCH_HINT =
  /(?:มี|หา|ค้นหา|แนะนำ|งบ|ราคา|แสน|ล้าน|น่าสนใจ)/i;

function hasConcreteSearchSignals(text: string): boolean {
  if (parseBuyerSearchIntent(text).isVehicleSearch) return true;
  const criteria = parseMarketplaceSearchQuery(text);
  if (!criteria) return false;
  return hasSufficientSearchCriteria(criteria, text);
}

/** Search-style messages with usage/budget — defer advisor template to scored search (v5.4.8c). */
function shouldDeferAdvisorForBuyerSearch(
  intent: BuyerSearchIntent,
  topic: BuyerAdvisorTopic,
  message: string
): boolean {
  if (!intent.isVehicleSearch) return false;
  const searchDeferTopics: BuyerAdvisorTopic[] = [
    "firstCar",
    "easyMaintenance",
    "lowMaintenance",
  ];
  if (!searchDeferTopics.includes(topic)) return false;
  const tagCount = intent.usageTags?.length ?? 0;
  if (tagCount >= 2) return true;
  if (intent.budgetMax != null) return true;
  if (intent.seatsMin != null) return true;
  if (
    tagCount >= 1 &&
    /(?:มี|หา|อยากได้|ต้องการ).{0,40}(?:รถ|คัน)/i.test(message)
  ) {
    return true;
  }
  return false;
}

export function isVagueUnclearBuyerMessage(message: string): boolean {
  const t = normalizeBuyerAdvisorMessage(message);
  if (!t) return false;
  if (VAGUE_UNCLEAR.test(t)) return true;
  if (VAGUE_WITH_SOFT_ADVISE.test(t)) return true;
  if (/^(?:มี|แนะนำ|หา|งบ)(?:ครับ|ค่ะ|นะ)?$/i.test(t)) return true;
  if (/^มีอะไร(?:บ้าง|ดีบ้าง|น่าสนใจ)/i.test(t) && !EXPLICIT_SEARCH_REQUEST.test(t)) {
    return true;
  }
  if (/^แนะนำรถ/i.test(t) && !hasConcreteSearchSignals(t)) return true;
  return false;
}

/** @deprecated use detectBuyerAdvisorTopic */
export function detectGenericAdvisorTopic(message: string): BuyerAdvisorTopic | null {
  return detectBuyerAdvisorTopic(message);
}

export function buildClarifyingBuyerReply(message: string): string {
  const t = normalizeBuyerAdvisorMessage(message);
  if (/แนะนำ|อยากได้|เอาแบบ/i.test(t)) {
    return [
      "ได้ครับคุณพี่ อยากให้น้องเอช่วยดูจากงบประมาณ ประเภทการใช้งาน หรือยี่ห้อที่สนใจก่อนดีครับ?",
      "เช่น งบไม่เกิน 5–7 แสน / SUV ครอบครัว / กระบะ Toyota — พิมพ์มาได้เลยครับ",
    ].join("\n");
  }
  return [
    "ได้ครับคุณพี่ ขอรายละเอียดเพิ่มนิดนึงก่อนนะครับ",
    "ช่วยบอกงบประมาณ ยี่ห้อ/รุ่น หรือประเภทรถที่อยากใช้ (เช่น SUV ครอบครัว กระบะ รถเมือง) แล้วน้องเอจะค้นจากรถจริงในระบบให้ครับ",
  ].join("\n");
}

export { buildBuyerAdvisorReply };

/** Deterministic reply before facts/search; null = continue orchestrator chain */
export function tryBuyerIntentGateReply(
  message: string,
  options?: BuyerIntentGateOptions
): BuyerIntentGateReply | null {
  const t = normalizeBuyerAdvisorMessage(message);
  if (!t) return null;

  const buyerIntent = parseBuyerSearchIntent(t);

  const advisor = detectBuyerAdvisorTopic(t);
  if (advisor) {
    if (shouldDeferAdvisorForBuyerSearch(buyerIntent, advisor, t)) {
      return null;
    }
    if (
      shouldDeferAdvisorToCarFacts(
        advisor,
        t,
        Boolean(options?.hasTargetCarForFacts)
      )
    ) {
      return null;
    }
    return {
      text: buildBuyerAdvisorReply(advisor, options?.selectedCarForAdvisor ?? undefined),
      skipGemini: true,
    };
  }

  if (buyerIntent.isVehicleSearch) {
    return null;
  }

  if (
    options?.hasTargetCarForFacts &&
    classifyBuyerFactsQuestion(t) !== "none"
  ) {
    return null;
  }

  if (isVagueUnclearBuyerMessage(t)) {
    return { text: buildClarifyingBuyerReply(t), skipGemini: true };
  }

  const criteria = parseMarketplaceSearchQuery(t);
  if (criteria && !hasSufficientSearchCriteria(criteria, t)) {
    if (SOFT_SEARCH_HINT.test(t) && !EXPLICIT_SEARCH_REQUEST.test(t)) {
      return { text: buildClarifyingBuyerReply(t), skipGemini: true };
    }
  }

  return null;
}
