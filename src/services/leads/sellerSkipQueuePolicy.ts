/**
 * v5.6E — Seller skip queue before contact reveal (pure policy).
 */

import type { BuyerLead, SellerSkipReason } from "./leadTypes";
import { assertSellerRevealTarget } from "./buyerLeadQueuePolicy";

export const SELLER_SKIP_REASON_OPTIONS: ReadonlyArray<{
  value: SellerSkipReason;
  label: string;
}> = [
  { value: "offer_below_expectation", label: "ราคาเสนอไม่ถึงเกณฑ์" },
  { value: "purchase_method_mismatch", label: "วิธีซื้อไม่ตรงที่ต้องการ" },
  { value: "insufficient_info", label: "ข้อมูลยังไม่พอ" },
  { value: "suspected_inaccurate", label: "สงสัยข้อมูลไม่ถูกต้อง" },
  { value: "other", label: "อื่น ๆ" },
] as const;

const SKIP_REASON_SET = new Set<SellerSkipReason>(
  SELLER_SKIP_REASON_OPTIONS.map((o) => o.value)
);

const COARSE_SKIP_NOTE = /(โง่|บ้า|ห่า|ควาย|สัตว์|เหี้ย)/i;
const PHONE_IN_NOTE = /(?:0[689]\d[\s-]?){1}\d{3}[\s-]?\d{4}|0[689]\d{8}/;

export function isValidSellerSkipReason(value: string): value is SellerSkipReason {
  return SKIP_REASON_SET.has(value as SellerSkipReason);
}

export function validateSellerSkipNote(
  reason: SellerSkipReason,
  note?: string
): { ok: true; note?: string } | { ok: false; message: string } {
  if (reason !== "other") {
    const trimmed = note?.trim();
    if (trimmed && (trimmed.length > 120 || COARSE_SKIP_NOTE.test(trimmed))) {
      return { ok: false, message: "หมายเหตุสั้น ๆ ต้องสุภาพและไม่เกิน 120 ตัวอักษรครับ" };
    }
    if (trimmed && PHONE_IN_NOTE.test(trimmed)) {
      return { ok: false, message: "หมายเหตุไม่ควรมีเบอร์โทรครับ" };
    }
    return { ok: true, note: trimmed || undefined };
  }
  const trimmed = note?.trim() ?? "";
  if (!trimmed || trimmed.length < 2) {
    return { ok: false, message: "กรุณาระบุเหตุผลสั้น ๆ เมื่อเลือก “อื่น ๆ” ครับ" };
  }
  if (trimmed.length > 120 || COARSE_SKIP_NOTE.test(trimmed)) {
    return { ok: false, message: "หมายเหตุสั้น ๆ ต้องสุภาพและไม่เกิน 120 ตัวอักษรครับ" };
  }
  if (PHONE_IN_NOTE.test(trimmed)) {
    return { ok: false, message: "หมายเหตุไม่ควรมีเบอร์โทรครับ" };
  }
  return { ok: true, note: trimmed };
}

export function buildBuyerSkipFeedbackMessage(
  reason: SellerSkipReason,
  note?: string
): string {
  const reasonLine =
    reason === "offer_below_expectation"
      ? "ข้อเสนออาจยังต่ำกว่าที่ผู้ขายพิจารณาในรอบนี้"
      : reason === "purchase_method_mismatch"
        ? "วิธีซื้ออาจยังไม่ตรงกับเงื่อนไขที่ผู้ขายสะดวกในรอบนี้"
        : reason === "insufficient_info"
          ? "ข้อมูลที่ให้มายังไม่พอให้ผู้ขายตัดสินใจติดต่อกลับ"
          : reason === "suspected_inaccurate"
            ? "ข้อมูลบางส่วนอาจต้องตรวจสอบเพิ่มเติม"
            : note?.trim()
              ? `เหตุผลเพิ่มเติม: ${note.trim()}`
              : "ผู้ขายระบุเหตุผลเพิ่มเติมในรอบนี้";

  return [
    "ผู้ขายยังไม่ได้เลือกติดต่อกลับในรอบนี้ เนื่องจาก:",
    reasonLine,
    "น้องเอแนะนำให้ปรับข้อมูลหรือเลือกคันที่เหมาะกับงบ/วิธีซื้อของคุณมากขึ้น เพื่อเพิ่มโอกาสให้ผู้ขายติดต่อกลับในครั้งถัดไปครับ",
  ].join("\n");
}

export function assertSellerCanSkipBeforeReveal<T extends BuyerLead>(
  leads: T[],
  listingId: string,
  targetLeadId: string
):
  | { ok: true; lead: T }
  | { ok: false; code: "outcome_required" | "not_your_turn" | "not_found" | "already_revealed" } {
  const lead = leads.find((l) => l.id === targetLeadId && l.listingId === listingId);
  if (!lead) return { ok: false, code: "not_found" };
  if (lead.contactRevealStatus !== "locked") {
    return { ok: false, code: "already_revealed" };
  }
  const gate = assertSellerRevealTarget(leads, listingId, targetLeadId);
  if (gate.ok === false) {
    if (gate.code === "outcome_required") return { ok: false, code: "outcome_required" };
    return { ok: false, code: "not_your_turn" };
  }
  return { ok: true, lead: gate.lead };
}

/** Masked seller queue rows must never expose full Thai mobile numbers. */
export function sellerMaskedQueueEntryHasNoFullPhone(
  entry: Pick<{ contactPhone: string; contactMasked: boolean }, "contactPhone" | "contactMasked">
): boolean {
  const digits = entry.contactPhone.replace(/\D/g, "");
  if (entry.contactMasked) {
    return digits.length < 10 || entry.contactPhone.includes("***") || entry.contactPhone.includes("•");
  }
  return digits.length !== 10;
}
