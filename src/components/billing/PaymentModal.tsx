import React, { useState, useEffect } from "react";
import { PaymentRecord } from "../../services/payments/paymentService";
import { X, Sparkles, CreditCard, Check, AlertCircle, ShieldCheck, Loader2, Copy } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabType: "stripe" | "promptpay";
  paymentRecord: PaymentRecord | null;
  onVerify: (paymentId: string) => Promise<boolean>;
  planName: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  tabType,
  paymentRecord,
  onVerify,
  planName
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"stripe" | "promptpay">(tabType);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins countdown
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveTab(tabType);
    setIsVerified(false);
    setIsProcessing(false);
    setTimerSeconds(300);
  }, [tabType, isOpen]);

  // PromptPay countdown timer
  useEffect(() => {
    if (!isOpen || activeTab !== "promptpay" || isVerified || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, isVerified, timerSeconds]);

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 2) {
      setExpiry(raw);
    } else {
      setExpiry(`${raw.substring(0, 2)}/${raw.substring(2, 4)}`);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setCvc(raw.substring(0, 3));
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRecord) return;
    setIsProcessing(true);
    // Simulate real credit card processing
    setTimeout(async () => {
      try {
        const success = await onVerify(paymentRecord.id);
        if (success) {
          setIsVerified(true);
        } else {
          alert("ไม่สามารถหักบัตรได้ กรุณาลองบัตรอีกใบ");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  const handlePromptPayVerify = async () => {
    if (!paymentRecord) return;
    setIsProcessing(true);
    setTimeout(async () => {
      try {
        const success = await onVerify(paymentRecord.id);
        if (success) {
          setIsVerified(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = () => {
    if (paymentRecord) {
      navigator.clipboard.writeText("Nong A Pay REF: " + paymentRecord.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden bg-[#0d0d11] border border-orange-500/20 rounded-2xl shadow-2xl text-slate-100 flex flex-col">
        {/* Glow Element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-orange-600/10 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="relative flex justify-between items-center px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-md">
              SECURED GATEWAY
            </div>
            <h3 className="text-base font-display font-black text-white">ชำระเงินค่าบริการ</h3>
          </div>
          <button 
            disabled={isProcessing}
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
          {isVerified ? (
            <div className="py-8 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl font-black">
                <Check className="w-8 h-8 stroke-[3px]" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-display font-black text-white">ชำระเงินและอัปเกรดสำเร็จ! 🎉</h4>
                <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto">
                  ระบบดีลเลอร์นวัตกรรมปลดล็อกแล้วสเป็กสุดล้ำของคุณ {planName} พร้อมทำงานแบบเต็มพิกัดใน 24 ชั่วโมง
                </p>
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-left space-y-2 text-xs max-w-xs mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">เลขอ้างอิงชำระ:</span>
                  <span className="font-mono text-slate-200 uppercase">{paymentRecord?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">จำนวนที่บันทึก:</span>
                  <span className="font-display font-bold text-emerald-400">฿{paymentRecord?.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">สถานะโพสต์อนุมัติ:</span>
                  <span className="font-semibold text-emerald-400">ใช้งานได้ไม่จำกัด</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full max-w-xs py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-sm rounded-xl transition shadow-lg shadow-orange-500/15"
              >
                เข้าสู่พอร์ทัลดีลเลอร์โปร
              </button>
            </div>
          ) : (
            <>
              {/* Plan Box */}
              <div className="flex justify-between items-center p-4 bg-white/5 border border-white/[0.04] rounded-xl">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">แพ็กเกจที่เลือก</p>
                  <h4 className="text-base font-display font-bold text-white leading-tight">{planName}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono text-slate-400 uppercase">ราคาชำระ</p>
                  <p className="text-lg font-mono font-black text-orange-500">
                    ฿{paymentRecord?.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Selector Tabs if stripe mock active */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/[0.03] rounded-xl">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setActiveTab("stripe")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "stripe"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/10"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> บัตรเครดิต (Stripe)
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setActiveTab("promptpay")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "promptpay"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🇹🇭 PromptPay QR</span>
                </button>
              </div>

              {activeTab === "stripe" ? (
                /* Stripe Card Form */
                <form onSubmit={handleStripeSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">ชื่อผู้ถือบัตร</label>
                    <input
                      required
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="SOMCHAI DEEJAROEN"
                      className="w-full px-4 py-3 bg-[#111116] border border-white/10 rounded-xl text-sm focus:border-orange-500 focus:outline-none transition uppercase"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">หมายเลขบัตรเครดิต</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full pl-10 pr-4 py-3 bg-[#111116] border border-white/10 rounded-xl text-sm font-mono focus:border-orange-500 focus:outline-none transition"
                      />
                      <CreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">วันหมดอายุ (MM/YY)</label>
                      <input
                        required
                        type="text"
                        value={expiry}
                        onChange={handleExpiryChange}
                        placeholder="12/29"
                        className="w-full px-4 py-3 bg-[#111116] border border-white/10 rounded-xl text-sm font-mono focus:border-orange-500 focus:outline-none transition text-center"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">CVC / CVV</label>
                      <input
                        required
                        type="password"
                        value={cvc}
                        onChange={handleCvcChange}
                        placeholder="***"
                        className="w-full px-4 py-3 bg-[#111116] border border-white/10 rounded-xl text-sm font-mono focus:border-orange-500 focus:outline-none transition text-center"
                      />
                    </div>
                  </div>

                  {/* Safety Guard info */}
                  <div className="flex items-start gap-2.5 p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-xl text-[11px] text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      ข้อมูลบัตรของคุณเข้ารหัสแบบ End-to-End ด้วยมาตรฐาน <strong className="text-slate-200">Stripe PCI-DSS v4.0</strong> โดยไม่มีการเก็บบันทึกบนเซิร์ฟเวอร์หลักของ Nong A ปลอดภัยสูงสุด 3D-Secure
                    </p>
                  </div>

                  <button
                    disabled={isProcessing}
                    type="submit"
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังประมวลผลธุรกรรมผ่าน Stripe...</span>
                      </>
                    ) : (
                      <>
                        <span>หักบัญชีและอัปเกรดแผนทันที 💳</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* PromptPay Form with Qr */
                <div className="space-y-5 text-center">
                  <div className="p-3 bg-blue-600/5 border border-blue-600/10 rounded-xl inline-flex items-center gap-2 select-none mx-auto">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <p className="text-[11px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                      DYNAMIC THAI PROMPTPAY QR
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    เปิดแอปพลิเคชันธนาคารชั้นนำของคุณ (K PLUS, SCB EASY, Krungthai NEXT ฯลฯ) แล้วสแกนคิวอาร์โค้ดด้านล่างเพื่อชำระเงิน
                  </p>

                  {/* QR Box */}
                  <div className="relative p-6 bg-white rounded-2xl max-w-[260px] mx-auto border-4 border-slate-700/20 shadow-inner group">
                    {/* Corner Borders */}
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-blue-900" />
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-blue-900" />
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-blue-900" />
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-blue-900" />

                    <img 
                      src={paymentRecord?.promptpayQr || "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=NongA"} 
                      alt="PromptPay QR" 
                      className="w-full aspect-square object-contain"
                      referrerPolicy="no-referrer"
                    />

                    {/* Laser Scanner animation effect */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 shadow-md shadow-blue-500/50 animate-bounce" />

                    {timerSeconds <= 0 && (
                      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl text-slate-200 p-4">
                        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                        <h5 className="font-bold text-sm">QR Code หมดอายุแล้ว</h5>
                        <p className="text-[10px] text-slate-400 mt-1">กรุณากดส่งคำร้องสร้างใบสแกนใหม่อีกครั้ง</p>
                      </div>
                    )}
                  </div>

                  {/* Timer & Ref details */}
                  <div className="flex justify-center items-center gap-6 py-2.5 font-mono text-xs text-slate-400">
                    <div>
                      <p className="text-[10px] text-slate-500">จำกัดเวลาสแกน</p>
                      <p className="font-bold text-orange-500 text-sm mt-0.5">{formatTime(timerSeconds)}</p>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div>
                      <p className="text-[10px] text-slate-500">รหัสอ้างอิง</p>
                      <button 
                        onClick={handleCopyLink} 
                        className="flex items-center gap-1 font-bold text-slate-200 hover:text-orange-400 transition"
                      >
                        <span className="uppercase">{paymentRecord?.id.substring(0, 10)}</span>
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/[0.03] rounded-xl text-left text-xs text-slate-400 text-center max-w-sm mx-auto leading-relaxed">
                    💡 <strong className="text-slate-200">ยอดชำระตรวจสอบอัตโนมัติ:</strong> ทันทีที่คุณกดยืนยันการโอนเงิน ระบบจะเช็คยอดแบงกกิ้งสลิปอ้างอิงและเปิดสิทธิ์ให้อัตโนมัติในเสี้ยววินาที
                  </div>

                  <button
                    disabled={isProcessing || timerSeconds <= 0}
                    onClick={handlePromptPayVerify}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังยืนยันสลิปผ่านทางด่วน API...</span>
                      </>
                    ) : (
                      <>
                        <span>ฉันชำระเงินเรียบร้อยแล้ว ✅</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
