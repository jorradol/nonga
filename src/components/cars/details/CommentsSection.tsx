import React, { useState } from "react";
import { MessageSquare, Send, Calendar, Star, HelpCircle, Loader2 } from "lucide-react";
import { useAppStore } from "../../../store";
import { CarComment } from "../../../types";

interface CommentsSectionProps {
  comments: CarComment[];
  isPosting: boolean;
  onAddComment: (text: string) => Promise<any>;
  isDarkMode?: boolean;
}

export default function CommentsSection({
  comments,
  isPosting,
  onAddComment,
  isDarkMode = true,
}: CommentsSectionProps) {
  const { user } = useAppStore();
  const [newCommentText, setNewCommentText] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      await onAddComment(newCommentText);
      setNewCommentText("");
      setSuccessMsg("โพสต์ความเห็นเรียบร้อยแล้วคร้าบ! 🎉");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) + " น.";
    } catch {
      return "เมื่อสักครู่";
    }
  };

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border ${
      isDarkMode 
        ? "bg-slate-900/40 border-white/[0.06] text-white" 
        : "bg-white border-slate-250 text-slate-800"
    } shadow-2xl space-y-6 text-left`}>

      {/* Header section with count */}
      <div className="flex items-center justify-between border-b border-orange-500/10 pb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-orange-500" />
          <h3 className="font-display font-black text-base">กระดานสนทนาและซักถาม ({comments.length})</h3>
        </div>
      </div>

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            disabled={isPosting}
            placeholder={
              user 
                ? "ถามสภาพรถยนต์ สอบถามส่วนลดพิเศษ หรือนัดหมายวันเวลาทดสอบขับรถที่นี่..." 
                : "กรุณาเข้าสู่ระบบเพื่อเขียนความเห็นซักถามสภาพเจ้าของรถ..."
            }
            className={`w-full min-h-[90px] p-4 rounded-2xl text-xs sm:text-sm resize-none focus:outline-none transition-all border ${
              isDarkMode 
                ? "bg-slate-950/60 border-slate-850 text-white placeholder-slate-500 focus:border-orange-500/50" 
                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500"
            }`}
            maxLength={300}
          />
          <span className="absolute bottom-3 right-3 font-mono text-[9px] text-slate-500">
            {newCommentText.length}/300 ตัวอักษร
          </span>
        </div>

        <div className="flex justify-between items-center">
          {successMsg ? (
            <span className="text-[11px] font-bold text-emerald-400 select-none">
              {successMsg}
            </span>
          ) : (
            <span className="text-[9.5px] text-slate-500">
              * ความเห็นของคุณจะแสดงแบบสาธารณะในหมวดคำชี้แจงรถยนต์
            </span>
          )}

          <button
            type="submit"
            disabled={isPosting || !newCommentText.trim() || !user}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              !user 
                ? "bg-slate-850 text-slate-650 cursor-not-allowed" 
                : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-650/15"
            }`}
          >
            {isPosting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
            <span>{user ? "ส่งความคิดเห็น" : "โปรดเข้าสู่ระบบเพื่อคอมเมนต์"}</span>
          </button>
        </div>
      </form>

      {/* Discussion List */}
      <div className="space-y-4 pt-2">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
            <p className="text-xs font-medium">ยังไม่มีผู้สอบถามประเด็นใดๆ ของคันนี้</p>
            <p className="text-[10px] text-slate-600 mt-0.5">พิมพ์พูดคุย สอบถามประเด็นแรกของคันนี้ได้เลยคร้าบ!</p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
            {comments.map((comm) => (
              <div 
                key={comm.id} 
                className={`p-4 rounded-2xl border ${
                  isDarkMode 
                    ? "bg-slate-950/30 border-white/[0.03] hover:border-orange-500/10" 
                    : "bg-slate-50 border-slate-200"
                } transition-all space-y-2 text-left`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={comm.userPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${comm.id}`}
                      alt={comm.userDisplayName}
                      className="w-7 bg-slate-800 h-7 rounded-full border border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <div className="leading-none text-left">
                      <span className="text-xs font-bold text-white block">
                        {comm.userDisplayName}
                      </span>
                      <span className="text-[9px] text-orange-500 font-mono mt-0.5 block">Verified Client Buyer</span>
                    </div>
                  </div>
                  
                  <span className="font-mono text-[9px] text-slate-500">
                    {formatDate(comm.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-9 whitespace-pre-wrap">
                  {comm.commentText}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
