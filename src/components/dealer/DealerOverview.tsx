import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Car, Heart, Star, Sparkles, 
  ArrowRight, ArrowUpRight, BarChart3, ShieldCheck, 
  HelpCircle, CheckCircle, RefreshCcw, Landmark, Clock,
  MessageSquare, PlaneTakeoff, Info, Rocket
} from "lucide-react";
import { useAnalytics } from "../../hooks/analytics/useAnalytics";
import { useAppStore } from "../../store";

export function DealerOverview() {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const setView = useAppStore((state) => state.setView);
  
  const { 
    summary, 
    allLeadsRaw,
    insights,
    trendingCars,
    isLoading,
    refreshAll 
  } = useAnalytics();

  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Generate an automated response explaining overall performance and strategy
  const handleFetchAiAudit = async () => {
    setLoadingAi(true);
    try {
      // Simulate highly advanced statistical projection
      await new Promise(resolve => setTimeout(resolve, 1500));
      const text = `วิเคราะห์ขุมกำลังผู้จองโดย น้องเอ AI: คลังรถของคุณพี่สะสมทราฟฟิกเฉลี่ยอยู่ในระดับ 'ยอดเยี่ยมดีลเลอร์พรีเมียม' 🌟 ดีล BYD Seal AWD และ Tesla Model 3 ดึงคอนเวอร์ชันผ่อนไป 5.8% ซึ่งสูงกว่ารถสเปกพื้นเมืองถึงสองเท่าตัว! แนะนำจัดโปรพรรครบรวดเร็ว: 1) เพิ่มชุดคีย์เวิร์ดหน้า Landing Page แนว 'ดอกเบี้ยต่ำผ่อนสไลด์ซิ่ง' 2) ยอดผู้เข้าชมรายชั่วโมงมีพริกขี้หนูสูงพอร์ต 19:00 - 21:00 น. แนะนำตั้งค่าบรอดแคสต์ LINE ชี้ชวนจองในช่วงเวลานั้นทันทีครับ!🔥`;
      setAiInsight(text);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const activeListingsCount = 4;
  const totalViews = summary?.viewsCount || 15420;
  const totalFavorites = summary?.favoritesCount || 894;
  const totalLeads = allLeadsRaw.length;
  const leadsToday = allLeadsRaw.filter(l => {
    // Check if created today (rough mock checks)
    return new Date(l.createdAt).getTime() > Date.now() - 1000 * 60 * 60 * 24;
  }).length;

  return (
    <div className="space-y-6 text-left selection:bg-orange-500/20">
      
      {/* Greetings Jumbotron */}
      <div className="p-6 rounded-2xl border border-orange-500/15 bg-gradient-to-r from-orange-950/25 to-slate-900/40 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">👋</span>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">ยินดีต้อนรับกลับสู่ระบบวิเคราะห์พอร์ตน้องเอครับ</p>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white">
              NongBot Premium Space Garage
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold">
              ระดับแพ็กเกจสมาชิกคุณพี่คือ <span className="text-orange-400 uppercase font-black">Premium Growth Elite 👑</span> เคียงคู่สถานะดีลเลอร์สเปกไฟฟ้ายืนยันตัวตนพิเศษ <strong>Verified Showroom</strong>
            </p>
          </div>

          <div className="px-4 py-2 bg-slate-900 border border-white/[0.04] rounded-xl flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-extrabold leading-none">เครดิตบูสต์คงเหลือ</p>
              <p className="text-sm font-black text-orange-400 mt-1">150 Credits</p>
            </div>
            <span className="p-2 rounded-lg bg-orange-600/15 text-orange-500 text-xs shrink-0 font-black">⚙️ VIP PRO</span>
          </div>
        </div>
      </div>

      {/* Numerical Metric cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-semibold">
        {[
          { 
            label: "รถยนต์คัดสรรในฟีด", 
            value: activeListingsCount, 
            unit: "คันเสนอขาย", 
            desc: "ดีลเลอร์ลงขายจำลองแบบ Unlim", 
            icon: Car, 
            color: "text-orange-400", 
            bg: "bg-orange-500/10" 
          },
          { 
            label: "คลิกเข้าชม (Views)", 
            value: totalViews.toLocaleString(), 
            unit: "ครั้งสะสม", 
            desc: "อัพเดตแบบเรียลไทม์", 
            icon: TrendingUp, 
            color: "text-amber-400", 
            bg: "bg-amber-500/10" 
          },
          { 
            label: "ผู้เก็บเข้าคลังโปรดปราน", 
            value: totalFavorites.toLocaleString(), 
            unit: "ดวงดาว", 
            desc: "ดีลเลอร์โควตาสถิติสูงปีนี้", 
            icon: Heart, 
            color: "text-rose-400", 
            bg: "bg-rose-500/10" 
          },
          { 
            label: "ทะเบียนสัญญาลูกค้า", 
            value: totalLeads, 
            unit: "รายชื่อ CRM", 
            desc: `มีเป้าหมายเข้ามาใหม่วันนี้ ${leadsToday} ดีล`, 
            icon: Users, 
            color: "text-teal-400", 
            bg: "bg-teal-500/10" 
          }
        ].map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-white/[0.04] flex flex-col justify-between h-32 relative overflow-hidden group hover:border-[#222] transition duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-400">{item.label}</span>
                <span className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                  <IconComp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {item.value} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                </p>
                <div className="flex items-center gap-1 text-[9.5px] text-slate-500 font-semibold mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{item.desc}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
        {/* Core Analysis and predictions Column */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Quick funnel overview summary */}
          <div className="p-5 rounded-2xl bg-slate-905/60 border border-white/[0.06] backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  สัดส่วนทราฟฟิกแปลงจองซื้อสะสม (CRM Funnel Rate)
                </h3>
                <p className="text-[9.5px] text-slate-450 font-semibold">อัตราคนดูรถยนต์ต่อรอง พัฒนาขึ้นมาสู่การเป็นรายชื่อจองซื้อจริง</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-black px-2 py-0.5 rounded">
                Conv: {summary?.conversionRate || "6.25"} %
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center py-1">
              <div className="space-y-1">
                <span className="text-[9.5px] text-slate-500 uppercase font-black">ส่องสเป็ก</span>
                <p className="text-lg font-mono font-black text-white">{totalViews.toLocaleString()}</p>
                <p className="text-[8.5px] text-slate-400">ผู้คลิกทั้งหมด</p>
              </div>
              <div className="space-y-1 border-x border-white/5">
                <span className="text-[9.5px] text-slate-500 uppercase font-black">ดีลเลอร์ลีดส์</span>
                <p className="text-lg font-mono font-black text-orange-400">{allLeadsRaw.length}</p>
                <p className="text-[8.5px] text-slate-400">แชท + กรอกเบี้ยผ่อน</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9.5px] text-slate-500 uppercase font-black">โอนจองผ่อนเสร็จ</span>
                <p className="text-lg font-mono font-black text-emerald-400">{allLeadsRaw.filter(l => l.status === "sold").length}</p>
                <p className="text-[8.5px] text-slate-400">ปิดส่งมอบสำเร็จ</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setView("dealer-dashboard")}
                className="w-full text-center py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>ดูรายละเอียดทราฟฟิกลงลึกแผงถัดไป</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
              </button>
            </div>
          </div>

          {/* AI Auditor Widget */}
          <div className="p-5 rounded-2xl bg-slate-905/60 border border-white/[0.06] backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <div className="space-y-0.5 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                  สรุปประเมินยอดขายอัจฉริยะ (Nong A Premium AI Auditor)
                </h3>
                <p className="text-[9.5px] text-slate-450 font-semibold">เรียกประมวลคำแนะนำโดยอ่านจากสถิติทราฟฟิกและคะแนนพฤติกรรมลูกค้า</p>
              </div>
            </div>

            {aiInsight ? (
              <div className="p-4 rounded-xl bg-orange-600/[0.04] border border-orange-500/20 text-xs text-slate-200 leading-relaxed font-semibold animate-fade-in">
                {aiInsight}
              </div>
            ) : (
              <div className="border border-dashed border-white/[0.06] rounded-xl p-8 text-center space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mx-auto text-lg animate-pulse">
                  🔮
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-white">ต้องการวิเคราะห์และคำนวณเบี้ยปิดพอร์ตตอนนี้เลยไหมครับ?</p>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto">ปัญญาประดิษฐ์จะทำการวิเคราะห์ความถี่ดีลติดต่อเพื่อชี้เป้าแลนด์เลเวลที่เหมาะสมให้คุณทันที</p>
                </div>
                <button
                  onClick={handleFetchAiAudit}
                  disabled={loadingAi}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-650 to-orange-550 text-white rounded-xl text-xs font-black transition active:scale-97 shadow-lg shadow-orange-500/10 cursor-pointer"
                >
                  {loadingAi ? "กำลังประมวลความน่าจะเป็น..." : "วิเคราะห์ประธานพอร์ตด้วยน้องเอ AI 🪄"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hot and Active cars tracking Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-905/60 border border-white/[0.06] backdrop-blur-md space-y-4">
            <div className="border-b border-white/[0.05] pb-3 text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5 text-orange-500 animate-bounce" />
                คลังรถเด่นสถิติกำลังแรง (Top Performing Showroom Listings)
              </h4>
              <p className="text-[9.5px] text-slate-450 font-semibold">อ้างอิงลำดับความเข้มข้นของผู้สนใจสอบถาม</p>
            </div>

            <div className="space-y-3 font-semibold">
              {trendingCars.slice(0, 3).map((car, idx) => (
                <div 
                  key={car.carId}
                  className="flex items-center gap-3 p-2 bg-slate-900 border border-white/[0.02] rounded-xl hover:border-orange-500/20 transition-all duration-150"
                >
                  {car.coverImage && (
                    <img 
                      src={car.coverImage} 
                      alt={car.title}
                      className="w-12 h-12 object-cover rounded-lg bg-black shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-black text-white truncate">{car.title}</p>
                    <p className="text-[10px] font-mono font-black text-orange-400 mt-0.5">฿{car.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-black bg-orange-600/10 text-orange-400 border border-orange-500/20">
                      Heat {car.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Support Guidelines widget */}
          <div className="p-4 rounded-xl border border-white/[0.04] bg-slate-900 text-left space-y-2">
            <p className="text-[10.5px] font-black text-orange-400 flex items-center gap-1">
              📝 คู่มือการใช้งานทีมวิเคราะห์:
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              คุณพี่สามารถสลับระดับอนุญาตผู้ใช้ ตลอดจนทดลองกรอกจำลองลูกค้า หรือเขียนแคปชั่นบนแท็บต่างๆ เพื่อประเมินสัดส่วน และวางแผนการผ่อนชาร์จบัดดีลทันทีครับผม!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
