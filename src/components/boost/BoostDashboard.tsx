import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useBoost } from "../../hooks/boost/useBoost";
import { useBilling } from "../../hooks/billing/useBilling";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import { useCars } from "../../hooks/cars";
import { BoostBadge } from "./BoostBadge";
import { BoostPurchaseFlow } from "./BoostPurchaseFlow";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { 
  Rocket, TrendingUp, Sparkles, Award, Plus, Calendar, RotateCcw, 
  BarChart2, Eye, MousePointerClick, RefreshCw, AlertCircle, Trash2, 
  Clock, ShieldAlert, BadgeCheck
} from "lucide-react";

export function BoostDashboard() {
  const { user } = useAuthContext();
  const { 
    userBoosts, history, loadingBoosts, loadingHistory, 
    toggleAutoRenewMutation, expireBoostMutation, getBoostAnalytics 
  } = useBoost();
  const { premium, loading: loadingBilling, buyBoostTokens } = useBilling();

  // Fetch all cars to match our boost items
  const { data: cars, isLoading: loadingCars } = useCars({
    sellerId: user?.uid || "",
  });

  const [activeCarIdForPurchase, setActiveCarIdForPurchase] = useState<string | null>(null);
  const [activeCarIdForAnalytics, setActiveCarIdForAnalytics] = useState<string | null>(null);
  const [buyingTokens, setBuyingTokens] = useState<boolean>(false);

  // Derive target cars matching active boosts
  const activeBoostedList = userBoosts?.filter(b => b.status === "active") || [];
  const expiredBoostedList = userBoosts?.filter(b => b.status === "expired") || [];

  const handleToggleAutoRenew = async (boostId: string, currentVal: boolean) => {
    try {
      await toggleAutoRenewMutation.mutateAsync({ boostId, autoRenew: !currentVal });
    } catch (err) {
      console.error("ผิดพลาดขณะเปลี่ยนตารางต่ออายุอัตโนมัติ:", err);
    }
  };

  const handleForceExpire = async (boostId: string) => {
    if (!window.confirm("คุณต้องการที่จะสิ้นสุดแคมเปญบูสต์โพสต์นี้ก่อนกำหนดทันทีหรือไม่? (การกระทำนี้จะเปลี่ยนสถานะกลับเป็นโพสต์ทั่วไปเฉลบลดการมองเห็น)")) return;
    try {
      await expireBoostMutation.mutateAsync(boostId);
    } catch (err) {
      console.error("ผิดพลาดขณะยกเลิกการส่งบูสต์:", err);
    }
  };

  const handleBuyTokenPack = async () => {
    if (!user) return;
    setBuyingTokens(true);
    try {
      await buyBoostTokens(490); // 490 THB for 5 Boost Tokens bundle
      alert("ซื้อชุดโทเค็นพรีเมียมเรียบร้อยแล้ว! (ได้รับ 5 โทเค็น)");
    } catch (err: any) {
      alert("ไม่สามารถซื้อโทเค็นได้: " + err.message);
    } finally {
      setBuyingTokens(false);
    }
  };

  // Select first boosted car for rendering main analytics if none chosen
  const currentAnalyticsCarId = activeCarIdForAnalytics || (activeBoostedList[0]?.carId || (cars && cars[0]?.id)) || "";
  const selectedCarDetails = cars?.find(c => c.id === currentAnalyticsCarId);
  const analyticsData = selectedCarDetails ? getBoostAnalytics(selectedCarDetails.id, selectedCarDetails.title) : null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-zinc-100 min-h-screen">
      {/* 1. TOP PORTAL OVERVIEW BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-zinc-950 border border-zinc-800 p-6 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider bg-orange-500/15 text-orange-500 rounded-lg">PROMOTIONS</span>
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight mt-1.5">ศูนย์บริหารจัดการโปรโมตโพสต์ (Boost Dashboard)</h1>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            เพิ่มความมั่นใจในการระบายสต็อกด้วยชุดบูสต์อัปเกรดแคมเปญ จัดอันดับให้แสดงผลเด่นชัดเหนือคู่ตรวจสอบเสมอ
          </p>
        </div>

        {/* Available Tokens Counter Block */}
        <div className="flex items-center gap-4 shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="h-12 w-12 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <Rocket className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">โทเค็นสำหรับบูสต์คงเหลือ</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-orange-500">{loadingBilling ? "..." : (premium?.boostTokens ?? 0)}</span>
              <span className="text-xs text-zinc-400 font-medium">โทเค็น</span>
            </div>
          </div>
          <button
            onClick={handleBuyTokenPack}
            disabled={buyingTokens}
            className="ml-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-zinc-800 disabled:to-zinc-800 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-md"
          >
            {buyingTokens ? <Plus className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 stroke-[3]" />}
            ซื้อเพิ่ม ฿490
          </button>
        </div>
      </div>

      {/* 2. DUAL LAYOUT: MAIN ANALYTICS AND ACTIVE BOOSTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: ACTIVE PROMOTIONAL CAMPAIGNS (2 COLS SPEED) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              แคมเปญโปรโมตที่กำลังใช้งานอยู่ (Active Boosts)
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold">
                {activeBoostedList.length}
              </span>
            </h3>
          </div>

          {loadingBoosts ? (
            <div className="p-12 text-center bg-zinc-950 border border-zinc-900 rounded-3xl text-zinc-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-orange-500 mb-2" />
              กำลังประมวลผลคำนวณคิวบูสต์...
            </div>
          ) : activeBoostedList.length === 0 ? (
            <div className="p-10 text-center bg-zinc-950 border border-zinc-900/60 rounded-3xl">
              <AlertCircle className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
              <h4 className="font-bold text-zinc-300">ยังไม่มีแคมเปญบูสต์โพสต์ที่ใช้งานอยู่ในขณะนี้</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                เลือกโพสต์รถสเป็กดีในคลังสินค้าของคุณ และเปลี่ยนสถานะให้กลายเป็นสุดยอดสปอตไลต์เด่นกระแทกตาได้เลยวันนี้
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeBoostedList.map((boost) => {
                const associatedCar = cars?.find(c => c.id === boost.carId);
                const isAnalyticalSelected = activeCarIdForAnalytics === boost.carId;

                return (
                  <div
                    key={boost.id}
                    className={`p-5 rounded-2xl border transition-all duration-300 bg-zinc-950 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                      isAnalyticalSelected ? "border-orange-500 ring-1 ring-orange-500/30" : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Left details */}
                    <div className="flex items-start gap-4">
                      {associatedCar && (
                        <img
                          src={associatedCar.coverImage}
                          alt={associatedCar.title}
                          className="w-20 h-16 object-cover bg-zinc-900 rounded-xl border border-zinc-800 shrink-0"
                        />
                      )}
                      <div>
                        {associatedCar ? (
                          <h4 className="font-bold text-sm text-zinc-200 line-clamp-1">{associatedCar.title}</h4>
                        ) : (
                          <h4 className="font-bold text-sm text-zinc-400">รถยนต์รหัส: {boost.carId}</h4>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2.5 mt-2">
                          <BoostBadge type={boost.planId === "homepage_spotlight" ? "featured" : boost.planId === "ai_trending" ? "ai_recommended" : "boosted"} size="sm" />
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-zinc-500" />
                            สิ้นสุด: {new Date(boost.endTime).toLocaleDateString("th-TH")}, {new Date(boost.endTime).toLocaleTimeString("th-TH", { hour: "numeric", minute: "numeric" })}น.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right config toggles */}
                    <div className="flex flex-wrap items-center gap-4 border-t pt-4 md:border-none md:pt-0 shrink-0">
                      {/* View Analytics quick switch trigger */}
                      <button
                        onClick={() => setActiveCarIdForAnalytics(boost.carId)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                          isAnalyticalSelected
                            ? "bg-orange-500 text-zinc-950 border-orange-500"
                            : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                        }`}
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                        ดูสถิติสัญจร
                      </button>

                      {/* Auto Renew button */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight">ต่ออายุอัติโนมัติ</span>
                        <button
                          onClick={() => handleToggleAutoRenew(boost.id, boost.autoRenew)}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                            boost.autoRenew ? "bg-orange-500" : "bg-zinc-800"
                          }`}
                        >
                          <span
                            className={`block w-3.5 h-3.5 rounded-full bg-zinc-950 transition-transform duration-200 transform ${
                              boost.autoRenew ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Force stop button */}
                      <button
                        onClick={() => handleForceExpire(boost.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                        title="ปิดก่อนกำหนด"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. YOUR MARKETPLACE POSTS DIRECT EXPAND LIST */}
          <div className="pt-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-orange-500" />
              รายการรถยนต์ทั้งหมดของคุณ (พรีเมียมโปรโมต)
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold">
                {cars ? cars.length : 0}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 mb-4">คลิก "เปิดระบบบูสต์โพสต์" ทันที เพื่อเพิ่มความได้เปรียบขายไวขึ้น</p>

            {loadingCars ? (
              <div className="p-8 text-center text-zinc-500">กำลังดึงข้อมูลโพสต์ดีลเลอร์จากโรงงานสต็อก...</div>
            ) : !cars || cars.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950 border border-zinc-900 rounded-3xl text-zinc-500 text-xs">
                คุณยังไม่ได้เพิ่มประกาศลงตลาดรถยนต์ Nong A เลย
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cars.map((car) => {
                  const hasActiveBoost = activeBoostedList.some(b => b.carId === car.id);
                  return (
                    <div
                      key={car.id}
                      className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={car.coverImage}
                          alt={car.title}
                          className="h-12 w-16 object-cover bg-zinc-900 rounded-lg shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-200 truncate">{car.title}</h4>
                          <p className="text-[10px] text-zinc-500 mt-1 font-mono">{car.price.toLocaleString("th-TH")} บาท</p>
                        </div>
                      </div>

                      {hasActiveBoost ? (
                        <span className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 text-[10px] font-bold border border-orange-500/20 shrink-0">
                          สลับเปิดบูสต์อยู่
                        </span>
                      ) : (
                        <button
                          onClick={() => setActiveCarIdForPurchase(car.id)}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-orange-500 hover:text-zinc-950 border border-zinc-800 hover:border-orange-500 rounded-xl text-[10px] font-bold text-zinc-300 transition-all duration-200 shrink-0 cursor-pointer"
                        >
                          เปิดระบบวิงก์
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BOOSTER ANALYTICS & INSIGHT DECK PANEL */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-5">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-orange-500" />
                ข้อมูลเจาะลึกทราฟฟิก (Booster Performance)
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                เปรียบเทียบสถิติอัตราการสัญจรของรถเมื่อได้รับการส่งเสริมโดย Nong A AI
              </p>
            </div>

            {selectedCarDetails ? (
              <div className="space-y-5">
                {/* Visual mini-car layout preview */}
                <div className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex items-center gap-3">
                  <img
                    src={selectedCarDetails.coverImage}
                    alt={selectedCarDetails.title}
                    className="h-10 w-14 object-cover rounded-lg bg-zinc-950 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-orange-500 tracking-tight">เลือกสถิติจากโพสต์:</span>
                    <h5 className="font-bold text-xs truncate text-zinc-100">{selectedCarDetails.title}</h5>
                  </div>
                </div>

                {/* Metric Bento Cards grids */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">ยอดผู้เข้าชม</span>
                    <div className="text-sm font-black text-zinc-200 mt-1">
                      {analyticsData?.viewsBefore} <span className="text-zinc-600">→</span> <span className="text-orange-500">{analyticsData?.viewsAfter}</span>
                    </div>
                    <span className="text-[8px] text-green-500 font-bold block mt-0.5">+10.2x เท่า</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">ส่งข้อความกด</span>
                    <div className="text-sm font-black text-zinc-200 mt-1">
                      {analyticsData?.clicksBefore} <span className="text-zinc-600">→</span> <span className="text-orange-500">{analyticsData?.clicksAfter}</span>
                    </div>
                    <span className="text-[8px] text-green-500 font-bold block mt-0.5">+16.0x เท่า</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">เปอร์เซนต์ CTR</span>
                    <div className="text-xs font-black text-zinc-200 mt-1.5">
                      {analyticsData?.ctrBefore}% <span className="text-zinc-600">→</span> <span className="text-orange-500">{analyticsData?.ctrAfter}%</span>
                    </div>
                    <span className="text-[8px] text-green-500 font-bold block mt-1">+{(Number(analyticsData?.ctrAfter || 0) / Number(analyticsData?.ctrBefore || 1)).toFixed(1)}x เท่า</span>
                  </div>
                </div>

                {/* Recharts chart representation */}
                {analyticsData?.dailyViews && (
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.dailyViews} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: 9 }} />
                        <YAxis stroke="#71717a" style={{ fontSize: 9 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: 12, fontSize: 11 }}
                          labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
                        />
                        <Legend verticalAlign="top" height={24} style={{ fontSize: 9 }} />
                        <Line type="monotone" name="ทราฟฟิกทั่วไป (Base)" dataKey="base" stroke="#71717a" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" name="ทราฟฟิกหลังส่งเสริม (Boosted)" dataKey="boosted" stroke="#FF6B00" strokeWidth={2.5} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                <p className="text-[9px] text-zinc-400 text-center">ระบบวิเคราะห์ข้อมูลปรับปรุงทุกๆ 2 นาที • สนับสนุนโดย Nong A AI Platform</p>
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 text-xs">
                กรุณากดเลือกสถิติเพื่อทำการเปิดสวิทช์รีพอร์ตเชิงลึก
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. DOWN TRANSACTION LOG HISTORY SHEET */}
      <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            ประวัติธุรกรรมโปรโมชั่น (Promotion Log History)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">บันทึกขั้นตอนอัปเดตแคมเปญและการหักจ่ายโทเค็นจากดีลเลอร์แผงควบคุม</p>
        </div>

        {loadingHistory ? (
          <div className="p-6 text-zinc-500 text-center text-xs">กำลังโหลดรายละเอียดเอกสารถูกรางวัลพริสต์...</div>
        ) : !history || history.length === 0 ? (
          <div className="p-6 text-zinc-500 text-center text-xs">
            ยังไม่มีประวัติการส่งเสริมสัญจรสปอตไลต์ของร้านค้าในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-zinc-300">
              <thead className="bg-zinc-900 uppercase font-bold tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 rounded-l-xl">แผนส่งเสริม</th>
                  <th className="px-5 py-3.5">เป้าหมายรถยนต์</th>
                  <th className="px-5 py-3.5">คำตอบสถานะ</th>
                  <th className="px-5 py-3.5">วิธีการจ่ายเงิน</th>
                  <th className="px-5 py-3.5">ผู้รับค่าจ้าง</th>
                  <th className="px-5 py-3.5 rounded-r-xl">วันเวลา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {history.map((log) => {
                  const correlatedCar = cars?.find(c => c.id === log.carId);
                  return (
                    <tr key={log.id} className="hover:bg-zinc-900/40 transition-all duration-150">
                      <td className="px-5 py-4 font-bold text-zinc-200">{log.planName}</td>
                      <td className="px-5 py-4 font-medium text-zinc-300">
                        {correlatedCar ? (
                          <div className="flex items-center gap-2">
                            <img src={correlatedCar.coverImage} alt="" className="h-7 w-10 object-cover bg-zinc-900 rounded" />
                            <span className="truncate max-w-[12rem]">{correlatedCar.title}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-zinc-500">โพสต์รหัส: {log.carId.substring(0, 8)}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-md font-semibold font-sans tracking-wide ${
                          log.action === "purchase" || log.action === "auto_renew"
                            ? "bg-green-500/15 text-green-500"
                            : "bg-red-500/15 text-red-500"
                        }`}>
                          {log.action === "purchase" ? "เริ่มต้นเปิดตัว" : log.action === "auto_renew" ? "ต่ออายุอัตโนมัติ" : "ยุติสัญญาหมดอายุ/ยกเลิก"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono capitalize text-zinc-200">
                        {log.paymentMethod === "tokens" ? "ใช้โทเค็น" : "ชำระเงินสด / PromptPay"}
                      </td>
                      <td className="px-5 py-4 font-bold text-orange-500">
                        {log.tokensUsed > 0 ? `-${log.tokensUsed} Tokens` : `฿${log.amountThb || 200}`}
                      </td>
                      <td className="px-5 py-4 font-mono text-zinc-400">
                        {new Date(log.timestamp).toLocaleDateString("th-TH")} • {new Date(log.timestamp).toLocaleTimeString("th-TH", { hour: "numeric", minute: "numeric" })}น.
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RENDER DYNAMIC ACTIVE MODAL BACKDROPS CHECKOUT */}
      <AnimatePresence>
        {activeCarIdForPurchase && (
          <BoostPurchaseFlow
            isOpen={true}
            car={cars?.find(c => c.id === activeCarIdForPurchase)!}
            onClose={() => setActiveCarIdForPurchase(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
export default BoostDashboard;
