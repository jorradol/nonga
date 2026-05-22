import React, { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { useAppStore } from "../../store";
import { motion } from "motion/react";
import { 
  Mail, ArrowLeft, KeyRound, AlertCircle, CheckCircle2
} from "lucide-react";
import { AnimatedCard } from "../LayoutSystem";

export default function ForgotPasswordView() {
  const { resetPassword } = useAuth();
  const setView = useAppStore((state) => state.setView);

  // States
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Email format verification
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessToast(null);

    if (!email) {
      setLocalError("กรุณากรอกที่อยู่อีเมลของคุณพี่เพื่อขอลิงก์เปลี่ยนรหัสผ่านครับ ✉️");
      return;
    }
    if (!isValidEmail(email)) {
      setLocalError("รูปแบบอีเมลไม่ถูกต้องรบกวนป้อนใหม่อีกคร้ังครับ");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessToast(
        "เรียบร้อยจ้า! น้องเอกระจายสาส์นรีเซ็ตไปที่อีเมลคุณพี่เรียบร้อยแล้ว อย่าลืมเข้าไปตรวจสอบในระบบกล่องขยะ (Junk/Spam Box) เผื่อตกหล่นนะครับ ✉️✨"
      );
    } catch (err: any) {
      setLocalError(err.message || "เกิดข้อขัดข้องในการรีเซ็ตรหัสผ่าน กรุณาลองใหม่อีกครั้งครับ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4 sm:px-6 relative z-10 font-sans">
      
      {/* Background soft lighting glows */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-orange-500/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        
        {/* Title segment */}
        <div className="text-center space-y-3.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-transform duration-300">
            A
          </div>
          <div className="space-y-1">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white leading-tight">
              ลืมรหัสผ่านใช่ไหมครับ? 🔑
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              ป้อนที่อยู่อีเมล แล้วน้องเอก็พร้อมจะส่งข้อมูลวิธีกู้คืนรหัสให้ทันที
            </p>
          </div>
        </div>

        {/* Floating recovery card */}
        <AnimatedCard hoverGlow={false} className="border-orange-500/10 backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-2xl text-left">
          
          {localError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-500 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 animate-pulse" />
              <span>{localError}</span>
            </motion.div>
          )}

          {successToast && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl border border-green-500/20 bg-green-500/5 text-xs text-green-500 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 animate-bounce" />
              <span>{successToast}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                ป้อนที่อยู่อีเมลที่ผูกบัญชี (Auth Email)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nongbot@example.com"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-xl border bg-slate-500/[0.03] border-slate-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Custom recovery orange button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-600/15 hover:shadow-orange-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-white" />
                  <span>ส่งลิงก์เปลี่ยนรหัสความปลอดภัย</span>
                </>
              )}
            </button>
          </form>

          {/* Action to retreat back */}
          <div className="pt-2 text-center">
            <button
              onClick={() => setView("login")}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-orange-500 focus:outline-none transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ย้อนกลับไปหน้าตรวจสอบสิทธิ์หลัก</span>
            </button>
          </div>

        </AnimatedCard>

      </div>
    </div>
  );
}
