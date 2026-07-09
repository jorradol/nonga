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
  {
    test: /unauthorized|401|เข้าสู่ระบบ/i,
    message: "กรุณาเข้าสู่ระบบใหม่แล้วลอง Confirm Import อีกครั้งครับ",
  },
  { test: /network|failed to fetch|fetch/i, message: "เชื่อมต่อระบบไม่สำเร็จ รบกวนลองใหม่อีกครั้งครับ" },
  { test: /timeout/i, message: "ระบบตอบช้าเกินไป รบกวนลองใหม่อีกครั้งครับ" },
  {
    test: /restricted to staging only|production import is blocked/i,
    message:
      "ระบบยังไม่พร้อมบันทึกข้อมูลใน staging กรุณาแจ้งผู้ดูแลระบบ",
  },
];

function appendRequestId(message: string, requestId?: string | null): string {
  const id = String(requestId ?? "").trim();
  if (!id) return message;
  if (message.includes(id)) return message;
  return `${message} (รหัสอ้างอิง: ${id})`;
}

/** แปลงข้อความ error ทางเทคนิคเป็นภาษาที่ผู้ใช้เข้าใจ */
export function toUserFacingMessage(
  technical: string | undefined | null,
  fallback: string,
  options?: { requestId?: string | null }
): string {
  const raw = (technical ?? "").trim();
  if (!raw) return appendRequestId(fallback, options?.requestId);
  if (/token|mock|debug|dealerId|api key|endpoint|firestore/i.test(raw)) {
    return appendRequestId(fallback, options?.requestId);
  }
  for (const { test, message } of FRIENDLY_BY_PATTERN) {
    if (test.test(raw)) return appendRequestId(message, options?.requestId);
  }
  if (/ไม่สำเร็จ|ล้มเหลว|ผิดพลาด|ไม่มี|ราคา|ปีรถ|brand|model/i.test(raw)) {
    return appendRequestId(raw, options?.requestId);
  }
  return appendRequestId(fallback, options?.requestId);
}

export function toUserFacingError(
  error: unknown,
  fallback: string,
  options?: { requestId?: string | null }
): string {
  if (error instanceof Error) {
    const requestId =
      options?.requestId ??
      (error as Error & { requestId?: string }).requestId;
    return toUserFacingMessage(error.message, fallback, { requestId });
  }
  return appendRequestId(fallback, options?.requestId);
}

export function logTechnicalError(
  scope: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  if (!isDev()) return;
  console.error(`[${scope}]`, error, extra ?? {});
}
