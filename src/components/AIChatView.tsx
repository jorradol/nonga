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
        className="flex w-full overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/20 shadow-2xl relative h-[78vh] min-h-[600px]"
        id="ai-chat-root-viewport"
      >
        <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <ChatContainer onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </ChatProvider>
  );
}
