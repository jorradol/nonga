import { MessageSquare, Plus, Trash2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { ChatActorStatus } from "./ChatActorStatus";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const { 
    sessions, 
    activeSessionId, 
    selectSession, 
    createNewChat, 
    removeChat, 
    isGenerating 
  } = useChatContext();

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
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 md:w-80 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Branding */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between" id="sidebar-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20 text-sm">
              N
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1">
                น้องเอ <span className="text-[10px] bg-orange-500/20 text-orange-400 font-mono px-1.5 py-0.5 rounded-full border border-orange-500/30">AI Sales</span>
              </h2>
              <p className="text-[10px] text-slate-400">คุยสนุก สรุปเร็ว เสนอแนววิเคราะห์สับๆ</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            title="ปิดเมนู"
            id="close-sidebar-btn"
          >
            ✕
          </button>
        </div>

        <ChatActorStatus />

        {/* Create New Chat Trigger */}
        <div className="px-4 pb-4 pt-0" id="sidebar-action">
          <button
            id="new-chat-btn"
            onClick={handleCreateNewChat}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 font-medium text-xs py-3 px-4 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-all duration-300 shadow-md hover:shadow-orange-500/20 hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            เริ่มคุยเรื่องใหม่
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800" id="sidebar-list">
          <p className="text-[10px] font-semibold text-slate-500 px-3 uppercase tracking-wider mb-2">บทสนทนาที่ผ่านมา</p>
          
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
                  className={`group relative flex items-center justify-between rounded-xl p-3 transition-all duration-200 cursor-pointer text-xs before:absolute before:left-0 before:top-1/4 before:bottom-1/4 before:w-1 before:rounded-r-lg ${
                    isActive
                      ? "bg-slate-800/60 border border-slate-700/60 text-slate-100 before:bg-orange-500"
                      : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent before:bg-transparent"
                  }`}
                  onClick={() => handleSelectSession(session.id)}
                  id={`chat-session-item-${session.id}`}
                >
                  <div className="flex items-start gap-2.5 overflow-hidden w-[82%]">
                    <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-orange-400" : "text-slate-500"}`} />
                    <div className="overflow-hidden">
                      <p className="truncate font-medium text-slate-200 leading-snug">{session.title}</p>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {formattedDate(session.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Delete button (displays on group-hover or if active) */}
                  <button
                    id={`delete-chat-session-${session.id}`}
                    className={`text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800/80 transition-colors backdrop-blur-md md:opacity-0 group-hover:opacity-100 ${
                      isActive ? "opacity-100" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบทสนทนานี้ออกระบบอย่างถาวร?")) {
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
            <div className="text-center py-8 px-4" id="empty-sidebar">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-slate-500">ไม่มีประวัติการพูดคุย</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-500 flex items-center justify-between" id="sidebar-footer">
          <span>Branding by NongBot Group</span>
          <a href="https://www.nongbot.org/nonga" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
            nongbot.org
          </a>
        </div>
      </div>
    </>
  );
}
