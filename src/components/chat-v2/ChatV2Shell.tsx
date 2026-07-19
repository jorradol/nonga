/**
 * Chat Experience V2 — layout shell under ChatProvider.
 * Desktop (xl+): Sidebar · Conversation · Vehicle Workspace, all visible.
 * Tablet/Mobile: Conversation is primary; Sidebar becomes a drawer and the
 * Vehicle Workspace opens as an overlay sheet. No horizontal page overflow.
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div
      className="flex w-full flex-1 min-h-0 h-full overflow-hidden nonga-bg-app relative"
      id="chat-v2-root"
      data-testid="chat-v2-root"
    >
      <ChatV2Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <ChatV2Conversation
        status={status}
        workspaceTrigger={{
          count: workspace.vehicles.length,
          isSheetOpen: workspace.isSheetOpen,
          onOpenSheet: workspace.openSheet,
        }}
        onToggleSidebar={toggleSidebar}
      />

      {/* Desktop inline workspace (xl+) — structure visible even when empty */}
      <ChatV2VehicleWorkspace
        vehicles={workspace.vehicles}
        hasMoreCars={workspace.hasMoreCars}
        isLoading={isGenerating}
        isCollapsed={workspace.isCollapsed}
        onToggleCollapsed={workspace.toggleCollapsed}
      />

      {/* Tablet/Mobile overlay sheet (below xl) */}
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
