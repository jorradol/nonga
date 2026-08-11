/**
 * WP-V3-09 — Automotive conversation reasoning core for Chat V.3.
 * Deterministic intent/context helpers + prompt blocks. Not a full Safety Layer.
 */
import type { ChatV3HistoryTurn } from "./chatV3ConversationContracts";

export type ChatV3AutomotiveIntent =
  | "information"
  | "compare_or_choose"
  | "budget_or_finance"
  | "usage_advice"
  | "maintenance_or_repair"
  | "insurance_tax_admin"
  | "sell_or_trade"
  | "follow_up_reference"
  | "other";

export type ChatV3VehicleReferenceResolution =
  | "none"
  | "resolved"
  | "ambiguous"
  | "missing_context";

export type ChatV3AutomotiveSafetyRiskLevel = "none" | "general" | "high";

export interface ChatV3VehicleContextItem {
  id: string;
  label: string;
  summary?: string;
  /** Only known facts already present in context — never invented. */
  facts?: Record<string, string>;
}

export interface ChatV3AutomotiveVehicleContext {
  selectedVehicleId?: string | null;
  vehicles: ChatV3VehicleContextItem[];
}

export interface ChatV3AutomotiveTurnAnalysis {
  intents: ChatV3AutomotiveIntent[];
  primaryIntent: ChatV3AutomotiveIntent;
  isMultiIntent: boolean;
  hasVehicleReference: boolean;
  vehicleReferenceResolution: ChatV3VehicleReferenceResolution;
  resolvedVehicleId?: string;
  needsClarification: boolean;
  clarificationFocus?: string;
  freshnessRequired: boolean;
  financeAssumptionsRequired: boolean;
  safetyRiskLevel: ChatV3AutomotiveSafetyRiskLevel;
  guidanceNotes: string[];
}

export interface BuildChatV3AutomotiveReasoningOptions {
  message: string;
  history?: ChatV3HistoryTurn[];
  vehicleContext?: ChatV3AutomotiveVehicleContext | null;
}

const VEHICLE_REFERENCE_RE =
  /คันนี้|คันนั้น|รุ่นนี้|รุ่นนั้น|ตัวนี้|ตัวนั้น|คันเดิม|คันข้างบน|ที่คุยกัน|ที่เลือกไว้|คันที่เลือก/i;

const FRESHNESS_RE =
  /ราคา(?:ตลาด|ปัจจุบัน|วันนี้|ล่าสุด)?|โปรโมช(?:ัน|ั่น)|ดอกเบี้ย|ภาษี(?:รถ|ประจำปี)?|กฎหมาย|ข้อบังคับ|ตารางบริการ|ยังจำหน่าย|รุ่นปี\s*\d{4}|ค่าเบี้ย|เบี้ยประกัน|ราคาขายจริง|ราคาตลาด/i;

const FINANCE_RE =
  /ค่างวด|ผ่อน|ดาวน์|ไฟแนนซ์|สินเชื่อ|ดอกเบี้ย|ภาระ(?:ผ่อน)?|คำนวณ(?:ค่างวด|ผ่อน)/i;

const COMPARE_CHOOSE_RE =
  /เลือกรถ|แนะนำรถ|คันไหนดี|รุ่นไหนดี|เทียบ|เปรียบเทียบ|คุ้มกว่า|ซื้อคัน|หา(?:รถ|คัน)|อยากได้รถ|ช่วยเลือก/i;

const MAINTENANCE_RE =
  /บำรุงรักษา|ดูแลรักษ|เช็คระยะ|เปลี่ยนถ่าย|อาการ|เสีย|สั่น|เสียงดัง|ไฟโชว์|สตาร์ทไม่ติด|กินน้ำมัน|ควัน|กลิ่น|เบรก|พวงมาลัย|ยาง|แบต|แอร์ไม่เย็น|รั่ว/i;

const INSURANCE_TAX_RE =
  /ประกัน|เคลม|พ.ร.บ|พรบ|ภาษีรถ|ต่อภาษี|โอนทะเบียน|จดทะเบียน|กรมธรรม์|ค่าเบี้ย/i;

const SELL_TRADE_RE =
  /ขายรถ|เทิร์น|เปลี่ยนรถ|ประเมินราคาขาย|ขายต่อ|แลกเปลี่ยนรถ|เอาไปเทิร์น/i;

const USAGE_RE =
  /ขับ(?:ยังไง|อย่างไร)|ใช้งาน|เหมาะกับ|เที่ยวไกล|ขึ้นเขา|ลากพ่วง|ประหยัดน้ำมันไหม|เหมาะใช้/i;

const HIGH_RISK_RE =
  /เบรก(?:ไม่|กดแล้ว|เหยียบแล้ว)?(?:กิน|ไม่มี|อ่อน|แข็ง|สั่น|ดัง|ลื่น)|พวงมาลัย(?:หนัก|เล่น|สั่น|หลวม)|กลิ่น(?:น้ำมัน|เชื้อเพลิง|เบนซิน|ดีเซล).*(?:แรง|ฉุน|ในห้อง)|(?:น้ำมัน|เชื้อเพลิง).*(?:รั่ว|หก)|ควัน(?:ขาว|ดำ|ไฟ|ไหม้)|ไฟไหม้|เปลวไฟ|กลิ่นไหม้|ไฟฟ้าแรงสูง|แบตไฮบริด|ระบบไฮโวลต์|ยางแตกขณะขับ|ห้ามล้อ/i;

const GENERAL_FAULT_RE =
  /สตาร์ทไม่ติด|ไฟโชว์|เครื่องสั่น|แอร์ไม่เย็น|กินน้ำมัน|เสียงแปลก|หม้อน้ำ|แบตหมด|ไม่ค่อยไป/i;

function uniqueIntents(intents: ChatV3AutomotiveIntent[]): ChatV3AutomotiveIntent[] {
  const seen = new Set<ChatV3AutomotiveIntent>();
  const out: ChatV3AutomotiveIntent[] = [];
  for (const intent of intents) {
    if (seen.has(intent)) continue;
    seen.add(intent);
    out.push(intent);
  }
  return out;
}

function detectIntents(message: string): ChatV3AutomotiveIntent[] {
  const intents: ChatV3AutomotiveIntent[] = [];
  if (VEHICLE_REFERENCE_RE.test(message)) intents.push("follow_up_reference");
  if (COMPARE_CHOOSE_RE.test(message)) intents.push("compare_or_choose");
  if (FINANCE_RE.test(message)) intents.push("budget_or_finance");
  if (MAINTENANCE_RE.test(message)) intents.push("maintenance_or_repair");
  if (INSURANCE_TAX_RE.test(message)) intents.push("insurance_tax_admin");
  if (SELL_TRADE_RE.test(message)) intents.push("sell_or_trade");
  if (USAGE_RE.test(message)) intents.push("usage_advice");
  if (intents.length === 0) {
    if (/คืออะไร|ต่างจาก|หมายความว่า|อธิบาย|รู้ไหม|ช่วยบอก/.test(message)) {
      intents.push("information");
    } else {
      intents.push("other");
    }
  } else if (
    !intents.includes("compare_or_choose") &&
    !intents.includes("maintenance_or_repair") &&
    !intents.includes("budget_or_finance") &&
    /คืออะไร|ต่างจาก|อธิบาย/.test(message)
  ) {
    intents.unshift("information");
  }
  return uniqueIntents(intents);
}

function pickPrimaryIntent(intents: ChatV3AutomotiveIntent[]): ChatV3AutomotiveIntent {
  const priority: ChatV3AutomotiveIntent[] = [
    "maintenance_or_repair",
    "compare_or_choose",
    "budget_or_finance",
    "insurance_tax_admin",
    "sell_or_trade",
    "usage_advice",
    "follow_up_reference",
    "information",
    "other",
  ];
  for (const intent of priority) {
    if (intents.includes(intent)) return intent;
  }
  return "other";
}

function resolveVehicleReference(
  message: string,
  vehicleContext?: ChatV3AutomotiveVehicleContext | null
): {
  hasVehicleReference: boolean;
  resolution: ChatV3VehicleReferenceResolution;
  resolvedVehicleId?: string;
} {
  const hasVehicleReference = VEHICLE_REFERENCE_RE.test(message);
  if (!hasVehicleReference) {
    return { hasVehicleReference: false, resolution: "none" };
  }

  const vehicles = vehicleContext?.vehicles ?? [];
  const selectedId = vehicleContext?.selectedVehicleId ?? null;

  if (selectedId && vehicles.some((vehicle) => vehicle.id === selectedId)) {
    return {
      hasVehicleReference: true,
      resolution: "resolved",
      resolvedVehicleId: selectedId,
    };
  }

  if (vehicles.length === 1) {
    return {
      hasVehicleReference: true,
      resolution: "resolved",
      resolvedVehicleId: vehicles[0].id,
    };
  }

  if (vehicles.length > 1) {
    return { hasVehicleReference: true, resolution: "ambiguous" };
  }

  return { hasVehicleReference: true, resolution: "missing_context" };
}

function detectSafetyRisk(message: string): ChatV3AutomotiveSafetyRiskLevel {
  if (HIGH_RISK_RE.test(message)) return "high";
  if (GENERAL_FAULT_RE.test(message) || MAINTENANCE_RE.test(message)) return "general";
  return "none";
}

function buildGuidanceNotes(input: {
  intents: ChatV3AutomotiveIntent[];
  primaryIntent: ChatV3AutomotiveIntent;
  isMultiIntent: boolean;
  vehicleReferenceResolution: ChatV3VehicleReferenceResolution;
  freshnessRequired: boolean;
  financeAssumptionsRequired: boolean;
  safetyRiskLevel: ChatV3AutomotiveSafetyRiskLevel;
  needsClarification: boolean;
  clarificationFocus?: string;
}): string[] {
  const notes: string[] = [];

  if (input.isMultiIntent) {
    notes.push("ผู้ใช้ถามหลายประเด็นในข้อความเดียว — ตอบประเด็นสำคัญก่อน แล้วสรุปประเด็นถัดไปสั้น ๆ");
  }

  if (input.vehicleReferenceResolution === "resolved") {
    notes.push("คำอ้างอิงเช่น “คันนี้/รุ่นนั้น” ชี้ไปยังรถในบริบทที่ระบุแล้ว — ใช้คันนั้นต่อเนื่อง ห้ามสร้างสเปกเพิ่ม");
  } else if (input.vehicleReferenceResolution === "ambiguous") {
    notes.push("มีรถหลายคันและคำอ้างอิงกำกวม — ถามให้ชัดว่าหมายถึงคันใด ก่อนฟันธงรายละเอียดเฉพาะคัน");
  } else if (input.vehicleReferenceResolution === "missing_context") {
    notes.push("มีคำอ้างอิงถึงรถ แต่ยังไม่มีรถในบริบท — ขอให้ระบุรุ่น/คันที่หมายถึง");
  }

  if (input.primaryIntent === "compare_or_choose" && input.needsClarification) {
    notes.push("ข้อมูลยังไม่พอสำหรับแนะนำเลือกรถอย่างมีนัย — ให้คำแนะนำกรอบกว้างได้ก่อน แล้วถามคำถามสำคัญครั้งละหนึ่งข้อ");
  }

  if (input.freshnessRequired) {
    notes.push(
      "ประเด็นนี้พึ่งข้อมูลที่เปลี่ยนตามเวลา — ห้ามแต่งราคา/โปร/ดอกเบี้ย/กฎหมายปัจจุบัน และบอกให้ตรวจแหล่งข้อมูลล่าสุด"
    );
  }

  if (input.financeAssumptionsRequired) {
    notes.push("การคำนวณค่างวดต้องติดป้ายว่าเป็นประมาณการ และระบุสมมติฐานหลักเมื่อไม่มีข้อมูลผู้ให้บริการจริง");
  }

  if (input.safetyRiskLevel === "high") {
    notes.push(
      "มีความเสี่ยงด้านความปลอดภัย (เช่น เบรก/พวงมาลัย/เชื้อเพลิง) — แนะนำหยุดใช้เมื่อเสี่ยง และพบช่าง/ผู้เชี่ยวชาญ ไม่รับรองความปลอดภัยจากข้อมูลไม่ครบ"
    );
  } else if (input.safetyRiskLevel === "general") {
    notes.push("อาการทั่วไป — ให้แนวทางเบื้องต้นได้ แต่ไม่ฟันธงสาเหตุเดียวหากข้อมูลยังไม่พอ");
  }

  if (input.clarificationFocus) {
    notes.push(`จุดที่ควรถามกลับหากจำเป็น: ${input.clarificationFocus}`);
  }

  notes.push("ห้ามแต่งสเปก ราคา แหล่งอ้างอิง หรือข้อมูลตลาดที่ไม่มีในบริบท");
  return notes;
}

/**
 * Deterministic turn analysis for automotive conversation reasoning.
 */
export function analyzeChatV3AutomotiveTurn(
  options: BuildChatV3AutomotiveReasoningOptions
): ChatV3AutomotiveTurnAnalysis {
  const message = String(options.message ?? "").trim();
  const intents = detectIntents(message);
  const primaryIntent = pickPrimaryIntent(intents);
  const isMultiIntent =
    intents.filter((intent) => intent !== "follow_up_reference" && intent !== "other")
      .length >= 2 ||
    (intents.includes("follow_up_reference") &&
      intents.some((intent) => intent !== "follow_up_reference" && intent !== "other") &&
      intents.length >= 3);

  const reference = resolveVehicleReference(message, options.vehicleContext);
  const freshnessRequired = FRESHNESS_RE.test(message);
  const financeAssumptionsRequired =
    FINANCE_RE.test(message) || primaryIntent === "budget_or_finance";
  const safetyRiskLevel = detectSafetyRisk(message);

  let needsClarification = false;
  let clarificationFocus: string | undefined;

  if (reference.resolution === "ambiguous") {
    needsClarification = true;
    clarificationFocus = "หมายถึงรถคันใดในรายการที่กำลังคุย";
  } else if (reference.resolution === "missing_context") {
    needsClarification = true;
    clarificationFocus = "รุ่นหรือคันที่หมายถึง";
  } else if (
    primaryIntent === "compare_or_choose" &&
    !/(งบ|ไม่เกิน|ประมาณ|แสน|ล้าน|บาท)/.test(message) &&
    !/(SUV|เก๋ง|กระบะ|รถตู้|รถครอบครัว|เมือง|ต่างจังหวัด)/i.test(message)
  ) {
    needsClarification = true;
    clarificationFocus = "งบประมาณหรือประเภทการใช้งานหลักที่สำคัญต่อการแนะนำ";
  }

  // Multi-intent with choose + finance often needs one clarifying question, but
  // still allow a partial answer first (encoded in principles / notes).
  if (
    intents.includes("compare_or_choose") &&
    intents.includes("budget_or_finance") &&
    !/(ดาวน์|ดอก|งวด|ปี)/.test(message)
  ) {
    needsClarification = true;
    clarificationFocus =
      clarificationFocus ?? "งบดาวน์หรือระยะผ่อนที่มีผลต่อคำแนะนำ";
  }

  const guidanceNotes = buildGuidanceNotes({
    intents,
    primaryIntent,
    isMultiIntent:
      intents.filter((intent) => intent !== "other").length >= 2,
    vehicleReferenceResolution: reference.resolution,
    freshnessRequired,
    financeAssumptionsRequired,
    safetyRiskLevel,
    needsClarification,
    clarificationFocus,
  });

  return {
    intents,
    primaryIntent,
    isMultiIntent: intents.filter((intent) => intent !== "other").length >= 2,
    hasVehicleReference: reference.hasVehicleReference,
    vehicleReferenceResolution: reference.resolution,
    resolvedVehicleId: reference.resolvedVehicleId,
    needsClarification,
    clarificationFocus,
    freshnessRequired,
    financeAssumptionsRequired,
    safetyRiskLevel,
    guidanceNotes,
  };
}

/**
 * Stable reasoning principles appended to the Chat V.3 system instruction.
 * Keep compact — not a duplicate persona block.
 */
export function buildChatV3AutomotiveReasoningPrinciples(): string {
  return [
    "[แกนคิดเรื่องรถ — WP-V3-09]",
    "แยกให้ได้ว่าผู้ใช้กำลัง: หาข้อมูล / เลือกหรือเทียบรถ / งบหรือค่างวด / ใช้งาน / ดูแลหรืออาการเสีย / ประกันภาษีทะเบียน / ขายเทิร์น / ถามหลายเรื่อง / อ้างอิงรถหรือคำตอบก่อนหน้า",
    "แยกข้อเท็จจริง ความเห็น การประมาณการ และข้อมูลปัจจุบันออกจากกันอย่างชัดเจน",
    "ถามกลับเฉพาะเมื่อข้อมูลที่ขาดจะเปลี่ยนคำแนะนำอย่างมีนัย — โดยทั่วไปครั้งละไม่เกินหนึ่งคำถามสำคัญ ตอบสิ่งที่ช่วยได้ก่อนเมื่อทำได้",
    "ถ้าใช้สมมติฐานได้อย่างปลอดภัย ให้ระบุสมมติฐานแทนการซักถามยาว และห้ามถามข้อมูลที่ผู้ใช้ให้ไว้แล้ว",
    "โครงคำตอบตามความเหมาะสม: ตอบประเด็นสำคัญ → เหตุผล → ทางเลือก/ข้อแลกเปลี่ยน → สิ่งที่ยังไม่แน่นอน → คำถามหรือขั้นถัดไปเมื่อจำเป็น",
    "มั่นใจได้เมื่อหลักฐานพอ แต่ห้ามรับรองเกินจริง ห้ามใช้คำว่า “ดีที่สุด” โดยไม่มีเกณฑ์ ห้ามทำให้ค่าประมาณกลายเป็นข้อเท็จจริง",
    "ข้อมูลที่เปลี่ยนตามเวลา (ราคา โปร ดอกเบี้ย กฎหมาย ภาษี รุ่นจำหน่าย ตารางบริการ ตลาด) — หากยังไม่มีเครื่องมือค้นหาปัจจุบัน ให้บอกตรง ๆ ว่าต้องตรวจข้อมูลล่าสุด ห้ามแกล้งว่าได้ค้นแล้ว และห้ามแต่งแหล่งอ้างอิง",
    "ใช้รถที่เลือกและประวัติเมื่อมีหลักฐานชัด แก้คำว่า “คันนี้/รุ่นนั้น” จากบริบท — ถ้ารถหลายคันและกำกวมให้ถามให้ชัด ห้ามสร้างรายละเอียดรถที่ไม่มีในบริบท ห้ามนำบริบทแชทอื่นมาปะปน",
    "น้ำเสียง: เพื่อนคู่คิดเรื่องรถ พูดไทยธรรมชาติ สุภาพไม่แข็ง ศัพท์ช่างเท่าที่จำเป็นพร้อมอธิบายง่าย ไม่ขายเกินจริง",
    "ความปลอดภัยเบื้องต้นเท่านั้น (ยังไม่ใช่ Safety Layer เต็ม): เบรก พวงมาลัย ยาง เชื้อเพลิง ไฟฟ้าแรงสูง หรืออาการเสี่ยงอุบัติเหตุ — แนะนำหยุดใช้หรือพบช่างเมื่อเหมาะสม และห้ามรับรองความปลอดภัยจากข้อมูลไม่ครบ",
    "การเงินที่ไม่มีข้อมูลผู้ให้บริการจริงต้องติดป้ายประมาณการ — กฎหมาย/ภาษี/ประกันที่เปลี่ยนได้ต้องแนะนำให้ตรวจข้อมูลล่าสุด",
  ].join("\n");
}

function formatVehicleFacts(vehicle: ChatV3VehicleContextItem): string {
  const facts = vehicle.facts
    ? Object.entries(vehicle.facts)
        .filter(([, value]) => String(value ?? "").trim())
        .map(([key, value]) => `${key}: ${String(value).trim()}`)
    : [];
  const parts = [
    `- id=${vehicle.id}; ป้ายชื่อ: ${vehicle.label}`,
    vehicle.summary ? `  สรุป: ${vehicle.summary}` : null,
    facts.length > 0 ? `  ข้อเท็จจริงในบริบท: ${facts.join("; ")}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

/**
 * Per-turn vehicle + guidance addendum. Empty when there is nothing useful to add.
 */
export function buildChatV3AutomotiveTurnAddendum(
  analysis: ChatV3AutomotiveTurnAnalysis,
  vehicleContext?: ChatV3AutomotiveVehicleContext | null
): string {
  const lines: string[] = ["[บริบทการคิดรอบนี้]"];

  lines.push(`เจตนาหลัก: ${analysis.primaryIntent}`);
  if (analysis.isMultiIntent) {
    lines.push(`เจตนาที่เกี่ยวข้อง: ${analysis.intents.join(", ")}`);
  }
  lines.push(`ความเสี่ยงความปลอดภัย: ${analysis.safetyRiskLevel}`);
  if (analysis.freshnessRequired) {
    lines.push("ต้องการข้อมูลปัจจุบัน: ใช่ — ห้ามแต่ง และให้ติดป้ายเมื่อเป็นประมาณการ");
  }
  if (analysis.financeAssumptionsRequired) {
    lines.push("ค่างวด/การเงิน: ต้องระบุสมมติฐานและติดป้ายประมาณการหากไม่มีข้อมูลจริง");
  }
  if (analysis.needsClarification && analysis.clarificationFocus) {
    lines.push(`ควรชี้แจง/ถามกลับเมื่อจำเป็น: ${analysis.clarificationFocus}`);
  }

  const vehicles = vehicleContext?.vehicles ?? [];
  if (vehicles.length > 0) {
    lines.push("รถในบริบทบทสนทนานี้ (ใช้ได้เฉพาะที่ระบุ — ห้ามเติมสเปกเอง):");
    for (const vehicle of vehicles) {
      lines.push(formatVehicleFacts(vehicle));
    }
    if (analysis.resolvedVehicleId) {
      const resolved = vehicles.find((vehicle) => vehicle.id === analysis.resolvedVehicleId);
      if (resolved) {
        lines.push(`รถที่คำอ้างอิงน่าจะหมายถึง: ${resolved.label} (id=${resolved.id})`);
      }
    } else if (vehicleContext?.selectedVehicleId) {
      const selected = vehicles.find(
        (vehicle) => vehicle.id === vehicleContext.selectedVehicleId
      );
      if (selected) {
        lines.push(`รถที่เลือกอยู่ใน workspace: ${selected.label} (id=${selected.id})`);
      }
    }
  } else {
    lines.push("ยังไม่มีรายการรถในบริบท — ห้ามสมมติคันเฉพาะ");
  }

  if (analysis.guidanceNotes.length > 0) {
    lines.push("แนวทางรอบนี้:");
    for (const note of analysis.guidanceNotes) {
      lines.push(`- ${note}`);
    }
  }

  return lines.join("\n");
}

/**
 * Compose reasoning blocks for the system instruction.
 */
export function composeChatV3AutomotiveReasoningBlocks(
  options: BuildChatV3AutomotiveReasoningOptions
): {
  analysis: ChatV3AutomotiveTurnAnalysis;
  principles: string;
  turnAddendum: string;
} {
  const analysis = analyzeChatV3AutomotiveTurn(options);
  return {
    analysis,
    principles: buildChatV3AutomotiveReasoningPrinciples(),
    turnAddendum: buildChatV3AutomotiveTurnAddendum(
      analysis,
      options.vehicleContext
    ),
  };
}
