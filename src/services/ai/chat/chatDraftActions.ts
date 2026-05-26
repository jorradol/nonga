import type { ExtractedCarFields } from "./sellIntentParser";

/** ข้อความที่ผู้ใช้เห็นเมื่อกดปุ่มบันทึกจากแชท */
export const CHAT_SAVE_LISTING_ACTION = "บันทึกประกาศ";

const LEGACY_SAVE_ACTIONS = ["บันทึกเป็น Draft"] as const;

export function isSaveListingChatAction(message: string): boolean {
  const t = message.trim();
  if (t === CHAT_SAVE_LISTING_ACTION) return true;
  return (LEGACY_SAVE_ACTIONS as readonly string[]).includes(t);
}

export interface DealerDraftFromChatPayload {
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  color?: string;
  description?: string;
  fuelType?: string;
  condition?: string;
  title: string;
}

export function buildDealerDraftPayloadFromChat(
  fields: ExtractedCarFields
): { payload: DealerDraftFromChatPayload; missing: string[] } {
  const missing: string[] = [];
  const brand = fields.brand?.trim() ?? "";
  const model = fields.model?.trim() ?? "";
  if (!brand) missing.push("ยี่ห้อ");
  if (!model) missing.push("รุ่น");

  const year = Number(fields.year);
  if (!Number.isFinite(year) || year < 1900) missing.push("ปี");

  const price = Number(fields.price);
  if (!Number.isFinite(price) || price <= 0) missing.push("ราคา");

  const mileage = Number(fields.mileage);
  if (!Number.isFinite(mileage) || mileage < 0) missing.push("เลขไมล์");

  const descParts: string[] = [];
  if (fields.licensePlate?.trim()) {
    descParts.push(`ทะเบียน ${fields.licensePlate.trim()}`);
  }
  if (fields.trimSubModel?.trim()) descParts.push(fields.trimSubModel.trim());
  if (fields.transmission?.trim()) descParts.push(fields.transmission.trim());
  if (fields.description?.trim()) descParts.push(fields.description.trim());

  const titleParts = [brand, model, Number.isFinite(year) ? String(year) : ""]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    payload: {
      ...(brand ? { brand } : {}),
      ...(model ? { model } : {}),
      ...(Number.isFinite(year) && year >= 1900 ? { year } : {}),
      ...(Number.isFinite(price) && price > 0 ? { price } : {}),
      ...(Number.isFinite(mileage) && mileage >= 0 ? { mileage } : {}),
      color: fields.color?.trim() || undefined,
      description: descParts.length > 0 ? descParts.join(" · ") : undefined,
      fuelType: fields.fuelType?.trim() || undefined,
      condition: fields.transmission?.trim() || undefined,
      title: titleParts || "ร่างประกาศจากแชท",
    },
    missing,
  };
}

export function logChatDraftSave(
  phase: "request" | "response" | "error",
  data: Record<string, unknown>
): void {
  try {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (!env?.DEV) return;
    const tag =
      phase === "request"
        ? "[NongA Chat → POST /api/dealer/drafts/new]"
        : phase === "response"
          ? "[NongA Chat draft save OK]"
          : "[NongA Chat draft save FAILED]";
    if (phase === "error") {
      console.error(tag, data);
    } else {
      console.debug(tag, data);
    }
  } catch {
    // ignore
  }
}
