import React, { useState } from "react";
import { X, Calendar, PhoneCall, CheckCircle2, User, HelpCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Car } from "../../../types";

interface InquireModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car;
  isDarkMode?: boolean;
}

/**
 * Marketplace detail inquire form — **legacy mock only**.
 * v22.46: NOT the supported Buyer Lead path.
 * Supported path: chat CTA → BuyerLeadConsentModal → consented buyer-lead API.
 * This modal uses setTimeout simulation and must not be wired to real lead APIs.
 */
export default function InquireModal({ isOpen, onClose, car, isDarkMode = true }: InquireModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    timeSlot: "anytime",
    notes: "สวัสดีครับ สนใจรายละเอียดคันนี้ และอยากขอนัดหมายเพื่อดูรถจริงพร้อมข้อเสนอพิเศษปังปุริเย่ครับ!",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setIsSubmitting(true);
    // Simulate API callback submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  const resetState = () => {
    setIsSuccess(false);
    setFormData({
      name: "",
      phone: "",
      timeSlot: "anytime",
      notes: "สวัสดีครับ สนใจรายละเอียดคันนี้ และอยากขอนัดหมายเพื่อดูรถจริงพร้อมข้อเสนอพิเศษปังปุริเย่ครับ!",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetState}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal structure */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 text-left shadow-2xl z-10 ${
            isDarkMode 
              ? "bg-slate-900 border-white/[0.08] text-white" 
              : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          {/* Close button */}
          <button
            onClick={resetState}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition"
            aria-label="ปิดเกณฑ์แบบฟอร์ม"
          >
            <X className="w-4 h-4" />
          </button>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <span className="text-[10px] bg-orange-600/10 text-orange-500 font-bold px-2.5 py-1 rounded-lg inline-block uppercase tracking-widest">
                รอบทดลอง (Pilot)
              </span>
              <h4 className="font-display font-black text-lg text-white">สนใจรถคันนี้ — แบบฟอร์มทดลอง</h4>
              <p className="text-xs text-slate-400 leading-normal">
                ระบบยังไม่ส่ง lead จริงไปหาผู้ขาย — ข้อมูลที่กรอกจะไม่ถูกส่งต่อในรอบ pilot นี้
                หากต้องการความช่วยเหลือ ติดต่อทีม Nong A ผ่านช่องทาง support pilot
              </p>

              {/* Input name */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-400">ชื่อของคุณ (Name)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น คุณอนุรักษ์ ปรารถนาดี"
                    className="w-full text-xs sm:text-sm pl-11 pr-4 py-3.5 rounded-xl border bg-slate-950/60 border-slate-850 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-400">เบอร์โทรศัพท์ (Phone No.)</label>
                <div className="relative">
                  <PhoneCall className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{9,10}"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="เช่น 0812345678"
                    className="w-full text-xs sm:text-sm pl-11 pr-4 py-3.5 rounded-xl border bg-slate-950/60 border-slate-850 text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Call hour prefer */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-400">ช่วงเวลาให้ติดต่อกลับสะดวก</label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  className="w-full text-xs sm:text-sm px-4 py-3.5 rounded-xl border bg-slate-950 border-slate-850 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="anytime">ตลอดเวลาสะดวกยิ่งดี (Anytime)</option>
                  <option value="morning">ช่วงเช้า (09:00 - 12:00 น.)</option>
                  <option value="afternoon">ช่วงบ่าย (13:00 - 17:00 น.)</option>
                  <option value="evening">ช่วงเย็น (17:00 - 20:00 น.)</option>
                </select>
              </div>

              {/* Message box */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-400">บันทึกเพิ่มเติม (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full min-h-[70px] text-xs p-3.5 rounded-xl border bg-slate-950/60 border-slate-850 text-white focus:outline-none focus:border-orange-500 resize-none font-sans"
                />
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-4 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-orange-600/20 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>กำลังบันทึกคำขอทดลอง...</span>
                  </>
                ) : (
                  <span>บันทึกคำขอทดลอง (ยังไม่ส่ง lead)</span>
                )}
              </button>
            </form>
          ) : (
            <div className="py-8 text-center space-y-4 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-black text-lg text-white">บันทึกคำขอทดลองแล้ว</h4>
                <p className="text-xs text-slate-400 leading-normal max-w-[280px] mx-auto">
                  รอบ pilot นี้ยังไม่มีระบบส่ง lead จริง — ข้อมูลของคุณไม่ได้ถูกส่งไปหาผู้ขาย
                  ขอบคุณที่ช่วยทดสอบ Nong A ครับ
                </p>
              </div>
              <button
                onClick={resetState}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 hover:scale-105 active:scale-95 text-white font-bold text-xs rounded-xl cursor-pointer shadow transition"
              >
                ตกลง
              </button>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
