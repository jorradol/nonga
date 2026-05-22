import React from "react";
import { useAppStore } from "../store";
import { useRole } from "../hooks/auth/useRole";
import { Sparkles, ShieldAlert } from "lucide-react";
import SellingFormContainer from "./cars/create/SellingFormContainer";

export default function SellCarView() {
  const { setView, isDarkMode } = useAppStore();
  const { role, canPostMore, postLimit } = useRole();

  if (!canPostMore) {
    return (
      <div className={`py-16 px-4 max-w-xl mx-auto text-center space-y-6 ${
        isDarkMode ? "bg-black/40 border border-white/[0.08]" : "bg-white border border-slate-200"
      } rounded-2xl shadow-2xl`}>
        <div className="inline-flex p-3.5 rounded-2xl bg-orange-600/10 text-orange-500 animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black">โควตาลงประกาศขายครบถ้วนแล้วครับ! 🔒</h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          ในฐานะผู้ใช้งานฟรีสิทธิ์ <strong>{role.toUpperCase()}</strong> คุณใช้โควตาเต็มพิกัดสูงสุด <strong className="text-orange-500">{postLimit} คัน</strong> เรียบร้อยแล้วครับผม
        </p>

        <div className="p-5.5 rounded-xl border border-orange-500/15 bg-orange-500/[0.02] text-left space-y-3">
          <p className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> ปลดล็อกด้วยบัญชีระดับ Premium หรือ Dealer Partner:
          </p>
          <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4.5">
            <li>ลงขายรถยนต์ เสนอขาย นำรูปขึ้นคลาวด์ได้ <strong>ไม่จำกัดจำนวน</strong></li>
            <li>เจรจาราคา และให้ <strong>น้องเอ AI</strong> สลักข้อเขียนแบบพรีเมียมเชิงลึก</li>
            <li>แสดงโชว์รูมพร้อมบัจ <strong>Dealer Verified</strong> ดึงใจลูกค้ามากกว่าเดิม 3 เท่า</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-left">
          <p className="text-[11.5px] font-semibold text-slate-300">💡 เคล็ดลับทดสอบ Sandbox:</p>
          <p className="text-[10.5px] text-slate-500 leading-relaxed pt-1">
            ท่านสามารถสวิตช์บทบาทเป็นสิทธิ์ระดับ <strong>Premium</strong> หรือ <strong>Dealer</strong> ในหน้าตั้งค่าโปรไฟล์ เพื่อรับสิทธิ์โพสต์ได้ไม่จำกัดและใช้งานหน้าควบคุมโชว์รูมได้ทันทีครับ!
          </p>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => setView("profile")}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-lg cursor-pointer animate-pulse"
          >
            ไปที่โปรไฟล์เพื่อเปลี่ยนระดับสิทธิ์ 🪄
          </button>
          <button
            onClick={() => setView("marketplace")}
            className="px-5 py-3 text-slate-350 bg-white/[0.04] rounded-xl text-xs hover:bg-white/[0.08]"
          >
            กลับหน้าตลาด
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-10 pb-20">
      
      {/* Visual Title Block */}
      <section className="text-left space-y-1.5 max-w-xl">
        <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white flex items-center gap-2">
          <span>ลงขายรถรวดเร็วด้วย</span>
          <span className="text-orange-500 flex items-center gap-1">
            Nong A AI <Sparkles className="w-5 h-5 animate-pulse" />
          </span>
        </h2>
        <p className="text-slate-400 font-sans text-sm leading-relaxed">
          สร้างใบเสนอขายสิริประดับพรีเมียม ถ่ายภาพสบตาใจสั่น คาดการณ์ราคากลางอัจฉริยะ และสลักเขียนคำบรรยายด้วยแคปชั่นเงินล้านกับดีลเลอร์คู่ใจ ปังปุริเย่แน่นอนครับ!
        </p>
      </section>

      {/* Modern Multi-step Multi-form orchestrator */}
      <SellingFormContainer
        onSuccess={() => setView("marketplace")}
        isDarkMode={isDarkMode}
      />

    </div>
  );
}
