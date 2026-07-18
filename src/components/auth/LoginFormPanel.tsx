import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { isPublicSignupEnabled } from "../../services/auth/authService";
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
  /**
   * Host card tone.
   * - "dark": legacy fixed dark styling (chat login modal on slate-950 stays as-is)
   * - "surface": follows canonical nonga theme tokens (slate surface, light/dark aware)
   */
  tone?: "dark" | "surface";
};

export function LoginFormPanel({
  onLoginSuccess,
  onForgotPassword,
  onRegister,
  compact = false,
  tone = "dark",
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
  const signupEnabled = isPublicSignupEnabled();

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

  const isSurfaceTone = tone === "surface";

  const inputClass = isSurfaceTone
    ? "w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--nonga-border-strong)] bg-[var(--nonga-bg-subtle)] text-[var(--nonga-text-primary)] placeholder-[var(--nonga-text-placeholder)] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
    : "w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border bg-slate-500/[0.03] border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors";

  const labelToneClass = isSurfaceTone
    ? "text-[var(--nonga-text-muted)]"
    : "text-slate-400";
  const inputIconToneClass = isSurfaceTone
    ? "text-[var(--nonga-text-muted)]"
    : "text-slate-500";
  const eyeToggleToneClass = isSurfaceTone
    ? "text-[var(--nonga-text-muted)] hover:text-orange-600 dark:hover:text-orange-400"
    : "text-slate-500 hover:text-orange-400";
  const forgotLinkToneClass = isSurfaceTone
    ? "text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
    : "text-orange-400 hover:text-orange-300";
  const dividerLineToneClass = isSurfaceTone
    ? "bg-[var(--nonga-border)]"
    : "bg-slate-800";
  const dividerLabelToneClass = isSurfaceTone
    ? "text-[var(--nonga-text-muted)] bg-[var(--nonga-bg-surface)]"
    : "text-slate-500 bg-slate-950";
  const socialButtonToneClass = isSurfaceTone
    ? "border-[var(--nonga-border-strong)] bg-[var(--nonga-bg-subtle)] hover:border-orange-500/40 text-[var(--nonga-text-secondary)]"
    : "border-slate-700 bg-slate-900/50 hover:border-orange-500/30 text-slate-300";
  const footerTextToneClass = isSurfaceTone
    ? "text-[var(--nonga-text-muted)]"
    : "text-slate-500";
  const registerLinkToneClass = isSurfaceTone
    ? "text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
    : "text-orange-400 hover:text-orange-300";
  const errorTextToneClass = isSurfaceTone
    ? "text-red-700 dark:text-red-400"
    : "text-red-400";
  const successTextToneClass = isSurfaceTone
    ? "text-green-700 dark:text-green-400"
    : "text-green-400";

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {displayError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs ${errorTextToneClass} flex items-start gap-2 text-left`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </motion.div>
      )}

      {successToast && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl border border-green-500/20 bg-green-500/5 text-xs ${successTextToneClass} flex items-start gap-2 text-left`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successToast}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
        <div className="space-y-1">
          <label className={`text-[10px] font-bold ${labelToneClass} uppercase tracking-wider`}>
            อีเมล
          </label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${inputIconToneClass} pointer-events-none`} />
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
            <label className={`text-[10px] font-bold ${labelToneClass} uppercase tracking-wider`}>
              รหัสผ่าน
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className={`text-[10px] font-semibold ${forgotLinkToneClass}`}
              >
                ลืมรหัสผ่าน?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${inputIconToneClass} pointer-events-none`} />
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
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${eyeToggleToneClass}`}
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
        <span className={`absolute inset-x-0 h-px ${dividerLineToneClass}`} />
        <span className={`relative px-2 text-[10px] ${dividerLabelToneClass} uppercase`}>
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
            className={`py-2 rounded-lg border ${socialButtonToneClass} text-[10px] font-semibold disabled:opacity-50`}
          >
            {provider === "google" ? "Google" : provider === "facebook" ? "FB" : "LINE"}
          </button>
        ))}
      </div>

      {onRegister && (
        <p className={`text-center text-[11px] ${footerTextToneClass}`}>
          {signupEnabled ? (
            <>
              ยังไม่มีบัญชี?{" "}
              <button
                type="button"
                onClick={onRegister}
                className={`font-semibold ${registerLinkToneClass}`}
              >
                สร้างบัญชี
              </button>
            </>
          ) : (
            "รอบนี้ยังเปิดให้เฉพาะผู้ที่ได้รับเชิญเท่านั้นครับ — ใช้บัญชีที่ทีมงานส่งให้"
          )}
        </p>
      )}
    </div>
  );
}
