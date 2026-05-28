import {
  extractCarFieldsFromMessage,
  type ExtractedCarFields,
} from "./sellIntentParser";

export type PrecheckStage =
  | "idle"
  | "analyzing_images"
  | "collecting_missing_fields"
  | "draft_copy_ready"
  | "awaiting_user_confirm"
  | "confirmed_create_draft";

export interface VisionObservationSummary {
  brand?: string;
  model?: string;
  color?: string;
  bodyType?: string;
  condition?: string;
}

export interface ChatPrecheckContext {
  stage: PrecheckStage;
  fields: ExtractedCarFields;
  publicRefCode?: string;
  visionSummary?: VisionObservationSummary;
  hasRequestedCreateFlow?: boolean;
}

const bySession = new Map<string, ChatPrecheckContext>();

const START_CREATE_PATTERNS: RegExp[] = [
  /ช่วยสร้างประกาศขายรถคันนี้/i,
  /ทำโพสต์ขายรถให้หน่อย/i,
  /สร้างประกาศ/i,
  /ช่วยลงขาย/i,
];

const CONFIRM_CREATE_PATTERNS: RegExp[] = [
  /^ยืนยันสร้างประกาศ$/i,
  /ตกลง\s*สร้างเลย/i,
  /^เอาเลย$/i,
];

/** ข้อมูลหลักที่ต้องครบก่อนแสดง draft copy (สี/จุดเด่น ไม่รวม) */
const CORE_REQUIRED_KEYS: Array<keyof ExtractedCarFields> = [
  "brand",
  "model",
  "year",
  "price",
  "mileage",
  "transmission",
];

const AWAITING_CONFIRM_STAGES: ReadonlySet<PrecheckStage> = new Set([
  "draft_copy_ready",
  "awaiting_user_confirm",
]);

export function getPrecheckContext(sessionId: string): ChatPrecheckContext | null {
  return bySession.get(sessionId) ?? null;
}

export function clearPrecheckContext(sessionId: string): void {
  bySession.delete(sessionId);
}

export function isStartCreateListingIntent(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return START_CREATE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isConfirmCreateListingIntent(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return CONFIRM_CREATE_PATTERNS.some((pattern) => pattern.test(text));
}

/** รวมข้อมูลจากผู้ใช้กับ vision สำหรับเช็คว่าครบหรือยัง (ไม่ถามซ้ำสิ่งที่ vision คาดได้แล้ว) */
export function mergeEffectivePrecheckFields(
  fields: ExtractedCarFields,
  vision?: VisionObservationSummary
): ExtractedCarFields {
  return {
    ...fields,
    brand: fields.brand?.trim() || vision?.brand?.trim() || undefined,
    model: fields.model?.trim() || vision?.model?.trim() || undefined,
    color: fields.color?.trim() || vision?.color?.trim() || undefined,
  };
}

export function hasCoreFieldsComplete(
  fields: ExtractedCarFields,
  vision?: VisionObservationSummary
): boolean {
  return (
    getMissingCoreFieldLabels(mergeEffectivePrecheckFields(fields, vision))
      .length === 0
  );
}

export function isPrecheckAwaitingConfirm(stage: PrecheckStage | undefined): boolean {
  return stage != null && AWAITING_CONFIRM_STAGES.has(stage);
}

export function upsertPrecheckFromMessage(
  sessionId: string,
  message: string
): ChatPrecheckContext {
  const existing =
    bySession.get(sessionId) ??
    ({
      stage: "idle",
      fields: {},
    } satisfies ChatPrecheckContext);

  const extracted = extractCarFieldsFromMessage(message);
  const merged = mergeFields(existing.fields, extracted);
  const coreComplete = hasCoreFieldsComplete(merged, existing.visionSummary);
  const next: ChatPrecheckContext = {
    ...existing,
    fields: merged,
    stage: resolveStageAfterFieldMerge(existing.stage, coreComplete),
  };
  bySession.set(sessionId, next);
  return next;
}

export function bootstrapPrecheckFields(
  sessionId: string,
  fields: ExtractedCarFields
): ChatPrecheckContext {
  const existing =
    bySession.get(sessionId) ??
    ({
      stage: "idle",
      fields: {},
    } satisfies ChatPrecheckContext);
  const merged = mergeFields(existing.fields, fields);
  const coreComplete = hasCoreFieldsComplete(merged, existing.visionSummary);
  const next: ChatPrecheckContext = {
    ...existing,
    fields: merged,
    stage: resolveStageAfterFieldMerge(existing.stage, coreComplete),
  };
  bySession.set(sessionId, next);
  return next;
}

export function setPrecheckStage(
  sessionId: string,
  stage: PrecheckStage
): ChatPrecheckContext {
  const current = bySession.get(sessionId) ?? { stage: "idle", fields: {} };
  const next = { ...current, stage };
  bySession.set(sessionId, next);
  return next;
}

export function setPrecheckVisionSummary(
  sessionId: string,
  summary: VisionObservationSummary
): ChatPrecheckContext {
  const current = bySession.get(sessionId) ?? { stage: "idle", fields: {} };
  const next = { ...current, visionSummary: summary };
  bySession.set(sessionId, next);
  return next;
}

export function ensurePublicRefCode(sessionId: string): string {
  const current = bySession.get(sessionId) ?? { stage: "idle", fields: {} };
  if (current.publicRefCode) return current.publicRefCode;
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `NA-${year}-${suffix}`;
  bySession.set(sessionId, { ...current, publicRefCode: code });
  return code;
}

export function getMissingCoreFieldLabels(fields: ExtractedCarFields): string[] {
  const missing: string[] = [];
  for (const key of CORE_REQUIRED_KEYS) {
    const value = fields[key];
    if (key === "mileage") {
      if (
        value == null ||
        (typeof value === "number" && !Number.isFinite(value))
      ) {
        missing.push(toThaiLabel(key));
      }
      continue;
    }
    if (
      value == null ||
      value === "" ||
      (typeof value === "number" && (!Number.isFinite(value) || value <= 0))
    ) {
      missing.push(toThaiLabel(key));
    }
  }
  return missing;
}

/** @deprecated ใช้ getMissingCoreFieldLabels — คงชื่อเดิมให้ caller เก่า */
export function getMissingFieldLabels(fields: ExtractedCarFields): string[] {
  return getMissingCoreFieldLabels(fields);
}

function formatTransmissionLabel(transmission?: string): string | null {
  const raw = transmission?.trim();
  if (!raw) return null;
  if (/^เกียร์/i.test(raw)) return raw;
  return `เกียร์${raw}`;
}

function formatPriceThb(price?: number): string {
  const n = Number(price ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${n.toLocaleString("th-TH")} บาท`;
}

function formatMileageKm(mileage?: number): string {
  const n = Number(mileage ?? 0);
  if (!Number.isFinite(n)) return "-";
  return `${n.toLocaleString("th-TH")} กม.`;
}

function normalizeColorDisplay(color?: string): string | undefined {
  if (!color?.trim()) return undefined;
  const cleaned = color
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || color.trim();
}

function transmissionForSalesCopy(transmission?: string): string | null {
  const raw = transmission?.trim();
  if (!raw) return null;
  const withoutPrefix = raw.replace(/^เกียร์\s*/i, "").trim();
  if (!withoutPrefix) return null;
  return `เกียร์${withoutPrefix}`;
}

function verificationLine(
  label: string,
  userValue: string | number | undefined,
  visionValue?: string,
  format?: (v: string | number) => string
): string | null {
  const formatVal = format ?? ((v: string | number) => String(v));
  if (userValue != null && userValue !== "") {
    return `• ${label}: ${formatVal(userValue)}`;
  }
  if (visionValue?.trim()) {
    return `• ${label}: ${visionValue.trim()} (จากภาพคาดว่า — แก้ได้ถ้าไม่ตรง)`;
  }
  return null;
}

function buildMarketingPostSection(
  fields: ExtractedCarFields,
  refCode: string,
  vision?: VisionObservationSummary
): string {
  const brand = fields.brand?.trim() || vision?.brand?.trim() || "";
  const model = fields.model?.trim() || vision?.model?.trim() || "";
  const year =
    fields.year != null && Number.isFinite(Number(fields.year))
      ? String(fields.year)
      : "";
  const color = normalizeColorDisplay(
    fields.color?.trim() || vision?.color?.trim()
  );
  const bodyType = vision?.bodyType?.trim();
  const mileage = formatMileageKm(fields.mileage);
  const price = formatPriceThb(fields.price);
  const gear = transmissionForSalesCopy(fields.transmission);

  let hook = "คันนี้น่าสนใจสำหรับผู้ที่กำลังมองหารถใช้งานจริงครับ";
  if (bodyType) {
    hook = `ใครกำลังมองหา ${bodyType} ใช้งานง่าย ภาพลักษณ์ดี ขับได้ทั้งในเมืองและออกต่างจังหวัด คันนี้น่าสนใจมากครับ`;
  } else if (brand && model) {
    hook = `ใครกำลังมองหา ${brand} ${model} ที่ใช้งานได้จริงในงบนี้ คันนี้น่าสนใจมากครับ`;
  }

  const carDetails: string[] = [];
  const nameLine = [brand, model].filter(Boolean).join(" ");
  if (nameLine) carDetails.push(nameLine);
  if (year) carDetails.push(`ปี ${year}`);
  if (color) carDetails.push(`สี${color} ลุคเรียบหรู ดูภูมิฐาน`);
  if (mileage !== "-") carDetails.push(`เลขไมล์ ${mileage}`);
  if (gear) carDetails.push(`${gear} ขับง่าย ใช้งานสบาย`);
  carDetails.push(`ราคา ${price}`);

  const pitch = `${hook} ${carDetails.join(" ")}.`;

  const closer = bodyType
    ? "เหมาะกับคนที่อยากได้รถอเนกประสงค์ขนาดกำลังดี ดูแลง่าย และยังมีสไตล์ในคันเดียว"
    : "เหมาะกับผู้ที่อยากได้รถที่ใช้งานได้จริงในงบและสเปกนี้ครับ";

  const blocks: string[] = [pitch, closer];

  if (fields.description?.trim()) {
    const extras = fields.description
      .split(/[,·]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (extras.length > 0) {
      blocks.push(
        "",
        "จุดเสริมจากข้อมูลที่ให้มา:",
        ...extras.map((item) => `• ${item}`)
      );
    }
  }

  blocks.push("", `สอบถามกับน้องเอ รหัสรถ: ${refCode}`);

  return blocks.join("\n");
}

function buildVerificationSection(
  fields: ExtractedCarFields,
  refCode: string,
  vision: VisionObservationSummary | undefined,
  imageCount: number
): string {
  const brandModel = [fields.brand, fields.model].filter(Boolean).join(" ").trim();
  const brandModelVision = [vision?.brand, vision?.model].filter(Boolean).join(" ").trim();
  const lines: string[] = [];

  if (brandModel) {
    lines.push(`• ยี่ห้อ/รุ่น: ${brandModel}`);
  } else if (brandModelVision) {
    lines.push(
      `• ยี่ห้อ/รุ่น: ${brandModelVision} (จากภาพคาดว่า — แก้ได้ถ้าไม่ตรง)`
    );
  }

  const yearLine = verificationLine("ปี", fields.year, undefined, (v) => String(v));
  if (yearLine) lines.push(yearLine);

  if (fields.price != null && Number.isFinite(Number(fields.price))) {
    lines.push(`• ราคา: ${formatPriceThb(fields.price)}`);
  }

  if (fields.mileage != null && Number.isFinite(Number(fields.mileage))) {
    lines.push(`• เลขไมล์: ${formatMileageKm(fields.mileage)}`);
  }

  const gearLine = verificationLine(
    "เกียร์",
    fields.transmission?.trim(),
    undefined
  );
  if (gearLine) lines.push(gearLine);

  const colorLine = verificationLine("สี", fields.color?.trim(), vision?.color);
  if (colorLine) lines.push(colorLine);

  if (vision?.bodyType?.trim() && !fields.description) {
    lines.push(
      `• ประเภทรถ: ${vision.bodyType.trim()} (จากภาพคาดว่า — แก้ได้ถ้าไม่ตรง)`
    );
  }

  if (imageCount > 0) {
    lines.push(
      `• รูปภาพ: แนบ ${imageCount} รูป (ดู thumbnail ด้านล่าง)`
    );
  }

  lines.push(`• รหัสรถ: ${refCode}`);

  return lines.join("\n");
}

export function buildKnownVisionHints(
  fields: ExtractedCarFields,
  vision?: VisionObservationSummary
): string[] {
  if (!vision) return [];
  const hints: string[] = [];
  if (vision.brand?.trim() && !fields.brand?.trim()) {
    hints.push(`ยี่ห้อ ${vision.brand.trim()}`);
  }
  if (vision.model?.trim() && !fields.model?.trim()) {
    hints.push(`รุ่น ${vision.model.trim()}`);
  }
  if (vision.color?.trim() && !fields.color?.trim()) {
    hints.push(`สี ${vision.color.trim()}`);
  }
  if (vision.bodyType?.trim()) {
    hints.push(`ประเภท ${vision.bodyType.trim()}`);
  }
  return hints;
}

export function buildDraftCopyReadyReply(
  fields: ExtractedCarFields,
  refCode: string,
  confirmAction: string,
  vision?: VisionObservationSummary,
  imageCount = 0
): string {
  const marketing = buildMarketingPostSection(fields, refCode, vision);
  const verification = buildVerificationSection(
    fields,
    refCode,
    vision,
    imageCount
  );

  return [
    "น้องเอร่างโพสต์ขายเบื้องต้นให้แล้วครับ",
    "",
    "[โพสต์ตัวอย่าง]",
    marketing,
    "",
    "[ข้อมูลสำหรับตรวจสอบก่อนยืนยัน]",
    verification,
    "",
    `ถ้าข้อมูลถูกต้อง กด '${confirmAction}' ได้เลยครับ เดี๋ยวน้องเอจะบันทึกเป็นประกาศร่างให้ ปังปุริเย่!`,
  ].join("\n");
}

export function buildPrecheckVisionReply(
  summary: VisionObservationSummary | undefined
): string {
  if (!summary) {
    return "น้องเอยังวิเคราะห์ภาพไม่ได้ในรอบนี้ครับ แต่พร้อมช่วยเก็บข้อมูลให้ครบก่อนสร้างประกาศนะครับ";
  }
  const lines: string[] = [];
  if (summary.brand) lines.push(`- ยี่ห้อที่คาดได้: ${summary.brand}`);
  if (summary.model) lines.push(`- รุ่นที่คาดได้: ${summary.model}`);
  if (summary.bodyType) lines.push(`- ประเภทรถที่เห็น: ${summary.bodyType}`);
  if (summary.color) lines.push(`- สีที่เห็น: ${summary.color}`);
  if (summary.condition) lines.push(`- สภาพโดยรวมที่เห็น: ${summary.condition}`);
  if (lines.length === 0) {
    return "น้องเอดูภาพแล้วครับ แต่ยังสรุปรายละเอียดสำคัญจากภาพได้ไม่พอ จึงขอข้อมูลเพิ่มจากลุงครับ";
  }
  return [
    "น้องเอวิเคราะห์จากภาพให้เบื้องต้นแล้วครับ (อิงตามสิ่งที่เห็นในภาพเท่านั้น):",
    ...lines,
    "หากจุดไหนไม่ตรง ลุงแก้ได้เลยนะครับ เดี๋ยวน้องเอปรับให้ทันทีครับ",
  ].join("\n");
}

export function buildMissingFieldsPrompt(
  missingLabels: string[],
  knownFromVision: string[] = []
): string {
  if (missingLabels.length === 0) {
    return "ข้อมูลหลักครบแล้วครับ เดี๋ยวน้องเอร่างโพสต์ขายให้ตรวจต่อได้เลย ปังปุริเย่!";
  }
  const visionNote =
    knownFromVision.length > 0
      ? `จากภาพน้องเอคาดไว้แล้ว: ${knownFromVision.join(", ")} — ถ้าไม่ตรงพิมพ์แก้มาได้เลยครับ\n\n`
      : "";
  const primary = missingLabels.slice(0, 4).join(", ");
  return `${visionNote}เพื่อให้ประกาศดูน่าเชื่อถือขึ้น ขอข้อมูลเพิ่มอีกนิดนะครับ: ${primary}\nลุงพิมพ์ต่อเป็นประโยคเดียวได้เลย เดี๋ยวน้องเอเรียบเรียงให้ขายง่ายขึ้นครับ`;
}

function toThaiLabel(key: keyof ExtractedCarFields): string {
  const map: Record<keyof ExtractedCarFields, string> = {
    brand: "ยี่ห้อ",
    model: "รุ่น",
    year: "ปี",
    color: "สี",
    price: "ราคา",
    mileage: "เลขไมล์",
    transmission: "เกียร์",
    fuelType: "เชื้อเพลิง",
    description: "จุดเด่น",
    sellerType: "ประเภทผู้ขาย",
    phone: "เบอร์ติดต่อ",
    licensePlate: "ทะเบียน",
    trimSubModel: "รุ่นย่อย",
  };
  return map[key];
}

function resolveStageAfterFieldMerge(
  current: PrecheckStage,
  coreComplete: boolean
): PrecheckStage {
  if (current === "confirmed_create_draft") return current;
  if (isPrecheckAwaitingConfirm(current)) {
    return coreComplete ? current : "collecting_missing_fields";
  }
  if (current === "idle") {
    return coreComplete ? "draft_copy_ready" : "collecting_missing_fields";
  }
  if (coreComplete) return "draft_copy_ready";
  return "collecting_missing_fields";
}

function mergeFields(
  base: ExtractedCarFields,
  next: ExtractedCarFields
): ExtractedCarFields {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(next).filter(([, value]) => value != null && value !== "")
    ),
  };
}
