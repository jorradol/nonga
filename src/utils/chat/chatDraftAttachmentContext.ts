import type { ChatMessage } from "../../types";
import { isSellIntent } from "../../services/ai/chat/sellIntentParser";

/** อยู่ใน flow สร้าง/แก้ประกาศจากแชท (Chat to Draft) */
export function isChatDraftSellContext(messages: ChatMessage[]): boolean {
  if (messages.some((m) => m.isDraftPreview)) return true;
  const recentUser = messages
    .filter((m) => m.sender === "user")
    .slice(-6);
  return recentUser.some((m) => isSellIntent(m.text));
}
