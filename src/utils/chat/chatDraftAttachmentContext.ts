import type { ChatMessage } from "../../types";
import type { ChatStorageScope } from "../chatStorageScope";
import {
  extractCarFieldsFromMessage,
  isSellIntent,
} from "../../services/ai/chat/sellIntentParser";

/** อยู่ใน flow สร้าง/แก้ประกาศจากแชท (Chat to Draft) */
export function isChatDraftSellContext(messages: ChatMessage[]): boolean {
  if (messages.some((m) => m.isDraftPreview)) return true;
  const recentUser = messages
    .filter((m) => m.sender === "user")
    .slice(-6);
  return recentUser.some((m) => isSellIntent(m.text));
}

/** คิวรูปรอผูก draft เมื่อส่งในแชทดีลเลอร์ */
export function shouldQueueImagesForDraft(
  scope: ChatStorageScope,
  messages: ChatMessage[],
  trimmedUserText: string
): boolean {
  if (scope.mode !== "dealer") return false;
  if (isChatDraftSellContext(messages)) return true;
  if (trimmedUserText && isSellIntent(trimmedUserText)) return true;
  if (trimmedUserText) {
    const fields = extractCarFieldsFromMessage(trimmedUserText);
    if (fields.brand && fields.model) return true;
  }
  return false;
}

/** รวบรวมรูปจากแชทดีลเลอร์เมื่อบันทึกประกาศ — ถ้ามีรูปใน session ให้ผูกเสมอ */
export function shouldAttachSessionImagesOnDraftSave(
  scope: ChatStorageScope,
  messages: ChatMessage[]
): boolean {
  if (scope.mode !== "dealer") return false;
  return messages.some(
    (m) =>
      m.sender === "user" &&
      m.attachments?.some((a) => a.kind === "image")
  );
}
