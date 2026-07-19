/**
 * Chat Experience V2 (Phase V2-1) — isolation + route guard (source checks)
 * npm run test:chat-v2-experience-guard
 *
 * Guards:
 * 1. Route isolation: /chat-v2 exists; /chat mapping and the default route
 *    are unchanged; no redirect from /chat; Header public nav untouched.
 * 2. Brain isolation: V2 namespace never imports providers/orchestrators/
 *    prompts/server code and never opens its own network path; conversation
 *    goes through the existing ChatProvider/useChatContext sendMessage.
 * 3. Inventory grounding: vehicles come only from structured carCards via
 *    the D1 trusted derivation; no AI-text parsing, no mock vehicles,
 *    no availability claims, no lead/dealer actions.
 * 4. Honest controls: no non-functional voice/camera/upload buttons.
 * 5. Design identity: canonical fonts + slate/orange tokens unchanged;
 *    V2 supports reduced motion and aria-live status.
 * 6. /chat baseline: AIChatView + D1 panel wiring unchanged.
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

function listFilesRecursive(dirAbs: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const p = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(p));
    else out.push(p);
  }
  return out;
}

function main(): void {
  console.log("=== Chat Experience V2 guard (Phase V2-1) ===\n");

  // ---------- 1. Route isolation ----------
  const routeSync = read("src/utils/appRouteSync.ts");
  mustInclude(routeSync, '"chat-v2"', "route-chat-v2-view-registered");
  mustInclude(
    routeSync,
    'if (path === "/chat-v2") return "chat-v2";',
    "route-chat-v2-pathname-mapped"
  );
  mustInclude(
    routeSync,
    'if (path === "/" || path === "/chat") return "chat";',
    "route-chat-mapping-unchanged"
  );
  mustInclude(
    routeSync,
    'return path === "/" || path === "/chat";',
    "route-chat-entry-path-unchanged"
  );
  {
    // Default fallback of resolveViewFromPathname must remain classic chat.
    const fnBody = routeSync.slice(
      routeSync.indexOf("export function resolveViewFromPathname"),
      routeSync.indexOf("export function resolvePathnameForView")
    );
    const lastReturn = fnBody.lastIndexOf("return");
    if (!fnBody.slice(lastReturn).startsWith('return "chat";')) {
      fail("route-default-fallback-unchanged", "default route fallback changed");
    }
    pass("route-default-fallback-unchanged");
  }

  const app = read("src/App.tsx");
  mustInclude(app, 'case "chat":', "app-chat-case-preserved");
  mustInclude(app, "<AIChatView />", "app-chat-renders-classic-view");
  mustInclude(app, 'case "chat-v2":', "app-chat-v2-case-registered");
  mustInclude(app, "<ChatV2Page />", "app-chat-v2-renders-v2-page");

  const header = read("src/components/Header.tsx");
  mustNotInclude(header, "chat-v2", "header-public-nav-untouched");

  // ---------- 2. Brain isolation for the V2 namespace ----------
  const v2Dir = path.join(process.cwd(), "src/components/chat-v2");
  const v2Files = listFilesRecursive(v2Dir).filter((f) =>
    /\.(ts|tsx)$/.test(f)
  );
  if (v2Files.length < 8) {
    fail("v2-namespace-exists", `expected V2 component files, found ${v2Files.length}`);
  }
  pass("v2-namespace-exists");

  const forbiddenImports = [
    "services/ai/aiService",
    "chatSearchOrchestrator",
    "chatUserVisibleOrchestrateClient",
    "marketplaceChatSearch",
    "buyerScoredMarketplaceSearch",
    "promptTemplates",
    "nongAeConversationalTone",
    "salesBrain",
    "chatMockFallback",
    "chatPhase1Rules",
    "chatPrecheckLayer",
    "server/security",
    "hooks/chat/useChat\"",
  ];
  const forbiddenNetwork = ["fetch(", "/api/gemini", "/api/cars", "streamChat", "XMLHttpRequest", "EventSource("];
  const forbiddenMock = ["mockVehicle", "MOCK_", "fakeCar", "sampleCar"];
  const forbiddenLead = ["PhoneCall", "onRequestSellerCallback", "startBuyerLeadFromCar", "openConsentModal"];
  const forbiddenControls = ["Mic,", "Mic }", "Microphone", "Camera", "Paperclip", "ImagePlus", "Video,"];

  for (const fileAbs of v2Files) {
    const rel = path.relative(process.cwd(), fileAbs).replace(/\\/g, "/");
    const src = fs.readFileSync(fileAbs, "utf8");
    for (const needle of forbiddenImports) {
      if (src.includes(needle)) {
        fail("v2-brain-isolation", `${rel} references ${needle}`);
      }
    }
    for (const needle of forbiddenNetwork) {
      if (src.includes(needle)) {
        fail("v2-no-own-network-path", `${rel} references ${needle}`);
      }
    }
    for (const needle of forbiddenMock) {
      if (src.includes(needle)) {
        fail("v2-no-mock-vehicles", `${rel} references ${needle}`);
      }
    }
    for (const needle of forbiddenLead) {
      if (src.includes(needle)) {
        fail("v2-no-lead-dealer-actions", `${rel} references ${needle}`);
      }
    }
    for (const needle of forbiddenControls) {
      if (src.includes(needle)) {
        fail("v2-no-nonfunctional-controls", `${rel} references ${needle}`);
      }
    }
    if (src.includes("localStorage") || src.includes("sessionStorage")) {
      fail("v2-no-new-persistence", `${rel} persists state`);
    }
  }
  pass("v2-brain-isolation");
  pass("v2-no-own-network-path");
  pass("v2-no-mock-vehicles");
  pass("v2-no-lead-dealer-actions");
  pass("v2-no-nonfunctional-controls");
  pass("v2-no-new-persistence");

  // Submission path evidence: V2 talks to the brain only through context.
  const conversation = read("src/components/chat-v2/ChatV2Conversation.tsx");
  mustInclude(conversation, "useChatContext", "v2-uses-chat-context");
  mustInclude(conversation, "sendMessage", "v2-uses-existing-send-message");
  const page = read("src/components/chat-v2/ChatV2Page.tsx");
  mustInclude(page, "ChatProvider", "v2-mounts-existing-provider");

  // ---------- 3. Inventory grounding ----------
  const adapter = read("src/components/chat-v2/adapters/useChatV2Presentation.ts");
  mustInclude(adapter, "deriveDiscoveredVehicles", "v2-vehicles-from-trusted-derivation");
  mustInclude(adapter, "currentMessages", "v2-vehicles-scoped-to-current-session");
  mustNotInclude(adapter, "message.text", "v2-no-ai-text-parsing");
  const bubble = read("src/components/chat-v2/ChatV2MessageBubble.tsx");
  mustInclude(bubble, "isTrustedVehicleCard", "v2-bubble-counts-trusted-cards-only");
  const card = read("src/components/chat-v2/ChatV2VehicleCard.tsx");
  mustInclude(card, "ChatCarCardData", "v2-card-uses-structured-contract");
  mustNotInclude(card, "พร้อมขาย", "v2-card-no-availability-claims");
  mustInclude(card, "ดูรายละเอียดและสถานะล่าสุด", "v2-card-links-to-detail-for-status");

  const workspace = read("src/components/chat-v2/ChatV2VehicleWorkspace.tsx");
  mustInclude(workspace, "พื้นที่เลือกรถ", "v2-workspace-empty-state-title");
  mustInclude(workspace, "รถที่พบ", "v2-workspace-results-title");
  mustInclude(workspace, "overflow-y-auto", "v2-workspace-own-scroll-region");
  mustInclude(workspace, "chat-v2-workspace-empty", "v2-workspace-empty-state-present");

  // ---------- 4. Responsive + accessibility markers ----------
  const sheet = read("src/components/chat-v2/ChatV2MobileVehicleSheet.tsx");
  mustInclude(sheet, 'role="dialog"', "v2-sheet-dialog-role");
  mustInclude(sheet, 'aria-modal="true"', "v2-sheet-aria-modal");
  mustInclude(sheet, "useChatV2FocusTrap", "v2-sheet-focus-trap");
  mustInclude(sheet, "env(safe-area-inset-bottom)", "v2-sheet-safe-area");
  const trap = read("src/components/chat-v2/adapters/useChatV2FocusTrap.ts");
  mustInclude(trap, '"Escape"', "v2-escape-closes-sheets");
  const statusSrc = read("src/components/chat-v2/ChatV2StatusIndicator.tsx");
  mustInclude(statusSrc, 'aria-live="polite"', "v2-status-aria-live");
  mustInclude(adapter, "กำลังคิด...", "v2-status-derived-thinking");
  mustNotInclude(adapter, "setInterval", "v2-status-not-simulated");
  const shell = read("src/components/chat-v2/ChatV2Shell.tsx");
  mustInclude(shell, "overflow-hidden", "v2-shell-no-horizontal-overflow");
  const composer = read("src/components/chat-v2/ChatV2Composer.tsx");
  mustInclude(composer, 'aria-label="ส่งข้อความ"', "v2-send-accessible-name");
  mustInclude(conversation, "motion-reduce", "v2-reduced-motion-supported");
  mustInclude(conversation, "--chat-vv-bottom-inset", "v2-mobile-keyboard-inset");

  // Suggestion chips prefill the composer (existing submission path only).
  const empty = read("src/components/chat-v2/ChatV2EmptyState.tsx");
  mustInclude(empty, "onPickSuggestion", "v2-suggestions-prefill-composer");
  mustNotInclude(empty, "fetch(", "v2-suggestions-no-own-routing");

  // ---------- 4b. New Chat CTA — icon/label readable in both themes ----------
  const sidebar = read("src/components/chat-v2/ChatV2Sidebar.tsx");
  mustInclude(sidebar, 'data-testid="chat-v2-new-chat"', "v2-new-chat-testid");
  mustInclude(sidebar, "แชทใหม่", "v2-new-chat-label-present");
  mustInclude(sidebar, "<Plus", "v2-new-chat-plus-icon-present");
  mustInclude(sidebar, "nonga-action", "v2-new-chat-uses-action-surface");
  mustInclude(
    sidebar,
    "text-[var(--nonga-action-primary-text)]",
    "v2-new-chat-pins-action-text-color"
  );
  {
    const btnStart = sidebar.indexOf('data-testid="chat-v2-new-chat"');
    if (btnStart < 0) fail("v2-new-chat-block-present", "testid missing");
    const btnOpen = sidebar.lastIndexOf("<button", btnStart);
    const btnClose = sidebar.indexOf("</button>", btnStart);
    if (btnOpen < 0 || btnClose < 0) {
      fail("v2-new-chat-block-present", "button bounds not found");
    }
    const block = sidebar.slice(btnOpen, btnClose + "</button>".length);
    // Avoid substring false positives (e.g. aria-hidden contains "hidden").
    const forbiddenClassRes = [
      /(?:^|[\s"'`])hidden(?:[\s"'`]|$)/,
      /(?:^|[\s"'`])invisible(?:[\s"'`]|$)/,
      /(?:^|[\s"'`])opacity-0(?:[\s"'`]|$)/,
      /(?:^|[\s"'`])sr-only(?:[\s"'`]|$)/,
      /(?:^|[\s"'`])text-transparent(?:[\s"'`]|$)/,
    ];
    for (const re of forbiddenClassRes) {
      if (re.test(block)) {
        fail(
          "v2-new-chat-not-hidden-or-low-contrast",
          `new-chat button unexpectedly matches: ${re}`
        );
      }
    }
    const lowContrastNeedles = [
      "text-orange-600",
      "text-orange-500",
      "text-orange-700",
      "nonga-text-primary",
      "nonga-text-secondary",
      "nonga-text-muted",
    ];
    for (const needle of lowContrastNeedles) {
      if (block.includes(needle)) {
        fail(
          "v2-new-chat-not-hidden-or-low-contrast",
          `new-chat button unexpectedly uses: ${needle}`
        );
      }
    }
    if (!block.includes("แชทใหม่")) {
      fail("v2-new-chat-label-in-button", "label not inside new-chat button");
    }
    if (!block.includes("<Plus")) {
      fail("v2-new-chat-icon-in-button", "Plus not inside new-chat button");
    }
    const actionTextPins = (
      block.match(/text-\[var\(--nonga-action-primary-text\)\]/g) || []
    ).length;
    if (actionTextPins < 2) {
      fail(
        "v2-new-chat-action-text-on-icon-and-label",
        `expected action-text color on icon+label, found ${actionTextPins}`
      );
    }
    pass("v2-new-chat-not-hidden-or-low-contrast");
    pass("v2-new-chat-label-in-button");
    pass("v2-new-chat-icon-in-button");
    pass("v2-new-chat-action-text-on-icon-and-label");
  }

  // ---------- 5. Design identity unchanged ----------
  const css = read("src/index.css");
  mustInclude(css, '--font-sans: "Inter", "Anuphan"', "font-tokens-unchanged");
  mustInclude(css, "family=Anuphan", "anuphan-import-unchanged");
  mustInclude(css, "--nonga-bg-app: #020617", "dark-app-token-unchanged");
  mustInclude(css, "--nonga-bg-surface: #0f172a", "dark-surface-token-unchanged");
  mustInclude(css, "--nonga-bg-app: #f8fafc", "light-app-token-unchanged");
  mustInclude(css, "--nonga-bg-surface: #ffffff", "light-surface-token-unchanged");
  mustInclude(css, "--nonga-brand: #f97316", "brand-orange-token-unchanged");
  {
    const occurrences = (
      css.match(/--nonga-action-primary-text:\s*#ffffff/g) || []
    ).length;
    if (occurrences < 2) {
      fail(
        "v2-action-text-white-both-themes",
        `expected #ffffff in light+dark, found ${occurrences}`
      );
    }
    pass("v2-action-text-white-both-themes");
  }
  mustInclude(
    css,
    "color: var(--nonga-action-primary-text)",
    "v2-nonga-action-sets-readable-label-color"
  );

  // ---------- 6. /chat baseline untouched ----------
  const aiView = read("src/components/AIChatView.tsx");
  mustInclude(aiView, "ChatProvider", "classic-chat-provider-preserved");
  mustInclude(aiView, "ChatSidebar", "classic-chat-sidebar-preserved");
  mustInclude(aiView, "ChatContainer", "classic-chat-container-preserved");
  mustInclude(aiView, "ChatVehiclePanel", "classic-d1-panel-preserved");
  mustNotInclude(aiView, "chat-v2", "classic-chat-no-v2-markup");
  const chatContainer = read("src/components/chat/ChatContainer.tsx");
  mustNotInclude(chatContainer, "chat-v2", "classic-container-no-v2-markup");

  console.log("\n=== Chat Experience V2 guard — OK ===");
}

main();
