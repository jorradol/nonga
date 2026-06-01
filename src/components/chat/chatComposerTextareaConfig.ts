/**
 * Native keyboard dictation (Gboard / OPPO / iOS) needs a plain editable textarea.
 *
 * On Android Chrome + multi-line textarea, `enterKeyHint="send"` maps to IME action SEND;
 * many OEM keyboards (OPPO, some Gboard builds) hide voice typing for that action and show
 * “แอปนี้ไม่รองรับการป้อนข้อมูลด้วยเสียง”.
 *
 * Mobile uses the smallest attribute set; desktop may use enterKeyHint for the send key label.
 */

/** OPPO / Android Chrome — keep only widely supported textarea attributes */
export const CHAT_COMPOSER_TEXTAREA_MOBILE_PROPS = {
  name: "message",
  spellCheck: true,
} as const;

export const CHAT_COMPOSER_TEXTAREA_DESKTOP_PROPS = {
  name: "message",
  spellCheck: true,
  autoComplete: "on",
  enterKeyHint: "send",
} as const;
