import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { motion } from "motion/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export type LoginFormPanelProps = {
  onLoginSuccess: () => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  /** Tighter layout for chat sidebar modal */
  compact?: boolean;
};

export function LoginFormPanel({
  onLoginSuccess,
  onForgotPassword,
  onRegister,
  compact = false,
}: LoginFormPanelProps) {
  const {
    loginWithEmail,
    loginWithGoogle,
    loginWithFacebook,
    loginWithLINE,
    error: authError,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const displayError = localError || authError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessToast(null);

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
      setLocalError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรขึ้นไป");
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password);
      setSuccessToast("เข้าสู่ระบบเรียบร้อยแล้วครับ");
      onLoginSuccess();
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ผู้ใช้"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook" | "line") => {
    setLocalError(null);
    setSuccessToast(null);
    setLoading(true);

    try {
      if (provider === "google") await loginWithGoogle();
      else if (provider === "facebook") await loginWithFacebook();
      else await loginWithLINE();
      setSuccessToast("เข้าสู่ระบบเรียบร้อยแล้วครับ");
      onLoginSuccess();
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "การเข้าสู่ระบบผ่านผู้ให้บริการภายนอกล้มเหลว"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border bg-slate-500/[0.03] border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors";

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {displayError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 flex items-start gap-2 text-left"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </motion.div>
      )}

      {successToast && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl border border-green-500/20 bg-green-500/5 text-xs text-green-400 flex items-start gap-2 text-left"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successToast}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            อีเมล
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={loading}
              className={inputClass}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              รหัสผ่าน
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-[10px] font-semibold text-orange-400 hover:text-orange-300"
              >
                ลืมรหัสผ่าน?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              disabled={loading}
              className={`${inputClass} pr-10`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-400"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>เข้าสู่ระบบ</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="relative flex items-center justify-center">
        <span className="absolute inset-x-0 h-px bg-slate-800" />
        <span className="relative px-2 text-[10px] text-slate-500 bg-slate-950 uppercase">
          หรือ
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["google", "facebook", "line"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            disabled={loading}
            onClick={() => void handleSocialLogin(provider)}
            className="py-2 rounded-lg border border-slate-700 bg-slate-900/50 hover:border-orange-500/30 text-[10px] font-semibold text-slate-300 disabled:opacity-50"
          >
            {provider === "google" ? "Google" : provider === "facebook" ? "FB" : "LINE"}
          </button>
        ))}
      </div>

      {onRegister && (
        <p className="text-center text-[11px] text-slate-500">
          ยังไม่มีบัญชี?{" "}
          <button
            type="button"
            onClick={onRegister}
            className="text-orange-400 font-semibold hover:text-orange-300"
          >
            สร้างบัญชี
          </button>
        </p>
      )}
    </div>
  );
}
