import type { UserSession } from "../services/auth/authService";
import type { UserRole } from "./rbac";

export const DEALER_ENTRY_HINT_KEY = "nonga_dealer_entry_hint";

export type DealerEntryHint = "need-dealer-role" | "login";

export function setDealerEntryHint(hint: DealerEntryHint): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(DEALER_ENTRY_HINT_KEY, hint);
}

export function consumeDealerEntryHint(): DealerEntryHint | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(DEALER_ENTRY_HINT_KEY);
  sessionStorage.removeItem(DEALER_ENTRY_HINT_KEY);
  if (raw === "need-dealer-role" || raw === "login") return raw;
  return null;
}

export function dealerEntryHintMessage(hint: DealerEntryHint | null): string | null {
  if (hint === "need-dealer-role") {
    return "กรุณาเปิดสิทธิ์ดีลเลอร์เพื่อใช้งานระบบหลังบ้านเต็นท์รถ — เลือกบทบาทดีลเลอร์ด้านล่าง หรือกดเข้าสู่ระบบทดลองดีลเลอร์";
  }
  if (hint === "login") {
    return "เข้าสู่ระบบหรือตั้งค่าโปรไฟล์ก่อน แล้วเปิดสิทธิ์ดีลเลอร์เพื่อใช้ระบบหลังบ้านเต็นท์รถ";
  }
  return null;
}

function isDealerRole(role: UserRole | string | undefined): boolean {
  return role === "dealer" || role === "admin" || role === "superadmin";
}

/** ทางเข้า "ระบบดีลเลอร์พันธมิตร Nong A" — ไม่เปิด URL ภายนอก */
export function navigateDealerSystemEntry(
  setView: (view: "profile" | "dealer-portal" | "login") => void,
  user: UserSession | null | undefined,
  role: UserRole | string | undefined
): void {
  if (!user || role === "guest") {
    setDealerEntryHint("login");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/profile");
    }
    setView("profile");
    return;
  }

  if (isDealerRole(role)) {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dealer");
    }
    setView("dealer-portal");
    return;
  }

  setDealerEntryHint("need-dealer-role");
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", "/profile");
  }
  setView("profile");
}

/** ทางเข้า "สมัครดีลเลอร์พันธมิตร Nong A" — ไป profile เพื่อเปิดสิทธิ์จำลอง */
export function navigateDealerSignupEntry(
  setView: (view: "profile") => void
): void {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", "/profile");
  }
  setView("profile");
}
