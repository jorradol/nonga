import React, { useRef, useEffect, useState, useCallback } from "react";
import { Send, Menu, Sparkles, Sliders, ChevronDown } from "lucide-react";
import { useChatContext } from "../../contexts/chat/ChatContext";
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
    currentMessages,
    isGenerating,
    streamedReply,
    streamedCarCards,
    streamedHasMoreCars,
    sendMessage,
  } = useChatContext();

  const [inputText, setInputText] = useState("");
  const [showMobileProps, setShowMobileProps] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

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
    if (!inputText.trim() || isGenerating) return;

    const textToSend = inputText;
    setInputText("");
    sendMessage(textToSend);
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
          className="h-16 border-b border-slate-800/80 bg-slate-900/10 backdrop-blur-md px-4 flex items-center justify-between"
          id="chat-navbar"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition-colors"
              title="สลับเมนูข้าง"
              id="sidebar-toggle-trigger"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="overflow-hidden">
              <h3 className="text-xs font-semibold text-slate-100 truncate">
                {activeSession ? activeSession.title : "ระบบแนะนำอัจฉริยะ ของน้องเอ"}
              </h3>
              <p className="text-[10px] text-orange-400 font-medium flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 animate-pulse text-orange-500" />
                ออนไลน์อยู่ครับ • ปรึกษาซื้อขายวิเคราะห์สับๆ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobileProps(!showMobileProps)}
              className="xl:hidden text-xs bg-slate-800 border border-slate-705 text-orange-400 px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-slate-700/80 transition cursor-pointer"
              title="ตั้งค่าสมรรถนะบอท"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ปรับบอท/เช็คสเป็ค</span>
            </button>
            <span className="text-[9px] bg-slate-850 text-slate-400 border border-slate-800 px-2 py-1.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping inline-block" />
              Nong A Chat Phase 2
            </span>
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
                className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-auto py-12 px-4 space-y-4"
                id="chat-hero-frame"
              >
                <div
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20"
                  id="chat-hero-icon"
                >
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-extrabold text-slate-100 flex items-center justify-center gap-1.5 leading-tight">
                    คุยรถยนต์สับๆ กับ <span className="text-orange-400">น้องเอ</span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                    แนะนำรถจากข้อมูลจริงใน Marketplace พร้อมการ์ดรถและรูปจากระบบ
                  </p>
                </div>
                <SuggestionsGrid onSelectSuggestion={handleSuggestionSelect} />
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto w-full pb-8 flex-1" id="messages-list">
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

        <div className="p-4 border-t border-slate-800/85 bg-slate-900/20 backdrop-blur-md" id="chat-input-toolbar">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex flex-col" id="chat-form">
            <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl hover:border-slate-700/80 focus-within:border-orange-500/50 transition-all duration-300 overflow-hidden flex items-center pr-3 pl-1">
              <textarea
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
                className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none py-3.5 px-3 max-h-36 resize-none text-xs text-slate-200 placeholder-slate-500 scrollbar-none"
                id="chat-textarea-elt"
              />
              <button
                type="submit"
                disabled={isGenerating || !inputText.trim()}
                className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 disabled:opacity-30 transition-all duration-300 shadow-md shrink-0 cursor-pointer"
                id="send-message-btn"
                title="ส่งข้อความ"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[9px] text-slate-500 text-center mt-2 leading-relaxed">
              * ข้อมูลรถจาก Marketplace จริง — การ์ดแสดงเฉพาะ field ที่มีในระบบ
            </p>
          </form>
        </div>
      </div>

      <div
        className="hidden xl:flex p-4 flex-col gap-4 border-l border-slate-800/80 bg-slate-950/20 overflow-y-auto max-h-[78vh] w-80 relative"
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
