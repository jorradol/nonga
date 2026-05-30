import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/auth/useAuth";
import { isPublicSignupEnabled } from "../../services/auth/authService";
import { motion } from "motion/react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export const PUBLIC_SIGNUP_CLOSED_MESSAGE =
  "ตอนนี้ยังไม่เปิดสมัครสมาชิกทั่วไป กรุณาใช้บัญชีทดสอบหรือบัญชีที่ได้รับอนุญาต";

export type RegisterFormPanelProps = {
  onRegisterSuccess: () => void;
  onSwitchToLogin?: () => void;
  /** Tighter layout for chat sidebar modal */
  compact?: boolean;
};

export function RegisterFormPanel({
  onRegisterSuccess,
  onSwitchToLogin,
  compact = false,
}: RegisterFormPanelProps) {
  const { registerWithEmail, error: authError } = useAuth();
  const signupEnabled = isPublicSignupEnabled();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const displayError = localError || authError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessToast(null);

    if (!signupEnabled) {
      setLocalError(PUBLIC_SIGNUP_CLOSED_MESSAGE);
      return;
    }

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
      setSuccessToast("สร้างบัญชีเรียบร้อยแล้ว ยินดีต้อนรับครับ");
      onRegisterSuccess();
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดรุนแรงในการส่งรายงานลงทะเบียนสมาชิก"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border bg-slate-500/[0.03] border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors";

  const passwordGridClass = compact
    ? "grid grid-cols-1 gap-3.5"
    : "grid grid-cols-1 sm:grid-cols-2 gap-4";

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
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

      {!signupEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 flex items-start gap-2 text-left"
          id="register-signup-closed-notice"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{PUBLIC_SIGNUP_CLOSED_MESSAGE}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            ชื่อแสดง
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น พี่ออโต้"
              disabled={loading || !signupEnabled}
              className={inputClass}
              autoComplete="name"
            />
          </div>
        </div>

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
              disabled={loading || !signupEnabled}
              className={inputClass}
              autoComplete="email"
            />
          </div>
        </div>

        <div className={passwordGridClass}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                disabled={loading || !signupEnabled}
                className={`${inputClass} pr-10`}
                autoComplete="new-password"
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

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ยืนยันรหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                disabled={loading || !signupEnabled}
                className={`${inputClass} pr-10`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-400"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !signupEnabled}
          className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>{signupEnabled ? "สร้างบัญชี" : "ยังไม่เปิดสมัครสมาชิกสาธารณะ"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {onSwitchToLogin && (
        <p className="text-center text-[11px] text-slate-500">
          มีบัญชีอยู่แล้ว?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-orange-400 font-semibold hover:text-orange-300"
          >
            เข้าสู่ระบบ
          </button>
        </p>
      )}
    </div>
  );
}
