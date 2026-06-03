/**
 * v5.6C — Deterministic Thai copy for buyer lead capture (no Gemini).
 */

export const BUYER_LEAD_START_HINT =
  "เมื่อสนใจรถคันใด กดปุ่ม “ให้ผู้ขายติดต่อกลับ” ที่การ์ดรถ หรือพิมพ์ “ขอให้ผู้ขายติดต่อกลับ” หลังเลือกคันแล้ว — น้องเอจะช่วยเก็บข้อมูลและให้ตรวจสอบก่อนส่งให้ผู้ขายครับ";

export const BUYER_LEAD_FORBIDDEN_DOC_REPLY =
  "รอบนี้ยังไม่รับเอกสารสำคัญครับ (เช่น บัตรประชาชน เล่มทะเบียน สลิปเงินเดือน เลขบัญชี สัญญาไฟแนนซ์) — ขอแค่ชื่อ/ชื่อเล่น วิธีซื้อ งบหรือราคาที่เสนอ และเวลาที่สะดวกติดต่อในแชท เบอร์โทรกรอกในหน้าต่างสรุปก่อนส่งนะครับ";

/** User taps or sends this to open consent modal after chat fields are complete. */
export const CHAT_BUYER_LEAD_OPEN_MODAL_ACTION = "ตรวจสอบและส่งข้อมูลให้ผู้ขาย";

export const BUYER_LEAD_LOGIN_REQUIRED_REPLY =
  "ก่อนส่งข้อมูลให้ผู้ขาย กรุณาเข้าสู่ระบบก่อนนะครับ (รอบทดลองยังไม่เปิดสมัครเอง — ใช้บัญชีที่ทีมเชิญ) แล้วกดยืนยันในหน้าต่างสรุปอีกครั้งครับ";

export const BUYER_LEAD_CANCEL_REPLY =
  "ยกเลิกการส่งข้อมูลให้ผู้ขายแล้วครับ ถ้าสนใจใหม่ พิมพ์ “ขอให้ผู้ขายติดต่อกลับ” ได้เลยครับ";

export function buildBuyerLeadCollectingPrompt(missing: string[]): string {
  const lines = [
    "รับทราบครับ น้องเอช่วยส่งข้อมูลให้ผู้ขายติดต่อกลับเรื่องรถคันที่สนใจได้",
    "",
    "ขอข้อมูลในแชท (ทีละข้อความหรือรวมในข้อความเดียวก็ได้):",
    "• ชื่อหรือชื่อเล่น",
    "• วิธีซื้อ: เงินสด / ไฟแนนซ์ / ยังไม่แน่ใจ",
    "• งบประมาณหรือราคาที่เสนอ",
    "• เวลาที่สะดวกให้ติดต่อ",
    "",
    "เบอร์โทรจะกรอกในหน้าต่างสรุปก่อนส่งให้ผู้ขายครับ",
    "",
  ];
  if (missing.length > 0) {
    lines.push(`ยังขาด: ${missing.join(", ")}`, "");
  }
  lines.push("พิมพ์ “ยกเลิก” ถ้าไม่ต้องการส่งข้อมูลครับ");
  return lines.join("\n");
}

export function buildBuyerLeadSelectCarFirstReply(): string {
  return [
    "ก่อนส่งข้อมูลให้ผู้ขาย กรุณาเลือกรถที่สนใจให้ชัดเจนก่อนครับ",
    "",
    'กดปุ่ม **"ให้ผู้ขายติดต่อกลับ"** ที่การ์ดรถคันที่ต้องการในแชท',
    "หรือพิมพ์ “ขอให้ผู้ขายติดต่อกลับ” หลังจากเลือกคันแล้ว",
    "",
    "พิมพ์ “ยกเลิก” ถ้าไม่ต้องการส่งข้อมูลครับ",
  ].join("\n");
}

export function buildBuyerLeadStartFromCarReply(car: {
  brand: string;
  model: string;
  year: number;
}): string {
  const title = `${car.brand} ${car.model}`.trim();
  return `รับทราบครับ สนใจ **${title} ปี ${car.year}** — น้องเอจะช่วยเก็บข้อมูลและให้ตรวจสอบก่อนส่งให้เจ้าของรถคันนี้ครับ`;
}

export function buildBuyerLeadOpenModalAckReply(): string {
  return "เปิดหน้าต่างสรุปให้แล้วครับ กรุณากรอกเบอร์โทรและกดยืนยันส่งข้อมูลให้ผู้ขาย (ต้องเข้าสู่ระบบก่อนบันทึก)";
}

export function buildBuyerLeadReadySummaryReply(fields: {
  displayName?: string;
  purchaseMethod?: "cash" | "finance" | "undecided";
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  preferredContactWindow?: string;
}): string {
  const method =
    fields.purchaseMethod === "cash"
      ? "เงินสด"
      : fields.purchaseMethod === "finance"
        ? "ไฟแนนซ์"
        : fields.purchaseMethod === "undecided"
          ? "ยังไม่แน่ใจ"
          : "—";
  const budget =
    fields.budgetMax != null
      ? `ประมาณ ${fields.budgetMax.toLocaleString("th-TH")} บาท`
      : fields.budgetMin != null
        ? `ประมาณ ${fields.budgetMin.toLocaleString("th-TH")} บาท`
        : fields.offeredPrice != null && fields.offeredPrice > 0
          ? `เสนอ ${fields.offeredPrice.toLocaleString("th-TH")} บาท`
          : "—";
  return [
    "น้องเอสรุปข้อมูลที่จะส่งให้ผู้ขายก่อนนะครับ:",
    `• ชื่อ/ชื่อเล่น: ${fields.displayName?.trim() || "—"}`,
    `• วิธีซื้อ: ${method}`,
    `• งบประมาณ/ราคาที่เสนอ: ${budget}`,
    `• เวลาที่สะดวกให้ติดต่อ: ${fields.preferredContactWindow?.trim() || "—"}`,
    "",
    `กดปุ่ม **${CHAT_BUYER_LEAD_OPEN_MODAL_ACTION}** เพื่อกรอกเบอร์โทรและยืนยันในหน้าต่างสรุป (ต้องเข้าสู่ระบบก่อนบันทึก)`,
    "พิมพ์ “ยกเลิก” ถ้าไม่ต้องการส่งครับ",
  ].join("\n");
}

export function buildBuyerLeadSuccessReply(queuePosition?: number): string {
  if (queuePosition != null && queuePosition > 0) {
    return [
      "ส่งข้อมูลให้ผู้ขายแล้วครับ",
      `ตอนนี้คุณอยู่ในคิวผู้สนใจลำดับที่ ${queuePosition}`,
      "ผู้ขายจะติดต่อกลับตามลำดับคิวครับ",
      "น้องเอไม่เปิดเผยชื่อหรือเบอร์ของผู้สนใจรายอื่นให้คุณเห็นครับ",
    ].join("\n");
  }
  return [
    "บันทึกแล้วครับ น้องเอส่งสรุปความสนใจให้ผู้ขายแล้ว",
    "ผู้ขายจะเห็นข้อมูลแบบคัดกรองก่อน — **ยังไม่เปิดเบอร์เต็มในรอบนี้**",
    "น้องเอไม่รับประกันว่าจะปิดการขาย — ช่วยสะดวกการติดต่อเท่านั้นครับ",
  ].join("\n");
}
