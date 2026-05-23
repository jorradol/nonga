/** Bridge legacy CTAs → modern AIChatView session */

export const PENDING_CHAT_MESSAGE_KEY = "nonga_pending_chat_message";

export function queuePendingChatMessage(message: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_CHAT_MESSAGE_KEY, message);
  } catch {
    /* ignore quota */
  }
}

export function takePendingChatMessage(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const msg = sessionStorage.getItem(PENDING_CHAT_MESSAGE_KEY);
    if (msg) sessionStorage.removeItem(PENDING_CHAT_MESSAGE_KEY);
    return msg;
  } catch {
    return null;
  }
}
