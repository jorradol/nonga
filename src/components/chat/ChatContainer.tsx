import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Send, Menu, Sparkles, Sliders, ChevronDown, Car } from "lucide-react";
import {
  ChatImageAttachmentInput,
  ChatImageAttachmentPreview,
} from "./ChatImageAttachmentInput";
import {
  useChatTextareaAutosize,
  CHAT_TEXTAREA_MAX_HEIGHT_PX,
  CHAT_TEXTAREA_MIN_HEIGHT_PX,
} from "../../hooks/chat/useChatTextareaAutosize";
import { useChatMobileViewportInset } from "../../hooks/chat/useChatMobileViewportInset";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { ChatComposerContext } from "../../contexts/chat/ChatComposerContext";
import { useAppStore } from "../../store";
import { loadLastSelectedCarId } from "../../utils/chatCarContext";
import { useAuth } from "../../hooks/auth/useAuth";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { SuggestionsGrid } from "./SuggestionsGrid";
import { MemoryPanel } from "./MemoryPanel";
import { PersonalityPanel } from "./PersonalityPanel";
import {
  CHAT_FIRST_SELLER_GUIDANCE,
  CHAT_PILOT_CLOSED_INVITE_NOTICE,
} from "../../services/ai/chat/chatDraftAccess";
import {
  optimizeChatImageAttachments,
  revokePendingChatImagePreviews,
} from "../../features/chat-image-attachment-v1/imageOptimizer";
import {
  CHAT_IMAGE_ATTACHMENT_MAX_FILES,
  CHAT_IMAGE_ATTACHMENT_TOO_MANY,
  CHAT_IMAGE_ATTACHMENT_V1_ENABLED,
  type PendingChatImageAttachment,
} from "../../features/chat-image-attachment-v1/types";
import { ChatComposerTextarea } from "./ChatComposerTextarea";

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

  const { setView, cars } = useAppStore();
  const { isSignedIn } = useAuth();

  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingChatImageAttachment[]
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isPreparingAttachments, setIsPreparingAttachments] = useState(false);
  const [showMobileProps, setShowMobileProps] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const { ref: textareaRef, reset: resetTextareaHeight, adjust: adjustTextareaHeight } =
    useChatTextareaAutosize(inputText, { pauseWhileComposing: isComposing });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingAnchorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingAttachmentsRef = useRef<PendingChatImageAttachment[]>([]);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledAwayRef = useRef(false);
  const prevGeneratingRef = useRef(false);
  const messageCountRef = useRef(0);

  useChatMobileViewportInset();

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

  useEffect(() => {
    if (isGenerating && !prevGeneratingRef.current) {
      userScrolledAwayRef.current = false;
      requestAnimationFrame(() => {
        scrollToStreamingStart();
      });
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating, scrollToStreamingStart]);

  useEffect(() => {
    if (!activeSessionId) return;
    messageCountRef.current = 0;
    userScrolledAwayRef.current = false;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    });
  }, [activeSessionId]);

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

  useEffect(() => {
    if (!isGenerating || !streamedReply) return;
    if (!userScrolledAwayRef.current && isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [streamedReply, isGenerating, isNearBottom]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      revokePendingChatImagePreviews(pendingAttachmentsRef.current);
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasText = inputText.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if ((!hasText && !hasAttachments) || isGenerating || isPreparingAttachments) {
      return;
    }

    const textToSend = inputText;
    const attachmentsToSend = pendingAttachments;
    setInputText("");
    setPendingAttachments([]);
    setAttachmentError(null);
    resetTextareaHeight();
    let didSend = false;
    try {
      await sendMessage(textToSend, attachmentsToSend);
      didSend = true;
    } catch (err) {
      console.error("[ChatContainer] send failed", err);
      setInputText(textToSend);
      setPendingAttachments(attachmentsToSend);
      setAttachmentError("ส่งข้อความไม่สำเร็จครับ กรุณาลองใหม่อีกครั้ง");
    } finally {
      if (didSend) {
        revokePendingChatImagePreviews(attachmentsToSend);
      }
    }
  };

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!CHAT_IMAGE_ATTACHMENT_V1_ENABLED || files.length === 0) return;

      const slotsLeft = CHAT_IMAGE_ATTACHMENT_MAX_FILES - pendingAttachments.length;
      if (slotsLeft <= 0) {
        setAttachmentError(CHAT_IMAGE_ATTACHMENT_TOO_MANY);
        return;
      }

      const selected = files.slice(0, slotsLeft);
      if (files.length > slotsLeft) {
        setAttachmentError(CHAT_IMAGE_ATTACHMENT_TOO_MANY);
      } else {
        setAttachmentError(null);
      }

      setIsPreparingAttachments(true);
      try {
        const optimized = await optimizeChatImageAttachments(
          selected,
          setAttachmentError
        );
        if (optimized.length > 0) {
          setPendingAttachments((prev) => [...prev, ...optimized]);
        }
      } finally {
        setIsPreparingAttachments(false);
      }
    },
    [pendingAttachments.length]
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => {
      const item = prev[index];
      if (item) {
        revokePendingChatImagePreviews([item]);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  const openImageAttachmentPicker = useCallback(() => {
    if (isGenerating || isPreparingAttachments) return;
    attachmentFileInputRef.current?.click();
    textareaRef.current?.focus();
  }, [isGenerating, isPreparingAttachments, textareaRef]);

  const composerContextValue = useMemo(
    () => ({ openImageAttachmentPicker }),
    [openImageAttachmentPicker]
  );

  const syncComposerText = useCallback((el: HTMLTextAreaElement) => {
    setInputText(el.value);
  }, []);

  const handleComposerBlur = useCallback(() => {
    setIsComposing(false);
  }, []);

  const handleComposerBeforeInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const inputType = (e.nativeEvent as InputEvent).inputType;
      if (
        inputType === "insertFromDictation" ||
        inputType === "insertText" ||
        inputType === "insertReplacementText"
      ) {
        requestAnimationFrame(() => {
          syncComposerText(e.currentTarget);
          adjustTextareaHeight();
        });
      }
    },
    [syncComposerText, adjustTextareaHeight]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionSelect = (queryText: string) => {
    setInputText("");
    sendMessage(queryText);
  };

  const contextualCarId = loadLastSelectedCarId();
  const contextualCar = useMemo(
    () => (contextualCarId ? cars.find((c) => c.id === contextualCarId) : undefined),
    [cars, contextualCarId]
  );

  const handleAskAboutContextualCar = () => {
    if (!contextualCar) return;
    sendMessage(
      `[SELECTED_CAR_ID:${contextualCar.id}] ช่วยสรุปและให้ความเห็นเกี่ยวกับรถคันนี้หน่อยครับ`
    );
  };

  return (
    <ChatComposerContext.Provider value={composerContextValue}>
    <div className="flex-1 flex min-h-0 w-full min-w-0 bg-slate-950 text-slate-100 h-full relative" id="chat-container">
      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden" id="chat-central-panel">
        <div
          className="h-12 md:h-16 border-b border-slate-800/80 bg-slate-900/10 backdrop-blur-md px-3 md:px-4 flex items-center justify-between shrink-0"
          id="chat-navbar"
        >
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="text-slate-300 hover:text-white min-w-10 min-h-10 p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0 md:min-w-0 md:min-h-0 md:p-1.5"
              title="สลับเมนูประวัติแชท"
              id="sidebar-toggle-trigger"
              aria-label="เปิดเมนูประวัติแชท"
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
              type="button"
              onClick={() => setView("marketplace")}
              className="text-xs bg-slate-900 border border-slate-800 text-slate-300 px-2 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:text-white hover:bg-slate-850 active:scale-95 transition-all cursor-pointer shrink-0"
              title="ไปที่ตลาดรถ"
            >
              <Car className="w-3.5 h-3.5 text-orange-400" />
              <span className="max-sm:hidden">ไปที่ตลาดรถ</span>
              <span className="sm:hidden">ตลาด</span>
            </button>
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

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 md:px-4 md:py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent flex flex-col chat-scroll-padding-composer max-md:pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
            id="chat-feed-area"
          >
            {currentMessages.length === 0 ? (
              <div
                className="max-md:flex-none flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto py-6 md:py-12 px-3 md:px-4 space-y-4 md:space-y-6"
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
                    สวัสดีครับ ผมคือน้องเอ อยากซื้อรถแบบไหน บอกงบ รุ่น หรือการใช้งานมาได้เลยครับ
                    — ค้นหารถในตลาดและปรึกษาได้ทันทีโดยไม่ต้องล็อกอิน
                  </p>
                  {!isSignedIn && (
                    <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                      ถ้าต้องการบันทึกประกาศขายรถ น้องเอขอให้เข้าสู่ระบบก่อนนะครับ — กดเข้าสู่ระบบจากเมนูด้านล่างในแถบข้างได้เลย
                      หลังเข้าสู่ระบบแล้ว น้องเอจะบันทึกประกาศต่อให้อัตโนมัติ
                    </p>
                  )}
                  <p className="text-xs text-orange-400/90 mt-3 max-w-md mx-auto leading-relaxed">
                    {CHAT_FIRST_SELLER_GUIDANCE}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
                    {CHAT_PILOT_CLOSED_INVITE_NOTICE}
                  </p>
                </div>
                {contextualCar && (
                  <button
                    type="button"
                    onClick={handleAskAboutContextualCar}
                    className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/20 hover:text-orange-200 transition-colors"
                    id="chat-contextual-car-chip"
                  >
                    <Car className="w-3.5 h-3.5" />
                    ถามน้องเอเกี่ยวกับ {contextualCar.brand} {contextualCar.model}
                  </button>
                )}
                <div className="w-full mt-4">
                  <SuggestionsGrid onSelectSuggestion={handleSuggestionSelect} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto w-full pb-4 md:pb-8 flex-1 min-w-0" id="messages-list">
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

                <div ref={messagesEndRef} className="h-3 md:h-2 shrink-0" aria-hidden />
              </div>
            )}
          </div>

          {showJumpToBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full bg-slate-800/95 border border-slate-700 text-slate-200 shadow-lg hover:bg-slate-700 transition cursor-pointer"
              id="chat-jump-to-bottom"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              ไปท้ายคำตอบ
            </button>
          )}
        </div>

        <div
          className="p-2 max-md:px-2 max-md:pt-1.5 border-t border-slate-800/85 bg-slate-900/98 md:bg-slate-900/40 backdrop-blur-xl shrink-0 z-30 max-md:fixed max-md:left-0 max-md:right-0 chat-composer-safe-bottom md:relative md:bottom-auto"
          id="chat-input-toolbar"
        >
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex flex-col" id="chat-form">
            <div
              className="relative rounded-2xl border border-slate-700 bg-slate-900/80 backdrop-blur-xl hover:border-slate-600 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all duration-300 flex flex-col shadow-lg overflow-hidden"
              id="chat-composer-box"
              aria-busy={isGenerating || undefined}
            >
              {pendingAttachments.length > 0 && (
                <div
                  className="px-2 pt-2 pb-1 border-b border-slate-800/60 shrink-0 max-h-16 overflow-hidden"
                  id="chat-composer-attachment-preview"
                >
                  <ChatImageAttachmentPreview
                    pending={pendingAttachments}
                    onRemoveAt={handleRemoveAttachment}
                  />
                </div>
              )}
              <div className="flex items-center gap-1 px-1 py-0.5 shrink-0" id="chat-composer-input-row">
                <ChatComposerTextarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => {
                    if (isComposing) return;
                    syncComposerText(e.currentTarget);
                  }}
                  onInput={(e) => syncComposerText(e.currentTarget)}
                  onBeforeInput={handleComposerBeforeInput}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsComposing(false);
                    syncComposerText(e.currentTarget);
                    requestAnimationFrame(() => adjustTextareaHeight());
                  }}
                  onBlur={handleComposerBlur}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isGenerating
                      ? "น้องเอกำลังพิมพ์คำตอบให้คุณอยู่ครับ..."
                      : "ถามน้องเอได้เลย เช่น มีรถ SUV ไม่เกิน 700,000..."
                  }
                  rows={1}
                  aria-label="ข้อความถึงน้องเอ"
                  className="flex-1 min-w-0 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none py-2 px-2 resize-none text-sm text-slate-100 placeholder-slate-500 scrollbar-thin leading-[22px] overflow-y-hidden box-border touch-manipulation relative z-[1]"
                  style={{
                    minHeight: CHAT_TEXTAREA_MIN_HEIGHT_PX,
                    maxHeight: CHAT_TEXTAREA_MAX_HEIGHT_PX,
                    height: CHAT_TEXTAREA_MIN_HEIGHT_PX,
                  }}
                  id="chat-textarea-elt"
                />
                {CHAT_IMAGE_ATTACHMENT_V1_ENABLED && (
                  <ChatImageAttachmentInput
                    pending={pendingAttachments}
                    disabled={isGenerating}
                    isPreparing={isPreparingAttachments}
                    onFilesSelected={handleFilesSelected}
                    onRemoveAt={handleRemoveAttachment}
                    showPreview={false}
                    fileInputRef={attachmentFileInputRef}
                  />
                )}
                <button
                  type="submit"
                  disabled={
                    isGenerating ||
                    isPreparingAttachments ||
                    (!inputText.trim() && pendingAttachments.length === 0)
                  }
                  className="min-w-[38px] min-h-[38px] w-[38px] h-[38px] max-md:min-w-11 max-md:min-h-11 max-md:w-11 max-md:h-11 rounded-lg bg-orange-500 flex items-center justify-center text-white hover:bg-orange-400 disabled:opacity-30 disabled:hover:bg-orange-500 transition-all duration-300 shadow-md shrink-0 cursor-pointer"
                  id="send-message-btn"
                  title="ส่งข้อความ"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
            {attachmentError && (
              <p className="text-[11px] text-rose-400 text-center mt-2" role="alert">
                {attachmentError}
              </p>
            )}
          </form>
        </div>
      </div>

      <div className="hidden" id="memory-rail">
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
    </ChatComposerContext.Provider>
  );
}
