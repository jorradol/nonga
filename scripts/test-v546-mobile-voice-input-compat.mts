/**
 * v5.4.6 — mobile keyboard dictation compatibility (source checks)
 * npm run test:v546-mobile-voice-input-compat
 */
import fs from "node:fs";
import path from "node:path";

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function mustInclude(src: string, needle: string, label: string): void {
  if (!src.includes(needle)) fail(label, `missing: ${needle}`);
  pass(label);
}

function mustNotInclude(src: string, needle: string, label: string): void {
  if (src.includes(needle)) fail(label, `unexpected: ${needle}`);
  pass(label);
}

function main(): void {
  console.log("=== v5.4.6 mobile voice input (keyboard dictation) compat ===\n");

  const container = read("src/components/chat/ChatContainer.tsx");
  const config = read("src/components/chat/chatComposerTextareaConfig.ts");
  const autosize = read("src/hooks/chat/useChatTextareaAutosize.ts");

  mustInclude(container, "<textarea", "composer-uses-textarea");
  mustNotInclude(container, "contentEditable", "composer-no-contenteditable");

  const textareaTag = container.match(/<textarea[\s\S]*?id="chat-textarea-elt"/)?.[0];
  if (!textareaTag) fail("composer-textarea-block", "chat textarea not found");
  mustNotInclude(textareaTag, "disabled", "composer-textarea-not-disabled");
  mustNotInclude(textareaTag, "readOnly", "composer-textarea-not-readonly");
  mustInclude(container, "CHAT_COMPOSER_TEXTAREA_DICTATION_PROPS", "composer-dictation-props-import");
  mustInclude(container, "onInput={(e) => syncComposerText", "composer-on-input-for-dictation");
  mustInclude(container, "onCompositionStart", "composer-composition-start");
  mustInclude(container, "onCompositionEnd", "composer-composition-end");
  mustInclude(container, "pauseWhileComposing", "composer-autosize-pause-composing");

  mustInclude(config, 'autoComplete: "on"', "dictation-autocomplete-on");
  mustInclude(config, 'autoCorrect: "on"', "dictation-autocorrect-on");
  mustInclude(config, "spellCheck: true", "dictation-spellcheck");
  mustInclude(config, 'enterKeyHint: "send"', "dictation-enter-key-hint");
  mustNotInclude(config, "inputMode:", "dictation-no-inputmode-override");
  mustNotInclude(config, "readOnly:", "dictation-config-no-readonly");

  mustInclude(autosize, "pauseWhileComposing", "autosize-hook-composing-pause");

  const usability = read("scripts/test-v546-mobile-chat-usability.mts");
  mustInclude(usability, "max-md:fixed", "usability-still-checks-mobile-composer");

  console.log("\n=== v5.4.6 mobile voice input compat — OK ===\n");
}

main();
