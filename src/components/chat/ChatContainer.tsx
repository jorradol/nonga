import React, { useRef, useEffect, useState, useCallback } from "react";
import { Send, Menu, Sparkles, Sliders, ChevronDown, ArrowLeft, Paperclip } from "lucide-react";
import {
  ChatAttachmentInput,
  ChatComposerAttachmentPreview,
  revokePendingPreviews,
  type PendingChatFile,
  type ChatAttachmentInputHandle,
} from "./ChatAttachmentInput";
import { CHAT_MAX_FILES, MSG_TOO_MANY_FILES } from "../../utils/chat/chatAttachments";
import { useChatTextareaAutosize } from "../../hooks/chat/useChatTextareaAutosize";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { useAppStore } from "../../store";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { SuggestionsGrid } from "./SuggestionsGrid";
import { MemoryPanel } from "./MemoryPanel";
import { PersonalityPanel } from "./PersonalityPanel";

interface ChatContainerProps {
  onToggleSidebar: () => void;
}

const NEAR_BOTTOM_PX = 140;

export function ChatContainer({ onToggleSidebar }: ChatContainerProps) {
  const {
    activeSession,
    activeSessionId,
    currentMessages,
    isGenerating,
    streamedReply,
    streamedCarCards,
    streamedHasMoreCars,
    sendMessage,
  } = useChatContext();
  
  const { setView } = useAppStore();

  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [showMobileProps, setShowMobileProps] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const attachmentInputRef = useRef<ChatAttachmentInputHandle>(null);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;
  const { ref: textareaRef, reset: resetTextareaHeight } = useChatTextareaAutosize(inputText);

  useEffect(
    () => () => revokePendingPreviews(pendingAttachmentsRef.current),
    []
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingAnchorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledAwayRef = useRef(false);
  const prevGeneratingRef = useRef(false);
  const messageCountRef = useRef(0);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  const scrollToStreamingStart = useCallback(() => {
    streamingAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    userScrolledAwayRef.current = false;
    setShowJumpToBottom(false);
  }, []);

  const handleScroll = useCallback(() => {
    const near = isNearBottom();
    userScrolledAwayRef.current = !near;
    setShowJumpToBottom(!near && (isGenerating || currentMessages.length > 0));
  }, [isNearBottom, isGenerating, currentMessages.length]);

  // เมื่อเริ่มตอบใหม่ → เลื่อนไปต้นคำตอบ (ไม่ใช่ท้ายสุด)
  useEffect(() => {
    if (isGenerating && !prevGeneratingRef.current) {
      userScrolledAwayRef.current = false;
      requestAnimationFrame(() => {
        scrollToStreamingStart();
      });
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating, scrollToStreamingStart]);

  // สลับ session จาก sidebar → โหลดข้อความและเลื่อนไปท้าย
  useEffect(() => {
    if (!activeSessionId) return;
    messageCountRef.current = 0;
    userScrolledAwayRef.current = false;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
  }, [activeSessionId]);

  // เมื่อผู้ใช้ส่งข้อความใหม่ → เลื่อนให้เห็นข้อความล่าสุดของผู้ใช้
  useEffect(() => {
    if (currentMessages.length > messageCountRef.current) {
      const last = currentMessages[currentMessages.length - 1];
      if (last?.sender === "user") {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        });
      }
    }
    messageCountRef.current = currentMessages.length;
  }, [currentMessages]);

  // ระหว่าง streaming: เลื่อนตามเฉพาะเมื่อผู้ใช้อยู่ใกล้ท้าย
  useEffect(() => {
    if (!isGenerating || !streamedReply) return;
    if (!userScrolledAwayRef.current && isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [streamedReply, isGenerating, isNearBottom]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const canSend =
      (inputText.trim().length > 0 || pendingAttachments.length > 0) &&
      !isGenerating;
    if (!canSend) return;

    const textToSend = inputText;
    const filesToSend = [...pendingAttachments];
    revokePendingPreviews(filesToSend);
    setInputText("");
    setPendingAttachments([]);
    setAttachError(null);
    resetTextareaHeight();
    void sendMessage(textToSend, filesToSend.length > 0 ? filesToSend : undefined);
  };

  const handleAppendAttachments = useCallback((items: PendingChatFile[]) => {
    setAttachError(null);
    setPendingAttachments((prev) => {
      const slotsLeft = CHAT_MAX_FILES - prev.length;
      if (slotsLeft <= 0) {
        setAttachError(MSG_TOO_MANY_FILES);
        return prev;
      }
      if (items.length > slotsLeft) {
        setAttachError(MSG_TOO_MANY_FILES);
      }
      return [...prev, ...items.slice(0, slotsLeft)];
    });
  }, []);

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((prev) => {
      const item = prev[index];
      if (item?.previewUrl?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(item.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionSelect = (queryText: string) => {
    setInputText("");
    sendMessage(queryText);
  };

  return (
    <div className="flex-1 flex bg-slate-950 text-slate-100 h-full relative" id="chat-container">
      <div className="flex-1 flex flex-col h-full overflow-hidden" id="chat-central-panel">
        <div
          className="h-16 border-b border-slate-800/80 bg-slate-900/10 backdrop-blur-md px-4 flex items-center justify-between shrink-0"
          id="chat-navbar"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("home")}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              title="กลับหน้าแรก"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-semibold">กลับหน้าแรก</span>
            </button>
            <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>
            <button
              onClick={onToggleSidebar}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="สลับเมนูประวัติแชท"
              id="sidebar-toggle-trigger"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="overflow-hidden ml-1">
              <h3 className="text-sm font-bold text-slate-100 truncate flex items-center gap-2">
                คุยกับน้องเอ AI
                <span className="hidden sm:inline-flex text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-medium">
                  คู่หูอัจฉริยะด้านซื้อขายรถยนต์
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                {activeSession ? activeSession.title : "พร้อมให้คำปรึกษา"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobileProps(!showMobileProps)}
              className="xl:hidden text-xs bg-slate-800 border border-slate-700 text-orange-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-slate-700/80 transition cursor-pointer"
              title="ตั้งค่าสมรรถนะบอท"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตั้งค่าบอท</span>
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent flex flex-col"
            id="chat-feed-area"
          >
            {currentMessages.length === 0 ? (
              <div
                className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto py-12 px-4 space-y-6"
                id="chat-hero-frame"
              >
                <div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20"
                  id="chat-hero-icon"
                >
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center justify-center gap-2 leading-tight">
                    คุยรถยนต์สับๆ กับ <span className="text-orange-400">น้องเอ</span>
                  </h1>
                  <p className="text-sm text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
                    ผู้ช่วยส่วนตัวของคุณ แนะนำรถจากข้อมูลจริงใน Marketplace พร้อมเปรียบเทียบและวิเคราะห์สเป็ก
                  </p>
                </div>
                <div className="w-full mt-4">
                  <SuggestionsGrid onSelectSuggestion={handleSuggestionSelect} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto w-full pb-8 flex-1" id="messages-list">
                {currentMessages.map((msg) => (
                  <ChatMessageBubble key={msg.id} message={msg} />
                ))}

                <div ref={streamingAnchorRef} className="h-0 w-full scroll-mt-4" aria-hidden />

                {isGenerating && (streamedReply || streamedCarCards.length > 0) && (
                  <ChatMessageBubble
                    message={{
                      id: "streaming-chunk-node",
                      sender: "ai",
                      text: streamedReply,
                      createdAt: new Date().toISOString(),
                      carCards:
                        streamedCarCards.length > 0 ? streamedCarCards : undefined,
                      hasMoreCars: streamedHasMoreCars,
                    }}
                  />
                )}

                {isGenerating && !streamedReply && streamedCarCards.length === 0 && (
                  <div className="flex gap-3 py-2 animate-pulse" id="typing-loader-ticker">
                    <div className="w-8 h-8 rounded-xl bg-orange-600/30 flex items-center justify-center text-orange-400 shrink-0">
                      <Sparkles className="w-4 h-4 animate-spin text-orange-500" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl text-[12px] bg-slate-900/60 border border-slate-800 text-slate-400 rounded-tl-xs flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">น้องเอกำลังค้นจาก Marketplace...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>

          {showJumpToBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full bg-slate-800/95 border border-slate-700 text-slate-200 shadow-lg hover:bg-slate-700 transition cursor-pointer"
              id="chat-jump-to-bottom"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              ไปท้ายคำตอบ
            </button>
          )}
        </div>

        <div className="p-4 border-t border-slate-800/85 bg-slate-900/40 backdrop-blur-xl shrink-0" id="chat-input-toolbar">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex flex-col" id="chat-form">
            <div
              className="relative rounded-2xl border border-slate-700 bg-slate-900/80 backdrop-blur-xl hover:border-slate-600 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all duration-300 flex flex-col shadow-lg overflow-hidden"
              id="chat-composer-box"
            >
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isGenerating
                    ? "น้องเอกำลังพิมพ์คำตอบให้คุณอยู่ครับ..."
                    : "ถามน้องเอได้เลย เช่น มีรถ SUV ไม่เกิน 700,000..."
                }
                rows={1}
                disabled={isGenerating}
                className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none py-2 px-3 resize-none text-sm text-slate-100 placeholder-slate-500 scrollbar-thin leading-[22px]"
                style={{ minHeight: 38, maxHeight: 82 }}
                id="chat-textarea-elt"
              />

              <div
                className="composer-bottom-row flex items-center gap-1.5 px-1 pb-1 pt-0 shrink-0 min-h-[44px]"
                id="chat-composer-bottom-row"
              >
                <div
                  className="attachment-preview-area flex-1 min-w-0 flex items-center"
                  data-empty={pendingAttachments.length === 0}
                >
                  <ChatComposerAttachmentPreview
                    pending={pendingAttachments}
                    onRemoveAt={handleRemoveAttachment}
                  />
                </div>

                <div className="composer-actions flex shrink-0 items-center gap-1">
                  <ChatAttachmentInput
                    ref={attachmentInputRef}
                    onAppend={handleAppendAttachments}
                    onError={(msg) => setAttachError(msg)}
                    disabled={isGenerating}
                  />
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.openPicker()}
                    disabled={isGenerating}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-orange-400 hover:bg-slate-800/80 disabled:opacity-30 transition shrink-0 cursor-pointer"
                    title="แนบไฟล์"
                    id="chat-attach-file-btn"
                    aria-label="แนบไฟล์"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isGenerating ||
                      (!inputText.trim() && pendingAttachments.length === 0)
                    }
                    className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white hover:bg-orange-400 disabled:opacity-30 disabled:hover:bg-orange-500 transition-all duration-300 shadow-md shrink-0 cursor-pointer"
                    id="send-message-btn"
                    title="ส่งข้อความ"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
            {attachError && (
              <p className="text-[11px] text-rose-400 text-center mt-2" role="alert">
                {attachError}
              </p>
            )}
            <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
              * แนบรูป JPG/PNG/WebP, CSV/XLSX หรือ PDF ได้สูงสุด 10 ไฟล์ต่อครั้ง
            </p>
          </form>
        </div>
      </div>

      <div
        className="hidden xl:flex p-4 flex-col gap-4 border-l border-slate-800/80 bg-slate-950/20 overflow-y-auto h-full w-80 relative shrink-0"
        id="memory-rail"
      >
        <PersonalityPanel />
        <MemoryPanel />
      </div>

      {showMobileProps && (
        <div
          className="xl:hidden absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col p-4 overflow-y-auto space-y-4 animate-fade-in"
          id="mobile-props-overlay"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
              ปรับแต่งบอท & สเป็คที่บันทึก
            </h3>
            <button
              onClick={() => setShowMobileProps(false)}
              className="text-[10px] text-slate-300 font-bold px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
            >
              ปิดคำสั่งนี้
            </button>
          </div>
          <PersonalityPanel />
          <MemoryPanel />
        </div>
      )}
    </div>
  );
}
