import React, { createContext, useContext } from "react";

export type ChatComposerContextValue = {
  /** เปิด file picker เดียวกับปุ่มแนบรูปใน composer (ไม่ส่งข้อความ) */
  openImageAttachmentPicker: () => void;
};

export const ChatComposerContext =
  createContext<ChatComposerContextValue | null>(null);

export function useChatComposer(): ChatComposerContextValue {
  const ctx = useContext(ChatComposerContext);
  if (!ctx) {
    throw new Error("useChatComposer must be used within ChatContainer");
  }
  return ctx;
}
