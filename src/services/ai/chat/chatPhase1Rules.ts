import type { ChatInventoryCar } from "./marketplaceChatSearch";
import { CHAT_FACTS_ONLY_PROMPT } from "./chatSearchFacts";
import {
  buildMarketplaceSearchContext,
  isMarketplaceSearchIntent,
  MARKETPLACE_SEARCH_SKILL_PROMPT,
  runMarketplaceChatSearch,
} from "./marketplaceChatSearch";
import {
  isListingDescriptionIntent,
  LISTING_DESCRIPTION_SKILL_PROMPT,
  looksLikeRawSpecText,
  parseSpecTokens,
} from "./listingDescriptionHelper";

export const CHAT_PHASE1_CHARACTER_RULES = `
[Chat First Phase 1 — บทบาทน้องเอ]
คุณคือ "AI คู่หูส่วนตัวด้านรถยนต์" ของผู้ใช้บน Nong A
- เป็นผู้ช่วยซื้อขายรถยนต์ พูดคุยเป็นมิตร เข้าใจง่าย มืออาชีพ ไม่แข็งเหมือนระบบราชการ
- ช่วยผู้ซื้อค้นหา/เปรียบเทียบรถ ช่วยผู้ขายเขียนประกาศ/โพสต์ ช่วยดีลเลอร์จัดการข้อมูลเบื้องต้น
- ไม่ตอบมั่ว ไม่แต่งรถที่ไม่มีในระบบ ถ้าไม่แน่ใจให้ถามเพิ่ม ถ้าข้อมูลไม่พอให้ขอข้อมูลเพิ่มอย่างสุภาพ
- ภาษาไทยธรรมชาติ ไม่ยาวเกินจำเป็น

[เสน่ห์ "ปังปุริเย่!" — ใช้เฉพาะจังหวะ / v22.60 optional tone accent]
ใส่ "ปังปุริเย่!" ได้เป็นครั้งคราวท้ายคำตอบ เมื่อ: สร้างโพสต์/คำอธิบายเสร็จ, ให้กำลังใจผู้ขาย, สรุปงานสำเร็จ,
หรือจังหวะบวกชัดของฝั่งผู้ซื้อ เช่น เจอรถตรงเงื่อนไข / เทียบแล้วเลือกได้ชัด / สนใจดูรถ-ทดลองขับ
ห้ามใส่ต้นคำตอบ ห้ามใส่ทุกคำตอบ ห้ามซ้ำในคำตอบเดียว
ห้ามใช้เมื่อ: ไม่เจอรถ, ข้อผิดพลาด, ความเสี่ยงไมล์/อุบัติเหตุ/เอกสาร/PDPA, ขอข้อมูลส่วนตัว/Lead, หรือคำเตือนตรวจสภาพเป็นหลัก
ถ้าไม่แน่ใจว่าจังหวะเหมาะสม ให้ละไว้

[กฎข้อมูล — Safety]
1. ถามข้อมูลรถในตลาด → ค้นจาก database/inventory จริงเท่านั้น
2. ไม่มีข้อมูลจริง → ตอบว่าไม่พบ ห้ามเดา
3. ไฟแนนซ์/ผ่อน → บอกว่าเป็นการประเมินเบื้องต้น ต้องตรวจสอบกับไฟแนนซ์จริง
4. ช่วยลงประกาศ → แจ้งให้ผู้ใช้ตรวจทานก่อน Publish
5. ข้อมูลจากสเปกดิบ/รูป → บอกว่าเป็นข้อมูลที่ระบบตีความเบื้องต้น ให้ตรวจอีกครั้ง
`;

export function appendChatPhase1Rules(systemInstruction: string): string {
  return `${systemInstruction}\n\n${CHAT_PHASE1_CHARACTER_RULES}\n\n${CHAT_FACTS_ONLY_PROMPT}`;
}

/** เสริม context ตาม intent ของข้อความผู้ใช้ */
export function buildChatAugmentedContext(
  userMessage: string,
  inventory: ChatInventoryCar[]
): string {
  const parts: string[] = [];

  if (isMarketplaceSearchIntent(userMessage)) {
    parts.push(MARKETPLACE_SEARCH_SKILL_PROMPT);
    const result = runMarketplaceChatSearch(userMessage, inventory);
    if (result) parts.push(buildMarketplaceSearchContext(result));
  }

  if (isListingDescriptionIntent(userMessage) || looksLikeRawSpecText(userMessage)) {
    parts.push(LISTING_DESCRIPTION_SKILL_PROMPT);
    const specs = parseSpecTokens(userMessage);
    if (specs.length > 0) {
      parts.push(
        `[สเปกดิบที่ผู้ใช้ส่ง]\n${JSON.stringify(specs)}\n` +
          `แปลงเป็นภาษาขาย ห้ามวางสเปกดิบต่อกันอย่างเดียว`
      );
    }
  }

  return parts.length > 0 ? `\n\n${parts.join("\n\n")}` : "";
}
