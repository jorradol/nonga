import React, { useState } from "react";
import { 
  MessageSquare, Sparkles, Send, Volume2, Copy, Heart, 
  RefreshCw, Check, ArrowRight, User2, Ban, VolumeX 
} from "lucide-react";
import { useDealer } from "../../hooks/dealer/useDealer";

export function DealerChat() {
  const { 
    inquiries, 
    selectedInquiryId, 
    activeInquiry, 
    setSelectedInquiryId, 
    sendInquiryReply, 
    generateAISuggestedReply 
  } = useDealer();

  const [messageInput, setMessageInput] = useState<string>("");
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [favoritedSuggestions, setFavoritedSuggestions] = useState<string[]>([]);
  const [speakingTextId, setSpeakingTextId] = useState<string | null>(null);

  const handleSendDraftMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedInquiryId) return;
    sendInquiryReply(selectedInquiryId, messageInput);
    setMessageInput("");
  };

  const handleInjectAISuggestion = () => {
    if (activeInquiry?.aiSuggestedReply) {
      setMessageInput(activeInquiry.aiSuggestedReply);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2500);
  };

  const handleToggleFavoriteSuggestion = (textId: string) => {
    setFavoritedSuggestions(prev => 
      prev.includes(textId) ? prev.filter(t => t !== textId) : [...prev, textId]
    );
  };

  const handleSpeakText = (text: string, id: string) => {
    if (speakingTextId === id) {
      // Toggle off speech
      window.speechSynthesis.cancel();
      setSpeakingTextId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingTextId(id);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    
    utterance.onend = () => {
      setSpeakingTextId(null);
    };

    utterance.onerror = () => {
      setSpeakingTextId(null);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-950 flex flex-col md:flex-row h-[550px] overflow-hidden text-left selection:bg-orange-500/20">
      
      {/* List column - Left Panel */}
      <div className="w-full md:w-80 border-r border-slate-900 bg-slate-950 shrink-0 flex flex-col h-full">
        {/* Inbox header status */}
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
              กล่องข้อความความต้องการซื้อ
            </h3>
            <p className="text-[9.5px] text-slate-500 font-semibold uppercase leading-none">Inquiry Room Inbox</p>
          </div>
          <span className="text-[8.5px] bg-orange-600/10 text-orange-400 font-extrabold px-1.5 py-0.5 rounded border border-orange-500/20">
            {inquiries.filter(i => i.unread).length} ใหม่
          </span>
        </div>

        {/* List of chat sessions */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-900 text-left">
          {inquiries.map((inq) => {
            const isSelected = selectedInquiryId === inq.id;
            return (
              <button
                key={inq.id}
                onClick={() => setSelectedInquiryId(inq.id)}
                className={`w-full p-4 flex gap-3 text-left transition ${
                  isSelected 
                    ? "bg-gradient-to-r from-orange-600/15 to-transparent border-l-2 border-orange-500"
                    : "hover:bg-slate-900/10"
                }`}
              >
                <img 
                  src={inq.carImage} 
                  alt={inq.carTitle}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-lg object-cover bg-slate-900 shrink-0 border border-slate-800"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-200 truncate">{inq.customerName}</span>
                    {inq.unread && (
                      <span className="w-1.8 h-1.8 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-orange-400 capitalize truncate leading-tight">{inq.carTitle}</p>
                  <p className="text-[10px] text-slate-450 italic truncate leading-snug">"{inq.lastMessage}"</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Window column - Right Panel */}
      <div className="flex-1 flex flex-col justify-between h-full bg-slate-950/40 relative">
        {activeInquiry ? (
          <>
            {/* Thread Header information */}
            <div className="p-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-black text-[10.5px] text-white">
                  {activeInquiry.customerName.slice(0, 1)}
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-white">{activeInquiry.customerName}</h4>
                  <p className="text-[9.5px] text-slate-500 leading-none">กำลังออนไลน์เพื่อรอรถสเป็คตัวซิ่งของคุณ</p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                <span className="hidden sm:inline font-bold">ติดต่อเรื่อง:</span> <span className="font-extrabold text-orange-400">{activeInquiry.carTitle}</span>
              </div>
            </div>

            {/* Bubble logs body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-left">
              {activeInquiry.messages.map((m) => {
                const isCust = m.sender === "customer";
                return (
                  <div key={m.id} className={`flex ${isCust ? "justify-start" : "justify-end"}`}>
                    <div className="flex flex-col max-w-[80%] space-y-1">
                      {/* Name tag */}
                      <span className={`text-[9px] font-extrabold text-slate-500 block ${!isCust ? "text-right" : ""}`}>
                        {isCust ? "ลูกค้าผู้สอบถาม" : "พนักงานดูแลของคุณ (ดีลเลอร์)"}
                      </span>
                      
                      {/* Content bubble */}
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isCust 
                          ? "bg-slate-900 text-slate-200 rounded-tl-none border border-slate-850"
                          : "bg-orange-600 text-white rounded-tr-none text-left"
                      }`}>
                        {m.text}
                      </div>

                      {/* Tool bar inline with speech synth support */}
                      <div className={`flex items-center gap-2 text-[9px] text-slate-600 ${!isCust ? "justify-end" : ""}`}>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <button
                          onClick={() => handleSpeakText(m.text, m.id)}
                          className="hover:text-slate-300 transition shrink-0"
                          title="ฟังเสียงพากย์ AI"
                        >
                          {speakingTextId === m.id ? (
                            <VolumeX className="w-3 h-3 text-orange-500" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopyText(m.text, m.id)}
                          className="hover:text-slate-300 transition shrink-0"
                        >
                          {copiedTextId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Suggested Response Board Wrapper with Premium Glassmorphism Toolbar */}
            <div className="p-3 bg-slate-900/80 border-t border-slate-900 backdrop-blur space-y-2 text-left">
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-orange-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-orange-500" />
                  NongBot AI Suggested Sales Draft (บอทน้องเอช่วยร่างบทสเป็คทอง)
                </span>
                
                <button
                  onClick={() => generateAISuggestedReply(activeInquiry.id)}
                  disabled={activeInquiry.aiSuggestedReplyStatus === "generating"}
                  className="text-[9.5px] font-extrabold text-slate-400 hover:text-white transition flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${activeInquiry.aiSuggestedReplyStatus === "generating" ? "animate-spin" : ""}`} />
                  ร่างใหม่ด้วย AI
                </button>
              </div>

              {/* Suggested output placeholder bubble */}
              {activeInquiry.aiSuggestedReply && (
                <div className="p-3.5 rounded-xl border border-orange-550/15 bg-gradient-to-r from-orange-950/15 to-transparent flex flex-col sm:flex-row justify-between gap-3 text-xs leading-relaxed text-slate-300 animate-fade-in relative group/ai">
                  {/* Glassmorphism toolbar actions overlay */}
                  <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 opacity-0 group-hover/ai:opacity-100 transition duration-200">
                    <button
                      onClick={() => handleSpeakText(activeInquiry.aiSuggestedReply!, `ai-${activeInquiry.id}`)}
                      className="p-1 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-850 text-slate-400"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                    </button>
                    <button
                      onClick={() => handleToggleFavoriteSuggestion(`ai-${activeInquiry.id}`)}
                      className="p-1 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-850 text-slate-100"
                    >
                      <Heart className={`w-3.5 h-3.5 ${favoritedSuggestions.includes(`ai-${activeInquiry.id}`) ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} />
                    </button>
                    <button
                      onClick={() => handleCopyText(activeInquiry.aiSuggestedReply!, `ai-${activeInquiry.id}`)}
                      className="p-1 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-850 text-slate-400"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 text-left min-w-0 pr-12">
                    <p className="italic">"{activeInquiry.aiSuggestedReply}"</p>
                  </div>

                  <button
                    onClick={handleInjectAISuggestion}
                    className="self-end sm:self-center px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[10px] font-black tracking-wide shrink-0 transition flex items-center gap-1"
                  >
                    ส่งร่างทูอินพุท <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Standard Message Input Form box */}
              <form onSubmit={handleSendDraftMsg} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="พิมพ์ข้อความตอบกลับหาคุณลูกค้า หรือคลิกปุ่มซ่อนเพื่อส่งงานบอท..."
                  className="flex-1 bg-slate-950 border border-slate-850 focus:border-orange-550/50 p-2.8 rounded-xl text-xs text-slate-250 outline-none placeholder:text-slate-650"
                />
                <button
                  type="submit"
                  className="px-4.5 py-2.8 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>
          </>
        ) : (
          <div className="p-12 text-center h-full flex flex-col items-center justify-center space-y-2">
            <Ban className="w-8 h-8 text-slate-600 animate-pulse" />
            <p className="text-xs font-bold text-slate-400">คุณยังไม่ได้เลือกหัวข้อแชทลูกค้าครับ</p>
            <p className="text-[10px] text-slate-600">กรุณาจิ้มห้องผู้จองซ้ายมือเพื่อติดต่อประสานงานสดในฟีดครับ</p>
          </div>
        )}
      </div>

    </div>
  );
}
