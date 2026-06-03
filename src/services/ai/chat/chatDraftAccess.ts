import type { ChatStorageScope } from "../../../utils/chatStorageScope";
import { resolveDealerInventoryScopeId } from "../../../utils/dealerIdentity";

/** ข้อความเมื่อ guest กดบันทึกประกาศ / action ที่ต้องยืนยันตัวตน */
export const CHAT_GUEST_LOGIN_SAVE_MESSAGE =
  "ถ้าต้องการบันทึกประกาศขายรถ น้องเอขอให้เข้าสู่ระบบก่อนนะครับ เพื่อยืนยันตัวตนผู้ขายและเพิ่มความน่าเชื่อถือให้ประกาศ — กดเข้าสู่ระบบจากเมนูด้านล่างในแถบข้างได้เลยครับ หลังเข้าสู่ระบบแล้ว น้องเอจะบันทึกประกาศต่อให้อัตโนมัติ";

/** แนะนำขั้นตอนผู้ขายรถบ้านครั้งแรก (hero / onboarding copy) */
export const CHAT_FIRST_SELLER_GUIDANCE =
  "ขายรถบ้านครั้งแรก? ขั้นตอนง่าย ๆ: ส่งรูปรถและข้อมูล → น้องเอช่วยร่างประกาศ → เข้าสู่ระบบ → บันทึกและลงตลาด";

/** รอบทดลอง closed pilot — ยังไม่เปิดสมัครทั่วไป */
export const CHAT_PILOT_CLOSED_INVITE_NOTICE =
  "รอบทดลอง — เปิดให้เฉพาะผู้ที่ได้รับเชิญ ยังไม่เปิดสมัครสมาชิกทั่วไป กรุณาใช้บัญชีที่ทีมงานส่งให้";

/** ข้อความเมื่อ member (ไม่ใช่ dealer) กดบันทึก dealer draft จากแชท */
export const CHAT_MEMBER_SELLER_FLOW_MESSAGE =
  "สำหรับสมาชิกทั่วไป ไปที่เมนู **ประกาศของฉัน** เพื่อสร้างและบันทึกประกาศขายรถบ้านได้ครับ — ข้อมูลสรุปจากแชทยังอยู่ให้คัดลอกต่อได้เลย";

/** v5.4.10 — admin/dealer ไม่มี dealer inventory scope */
export const CHAT_DEALER_INVENTORY_SCOPE_REQUIRED_MESSAGE =
  "บัญชีนี้ยังไม่มี dealer scope สำหรับบันทึก draft ดีลเลอร์ครับ — ใช้ Dealer Portal ด้วยบัญชี dealer ที่มีสิทธิ์ หรือติดต่อทีมงาน";

export function canSaveDealerDraftFromChat(options: {
  chatScope: ChatStorageScope;
  isDealer: boolean;
  isAdmin: boolean;
}): boolean {
  return (
    options.chatScope.mode === "dealer" || options.isDealer || options.isAdmin
  );
}

/** null = อนุญาตบันทึก dealer draft */
export function resolveChatDraftSaveBlockMessage(options: {
  isSignedIn: boolean;
  chatScope: ChatStorageScope;
  isDealer: boolean;
  isAdmin: boolean;
}): string | null {
  if (!options.isSignedIn) {
    return CHAT_GUEST_LOGIN_SAVE_MESSAGE;
  }
  if (
    !canSaveDealerDraftFromChat({
      chatScope: options.chatScope,
      isDealer: options.isDealer,
      isAdmin: options.isAdmin,
    })
  ) {
    return CHAT_MEMBER_SELLER_FLOW_MESSAGE;
  }
  return null;
}

/** null = อนุญาตบันทึก dealer draft (มี dealer inventory scope) */
export function resolveChatDealerDraftScopeBlockMessage(options: {
  isSignedIn: boolean;
  chatScope: ChatStorageScope;
  isDealer: boolean;
  isAdmin: boolean;
  user: { dealerId?: string; uid?: string; role?: string } | null;
  role: string | undefined;
}): string | null {
  const base = resolveChatDraftSaveBlockMessage({
    isSignedIn: options.isSignedIn,
    chatScope: options.chatScope,
    isDealer: options.isDealer,
    isAdmin: options.isAdmin,
  });
  if (base) return base;

  const scopeId = resolveDealerInventoryScopeId(options.user, options.role);
  if (!scopeId) {
    return CHAT_DEALER_INVENTORY_SCOPE_REQUIRED_MESSAGE;
  }
  return null;
}
