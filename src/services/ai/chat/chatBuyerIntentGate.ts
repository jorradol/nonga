/** v5.4.6.1 — buyer intent gate before marketplace search (no seller flow) */

import {
  hasSufficientSearchCriteria,
  parseMarketplaceSearchQuery,
} from "./marketplaceChatSearch";

export interface BuyerIntentGateReply {
  text: string;
  skipGemini: true;
}

const VAGUE_UNCLEAR =
  /^(?:ช่วยหน่อย|แนะนำหน่อย|มีอะไรบ้าง|มีอะไรน่าสนใจ(?:บ้าง)?|เอาแบบไหนดี|อยากได้รถ(?:หน่อย)?|หาหน่อย|แนะนำรถหน่อย|แนะนำหน่อยครับ|ช่วยแนะนำหน่อย)$/i;

const VAGUE_WITH_SOFT_ADVISE =
  /^(?:แนะนำ(?:รถ)?(?:ให้)?(?:หน่อย)?|ช่วยแนะนำ(?:รถ)?(?:หน่อย)?|มีอะไร(?:น่าสนใจ|ดี)(?:บ้าง)?)(?:ครับ|ค่ะ|นะ)?$/i;

const EXPLICIT_SEARCH_REQUEST =
  /(?:มี|หา|ค้นหา|ช่วยหา|ช่วยค้นหา).{0,80}(?:ไหม|มั้ย|หรือเปล่า|ให้หน่อย|ให้ที|ได้ไหม)/i;

const SOFT_SEARCH_HINT =
  /(?:มี|หา|ค้นหา|แนะนำ|งบ|ราคา|แสน|ล้าน|น่าสนใจ)/i;

export type GenericAdvisorTopic =
  | "prePurchase"
  | "firstCar"
  | "mileageGeneral"
  | "dealerVsPrivate"
  | "floodCheck"
  | "crashCheck"
  | "financePrep"
  | "insuranceClasses"
  | "wontStart";

const ADVISOR_PATTERNS: { topic: GenericAdvisorTopic; re: RegExp }[] = [
  {
    topic: "prePurchase",
    re: /ซื้อรถมือสอง(?:ต้อง|ควร)ดูอะไร|ซื้อมือสอง(?:ต้อง|ควร)เช็คอะไร/i,
  },
  {
    topic: "firstCar",
    re: /รถมือสองคันแรก|คันแรก(?:ซื้อ|เลือก)รถ|ซื้อรถคันแรก/i,
  },
  {
    topic: "mileageGeneral",
    re: /เลขไมล์(?:เยอะ|สูง|เยอะไหม|เยอะมั้ย|เยอะหรือเปล่า)|ไมล์(?:เยอะ|สูง)(?:ไหม|มั้ย)?/i,
  },
  {
    topic: "dealerVsPrivate",
    re: /รถบ้าน(?:ดี|ดีกว่า)กว่า(?:รถ)?เต็นท์|เต็นท์(?:ดี|ดีกว่า)กว่ารถบ้าน/i,
  },
  { topic: "floodCheck", re: /รถน้ำท่วม(?:ดู|เช็ค|ตรวจ)ยังไง|น้ำท่วมดูยังไง/i },
  { topic: "crashCheck", re: /รถชน(?:ดู|เช็ค|ตรวจ)ยังไง|เคยชนดูยังไง/i },
  {
    topic: "financePrep",
    re: /ไฟแนนซ์(?:ต้อง|ควร)เตรียมอะไร|จัดไฟแนนซ์(?:ต้อง|ควร)เตรียม|ผ่อน(?:ต้อง|ควร)เตรียมอะไร/i,
  },
  {
    topic: "insuranceClasses",
    re: /ประกัน(?:ชั้น)?\s*1\s*(?:กับ|และ|ต่าง|เทียบ).{0,30}(?:2\+?|3\+?|ชั้น\s*2)|ชั้น\s*1\s*(?:กับ|และ)\s*ชั้น\s*2/i,
  },
  {
    topic: "wontStart",
    re: /รถสตาร์ทไม่ติด|สตาร์ทไม่ติด(?:ทำไง|ทำยังไง|เกิดจาก)/i,
  },
];

function normalizeForGate(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function hasConcreteSearchSignals(text: string): boolean {
  const criteria = parseMarketplaceSearchQuery(text);
  if (!criteria) return false;
  return hasSufficientSearchCriteria(criteria, text);
}

export function isVagueUnclearBuyerMessage(message: string): boolean {
  const t = normalizeForGate(message);
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

export function detectGenericAdvisorTopic(message: string): GenericAdvisorTopic | null {
  const t = normalizeForGate(message);
  if (/คันนี้|รถคันนี้|คันนั้น/i.test(t)) return null;
  for (const { topic, re } of ADVISOR_PATTERNS) {
    if (re.test(t)) return topic;
  }
  return null;
}

export function buildClarifyingBuyerReply(message: string): string {
  const t = normalizeForGate(message);
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

function buildGenericAdvisorReply(topic: GenericAdvisorTopic): string {
  switch (topic) {
    case "prePurchase":
      return [
        "ก่อนซื้อรถมือสอง แนะนำเช็กเบื้องต้นแบบนี้ครับ:",
        "• เล่มทะเบียนและเอกสารโอน",
        "• เลขไมล์และความสอดคล้องกับสภาพรถ",
        "• สภาพเครื่องยนต์ ช่วงล่าง และสนิม",
        "• ประวัติซ่อม/เข้าศูนย์ (ถ้ามีเอกสาร)",
        "• ทดลองขับและให้ช่างช่วยตรวจอีกชั้น",
        "ถ้ามีรถคันที่สนใจในแชทแล้ว กดดูรายละเอียดแล้วถามน้องเอเรื่องคันนั้นได้ครับ",
      ].join("\n");
    case "firstCar":
      return [
        "รถมือสองคันแรก แนะนำเริ่มจากงบที่สบายจริง ๆ และค่าดูแลรายปีครับ",
        "มองรถที่ดูแลง่าย อะไหล่หาง่าย มีประวัติชัด — แล้วค่อยจำกัดยี่ห้อ/รุ่นที่ชอบ",
        "ถ้าพร้อมแล้ว บอกงบกับการใช้งาน (เมือง/ครอบครัว/ทำงาน) น้องเอช่วยค้นรถในระบบให้ได้ครับ",
      ].join("\n");
    case "mileageGeneral":
      return [
        "เลขไมล์ต้องดูคู่กับปีรถและสภาพจริงครับ — ไมล์สูงไม่ได้แปลว่าแย่เสมอไป",
        "ถ้ามีรถคันที่สนใจ กดดูรายละเอียดในแชทแล้วถามเลขไมล์ของคันนั้นได้เลยครับ",
      ].join("\n");
    case "dealerVsPrivate":
      return [
        "รถบ้านกับรถเต็นท์ต่างกันที่ความสะดวก เอกสาร และความมั่นใจครับ",
        "รถบ้านอาจคุ้มกว่าแต่ต้องตรวจสภาพเองให้ละเอียด รถเต็นท์มักมีบริการหลังการขายชัดกว่า",
        "ไม่ว่าแบบไหน แนะนำตรวจรถจริงและเอกสารก่อนตัดสินใจครับ",
      ].join("\n");
    case "floodCheck":
      return [
        "รถน้ำท่วมเช็กเบื้องต้น: กลิ่นอับในห้องโดยสาร สนิมใต้เบาะ/พรม ไฟแดช/อิเล็กทรอนิกส์ผิดปกติ จุดเชื่อมตัวถัง",
        "น้องเอไม่ฟันธงแทนช่าง — ถ้าสงสัย ควรให้ช่างตรวจและดูประวัติประกัน/ศูนย์ครับ",
      ].join("\n");
    case "crashCheck":
      return [
        "รถเคยชนเช็กเบื้องต้น: ช่องว่างแผง สีไม่เท่ากัน ประตู/ฝากระโปรกง จุดเชื่อมตัวถัง",
        "ขอประวัติเคลม/ศูนย์ถ้ามี — น้องเอไม่ยืนยันประวัติที่ไม่มีในระบบครับ",
      ].join("\n");
    case "financePrep":
      return [
        "ไฟแนนซ์เบื้องต้นมักใช้บัตรประชาชน สลิปเงินเดือน/รายได้ และข้อมูลรถที่จะซื้อครับ",
        "อัตราผ่อนและดาวน์ขึ้นกับไฟแนนซ์จริง — เป็นแค่แนวทาง ไม่ใช่ใบเสนอราคาครับ",
      ].join("\n");
    case "insuranceClasses":
      return [
        "ประกันชั้น 1 คุ้มครองกว้างกว่า (มักรวมรถชน) ชั้น 2+ มักคุ้มรถชนแต่ไม่ครบเท่าชั้น 1 — รายละเอียดขึ้นกับกรมธรรม์",
        "น้องเอให้ข้อมูลทั่วไปเท่านั้น ไม่ใช่คำแนะนำจากบริษัทประกัน — ควรเทียบกับตัวแทนหรือโบรชัวร์จริงครับ",
      ].join("\n");
    case "wontStart":
      return [
        "รถสตาร์ทไม่ติดเบื้องต้นอาจมาจากแบตเตอรี่ น้ำมันเชื้อเพลิง หรือระบบสตาร์ทครับ",
        "ถ้ามีกลิ่นไหม้ ควันผิดปกติ หรือเสียงรุนแรง — หยุดใช้รถและเรียกช่างทันทีครับ",
        "น้องเอไม่แทนช่าง — ควรให้ช่างตรวจหน้างานครับ",
      ].join("\n");
    default:
      return buildClarifyingBuyerReply("");
  }
}

/** Deterministic reply before facts/search; null = continue orchestrator chain */
export function tryBuyerIntentGateReply(
  message: string
): BuyerIntentGateReply | null {
  const t = normalizeForGate(message);
  if (!t) return null;

  const advisor = detectGenericAdvisorTopic(t);
  if (advisor) {
    return { text: buildGenericAdvisorReply(advisor), skipGemini: true };
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
