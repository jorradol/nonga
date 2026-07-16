import React, { useState, useEffect } from "react";
import { 
  Sparkles, Camera, Copy, Check, Heart, HeartOff, Trash2, Award, 
  RotateCw, RefreshCw, Smartphone, ShieldCheck, Zap, Info, 
  Flame, HelpCircle, ArrowRight, Share2, LineChart, MessageSquare, 
  Smile, Lightbulb, Star, BadgeAlert, Send, FileText, ChevronRight,
  TrendingUp, AlertCircle, Sparkle, Lock, Crown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { captionService } from "../../services/ai/captions/captionService";
import { hookService } from "../../services/ai/hooks/hookService";
import { useAiPremium } from "../../hooks/ai-premium/useAiPremium";
import { 
  CarSpecsInput, CaptionType, SocialPlatform, EmojiOption, 
  GeneratedCaption, FavoritedCaption, CaptionTrend 
} from "../../types/ai/captions";
import { PremiumAiBadge, UsageProgressBar, UpgradeModal } from "../ai-premium/AiPremiumComponents";

// Sample prefilled cars for interactive testing
const SAMPLE_PREFILLS = [
  {
    brand: "Honda",
    model: "Civic FE EL+",
    year: "2022",
    price: 849000,
    mileage: 28000,
    condition: "สภาพนางฟ้า สีเดิมบางทั้งคัน ไร้อุบัติเหตุแกะน็อต",
    modifications: "ชุดแต่ง Modulo แท้รอบคัน ล้อขอบ 17 รมดำ ฟิล์มเซรามิคกันร้อนสูง",
    customNotes: "เจ้าของดูแลดีเลิศ จอดในร่มตลอด มีประกันศูนย์เหลือถึงปลายปี เช็คประวัติได้ครบครับ"
  },
  {
    brand: "Toyota",
    model: "Fortuner 2.4 Legender",
    year: "2021",
    price: 1190000,
    mileage: 62000,
    condition: "ยอดเยี่ยม ไร้ริ้วรอย เบาะหลังไม่เคยใช้งาน เช็คประวัติศูนย์โตโยต้าตลอด",
    modifications: "เดิมๆ เกียร์สมบูรณ์ 100% เพิ่มกล้องบันทึกหน้ารถเลนส์กว้าง 4K",
    customNotes: "รถครอบครัวตัวท็อป ประหยัดน้ำมัน ขับนุ่มนวลทรงสมาร์ท ทะนุถนอมประหนึ่งลูกในไส้"
  },
  {
    brand: "BYD",
    model: "Atto 3 Extended Range",
    year: "2023",
    price: 799000,
    mileage: 18000,
    condition: "เหมือนป้ายแดง 99% ตัวแบตเตอรี่และระบบขับเคลื่อนสมบูรณ์ที่สุด",
    modifications: "ติดฟิล์มใสกันรอยรอบปุ่มหน้าจอภายใน เคลือบแก้วพรีเมียมสปีดคลาส",
    customNotes: "รถยนต์ไฟฟ้า EV ประหยัดคุ้มค่า แบตเตอรี่ถนอมอย่างดี ขับชิวๆ เที่ยวห้างหรือลุยต่างจังหวัดสบายใจ"
  }
];

export function CaptionEngineDashboard() {
  const { checkGate, triggerUsage, subscription } = useAiPremium();
  // Theme colors use semantic tokens via html.dark (app theme toggle).

  // 1. Core State Input specs
  const [specs, setSpecs] = useState<CarSpecsInput>({
    brand: "Honda",
    model: "Civic FE",
    year: "2022",
    price: "849000",
    mileage: "28000",
    condition: "สภาพนางฟ้า สีบางเดิมประวัติศูนย์ครบถ้วน",
    modifications: "แต่งพาร์ทสปอร์ตรอบคัน",
    customNotes: ""
  });

  // 2. Settings state
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>("facebook");
  const [activeType, setActiveType] = useState<CaptionType>("hooks");
  const [emojiOption, setEmojiOption] = useState<EmojiOption>("medium");
  const [trendMultiplier, setTrendMultiplier] = useState(true);

  // 3. Status state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedCaption | null>(null);
  const [recentTrends, setRecentTrends] = useState<CaptionTrend[]>([]);
  const [favorites, setFavorites] = useState<FavoritedCaption[]>([]);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});

  // 4. Hook Evaluator playground state
  const [customHookCandidate, setCustomHookCandidate] = useState("");
  const [hookEvaluationResult, setHookEvaluationResult] = useState<{ score: number; feedback: string; label: string } | null>(null);

  // Load trends & favorites initial
  useEffect(() => {
    const loadTrendsAndFavorites = async () => {
      try {
        const trends = await captionService.getMarketTrends();
        setRecentTrends(trends);
      } catch (e) {
        console.error(e);
      }
      setFavorites(captionService.getFavorites());
    };
    loadTrendsAndFavorites();
  }, []);

  // Update hook evaluation when user types
  useEffect(() => {
    if (customHookCandidate) {
      const evaluation = hookService.evaluateCustomHook(customHookCandidate);
      setHookEvaluationResult(evaluation);
    } else {
      setHookEvaluationResult(null);
    }
  }, [customHookCandidate]);

  // Handle random prefill loader
  const handleRandomPrefill = (index: number) => {
    const target = SAMPLE_PREFILLS[index];
    setSpecs({
      brand: target.brand,
      model: target.model,
      year: target.year,
      price: target.price.toString(),
      mileage: target.mileage.toString(),
      condition: target.condition,
      modifications: target.modifications,
      customNotes: target.customNotes
    });
  };

  // Run generation logic
  const handleGenerateCaption = async () => {
    // A. Premium quota gate check
    const allowed = await checkGate("caption-generator");
    if (!allowed) {
      return; // Stops execution and triggers membership modal window
    }

    setIsGenerating(true);
    try {
      // Call service
      const result = await captionService.generateCaption(
        specs,
        activeType,
        activePlatform,
        emojiOption,
        trendMultiplier
      );
      setGeneratedResult(result);

      // B. Consume quota / register usage
      await triggerUsage("caption-generator");
    } catch (e: any) {
      console.error("Caption generation fail:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Favorite handler
  const handleToggleFavorite = () => {
    if (!generatedResult) return;
    const isFav = favorites.some(f => f.id === generatedResult.id);
    if (isFav) {
      const match = favorites.find(f => f.id === generatedResult.id);
      if (match) {
        const updated = captionService.removeFavorite(match.favoriteId);
        setFavorites(updated);
      }
    } else {
      const updated = captionService.saveFavorite(generatedResult, "เซฟจากการรังสรรค์แบบเจ๋งๆ");
      setFavorites(updated);
    }
  };

  const handleRemoveFavorite = (favoriteId: string) => {
    const updated = captionService.removeFavorite(favoriteId);
    setFavorites(updated);
  };

  // Handy copy utilities with local feedback states
  const triggerCopyNotification = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyStatus((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const platformsList = [
    { id: "facebook", label: "Facebook", emoji: "👥", desc: "โพสต์กลุ่ม/หน้าเพจแบบเว้นระยะช่องไฟละเอียด" },
    { id: "tiktok", label: "TikTok Video", emoji: "🎬", desc: "สั้นรวบรัดดึงฮุกสอดแท็กกระแสความร้อนแรง" },
    { id: "instagram", label: "Instagram", emoji: "📸", desc: "สเปซย่อหน้าเป็นระเบียบ เน้นอิโมจิจับใจสบตา" },
    { id: "x", label: "X / Twitter", emoji: "🐦", desc: "จำกัดคำสั้นกระชับลากเข้ากล่องจดหมาย" },
    { id: "marketplace", label: "Marketplace", emoji: "🛒", desc: "สะอาดตา มั่นคง แจกแจงราคาและ CTAs แม่นยำ" }
  ] as const;

  const captionTypesList = [
    { id: "hooks", name: "Short Hooks", thaiName: "ฮุกเร้าอารมณ์ 🔥", desc: "คำเปิดตัวแรงกระตุ้นต่อมอยากได้" },
    { id: "emotional", name: "Emotional", thaiName: "เล่าเรื่องซึ้งใจ 💖", desc: "เล่าถึงคู่หู ความผูกพัน อบอุ่นครอบครัว" },
    { id: "luxury", name: "Luxury Mode", thaiName: "หรูระดับไฮโซ 💎", desc: "ภาษาภาพลักษณ์หรูหรา ภูมิฐาน ดูแพง" },
    { id: "funny", name: "Funny/Comedy", thaiName: "ตลกขำขัน 😆", desc: "คำเปรียบเปรยเรียกเสียงหัวเราะ ปั่นๆ" },
    { id: "tiktok", name: "TikTok Slang", thaiName: "ตัวตึงวัยรุ่น ⚡", desc: "ศัพท์โซเชียลร้อนแรง ปังปุริเย่" },
    { id: "dealer", name: "Professional", thaiName: "มาตรฐานดีลเลอร์ 🛡️", desc: "คัดกรองทางการ การันตีตรวจสภาพน่าเชื่อถือ" },
    { id: "urgency", name: "Urgency CTA", thaiName: "เร่งรีบตัดใจจอง 🚨", desc: "กระตุ้นปิดยอดด่วนก่อนหลุดมือ" },
    { id: "seo", name: "SEO Optimization", thaiName: "เน้นกระแสค้นหา 🔎", desc: "ยัดคีย์เวิร์ดติดอันดับหน้าแรกเบราเซอร์" }
  ] as const;

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* 1. Header Hero Segment */}
      <div className="relative p-6 sm:p-8 rounded-2xl border nonga-bg-elevated nonga-border nonga-text-primary text-left overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PremiumAiBadge size="md" />
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-widest">
                Viral Caption Engine v2.0
              </span>
            </div>
            
            <h1 className="font-display font-black text-2xl sm:text-3xl nonga-text-primary tracking-tight">
              ระบบแต่งแคปชั่นสลักไวรัล <span className="text-orange-500">เรียกหมื่นไลก์ ล้านยอดแชร์ 💎</span>
            </h1>
            <p className="text-xs sm:text-sm nonga-text-secondary max-w-2xl leading-relaxed">
              สกัดเค้นเสน่ห์แบรนด์ ยัดถ้อยคำเด็ดลื่นหูลื่นใจ พร้อมอิโมจิจับตาและระบบการให้คะแนนความน่าจะเป็นไวรัลโดยโมเดลอัจฉริยะ Nong A AI เพื่อปิดจองในช้อนชาเดียว!
            </p>
          </div>

          <div className="border nonga-border nonga-bg-surface p-4 rounded-xl shrink-0 min-w-[200px] text-right space-y-2.5">
            <UsageProgressBar featureId="caption-generator" label="โควต้าปั่นแคปชั่นของคุณ" />
            <div className="text-[10px] nonga-text-muted">
              * สมาชิกแบบพรีเมียมสามารถใช้งานได้ไม่จำกัดและปลดล็อกโหมดลึกสูงสุด
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Split Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Input & Configurations column (7/12 stats) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* A. Specifications block */}
          <div className="p-5 sm:p-6 rounded-2xl border nonga-bg-surface nonga-border space-y-5 text-left">
            
            <div className="flex items-center justify-between border-b pb-3 border-orange-500/10">
              <h3 className="font-display font-black text-base nonga-text-primary flex items-center gap-1.5">
                <FileText className="w-4.5 h-4.5 text-orange-500" />
                <span>ระบุสเป็ครถที่คุณต้องการแต่งแคปชั่น</span>
              </h3>
              
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold nonga-text-secondary mr-2">สุ่มรถตัวอย่าง:</span>
                {["Civic FE 🚗", "Legender 🏔️", "BYD Atto 🔋"].map((prefTitle, index) => (
                  <button
                    key={index}
                    onClick={() => handleRandomPrefill(index)}
                    className="p-1 px-2 border nonga-border hover:border-[var(--nonga-brand)] text-[10px] font-semibold rounded nonga-bg-subtle hover:bg-[color-mix(in_srgb,var(--nonga-brand)_10%,transparent)] transition cursor-pointer nonga-text-secondary hover:text-[var(--nonga-brand)] nonga-focus-ring"
                  >
                    {prefTitle}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase">ยี่ห้อ (Brand)</label>
                <input 
                  type="text" 
                  value={specs.brand}
                  onChange={(e) => setSpecs({ ...specs, brand: e.target.value })}
                  placeholder="เช่น Honda, Toyota, BYD..."
                  className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase">รุ่นย่อย/เกรด (Model)</label>
                <input 
                  type="text" 
                  value={specs.model}
                  onChange={(e) => setSpecs({ ...specs, model: e.target.value })}
                  placeholder="เช่น Civic FE EL+, Fortuner..."
                  className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase">ปีจดทะเบียน (Year)</label>
                <input 
                  type="text" 
                  value={specs.year}
                  onChange={(e) => setSpecs({ ...specs, year: e.target.value })}
                  placeholder="เช่น 2022 หรือ 2565..."
                  className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase">ราคาแสนบาท (Price in THB)</label>
                <input 
                  type="number" 
                  value={specs.price}
                  onChange={(e) => setSpecs({ ...specs, price: e.target.value })}
                  placeholder="เช่น 849000..."
                  className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase">เลขไมล์วิ่ง (Mileage in KM)</label>
                <input 
                  type="number" 
                  value={specs.mileage}
                  onChange={(e) => setSpecs({ ...specs, mileage: e.target.value })}
                  placeholder="เช่น 28000..."
                  className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase">สภาพตัวรถยนต์ (Condition Detailed)</label>
                <textarea 
                  rows={2}
                  value={specs.condition}
                  onChange={(e) => setSpecs({ ...specs, condition: e.target.value })}
                  placeholder="เช่น สภาพสวยบางเดิม ไม่ลุยชนน็อต ยางเพิ่งเปลี่ยน..."
                  className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase">ของแต่งเพิ่มเติม (Custom Modifications)</label>
                <textarea 
                  rows={2}
                  value={specs.modifications}
                  onChange={(e) => setSpecs({ ...specs, modifications: e.target.value })}
                  placeholder="เช่น แม็กซ์ขอบ 18 แท้ ฟิล์มคาร์บอน พาร์ทชุดแต่ง..."
                  className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring resize-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold nonga-text-secondary uppercase">ข้อความดึงดูด/ประวัติตัวจริงจากคุณผู้ขายเพิ่มเติม (Notes/Custom Story)</label>
              <input 
                type="text" 
                value={specs.customNotes}
                onChange={(e) => setSpecs({ ...specs, customNotes: e.target.value })}
                placeholder="เช่น รถคันโปรดใช้ถนอมมาก แถมรับประกันภัยชั้นหนึ่งเคลือบแก้วให้ฟรี"
                className="w-full text-xs p-2.5 rounded-lg border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring"
              />
            </div>

          </div>

          {/* B. Settings Option Block */}
          <div className="p-5 sm:p-6 rounded-2xl border nonga-bg-surface nonga-border space-y-6 text-left">
            
            {/* Split B1: Platform selection tabs */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-orange-500/10">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <h4 className="font-display font-bold text-xs sm:text-sm nonga-text-primary">
                  เลือกช่องทางโฆษณาเป้าหมาย (Format Target Platform)
                </h4>
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 pt-1.5">
                {platformsList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlatform(p.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all select-none cursor-pointer nonga-focus-ring ${
                      activePlatform === p.id
                        ? "bg-[color-mix(in_srgb,var(--nonga-brand)_14%,var(--nonga-bg-surface))] border-[var(--nonga-brand)] text-[var(--nonga-action-primary)] shadow-md shadow-orange-600/10 scale-102 font-black"
                        : "nonga-bg-subtle border nonga-border nonga-text-secondary hover:border-[var(--nonga-border-strong)] hover:text-[var(--nonga-text-primary)]"
                    }`}
                  >
                    <span className="text-sm">{p.emoji}</span>
                    <span className="text-[11px] leading-none tracking-tight">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Split B2: Caption Tone / Type Grid with premium indicators */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-orange-500/10">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <h4 className="font-display font-bold text-xs sm:text-sm nonga-text-primary">
                  เลือกสไตล์ออพติไมเซชันไวรัล (Select Tone/Caption Type)
                </h4>
              </div>
              
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 pt-1.5">
                {captionTypesList.map((t) => {
                  const isActive = activeType === t.id;
                  
                  // Some cool visual style rules
                  const isPremiumOnly = ["luxury", "funny", "tiktok", "emotional", "urgency"].includes(t.id);
                  const isUserPremium = subscription?.tier === "premium";

                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveType(t.id)}
                      className={`p-3 rounded-xl border relative text-left flex flex-col justify-between gap-2.5 transition group cursor-pointer nonga-focus-ring ${
                        isActive
                          ? "bg-[color-mix(in_srgb,var(--nonga-brand)_8%,var(--nonga-bg-surface))] border-[var(--nonga-brand)] shadow-[0_0_15px_rgba(249,115,22,0.06)]"
                          : "nonga-bg-subtle border nonga-border hover:border-[var(--nonga-border-strong)] hover:bg-[var(--nonga-bg-elevated)]"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${isActive ? "text-[var(--nonga-action-primary)]" : "nonga-text-primary"}`}>
                            {t.thaiName}
                          </span>
                          {isPremiumOnly && !isUserPremium && (
                            <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] nonga-text-muted line-clamp-2 leading-relaxed">
                          {t.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split B3: Emoji density selector and trend check */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-orange-500" /> ระดับความหนาแน่นอิโมจิ (Emoji Optimizing Scale)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "minimal", label: "มินิมอล/สุภาพ", emoji: "💼" },
                    { id: "medium", label: "พรีเมียมพอดี", emoji: "✨" },
                    { id: "high", label: "จัดเต็มไฟลุก", emoji: "🔥🔥" }
                  ].map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEmojiOption(e.id as EmojiOption)}
                      className={`p-2 rounded-lg border text-center text-xs font-semibold flex items-center justify-center gap-1 transition-all select-none cursor-pointer nonga-focus-ring ${
                        emojiOption === e.id
                          ? "bg-[color-mix(in_srgb,var(--nonga-brand)_15%,transparent)] border-[var(--nonga-brand)] text-[var(--nonga-action-primary)] font-bold"
                          : "nonga-bg-subtle border nonga-border nonga-text-secondary hover:text-[var(--nonga-text-primary)]"
                      }`}
                    >
                      <span>{e.emoji}</span>
                      <span className="text-[10.5px]">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold nonga-text-secondary uppercase flex items-center gap-1">
                  <LineChart className="w-3.5 h-3.5 text-orange-500" /> ดึงแสลงไวรัล 2026 (Trend Multiplier Integration)
                </label>
                <div 
                  onClick={() => setTrendMultiplier(!trendMultiplier)}
                  className={`p-2 px-3 border rounded-lg flex items-center justify-between cursor-pointer transition select-none nonga-focus-ring ${
                    trendMultiplier 
                      ? "bg-[color-mix(in_srgb,var(--nonga-brand)_10%,transparent)] border-[color-mix(in_srgb,var(--nonga-brand)_40%,transparent)] text-[var(--nonga-action-primary)]" 
                      : "nonga-bg-subtle border nonga-border nonga-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">{trendMultiplier ? "เปิดดึงกระแส (ON)" : "ปิดดึงกระแส (OFF)"}</span>
                    {trendMultiplier && <Sparkle className="w-3.5 h-3.5 animate-bounce text-orange-500" />}
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-all ${trendMultiplier ? "bg-[var(--nonga-brand)]" : "bg-[var(--nonga-border-strong)]"}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-all ${trendMultiplier ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch trigger button */}
            <div className="pt-2">
              <button
                disabled={isGenerating}
                onClick={handleGenerateCaption}
                className="w-full py-4.5 nonga-action nonga-focus-ring disabled:opacity-50 font-display font-black text-sm uppercase tracking-wider rounded-2xl cursor-pointer active:scale-98 transition shadow-[0_6px_25px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>น้องเอ AI กำลังวิเคราะห์สิถิติมวลชนปั่นไวรัล...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 animate-pulse text-white fill-current" />
                    <span>สร้างแคปชั่นไวรัล ดันยอดหัวใจล้านแชร์ด่วน 🪄</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* C. Trend Analysis Info Block */}
          {recentTrends.length > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl border nonga-bg-surface nonga-border space-y-4 text-left">
              
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-orange-500/10">
                <TrendingUp className="w-4.5 h-4.5 text-orange-500" />
                <h3 className="font-display font-black text-xs sm:text-sm nonga-text-primary">
                  สถิติคีย์เวิร์ดยอดนิยมและอัตราการโตในประเทศไทย (Nong Bot Social Pulse 🚀)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
                {recentTrends.map((t, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setSpecs(prev => ({
                        ...prev,
                        customNotes: prev.customNotes ? `${prev.customNotes} ${t.keyword}` : t.keyword
                      }));
                    }}
                    className="p-3 rounded-xl border nonga-border nonga-bg-elevated text-left space-y-1 hover:border-[var(--nonga-brand)] transition cursor-pointer select-none relative group"
                  >
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono font-bold leading-none uppercase">
                      {t.category}
                    </span>
                    <h5 className="font-bold text-[11px] nonga-text-primary line-clamp-1 group-hover:text-[var(--nonga-brand)]">
                      "{t.keyword}"
                    </h5>
                    <div className="flex items-center justify-between text-[10px] nonga-text-muted font-bold font-mono">
                      <span>โต {t.growth}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] nonga-text-muted">
                * คลิกการ์ดกระแสเพื่อเพิ่มคำสำคัญเข้าไปในบันทึกผู้สร้างของคุณทันที อัปเดตข้อมูลพิกเซลสตรีมเมอร์เรียลไทม์
              </p>

            </div>
          )}

          {/* D. Custom Hook Sandbox / Evaluator */}
          <div className="p-5 sm:p-6 rounded-2xl border nonga-bg-surface nonga-border space-y-5 text-left">
            
            <div className="flex items-center gap-1.5 pb-2 border-b border-orange-500/10">
              <Lightbulb className="w-4.5 h-4.5 text-orange-500" />
              <h3 className="font-display font-black text-xs sm:text-sm nonga-text-primary">
                สนามประลองประเมินคำพาดหัว (Hook Evaluation & Tuning Sandbox)
              </h3>
            </div>

            <div className="space-y-3.5">
              <p className="text-[11px] nonga-text-secondary sm:max-w-xl leading-relaxed">
                พิมพ์แต่งประโยคจู่โจมสายตาลูกค้าคนโปรดของคุณ แล้วดูสรุปเกรดวัดคุณภาพและการสแกนปรับแต่งดั้งเดิมจากดีลเซอร์อัจฉริยะของน้องเอ
              </p>

              <div className="space-y-1.5">
                <input 
                  type="text"
                  value={customHookCandidate}
                  onChange={(e) => setCustomHookCandidate(e.target.value)}
                  placeholder="เช่น ปังปุริเย่! รถบ้านแท้สี่ล้อ คันนี้หล่อดึงตาเเสงไฟเลยคนทักแน่นอน..."
                  className="w-full text-xs p-3.5 rounded-xl border outline-none nonga-bg-elevated nonga-border-strong nonga-text-primary nonga-placeholder nonga-focus-ring"
                />
              </div>

              {hookEvaluationResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    hookEvaluationResult.score >= 85 
                      ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400" 
                      : hookEvaluationResult.score >= 65 
                      ? "bg-amber-500/5 border-amber-500/25 text-amber-400" 
                      : "bg-rose-500/5 border-rose-500/25 text-rose-400"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">สรุปการตรวจสอบเนื้อหา</span>
                    <h4 className="font-black text-sm flex items-center gap-1.5">
                      <span>คะแนน: {hookEvaluationResult.score} / 100</span>
                      <span className="text-xs py-0.5 px-1.5 rounded nonga-bg-subtle text-[var(--nonga-action-primary)] font-bold border nonga-border">
                        {hookEvaluationResult.label}
                      </span>
                    </h4>
                    <p className="text-xs nonga-text-secondary pt-0.5 leading-relaxed">
                      💡 คำติชม: {hookEvaluationResult.feedback}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSpecs(prev => ({ ...prev, customNotes: customHookCandidate }));
                      setCustomHookCandidate("");
                    }}
                    className="p-2 nonga-bg-elevated border nonga-border text-[10.5px] font-bold rounded-xl nonga-text-secondary hover:text-[var(--nonga-text-primary)] cursor-pointer active:scale-95 transition nonga-focus-ring"
                  >
                    ใช้วลีนี้แต่งโพสต์หลัก 🎯
                  </button>
                </motion.div>
              )}

              {/* Ready-to-use hooks package */}
              <div className="space-y-2 pt-1 border-t border-orange-500/5">
                <span className="text-[11px] font-bold nonga-text-secondary block">ถ้อยคำพาดหัวสำเร็จรูปนำรหัส (Nong A Signature Hooks Choice):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hookService.getPrecalculatedViralHooks(specs.brand, specs.model, specs.year).map((h, i) => (
                    <div 
                      key={i}
                      onClick={() => setCustomHookCandidate(h.text)}
                      className="p-2.5 rounded-lg border nonga-border nonga-bg-elevated nonga-text-primary text-xs cursor-pointer hover:border-[var(--nonga-brand)] text-left transition select-none flex justify-between items-center nonga-focus-ring"
                    >
                      <span className="line-clamp-1 text-[11px]">{h.text}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 text-orange-500" />
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Right Output Side bar column (5/12 stats) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* E. Large Live Generative Presentation Screen */}
          <div className="p-5 sm:p-6 rounded-2xl border nonga-bg-surface nonga-border relative space-y-6 text-left min-h-[500px] flex flex-col justify-between">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 rounded-t-2xl" />

            <div className="space-y-4">
              
              <div className="flex items-center justify-between border-b pb-3.5 border-orange-500/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-5.5 h-5.5 rounded-lg bg-orange-600/15 flex items-center justify-center text-orange-500 font-bold text-xs">
                    เอ
                  </div>
                  <span className="font-display font-black text-sm nonga-text-primary">
                    กล่องแสดงผลไวรัลแคปชั่น (Output Display)
                  </span>
                </div>

                {generatedResult && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleFavorite}
                      className={`p-1.5 rounded-lg border transition nonga-focus-ring ${
                        favorites.some(f => f.id === generatedResult.id)
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                          : "nonga-border nonga-bg-subtle nonga-text-muted hover:bg-[var(--nonga-bg-elevated)]"
                      }`}
                      title="เก็บแคปชั่นนี้เข้าคลังโปรด"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => triggerCopyNotification("text", generatedResult.text)}
                      className="p-1.5 rounded-lg border nonga-border nonga-bg-subtle nonga-text-muted hover:bg-[var(--nonga-bg-elevated)] hover:text-[var(--nonga-text-primary)] transition flex items-center gap-1 text-[10.5px] nonga-focus-ring"
                    >
                      {copyStatus["text"] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copyStatus["text"] ? "คัดลอกแล้ว!" : "คัดลอกโพสต์"}</span>
                    </button>
                  </div>
                )}
              </div>

              {!generatedResult ? (
                <div className="py-20 text-center space-y-4 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-xl animate-pulse">
                    🦄
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-black font-display text-sm text-slate-900 dark:text-white nonga-text-primary">พร้อมเริ่มปั้นคำโดนใจวัยรุ่นแล้วครับ</h4>
                    <p className="text-xs nonga-text-secondary max-w-xs leading-relaxed mx-auto">
                      กรอกรายละเอียดรถเกรดบ้านด้านซ้ายมือ เลือกช่องทางและสไตล์ จากนั้นระเบิดระนาบปุ่มสร้างได้ทันทีเลยคร้าบ!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in text-left">
                  
                  {/* Dynamic Indicators Header */}
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {generatedResult.platform.toUpperCase()} Format
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      TONE: {generatedResult.type.toUpperCase()}
                    </span>
                  </div>

                  {/* Core Caption Body Box */}
                  <div className="p-4 rounded-xl border font-mono text-[11.5px] leading-relaxed select-text whitespace-pre-wrap selection:bg-orange-500/20 nonga-text-primary nonga-border nonga-bg-elevated max-h-[300px] overflow-y-auto">
                    {generatedResult.text}
                  </div>

                  {/* Key Highlights Segment split hooks & CTAs */}
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    
                    <div className="p-3.5 rounded-xl border nonga-border nonga-bg-elevated text-left space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold nonga-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-500" /> ประโยคพาดหัวเด็ดสกัดได้ (Primary Hook)
                        </span>
                        <button 
                          onClick={() => triggerCopyNotification("hook", generatedResult.hook)}
                          className="text-[10px] nonga-link-accent font-bold"
                        >
                          {copyStatus["hook"] ? "คัดลอกแล้ว!" : "คัดลอกเฉพาะฮุก 🎯"}
                        </button>
                      </div>
                      <p className="text-[11px] font-bold nonga-text-primary leading-relaxed">
                        "{generatedResult.hook}"
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border nonga-border nonga-bg-elevated text-left space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold nonga-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-orange-500" /> คำปิดท้ายเชิญจองปิดดีล (Principal CTA)
                        </span>
                        <button 
                          onClick={() => triggerCopyNotification("cta", generatedResult.cta)}
                          className="text-[10px] text-orange-400 hover:text-orange-300 font-bold"
                        >
                          {copyStatus["cta"] ? "คัดลอกแล้ว!" : "คัดลอกเฉพาะ CTA 📞"}
                        </button>
                      </div>
                      <p className="text-[11px] nonga-text-secondary leading-relaxed">
                        {generatedResult.cta}
                      </p>
                    </div>

                  </div>

                  {/* F. Viral Potential Scoring breakdown */}
                  <div className="p-4 rounded-xl border border-orange-500/10 bg-[color-mix(in_srgb,var(--nonga-brand)_4%,var(--nonga-bg-elevated))] text-left space-y-4">
                    
                    <div className="flex items-center justify-between border-b pb-2 border-orange-500/5">
                      <h4 className="font-display font-black text-xs nonga-text-primary uppercase tracking-widest flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" /> สรุปคะแนนประมูลไวรัส (Viral Quality Analysis)
                      </h4>
                      <span className="font-mono text-base font-black text-[var(--nonga-action-primary)]">
                        {generatedResult.score.overall} / 100
                      </span>
                    </div>

                    <div className="space-y-3">
                      {generatedResult.score.breakdown.map((b, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="nonga-text-muted">{b.title}</span>
                            <span className="font-mono nonga-text-primary">{b.score} / 100</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full nonga-bg-subtle border nonga-border relative overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-[var(--nonga-brand)]"
                              style={{ width: `${b.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Expert Suggestions List */}
                    <div className="space-y-2 pt-2 border-t border-orange-500/5">
                      <span className="text-[10px] font-black nonga-text-primary uppercase tracking-wider block">ข้อแนะนำดั้งเดิมเพิ่มพลังโพสต์ยอดฮิต (AI Advisor Checklist):</span>
                      <ul className="text-[10.5px] nonga-text-secondary space-y-1.5 pl-1 text-[11px]">
                        {generatedResult.score.suggestions.map((s, idx) => (
                          <li key={idx} className="flex gap-2 items-start leading-relaxed">
                            <span className="text-orange-500 shrink-0 select-none">✔</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* Deck of Hashtags */}
            {generatedResult && generatedResult.hashtags.length > 0 && (
              <div className="pt-4 border-t border-orange-500/5 text-left">
                <span className="text-[10px] font-bold nonga-text-muted uppercase tracking-widest block mb-2">แท็กกระแสดันฟีด:</span>
                <div className="flex flex-wrap gap-1.5">
                  {generatedResult.hashtags.map((h, i) => (
                    <span 
                      key={i}
                      onClick={() => triggerCopyNotification(`tag_${i}`, `#${h}`)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono hover:text-[var(--nonga-brand)] hover:border-[var(--nonga-brand)] cursor-pointer select-none transition border nonga-border nonga-bg-elevated nonga-text-muted"
                      title="คลิกเพื่อคัดลอกแท็กนี้"
                    >
                      #{h}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* G. Saved Favorites Deck Panel */}
          {favorites.length > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl border nonga-bg-surface nonga-border space-y-4 text-left">
              
              <div className="flex items-center justify-between border-b pb-2 border-orange-500/10">
                <h3 className="font-display font-black text-xs sm:text-sm nonga-text-primary flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>คลังแคปชั่นสุดโปรดของคุณ ({favorites.length} โพสต์)</span>
                </h3>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {favorites.map((fav) => (
                  <div 
                    key={fav.favoriteId}
                    className="p-3.5 rounded-xl border nonga-border nonga-bg-elevated text-left space-y-3 relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-orange-500/10 text-orange-400">
                          {fav.platform.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase nonga-bg-subtle border nonga-border nonga-text-muted">
                          {fav.type}
                        </span>
                        <span className="text-[10px] font-bold nonga-text-primary">
                          {fav.specsUsed.brand} {fav.specsUsed.model} ({fav.specsUsed.year})
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => handleRemoveFavorite(fav.favoriteId)}
                        className="p-1 rounded hover:bg-rose-500/10 nonga-text-muted hover:text-rose-500 cursor-pointer transition select-none"
                        title="ลบออกจากคลังด่วน"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs nonga-text-secondary line-clamp-3 leading-relaxed whitespace-pre-wrap select-text selection:bg-orange-500/20 py-1 nonga-bg-subtle p-2 rounded border nonga-border">
                      {fav.text}
                    </p>

                    <div className="flex justify-between items-center nonga-bg-subtle p-2 rounded text-[10.5px] border nonga-border">
                      <span className="text-[9.5px] font-mono nonga-text-muted">
                        เรตติ้งศักยภาพ {fav.score.overall}%
                      </span>
                      
                      <button
                        onClick={() => triggerCopyNotification(fav.favoriteId, fav.text)}
                        className="text-[10px] nonga-link-accent font-bold flex items-center gap-1 shrink-0"
                      >
                        {copyStatus[fav.favoriteId] ? "คัดลอกสำเร็จ!" : "คัดลอกโพสต์หลัก 📋"}
                      </button>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Global upgrade simulation pop-up helper */}
      <UpgradeModal />

    </div>
  );
}
