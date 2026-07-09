/**
 * v22.30 — Global buyer lead capture kill switch (server-side).
 * Default OFF when unset. Explicit "true" required to enable.
 * Do not enable in production without separate owner approval.
 */

export const NONGA_LEAD_CAPTURE_ENABLED_ENV = "NONGA_LEAD_CAPTURE_ENABLED";

/** Safe Thai copy when capture is OFF (no env/config leakage). */
export const BUYER_LEAD_CAPTURE_DISABLED_MESSAGE =
  "ตอนนี้ระบบส่งข้อมูลให้ผู้ขายยังไม่เปิดใช้งานในรอบ staging นี้ครับ — ยังไม่มีการบันทึกลีดและไม่มีการส่งต่อให้ผู้ขาย";

export function isLeadCaptureEnabled(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  return String(env[NONGA_LEAD_CAPTURE_ENABLED_ENV] ?? "")
    .trim()
    .toLowerCase() === "true";
}

export function assertLeadCaptureDefaultsOff(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): boolean {
  return !isLeadCaptureEnabled(env);
}
