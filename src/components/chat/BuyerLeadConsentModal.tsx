import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Car, Loader2, Phone, X } from "lucide-react";
import {
  BUYER_LEAD_MODAL_CONSENT_CONTACT,
  BUYER_LEAD_MODAL_CONSENT_PRIMARY,
} from "../../services/leads/buyerLeadConsentModalCopy";
import type { BuyerLeadModalPreview } from "../../services/leads/buyerLeadPreview";

export type BuyerLeadConsentModalProps = {
  open: boolean;
  preview: BuyerLeadModalPreview | null;
  isSubmitting: boolean;
  onClose: () => void;
  onBackToEdit: () => void;
  onConfirm: (contactPhone: string) => void;
};

export function BuyerLeadConsentModal({
  open,
  preview,
  isSubmitting,
  onClose,
  onBackToEdit,
  onConfirm,
}: BuyerLeadConsentModalProps) {
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (open && preview?.contactPhone) {
      setPhone(preview.contactPhone);
    }
    if (!open) setPhone("");
  }, [open, preview?.contactPhone]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const canConfirm = useMemo(() => phone.replace(/\D/g, "").length >= 9, [phone]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-lead-consent-title"
        data-testid="buyer-lead-consent-modal"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
        >
          <div className="sticky top-0 flex items-start justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <h2
                id="buyer-lead-consent-title"
                className="text-sm font-bold text-orange-300"
              >
                ตรวจสอบก่อนส่งข้อมูลให้ผู้ขาย
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                สรุปข้อมูลที่น้องเอจะส่งต่อให้เจ้าของรถคันนี้
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4">
            {!preview ? (
              <p className="text-sm text-slate-400">ไม่พบข้อมูลสรุป กรุณากรอกในแชทให้ครบก่อนครับ</p>
            ) : (
              <>
                <section
                  className="rounded-xl border border-slate-700 bg-slate-950/80 p-3 space-y-1"
                  data-testid="buyer-lead-preview-car"
                >
                  <div className="flex items-center gap-2 text-orange-400">
                    <Car className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">รถที่สนใจ</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{preview.carTitle}</p>
                  <p className="text-xs text-slate-400">ราคาในระบบ: {preview.carPriceLabel}</p>
                  <p className="text-[10px] text-slate-500">รหัสประกาศ: {preview.listingId}</p>
                </section>

                <dl className="grid grid-cols-1 gap-2 text-xs" data-testid="buyer-lead-preview-fields">
                  <PreviewRow label="ชื่อ/ชื่อเล่น" value={preview.displayName} />
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                      เบอร์ติดต่อกลับ
                    </dt>
                    <dd>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-transparent text-sm text-slate-100 outline-none"
                          placeholder="0812345678"
                          data-testid="buyer-lead-modal-phone"
                        />
                      </label>
                    </dd>
                  </div>
                  <PreviewRow label="วิธีซื้อ" value={preview.purchaseMethodLabel} />
                  <PreviewRow label="งบประมาณ" value={preview.budgetLabel} />
                  {preview.offeredPriceLabel ? (
                    <PreviewRow label="ราคาที่เสนอ" value={preview.offeredPriceLabel} />
                  ) : null}
                  <PreviewRow label="เวลาที่สะดวก" value={preview.preferredContactWindow} />
                </dl>

                <section
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  data-testid="buyer-lead-preview-summary"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                    สรุปที่จะส่งให้ผู้ขาย
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {preview.sellerSummary}
                  </p>
                </section>

                <section
                  className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2 text-[11px] text-slate-300 leading-relaxed"
                  data-testid="buyer-lead-consent-copy"
                >
                  <p>{BUYER_LEAD_MODAL_CONSENT_PRIMARY}</p>
                  <p className="text-slate-400">{BUYER_LEAD_MODAL_CONSENT_CONTACT}</p>
                </section>
              </>
            )}
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
            <button
              type="button"
              disabled={!preview || !canConfirm || isSubmitting}
              onClick={() => onConfirm(phone.trim())}
              className="w-full min-h-[44px] rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-sm font-bold cursor-pointer flex items-center justify-center gap-2"
              data-testid="buyer-lead-confirm-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังส่ง…
                </>
              ) : (
                "ยืนยันส่งข้อมูลให้ผู้ขาย"
              )}
            </button>
            <button
              type="button"
              onClick={onBackToEdit}
              disabled={isSubmitting}
              className="w-full min-h-[40px] rounded-xl border border-slate-600 text-slate-200 text-sm font-semibold hover:bg-slate-800 cursor-pointer"
              data-testid="buyer-lead-back-edit"
            >
              กลับไปแก้ไข
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full min-h-[40px] rounded-xl text-slate-400 text-sm hover:text-slate-200 cursor-pointer"
              data-testid="buyer-lead-cancel"
            >
              ยกเลิก
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-100">{value}</dd>
    </div>
  );
}
