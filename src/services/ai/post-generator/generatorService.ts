import {
  CarSpecsInput,
  GeneratorOptions,
  FollowUpQuestion,
  GeneratedPosts,
} from "../../../types/ai/post-generator";
import {
  buildCarMarketingBrain,
  CarMarketingBrainResult,
  CarMarketingInput,
} from "./marketingBrain";
import {
  CarPostStyle,
  DEFAULT_CAR_POST_STYLE,
  formatPostStyleForPrompt,
} from "./postStyle";
import {
  CarPostRegenerateMode,
  formatRegenerateForPrompt,
  resolveEffectivePostStyle,
} from "./regenerateStyle";
import {
  fetchWithTimeout,
  sanitizeGeneratedPosts,
  validateCarSpecsInput,
} from "./apiHelpers";

const MARKETING_BRAIN_ANSWER_KEY =
  "[AI Marketing Brain — ข้อมูลนักการตลาดรถมือสอง]";
const POST_STYLE_ANSWER_KEY =
  "[AI Post Style — แนวโพสต์ขายรถที่เลือก]";
const REGENERATE_ANSWER_KEY =
  "[Regenerate Post — สร้างโพสต์ใหม่จากข้อมูลเดิม]";

/** แปลง CarSpecsInput + คำตอบ follow-up → CarMarketingInput */
export function mapSpecsToMarketingInput(
  specs: CarSpecsInput,
  questions: FollowUpQuestion[] = []
): CarMarketingInput {
  const answerLines = questions
    .filter((q) => q.answer?.trim())
    .map((q) => `${q.questionText}: ${q.answer!.trim()}`)
    .join("\n");

  return {
    brand: specs.brand || undefined,
    model: specs.model || undefined,
    year: specs.year || undefined,
    price: specs.price > 0 ? specs.price : undefined,
    mileage: specs.mileage >= 0 ? specs.mileage : undefined,
    fuelType: specs.fuelType || undefined,
    color: specs.color || undefined,
    condition: specs.condition || undefined,
    highlights: specs.highlights || undefined,
    modifications: specs.modifications || undefined,
    additionalDetails: answerLines || undefined,
  };
}

/** สร้าง Marketing Brain — fallback เป็น null ถ้า logic พัง */
export function safeBuildMarketingBrain(
  specs: CarSpecsInput,
  questions: FollowUpQuestion[] = []
): CarMarketingBrainResult | null {
  try {
    return buildCarMarketingBrain(mapSpecsToMarketingInput(specs, questions));
  } catch {
    return null;
  }
}

/** จัดรูปแบบ Marketing Brain สำหรับแนบใน AI prompt */
export function formatMarketingBrainForPrompt(
  brain: CarMarketingBrainResult
): string {
  return [
    "[AI Marketing Brain — ใช้เป็นข้อมูลอ้างอิงเท่านั้น ห้ามอ้างเกินข้อมูลที่ผู้ขายไม่ได้ระบุ]",
    "",
    `ประเภทรถ: ${brain.carType}`,
    "",
    "กลุ่มลูกค้าเป้าหมาย:",
    ...brain.targetBuyer.map((t) => `- ${t}`),
    "",
    "จุดขาย:",
    ...brain.sellingPoints.map((t) => `- ${t}`),
    "",
    "Pain point ผู้ซื้อ (ตอบข้อกังวลอย่างสุภาพ ไม่ฟันธง):",
    ...brain.buyerPainPoints.map((t) => `- ${t}`),
    "",
    "Hook เปิดโพสต์ (เลือกใช้ 1):",
    ...brain.hooks.map((t) => `- ${t}`),
    "",
    "Selling angles:",
    ...brain.sellingAngles.map((t) => `- ${t}`),
    "",
    "CTA แนะนำ:",
    ...brain.callToAction.map((t) => `- ${t}`),
    "",
    `คำปิดท้ายน้องเอ: ${brain.closingBlessing}`,
    "",
    "โครงสร้างโพสต์ Facebook ที่ต้องมี (8 ส่วน):",
    "1. หัวเปิดโพสต์ให้น่าสนใจ",
    "2. สรุปรถแบบเข้าใจง่าย",
    "3. จุดเด่นที่ลูกค้าควรรู้",
    "4. เหมาะกับใคร",
    "5. เหตุผลที่ควรทักมาสอบถาม",
    "6. CTA (นัดดูรถ / ขอรายละเอียด / ทักแชท)",
    "7. ปิดท้ายคำอวยพรสไตล์น้องเอ",
    "8. Hashtag 8-15 คำ",
    "",
    'ข้อห้าม: ห้ามใช้ "ถูกที่สุด", "ดีที่สุด", "ไม่เคยชน", "ไมล์แท้" (ถ้าไม่มีข้อมูลยืนยัน), ห้ามรับประกันไฟแนนซ์ผ่านแน่นอน, ห้ามสร้างข้อมูลที่ผู้ขายไม่ได้กรอก',
    "มาตรฐาน: ภาษาไทย อ่านง่าย เหมาะ Facebook Marketplace น้ำเสียงมืออาชีพเป็นกันเอง มีเสน่ห์แบบน้องเอ ไม่เว่อร์เกินจริง",
  ].join("\n");
}

/** สรุป Marketing Brain แบบย่อสำหรับ customNotes / prompt เสริม */
export function summarizeMarketingBrainForPrompt(
  brain: CarMarketingBrainResult
): string {
  return [
    "[สรุป Marketing Brain]",
    `ประเภทรถ: ${brain.carType}`,
    `กลุ่มลูกค้า: ${brain.targetBuyer.slice(0, 3).join(", ")}`,
    `จุดขาย: ${brain.sellingPoints.slice(0, 3).join(" | ")}`,
    `Hook: ${brain.hooks[0] ?? ""}`,
    `CTA: ${brain.callToAction[0] ?? ""}`,
  ].join("\n");
}

/** รวม style + brain + หมายเหตุผู้ขาย สำหรับฟอร์มขายรถ (ไม่แก้ store/server) */
export function buildAIDescriptionContext(
  input: CarMarketingInput,
  postStyle: CarPostStyle = DEFAULT_CAR_POST_STYLE,
  userNotes?: string,
  regenerateMode?: CarPostRegenerateMode | null
): string {
  const effectiveStyle = regenerateMode
    ? resolveEffectivePostStyle(regenerateMode, postStyle)
    : postStyle;

  const parts: string[] = [formatPostStyleForPrompt(effectiveStyle)];

  if (regenerateMode) {
    parts.push(formatRegenerateForPrompt(regenerateMode));
  }

  try {
    const brain = buildCarMarketingBrain(input);
    parts.push(summarizeMarketingBrainForPrompt(brain));
  } catch {
    /* Marketing Brain fallback */
  }
  if (userNotes?.trim()) {
    parts.push(`[ไอเดียจากผู้ขาย]\n${userNotes.trim()}`);
  }
  return parts.join("\n\n");
}

/** รวมคำตอบ follow-up + Marketing Brain + Post Style + Regenerate สำหรับส่ง API */
function buildAnswersPayload(
  questions: FollowUpQuestion[],
  brain: CarMarketingBrainResult | null,
  postStyle: CarPostStyle = DEFAULT_CAR_POST_STYLE,
  regenerateMode?: CarPostRegenerateMode | null
): Array<{ questionText: string; answer: string }> {
  const base = questions.map((q) => ({
    questionText: q.questionText,
    answer: q.answer || "ไม่ได้ระบุ",
  }));

  const effectiveStyle = regenerateMode
    ? resolveEffectivePostStyle(regenerateMode, postStyle)
    : postStyle;

  const extras: Array<{ questionText: string; answer: string }> = [
    {
      questionText: POST_STYLE_ANSWER_KEY,
      answer: formatPostStyleForPrompt(effectiveStyle),
    },
  ];

  if (regenerateMode) {
    extras.push({
      questionText: REGENERATE_ANSWER_KEY,
      answer: formatRegenerateForPrompt(regenerateMode),
    });
  }

  if (brain) {
    extras.push({
      questionText: MARKETING_BRAIN_ANSWER_KEY,
      answer: formatMarketingBrainForPrompt(brain),
    });
  }

  return [...base, ...extras];
}

/** สร้างโพสต์ fallback จาก Marketing Brain (เมื่อ API ล้มเหลว) */
function buildMarketingBrainFallbackPosts(
  specs: CarSpecsInput,
  brain: CarMarketingBrainResult | null
): GeneratedPosts {
  const brand = specs.brand || "รถคันนี้";
  const model = specs.model || "";
  const label = model ? `${brand} ${model}` : brand;
  const year = specs.year ? ` ปี ${specs.year}` : "";
  const price =
    specs.price > 0
      ? `฿${specs.price.toLocaleString("th-TH")}`
      : "สอบถามราคาได้";
  const mileage =
    specs.mileage >= 0
      ? `${specs.mileage.toLocaleString("th-TH")} กม.`
      : "ตามที่ระบุในโพสต์";

  const hook = brain?.hooks[0] ?? `มาดู ${label}${year} กันครับ`;
  const sellingBullets = (brain?.sellingPoints ?? []).slice(0, 4);
  const targetBullets = (brain?.targetBuyer ?? []).slice(0, 3);
  const reasonBullets = (brain?.sellingAngles ?? []).slice(0, 2);
  const cta = brain?.callToAction[0] ?? "ทักแชทสอบถามรายละเอียดเพิ่มเติมได้เลยครับ";
  const closing =
    brain?.closingBlessing ??
    "ขอให้ปิดดีลได้อย่างราบรื่นนะครับ — น้องเอเป็นกำลังใจให้ครับ";

  const highlights = specs.highlights || "ตามรายละเอียดที่ผู้ขายระบุ";
  const mods = specs.modifications || "ตามสภาพจริงที่แจ้งในโพสต์";

  const facebook = [
    hook,
    "",
    `## สรุปรถ`,
    `${label}${year} — ${brain?.carType ?? "รถมือสองที่น่าสนใจในตลาด"}`,
    `- ราคาเสนอ: ${price}`,
    `- เลขไมล์ที่ระบุ: ${mileage}`,
    `- สภาพ: ${specs.condition || "ตามที่ผู้ขายแจ้ง"}`,
    specs.color ? `- สี: ${specs.color}` : null,
    specs.fuelType ? `- เชื้อเพลิง: ${specs.fuelType}` : null,
    "",
    `## จุดเด่นที่ลูกค้าควรรู้`,
    ...sellingBullets.map((s) => `- ${s}`),
    `- จุดเด่นจากผู้ขาย: ${highlights}`,
    specs.modifications ? `- ของแต่ง/อุปกรณ์: ${mods}` : null,
    "",
    `## เหมาะกับใคร`,
    ...targetBullets.map((t) => `- ${t}`),
    "",
    `## เหตุผลที่ควรทักมาสอบถาม`,
    ...reasonBullets.map((r) => `- ${r}`),
    brain?.buyerPainPoints[0]
      ? `- เราเข้าใจข้อกังวล เช่น ${brain.buyerPainPoints[0]} — ทักมาคุยรายละเอียดก่อนตัดสินใจได้`
      : `- ขอรายละเอียดและนัดดูรถจริงก่อนตัดสินใจ`,
    "",
    `## ติดต่อ`,
    cta,
    brain?.callToAction[1] ? `- ${brain.callToAction[1]}` : null,
    "",
    closing,
  ]
    .filter(Boolean)
    .join("\n");

  const tags = [
    "รถมือสอง",
    "รถบ้าน",
    brand,
    model,
    "NongA",
    "FacebookMarketplace",
    ...(brain?.carType.includes("ไฟฟ้า") || brain?.carType.includes("EV")
      ? ["รถEV", "รถไฟฟ้า"]
      : []),
    ...(brain?.carType.includes("กระบะ") ? ["รถกระบะ"] : []),
    ...(brain?.carType.includes("ครอบครัว") ? ["รถครอบครัว"] : []),
  ].filter(Boolean);

  const uniqueTags = [...new Set(tags)].slice(0, 12);

  return {
    facebook,
    tiktok: `${hook} 🚘 ${label}${year} #รถมือสอง #รถบ้าน #${brand.replace(/\s/g, "")} #NongA`,
    seoDescription: `ขาย ${label}${year} รถมือสอง ${brain?.carType ?? ""} ราคา ${price} เลขไมล์ ${mileage} ${highlights}`.trim(),
    marketplaceTitle: `${label}${year} — ${brain?.hooks[0]?.slice(0, 40) ?? "รถมือสองน่าสนใจ"}`.slice(
      0,
      100
    ),
    shortCaption: `${label}${year} ${price} — ${cta}`,
    viralHook: brain?.hooks[1] ?? hook,
    closingCta: cta,
    tags: uniqueTags,
  };
}

/** Fallback เดิม (ไม่มี Marketing Brain) */
function buildLegacyFallbackPosts(specs: CarSpecsInput): GeneratedPosts {
  const formattedPrice =
    specs.price > 0 ? specs.price.toLocaleString("th-TH") : "สอบถามได้";
  const formattedMileage =
    specs.mileage >= 0 ? specs.mileage.toLocaleString("th-TH") : "ตามที่ระบุ";

  return {
    facebook: `## ${specs.brand} ${specs.model} ปี ${specs.year}\n\nรถมือสองที่น่าสนใจในตลาด — สอบถามรายละเอียดและนัดดูรถจริงก่อนตัดสินใจครับ\n\n- ราคาเสนอ: ฿${formattedPrice} บาท\n- เลขไมล์ที่ระบุ: ${formattedMileage} กม.\n- สภาพ: ${specs.condition || "ตามที่ผู้ขายแจ้ง"}\n- จุดเด่น: ${specs.highlights || "ตามรายละเอียดในโพสต์"}\n\nทักแชทสอบถามเพิ่มเติมได้เลยครับ`,
    tiktok: `รถน่าสนใจ! ${specs.brand} ${specs.model} ปี ${specs.year} #รถมือสอง #รถบ้าน #NongA`,
    seoDescription: `ขายรถมือสอง ${specs.brand} ${specs.model} ปี ${specs.year} ราคา ฿${formattedPrice} ไมล์ ${formattedMileage} กม.`,
    marketplaceTitle: `${specs.brand} ${specs.model} ${specs.year} รถมือสองน่าสนใจ`,
    shortCaption: `${specs.brand} ${specs.model} ปี ${specs.year} — ทักสอบถามราคาและรายละเอียด`,
    viralHook: `มาดู ${specs.brand} ${specs.model} กันครับ`,
    closingCta: `ทักแชทสอบถามรายละเอียดเพิ่มเติมได้เลยครับ`,
    tags: ["รถมือสอง", specs.brand, specs.model, "รถบ้าน", "NongA"],
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error("เซิร์ฟเวอร์ส่งคำตอบว่างเปล่า");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง");
  }
}

export const postGeneratorService = {
  getMarketingBrain(
    specs: CarSpecsInput,
    questions: FollowUpQuestion[] = []
  ): CarMarketingBrainResult | null {
    return safeBuildMarketingBrain(specs, questions);
  },

  async getFollowUpQuestions(specs: CarSpecsInput): Promise<FollowUpQuestion[]> {
    const validationError = validateCarSpecsInput(specs);
    if (validationError) {
      throw new Error(validationError);
    }

    const fallbackQuestions: FollowUpQuestion[] = [
      {
        id: "q1",
        questionText:
          "รถคันนี้ได้รับการเช็คระยะหรือเช็คบุ๊คบริการที่ศูนย์ครบตลอดไหมครับ?",
        placeholder: "เช่น เข้าศูนย์บริการตลอด มีใบเสร็จประวัติชัดเจน...",
      },
      {
        id: "q2",
        questionText: "มีของแต่งหรือของแถมที่อยากเน้นเพิ่มไหมคร้าบ?",
        placeholder: "เช่น ล้อแม็ก ชุดแต่ง ของแถม...",
      },
      {
        id: "q3",
        questionText: "พร้อมนัดดูรถที่ไหน และเอกสารพร้อมโอนไหมครับ?",
        placeholder: "เช่น นัดดูได้บางนา เอกสารพร้อมโอน...",
      },
    ];

    try {
      const response = await fetchWithTimeout(
        "/api/ai/post-generator/questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(specs),
        },
        60_000
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await parseJsonResponse<{
        success?: boolean;
        questions?: FollowUpQuestion[];
      }>(response);

      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        const seen = new Set<string>();
        const normalized: FollowUpQuestion[] = [];
        for (const raw of data.questions) {
          const text = (raw.questionText ?? "").trim().slice(0, 280);
          if (!text || seen.has(text)) continue;
          seen.add(text);
          normalized.push({
            id: raw.id || `q${normalized.length + 1}`,
            questionText: text,
            placeholder: (raw.placeholder ?? "").trim().slice(0, 120),
          });
          if (normalized.length >= 3) break;
        }
        if (normalized.length > 0) return normalized;
      }
      throw new Error("Invalid questions payload");
    } catch {
      return fallbackQuestions;
    }
  },

  async generatePosts(
    specs: CarSpecsInput,
    options: GeneratorOptions,
    questions: FollowUpQuestion[],
    precomputedBrain?: CarMarketingBrainResult | null,
    postStyle: CarPostStyle = DEFAULT_CAR_POST_STYLE,
    regenerateMode?: CarPostRegenerateMode | null
  ): Promise<GeneratedPosts> {
    const validationError = validateCarSpecsInput(specs);
    if (validationError) {
      throw new Error(validationError);
    }

    const marketingBrain =
      precomputedBrain ?? safeBuildMarketingBrain(specs, questions);
    const effectiveStyle = regenerateMode
      ? resolveEffectivePostStyle(regenerateMode, postStyle)
      : postStyle;
    const answers = buildAnswersPayload(
      questions,
      marketingBrain,
      effectiveStyle,
      regenerateMode
    );

    const fallback = marketingBrain
      ? buildMarketingBrainFallbackPosts(specs, marketingBrain)
      : buildLegacyFallbackPosts(specs);

    try {
      const response = await fetchWithTimeout(
        "/api/ai/post-generator/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specs,
            options,
            answers,
            marketingBrain,
            postStyle: effectiveStyle,
            regenerateMode: regenerateMode ?? undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await parseJsonResponse<{
        success?: boolean;
        posts?: Partial<GeneratedPosts>;
      }>(response);

      if (data.success && data.posts) {
        return sanitizeGeneratedPosts(data.posts, fallback);
      }
      throw new Error("Invalid posts payload");
    } catch {
      return fallback;
    }
  },

  async regeneratePosts(
    specs: CarSpecsInput,
    options: GeneratorOptions,
    questions: FollowUpQuestion[],
    marketingBrain: CarMarketingBrainResult | null,
    postStyle: CarPostStyle,
    regenerateMode: CarPostRegenerateMode
  ): Promise<GeneratedPosts> {
    return this.generatePosts(
      specs,
      options,
      questions,
      marketingBrain,
      postStyle,
      regenerateMode
    );
  },
};
