/**
 * WP-V3-10B — Deterministic user-constraint extraction from recent user turns only.
 * No DB memory. Assistant text is never treated as user facts.
 */
import type { ChatV3HistoryTurn } from "./chatV3ConversationContracts";

/** Max prior user turns scanned (excluding current message). */
export const CHAT_V3_USER_CONSTRAINT_HISTORY_LIMIT = 8;

export interface ChatV3UserConstraints {
  budgetMaxBaht?: number;
  budgetHintText?: string;
  usageProfile?: string;
  bodyOrVehicleType?: string;
  brandPreference?: string;
  transmission?: string;
  /** True when current message overrides a prior budget. */
  budgetUpdatedThisTurn: boolean;
  /** True when current message overrides a prior usage/type/brand/gear cue. */
  conditionsUpdatedThisTurn: boolean;
  knownFromHistory: string[];
}

function parseThaiScaledAmount(value: string, unit?: string): number {
  let n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  if (unit && /แสน/i.test(unit)) n *= 100_000;
  else if (unit && /ล้าน|ล\.|million/i.test(unit)) n *= 1_000_000;
  return Math.round(n);
}

function extractBudgetMaxBaht(text: string): number | undefined {
  const labeled =
    text.match(
      /งบ(?:ประมาณ)?(?:ไม่เกิน|สูงสุด|ประมาณ)?\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
    ) ??
    text.match(
      /ไม่เกิน\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
    ) ??
    text.match(
      /ประมาณ\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)\s*(?:บาท|฿)?/i
    );
  if (!labeled) return undefined;
  const n = parseThaiScaledAmount(labeled[1], labeled[2]);
  return n >= 10_000 ? n : undefined;
}

function extractUsageProfile(text: string): string | undefined {
  if (/รถครอบครัว|ใช้ครอบครัว|ครอบครัว/i.test(text)) return "ครอบครัว";
  if (/ในเมือง|ใช้ในเมือง|ขับเมือง/i.test(text)) return "ในเมือง";
  if (/ต่างจังหวัด|ขึ้นเขา|เที่ยวไกล|ทางไกล/i.test(text)) return "ต่างจังหวัด/ทางไกล";
  if (/มอเตอร์ไซค์|จักรยานยนต์|บิ๊กไบค์/i.test(text)) return "มอเตอร์ไซค์";
  if (/กระบะ|บรรทุก/i.test(text)) return "กระบะ/บรรทุกเบา";
  if (/ทำงาน|เดินทางไปทำงาน|คอมมิวท์/i.test(text)) return "ไปทำงาน";
  return undefined;
}

function extractBodyOrVehicleType(text: string): string | undefined {
  if (/SUV|เอสยูวี/i.test(text)) return "SUV";
  if (/เก๋ง|ซีดาน|sedan/i.test(text)) return "เก๋ง";
  if (/กระบะ|pickup|พิกอัพ/i.test(text)) return "กระบะ";
  if (/รถตู้|van/i.test(text)) return "รถตู้";
  if (/มอเตอร์ไซค์|จักรยานยนต์|บิ๊กไบค์/i.test(text)) return "มอเตอร์ไซค์";
  if (/รถครอบครัว/i.test(text)) return "รถครอบครัว";
  return undefined;
}

function extractBrandPreference(text: string): string | undefined {
  const m = text.match(
    /(?:ยี่ห้อ|แบรนด์|อยากได้|ชอบ|เน้น)\s*(Toyota|Honda|Mazda|Isuzu|Ford|Nissan|Mitsubishi|BYD|MG|Suzuki|โตโยต้า|ฮอนด้า|มาสด้า|อีซูซุ)/i
  );
  if (m) return m[1];
  const bare = text.match(
    /\b(Toyota|Honda|Mazda|Isuzu|Ford|Nissan|Mitsubishi|BYD|MG|Suzuki)\b/i
  );
  if (bare && /อยาก|ชอบ|เน้น|ยี่ห้อ|แบรนด์|เอา|หา/i.test(text)) {
    return bare[1];
  }
  return undefined;
}

function extractTransmission(text: string): string | undefined {
  if (/เกียร์ออโต้|ออโต้|AT\b|automatic/i.test(text)) return "ออโต้";
  if (/เกียร์ธรรมดา|แมนนวล|MT\b|manual/i.test(text)) return "ธรรมดา";
  return undefined;
}

function collectUserTexts(
  message: string,
  history: ChatV3HistoryTurn[] | undefined
): { current: string; priorUser: string[] } {
  const current = String(message ?? "").trim();
  const priorUser: string[] = [];
  if (!history?.length) return { current, priorUser };
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role !== "user") continue;
    const content = String(turn.content ?? "").trim();
    if (!content) continue;
    priorUser.push(content);
    if (priorUser.length >= CHAT_V3_USER_CONSTRAINT_HISTORY_LIMIT) break;
  }
  // priorUser is newest-first; reverse for chronological merge then override
  priorUser.reverse();
  return { current, priorUser };
}

/**
 * Merge user constraints: history first, current message wins.
 */
export function extractChatV3UserConstraints(input: {
  message: string;
  history?: ChatV3HistoryTurn[];
}): ChatV3UserConstraints {
  const { current, priorUser } = collectUserTexts(input.message, input.history);

  let budgetMaxBaht: number | undefined;
  let budgetHintText: string | undefined;
  let usageProfile: string | undefined;
  let bodyOrVehicleType: string | undefined;
  let brandPreference: string | undefined;
  let transmission: string | undefined;
  const knownFromHistory: string[] = [];

  for (const text of priorUser) {
    const budget = extractBudgetMaxBaht(text);
    if (budget != null) {
      budgetMaxBaht = budget;
      budgetHintText = `งบไม่เกินประมาณ ${budget.toLocaleString("th-TH")} บาท`;
    }
    const usage = extractUsageProfile(text);
    if (usage) usageProfile = usage;
    const body = extractBodyOrVehicleType(text);
    if (body) bodyOrVehicleType = body;
    const brand = extractBrandPreference(text);
    if (brand) brandPreference = brand;
    const gear = extractTransmission(text);
    if (gear) transmission = gear;
  }

  if (budgetMaxBaht != null) knownFromHistory.push(budgetHintText ?? "งบ");
  if (usageProfile) knownFromHistory.push(`การใช้งาน: ${usageProfile}`);
  if (bodyOrVehicleType) knownFromHistory.push(`ประเภท: ${bodyOrVehicleType}`);
  if (brandPreference) knownFromHistory.push(`ยี่ห้อ: ${brandPreference}`);
  if (transmission) knownFromHistory.push(`เกียร์: ${transmission}`);

  const priorBudget = budgetMaxBaht;
  const priorUsage = usageProfile;
  const priorBody = bodyOrVehicleType;
  const priorBrand = brandPreference;
  const priorGear = transmission;

  const currentBudget = extractBudgetMaxBaht(current);
  const currentUsage = extractUsageProfile(current);
  const currentBody = extractBodyOrVehicleType(current);
  const currentBrand = extractBrandPreference(current);
  const currentGear = extractTransmission(current);

  let budgetUpdatedThisTurn = false;
  let conditionsUpdatedThisTurn = false;

  if (currentBudget != null) {
    budgetUpdatedThisTurn =
      priorBudget != null && currentBudget !== priorBudget;
    budgetMaxBaht = currentBudget;
    budgetHintText = `งบไม่เกินประมาณ ${currentBudget.toLocaleString("th-TH")} บาท`;
  }
  if (currentUsage) {
    conditionsUpdatedThisTurn =
      conditionsUpdatedThisTurn ||
      (priorUsage != null && currentUsage !== priorUsage);
    usageProfile = currentUsage;
  }
  if (currentBody) {
    conditionsUpdatedThisTurn =
      conditionsUpdatedThisTurn ||
      (priorBody != null && currentBody !== priorBody);
    bodyOrVehicleType = currentBody;
  }
  if (currentBrand) {
    conditionsUpdatedThisTurn =
      conditionsUpdatedThisTurn ||
      (priorBrand != null &&
        currentBrand.toLowerCase() !== priorBrand.toLowerCase());
    brandPreference = currentBrand;
  }
  if (currentGear) {
    conditionsUpdatedThisTurn =
      conditionsUpdatedThisTurn ||
      (priorGear != null && currentGear !== priorGear);
    transmission = currentGear;
  }

  return {
    budgetMaxBaht,
    budgetHintText,
    usageProfile,
    bodyOrVehicleType,
    brandPreference,
    transmission,
    budgetUpdatedThisTurn,
    conditionsUpdatedThisTurn,
    knownFromHistory,
  };
}

export function formatChatV3UserConstraintsForInstruction(
  constraints: ChatV3UserConstraints
): string {
  const lines: string[] = ["[เงื่อนไขจากข้อความผู้ใช้ — อ่านเฉพาะฝั่งผู้ใช้]"];
  const facts: string[] = [];
  if (constraints.budgetHintText) facts.push(constraints.budgetHintText);
  if (constraints.usageProfile) facts.push(`การใช้งาน: ${constraints.usageProfile}`);
  if (constraints.bodyOrVehicleType) {
    facts.push(`ประเภท/ตัวถัง: ${constraints.bodyOrVehicleType}`);
  }
  if (constraints.brandPreference) {
    facts.push(`ยี่ห้อที่สนใจ: ${constraints.brandPreference}`);
  }
  if (constraints.transmission) {
    facts.push(`เกียร์: ${constraints.transmission}`);
  }
  if (facts.length === 0) {
    lines.push("ยังไม่มีเงื่อนไขงบ/การใช้งานที่ดึงได้จากข้อความผู้ใช้");
    return lines.join("\n");
  }
  for (const fact of facts) {
    lines.push(`- ${fact}`);
  }
  if (constraints.budgetUpdatedThisTurn) {
    lines.push("- ผู้ใช้เปลี่ยนงบในข้อความนี้ — ใช้งบล่าสุด");
  }
  if (constraints.conditionsUpdatedThisTurn) {
    lines.push("- ผู้ใช้เปลี่ยนเงื่อนไขในข้อความนี้ — ใช้เงื่อนไขล่าสุดและปรับคำแนะนำ");
  }
  lines.push("ห้ามนำข้อความผู้ช่วยมาเป็นข้อเท็จจริงของผู้ใช้");
  return lines.join("\n");
}

export function hasBudgetConstraint(constraints: ChatV3UserConstraints): boolean {
  return constraints.budgetMaxBaht != null || Boolean(constraints.budgetHintText);
}

export function hasUsageOrTypeConstraint(
  constraints: ChatV3UserConstraints
): boolean {
  return Boolean(
    constraints.usageProfile ||
      constraints.bodyOrVehicleType ||
      constraints.brandPreference ||
      constraints.transmission
  );
}
