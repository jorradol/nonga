import React, { useState } from "react";
import { X, Copy, Mail, Landmark, MessageSquareShare, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrls: {
    copy: string;
    facebook: string;
    twitter: string;
    line: string;
  };
  isDarkMode?: boolean;
}

export default function ShareModal({ isOpen, onClose, shareUrls, isDarkMode = true }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrls.copy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-sm rounded-3xl border p-6 text-center shadow-2xl z-10 ${
            isDarkMode 
              ? "bg-slate-900 border-white/[0.08] text-white" 
              : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition"
            aria-label="ปิดเมนูแชร์"
          >
            <X className="w-4 h-4" />
          </button>

          <span className="text-[10px] bg-orange-600/10 text-orange-500 font-bold px-2.5 py-1 rounded-lg inline-block uppercase tracking-widest mb-2.5">
            Share Link
          </span>
          <h4 className="font-display font-black text-base text-white">แชร์รายละเอียดคันนี้</h4>
          <p className="text-xs text-slate-400 leading-normal mt-1 max-w-[250px] mx-auto">
            ส่งข้อมูลรถยนต์คัดเกรดพิเศษคันนี้ให้กับครอบครัว เพื่อนฝูง หรือผู้ร่วมตัดสินใจของคุณ
          </p>

          {/* Social icons grid stack */}
          <div className="grid grid-cols-3 gap-3.5 my-6">
            <a
              href={shareUrls.facebook}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/10 transition-all font-semibold uppercase text-[10px]"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black">f</div>
              <span>Facebook</span>
            </a>

            <a
              href={shareUrls.line}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/10 transition-all font-semibold uppercase text-[10px]"
            >
              <MessageSquareShare className="w-5 h-5 text-emerald-500" />
              <span>LINE Chat</span>
            </a>

            <a
              href={shareUrls.twitter}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/10 transition-all font-semibold uppercase text-[10px]"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-black">𝕏</div>
              <span>Twitter</span>
            </a>
          </div>

          {/* Direct Copy Bar input */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-bold text-left block">ลิงก์คาร์โดยย่อสำหรับคัดลอก:</span>
            <div className="flex rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60 p-1.5 items-center justify-between">
              <span className="text-[10.5px] text-slate-400 truncate text-left pl-2.5 max-w-[210px] font-mono">
                {shareUrls.copy}
              </span>
              <button
                onClick={handleCopyLink}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  copied 
                    ? "bg-emerald-600 text-white" 
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                }`}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "คัดลอกแล้ว!" : "คัดลอกลิงก์"}</span>
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
