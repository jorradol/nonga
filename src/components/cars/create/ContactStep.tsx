import React from "react";
import { User, Phone, Mail, Store, ShieldCheck } from "lucide-react";

interface ContactStepProps {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  sellerType: "private" | "dealer" | "agent";
  dealerId: string;
  onChange: (fields: {
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    sellerType: "private" | "dealer" | "agent";
    dealerId: string;
  }) => void;
  isDarkMode: boolean;
}

export default function ContactStep({
  contactName,
  contactPhone,
  contactEmail,
  sellerType,
  dealerId,
  onChange,
  isDarkMode,
}: ContactStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-orange-500/10 pb-3">
        <User className="w-5 h-5 text-orange-500" />
        <div className="text-left">
          <h3 className="text-base font-extrabold text-orange-500">6. ช่องทางข้อมูลติดต่อผู้ขาย</h3>
          <p className="text-[11px] text-slate-400">ระบุรายละเอียดการติดต่อกลับเพื่อป้องกันความเสี่ยงสปิโนลาจ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
        
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-orange-500" />
            <span>ชื่อจริงผู้ลงประกาศติดต่อ *</span>
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => onChange({
              contactName: e.target.value,
              contactPhone, contactEmail, sellerType, dealerId
            })}
            placeholder="เช่น คุณสมเกียรติ มั่นคง, น้องแป้ง โชว์รูมลาดพร้าว"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          />
        </div>

        {/* Contact Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-orange-500" />
            <span>หมายเลขติดต่อกลับ (เฉพาะมือถือไทยตัวเลข 10 หลัก) *</span>
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => onChange({
              contactPhone: e.target.value.replace(/\D/g, ""), // strip non-digits for validation ease
              contactName, contactEmail, sellerType, dealerId
            })}
            placeholder="เช่น 0812345678"
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all font-mono"
          />
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-orange-500" />
            <span>ที่อยู่อีเมลติดต่อกลับ (ไม่บังคับกรอก)</span>
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => onChange({
              contactEmail: e.target.value,
              contactName, contactPhone, sellerType, dealerId
            })}
            placeholder="เช่น somkiat@gmail.com"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          />
        </div>

        {/* Seller Type choosing option */}
        <div className="space-y-1.55">
          <label className="text-xs font-bold text-slate-400 block">บทบาทระดับประเภทผู้ขาย *</label>
          <div className="flex gap-2">
            {[
              { type: "private", label: "บุคคลทั่วไป (Private)" },
              { type: "dealer", label: "ผู้ค้ารถยนต์/โชว์รูม (Dealer)" },
              { type: "agent", label: "นายหน้ารถดีดเดรส (Agent)" },
            ].map((role) => {
              const active = sellerType === role.type;
              return (
                <button
                  key={role.type}
                  type="button"
                  onClick={() => onChange({
                    sellerType: role.type as any,
                    contactName, contactPhone, contactEmail, dealerId
                  })}
                  className={`flex-1 p-3 rounded-xl border flex items-center justify-center text-[11px] font-bold transition-all ${
                    active
                      ? "border-orange-500 bg-orange-555/10 text-orange-500 scale-[1.01]"
                      : "border-white/5 bg-slate-900/40 text-slate-400"
                  }`}
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      <div className="p-3.5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] flex gap-3 text-left">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-xs font-extrabold text-emerald-500 flex items-center gap-1">ระบบยืนยันเบอร์ระบุตัวตนอัติโนมัติ</span>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Nong A Marketplace สนับสนุนผู้ประกอบการโชว์รูมคาร์ เบอร์ติดต่อของท่านจะปรากฏเด่นสง่าในหน้ารายละเอียด พาส่งลูกค้าดีลเร็วผ่านช่องทางไลน์เพจ ปังปุริเย่แน่นอนคร้าบ!
          </p>
        </div>
      </div>
    </div>
  );
}
