import React, { useState } from "react";
import { MessageSquare, Send, HelpCircle, Loader2 } from "lucide-react";
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
    <div className="p-6 sm:p-8 rounded-3xl border nonga-bg-surface nonga-border nonga-text-primary shadow-2xl space-y-6 text-left">

      {/* Header section with count */}
      <div className="flex items-center justify-between border-b border-orange-500/20 pb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-[var(--nonga-action-primary)]" />
          <h3 className="font-display font-black text-base nonga-text-primary">กระดานสนทนาและซักถาม ({comments.length})</h3>
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
            className="w-full min-h-[90px] p-4 rounded-2xl text-xs sm:text-sm resize-none focus:outline-none transition-all border nonga-bg-subtle nonga-border nonga-text-primary nonga-placeholder nonga-focus-ring focus:border-orange-500"
            maxLength={300}
          />
          <span className="absolute bottom-3 right-3 font-mono text-[9px] nonga-text-muted">
            {newCommentText.length}/300 ตัวอักษร
          </span>
        </div>

        <div className="flex justify-between items-center">
          {successMsg ? (
            <span className="text-[11px] font-bold text-[var(--nonga-success)] select-none">
              {successMsg}
            </span>
          ) : (
            <span className="text-[9.5px] nonga-text-muted">
              * ความเห็นของคุณจะแสดงแบบสาธารณะในหมวดคำชี้แจงรถยนต์
            </span>
          )}

          <button
            type="submit"
            disabled={isPosting || !newCommentText.trim() || !user}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer nonga-focus-ring ${
              !user 
                ? "nonga-bg-subtle nonga-text-muted border nonga-border cursor-not-allowed" 
                : "nonga-action shadow-lg shadow-orange-650/15"
            }`}
          >
            {isPosting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{user ? "ส่งความคิดเห็น" : "โปรดเข้าสู่ระบบเพื่อคอมเมนต์"}</span>
          </button>
        </div>
      </form>

      {/* Discussion List */}
      <div className="space-y-4 pt-2">
        {comments.length === 0 ? (
          <div className="py-8 text-center nonga-text-muted border border-dashed nonga-border rounded-2xl nonga-bg-subtle">
            <HelpCircle className="w-8 h-8 nonga-text-muted mx-auto mb-2 animate-bounce" />
            <p className="text-xs font-medium nonga-text-secondary">ยังไม่มีผู้สอบถามประเด็นใดๆ ของคันนี้</p>
            <p className="text-[10px] nonga-text-muted mt-0.5">พิมพ์พูดคุย สอบถามประเด็นแรกของคันนี้ได้เลยคร้าบ!</p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
            {comments.map((comm) => (
              <div 
                key={comm.id} 
                className="p-4 rounded-2xl border nonga-bg-subtle nonga-border hover:border-orange-500/20 transition-all space-y-2 text-left"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={comm.userPhotoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${comm.id}`}
                      alt={comm.userDisplayName}
                      className="w-7 nonga-bg-elevated h-7 rounded-full border nonga-border"
                      referrerPolicy="no-referrer"
                    />
                    <div className="leading-none text-left">
                      <span className="text-xs font-bold nonga-text-primary block">
                        {comm.userDisplayName}
                      </span>
                      <span className="text-[9px] text-[var(--nonga-action-primary)] font-mono mt-0.5 block">Verified Client Buyer</span>
                    </div>
                  </div>
                  
                  <span className="font-mono text-[9px] nonga-text-muted">
                    {formatDate(comm.createdAt)}
                  </span>
                </div>

                <p className="text-xs nonga-text-secondary leading-relaxed pl-9 whitespace-pre-wrap">
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
