import { useCallback, useEffect, useState } from "react";
import { ChatProvider, useChatContext } from "../contexts/chat/ChatContext";
import { ChatSidebar } from "./chat/ChatSidebar";
import { ChatContainer } from "./chat/ChatContainer";
import { ChatVehiclePanel } from "./chat/ChatVehiclePanel";
import { ChatLoginModal } from "./chat/ChatLoginModal";
import { useAppStore } from "../store";
import { useVehiclePanel } from "../hooks/chat/useVehiclePanel";
import {
  clampChatSidebarExpandedWidth,
  readChatSidebarCollapsed,
  readChatSidebarExpandedWidth,
  writeChatSidebarCollapsed,
  writeChatSidebarExpandedWidth,
} from "../utils/chatSidebarLayout";

interface AIChatShellProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  expandedWidth: number;
  handleExpandedWidthChange: (width: number) => void;
}

/**
 * Inner layout under ChatProvider — hosts the three desktop areas:
 * Chat Sidebar (left) · Conversation (center) · Vehicle Results Panel (right).
 * The vehicle panel is driven only by real carCards already present in the
 * active session's messages (see useVehiclePanel).
 */
function AIChatShell({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  toggleSidebarCollapsed,
  expandedWidth,
  handleExpandedWidthChange,
}: AIChatShellProps) {
  const { activeSessionId, currentMessages, isGenerating } = useChatContext();
  const {
    discoveredVehicles,
    isVehiclePanelOpen,
    vehiclePanelViewState,
    hasMoreDiscoveredCars,
    openVehiclePanel,
    closeVehiclePanel,
  } = useVehiclePanel({ activeSessionId, currentMessages, isGenerating });

  return (
    <div
      className="flex w-full flex-1 min-h-0 h-full overflow-hidden nonga-bg-app relative"
      id="ai-chat-root-viewport"
    >
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        expandedWidth={expandedWidth}
        onExpandedWidthChange={handleExpandedWidthChange}
      />
      <ChatContainer
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        vehiclePanel={{
          count: discoveredVehicles.length,
          isOpen: isVehiclePanelOpen,
          onOpen: openVehiclePanel,
        }}
      />
      <ChatVehiclePanel
        vehicles={discoveredVehicles}
        viewState={vehiclePanelViewState}
        hasMoreCars={hasMoreDiscoveredCars}
        isOpen={isVehiclePanelOpen}
        onClose={closeVehiclePanel}
      />
    </div>
  );
}

/**
 * AIChatView mounts the full modern conversational experience for the marketplace,
 * wrapping core panels under the ChatProvider state engine.
 */
export default function AIChatView() {
  const chatLoginModalOpen = useAppStore((s) => s.chatLoginModalOpen);
  const setChatLoginModalOpen = useAppStore((s) => s.setChatLoginModalOpen);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readChatSidebarCollapsed);
  const [expandedWidth, setExpandedWidth] = useState(readChatSidebarExpandedWidth);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      writeChatSidebarCollapsed(next);
      return next;
    });
  }, []);

  const handleExpandedWidthChange = useCallback((width: number) => {
    const clamped = clampChatSidebarExpandedWidth(width);
    setExpandedWidth(clamped);
    writeChatSidebarExpandedWidth(clamped);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const syncSidebarForViewport = () => {
      setSidebarOpen(mq.matches);
    };
    syncSidebarForViewport();
    mq.addEventListener("change", syncSidebarForViewport);
    return () => mq.removeEventListener("change", syncSidebarForViewport);
  }, []);

  return (
    <ChatProvider>
      <AIChatShell
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
        expandedWidth={expandedWidth}
        handleExpandedWidthChange={handleExpandedWidthChange}
      />
      <ChatLoginModal
        open={chatLoginModalOpen}
        onClose={() => setChatLoginModalOpen(false)}
      />
    </ChatProvider>
  );
}
