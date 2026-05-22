/**
 * Phase 7.5 — Regenerate Post modes
 * แปลงโหมดสร้างใหม่ → AI instruction (ไม่เรียก API)
 */

import { CarPostStyle } from "./postStyle";

export type CarPostRegenerateMode =
  | "regenerate_same_style"
  | "regenerate_more_aggressive"
  | "regenerate_shorter"
  | "regenerate_more_emotional"
  | "regenerate_tiktok"
  | "regenerate_marketplace";

export interface RegenerateModeOption {
  id: CarPostRegenerateMode;
  label: string;
  shortLabel: string;
  emoji: string;
}

export interface RegenerateInstruction {
  mode: CarPostRegenerateMode;
  label: string;
  tone: string;
  sentenceLength: string;
  ctaStyle: string;
  emotionalLevel: string;
  hashtagStyle: string;
  directives: string[];
  /** สไตล์โพสต์ที่ใช้จริงเมื่อ regenerate (บางโหมด override) */
  effectivePostStyle?: CarPostStyle;
}

export const REGENERATE_MODE_OPTIONS: RegenerateModeOption[] = [
  {
    id: "regenerate_same_style",
    label: "สร้างใหม่แนวเดิม",
    shortLabel: "แนวเดิม",
    emoji: "🔄",
  },
  {
    id: "regenerate_more_aggressive",
    label: "ขายแรงขึ้น",
    shortLabel: "ขายแรง",
    emoji: "🔥",
  },
  {
    id: "regenerate_shorter",
    label: "สั้นลง",
    shortLabel: "สั้นลง",
    emoji: "✂️",
  },
  {
    id: "regenerate_more_emotional",
    label: "อบอุ่นขึ้น",
    shortLabel: "อบอุ่น",
    emoji: "💛",
  },
  {
    id: "regenerate_tiktok",
    label: "TikTok",
    shortLabel: "TikTok",
    emoji: "🎬",
  },
  {
    id: "regenerate_marketplace",
    label: "Marketplace",
    shortLabel: "Marketplace",
    emoji: "📋",
  },
];

const GLOBAL_SAFETY_RULES = [
  'ห้ามใช้ "ถูกที่สุด", "ดีที่สุด", "อนุมัติแน่นอน", "ผ่านแน่นอน"',
  'ห้ามใช้ "ไม่เคยชน", "ไมล์แท้" ถ้าไม่มีข้อมูลยืนยัน',
  "ห้ามสร้างข้อมูลที่ผู้ขายไม่ได้กรอก",
  "สร้างโพสต์ใหม่ที่แตกต่างจากเวอร์ชันก่อน แต่ใช้ข้อมูลเดิมเท่านั้น",
];

const MODE_INSTRUCTIONS: Record<
  CarPostRegenerateMode,
  Omit<RegenerateInstruction, "mode" | "label">
> = {
  regenerate_same_style: {
    tone: "คงโทนเดิมตาม Post Style ที่เลือก",
    sentenceLength: "ความยาวใกล้เคียงเดิม",
    ctaStyle: "CTA ชัดเจนแบบเดิม ใช้ถ้อยคำใหม่",
    emotionalLevel: "ปานกลาง",
    hashtagStyle: "แฮชแท็ก 8-15 คำ ชุดใหม่ที่เกี่ยวข้อง",
    directives: [
      "เขียนโพสต์ใหม่ทั้งฉบับ ห้ามคัดลอกประโยคเดิมทุกประโยค",
      "คงโครงสร้าง 8 ส่วนตาม Marketing Brain",
    ],
  },
  regenerate_more_aggressive: {
    tone: "ตรง กระชับ กระตุ้นให้ทักทันที แต่ยังสุภาพ",
    sentenceLength: "สั้นถึงปานกลาง เน้นประโยคปิดการขาย",
    ctaStyle: "CTA ชัด เร่งด่วน เช่น ทักวันนี้ / นัดดูรถด่วน / สอบถามราคา",
    emotionalLevel: "สูงด้านการตัดสินใจ ไม่ก้าวร้าว",
    hashtagStyle: "แฮชแท็ก 8-12 คำ เน้นขายด่วน รถมือสอง",
    directives: [
      "เน้นจุดเด่นและเหตุผลที่ควรทักตอนนี้",
      "ห้ามใช้คำกดดันหรือคำรับประกันเกินจริง",
    ],
  },
  regenerate_shorter: {
    tone: "กระชับ อ่านเร็ว มืออาชีพ",
    sentenceLength: "สั้นมาก ตัดคำซ้ำ ไม่เกิน 60% ความยาวเดิม",
    ctaStyle: "CTA 1-2 บรรทัด สั้น ชัด",
    emotionalLevel: "ต่ำถึงปานกลาง เน้นข้อมูล",
    hashtagStyle: "แฮชแท็ก 8-10 คำ สั้น ตรงประเด็น",
    directives: [
      "เหลือเฉพาะ: หัวเปิด / สรุปรถ / จุดเด่น 3 ข้อ / CTA",
      "เหมาะผู้เลื่อนดู Marketplace เร็ว ๆ",
    ],
  },
  regenerate_more_emotional: {
    tone: "อบอุ่น เป็นกันเอง น่าเชื่อถือ",
    sentenceLength: "ปานกลาง มีจังหวะอ่านสบาย",
    ctaStyle: "ชวนคุยแบบสบาย ๆ นัดดูรถตามสะดวก",
    emotionalLevel: "สูง เน้นความไว้วางใจและความสบายใจ",
    hashtagStyle: "แฮชแท็ก 8-12 คำ เน้นรถบ้าน มือเดียว",
    effectivePostStyle: "home_trust",
    directives: [
      "เล่าเหตุผลที่รถคันนี้เหมาะกับชีวิตผู้ซื้อ (ตามข้อมูลที่มี)",
      "หลีกเลี่ยงภาษาขายแรงเกินไป",
    ],
  },
  regenerate_tiktok: {
    tone: "สั้น กระแทกใจ มีพลัง",
    sentenceLength: "สั้นมาก 3-6 บรรทัดหลัก + hashtag",
    ctaStyle: "CTA สั้น เช่น ทักเลย / สนใจพิมพ์มา",
    emotionalLevel: "สูงด้าน curiosity",
    hashtagStyle: "แฮชแท็ก 10-15 คำ เทรนด์ TikTok รถมือสอง",
    effectivePostStyle: "tiktok_short",
    directives: [
      "เปิดด้วย hook แรง 1 ประโยค",
      "ช่อง tiktok ต้องสั้นและพร้อมโพสต์",
      "facebook ยังครบแต่กระชับกว่าปกติ",
    ],
  },
  regenerate_marketplace: {
    tone: "ชัดเจน เป็นระเบียบ อ่านง่าย",
    sentenceLength: "สั้นถึงกลาง แบ่งหัวข้อชัด",
    ctaStyle: "CTA ชัด: ทักแชท / นัดดูรถ / ขอรายละเอียด",
    emotionalLevel: "ปานกลาง เน้นข้อมูล",
    hashtagStyle: "แฮชแท็ก 8-15 คำ เน้น Marketplace",
    effectivePostStyle: "marketplace_quick",
    directives: [
      "จัดโครงสร้าง 8 ส่วนชัดเจน",
      "เน้นยี่ห้อ รุ่น ปี ราคา ไมล์ สภาพ (ตามที่มี)",
      "ไม่ยืดเยื้อ",
    ],
  },
};

/** ดึงคำแนะนำ regenerate แบบ structured */
export function getRegenerateInstruction(
  mode: CarPostRegenerateMode
): RegenerateInstruction {
  const option = REGENERATE_MODE_OPTIONS.find((o) => o.id === mode);
  const base = MODE_INSTRUCTIONS[mode];
  return {
    mode,
    label: option?.label ?? mode,
    ...base,
  };
}

/** สไตล์โพสต์ที่ใช้เมื่อ regenerate (override หรือคงเดิม) */
export function resolveEffectivePostStyle(
  mode: CarPostRegenerateMode,
  currentStyle: CarPostStyle
): CarPostStyle {
  const inst = MODE_INSTRUCTIONS[mode];
  return inst.effectivePostStyle ?? currentStyle;
}

/** แปลง regenerate mode เป็นข้อความสำหรับ AI prompt */
export function formatRegenerateForPrompt(
  mode: CarPostRegenerateMode
): string {
  const inst = getRegenerateInstruction(mode);
  return [
    "[Regenerate Post — สร้างโพสต์ใหม่จากข้อมูลเดิม]",
    `โหมด: ${inst.label}`,
    `โทนเสียง: ${inst.tone}`,
    `ความยาวประโยค: ${inst.sentenceLength}`,
    `แนว CTA: ${inst.ctaStyle}`,
    `ระดับอารมณ์ (emotional): ${inst.emotionalLevel}`,
    `แนวแฮชแท็ก: ${inst.hashtagStyle}`,
    "",
    "คำสั่งเพิ่มเติม:",
    ...inst.directives.map((d) => `- ${d}`),
    "",
    "ข้อห้ามความปลอดภัย:",
    ...GLOBAL_SAFETY_RULES.map((r) => `- ${r}`),
  ].join("\n");
}
