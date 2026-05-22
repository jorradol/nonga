import React from "react";
import { 
  Check, CreditCard, Award, HelpCircle, Star, Sparkles, 
  MessageSquare, CarFront, Zap, ShieldAlert, CheckCircle2 
} from "lucide-react";
import { useDealer } from "../../hooks/dealer/useDealer";

export function DealerSubscription() {
  const { profile, upgradeSubscription } = useDealer();

  const handleSelectPlan = (planId: "free" | "premium_growth" | "elite_pro", planName: string) => {
    upgradeSubscription(planId);
    alert(`🎉 ขอบพระคุณครับ! การจำลองชำระเงินเสร็จสิ้น บัญชีโชว์รูมดีลเลอร์ของคุณพี่อัปเกรดเป็นระดับ "${planName}" และปลดล็อคเครื่องมือเรียบร้อย คันนี้คนทักเพียบแน่นอน!`);
  };

  const plans = [
    {
      id: "free" as const,
      name: "Free Basic Starter",
      price: "0",
      description: "สำหรับดีลเลอร์เริ่มต้นที่ทดลองขายสะโพกเดี่ยว",
      features: [
        "เสนอขายรถยนต์สูงสุด 3 คัน",
        "สถิติพื้นฐานทั่วไป",
        "แชร์ลิงก์เพจร้านค้าปกติ",
        "ไม่มีระบบบอทช่วยเขียนโพสต์",
        "ไม่มีบอทช่วยแนะนำตอบแชท"
      ],
      quota: "จำกัด 3 โพสต์",
      badge: "Basic Plan",
      color: "border-slate-800 bg-slate-900/10 text-slate-400"
    },
    {
      id: "premium_growth" as const,
      name: "Premium Growth Specialist",
      price: "3,500",
      description: "ปลดปล่อยเครื่องมือสเปคทองระดับดีลเลอร์ชั้นนำ",
      features: [
        "เสนอขายสูงสุด 25 คันพร้อมกัน",
        "ตราเครื่องหมายดีลเลอร์สเปคทอง (Verified Badge)",
        "ระบบสถิติแอดวานซ์แนวโน้ม Views / Leads",
        "ผู้ช่วยเขียนโพสต์ขายด้วย AI อัจฉริยะ (โพสต์ไวรัล)",
        "ระบบ Chat แนะนำพิมพ์คำตอบด้วยบอทน้องเอ"
      ],
      quota: "จำกัด 25 โพตส์ + 150 เครดิต",
      badge: "🔥 แนะนำยอดนิยม",
      color: "border-orange-550 bg-orange-950/20 text-orange-400 font-extrabold"
    },
    {
      id: "elite_pro" as const,
      name: "Elite Pro Showroom CEO",
      price: "8,900",
      description: "ยึดครองสัดส่วนตลาดคลัง ด้วยความเร็ว AI ขั้นสุดยอด",
      features: [
        "โควตาลงรถยนต์แบบไม่จำกัดสูงสุด (Unlimited Listings)",
        "ตราดีลเลอร์ตัวจริงพรีเมียม (Verified Blue Badge)",
        "ทีมงานสนับสนุนส่วนตัวแบบ VIP 24 ชั่วครู",
        "ปัญญาประดิษฐ์อัจฉริยะแนะนำบทตอบลูกค้าสดทันท่วงที",
        "ระบบออโต้รีพลายเชื่อม Line Official"
      ],
      quota: "ไม่จำกัดรถขาย + 500 เครดิต",
      badge: "👑 ระดับสูงสุด",
      color: "border-amber-500 bg-amber-950/25 text-amber-300 font-black"
    }
  ];

  return (
    <div className="space-y-6 text-left selection:bg-orange-500/20 animate-fade-in">
      
      {/* Upper overview invoice header info */}
      <div className="p-5 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
        <div className="space-y-0.5">
          <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-orange-500" />
            สถานะบัญชีดีลเลอร์และเครื่องมือพาร์ตเนอร์โชว์รูม (Dealer Plan Desk)
          </h3>
          <p className="text-[9.5px] text-slate-400">อัปเกรดความเร็วด้วยบิสสิเนสพาร์ทเนอร์ เพื่อระเบิดอัตราส่วนทราฟฟิก</p>
        </div>
        <div className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold text-slate-305 flex items-center gap-1.5 shrink-0 select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          แพ็กเกจปัจจุบันของคุณ: <span className="text-orange-400 font-black uppercase text-[11px]">{profile.subscriptionPlan.replace("_", " ")}</span>
        </div>
      </div>

      {/* Pricing table models */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isActive = profile.subscriptionPlan === plan.id;
          return (
            <div 
              key={plan.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between h-[450px] relative transition-all duration-300 ${plan.color} ${
                isActive ? "shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/30" : "bg-slate-950"
              }`}
            >
              
              {/* Plan top ribbon tag */}
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">{plan.badge}</span>
                  {isActive && (
                    <span className="text-[9px] bg-orange-600 font-extrabold px-2.2 py-0.5 rounded text-white tracking-wide uppercase">
                      สลับสิทธิ์แล้ว
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-200">{plan.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{plan.description}</p>
                </div>

                <div className="pt-2">
                  <p className="text-3xl font-black text-white leading-none">
                    ฿{plan.price} <span className="text-xs font-normal text-slate-550">/ เดือน</span>
                  </p>
                  <span className="text-[9px] text-slate-450 block mt-1.5 uppercase font-bold tracking-wider">โควตาร้านค้า: {plan.quota}</span>
                </div>

                {/* Features tick list */}
                <ul className="space-y-2 pt-4 border-t border-slate-900/80 text-[10.5px] leading-relaxed font-semibold text-slate-400 pl-0">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selector activation button */}
              <div className="pt-4 text-left pl-0">
                {isActive ? (
                  <button
                    disabled
                    className="w-full py-2.8 bg-emerald-650/10 border border-emerald-500/20 text-emerald-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 select-none"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    บัญชีของคุณรันสิทธิ์นี้อยู่คร้าบ
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.id, plan.name)}
                    className="w-full py-2.8 bg-orange-600 hover:bg-orange-500 text-white font-extrabold rounded-xl text-xs transition cursor-pointer active:scale-97 text-center shadow-md shadow-orange-550/10"
                  >
                    อัปเกรดเลือกสมัครแพ็กเกจนี้ ✨
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
