import { useEffect, useRef, useState } from "react";
import { CHAT_V3_EXPERT_MODES, type ChatV3ExpertMode } from "./contracts/chatV3Contracts";
import { CHAT_V3_ASSISTANT_NAME, chatV3ExpertModeThaiLabel } from "./chatV3Presentation";

interface ChatV3ExpertModeBarProps {
  activeMode: ChatV3ExpertMode;
  conversationTitle: string;
  workspaceOpen: boolean;
  workspaceItemCount: number;
  onModeChange: (mode: ChatV3ExpertMode) => void;
  onToggleWorkspace: () => void;
  onOpenNavMobile: () => void;
}

export default function ChatV3ExpertModeBar({
  activeMode,
  conversationTitle,
  workspaceOpen,
  workspaceItemCount,
  onModeChange,
  onToggleWorkspace,
  onOpenNavMobile,
}: ChatV3ExpertModeBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <section className="chat-v3-header" aria-label="ส่วนหัวผู้ช่วยน้องเอ">
      <div className="chat-v3-header-main">
        <button
          type="button"
          className="chat-v3-header-nav-toggle"
          onClick={onOpenNavMobile}
          aria-label="เปิดประวัติการสนทนา"
          title="เปิดเมนู"
        >
          ☰
        </button>

        <div className="chat-v3-assistant-avatar" aria-hidden="true">
          น
        </div>

        <div className="chat-v3-assistant-meta">
          <h1>{conversationTitle || CHAT_V3_ASSISTANT_NAME}</h1>
          <div className="chat-v3-expert-popover" ref={menuRef}>
            <button
              type="button"
              className="chat-v3-expert-trigger"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-label="เลือกผู้เชี่ยวชาญ"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span>
                {CHAT_V3_ASSISTANT_NAME} · {chatV3ExpertModeThaiLabel[activeMode]}
              </span>
              <span aria-hidden="true">▼</span>
            </button>
            {menuOpen ? (
              <div className="chat-v3-expert-menu" role="listbox" aria-label="รายการผู้เชี่ยวชาญ">
                {CHAT_V3_EXPERT_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="option"
                    aria-selected={mode === activeMode}
                    className={mode === activeMode ? "chat-v3-is-active" : ""}
                    onClick={() => {
                      onModeChange(mode);
                      setMenuOpen(false);
                    }}
                  >
                    {chatV3ExpertModeThaiLabel[mode]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="chat-v3-assistant-status" aria-label="สถานะพร้อมช่วยคุณ">
            <span className="chat-v3-assistant-status-dot" />
            <span>พร้อมช่วยคุณ</span>
          </div>
        </div>

        <div className="chat-v3-header-actions">
          <button
            type="button"
            className={workspaceOpen ? "chat-v3-is-active" : ""}
            onClick={onToggleWorkspace}
            aria-pressed={workspaceOpen}
            aria-label={workspaceOpen ? "ปิด Workspace" : "เปิด Workspace"}
            title={
              workspaceItemCount > 0
                ? `Workspace (${workspaceItemCount})`
                : "เปิด Workspace"
            }
          >
            {workspaceOpen ? "ปิด Workspace" : "Workspace"}
            {workspaceItemCount > 0 ? ` (${workspaceItemCount})` : ""}
          </button>
        </div>
      </div>
    </section>
  );
}
