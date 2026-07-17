/** v5.4.7b — in-chat help & onboarding (no Gemini, no car cards) */

import { isMarketplaceSearchIntent } from "./marketplaceChatSearch";
import { detectBuyerAdvisorTopic } from "./chatBuyerAdvisorTemplates";
import { CHAT_PILOT_CLOSED_INVITE_NOTICE } from "./chatDraftAccess";
import { PUBLIC_NONGA_BASE_URL } from "../../../utils/publicNongaUrl";

export type HelpOnboardingTopic =
  | "generalHelp"
  | "sellerOnboarding"
  | "sellerPhotos"
  | "sellerAfterPublish"
  | "sellerShareCopy"
  | "buyerOnboarding"
  | "accountPilot"
  | "policyInfo";

export const HELP_ONBOARDING_PATTERNS: {
  topic: HelpOnboardingTopic;
  re: RegExp;
}[] = [
  {
    topic: "policyInfo",
    re: /นโยบาย(?:คือ|มี|อะไร|ใช้)?|(?:ข้อมูล|ข้อมูลส่วนตัว).{0,16}ปลอดภัย|privacy|terms|เงื่อนไข(?:การใช้|ใช้งาน)|นโยบาย(?:ความเป็นส่วนตัว|ประกาศ)|listing\s*policy/i,
  },
  {
    topic: "accountPilot",
    re: /(?:ต้อง|จำเป็น)(?:สมัคร|ลงทะเบียน)(?:สมาชิก)?(?:ไหม|มั้ย)?|สมัคร(?:สมาชิก)?(?:ไม่ได้|ไม่ผ่าน|ทำไม)|ทำไมสมัครไม่ได้|(?:login|ล็อกอิน|เข้าสู่ระบบ)(?:ทำ)?ยังไง|รอบทดลอง(?:คือ|คืออะไร|คืออะไร)|closed\s*pilot|เปิดสมัครทั่วไป(?:ไหม|มั้ย)?/i,
  },
  {
    topic: "sellerPhotos",
    re: /(?:ต้อง|ควร|ต้องมี)(?:ส่ง|แนบ)?รูป(?:กี่|เท่าไหร่|เท่าไร|อะไรบ้าง)|รูป(?:กี่|เท่าไหร่|เท่าไร)(?:รูป)?(?:ต้อง|ควร)|ส่งรูปอะไรบ้าง|แนบรูป(?:ยังไง|อย่างไร)/i,
  },
  {
    topic: "sellerAfterPublish",
    re: /หลัง(?:ลง|โพส|เผยแพร่|ลงตลาด).*(?:แล้ว|เสร็จ).*(?:ทำ|ทำอะไร)|ลง(?:ตลาด|ประกาศ)แล้ว(?:ทำ|ทำอะไร)|publish(?:แล้ว)?(?:ทำ|ทำอะไร)/i,
  },
  {
    topic: "sellerShareCopy",
    re: /(?:เอา|นำ)โพสต์(?:ไป)?(?:ลง)?\s*(?:facebook|fb|เฟส|line|ไลน์)|คัดลอกโพสต์(?:ไป)?(?:ลง)?|แชร์(?:ไป)?(?:facebook|fb|เฟส|line|ไลน์)/i,
  },
  {
    topic: "sellerOnboarding",
    re: /(?:อยาก|ต้องการ|จะ)(?:ขาย|ลงขาย|ลงประกาศ|โพส(?:ขาย)?)รถ|ขายรถ(?:ต้อง|ควร)(?:ทำ|เริ่ม)|ลงประกาศ(?:ขาย)?รถ(?:ยังไง|ทำยังไง|อย่างไร)|สร้างประกาศ(?:ขาย)?รถ(?:ยังไง|ทำยังไง|อย่างไร)|ช่วย(?:ลง|ขาย)รถ(?:ยังไง|หน่อย)?/i,
  },
  {
    topic: "buyerOnboarding",
    re: /(?:อยาก|จะ)ซื้อรถ(?:ต้อง|ควร)(?:ถาม|ทำ).{0,30}(?:อะไร|ยังไง)|ซื้อรถต้องถามอะไร|ช่วยหารถ(?:ได้|ให้)(?:ไหม|มั้ย)?|ถาม(?:เรื่อง)?ค่างวด(?:ได้|ไหม|มั้ย)?|ถาม(?:เรื่อง)?ประกัน(?:ได้|ไหม|มั้ย)?|ถาม(?:เรื่อง)?รถเสีย(?:ได้|ไหม|มั้ย)?/i,
  },
  {
    topic: "generalHelp",
    re: /(?:ใช้งาน|ใช้)(?:ยังไง|อย่างไร|ไง)|น้องเอ(?:ทำ|ช่วย)(?:อะไร|ได้อะไร)|เริ่ม(?:ยังไง|ต้องทำอะไร|จากไหน)|สอน(?:ใช้|หน่อย)|มือใหม่(?:ใช้|เริ่ม)|มีเมนูอะไร|แชท(?:นี้)?ช่วยอะไร|วิธีใช้|คู่มือ(?:ใช้)?|help(?:ใช้)?/i,
  },
];

const CORE_PHOTO_SHOTS = ["หน้ารถ", "ด้านข้าง", "ด้านหลัง"];

export interface HelpOnboardingReplyOptions {
  /** ชื่อที่แสดงเมื่อผู้ใช้ล็อกอินแล้ว — ใช้ปรับคำทักทายใน seller help */
  displayName?: string;
}

function formatSellerGreeting(displayName?: string): string {
  const name = displayName?.trim();
  return name ? `คุณพี่${name}` : "คุณพี่";
}

function joinLines(parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p && p.trim()).join("\n");
}

function numberedList(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

function bulletList(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

export function normalizeHelpMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

export function shouldDeferHelpForSearch(message: string): boolean {
  return isMarketplaceSearchIntent(message);
}

export function detectHelpOnboardingTopic(
  message: string
): HelpOnboardingTopic | null {
  const t = normalizeHelpMessage(message);
  if (!t) return null;
  if (shouldDeferHelpForSearch(t)) return null;
  if (detectBuyerAdvisorTopic(t)) return null;
  for (const { topic, re } of HELP_ONBOARDING_PATTERNS) {
    if (re.test(t)) return topic;
  }
  return null;
}

export function buildHelpOnboardingReply(
  topic: HelpOnboardingTopic,
  options?: HelpOnboardingReplyOptions
): string {
  const greeting = formatSellerGreeting(options?.displayName);
  switch (topic) {
    case "generalHelp":
      return joinLines([
        "สวัสดีครับคุณพี่ น้องเอช่วยเรื่องรถมือสองในแชทนี้ได้ครับ ปังปุริเย่!",
        "สรุปสั้น ๆ น้องเอช่วยได้ เช่น:",
        bulletList([
          "ค้นหารถในตลาด (บอกยี่ห้อ งบ ประเภทรถ)",
          "แนะนำก่อนซื้อ / เช็กจุดสำคัญ",
          "คำนวณค่างวดเบื้องต้น",
          "ถามประกัน / อาการรถเสียเบื้องต้น",
          "ช่วยสร้างประกาศขายจากรูปและข้อมูล",
          "ช่วยคัดลอกโพสต์ไปลง Facebook/LINE เองหลังลงตลาด",
        ]),
        "ถามมาเป็นประโยคสั้น ๆ ได้เลยครับ เช่น “อยากขายรถต้องทำยังไง” หรือ “มี Camry ไม่เกิน 1 ล้านไหม”",
      ]);
    case "sellerOnboarding":
      return joinLines([
        `อยากขายรถ — เริ่มได้เลยครับ${greeting} ขั้นตอนง่าย ๆ แบบนี้:`,
        numberedList([
          `ส่งรูปหลัก 3 มุม (${CORE_PHOTO_SHOTS.join(" · ")}) พร้อมข้อมูลพื้นฐาน เช่น ยี่ห้อ รุ่น ปี ราคา ไมล์ — พอให้น้องเอเริ่มร่างประกาศเบื้องต้นได้ทันที (แนบรูปในช่องแชทได้)`,
          "น้องเอช่วยร่างโพสต์ขายให้น่าอ่านจากข้อมูลที่มี — ไม่มโนข้อมูล ถ้าข้อมูลสำคัญยังขาดจะถามเพิ่มแบบสั้น ๆ สุภาพ ไม่ทำให้ flow ช้า",
          "ตรวจข้อมูล แล้วเข้าสู่ระบบ → บันทึก → ลงตลาด (ตามรอบทดลอง)",
          "หลังลงตลาดแล้ว คัดลอกโพสต์ไปใช้ต่อใน Facebook/LINE ได้",
        ]),
        "มีรูปหรือข้อมูลเพิ่มส่งมาได้เลยครับ — มากกว่า 3 รูปก็รับตามปกติ ไม่ต้องเลือกเองว่ารูปไหนหลักหรือเสริม น้องเอจัดการให้",
        "รูปภายใน เลขไมล์ ห้องเครื่อง ล้อ/ยาง หรือรอยตำหนิช่วยเพิ่มความน่าเชื่อถือ แต่ไม่บังคับนะครับ",
        "ผู้ขายรับผิดชอบความถูกต้องของข้อมูลและรูปรถจริงครับ",
        "ถามต่อได้ เช่น “ต้องส่งรูปอะไรบ้าง” หรือ “หลังลงประกาศแล้วทำอะไรต่อ”",
      ]);
    case "sellerPhotos":
      return joinLines([
        `เริ่มได้เลยครับ${greeting} ส่งรูปหลัก 3 มุมก่อนก็พอสำหรับให้น้องเอช่วยร่างประกาศเบื้องต้นได้เลยครับ: ${CORE_PHOTO_SHOTS.join(" · ")} ขอแบบชัด ๆ เห็นเต็ม ๆ คันเลยนะครับ${greeting}`,
        "ถ้ามีรูปหรือข้อมูลพิมพ์เพิ่มบอกน้องเอในช่องแชทได้เลยครับ เช่น ภายใน เลขไมล์ ห้องเครื่อง ล้อ/ยาง หรือรอยตำหนิ ก็ส่งเพิ่มได้ตามสะดวกครับ รูปหรือข้อความที่เพิ่มเติมเหล่านี้จะช่วยเพิ่มความน่าเชื่อถือให้ประกาศ แต่ไม่บังคับนะครับ",
        "น้องเอจะเริ่มร่างโพสต์จากข้อมูลที่มีให้ก่อน แล้วถ้าข้อมูลสำคัญยังขาด เช่น ปีรถ ราคา เลขไมล์ หรือเกียร์ เดี๋ยวน้องเอจะถามเพิ่มแบบสั้น ๆ เพื่อให้ประกาศดูครบและน่าเชื่อถือขึ้นครับ",
        `ส่งรูปมาได้เลยครับ${greeting} — มีมากกว่า 3 รูปก็รับตามปกติ น้องเอใช้รูปและข้อมูลที่มีช่วยร่างประกาศให้น่าอ่านก่อน ไม่ต้องเลือกเองว่ารูปไหนหลักหรือเสริม`,
        "เตือนนุ่ม ๆ:",
        bulletList([
          "หลีกเลี่ยงรูปเอกสารส่วนตัวหรือใบหน้าในแชท",
          "ถ้าไม่อยากเปิดเผยป้ายทะเบียน ให้เบลอหรือถ่ายมุมที่ปลอดภัย",
          "ผู้ขายรับผิดชอบความถูกต้องของข้อมูลรถจริง",
        ]),
        "ปังปุริเย่!",
      ]);
    case "sellerAfterPublish":
      return joinLines([
        "หลังลงตลาดแล้ว แนะนำทำต่อแบบนี้ครับ:",
        numberedList([
          "เปิดการ์ดประกาศในแชท ตรวจว่ารูปและราคาถูกต้อง",
          "กดคัดลอกโพสต์ขาย / โพสต์สั้น / สเปกรถ แล้วนำไปลง Facebook หรือ LINE เอง",
          "ตอบคำถามผู้สนใจและนัดดูรถจริงตามที่สะดวก",
        ]),
        `ลิงก์ประกาศสาธารณะจะเป็นโดเมัน ${new URL(PUBLIC_NONGA_BASE_URL).hostname} ครับ`,
      ]);
    case "sellerShareCopy":
      return joinLines([
        "ได้ครับ — หลังลงตลาดแล้วให้กดคัดลอกโพสต์จากการ์ดประกาศในแชทครับ",
        numberedList([
          "เลือก “คัดลอกโพสต์ขาย” หรือ “โพสต์สั้น” หรือ “สเปกรถ”",
          "วางใน Facebook / LINE / Marketplace ตามที่คุณพี่ใช้",
          "ตรวจอีกครั้งก่อนโพสต์ว่าราคาและรูปตรงกับรถจริง",
        ]),
        "น้องเอไม่โพสต์แทนให้ — ช่วยเตรียมข้อความให้คุณพี่นำไปใช้เองครับ",
      ]);
    case "buyerOnboarding":
      return joinLines([
        "ฝั่งผู้ซื้อ ถามน้องเอแบบนี้ได้ครับคุณพี่:",
        bulletList([
          "ค้นหา: “มี Camry ไม่เกิน 1 ล้านไหม” / “หา SUV 7 ที่นั่ง”",
          "คำนวณค่างวด: “รถราคา 500,000 ดาวน์ 20% ผ่อน 60 เดือน ดอก 5% ผ่อนเท่าไหร่”",
          "ก่อนซื้อ: “ซื้อรถมือสองต้องดูอะไร” / “รถน้ำท่วมดูยังไง”",
          "ประกัน: “ประกันชั้น 1 กับ 2+ ต่างกันยังไง”",
          "อาการรถ: “รถสตาร์ทไม่ติดทำไง”",
        ]),
        "พิมพ์คำถามมาเป็นประโยคสั้น ๆ ได้เลยครับ น้องเอจะตอบเบื้องต้นให้ก่อน ไม่ต้องล็อกอินเพื่อค้นหา",
      ]);
    case "accountPilot":
      return joinLines([
        CHAT_PILOT_CLOSED_INVITE_NOTICE,
        numberedList([
          "คุย / ค้นหารถ / ถามคำแนะนำเบื้องต้น — ใช้ได้โดยไม่ต้องสมัคร (ตามรอบทดลอง)",
          "บันทึกประกาศหรือลงตลาด — มักต้องเข้าสู่ระบบด้วยบัญชีที่ได้รับเชิญ",
          "ยังไม่เปิดสมัครสมาชิกทั่วไป — ไม่ต้องสมัครใหม่ถ้ายังไม่มีบัญชีจากทีมงาน",
        ]),
        "เข้าสู่ระบบ: กดปุ่ม “เข้าสู่ระบบ” จากแถบข้างหรือเมนูในแชทครับ",
        "ดูนโยบายเพิ่ม: /policy/terms · /policy/privacy · /policy/listing",
      ]);
    case "policyInfo":
      return joinLines([
        "นโยบายรอบทดลอง Nong A มี 3 ส่วนหลักครับคุณพี่:",
        bulletList([
          "เงื่อนไขการใช้งาน — /policy/terms",
          "ความเป็นส่วนตัว — /policy/privacy",
          "นโยบายประกาศขายรถ — /policy/listing",
        ]),
        "เป็นนโยบายเบื้องต้นสำหรับ closed pilot ไม่ใช่เอกสารกฎหมายหรือ PDPA ฉบับสมบูรณ์ — เมื่อเปิดวงกว้างควรให้ผู้เชี่ยวชาญตรวจทานอีกครั้ง",
        "สรุปสั้น ๆ: น้องเอช่วยร่างประกาศ แต่ผู้ขายตรวจข้อมูลจริงก่อนเผยแพร่ ระบบไม่รับประกันขายได้ และยังไม่เปิดสมัครทั่วไปในรอบนี้",
        "เตือนนุ่ม ๆ: อย่าอัปโหลดเอกสารส่วนตัว ใบหน้า หรือป้ายทะเบียนที่ไม่ได้เบลอ — ดูรายละเอียดในแต่ละหน้านโยบายจาก footer หรือลิงก์ด้านบนครับ",
      ]);
    default:
      return buildHelpOnboardingReply("generalHelp", options);
  }
}

export interface HelpOnboardingReply {
  text: string;
  skipGemini: true;
}

export function tryHelpOnboardingReply(
  message: string,
  options?: HelpOnboardingReplyOptions
): HelpOnboardingReply | null {
  const topic = detectHelpOnboardingTopic(message);
  if (!topic) return null;
  return {
    text: buildHelpOnboardingReply(topic, options),
    skipGemini: true,
  };
}
