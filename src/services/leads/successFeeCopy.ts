/**
 * v5.6I — Seller-facing success fee copy (foundation only; not shown in UI yet).
 */

import { SUCCESS_FEE_USER_FACING_TERM } from "./successFeePolicy";

export const SUCCESS_FEE_SELLER_TERM = SUCCESS_FEE_USER_FACING_TERM;

export const SUCCESS_FEE_SELLER_CALCULATED_AFTER_CLOSE =
  "ระบบจะคำนวณหลังผู้ขายยืนยันว่าปิดการขายได้";

export const SUCCESS_FEE_SELLER_PILOT_NO_REAL_PAYMENT =
  "ยังไม่มีการชำระเงินจริงในรอบทดสอบนี้";

export const SUCCESS_FEE_SELLER_ADMIN_REVIEW_FIRST =
  "ทีมงานจะตรวจสอบยอดกับผู้ขายก่อนดำเนินการจริง";

/** Strings that must not appear in buyer-facing surfaces. */
export const SUCCESS_FEE_BUYER_FORBIDDEN_TERMS = [
  "ค่าคอมมิชชั่น",
  "คอมมิชชั่น",
  "commission",
] as const;

export const SUCCESS_FEE_SELLER_NOTICE_LINES = [
  SUCCESS_FEE_SELLER_TERM,
  SUCCESS_FEE_SELLER_CALCULATED_AFTER_CLOSE,
  SUCCESS_FEE_SELLER_PILOT_NO_REAL_PAYMENT,
  SUCCESS_FEE_SELLER_ADMIN_REVIEW_FIRST,
] as const;
