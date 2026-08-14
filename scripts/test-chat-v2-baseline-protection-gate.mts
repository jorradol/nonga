/**
 * WP-V2U-00B — Chat V.2 Baseline Protection Gate
 * Run (Windows): .\node_modules\.bin\tsx.cmd scripts/test-chat-v2-baseline-protection-gate.mts
 *
 * Semantic/structural contract guard for the protected V.2 baseline.
 * Static source inspection only — no network, no UI runtime, no file writes.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const PROTECTED_V2_FILES = [
  "src/components/chat-v2/ChatV2Page.tsx",
  "src/components/chat-v2/ChatV2Shell.tsx",
  "src/components/chat-v2/ChatV2Sidebar.tsx",
  "src/components/chat-v2/ChatV2Conversation.tsx",
  "src/components/chat-v2/ChatV2Composer.tsx",
  "src/components/chat-v2/ChatV2MessageBubble.tsx",
  "src/components/chat-v2/ChatV2VehicleWorkspace.tsx",
  "src/components/chat-v2/ChatV2VehicleCard.tsx",
  "src/components/chat-v2/ChatV2MobileVehicleSheet.tsx",
  "src/components/chat-v2/ChatV2ResizeHandle.tsx",
  "src/components/chat-v2/ChatV2EmptyState.tsx",
  "src/components/chat-v2/ChatV2StatusIndicator.tsx",
  "src/components/chat-v2/adapters/useChatV2Presentation.ts",
  "src/components/chat-v2/adapters/useChatV2PanelResize.ts",
  "src/components/chat-v2/adapters/useChatV2FocusTrap.ts",
  "src/components/chat-v2/panelWidths.ts",
] as const;

/** V.3 UI surface — direct coupling forbidden in V.2 presentation layer. */
const V3_UI_IMPORT_PATTERNS: RegExp[] = [
  /from\s+["'][^"']*components\/chat-v3\b/,
  /\bimport\s+[^;]*\bChatV3Shell\b[^;]*\sfrom\s+["']/,
  /\bimport\s+[^;]*\bChatV3Workspace\b[^;]*\sfrom\s+["']/,
  /\bimport\s+[^;]*\bChatV3Page\b[^;]*\sfrom\s+["']/,
  /\bimport\s+[^;]*\bChatV3Conversation\b[^;]*\sfrom\s+["']/,
  /\bimport\s+[^;]*\bChatV3Sidebar\b[^;]*\sfrom\s+["']/,
];

const V3_UI_JSX_RENDER_PATTERN = /<\s*ChatV3(?:Shell|Workspace|Page|Conversation|Sidebar)\b/;

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function fail(invariant: string, detail = ""): never {
  console.error(`FAIL [${invariant}]`, detail);
  process.exit(1);
}

function read(rel: string): string {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail("protected-inventory-present", `missing file: ${rel}`);
  }
  return fs.readFileSync(abs, "utf8");
}

function mustMatch(
  src: string,
  pattern: RegExp,
  invariant: string,
  detail?: string
): void {
  if (!pattern.test(src)) {
    fail(invariant, detail ?? `pattern not matched: ${pattern}`);
  }
  pass(invariant);
}

function mustNotMatch(
  src: string,
  pattern: RegExp,
  invariant: string,
  detail?: string
): void {
  if (pattern.test(src)) {
    fail(invariant, detail ?? `forbidden pattern matched: ${pattern}`);
  }
  pass(invariant);
}

/** Require a component to appear in JSX (not import/comment alone). */
function mustRenderJsx(src: string, componentName: string, invariant: string): void {
  mustMatch(
    src,
    new RegExp(`<\\s*${componentName}(\\s|>|/)`),
    invariant,
    `expected JSX render of <${componentName}>`
  );
}

function mustHaveTestId(src: string, testId: string, invariant: string): void {
  mustMatch(
    src,
    new RegExp(`data-testid\\s*=\\s*["']${testId}["']`),
    invariant
  );
}

function assertNoV3UiCoupling(rel: string, src: string): void {
  for (const pattern of V3_UI_IMPORT_PATTERNS) {
    if (pattern.test(src)) {
      fail("v2-no-direct-v3-ui-imports", `${rel} matches ${pattern}`);
    }
  }
  if (V3_UI_JSX_RENDER_PATTERN.test(src)) {
    fail("v2-no-direct-v3-ui-render", `${rel} renders V.3 UI component`);
  }
}

function listV2SourceFiles(): string[] {
  const v2Dir = path.join(ROOT, "src/components/chat-v2");
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
    }
  };
  walk(v2Dir);
  return out;
}

function relPosix(abs: string): string {
  return path.relative(ROOT, abs).replace(/\\/g, "/");
}

function main(): void {
  console.log("=== WP-V2U-00B Chat V.2 Baseline Protection Gate ===\n");

  // ---------- Protected file inventory ----------
  for (const rel of PROTECTED_V2_FILES) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      fail("protected-inventory-present", `required protected file missing: ${rel}`);
    }
    pass(`protected-file-exists::${rel}`);
  }

  // ---------- Route: /chat-v2 → chat-v2 view → ChatV2Page ----------
  const routeSync = read("src/utils/appRouteSync.ts");
  mustMatch(
    routeSync,
    /path\s*===\s*["']\/chat-v2["']\s*\)\s*return\s*["']chat-v2["']/,
    "route-chat-v2-pathname-wired"
  );
  mustMatch(routeSync, /case\s*["']chat-v2["']\s*:/, "route-chat-v2-view-key-present");
  mustMatch(routeSync, /return\s*["']\/chat-v2["']/, "route-chat-v2-canonical-path");

  const app = read("src/App.tsx");
  mustMatch(app, /case\s*["']chat-v2["']\s*:/, "app-chat-v2-switch-case");
  mustRenderJsx(app, "ChatV2Page", "app-chat-v2-renders-page");
  mustMatch(
    app,
    /import\s+ChatV2Page\s+from\s+["'][^"']*chat-v2\/ChatV2Page["']/,
    "app-chat-v2-page-import"
  );

  // ---------- No /chat-v4 ----------
  mustNotMatch(routeSync, /\bchat-v4\b/, "no-chat-v4-route-registered");
  mustNotMatch(app, /\bchat-v4\b/, "no-chat-v4-app-view");
  mustNotMatch(app, /\bChatV4\b/, "no-chat-v4-ui-entry");

  // ---------- Page: ChatProvider + ChatV2Shell ----------
  const page = read("src/components/chat-v2/ChatV2Page.tsx");
  mustRenderJsx(page, "ChatProvider", "page-renders-chat-provider");
  mustRenderJsx(page, "ChatV2Shell", "page-renders-v2-shell");
  assertNoV3UiCoupling("src/components/chat-v2/ChatV2Page.tsx", page);

  // ---------- Shell: three regions + mobile vehicle sheet ----------
  const shell = read("src/components/chat-v2/ChatV2Shell.tsx");
  mustRenderJsx(shell, "ChatV2Sidebar", "shell-renders-sidebar");
  mustRenderJsx(shell, "ChatV2Conversation", "shell-renders-conversation");
  mustRenderJsx(shell, "ChatV2VehicleWorkspace", "shell-renders-vehicle-workspace");
  mustRenderJsx(shell, "ChatV2MobileVehicleSheet", "shell-renders-mobile-vehicle-sheet");
  mustMatch(shell, /\buseChatV2Presentation\b/, "shell-uses-presentation-adapter");
  mustHaveTestId(shell, "chat-v2-root", "shell-root-testid");
  assertNoV3UiCoupling("src/components/chat-v2/ChatV2Shell.tsx", shell);

  // ---------- Vehicle Workspace module (future container may wrap; module must remain) ----------
  const workspace = read("src/components/chat-v2/ChatV2VehicleWorkspace.tsx");
  mustRenderJsx(workspace, "ChatV2VehicleCard", "workspace-renders-vehicle-card");
  mustRenderJsx(workspace, "ChatV2WorkspaceBody", "workspace-renders-workspace-body");
  mustMatch(
    workspace,
    /export\s+function\s+ChatV2VehicleWorkspace\b/,
    "vehicle-workspace-component-export"
  );
  mustMatch(workspace, /\buseChatV2VehicleSelection\b/, "workspace-uses-selection-hook");
  mustMatch(workspace, /\bChatV2ResizeHandle\b/, "workspace-resize-handle-wired");
  assertNoV3UiCoupling("src/components/chat-v2/ChatV2VehicleWorkspace.tsx", workspace);

  const card = read("src/components/chat-v2/ChatV2VehicleCard.tsx");
  mustMatch(card, /export\s+function\s+ChatV2VehicleCard\b/, "vehicle-card-component-export");
  mustMatch(card, /\bChatCarCardData\b/, "vehicle-card-structured-contract");
  mustHaveTestId(card, "chat-v2-vehicle-card", "vehicle-card-testid");
  assertNoV3UiCoupling("src/components/chat-v2/ChatV2VehicleCard.tsx", card);

  // Positive: V.2 vehicle results path intact; V.3 workspace UI must not replace it.
  mustNotMatch(
    shell,
    /<\s*ChatV3Workspace\b/,
    "shell-no-v3-workspace-ui-render"
  );
  mustNotMatch(
    workspace,
    /<\s*ChatV3Workspace\b/,
    "workspace-no-v3-workspace-ui-replacement"
  );

  // ---------- Session-scoped vehicle selection ----------
  const adapter = read("src/components/chat-v2/adapters/useChatV2Presentation.ts");
  mustMatch(adapter, /\bexport\s+function\s+useChatV2VehicleSelection\b/, "selection-hook-exported");
  mustMatch(adapter, /\bactiveSessionId\b/, "selection-bound-to-active-session");
  mustMatch(adapter, /\bsaveLastSelectedCarId\b/, "selection-persists-via-chat-car-context");
  mustMatch(adapter, /\bclearLastSelectedCarId\b/, "selection-clears-via-chat-car-context");
  mustMatch(adapter, /\bloadActiveSelectedCarIdForUi\b/, "selection-reads-session-scoped-ui-id");

  const chatCarContext = read("src/utils/chatCarContext.ts");
  mustMatch(chatCarContext, /\bSESSION_SELECTION_MAP_KEY\b/, "chat-car-context-session-selection-map");
  mustMatch(
    chatCarContext,
    /export\s+function\s+saveLastSelectedCarId\b/,
    "chat-car-context-save-selection"
  );

  // ---------- Panel width / responsive contract ----------
  const panelWidths = read("src/components/chat-v2/panelWidths.ts");
  mustMatch(panelWidths, /\bCHAT_V2_PANEL_WIDTHS_STORAGE_KEY\b/, "panel-width-persistence-key");
  mustMatch(panelWidths, /\bCHAT_V2_CENTER_MIN_WIDTH\b/, "center-min-width-contract");
  mustMatch(panelWidths, /\bresolveAppliedPanelWidths\b/, "panel-width-clamp-helper");

  const panelResize = read("src/components/chat-v2/adapters/useChatV2PanelResize.ts");
  mustMatch(panelResize, /\bexport\s+function\s+useChatV2PanelResize\b/, "panel-resize-hook-export");
  mustMatch(panelResize, /\buseChatV2IsDesktop\b/, "panel-resize-uses-desktop-breakpoint-hook");
  mustMatch(
    adapter,
    /CHAT_V2_DESKTOP_MEDIA_QUERY\s*=\s*["']\(\s*min-width:\s*1024px\s*\)["']/,
    "desktop-breakpoint-defined-in-presentation-adapter"
  );

  mustMatch(shell, /\buseChatV2PanelResize\b/, "shell-wires-panel-resize");

  const sidebar = read("src/components/chat-v2/ChatV2Sidebar.tsx");
  mustMatch(sidebar, /\bChatV2ResizeHandle\b/, "sidebar-resize-handle-wired");

  // ---------- V.2 namespace: no direct V.3 UI imports/renders ----------
  for (const fileAbs of listV2SourceFiles()) {
    const rel = relPosix(fileAbs);
    const src = fs.readFileSync(fileAbs, "utf8");
    assertNoV3UiCoupling(rel, src);
  }
  pass("v2-namespace-no-direct-v3-ui-coupling");

  // ---------- Conversation: V.2 bubble + shared send path ----------
  const conversation = read("src/components/chat-v2/ChatV2Conversation.tsx");
  mustMatch(conversation, /\buseChatContext\b/, "conversation-uses-chat-context");
  mustMatch(conversation, /\bsendMessage\b/, "conversation-uses-send-message");
  mustRenderJsx(conversation, "ChatV2MessageBubble", "conversation-renders-v2-message-bubble");
  mustNotMatch(
    conversation,
    /<\s*ChatMessageBubble\b/,
    "conversation-no-legacy-bubble-render"
  );

  // ---------- Mobile sheet shares workspace body ----------
  const sheet = read("src/components/chat-v2/ChatV2MobileVehicleSheet.tsx");
  mustRenderJsx(sheet, "ChatV2WorkspaceBody", "mobile-sheet-renders-workspace-body");

  console.log(`\n=== WP-V2U-00B Baseline Protection Gate — OK (${passCount} assertions) ===`);
}

main();
