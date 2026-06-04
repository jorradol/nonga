/**
 * v5.6G — Seller contact reveal MVP copy (UI + confirmation).
 */

import type { LeadContactOutcome } from "./leadTypes";
import { LEAD_OUTCOME_UI_LABELS } from "./leadPolicy";

export const SELLER_REVEAL_CONFIRM_MESSAGE =
  "ระบบจะบันทึกว่าคุณเปิดข้อมูลติดต่อของผู้สนใจรายนี้แล้ว และต้องอัปเดตผลการติดต่อก่อนเปิดคิวถัดไป";

export const SELLER_REVEAL_PRIVACY_NOTICE =
  "เบอร์นี้ใช้เพื่อติดต่อซื้อขายรถคันนี้เท่านั้น — ห้ามนำไปใช้นอกเหตุผลหรือแชร์ให้ผู้อื่น";

export const SELLER_REVEAL_WAITING_PREVIOUS = "รอผลคิวก่อนหน้า";

/** Outcomes seller may record in v5.6G MVP (no payment/settlement). */
export const SELLER_REVEAL_OUTCOME_OPTIONS: ReadonlyArray<{
  value: LeadContactOutcome;
  label: string;
}> = [
  { value: "contacting", label: LEAD_OUTCOME_UI_LABELS.contacting },
  { value: "viewing_scheduled", label: LEAD_OUTCOME_UI_LABELS.viewing_scheduled },
  { value: "unreachable", label: LEAD_OUTCOME_UI_LABELS.unreachable },
  { value: "no_progress", label: LEAD_OUTCOME_UI_LABELS.no_progress },
  { value: "closed_won", label: LEAD_OUTCOME_UI_LABELS.closed_won },
  { value: "reported_to_admin", label: LEAD_OUTCOME_UI_LABELS.reported_to_admin },
] as const;

export const SELLER_REVEAL_OUTCOME_VALUES: ReadonlySet<LeadContactOutcome> = new Set(
  SELLER_REVEAL_OUTCOME_OPTIONS.map((o) => o.value)
);
