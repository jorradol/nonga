/** v5.4.6.4 — deterministic troubleshooting advisor (no Gemini, no car cards) */

import { isMarketplaceSearchIntent } from "./marketplaceChatSearch";

export type TroubleshootingSafetyTier = "low" | "medium" | "high";

export type TroubleshootingTopic =
  | "wontStart"
  | "engineVibration"
  | "brakeNoise"
  | "acNotCold"
  | "checkEngine"
  | "steeringShake"
  | "whiteSmoke"
  | "blackSmoke"
  | "fuelConsumption"
  | "suspensionNoise"
  | "turnNoise"
  | "gearJerk"
  | "overheating"
  | "fluidLeak";

export const TROUBLESHOOTING_DISCLAIMER =
  "คำแนะนำนี้เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยจากช่าง — อย่าซ่อมจุดอันตราย (เบรก/ไฟฟ้า/เครื่องยนต์) เองครับ";

const GLOBAL_HIGH_BOOSTERS =
  /อันตราย|รุนแรง|หยุดไม่(?:ค่อย|)?(?:จับ|ได้)|เบรก(?:แทบ)?ไม่(?:ค่อย|)?(?:จับ|หย|หยุด)|ควบคุม(?:รถ)?(?:ยาก|ไม่(?:ได้|ดี|ขึ้น))|เลี้ยว(?:ยาก|ไม่(?:ขึ้น|ดี))|กลิ่นไหม้|ควันหนา|ควันผิดปกติ|ไม่ควรขับต่อ|ขับต่อไม่(?:ได้|ไหว)/i;

interface TroubleshootingGuide {
  topic: TroubleshootingTopic;
  re: RegExp;
  baseTier: TroubleshootingSafetyTier;
  highBoosters?: RegExp;
  symptomLabel: string;
  possibleCauses: string[];
  safeObserve: string[];
  dontDo: string[];
  followUp: string;
}

export const TROUBLESHOOTING_GUIDES: TroubleshootingGuide[] = [
  {
    topic: "overheating",
    re: /(?:เครื่อง|ความ)ร้อน(?:ขึ้น|เกิน|สูง)|(?:อุณหภูมิ|ความร้อน).*ขึ้น|น้ำ(?:ต้ม|ร้อน)|เข็ม(?:ความร้อน|อุณหภูมิ).*ขึ้น/i,
    baseTier: "high",
    symptomLabel: "เครื่องร้อน / ความร้อนขึ้น",
    possibleCauses: [
      "น้ำหล่อเย็นลดหรือรั่ว",
      "พัดลมหล่อเย็น/เทอร์โมสtat ทำงานผิดปกติ",
      "หม้อน้ำอุดตัน",
      "สายพานหรือระบบหล่อลื่นมีปัญหา",
    ],
    safeObserve: [
      "ดูว่ามีไอน้ำ/ของเหลวรั่วใต้ฝากระโปรงหรือไม่",
      "สังเกตว่าเข็มความร้อนขึ้นตอนจอดหรือวิ่ง",
      "จอดที่ปลอดภัยแล้วดับเครื่อง อย่าเปิดฝากระโปรงทันทีถ้าร้อนจัด",
    ],
    dontDo: [
      "อย่าขับต่อถ้าเข็มขึ้นแดงหรือมีไอน้ำ",
      "อย่าเปิดฝาหม้อน้ำขณะร้อนจัด",
      "อย่าพยายามซ่อมระบบหล่อเย็นเอง",
    ],
    followUp:
      "อาการเกิดตอนจอดไฟแดง ตอนวิ่งเร็ว หรือติดไฟแดงบ่อยครับ?",
  },
  {
    topic: "fluidLeak",
    re: /(?:น้ำมัน|น้ำ|ของเหลว)(?:หยด|รั่ว|ซึม).*(?:ใต้ท้อง|ท้องรถ)|(?:ใต้ท้อง|ท้องรถ).*(?:หยด|รั่ว|ซึม)|(?:น้ำมัน|น้ำ)หยด(?:ใต้)?(?:ท้อง)?รถ/i,
    baseTier: "high",
    symptomLabel: "น้ำมันหยด / น้ำรั่วใต้ท้องรถ",
    possibleCauses: [
      "น้ำมันเครื่องรั่วจากซีลหรือถาด",
      "น้ำหล่อเย็นรั่ว",
      "น้ำมันเบรกรั่ว (อันตราย)",
      "น้ำมันเกียร์รั่ว",
    ],
    safeObserve: [
      "ดูสีและกลิ่นของคราบใต้ท้อง (น้ำมันเครื่องมักดำ/น้ำตาล น้ำหล่อเย็นมักสีส้ม-เขียว)",
      "เช็กระดับน้ำมันเครื่องและน้ำหล่อเย็นเมื่อเครื่องเย็น",
      "สังเกตว่ารั่วตอนจอดหรือหลังขับ",
    ],
    dontDo: [
      "อย่าขับต่อถ้าน้ำมันเบรกรั่วหรือเบรกนุ่ม",
      "อย่าละเลยถ้ารั่วมาก",
      "อย่าซ่อมระบบเบรก/เครื่องเอง",
    ],
    followUp:
      "คราบใต้ท้องเป็นสีอะไรครับ และเบรกยังทำงานปกติไหม?",
  },
  {
    topic: "checkEngine",
    re: /(?:ไฟ|โชว์|ขึ้น|ติด).*(?:check\s*engine|engine|เครื่องยนต์|check\s*engine)|check\s*engine|ไฟ\s*engine|ไฟเครื่อง(?:โชว์|ขึ้น|ติด)/i,
    baseTier: "high",
    highBoosters: /สั่น|เร่งไม่(?:ขึ้น|ดี|ไป)|ดับ|ควัน/i,
    symptomLabel: "ไฟเครื่อง / Check Engine โชว์",
    possibleCauses: [
      "เซ็นเซอร์หรือระบบไอเสีย",
      "หัวเทียน/คอยล์จุดระเบิด",
      "ระบบเชื้อเพลิงหรืออากาศ",
      "อาจมีปัญหาร้ายแรงถ้าพร้อมเครื่องสั่นหรือเร่งไม่ขึ้น",
    ],
    safeObserve: [
      "สังเกตว่าไฟโชว์ตลอดหรือกระพริบ",
      "มีเครื่องสั่น เร่งไม่ขึ้น หรือควันหรือไม่",
      "จดว่าเกิดหลังเติมน้ำมันหรือขับทางไกลหรือไม่",
    ],
    dontDo: [
      "อย่าปิดสายเซ็นเซอร์เองเพื่อให้ไฟดับ",
      "อย่าขับทางไกลถ้าเร่งไม่ขึ้นหรือเครื่องสั่น",
      "อย่าซ่อมระบบไฟฟ้า/เครื่องเอง",
    ],
    followUp:
      "ไฟโชว์ตลอดหรือกระพริบครับ และมีเครื่องสั่นหรือเร่งไม่ขึ้นด้วยไหม?",
  },
  {
    topic: "whiteSmoke",
    re: /(?:ควัน(?:ขาว|ใส)|ขาว(?:จาก|ที่)?(?:ท่อ|ท้าย)|มีควันขาว|ควันขาว(?:หนา|เยอะ)?)/i,
    baseTier: "high",
    symptomLabel: "ควันขาวจากท่อไอเสีย",
    possibleCauses: [
      "น้ำหล่อเย็นเข้าห้องเผาไหม้ (ร้ายแรง)",
      "ไอน้ำตอนเช้า (อาจปกติชั่วคราว)",
      "น้ำมันเครื่องเข้าห้องเผาไหม้",
    ],
    safeObserve: [
      "ดูว่าควันขาวหนาและมีกลิ่นหวาน/น้ำหล่อเย็นหรือไม่",
      "สังเกตว่าเกิดตอนสตาร์ทหรือวิ่ง",
      "ดูระดับน้ำหล่อเย็นและน้ำมันเครื่อง",
    ],
    dontDo: [
      "อย่าขับต่อถ้าควันขาวหนาต่อเนื่อง",
      "อย่าพยายามซ่อมเครื่องเอง",
    ],
    followUp:
      "ควันขาวเกิดตอนสตาร์ทเช้า ๆ หรือตลอดเวลาที่วิ่งครับ?",
  },
  {
    topic: "blackSmoke",
    re: /(?:ควัน(?:ดำ|เข้ม)|(?:ท่อ|ท้าย).*ควันดำ|มีควันดำ)/i,
    baseTier: "medium",
    highBoosters: /หนา|เยอะ|ต่อเนื่อง|เร่งไม่/i,
    symptomLabel: "ควันดำจากท่อไอเสีย",
    possibleCauses: [
      "เชื้อเพลิงไหม้ไม่สมบูรณ์",
      "ไส้กรองอากาศ/เชื้อเพลิง",
      "เทurbo หรือระบบไอเสีย (บางรุ่น)",
      "น้ำมันเครื่องเข้าไหล่ (ถ้าควันดำหนา)",
    ],
    safeObserve: [
      "ดูว่าเกิดตอนเร่งหรือตลอดเวลา",
      "สังเกตกินน้ำมันผิดปกติหรือไม่",
      "มีกลิ่นไหม้หรือเสียงผิดปกติหรือไม่",
    ],
    dontDo: [
      "อย่าขับทางไกลถ้าควันดำหนาต่อเนื่อง",
      "อย่าซ่อมระบบเชื้อเพลิงเอง",
    ],
    followUp:
      "ควันดำเกิดตอนเร่งหรือตลอดเวลาครับ และมีกลิ่นไหม้ด้วยไหม?",
  },
  {
    topic: "wontStart",
    re: /รถสตาร์ทไม่ติด|สตาร์ทไม่ติด|(?:บิด|หมุน).*กุญแจ.*(?:เงียบ|ไม่(?:ติด|ขึ้น))|(?:ไม่|เงียบ).*สตาร์ท/i,
    baseTier: "medium",
    highBoosters: /กลิ่นไหม้|ควัน|เสียง(?:ดัง|ผิด)/i,
    symptomLabel: "รถสตาร์ทไม่ติด",
    possibleCauses: [
      "แบตเตอรี่อ่อนหรือขั้วแบตหลวม",
      "ไดสตาร์ทหรือระบบสตาร์ท",
      "น้ำมันเชื้อเพลิงหมดหรือปั๊ม",
      "ระบบกุญแจ/รีโมต/Immo",
    ],
    safeObserve: [
      "ดูว่าไฟหน้าปัดหรี่หรือดับเมื่อบิดกุญแจ",
      "ฟังเสียงคลิกหรือเงียบสนิท",
      "เช็กว่าไฟในรถยังติดหรือไม่ (แบต)",
    ],
    dontDo: [
      "อย่าสตาร์ทซ้ำ ๆ ถ้ามีกลิ่นไหม้หรือควัน",
      "อย่าจัมพ์สายแบตเองถ้าไม่มั่นใจ",
      "อย่าซ่อมระบบไฟฟ้า/เชื้อเพลิงเอง",
    ],
    followUp:
      "ตอนบิดกุญแจมีเสียงคลิก เงียบสนิท หรือหมุนแต่ไม่ติดครับ?",
  },
  {
    topic: "brakeNoise",
    re: /(?:เบรก|ผ้าเบรก).*(?:ดัง|เสียง|ครก|อันตราย|หยุด)|เสียง.*(?:เบรก|เบร(?:ก)?)|(?:เบรก|ผ้าเบรก).*(?:อันตราย|ปลอดภัย)/i,
    baseTier: "medium",
    highBoosters: /(?:เบรก|ผ้า).*(?:อ่อน|นุ่ม|หย|ไม่(?:จับ|ค่อยจับ))|อันตราย|รุนแรง/i,
    symptomLabel: "เบรกมีเสียง / เบรกผิดปกติ",
    possibleCauses: [
      "ผ้าเบรกบางหรือมีคราบ",
      "จานเบรกมีรอย",
      "มีสิ่งแปลกปลอมติด",
      "น้ำมันเบรกลด (อันตรายถ้าเบรกนุ่ม)",
    ],
    safeObserve: [
      "ดูว่าเสียงเกิดตอนเบรกเบา แรง หรือตลอดเวลา",
      "สังเกตว่าเบรกยังจับดีหรือนุ่ม/ยาว",
      "มีกลิ่นไหม้หลังเบรกหนักหรือไม่",
    ],
    dontDo: [
      "อย่าขับต่อถ้าเบรกนุ่ม หย หรือต้องเหยียบลึก",
      "อย่าถอด/เปลี่ยนผ้าเบรกเอง",
    ],
    followUp:
      "เสียงเกิดตอนเบรกเบา แรง หรือตลอดเวลาครับ และเบรกยังจับดีไหม?",
  },
  {
    topic: "steeringShake",
    re: /(?:พวงมาลัย|พวง).*(?:สั่น|สะเทือน)|(?:สั่น|สะเทือน).*(?:พวงมาลัย|พวง)|เลี้ยว.*(?:สั่น|ยาก)/i,
    baseTier: "medium",
    highBoosters: /รุนแรง|ควบคุม(?:ยาก|ไม่(?:ได้|ดี))|อันตราย/i,
    symptomLabel: "พวงมาลัยสั่น / ควบคุมรถยาก",
    possibleCauses: [
      "ล้อ/ยางไม่สมดุลหรือยางเสื่อม",
      "ช่วงล่าง/ลูกหมาก",
      "เบรกจานบิด (บางกรณี)",
      "ศูนย์ล้อไม่ตรง",
    ],
    safeObserve: [
      "ดูว่าสั่นที่ความเร็วใด (ต่ำ/สูง)",
      "สั่นตอนเบรกหรือเลี้ยวหรือไม่",
      "ยางมีบวมหรือสึกไม่เท่ากันหรือไม่",
    ],
    dontDo: [
      "อย่าขับเร็วถ้าควบคุมรถยาก",
      "อย่าซ่อมช่วงล่าง/เบรกเอง",
    ],
    followUp:
      "สั่นตอนวิ่งเร็ว ตอนเบรก หรือตอนเลี้ยวครับ?",
  },
  {
    topic: "engineVibration",
    re: /(?:เครื่อง|รถ).*(?:สั่น|สะเทือน)|(?:สั่น|สะเทือน).*(?:เครื่อง|ตอนจอด|ตอนวิ่ง)|เครื่องสั่น/i,
    baseTier: "medium",
    highBoosters: /เร่งไม่|ดับ|ควัน|ไฟ.*(?:โชว์|ขึ้น)/i,
    symptomLabel: "เครื่องสั่น / รถสั่น",
    possibleCauses: [
      "หัวเทียน/คอยล์จุดระเบิด",
      "เครื่องไม่เท่ากันตอนจอด",
      "ยาง/ล้อไม่สมดุล",
      "เครื่องยนต์หรือเกียร์มีปัญหา (ถ้าสั่นรุนแรง)",
    ],
    safeObserve: [
      "สั่นตอนจอดไฟแดง ตอนวิ่ง หรือตอนเปิดแอร์",
      "มีไฟเครื่องโชว์หรือเร่งไม่ขึ้นหรือไม่",
      "สังเกตว่าเกิดหลังเปลี่ยนน้ำมันเชื้อเพลิงหรือไม่",
    ],
    dontDo: [
      "อย่าขับต่อถ้าสั่นรุนแรงพร้อมเร่งไม่ขึ้น",
      "อย่าถอด/ซ่อมเครื่องเอง",
    ],
    followUp:
      "อาการเกิดตอนจอดไฟแดง ตอนวิ่ง หรือเฉพาะตอนเปิดแอร์ครับ?",
  },
  {
    topic: "gearJerk",
    re: /(?:เกียร์|AT|ออโต้).*(?:กระตุก|ดึง|สะดุด|ช้า)|(?:กระตุก|สะดุด).*(?:เกียร์|เปลี่ยนเกียร์)|เกียร์กระตุก/i,
    baseTier: "medium",
    symptomLabel: "เกียร์กระตุก / เปลี่ยนเกียร์ไม่ลื่น",
    possibleCauses: [
      "น้ำมันเกียร์ลดหรือเก่า",
      "ระบบเกียร์อัตโนมัติมีปัญหา",
      "เซ็นเซอร์หรือคอมพิวเตอร์เกียร์",
      "เครื่องยนต์ไม่เท่ากัน (บางกรณี)",
    ],
    safeObserve: [
      "กระตุกตอนออกตัว เปลี่ยนเกียร์ หรือทั้งสอง",
      "มีไฟเครื่องโชว์หรือไม่",
      "เกิดหลังขับทางหนักหรือไม่",
    ],
    dontDo: [
      "อย่าขับแบบเร่งแรงถ้ากระตุกบ่อย",
      "อย่าเปลี่ยน/เติมน้ำมันเกียร์เองโดยไม่รู้สเปก",
    ],
    followUp:
      "กระตุกตอนออกตัว เปลี่ยนเกียร์ หรือทั้งสองครับ?",
  },
  {
    topic: "acNotCold",
    re: /(?:แอร์|A\/C|AC).*(?:ไม่(?:เย็น|หนาว)|อ่อน|ร้อน)|(?:ไม่(?:เย็น|หนาว)|อ่อน).*(?:แอร์|A\/C|AC)/i,
    baseTier: "low",
    symptomLabel: "แอร์ไม่เย็น / แอร์อ่อน",
    possibleCauses: [
      "น้ำยาแอร์ลด",
      "คอมเพรสเซอร์แอร์",
      "พัดลมหรือระบบควบคุมอุณหภูมิ",
      "สิ่งอุดตันหรือกรองแอร์",
    ],
    safeObserve: [
      "ลมออกแต่ไม่เย็น หรือไม่มีลมเลย",
      "มีเสียงผิดปกติตอนเปิดแอร์หรือไม่",
      "เกิดเฉพาะตอนจอดหรือวิ่งเร็ว",
    ],
    dontDo: [
      "อย่าเติมน้ำยาแอร์เองถ้าไม่มีอุปกรณ์และความรู้",
      "อย่าซ่อมระบบแอร์/ไฟฟ้าเอง",
    ],
    followUp:
      "แอร์ไม่เย็นตลอด หรือเฉพาะตอนจอด/วิ่งช้าครับ?",
  },
  {
    topic: "fuelConsumption",
    re: /(?:กิน|ใช้)น้ำมัน(?:ผิดปกติ|มาก|เยอะ|สูง)|น้ำมัน(?:หมด|ลด)(?:เร็ว|ไว)|สิ้นเปลือง/i,
    baseTier: "low",
    symptomLabel: "รถกินน้ำมันผิดปกติ",
    possibleCauses: [
      "ยางลมต่ำหรือขับทางติดขัด",
      "หัวเทียน/ไส้กรอง/เซ็นเซอร์",
      "สไตล์การขับ (เร่งแรง แอร์เต็ม)",
      "เครื่องยนต์หรือระบบเชื้อเพลิงมีปัญหา",
    ],
    safeObserve: [
      "เปรียบเทียบกับพฤติกรรมเดิม (ทางเดิมเดิม)",
      "เช็กยางลมและน้ำหนักบรรทุก",
      "มีไฟเครื่องโชว์หรือเครื่องสั่นด้วยหรือไม่",
    ],
    dontDo: [
      "อย่าฟันธงว่าเครื่องเสียโดยไม่ให้ช่างตรวจ",
      "อย่าซ่อมระบบเชื้อเพลิงเอง",
    ],
    followUp:
      "กินน้ำมันเพิ่มขึ้นเร็วแค่ไหนครับ และมีไฟเครื่องโชว์ด้วยไหม?",
  },
  {
    topic: "suspensionNoise",
    re: /(?:เสียง|ดัง).*(?:ช่วงล่าง|ล่าง|แกน|โช้ค)|(?:ช่วงล่าง|ล่าง|แกน|โช้ค).*(?:เสียง|ดัง|เอ๊ะ|ก๊อก)/i,
    baseTier: "low",
    symptomLabel: "มีเสียงช่วงล่าง",
    possibleCauses: [
      "โช้คอัพ/ลูกหมากชำรุด",
      "ยางโช้คหรือบushing",
      "ของติดรถหลวม",
      "จานเบรกหรือแผ่นกันโคลง (บางกรณี)",
    ],
    safeObserve: [
      "เสียงเกิดตอนขับช้า ข้ามลูกระนาด หรือเลี้ยว",
      "มีการสั่นหรือดึงพวงมาลัยด้วยหรือไม่",
      "เกิดหลังชนขอบทางหรือไม่",
    ],
    dontDo: [
      "อย่าซ่อมช่วงล่างเอง",
      "อย่าขับเร็วถ้าควบคุมรถแปลก",
    ],
    followUp:
      "เสียงเกิดตอนข้ามลูกระนาด เลี้ยว หรือตลอดเวลาครับ?",
  },
  {
    topic: "turnNoise",
    re: /(?:เสียง|ดัง).*(?:เลี้ยว|หัก|หมุน)|(?:เลี้ยว|หัก|หมุน).*(?:เสียง|ดัง|เอ๊ะ)|เสียงดัง.*(?:เลี้ยว|หัก)/i,
    baseTier: "low",
    symptomLabel: "มีเสียงดังตอนเลี้ยว",
    possibleCauses: [
      "ลูกหมากพวงมาลัย",
      "ซีวี/เพลา (บางรุ่น FWD)",
      "ผ้าเบรกหรือจาน (บางกรณี)",
      "ยางหรือของติดรถ",
    ],
    safeObserve: [
      "เสียงเกิดเฉพาะเลี้ยวซ้าย/ขวา หรือทั้งสอง",
      "มีการดึงพวงมาลัยหรือไม่",
      "เกิดตอนความเร็วต่ำหรือสูง",
    ],
    dontDo: [
      "อย่าซ่อมช่วงล่าง/เพลาเอง",
      "อย่าขับเร็วถ้าควบคุมรถแปลก",
    ],
    followUp:
      "เสียงเกิดเฉพาะเลี้ยวซ้าย ขวา หรือทั้งสองครับ?",
  },
];

const TIER_ADVICE: Record<TroubleshootingSafetyTier, string> = {
  high:
    "⚠️ อาการนี้มีความเสี่ยงสูง — แนะนำหยุดใช้รถและให้ช่างตรวจโดยเร็ว ไม่ควรขับต่อครับ",
  medium:
    "แนะนำให้ช่างตรวจเร็ว ๆ ในระยะที่ใกล้ที่สุดนะครับ",
  low: "ถ้ายังมีอาการอยู่ ควรนัดช่างตรวจเพื่อความมั่นใจครับ",
};

function joinLines(parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p && p.trim()).join("\n");
}

function bulletList(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

export function normalizeTroubleshootingMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

export function detectTroubleshootingTopic(
  message: string
): TroubleshootingTopic | null {
  const t = normalizeTroubleshootingMessage(message);
  if (/คันนี้|รถคันนี้/i.test(t)) return null;
  for (const guide of TROUBLESHOOTING_GUIDES) {
    if (guide.re.test(t)) return guide.topic;
  }
  return null;
}

export function resolveTroubleshootingTier(
  guide: TroubleshootingGuide,
  message: string
): TroubleshootingSafetyTier {
  const t = normalizeTroubleshootingMessage(message);
  if (GLOBAL_HIGH_BOOSTERS.test(t)) return "high";
  if (guide.highBoosters?.test(t)) return "high";
  if (guide.baseTier === "high") return "high";
  if (guide.baseTier === "medium") return "medium";
  return "low";
}

export function shouldDeferTroubleshootingForSearch(message: string): boolean {
  return isMarketplaceSearchIntent(message);
}

export function buildTroubleshootingAdvisorReply(
  topic: TroubleshootingTopic,
  message: string
): string {
  const guide = TROUBLESHOOTING_GUIDES.find((g) => g.topic === topic);
  if (!guide) return TROUBLESHOOTING_DISCLAIMER;

  const tier = resolveTroubleshootingTier(guide, message);

  return joinLines([
    `เรื่อง${guide.symptomLabel} น้องเอสรุปเบื้องต้นให้นะครับคุณพี่`,
    `${guide.symptomLabel} อาจเกิดจากหลายสาเหตุครับ — ไม่ฟันธงว่าเป็นจุดใดจนกว่าช่างจะตรวจจริง:`,
    bulletList(guide.possibleCauses),
    "สิ่งที่สังเกตได้อย่างปลอดภัย:",
    bulletList(guide.safeObserve),
    "สิ่งที่ไม่ควรทำเอง:",
    bulletList(guide.dontDo),
    TIER_ADVICE[tier],
    TROUBLESHOOTING_DISCLAIMER,
    guide.followUp,
  ]);
}

export interface TroubleshootingAdvisorReply {
  text: string;
  skipGemini: true;
}

export function tryTroubleshootingAdvisorReply(
  message: string
): TroubleshootingAdvisorReply | null {
  if (shouldDeferTroubleshootingForSearch(message)) return null;
  const topic = detectTroubleshootingTopic(message);
  if (!topic) return null;
  return {
    text: buildTroubleshootingAdvisorReply(topic, message),
    skipGemini: true,
  };
}
