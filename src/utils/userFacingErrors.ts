function isDev(): boolean {
  try {
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

const FRIENDLY_BY_PATTERN: { test: RegExp; message: string }[] = [
  { test: /ไม่มีสิทธิ์|403|forbidden/i, message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้ครับ" },
  { test: /ไม่พบ|404|not found/i, message: "ไม่พบรายการที่ต้องการครับ" },
  { test: /unauthorized|401/i, message: "กรุณาเข้าสู่ระบบหรือเปิดสิทธิ์ดีลเลอร์ใหม่ครับ" },
  { test: /network|failed to fetch|fetch/i, message: "เชื่อมต่อระบบไม่สำเร็จ รบกวนลองใหม่อีกครั้งครับ" },
  { test: /timeout/i, message: "ระบบตอบช้าเกินไป รบกวนลองใหม่อีกครั้งครับ" },
];

/** แปลงข้อความ error ทางเทคนิคเป็นภาษาที่ผู้ใช้เข้าใจ */
export function toUserFacingMessage(
  technical: string | undefined | null,
  fallback: string
): string {
  const raw = (technical ?? "").trim();
  if (!raw) return fallback;
  if (/token|mock|debug|dealerId|api key|endpoint|firestore/i.test(raw)) {
    return fallback;
  }
  for (const { test, message } of FRIENDLY_BY_PATTERN) {
    if (test.test(raw)) return message;
  }
  if (/ไม่สำเร็จ|ล้มเหลว|ผิดพลาด/.test(raw) && !/draft/i.test(raw)) {
    return raw;
  }
  return fallback;
}

export function toUserFacingError(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error) {
    return toUserFacingMessage(error.message, fallback);
  }
  return fallback;
}

export function logTechnicalError(
  scope: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  if (!isDev()) return;
  console.error(`[${scope}]`, error, extra ?? {});
}
