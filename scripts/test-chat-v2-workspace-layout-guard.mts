/**
 * Chat Experience V2 — persistent workspace layout guard (source checks)
 * npm run test:chat-v2-workspace-layout-guard
 *
 * Responsive contract under guard:
 * 1. Desktop / large tablet (lg+, >=1024 CSS px): persistent non-overlay
 *    three-region layout — Sidebar · Conversation · Vehicle Workspace.
 * 2. Sidebar is expanded by default at lg+ and user-collapsible to a
 *    compact rail that can reopen it.
 * 3. Vehicle Workspace is an inline column at lg+ (never an overlay sheet);
 *    triggers at lg+ expand the inline column instead of opening the sheet.
 * 4. Sidebar and Vehicle Workspace collapse states are independent.
 * 5. Below lg (<1024px): Sidebar is a drawer, Vehicle Workspace is an
 *    overlay sheet — with backdrop, Escape, focus trap and focus return.
 * 6. Conversation keeps a minimum readable width at lg+ and the composer
 *    submission path is unchanged.
 * 7. /chat classic remains isolated (no V2 markup, D1 wiring intact).
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
  console.log("=== Chat V2 persistent workspace layout guard ===\n");

  const adapter = read("src/components/chat-v2/adapters/useChatV2Presentation.ts");
  const shell = read("src/components/chat-v2/ChatV2Shell.tsx");
  const sidebar = read("src/components/chat-v2/ChatV2Sidebar.tsx");
  const workspace = read("src/components/chat-v2/ChatV2VehicleWorkspace.tsx");
  const sheet = read("src/components/chat-v2/ChatV2MobileVehicleSheet.tsx");
  const conversation = read("src/components/chat-v2/ChatV2Conversation.tsx");

  // ---------- 1. lg (>=1024) is the persistent three-region breakpoint ----------
  mustInclude(
    adapter,
    'CHAT_V2_DESKTOP_MEDIA_QUERY = "(min-width: 1024px)"',
    "layout-desktop-breakpoint-1024"
  );
  mustInclude(
    adapter,
    'CHAT_V2_SIDEBAR_INLINE_MEDIA_QUERY = "(min-width: 1024px)"',
    "layout-sidebar-inline-breakpoint-1024"
  );
  {
    // No component in the V2 namespace may still key overlay behavior off xl.
    const v2Dir = path.join(process.cwd(), "src/components/chat-v2");
    const v2Files = listFilesRecursive(v2Dir).filter((f) => /\.(ts|tsx)$/.test(f));
    const staleNeedles = ["max-xl:", "xl:hidden", "xl:static", "xl:flex", "1280px"];
    for (const fileAbs of v2Files) {
      const rel = path.relative(process.cwd(), fileAbs).replace(/\\/g, "/");
      const src = fs.readFileSync(fileAbs, "utf8");
      for (const needle of staleNeedles) {
        if (src.includes(needle)) {
          fail("layout-no-stale-xl-breakpoint", `${rel} still uses ${needle}`);
        }
      }
    }
    pass("layout-no-stale-xl-breakpoint");
  }

  // Sidebar: inline persistent column at lg+, drawer only below lg.
  mustInclude(sidebar, "lg:static", "sidebar-inline-at-lg");
  mustInclude(sidebar, "max-lg:fixed", "sidebar-drawer-scoped-below-lg");
  mustInclude(sidebar, "max-lg:-translate-x-full", "sidebar-offscreen-only-below-lg");
  mustInclude(sidebar, 'className="fixed inset-0 z-[45] bg-black/60 lg:hidden"', "sidebar-backdrop-below-lg-only");
  mustInclude(sidebar, "ChatV2ResizeHandle", "sidebar-resize-handle-wired");
  mustNotInclude(sidebar, "chat-v2-reset-panel-widths", "sidebar-reset-panel-widths-removed");
  mustNotInclude(sidebar, "คืนค่าขนาดแผง", "sidebar-reset-panel-widths-label-removed");
  mustNotInclude(sidebar, "RotateCcw", "sidebar-reset-icon-removed");
  mustNotInclude(shell, "onResetPanelWidths", "shell-reset-prop-removed");
  {
    const resizeHandle = read("src/components/chat-v2/ChatV2ResizeHandle.tsx");
    mustInclude(
      resizeHandle,
      "chat-v2-sidebar-resize-handle",
      "sidebar-resize-handle-testid"
    );
    mustInclude(
      resizeHandle,
      "chat-v2-workspace-resize-handle",
      "workspace-resize-handle-testid"
    );
  }

  // Vehicle Workspace: inline column at lg+ (both expanded and rail states).
  mustInclude(workspace, "hidden lg:flex shrink-0", "workspace-inline-column-at-lg");
  mustInclude(workspace, 'hidden lg:flex shrink-0 w-14', "workspace-rail-at-lg");
  mustInclude(workspace, "ChatV2ResizeHandle", "workspace-resize-handle-wired");
  mustInclude(
    read("src/components/chat-v2/panelWidths.ts"),
    "CHAT_V2_CENTER_MIN_WIDTH = 420",
    "center-min-width-420"
  );

  // Overlay sheet exists only below lg.
  mustInclude(sheet, '<div className="lg:hidden"', "vehicle-sheet-below-lg-only");

  // ---------- 2. Sidebar expanded by default + auto-expand on new results ----------
  mustInclude(
    shell,
    "const [sidebarCollapsed, setSidebarCollapsed] = useState(false)",
    "sidebar-expanded-by-default"
  );
  // Full panel is hidden at lg only when the user collapsed it.
  mustInclude(sidebar, 'isCollapsed ? "lg:hidden" : ""', "sidebar-panel-hidden-only-when-collapsed");
  // Workspace also starts expanded (adapter owns its collapse state).
  mustInclude(adapter, "const [isCollapsed, setIsCollapsed] = useState(false)", "workspace-expanded-by-default");
  mustInclude(adapter, "lastAutoExpandMessageIdRef", "workspace-auto-expand-tracks-source");
  mustInclude(adapter, "setIsCollapsed(false)", "workspace-auto-expand-opens-on-new-results");
  mustInclude(adapter, "sourceMessageId", "workspace-exposes-source-message-id");

  // ---------- 3. Sidebar collapse/expand controls ----------
  mustInclude(sidebar, 'data-testid="chat-v2-sidebar-collapse"', "sidebar-collapse-control-present");
  mustInclude(sidebar, 'aria-label="ย่อเมนูบทสนทนา"', "sidebar-collapse-accessible-name");
  mustInclude(sidebar, 'data-testid="chat-v2-sidebar-rail"', "sidebar-compact-rail-present");
  mustInclude(sidebar, 'data-testid="chat-v2-sidebar-expand"', "sidebar-expand-control-present");
  mustInclude(sidebar, 'aria-label="เปิดเมนูบทสนทนา"', "sidebar-expand-accessible-name");
  // Collapse control is desktop-only; drawer keeps its own close button.
  {
    const collapseIdx = sidebar.indexOf('data-testid="chat-v2-sidebar-collapse"');
    const btnOpen = sidebar.lastIndexOf("<button", collapseIdx);
    const block = sidebar.slice(btnOpen, collapseIdx);
    if (!block.includes("max-lg:hidden")) {
      fail("sidebar-collapse-desktop-only", "collapse button not scoped to lg+");
    }
    pass("sidebar-collapse-desktop-only");
  }
  mustInclude(sidebar, 'data-testid="chat-v2-sidebar-close"', "sidebar-drawer-close-preserved");
  // Rail keeps New Chat reachable while collapsed.
  mustInclude(sidebar, 'data-testid="chat-v2-sidebar-rail-new-chat"', "sidebar-rail-new-chat-present");

  // ---------- 4. Vehicle Workspace non-overlay at lg+ ----------
  {
    const openSheetIdx = adapter.indexOf("const openSheet");
    const openSheetBlock = adapter.slice(openSheetIdx, adapter.indexOf("}, []", openSheetIdx));
    if (!openSheetBlock.includes("CHAT_V2_DESKTOP_MEDIA_QUERY")) {
      fail("workspace-no-overlay-on-desktop", "openSheet does not guard desktop widths");
    }
    if (!openSheetBlock.includes("setIsCollapsed(false)")) {
      fail("workspace-desktop-trigger-expands-inline", "desktop trigger must expand the inline column");
    }
    pass("workspace-no-overlay-on-desktop");
    pass("workspace-desktop-trigger-expands-inline");
  }
  mustInclude(workspace, 'data-testid="chat-v2-workspace-collapse"', "workspace-collapse-control-preserved");
  mustInclude(workspace, 'data-testid="chat-v2-workspace-expand"', "workspace-expand-control-preserved");
  mustInclude(workspace, 'data-testid="chat-v2-workspace-empty"', "workspace-empty-state-preserved");
  // Below-lg triggers stay scoped so lg+ never shows sheet triggers.
  mustInclude(conversation, 'className="lg:hidden max-md:hidden inline-flex', "workspace-header-trigger-below-lg-only");

  // ---------- 5. Independent collapse states ----------
  mustInclude(shell, "isCollapsed={sidebarCollapsed}", "shell-sidebar-collapse-state-wired");
  mustInclude(shell, "isCollapsed={workspace.isCollapsed}", "shell-workspace-collapse-state-wired");
  // Distinct state sources: sidebar collapse lives in the shell, workspace
  // collapse lives in the presentation adapter — they cannot couple.
  mustNotInclude(shell, "setSidebarCollapsed(workspace", "collapse-states-not-coupled");

  // ---------- 6. Below-lg drawer/sheet accessibility + composer ----------
  mustInclude(sidebar, "useChatV2FocusTrap(drawerRef", "sidebar-drawer-focus-trap");
  mustInclude(sheet, 'role="dialog"', "sheet-dialog-role");
  mustInclude(sheet, 'aria-modal="true"', "sheet-aria-modal");
  mustInclude(sheet, "useChatV2FocusTrap", "sheet-focus-trap");
  mustInclude(conversation, "lg:min-w-[420px]", "conversation-min-readable-width");
  mustInclude(conversation, "sendMessage", "composer-submission-path-unchanged");
  mustInclude(conversation, "--chat-vv-bottom-inset", "composer-keyboard-inset-preserved");

  // ---------- 7. /chat classic isolation ----------
  const aiView = read("src/components/AIChatView.tsx");
  mustNotInclude(aiView, "chat-v2", "classic-chat-no-v2-markup");
  mustInclude(aiView, "ChatSidebar", "classic-chat-sidebar-preserved");
  mustInclude(aiView, "ChatVehiclePanel", "classic-d1-panel-preserved");
  const chatContainer = read("src/components/chat/ChatContainer.tsx");
  mustNotInclude(chatContainer, "chat-v2", "classic-container-no-v2-markup");

  // ---------- 8. No new persistence for collapse states ----------
  for (const rel of [
    "src/components/chat-v2/ChatV2Shell.tsx",
    "src/components/chat-v2/adapters/useChatV2Presentation.ts",
  ]) {
    const src = read(rel);
    if (src.includes("localStorage") || src.includes("sessionStorage")) {
      fail("collapse-state-not-persisted", `${rel} persists collapse state`);
    }
  }
  pass("collapse-state-not-persisted");

  console.log("\n=== Chat V2 persistent workspace layout guard — OK ===");
}

main();
