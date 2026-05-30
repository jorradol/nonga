import { useCallback, useState } from "react";
import { ChatProvider } from "../contexts/chat/ChatContext";
import { ChatSidebar } from "./chat/ChatSidebar";
import { ChatContainer } from "./chat/ChatContainer";
import {
  clampChatSidebarExpandedWidth,
  readChatSidebarCollapsed,
  readChatSidebarExpandedWidth,
  writeChatSidebarCollapsed,
  writeChatSidebarExpandedWidth,
} from "../utils/chatSidebarLayout";

/**
 * AIChatView mounts the full modern conversational experience for the marketplace,
 * wrapping core panels under the ChatProvider state engine.
 */
export default function AIChatView() {
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

  return (
    <ChatProvider>
      <div
        className="flex w-full flex-1 overflow-hidden bg-slate-950 relative"
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
        <ChatContainer onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </ChatProvider>
  );
}
