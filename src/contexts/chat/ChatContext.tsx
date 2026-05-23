import React, { createContext, useContext, useEffect, useRef } from "react";
import { useChat } from "../../hooks/chat/useChat";
import { takePendingChatMessage } from "../../utils/pendingChatMessage";

type ChatContextType = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextType | null>(null);

/**
 * ChatProvider is the context wrapper that hydrates conversational history
 * and provides stateful triggers to lower-level panels, sidebars, and custom bubbles.
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chat = useChat();
  const { initializeChat, sendMessage, activeSessionId, isGenerating } = chat;
  const pendingHandled = useRef(false);

  // Hydrate chat sessions on startup
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Bridge CTAs from Marketplace / car details → modern chat
  useEffect(() => {
    if (pendingHandled.current || !activeSessionId || isGenerating) return;
    const pending = takePendingChatMessage();
    if (pending?.trim()) {
      pendingHandled.current = true;
      void sendMessage(pending);
    }
  }, [activeSessionId, isGenerating, sendMessage]);

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be utilized inside a ChatProvider.");
  }
  return context;
}
