import React from "react";
import { 
  Copy, Check, Terminal, Sparkles, User, 
  Volume2, VolumeX, Heart, Edit3, Save, X 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../../types";
import { useSpeech } from "../../hooks/chat/useSpeech";
import { useClipboard } from "../../hooks/chat/useClipboard";
import { useFavorites } from "../../hooks/chat/useFavorites";
import { useEditableMessage } from "../../hooks/chat/useEditableMessage";
import { useChat } from "../../hooks/chat/useChat";
import {
  CHAT_CONFIRM_CREATE_DRAFT_ACTION,
} from "../../services/ai/chat/chatDraftActions";
import { ChatCarCard } from "./ChatCarCard";
import { ChatMessageAttachments } from "./ChatMessageAttachments";
import { ChatPendingListingCard } from "./ChatPendingListingCard";
import {
  CHAT_MEMBER_CONFIRM_SAVE_LISTING_ACTION,
  CHAT_MEMBER_NOT_NOW_LISTING_ACTION,
} from "../../services/chat/chatMemberPendingListing";
import { useAppStore } from "../../store";
import { navigateToSavedDealerDraft } from "../../utils/dealer/dealerDraftNavigation";
import { ExternalLink } from "lucide-react";

interface ChatMessageBubbleProps {
  key?: string;
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.sender === "user";
  const { activeSessionId, editMessage, sendMessage } = useChat();
  const setView = useAppStore((s) => s.setView);
  const showDraftIdDebug =
    typeof import.meta !== "undefined" &&
    Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  
  // Custom hooks
  const { isSpeaking, toggleSpeak } = useSpeech();
  const { copiedId, copyToClipboard } = useClipboard();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const handleSaveEdit = async (updatedText: string) => {
    if (activeSessionId) {
      await editMessage(activeSessionId, message.id, updatedText);
    }
  };

  const {
    isEditing,
    editValue,
    setEditValue,
    startEditing,
    cancelEditing,
    saveEditing
  } = useEditableMessage({
    initialText: message.text,
    onSave: handleSaveEdit
  });

  const isLiked = isFavorite(message.id);
  const speaking = isSpeaking(message.id);

  const formattedTime = () => {
    try {
      return new Date(message.createdAt).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  };

  /**
   * Safe Custom Lexer/Parser for Markdown and Nong A signatures.
   */
  const msgKey = message.id;

  const parseMarkdown = (rawText: string) => {
    if (!rawText) return null;

    // Split text by code blocks
    const segments = rawText.split(/(```[\s\S]*?```)/g);

    return segments.map((segment, segIdx) => {
      // Check if this segment is a code block
      if (segment.startsWith("```") && segment.endsWith("```")) {
        const blockContent = segment.slice(3, -3);
        const firstNewLineIdx = blockContent.indexOf("\n");
        const detectedLanguage = firstNewLineIdx !== -1 ? blockContent.substring(0, firstNewLineIdx).trim() : "javascript";
        const code = firstNewLineIdx !== -1 ? blockContent.substring(firstNewLineIdx + 1) : blockContent;
        const blockId = `code-block-${message.id}-${segIdx}`;

        return (
          <div key={`${msgKey}-code-${segIdx}`} className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-[11px]" id={blockId}>
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-[10px] text-orange-400">
                <Terminal className="w-3.5 h-3.5" />
                {detectedLanguage || "code"}
              </span>
              <button
                onClick={() => copyToClipboard(code, blockId)}
                className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="คัดลอกโค้ด"
              >
                {copiedId === blockId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[9px] text-green-400 font-bold">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[9px]">คัดลอกโค้ด</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-slate-300 leading-relaxed max-w-full">
              <code>{code.trim()}</code>
            </pre>
          </div>
        );
      }

      // Render standard paragraph formatting
      const lines = segment.split("\n");
      return (
        <div key={`${msgKey}-seg-${segIdx}`} className="space-y-2">
          {lines.map((line, lineIdx) => {
            const cleanLine = line.trim();
            if (!cleanLine) {
              return <div key={`${msgKey}-sp-${segIdx}-${lineIdx}`} className="h-2" />;
            }

            // Headers
            if (cleanLine.startsWith("### ")) {
              return (
                <h4 key={`${msgKey}-h4-${lineIdx}`} className="text-xs font-bold text-orange-400 mt-4 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  {cleanLine.substring(4)}
                </h4>
              );
            }
            if (cleanLine.startsWith("## ")) {
              return (
                <h3 key={`${msgKey}-h3-${lineIdx}`} className="text-sm font-extrabold text-slate-100 mt-5 mb-2.5 border-b border-slate-800/60 pb-1 w-full">
                  {cleanLine.substring(3)}
                </h3>
              );
            }
            if (cleanLine.startsWith("# ")) {
              return (
                <h2 key={`${msgKey}-h2-${lineIdx}`} className="text-base font-black text-slate-100 mt-6 mb-3">
                  {cleanLine.substring(2)}
                </h2>
              );
            }

            // Bullet Lists
            if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
              const listText = cleanLine.substring(2);
              return (
                <ul key={`${msgKey}-ul-${lineIdx}`} className="list-none pl-1 space-y-1 my-1">
                  <li className="flex items-start gap-1.5 text-slate-300">
                    <span className="text-orange-500 select-none mt-1 shrink-0 text-xs">●</span>
                    <span className="leading-relaxed text-xs">
                      {parseInlineElements(listText, `${msgKey}-ul-${lineIdx}`)}
                    </span>
                  </li>
                </ul>
              );
            }

            // Numbered Lists
            const numMatch = cleanLine.match(/^(\d+)\.\s(.*)/);
            if (numMatch) {
              const num = numMatch[1];
              const listText = numMatch[2];
              return (
                <ol key={`${msgKey}-ol-${lineIdx}`} className="list-none pl-1 space-y-1 my-1">
                  <li className="flex items-start gap-2 text-slate-300">
                    <span className="text-orange-400 font-bold select-none text-[11px] mt-0.5 shrink-0">{num}.</span>
                    <span className="leading-relaxed text-xs">
                      {parseInlineElements(listText, `${msgKey}-ol-${lineIdx}-n${num}`)}
                    </span>
                  </li>
                </ol>
              );
            }

            // Default Text Paragraph
            return (
              <p key={`${msgKey}-p-${lineIdx}`} className="leading-relaxed text-slate-300 text-xs">
                {parseInlineElements(cleanLine, `${msgKey}-p-${lineIdx}`)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  const parseInlineElements = (text: string, keyPrefix: string): React.ReactNode[] => {
    const step1 = text.split(/(\*\*.*?\*\*)/g);
    
    return step1.flatMap((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const rawContent = part.substring(2, part.length - 2);
        return [
          <strong key={`${keyPrefix}-bold-${idx}`} className="font-extrabold text-slate-100">
            {enrichHighlights(rawContent, `${keyPrefix}-bold-${idx}`)}
          </strong>
        ];
      }
      return enrichHighlights(part, `${keyPrefix}-t-${idx}`);
    });
  };

  const enrichHighlights = (text: string, keyPrefix: string): React.ReactNode[] => {
    const signatures = [
      "ปังปุริเย่!",
      "คันนี้มีคนทักแน่ครับ 🔥",
      "รถสวยจน AI ใจสั่น 😆",
      "น้องเอ"
    ];

    let result: React.ReactNode[] = [text];

    signatures.forEach((sig, sigIdx) => {
      result = result.flatMap((node, nodeIdx) => {
        if (typeof node !== "string") return [node];

        const escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const parts = node.split(new RegExp(`(${escapeRegex(sig)})`, "g"));

        return parts.map((part, pIdx) => {
          const spanKey = `${keyPrefix}-sig-${sigIdx}-${nodeIdx}-${pIdx}`;
          if (part === sig) {
            if (sig === "ปังปุริเย่!") {
              return (
                <span key={spanKey} className="inline-block bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-lg font-bold border border-orange-500/30 text-[11px]">
                  {sig}
                </span>
              );
            }
            if (sig === "คันนี้มีคนทักแน่ครับ 🔥") {
              return (
                <span key={spanKey} className="inline-block bg-orange-650/30 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/40 font-bold animate-pulse text-[11px]">
                  {sig}
                </span>
              );
            }
            if (sig === "รถสวยจน AI ใจสั่น 😆") {
              return (
                <span key={spanKey} className="inline-block bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-lg border border-pink-500/30 font-bold text-[11px]">
                  {sig}
                </span>
              );
            }
            return (
              <span key={spanKey} className="text-orange-400 font-bold">
                {sig}
              </span>
            );
          }
          return <span key={spanKey}>{part}</span>;
        });
      });
    });

    result = result.flatMap((node, nodeIdx) => {
      if (typeof node !== "string") return [node];

      const parts = node.split(/(`.*?`)/g);
      return parts.map((part, pIdx) => {
        const inlineKey = `${keyPrefix}-ic-${nodeIdx}-${pIdx}`;
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={inlineKey} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-orange-400 text-[10px] font-mono mx-0.5">
              {part.substring(1, part.length - 1)}
            </code>
          );
        }
        return <span key={inlineKey}>{part}</span>;
      });
    });

    return result;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group/msg flex w-full gap-3 py-3 relative border-b border-slate-900/40 last:border-0 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
      id={`chat-msg-${message.id}`}
    >
      {/* Avatar block */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300 group-hover/msg:scale-105 ${
          isUser
            ? "bg-slate-800 border border-slate-700 text-slate-300"
            : "bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-orange-500/10"
        }`}
        id={`avatar-${message.id}`}
      >
        {isUser ? (
          <User className="w-4.5 h-4.5" />
        ) : (
          <Sparkles className="w-4.5 h-4.5 animate-pulse" />
        )}
      </div>

      {/* Bubble + Toolbar Wrapper */}
      <div className="flex flex-col max-w-[82vw] md:max-w-[74%] gap-1 relative items-start">
        
        {/* Editing Workspace or Standard Bubble */}
        {isEditing ? (
          <div className="w-full bg-slate-900/90 border border-orange-500/30 p-3 rounded-2xl shadow-xl flex flex-col gap-2 min-w-[280px] md:min-w-[450px]">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500/60 font-sans resize-y min-h-[120px] leading-relaxed"
              placeholder="ปรับปรุงข้อความหรือแก้ไขคำตอบของคุณ..."
            />
            <div className="flex items-center justify-end gap-2 text-[10px]">
              <button
                onClick={cancelEditing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-slate-300 transition flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.6 h-3.6" />
                ยกเลิก
              </button>
              <button
                onClick={saveEditing}
                className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:opacity-90 rounded-lg text-white font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.6 h-3.6" />
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`px-4 py-3.5 rounded-2xl text-[12px] shadow-sm leading-relaxed relative overflow-hidden transition-all duration-300 ${
              isUser
                ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-tr-xs"
                : "bg-slate-900/60 backdrop-blur-md border border-slate-800 text-slate-200 rounded-tl-xs hover:bg-slate-900/80 hover:border-slate-700/60"
            }`}
            id={`content-bubble-${message.id}`}
          >
            {isUser ? (
              <>
                {message.text &&
                  message.text !== "(แนบไฟล์)" &&
                  message.text !== "(แนบรูป)" && (
                  <p className="whitespace-pre-wrap leading-relaxed select-text font-medium text-slate-100">
                    {message.text}
                  </p>
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <ChatMessageAttachments
                    attachments={message.attachments}
                    isUser
                  />
                )}
              </>
            ) : (
              <>
                <div className="space-y-1.5 selection:bg-orange-500/30 break-words">
                  {parseMarkdown(message.text)}
                </div>
                {message.attachments && message.attachments.length > 0 && (
                  <ChatMessageAttachments attachments={message.attachments} />
                )}
              </>
            )}

            {!isUser && message.carCards && message.carCards.length > 0 && (
              <div
                className="mt-3 flex flex-wrap gap-3"
                data-testid="chat-car-cards-row"
              >
                {Array.from(new Map(message.carCards.map(c => [c.id, c])).values()).map((car) => (
                  <div key={car.id} className="contents">
                    <ChatCarCard car={car} />
                  </div>
                ))}
              </div>
            )}

            {message.hasMoreCars && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSessionId) {
                      void sendMessage("ดูเพิ่ม");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  ดูเพิ่มอีก 3 คัน
                </button>
              </div>
            )}

            {message.savedMemberListingId && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("my-listings")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  ดูในประกาศของฉัน
                </button>
              </div>
            )}

            {message.savedDraftId && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigateToSavedDealerDraft(message.savedDraftId!, setView)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  ดูประกาศที่บันทึกไว้
                </button>
                {showDraftIdDebug && (
                  <p className="text-[9px] text-slate-600 font-mono">
                    รหัสฉบับร่าง: {message.savedDraftId}
                  </p>
                )}
              </div>
            )}

            {message.isPendingListingCard && message.pendingListingCard && (
              <ChatPendingListingCard
                card={message.pendingListingCard}
                attachments={message.attachments}
                messageId={message.id}
                onEdit={() => {
                  if (activeSessionId) {
                    void sendMessage("แก้ไขข้อมูล");
                  }
                }}
                onConfirmSave={() => {
                  if (activeSessionId) {
                    void sendMessage(CHAT_MEMBER_CONFIRM_SAVE_LISTING_ACTION);
                  }
                }}
                onNotNow={() => {
                  if (activeSessionId) {
                    void sendMessage(CHAT_MEMBER_NOT_NOW_LISTING_ACTION);
                  }
                }}
              />
            )}

            {message.isDraftPreview && !message.isPendingListingCard && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSessionId) {
                      void sendMessage(CHAT_CONFIRM_CREATE_DRAFT_ACTION);
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  ยืนยันสร้างประกาศ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSessionId) {
                      void sendMessage("แก้ไขข้อมูล");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  แก้ไขข้อมูล
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSessionId) {
                      void sendMessage("เพิ่มรูปภาพ");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  เพิ่มรูปภาพ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSessionId) {
                      void sendMessage("เริ่มใหม่");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  เริ่มใหม่
                </button>
              </div>
            )}

            {/* Glowing active speak state indicator bar */}
            {speaking && (
              <div className="absolute left-0 bottom-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 animate-pulse" />
            )}
          </div>
        )}

        {/* Info label & Interactive Toolbar Row */}
        <div className="flex items-center gap-3 w-full px-1 justify-between select-none">
          
          {/* Timestamp or Starred badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500">
              {formattedTime()}
            </span>
            {isLiked && (
              <span className="text-[8px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5 scale-95">
                <Heart className="w-2 h-2 fill-current" />
                พินไว้แล้ว
              </span>
            )}
            {speaking && (
              <span className="text-[8px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-0.5 scale-95">
                <Volume2 className="w-2.5 h-2.5" />
                กำลังพูด...
              </span>
            )}
          </div>

          {/* Premium Glassmorphic Floating Toolbar */}
          {!isEditing && message.id !== "streaming-chunk-node" && (
            <motion.div 
              className="flex items-center gap-1 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 p-0.5 rounded-lg shadow-lg opacity-85 transition-all md:opacity-0 md:group-hover/msg:opacity-100 md:translate-y-1 md:group-hover/msg:translate-y-0"
              id={`toolbar-${message.id}`}
            >
              {/* Speech synthesis controller */}
              <button
                onClick={() => toggleSpeak(message.text, message.id)}
                className={`p-1 rounded transition cursor-pointer ${
                  speaking 
                    ? "text-sky-400 hover:bg-sky-500/10" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title={speaking ? "หยุดบรรยาย" : "ฟังเสียงสังเคราะห์บารมีน้องเอ 🔊"}
              >
                {speaking ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Copy control */}
              <button
                onClick={() => copyToClipboard(message.text, `msg-copy-${message.id}`)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                title="คัดลอกข้อความ 📋"
              >
                {copiedId === `msg-copy-${message.id}` ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Save message to favorites star */}
              <button
                onClick={() => toggleFavorite(message.id)}
                className={`p-1 rounded transition cursor-pointer ${
                  isLiked 
                    ? "text-rose-500 hover:bg-rose-500/10" 
                    : "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                }`}
                title={isLiked ? "เลิกพินข้อความ" : "พินเก็บไว้เป็นเซสชันโปรด ❤️"}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
              </button>

              {/* Inline edit controller */}
              <button
                onClick={() => startEditing(message.text)}
                className="p-1 rounded text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition cursor-pointer"
                title="แก้ไขข้อความแบบ inline ✏️"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

        </div>

      </div>

    </motion.div>
  );
}
