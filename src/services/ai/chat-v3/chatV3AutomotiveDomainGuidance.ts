/**
 * WP-V3-10B — Compact domain guidance packs for Chat V.3 automotive turns.
 * Framework / checklists only — not fixed reply scripts. Not a Safety Layer.
 */

export type ChatV3AutomotiveDomainCategory =
  | "buy_new_or_used"
  | "compare_use_budget"
  | "price_value"
  | "finance_credit"
  | "usage_maintenance"
  | "fault_diagnosis"
  | "insurance_tax_docs"
  | "sell_prepare";

/** Intent keys mirror ChatV3AutomotiveIntent — kept local to avoid import cycles. */
const DOMAIN_BY_INTENT: Record<string, ChatV3AutomotiveDomainCategory[]> = {
  compare_or_choose: ["buy_new_or_used", "compare_use_budget"],
  budget_or_finance: ["finance_credit", "price_value"],
  usage_advice: ["usage_maintenance", "compare_use_budget"],
  maintenance_or_repair: ["fault_diagnosis", "usage_maintenance"],
  insurance_tax_admin: ["insurance_tax_docs"],
  sell_or_trade: ["sell_prepare", "price_value"],
  information: ["buy_new_or_used"],
  follow_up_reference: [],
  other: [],
};

const DOMAIN_GUIDANCE: Record<ChatV3AutomotiveDomainCategory, string[]> = {
  buy_new_or_used: [
    "แยกกรอบรถใหม่กับมือสอง: งบรวมค่าใช้จ่ายแฝง ความต้องการใช้งาน และความเสี่ยงที่ยอมรับได้",
    "มือสอง: แนะนำเช็กเอกสาร เลขไมล์กับปี/สภาพ ประวัติซ่อม ทดลองขับ และให้ช่างช่วยเมื่อเป็นไปได้ — ห้ามรับรองสภาพจากข้อความอย่างเดียว",
    "รถใหม่: พูดกรอบทั่วไปได้ แต่ห้ามแต่งโปรโมชัน สต็อก หรือราคาปัจจุบัน",
    "รถยนต์ มอเตอร์ไซค์ และยานอื่นที่จดทะเบียนอาจมีข้อกำหนดต่างกัน — อย่าอ้างว่าใช้กฎเดียวกันทุกประเภท",
  ],
  compare_use_budget: [
    "เทียบตามงบ การใช้งานหลัก (เมือง/ต่างจังหวัด/ครอบครัว/บรรทุกเบา) และข้อจำกัดของผู้ใช้",
    "ใช้เงื่อนไขที่ผู้ใช้ให้แล้ว — อย่าถามงบหรือประเภทใช้งานซ้ำหากมีหลักฐานชัด",
    "เมื่อเงื่อนไขเปลี่ยน (งบ/ยี่ห้อ/เกียร์/ประเภทรถ) ให้ยึดค่าล่าสุดและปรับคำแนะนำ",
    "ห้ามฟันธง “ดีที่สุด” โดยไม่มีเกณฑ์จากผู้ใช้",
  ],
  price_value: [
    "แยกความรู้ทั่วไปเรื่องความคุ้มค่า ออกจากราคาตลาด/โปรโมชันปัจจุบัน",
    "ยังไม่มี Live price source ในรอบนี้ — ห้ามแต่งราคาตลาด และบอกให้ตรวจแหล่งล่าสุดเมื่อผู้ใช้ต้องการตัวเลขปัจจุบัน",
    "ถ้ามีราคาในบริบทรถ ให้ใช้เฉพาะตัวเลขนั้นและติดป้ายแหล่งที่มา",
  ],
  finance_credit: [
    "สินเชื่อ/ค่างวดต้องแยก: ข้อเท็จจริงจากผู้ใช้ · สมมติฐาน · ผลประมาณการ · เงื่อนไขจริงจากสถาบันการเงินที่ยังไม่ได้ตรวจ",
    "ถ้ามีบล็อกคำนวณ deterministic ให้ใช้ตัวเลขนั้นเท่านั้น ห้ามคำนวณชุดเดียวกันใหม่เอง",
    "ห้ามเดาดอกเบี้ย เงินดาวน์ หรือระยะผ่อน — ถามเฉพาะค่าที่ขาดเมื่อต้องการผลเฉพาะบุคคล",
    "ห้ามรับประกันอนุมัติไฟแนนซ์",
  ],
  usage_maintenance: [
    "แนะนำตามประเภทยาน อายุ/ระยะทาง ลักษณะใช้งาน และข้อมูลคู่มือที่ผู้ใช้มี",
    "ห้ามสร้างตารางบำรุงรักษาเฉพาะรุ่นหากไม่มีรุ่น ปี เครื่องยนต์ หรือคู่มือ — ให้กรอบตรวจทั่วไปและแนะนำดูคู่มือประจำรถ",
    "มอเตอร์ไซค์/รถยนต์อาจมีรอบบริการต่างกัน — อย่าสรุปรวมโดยไม่มีฐาน",
  ],
  fault_diagnosis: [
    "ลำดับ: อาการ → เงื่อนไขที่เกิด → สิ่งตรวจพื้นฐาน → สาเหตุที่เป็นไปได้หลายทาง → ข้อมูลที่ต้องเพิ่ม",
    "ห้ามฟันธงสาเหตุเดียวเมื่อข้อมูลไม่พอ ใช้คำว่า น่าจะ / เป็นไปได้ / ควรตรวจเพิ่ม",
    "คง light safety เดิม: อาการเสี่ยง (เบรก พวงมาลัย เชื้อเพลิง ไฟฟ้าแรงสูง) ให้เตือนสั้นและแนะนำพบผู้เชี่ยวชาญ — ยังไม่ใช่ Safety Layer เต็ม",
  ],
  insurance_tax_docs: [
    "แยก พ.ร.บ. (ภาคบังคับโดยทั่วไปสำหรับรถจดทะเบียนใช้บนถนน) ออกจากประกันภาคสมัครใจชั้นต่าง ๆ",
    "อธิบายกรอบชั้นประกันแบบความรู้ทั่วไปได้ แต่ห้ามแต่งเบี้ย ทุนประกัน เงื่อนไข หรืออัตราปัจจุบัน",
    "ภาษี ทะเบียน โอนเอกสาร: ให้กรอบสิ่งที่ควรตรวจ และแนะนำตรวจหน่วยงาน/เอกสารปัจจุบัน — ห้ามสร้างอัตราค่าธรรมเนียมหรือข้อกฎหมายขึ้นเอง",
  ],
  sell_prepare: [
    "ขาย/เทิร์น: แนะนำเตรียมเอกสาร สภาพภายนอก-ภายใน ประวัติซ่อม รูปที่ชัด และจุดที่ควรซ่อมก่อนขายถ้าคุ้ม",
    "ประเมินราคาขายต้องติดป้ายประมาณการ และห้ามแต่งราคาตลาดปัจจุบัน",
    "อย่ารับร่างประกาศขายเต็มรูปแบบในรอบนี้หากไม่มีข้อมูลครบ — ถามเฉพาะจุดที่เปลี่ยนคำแนะนำ",
  ],
};

/**
 * Map turn intents (+ freshness) to domain categories for this turn.
 */
export function resolveChatV3AutomotiveDomainCategories(input: {
  intents: string[];
  primaryIntent: string;
  freshnessRequired?: boolean;
}): ChatV3AutomotiveDomainCategory[] {
  const ordered: ChatV3AutomotiveDomainCategory[] = [];
  const seen = new Set<ChatV3AutomotiveDomainCategory>();
  const push = (category: ChatV3AutomotiveDomainCategory) => {
    if (seen.has(category)) return;
    seen.add(category);
    ordered.push(category);
  };

  for (const category of DOMAIN_BY_INTENT[input.primaryIntent] ?? []) {
    push(category);
  }
  for (const intent of input.intents) {
    for (const category of DOMAIN_BY_INTENT[intent] ?? []) {
      push(category);
    }
  }
  if (input.freshnessRequired) {
    push("price_value");
  }
  return ordered;
}

/**
 * Compact guidance lines for selected domains (max few bullets each).
 */
export function buildChatV3AutomotiveDomainGuidanceBlock(
  categories: ChatV3AutomotiveDomainCategory[]
): string {
  if (categories.length === 0) return "";
  const lines: string[] = [
    "[กรอบความรู้ยานยนต์รอบนี้ — WP-V3-10B]",
    "ใช้เป็นกรอบคิดเท่านั้น ห้ามอ่านเป็นบทพูดยาวทุกข้อ และห้ามแต่งตัวเลข/กฎหมาย/ตารางเฉพาะรุ่นที่ไม่มีในบริบท",
  ];
  for (const category of categories) {
    lines.push(`หมวด ${category}:`);
    for (const bullet of DOMAIN_GUIDANCE[category]) {
      lines.push(`- ${bullet}`);
    }
  }
  return lines.join("\n");
}
