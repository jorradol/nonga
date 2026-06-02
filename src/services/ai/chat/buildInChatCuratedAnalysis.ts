/** v5.4.9c — in-chat “บทเกณฑ์คัดสรรของน้องเอ” (deterministic, facts-only) */

import type { ChatCarCardData } from "../../../types";
import {
  loadChatSearchContext,
  loadInChatBuyerContext,
  type InChatBuyerContext,
} from "../../../utils/chatCarContext";
import { BUYER_PITCH_FORBIDDEN_CLAIM } from "./buyerCarPitchCopy";
import {
  buildStableSeed,
  inferThaiCopyStyle,
  pickStableVariant,
  type ThaiCopyStyle,
} from "./thaiSalesCopyVariation";

export const IN_CHAT_CURATED_TITLE = "บทเกณฑ์คัดสรรของน้องเอ";

export const IN_CHAT_CURATED_FORBIDDEN =
  /(?:ล้านเปอร์เซ็นต์|ทนทานที่สุด|พละกำลังเหนือระดับ|บำรุงรักษาง่ายที่สุด|คันนี้มีคนทัก|ไม่เคยชน|ไม่จุกจิกแน่นอน|ดึงใจชัวร์|รวยแน่นอน|เครื่องดีแน่นอน|สีเดิมแน่นอน)/i;

export interface InChatCuratedAnalysis {
  title: string;
  opening: string;
  highlights: string;
  closing: string;
  paragraphs: string[];
}

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

function imageCount(car: ChatCarCardData): number {
  const urls = (car.imageUrls ?? []).filter((u) => typeof u === "string" && u.trim());
  if (urls.length > 0) return urls.length;
  return car.hasImage && car.imageUrl?.trim() ? 1 : 0;
}

export function assertInChatCuratedSafe(text: string): void {
  if (BUYER_PITCH_FORBIDDEN_CLAIM.test(text) || IN_CHAT_CURATED_FORBIDDEN.test(text)) {
    throw new Error(`Forbidden curated claim: ${text.slice(0, 100)}`);
  }
  if (/\bหนู\b/.test(text)) {
    throw new Error("Curated copy must use น้องเ not หนู");
  }
}

function resolveBuyerWeavePrefix(ctx: InChatBuyerContext | null): string {
  if (!ctx) return "";
  const msg = ctx.message ?? "";
  const tags = ctx.usageTags ?? [];

  if (
    tags.includes("firstCar") ||
    /รถคันแรก|คันแรกของชีวิต|รถคันแรกของ/.test(msg)
  ) {
    return "โจทย์รถคันแรกที่เล่าไว้ — ";
  }
  if (
    tags.includes("family") ||
    (ctx.seatsMin ?? 0) >= 7 ||
    /ครอบครัว|7\s*ที่นั่ง|mp[v]|อเนกประสงค์/i.test(msg)
  ) {
    return "มุมครอบครัวที่ถามมา — ";
  }
  if (tags.includes("fuelEfficient") || /ประหยัด|น้ำมัน/i.test(msg)) {
    return "โจทย์ประหยัดน้ำมัน — ";
  }
  if (tags.includes("city") || /ในเมือง|เมือง|commute/i.test(msg)) {
    return "โจทย์ใช้งานในเมือง — ";
  }
  if (ctx.budgetMax != null) {
    return `งบไม่เกิน ${formatPrice(ctx.budgetMax)} บาท — `;
  }
  return "";
}

function findStoredPitchLine(carId: string): string | undefined {
  const ctx = loadChatSearchContext();
  if (!ctx?.allCars?.length || !ctx.pitchLines?.length) return undefined;
  const idx = ctx.allCars.findIndex((c) => c.id === carId);
  if (idx < 0 || !ctx.pitchLines[idx]?.trim()) return undefined;
  return ctx.pitchLines[idx].trim();
}

function buildOpening(
  car: ChatCarCardData,
  weave: string,
  seed: string
): string {
  const label = `${car.brand} ${car.model} ปี ${car.year}`.trim();
  const storedPitch = findStoredPitchLine(car.id);
  if (storedPitch) {
    const text = `${weave}น้องเอสรุปจากข้อมูลในระบบนะครับ — ${storedPitch}`;
    assertInChatCuratedSafe(text);
    return text;
  }

  const style = inferThaiCopyStyle({
    brand: car.brand,
    model: car.model,
    price: car.price,
    bodyClassLabel: car.bodyClassLabel,
    showroomName: car.showroomName,
  });

  const byStyle: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [
      `${weave}คัน ${label} มีฟีลรถที่ภาพลักษณ์ดูดีตามสเปกในระบบ — ถ้าคุณพี่มองหารถที่ใช้ได้จริงในงบนี้ คันนี้น่าเปิดดูต่อครับ`,
      `${weave}จากข้อมูลที่มี ${label} เป็นตัวเลือกที่น่าสนใจในมุมสเปกและราคาที่ลงประกาศไว้ครับ`,
    ],
    honestOwner: [
      `${weave}คัน ${label} ฟีลรถใช้งานจริงตามที่ประกาศไว้ — น้องเอว่าน่าเก็บไว้พิจารณาถ้าสเปกตรงใจครับ`,
      `${weave}ถ้ามองรถบ้านที่ใช้งานได้จริง ${label} มีจังหวะเข้าทางโจทย์จากข้อมูลในระบบครับ`,
    ],
    valueEase: [
      `${weave}คัน ${label} มุมคุ้มค่าและใช้งานประจำวัน — ถ้าคุมงบและอยากได้รถขับง่าย คันนี้น่าดูต่อครับ`,
      `${weave}จากข้อมูลในระบบ ${label} เหมาะกับคนที่อยากได้รถใช้งานจริงในงบไม่กดดันเกินไปครับ`,
    ],
    familyMpv: [
      `${weave}คัน ${label} มุมครอบครัว/อเนกประสงค์ชัด — พื้นที่และสเปกในระบบเข้าทางโจทย์ที่ถามมาครับ`,
      `${weave}ถ้าต้องการรถช่วยพาครอบครัว ${label} จากข้อมูลประกาศน่าสนใจครับ`,
    ],
    urbanWorker: [
      `${weave}คัน ${label} ฟีลรถใช้งานเมือง — ขับไปทำงานหรือใช้ประจำวันได้คล่องตามสเปกที่มีครับ`,
      `${weave}สำหรับคนทำงานในเมือง ${label} มีจังหวะเข้ากับโจทย์จากข้อมูลในระบบครับ`,
    ],
    dealerPro: [
      `${weave}จากสต๊อกในระบบ ${label} เป็นตัวเลือกที่น้องเออยากให้เปิดดูต่อ — สเปกตามที่ลงประกาศครับ`,
      `${weave}คัน ${label} จากข้อมูลประกาศในระบบ น่าสนใจถ้าตรงสไตล์ที่ต้องการครับ`,
    ],
    gentleHook: [
      `${weave}คัน ${label} น้องเอว่ามีจุดที่น่าสนใจจากข้อมูลในระบบ — ลองไล่ดูสเปกและรูปด้านล่างก่อนตัดสินใจครับ`,
      `${weave}จากที่ลงประกาศไว้ ${label} เป็นตัวเลือกที่ควรพิจารณาถ้าสเปกตรงใจครับ`,
    ],
  };

  const text = pickStableVariant(seed, "curated.open", byStyle[style]);
  assertInChatCuratedSafe(text);
  return text;
}

function buildHighlights(car: ChatCarCardData, seed: string): string {
  const lines: string[] = [];
  const label = `${car.brand} ${car.model}`.trim();

  if (car.price > 0) {
    lines.push(`• ราคา ${formatPrice(car.price)} บาท ตามที่ลงประกาศในระบบ`);
  }
  if (car.mileage > 0) {
    const note =
      car.mileage < 50_000
        ? "เลขไมล์ยังดูไม่สูงเมื่อเทียบปี (ตามที่ระบุ)"
        : "ควรเทียบกับปีและสภาพที่เห็นจริง";
    lines.push(`• ไมล์ ${formatPrice(car.mileage)} กม. — ${note}`);
  }
  if (car.bodyClassLabel?.trim()) {
    lines.push(`• ตัวถัง ${car.bodyClassLabel} — เหมาะกับสไตล์การใช้งานที่ถามมา`);
  }
  if (car.transmission?.trim()) {
    lines.push(`• เกียร์ ${car.transmission} ตามข้อมูลประกาศ`);
  }
  if (car.color?.trim()) {
    lines.push(`• สี${car.color} ตามที่ระบุในระบบ`);
  }

  const imgs = imageCount(car);
  if (imgs >= 3) {
    lines.push(`• มีรูปในระบบ ${imgs} มุม — ช่วยให้เห็นภาพรวมก่อนนัดดูจริง`);
  } else if (imgs === 1 || imgs === 2) {
    lines.push(`• มีรูปในระบบ ${imgs} มุม — แนะนำขอดูรูปเพิ่มหรือนัดดูรถจริงถ้าสนใจจริง`);
  } else {
    lines.push("• ยังไม่มีรูปในระบบ — แนะนำขอดูรูป/นัดดูรถจริงเพิ่มครับ");
  }

  if (car.description?.trim()) {
    const snippet = car.description.trim();
    const preview =
      snippet.length > 100 ? `${snippet.slice(0, 98).trim()}…` : snippet;
    lines.push(`• จากรายละเอียดประกาศ: ${preview}`);
  }

  if (car.matchKind === "alternative") {
    lines.push("• คันนี้เป็น «ทางเลือกใกล้เคียง» ไม่ใช่ตรงเงื่อนไขทุกข้อ — ลองเทียบกับคันอื่นในแชทได้");
  }

  const intro = pickStableVariant(seed, "curated.highlightsIntro", [
    `จุดที่น้องเอเห็นจากข้อมูล ${label}:`,
    `ไล่สเปกที่น่าสนใจจาก ${label} ให้ครับ:`,
    `สรุปจุดเด่นจากข้อมูลในระบบ (${label}):`,
  ] as const);

  const body = lines.slice(0, 5).join("\n");
  const text = `${intro}\n${body}`;
  assertInChatCuratedSafe(text);
  return text;
}

function buildClosing(_car: ChatCarCardData, seed: string): string {
  const withCheer = pickStableVariant(seed, "curated.cheer", ["yes", "no", "no"] as const) === "yes";
  const base = pickStableVariant(seed, "curated.closing", [
    "ถ้าถูกใจในภาพรวม น้องเอแนะนำนัดดูรถจริง ตรวจเอกสาร และทดลองขับอีกชั้นก่อนตัดสินใจนะครับ",
    "น้องเอให้แค่มุมจากข้อมูลในระบบเท่านั้น — ควรตรวจรถจริงและประวัติดูแลรักษาเพิ่มถ้าสนใจจริงครับ",
    "ลองเทียบกับคันอื่นในแชทได้เลย ถ้าอยากให้น้องเอช่วยไล่จุดที่ควรดูเพิ่ม ถามต่อได้ครับ",
  ] as const);
  const text = withCheer ? `${base} ปังปุริเย่!` : base;
  assertInChatCuratedSafe(text);
  return text;
}

/**
 * Build warm curated analysis for expanded in-chat car detail.
 */
export function buildInChatCuratedAnalysis(
  car: ChatCarCardData,
  buyerContext?: InChatBuyerContext | null
): InChatCuratedAnalysis {
  const ctx =
    buyerContext ??
    (typeof sessionStorage !== "undefined" ? loadInChatBuyerContext() : null);
  const weave = resolveBuyerWeavePrefix(ctx);
  const seed = buildStableSeed([car.id, weave, ctx?.message ?? "", car.brand, car.model]);

  const opening = buildOpening(car, weave, seed);
  const highlights = buildHighlights(car, seed);
  const closing = buildClosing(car, seed);

  return {
    title: IN_CHAT_CURATED_TITLE,
    opening,
    highlights,
    closing,
    paragraphs: [opening, highlights, closing],
  };
}
