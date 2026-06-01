/**
 * v5.4.6-mobile.1 — Chat First mobile usability layout (source checks)
 * npm run test:v546-mobile-chat-usability
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
  console.log("=== Nong A v5.4.6-mobile.1 Chat Mobile Usability ===\n");

  const container = read("src/components/chat/ChatContainer.tsx");
  const aiView = read("src/components/AIChatView.tsx");
  const sidebar = read("src/components/chat/ChatSidebar.tsx");
  const css = read("src/index.css");
  const attachment = read("src/components/chat/ChatImageAttachmentInput.tsx");
  const bubble = read("src/components/chat/ChatMessageBubble.tsx");
  const savedCard = read("src/components/chat/ChatSavedMemberListingCard.tsx");

  mustInclude(container, "min-h-0", "chat-container-min-h-0");
  mustInclude(container, "chat-scroll-padding-composer", "feed-scroll-padding-composer");
  mustInclude(container, "chat-composer-safe-bottom", "composer-safe-area-class");
  mustInclude(container, "max-md:sticky", "composer-mobile-sticky");
  mustInclude(container, "overflow-y-auto", "feed-overflow-y-auto");
  mustNotInclude(container, "absolute inset-0 overflow-y-auto", "feed-no-absolute-inset-scroll");
  mustInclude(container, "h-12 md:h-16", "mobile-compact-header");
  mustInclude(container, "md:h-16", "desktop-header-preserved");
  mustInclude(container, "max-md:min-w-11", "mobile-touch-send");

  mustInclude(aiView, "min-h-0", "ai-chat-root-min-h-0");
  mustInclude(aiView, "matchMedia(\"(min-width: 768px)\")", "sidebar-viewport-sync");

  mustInclude(sidebar, "md:hidden", "sidebar-overlay-mobile-only");
  mustInclude(sidebar, "md:static", "sidebar-desktop-static");
  mustInclude(sidebar, "-translate-x-full", "sidebar-drawer-hidden-when-closed");
  mustInclude(sidebar, "max-md:max-h-[100dvh]", "sidebar-mobile-dvh-cap");

  mustInclude(css, "chat-composer-safe-bottom", "css-composer-safe-bottom");
  mustInclude(css, "safe-area-inset-bottom", "css-safe-area-inset");

  mustInclude(attachment, "overflow-x-auto", "attachment-preview-horizontal-scroll");
  mustInclude(attachment, "max-h-14", "attachment-preview-max-height");

  mustInclude(bubble, "md:min-w-[450px]", "draft-editor-desktop-min-width");
  mustNotInclude(bubble, "min-w-[280px]", "draft-editor-no-fixed-mobile-min-width");

  mustInclude(savedCard, "max-w-full", "saved-card-max-width");
  mustInclude(savedCard, "max-md:flex-col", "saved-card-mobile-stacked-buttons");

  const slider = read("src/components/chat/ChatSidebarNewCarsSlider.tsx");
  mustInclude(slider, "max-h-[84px]", "new-cars-compact-mobile-height");
  mustInclude(slider, "md:max-h-[132px]", "new-cars-desktop-height-preserved");

  const carCard = read("src/components/chat/ChatCarCard.tsx");
  mustInclude(carCard, "max-w-full min-w-0", "car-card-contained");

  console.log("\n=== v5.4.6-mobile.1 chat mobile usability — OK ===");
}

main();
