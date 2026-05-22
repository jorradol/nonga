import React, { useState, useMemo } from "react";
import { DollarSign, Wallet, Percent, Calendar, HeartHandshake, Sparkles } from "lucide-react";
import { Car } from "../../../types";

interface FinancingCalculatorProps {
  car: Car;
  isDarkMode?: boolean;
}

export default function FinancingCalculator({ car, isDarkMode = true }: FinancingCalculatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20); // Default 20% down
  const [customInterestRate, setCustomInterestRate] = useState<number | null>(null);

  const price = car.price;
  const isEv = car.type === "ev" || car.fuelType?.includes("electric");

  // Base interest yearly rates based on car types (EVs typically get green promotional lower rates)
  const baseRate = useMemo(() => {
    if (customInterestRate !== null) return customInterestRate;
    return isEv ? 2.49 : 2.79;
  }, [isEv, customInterestRate]);

  // Compute calculated values
  const calculations = useMemo(() => {
    const downPaymentValue = Math.round(price * (downPaymentPercent / 100));
    const loanAmount = price - downPaymentValue;

    // Output dynamic options for standard monthly installments
    const terms = [48, 60, 72, 84].map((months) => {
      const years = months / 12;
      // Flat-rate formula typical in Thai auto lending:
      // Total Interest = Loan Amount * Flat Rate * Years
      const totalInterest = loanAmount * (baseRate / 100) * years;
      const totalRepay = loanAmount + totalInterest;
      const monthlyInstallment = Math.round(totalRepay / months);

      return {
        months,
        monthlyInterest: Math.round(totalInterest),
        monthlyInstallment,
      };
    });

    return {
      downPaymentValue,
      loanAmount,
      terms,
    };
  }, [price, downPaymentPercent, baseRate]);

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border ${
      isDarkMode 
        ? "bg-slate-900/40 border-white/[0.06] text-white" 
        : "bg-white border-slate-250 text-slate-800"
    } shadow-2xl space-y-6 text-left`}>
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-orange-500/10 pb-4">
        <div className="flex items-center gap-2.5">
          <Wallet className="w-5 h-5 text-orange-500" />
          <h3 className="font-display font-black text-base">เครื่องคำนวณอัตราเงินดาวน์ & ค่างวดผ่อนชำระ</h3>
        </div>
        {isEv && (
          <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />Green Rate -0.30%
          </span>
        )}
      </div>

      {/* Main slide parameters control */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
        {/* Left Column: Sliders */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">เงินดาวน์เริ่มต้น (Down Payment)</span>
              <span className="font-mono text-orange-500 font-bold">{downPaymentPercent}%</span>
            </div>
            
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>ดาวน์ต่ำ 10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>40%</span>
              <span>ดาวน์สูง 50%</span>
            </div>
          </div>

          {/* Quick Stats of downpayment & loan */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850">
              <span className="text-[10px] text-slate-400 block mb-0.5">ยอดเงินดาวน์ของคุณ</span>
              <span className="font-mono font-black text-sm text-white">
                ฿{calculations.downPaymentValue.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850">
              <span className="text-[10px] text-slate-400 block mb-0.5">ยอดขอจัดสินเชื่อ/จัดไฟแนนซ์</span>
              <span className="font-mono font-black text-sm text-slate-350">
                ฿{calculations.loanAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interest Rates & Special promotion banner */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">อัตราดอกเบี้ยจัดไฟแนนซ์ต่อปี (Interest Flat Rate)</span>
              <span className="font-mono text-orange-500 font-bold">{baseRate.toFixed(2)}%</span>
            </div>
            
            {/* Custom choice of interest rate */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: isEv ? "EV Promo (2.49%)" : "Promo (2.79%)", val: isEv ? 2.49 : 2.79 },
                { label: "Standard (2.99%)", val: 2.99 },
                { label: "Exclusive (2.19%)", val: 2.19 },
              ].map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => setCustomInterestRate(r.val)}
                  className={`py-2 px-2.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    baseRate === r.val
                      ? "bg-orange-600/15 border-orange-500 text-orange-500"
                      : "bg-slate-950/30 border-slate-850 text-slate-400 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-orange-600/[0.02] border border-orange-500/10 flex items-start gap-2.5 text-xs text-slate-400 leading-normal">
            <Calendar className="w-5 h-5 text-orange-550 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-350">เครดิตบารมีพิเศษสิทธิ์ NongBot Partner</p>
              <p className="text-[10.5px]">อัตราดอกเบี้ยและยอดชำระนี้เป็นอัตราโดยสังเขป คู่วารันตีดิจิทัลกับธนาคารพันธมิตรของ Nong A ดอกเบี้ยแท้จริงขึ้นอยู่กับประวัติเครดิตเคร่งครัดของพี่ลูกค้าอีกทีนะคร้าบ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outlined Terms Installments Card Grids */}
      <div className="space-y-2.5 pt-3 border-t border-slate-800">
        <span className="text-[11px] font-mono font-black text-slate-400 uppercase tracking-widest block">
          อัตราผ่อนชำระแยกช่วงสัญญา (Terms & Monthly Repayment)
        </span>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {calculations.terms.map((term, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-950/20 border border-white/[0.04] text-center hover:border-orange-500/30 hover:bg-slate-950/40 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="font-mono font-black text-lg text-orange-500">
                  {term.months}
                </span>
                <span className="text-[11px] text-slate-400 ml-1 font-bold">งวด / เดือน</span>
              </div>
              <div className="mt-2.5 py-1 rounded-xl bg-orange-600/10 text-white border border-orange-500/20 mb-1.5 shadow-inner">
                <span className="font-mono font-black text-sm">
                  ฿{term.monthlyInstallment.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-350 block leading-none mt-0.5">/ เดือน</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">
                ดอกเบี้ยรวม ฿{(term.monthlyInterest).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
