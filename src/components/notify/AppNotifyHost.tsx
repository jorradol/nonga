import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { useNotifyStore } from "../../stores/notifyStore";

const kindStyles = {
  success: {
    border: "border-green-500/40",
    bg: "bg-green-500/10",
    icon: CheckCircle2,
    iconCls: "text-green-400",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    icon: AlertTriangle,
    iconCls: "text-amber-400",
  },
  error: {
    border: "border-red-500/40",
    bg: "bg-red-500/10",
    icon: AlertCircle,
    iconCls: "text-red-400",
  },
  info: {
    border: "border-sky-500/40",
    bg: "bg-sky-500/10",
    icon: Info,
    iconCls: "text-sky-400",
  },
} as const;

export default function AppNotifyHost() {
  const { toasts, modal, dismissToast, closeModal } = useNotifyStore();
  const [showTech, setShowTech] = useState(false);

  const modalStyle = kindStyles[modal.kind];
  const ModalIcon = modalStyle.icon;

  return (
    <>
      {/* Toasts */}
      <div
        className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const s = kindStyles[t.kind];
            const Icon = s.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className={`pointer-events-auto rounded-xl border backdrop-blur-md shadow-xl p-3 ${s.border} ${s.bg} bg-slate-950/90`}
              >
                <div className="flex gap-2">
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.iconCls}`} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-white">{t.title}</p>
                    {t.message && (
                      <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-line">
                        {t.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(t.id)}
                    className="p-1 text-slate-500 hover:text-white shrink-0"
                    aria-label="ปิด"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Error / detail modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className={`w-full max-w-md rounded-2xl border ${modalStyle.border} bg-slate-950 text-white shadow-2xl overflow-hidden`}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/15">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <ModalIcon className={`w-4 h-4 ${modalStyle.iconCls}`} />
                      <h3 className="font-bold text-base">{modal.title}</h3>
                    </div>
                    <p className="text-sm text-slate-300 mt-2 whitespace-pre-line leading-relaxed">
                      {modal.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTech(false);
                      closeModal();
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {modal.technicalDetail && (
                  <div className="border-t border-slate-800 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowTech((v) => !v)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-400"
                    >
                      {showTech ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      ดูรายละเอียดทางเทคนิค
                    </button>
                    {showTech && (
                      <p className="mt-2 text-[11px] font-mono text-slate-500 bg-slate-900/80 rounded-lg p-2 break-all">
                        {modal.technicalDetail}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowTech(false);
                    closeModal();
                  }}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-sm font-bold"
                >
                  เข้าใจแล้วค่ะ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
