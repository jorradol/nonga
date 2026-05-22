/**
 * Phase 7.4 — สไตล์โพสต์ขายรถ Nong A
 * Logic helper แปลง style → prompt instruction (ไม่เรียก API)
 */

export type CarPostStyle =
  | "direct_sale"
  | "home_trust"
  | "luxury_premium"
  | "youth_fun"
  | "family_safe"
  | "pickup_work"
  | "finance_easy"
  | "tiktok_short"
  | "marketplace_quick";

/** ค่าเริ่มต้น: Marketplace อ่านง่าย ตัดสินใจไว */
export const DEFAULT_CAR_POST_STYLE: CarPostStyle = "marketplace_quick";

export interface PostStyleOption {
  id: CarPostStyle;
  label: string;
  shortDesc: string;
  emoji: string;
}

export interface PostStyleInstruction {
  id: CarPostStyle;
  label: string;
  tone: string;
  targetEmotion: string;
  sentenceLength: string;
  ctaStyle: string;
  hashtagStyle: string;
  writingGuidelines: string[];
}

export const CAR_POST_STYLE_OPTIONS: PostStyleOption[] = [
  {
    id: "direct_sale",
    label: "ขายตรง ปิดการขายไว",
    shortDesc: "ชัด กระชับ เน้นทักแชทและนัดดูรถ",
    emoji: "🎯",
  },
  {
    id: "home_trust",
    label: "รถบ้าน อบอุ่น น่าเชื่อถือ",
    shortDesc: "เป็นกันเอง เน้นความสบายใจ",
    emoji: "🏠",
  },
  {
    id: "luxury_premium",
    label: "หรูหรา พรีเมียม",
    shortDesc: "ภาษาดูดี สุภาพ ไม่เว่อร์",
    emoji: "💎",
  },
  {
    id: "youth_fun",
    label: "วัยรุ่น สนุก ขับเท่",
    shortDesc: "มีพลัง อ่านสนุก น่าเชื่อถือ",
    emoji: "⚡",
  },
  {
    id: "family_safe",
    label: "ครอบครัว ปลอดภัย ใช้งานจริง",
    shortDesc: "คุ้มค่า สบาย ใช้งานจริง",
    emoji: "👨‍👩‍👧",
  },
  {
    id: "pickup_work",
    label: "กระบะทำงาน คุ้มค่า ทนทาน",
    shortDesc: "เน้นใช้งาน บรรทุก คุ้มค่า",
    emoji: "🛻",
  },
  {
    id: "finance_easy",
    label: "ไฟแนนซ์ ผ่อนสบาย",
    shortDesc: "สอบถามค่างวด/ดาวน์ได้ ไม่รับประกันอนุมัติ",
    emoji: "💳",
  },
  {
    id: "tiktok_short",
    label: "TikTok Caption สั้น กระแทกใจ",
    shortDesc: "สั้น มี hook แรง เหมาะคอนเทนต์",
    emoji: "🎬",
  },
  {
    id: "marketplace_quick",
    label: "Marketplace อ่านง่าย ตัดสินใจไว",
    shortDesc: "ข้อมูลครบ อ่านง่าย ไม่ยืดเยื้อ",
    emoji: "📋",
  },
];

const STYLE_INSTRUCTIONS: Record<CarPostStyle, Omit<PostStyleInstruction, "id" | "label">> = {
  direct_sale: {
    tone: "ตรงไปตรงมา มืออาชีพ กระชับ",
    targetEmotion: "อยากตัดสินใจเร็ว รู้สึกว่าติดต่อได้ทันที",
    sentenceLength: "ประโยคสั้น ย่อหน้าสั้น ไม่เว้นยาว",
    ctaStyle: "ชวนทักแชท นัดดูรถ ขอรายละเอียดทันที — เน้นความเร่งด่วนแบบสุภาพ",
    hashtagStyle: "แฮชแท็ก 8-10 คำ เน้นคำค้นหารถมือสองและยี่ห้อรุ่น",
    writingGuidelines: [
      "เปิดโพสต์ด้วยประโยคชัดว่าขายรถอะไร ราคาเท่าไร (ถ้ามีข้อมูล)",
      "เน้นจุดเด่น 3-4 ข้อแบบ bullet",
      "ปิดด้วย CTA ชัดเจน เช่น ทักแชท / นัดดูรถวันนี้",
      "หลีกเลี่ยงคำโอ้อวดหรือคำรับประกันเกินจริง",
    ],
  },
  home_trust: {
    tone: "อบอุ่น เป็นกันเอง น่าเชื่อถือ",
    targetEmotion: "รู้สึกปลอดภัย เหมือนซื้อจากคนรู้จัก",
    sentenceLength: "ปานกลาง อ่านลื่น ไม่เป็นทางการเกินไป",
    ctaStyle: "ชวนคุยสบาย ๆ สอบถามรายละเอียด นัดดูรถตามสะดวก",
    hashtagStyle: "แฮชแท็็ก 8-12 คำ เน้นรถบ้าน มือเดียว สภาพดี",
    writingGuidelines: [
      "เล่าเหตุผลที่ขายแบบจริงใจ (ถ้ามีข้อมูลจากผู้ขาย)",
      "เน้นความสบายใจ การดูแลรถ และความโปร่งใส",
      "ใช้ภาษาอ่อนโยน ไม่กดดันผู้ซื้อ",
    ],
  },
  luxury_premium: {
    tone: "หรูหรา สุภาพ พรีเมียม",
    targetEmotion: "รู้สึกได้ภาพลักษณ์และคุณภาพ",
    sentenceLength: "ประโยคเรียบ สละสลวย ไม่ยาวเกินไป",
    ctaStyle: "เชิญสอบถามรายละเอียด นัดชมตัวจริงอย่างเป็นทางการ",
    hashtagStyle: "แฮชแท็ก 8-12 คำ เน้น Luxury Premium แบรนด์",
    writingGuidelines: [
      "เน้นความสง่างาม สเปก และความพิถีพิถันในการดูแล (ตามข้อมูลที่มี)",
      "หลีกเลี่ยงคำเว่อร์ เช่น ที่สุด ดีที่สุด ถูกที่สุด",
      "ไม่ใช้สแลงวัยรุ่นหนัก ๆ",
    ],
  },
  youth_fun: {
    tone: "สนุก มีพลัง ขับเท่ แต่น่าเชื่อถือ",
    targetEmotion: "ตื่นเต้น อยากทักถาม รู้สึกว่ารถมีสไตล์",
    sentenceLength: "สั้นปานกลาง มีจังหวะ อ่านเพลิน",
    ctaStyle: "ชวนทัก สอบถาม นัดดูตัวจริงแบบสบาย ๆ",
    hashtagStyle: "แฮชแท็ก 10-15 คำ ผสมเทรนด์และรถมือสอง",
    writingGuidelines: [
      "ใช้คำที่สนุกได้บ้าง แต่ยังคงความน่าเชื่อถือ",
      "เน้นสไตล์ ของแต่ง ความรู้สึกในการขับ (ตามข้อมูล)",
      "ห้ามกลายเป็นโฆษณาเกินจริง",
    ],
  },
  family_safe: {
    tone: "อบอุ่น มั่นใจ เน้นครอบครัว",
    targetEmotion: "รู้สึกปลอดภัย คุ้มค่า ใช้งานจริงได้",
    sentenceLength: "ปานกลาง ชัดเจน เป็นข้อ ๆ",
    ctaStyle: "ชวนสอบถาม นัดดูรถพร้อมครอบครัวได้",
    hashtagStyle: "แฮชแท็ก 8-12 คำ เน้นครอบครัว SUV MPV",
    writingGuidelines: [
      "เน้นพื้นที่ ความสบาย ความคุ้มค่า การใช้งานจริง",
      "กล่าวถึงความปลอดภัยแบบสุภาพ ไม่ฟันธงเรื่องที่ไม่มีข้อมูล",
    ],
  },
  pickup_work: {
    tone: "จริงจัง ใช้งานได้ คุ้มค่า ทนทาน",
    targetEmotion: "มั่นใจว่าใช้งานธุรกิจหรืองานหนักได้",
    sentenceLength: "กระชับ เน้นข้อเท็จจริง",
    ctaStyle: "ชวนสอบถามสภาพการใช้งาน นัดดูรถทดลองได้",
    hashtagStyle: "แฮชแท็ก 8-12 คำ เน้นกระบะ รถใช้งาน",
    writingGuidelines: [
      "เน้นความทนทาน การบรรทุก ความคุ้มค่าในงาน",
      "ระบุเลขไมล์และสภาพตามที่ผู้ขายให้เท่านั้น",
    ],
  },
  finance_easy: {
    tone: "เป็นมิตร ชัดเจน เน้นความคุ้มค่า",
    targetEmotion: "รู้สึกว่าสอบถามเรื่องผ่อนได้ ไม่กดดัน",
    sentenceLength: "ปานกลาง อธิบายง่าย",
    ctaStyle: "ชวนสอบถามเงื่อนไขดาวน์/ค่างวด/โปรโมชั่นที่มี (ถ้ามีข้อมูลจากผู้ขาย)",
    hashtagStyle: "แฮชแท็ก 8-12 คำ เน้นรถมือสอง ผ่อนได้",
    writingGuidelines: [
      "เน้นว่าสามารถสอบถามเรื่องไฟแนนซ์หรือการผ่อนได้",
      "ห้ามใช้คำว่า อนุมัติแน่นอน ผ่านแน่นอน หรือรับประกันอนุมัติ",
      "ห้ามระบุอัตราดอกเบี้ยหรือค่างวดถ้าผู้ขายไม่ได้ให้ข้อมูล",
    ],
  },
  tiktok_short: {
    tone: "สั้น กระแทกใจ มี hook แรง",
    targetEmotion: "หยุดเลื่อน อยากทักถามทันที",
    sentenceLength: "สั้นมาก 1-3 บรรทัดหลัก + bullet สั้น",
    ctaStyle: "CTA สั้น กระชับ เช่น ทักเลย / สนใจพิมพ์มา",
    hashtagStyle: "แฮชแท็ก 10-15 คำ เน้น TikTok รถมือสอง เทรนด์",
    writingGuidelines: [
      "เปิดด้วย hook แรง 1 ประโยค",
      "เนื้อหาหลักไม่เกิน 5-6 บรรทัด",
      "เหมาะคัดลอกไปใช้เป็น TikTok caption",
    ],
  },
  marketplace_quick: {
    tone: "ชัดเจน เป็นระเบียบ อ่านง่าย",
    targetEmotion: "เข้าใจรถได้ภายใน 30 วินาที อยากทักถาม",
    sentenceLength: "สั้นถึงกลาง แบ่งหัวข้อชัด",
    ctaStyle: "CTA ชัด: ทักแชท / นัดดูรถ / ขอรายละเอียด",
    hashtagStyle: "แฮชแท็ก 8-15 คำ ครบ เน้น Marketplace และคำค้นหา",
    writingGuidelines: [
      "จัดโครงสร้าง 8 ส่วนตาม Marketing Brain",
      "ใส่ข้อมูลสำคัญ: ยี่ห้อ รุ่น ปี ราคา ไมล์ สภาพ (ตามที่มี)",
      "ไม่ยืดเยื้อ ไม่ซ้ำประโยค",
      "เหมาะ Facebook Marketplace",
    ],
  },
};

const GLOBAL_BANNED_PHRASES = [
  'ห้ามใช้ "ถูกที่สุด", "ดีที่สุด", "อนุมัติแน่นอน", "ผ่านแน่นอน"',
  'ห้ามใช้ "ไม่เคยชน", "ไมล์แท้" ถ้าไม่มีข้อมูลยืนยันจากผู้ขาย',
  "ห้ามสร้างข้อมูลที่ผู้ขายไม่ได้กรอก",
  "ห้ามรับประกันไฟแนนซ์ผ่านแน่นอน",
];

/** ดึงคำแนะนำสไตล์แบบ structured */
export function getPostStyleInstruction(style: CarPostStyle): PostStyleInstruction {
  const option = CAR_POST_STYLE_OPTIONS.find((o) => o.id === style);
  const base = STYLE_INSTRUCTIONS[style];
  return {
    id: style,
    label: option?.label ?? style,
    ...base,
  };
}

/** แปลง style เป็นข้อความสำหรับแนบใน AI prompt */
export function formatPostStyleForPrompt(style: CarPostStyle): string {
  const inst = getPostStyleInstruction(style);
  return [
    "[AI Post Style — แนวโพสต์ขายรถที่ผู้ขายเลือก]",
    `สไตล์: ${inst.label}`,
    `โทนเสียง (tone): ${inst.tone}`,
    `อารมณ์เป้าหมาย (target emotion): ${inst.targetEmotion}`,
    `ความยาวประโยค: ${inst.sentenceLength}`,
    `แนว CTA: ${inst.ctaStyle}`,
    `แนวแฮชแท็ก: ${inst.hashtagStyle}`,
    "",
    "แนวทางการเขียน:",
    ...inst.writingGuidelines.map((g) => `- ${g}`),
    "",
    "ข้อห้ามทั่วไป:",
    ...GLOBAL_BANNED_PHRASES.map((b) => `- ${b}`),
  ].join("\n");
}

/** หา label ภาษาไทยจาก style id */
export function getPostStyleLabel(style: CarPostStyle): string {
  return CAR_POST_STYLE_OPTIONS.find((o) => o.id === style)?.label ?? style;
}
