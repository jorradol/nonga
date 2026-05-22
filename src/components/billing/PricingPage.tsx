import { useState } from "react";
import { useBilling } from "../../hooks/billing/useBilling";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import PaymentModal from "./PaymentModal";
import { PaymentRecord } from "../../services/payments/paymentService";
import { 
  Sparkles, Check, Info, ShieldCheck, Zap, 
  HelpCircle, ChevronDown, Rocket, Crown, AlertCircle
} from "lucide-react";

interface PricingPageProps {
  onBackToDashboard?: () => void;
}

export default function PricingPage({ onBackToDashboard }: PricingPageProps) {
  const { user, isSimulatedState } = useAuthContext();
  const { subscription, checkoutStripe, checkoutPromptPay, verifyResponsePayment, plans } = useBilling();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"stripe" | "promptpay">("stripe");
  const [activeRecord, setActiveRecord] = useState<PaymentRecord | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<"dealer_pro" | "dealer_premium">("dealer_pro");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const activePlanId = subscription?.planId || "free";

  const handleCheckout = async (planId: "dealer_pro" | "dealer_premium", method: "stripe" | "promptpay") => {
    setSelectedPlanId(planId);
    setModalTab(method);
    
    if (method === "stripe") {
      // Direct Stripe simulation complete
      const payId = await checkoutStripe(planId);
      if (payId) {
        setModalOpen(true);
        // build temporary completed simulation record
        setActiveRecord({
          id: payId,
          userId: user?.uid || "",
          userEmail: user?.email || "",
          amount: plans[planId].price,
          currency: "THB",
          status: "success",
          paymentMethod: "stripe",
          description: `สมัครแผนบริการ ${plans[planId].name}`,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      // PromptPay QR generation
      const payRecord = await checkoutPromptPay(planId);
      if (payRecord) {
        setActiveRecord(payRecord);
        setModalOpen(true);
      }
    }
  };

  const handleVerifyPromptPay = async (paymentId: string) => {
    return await verifyResponsePayment(paymentId);
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const faqs = [
    {
      q: "สมัครแพ็กเกจแล้ว สามารถลงขายรถได้นานแค่ไหน?",
      a: "สำหรับแผน Dealer Pro และ Premium คุณสามารถโพสต์ขายรถกี่คันก็ได้ไม่มีอั้นตลอดอายุการเป็นสมาชิก โดยประกาศของดีลเลอร์จะได้รับการอัพระดับและการบูสต์ประสิทธิภาพแตกต่างกันตามส่วนบริการครับ"
    },
    {
      q: "ระบบ PromptPay ทำงานอย่างไร ปลอดภัยไหม?",
      a: "ระบบชำระเงินของเราใช้คิวอาร์สแกน PromptPay มาตรฐานแบงกิ้งของประเทศไทย รันด้วยเลขอ้างอิงอัจฉริยะแบบเฉพาะเจาะจง สแกนปุ๊บเช็คยอดตรงและเปิดใช้แผนทันทีแบบไร้รอยต่อ ปลอดภัย 100%"
    },
    {
      q: "สามารถสลับหรือยกเลิกแพ็กเกจระหว่างเดือนได้หรือไม่?",
      a: "ได้ตลอดเวลาครับ! คุณสามารถยกเลิกบริการได้ผ่านพอร์ทัลหน้าแดชบอร์ด โดยมีผล ณ วันสิ้นรอบบิลโดยประกาศทั้งหมดจะกลับสู่แผนและจำนวนโควตาตามแผนใช้งานปกติ"
    },
    {
      q: "ฟังก์ชัน AI Auto Reply ของ Dealer Premium ตอบแชทแทนได้ในกรณีใดบ้าง?",
      a: " AI ออโต้ริพลายจะช่วยตอบคิวการต่อราคารถยนต์ ตารางผ่อน และข้อมูลรถเบื้องต้นจากข้อมูลสต็อกที่คุณลงทะเบียนไว้อย่างครอบคลุม ตลอด 24 ชั่วโมง โดยสามารถแจ้งเตือนมายังมือถือดีลเลอร์เพื่อให้เข้ามาปิดการขายด้วยตัวเองได้ครับ"
    }
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-4">
      
      {/* Visual Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto animate-fadeIn">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-600/5 text-orange-400 font-mono text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> MONETIZE & SUBSCRIBES
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-black text-white leading-tight tracking-tight">
          อัปเกรดเพื่อติดสปีดพอร์ตโฟลิโอ <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">ดีลเลอร์รถมือสอง</span>
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          ปลดเอกโควตาการลงขายรถ พร้อมก้าวข้ามขีดจำกัดแบบธรรมดาด้วยสมองกลของน้องเอ AI ส่วนตัวช่วยเขียนโพสต์ ดันกลุ่ม และต่อยอดปิดดีลมัดจำได้จริง 24 ชั่วโมง
        </p>
      </div>

      {user?.membershipType && user.membershipType !== "free" && (
        <div className="p-4 bg-orange-600/10 border border-orange-500/20 rounded-xl max-w-xl mx-auto flex items-center gap-3 text-xs sm:text-sm text-orange-200">
          <Crown className="w-5 h-5 text-orange-400 shrink-0" />
          <div>
            คุณกำลังใช้บริการแผน <strong className="text-white uppercase">{plans[user.membershipType as "dealer_pro" | "dealer_premium"]?.name}</strong> อยู่ในขณะนี้ มีสิทธิ์เข้าใช้งานฟีเจอร์ระดับพรีเมียมทั้งหมดเรียบร้อยแล้ว
          </div>
        </div>
      )}

      {/* Pricing Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* FREE PLAN CARD */}
        <div className={`flex flex-col justify-between p-6 rounded-2xl border transition-all relative ${
          activePlanId === "free"
            ? "bg-[#0f0f13] border-slate-700/60 shadow-lg shadow-black/80"
            : "bg-[#0b0b0e]/70 border-white/[0.04] opacity-80 hover:opacity-100"
        }`}>
          {activePlanId === "free" && (
            <span className="absolute top-4 right-4 text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-slate-300 border border-white/10 rounded-full">
              แผนใช้งานปัจจุบันของคุณ
            </span>
          )}
          <div className="space-y-6">
            <div className="space-y-2 text-left">
              <h4 className="font-display font-black text-lg text-slate-300">Free</h4>
              <p className="text-xs text-slate-400 leading-relaxed">แผนพรีวิวมาร์เก็ตเพลสลงประกาศสำหรับเจ้าของส่วนบุคคล</p>
            </div>

            <div className="text-left py-2 border-y border-white/[0.05]">
              <span className="text-3xl font-mono font-black text-white">฿0</span>
              <span className="text-xs text-slate-400 font-mono"> / ตลอดชีพ</span>
            </div>

            <ul className="space-y-3.5 text-left text-xs text-slate-300">
              {plans.free.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-6">
            <button
              disabled
              className="w-full py-3 bg-white/5 text-slate-500 border border-white/[0.03] font-bold text-xs rounded-xl cursor-default"
            >
              แผนเริ่มต้นสมบูรณ์แบบ
            </button>
          </div>
        </div>

        {/* PRO PLAN CARD */}
        <div className={`flex flex-col justify-between p-6 rounded-2xl border transition-all relative ${
          activePlanId === "dealer_pro"
            ? "bg-[#111116] border-orange-500/50 shadow-xl shadow-orange-500/5"
            : "bg-[#0b0b0e] border-white/[0.04] hover:border-orange-500/20"
        }`}>
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-black font-mono font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-lg">
            <Zap className="w-3 h-3 fill-current" /> BEST VALUE FOR DEALERS
          </div>

          {activePlanId === "dealer_pro" && (
            <span className="absolute top-4 right-4 text-[10px] font-mono font-bold px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/25 rounded-full">
              แผนปัจจุบันของคุณ
            </span>
          )}

          <div className="space-y-6 pt-2">
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-1.5">
                <h4 className="font-display font-black text-xl text-white">Dealer Pro</h4>
                <Rocket className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">สำหรับเต็นท์รถระดับมืออาชีพที่มองหาเครื่องมือจัดระบบและ AI ดราฟต์ข้อความด่วน</p>
            </div>

            <div className="text-left py-2 border-y border-white/[0.05]">
              <span className="text-3.5xl font-mono font-black text-orange-500">฿990</span>
              <span className="text-xs text-slate-400 font-mono"> / เดือน</span>
            </div>

            <ul className="space-y-3.5 text-left text-xs text-slate-200">
              {plans.dealer_pro.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-6 space-y-2.5">
            <button
              onClick={() => handleCheckout("dealer_pro", "stripe")}
              disabled={activePlanId === "dealer_pro" || activePlanId === "dealer_premium"}
              className={`w-full py-3 font-black text-xs sm:text-sm rounded-xl transition duration-150 ${
                activePlanId === "dealer_pro" || activePlanId === "dealer_premium"
                  ? "bg-white/5 text-slate-500 border border-white/[0.03] cursor-not-allowed"
                  : "bg-white text-black hover:bg-slate-200 shadow-md"
              }`}
            >
              {activePlanId === "dealer_pro" ? "กำลังใช้บริการ" : activePlanId === "dealer_premium" ? "เปิดพาสเเวนส์แล้ว" : "ชำระผ่านบัตรเครดิต 💳"}
            </button>
            
            <button
              onClick={() => handleCheckout("dealer_pro", "promptpay")}
              disabled={activePlanId === "dealer_pro" || activePlanId === "dealer_premium"}
              className={`w-full py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 font-bold text-xs rounded-xl transition duration-150 ${
                activePlanId === "dealer_pro" || activePlanId === "dealer_premium" ? "hidden" : "block"
              }`}
            >
              จ่ายเงินผ่านสแกน PromptPay 🇹🇭
            </button>
          </div>
        </div>

        {/* PREMIUM PLAN CARD */}
        <div className={`flex flex-col justify-between p-6 rounded-2xl border transition-all relative ${
          activePlanId === "dealer_premium"
            ? "bg-[#131118] border-purple-500/50 shadow-xl shadow-purple-500/5"
            : "bg-[#0b0b0e] border-white/[0.04] hover:border-purple-500/20"
        }`}>
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-mono font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-lg">
            <Crown className="w-3 h-3 text-amber-300 fill-current" /> VIP ALL INCLUSIVE
          </div>

          {activePlanId === "dealer_premium" && (
            <span className="absolute top-4 right-4 text-[10px] font-mono font-bold px-2.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/25 rounded-full">
              แผนปัจจุบันของคุณ
            </span>
          )}

          <div className="space-y-6 pt-2">
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-1.5">
                <h4 className="font-display font-black text-xl text-white">Dealer Premium</h4>
                <Crown className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">ท็อปสุดระดับองค์กรรวมระบบปิดการขายอัตโนมัติ 24 ชม. และสเป็ก SEO แบบขยายฐานดีเด็ด</p>
            </div>

            <div className="text-left py-2 border-y border-white/[0.05]">
              <span className="text-3.5xl font-mono font-black text-purple-400">฿2,490</span>
              <span className="text-xs text-slate-400 font-mono"> / เดือน</span>
            </div>

            <ul className="space-y-3.5 text-left text-xs text-slate-200">
              {plans.dealer_premium.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-6 space-y-2.5">
            <button
              onClick={() => handleCheckout("dealer_premium", "stripe")}
              disabled={activePlanId === "dealer_premium"}
              className={`w-full py-3 font-black text-xs sm:text-sm rounded-xl transition duration-150 ${
                activePlanId === "dealer_premium"
                  ? "bg-white/5 text-slate-500 border border-white/[0.03] cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/15"
              }`}
            >
              {activePlanId === "dealer_premium" ? "กำลังใช้บริการ" : "อัปเลเวลพรีเมียมบัตรเครดิต 💳"}
            </button>
            <button
              onClick={() => handleCheckout("dealer_premium", "promptpay")}
              disabled={activePlanId === "dealer_premium"}
              className={`w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 font-bold text-xs rounded-xl transition duration-150 ${
                activePlanId === "dealer_premium" ? "hidden" : "block"
              }`}
            >
              จ่ายเงินผ่านสแกน PromptPay 🇹🇭
            </button>
          </div>
        </div>

      </div>

      {/* Feature Comparison Matrix */}
      <div className="p-6 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-6 text-left">
        <div className="space-y-1">
          <h4 className="font-display font-black text-lg text-white">ตารางเปรียบเทียบสิทธิประโยชน์อย่างละเอียด</h4>
          <p className="text-slate-400 text-xs text-slate-400">สรุปขีดความสามารถการใช้งานในทุกระดับที่คุณเป็นผู้ครอบครอง</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-white/10 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">ฟังก์ชัน / สิทธิ์การใช้งาน</th>
                <th className="py-3 px-4">Free</th>
                <th className="py-3 px-4 text-orange-400">Dealer Pro</th>
                <th className="py-3 px-4 text-purple-400">Dealer Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">โควตาลงขายหน้ารถสูงสุด</td>
                <td className="py-3.5 px-4">5 คันเท่านั้น</td>
                <td className="py-3.5 px-4 font-medium text-emerald-400">ไม่จำกัดคัน (Unlimited)</td>
                <td className="py-3.5 px-4 font-medium text-emerald-400">ไม่จำกัดคัน (Unlimited)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">นวัตกรรม AI เขียนรายละเอียดสเป็กและผ่อน 🪄</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400">ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400">ใช่</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">เปิดเพจโชว์รูมดีลเลอร์ลิขสิทธิ์โฉมใหม่ 🏪</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400">ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400">ใช่</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">แผงวิเคราะห์พอร์ตข้อมูล (Insights Dashboard)</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400">ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400">ใช่</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">ระบบแชท AI Auto Reply ตอบแทนด่วน 🤖</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">ใช่</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">สิทธิ์ AI ช่วยขายปิดจองมัดจำ (Sales Assistant)</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">ใช่</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-200">ระบบดันประกาศและแชร์ดัน SEO Google</td>
                <td className="py-3.5 px-4">ไม่ใช่</td>
                <td className="py-3.5 px-4 text-slate-500">จำกัด</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">ดัน VIP ทุกวัน</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQs Panel */}
      <div className="space-y-6 text-left max-w-3xl mx-auto">
        <div className="text-center space-y-1.5 pb-2">
          <HelpCircle className="w-8 h-8 text-orange-500 mx-auto" />
          <h4 className="font-display font-black text-xl text-white">คำถามที่พบบ่อย (FAQ)</h4>
          <p className="text-slate-400 text-xs">หากคุณมีข้อสงสัยเกี่ยวกับระบบการรับเงิน การสมัครแพ็กเกจ มีคำตอบที่นี่ครับ</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="border border-white/[0.04] bg-white/[0.01] rounded-xl overflow-hidden transition"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-5 py-4 flex justify-between items-center text-slate-200 font-semibold text-xs sm:text-sm hover:bg-white/5 transition text-left"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaqIndex === idx ? "rotate-180 text-orange-500" : ""}`} />
              </button>
              
              {openFaqIndex === idx && (
                <div className="px-5 pb-4 pt-1 text-slate-400 text-xs leading-relaxed border-t border-white/[0.03]">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/[0.05]">
        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-center space-y-1">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
          <h5 className="font-bold text-xs text-slate-200">ตรวจสอบความปลอดภัยสากล</h5>
          <p className="text-[10px] text-slate-400">มาตรฐาน PCI-DSS</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-center space-y-1">
          <Zap className="w-5 h-5 text-orange-400 mx-auto" />
          <h5 className="font-bold text-xs text-slate-200 font-display">ระบบสแกน PromptPay 🇹🇭</h5>
          <p className="text-[10px] text-slate-400">สลิปเช็คยอดด่วนเปิดใช้ทันที</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-center space-y-1">
          <Crown className="w-5 h-5 text-purple-400 mx-auto" />
          <h5 className="font-bold text-xs text-slate-200">AI ปรึกษาช่วยปิดแชทได้จริง</h5>
          <p className="text-[10px] text-slate-400">เพิ่มยอดดีลตักตวงมัดจำ</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0d0d10] border border-orange-500/10 text-center space-y-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-8 h-8 bg-orange-500/10 rounded-full blur-md" />
          <AlertCircle className="w-5 h-5 text-[#ff8000] mx-auto" />
          <h5 className="font-bold text-xs text-slate-100 font-display">คืนเงินใน 7 วันไม่มีเงื่อนไข</h5>
          <p className="text-[10px] text-slate-400">การรับประกันความพึงพอใจ 100%</p>
        </div>
      </div>

      {/* Button Navigate back */}
      {onBackToDashboard && (
        <div className="pt-4 text-center">
          <button
            onClick={onBackToDashboard}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-white/5 transition"
          >
            ← กลับไปที่แผงควบคุมหลัก
          </button>
        </div>
      )}

      {/* Payment Gateway Modal */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tabType={modalTab}
        paymentRecord={activeRecord}
        onVerify={handleVerifyPromptPay}
        planName={plans[selectedPlanId].name}
      />

    </div>
  );
}
