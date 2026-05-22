import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Rocket, Sparkles, Award, TrendingUp, HelpCircle, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { useBoost } from "../../hooks/boost/useBoost";
import { useBilling } from "../../hooks/billing/useBilling";
import { CarListing } from "../../types/cars";

interface BoostPurchaseFlowProps {
  car: CarListing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BoostPurchaseFlow({ car, isOpen, onClose, onSuccess }: BoostPurchaseFlowProps) {
  const { plans, applyBoostMutation, applyDirectCashBoostMutation } = useBoost();
  const { premium, loading: loadingBilling, refreshBillingData } = useBilling();

  const [selectedPlanId, setSelectedPlanId] = useState<keyof typeof plans>("7_days");
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<"tokens" | "cash">("tokens");
  const [step, setStep] = useState<"setup" | "promptpay" | "processing" | "completed">("setup");

  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [qrCounter, setQrCounter] = useState<number>(300); // 5 minutes timer
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const selectedPlan = plans[selectedPlanId];
  const userTokens = premium?.boostTokens || 0;
  const isSufficientTokens = userTokens >= selectedPlan.tokenCost;

  // Sync state initially
  useEffect(() => {
    if (isOpen) {
      setStep("setup");
      setQrCounter(300);
      setErrorLocal(null);
      setPendingPayment(null);
      refreshBillingData();
    }
  }, [isOpen, refreshBillingData]);

  // PromptPay countdown
  useEffect(() => {
    if (step !== "promptpay" || qrCounter <= 0) return;
    const interval = setInterval(() => {
      setQrCounter(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, qrCounter]);

  if (!isOpen) return null;

  const handleApplyBoost = async () => {
    setErrorLocal(null);
    try {
      if (paymentMethod === "tokens") {
        if (!isSufficientTokens) {
          setErrorLocal("จำนวนโทเค็นบูสต์สะสมของคุณไม่เพียงพอ กรุณาเลือกจ่ายด้วยเงินสดช่องทาง QR PromptPay ด้านล่าง");
          return;
        }

        setStep("processing");
        const res = await applyBoostMutation.mutateAsync({
          carId: car.id,
          planId: selectedPlanId,
          autoRenew,
          paymentMethod: "tokens"
        });

        if (res.status === "success") {
          setStep("completed");
          if (onSuccess) onSuccess();
        }
      } else {
        // Cash billing path -> creates pending transaction with QR Code
        setStep("processing");
        const res = await applyBoostMutation.mutateAsync({
          carId: car.id,
          planId: selectedPlanId,
          autoRenew,
          paymentMethod: "cash"
        });

        if (res.status === "pending_payment") {
          setPendingPayment(res.payment);
          setStep("promptpay");
        }
      }
    } catch (err: any) {
      setErrorLocal(err.message || "เกิดข้อผิดพลาดในการบูสต์โพสต์");
      setStep("setup");
    }
  };

  const handleSimulatePaymentSuccess = async () => {
    if (!pendingPayment) return;
    setErrorLocal(null);
    setStep("processing");
    try {
      await applyDirectCashBoostMutation.mutateAsync({
        paymentId: pendingPayment.id,
        carId: car.id,
        planId: selectedPlanId,
        autoRenew
      });
      setStep("completed");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorLocal(err.message || "เกิดข้อผิดพลาดในการยืนยันรายการจ่ายเงินสด");
      setStep("promptpay");
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const ss = secs % 60;
    return `${mins}:${ss.toString().padStart(2, "0")}`;
  };

  const planIcons = {
    "7_days": Rocket,
    "30_days": Award,
    "homepage_spotlight": Sparkles,
    "ai_trending": TrendingUp
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(255,107,0,0.15)] text-zinc-100"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Rocket className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">เพิ่มระดับการมองเห็นด้วยชุดโปรโมตโพสต์</h2>
              <p className="text-xs text-zinc-400">ดึงดูดสายตาผู้ซื้อด้วยฟังก์ชันพรีเมียมอิมแพกต์จัดเต็ม</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTAINER CONTENT */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {errorLocal && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errorLocal}
            </div>
          )}

          {/* STEP 1: SETUP CHOOSE PLANS */}
          {step === "setup" && (
            <div className="space-y-6">
              {/* Target Car Header Preview */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                <img
                  src={car.coverImage}
                  alt={car.title}
                  className="h-14 w-20 object-cover rounded-lg bg-zinc-800 shrink-0"
                />
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 line-clamp-1">{car.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <span>{car.brand} {car.model}</span>
                    <span>•</span>
                    <span className="text-orange-500 font-semibold">{car.price.toLocaleString("th-TH")} บาท</span>
                  </div>
                </div>
              </div>

              {/* Plans Selection Grid */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase">เลือกแพลนโปรโมตที่เหมาะสม:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(plans).map((plan) => {
                    const IconComp = planIcons[plan.id as keyof typeof plans];
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id as any)}
                        className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-300 relative ${
                          isSelected
                            ? "border-orange-500 bg-orange-500/5 shadow-[0_4px_20px_rgba(255,107,0,0.06)] scale-[1.01]"
                            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center p-0.5">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                        <div className={`p-2 rounded-xl w-10 h-10 flex items-center justify-center mb-3 ${
                          isSelected ? "bg-orange-500/20 text-orange-500" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          <IconComp className="h-5 w-5" />
                        </div>
                        <h4 className="font-bold text-sm text-zinc-100">{plan.name}</h4>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 min-h-[2rem]">{plan.description}</p>
                        
                        <div className="flex items-center justify-between w-full mt-4 pt-3 border-t border-zinc-800">
                          <div>
                            <span className="text-lg font-bold text-orange-500">{plan.tokenCost}</span>
                            <span className="text-[10px] text-zinc-400 ml-1">โทเค็น</span>
                          </div>
                          <span className="text-xs text-zinc-400">หรือ ฿{plan.priceThb} จ่ายสด</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Auto Renew Configuration & Token Overview */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">เปิดบิลต่อเนื่องอัตโนมัติ (Auto-Renew)</h4>
                  <p className="text-xs text-zinc-400">ต่ออายุแคมเปญอัตโนมตเมื่อหมดอายุ เพื่อคงความแรงสม่ำเสมอ</p>
                </div>
                <button
                  onClick={() => setAutoRenew(prev => !prev)}
                  className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
                    autoRenew ? "bg-orange-500" : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-zinc-950 transition-transform duration-200 transform ${
                      autoRenew ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Choose Payment Strategy */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 tracking-wider uppercase">เลือกช่องทางการชำระเงิน:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("tokens")}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200 ${
                      paymentMethod === "tokens"
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-800"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${paymentMethod === "tokens" ? "bg-orange-500/10 text-orange-500" : "bg-zinc-900 text-zinc-400"}`}>
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">จ่ายด้วยโทเค็นสะสม</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        คงเหลือ: <span className="text-orange-500 font-bold">{loadingBilling ? "..." : userTokens} โทเค็น</span>
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200 ${
                      paymentMethod === "cash"
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-800"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${paymentMethod === "cash" ? "bg-orange-500/10 text-orange-500" : "bg-zinc-900 text-zinc-400"}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">สแกน QR PromptPay</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">จ่ายตามจริง ฿{selectedPlan.priceThb}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Button Trigger */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400 block font-medium">สรุปค่าใช้จ่าย:</span>
                  <p className="text-lg font-bold text-orange-500">
                    {paymentMethod === "tokens" ? `${selectedPlan.tokenCost} โทเค็น` : `${selectedPlan.priceThb.toLocaleString()} บาท`}
                  </p>
                </div>
                <button
                  onClick={handleApplyBoost}
                  disabled={paymentMethod === "tokens" && !isSufficientTokens}
                  className={`px-8 py-3.5 rounded-2xl font-bold font-sans text-sm tracking-wide transition-all duration-300 shadow-lg ${
                    paymentMethod === "tokens" && !isSufficientTokens
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                      : "bg-orange-500 text-zinc-950 hover:bg-orange-600 hover:shadow-orange-500/10 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  {paymentMethod === "tokens" ? "ยืนยันการใช้โทเค็นโปรโมต" : "สร้าง QR Code ชำระเงินสด"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROMPTPAY DYNAMIC CHECKOUT MODAL QR */}
          {step === "promptpay" && pendingPayment && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
              <div>
                <h3 className="text-lg font-bold">สแกน QR Code เพื่อชำระค่าบริการบูสต์โพสต์</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  ยอดชำระ: <span className="text-orange-500 font-bold text-sm">฿{selectedPlan.priceThb.toFixed(2)} THB</span>
                </p>
              </div>

              {/* Dynamic Thailand Standard QR Code Layout */}
              <div className="relative p-6 bg-white rounded-3xl shadow-xl flex flex-col items-center">
                <div className="w-52 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col items-center justify-center px-4 mb-4 select-none shrink-0 overflow-hidden">
                  <div className="text-sky-400 text-xs font-bold tracking-widest font-sans flex items-center gap-1">
                    <span>ตู้กดเงินอัติโนมัติ</span>
                    <span className="text-[10px] uppercase font-mono bg-sky-950 px-1 py-0.5 rounded text-sky-400">Prompt Pay</span>
                  </div>
                  <span className="text-[9px] text-zinc-400">สถาบันรับเงินสดสากล</span>
                </div>

                <img
                  src={pendingPayment.promptpayQr}
                  alt="PromptPay QR Code"
                  className="w-48 h-48 block rounded-lg select-none"
                />

                <span className="text-[10px] text-zinc-400 mt-3 font-medium select-none text-zinc-500">
                  สแกนผ่านแอปการเงิน / Mobile Banking ได้ทุกรหัสธนาคาร
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5 bg-zinc-950 border border-zinc-800/80 rounded-2xl px-5 py-3 text-xs w-full max-w-sm">
                <span className="text-zinc-400">รหัสอ้างอิง: <strong className="text-zinc-200">{pendingPayment.id}</strong></span>
                <span className="text-zinc-500 font-mono">หมดอายุภายใน : <strong className="text-orange-500">{formatTime(qrCounter)}</strong></span>
              </div>

              {/* Sandboxed Simulate QR Button */}
              <div className="flex flex-col gap-2 w-full max-w-sm pt-4 border-t border-zinc-800/60">
                <button
                  onClick={handleSimulatePaymentSuccess}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 active:scale-98 text-zinc-950 font-bold rounded-2xl transition-all duration-200 shadow-md text-sm cursor-pointer"
                >
                  จำลองการสแกนจ่ายเงินสำเร็จ (Verified Payment ✅)
                </button>
                <button
                  onClick={() => setStep("setup")}
                  className="w-full py-2.5 bg-zinc-800/40 hover:bg-zinc-800 hover:text-white rounded-2xl text-xs text-zinc-400 transition-all duration-200"
                >
                  ย้อนกลับแก้ไขวิธีชำระเงิน
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING BACKEND LOOPS */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
              <div>
                <h3 className="font-bold text-zinc-200 text-base">กำลังประมวลผลธุรกรรมทางการเงิน...</h3>
                <p className="text-xs text-zinc-400 mt-1">น้องเอ AI กำลังจัดเตรียมโครงสร้างและคิวจัดอันดับโพสต์ของคุณให้สูงที่สุด</p>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS OUTCOMES */}
          {step === "completed" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-10 w-10 animate-bounce" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-bold text-zinc-100">เรียบร้อย! โพสต์ของคุณได้รับการบูสต์แล้ว 🎉</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  สวิตช์เปิดตัวเรียบร้อยแล้ว แพลน <strong>{selectedPlan.name}</strong> จะทำงานในระบบของ Nong A ทันที โพสต์รถยนต์ของคุณจะถูกเพิ่มระดับจัดคิวสูงสุดในทุกระบบนำค้นหา
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/60 text-xs w-full max-w-md text-left space-y-2 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">รหัสอ้างอิงแคมเปญ:</span>
                  <span className="font-mono text-zinc-200">CAMPAIGN-BOOST-{car.id.substring(0,6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ระยะเวลาใช้การได้:</span>
                  <span className="text-zinc-200">{selectedPlan.durationDays} วัน</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">เปิดบิลอัตโนมัติ (Auto-Renew):</span>
                  <span className={autoRenew ? "text-green-500 font-bold" : "text-zinc-500 font-bold"}>{autoRenew ? "เปิด" : "ปิด"}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-8 py-3 bg-zinc-200 hover:bg-white text-zinc-950 font-bold text-sm rounded-2xl transition-colors w-full max-w-md"
              >
                เสร็จสิ้น ปิดหน้าต่างนี้
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
export default BoostPurchaseFlow;
