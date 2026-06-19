/** v5.4.6.2+ — deterministic buyer advisor replies (no inventory cards, no Gemini) */

import type { ChatCarCardData } from "../../../types";

export type BuyerAdvisorTopic =
  | "prePurchase"
  | "firstCar"
  | "mileageGeneral"
  | "dealerVsPrivate"
  | "floodCheck"
  | "crashCheck"
  | "lowMaintenance"
  | "easyMaintenance"
  | "financePrep"
  | "downPayment"
  | "cashVsFinance"
  // v7.5 — Thai used-car market context + safety advice
  | "cityVsUpcountry"
  | "hiddenCosts"
  | "monthlyBudget"
  | "paymentSafety";

const MECHANIC_DISCLAIMER =
  "น้องเอให้แนวทางเบื้องต้นเท่านั้น ไม่แทนช่าง — ควรตรวจรถจริง เอกสาร และให้ช่างช่วยอีกชั้นครับ";

const FINANCE_DISCLAIMER =
  "เป็นข้อมูลทั่วไปเท่านั้น ไม่ใช่ผลอนุมัติหรือใบเสนอราคาจากไฟแนนซ์ — อัตราดอกเบี้ยและดาวน์ขึ้นกับบริษัทที่เลือกครับ";

const SEARCH_FOLLOW_UP =
  "ถ้าคุณพี่บอกงบกับการใช้งาน (เช่น รถเมือง / ครอบครัว / ทำงาน) น้องเอช่วยแนะนำแนวรถที่เหมาะหรือค้นจากรถในระบบให้ได้ครับ";

export const BUYER_ADVISOR_PATTERNS: { topic: BuyerAdvisorTopic; re: RegExp }[] = [
  {
    topic: "prePurchase",
    re: /ซื้อรถมือสอง(?:ต้อง|ควร)ดูอะไร|ซื้อมือสอง(?:ต้อง|ควร)(?:ดู|เช็ค)อะไร/i,
  },
  {
    topic: "firstCar",
    re: /รถมือสองคันแรก|คันแรก(?:ซื้อ|เลือก)รถ|ซื้อรถคันแรก|เลือกรถคันแรก/i,
  },
  {
    topic: "mileageGeneral",
    re: /เลขไมล์(?:เยอะ|สูง|เยอะไหม|เยอะมั้ย|เยอะหรือเปล่า|มากไหม)|ไมล์(?:เยอะ|สูง|มาก)(?:ไหม|มั้ย)?/i,
  },
  {
    topic: "dealerVsPrivate",
    re: /รถบ้าน(?:ดี|ดีกว่า)กว่า(?:รถ)?เต็นท์|เต็นท์(?:ดี|ดีกว่า)กว่ารถบ้าน/i,
  },
  { topic: "floodCheck", re: /รถน้ำท่วม(?:ดู|เช็ค|ตรวจ)ยังไง|น้ำท่วมดูยังไง/i },
  {
    topic: "crashCheck",
    re: /รถชน(?:ดู|เช็ค|ตรวจ)ยังไง|เคยชน(?:ดู|เช็ค|ตรวจ)ยังไง|รถเคยชน/i,
  },
  {
    topic: "lowMaintenance",
    re: /รถไม่จุกจิก|ไม่จุกจิก(?:ดู|เช็ค|เลือก)ยังไง|รถ(?:ที่)?ไม่จุกจิก/i,
  },
  {
    topic: "easyMaintenance",
    re: /รถดูแลง่าย|ดูแลง่าย(?:ควร|ต้อง)ดูอะไร|รถ(?:ที่)?ดูแลง่าย/i,
  },
  {
    topic: "financePrep",
    re: /ไฟแนนซ์(?:ต้อง|ควร)เตรียมอะไร|จัดไฟแนนซ์(?:ต้อง|ควร)เตรียม|ผ่อน(?:ต้อง|ควร)เตรียมอะไร|เตรียม(?:เอกสาร|อะไร).*ไฟแนนซ์/i,
  },
  {
    topic: "downPayment",
    re: /ดาวน์(?:เท่าไหร่|กี่เปอร์|กี่%|เท่าไร)(?:ดี|เหมาะ|ควร)|เงินดาวน์(?:เท่าไหร่|กี่เปอร์)/i,
  },
  {
    topic: "cashVsFinance",
    re: /ซื้อสด(?:กับ|หรือ)\s*ผ่อน|ผ่อน(?:กับ|หรือ)\s*ซื้อสด|ซื้อเงินสด(?:กับ|หรือ)|จ่ายสด(?:กับ|หรือ)\s*ผ่อน/i,
  },
  // v7.5 — market context + safety advice (specific phrasing so search isn't hijacked)
  {
    topic: "paymentSafety",
    re: /โอน(?:เงิน)?ก่อน(?:ดู|เห็น|เจอ)รถ|(?:วาง)?มัดจำ(?:ก่อน)?(?:ดี|ปลอดภัย|ได้)?(?:ไหม|มั้ย)|จองรถ(?:ก่อน)?(?:ดี|ปลอดภัย)?(?:ไหม|มั้ย)|(?:กลัว|ระวัง)(?:จะ)?(?:โดน|ถูก)?(?:โกง|หลอก)|(?:โดน|ถูก)(?:โกง|หลอก)(?:รถ)?(?:ทำไง|ยังไง)?|มิจฉาชีพ(?:ขายรถ)?|(?:โอน|มัดจำ|จอง).{0,12}ปลอดภัย(?:ไหม|มั้ย)|ปลอดภัย(?:ไหม|มั้ย).{0,12}(?:โอน|มัดจำ|จอง)/i,
  },
  {
    topic: "hiddenCosts",
    re: /ค่าใช้จ่ายแฝง|ค่าใช้จ่าย(?:อื่น|เพิ่ม|จุกจิก|ตอนออกรถ|ในการออกรถ)|นอกจาก(?:ค่า|ราคา)รถ.{0,20}(?:ค่า|จ่าย|เสีย)|ออกรถ(?:มี)?(?:ค่าใช้จ่าย|ต้องจ่าย)อะไร|มีค่าใช้จ่ายอะไร(?:บ้าง|อีก)/i,
  },
  {
    topic: "monthlyBudget",
    re: /ผ่อน(?:รถ)?(?:เดือนละ)?เท่าไหร่.{0,16}(?:ไม่(?:ให้)?(?:เกิน|หนัก)|เหมาะ|พอดี|ไหว)|ผ่อน(?:รถ)?(?:ไม่ให้)?เกินตัว|งบผ่อน(?:ต่อเดือน|เดือนละ)?|ควรผ่อน(?:เดือนละ)?เท่าไหร่|ผ่อนเท่าไหร่(?:ถึง)?(?:ไหว|เหมาะ|ไม่หนัก)|ผ่อน.{0,10}(?:เงินเดือน|รายได้).{0,10}(?:เท่าไหร่|เหมาะ|พอดี)/i,
  },
  {
    topic: "cityVsUpcountry",
    re: /(?:ในเมือง|ต่างจังหวัด)\s*(?:กับ|หรือ)\s*(?:ต่างจังหวัด|ในเมือง)|(?:ขับ|ใช้|วิ่ง)(?:รถ)?(?:ใน)?(?:เมือง|ต่างจังหวัด).{0,24}(?:ต่างกัน|เลือก(?:รถ)?ยังไง|แบบไหนดี|ควรเลือก|รถแบบไหน)|รถ(?:สำหรับ)?(?:ใช้)?(?:ในเมือง|ต่างจังหวัด).{0,16}(?:ต่างจังหวัด|ในเมือง)/i,
  },
];

export function normalizeBuyerAdvisorMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

const SELECTED_CAR_PRE_PURCHASE =
  /(?:คันนี้|รถคันนี้|คันนั้น).*(?:ต้อง|ควร)(?:ดู|เช็ค)|(?:ต้อง|ควร)(?:ดู|เช็ค).*(?:คันนี้|รถคันนี้|คันนั้น)|(?:ก่อน)?ซื้อ(?:รถ)?มือสอง.*(?:คันนี้|รถคันนี้)/i;

export function detectBuyerAdvisorTopic(message: string): BuyerAdvisorTopic | null {
  const t = normalizeBuyerAdvisorMessage(message);
  if (/คันนี้|รถคันนี้|คันนั้น/i.test(t)) {
    if (SELECTED_CAR_PRE_PURCHASE.test(t)) return "prePurchase";
    return null;
  }
  for (const { topic, re } of BUYER_ADVISOR_PATTERNS) {
    if (re.test(t)) return topic;
  }
  return null;
}

/** Mileage on a car in context → defer to facts Q&A (spec field). */
export function shouldDeferAdvisorToCarFacts(
  topic: BuyerAdvisorTopic,
  message: string,
  hasTargetCar: boolean
): boolean {
  if (!hasTargetCar || topic !== "mileageGeneral") return false;
  return /ไมล์|เลขไมล์/.test(normalizeBuyerAdvisorMessage(message));
}

function joinParagraphs(parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p && p.trim()).join("\n");
}

function buildPrePurchaseBullets(): string[] {
  return [
    "• เล่มทะเบียน สำเนาบัตรผู้ขาย และเอกสารโอน",
    "• เลขไมล์เทียบกับปีรถและสภาพที่เห็น",
    "• สภาพเครื่อง ช่วงล่าง สนิม และของเหลว",
    "• ประวัติซ่อม/เข้าศูนย์ (ถ้ามีเอกสาร)",
    "• ทดลองขับและให้ช่างช่วยตรวจอีกชั้น",
  ];
}

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

export function buildBuyerAdvisorReply(
  topic: BuyerAdvisorTopic,
  selectedCar?: ChatCarCardData
): string {
  switch (topic) {
    case "prePurchase":
      if (selectedCar) {
        const label = `${selectedCar.brand} ${selectedCar.model} ปี ${selectedCar.year}`.trim();
        const listingFacts = [
          selectedCar.price > 0
            ? `ราคาในระบบ ${formatPrice(selectedCar.price)} บาท`
            : null,
          selectedCar.mileage > 0
            ? `เลขไมล์ ${formatPrice(selectedCar.mileage)} กม. (ตามประกาศ)`
            : null,
        ].filter(Boolean);
        return joinParagraphs([
          `ถ้าสนใจ ${label} จริง ๆ น้องเอแนะนำเช็กเพิ่มแบบนี้ครับ:`,
          ...buildPrePurchaseBullets(),
          listingFacts.length > 0
            ? `จากข้อมูลประกาศตอนนี้: ${listingFacts.join(" · ")}`
            : null,
          "ข้อมูลสภาพและประวัติชน/น้ำท่วมยังต้องตรวจจริงเพิ่ม — น้องเอไม่มีในระบบครับ",
          MECHANIC_DISCLAIMER,
        ]);
      }
      return joinParagraphs([
        "ก่อนซื้อรถมือสอง น้องเอแนะนำเช็กเบื้องต้นแบบนี้ครับ:",
        ...buildPrePurchaseBullets(),
        MECHANIC_DISCLAIMER,
        "ถ้ามีรถคันที่สนใจในแชทแล้ว กดดูรายละเอียดแล้วถามน้องเอเรื่องคันนั้นได้ครับ",
        SEARCH_FOLLOW_UP,
      ]);
    case "firstCar":
      return joinParagraphs([
        "รถมือสองคันแรก แนะนำเริ่มจากงบที่สบายจริง ๆ รวมค่าซ่อมและประกันครับ",
        "• มองรถที่ดูแลง่าย อะไหล่หาง่าย มีประวัติชัด",
        "• อย่ารีบตัดสินใจจากรูปอย่างเดียว — ต้องดูรถจริง",
        "• ถ้าไม่มั่นใจ ให้ช่างหรือคนรู้จักช่วยดูด้วย",
        MECHANIC_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "mileageGeneral":
      return joinParagraphs([
        "เลขไมล์ต้องดูคู่กับปีรถและสภาพจริงครับ — ไมล์สูงไม่ได้แปลว่าแย่เสมอไป",
        "• รถใช้งานหนักทุกวัน ไมล์สูงอาจเป็นเรื่องปกติ",
        "• รถวิ่งน้อยแต่ปีเก่า ก็ต้องดูสภาพเก็บรักษา",
        "ถ้ามีรถคันที่สนใจ กดดูรายละเอียดในแชทแล้วถามเลขไมล์ของคันนั้นได้เลยครับ",
        SEARCH_FOLLOW_UP,
      ]);
    case "dealerVsPrivate":
      return joinParagraphs([
        "รถบ้านกับรถเต็นท์ต่างกันที่ความสะดวก เอกสาร และความมั่นใจครับ",
        "• รถบ้านอาจคุ้มกว่า แต่ต้องตรวจสภาพและเอกสารเองให้ละเอียด",
        "• รถเต็นท์มักมีบริการหลังการขายและเอกสารชัดกว่า",
        "ไม่ว่าแบบไหน แนะนำตรวจรถจริงก่อนตัดสินใจครับ",
        SEARCH_FOLLOW_UP,
      ]);
    case "floodCheck":
      return joinParagraphs([
        "รถน้ำท่วม — แนวทางเช็กเบื้องต้นครับ:",
        "• กลิ่นอับในห้องโดยสาร คราบน้ำใต้พรม/เบาะ",
        "• สนิมใต้เบาะ ช่องว่างแผง หรือจุดเชื่อมตัวถัง",
        "• ไฟแดช/อิเล็กทรอนิกส์ทำงานผิดปกติ",
        "• ขอประวัติเคลม/ศูนย์ถ้ามี",
        MECHANIC_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "crashCheck":
      return joinParagraphs([
        "รถเคยชน — แนวทางเช็กเบื้องต้นครับ:",
        "• ช่องว่างแผง สีไม่เท่ากัน ประตู/ฝากระโปรกง",
        "• จุดเชื่อมตัวถังหรือสีทับ",
        "• ขอประวัติเคลม/ศูนย์และเล่มประกัน",
        MECHANIC_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "lowMaintenance":
      return joinParagraphs([
        "รถไม่จุกจิกมักเป็นรุ่นที่ขายดี อะไหล่หาง่าย และดูแลตามระยะครับ",
        "• มองรุ่นที่มีช่างคุ้นเคยในพื้นที่",
        "• เลี่ยงรถที่แปลกหรือมีอาการแปลก ๆ ที่ช่างบอกว่าเสี่ยง",
        "• ดูประวัติซ่อมและทดลองขับให้นิ่ง ๆ",
        MECHANIC_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "easyMaintenance":
      return joinParagraphs([
        "รถดูแลง่ายควรดูครับ:",
        "• รุ่นที่อะไหล่หาง่าย คู่มือชัด",
        "• เลขไมล์และประวัติเข้าศูนย์สม่ำเสมอ",
        "• สภาพเครื่องและของเหลวไม่รั่ว",
        "• ยาง/แบต/ผ้าเบรกยังอยู่ในเกณฑ์ใช้งาน",
        MECHANIC_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "financePrep":
      return joinParagraphs([
        "ไฟแนนซ์เบื้องต้นมักเตรียมครับ:",
        "• บัตรประชาชน",
        "• สลิปเงินเดือนหรือหลักฐานรายได้",
        "• ข้อมูลรถที่จะซื้อ (ราคา รุ่น ปี)",
        "• บางที่ขอสเตทเมนต์บัญชีหรือที่อยู่",
        FINANCE_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "downPayment":
      return joinParagraphs([
        "ดาวน์ที่เหมาะขึ้นกับงบและไฟแนนซ์ครับ — แนวทางทั่วไป:",
        "• ยอดนิยมประมาณ 20–30% ของราคารถ",
        "• ดาวน์มาก = ค่างวดน้อยลง แต่ต้องมีเงินสดพร้อม",
        "• ดาวน์น้อย = ค่างวดสูงขึ้น ต้องเช็กว่ารับไหว",
        FINANCE_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "cashVsFinance":
      return joinParagraphs([
        "ซื้อสดกับผ่อนต่างกันที่สภาพคล่องและดอกเบี้ยครับ:",
        "• ซื้อสด: ไม่มีดอก จบเร็ว แต่ใช้เงินก้อนใหญ่",
        "• ผ่อน: แบ่งจ่ายได้ แต่มีดอกและต้องผ่านการอนุมัติ",
        "• เลือกตามงบสดจริงและความสบายใจเรื่องค่างวรรายเดือน",
        FINANCE_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "cityVsUpcountry":
      return joinParagraphs([
        "การใช้งานในเมืองกับต่างจังหวัดมีจุดเน้นต่างกันครับ:",
        "• ในเมือง/รถติด: รถเล็กหรือเก๋งคล่องตัว จอดง่าย ประหยัดช่วงคลาน",
        "• ทางไกล/ต่างจังหวัด: เน้นความนิ่ง ช่วงล่างดี พื้นที่ใช้สอย และอะไหล่หาง่ายในพื้นที่",
        "• ถ้าวิ่งหลายแบบ ลองดูรถอเนกประสงค์ที่สมดุลทั้งสองทาง",
        "แนะนำเลือกตามเส้นทางที่ใช้จริงเป็นหลักครับ",
        SEARCH_FOLLOW_UP,
      ]);
    case "hiddenCosts":
      return joinParagraphs([
        "นอกจากราคารถ มักมีค่าใช้จ่ายแฝงที่ควรเผื่องบไว้ครับ:",
        "• พรบ. และประกันภัย (ชั้น 1/2/3 ตามที่เลือก)",
        "• ต่อภาษี/ต่อทะเบียนประจำปี",
        "• ค่าโอนกรรมสิทธิ์และค่าดำเนินการ",
        "• ตรวจเช็ก/บำรุงตามระยะ เช่น ยาง แบต ผ้าเบรก",
        "ตัวเลขจริงขึ้นกับรุ่น ปี และที่ที่เลือกใช้บริการครับ",
        SEARCH_FOLLOW_UP,
      ]);
    case "monthlyBudget":
      return joinParagraphs([
        "งบผ่อนต่อเดือน แนะนำดูจากรายได้และภาระจริงครับ:",
        "• ค่างวดรวมไม่ควรหนักจนกระทบค่าใช้จ่ายประจำเดือน",
        "• เผื่อค่าน้ำมัน ประกัน และค่าบำรุงในแต่ละเดือนด้วย",
        "• ดาวน์มากขึ้นช่วยให้ค่างวดเบาลง",
        FINANCE_DISCLAIMER,
        SEARCH_FOLLOW_UP,
      ]);
    case "paymentSafety":
      return joinParagraphs([
        "เรื่องโอนเงิน/วางมัดจำ น้องเอแนะนำระวังแบบนี้ครับ:",
        "• เห็นรถจริงและตรวจเล่มทะเบียน/เอกสารให้ตรงกับผู้ขายก่อน",
        "• เลี่ยงการโอนเงินหรือวางมัดจำก่อนเห็นรถจริง",
        "• ระวังรถที่ราคาถูกผิดปกติหรือถูกเร่งให้รีบโอน",
        "• ถ้าทำได้ นัดดูในสถานที่ที่ตรวจสอบได้",
        "เป็นคำแนะนำทั่วไปเพื่อความปลอดภัยครับ",
      ]);
    default:
      return SEARCH_FOLLOW_UP;
  }
}
