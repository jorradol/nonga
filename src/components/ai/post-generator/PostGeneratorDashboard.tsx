import React, { useState, useCallback } from "react";
import { sanitizeAiText } from "../../../services/ai/post-generator/apiHelpers";
import CarPostStyleSelector from "../../cars/create/CarPostStyleSelector";
import { 
  Sparkles, Car, FileText, Check, Copy, RotateCcw, 
  HelpCircle, ChevronRight, Sliders, Hash, Globe, 
  Languages, Eye, Facebook, Video, Search, MessageSquare,
  ThumbsUp, ArrowRight, Heart, Star, CheckCircle, Crown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCarPostGenerator } from "../../../hooks/ai/post/useCarPostGenerator";
import CarPostGeneratorRegenerateSection from "../../cars/create/CarPostGeneratorRegenerateSection";
import { PostTone } from "../../../types/ai/post-generator";
import { PremiumAiBadge, UsageProgressBar, LockedFeatureCard, UpgradeModal, AiUsageDashboard } from "../../ai-premium/AiPremiumComponents";
import { useAppStore } from "../../../store";

export function PostGeneratorDashboard() {
  const {
    specs,
    options,
    postStyle,
    currentStep,
    questions,
    isLoading,
    isBusy,
    canGenerate,
    workflowError,
    generatedResults,
    updateSpecs,
    updateOptions,
    updatePostStyle,
    setCurrentStep,
    startAnalysis,
    updateAnswer,
    generateFinalPosts,
    regeneratePosts,
    isRegenerating,
    activeRegenerateMode,
    resetGenerator,
    clearWorkflowError,
  } = useCarPostGenerator();

  const isDarkMode = useAppStore((state) => state.isDarkMode);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"facebook" | "tiktok" | "seo" | "marketing">("facebook");

  const handleCopy = useCallback(async (text: string, key: string) => {
    const safe = sanitizeAiText(text, 12000);
    if (!safe) return;
    try {
      await navigator.clipboard.writeText(safe);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      /* clipboard denied */
    }
  }, []);

  const tones: { id: PostTone; label: string; desc: string; emoji: string }[] = [
    { id: "dealer", label: "แบรนด์ดีลเลอร์มืออาชีพ", desc: "สุภาพ น่าเชื่อถือ เน้นสเป็คสมบูรณ์และบริการเป็นเลิศ", emoji: "👔" },
    { id: "youth", label: "วัยรุ่นตัวตึงสายซิ่ง", desc: "เท่ สปอร์ต สนุกสนาน ใช้คำตามเทรนด์วัยรุ่นสร้างตัว", emoji: "⚡" },
    { id: "luxury", label: "ระดับหรูดูแพงเลอค่า", desc: "สุภาพภูมิฐาน เน้นอารมณ์ความพรีเมียม สันขอบโดดเด่น", emoji: "💎" },
    { id: "friendly", label: "คนบ้านใจดีถนอมรถ", desc: "อบอุ่น ตรงไปตรงมา รักเหมือนลูกในไส้ จริงใจสูง", emoji: "🏠" },
    { id: "tiktok", label: "ติ๊กต๊อกเกอร์ไวรัลเพลย์", desc: "สั้น กระชับ มีฮุคเรียกกระแส ดึงความสนใจใน 3 วินาที", emoji: "🎬" },
  ];

  return (
    <div className="w-full nonga-bg-app nonga-text-primary min-h-screen px-4 py-8 relative overflow-hidden font-sans selection:bg-orange-500/30">
      
      {/* Decorative gradient glowing orb */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-orange-650/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-red-650/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Banner Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl border nonga-border nonga-bg-surface">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <span className="p-4 rounded-xl bg-orange-600/10 text-orange-400 shrink-0">
              <Sparkles className="w-7 h-7 animate-pulse text-orange-500" />
            </span>
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-black nonga-text-primary tracking-tight flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                AI เขียนโพสต์ขายรถล้านใจ <span className="text-[var(--nonga-brand)]">Nong A</span>
                <PremiumAiBadge size="sm" />
              </h1>
              <p className="text-xs nonga-text-secondary max-w-lg leading-relaxed">
                สร้างสรรค์โพสต์โฆษณาขายรถยนต์ครบช่องทางโดยอัตโนมัติ ด้วยระบบวิเคราะห์สเป็คสุดปังและแต่งแคปชั่นสั่นสายตาคนซื้อ ดึงทุกคุณสมบัติเด่นของรถมาสะกดจิตลูกค้าทันที!
              </p>
            </div>
          </div>
          {currentStep !== "input" && (
            <button
              onClick={resetGenerator}
              className="px-3.5 py-1.8 border nonga-border nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)] rounded-xl text-xs nonga-text-secondary font-bold flex items-center gap-1.5 cursor-pointer hover:border-[var(--nonga-border-strong)] transition nonga-focus-ring"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              เริ่มทำโพสต์ใหม่
            </button>
          )}
        </div>

        {workflowError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[color-mix(in_srgb,var(--nonga-warning)_45%,var(--nonga-border))] bg-[color-mix(in_srgb,var(--nonga-warning)_12%,var(--nonga-bg-surface))] nonga-text-primary text-xs"
          >
            <p className="leading-relaxed">{workflowError}</p>
            <button
              type="button"
              onClick={clearWorkflowError}
              className="shrink-0 text-[10px] font-bold nonga-link-accent px-2 py-1 rounded-lg border nonga-border nonga-focus-ring"
            >
              ปิด
            </button>
          </div>
        )}

        {/* Steps navigation header bar */}
        <div className="flex items-center justify-between px-2 text-[10.5px] font-bold nonga-text-muted">
          <div className={`flex items-center gap-1 ${currentStep === "input" ? "text-[var(--nonga-brand)]" : "nonga-text-secondary"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black ${currentStep === "input" ? "bg-[color-mix(in_srgb,var(--nonga-brand)_15%,transparent)] border border-[var(--nonga-brand)] text-[var(--nonga-brand)]" : "nonga-bg-subtle border nonga-border nonga-text-muted"}`}>1</span>
            สเป็คตัวรถโฉมปัง
          </div>
          <ChevronRight className="w-3 h-3 nonga-text-muted" />
          <div className={`flex items-center gap-1 ${currentStep === "questions" ? "text-[var(--nonga-brand)]" : currentStep !== "input" ? "nonga-text-secondary" : "nonga-text-muted"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black ${currentStep === "questions" ? "bg-[color-mix(in_srgb,var(--nonga-brand)_15%,transparent)] border border-[var(--nonga-brand)] text-[var(--nonga-brand)]" : generatedResults ? "bg-[var(--nonga-brand)] text-[var(--nonga-action-primary-text)]" : "nonga-bg-subtle border nonga-border nonga-text-muted"}`}>
              {generatedResults ? <Check className="w-3 h-3" /> : "2"}
            </span>
            บอทสัมภาษณ์เจาะข้อมูล
          </div>
          <ChevronRight className="w-3 h-3 nonga-text-muted" />
          <div className={`flex items-center gap-1 ${currentStep === "results" ? "text-[var(--nonga-brand)]" : "nonga-text-muted"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black ${currentStep === "results" ? "bg-[color-mix(in_srgb,var(--nonga-brand)_15%,transparent)] border border-[var(--nonga-brand)] text-[var(--nonga-brand)]" : "nonga-bg-subtle border nonga-border nonga-text-muted"}`}>3</span>
            โพสต์ขายและคอนเทนต์นำไปใช้
          </div>
        </div>

        {/* Core State Machine renders */}
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Specs inputs form */}
          {currentStep === "input" && (
            <motion.div
              key="step-input"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              
              <div className="p-6 rounded-2xl nonga-bg-surface border nonga-border space-y-6">
                <div>
                  <h3 className="text-sm font-black nonga-text-primary flex items-center gap-1.5 border-b nonga-border pb-2.5">
                    <Car className="w-4 h-4 text-orange-500" />
                    รายละเอียดขั้นต้นของคู่หูสี่ล้อที่คุณลงขาย
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Brand */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary">ยี่ห้อรถยนต์ (Brand) <span className="text-[var(--nonga-action-primary)]">*</span></label>
                    <input
                      type="text"
                      value={specs.brand}
                      onChange={(e) => updateSpecs({ brand: e.target.value })}
                      placeholder="เช่น Honda, Toyota, BYD..."
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-2.5 rounded-xl text-xs focus:outline-none nonga-focus-ring"
                    />
                  </div>
                  {/* Model */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary">รุ่น / รหัสถัง (Model Coupe) <span className="text-[var(--nonga-action-primary)]">*</span></label>
                    <input
                      type="text"
                      value={specs.model}
                      onChange={(e) => updateSpecs({ model: e.target.value })}
                      placeholder="เช่น Civic FE EL+, Fortuner Leader..."
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-2.5 rounded-xl text-xs focus:outline-none nonga-focus-ring"
                    />
                  </div>
                  {/* Year */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary">ปีรถจดทะเบียน (Year) <span className="text-[var(--nonga-action-primary)]">*</span></label>
                    <input
                      type="text"
                      value={specs.year}
                      onChange={(e) => updateSpecs({ year: e.target.value })}
                      placeholder="เช่น 2023, 2022 (พ.ศ. 2566)..."
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-2.5 rounded-xl text-xs focus:outline-none nonga-focus-ring"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Price */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary">ราคาขายจริงคันนี้ (THB) <span className="text-[var(--nonga-action-primary)]">*</span></label>
                    <input
                      type="number"
                      value={specs.price || ""}
                      onChange={(e) => updateSpecs({ price: Number(e.target.value) })}
                      placeholder="เช่น 599000"
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-2.5 rounded-xl text-xs focus:outline-none nonga-focus-ring"
                    />
                  </div>
                  {/* Mileage */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary">เลขไมล์แท้สะสม (KM) <span className="text-[var(--nonga-action-primary)]">*</span></label>
                    <input
                      type="number"
                      value={specs.mileage || ""}
                      onChange={(e) => updateSpecs({ mileage: Number(e.target.value) })}
                      placeholder="เช่น 45000"
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-2.5 rounded-xl text-xs focus:outline-none nonga-focus-ring"
                    />
                  </div>
                  {/* Color & Fuel */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary">สีและพลังงานเชื้อเพลิง</label>
                    <input
                      type="text"
                      value={specs.color}
                      onChange={(e) => updateSpecs({ color: e.target.value })}
                      placeholder="เช่น ดำเมทัลลิก เบนซินล้วน..."
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-2.5 rounded-xl text-xs focus:outline-none nonga-focus-ring"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Custom Highlights */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary flex justify-between items-center">
                      <span>สภาพเด่นและข้อเสนอพิเศษจากคุณ (Highlights & Seller Notes)</span>
                      <span className="text-[9px] nonga-text-muted font-normal">เช่น ประวัติบำรุงรักษา ประกันภัย ของแถม</span>
                    </label>
                    <textarea
                      value={specs.highlights}
                      onChange={(e) => updateSpecs({ highlights: e.target.value })}
                      placeholder="เช่น รถบ้านมือเดียวป้ายแดง น็อตไม่ตูดไม่มีขยับ บุ๊คเซอวิสกุญแจครบ 2 ดอก เพิ่งเข้าเช็คระยะ และเพิ่งเคลือบแก้วปกป้องสีรอบคันมูลค่า 15,000 บาทครับ..."
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-3 rounded-xl text-xs focus:outline-none nonga-focus-ring resize-y min-h-[85px] leading-relaxed"
                    />
                  </div>

                  {/* Modifications */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black nonga-text-secondary flex justify-between items-center">
                      <span>พาร์ทแต่งท่อไอเสีย หรืออุปกรณ์เสริมดัดแปลงเพิ่มเติม (Modifications)</span>
                      <span className="text-[9px] nonga-text-muted font-normal">ปล่อยเดิมๆ เว้นว่างไว้ได้ครับ</span>
                    </label>
                    <input
                      type="text"
                      value={specs.modifications}
                      onChange={(e) => updateSpecs({ modifications: e.target.value })}
                      placeholder="เช่น ล้อแม็ก TC105X ขอบ 18 นิ้ว, สปอยเลอร์เคฟล่าแท้สไตล์สปอร์ต, จอแอนดรอยด์..."
                      className="w-full nonga-bg-elevated border nonga-border-strong nonga-text-primary nonga-placeholder focus:border-[var(--nonga-focus-ring)] p-2.5 rounded-xl text-xs focus:outline-none nonga-focus-ring"
                    />
                  </div>
                </div>

              </div>

              <div className="p-6 rounded-2xl nonga-bg-surface border nonga-border">
                <CarPostStyleSelector
                  value={postStyle}
                  onChange={updatePostStyle}
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* Tones / Writing Presets Selector */}
              <div className="p-6 rounded-2xl nonga-bg-surface border nonga-border space-y-4">
                <div className="border-b nonga-border pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-black nonga-text-primary flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-orange-500" />
                    เลือกสไตล์โทนการเขียนโพสต์ (Post Tone Preset)
                  </h3>
                  <span className="text-[9px] nonga-bg-subtle border nonga-border nonga-text-secondary px-2 py-0.5 rounded font-extrabold">ทรงพลังดึงดูดปาดตา</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tones.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateOptions({ tone: t.id })}
                      className={`p-4 rounded-xl text-left border flex items-start gap-3.5 transition duration-300 cursor-pointer ${
                        options.tone === t.id
                          ? "bg-[color-mix(in_srgb,var(--nonga-brand)_6%,var(--nonga-bg-surface))] border-[var(--nonga-brand)] nonga-text-primary shadow-lg shadow-orange-500/5"
                          : "nonga-bg-subtle border nonga-border nonga-text-muted hover:border-[var(--nonga-border-strong)] hover:text-[var(--nonga-text-primary)]"
                      }`}
                    >
                      <span className="text-2xl p-1 shrink-0">{t.emoji}</span>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-extrabold flex items-center gap-1">
                          {t.label}
                          {(t.id === "luxury" || t.id === "tiktok") && (
                            <Crown className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500/20" />
                          )}
                        </h4>
                        <p className="text-[10px] leading-relaxed nonga-text-muted">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generator optimization toggles list */}
              <div className="p-6 rounded-2xl nonga-bg-surface border nonga-border space-y-4">
                <div>
                  <h3 className="text-sm font-black nonga-text-primary flex items-center gap-1.5 border-b nonga-border pb-2.5">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    ฟีเจอร์เพิ่มคุณภาพโพสต์ด้วยระบบ AI Engine
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Emoji selection */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl nonga-bg-elevated border nonga-border">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-lg bg-orange-650/10 text-orange-400">🔥</span>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold nonga-text-primary">จัดวางอิโมจิตรงใจความเป๊ะ</h4>
                        <p className="text-[9px] nonga-text-muted leading-relaxed">เพิ่มชุดสัญลักษณ์เรียกดึงดูดสายตาให้อ่านง่ายขึ้น</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateOptions({ emojiOptimization: !options.emojiOptimization })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        options.emojiOptimization ? "bg-[var(--nonga-brand)]" : "bg-[var(--nonga-border-strong)]"
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${options.emojiOptimization ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Hashtag Engine */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl nonga-bg-elevated border nonga-border">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-lg bg-orange-650/10 text-orange-400">#️⃣</span>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold nonga-text-primary">แฮชแท็กไวรัลก่อตัวแรงดี </h4>
                        <p className="text-[9px] nonga-text-muted leading-relaxed">คัดสรรแท็กที่ผู้ใช้ค้นหารถมือสองเจอเยอะสุด</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateOptions({ includeHashtags: !options.includeHashtags })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        options.includeHashtags ? "bg-[var(--nonga-brand)]" : "bg-[var(--nonga-border-strong)]"
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${options.includeHashtags ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* SEO density parameters */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl nonga-bg-elevated border nonga-border">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-lg bg-orange-650/10 text-orange-400">🔍</span>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold nonga-text-primary">จัดสมดุล SEO ค้นหาค้นพบ</h4>
                        <p className="text-[9px] nonga-text-muted leading-relaxed">สอดแทรกคีย์เวิร์ดเด่นกระจายให้คนเสิร์จใน Google เจอเยอะสุด</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateOptions({ seoOptimization: !options.seoOptimization })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        options.seoOptimization ? "bg-[var(--nonga-brand)]" : "bg-[var(--nonga-border-strong)]"
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${options.seoOptimization ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Auto translation toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl nonga-bg-elevated border nonga-border">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-lg bg-orange-650/10 text-orange-400">🌐</span>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold nonga-text-primary">แปลภาษาต่างชาติขนานข้าง</h4>
                        <p className="text-[9px] nonga-text-muted leading-relaxed">แถมแคปชั่นแปลอังกฤษเป็นคู่ เพื่อลุยตลาดต่างชาติ</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateOptions({ autoTranslate: !options.autoTranslate })}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        options.autoTranslate ? "bg-[var(--nonga-brand)]" : "bg-[var(--nonga-border-strong)]"
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${options.autoTranslate ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

                {options.autoTranslate && (
                  <div className="p-3 nonga-bg-elevated rounded-xl border nonga-border space-y-2 text-left">
                    <span className="text-[10px] text-[var(--nonga-action-primary)] font-extrabold flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[var(--nonga-brand)]" />
                      เลือกภาษาเป้าหมายการแปลเพิ่ม (Target Language for Multi-Language Translation)
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1 font-bold">
                      {[
                        { id: "en", label: "ภาษาอังกฤษ (English)", flag: "🇺🇸" },
                        { id: "zh", label: "ภาษาจีน (Chinese)", flag: "🇨🇳" },
                        { id: "ja", label: "ภาษาญี่ปุ่น (Japanese)", flag: "🇯🇵" }
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => updateOptions({ customLanguage: lang.id })}
                          className={`text-[10.5px] px-3 py-1.8 rounded-lg border transition ${
                            options.customLanguage === lang.id
                              ? "bg-[color-mix(in_srgb,var(--nonga-brand)_15%,transparent)] border-[var(--nonga-brand)] text-[var(--nonga-brand)]"
                              : "nonga-bg-subtle border nonga-border nonga-text-muted hover:border-[var(--nonga-border-strong)] cursor-pointer"
                          }`}
                        >
                          <span className="mr-1.5">{lang.flag}</span>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Usage Quota indicators */}
              <div className="p-4.5 rounded-2xl border nonga-border nonga-bg-subtle space-y-3">
                <UsageProgressBar featureId="post-generation" label="สถิติโควต้าใช้เขียนโฆษณาในแผนของคุณ" />
                <p className="text-[10px] nonga-text-muted leading-normal text-left">
                  * ดีลเรสัญญากับแผนใช้งานฟรีได้รับสิทธิ์วิเคราะห์ระบบได้ 5 ครั้ง / สัญญาใช้งาน โดยระบบจะเริ่มนับแต้มครั้งเฉพาะกรณีที่กดทำการทำโพสต์ออพชั่นเสร็จสมบูรณ์แล้วคร้าบ!
                </p>
              </div>

              {/* Submit button Trigger Next Step */}
              <button
                type="button"
                disabled={isBusy || !canGenerate}
                onClick={startAnalysis}
                className="w-full py-4.5 nonga-action nonga-focus-ring active:scale-[0.99] rounded-2xl font-black text-sm tracking-wide shadow-xl shadow-orange-500/10 cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "กำลังวิเคราะห์..." : "วิเคราะห์สเป็คเชิงลึกและสัมภาษณ์ข้อมูลเด็ด 🪄"}
                <ArrowRight className="w-4 h-4" />
              </button>

            </motion.div>
          )}

          {/* STEP 2: Intelligent custom follow-up interview questions */}
          {currentStep === "questions" && (
            <motion.div
              key="step-questions"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-5"
            >
              
              <div className="p-6 rounded-2xl nonga-bg-surface border nonga-border space-y-6">
                
                <div className="flex items-center gap-3.5 border-b nonga-border pb-4">
                  <span className="w-9 h-9 rounded-xl bg-orange-650/10 text-orange-400 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 animate-spin text-orange-500" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold nonga-text-primary">ขั้นตอนที่ 2: สัมภาษณ์จุดเด่นกระแทกตาคนซื้อกับ น้องเอ (Nong A)</h3>
                    <p className="text-[10px] nonga-text-secondary leading-relaxed mt-0.5">บอทจะคำนวณสเป็คเบื้องต้นของคุณ แล้วสรุปถามเป็นคำถาม 3 ข้อสั้นๆ เพื่อดึงจุดขายเด็ดสุดออกสู่โพสต์อย่างหล่อ!</p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border-4 border-orange-550 border-t-transparent animate-spin" />
                    <p className="text-xs nonga-text-secondary leading-relaxed font-bold animate-pulse">
                      น้องเอกำลังวิเคราะห์จุดเด่นของรถ และคำนวณชุดปฏิสัมพันธ์เพื่อความเร็วสูงสุด...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {questions.map((q, idx) => (
                      <div 
                        key={q.id} 
                        className="p-4 rounded-2xl nonga-bg-elevated border nonga-border space-y-3 font-sans transition-all duration-350 hover:border-[var(--nonga-border-strong)] text-left"
                      >
                        <div className="flex gap-3">
                          <span className="font-black text-xs text-[var(--nonga-action-primary)] shrink-0 select-none bg-[color-mix(in_srgb,var(--nonga-brand)_12%,transparent)] w-6 h-6 rounded-full flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold nonga-text-primary leading-relaxed">
                            {q.questionText}
                          </span>
                        </div>
                        <div className="pl-9">
                          <textarea
                            value={q.answer || ""}
                            onChange={(e) => updateAnswer(q.id, e.target.value)}
                            placeholder={q.placeholder}
                            className="w-full nonga-bg-elevated nonga-text-primary nonga-placeholder text-xs p-3 focus:bg-[var(--nonga-bg-surface)] focus:outline-none nonga-focus-ring rounded-xl border nonga-border-strong leading-relaxed font-sans resize-y min-h-[70px]"
                          />
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sticky bottom-0 sm:static pb-2 sm:pb-0 bg-[color-mix(in_srgb,var(--nonga-bg-app)_92%,transparent)] sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none -mx-1 px-1 sm:mx-0 sm:px-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setCurrentStep("input")}
                        className="py-3.5 px-6 border nonga-border nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)] rounded-xl text-xs nonga-text-secondary font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed nonga-focus-ring"
                      >
                        ย้อนกลับไปแก้ไขสเป็ค
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !canGenerate}
                        onClick={generateFinalPosts}
                        className="flex-1 py-3.5 nonga-action nonga-focus-ring active:scale-[0.99] rounded-xl font-black text-xs transition cursor-pointer shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBusy ? "กำลังสร้างโพสต์..." : "ถอดรหัสและจุดเขียนโพสต์ขายจริงล้านวิว! 🚀"}
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          )}

          {/* STEP 3: Generation Loader Ticker */}
          {currentStep === "generating" && (
            <motion.div
              key="step-generating"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-12 rounded-2xl nonga-bg-surface border nonga-border flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20 animate-bounce">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-[var(--nonga-action-primary)] animate-pulse">ปังปุริเย่สุดขั้ว! น้องเอกำลังประกอบและลงสีให้กับแคปชั่นของคุณ...</p>
                <p className="text-[11px] nonga-text-muted max-w-sm leading-relaxed">
                  เรากำลังคำนวณสำนวนตามโทนที่คุณกำหนด ใส่โมดิฟายเออร์ คัดสรรแฮชแท็กที่ดีที่สุด และแปลงแคปชั่นเป็น 7 สื่อโฆษณาพรูฟสายตา...
                </p>
              </div>
              <div className="flex space-x-1 p-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-ping" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}

          {/* STEP 4: Results Showcase Dashboard with Copy Buttons */}
          {currentStep === "results" && generatedResults && (
            <motion.div
              key="step-results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              <CarPostGeneratorRegenerateSection
                generatedResults={generatedResults}
                isRegenerating={isRegenerating}
                onRegenerate={regeneratePosts}
                activeRegenerateMode={activeRegenerateMode}
                disabled={isBusy}
              />

              {/* Premium Summary Tagline Card */}
              <div className="p-4 rounded-xl border border-orange-550/20 bg-orange-500/[0.02] flex items-start gap-3 text-left">
                <span className="p-2 rounded-lg bg-orange-600/15 text-orange-400 shrink-0">
                  <CheckCircle className="w-4 h-4 text-orange-500 animate-pulse" />
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black nonga-text-primary">ขอบเขตโพสต์ระดับนางฟ้าสำเร็จแล้วคร้าบ! 🎉</h4>
                  <p className="text-[10.5px] nonga-text-secondary leading-relaxed">
                    น้องเอเขียนโพสต์กระแทกใจคนซื้อให้ครบตามสูตร มั่นใจได้เลยว่าสะดุดตา โทรศัพท์สั่นกระดิ่งด่วนแน่นอนครับ! คัดลอกไปกดลุยได้ทางหน้า Facebook, TikTok, และ Marketplace ได้เลยครับ!
                  </p>
                </div>
              </div>

              {/* Title & Viral Hook quick blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Marketplace Title */}
                <div className="p-4 rounded-xl nonga-bg-elevated border nonga-border flex flex-col justify-between gap-3 text-left">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-[var(--nonga-action-primary)] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      พาดหัวสะกดตา (Highly engaging Title)
                    </span>
                    <h4 className="text-xs font-black nonga-text-primary md:h-12 leading-relaxed line-clamp-2">
                      {generatedResults.marketplaceTitle}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopy(generatedResults.marketplaceTitle, "m_title")}
                    className="p-2 nonga-bg-subtle hover:bg-[var(--nonga-bg-app)] nonga-text-secondary hover:text-[var(--nonga-text-primary)] rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer nonga-focus-ring"
                  >
                    {copiedKey === "m_title" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        คัดลอกพาดหัวแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        คัดลอกพาดหัว
                      </>
                    )}
                  </button>
                </div>

                {/* Viral Hook */}
                <div className="p-4 rounded-xl nonga-bg-elevated border nonga-border flex flex-col justify-between gap-3 text-left">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-[var(--nonga-action-primary)] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 fill-current text-rose-500" />
                      ฮุคไวรัลเปิดใจลูกค้า (Golden Viral Hook)
                    </span>
                    <h4 className="text-xs font-black nonga-text-primary md:h-12 leading-relaxed line-clamp-2 italic">
                      "{generatedResults.viralHook}"
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopy(generatedResults.viralHook, "v_hook")}
                    className="p-2 nonga-bg-subtle hover:bg-[var(--nonga-bg-app)] nonga-text-secondary hover:text-[var(--nonga-text-primary)] rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer nonga-focus-ring"
                  >
                    {copiedKey === "v_hook" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        คัดลอกประโยคฮุคแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        คัดลอกประโยคทองคำ
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Main Copy-ready Tabs System */}
              <div className="p-5 rounded-2xl nonga-bg-surface border nonga-border space-y-4">
                
                {/* Web Tabs Controllers */}
                <div className="flex flex-wrap gap-2 border-b nonga-border pb-3">
                  {[
                    { id: "facebook", label: "โพสต์ยาวร้อยล้านโวยวาย Facebook", icon: Facebook, color: "text-blue-400" },
                    { id: "tiktok", label: "แคปชั่น TikTok สายทำคลิป", icon: Video, color: "text-pink-400" },
                    { id: "seo", label: "คำบรรยาย SEO ลงหน้าเว็บ", icon: Search, color: "text-teal-400" },
                    { id: "marketing", label: "แคปชั่นสั้นและปิดการขาย CTA", icon: MessageSquare, color: "text-orange-400" }
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`text-[11px] px-3 py-2 rounded-lg border font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          activeTab === tab.id
                            ? "nonga-bg-elevated border-[var(--nonga-brand)] text-[var(--nonga-brand)]"
                            : "nonga-bg-subtle border nonga-border nonga-text-muted hover:text-[var(--nonga-text-primary)]"
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${tab.color}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content layouts */}
                <div className="text-left font-sans text-xs">
                  {activeTab === "facebook" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] nonga-text-muted flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          พรีวิวโครงสร้างโพสต์จำหน่ายรถยนต์สมบูรณ์แบบ
                        </span>
                        <button
                          onClick={() => handleCopy(generatedResults.facebook, "fb_copy")}
                          className="px-3 py-1.5 nonga-action nonga-focus-ring rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition"
                        >
                          {copiedKey === "fb_copy" ? (
                            <>
                              <Check className="w-3 h-3 text-white" />
                              คัดลอกหมดแล้วครับ!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              คัดลอกคีย์โพสต์ทั้งหมด 📋
                            </>
                          )}
                        </button>
                      </div>
                      <div className="nonga-bg-elevated p-4 rounded-xl border nonga-border leading-relaxed font-sans nonga-text-secondary antialiased whitespace-pre-wrap max-h-[380px] overflow-y-auto selection:bg-orange-500/20 text-[11.5px]">
                        {generatedResults.facebook}
                      </div>
                    </div>
                  )}

                  {activeTab === "tiktok" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] nonga-text-muted">แคปชั่นและแฮชแท็กสั้นลุยกระแสบิตติดล้านวิว</span>
                        <button
                          onClick={() => handleCopy(generatedResults.tiktok, "tk_copy")}
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 rounded-lg text-[10px] text-white font-black flex items-center gap-1 cursor-pointer transition"
                        >
                          {copiedKey === "tk_copy" ? (
                            <>
                              <Check className="w-3 h-3 text-white" />
                              คัดลอกแล้วครับ!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              คัดลอกวิดีโอแคปชั่น
                            </>
                          )}
                        </button>
                      </div>
                      <div className="nonga-bg-elevated p-4 rounded-xl border nonga-border leading-relaxed font-sans nonga-text-secondary whitespace-pre-wrap max-h-[300px] overflow-y-auto font-mono text-[11px]">
                        {generatedResults.tiktok}
                      </div>
                    </div>
                  )}

                  {activeTab === "seo" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] nonga-text-muted">คีย์เวิร์ดกระตุ้นสปอนเซอร์หน้าเว็บ (SEO Keywords Density)</span>
                        <button
                          onClick={() => handleCopy(generatedResults.seoDescription, "seo_copy")}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 rounded-lg text-[10px] text-white font-black flex items-center gap-1 cursor-pointer transition"
                        >
                          {copiedKey === "seo_copy" ? (
                            <>
                              <Check className="w-3 h-3" />
                              คัดลอกแล้วครับ!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              คัดลอก SEO
                            </>
                          )}
                        </button>
                      </div>
                      <p className="p-3 nonga-bg-elevated rounded-xl border nonga-border leading-relaxed nonga-text-secondary font-sans">
                        {generatedResults.seoDescription}
                      </p>
                    </div>
                  )}

                  {activeTab === "marketing" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Short Caption */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] nonga-text-muted font-extrabold uppercase">แคปชั่นสั้น (IG, LINE, Story)</span>
                          <button
                            onClick={() => handleCopy(generatedResults.shortCaption, "sc_copy")}
                            className="nonga-link-accent transition text-[9px] flex items-center gap-0.5 cursor-pointer"
                          >
                            {copiedKey === "sc_copy" ? "คัดลอกแล้ว!" : "คัดลอก"}
                          </button>
                        </div>
                        <div className="nonga-bg-elevated p-3 rounded-xl border nonga-border nonga-text-secondary min-h-[90px] leading-relaxed select-all">
                          {generatedResults.shortCaption}
                        </div>
                      </div>

                      {/* Closing CTA */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] nonga-text-muted font-extrabold uppercase">ประโยคปิดการขาย (Closing CTA)</span>
                          <button
                            onClick={() => handleCopy(generatedResults.closingCta, "cc_copy")}
                            className="nonga-link-accent transition text-[9px] flex items-center gap-0.5 cursor-pointer"
                          >
                            {copiedKey === "cc_copy" ? "คัดลอกแล้ว!" : "คัดลอก"}
                          </button>
                        </div>
                        <div className="nonga-bg-elevated p-3 rounded-xl border nonga-border nonga-text-secondary min-h-[90px] leading-relaxed select-all">
                          {generatedResults.closingCta}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Hashtag Cloud Container */}
              {options.includeHashtags && (
                <div className="p-5 rounded-2xl nonga-bg-surface border nonga-border text-left space-y-2.5">
                  <span className="text-[10px] nonga-text-secondary font-extrabold uppercase tracking-wide flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-orange-500" />
                    คัดเลือกกลุ่มแฮชแท็กอภินันทนาการ (Optimal Hashtags Cloud)
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                    {generatedResults.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 nonga-bg-elevated border nonga-border nonga-text-muted rounded-lg hover:border-[var(--nonga-brand)]/30 hover:text-[var(--nonga-brand)] transition cursor-default"
                        onClick={() => handleCopy(`#${tag}`, "tag_" + tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action row to reset or adjust */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetGenerator}
                  className="flex-1 py-4.5 nonga-bg-subtle border nonga-border hover:bg-[var(--nonga-bg-elevated)] rounded-2xl text-xs nonga-text-primary font-black tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md nonga-focus-ring"
                >
                  <RotateCcw className="w-4 h-4 text-orange-500" />
                  เริ่มต้นทำโพสต์รถคันอื่นใหม่ 🪄
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* AI Premium Workspace Quotas & Management Console */}
        <div className="pt-8 border-t nonga-border mt-10">
          <AiUsageDashboard />
        </div>

        {/* Upgrade Modal Dialogs */}
        <UpgradeModal />

      </div>
    </div>
  );
}
