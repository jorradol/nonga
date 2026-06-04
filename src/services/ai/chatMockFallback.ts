/** Mock ตอบแชทเมื่อไม่มี Gemini — อ่านรายการรถจาก inventory */

import {
  isMarketplaceSearchIntent,
  runMarketplaceChatSearch,
} from "./chat/marketplaceChatSearch";
import {
  buildListingDescriptionReply,
  isListingDescriptionIntent,
  looksLikeRawSpecText,
} from "./chat/listingDescriptionHelper";

export interface MockCarListing {
  id?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  color?: string;
  fuelType?: string;
  type?: string;
  isSold?: boolean;
  listingStatus?: string;
  saleStatus?: string;
  createdAt?: string;
  images?: string[];
  showroomName?: string;
  ownerName?: string;
}

const NEW_CAR_PATTERNS =
  /รถใหม่|เข้ามา|ตลาด|ล่าสุด|มีอะไรบ้าง|มีรถอะไร|วันนี้มี|น่าสนใจ/i;

function toRecord(c: MockCarListing) {
  return {
    id: c.id ?? "unknown",
    title: c.title ?? "",
    brand: c.brand ?? "",
    model: c.model ?? "",
    year: c.year ?? 0,
    price: c.price ?? 0,
    mileage: c.mileage ?? 0,
    color: c.color,
    fuelType: c.fuelType,
    type: (c.type as "used") ?? "used",
    condition: "used",
    images: c.images ?? [],
    description: "",
    ownerId: "",
    ownerName: c.ownerName ?? "",
    ownerPhone: "",
    isSold: Boolean(c.isSold),
    listingStatus: c.listingStatus as "published" | undefined,
    createdAt: c.createdAt ?? new Date().toISOString(),
    showroomName: c.showroomName,
  };
}

function activeCars(cars: MockCarListing[]): MockCarListing[] {
  return cars.filter(
    (c) =>
      !c.isSold &&
      c.saleStatus !== "pending_sale" &&
      c.saleStatus !== "sold" &&
      (!c.listingStatus || c.listingStatus === "published")
  );
}

export function buildMockChatReply(
  message: string,
  cars: MockCarListing[] = []
): string {
  const text = message.trim();
  const inventory = activeCars(cars).map(toRecord);

  if (isListingDescriptionIntent(text) || looksLikeRawSpecText(text)) {
    return buildListingDescriptionReply({ rawSpecs: text });
  }

  if (isMarketplaceSearchIntent(text)) {
    const result = runMarketplaceChatSearch(text, inventory);
    if (result) return result.introText;
  }

  const sorted = [...activeCars(cars)].sort((a, b) => {
    const ta = new Date(a.createdAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? 0).getTime();
    return tb - ta;
  });

  if (NEW_CAR_PATTERNS.test(text)) {
    const recent = sorted.slice(0, 5);
    if (recent.length === 0) {
      return (
        "ตอนนี้ยังไม่พบรถใหม่ในตลาดครับ 🙏\n\n" +
        "น้องเอตรวจจากข้อมูลจริงในระบบแล้ว — ลองกลับมาดูอีกครั้ง หรือค้นหาตามยี่ห้อ/รุ่นที่สนใจได้เลยครับ"
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
      const link = c.id ? `\n   ดูรายละเอียด: /cars/${c.id}` : "";
      return `${i + 1}. ${title}${year}${mileage}${price}${link}`;
    });

    return (
      "จากข้อมูลจริงในตลาด Nong A ตอนนี้มีรถล่าสุดดังนี้ครับ:\n\n" +
      lines.join("\n") +
      "\n\n(สรุปจากระบบจริงเท่านั้น — ไม่มีรถนอกรายการนี้)\n" +
      "ทักถามรุ่นที่ชอบได้เลยครับ ปังปุริเย่!"
    );
  }

  const count = sorted.length;
  if (count === 0) {
    return (
      "ตอนนี้ยังไม่มีรถในตลาดครับ 🙏\n\n" +
      "น้องเอตรวจจากข้อมูลจริงในระบบแล้ว — ยังไม่พบประกาศขาย\n" +
      "ลองกลับมาดูอีกครั้งหลังมีผู้ลงประกาศ หรือไปลงขายรถคันแรกได้เลยครับ!"
    );
  }

  return (
    `น้องเอพร้อมช่วยครับ 😊\n\n` +
    `ตอนนี้ในตลาดมีรถจริง ${count} คัน (จากข้อมูลระบบเท่านั้น)\n` +
    `ลองถามเช่น "มี Honda CR-V ไหม" หรือ "มีรถ SUV ไม่เกิน 700,000" เพื่อค้นจาก Marketplace จริงครับ\n\n` +
    `*(โหมดสำรอง: อ่านจาก /api/cars — ห้ามอ้างรถที่ไม่มีในระบบ)*`
  );
}

/** แบ่งข้อความเป็นชิ้นเล็กสำหรับ SSE mock */
export function* chunkTextForStream(text: string, chunkSize = 12): Generator<string> {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
  }
}
