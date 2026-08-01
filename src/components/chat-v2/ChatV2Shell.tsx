/**
 * Chat Experience V2 — layout shell under ChatProvider.
 * Desktop / large tablet (lg+, ≥1024px): persistent non-overlay three-region
 * layout — Sidebar · Conversation · Vehicle Workspace. Both side regions
 * start expanded and collapse independently to compact rails; collapsing one
 * gives its width back to the Conversation.
 * Tablet/Mobile (<1024px): Conversation is primary; Sidebar becomes a drawer
 * and the Vehicle Workspace opens as an overlay sheet. No horizontal overflow.
 */
import { useCallback, useState } from "react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { ChatV2Conversation } from "./ChatV2Conversation";
import { ChatV2MobileVehicleSheet } from "./ChatV2MobileVehicleSheet";
import { ChatV2Sidebar } from "./ChatV2Sidebar";
import { ChatV2VehicleWorkspace } from "./ChatV2VehicleWorkspace";
import { useChatV2Presentation } from "./adapters/useChatV2Presentation";

export function ChatV2Shell() {
  const { isGenerating } = useChatContext();
  const { workspace, status } = useChatV2Presentation();
  // Drawer state (<1024px only). Closed by default; never used at lg+.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop collapse state (lg+ only). Sidebar is EXPANDED by default and
  // collapses to a compact rail, independent of the Vehicle Workspace state.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className="flex w-full flex-1 min-h-0 h-full overflow-hidden nonga-bg-app relative"
      id="chat-v2-root"
      data-testid="chat-v2-root"
    >
      <ChatV2Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      <ChatV2Conversation
        status={status}
        workspaceTrigger={{
          count: workspace.vehicles.length,
          isSheetOpen: workspace.isSheetOpen,
          onOpenSheet: workspace.openSheet,
        }}
        onToggleSidebar={toggleSidebar}
      />

      {/* Desktop inline workspace (lg+) — structure visible even when empty */}
      <ChatV2VehicleWorkspace
        vehicles={workspace.vehicles}
        hasMoreCars={workspace.hasMoreCars}
        isLoading={isGenerating}
        isCollapsed={workspace.isCollapsed}
        onToggleCollapsed={workspace.toggleCollapsed}
      />

      {/* Tablet/Mobile overlay sheet (below lg only) */}
      <ChatV2MobileVehicleSheet
        isOpen={workspace.isSheetOpen}
        onClose={workspace.closeSheet}
        vehicles={workspace.vehicles}
        hasMoreCars={workspace.hasMoreCars}
        isLoading={isGenerating}
      />
    </div>
  );
}
