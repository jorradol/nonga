import React, { useState } from "react";
import { useAuthContext } from "../contexts/auth/AuthContext";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Car, Check, User, ShieldCheck, ArrowRight, Sparkle } from "lucide-react";

export default function OnboardingView() {
  const { user, completeOnboarding, isSimulatedState } = useAuthContext();
  const setView = useAppStore((state) => state.setView);
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  const [step, setStep] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState("Professional - เน้นข้อมูลสเปกเชิงลึก");
  const [selectedRole, setSelectedRole] = useState("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personas = [
    {
      id: "pro",
      name: "Professional Mode 💼",
      title: "เน้นข้อมูลสเปกวิศวกรรมไฟฟ้าร้อยเปอร์เซ็นต์",
      desc: "น้องเอจะคอยวิเคราะห์อัตราเร่ง แบตเตอรี่ ค่าเสื่อม ดอกเบี้ย และความคุ้มทุนแบบเป็นทางการ สุภาพเรียบร้อยน่าเชื่อถือ"
    },
    {
      id: "racing",
      name: "Blogger Racing Mode 🏎️",
      title: "บล็อกเกอร์สายซิ่ง ว้าวซ่า ซิ่งสะเทือนดาวอังคาร",
      desc: "น้องเอจะคุยด้วยคำวัยรุ่นสร้างตัว ปังปุริเย่สุดขีด รีวิวอัตราเร่งทางตรงแบบสับๆ มีมเยอะ ซื้อคันนี้คนข้างบ้านมีมองแน่นอน!"
    },
    {
      id: "luxury",
      name: "Luxury VIP Exclusive ✨",
      title: "บริการสุภาพระดับพรมแดง เลอค่าอมตะ",
      desc: "วิเคราะห์ความพรีเมียมของห้องโดยสาร ภาพลักษณ์ทางสังคม ยนตรกรรมสำหรับผู้นำระดับสูง ด้วยสำเนียงเรียบหรูคลาสสิก"
    }
  ];

  const roles = [
    {
      id: "member",
      name: "สมาชิกทั่วไป (Member)",
      desc: "โพสต์รถจำหน่ายได้สูงสุด 5 คัน สามารถสนทนากับน้องเอเพื่อวิเคราะห์สเปกเบื้องหลังฟรี",
      badge: "FREE"
    },
    {
      id: "premium",
      name: "สมาชิกตัวจริง (Premium)",
      desc: "โพสต์ขายรถไม่จำกัดจำนวน ปลดล็อกวิเคราะห์สเปกเชิงลึก ดอกเบี้ย และความคุ้มค่าครบชุด",
      badge: "PRO"
    },
    {
      id: "dealer",
      name: "ดีลเลอร์พรีเมียม (Dealer)",
      desc: "โพสต์ได้ไม่จำกัด ปลดล็อกแดชบอร์ดจัดการผู้ซื้อ และหน้าแสดงโชว์รูมที่ได้รับการตรวจสอบจาก NongBot",
      badge: "DEALER"
    }
  ];

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding(selectedPersona, selectedRole);
      setView("home");
    } catch (e) {
      console.error("Onboarding setup failed", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen py-16 px-4 flex items-center justify-center ${
      isDarkMode ? "bg-[#09090b] text-slate-100" : "bg-slate-50 text-slate-800"
    }`}>
      <div className={`max-w-2xl w-full rounded-2xl border p-8 md:p-10 shadow-2xl relative overflow-hidden transition-all duration-300 ${
        isDarkMode ? "bg-black/40 border-white/[0.08]" : "bg-white border-slate-200"
      }`}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900/40">
          <motion.div 
            className="h-full bg-gradient-to-r from-orange-600 to-amber-500"
            initial={{ width: "33%" }}
            animate={{ width: step === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 text-orange-500 mb-2">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">เลือกสไตล์ของ "น้องเอ AI Sales" 🪄</h1>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  ปรับบุคลิกภาพและความคิดสร้างสรรค์ในการต่อรอง และเขียนสเปกให้ตอบคำถามคุณโดยตรง
                </p>
              </div>

              <div className="space-y-3.5">
                {personas.map((persona) => {
                  const isSelected = selectedPersona.startsWith(persona.name.split(" ")[0]);
                  return (
                    <button
                      key={persona.id}
                      onClick={() => setSelectedPersona(`${persona.name} - ${persona.title}`)}
                      className={`w-full p-4.5 rounded-xl border text-left transition-all relative ${
                        isSelected 
                          ? "border-orange-500 bg-orange-500/[0.03] shadow-md shadow-orange-500/5" 
                          : isDarkMode ? "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                          isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-slate-600"
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{persona.name}</p>
                          <p className="text-xs font-semibold text-orange-400">{persona.title}</p>
                          <p className="text-xs text-slate-400 leading-relaxed pt-0.5">{persona.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <span>ขั้นตอนต่อไป</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-2">
                  <User className="w-8 h-8" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">ยืนยันบทบาทระดับสมาชิก 🤝</h1>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  {isSimulatedState 
                    ? "คุณกำลังทดสอบในโหมด Sandbox สามารถเลือกระดับเพื่อสัมผัสขีดสุดระบบได้ฟรี" 
                    : "ระบุวิถีการเข้าใช้งานของคุณเพื่อเซ็ตระบบเบื้องหลัง"
                  }
                </p>
              </div>

              <div className="space-y-3.5">
                {roles.map((role) => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`w-full p-4.5 rounded-xl border text-left transition-all relative ${
                        isSelected 
                          ? "border-amber-500 bg-amber-500/[0.03] shadow-md shadow-amber-500/5" 
                          : isDarkMode ? "border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                          isSelected ? "border-amber-500 bg-amber-500 text-white" : "border-slate-600"
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="space-y-1 pr-14">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{role.name}</p>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed pt-1">{role.desc}</p>
                        </div>
                        <span className={`absolute top-4 right-4 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          isSelected 
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                            : "bg-slate-800/60 border-white/5 text-slate-400"
                        }`}>
                          {role.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/[0.05]">
                <button
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold hover:text-white transition disabled:opacity-50 cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>กำลังเซ็ตอัป... 🪄</span>
                  ) : (
                    <>
                      <span>เข้าสู่ตลาด Nong A 🎉</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center">
          <p className="text-[9px] font-semibold text-orange-500/60 flex items-center justify-center gap-1">
            <Sparkle className="w-2.5 h-2.5 animate-spin" />
            ระบบความปลอดภัยและบทบาทรองรับมาตรฐาน Firestore Sandbox Security • พัฒนาโดยกลุ่ม NongBot
          </p>
        </div>
      </div>
    </div>
  );
}
