import React from "react";
import { 
  Sparkles, ShieldCheck, Lock, Unlock, Zap, Flame, Crown, CheckCircle2, 
  HelpCircle, ArrowRight, MessageSquare, Plus, RefreshCw, Layers, Award, Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAiPremium } from "../../hooks/ai-premium/useAiPremium";
import { PremiumAiFeatureId, PremiumFeatureInfo } from "../../services/ai/premium/premiumAiService";

/**
 * 1. Premium AI Badge
 */
export function PremiumAiBadge({ size = "md", animate = true }: { size?: "sm" | "md" | "lg"; animate?: boolean }) {
  const { subscription } = useAiPremium();
  const isPremium = subscription?.tier === "premium";

  if (!isPremium) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold nonga-bg-subtle nonga-text-secondary border nonga-border">
        Free Tier
      </span>
    );
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[9px] gap-0.5",
    md: "px-2.5 py-1 text-[10.5px] gap-1",
    lg: "px-3 py-1.5 text-xs gap-1.5"
  };

  return (
    <span className={`inline-flex items-center font-bold tracking-tight rounded-full nonga-action border border-[color-mix(in_srgb,var(--nonga-brand)_35%,transparent)] shadow-[0_0_12px_rgba(249,115,22,0.25)] ${sizeClasses[size]}`}>
      <Sparkles className={`w-3.5 h-3.5 ${animate ? "animate-pulse" : ""}`} />
      <span>NONG A PREMIUM</span>
    </span>
  );
}

/**
 * 2. Usage Progress Bar
 */
export function UsageProgressBar({ 
  featureId,
  label 
}: { 
  featureId: PremiumAiFeatureId;
  label?: string;
}) {
  const { featuresStats, subscription } = useAiPremium();
  
  const stat = featuresStats.find(s => s.info.id === featureId);
  const isPremium = subscription?.tier === "premium";

  if (!stat || isPremium) return null;

  const used = stat.used;
  const max = stat.max;
  const percentage = Math.min(100, max > 0 ? (used / max) * 100 : 0);
  
  let barColorClass = "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]";
  if (percentage >= 100) {
    barColorClass = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
  } else if (percentage >= 70) {
    barColorClass = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
  }

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="nonga-text-secondary">{label || stat.info.thaiName}</span>
        <span className="nonga-text-primary font-mono">
          {used} / {max} ครั้ง
        </span>
      </div>
      <div className="w-full h-2 rounded-full nonga-bg-subtle border nonga-border overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {percentage >= 100 && (
        <p className="text-[10px] text-[var(--nonga-error)] font-bold animate-pulse">
          ⚠️ โควต้าฟรีของคุณหมดแล้วคร้าบ อัปเกรดเพื่ออันลิมิตทันควัน!
        </p>
      )}
    </div>
  );
}

/**
 * 3. Locked Feature Card Wrapper
 */
export function LockedFeatureCard({ 
  featureId, 
  children,
  compact = false
}: { 
  featureId: PremiumAiFeatureId; 
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { subscription, openUpgradeModal, allFeatures } = useAiPremium();
  const isPremium = subscription?.tier === "premium";
  const feature = allFeatures.find(f => f.id === featureId);

  // If already unlocked or if this is an allowed free feature, render child directly
  if (isPremium || feature?.isUnlockedInFree) {
    return <>{children}</>;
  }

  const handlePrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openUpgradeModal(featureId);
  };

  if (compact) {
    return (
      <div 
        onClick={handlePrompt}
        className="relative group cursor-pointer overflow-hidden border border-slate-800/80 bg-slate-950/40 hover:bg-slate-900/40 p-3 rounded-xl flex items-center justify-between gap-3 text-left transition-all"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{feature?.emoji}</span>
          <div>
            <h5 className="font-bold text-xs text-slate-300 flex items-center gap-1">
              {feature?.thaiName}
              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
            </h5>
            <p className="text-[10px] text-slate-500 line-clamp-1">{feature?.description}</p>
          </div>
        </div>
        <Lock className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform shrink-0" />
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-slate-900 bg-slate-950/20">
      {/* Blurred overlay content */}
      <div className="filter blur-[2.5px] opacity-40 select-none pointer-events-none">
        {children}
      </div>

      {/* Lock panel centered card */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 backdrop-blur-[2px]">
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-600/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-3 shadow-[0_0_15px_rgba(249,115,22,0.15)] group-hover:scale-105 transition-transform duration-300">
          <Lock className="w-5 h-5 text-orange-500" />
        </div>
        <h4 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-1.5 justify-center">
          {feature?.thaiName} <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20" />
        </h4>
        <p className="text-[11px] text-slate-400 max-w-xs mt-1.5 mb-4 leading-relaxed">
          ฟีเจอร์นี้เป็นความสามารถ AI ขั้นสูงเฉพาะดีลเลอร์พรีเมียม ปลดล็อกโหมดวิเคราะห์ลึก แคปชั่นไวรัล และบอทตอบคำแฝงเพื่อปั่นยอดแชร์พุ่งกระฉูดคร้าบ!
        </p>
        <button
          onClick={handlePrompt}
          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl text-xs hover:scale-102 cursor-pointer active:scale-98 transition shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
        >
          ปลดล็อกใช้งานล้านใจ ⚡
        </button>
      </div>
    </div>
  );
}

/**
 * 4. Upgrade Modal Pop-up
 */
export function UpgradeModal() {
  const { 
    upgradeModalOpen, 
    closeUpgradeModal, 
    selectedFeatureForUpgrade, 
    upgradeToPremium,
    subscription,
    allFeatures
  } = useAiPremium();

  if (!upgradeModalOpen) return null;

  const isPremium = subscription?.tier === "premium";

  const benefits = [
    "เข้าใช้งาน Nong A AI Advanced Personalities ไร้ขีดจำกัด",
    "ประเมินสภาพรถและเฉี่ยวชน Nong A Vision โควต้าไม่จำกัด",
    "แคปชั่นไวรัลและ Trending Hooks ส่งเสริมการเข้าถึง",
    "วิเคราะห์คอนเทนต์ SEO ติดอันดับพรีเมียมบน Google",
    "AI Sales Assistant คัดสเป็คตอบแก้ปัญหาลูกค้าผ่อนคุ้ม",
    "สิทธิ์อัพเกรดเป็นตัวทดสอบ AI Real-time Auto Reply ก่อนใคร"
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        >
          {/* Top orange gradient glowing decoration */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400" />
          
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Flame className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "5s" }} /> PREMIUM AI WORKSPACE
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black text-white mt-1">
                  ยกระดับยอดขายทะลุล้านด้วย <span className="text-orange-500">Premium AI Nong A ✨</span>
                </h2>
              </div>
              <button 
                onClick={closeUpgradeModal}
                className="p-1 px-2 border border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer active:scale-95 transition"
              >
                ปิด
              </button>
            </div>

            {selectedFeatureForUpgrade && (
              <div className="p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-start gap-3 text-left">
                <span className="text-2xl mt-0.5">{selectedFeatureForUpgrade.emoji}</span>
                <div className="space-y-0.5">
                  <span className="text-xs text-orange-400 font-bold block">ฟีเจอร์ที่คุณกำลังต้องการจะเข้าเรียนรู้:</span>
                  <h4 className="font-bold text-sm text-white">{selectedFeatureForUpgrade.thaiName}</h4>
                  <p className="text-[11px] text-slate-300">{selectedFeatureForUpgrade.description}</p>
                </div>
              </div>
            )}

            <div className="space-y-2 text-left">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" /> สิทธิพิเศษพรีเมียมที่คุณจะได้รับ:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-[11.5px] leading-snug">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plans comparison cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2 border-t border-slate-850">
              {/* Free Tier */}
              <div className={`p-4 rounded-xl border border-slate-850 bg-slate-950/40 relative ${!isPremium ? "border-slate-800" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-slate-400">แผนปัจจุบัน (Free Plan)</h4>
                  {!isPremium && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-400">ใช้อยู่</span>}
                </div>
                <div className="space-y-0.5 mb-3">
                  <span className="text-xl font-bold font-mono text-white">฿0</span>
                  <span className="text-[10px] text-slate-400"> / ตลอดชีพ</span>
                </div>
                <ul className="text-[9.5px] text-slate-400 space-y-11">
                  <li>• โกวต้า 5 โพสต์รถยนต์</li>
                  <li>• วิเคราะห์สภาพ Nong A โควต้า 3 ครั้ง</li>
                  <li>• บอทสัมภาษณ์และโทนาเสียงทั่วไป</li>
                </ul>
              </div>

              {/* Premium Plan */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-orange-950/10 relative shadow-[0_0_20px_rgba(249,115,22,0.15)] overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-orange-600 text-white rounded-full px-1.5 py-0.5 text-[7.5px] font-black">
                  <Zap className="w-2.5 h-2.5" /> HOT
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-xs text-amber-400 flex items-center gap-1">
                    พรีเมียมล้านใจ (Unlimited)
                  </h4>
                </div>
                <div className="space-y-0.5 mb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-white">฿390</span>
                    <span className="text-[10px] text-slate-400">/ เดือนเท่านั้น</span>
                  </div>
                  <span className="text-[8.5px] text-amber-500 font-bold block">🔥 โอนคุ้มค่า ประหยัดกว่าการจ้างแอดมิน</span>
                </div>
                <ul className="text-[9.5px] text-slate-300 space-y-11">
                  <li className="flex items-center gap-1">• <Unlock className="w-2.5 h-2.5 text-amber-500" /> อันลิมิต AI ทุกฟีเจอร์</li>
                  <li className="flex items-center gap-1">• <Unlock className="w-2.5 h-2.5 text-amber-500" /> ปลดล็อกครบ 9 โมดูลขั้นเทพ</li>
                  <li className="flex items-center gap-1">• <Unlock className="w-2.5 h-2.5 text-amber-500" /> อัพเดทฟีเจอร์ใหม่ฟรีตลอดไป</li>
                </ul>
              </div>
            </div>

            {/* Buttons interactions */}
            <div className="space-y-3">
              <button 
                onClick={upgradeToPremium}
                className="w-full py-3 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-bold rounded-xl text-xs sm:text-sm tracking-wide shadow-[0_4px_20px_rgba(249,115,22,0.45)] cursor-pointer hover:scale-101 active:scale-99 transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 animate-bounce" />
                <span>ชำระเงินและปลดล็อคดีลเลอร์พรีเมียมทันควัน!</span>
              </button>
              
              <p className="text-[10px] text-slate-500 text-center">
                ระบบอนุมัติบัญชีอัจฉริยะผ่าน PromptPay และบัตรเครดิต สามารถยกเลิกได้ทุกเมื่อโดยไม่มีค่าบริการผูกมัดใดๆ คร้าบผม!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * 5. Dashboard View: AI Usage Dashboard
 */
export function AiUsageDashboard() {
  const { subscription, featuresStats, loading, downgradeToFree, upgradeToPremium, refreshStats } = useAiPremium();

  const isPremium = subscription?.tier === "premium";

  return (
    <div className="p-6 rounded-2xl border nonga-border nonga-bg-surface space-y-6 text-left relative overflow-hidden nonga-text-primary">
      {/* Glow */}
      <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b nonga-border pb-5">
        <div className="space-y-1">
          <h3 className="font-display font-black text-xl nonga-text-primary flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--nonga-brand)]" />
            แผงควบคุมโควต้าและฟีเจอร์พรีเมียม <span className="text-[var(--nonga-action-primary)] text-base">Nong A Premium AI ⚡</span>
          </h3>
          <p className="text-xs nonga-text-secondary leading-relaxed">
            ตรวจสอบข้อมูลสถิติมูลค่าการใช้ความต้องการดีลเลอร์ บัญชีเครดิต และความก้าวหน้าความสามารถเครื่องมือ AI
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={refreshStats}
            disabled={loading}
            className="p-2 border nonga-border nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)] rounded-xl nonga-text-secondary hover:text-[var(--nonga-text-primary)] cursor-pointer active:scale-95 transition disabled:opacity-50 nonga-focus-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          
          {isPremium ? (
            <button
              onClick={downgradeToFree}
              className="px-3.5 py-1.5 border nonga-border hover:bg-[var(--nonga-bg-subtle)] text-[11px] text-[var(--nonga-error)] font-bold rounded-xl active:scale-95 transition cursor-pointer nonga-focus-ring"
            >
              รีเซ็ตกลับแผนเริ่มต้น
            </button>
          ) : (
            <button
              onClick={upgradeToPremium}
              className="px-3.5 py-1.5 nonga-action nonga-focus-ring rounded-xl text-[11px] font-bold shadow-[0_0_15px_rgba(249,115,22,0.2)] active:scale-95 transition cursor-pointer"
            >
              จำลองอัพเกรดเป็นพรีเมียม
            </button>
          )}
        </div>
      </div>

      {/* Subscription Card Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Active plan overview block */}
        <div className="p-4 rounded-xl border nonga-border nonga-bg-elevated space-y-3.5">
          <span className="text-[10px] nonga-text-muted font-bold block uppercase tracking-wider">บัญชีผู้ใช้ดีลเลอร์</span>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
              isPremium
                ? "bg-[color-mix(in_srgb,var(--nonga-brand)_12%,transparent)] border border-[color-mix(in_srgb,var(--nonga-brand)_30%,transparent)] text-[var(--nonga-action-primary)]"
                : "nonga-bg-subtle border nonga-border nonga-text-secondary"
            }`}>
              {isPremium ? <Crown className="w-5 h-5 fill-amber-500/20" /> : <Award className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-bold text-sm nonga-text-primary">
                {isPremium ? "Premium Merchant" : "Free Creator Account"}
              </h4>
              <p className="text-[10.5px] nonga-text-muted">
                {isPremium ? "ปลดล็อคขีดความสามารถ AI 9 โมดูลแล้ว" : "จำกัดสิทธิ์เฉพาะฟีเจอร์พื้นฐาน"}
              </p>
            </div>
          </div>
          <PremiumAiBadge />
        </div>

        {/* Future Ready: Token balance pay-per-use card */}
        <div className="p-4 rounded-xl border nonga-border nonga-bg-elevated space-y-3.5">
          <span className="text-[10px] nonga-text-muted font-bold block uppercase tracking-wider">โควต้าและเครดิตโทเค็น</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--nonga-brand)_12%,transparent)] border border-[color-mix(in_srgb,var(--nonga-brand)_30%,transparent)] flex items-center justify-center text-[var(--nonga-brand)]">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm nonga-text-primary">
                {isPremium ? "โทเค็นล้านใจไม่จำกัด ⚡" : `${subscription?.tokens || 0} เครดิตทดลองสี`}
              </h4>
              <p className="text-[10.5px] nonga-text-muted">
                ใช้งาน 1 ครั้งต่อการวิจัย/แต่งของระบบ
              </p>
            </div>
          </div>
          <div className="h-5">
            {!isPremium && (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--nonga-action-primary)] font-bold bg-[color-mix(in_srgb,var(--nonga-brand)_8%,transparent)] px-2 py-0.5 rounded border border-[color-mix(in_srgb,var(--nonga-brand)_25%,transparent)]">
                <Plus className="w-3.5 h-3.5" /> สามารถเติมโทเค็นเพิ่มได้ในอนาคต
              </span>
            )}
          </div>
        </div>

        {/* Next Billing/Quota dates */}
        <div className="p-4 rounded-xl border nonga-border nonga-bg-elevated space-y-3.5">
          <span className="text-[10px] nonga-text-muted font-bold block uppercase tracking-wider">วันหมดอายุการใช้งาน</span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--nonga-info)_12%,transparent)] border border-[color-mix(in_srgb,var(--nonga-info)_30%,transparent)] flex items-center justify-center text-[var(--nonga-info)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm nonga-text-primary">
                {isPremium ? "ต่ออายุอัตโนมัติ 🪄" : "ตลอดชีพแผนเริ่มต้น"}
              </h4>
              <p className="text-[10.5px] nonga-text-muted">
                {isPremium ? `รอบบิลถัดไป: ${new Date(subscription?.expiresAt || '').toLocaleDateString('th-TH')}` : "ปรับแต่งเป็นพรีเมียมได้ไม่มีวันพ้นสิทธิ์"}
              </p>
            </div>
          </div>
          <div className="text-[10px] nonga-text-secondary">
            {isPremium ? "ชำระรายเดือนด้วย PromptPay สะดวกสบาย" : "ไม่มีค่าบริการผูกมัดหรือแอบแฝง"}
          </div>
        </div>

      </div>

      {/* Feature Tracking and Progress Bars List */}
      <div className="space-y-4 pt-4 border-t nonga-border">
        <h4 className="text-xs font-black nonga-text-muted uppercase tracking-wider">
          สรุประดับโควต้าและเกตเวย์ความสามารถ AI
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1.5">
          {featuresStats.map((stat) => {
            const hasFreeLimit = stat.info.isUnlockedInFree;
            
            return (
              <div 
                key={stat.info.id} 
                className="p-4 rounded-xl border nonga-border hover:border-[var(--nonga-border-strong)] nonga-bg-elevated space-y-3 relative overflow-hidden group transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{stat.info.emoji}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm nonga-text-primary flex items-center gap-1.5 flex-wrap">
                        {stat.info.name}
                        {!hasFreeLimit && (
                          <span className="inline-flex items-center gap-0.5 text-[8.5px] nonga-action font-black px-1.5 py-0.5 rounded uppercase">
                            Premium <Crown className="w-2 h-2" />
                          </span>
                        )}
                      </h4>
                      <p className="text-[10.5px] nonga-text-muted">{stat.info.thaiName}</p>
                    </div>
                  </div>
                  
                  {isPremium ? (
                    <span className="shrink-0 text-[10.5px] font-black text-[var(--nonga-success)] flex items-center gap-0.5 bg-[color-mix(in_srgb,var(--nonga-success)_12%,transparent)] px-2.5 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--nonga-success)_30%,transparent)]">
                      <Unlock className="w-3 h-3 shrink-0" /> พร้อมใช้งานอันลิมิต
                    </span>
                  ) : stat.allowed ? (
                    <span className="shrink-0 text-[10.5px] font-bold text-[var(--nonga-info)] flex items-center gap-0.5 bg-[color-mix(in_srgb,var(--nonga-info)_12%,transparent)] px-2.5 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--nonga-info)_30%,transparent)]">
                      <Unlock className="w-3 h-3 shrink-0" /> ปลดล็อก
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10.5px] font-bold text-[var(--nonga-error)] flex items-center gap-0.5 bg-[color-mix(in_srgb,var(--nonga-error)_12%,transparent)] px-2.5 py-0.5 rounded-full border border-[color-mix(in_srgb,var(--nonga-error)_30%,transparent)]">
                      <Lock className="w-3 h-3 shrink-0" /> ล็อกโควต้าแล้ว
                    </span>
                  )}
                </div>

                <p className="text-[11px] nonga-text-secondary leading-relaxed text-left">
                  {stat.info.description}
                </p>

                {/* Progress Bar (Only visible in Free for free-unlocked features) */}
                {hasFreeLimit && !isPremium && (
                  <div className="pt-2">
                    <UsageProgressBar featureId={stat.info.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
