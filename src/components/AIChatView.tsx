import { useState } from "react";
import { ChatProvider } from "../contexts/chat/ChatContext";
import { ChatSidebar } from "./chat/ChatSidebar";
import { ChatContainer } from "./chat/ChatContainer";

/**
 * AIChatView mounts the full modern conversational experience for the marketplace,
 * wrapping core panels under the ChatProvider state engine.
 */
export default function AIChatView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ChatProvider>
      <div 
        className="flex w-full flex-1 overflow-hidden bg-slate-950 relative"
        id="ai-chat-root-viewport"
      >
        <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <ChatContainer onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </ChatProvider>
  );
}
