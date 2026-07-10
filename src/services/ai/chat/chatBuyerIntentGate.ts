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

type OffTopicRecoveryKind =
  | "poem"
  | "song"
  | "horoscope"
  | "research"
  | "image"
  | "webPrice"
  | "general"
  /** v22.67 — brief rapport; not a general-chat mode */
  | "greeting"
  | "thanks"
  | "casualWarmth";

const OFF_TOPIC_POEM_RE = /แต่งกลอน|กลอนให้|เขียนกลอน/i;
const OFF_TOPIC_SONG_RE = /แต่งเพลง|เขียนเพลง|เพลงให้/i;
const OFF_TOPIC_HOROSCOPE_RE = /ดูดวง|ดวง|สีมงคล|ฤกษ์/i;
const OFF_TOPIC_RESEARCH_RE =
  /วิจัย(?:เรื่อง)?|วิเคราะห์หุ้น|วิเคราะห์(?:ตลาด)?อสังหา|อสังหาริมทรัพย์|เขียนโพสต์ขายกาแฟ|ทำการบ้าน/i;
const OFF_TOPIC_IMAGE_RE =
  /สร้างรูป|สร้างภาพ|ทำรูป|ทำภาพ|รูปภาพรถสวย|ภาพรถสวย/i;
const OFF_TOPIC_WEB_PRICE_RE =
  /ค้นเว็บ|ราคา(?:รถมือสอง)?ล่าสุด|เว็บล่าสุด|อัปเดตราคา|หาราคาจากเว็บ/i;
const OFF_TOPIC_GENERAL_RE =
  /ทำการบ้าน|การบ้าน|สรุปบทเรียน|เขียนเรียงความ|แต่งนิยาย|ช่วยคิดชื่อเกม/i;

/** Anchored only — must not swallow car-adjacent or search asks (v22.67 B1). */
const CASUAL_GREETING_RE =
  /^(?:สวัสดี|หวัดดี)(?:ครับ|ค่ะ|นะ|จ้า|จ๊ะ)?$/i;
const CASUAL_THANKS_RE =
  /^(?:ขอบคุณ|ขอบใจ)(?:ครับ|ค่ะ|มาก|นะ|จ้า|จ๊ะ)*$/i;
const CASUAL_WARMTH_RE =
  /^(?:วันนี้)?(?:เหนื่อย|เครียด|เบื่อ)(?:จัง|มาก|เลย)?(?:ครับ|ค่ะ|นะ)?$|^(?:วันนี้อารมณ์ดี|อารมณ์ดี)(?:จัง|มาก)?(?:ครับ|ค่ะ|นะ)?$/i;

const ROLE_BOUNDARY_LINE =
  "น้องเอขอเน้นช่วยเรื่องซื้อขายรถยนต์มือสองเป็นหลักครับ";

function buildRoleRecoveryPrompt(): string {
  return "ถ้าคุณพี่บอกงบ พื้นที่ใช้งาน และประเภทรถที่มองหา น้องเอช่วยแนะนำแนวรถที่เหมาะให้ต่อได้ทันทีครับ";
}

function buildLightCarHandoff(): string {
  return "กำลังมองหารถแบบไหน หรือมีรถที่อยากลงขาย บอกน้องเอได้เลยครับ";
}

function detectOffTopicRecoveryKind(message: string): OffTopicRecoveryKind | null {
  if (OFF_TOPIC_POEM_RE.test(message)) return "poem";
  if (OFF_TOPIC_SONG_RE.test(message)) return "song";
  if (OFF_TOPIC_IMAGE_RE.test(message)) return "image";
  if (OFF_TOPIC_WEB_PRICE_RE.test(message)) return "webPrice";
  if (OFF_TOPIC_RESEARCH_RE.test(message)) return "research";
  if (OFF_TOPIC_HOROSCOPE_RE.test(message)) return "horoscope";
  if (OFF_TOPIC_GENERAL_RE.test(message)) return "general";
  if (CASUAL_GREETING_RE.test(message)) return "greeting";
  if (CASUAL_THANKS_RE.test(message)) return "thanks";
  if (CASUAL_WARMTH_RE.test(message)) return "casualWarmth";
  return null;
}

function buildOffTopicRecoveryReply(kind: OffTopicRecoveryKind): string {
  if (kind === "poem") {
    return [
      `${ROLE_BOUNDARY_LINE} แต่ถ้าอยากได้กลอนสั้น ๆ น้องเอช่วยได้ครับ`,
      "รถดีต้องดูให้ครบ",
      "เอกสารจบค่อยตกลง",
      "งบพอดีใจมั่นคง",
      "น้องเอช่วยคัดทางให้ครับ",
      buildRoleRecoveryPrompt(),
    ].join("\n");
  }
  if (kind === "song") {
    return [
      `${ROLE_BOUNDARY_LINE} ถ้าเป็นคำขอเล่น ๆ น้องเอช่วยได้สั้น ๆ ครับ`,
      "ท่อนสั้น: รถเหมาะ งบพอ เอกสารชัวร์ ขับสบายใจครับ",
      buildRoleRecoveryPrompt(),
    ].join("\n");
  }
  if (kind === "research") {
    return [
      `${ROLE_BOUNDARY_LINE} เลยยังไม่ใช่ผู้ช่วยทำวิจัย/วิเคราะห์นอกสายรถโดยตรงครับ`,
      "แต่น้องเอช่วยงานฝั่งรถได้ เช่น ช่วยสรุปแนวทางตั้งราคาขายรถมือสอง ช่วยร่างประกาศขายรถ ช่วยแนะนำแนวรถตามงบ/พื้นที่ใช้งาน และช่วยเตือนเรื่องเอกสาร ความปลอดภัย และไฟแนนซ์เบื้องต้นครับ",
      "ถ้าคุณพี่อยากขายหรือซื้อรถ บอกยี่ห้อ รุ่น ปี งบประมาณ หรือพื้นที่ใช้งานมาได้เลย น้องเอช่วยจัดคำแนะนำให้เป็นขั้นตอนได้ครับ",
    ].join("\n");
  }
  if (kind === "image") {
    return [
      `${ROLE_BOUNDARY_LINE} ถ้าต้องการ “รูปภาพรถสวย ๆ” ตอนนี้น้องเอยังไม่ได้สร้างภาพใหม่โดยตรงในแชทนี้ครับ`,
      "แต่น้องเอช่วยวางแผนภาพประกาศให้ดูน่าเชื่อถือได้ เช่น มุมหน้ารถเฉียง 45 องศา ด้านข้าง ด้านท้าย ภายในห้องโดยสาร หน้าปัดเลขไมล์ ห้องเครื่อง และจุดตำหนิที่ควรถ่ายตรงไปตรงมาครับ",
      "ถ้าคุณพี่บอกรุ่นรถ สีรถ และสภาพโดยรวม น้องเอช่วยจัดลำดับภาพที่ควรถ่ายพร้อมคำบรรยายประกาศให้ต่อได้ครับ",
    ].join("\n");
  }
  if (kind === "horoscope") {
    return [
      `${ROLE_BOUNDARY_LINE} ถ้าเป็นเรื่องสีรถตามดวง น้องเอช่วยคุยแบบความเชื่อ/ความบันเทิงได้ครับ`,
      "แต่การเลือกซื้อจริงควรดูงบ การใช้งาน สภาพรถ เอกสาร และความปลอดภัยเป็นหลักครับ",
      "ถ้าสะดวก บอกได้ครับ: วันเกิดตามสัปดาห์, สีที่ชอบ/ไม่ชอบ, งบประมาณ, ใช้งานในเมืองหรือต่างจังหวัด, และอยากได้รถเล็ก/รถครอบครัว/รถประหยัดน้ำมัน",
      "น้องเอจะช่วยจับเป็นแนวรถที่เหมาะให้ต่อแบบใช้งานได้จริงครับ",
    ].join("\n");
  }
  if (kind === "webPrice") {
    return [
      `${ROLE_BOUNDARY_LINE} และในแชทนี้น้องเออาจไม่ได้ค้นเว็บสดให้ทันทีครับ`,
      "แต่น้องเอช่วยตั้งกรอบเทียบราคาตลาดรถมือสองได้ โดยเทียบรุ่นเดียวกัน ปีใกล้เคียง เลขไมล์ใกล้เคียง รุ่นย่อยเดียวกัน สภาพรถ และพื้นที่ขายครับ",
      "ถ้าคุณพี่ส่งข้อมูลมาได้ เช่น ยี่ห้อ/รุ่น/รุ่นย่อย ปี เกียร์ เลขไมล์ สี จังหวัด สภาพรถ และราคาที่ตั้งไว้หรือที่เห็นมา น้องเอช่วยประเมินช่วงราคาที่เหมาะให้ต่อได้ครับ",
    ].join("\n");
  }
  if (kind === "greeting") {
    return [
      "สวัสดีครับ น้องเอพร้อมช่วยเรื่องซื้อ ขาย หรือเลือกรถครับ",
      buildLightCarHandoff(),
    ].join(" ");
  }
  if (kind === "thanks") {
    return [
      "ด้วยความยินดีครับ",
      "ถ้าอยากหา เทียบ หรือลงขายรถต่อ บอกน้องเอได้เลยครับ",
    ].join(" ");
  }
  if (kind === "casualWarmth") {
    return [
      "รับทราบครับ พักหายใจก่อนได้นะครับ",
      "ถ้าพร้อมแล้วอยากคุยเรื่องหารถหรือขายรถ บอกน้องเอได้เลยครับ",
    ].join(" ");
  }
  return [
    `${ROLE_BOUNDARY_LINE} เลยอาจไม่ได้ลงลึกเรื่องทั่วไปนอกสายรถครับ`,
    "แต่น้องเอช่วยฝั่งรถได้ครบพอสมควร เช่น คัดรถตามงบ/พื้นที่ใช้งาน ช่วยเทียบตัวเลือก ร่างประกาศขายรถ และเตือนเรื่องเอกสาร ความปลอดภัย รวมถึงไฟแนนซ์เบื้องต้นครับ",
    buildRoleRecoveryPrompt(),
  ].join("\n");
}

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

  const offTopicKind = detectOffTopicRecoveryKind(t);
  if (offTopicKind) {
    return {
      text: buildOffTopicRecoveryReply(offTopicKind),
      skipGemini: true,
    };
  }

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
