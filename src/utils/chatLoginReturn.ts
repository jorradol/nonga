/** หน้าที่รองรับหลัง login จาก flow แชท (ไม่ขยาย auth guard) */
export type ChatLoginReturnView = "chat" | "my-listings";

type AppView = ChatLoginReturnView;

let pendingReturnView: AppView | null = null;

/** จำหน้าที่ต้องกลับหลัง login (เช่น จากแชทตอนกดยืนยันสร้างประกาศ) */
export function setChatLoginReturnView(view: AppView = "chat"): void {
  pendingReturnView = view;
}

export function peekChatLoginReturnView(): AppView | null {
  return pendingReturnView;
}

export function consumeChatLoginReturnView(): AppView | null {
  const view = pendingReturnView;
  pendingReturnView = null;
  return view;
}
