export type SafeStorageResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable" | "unknown"; message: string };

const QUOTA_MESSAGE =
  "พื้นที่จัดเก็บในเบราว์เซอร์เต็มแล้ว — ระบบจะดำเนินการต่อได้ แต่ข้อมูลบางส่วนอาจไม่ถูกบันทึกถาวร ลองลบแบบร่างเก่าหรือล้างข้อมูลเว็บไซต์นี้";

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === "QuotaExceededError" ||
    err.code === 22 ||
    err.code === 1014
  );
}

/** setItem พร้อม try/catch — ไม่ throw */
export function safeSetItem(key: string, value: string): SafeStorageResult {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      ok: false,
      reason: "unavailable",
      message: "เบราว์เซอร์ไม่รองรับการจัดเก็บข้อมูลในเครื่อง",
    };
  }

  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (err) {
    if (isQuotaError(err)) {
      return { ok: false, reason: "quota", message: QUOTA_MESSAGE };
    }
    return {
      ok: false,
      reason: "unknown",
      message: "บันทึกข้อมูลในเครื่องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
