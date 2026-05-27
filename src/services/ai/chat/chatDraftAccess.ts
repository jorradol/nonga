import type { ChatStorageScope } from "../../../utils/chatStorageScope";

/** ข้อความเมื่อ guest กดบันทึกประกาศ / action ที่ต้องยืนยันตัวตน */
export const CHAT_GUEST_LOGIN_SAVE_MESSAGE =
  "ถ้าต้องการบันทึกประกาศขายรถ น้องเอขอให้เข้าสู่ระบบก่อนนะครับ เพื่อยืนยันตัวตนผู้ขายและเพิ่มความน่าเชื่อถือให้ประกาศ — กดเข้าสู่ระบบจากเมนูด้านบนได้เลยครับ";

/** ข้อความเมื่อ member (ไม่ใช่ dealer) กดบันทึก dealer draft จากแชท */
export const CHAT_MEMBER_SELLER_FLOW_MESSAGE =
  "สำหรับสมาชิกทั่วไป ไปที่เมนู **ประกาศของฉัน** เพื่อสร้างและบันทึกประกาศขายรถบ้านได้ครับ — ข้อมูลสรุปจากแชทยังอยู่ให้คัดลอกต่อได้เลย";

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
