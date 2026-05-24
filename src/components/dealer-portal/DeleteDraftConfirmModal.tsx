import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, X } from "lucide-react";

export interface DeleteDraftConfirmModalProps {
  open: boolean;
  deleting?: boolean;
  draftTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteDraftConfirmModal({
  open,
  deleting = false,
  draftTitle,
  onClose,
  onConfirm,
}: DeleteDraftConfirmModalProps) {
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
          aria-labelledby="delete-draft-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-950 text-white shadow-2xl p-6 space-y-4"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <Trash2 className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <h2 id="delete-draft-title" className="text-lg font-bold text-red-100">
                  ต้องการลบประกาศนี้ใช่ไหม?
                </h2>
                {draftTitle?.trim() && (
                  <p className="text-sm text-slate-400 mt-1 truncate">{draftTitle}</p>
                )}
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  เมื่อลบแล้ว จะไม่สามารถกู้คืนรายการนี้ได้
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50 min-w-[7.5rem]"
              >
                {deleting ? "กำลังลบ…" : "ยืนยันการลบ"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
