export interface ExtractedCarFields {
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  price?: number;
  mileage?: number;
  transmission?: string;
  fuelType?: string;
  description?: string;
  sellerType?: string;
  phone?: string;
}

const SELL_INTENT = /(?:ช่วยลงขาย|สร้างประกาศขาย|ช่วยขาย|ลงประกาศ|มีรถจะขาย|ช่วยทำโพสต์ขาย|อยากขายรถ|ต้องการขายรถ)/i;

export function isSellIntent(message: string): boolean {
  return SELL_INTENT.test(message);
}

function parseThaiNumber(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

export function extractCarFieldsFromMessage(message: string): ExtractedCarFields {
  const text = message.trim();
  const fields: ExtractedCarFields = {};

  // 1. Brand & Model (Simple matching based on known brands)
  const brandMatch = text.match(/\b(Honda|Toyota|Mazda|Nissan|Isuzu|Ford|Mitsubishi|Mercedes-Benz|BMW|BYD|Tesla|Suzuki|ฮอนด้า|โตโยต้า|ซูซูกิ)\s+([A-Za-z0-9][A-Za-z0-9-]*)/i);
  if (brandMatch) {
    fields.brand = brandMatch[1];
    fields.model = brandMatch[2].replace(/^CRV$/i, "CR-V");
  } else {
    const soloModel = text.match(/\b(CR-V|CRV|Fortuner|City|Civic|Camry|Yaris|CX-5|MU-X|D-Max|Ertiga|XL7|Xpander)\b/i);
    if (soloModel) {
      fields.model = soloModel[1].replace("CRV", "CR-V");
      if (fields.model === "CR-V" || fields.model === "City" || fields.model === "Civic") fields.brand = "Honda";
      else if (fields.model === "Fortuner" || fields.model === "Camry" || fields.model === "Yaris") fields.brand = "Toyota";
      else if (fields.model === "CX-5") fields.brand = "Mazda";
      else if (fields.model === "MU-X" || fields.model === "D-Max") fields.brand = "Isuzu";
      else if (fields.model === "Ertiga" || fields.model === "XL7") fields.brand = "Suzuki";
      else if (fields.model === "Xpander") fields.brand = "Mitsubishi";
    }
  }

  // 2. Year
  const yearMatch = text.match(/(?:ปี|year)\s*(\d{4})/i);
  if (yearMatch) fields.year = Number(yearMatch[1]);

  // 3. Color
  const colorMatch = text.match(/สี(ขาว|ดำ|เทา|เงิน|แดง|น้ำเงิน|น้ำตาล|เขียว|เหลือง|ส้ม)/i);
  if (colorMatch) fields.color = colorMatch[1];

  // 4. Price
  let processedText = text;
  const thaiWordToDigit: Record<string, string> = {
    'หนึ่ง': '1', 'สอง': '2', 'สาม': '3', 'สี่': '4', 'ห้า': '5', 'หก': '6', 'เจ็ด': '7', 'แปด': '8', 'เก้า': '9'
  };
  for (const [word, digit] of Object.entries(thaiWordToDigit)) {
    processedText = processedText.replace(new RegExp(word, 'g'), digit);
  }

  const priceMatch = processedText.match(/(?:ราคา|ขาย|ปล่อย)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i);
  if (priceMatch) {
    let price = parseThaiNumber(priceMatch[1]);
    if (priceMatch[2]) {
      if (/แสน/i.test(priceMatch[2])) price *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(priceMatch[2])) price *= 1_000_000;
    } else if (price < 1000 && price > 0) {
      // If they just say "ขาย 7 แสน" without "ราคา"
      const remainder = processedText.substring(priceMatch.index! + priceMatch[0].length);
      if (remainder.match(/^\s*(ล้าน|ล\.|million)/i)) price *= 1_000_000;
      else if (remainder.match(/^\s*แสน/i)) price *= 100_000;
    }
    if (price > 0) fields.price = price;
  } else {
    // Try to find just the number + unit
    const directPrice = processedText.match(/([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)\s*(?:บาท|฿)?/i);
    if (directPrice) {
      let price = parseThaiNumber(directPrice[1]);
      if (/แสน/i.test(directPrice[2])) price *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(directPrice[2])) price *= 1_000_000;
      if (price > 0) fields.price = price;
    } else {
      // Look for a large number that looks like a price
      const rawPriceMatch = processedText.match(/(?:ราคา|ขาย)\s*([\d,]{5,})/i);
      if (rawPriceMatch) {
        fields.price = parseThaiNumber(rawPriceMatch[1]);
      }
    }
  }

  // 5. Mileage
  const mileageMatch = text.match(/(?:ไมล์|วิ่ง|เลขไมล์)\s*([\d,]+)/i);
  if (mileageMatch) fields.mileage = parseThaiNumber(mileageMatch[1]);

  // 6. Description / Features
  const featuresMatch = text.match(/(?:มี|พร้อม|ออปชัน|จุดเด่น)\s*(.+)/i);
  if (featuresMatch) {
    fields.description = featuresMatch[1].trim().replace(/\s+/g, ", ");
  } else {
    // Check if the user just listed features with spaces/pluses
    const keywords = ["เบาะหนัง", "จอ", "กล้อง", "เซนเซอร์", "ซันรูฟ", "แม็ก", "แต่ง", "ฝาท้าย"];
    const foundKeywords = keywords.filter(k => text.includes(k));
    if (foundKeywords.length > 0) {
      // Try to extract the whole phrase containing these keywords
      const parts = text.split(/[\s+]+/);
      const featureParts = parts.filter(p => keywords.some(k => p.includes(k)));
      if (featureParts.length > 0) {
        fields.description = featureParts.join(", ");
      } else {
        fields.description = foundKeywords.join(", ");
      }
    }
  }

  return fields;
}

export function buildDraftPreviewCopy(fields: ExtractedCarFields): string {
  const missingFields: string[] = [];
  if (!fields.brand || !fields.model) missingFields.push("ยี่ห้อ/รุ่น");
  if (!fields.year) missingFields.push("ปี");
  if (!fields.price) missingFields.push("ราคา");
  if (!fields.mileage) missingFields.push("เลขไมล์");

  const formattedPrice = fields.price ? `${fields.price.toLocaleString("th-TH")} บาท` : "-";
  const formattedMileage = fields.mileage ? `${fields.mileage.toLocaleString("th-TH")} กม.` : "-";

  let reply = "น้องเอสรุปข้อมูลเบื้องต้นให้แล้วครับ:\n\n";
  reply += `• ยี่ห้อ: ${fields.brand || "-"}\n`;
  reply += `• รุ่น: ${fields.model || "-"}\n`;
  reply += `• ปี: ${fields.year || "-"}\n`;
  if (fields.color) reply += `• สี: ${fields.color}\n`;
  reply += `• ราคา: ${formattedPrice}\n`;
  reply += `• เลขไมล์: ${formattedMileage}\n`;
  if (fields.description) reply += `• จุดเด่น: ${fields.description}\n`;

  reply += "\n";

  if (missingFields.length > 0) {
    reply += `ยังขาดข้อมูล ${missingFields.join(", ")} ครับ ลุงช่วยพิมพ์บอกน้องเอเพิ่มหน่อยนะครับ\n`;
  } else {
    reply += `ข้อมูลครบถ้วนครับ!\n`;
  }

  reply += `ยังขาดรูปภาพรถอย่างน้อย 1 รูปก่อนลงขายครับ สามารถส่งรูปมาได้เลย ปังปุริเย่!`;

  return reply;
}
