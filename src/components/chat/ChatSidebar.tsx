import {
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { ChatSidebarAccount } from "./ChatSidebarAccount";
import { ChatSidebarNewCarsSlider } from "./ChatSidebarNewCarsSlider";
import {
  CHAT_SIDEBAR_WIDTH_COLLAPSED_PX,
  CHAT_SIDEBAR_WIDTH_MOBILE,
  resolveChatSidebarDesktopWidthPx,
} from "../../utils/chatSidebarLayout";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  expandedWidth: number;
  onExpandedWidthChange: (width: number) => void;
}

function useMdUp(): boolean {
  const [mdUp, setMdUp] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setMdUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mdUp;
}

export function ChatSidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
  expandedWidth,
  onExpandedWidthChange,
}: ChatSidebarProps) {
  const {
    sessions,
    activeSessionId,
    selectSession,
    createNewChat,
    removeChat,
    isGenerating,
  } = useChatContext();

  const mdUp = useMdUp();
  const [isResizing, setIsResizing] = useState(false);

  const desktopWidthPx = useMemo(
    () => resolveChatSidebarDesktopWidthPx(collapsed, expandedWidth),
    [collapsed, expandedWidth]
  );

  const startResize = useCallback(
    (clientX: number) => {
      setIsResizing(true);
      const startX = clientX;
      const startW = expandedWidth;

      const onMove = (ev: MouseEvent) => {
        onExpandedWidthChange(startW + (ev.clientX - startX));
      };
      const onUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [expandedWidth, onExpandedWidthChange]
  );

  const handleResizeMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      startResize(e.clientX);
    },
    [startResize]
  );

  const handleCreateNewChat = async () => {
    if (isGenerating) return;
    const newId = await createNewChat();
    selectSession(newId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleSelectSession = (id: string) => {
    selectSession(id);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const formattedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const widthClass = CHAT_SIDEBAR_WIDTH_MOBILE;

  const sidebarWidthStyle = mdUp ? { width: desktopWidthPx } : undefined;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs"
            id="sidebar-overlay"
          />
        )}
      </AnimatePresence>

      <div
        id="chat-sidebar-wrapper"
        data-collapsed={collapsed ? "true" : "false"}
        data-expanded-width={mdUp && !collapsed ? String(desktopWidthPx) : undefined}
        style={sidebarWidthStyle}
        className={`fixed top-0 bottom-0 left-0 z-40 relative border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl flex flex-col transform md:translate-x-0 md:static shrink-0 ${widthClass} md:w-auto ${
          isResizing ? "" : "transition-[transform,width] duration-300 ease-in-out"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className={`border-b border-slate-800/80 flex items-center shrink-0 ${
            collapsed ? "md:flex-col md:gap-2 md:py-3 md:px-1.5 p-4 justify-between" : "p-3 justify-between gap-2"
          }`}
          id="sidebar-header"
        >
          <div
            className={`flex items-center min-w-0 ${
              collapsed ? "md:flex-col md:gap-2 md:w-full" : "gap-2 flex-1"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20 text-sm shrink-0">
              N
            </div>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1">
                น้องเอ{" "}
                <span className="text-[10px] bg-orange-500/20 text-orange-400 font-mono px-1.5 py-0.5 rounded-full border border-orange-500/30">
                  AI Sales
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 truncate">
                คุยสนุก สรุปเร็ว เสนอแนววิเคราะห์สับๆ
              </p>
            </div>
          </div>

          <div
            className={`flex items-center shrink-0 ${
              collapsed ? "md:flex-col md:gap-1" : "gap-1"
            }`}
          >
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden md:flex text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title={collapsed ? "ขยายเมนูแชท" : "พับเมนูแชท"}
              id="sidebar-collapse-toggle"
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronsRight className="w-4 h-4" />
              ) : (
                <ChevronsLeft className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
              title="ปิดเมนู"
              id="close-sidebar-btn"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          className={`shrink-0 ${collapsed ? "md:px-1.5 md:py-2 px-4 py-3" : "px-3 py-3"}`}
          id="sidebar-action"
        >
          <button
            id="new-chat-btn"
            onClick={handleCreateNewChat}
            disabled={isGenerating}
            title="เริ่มคุยเรื่องใหม่"
            className={`w-full flex items-center justify-center gap-2 font-medium text-xs rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-all duration-300 shadow-md hover:shadow-orange-500/20 ${
              collapsed
                ? "md:min-h-[40px] md:px-0 md:py-2.5 py-3 px-4 hover:scale-[1.01]"
                : "py-2.5 px-3 hover:scale-[1.01]"
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>เริ่มคุยเรื่องใหม่</span>
          </button>
        </div>

        <ChatSidebarNewCarsSlider
          collapsed={collapsed}
          onMobileSidebarClose={onClose}
        />

        <div
          className={`flex-1 overflow-y-auto pb-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 ${
            collapsed ? "md:px-1 px-3" : "px-2.5"
          }`}
          id="sidebar-list"
        >
          <p
            className={`text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 ${
              collapsed ? "md:hidden px-3" : "px-2"
            }`}
          >
            บทสนทนาที่ผ่านมา
          </p>

          <AnimatePresence initial={false}>
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative flex w-full items-center justify-between rounded-xl transition-all duration-200 text-xs text-left before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:w-1 before:rounded-r-lg ${
                    isActive
                      ? "bg-slate-800/60 border border-slate-700/60 text-slate-100 before:bg-orange-500"
                      : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent before:bg-transparent"
                  } ${collapsed ? "md:justify-center md:before:hidden" : ""}`}
                  id={`chat-session-row-${session.id}`}
                >
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleSelectSession(session.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectSession(session.id);
                      }
                    }}
                    title={session.title}
                    className={`flex items-start gap-2.5 overflow-hidden text-left cursor-pointer ${
                      collapsed
                        ? "md:min-h-[40px] md:w-full md:justify-center md:p-2 md:gap-0 flex-1 p-3 pr-1"
                        : "min-h-[52px] flex-1 p-2.5 pr-1"
                    }`}
                    id={`chat-session-item-${session.id}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${
                        collapsed ? "md:mt-0 mt-0.5" : "mt-0.5"
                      } ${isActive ? "text-orange-400" : "text-slate-500"}`}
                    />
                    <div className={`overflow-hidden min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                      <p className="truncate font-medium text-slate-200 leading-snug">
                        {session.title}
                      </p>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {formattedDate(session.createdAt)}
                      </span>
                    </div>
                  </button>

                  <button
                    id={`delete-chat-session-${session.id}`}
                    className={`text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800/80 transition-colors backdrop-blur-md md:opacity-0 group-hover:opacity-100 ${
                      isActive ? "opacity-100" : ""
                    } ${collapsed ? "md:hidden" : ""}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          "คุณแน่ใจหรือไม่ว่าต้องการลบบทสนทนานี้ออกระบบอย่างถาวร?"
                        )
                      ) {
                        removeChat(session.id);
                      }
                    }}
                    title="ลบบทสนทนานี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {sessions.length === 0 && (
            <div
              className={`text-center py-8 space-y-3 ${collapsed ? "md:py-4 md:px-1 px-4" : "px-4"}`}
              id="empty-sidebar"
            >
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <div className={collapsed ? "md:hidden" : ""}>
                <p className="text-xs font-semibold text-slate-300">ยังไม่มีประวัติแชท</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  กด «เริ่มคุยเรื่องใหม่» ด้านบน แล้วบอกน้องเอว่าต้องการขายรถอะไร หรือถามหารถในตลาดได้เลย
                </p>
              </div>
            </div>
          )}
        </div>

        <ChatSidebarAccount collapsed={collapsed} onMobileSidebarClose={onClose} />

        <div
          className={`border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-500 shrink-0 ${
            collapsed ? "md:hidden p-4 flex items-center justify-between" : "p-3 flex items-center justify-between"
          }`}
          id="sidebar-footer"
        >
          <span>Branding by NongBot Group</span>
          <a
            href="https://www.nongbot.org/nonga"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:underline"
          >
            nongbot.org
          </a>
        </div>

        {!collapsed && mdUp && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="ปรับความกว้างเมนูแชท"
            title="ลากเพื่อปรับความกว้าง"
            id="sidebar-resize-handle"
            onMouseDown={handleResizeMouseDown}
            className="hidden md:block absolute top-0 right-0 z-50 h-full w-2 -mr-1 cursor-col-resize touch-none group/resize"
          >
            <span className="absolute inset-y-0 right-0 w-px bg-transparent group-hover/resize:bg-orange-500/40 group-active/resize:bg-orange-500/70 transition-colors" />
          </div>
        )}
      </div>
    </>
  );
}
