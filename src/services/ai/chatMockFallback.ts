/** Mock ตอบแชทเมื่อไม่มี Gemini — อ่านรายการรถจาก inventory */

export interface MockCarListing {
  id?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  isSold?: boolean;
  createdAt?: string;
}

const NEW_CAR_PATTERNS =
  /รถใหม่|เข้ามา|ตลาด|ล่าสุด|มีอะไรบ้าง|มีรถอะไร|วันนี้มี/i;

export function buildMockChatReply(
  message: string,
  cars: MockCarListing[] = []
): string {
  const active = cars.filter((c) => !c.isSold);
  const sorted = [...active].sort((a, b) => {
    const ta = new Date(a.createdAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? 0).getTime();
    return tb - ta;
  });

  if (NEW_CAR_PATTERNS.test(message)) {
    const recent = sorted.slice(0, 5);
    if (recent.length === 0) {
      return (
        "ปังปุริเย่! ตอนนี้ยังไม่พบรถใหม่ในตลาดครับ 🙏\n\n" +
        "ลองกลับมาดูอีกครั้งในภายหลัง หรือค้นหาตามยี่ห้อ/รุ่นที่สนใจได้เลยครับ — น้องเอพร้อมช่วยเสมอครับ! 🔥"
      );
    }

    const lines = recent.map((c, i) => {
      const title =
        c.title || `${c.brand ?? ""} ${c.model ?? ""}`.trim() || "รถมือสอง";
      const year = c.year ? ` ปี ${c.year}` : "";
      const mileage =
        typeof c.mileage === "number" && c.mileage > 0
          ? ` — ${c.mileage.toLocaleString("th-TH")} กม.`
          : "";
      const price =
        c.price && c.price > 0
          ? ` — ฿${c.price.toLocaleString("th-TH")} บาท`
          : "";
      return `${i + 1}. ${title}${year}${mileage}${price}`;
    });

    return (
      "ปังปุริเย่! 🎉 จากข้อมูลจริงในตลาด Nong A ตอนนี้มีรถดังนี้ครับ:\n\n" +
      lines.join("\n") +
      "\n\n(สรุปจากระบบจริงเท่านั้น — ไม่มีรถนอกรายการนี้)\n" +
      "ทักถามรุ่นที่ชอบได้เลยครับ คันไหนสนใจน้องเอช่วยสรุปสเปกให้เพิ่มได้ครับ! 🔥"
    );
  }

  const count = sorted.length;
  if (count === 0) {
    return (
      "ปังปุริเย่! ตอนนี้ยังไม่มีรถในตลาดครับ 🙏\n\n" +
      "น้องเอตรวจจากข้อมูลจริงในระบบแล้ว — ยังไม่พบประกาศขาย\n" +
      "ลองกลับมาดูอีกครั้งหลังมีผู้ลงประกาศ หรือไปลงขายรถคันแรกได้เลยครับ!"
    );
  }

  return (
    `ปังปุริเย่! น้องเอพร้อมช่วยครับ 😊\n\n` +
    `ตอนนี้ในตลาดมีรถจริง ${count} คัน (จากข้อมูลระบบเท่านั้น)\n` +
    `ลองถามเช่น "วันนี้มีรถใหม่เข้ามาในตลาดไหมครับ" เพื่อดูรายการล่าสุดครับ!\n\n` +
    `*(โหมดสำรอง: อ่านจาก /api/cars — ห้ามอ้างรถที่ไม่มีในระบบ)*`
  );
}

/** แบ่งข้อความเป็นชิ้นเล็กสำหรับ SSE mock */
export function* chunkTextForStream(text: string, chunkSize = 12): Generator<string> {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
  }
}
