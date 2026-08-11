import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const adapterPath = path.join(root, "src", "components", "chat-v3", "adapters", "useChatV3LayoutState.ts");
const shellPath = path.join(root, "src", "components", "chat-v3", "ChatV3Shell.tsx");
const workspacePath = path.join(root, "src", "components", "chat-v3", "ChatV3Workspace.tsx");
const conversationPath = path.join(root, "src", "components", "chat-v3", "ChatV3Conversation.tsx");
const sidebarPath = path.join(root, "src", "components", "chat-v3", "ChatV3Sidebar.tsx");
const mockPath = path.join(root, "src", "components", "chat-v3", "mock", "chatV3MockData.ts");

const adapterText = readFileSync(adapterPath, "utf8");
const shellText = readFileSync(shellPath, "utf8");
const workspaceText = readFileSync(workspacePath, "utf8");
const conversationText = readFileSync(conversationPath, "utf8");
const sidebarText = readFileSync(sidebarPath, "utf8");
const mockText = readFileSync(mockPath, "utf8");

const checks: Array<{ name: string; ok: boolean; detail: string }> = [
  {
    name: "initial Expert Mode = AUTO",
    ok: adapterText.includes('useState<ChatV3ExpertMode>("AUTO")'),
    detail: "expert mode should initialize to AUTO locally",
  },
  {
    name: "mode change does not clear messages",
    ok:
      adapterText.includes("const activeMessages = useMemo") &&
      adapterText.includes("setActiveExpertMode: setForcedExpertMode"),
    detail: "messages should remain derived from conversation state, not mode changes",
  },
  {
    name: "mode change does not clear workspace",
    ok:
      adapterText.includes("const activeWorkspaceItems = useMemo") &&
      adapterText.includes("setActiveExpertMode: setForcedExpertMode"),
    detail: "workspace items should remain derived from local state, not mode changes",
  },
  {
    name: "workspace supports selection",
    ok: workspaceText.includes("onSelectItem") && workspaceText.includes("chat-v3-is-selected"),
    detail: "workspace must expose selected-state interaction",
  },
  {
    name: "workspace supports edit",
    ok: workspaceText.includes("onStartEdit") && workspaceText.includes("onSaveEdit") && workspaceText.includes("chat-v3-workspace-editor"),
    detail: "workspace must expose local edit flow",
  },
  {
    name: "workspace supports delete",
    ok: workspaceText.includes("onDeleteItem") && adapterText.includes("const deleteWorkspaceItem ="),
    detail: "workspace must expose delete flow with local state",
  },
  {
    name: "workspace supports reorder",
    ok:
      workspaceText.includes("draggable") &&
      workspaceText.includes("เลื่อนขึ้น") &&
      workspaceText.includes("เลื่อนลง") &&
      adapterText.includes("reorderConversationItems"),
    detail: "workspace must support drag/drop and button fallback reorder",
  },
  {
    name: "workspace empty state",
    ok: workspaceText.includes("chat-v3-workspace-empty") && workspaceText.includes("items.length === 0"),
    detail: "workspace must show empty state after all items are removed",
  },
  {
    name: "unsupported-item fallback",
    ok:
      workspaceText.includes("รายการนี้ยังไม่รองรับการแสดงผลเต็มรูปแบบ") &&
      workspaceText.includes("SUPPORTED_WORKSPACE_TYPES") &&
      mockText.includes('type: "UNSUPPORTED_REPORT"'),
    detail: "unsupported items should render generic fallback card and remain manageable",
  },
  {
    name: "Sidebar default open",
    ok: adapterText.includes("const [sidebarCollapsed, setSidebarCollapsed] = useState(false)"),
    detail: "sidebar must initialize expanded",
  },
  {
    name: "Workspace default closed",
    ok:
      adapterText.includes("const [isWorkspaceCollapsed, setIsWorkspaceCollapsed] = useState(true)") &&
      adapterText.includes("openWorkspace") &&
      adapterText.includes("closeWorkspace"),
    detail: "workspace must initialize closed and expose explicit open/close controls",
  },
  {
    name: "Sidebar collapse does not clear data",
    ok:
      shellText.includes("toggleSidebarCollapsed") &&
      !shellText.includes("setActiveConversation(undefined)") &&
      !shellText.includes('setDraftMessage("")'),
    detail: "sidebar collapse should only toggle layout state",
  },
  {
    name: "placeholder controls do not call runtime",
    ok:
      conversationText.includes("disabled") &&
      !conversationText.includes("fetch(") &&
      !conversationText.includes('input type="file"') &&
      !conversationText.includes("navigator.mediaDevices"),
    detail: "placeholder controls must stay disabled and local-only",
  },
  {
    name: "mobile navigation avoids overlay-only flow",
    ok:
      shellText.includes("chat-v3-mobile-panels") &&
      sidebarText.includes("chat-v3-sidebar-close-mobile") &&
      shellText.includes("openWorkspace"),
    detail: "mobile must offer non-overlay access to menu and workspace",
  },
  {
    name: "message actions can open workspace",
    ok:
      conversationText.includes("onOpenWorkspace") &&
      mockText.includes('type: "open_workspace"') &&
      shellText.includes("onOpenWorkspace={openWorkspace}"),
    detail: "assistant message actions must be able to open workspace on demand",
  },
];

const failed = checks.filter((item) => !item.ok);

if (failed.length > 0) {
  console.error("[FAIL] chat-v3 workspace interactions guard failed");
  for (const item of failed) {
    console.error(` - ${item.name}: ${item.detail}`);
  }
  process.exit(1);
}

console.log("[PASS] chat-v3 workspace interactions guard");
for (const item of checks) {
  console.log(` - ${item.name}`);
}
