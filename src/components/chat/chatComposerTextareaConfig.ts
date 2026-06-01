/**
 * Native mobile keyboard dictation (Gboard / iOS / Samsung) needs a plain editable
 * textarea — not disabled/readOnly, with standard text-entry hints (no inputMode override).
 */
export const CHAT_COMPOSER_TEXTAREA_DICTATION_PROPS = {
  autoComplete: "on",
  autoCorrect: "on",
  spellCheck: true,
  enterKeyHint: "send",
  name: "chatMessage",
  lang: "th",
} as const;
