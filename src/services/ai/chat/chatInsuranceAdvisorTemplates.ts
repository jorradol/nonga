/** v5.4.6.5 — deterministic insurance advisor (no Gemini, no car cards) */

import { isMarketplaceSearchIntent } from "./marketplaceChatSearch";

export type InsuranceAdvisorTopic =
  | "compulsoryInsurance"
  | "noInsuranceRequired"
  | "class1Vs2Plus"
  | "class2PlusVs3Plus"
  | "class1Definition"
  | "class2PlusDefinition"
  | "class3PlusDefinition"
  | "class3Definition"
  | "oldCarInsurance"
  | "usedCarInsurance"
  | "dealerVsGarageRepair"
  | "sumInsured"
  | "deductible"
  | "financedCarInsurance";

export const INSURANCE_ADVISOR_DISCLAIMER =
  "ข้อมูลนี้เป็นคำแนะนำเบื้องต้นเพื่อให้เข้าใจประเภทประกันนะครับ เงื่อนไขจริง ทุนประกัน เบี้ยประกัน และความคุ้มครอง ต้องตรวจสอบกับบริษัทประกันหรือนายหน้าที่ได้รับอนุญาตอีกครั้งครับ";

const INSURANCE_FOLLOW_UP =
  "ถ้าคุณพี่บอกอายุรถ งบประมาณ และลักษณะการใช้งาน น้องเอช่วยแนะนำแนวทางเบื้องต้นให้ได้ครับ";

export const INSURANCE_ADVISOR_PATTERNS: {
  topic: InsuranceAdvisorTopic;
  re: RegExp;
}[] = [
  {
    topic: "noInsuranceRequired",
    re: /(?:ไม่(?:มี|ทำ)|ไม่ต้อง)(?:ประกัน(?:รถ)?|พ\.?\s*ร\.?\s*บ)(?:ได้|ไหม|มั้ย)|(?:ต้อง|จำเป็น)(?:มี|ทำ).*(?:พ\.?\s*ร\.?\s*บ|ประกันภาคบังคับ)(?:ไหม|มั้ย)?|ไม่มีประกัน(?:รถ)?(?:ได้|ไหม)/i,
  },
  {
    topic: "compulsoryInsurance",
    re: /พ\.?\s*ร\.?\s*บ\.?\s*(?:คือ|คืออะไร|ต้อง|ต่าง|กับ|หมาย)|(?:ประกัน|พรบ)(?:ภาค)?บังคับ(?:คือ|คืออะไร)?/i,
  },
  {
    topic: "class1Vs2Plus",
    re: /(?:ประกัน(?:ชั้น)?\s*)?ชั้น\s*1\s*(?:กับ|และ|ต่าง|เทียบ).{0,40}(?:2\+?|ชั้น\s*2\+?)|ประกัน(?:ชั้น)?\s*1\s*(?:กับ|และ|ต่าง).{0,40}2\+?/i,
  },
  {
    topic: "class2PlusVs3Plus",
    re: /(?:ชั้น\s*)?2\+?\s*(?:กับ|และ|ต่าง|เทียบ).{0,40}(?:3\+?|ชั้น\s*3\+?)|2\+?\s*(?:กับ|และ)\s*3\+?/i,
  },
  {
    topic: "class1Definition",
    re: /(?:ประกัน(?:ชั้น)?\s*)?ชั้น\s*1\s*(?:คือ|คืออะไร|หมายความ|แปลว่า)/i,
  },
  {
    topic: "class2PlusDefinition",
    re: /(?:ประกัน(?:ชั้น)?\s*)?ชั้น\s*2\+?\s*(?:คือ|คืออะไร|หมายความ|แปลว่า)/i,
  },
  {
    topic: "class3PlusDefinition",
    re: /(?:ประกัน(?:ชั้น)?\s*)?ชั้น\s*3\+?\s*(?:คือ|คืออะไร|หมายความ|แปลว่า)/i,
  },
  {
    topic: "class3Definition",
    re: /(?:ประกัน(?:ชั้น)?\s*)?ชั้น\s*3(?!\+)\s*(?:คือ|คืออะไร|หมายความ|แปลว่า)/i,
  },
  {
    topic: "oldCarInsurance",
    re: /รถเก่(?:า)?\s*(?:ควร|ต้อง|ทำ|เลือก).*(?:ประกัน|ชั้น)|(?:ประกัน|ชั้น).*(?:รถเก่|รถอายุ)/i,
  },
  {
    topic: "usedCarInsurance",
    re: /รถมือ(?:สอง|สอง)?\s*(?:ควร|ต้อง|ทำ|เลือก).*(?:ประกัน|ชั้น|แบบ)|รถมือสอง.*(?:ประกัน|ชั้น).*(?:ไหน|แบบ)/i,
  },
  {
    topic: "dealerVsGarageRepair",
    re: /ซ่อม(?:ห้าง|อู่).*(?:กับ|ต่าง|เทียบ|หรือ)|(?:ห้าง|อู่).*(?:กับ|ต่าง|เทียบ|หรือ).*ซ่อม|ซ่อมห้าง(?:กับ|หรือ)\s*ซ่อมอู่/i,
  },
  {
    topic: "sumInsured",
    re: /ทุนประกัน(?:คือ|หมาย|คืออะไร|แปลว่า|ยังไง)/i,
  },
  {
    topic: "deductible",
    re: /ค่าเสียหายส่วนแรก(?:คือ|หมาย|คืออะไร|แปลว่า)?|deductible|excess(?:คือ)?/i,
  },
  {
    topic: "financedCarInsurance",
    re: /รถ(?:ยัง)?(?:ผ่อน|จัด(?:ไฟแนนซ์)?|ติด(?:ไฟแน)?).*(?:ประกัน|ชั้น)|(?:ผ่อน|จัดไฟแน).*(?:อยู่)?.*(?:ควร|ต้อง).*(?:ประกัน|ชั้น)/i,
  },
];

export function normalizeInsuranceMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

export function detectInsuranceAdvisorTopic(
  message: string
): InsuranceAdvisorTopic | null {
  const t = normalizeInsuranceMessage(message);
  if (/คันนี้|รถคันนี้/i.test(t)) return null;
  for (const { topic, re } of INSURANCE_ADVISOR_PATTERNS) {
    if (re.test(t)) return topic;
  }
  return null;
}

export function shouldDeferInsuranceForSearch(message: string): boolean {
  return isMarketplaceSearchIntent(message);
}

function joinLines(parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p && p.trim()).join("\n");
}

function bulletList(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

export function buildInsuranceAdvisorReply(
  topic: InsuranceAdvisorTopic
): string {
  switch (topic) {
    case "compulsoryInsurance":
      return joinLines([
        "พ.ร.บ. (พรบ.) คือประกันภาคบังคับสำหรับรถที่จดทะเบียนครับ",
        bulletList([
          "ครอบคลุมความเสียหายต่อบุคคลภายนอกตามที่กฎหมายกำหนด",
          "ไม่ใช่ประกันชั้น 1 ที่คุ้มรถเราแบบครบ",
          "ต้องต่ออายุตามกฎหมาย — รายละเอียดความคุ้มครองดูในกรมธรรม์",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "noInsuranceRequired":
      return joinLines([
        "โดยทั่วไปครับ:",
        bulletList([
          "พ.ร.บ. (ประกันภาคบังคับ) ต้องมีสำหรับรถที่จดทะเบียนและใช้บนถนน",
          "ประกันชั้น 1 / 2+ / 3+ เป็นการทำเพิ่มเติม — ไม่บังคับเหมือนพ.ร.บ.",
          "ถ้าไม่มีประกันภาคสมัครใจ ความเสียหายรถเราต้องรับเองเมื่อเกิดเหตุ",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "class1Definition":
      return joinLines([
        "ประกันชั้น 1 โดยทั่วไปครับ:",
        bulletList([
          "มักคุ้มครองกว้างที่สุดในแบบประกันรถยนต์ภาคสมัครใจ",
          "มักรวมรถชน ไฟไหม้ น้ำท่วม ขโมย (ตามเงื่อนไขกรมธรรม์)",
          "เบี้ยมักสูงกว่าชั้น 2+ / 3+",
          "เหมาะกับคนที่ต้องการความคุ้มครองครอบคลุม — แต่ต้องอ่านข้อยกเว้นในกรมธรรม์",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "class2PlusDefinition":
      return joinLines([
        "ประกันชั้น 2+ โดยทั่วไปครับ:",
        bulletList([
          "มักคุ้มครองรถชนเป็นหลัก (ทั้งคู่กรณีและฝ่ายเดียว ตามกรมธรรม์)",
          "ความคุ้มครองอื่น เช่น ไฟไหม้ น้ำท่วม ขโมย อาจน้อยกว่าชั้น 1",
          "เบี้ยมักต่ำกว่าชั้น 1",
          "เหมาะกับคนที่เน้นคุ้มรถชน แต่ยอมลดความคุ้มครองบางส่วน",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "class3PlusDefinition":
      return joinLines([
        "ประกันชั้น 3+ โดยทั่วไปครับ:",
        bulletList([
          "มักคุ้มครองรถชนเมื่อชนกับคู่กรณีที่ระบุในกรมธรรม์",
          "ไม่คุ้มรถเราเมื่อเราเป็นฝ่ายผิดหรือชนคนเดียว (ตามเงื่อนไข)",
          "เบี้ยมักต่ำกว่าชั้น 1 และ 2+",
          "เหมาะกับงบจำกัด แต่ต้องยอมรับข้อจำกัดความคุ้มครอง",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "class3Definition":
      return joinLines([
        "ประกันชั้น 3 โดยทั่วไปครับ:",
        bulletList([
          "มักคุ้มเฉพาะความเสียหายต่อบุคคลภายนอก (คู่กรณี)",
          "ไม่คุ้มความเสียหายรถเรา",
          "เบี้ยมักต่ำที่สุดในกลุ่มประกันภาคสมัครใจ",
          "ต่างจากพ.ร.บ. ในรายละเอียดความคุ้มครอง — ต้องอ่านกรมธรรม์",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "class1Vs2Plus":
      return joinLines([
        "ประกันชั้น 1 กับ 2+ ต่างกันโดยทั่วไปครับ:",
        bulletList([
          "ชั้น 1: คุ้มครองกว้างกว่า มักรวมรถชน ไฟไหม้ น้ำท่วม ขโมย (ตามกรมธรรม์)",
          "ชั้น 2+: มักเน้นคุ้มรถชน ความคุ้มครองอื่นอาจน้อยกว่า",
          "ชั้น 1 เบี้ยมักสูงกว่า ชั้น 2+ ประหยัดกว่าแต่ข้อจำกัดมากขึ้น",
          "ทุนประกัน ค่าเสียหายส่วนแรก ซ่อมห้าง/อู่ ต้องดูในกรมธรรม์แต่ละฉบับ",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "class2PlusVs3Plus":
      return joinLines([
        "ประกันชั้น 2+ กับ 3+ ต่างกันโดยทั่วไปครับ:",
        bulletList([
          "ชั้น 2+: มักคุ้มรถเราเมื่อชน (ทั้งคู่กรณีและฝ่ายเดียว ตามกรมธรรม์)",
          "ชั้น 3+: มักคุ้มเมื่อชนกับคู่กรณี ไม่คุ้มรถเราเมื่อเป็นฝ่ายผิดหรือชนคนเดียว",
          "ชั้น 3+ เบี้ยมักต่ำกว่า แต่ความคุ้มครองแคบกว่า",
          "เลือกตามงบและความเสี่ยงที่ยอมรับได้ — ไม่มีคำตอบเดียวที่เหมาะทุกคน",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "oldCarInsurance":
      return joinLines([
        "รถเก่าเลือกประกัน — แนวทางเบื้องต้นครับ:",
        bulletList([
          "รถอายุมาก มูลค่าต่ำ — บางคนเลือกชั้น 2+ หรือ 3+ เพื่อลดเบี้ย",
          "ถ้าใช้งานหนักหรือขับไกลบ่อย อาจพิจารณาความคุ้มครองที่กว้างขึ้น",
          "ทุนประกันควรสอดคล้องมูลค่ารถจริง — ไม่ฟันธงชั้นเดียว",
          "พ.ร.บ. ยังต้องมีตามกฎหมาย",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "usedCarInsurance":
      return joinLines([
        "รถมือสองควรทำประกัน — แนวทางเบื้องต้นครับ:",
        bulletList([
          "พ.ร.บ. ต้องมีเมื่อจดทะเบียนและใช้บนถนน",
          "ชั้น 1 เหมาะถ้าต้องการคุ้มครองกว้างและมูลค่ารถยังพอสูง",
          "ชั้น 2+ / 3+ เป็นทางเลือกถ้างบจำกัด — ต้องอ่านข้อยกเว้น",
          "ตรวจสอบประวัติเคลมและเงื่อนไขโอนประกันกับผู้ขาย/บริษัทประกัน",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "dealerVsGarageRepair":
      return joinLines([
        "ซ่อมห้างกับซ่อมอู่ในกรมธรรม์ — โดยทั่วไปครับ:",
        bulletList([
          "ซ่อมห้าง: ใช้อะไหล่และมาตรฐานศูนย์ มักแพงกว่า แต่คุณภาพใกล้มาตรฐานโรงงาน",
          "ซ่อมอู่: ค่าใช้จ่ายมักต่ำกว่า แต่เงื่อนไขอะไหล่/คุณภาพขึ้นกับกรมธรรม์",
          "บางกรมธรรม์ให้เลือกได้ บางฉบับกำหนดไว้ — ต้องอ่านในกรมธรรม์",
          "ไม่มีแบบไหนดีที่สุดสำหรับทุกคน",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "sumInsured":
      return joinLines([
        "ทุนประกัน (Sum Insured) คือวงเงินคุ้มครองสูงสุดตามกรมธรรม์ครับ",
        bulletList([
          "มักอ้างอิงมูลค่ารถหรือวงเงินที่ตกลงในกรมธรรม์",
          "ทุนสูงเกินไป = เบี้ยแพง ทุนต่ำเกินไป = ได้รับค่าชดเชยน้อยเมื่อเคลม",
          "ควรใกล้เคียงมูลค่าตลาดจริงของรถ",
          "เงื่อนไขการคำนวณค่าเสียหายดูในกรมธรรม์แต่ละฉบับ",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "deductible":
      return joinLines([
        "ค่าเสียหายส่วนแรก (Deductible / Excess) คือส่วนที่ผู้เอาประกันต้องรับเองก่อนครับ",
        bulletList([
          "มักหักจากค่าเคลมเมื่อเกิดเหตุตามเงื่อนไขกรมธรรม์",
          "ยิ่งส่วนแรกสูง บางกรมธรรม์เบี้ยอาจต่ำลง (แลกกับความเสี่ยงที่รับเอง)",
          "จำนวนและเงื่อนไขต่างกันตามบริษัทและแผนประกัน",
          "ต้องอ่านในกรมธรรม์ก่อนตัดสินใจ",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    case "financedCarInsurance":
      return joinLines([
        "รถที่ยังผ่อนอยู่ — เรื่องประกันเบื้องต้นครับ:",
        bulletList([
          "ไฟแนนซ์มักกำหนดให้ทำประกันชั้น 1 หรือตามเงื่อนไขสัญญา",
          "ต้องตรวจสอบกับสัญญาไฟแนนซ์และบริษัทประกัน",
          "พ.ร.บ. ยังต้องมีตามกฎหมาย",
          "ถ้าเปลี่ยนชั้นประกัน ควรแจ้งไฟแนนซ์และตรวจเงื่อนไขสัญญา",
        ]),
        INSURANCE_ADVISOR_DISCLAIMER,
        INSURANCE_FOLLOW_UP,
      ]);
    default:
      return joinLines([INSURANCE_ADVISOR_DISCLAIMER, INSURANCE_FOLLOW_UP]);
  }
}

export interface InsuranceAdvisorReply {
  text: string;
  skipGemini: true;
}

export function tryInsuranceAdvisorReply(
  message: string
): InsuranceAdvisorReply | null {
  if (shouldDeferInsuranceForSearch(message)) return null;
  const topic = detectInsuranceAdvisorTopic(message);
  if (!topic) return null;
  return {
    text: buildInsuranceAdvisorReply(topic),
    skipGemini: true,
  };
}
