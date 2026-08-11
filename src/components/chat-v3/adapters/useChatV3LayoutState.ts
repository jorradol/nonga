import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ChatV3Conversation,
  type ChatV3ExpertMode,
  type ChatV3Message,
  type ChatV3WorkspaceItem,
} from "../contracts/chatV3Contracts";
import {
  chatV3MockConversations,
  chatV3MockMessages,
  chatV3MockModeDescription,
  chatV3MockWorkspaceItems,
} from "../mock/chatV3MockData";
import type {
  ChatV3AutomotiveVehicleContextDto,
  ChatV3HistoryTurn,
} from "../../../services/ai/chat-v3/chatV3ConversationContracts";
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../../../services/ai/chat-v3/chatV3ConversationContracts";
import { sendChatV3ConversationRequest } from "./chatV3ConversationClient";

/** Build prior-turn history for the thin conversation client (excludes current draft). */
export function buildChatV3HistoryFromMessages(
  messages: ChatV3Message[],
  conversationId: string
): ChatV3HistoryTurn[] {
  return messages
    .filter(
      (message) =>
        message.conversationId === conversationId &&
        message.status === "complete" &&
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim().length > 0
    )
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
}

/**
 * WP-V3-09 — Map workspace VEHICLE cards (and selected item) into conversation vehicle context.
 * Uses only existing title/summary/payload fields — never invents specs.
 */
export function buildChatV3VehicleContextFromWorkspace(
  items: ChatV3WorkspaceItem[],
  conversationId: string,
  selectedItemId: string | null
): ChatV3AutomotiveVehicleContextDto | undefined {
  const vehicles = items
    .filter(
      (item) =>
        item.conversationId === conversationId &&
        String(item.type).toUpperCase() === "VEHICLE"
    )
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const facts: Record<string, string> = {};
      for (const [key, value] of Object.entries(item.payload ?? {})) {
        if (value == null) continue;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          const text = String(value).trim();
          if (text) facts[key] = text;
        }
      }
      return {
        id: item.id,
        label: item.title,
        summary: item.summary,
        ...(Object.keys(facts).length > 0 ? { facts } : {}),
      };
    });

  if (vehicles.length === 0) return undefined;

  const selectedVehicleId =
    selectedItemId && vehicles.some((vehicle) => vehicle.id === selectedItemId)
      ? selectedItemId
      : null;

  return { selectedVehicleId, vehicles };
}

interface ChatV3LayoutState {
  conversations: ChatV3Conversation[];
  activeConversationId: string;
  activeConversation: ChatV3Conversation | null;
  activeMessages: ChatV3Message[];
  activeWorkspaceItems: ChatV3WorkspaceItem[];
  activeExpertMode: ChatV3ExpertMode;
  expertModeDescription: string;
  draftMessage: string;
  isSending: boolean;
  sendError: string | null;
  isWorkspaceCollapsed: boolean;
  selectedWorkspaceItemId: string | null;
  editingWorkspaceItemId: string | null;
  workspaceEditTitle: string;
  workspaceEditSummary: string;
  sidebarCollapsed: boolean;
  mobilePanel: "sidebar" | "conversation" | "workspace";
  setDraftMessage: (value: string) => void;
  sendDraftMessage: () => void;
  sendSuggestedPrompt: (prompt: string) => void;
  createConversation: () => void;
  deleteConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string) => void;
  setActiveExpertMode: (mode: ChatV3ExpertMode) => void;
  setMobilePanel: (panel: "sidebar" | "conversation" | "workspace") => void;
  toggleSidebarCollapsed: () => void;
  toggleWorkspaceCollapsed: () => void;
  openWorkspace: () => void;
  closeWorkspace: () => void;
  selectWorkspaceItem: (itemId: string) => void;
  startEditingWorkspaceItem: (itemId: string) => void;
  cancelEditingWorkspaceItem: () => void;
  setWorkspaceEditTitle: (value: string) => void;
  setWorkspaceEditSummary: (value: string) => void;
  saveWorkspaceItemEdit: () => void;
  deleteWorkspaceItem: (itemId: string) => void;
  moveWorkspaceItemUp: (itemId: string) => void;
  moveWorkspaceItemDown: (itemId: string) => void;
  beginWorkspaceDrag: (itemId: string) => void;
  completeWorkspaceDrop: (targetItemId: string) => void;
}

function resolveInitialConversationId(conversations: ChatV3Conversation[]): string {
  if (conversations.length === 0) return "";
  return conversations[0].id;
}

function reorderConversationItems(
  items: ChatV3WorkspaceItem[],
  conversationId: string,
  fromIndex: number,
  toIndex: number
): ChatV3WorkspaceItem[] {
  const conversationItems = items
    .filter((item) => item.conversationId === conversationId)
    .sort((left, right) => left.order - right.order);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= conversationItems.length ||
    toIndex >= conversationItems.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const reorderedConversationItems = [...conversationItems];
  const [movedItem] = reorderedConversationItems.splice(fromIndex, 1);
  reorderedConversationItems.splice(toIndex, 0, movedItem);

  const normalizedConversationItems = reorderedConversationItems.map((item, index) => ({
    ...item,
    order: index + 1,
    updatedAt: item.id === movedItem.id ? new Date().toISOString() : item.updatedAt,
  }));

  return items.map((item) => {
    if (item.conversationId !== conversationId) return item;
    return normalizedConversationItems.find((candidate) => candidate.id === item.id) ?? item;
  });
}

function resolveFallbackSelectionId(
  items: ChatV3WorkspaceItem[],
  conversationId: string,
  removedItemId?: string
): string | null {
  const conversationItems = items
    .filter((item) => item.conversationId === conversationId)
    .sort((left, right) => left.order - right.order);
  if (conversationItems.length === 0) return null;
  if (!removedItemId) return conversationItems[0].id;
  const removedIndex = conversationItems.findIndex((item) => item.id === removedItemId);
  if (removedIndex >= 0) return conversationItems[removedIndex].id;
  return conversationItems[Math.max(0, conversationItems.length - 1)].id;
}

export function useChatV3LayoutState(): ChatV3LayoutState {
  const [conversations, setConversations] = useState<ChatV3Conversation[]>(chatV3MockConversations);
  const [messages, setMessages] = useState<ChatV3Message[]>(chatV3MockMessages);
  const [workspaceItems, setWorkspaceItems] = useState<ChatV3WorkspaceItem[]>(
    chatV3MockWorkspaceItems
  );
  const [activeConversationId, setActiveConversationId] = useState<string>(() =>
    resolveInitialConversationId(conversations)
  );
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [forcedExpertMode, setForcedExpertMode] = useState<ChatV3ExpertMode>("AUTO");
  const [selectedWorkspaceItemId, setSelectedWorkspaceItemId] = useState<string | null>(null);
  const [editingWorkspaceItemId, setEditingWorkspaceItemId] = useState<string | null>(null);
  const [workspaceEditTitle, setWorkspaceEditTitle] = useState("");
  const [workspaceEditSummary, setWorkspaceEditSummary] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Chat-first: Workspace is on-demand and closed by default.
  const [isWorkspaceCollapsed, setIsWorkspaceCollapsed] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"sidebar" | "conversation" | "workspace">(
    "conversation"
  );
  const [draggedWorkspaceItemId, setDraggedWorkspaceItemId] = useState<string | null>(null);
  const sendGenerationRef = useRef(0);
  const activeConversationIdRef = useRef(activeConversationId);
  const isSendingRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const activeMessages = useMemo(
    () => messages.filter((message) => message.conversationId === activeConversationId),
    [activeConversationId, messages]
  );

  const activeWorkspaceItems = useMemo(
    () =>
      workspaceItems
        .filter((item) => item.conversationId === activeConversationId)
        .sort((a, b) => a.order - b.order),
    [activeConversationId, workspaceItems]
  );

  useEffect(() => {
    const nextSelectedItemId = resolveFallbackSelectionId(workspaceItems, activeConversationId);
    setSelectedWorkspaceItemId((currentSelectedItemId) => {
      if (
        currentSelectedItemId &&
        workspaceItems.some(
          (item) =>
            item.id === currentSelectedItemId && item.conversationId === activeConversationId
        )
      ) {
        return currentSelectedItemId;
      }
      return nextSelectedItemId;
    });
    setEditingWorkspaceItemId(null);
    setWorkspaceEditTitle("");
    setWorkspaceEditSummary("");
  }, [activeConversationId, workspaceItems]);

  const activeExpertMode = forcedExpertMode;
  const expertModeDescription = chatV3MockModeDescription[activeExpertMode];

  const createConversation = () => {
    sendGenerationRef.current += 1;
    const createdAt = new Date().toISOString();
    const createdConversation: ChatV3Conversation = {
      id: `conv-v3-${Date.now()}`,
      title: "แชทใหม่",
      activeExpertMode: "AUTO",
      createdAt,
      updatedAt: createdAt,
      lastMessageAt: createdAt,
      archived: false,
    };
    setConversations((currentConversations) => [createdConversation, ...currentConversations]);
    setActiveConversationId(createdConversation.id);
    setForcedExpertMode("AUTO");
    setMobilePanel("conversation");
    setDraftMessage("");
    setSendError(null);
  };

  const deleteConversation = (conversationId: string) => {
    const fallbackConversationId =
      conversations.find((conversation) => conversation.id !== conversationId)?.id ?? "";
    setConversations((currentConversations) =>
      currentConversations.filter((conversation) => conversation.id !== conversationId)
    );
    setMessages((currentMessages) =>
      currentMessages.filter((message) => message.conversationId !== conversationId)
    );
    setWorkspaceItems((currentItems) =>
      currentItems.filter((item) => item.conversationId !== conversationId)
    );
    if (activeConversationId === conversationId) {
      setActiveConversationId(fallbackConversationId);
      setMobilePanel("conversation");
    }
  };

  const applyUserMessage = async (content: string) => {
    if (!activeConversationId || isSendingRef.current) return;

    const conversationIdForRequest = activeConversationId;
    const expertModeForRequest = forcedExpertMode;
    const historyForRequest = buildChatV3HistoryFromMessages(messages, conversationIdForRequest);
    const messageTime = new Date().toISOString();
    const thinkingId = `msg-v3-assistant-thinking-${Date.now() + 1}`;
    const userMessage: ChatV3Message = {
      id: `msg-v3-user-${Date.now()}`,
      conversationId: conversationIdForRequest,
      role: "user",
      content,
      createdAt: messageTime,
      status: "complete",
      attachmentReadiness: {
        text: "ready",
        image: "placeholder",
        document: "placeholder",
        microphone: "placeholder",
      },
    };
    const thinkingMessage: ChatV3Message = {
      id: thinkingId,
      conversationId: conversationIdForRequest,
      role: "assistant",
      content: "กำลังเตรียมคำตอบให้คุณ...",
      createdAt: messageTime,
      status: "thinking",
    };

    const generation = ++sendGenerationRef.current;
    isSendingRef.current = true;
    setIsSending(true);
    setSendError(null);
    setMessages((currentMessages) => [...currentMessages, userMessage, thinkingMessage]);
    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id !== conversationIdForRequest
          ? conversation
          : {
              ...conversation,
              title:
                conversation.title === "แชทใหม่"
                  ? content.slice(0, 30)
                  : conversation.title,
              updatedAt: messageTime,
              lastMessageAt: messageTime,
            }
      )
    );

    const result = await sendChatV3ConversationRequest({
      conversationId: conversationIdForRequest,
      message: content,
      history: historyForRequest,
      expertMode: expertModeForRequest,
      vehicleContext: buildChatV3VehicleContextFromWorkspace(
        workspaceItems,
        conversationIdForRequest,
        selectedWorkspaceItemId
      ),
    });

    const isStale =
      generation !== sendGenerationRef.current ||
      activeConversationIdRef.current !== conversationIdForRequest;

    if (isStale) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== thinkingId)
      );
      if (generation === sendGenerationRef.current) {
        isSendingRef.current = false;
        setIsSending(false);
      }
      return;
    }

    if (!result.success) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== thinkingId)
      );
      setSendError(result.message || CHAT_V3_USER_FACING_UNAVAILABLE);
      isSendingRef.current = false;
      setIsSending(false);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id !== thinkingId
          ? message
          : {
              ...message,
              id: result.data.messageId || message.id,
              status: "complete",
              content: result.data.content,
              actions: undefined,
            }
      )
    );
    isSendingRef.current = false;
    setIsSending(false);
  };

  const sendDraftMessage = () => {
    const content = draftMessage.trim();
    if (!content || isSendingRef.current) return;
    setDraftMessage("");
    void applyUserMessage(content);
  };

  const sendSuggestedPrompt = (prompt: string) => {
    const content = prompt.trim();
    if (!content || isSendingRef.current) return;
    setMobilePanel("conversation");
    void applyUserMessage(content);
  };

  const selectWorkspaceItem = (itemId: string) => {
    setSelectedWorkspaceItemId(itemId);
    setEditingWorkspaceItemId(null);
    setWorkspaceEditTitle("");
    setWorkspaceEditSummary("");
  };

  const startEditingWorkspaceItem = (itemId: string) => {
    const item = activeWorkspaceItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    setSelectedWorkspaceItemId(item.id);
    setEditingWorkspaceItemId(item.id);
    setWorkspaceEditTitle(item.title);
    setWorkspaceEditSummary(item.summary);
  };

  const cancelEditingWorkspaceItem = () => {
    setEditingWorkspaceItemId(null);
    setWorkspaceEditTitle("");
    setWorkspaceEditSummary("");
  };

  const saveWorkspaceItemEdit = () => {
    if (!editingWorkspaceItemId) return;
    setWorkspaceItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== editingWorkspaceItemId) return item;
        return {
          ...item,
          title: workspaceEditTitle.trim() || item.title,
          summary: workspaceEditSummary.trim() || item.summary,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    setEditingWorkspaceItemId(null);
  };

  const deleteWorkspaceItem = (itemId: string) => {
    setWorkspaceItems((currentItems) => {
      const targetItem = currentItems.find((item) => item.id === itemId);
      if (!targetItem) return currentItems;
      const remainingItems = currentItems.filter((item) => item.id !== itemId);
      const conversationItems = remainingItems
        .filter((item) => item.conversationId === targetItem.conversationId)
        .sort((left, right) => left.order - right.order)
        .map((item, index) => ({ ...item, order: index + 1 }));
      const normalizedItems = remainingItems.map((item) => {
        if (item.conversationId !== targetItem.conversationId) return item;
        return conversationItems.find((candidate) => candidate.id === item.id) ?? item;
      });
      const nextSelectedItemId = resolveFallbackSelectionId(
        normalizedItems,
        targetItem.conversationId,
        itemId
      );
      setSelectedWorkspaceItemId(nextSelectedItemId);
      setEditingWorkspaceItemId((currentEditingItemId) =>
        currentEditingItemId === itemId ? null : currentEditingItemId
      );
      return normalizedItems;
    });
  };

  const moveWorkspaceItemUp = (itemId: string) => {
    const currentIndex = activeWorkspaceItems.findIndex((item) => item.id === itemId);
    setWorkspaceItems((currentItems) =>
      reorderConversationItems(currentItems, activeConversationId, currentIndex, currentIndex - 1)
    );
    setSelectedWorkspaceItemId(itemId);
  };

  const moveWorkspaceItemDown = (itemId: string) => {
    const currentIndex = activeWorkspaceItems.findIndex((item) => item.id === itemId);
    setWorkspaceItems((currentItems) =>
      reorderConversationItems(currentItems, activeConversationId, currentIndex, currentIndex + 1)
    );
    setSelectedWorkspaceItemId(itemId);
  };

  const beginWorkspaceDrag = (itemId: string) => {
    setDraggedWorkspaceItemId(itemId);
    setSelectedWorkspaceItemId(itemId);
  };

  const completeWorkspaceDrop = (targetItemId: string) => {
    if (!draggedWorkspaceItemId || draggedWorkspaceItemId === targetItemId) return;
    const fromIndex = activeWorkspaceItems.findIndex((item) => item.id === draggedWorkspaceItemId);
    const toIndex = activeWorkspaceItems.findIndex((item) => item.id === targetItemId);
    setWorkspaceItems((currentItems) =>
      reorderConversationItems(currentItems, activeConversationId, fromIndex, toIndex)
    );
    setSelectedWorkspaceItemId(draggedWorkspaceItemId);
    setDraggedWorkspaceItemId(null);
  };

  return {
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    activeWorkspaceItems,
    activeExpertMode,
    expertModeDescription,
    draftMessage,
    isSending,
    sendError,
    isWorkspaceCollapsed,
    selectedWorkspaceItemId,
    editingWorkspaceItemId,
    workspaceEditTitle,
    workspaceEditSummary,
    sidebarCollapsed,
    mobilePanel,
    setDraftMessage,
    sendDraftMessage,
    sendSuggestedPrompt,
    createConversation,
    deleteConversation,
    setActiveConversation: (conversationId) => {
      sendGenerationRef.current += 1;
      setActiveConversationId(conversationId);
      setMobilePanel("conversation");
      setSendError(null);
    },
    setActiveExpertMode: setForcedExpertMode,
    setMobilePanel,
    toggleSidebarCollapsed: () => setSidebarCollapsed((currentValue) => !currentValue),
    toggleWorkspaceCollapsed: () => setIsWorkspaceCollapsed((currentValue) => !currentValue),
    openWorkspace: () => {
      setIsWorkspaceCollapsed(false);
      setMobilePanel("workspace");
    },
    closeWorkspace: () => {
      setIsWorkspaceCollapsed(true);
      setMobilePanel("conversation");
    },
    selectWorkspaceItem,
    startEditingWorkspaceItem,
    cancelEditingWorkspaceItem,
    setWorkspaceEditTitle,
    setWorkspaceEditSummary,
    saveWorkspaceItemEdit,
    deleteWorkspaceItem,
    moveWorkspaceItemUp,
    moveWorkspaceItemDown,
    beginWorkspaceDrag,
    completeWorkspaceDrop,
  };
}
