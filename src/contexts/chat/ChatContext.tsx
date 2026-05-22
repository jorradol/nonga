import React, { createContext, useContext, useEffect } from "react";
import { useChat } from "../../hooks/chat/useChat";

type ChatContextType = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextType | null>(null);

/**
 * ChatProvider is the context wrapper that hydrates conversational history
 * and provides stateful triggers to lower-level panels, sidebars, and custom bubbles.
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chat = useChat();
  const { initializeChat } = chat;

  // Hydrate chat sessions on startup
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

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
