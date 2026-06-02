import { useState } from "react";
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
import { Sparkles, CheckCircle2 } from "lucide-react";
import { LoginFormPanel } from "./LoginFormPanel";
import { isPublicSignupEnabled } from "../../services/auth/authService";
import { navigatePilotPolicy } from "../../utils/pilotPolicyNavigation";

export default function LoginView() {
  const setView = useAppStore((state) => state.setView);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const signupEnabled = isPublicSignupEnabled();

  const finishPageLogin = () => {
    const pendingRead = readPendingChatDraftSnapshot();
    chatRestoreLog("LoginView: login success", {
      returnViewPeek: peekChatLoginReturnView(),
      pendingInStorage: hasPendingChatDraftSnapshotInStorage(),
      pendingReadOk: pendingRead.ok,
      pendingReadReason: isPendingSnapshotReadFailure(pendingRead)
        ? pendingRead.reason
        : undefined,
      snapshotId: pendingRead.ok ? pendingRead.snapshot.publicRefCode : undefined,
    });
    setSuccessToast(
      "เข้าสู่ระบบเรียบร้อยแล้วครับน้องบอต! กำลังพากลับไปต่องานที่ค้างไว้ ✨🎉"
    );
    setTimeout(() => {
      const nextView = consumeChatLoginReturnView() ?? "home";
      chatRestoreLog("LoginView: navigate after login", { nextView });
      setView(nextView);
    }, 1500);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4 sm:px-6 relative z-10 font-sans">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-red-500/10 blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-transform duration-300">
            A
          </div>
          <div className="space-y-1">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white leading-tight">
              เข้าสู่ระบบเพื่อใช้งาน{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                Nong A
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              พรีเมียม AI ตลาดรถยนต์อัจฉริยะโดย NongBot Group
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-500/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative bg-[#0c0c0e]/80">
          {successToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl border border-green-500/20 bg-green-500/5 text-xs text-green-500 flex items-start gap-2.5 text-left"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
              <span>{successToast}</span>
            </motion.div>
          )}

          <LoginFormPanel
            onLoginSuccess={finishPageLogin}
            onForgotPassword={() => setView("forgot-password")}
          />
        </div>

        <div className="flex items-center justify-between px-3 text-xs text-slate-500">
          {signupEnabled ? (
            <>
              <span>ยังไม่มีบัญชีกับน้องเอ?</span>
              <button
                onClick={() => setView("register")}
                className="font-bold text-orange-500 hover:text-orange-600 transition flex items-center gap-0.5 focus:outline-none"
              >
                <span>สร้างบัญชีฟรีทันที</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="w-full space-y-2 text-center">
              <p className="leading-relaxed">
                รอบทดลอง — เปิดให้เฉพาะผู้ที่ได้รับเชิญ ยังไม่เปิดสมัครทั่วไป กรุณาใช้บัญชีที่ทีมงานส่งให้
              </p>
              <button
                type="button"
                onClick={() => navigatePilotPolicy("terms", setView)}
                className="text-[11px] text-orange-500/90 hover:text-orange-600 underline-offset-2 hover:underline"
              >
                ดูนโยบายรอบทดลองเบื้องต้น (เงื่อนไข · ความเป็นส่วนตัว · ประกาศ)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
