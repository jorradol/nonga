/**
 * WP-VD02 — Chat V2 resizable workspace panels
 * npx tsx scripts/test-wp-vd02-resizable-workspace-panels.mts
 *
 * Covers width clamp math, persistence validation, keyboard contract,
 * mobile handle absence, collapse controls, empty workspace, and overflow.
 */
import fs from "node:fs";
import path from "node:path";
import {
  CHAT_V2_CENTER_MIN_WIDTH,
  CHAT_V2_PANEL_WIDTHS_STORAGE_KEY,
  CHAT_V2_RAIL_WIDTH,
  CHAT_V2_RESIZE_STEP_LARGE_PX,
  CHAT_V2_RESIZE_STEP_PX,
  CHAT_V2_SIDEBAR_WIDTH_DEFAULT,
  CHAT_V2_SIDEBAR_WIDTH_MAX,
  CHAT_V2_SIDEBAR_WIDTH_MIN,
  CHAT_V2_WORKSPACE_WIDTH_DEFAULT,
  CHAT_V2_WORKSPACE_WIDTH_MAX,
  CHAT_V2_WORKSPACE_WIDTH_MIN,
  centerWidthFor,
  clearChatV2PanelWidths,
  defaultPanelWidthPreferences,
  loadChatV2PanelWidths,
  maxSidebarWhileDragging,
  maxWorkspaceWhileDragging,
  parseStoredPanelWidths,
  resolveAppliedPanelWidths,
  saveChatV2PanelWidths,
} from "../src/components/chat-v2/panelWidths.ts";

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

function assertEq(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    fail(label, `expected ${String(expected)}, got ${String(actual)}`);
  }
  pass(label);
}

function assert(cond: boolean, label: string, detail = ""): void {
  if (!cond) fail(label, detail);
  pass(label);
}

/** Minimal in-memory localStorage for Node verification. */
function installMemoryStorage(): {
  store: Map<string, string>;
  themeKey: string;
} {
  const store = new Map<string, string>();
  const themeKey = "nonga_theme_runtime_v1";
  const localStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
  (globalThis as { window?: unknown; localStorage?: unknown }).window =
    globalThis;
  (globalThis as { localStorage?: unknown }).localStorage = localStorage;
  store.set(themeKey, "dark");
  store.set("nonga.chat-v2.unrelated", "keep-me");
  return { store, themeKey };
}

function main(): void {
  console.log("=== WP-VD02 Chat V2 resizable workspace panels ===\n");

  const panelWidths = read("src/components/chat-v2/panelWidths.ts");
  const handle = read("src/components/chat-v2/ChatV2ResizeHandle.tsx");
  const shell = read("src/components/chat-v2/ChatV2Shell.tsx");
  const sidebar = read("src/components/chat-v2/ChatV2Sidebar.tsx");
  const workspace = read("src/components/chat-v2/ChatV2VehicleWorkspace.tsx");
  const conversation = read("src/components/chat-v2/ChatV2Conversation.tsx");
  const hook = read(
    "src/components/chat-v2/adapters/useChatV2PanelResize.ts"
  );
  const presentation = read(
    "src/components/chat-v2/adapters/useChatV2Presentation.ts"
  );

  // ---------- 1. Left panel resize within min/max ----------
  assertEq(CHAT_V2_SIDEBAR_WIDTH_MIN, 72, "sidebar-min-72");
  assertEq(CHAT_V2_SIDEBAR_WIDTH_MAX, 360, "sidebar-max-360");
  {
    const max = maxSidebarWhileDragging(1440, 320);
    assert(
      max === CHAT_V2_SIDEBAR_WIDTH_MAX,
      "sidebar-drag-max-hits-cap-on-wide-viewport"
    );
    const narrow = maxSidebarWhileDragging(1024, 320);
    assert(
      narrow === 1024 - CHAT_V2_CENTER_MIN_WIDTH - 320,
      "sidebar-drag-max-respects-center-min",
      `got ${narrow}`
    );
    assert(
      narrow >= CHAT_V2_SIDEBAR_WIDTH_MIN &&
        narrow <= CHAT_V2_SIDEBAR_WIDTH_MAX,
      "sidebar-drag-max-within-band"
    );
  }

  // ---------- 2. Right panel resize within min/max ----------
  assertEq(CHAT_V2_WORKSPACE_WIDTH_MIN, 320, "workspace-min-320");
  assertEq(CHAT_V2_WORKSPACE_WIDTH_MAX, 600, "workspace-max-600");
  {
    const max = maxWorkspaceWhileDragging(1440, 248);
    assert(
      max === CHAT_V2_WORKSPACE_WIDTH_MAX,
      "workspace-drag-max-hits-cap-on-wide-viewport"
    );
    const narrow = maxWorkspaceWhileDragging(1024, 248);
    assert(
      narrow === 1024 - CHAT_V2_CENTER_MIN_WIDTH - 248,
      "workspace-drag-max-respects-center-min",
      `got ${narrow}`
    );
  }

  // ---------- 3. Center chat never below 420 ----------
  assertEq(CHAT_V2_CENTER_MIN_WIDTH, 420, "center-min-constant-420");
  mustInclude(conversation, "lg:min-w-[420px]", "center-css-min-420");
  {
    const resolved = resolveAppliedPanelWidths({
      preferred: { sidebarWidth: 360, workspaceWidth: 600 },
      viewportWidth: 1024,
      sidebarCollapsed: false,
      workspaceCollapsed: false,
    });
    const center = centerWidthFor(
      1024,
      resolved.applied.sidebarWidth,
      resolved.applied.workspaceWidth
    );
    assert(
      center >= CHAT_V2_CENTER_MIN_WIDTH,
      "center-protected-when-both-near-max",
      `center=${center}, applied=${JSON.stringify(resolved.applied)}`
    );
    // Preferred intent preserved for restore when viewport grows.
    assertEq(resolved.preferred.sidebarWidth, 360, "preferred-sidebar-kept");
    assertEq(resolved.preferred.workspaceWidth, 600, "preferred-workspace-kept");
  }

  // ---------- 4–6. Persistence restore / reject / reset ----------
  {
    const { store, themeKey } = installMemoryStorage();
    const restored = parseStoredPanelWidths(
      JSON.stringify({ sidebarWidth: 200, workspaceWidth: 400 })
    );
    assertEq(restored?.sidebarWidth, 200, "storage-valid-sidebar-restored");
    assertEq(restored?.workspaceWidth, 400, "storage-valid-workspace-restored");

    assertEq(parseStoredPanelWidths("not-json"), null, "storage-reject-malformed");
    assertEq(
      parseStoredPanelWidths(JSON.stringify({ sidebarWidth: NaN, workspaceWidth: 400 })),
      null,
      "storage-reject-nan"
    );
    assertEq(
      parseStoredPanelWidths(
        JSON.stringify({ sidebarWidth: -10, workspaceWidth: 400 })
      ),
      null,
      "storage-reject-negative"
    );
    assertEq(
      parseStoredPanelWidths(
        JSON.stringify({ sidebarWidth: 900, workspaceWidth: 400 })
      ),
      null,
      "storage-reject-out-of-range"
    );

    saveChatV2PanelWidths({ sidebarWidth: 180, workspaceWidth: 360 });
    assertEq(
      store.get(CHAT_V2_PANEL_WIDTHS_STORAGE_KEY),
      JSON.stringify({ sidebarWidth: 180, workspaceWidth: 360 }),
      "storage-save-writes-versioned-key"
    );
    assert(
      CHAT_V2_PANEL_WIDTHS_STORAGE_KEY.includes("chat-v2") &&
        CHAT_V2_PANEL_WIDTHS_STORAGE_KEY.includes("v1"),
      "storage-key-versioned-chat-v2-only"
    );

    const loaded = loadChatV2PanelWidths();
    assertEq(loaded.sidebarWidth, 180, "storage-load-sidebar");
    assertEq(loaded.workspaceWidth, 360, "storage-load-workspace");

    clearChatV2PanelWidths();
    assertEq(
      store.has(CHAT_V2_PANEL_WIDTHS_STORAGE_KEY),
      false,
      "reset-clears-panel-width-key"
    );
    assertEq(store.get(themeKey), "dark", "reset-preserves-theme-preference");
    assertEq(
      store.get("nonga.chat-v2.unrelated"),
      "keep-me",
      "reset-preserves-other-keys"
    );
    assertEq(
      JSON.stringify(defaultPanelWidthPreferences()),
      JSON.stringify({
        sidebarWidth: CHAT_V2_SIDEBAR_WIDTH_DEFAULT,
        workspaceWidth: CHAT_V2_WORKSPACE_WIDTH_DEFAULT,
      }),
      "reset-defaults-match-system"
    );
  }

  // ---------- 7. Keyboard resizing contract ----------
  mustInclude(handle, 'role="separator"', "keyboard-separator-role");
  mustInclude(handle, "aria-orientation", "keyboard-aria-orientation");
  mustInclude(handle, "aria-valuenow", "keyboard-aria-valuenow");
  mustInclude(handle, "aria-valuemin", "keyboard-aria-valuemin");
  mustInclude(handle, "aria-valuemax", "keyboard-aria-valuemax");
  mustInclude(handle, "ArrowLeft", "keyboard-arrow-left");
  mustInclude(handle, "ArrowRight", "keyboard-arrow-right");
  mustInclude(handle, "e.shiftKey", "keyboard-shift-large-step");
  mustInclude(handle, "aria-label={label}", "keyboard-aria-label-wired");
  mustInclude(
    sidebar,
    'label="ปรับความกว้างเมนูบทสนทนา"',
    "keyboard-thai-label-sidebar"
  );
  mustInclude(
    workspace,
    'label="ปรับความกว้างพื้นที่เลือกรถ"',
    "keyboard-thai-label-workspace"
  );
  assert(
    handle.includes("valueRef.current") &&
      handle.includes("valueRef.current = capped"),
    "keyboard-uses-value-ref-for-rapid-steps"
  );
  // Direction: sidebar ArrowRight widens; workspace ArrowLeft widens.
  {
    const sidebarBranch = handle.slice(
      handle.indexOf('edge === "sidebar"'),
      handle.indexOf("} else {")
    );
    assert(
      sidebarBranch.includes('e.key === "ArrowRight"') &&
        sidebarBranch.includes("valueRef.current + amount"),
      "keyboard-sidebar-arrow-right-widens"
    );
    const workspaceBranch = handle.slice(handle.indexOf("} else {"));
    assert(
      workspaceBranch.includes('e.key === "ArrowLeft"') &&
        workspaceBranch.includes("valueRef.current + amount"),
      "keyboard-workspace-arrow-left-widens"
    );
  }

  // ---------- 8. Resize handles not shown in mobile mode ----------
  mustInclude(
    shell,
    "resizeEnabled={panelResize.isDesktop && !sidebarCollapsed}",
    "mobile-sidebar-resize-gated-desktop"
  );
  mustInclude(
    shell,
    "resizeEnabled={\n          panelResize.isDesktop &&\n          !workspace.isCollapsed &&\n          workspace.vehicles.length > 0\n        }",
    "mobile-workspace-resize-gated-desktop"
  );
  mustInclude(handle, "if (disabled) return null", "handle-null-when-disabled");
  mustInclude(
    hook,
    "useChatV2IsDesktop",
    "resize-hook-uses-desktop-breakpoint"
  );
  mustInclude(
    presentation,
    'CHAT_V2_DESKTOP_MEDIA_QUERY = "(min-width: 1024px)"',
    "desktop-breakpoint-unchanged-1024"
  );

  // ---------- 9. Existing collapse/open controls still wired ----------
  mustInclude(sidebar, 'data-testid="chat-v2-sidebar-collapse"', "collapse-sidebar-control");
  mustInclude(sidebar, 'data-testid="chat-v2-sidebar-expand"', "expand-sidebar-control");
  mustInclude(workspace, 'data-testid="chat-v2-workspace-collapse"', "collapse-workspace-control");
  mustInclude(workspace, 'data-testid="chat-v2-workspace-expand"', "expand-workspace-control");
  mustInclude(
    shell,
    "const [sidebarCollapsed, setSidebarCollapsed] = useState(false)",
    "sidebar-expanded-default-preserved"
  );

  // ---------- 10. Empty vehicle state does not force a right column ----------
  mustInclude(workspace, "chat-v2-workspace-empty", "empty-workspace-copy-preserved");
  assert(
    /if\s*\(\s*count\s*===\s*0\s*\)\s*\{\s*return null;/.test(workspace),
    "empty-desktop-workspace-unmounts"
  );
  mustInclude(
    shell,
    "workspaceVisible: workspace.vehicles.length > 0",
    "empty-workspace-visible-flag-wired"
  );
  mustInclude(
    shell,
    "workspace.vehicles.length > 0",
    "empty-workspace-resize-gated-on-vehicles"
  );
  mustInclude(panelWidths, "workspaceVisible", "empty-clamp-supports-hidden-workspace");
  {
    const hidden = resolveAppliedPanelWidths({
      preferred: { sidebarWidth: 248, workspaceWidth: 400 },
      viewportWidth: 1440,
      sidebarCollapsed: false,
      workspaceCollapsed: false,
      workspaceVisible: false,
    });
    assertEq(hidden.applied.workspaceWidth, 0, "empty-applied-workspace-width-zero");
    assertEq(hidden.preferred.workspaceWidth, 400, "empty-preferred-workspace-kept");
    const center = centerWidthFor(1440, hidden.applied.sidebarWidth, 0);
    assert(center >= 420, "empty-center-reclaims-space", `center=${center}`);
  }
  {
    const restored = resolveAppliedPanelWidths({
      preferred: { sidebarWidth: 248, workspaceWidth: 400 },
      viewportWidth: 1440,
      sidebarCollapsed: false,
      workspaceCollapsed: false,
      workspaceVisible: true,
    });
    assertEq(
      restored.applied.workspaceWidth,
      400,
      "vehicles-restore-preferred-workspace-width"
    );
  }
  // No resize handle on the collapsed rail.
  {
    const railIdx = workspace.indexOf('data-testid="chat-v2-workspace-rail"');
    const railBlock = workspace.slice(
      Math.max(0, railIdx - 200),
      workspace.indexOf("return (", railIdx + 1)
    );
    assert(
      !railBlock.includes("ChatV2ResizeHandle"),
      "empty-or-rail-no-resize-on-collapsed-rail"
    );
  }

  // ---------- 11. Selected vehicle / chat interaction paths untouched ----------
  mustInclude(
    workspace,
    "useChatV2VehicleSelection",
    "vehicle-selection-hook-preserved"
  );
  mustInclude(conversation, "sendMessage", "chat-send-path-preserved");
  mustNotInclude(shell, "sendMessage(", "shell-does-not-own-send");
  mustNotInclude(panelWidths, "prompt", "widths-no-ai-prompt");
  mustNotInclude(panelWidths, "firestore", "widths-no-firestore");

  // ---------- 12. No horizontal overflow from main layout ----------
  mustInclude(shell, "overflow-hidden", "root-overflow-hidden");
  mustInclude(conversation, "min-w-0", "conversation-min-w-0");
  {
    const bothMax = resolveAppliedPanelWidths({
      preferred: {
        sidebarWidth: CHAT_V2_SIDEBAR_WIDTH_MAX,
        workspaceWidth: CHAT_V2_WORKSPACE_WIDTH_MAX,
      },
      viewportWidth: 1280,
      sidebarCollapsed: false,
      workspaceCollapsed: false,
    });
    const occupied =
      bothMax.applied.sidebarWidth + bothMax.applied.workspaceWidth;
    assert(
      occupied <= 1280 - CHAT_V2_CENTER_MIN_WIDTH,
      "no-overflow-at-1280-with-max-prefs",
      `occupied=${occupied}`
    );
  }
  {
    const withRails = resolveAppliedPanelWidths({
      preferred: { sidebarWidth: 360, workspaceWidth: 600 },
      viewportWidth: 1024,
      sidebarCollapsed: true,
      workspaceCollapsed: true,
    });
    assertEq(
      withRails.applied.sidebarWidth,
      CHAT_V2_RAIL_WIDTH,
      "collapsed-sidebar-uses-rail-width"
    );
    assertEq(
      withRails.applied.workspaceWidth,
      CHAT_V2_RAIL_WIDTH,
      "collapsed-workspace-uses-rail-width"
    );
  }

  // Persistence isolated from Shell / presentation (collapse not persisted).
  mustNotInclude(shell, "localStorage", "shell-no-direct-localStorage");
  mustNotInclude(presentation, "localStorage", "presentation-no-localStorage");
  mustInclude(
    panelWidths,
    "CHAT_V2_PANEL_WIDTHS_STORAGE_KEY",
    "persistence-module-owns-key"
  );
  mustInclude(handle, "cursor-col-resize", "handle-col-resize-cursor");
  mustInclude(handle, "setPointerCapture", "handle-pointer-events");
  mustInclude(handle, "onPointerCancel", "handle-pointer-cancel-safe");
  mustNotInclude(sidebar, "คืนค่าขนาดแผง", "reset-control-removed-from-ui");
  mustNotInclude(sidebar, "chat-v2-reset-panel-widths", "reset-control-testid-removed");
  mustNotInclude(shell, "onResetPanelWidths", "reset-prop-not-wired-from-shell");

  // Auto-expand when results arrive (0 → ≥1 / new sourceMessageId)
  mustInclude(
    presentation,
    "lastAutoExpandMessageIdRef",
    "auto-expand-tracks-result-set"
  );
  assert(
    /if\s*\(\s*!sourceMessageId\s*\|\|\s*vehicles\.length\s*===\s*0\s*\)\s*return/.test(
      presentation
    ) && presentation.includes("setIsCollapsed(false)"),
    "auto-expand-opens-when-new-trusted-results-arrive"
  );
  mustInclude(
    presentation,
    "sourceMessageId",
    "presentation-exposes-source-message-id"
  );

  console.log("\n=== WP-VD02 resizable workspace panels — OK ===");
}

main();
