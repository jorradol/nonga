/**
 * v5.4.6-mobile — mobile keyboard dictation compatibility (source checks)
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
  console.log("=== v5.4.6-mobile voice input (keyboard dictation) compat ===\n");

  const container = read("src/components/chat/ChatContainer.tsx");
  const config = read("src/components/chat/chatComposerTextareaConfig.ts");
  const textareaCmp = read("src/components/chat/ChatComposerTextarea.tsx");
  const autosize = read("src/hooks/chat/useChatTextareaAutosize.ts");
  const attachment = read("src/components/chat/ChatImageAttachmentInput.tsx");

  mustInclude(container, "ChatComposerTextarea", "composer-uses-chat-composer-textarea");
  mustNotInclude(container, "contentEditable", "composer-no-contenteditable");
  mustNotInclude(container, "CHAT_COMPOSER_TEXTAREA_DICTATION_PROPS", "no-legacy-dictation-props");
  mustInclude(container, 'id="chat-composer-box"', "composer-box-present");
  mustInclude(container, "aria-busy={isGenerating", "aria-busy-on-wrapper");
  mustNotInclude(
    container.slice(container.indexOf('id="chat-textarea-elt"') - 400, container.indexOf('id="chat-textarea-elt"') + 200),
    "aria-busy",
    "textarea-no-aria-busy"
  );
  mustInclude(container, "onBeforeInput={handleComposerBeforeInput}", "composer-beforeinput-dictation");
  mustInclude(container, "onInput={(e) => syncComposerText", "composer-on-input");
  mustInclude(container, "onCompositionStart", "composer-composition-start");
  mustInclude(container, "onCompositionEnd", "composer-composition-end");
  mustInclude(container, "onBlur={handleComposerBlur}", "composer-blur-reset-composing");
  mustInclude(container, "pauseWhileComposing", "composer-autosize-pause-composing");
  mustInclude(container, "relative z-[1]", "textarea-above-composer-controls");

  mustInclude(textareaCmp, "CHAT_COMPOSER_TEXTAREA_MOBILE_PROPS", "mobile-props-branch");
  mustInclude(textareaCmp, "CHAT_COMPOSER_TEXTAREA_DESKTOP_PROPS", "desktop-props-branch");
  mustInclude(textareaCmp, "useChatComposerIsMobile", "mobile-breakpoint-hook");

  mustInclude(config, "CHAT_COMPOSER_TEXTAREA_MOBILE_PROPS", "config-mobile-props");
  const mobileBlock =
    config.match(
      /CHAT_COMPOSER_TEXTAREA_MOBILE_PROPS\s*=\s*\{[\s\S]*?\}\s*as const/
    )?.[0] ?? "";
  if (!mobileBlock) fail("config-mobile-block", "mobile props block not found");
  mustNotInclude(mobileBlock, "enterKeyHint", "mobile-config-no-enterkeyhint");
  mustNotInclude(mobileBlock, "autoCorrect", "mobile-config-no-autocorrect");
  mustNotInclude(mobileBlock, "lang", "mobile-config-no-lang");
  mustNotInclude(config, "aria-busy", "mobile-config-no-aria-busy");
  mustNotInclude(config, "inputMode:", "config-no-inputmode");
  mustInclude(config, "spellCheck: true", "config-spellcheck");
  mustInclude(config, 'enterKeyHint: "send"', "desktop-config-enterkeyhint-only");

  mustInclude(autosize, "pauseWhileComposing", "autosize-hook-composing-pause");

  mustInclude(attachment, "tabIndex={-1}", "file-input-out-of-tab-order");
  mustInclude(attachment, "aria-hidden", "file-input-aria-hidden");

  const usability = read("scripts/test-v546-mobile-chat-usability.mts");
  mustInclude(usability, "max-md:fixed", "usability-still-checks-mobile-composer");

  console.log("\n=== v5.4.6-mobile voice input compat — OK ===\n");
}

main();
