import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

export interface PublishBlockedModalProps {
  open: boolean;
  missingLabelsThai: string[];
  onClose: () => void;
  onEdit?: () => void;
}

export function PublishBlockedModal({
  open,
  missingLabelsThai,
  onClose,
  onEdit,
}: PublishBlockedModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-blocked-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-950 text-white shadow-2xl p-6 space-y-4"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h2
                  id="publish-blocked-title"
                  className="text-lg font-bold text-amber-100"
                >
                  ยังไม่สามารถเผยแพร่ประกาศได้
                </h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  กรุณาเติมข้อมูลจำเป็นให้ครบก่อนส่งรถคันนี้เข้าตลาด
                </p>
              </div>
            </div>

            {missingLabelsThai.length > 0 && (
              <ul className="space-y-2 pl-1">
                {missingLabelsThai.map((label) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-sm text-amber-200/90"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {label}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onEdit?.();
                  onClose();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold"
              >
                กลับไปแก้ไขข้อมูล
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold hover:bg-slate-800"
              >
                ยกเลิก
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
