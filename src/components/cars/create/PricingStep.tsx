import React, { useState, useEffect } from "react";
import { Coins, PiggyBank, Sparkles, TrendingUp, Compass, ArrowRight } from "lucide-react";

interface PricingStepProps {
  price: number;
  negotiable: boolean;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuelType: string;
  onChange: (fields: { price: number; negotiable: boolean }) => void;
  isDarkMode: boolean;
}

export default function PricingStep({
  price,
  negotiable,
  brand,
  model,
  year,
  mileage,
  fuelType,
  onChange,
  isDarkMode,
}: PricingStepProps) {
  const [estimatedRange, setEstimatedRange] = useState<{ min: number; max: number; average: number } | null>(null);

  // Auto pricing optimization algorithm to calculate suggested boundaries
  useEffect(() => {
    // Base default heuristic values
    let basePrice = 800050; // default for unknown
    
    if (brand.toLowerCase().includes("tesla")) {
      basePrice = model.toLowerCase().includes("y") ? 1490000 : 1290000;
    } else if (brand.toLowerCase().includes("byd")) {
      basePrice = model.toLowerCase().includes("seal") ? 1190000 : 790000;
    } else if (brand.toLowerCase().includes("toyota")) {
      basePrice = model.toLowerCase().includes("fortuner") ? 1290000 : 780000;
    } else if (brand.toLowerCase().includes("honda")) {
      basePrice = model.toLowerCase().includes("civic") ? 920000 : 640000;
    } else if (brand.toLowerCase().includes("porsche")) {
      basePrice = 4590000;
    } else if (brand.toLowerCase().includes("bmw")) {
      basePrice = 1890000;
    }

    // Depreciation based on year differences
    const age = Math.max(0, new Date().getFullYear() - year);
    const yearDepreciation = Math.pow(0.92, age); // 8% depreciation per year

    // Depreciation based on mileage
    const mileageDepreciation = Math.max(0.65, 1 - (mileage / 350000) * 0.15); // max 35% drop for extreme mileage

    const calculatedAvg = Math.round(basePrice * yearDepreciation * mileageDepreciation);
    const calculatedMin = Math.round(calculatedAvg * 0.88);
    const calculatedMax = Math.round(calculatedAvg * 1.12);

    setEstimatedRange({
      min: Math.max(20000, calculatedMin),
      max: Math.max(30000, calculatedMax),
      average: Math.max(25000, calculatedAvg)
    });
  }, [brand, model, year, mileage]);

  // Suggested values button click
  const handleApplyAverage = () => {
    if (estimatedRange) {
      onChange({ price: estimatedRange.average, negotiable });
    }
  };

  // Pricing gauge thermometer position
  const getProgressPercent = () => {
    if (!estimatedRange || price <= 0) return 0;
    const { min, max } = estimatedRange;
    if (price <= min) return 5;
    if (price >= max) return 95;
    return Math.round(((price - min) / (max - min)) * 100);
  };

  const getPriceCategory = () => {
    const percent = getProgressPercent();
    if (percent === 0) return { label: "ระบุราคาตั้งขายสด", color: "text-slate-400" };
    if (percent < 30) return { label: "ราคาต่ำกว่าตลาด (คุ้มค่าด่วนคนทักถล่มทลาย) 🔥", color: "text-emerald-500" };
    if (percent <= 70) return { label: "ราคาสมดุลเกณฑ์มาตรฐานโชว์รูมทั่วไป 👍", color: "text-orange-500" };
    return { label: "ราคาสูงกว่าเกณฑ์เฉลี่ย (รถคุณภาพคัดสภาพพร้อมโปรแกรมรับประกัน) 💎", color: "text-red-500" };
  };

  const calculateInstallment = () => {
    if (price <= 0) return 0;
    // Calculate 84-month installment (approx 20% down, 3.5% interest flat rate)
    const principal = price * 0.8;
    const totalInterest = principal * 0.035 * 7; // 7 years lease
    const monthly = (principal + totalInterest) / 84;
    return Math.round(monthly);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-orange-500/10 pb-3">
        <Coins className="w-5 h-5 text-orange-500" />
        <div className="text-left">
          <h3 className="text-base font-extrabold text-orange-500">4. สรุปมูลค่าราคาจำหน่าย</h3>
          <p className="text-[11px] text-slate-400">ระบุราคานำเสนอและดูตรรกวิเคราะห์ความสอดคล้องตลาดเสรี</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
        
        {/* Set explicit price */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>ราคาขายสุทธิ (บาท THB) *</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-orange-500">฿</span>
            <input
              type="number"
              value={price || ""}
              onChange={(e) => onChange({ price: Number(e.target.value), negotiable })}
              placeholder="กรอกราคา เช่น 890000"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition-all font-black text-orange-400 text-lg"
            />
          </div>
          {price > 0 && (
            <p className="text-[10.5px] font-mono text-slate-400 leading-none">
              เท่ากับ {(price).toLocaleString()} บาทถ้วน
            </p>
          )}
        </div>

        {/* Negotiability Toggles */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 block">เงื่อนไขและการตกลงราคา</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ price, negotiable: true })}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                negotiable
                  ? "border-orange-500 bg-orange-550/10 text-orange-500 scale-[1.01]"
                  : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-slate-900"
              }`}
            >
              <PiggyBank className="w-4 h-4" /> ยินดีต่อรองราคาได้อีก 🤝
            </button>
            <button
              type="button"
              onClick={() => onChange({ price, negotiable: false })}
              className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                !negotiable
                  ? "border-orange-500 bg-orange-550/10 text-orange-500 scale-[1.01]"
                  : "border-white/5 bg-slate-900/40 text-slate-400 hover:bg-slate-900"
              }`}
            >
              ราคาสุทธิ Net Price 🔒
            </button>
          </div>
        </div>

        {/* Smart Price Suggestion tool (The real-time valuation recommendation) */}
        {estimatedRange && brand && model && (
          <div className="md:col-span-2 p-5.5 rounded-2xl border bg-[#0f0f13] border-orange-500/15 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-orange-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-bounce" />
                <span>Nong A Smart Price Assistant (เครื่องคำนวณราคากลาง)</span>
              </span>
              <button
                type="button"
                onClick={handleApplyAverage}
                className="px-3.5 py-1.5 rounded-lg bg-orange-550 hover:bg-orange-600 text-white text-[10.5px] font-bold transition-all shrink-0 uppercase tracking-wider"
              >
                ใช้ราคาเฉลี่ยตลาดเพื่อดึงคนทักด่วน 🪄
              </button>
            </div>

            <div className="text-slate-400 text-xs leading-relaxed">
              วิเคราะห์ความสอดคล้องความคุ้มค่ารถ <strong className="text-white">{brand} {model}</strong> ปี <strong className="text-white">{year}</strong> เลขไมล์สะสม <strong className="text-white">{(mileage).toLocaleString()} กม.</strong>
            </div>

            {/* Horizontal pricing bracket thermometer visual */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 font-mono">
                <span>ราคาต่ำสุด: ฿{(estimatedRange.min).toLocaleString()}</span>
                <span className="text-orange-500">ราคากลางเฉลี่ย: ฿{(estimatedRange.average).toLocaleString()}</span>
                <span>ราคาสูงสุด: ฿{(estimatedRange.max).toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden relative">
                {/* Visual marker of entered price */}
                {price > 0 && (
                  <div
                    className="absolute bg-orange-500 w-5 h-5 top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white ring-4 ring-orange-500/15 transition-all duration-300 flex items-center justify-center shadow"
                    style={{ left: `${getProgressPercent()}%` }}
                  >
                    <TrendingUp className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                {/* 3-Color background brackets: Green-Orange-Red */}
                <div className="w-full h-full flex">
                  <div className="w-1/3 h-full bg-emerald-500/40"></div>
                  <div className="w-1/3 h-full bg-orange-550/40 border-x border-black/10"></div>
                  <div className="w-1/3 h-full bg-red-500/40"></div>
                </div>
              </div>
            </div>

            {price > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[11px] font-bold text-slate-400 uppercase">ดัชนีจุดขาย:</span>
                <span className={`text-[11px] font-extrabold ${getPriceCategory().color} uppercase`}>
                  {getPriceCategory().label}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Premium Monthly Lease Installment estimation helper */}
        {price > 0 && (
          <div className="md:col-span-2 p-4 rounded-xl border bg-slate-900/45 border-white/5 flex items-center justify-between">
            <div className="text-left space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-mono">ประมาณตารางตารางผ่อนชำระ</span>
              <span className="text-xs font-semibold text-slate-300">ตารางตกลงผ่อนระยะยาว 84 งวด (เงื่อนไขมาตรฐาน 20% Down)</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 leading-none block">เฉลี่ยเริ่มต้นเพียง</span>
              <span className="font-mono font-black text-lg text-orange-500">฿{calculateInstallment().toLocaleString()} <span className="text-xs font-normal text-slate-400">/ เดือน</span></span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
