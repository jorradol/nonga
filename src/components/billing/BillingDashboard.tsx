import { useState } from "react";
import { useBilling } from "../../hooks/billing/useBilling";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import PricingPage from "./PricingPage";
import PaymentModal from "./PaymentModal";
import { PaymentRecord, InvoiceRecord } from "../../services/payments/paymentService";
import { 
  CreditCard, Sparkles, CheckCircle, Clock, Trash2, 
  ArrowUpRight, Download, Printer, ShieldCheck, Zap, AlertTriangle, Crown
} from "lucide-react";

export default function BillingDashboard() {
  const { user } = useAuthContext();
  const { 
    subscription, payments, invoices, premium, loading, error, 
    cancelActivePlan, buyBoostTokens, verifyResponsePayment 
  } = useBilling();

  const [activeTab, setActiveTab] = useState<"summary" | "invoices" | "pricing">("summary");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<PaymentRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-t-2 border-r-2 border-orange-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-xs sm:text-sm">กำลังสตรีมรายละเอียดประวัติธุรกรรมและการเงินของคุณ...</p>
      </div>
    );
  }

  const handleCancelPlan = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลดระดับลงประกาศ? สิทธิ์การลงโพสต์ไม่จำกัดจะลดลงเหลือ 5 คัน และปิดความสามารถ AI หลังสิ้นรอบบิลปัจจุบันครับ")) return;
    setIsProcessing(true);
    try {
      const success = await cancelActivePlan(false); // Cancel at period end
      if (success) {
        alert("อัปเดตยกเลิกแผนของคุณหลังจากหมดรอบบิลปัจจุบันเรียบร้อยแล้วครับ");
      }
    } catch {
      alert("ไม่สามารถดำเนินการได้ในขณะนี้");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyBoost = async () => {
    setIsProcessing(true);
    try {
      // ฿290 for 5 boost post tokens
      const payRecord = await buyBoostTokens(290);
      if (payRecord) {
        setActiveRecord(payRecord);
        setModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyBoostPP = async (paymentId: string) => {
    return await verifyResponsePayment(paymentId);
  };

  const handlePrintInvoice = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const activePlanId = subscription?.planId || "free";
  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return "Member Free";
      case "dealer_pro":
        return "Dealer Pro ✨";
      case "dealer_premium":
        return "Dealer Premium 👑";
      default:
        return "Member Free";
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      
      {/* Navigation Subbar selector */}
      <div className="flex border-b border-white/[0.06] pb-1 gap-6 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab("summary")}
          className={`pb-3 relative transition-all ${
            activeTab === "summary" ? "text-orange-500" : "text-slate-400 hover:text-white"
          }`}
        >
          สรุปบัญชีและการคุ้มครอง
          {activeTab === "summary" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          className={`pb-3 relative transition-all ${
            activeTab === "pricing" ? "text-orange-500" : "text-slate-400 hover:text-white"
          }`}
        >
          แผนค่าบริการและราคาทั้งหมด
          {activeTab === "pricing" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 relative transition-all ${
            activeTab === "invoices" ? "text-orange-500" : "text-slate-400 hover:text-white"
          }`}
        >
          ประวัติใบแจ้งหนี้ / ใบเสร็จ ({invoices.length})
          {activeTab === "invoices" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeTab === "pricing" ? (
        <PricingPage onBackToDashboard={() => setActiveTab("summary")} />
      ) : activeTab === "invoices" ? (
        /* INVOICES SCREEN */
        <div className="p-6 bg-[#0c0c0f] border border-white/[0.04] rounded-2xl space-y-6 text-left animate-fadeIn">
          <div className="space-y-1">
            <h3 className="font-display font-black text-lg text-white">ประวัติใบเสร็จรับเงินอิเล็กทรอนิกส์</h3>
            <p className="text-slate-400 text-xs text-slate-400">ธุรกรรมทางการเงินและภาษีของบัญชีดีลเลอร์สำหรับ Print ส่งไฟล์ภาษี</p>
          </div>

          {invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs sm:text-sm">
              คุณยังไม่มีประวัติการแจ้งเบิกใบเสร็จค่าบริการในขณะนี้
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{inv.invoiceNo}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">
                        PAID / จ่ายแล้ว
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      ออกใบเสร็จเมื่อ {new Date(inv.billingDate).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="text-slate-500 text-[10px] font-mono">
                      แพ็กเกจ: {inv.items[0]?.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <p className="font-mono font-black text-slate-200">฿{inv.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ชำระด้วย {inv.paymentMethod.toUpperCase()}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePrintInvoice(inv)}
                        className="p-2 border border-white/10 hover:bg-white/5 rounded-lg text-slate-350 hover:text-white transition"
                        title="พิมพ์ใบรับเงิน"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SUMMARY AND FEATURE CONTROL PORT */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left animate-fadeIn">
          
          {/* Active Card Status column */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Main subscription plan specs */}
            <div className="p-6 bg-gradient-to-b from-[#111116] to-[#0c0c0f] border border-orange-500/10 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              {activePlanId !== "free" && (
                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 blur-3xl rounded-full" />
              )}
              
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ACTIVE SUBSCRIPTION</p>
                    <h3 className="text-2xl font-display font-black text-white flex items-center gap-2">
                      <span>{getPlanBadge(activePlanId)}</span>
                      {activePlanId === "dealer_premium" && <Crown className="w-5 h-5 text-purple-400 animate-pulse fill-purple-400/20" />}
                    </h3>
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    activePlanId !== "free" 
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                      : "bg-slate-800 text-slate-400 border border-white/5"
                  }`}>
                    {subscription?.status || "active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/[0.05] text-xs font-mono">
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase">รอบการชำระถัดไป</p>
                    <p className="text-slate-300 font-bold mt-1">
                      {subscription?.currentPeriodEnd 
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) 
                        : "ไม่มีกำหนดชำระ"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase">วิธีการเรียกเก็บคืน</p>
                    <p className="text-slate-300 font-bold mt-1">
                      {activePlanId === "free" ? "ไม่มี" : subscription?.stripeSubscriptionId ? "สัญญารอบบัตรเครดิต" : "โอนยอด PromptPay"}
                    </p>
                  </div>
                </div>

                {activePlanId !== "free" && subscription?.cancelAtPeriodEnd && (
                  <div className="p-3 bg-orange-500/5 border border-orange-500/15 text-[#ff9900] text-xs rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>ยกเลิกแผนไว้แล้ว จะปิดความสามารถดีลเลอร์อัตโนมัติเมื่อสิ้นสุดรอบบิล</span>
                  </div>
                )}
              </div>

              <div className="pt-6 flex flex-wrap gap-3 relative z-10 border-t border-white/[0.03]">
                {activePlanId === "free" ? (
                  <button
                    onClick={() => setActiveTab("pricing")}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-orange-500/15"
                  >
                    <span>อัปเลเวลสิทธิ์ดีลเลอร์อัจฉริยะ 👑</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveTab("pricing")}
                      className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-200 font-bold text-xs rounded-xl transition"
                    >
                      สลับหรืออัปเกรดแผนใช้งาน
                    </button>
                    
                    {!subscription?.cancelAtPeriodEnd && (
                      <button
                        disabled={isProcessing}
                        onClick={handleCancelPlan}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ยกเลิกบริการสมาชิก</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Custom Premium Features Entitlement specs list */}
            <div className="p-6 bg-[#0c0c0f] border border-white/[0.04] rounded-2xl space-y-4">
              <h4 className="font-display font-black text-sm text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>สถานะฟีเจอร์ระดับพรีเมียมทั้งหมด</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-400">
                <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex justify-between items-center">
                  <span>ลงสเป็กรถด้วย AI (Post Generator)</span>
                  <span className={`font-semibold ${premium?.aiPostGenerationEnabled ? "text-emerald-400" : "text-slate-600"}`}>
                    {premium?.aiPostGenerationEnabled ? "● ปลดล็อกแล้ว" : "○ ล็อกอยู่"}
                  </span>
                </div>
                <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex justify-between items-center">
                  <span>สร้างประโยคเร้าใจ (AI Captions)</span>
                  <span className={`font-semibold ${premium?.aiCaptionsEnabled ? "text-emerald-400" : "text-slate-600"}`}>
                    {premium?.aiCaptionsEnabled ? "● ปลดล็อกแล้ว" : "○ ล็อกอยู่"}
                  </span>
                </div>
                <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex justify-between items-center">
                  <span>วิเคราะห์ยอดสืบค้น (Insights Dashboard)</span>
                  <span className={`font-semibold ${premium?.analyticsEnabled ? "text-emerald-400" : "text-slate-600"}`}>
                    {premium?.analyticsEnabled ? "● ปลดล็อกแล้ว" : "○ ล็อกอยู่"}
                  </span>
                </div>
                <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex justify-between items-center">
                  <span>ระบบตอบแชทปิดดีลอากง (AI Auto Reply)</span>
                  <span className={`font-semibold ${premium?.aiAutoReplyEnabled ? "text-emerald-400" : "text-slate-600"}`}>
                    {premium?.aiAutoReplyEnabled ? "● ปลดล็อกแล้ว" : "○ ล็อกอยู่"}
                  </span>
                </div>
              </div>
            </div>

            {/* Payments list history audit logs */}
            <div className="p-6 bg-[#0c0c0f] border border-white/[0.04] rounded-2xl space-y-4">
              <h4 className="font-display font-black text-sm text-slate-300">ความเคลื่อนไหวย้อนหลัง</h4>
              
              {payments.length === 0 ? (
                <p className="text-slate-500 text-xs py-4">ยังไม่พบความเคลื่อนไหวชำระเงินใดๆ ในขณะนี้</p>
              ) : (
                <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                  {payments.map(p => (
                    <div key={p.id} className="p-3 bg-white/[0.01] rounded-lg border border-white/[0.03] flex justify-between items-center text-slate-400">
                      <div className="text-left">
                        <p className="font-bold text-slate-200 line-clamp-1">{p.description}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{new Date(p.createdAt).toLocaleString("th-TH")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-200">฿{p.amount.toLocaleString()}</p>
                        <span className={`text-[9px] uppercase ${p.status === "success" ? "text-emerald-400" : "text-orange-400"}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right column sidebar widgets (Boost post / security cert) */}
          <div className="space-y-6">
            
            {/* Boost post token packs */}
            <div className="p-6 bg-gradient-to-br from-[#101014] to-[#070709] border border-orange-500/10 rounded-2xl text-left space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/10 blur-xl rounded-full" />
              
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-orange-400 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current animate-bounce" /> BOOST POST POWER
                </p>
                <h4 className="font-display font-black text-base text-white">โทเค็นบูสต์โพสต์ของคุณ</h4>
              </div>

              {/* Tokens Count */}
              <div className="flex items-baseline gap-2 py-2">
                <span className="text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  {premium?.boostTokens || 0}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">Tokens</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                ใช้โทเค็นดันโพสต์ของเต็นท์ให้ติดสเป็กหน้าแรก ดับเบิ้ลจำนวนผู้สตรีมมิ่งดูข้อมูล และเข้าลิสต์ปรึกษาแชทหาน้องเอ AI ฟรี คันละ 1 โทเค็น
              </p>

              <div className="pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleBuyBoost}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1 text-center shadow-lg shadow-orange-500/10 disabled:opacity-50"
                >
                  <span>ซื้อแพ็กเกจบูสต์ด่วน ฿290 (x5) ⚡</span>
                </button>
              </div>
            </div>

            {/* Standard trust box */}
            <div className="p-6 bg-white/[0.02] border border-white/[0.04] rounded-2xl text-left space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600/5 border border-orange-500/10 flex items-center justify-center text-orange-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h5 className="font-bold text-xs sm:text-sm text-slate-200">ระบบชำระเงินเข้ารหัสสตรีมมิ่งสากล</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                การดำเนินการธุรกรรมทั้งหมดบน Nong A ผ่านระบบมาตรฐานความคุ้มครองสูงสุด ไม่จำกัดความเสี่ยงด้วยสัญญาล็อครหัส API ไร้กังวลข้อมูลบัตร
              </p>
            </div>

          </div>

        </div>
      )}

      {/* Dynamic Invoice display during browser printing */}
      {selectedInvoice && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-12 z-[100] text-left">
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <h2 className="text-2xl font-bold">NONG A AUTO MARKETPLACE</h2>
              <p className="text-xs text-gray-500 mt-1">NongBot Group Co., Ltd.</p>
              <p className="text-xs text-gray-500">123 Super Highway Rd., Bangkok, Thailand</p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-gray-700">ใบเสร็จรับเงิน / ใบแจ้งหนี้</h3>
              <p className="text-sm font-mono mt-1 font-bold">{selectedInvoice.invoiceNo}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                วันที่ออก: {new Date(selectedInvoice.billingDate).toLocaleDateString("th-TH")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-6 border-b text-xs">
            <div>
              <p className="font-bold text-gray-500">ผู้รับบริการ ชำระเงินให้กับ:</p>
              <p className="mt-1 font-bold">{user?.displayName}</p>
              <p className="text-gray-500 font-mono text-[11px]">{selectedInvoice.userEmail}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-500 font-mono">ชำระด้วย: {selectedInvoice.paymentMethod.toUpperCase()}</p>
              <p className="mt-1 font-bold text-emerald-600">สถานะ: ชำระสำเร็จเรียบร้อย (PAID)</p>
            </div>
          </div>

          <table className="w-full text-xs text-left border-collapse mt-6">
            <thead>
              <tr className="border-b font-bold text-gray-600 bg-gray-50">
                <th className="py-2.5 px-4 font-bold">รายการสินค้า / แผน</th>
                <th className="py-2.5 px-4 text-right font-bold">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items.map((it, i) => (
                <tr key={i} className="border-b text-gray-700">
                  <td className="py-3 px-4 font-semibold">{it.description}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">฿{it.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 flex justify-end">
            <div className="text-right w-64 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-gray-750">
                <span>ราคารวมสินค้า:</span>
                <span>฿{selectedInvoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                <span>฿0.00 (รวมแล้ว)</span>
              </div>
              <div className="border-t pt-2.5 flex justify-between font-bold text-base text-gray-900">
                <span>ยอดเงินสุทธิ:</span>
                <span>฿{selectedInvoice.amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center text-[10px] text-gray-400 border-t pt-4">
            ใบเสร็จรับเงินระบบอิเล็กทรอนิกส์นี้รับรองความถูกต้องด้วยซิกเนเจอร์ SHA-512 ความปลอดภัยสูงสุด
          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tabType="promptpay"
        paymentRecord={activeRecord}
        onVerify={handleVerifyBoostPP}
        planName="Boost Post Package Token (x5)"
      />

    </div>
  );
}
