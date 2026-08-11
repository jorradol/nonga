import { useMemo, useState } from "react";
import type { ChatV3Conversation } from "./contracts/chatV3Contracts";
import { CHAT_V3_ASSISTANT_NAME, formatThaiDateTime } from "./chatV3Presentation";

interface ChatV3SidebarProps {
  conversations: ChatV3Conversation[];
  activeConversationId: string;
  activeModeThaiLabel: string;
  collapsed: boolean;
  mobilePanel: "sidebar" | "conversation" | "workspace";
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleCollapsed: () => void;
  onShowConversation: () => void;
}

export default function ChatV3Sidebar({
  conversations,
  activeConversationId,
  activeModeThaiLabel,
  collapsed,
  mobilePanel,
  onCreateConversation,
  onDeleteConversation,
  onSelectConversation,
  onToggleCollapsed,
  onShowConversation,
}: ChatV3SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const handleDeleteConversation = (conversationId: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("ต้องการลบบทสนทนานี้หรือไม่");
      if (!confirmed) return;
    }
    onDeleteConversation(conversationId);
  };

  return (
    <aside
      className={`chat-v3-sidebar ${collapsed ? "chat-v3-is-collapsed" : ""} ${mobilePanel === "sidebar" ? "chat-v3-is-mobile-active" : ""}`}
      aria-label="Chat V3 Conversations"
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      <div className="chat-v3-sidebar-brand">
        <div className="chat-v3-sidebar-avatar" aria-hidden="true">
          น
        </div>
        <div className="chat-v3-sidebar-brand-text" hidden={collapsed}>
          <h2>{CHAT_V3_ASSISTANT_NAME}</h2>
          <p>แชทช่วยเรื่องยานยนต์</p>
        </div>
        <div className="chat-v3-sidebar-header-actions">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          >
            {collapsed ? "☰" : "«"}
          </button>
          <button
            type="button"
            className="chat-v3-sidebar-close-mobile"
            onClick={onShowConversation}
            aria-label="กลับไปหน้าสนทนา"
          >
            กลับไปแชท
          </button>
        </div>
      </div>

      <div className="chat-v3-sidebar-body" hidden={collapsed}>
        <button type="button" className="chat-v3-sidebar-new-chat" onClick={onCreateConversation}>
          + แชทใหม่
        </button>

        <label className="chat-v3-sidebar-search" htmlFor="chat-v3-history-search">
          <span className="chat-v3-sr-only">ค้นหาประวัติแชท</span>
          <input
            id="chat-v3-history-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ค้นหาประวัติแชท"
            aria-label="ค้นหาประวัติแชท"
          />
        </label>

        <div className="chat-v3-sidebar-list-heading">บทสนทนาที่ผ่านมา</div>

        <ul className="chat-v3-sidebar-list">
          {filteredConversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={isActive ? "chat-v3-is-active" : ""}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="chat-v3-sidebar-title">{conversation.title}</span>
                  <span className="chat-v3-sidebar-meta">
                    {formatThaiDateTime(conversation.lastMessageAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="chat-v3-sidebar-delete"
                  aria-label={`ลบบทสนทนา ${conversation.title}`}
                  title="ลบบทสนทนา"
                  onClick={() => handleDeleteConversation(conversation.id)}
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="chat-v3-sidebar-rail" hidden={!collapsed}>
        <button
          type="button"
          className="chat-v3-sidebar-rail-new"
          title="แชทใหม่"
          aria-label="แชทใหม่"
          onClick={onCreateConversation}
        >
          +
        </button>
        <button
          type="button"
          className="chat-v3-sidebar-rail-search"
          title="ค้นหาประวัติแชท"
          aria-label="ค้นหาประวัติแชท"
          onClick={onToggleCollapsed}
        >
          ⌕
        </button>
        <ul className="chat-v3-sidebar-rail-list">
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={isActive ? "chat-v3-is-active" : ""}
                  title={conversation.title}
                  aria-label={conversation.title}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  {conversation.title.slice(0, 1)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="chat-v3-sidebar-account" hidden={collapsed}>
        <div className="chat-v3-sidebar-avatar" aria-hidden="true">
          น
        </div>
        <div className="chat-v3-sidebar-profile-text">
          <h3>บัญชีทดลอง</h3>
          <p>สมาชิกทั่วไป • {activeModeThaiLabel}</p>
        </div>
        <button type="button" disabled aria-disabled="true" title="การตั้งค่าจะเปิดในเวอร์ชันถัดไป">
          ตั้งค่า
        </button>
      </div>
    </aside>
  );
}
