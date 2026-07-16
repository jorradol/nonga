import React, { useState, useMemo } from "react";
import { Wallet, Calendar, Sparkles } from "lucide-react";
import { Car } from "../../../types";
import {
  calculateFlatRateFinance,
  STANDARD_FINANCE_TERMS_MONTHS,
} from "../../../utils/financeCalculator";

interface FinancingCalculatorProps {
  car: Car;
  isDarkMode?: boolean;
}

export default function FinancingCalculator({ car }: FinancingCalculatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20); // Default 20% down
  const [customInterestRate, setCustomInterestRate] = useState<number | null>(null);

  const price = car.price;
  const isEv = car.type === "ev" || car.fuelType?.includes("electric");

  // Base interest yearly rates based on car types (EVs typically get green promotional lower rates)
  const baseRate = useMemo(() => {
    if (customInterestRate !== null) return customInterestRate;
    return isEv ? 2.49 : 2.79;
  }, [isEv, customInterestRate]);

  const calculations = useMemo(() => {
    const first = calculateFlatRateFinance({
      carPrice: price,
      downPaymentPercent,
      annualFlatRatePercent: baseRate,
      termMonths: STANDARD_FINANCE_TERMS_MONTHS[0],
    });

    const terms = STANDARD_FINANCE_TERMS_MONTHS.map((months) => {
      const result = calculateFlatRateFinance({
        carPrice: price,
        downPaymentPercent,
        annualFlatRatePercent: baseRate,
        termMonths: months,
      });
      return {
        months,
        monthlyInterest: result.totalInterest,
        monthlyInstallment: result.monthlyInstallment,
      };
    });

    return {
      downPaymentValue: first.downPaymentBaht,
      loanAmount: first.loanAmount,
      terms,
    };
  }, [price, downPaymentPercent, baseRate]);

  return (
    <div className="p-6 sm:p-8 rounded-3xl border nonga-bg-surface nonga-border nonga-text-primary shadow-2xl space-y-6 text-left">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-orange-500/20 pb-4">
        <div className="flex items-center gap-2.5">
          <Wallet className="w-5 h-5 text-[var(--nonga-action-primary)]" />
          <h3 className="font-display font-black text-base nonga-text-primary">เครื่องคำนวณอัตราเงินดาวน์ & ค่างวดผ่อนชำระ</h3>
        </div>
        {isEv && (
          <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1">
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
              <span className="nonga-text-secondary">เงินดาวน์เริ่มต้น (Down Payment)</span>
              <span className="font-mono text-[var(--nonga-action-primary)] font-bold">{downPaymentPercent}%</span>
            </div>
            
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
              className="w-full h-1.5 nonga-bg-subtle rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            
            <div className="flex justify-between text-[10px] nonga-text-muted font-mono">
              <span>ดาวน์ต่ำ 10%</span>
              <span>20%</span>
              <span>30%</span>
              <span>40%</span>
              <span>ดาวน์สูง 50%</span>
            </div>
          </div>

          {/* Quick Stats of downpayment & loan */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl nonga-bg-subtle border nonga-border">
              <span className="text-[10px] nonga-text-muted block mb-0.5 font-semibold">ยอดเงินดาวน์ของคุณ</span>
              <span className="font-mono font-black text-sm nonga-text-primary">
                ฿{calculations.downPaymentValue.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl nonga-bg-subtle border nonga-border">
              <span className="text-[10px] nonga-text-muted block mb-0.5 font-semibold">ยอดขอจัดสินเชื่อ/จัดไฟแนนซ์</span>
              <span className="font-mono font-black text-sm nonga-text-secondary">
                ฿{calculations.loanAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interest Rates & Special promotion banner */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="nonga-text-secondary">อัตราดอกเบี้ยจัดไฟแนนซ์ต่อปี (Interest Flat Rate)</span>
              <span className="font-mono text-[var(--nonga-action-primary)] font-bold">{baseRate.toFixed(2)}%</span>
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
                  className={`py-2 px-2.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer nonga-focus-ring ${
                    baseRate === r.val
                      ? "bg-orange-600/15 border-[var(--nonga-action-primary)] text-[var(--nonga-action-primary)]"
                      : "nonga-bg-subtle nonga-border nonga-text-secondary hover:text-[var(--nonga-text-primary)]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl nonga-bg-subtle border border-orange-500/15 flex items-start gap-2.5 text-xs nonga-text-secondary leading-normal">
            <Calendar className="w-5 h-5 text-[var(--nonga-action-primary)] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold nonga-text-primary">เครดิตบารมีพิเศษสิทธิ์ NongBot Partner</p>
              <p className="text-[10.5px] nonga-text-secondary">อัตราดอกเบี้ยและยอดชำระนี้เป็นอัตราโดยสังเขป คู่วารันตีดิจิทัลกับธนาคารพันธมิตรของ Nong A ดอกเบี้ยแท้จริงขึ้นอยู่กับประวัติเครดิตเคร่งครัดของพี่ลูกค้าอีกทีนะคร้าบ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Outlined Terms Installments Card Grids */}
      <div className="space-y-2.5 pt-3 border-t nonga-border">
        <span className="text-[11px] font-mono font-black nonga-text-muted uppercase tracking-widest block">
          อัตราผ่อนชำระแยกช่วงสัญญา (Terms & Monthly Repayment)
        </span>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {calculations.terms.map((term, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl nonga-bg-subtle border nonga-border text-center hover:border-orange-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="font-mono font-black text-lg text-[var(--nonga-action-primary)]">
                  {term.months}
                </span>
                <span className="text-[11px] nonga-text-secondary ml-1 font-bold">งวด / เดือน</span>
              </div>
              <div className="mt-2.5 py-1 rounded-xl bg-orange-600/10 nonga-text-primary border border-orange-500/20 mb-1.5 shadow-inner">
                <span className="font-mono font-black text-sm">
                  ฿{term.monthlyInstallment.toLocaleString()}
                </span>
                <span className="text-[9px] nonga-text-muted block leading-none mt-0.5">/ เดือน</span>
              </div>
              <span className="text-[9px] nonga-text-muted font-mono">
                ดอกเบี้ยรวม ฿{(term.monthlyInterest).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
