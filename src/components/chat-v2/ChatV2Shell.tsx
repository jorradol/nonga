/**
 * Chat Experience V2 — layout shell under ChatProvider.
 * Desktop / large tablet (lg+, ≥1024px): persistent non-overlay three-region
 * layout — Sidebar · Conversation · Vehicle Workspace (when vehicles exist).
 * Both side regions start expanded and collapse independently to compact rails;
 * collapsing one gives its width back to the Conversation. With no discovered
 * vehicles the right column is not mounted so chat reclaim space. Expanded
 * columns are user-resizable within safe min/max bounds while keeping the
 * center chat ≥ 420px.
 * Tablet/Mobile (<1024px): Conversation is primary; Sidebar becomes a drawer
 * and the Vehicle Workspace opens as an overlay sheet. No horizontal overflow.
 * Free-drag resizing is desktop-only.
 */
import { useCallback, useState } from "react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { ChatV2Conversation } from "./ChatV2Conversation";
import { ChatV2MobileVehicleSheet } from "./ChatV2MobileVehicleSheet";
import { ChatV2Sidebar } from "./ChatV2Sidebar";
import { ChatV2VehicleWorkspace } from "./ChatV2VehicleWorkspace";
import { useChatV2Presentation } from "./adapters/useChatV2Presentation";
import { useChatV2PanelResize } from "./adapters/useChatV2PanelResize";

export function ChatV2Shell() {
  const { isGenerating } = useChatContext();
  const { workspace, status } = useChatV2Presentation();
  // Drawer state (<1024px only). Closed by default; never used at lg+.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop collapse state (lg+ only). Sidebar is EXPANDED by default and
  // collapses to a compact rail, independent of the Vehicle Workspace state.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const panelResize = useChatV2PanelResize({
    sidebarCollapsed,
    workspaceCollapsed: workspace.isCollapsed,
    workspaceVisible: workspace.vehicles.length > 0,
  });

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
      data-sidebar-width={
        panelResize.isDesktop ? String(panelResize.appliedSidebarWidth) : undefined
      }
      data-workspace-width={
        panelResize.isDesktop && workspace.vehicles.length > 0
          ? String(panelResize.appliedWorkspaceWidth)
          : panelResize.isDesktop
            ? "0"
            : undefined
      }
      data-vehicle-count={String(workspace.vehicles.length)}
      data-workspace-collapsed={workspace.isCollapsed ? "true" : "false"}
      data-source-message-id={workspace.sourceMessageId ?? ""}
    >
      <ChatV2Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        desktopWidthPx={panelResize.appliedSidebarWidth}
        isDesktop={panelResize.isDesktop}
        resizeEnabled={panelResize.isDesktop && !sidebarCollapsed}
        resizeValue={panelResize.preferred.sidebarWidth}
        resizeMin={panelResize.sidebarMin}
        resizeMax={panelResize.sidebarResizeMax}
        resizeStep={panelResize.resizeStep}
        resizeLargeStep={panelResize.resizeLargeStep}
        onResizeWidth={panelResize.setSidebarWidth}
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

      {/* Desktop inline workspace (lg+) — only when the conversation has vehicles */}
      <ChatV2VehicleWorkspace
        vehicles={workspace.vehicles}
        hasMoreCars={workspace.hasMoreCars}
        isLoading={isGenerating}
        isCollapsed={workspace.isCollapsed}
        onToggleCollapsed={workspace.toggleCollapsed}
        desktopWidthPx={panelResize.appliedWorkspaceWidth}
        resizeEnabled={
          panelResize.isDesktop &&
          !workspace.isCollapsed &&
          workspace.vehicles.length > 0
        }
        resizeValue={panelResize.preferred.workspaceWidth}
        resizeMin={panelResize.workspaceMin}
        resizeMax={panelResize.workspaceResizeMax}
        resizeStep={panelResize.resizeStep}
        resizeLargeStep={panelResize.resizeLargeStep}
        onResizeWidth={panelResize.setWorkspaceWidth}
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
