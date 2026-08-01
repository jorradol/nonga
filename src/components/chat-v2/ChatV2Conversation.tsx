/**
 * Chat Experience V2 — center conversation area.
 * Message stream + welcome state + honest AI activity status + composer.
 * All submissions go through the existing sendMessage contract. The chat
 * scroll region is independent from the Vehicle Workspace scroll.
 */
import { useCallback, useEffect, useRef } from "react";
import { Car, PanelLeft } from "lucide-react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { ChatV2Composer, type ChatV2ComposerHandle } from "./ChatV2Composer";
import { ChatV2EmptyState } from "./ChatV2EmptyState";
import { ChatV2MessageBubble } from "./ChatV2MessageBubble";
import { ChatV2StatusIndicator } from "./ChatV2StatusIndicator";
import {
  CHAT_V2_WORKSPACE_TRIGGER_COMPOSER_ID,
  CHAT_V2_WORKSPACE_TRIGGER_HEADER_ID,
  type ChatV2ActivityStatus,
} from "./adapters/useChatV2Presentation";
import { useChatMobileViewportInset } from "../../hooks/chat/useChatMobileViewportInset";

export interface ChatV2WorkspaceTrigger {
  count: number;
  isSheetOpen: boolean;
  onOpenSheet: () => void;
}

interface ChatV2ConversationProps {
  status: ChatV2ActivityStatus;
  workspaceTrigger: ChatV2WorkspaceTrigger;
  onToggleSidebar: () => void;
}

function workspaceTriggerLabel(count: number, mobile: boolean): string {
  if (count === 0) return "พื้นที่เลือกรถ";
  const n = count.toLocaleString("th-TH");
  return mobile ? `ดูรถที่พบ ${n} คัน` : `รถที่พบ ${n} คัน`;
}

export function ChatV2Conversation({
  status,
  workspaceTrigger,
  onToggleSidebar,
}: ChatV2ConversationProps) {
  const {
    activeSession,
    activeSessionId,
    currentMessages,
    isGenerating,
    streamedReply,
    sendMessage,
  } = useChatContext();

  const composerRef = useRef<ChatV2ComposerHandle>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef(false);
  const messageCountRef = useRef(0);

  // Keeps the fixed mobile composer above the on-screen keyboard.
  useChatMobileViewportInset();

  const isNearBottom = useCallback(() => {
    const el = feedRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, []);

  const handleScroll = useCallback(() => {
    userScrolledAwayRef.current = !isNearBottom();
  }, [isNearBottom]);

  // Session switch: jump to the end of that room's history.
  useEffect(() => {
    if (!activeSessionId) return;
    messageCountRef.current = 0;
    userScrolledAwayRef.current = false;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
  }, [activeSessionId]);

  // New message: follow the stream unless the user scrolled away.
  useEffect(() => {
    if (currentMessages.length > messageCountRef.current) {
      const last = currentMessages[currentMessages.length - 1];
      if (last?.sender === "user" || !userScrolledAwayRef.current) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
        });
      }
    }
    messageCountRef.current = currentMessages.length;
  }, [currentMessages]);

  useEffect(() => {
    if (!isGenerating || !streamedReply) return;
    if (!userScrolledAwayRef.current && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [streamedReply, isGenerating, isNearBottom]);

  const handleSend = useCallback(
    async (text: string) => {
      await sendMessage(text);
    },
    [sendMessage]
  );

  const handlePickSuggestion = useCallback((query: string) => {
    composerRef.current?.prefill(query);
  }, []);

  const showWelcome = currentMessages.length === 0 && !isGenerating;

  return (
    <main
      className="flex-1 flex flex-col min-w-0 lg:min-w-[380px] min-h-0 h-full relative"
      aria-label="บทสนทนากับน้องเอ"
      data-testid="chat-v2-conversation"
    >
      {/* Conversation header */}
      <header className="h-12 md:h-14 px-2.5 md:px-4 border-b border-(--nonga-border) bg-(--nonga-bg-surface)/40 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden min-w-10 min-h-10 p-2 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring shrink-0"
            aria-label="เปิดเมนูบทสนทนา"
            title="เปิดเมนูบทสนทนา"
            data-testid="chat-v2-sidebar-toggle"
          >
            <PanelLeft className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-bold nonga-text-primary truncate leading-tight">
              น้องเอ
              <span className="ml-2 text-[10px] font-semibold text-orange-700 dark:text-orange-300 bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 rounded-full align-middle max-sm:hidden">
                ที่ปรึกษาเรื่องรถ
              </span>
            </h2>
            <p className="text-[10px] nonga-text-muted truncate leading-tight mt-0.5 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-(--nonga-success) inline-block shrink-0"
                aria-hidden="true"
              />
              {activeSession ? activeSession.title : "พร้อมให้คำปรึกษา"}
            </p>
          </div>
        </div>

        {/* Workspace trigger — visible below lg (inline column handles lg+). */}
        {!workspaceTrigger.isSheetOpen && (
          <button
            type="button"
            id={CHAT_V2_WORKSPACE_TRIGGER_HEADER_ID}
            onClick={workspaceTrigger.onOpenSheet}
            className="lg:hidden max-md:hidden inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 min-h-10 rounded-xl border border-orange-500/30 bg-(--nonga-bg-surface) text-orange-700 dark:text-orange-300 hover:bg-orange-500/10 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring shrink-0"
            aria-label={workspaceTriggerLabel(workspaceTrigger.count, false)}
            data-testid="chat-v2-workspace-trigger-header"
          >
            <Car className="w-3.5 h-3.5" aria-hidden="true" />
            {workspaceTriggerLabel(workspaceTrigger.count, false)}
          </button>
        )}
      </header>

      {/* Message stream — own scroll region (independent from workspace) */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 md:px-5 py-4 flex flex-col scrollbar-thin max-md:pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]"
        data-testid="chat-v2-feed"
      >
        {showWelcome ? (
          <ChatV2EmptyState onPickSuggestion={handlePickSuggestion} />
        ) : (
          <div className="w-full max-w-3xl mx-auto space-y-4 pb-4">
            {currentMessages.map((msg) => (
              <ChatV2MessageBubble
                key={msg.id}
                message={msg}
                onOpenWorkspace={workspaceTrigger.onOpenSheet}
              />
            ))}

            {isGenerating && streamedReply && (
              <ChatV2MessageBubble
                message={{
                  id: "chat-v2-streaming",
                  sender: "ai",
                  text: streamedReply,
                  createdAt: new Date().toISOString(),
                }}
              />
            )}
          </div>
        )}
        <div ref={bottomRef} className="h-2 shrink-0" aria-hidden="true" />
      </div>

      {/* Composer dock — fixed on mobile so the keyboard never hides it */}
      <div
        className="px-3 pt-1 pb-2 border-t border-(--nonga-border) bg-(--nonga-bg-app)/95 shrink-0 z-30 max-md:fixed max-md:left-0 max-md:right-0 md:static"
        style={{ bottom: "var(--chat-vv-bottom-inset, 0px)" }}
        data-testid="chat-v2-composer-dock"
      >
        <div className="w-full max-w-3xl mx-auto flex items-center justify-between gap-2 min-h-6 pb-0.5">
          <ChatV2StatusIndicator status={status} />
          {/* Mobile workspace pill lives with the composer */}
          {!workspaceTrigger.isSheetOpen && (
            <button
              type="button"
              id={CHAT_V2_WORKSPACE_TRIGGER_COMPOSER_ID}
              onClick={workspaceTrigger.onOpenSheet}
              className="md:hidden inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 min-h-9 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring shrink-0"
              aria-label={workspaceTriggerLabel(workspaceTrigger.count, true)}
              data-testid="chat-v2-workspace-trigger-composer"
            >
              <Car className="w-3.5 h-3.5" aria-hidden="true" />
              {workspaceTriggerLabel(workspaceTrigger.count, true)}
            </button>
          )}
        </div>
        <ChatV2Composer
          ref={composerRef}
          isGenerating={isGenerating}
          onSend={handleSend}
        />
        <p
          className="w-full max-w-3xl mx-auto text-[10px] nonga-text-muted text-center mt-1.5 pb-[env(safe-area-inset-bottom,0px)] md:pb-0"
        >
          น้องเอเป็นผู้ช่วย AI — ตรวจสอบข้อมูลสำคัญจากหน้ารายละเอียดรถอีกครั้ง
        </p>
      </div>
    </main>
  );
}
