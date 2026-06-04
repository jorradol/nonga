/**
 * v5.6F — Guards for future Smart Sales AI text calls (no API wired in this round).
 */

import { SMART_SALES_AI_MAX_INPUT_CHARS } from "./smartSalesMode";

const SENSITIVE_DOC_PATTERNS = [
  /สำเนาบัตร/i,
  /บัตรประชาชน/i,
  /สลิป/i,
  /book\s*bank/i,
  /บัญชีธนาคาร/i,
  /passport/i,
  /พาสปอร์ต/i,
];

const COMMISSION_LANGUAGE_PATTERNS = [
  /ค่าคอม/i,
  /commission/i,
  /success\s*fee/i,
  /ค่าบริการน้องเอ/i,
];

const PROMISE_PATTERNS = [
  /อนุมัติไฟแนนซ์/i,
  /การันตี.*ขาย/i,
  /รับประกัน.*ปิดดีล/i,
  /จองคิว.*ได้แน่/i,
];

export type SmartSalesAiGuardResult =
  | { ok: true }
  | { ok: false; reason: string };

export function guardSmartSalesAiInput(message: string): SmartSalesAiGuardResult {
  const text = message.trim();
  if (!text) return { ok: false, reason: "empty_input" };
  if (text.length > SMART_SALES_AI_MAX_INPUT_CHARS) {
    return { ok: false, reason: "input_too_long" };
  }
  if (SENSITIVE_DOC_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, reason: "sensitive_document_request" };
  }
  if (COMMISSION_LANGUAGE_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, reason: "commission_language" };
  }
  if (PROMISE_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, reason: "sale_or_finance_promise" };
  }
  return { ok: true };
}

/** Reject free-form AI output that invents specs or asks for documents. */
export function guardSmartSalesAiStructuredOutput(payload: {
  fields?: Record<string, unknown>;
  narrative?: string;
}): SmartSalesAiGuardResult {
  const narrative = String(payload.narrative ?? "");
  if (narrative && SENSITIVE_DOC_PATTERNS.some((re) => re.test(narrative))) {
    return { ok: false, reason: "sensitive_document_in_output" };
  }
  const fields = payload.fields ?? {};
  const forbiddenKeys = ["vin", "engineNumber", "chassis", "licensePlate", "contactPhone", "phone"];
  for (const key of forbiddenKeys) {
    if (key in fields && fields[key] != null && String(fields[key]).trim()) {
      return { ok: false, reason: `forbidden_field_${key}` };
    }
  }
  return { ok: true };
}
