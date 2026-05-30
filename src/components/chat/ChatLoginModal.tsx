import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { LoginFormPanel } from "../auth/LoginFormPanel";
import { useAppStore } from "../../store";
import {
  consumeChatLoginReturnView,
  setChatLoginReturnView,
} from "../../utils/chatLoginReturn";

type ChatLoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ChatLoginModal({ open, onClose }: ChatLoginModalProps) {
  const setView = useAppStore((s) => s.setView);

  useEffect(() => {
    if (!open) return;
    setChatLoginReturnView("chat");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleLoginSuccess = () => {
    consumeChatLoginReturnView();
    onClose();
  };

  const leaveChatFor = (view: "forgot-password" | "register") => {
    setChatLoginReturnView("chat");
    onClose();
    setView(view);
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
          id="chat-login-modal-root"
          role="presentation"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm pointer-events-auto"
            aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md max-h-[min(88dvh,640px)] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl pointer-events-auto mx-0 sm:mx-4"
            id="chat-login-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-login-modal-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
              <div>
                <h2
                  id="chat-login-modal-title"
                  className="text-sm font-bold text-slate-100"
                >
                  เข้าสู่ระบบ
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  ยังอยู่หน้าแชท — กลับมาต่อบทสนทนาได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="ปิด"
                id="chat-login-modal-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <LoginFormPanel
                compact
                onLoginSuccess={handleLoginSuccess}
                onForgotPassword={() => leaveChatFor("forgot-password")}
                onRegister={() => leaveChatFor("register")}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
