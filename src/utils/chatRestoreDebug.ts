/** Dev / staging-only trace for post-login pending draft restore (no production noise). */
export function isChatRestoreDebugEnabled(): boolean {
  const viteEnv =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      : undefined;
  if (viteEnv?.DEV) return true;
  const flag = viteEnv?.VITE_CHAT_RESTORE_DEBUG;
  if (flag === "1" || flag === "true") return true;
  if (typeof process !== "undefined" && process.env?.CHAT_RESTORE_DEBUG === "1") {
    return true;
  }
  return false;
}

export function chatRestoreLog(
  step: string,
  detail?: Record<string, unknown>
): void {
  if (!isChatRestoreDebugEnabled()) return;
  if (detail && Object.keys(detail).length > 0) {
    console.info(`[chat-restore] ${step}`, detail);
  } else {
    console.info(`[chat-restore] ${step}`);
  }
}
