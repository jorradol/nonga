import React, { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { useAppStore } from "../../store";
import {
  consumeChatLoginReturnView,
  peekChatLoginReturnView,
} from "../../utils/chatLoginReturn";
import {
  hasPendingChatDraftSnapshotInStorage,
  isPendingSnapshotReadFailure,
  readPendingChatDraftSnapshot,
} from "../../utils/chatPendingDraftSnapshot";
import { chatRestoreLog } from "../../utils/chatRestoreDebug";
import { motion } from "motion/react";
import { 
  Mail, Lock, Eye, EyeOff, Bot, Sparkles, 
  ArrowRight, KeyRound, CornerDownLeft, AlertCircle, 
  CheckCircle2
} from "lucide-react";
import { AnimatedCard } from "../LayoutSystem";

export default function LoginView() {
  const { loginWithEmail, loginWithGoogle, loginWithFacebook, loginWithLINE, error: authError } = useAuth();
  const setView = useAppStore((state) => state.setView);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Interaction states
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Email check helper
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessToast(null);

    // Form validations
    if (!email) {
      setLocalError("กรุณากรอกที่อยู่อีเมลของคุณพี่ด้วยครับ ✉️");
      return;
    }
    if (!isValidEmail(email)) {
      setLocalError("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบสัญลักษณ์ @ และ .com ครับ");
      return;
    }
    if (!password) {
      setLocalError("กรุณากรอกรหัสผ่านเพื่อความปลอดภัยครับ 🔒");
      return;
    }
    if (password.length < 6) {
      setLocalError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรขึ้นไปเพื่อความแข็งแกร่งสูงสุด");
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
      const pendingRead = readPendingChatDraftSnapshot();
      chatRestoreLog("LoginView: email login success", {
        returnViewPeek: peekChatLoginReturnView(),
        pendingInStorage: hasPendingChatDraftSnapshotInStorage(),
        pendingReadOk: pendingRead.ok,
        pendingReadReason: isPendingSnapshotReadFailure(pendingRead)
          ? pendingRead.reason
          : undefined,
        snapshotId: pendingRead.ok ? pendingRead.snapshot.publicRefCode : undefined,
      });
      // Success toast trigger
      setSuccessToast("เข้าสู่ระบบเรียบร้อยแล้วครับน้องบอต! กำลังพากลับไปต่องานที่ค้างไว้ ✨🎉");
      setTimeout(() => {
        const nextView = consumeChatLoginReturnView() ?? "home";
        chatRestoreLog("LoginView: navigate after email login", { nextView });
        setView(nextView);
      }, 1500);
    } catch (err: any) {
      setLocalError(err.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ผู้ใช้");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook" | "line") => {
    setLocalError(null);
    setSuccessToast(null);
    setLoading(true);

    try {
      if (provider === "google") {
        await loginWithGoogle();
      } else if (provider === "facebook") {
        await loginWithFacebook();
      } else {
        await loginWithLINE();
      }
      const pendingRead = readPendingChatDraftSnapshot();
      chatRestoreLog("LoginView: social login success", {
        provider,
        returnViewPeek: peekChatLoginReturnView(),
        pendingInStorage: hasPendingChatDraftSnapshotInStorage(),
        pendingReadOk: pendingRead.ok,
      });
      setSuccessToast(`ยินดีต้อนรับ! เข้าสู่ระบบเสร็จสิ้นผ่านบริการ ${provider.toUpperCase()} ปังปุริเย่!`);
      setTimeout(() => {
        const nextView = consumeChatLoginReturnView() ?? "home";
        chatRestoreLog("LoginView: navigate after social login", { nextView, provider });
        setView(nextView);
      }, 1500);
    } catch (err: any) {
      setLocalError(err.message || "การเข้าสู่ระบบผ่านผู้ให้บริการภายนอกล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4 sm:px-6 relative z-10 font-sans">
      
      {/* Light glow effects */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-red-500/10 blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        
        {/* Header segment */}
        <div className="text-center space-y-3.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-transform duration-300">
            A
          </div>
          <div className="space-y-1">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white leading-tight">
              เข้าสู่ระบบเพื่อใช้งาน <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Nong A</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              พรีเมียม AI ตลาดรถยนต์อัจฉริยะโดย NongBot Group
            </p>
          </div>
        </div>

        {/* Form Container */}
        <AnimatedCard hoverGlow={false} className="border-orange-500/10 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
          
          {/* Toast / Alert Status UI Box */}
          {localError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-500 flex items-start gap-2.5 text-left"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
              <span>{localError}</span>
            </motion.div>
          )}

          {successToast && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl border border-green-500/20 bg-green-500/5 text-xs text-green-500 flex items-start gap-2.5 text-left"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
              <span>{successToast}</span>
            </motion.div>
          )}

          {/* Actual Email Input Fields Form */}
          <form onSubmit={handleSubmit} className="space-y-4.5 text-left">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                อีเมลผู้ใช้ (Email-Address)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-xl border bg-slate-500/[0.03] border-slate-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                  รหัสผ่าน (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setView("forgot-password")}
                  className="text-[11px] font-semibold text-orange-500 hover:text-orange-600 focus:outline-none transition-colors"
                >
                  ลืมรหัสผ่าน? 🔑
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  disabled={loading}
                  className="w-full pl-11 pr-11 py-3 text-xs sm:text-sm rounded-xl border bg-slate-500/[0.03] border-slate-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-orange-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Custom Orange Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>เข้าสู่ระบบด่วน</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social login integration dividers */}
          <div className="relative flex items-center justify-center">
            <span className="absolute inset-x-0 h-px bg-slate-200 dark:bg-white/[0.06]"></span>
            <span className="relative px-3.5 text-[10px] sm:text-xs font-mono bg-[#0c0c0e] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              หรือเข้าสู่ระบบผ่านช่องทางอื่น
            </span>
          </div>

          {/* Dynamic Social Login Options Row */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialLogin("google")}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-500/[0.02] hover:bg-slate-500/10 hover:border-orange-500/20 active:scale-95 transition flex items-center justify-center gap-1.5 focus:outline-none"
              title="Google Login"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.16.57 4.33 1.69l3.23-3.23C17.58 1.6 14.97 1 12 1 7.35 1 3.4 3.65 1.57 7.5l3.86 3C6.35 7.42 8.94 5.04 12 5.04z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.61-.21-2.37H12v4.51h6.46C17.7 16.5 15.3 19 12 19c-3.1 0-5.73-2.38-6.66-5.46L1.47 16.5A11.96 11.96 0 0 0 12 23c6.03 0 11.1-2 14.82-5.42l-3.33-3.31z"/>
                <path fill="#FBBC05" d="M5.34 13.54a7.17 7.17 0 0 1 0-3.08l-3.86-3a11.97 11.97 0 0 0 0 9.08l3.86-3z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.96-1.07 7.96-2.92l-3.33-3.31c-1.28.86-2.92 1.37-4.63 1.37-3.06 0-5.65-2.38-6.58-5.46L1.47 16.5A11.96 11.96 0 0 0 12 23z"/>
              </svg>
              <span className="text-[10px] md:text-xs font-bold text-gray-800 dark:text-slate-350">Google</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialLogin("facebook")}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-500/[0.02] hover:bg-[#3b5998]/10 hover:border-[#3b5998]/40 active:scale-95 transition flex items-center justify-center gap-1.5 focus:outline-none"
              title="Facebook Login"
            >
              <svg className="w-4 h-4 fill-[#3b5998]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-[10px] md:text-xs font-bold text-[#3b5998]">Facebook</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialLogin("line")}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-500/[0.02] hover:bg-[#06C755]/10 hover:border-[#06C755]/40 active:scale-95 transition flex items-center justify-center gap-1.5 focus:outline-none"
              title="LINE Login"
            >
              <div className="w-4 h-4 rounded-full bg-[#06C755] flex items-center justify-center text-white text-[7.5px] font-black tracking-tighter">LN</div>
              <span className="text-[10px] md:text-xs font-bold text-[#06C755]">LINE</span>
            </button>
          </div>

        </AnimatedCard>

        {/* Footer redirection helper */}
        <div className="flex items-center justify-between px-3 text-xs text-slate-500">
          <span>ยังไม่มีบัญชีกับน้องเอ?</span>
          <button
            onClick={() => setView("register")}
            className="font-bold text-orange-500 hover:text-orange-600 transition flex items-center gap-0.5 focus:outline-none"
          >
            <span>สร้างบัญชีฟรีทันที</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
