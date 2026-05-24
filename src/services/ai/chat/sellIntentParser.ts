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
  /** ทะเบียนไทย เช่น 9กณ7385 */
  licensePlate?: string;
  /** รุ่นย่อย / trim เช่น 2.5 Hybrid */
  trimSubModel?: string;
}

const SELL_INTENT =
  /(?:ช่วยลงขาย|สร้างประกาศขาย|ช่วยขาย|ลงประกาศ|มีรถจะขาย|ช่วยทำโพสต์ขาย|อยากขายรถ|ต้องการขายรถ)/i;

const KNOWN_BRANDS =
  /^(Honda|Toyota|Mazda|Nissan|Isuzu|Ford|Mitsubishi|Mercedes-Benz|BMW|BYD|Tesla|Suzuki|ฮอนด้า|โตโยต้า|ซูซูกิ)$/i;

const KNOWN_MODELS =
  /^(CR-V|CRV|Fortuner|City|Civic|Camry|Yaris|Vios|Altis|CX-5|MU-X|D-Max|Ertiga|XL7|Xpander)$/i;

const THAI_PLATE = /^(\d{1,4}[ก-ฮ]{2,4}\d{0,4})$/;

const FEATURE_KEYWORDS = [
  "เบาะหนัง",
  "จอ",
  "กล้อง",
  "เซนเซอร์",
  "ซันรูฟ",
  "Sunroof",
  "แม็ก",
  "แต่ง",
  "ฝาท้าย",
  "Engine Start",
  "Keyless",
  "Cruise",
  "Bluetooth",
  "บลูธูท",
  "ABS",
  "AB7",
  "Day Light",
  "Dual Zone",
];

export function isSellIntent(message: string): boolean {
  return SELL_INTENT.test(message);
}

function parseThaiNumber(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

function currentMaxYear(): number {
  return new Date().getFullYear() + 1;
}

function isValidModelYear(y: number): boolean {
  return y >= 1980 && y <= currentMaxYear();
}

function normalizeListingText(message: string): string {
  return message
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, "\t")
    .replace(/[ \u00a0]+/g, " ");
}

function inferBrandFromModel(model: string): string | undefined {
  const m = model.replace(/^CRV$/i, "CR-V");
  if (["CR-V", "City", "Civic"].includes(m)) return "Honda";
  if (["Fortuner", "Camry", "Yaris", "Vios", "Altis"].includes(m)) return "Toyota";
  if (m === "CX-5") return "Mazda";
  if (["MU-X", "D-Max"].includes(m)) return "Isuzu";
  if (["Ertiga", "XL7"].includes(m)) return "Suzuki";
  if (m === "Xpander") return "Mitsubishi";
  return undefined;
}

function extractYear(text: string, cells: string[]): number | undefined {
  const labeled = text.match(/(?:ปี|year)\s*(\d{4})/i);
  if (labeled) {
    const y = Number(labeled[1]);
    if (isValidModelYear(y)) return y;
  }

  for (const cell of cells) {
    const only = cell.match(/^(\d{4})$/);
    if (only && isValidModelYear(Number(only[1]))) return Number(only[1]);
  }

  for (const m of text.matchAll(/\b(19[89]\d|20[0-3]\d)\b/g)) {
    const y = Number(m[1]);
    if (!isValidModelYear(y)) continue;
    const idx = m.index ?? 0;
    const before = idx > 0 ? text[idx - 1] : "";
    const after = text[idx + 4] ?? "";
    if (/\d/.test(before) || /\d/.test(after)) continue;
    return y;
  }

  return undefined;
}

function extractPrice(text: string, cells: string[]): number | undefined {
  let processedText = text;
  const thaiWordToDigit: Record<string, string> = {
    หนึ่ง: "1",
    สอง: "2",
    สาม: "3",
    สี่: "4",
    ห้า: "5",
    หก: "6",
    เจ็ด: "7",
    แปด: "8",
    เก้า: "9",
  };
  for (const [word, digit] of Object.entries(thaiWordToDigit)) {
    processedText = processedText.replace(new RegExp(word, "g"), digit);
  }

  for (const cell of cells) {
    const bahtCell = cell.match(/^([\d,]+(?:\.\d+)?)\s*บาท\.?$/i);
    if (bahtCell) {
      const p = parseThaiNumber(bahtCell[1]);
      if (p >= 10_000) return p;
    }
  }

  const bahtMatches = [...processedText.matchAll(/([\d,]+(?:\.\d+)?)\s*บาท/gi)];
  if (bahtMatches.length > 0) {
    const last = bahtMatches[bahtMatches.length - 1];
    const p = parseThaiNumber(last[1]);
    if (p >= 10_000) return p;
  }

  const priceMatch = processedText.match(
    /(?:ราคา|ขาย|ปล่อย)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
  );
  if (priceMatch) {
    let price = parseThaiNumber(priceMatch[1]);
    if (priceMatch[2]) {
      if (/แสน/i.test(priceMatch[2])) price *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(priceMatch[2])) price *= 1_000_000;
    } else if (price < 1000 && price > 0) {
      const remainder = processedText.substring(
        priceMatch.index! + priceMatch[0].length
      );
      if (remainder.match(/^\s*(ล้าน|ล\.|million)/i)) price *= 1_000_000;
      else if (remainder.match(/^\s*แสน/i)) price *= 100_000;
    }
    if (price > 0) return price;
  }

  const directPrice = processedText.match(
    /([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)\s*(?:บาท|฿)?/i
  );
  if (directPrice) {
    let price = parseThaiNumber(directPrice[1]);
    if (/แสน/i.test(directPrice[2])) price *= 100_000;
    else if (/ล้าน|ล\.|million/i.test(directPrice[2])) price *= 1_000_000;
    if (price > 0) return price;
  }

  const rawPriceMatch = processedText.match(/(?:ราคา|ขาย)\s*([\d,]{5,})/i);
  if (rawPriceMatch) return parseThaiNumber(rawPriceMatch[1]);

  return undefined;
}

function extractMileage(text: string, cells: string[]): number | undefined {
  for (const cell of cells) {
    const m = cell.match(/^(?:เลขไมล์|ไมล์)\s*([\d,]+)/i);
    if (m) return parseThaiNumber(m[1]);
  }
  const mileageMatch = text.match(/(?:ไมล์|วิ่ง|เลขไมล์)\s*([\d,]+)/i);
  if (mileageMatch) return parseThaiNumber(mileageMatch[1]);
  return undefined;
}

function extractColor(text: string, cells: string[]): string | undefined {
  for (const cell of cells) {
    const c = cell.match(/^สี(.+)$/i);
    if (c?.[1]) return c[1].trim();
  }
  const colorMatch = text.match(
    /สี(ขาว|ดำ|เทา|เงิน|แดง|น้ำเงิน|น้ำตาล|เขียว|เหลือง|ส้ม)/i
  );
  if (colorMatch) return colorMatch[1];
  return undefined;
}

function extractTransmission(text: string, cells: string[]): string | undefined {
  for (const cell of cells) {
    const g = cell.match(/^เกียร์\s*(.+)$/i);
    if (g?.[1]) return formatTransmission(g[1].trim());
  }
  const transMatch = text.match(
    /(?:เกียร์)\s*(ออโต้|อัตโนมัติ|auto|AT|MT|manual|ธรรมดา|CVT)/i
  );
  if (transMatch) return formatTransmission(transMatch[1]);
  if (/\bAT\b/.test(text) && /เกียร์/i.test(text)) return "เกียร์ AT";
  return undefined;
}

function formatTransmission(raw: string): string {
  const t = raw.toLowerCase();
  if (/ออโต้|อัตโนมัติ|auto|cvt|^at$/i.test(t)) {
    return /^at$/i.test(raw.trim()) ? "เกียร์ AT" : "เกียร์ออโต้";
  }
  if (/^mt$|manual|ธรรมดา/i.test(t)) return "เกียร์ธรรมดา";
  return `เกียร์ ${raw.trim()}`;
}

function extractLicensePlate(text: string, cells: string[]): string | undefined {
  for (const cell of cells) {
    if (THAI_PLATE.test(cell.replace(/\s/g, ""))) return cell.replace(/\s/g, "");
  }
  const m = text.match(/\b(\d{1,4}[ก-ฮ]{2,4}\d{0,4})\b/);
  return m?.[1];
}

function extractBrandModel(
  text: string,
  cells: string[]
): { brand?: string; model?: string } {
  if (cells.length >= 2 && KNOWN_BRANDS.test(cells[0])) {
    const brand = cells[0];
    const modelRaw = cells[1];
    const model = modelRaw.replace(/^CRV$/i, "CR-V");
    return { brand, model };
  }

  const brandMatch = text.match(
    /\b(Honda|Toyota|Mazda|Nissan|Isuzu|Ford|Mitsubishi|Mercedes-Benz|BMW|BYD|Tesla|Suzuki|ฮอนด้า|โตโยต้า|ซูซูกิ)\s+([A-Za-z0-9][A-Za-z0-9.-]*)/i
  );
  if (brandMatch) {
    return {
      brand: brandMatch[1],
      model: brandMatch[2].replace(/^CRV$/i, "CR-V"),
    };
  }

  const soloModel = text.match(
    /\b(CR-V|CRV|Fortuner|City|Civic|Camry|Yaris|Vios|Altis|CX-5|MU-X|D-Max|Ertiga|XL7|Xpander)\b/i
  );
  if (soloModel) {
    const model = soloModel[1].replace(/^CRV$/i, "CR-V");
    return { brand: inferBrandFromModel(model), model };
  }

  return {};
}

function extractTrimSubModel(cells: string[]): string | undefined {
  if (cells.length < 4) return undefined;
  for (let i = 2; i < cells.length; i++) {
    const candidate = cells[i];
    if (!candidate || looksLikeFeatureBlob(candidate)) break;
    if (THAI_PLATE.test(candidate.replace(/\s/g, ""))) continue;
    if (KNOWN_MODELS.test(candidate) || KNOWN_BRANDS.test(candidate)) continue;
    if (
      /^(?:เลขไมล์|ไมล์|เกียร์|สี|\d{4}|[\d,]+\s*บาท)/i.test(candidate)
    ) {
      continue;
    }
    if (/^\d+\.\d+\s*\w+/i.test(candidate) || /Hybrid/i.test(candidate)) {
      return candidate.trim();
    }
    if (candidate.length <= 32 && !candidate.includes("ลงประกาศ")) {
      return candidate.trim();
    }
  }
  return undefined;
}

function looksLikeFeatureBlob(segment: string): boolean {
  if (segment.length < 20) return false;
  if (segment.includes("+")) return true;
  return FEATURE_KEYWORDS.some((k) => segment.includes(k));
}

function extractDescription(
  text: string,
  cells: string[],
  fields: ExtractedCarFields
): string | undefined {
  const parts: string[] = [];

  if (fields.trimSubModel?.trim()) parts.push(fields.trimSubModel.trim());
  if (fields.licensePlate?.trim()) {
    parts.push(`ทะเบียน ${fields.licensePlate.trim()}`);
  }

  for (const cell of cells) {
    if (looksLikeFeatureBlob(cell)) {
      parts.push(cell.replace(/\s*ลงประกาศ.*$/i, "").trim());
    }
  }

  const featuresMatch = text.match(/(?:มี|พร้อม|ออปชัน|จุดเด่น)\s*(.+)/i);
  if (featuresMatch) {
    parts.push(featuresMatch[1].trim().replace(/\s+/g, ", "));
  } else if (/รถบ้าน|มือเดียว|สภาพดี/i.test(text)) {
    const sellingMatch = text.match(
      /(รถบ้าน[^.。\n\t]*|มือเดียว[^.。\n\t]*|สภาพดี[^.。\n\t]*)/i
    );
    if (sellingMatch) {
      parts.push(
        sellingMatch[0].replace(/\s*ลงประกาศ.*$/i, "").trim().replace(/\s+/g, " ")
      );
    }
  }

  if (parts.length === 0) {
    const foundKeywords = FEATURE_KEYWORDS.filter((k) => text.includes(k));
    if (foundKeywords.length >= 2) {
      const tabChunks = text.split(/\t+/);
      for (const chunk of tabChunks) {
        if (looksLikeFeatureBlob(chunk)) {
          parts.push(chunk.replace(/\s*ลงประกาศ.*$/i, "").trim());
          break;
        }
      }
      if (parts.length === 0) {
        const plusSegment = text.match(
          /([^.\n\t]{30,}(?:\+[^.\n\t]+){2,})/
        );
        if (plusSegment) {
          parts.push(
            plusSegment[1].replace(/\s*ลงประกาศ.*$/i, "").trim()
          );
        }
      }
    }
  }

  const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
  return unique.length > 0 ? unique.join(" · ") : undefined;
}

function splitCells(text: string): string[] {
  if (!text.includes("\t")) return [];
  return text
    .split("\t")
    .map((c) => c.trim())
    .filter(Boolean);
}

export function extractCarFieldsFromMessage(message: string): ExtractedCarFields {
  const text = normalizeListingText(message);
  const cells = splitCells(message.trim());
  const fields: ExtractedCarFields = {};

  const { brand, model } = extractBrandModel(text, cells);
  if (brand) fields.brand = brand;
  if (model) fields.model = model;

  fields.year = extractYear(text, cells);
  fields.color = extractColor(text, cells);
  fields.price = extractPrice(text, cells);
  fields.mileage = extractMileage(text, cells);
  fields.transmission = extractTransmission(text, cells);
  fields.licensePlate = extractLicensePlate(text, cells);
  fields.trimSubModel = extractTrimSubModel(cells);

  fields.description = extractDescription(text, cells, fields);

  return fields;
}

export function buildDraftPreviewCopy(fields: ExtractedCarFields): string {
  const missingFields: string[] = [];
  if (!fields.brand || !fields.model) missingFields.push("ยี่ห้อ/รุ่น");
  if (!fields.year) missingFields.push("ปี");
  if (!fields.price) missingFields.push("ราคา");
  if (!fields.mileage) missingFields.push("เลขไมล์");

  const formattedPrice = fields.price
    ? `${fields.price.toLocaleString("th-TH")} บาท`
    : "-";
  const formattedMileage = fields.mileage
    ? `${fields.mileage.toLocaleString("th-TH")} กม.`
    : "-";

  let reply = "น้องเอสรุปข้อมูลเบื้องต้นให้แล้วครับ:\n\n";
  reply += `• ยี่ห้อ: ${fields.brand || "-"}\n`;
  reply += `• รุ่น: ${fields.model || "-"}\n`;
  if (fields.trimSubModel) reply += `• รุ่นย่อย: ${fields.trimSubModel}\n`;
  if (fields.licensePlate) reply += `• ทะเบียน: ${fields.licensePlate}\n`;
  reply += `• ปี: ${fields.year || "-"}\n`;
  if (fields.color) reply += `• สี: ${fields.color}\n`;
  if (fields.transmission) reply += `• เกียร์: ${fields.transmission}\n`;
  reply += `• ราคา: ${formattedPrice}\n`;
  reply += `• เลขไมล์: ${formattedMileage}\n`;
  if (fields.description) reply += `• จุดเด่น: ${fields.description}\n`;

  reply += "\n";

  if (missingFields.length > 0) {
    reply += `ยังขาดข้อมูล ${missingFields.join(", ")} ครับ ลุงช่วยพิมพ์บอกน้องเอเพิ่มหน่อยนะครับ\n`;
  } else {
    reply += `ข้อมูลครบถ้วนครับ!\n`;
  }

  reply += `ยังขาดรูปภาพรถอย่างน้อย 1 รูปก่อนลงขายครับ หลังบันทึกประกาศแล้วสามารถเพิ่มรูปได้ที่หน้าแก้ไขประกาศ ปังปุริเย่!`;

  return reply;
}
