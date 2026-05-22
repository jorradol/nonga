import React from "react";
import { 
  Rocket, Star, Percent, Calendar, AlertTriangle, 
  HelpCircle, RefreshCw, CheckCircle, Sparkles
} from "lucide-react";
import { useDealer } from "../../hooks/dealer/useDealer";
import { useAppStore } from "../../store";

export function DealerBoost() {
  const { profile, performanceMetrics, boostListing } = useDealer();
  const setView = useAppStore((state) => state.setView);
  const cars = useAppStore((state) => state.cars);

  const handleApplyBoost = (carId: string) => {
    if (profile.creditsRemaining < 25) {
      alert("⚠️ ยอดเครดิตปัจจุบันของคุณพี่คงเหลือน้อยกว่า 25 Credits แล้วครับ กรุณาอัปเกรดบัญชีดีลเลอร์เพื่อเติมเครดิตส่งงานโอนทอง!");
      return;
    }
    
    boostListing(carId);
    alert("🎉 ยินดีด้วยครับ! ระบบจดลิ้งก์ส่งต่อทีมงานยิงไลฟ์และโปรโมตคัดสรรเรียบร้อย ดึงทราฟฟิกเพิ่มเฉลี่ย 10 เท่าสะสางสำเร็จ!");
  };

  return (
    <div className="space-y-6 text-left selection:bg-orange-500/20">
      
      {/* Promotional info board header */}
      <div className="p-6 rounded-2xl border border-orange-550/15 bg-gradient-to-r from-orange-950/20 to-slate-900/40 relative overflow-hidden backdrop-blur-md text-left">
        <div className="absolute top-0 right-0 w-36 h-36 bg-orange-600/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-2">
          <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-[9px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5 animate-pulse">
            <Rocket className="w-3.5 h-3.5" /> Nong A Double Booster Engine
          </span>
          <h2 className="text-lg md:text-xl font-normal text-white leading-tight">
            เร่งยอดวิวโพสต์ให้กระหึ่ม <span className="text-orange-500 font-extrabold">ดึงยอดเข้าแชทเฉลี่ยสิบเท่า (10x Views)</span>
          </h2>
          <p className="text-[11px] text-slate-400 max-w-2xl">
            เมื่อกดเปิดสิทธิ์โชว์รูมโปรโมทรถยนต์ ระบบ NongBot จะทำการสุ่มโปรแกรมส่งโพสต์ขึ้นเป็นโพสพรีเมียมอันดับแรกสุดของหน้าฟีดการค้นหา พร้อมประสานงานยิงออกสื่อโซเชียล Facebook, Line Official และ TikTok แบบออโต้!
          </p>
        </div>
      </div>

      {/* Credit control desk dashboard widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-900 flex justify-between items-center text-left">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-black">เครดิตโฆษณาคงเหลือของคุณ</span>
            <p className="text-xl font-black text-white">{profile.creditsRemaining} Credits</p>
            <p className="text-[9.5px] text-slate-550">สมัครแบบ {profile.subscriptionPlan.replace("_", " ")}</p>
          </div>
          <span className="p-3 bg-orange-600/10 text-orange-400 text-xs shrink-0 rounded-lg">⚙️ VIP</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-900 flex justify-between items-center text-left">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-black">อัตราหักเครดิตระบบโปรโมท</span>
            <p className="text-xl font-black text-white">25 Credits / ครั้ง</p>
            <p className="text-[9.5px] text-emerald-400">รักษาผลลัพธ์พรีเมียมนาน 7 วัน</p>
          </div>
          <span className="p-3 bg-amber-600/10 text-amber-400 text-xs shrink-0 rounded-lg">⚡ FAST</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-900 flex justify-between items-center text-left">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-black">โพสต์กำลังอัปเกรดขณะนี้</span>
            <p className="text-xl font-black text-white">
              {performanceMetrics.filter(pm => pm.boosted).length} คันรถในพอร์ต
            </p>
            <p className="text-[9.5px] text-slate-550">ได้รับการรันความถี่บน Cloud เสมือน</p>
          </div>
          <span className="p-3 bg-teal-600/10 text-teal-400 text-xs shrink-0 rounded-lg">🎯 DIRECT</span>
        </div>
      </div>

      {/* Listings target list to apply boost */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider pl-1">
          เลือกคันโปรดเก๋าเพื่อส่งบูสต์แอดไลน์โฆษณา (Apply Promotion Boosts)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: "car-001", title: "BYD Seal Premium AWD Electrifier", image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=600" },
            { id: "car-002", title: "Tesla Model 3 Highland Red", image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600" },
            { id: "car-003", title: "Porsche Taycan Dynamic White", image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=600" }
          ].map((car) => {
            const hasBoost = performanceMetrics.find(pm => pm.carId === car.id)?.boosted || false;
            const boostDate = performanceMetrics.find(pm => pm.carId === car.id)?.boostEndDate;

            return (
              <div key={car.id} className="p-4 rounded-xl bg-slate-900 border border-slate-900 flex gap-4 items-center transition hover:border-slate-800 text-left">
                <img 
                  src={car.image} 
                  alt={car.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-14 object-cover bg-slate-950 rounded-xl shrink-0 border border-slate-850"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <h4 className="text-xs font-black text-slate-100 truncate">{car.title}</h4>
                  
                  <div className="flex items-center gap-3">
                    {hasBoost ? (
                      <div className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle className="w-2.5 h-2.5" /> บูสต์ใช้งานอยู่ (Active)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
                        ⚪ รอส่งงานขึ้นหน้าบอร์ดแรกร้านค้า
                      </div>
                    )}
                  </div>

                  {/* Boost metadata */}
                  {hasBoost && boostDate && (
                    <p className="text-[8.5px] text-slate-500 font-bold flex items-center gap-1 leading-none">
                      <Calendar className="w-2.5 h-2.5" /> 
                      กำหนดหมดอายุสิทธิ์: {new Date(boostDate).toLocaleDateString("th-TH")}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  {hasBoost ? (
                    <button
                      disabled
                      className="px-3.5 py-2 bg-slate-950 border border-slate-850 text-slate-500 rounded-xl text-[10.5px] font-bold"
                    >
                      รันเน็ตเวิร์กอยู่ 🛡️
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyBoost(car.id)}
                      className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10.5px] font-black cursor-pointer transition active:scale-97 flex items-center gap-1 shadow-md shadow-orange-500/15"
                    >
                      บูสต์โพสต์ 🚀
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
