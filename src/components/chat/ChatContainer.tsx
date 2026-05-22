import React, { useRef, useEffect, useState } from "react";
import { Send, Menu, Sparkles, MessageSquare, AlertCircle, Ban, Sliders } from "lucide-react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { SuggestionsGrid } from "./SuggestionsGrid";
import { MemoryPanel } from "./MemoryPanel";
import { PersonalityPanel } from "./PersonalityPanel";

interface ChatContainerProps {
  onToggleSidebar: () => void;
}

export function ChatContainer({ onToggleSidebar }: ChatContainerProps) {
  const {
    activeSession,
    currentMessages,
    isGenerating,
    streamedReply,
    sendMessage,
    isAnalyzingMemory
  } = useChatContext();

  const [inputText, setInputText] = useState("");
  const [showMobileProps, setShowMobileProps] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto Scroll logic matching ChatGPT quality requirements
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, streamedReply]);

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
      {/* Central Chat Stream Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden" id="chat-central-panel">
        
        {/* Top Navbar */}
        <div className="h-16 border-b border-slate-800/80 bg-slate-900/10 backdrop-blur-md px-4 flex items-center justify-between" id="chat-navbar">
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
              Nong A v3.5-flash
            </span>
          </div>
        </div>

        {/* Message Feed Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent flex flex-col"
          id="chat-feed-area"
        >
          {currentMessages.length === 0 ? (
            /* Brand Onboarding / Hero Frame */
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-auto py-12 px-4 space-y-4" id="chat-hero-frame">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20" id="chat-hero-icon">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold text-slate-100 flex items-center justify-center gap-1.5 leading-tight">
                  คุยรถยนต์สับๆ กับ <span className="text-orange-400">น้องเอ</span>
                </h1>
                <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                  ผู้ช่วยวิเคราะห์สเป็คสุดปัง แนะนำสิทธิพิเศษ เคล็ดลับเช็คสภาพรถ และคำนวณงบประมาณที่คุณยื่นข้อเสนอดีที่สุด!
                </p>
              </div>

              {/* Grid suggestions */}
              <SuggestionsGrid onSelectSuggestion={handleSuggestionSelect} />
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto w-full pb-8 flex-1" id="messages-list">
              {currentMessages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} />
              ))}

              {/* Streaming replies stream render */}
              {isGenerating && streamedReply && (
                <ChatMessageBubble
                  message={{
                    id: "streaming-chunk-node",
                    sender: "ai",
                    text: streamedReply,
                    createdAt: new Date().toISOString()
                  }}
                />
              )}

              {/* Loading Ticker / Thinking Indicator */}
              {isGenerating && !streamedReply && (
                <div className="flex gap-3 py-2 animate-pulse" id="typing-loader-ticker">
                  <div className="w-8 h-8 rounded-xl bg-orange-600/30 flex items-center justify-center text-orange-400 shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin text-orange-500" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-[80vw]">
                    <div className="px-4 py-3 rounded-2xl text-[12px] bg-slate-900/60 border border-slate-800 text-slate-400 rounded-tl-xs flex items-center gap-2">
                      <div className="flex space-x-1 items-center">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-[10px] text-slate-500">น้องเอกำลังคิดวิเคราะห์และจัดสต๊อกสเป็คพิเศษ...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pin point anchor */}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>

        {/* Input prompt bar */}
        <div className="p-4 border-t border-slate-800/85 bg-slate-900/20 backdrop-blur-md" id="chat-input-toolbar">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex flex-col" id="chat-form">
            <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl hover:border-slate-700/80 focus-within:border-orange-500/50 transition-all duration-300 overflow-hidden flex items-center pr-3 pl-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isGenerating ? "น้องเอกำลังพิมพ์คำตอบให้คุณอยู่ครับ..." : "ถามน้องเอได้เลย เช่น หารถครอบครัวงบหนึ่งล้าน..."}
                rows={1}
                disabled={isGenerating}
                className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none py-3.5 px-3 max-h-36 resize-none text-xs text-slate-200 placeholder-slate-500 scrollbar-none"
                id="chat-textarea-elt"
              />
              <button
                type="submit"
                disabled={isGenerating || !inputText.trim()}
                className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 disabled:opacity-30 disabled:hover:bg-orange-500 transition-all duration-300 shadow-md hover:shadow-orange-500/20 shrink-0 cursor-pointer"
                id="send-message-btn"
                title="ส่งข้อความ"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Disclaimer notice */}
            <p className="text-[9px] text-slate-500 text-center mt-2 leading-relaxed">
              * ข้อมูลรถยนต์ดึงตรงจากเครือข่าย NongBot Premium Space. สนทนานี้ได้รับการจดจำสเป็คเป็นส่วนตัวในคุกกี้ระบบอัจฉริยะ ปังปุริเย่!
            </p>
          </form>
        </div>
      </div>

      {/* Right side AI Memory Panel & Personality Panel */}
      <div className="hidden xl:flex p-4 flex-col gap-4 border-l border-slate-800/80 bg-slate-950/20 overflow-y-auto max-h-[78vh] w-80 relative" id="memory-rail">
        <PersonalityPanel />
        <MemoryPanel />
      </div>

      {/* Mobile absolute overlay sliding drawer */}
      {showMobileProps && (
        <div className="xl:hidden absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col p-4 overflow-y-auto space-y-4 animate-fade-in" id="mobile-props-overlay">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">ปรับแต่งบอท & สเป็คที่บันทึก</h3>
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
