import React, { useState } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { useAppStore } from "../../store";
import { motion } from "motion/react";
import { 
  User, Mail, Lock, Eye, EyeOff, Bot, Sparkles, 
  ArrowRight, KeyRound, AlertCircle, CheckCircle2
} from "lucide-react";
import { AnimatedCard } from "../LayoutSystem";

export default function RegisterView() {
  const { registerWithEmail, error: authError } = useAuth();
  const setView = useAppStore((state) => state.setView);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Interaction states
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Email validation check
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessToast(null);

    // Dynamic checks
    if (!name.trim()) {
      setLocalError("กรุณากรอกชื่อจริง หรือ ชื่อเล่นเพื่อระบุสายสนทนาครับ 👤");
      return;
    }
    if (!email) {
      setLocalError("กรุณากรอกที่อยู่อีเมลของคุณพี่ด้วยครับ ✉️");
      return;
    }
    if (!isValidEmail(email)) {
      setLocalError("ที่อยู่อีเมลไม่ถูกต้อง กรุณาเขียนฟอร์แมต email@domain.com ให้สมบูรณ์");
      return;
    }
    if (!password) {
      setLocalError("กรุณาระบุรหัสผ่านเพื่อติดตั้งระบบความปลอดภัย 🔒");
      return;
    }
    if (password.length < 6) {
      setLocalError("รหัสผ่านเพื่อความปลอดภัยสากลต้องมีความยาวอย่างน้อย 6 ตัวอักษรขึ้นไป");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("รหัสผ่าน และ รหัสผ่านยืนยันไม่ตรงกัน กรุณาตรวจสอบให้พ้องกันครับ");
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email, password, name.trim());
      setSuccessToast("ลงทะเบียนบัญชีใหม่สำเร็จแล้วจ้า! ยินดีต้อนรับสู่สังคมอัฉริอัจฉริยะ NongBot ชุมชนแห่งอนาคต 🥳🚗");
      setTimeout(() => {
        setView("home");
      }, 1500);
    } catch (err: any) {
      setLocalError(err.message || "เกิดข้อผิดพลาดรุนแรงในการส่งรายงานลงทะเบียนสมาชิก");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4 sm:px-6 relative z-10 font-sans">
      
      {/* Visual lighting background design */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        
        {/* Registration header */}
        <div className="text-center space-y-3.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-transform duration-300">
            A
          </div>
          <div className="space-y-1">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white leading-tight">
              ลงทะเบียนเข้าใช้งาน <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Nong A</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              สร้างประวัติการคุย เจาะลึกสภาพ ยื่นขายโพสต์ทันที ปังปุริเย่!
            </p>
          </div>
        </div>

        {/* Card envelope */}
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

          {/* Setup registration fields form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                ชื่อแสดงสเตตัส (Display Name)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <User className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น พี่ออโต้ แฟนคลับเว็ปตรัง"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-xl border bg-slate-500/[0.03] border-slate-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                อีเมลติดต่อปลอดภัย (Email Address)
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                  รหัสผ่านใหม่
                </label>
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

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest block">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    disabled={loading}
                    className="w-full pl-11 pr-11 py-3 text-xs sm:text-sm rounded-xl border bg-slate-500/[0.03] border-slate-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-orange-500 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Custom orange submit trigger button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-600/15 hover:shadow-orange-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>สร้างบัญชีสตรีมออโต้ฟรี</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </AnimatedCard>

        {/* Redirect segment */}
        <div className="flex items-center justify-between px-3 text-xs text-slate-500">
          <span>มีบัญชีผู้ใช้งานอยู่แล้วคุณพี่?</span>
          <button
            onClick={() => setView("login")}
            className="font-bold text-orange-500 hover:text-orange-600 transition flex items-center gap-0.5 focus:outline-none"
          >
            <span>ลงชื่อเข้าใช้งานได้เลย</span>
            <Bot className="w-4 h-4 text-orange-500" />
          </button>
        </div>

      </div>
    </div>
  );
}
