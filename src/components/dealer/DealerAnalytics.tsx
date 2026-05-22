import React, { useState } from "react";
import { 
  TrendingUp, Eye, Target, Share2, Award, 
  MapPin, HelpCircle, PhoneCall, Check, ExternalLink,
  Sparkles, Heart, RefreshCw, BarChart3, LineChart,
  Layers, Clock, Compass, Grid, AlertCircle
} from "lucide-react";
import { useAnalytics } from "../../hooks/analytics/useAnalytics";

export function DealerAnalytics() {
  const { 
    summary, 
    isLoading, 
    trendingCars, 
    funnelMetrics, 
    insights,
    refreshAll 
  } = useAnalytics();

  const [activeFunnelHover, setActiveFunnelHover] = useState<string | null>(null);
  
  // Calculate funnel conversion rates
  const funnelSteps = React.useMemo(() => {
    const v = funnelMetrics.views;
    const f = funnelMetrics.favorites;
    const i = funnelMetrics.inquiries;
    const c = funnelMetrics.closed;

    const favRate = v > 0 ? parseFloat(((f / v) * 100).toFixed(1)) : 0;
    const inqRate = f > 0 ? parseFloat(((i / f) * 100).toFixed(1)) : 0;
    const closeRate = i > 0 ? parseFloat(((c / i) * 100).toFixed(1)) : 0;

    return [
      { id: "views", label: "ผู้ชมแวะเวียนส่องสเป็ก (Views)", count: v, pct: 100, stepRate: "เริ่มต้นทราฟฟิก", color: "bg-orange-655/20 text-orange-400 border-orange-500/20" },
      { id: "favorites", label: "ติดดาวสนใจค้างไว้ (Favorites)", count: f, pct: favRate, stepRate: `${favRate}% ของสถิติผู้เข้าชม`, color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
      { id: "inquiries", label: "กรอกข้อมูลติดต่อแชท (CRM Leads)", count: i, pct: inqRate, stepRate: `${inqRate}% ของผู้บันทึกโปรด`, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      { id: "closed", label: "ส่งมอบปิดจองโอน (Closed Sold)", count: c, pct: closeRate, stepRate: `${closeRate}% อัตราสัญญาสินเชื่อผ่าน`, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
    ];
  }, [funnelMetrics]);

  return (
    <div className="space-y-6 text-left selection:bg-orange-500/20">
      
      {/* Upper Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.04] flex justify-between items-center relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ทราฟฟิกสถิติดึงดูดผ่านหน้าตลาด</span>
            <p className="text-xl font-black text-white">{summary?.viewsCount ? summary.viewsCount.toLocaleString() : "15,420"} ครั้ง</p>
            <p className="text-[9.5px] text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="inline-block py-0.5 px-1 rounded bg-emerald-500/15 text-emerald-400 font-bold">🎯 +14.2%</span> จากสัปดาห์ก่อนหน้า
            </p>
          </div>
          <span className="p-3 rounded-lg bg-orange-600/10 text-orange-500 text-sm font-bold">📈</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.04] flex justify-between items-center relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">อัตราคอนเวอร์ชันเฉลี่ยกักเก็บ (Conv.)</span>
            <p className="text-xl font-black text-white">{summary?.conversionRate ? summary.conversionRate : "6.25"} %</p>
            <p className="text-[9.5px] text-slate-450 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" /> ระบุนักซื้อผ่านตามมาตรฐานทองดีลเลอร์
            </p>
          </div>
          <span className="p-3 rounded-lg bg-emerald-600/10 text-emerald-400 text-sm font-bold">🎯</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.04] flex justify-between items-center relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">เวลาปิดหนี้สินเชื่อเฉลี่ย (Close Velocity)</span>
            <p className="text-xl font-black text-white">{summary?.averageCloseTimeDays ? summary.averageCloseTimeDays : "4.8"} วันทำการ</p>
            <p className="text-[9.5px] text-orange-400 flex items-center gap-1 font-semibold">
              <span className="inline-block py-0.5 px-1 rounded bg-orange-500/15 text-orange-400 font-bold">⚡ เร็วขึ้น 0.8 วัน</span> ยอดอนุมัติไวเกียรตินาคิน
            </p>
          </div>
          <span className="p-3 rounded-lg bg-rose-600/10 text-rose-400 text-sm font-bold">💎</span>
        </div>
      </div>

      {/* Main Grid: Funnel Chart and Trending cars */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Sales Funnel Chart Column */}
        <div className="lg:col-span-3 p-5 rounded-2xl bg-slate-905/60 border border-white/[0.06] backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                อัตราคอนเวอร์ชันกรวยการจองซื้อ (Interactive conversion funnel)
              </h3>
              <p className="text-[9.5px] text-slate-400">สรุปพฤติกรรมลูกค้าที่ไหลเวียนผ่านแต่ละขั้นตอนสัญญาดีลเลอร์ในระบบคลาวด์</p>
            </div>
            <button 
              onClick={refreshAll}
              className="p-1 px-2 hover:bg-white/5 border border-white/5 rounded text-slate-500 hover:text-white transition flex items-center gap-1.5 text-[9px] font-mono"
            >
              <RefreshCw className="w-2.5 h-2.5" /> ซิงค์รีโหลด
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {funnelSteps.map((step) => (
              <div 
                key={step.id} 
                className="space-y-1"
                onMouseEnter={() => setActiveFunnelHover(step.id)}
                onMouseLeave={() => setActiveFunnelHover(null)}
              >
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="text-slate-200">{step.label}</span>
                  <div className="font-mono flex items-center gap-2">
                    <span className="text-[12px] font-black text-white">{step.count.toLocaleString()}</span>
                    <span className="text-[9.5px] text-slate-500 uppercase">รายสัปดาห์</span>
                  </div>
                </div>

                <div className="h-7 w-full bg-slate-950 rounded-xl overflow-hidden p-0.5 border border-white/[0.02] flex relative items-center">
                  <div 
                    className={`h-full rounded-lg bg-gradient-to-r from-orange-650 to-orange-550 transition-all duration-500 flex items-center justify-end px-3 font-semibold text-[10.5px] text-white font-mono shadow-inner ${
                      activeFunnelHover === step.id ? "brightness-110 shadow-lg" : ""
                    }`}
                    style={{ width: `${Math.max(step.pct, 5)}%` }}
                  >
                    {step.pct}%
                  </div>
                  <div className="absolute left-3 text-[9.5px] font-bold text-slate-400 pointer-events-none uppercase">
                    {step.stepRate}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-orange-600/5 border border-orange-500/10 flex gap-2.5 text-[10.5px] text-slate-400 leading-normal">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p>
              💡 <strong>ข้อแนะนำแผนกขาย:</strong> คัดกรองเซกเมนต์ 'Hot Temperature' ยอดทราฟฟิกลูกค้าติดต่อสอบถามแชทบวกสไลด์คำนวณเบี้ยผ่อน เป็นสัญญามีโอกาสตกหล่นน้อยที่สุด แนะนำให้ส่งโปรแกรมจองจบรวดเร็วในคืนนี้นะครับ
            </p>
          </div>
        </div>

        {/* Hot Trending Vehicles list */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-905/60 border border-white/[0.06] backdrop-blur-md space-y-4">
          <div className="border-b border-white/[0.05] pb-3 text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-orange-400 animate-pulse" />
              อันดับรถยนต์สะสมสถิติดิจิทัล (Viral Heat Index Cars)
            </h4>
            <p className="text-[9.5px] text-slate-400">วัดความฮิตคำนวณถ่วงพฤติกรรม: ยอดชม + ดาว x3 + จองแชท x8</p>
          </div>

          <div className="space-y-3 font-semibold">
            {trendingCars.map((car, idx) => {
              const bgBadge = idx === 0 ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/10 text-yellow-500 border-yellow-500/30" : "bg-slate-900 border-white/5 text-slate-400 text-xs";
              
              return (
                <div 
                  key={car.carId}
                  className="flex items-center gap-2.5 p-2 bg-slate-900/60 border border-white/[0.02] rounded-xl hover:border-orange-500/20 transition duration-150"
                >
                  <span className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center font-mono font-black border text-[11px] ${bgBadge}`}>
                    {idx + 1}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-white truncate">{car.title}</p>
                    <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {car.viewCount}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-rose-500/70" /> {car.favoriteCount}</span>
                      <span className="flex items-center gap-0.5"><PhoneCall className="w-2.5 h-2.5 text-teal-500/70" /> {car.leadCount}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-black text-orange-400">🔥 {car.score}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Heat Score</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* AI Forecasting & Intelligent Recommendations */}
      <div className="p-5 rounded-2xl bg-slate-905/60 border border-white/[0.06] backdrop-blur-md space-y-4">
        <div className="border-b border-white/[0.05] pb-3 text-left">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-400" />
            รายงานพยากรณ์เชิงวิเคราะห์และแผนกระตุ้นยอดขาย (AI Predictive Insights)
          </h4>
          <p className="text-[9.5px] text-slate-450 font-semibold">แนะนำการเขียนแคปชั่น และจัดรูปแบบ Landing Page เพื่อดึงดูดกลุ่มเซกเมนต์ลูกค้าสำคัญบนนองเอ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-semibold">
          {insights.map((ins) => (
            <div 
              key={ins.id}
              className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.04] flex flex-col justify-between space-y-3 hover:border-orange-500/20 transition-all duration-200"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-md border border-orange-500/20">
                    {ins.metricType}
                  </span>
                  <span className="text-[9px] font-mono font-black text-emerald-450 flex items-center gap-0.5">
                    🤖 {ins.confidence}% Confidence
                  </span>
                </div>
                <h5 className="text-[12.5px] font-black text-white tracking-tight">{ins.title}</h5>
                <p className="text-[10.5px] text-slate-400 leading-relaxed font-normal">{ins.description}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/[0.03] space-y-1">
                <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest leading-none">แคมเปญกระตุ้นแนะนำ</p>
                <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">{ins.recommendedStrategy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
