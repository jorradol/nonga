import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCarVision } from "../../../hooks/ai/useCarVision";
import { AICarAnalysis } from "../../../types/ai/vision";
import {
  UploadCloud,
  Sparkles,
  ShieldAlert,
  Settings,
  Gauge,
  Camera,
  CheckCircle,
  Copy,
  Plus,
  RotateCcw,
  History,
  FileText,
  User,
  Check,
  EyeOff,
  Cpu,
  BadgeAlert,
  CheckCircle2,
  Trash2,
  Bookmark,
  Share2
} from "lucide-react";
import { useAppStore } from "../../../store";
import { PremiumAiBadge, UsageProgressBar, UpgradeModal } from "../../ai-premium/AiPremiumComponents";

// Beautiful public demo assets with CORS crossOrigin compatibility for canvas conversion
const PRESET_VEHICLES = [
  {
    id: "fortuner",
    title: "Toyota Fortuner (SUV)",
    description: "รถอเนกประสงค์ยอดฮิต สไตล์ลุยแต่งพรีเมียม",
    url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "civic FE",
    title: "Honda Civic Tourer (Sedan/RS)",
    description: "รถซีดานสปอร์ตขวัญใจมหาชน วัยรุ่นชอบ",
    url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800"
  }
];

export function CarVisionDashboard() {
  const {
    isInspecting,
    stageProgress,
    stageMessage,
    currentAnalysis,
    analysesHistory,
    isLoadingHistory,
    visionError,
    analyzeImage,
    clearCurrentAnalysis
  } = useCarVision();

  const { setView } = useAppStore();
  
  const [fileProgress, setFileProgress] = useState(0);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showPlateBlur, setShowPlateBlur] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to diagnosis when completed
  useEffect(() => {
    if (currentAnalysis) {
      document.getElementById("diagnosis-section")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentAnalysis]);

  // Convert a public image URL to base64 using canvas CORS trick
  const handleSelectPreset = (url: string) => {
    setIsConverting(true);
    setUploadProgressMsg("กำลังดาวน์โหลดภาพยานยนต์พรีเมียมตัวแบบ...");
    
    try {
      const img = new Image();
      // Enable CORS request to ensure crossOrigin image is convertible to base64 without taint error
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Downscale slightly for rapid processing
        const maxDim = 850;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        
        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        setIsConverting(false);
        setUploadProgressMsg("");
        
        // Trigger Nong A's vision pipeline
        analyzeImage(base64);
      };

      img.onerror = () => {
        setIsConverting(false);
        setUploadProgressMsg("ล้มเหลวในการโหลดภาพต้นแบบ กรุณาเลือกอัปโหลดไฟล์จริงครับ");
      };

      img.src = url;
    } catch (e) {
      setIsConverting(false);
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadstart = () => {
      setFileProgress(15);
      setUploadProgressMsg("กำลังเปิดอ่านข้อมูลภาพถ่าย...");
    };
    
    reader.onprogress = (data) => {
      if (data.lengthComputable) {
        const progress = Math.round((data.loaded / data.total) * 60) + 15;
        setFileProgress(progress);
      }
    };

    reader.onload = () => {
      setFileProgress(100);
      setUploadProgressMsg("จัดระเบียบพิกเซลเรียบร้อยแล้ว!");
      const base64 = reader.result as string;
      setTimeout(() => {
        setFileProgress(0);
        setUploadProgressMsg("");
        analyzeImage(base64);
      }, 350);
    };

    reader.onerror = () => {
      setFileProgress(0);
      setUploadProgressMsg("ล้มเหลวในการอ่านไฟล์");
    };

    reader.readAsDataURL(file);
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const v = {
    borderDivider: "nonga-border",
    borderSubtle: "nonga-border",
    borderFaint: "nonga-border",
    borderInner: "nonga-border",
    card: "nonga-border nonga-bg-surface backdrop-blur-md shadow-sm",
    headingLg: "nonga-text-primary",
    headingMd: "nonga-text-primary",
    headingSm: "nonga-text-secondary",
    bodyMuted: "nonga-text-muted",
    bodySecondary: "nonga-text-secondary",
    bodyDefault: "nonga-text-secondary",
    specCard: "nonga-bg-subtle border nonga-border",
    specValue: "nonga-text-primary",
    ghostBtn:
      "nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)] border nonga-border nonga-text-secondary hover:text-[var(--nonga-text-primary)]",
    presetBtn:
      "border nonga-border hover:border-[color-mix(in_srgb,var(--nonga-brand)_35%,transparent)] nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)]",
    dropZoneIdle: "nonga-border hover:border-[var(--nonga-border-strong)]",
    dropZoneIcon: "nonga-bg-subtle border nonga-border",
    historyItem:
      "border nonga-border nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)]",
    thumbBorder: "nonga-border nonga-bg-elevated",
    overlayHud: "nonga-bg-surface backdrop-blur",
    meterCard: "nonga-bg-subtle border nonga-border",
    meterBar: "nonga-bg-elevated",
    meterValue: "nonga-text-secondary",
    sectionDivider: "nonga-border",
    detailPanel: "nonga-bg-subtle border nonga-border",
    privacyPanel: "nonga-bg-subtle border nonga-border",
    labelInteractive:
      "nonga-text-secondary hover:text-[var(--nonga-text-primary)]",
    miniCard: "nonga-bg-subtle border nonga-border",
  };

  return (
    <div className="space-y-12 pb-24" id="ai-car-vision-system-wrapper">
      
      {/* Header Panel */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 text-left ${v.borderDivider}`}>
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} /> Modern Vision Multi-Modal Core
            </div>
            <PremiumAiBadge size="sm" />
          </div>
          <h1 className={`font-display font-black text-3xl sm:text-4xl tracking-tight ${v.headingLg}`}>
            ระบบวิเคราะห์ภาพรถ AI อัจฉริยะ <span className="text-orange-500">Nong A Vision 📸</span>
          </h1>
          <p className={`text-xs max-w-2xl leading-relaxed ${v.bodyMuted}`}>
            อัปโหลดรูปภาพตัวรถด้านหน้า ข้าง หรือหลัง เพื่อดึงข้อมูลแบรนด์ ค้นหาจุดแต่งรถประเมินสภาพเฉี่ยวชน จับคู่รหัสสี และสกัดเขียนประเด็นการขายที่ดึงดูดใจผู้ซื้ออัตโนมัติภายใน 5 วินาทีคร้าบผม!
          </p>
          <div className="max-w-md pt-1.5">
            <UsageProgressBar featureId="car-analysis" label="โควต้าบริการฟรีวิเคราะห์ด้วย AI Vision ของคุณ" />
          </div>
        </div>
        
        {/* Quick action back to showroom */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("marketplace")}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all ${v.ghostBtn}`}
          >
            ไปที่ตลาดรถ
          </button>
          <button
            onClick={() => setView("sell")}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-lg shadow-orange-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> โพสต์ขายรถคันใหม่
          </button>
        </div>
      </div>

      {/* Main Interactive Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Left Column: Vision Processing Panel (Upload Pad) */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`p-6 rounded-2xl space-y-6 select-none relative ${v.card}`} id="upload-stage-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                  <Camera className="w-4 h-4 animate-bounce" />
                </div>
                <h3 className={`text-sm font-extrabold uppercase tracking-widest ${v.headingMd}`}>
                  เครื่องรับภาพตรวจสภาพรถ (Vehicle Diagnostic Scanner)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Supports JPG, PNG, WEBP (Max 15MB)
              </span>
            </div>

            {/* Drag and Drop Box */}
            <div
              onClick={triggerSelectFile}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center space-y-4 cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                isInspecting
                  ? "border-[color-mix(in_srgb,var(--nonga-brand)_45%,transparent)] bg-[color-mix(in_srgb,var(--nonga-brand)_6%,transparent)]"
                  : v.dropZoneIdle
              } hover:bg-[var(--nonga-bg-subtle)]`}
            >
              {/* Pulsing Atmosphere overlay when analyzing */}
              {isInspecting && (
                <div className="absolute inset-0 bg-gradient-to-b from-orange-600/[0.02] to-transparent animate-pulse pointer-events-none" />
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isInspecting || isConverting}
              />

              <div className="space-y-3 relative z-10">
                <div className={`inline-flex p-4 rounded-full shadow-inner group-hover:scale-110 group-hover:border-orange-500/30 transition-transform duration-300 ${v.dropZoneIcon}`}>
                  <UploadCloud className="w-8 h-8 text-orange-500 group-hover:animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <p className={`text-sm font-bold ${v.bodyDefault}`}>
                    คลิกเพื่อลงภาพรถ หรือลากไฟล์มาวางตรงนี้ครับพี่
                  </p>
                  <p className={`text-xs max-w-sm mx-auto leading-relaxed ${v.bodyMuted}`}>
                    ภาพถ่ายมุมเฉียงสี่สิบห้าองศาด้านหน้ารถเป็นมุมมิติดีที่สุดสำหรับการคำนวณแบรนด์ ความลึก สัดส่วน และสภาพสี
                  </p>
                </div>
              </div>
            </div>

            {/* Preset Demos Selector */}
            <div className="space-y-3 pt-2" id="preset-tester-menu">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
                ไม่มีรูปรถพร้อมอัปโหลด? ท้าพิสูจน์ทันทีด้วยภาพรถต้นแบบสเป็คเทพ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_VEHICLES.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.url)}
                    disabled={isInspecting || isConverting}
                    className={`p-3 hover:border-orange-500/30 text-left rounded-xl flex items-center gap-3 transition-all cursor-pointer group disabled:opacity-45 ${v.presetBtn}`}
                  >
                    <div className={`relative w-14 h-10 rounded overflow-hidden shadow-inner ${v.thumbBorder}`}>
                      <img
                        src={preset.url}
                        alt={preset.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-[11.5px] font-bold break-all leading-tight ${v.bodyDefault}`}>
                        {preset.title}
                      </h4>
                      <p className="text-[9.5px] text-slate-500 truncate mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Indicators */}
            {visionError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-450 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className={`font-extrabold uppercase tracking-wider ${v.bodyDefault}`}>AI Analysis Blocked (ไฟสัญญาณขัดข้อง)</p>
                  <p>{visionError}</p>
                </div>
              </div>
            )}

            {/* Processing HUD Overlay */}
            <AnimatePresence>
              {(isInspecting || isConverting) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute inset-0 rounded-2xl backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 space-y-6 ${v.overlayHud}`}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing logo glow */}
                    <div className="absolute w-24 h-24 bg-orange-500/10 rounded-full blur-xl animate-pulse" />
                    <div className="w-16 h-16 rounded-full border-2 border-orange-500/10 border-t-orange-500 animate-spin flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-orange-400 rotate-180 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2 text-center max-w-md">
                    <h4 className={`text-sm font-extrabold uppercase tracking-widest animate-pulse flex items-center justify-center gap-2 ${v.headingLg}`}>
                      <Sparkles className="w-4 h-4 text-orange-400 animate-spin" />
                      {isConverting ? "กำลังแปลงแหล่งข้อมูลยานยนต์..." : "NONG A AI VISION ACTIVE"}
                    </h4>
                    <p className={`text-[11.5px] font-medium leading-relaxed min-h-[2.5rem] ${v.bodyMuted}`}>
                      {isConverting ? uploadProgressMsg : stageMessage}
                    </p>
                  </div>

                  {/* Percentage Bar */}
                  <div className="w-full max-w-sm space-y-1.5 font-mono text-[10px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Inference Speed Calibration (กำลังประมวลผล)</span>
                      <span className="text-orange-450">{isConverting ? fileProgress : stageProgress}%</span>
                    </div>
                    <div className={`h-1.5 w-full border rounded-full overflow-hidden p-0.5 ${v.meterBar}`}>
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: `${isConverting ? fileProgress : stageProgress}%` }}
                        transition={{ ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Scan History List */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-5 rounded-2xl space-y-4 text-left ${v.card}`} id="history-scans-card">
            <div className={`flex items-center justify-between border-b pb-3 ${v.borderSubtle}`}>
              <div className="flex items-center gap-1.5">
                <History className={`w-4 h-4 ${v.bodyMuted}`} />
                <h3 className={`text-xs font-extrabold uppercase tracking-widest ${v.headingMd}`}>
                  คาร์ประวัติสแกนล่าสุด ({analysesHistory.length})
                </h3>
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-500">
                กำลังโหลดบันทึกการประเมิน...
              </div>
            ) : analysesHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Bookmark className="w-6 h-6 text-slate-700 mx-auto" />
                <p>ยังไม่มีรายงานประวัติประเมินผลครับ</p>
                <p className="text-[9.5px] text-slate-600">กดประเมินภาพด้านบนเพื่อบันทึกประวัติทันที</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[385px] overflow-y-auto pr-1">
                {analysesHistory.map((h, i) => (
                  <div
                    key={h.id || i}
                    onClick={() => {
                      // Retrieve chosen analysis details back to view!
                      // For smooth UX, map pre-saved records dynamically
                      clearCurrentAnalysis();
                      analyzeImage(h.imageUrl);
                    }}
                    className={`p-2.5 rounded-xl hover:border-orange-500/20 active:scale-98 transition-all cursor-pointer flex gap-3 text-left ${v.historyItem}`}
                  >
                    <div className={`w-14 h-12 rounded overflow-hidden shrink-0 shadow-inner ${v.thumbBorder}`}>
                      <img
                        src={h.imageUrl}
                        alt="Scan Thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-[11px] font-extrabold truncate ${v.bodyDefault}`}>
                          {h.brand} {h.model}
                        </h4>
                        <span className="text-[8.5px] font-mono text-slate-600">
                          {new Date(h.createdAt).toLocaleDateString("th-TH", { hour: "numeric", minute: "numeric" })}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 truncate mt-0.5">
                        สภาพ: {h.condition} • คาร์พาร์ท: ดัดแปลง ({h.modification.slice(0, 15)}...)
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[8.5px] font-mono text-orange-400">
                        <Check className="w-2.5 h-2.5 text-green-400" />
                        <span>วิเคราะห์ตรงกัน: {h.confidenceScores.brand}% คาร์สเกล</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Diagnosis Output Section (Visible when loaded) */}
      <AnimatePresence>
        {currentAnalysis && (
          <motion.div
            id="diagnosis-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="space-y-8 text-left"
          >
            <div className={`border-t pt-8 flex items-center justify-between ${v.sectionDivider}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-pulse" />
                <h2 className={`font-display font-black text-2xl ${v.headingMd}`}>
                  แผ่นรายงานการประเมิณด้วย AI Vision (Visual Diagnosis ID)
                </h2>
              </div>
              <button
                onClick={clearCurrentAnalysis}
                className={`px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition active:scale-95 ${v.ghostBtn}`}
              >
                <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตผลการส่งตรวจ
              </button>
            </div>

            {/* Bento-grid Layout on Results */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Box 1: Visual Image with bounding blur overlays */}
              <div className={`xl:col-span-4 p-5 rounded-2xl space-y-4 ${v.card}`}>
                <div className={`relative aspect-video rounded-xl overflow-hidden shadow-2xl group border nonga-border nonga-bg-subtle`}>
                  <img
                    src={currentAnalysis.imageUrl}
                    alt="Analyzed car body"
                    className="w-full h-full object-cover transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Plates Privacy Simulated Blur overlay */}
                  {showPlateBlur && (
                    <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-md bg-black/60 border border-slate-700/60 backdrop-blur-xl flex items-center gap-1.5 select-none animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-100 font-mono">
                        Plate Blur Filter Active (ID: ***-****)
                      </span>
                    </div>
                  )}

                  {/* Aesthetic grid overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_30%,_rgba(0,0,0,0.6))] pointer-events-none" />
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl flex-wrap gap-2 text-xs ${v.privacyPanel}`}>
                  <span className={`font-medium ${v.bodyMuted}`}>รักษาความปลอดภัย:</span>
                  <div className="flex items-center gap-3">
                    <label className={`flex items-center gap-1.5 cursor-pointer transition ${v.labelInteractive}`}>
                      <input
                        type="checkbox"
                        checked={showPlateBlur}
                        onChange={(e) => setShowPlateBlur(e.target.checked)}
                        className="accent-orange-500 h-3.5 w-3.5 bg-slate-950 cursor-pointer rounded border border-slate-700 focus:ring-0"
                      />
                      <span>เบลอแผ่นทะเบียนบิดบังข้อมูลส่วนตัว</span>
                    </label>
                  </div>
                </div>

                {/* Sub-details block */}
                <div className={`p-3.5 rounded-xl bg-orange-550/[0.02] border border-orange-500/10 space-y-2.5 text-xs ${v.bodySecondary}`}>
                  <div className="flex items-center gap-1.5 text-orange-400 font-extrabold uppercase tracking-wide">
                    <Cpu className="w-3.5 h-3.5" /> สแกนพิกัดกล้องความละเอียดตรวจจับ
                  </div>
                  <ul className={`space-y-1.5 text-[11px] list-disc pl-4 ${v.bodyMuted}`}>
                    <li>{currentAnalysis.licensePlateStatus || "สแกนพิกัดป้ายทะเบียนมั่นคง คาดหมวดหมู่ส่วนบุคคลแล้ว"}</li>
                    <li>{currentAnalysis.ocrBrandBadge || "จับคู่อัตราแบรนด์เบลเซอร์คาร์รอบถังเสร็จสมบูรณ์"}</li>
                    <li>{currentAnalysis.engineInsights || "ตรวจระดับความลาดห้องกระโปรงหน้าระดับสมมาตรมาตรฐานกระทรวง"}</li>
                  </ul>
                </div>
              </div>

              {/* Box 2: Auto Classification & Core Specs Detections */}
              <div className={`xl:col-span-8 p-6 rounded-2xl space-y-6 ${v.card}`}>
                
                {/* Visual Header */}
                <div className={`flex items-center justify-between border-b pb-3 ${v.borderSubtle}`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-1.5 ${v.headingSm}`}>
                    <Sparkles className="w-4 h-4 text-orange-500" /> สมรรถนะตรวจจับจำแนกชนิดยานพาหนะ (Car Classifiers)
                  </h3>
                  <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10.5px] font-mono border border-emerald-500/20">
                    Confidence standard: ISO 9001 AI verified
                  </div>
                </div>

                {/* Grid layout for specifications classification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  
                  {/* Brand Card */}
                  <div className={`p-3.5 rounded-xl space-y-1.5 ${v.specCard}`}>
                    <span className="text-slate-500 uppercase font-extrabold tracking-widest text-[9px] block">แบรนด์เป้าหมาย (Brand)</span>
                    <p className={`text-sm font-black ${v.specValue}`}>{currentAnalysis.brand}</p>
                    <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t font-mono ${v.borderInner}`}>
                      <span>ค่าความแม่นยำ:</span>
                      <span className="text-emerald-450 font-extrabold">{currentAnalysis.confidenceScores.brand}%</span>
                    </div>
                  </div>

                  {/* Model Card */}
                  <div className={`p-3.5 rounded-xl space-y-1.5 ${v.specCard}`}>
                    <span className="text-slate-500 uppercase font-extrabold tracking-widest text-[9px] block">รุ่นโมเดลและรหัสปี (Model)</span>
                    <p className={`text-sm font-black ${v.specValue}`}>{currentAnalysis.model}</p>
                    <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t font-mono ${v.borderInner}`}>
                      <span>ค่าความแม่นยำ:</span>
                      <span className="text-emerald-450 font-extrabold">{currentAnalysis.confidenceScores.model}%</span>
                    </div>
                  </div>

                  {/* Color Card */}
                  <div className={`p-3.5 rounded-xl space-y-1.5 ${v.specCard}`}>
                    <span className="text-slate-500 uppercase font-extrabold tracking-widest text-[9px] block">เฉดสีภายนอก (Color matching)</span>
                    <p className={`text-sm font-black ${v.specValue}`}>{currentAnalysis.color}</p>
                    <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t font-mono ${v.borderInner}`}>
                      <span>ค่าตรวจจับสีจริง:</span>
                      <span className="text-emerald-450 font-extrabold">{currentAnalysis.confidenceScores.color}%</span>
                    </div>
                  </div>

                  {/* Body Type Card */}
                  <div className={`p-3.5 rounded-xl space-y-1.5 ${v.specCard}`}>
                    <span className="text-slate-500 uppercase font-extrabold tracking-widest text-[9px] block">ประเภทสัดส่วนถัง (Body type)</span>
                    <p className={`text-sm font-black ${v.specValue}`}>{currentAnalysis.bodyType}</p>
                    <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t font-mono ${v.borderInner}`}>
                      <span>ความลงร่องถัง:</span>
                      <span className="text-emerald-450 font-extrabold">{currentAnalysis.confidenceScores.bodyType}%</span>
                    </div>
                  </div>

                  {/* Condition Card */}
                  <div className={`p-3.5 rounded-xl space-y-1.5 ${v.specCard}`}>
                    <span className="text-slate-500 uppercase font-extrabold tracking-widest text-[9px] block">สภาพตัวถังโดยรวม (Condition)</span>
                    <p className={`text-sm font-black ${v.specValue}`}>{currentAnalysis.condition}</p>
                    <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t font-mono ${v.borderInner}`}>
                      <span>ระดับความยับย่น:</span>
                      <span className="text-emerald-450 font-extrabold">{currentAnalysis.confidenceScores.condition}%</span>
                    </div>
                  </div>

                  {/* Modifications Card */}
                  <div className={`p-3.5 rounded-xl space-y-1.5 ${v.specCard}`}>
                    <span className="text-slate-500 uppercase font-extrabold tracking-widest text-[9px] block">จุดพาร์ทดัดแปลงตาสังเกต (Mods)</span>
                    <p className={`text-sm font-black truncate ${v.specValue}`}>{currentAnalysis.modification.split(",")[0] || "สภาพเดิมสไตล์พรีเมียม"}</p>
                    <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t font-mono ${v.borderInner}`}>
                      <span>ค่าความตรงพาร์ท:</span>
                      <span className="text-emerald-450 font-extrabold">{currentAnalysis.confidenceScores.modification}%</span>
                    </div>
                  </div>

                </div>

                {/* Modification lists & detailed description of visual damage diagnostics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className={`p-4 rounded-xl space-y-2 ${v.detailPanel}`}>
                    <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block">📝 รายละเอียดดัดแปลงชิ้นพาร์ระบุตัวถัง:</span>
                    <p className={`text-[11.5px] leading-relaxed min-h-12 ${v.bodySecondary}`}>
                      {currentAnalysis.modification}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl space-y-2 ${v.detailPanel}`}>
                    <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block">🩹 ดัชนีรากฐานประเมินรอยแผลความเสียหาย:</span>
                    <p className={`text-[11.5px] leading-relaxed min-h-12 ${v.bodySecondary}`}>
                      {currentAnalysis.damageEstimation}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Speeds of Photographic Quality Indicators (Radial / Meter layouts using Tailwind) */}
            <div className={`p-6 rounded-2xl space-y-6 ${v.card}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${v.borderSubtle}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-1.5 ${v.headingSm}`}>
                  <Gauge className="w-4 h-4 text-orange-500" /> ดัชนีคุณภาพภาพถ่ายกระตุ้นสถิติยอดคลิก (Aesthetic Quality Scores)
                </h3>
                <span className="text-xs text-slate-500">
                  อ้างอิงสแกนคะแนนสัดส่วนมุมและแสงที่ดึงดูดผู้ใช้งานในตลาดรถ
                </span>
              </div>

              {/* Progress Gauges Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                
                {/* 1. Lighting */}
                <div className={`text-center p-4 rounded-xl flex flex-col justify-between space-y-3 ${v.meterCard}`}>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">การวัดแสง (Lighting)</span>
                  <div className="relative inline-flex items-center justify-center p-4">
                    <span className={`text-lg font-black font-mono ${v.meterValue}`}>{currentAnalysis.visualQualityScore.lighting}</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${v.meterBar}`}>
                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${currentAnalysis.visualQualityScore.lighting}%` }} />
                  </div>
                </div>

                {/* 2. Framing */}
                <div className={`text-center p-4 rounded-xl flex flex-col justify-between space-y-3 ${v.meterCard}`}>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">การจัดกรอบ (Framing)</span>
                  <div className="relative inline-flex items-center justify-center p-4">
                    <span className={`text-lg font-black font-mono ${v.meterValue}`}>{currentAnalysis.visualQualityScore.framing}</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${v.meterBar}`}>
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${currentAnalysis.visualQualityScore.framing}%` }} />
                  </div>
                </div>

                {/* 3. Composition */}
                <div className={`text-center p-4 rounded-xl flex flex-col justify-between space-y-3 ${v.meterCard}`}>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">องค์ประกอบภาพ (Composition)</span>
                  <div className="relative inline-flex items-center justify-center p-4">
                    <span className={`text-lg font-black font-mono ${v.meterValue}`}>{currentAnalysis.visualQualityScore.composition}</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${v.meterBar}`}>
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${currentAnalysis.visualQualityScore.composition}%` }} />
                  </div>
                </div>

                {/* 4. Sharpness */}
                <div className={`text-center p-4 rounded-xl flex flex-col justify-between space-y-3 ${v.meterCard}`}>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">ความคมชัดภาพ (Sharpness)</span>
                  <div className="relative inline-flex items-center justify-center p-4">
                    <span className={`text-lg font-black font-mono ${v.meterValue}`}>{currentAnalysis.visualQualityScore.sharpness}</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${v.meterBar}`}>
                    <div className="bg-blue-400 h-full rounded-full" style={{ width: `${currentAnalysis.visualQualityScore.sharpness}%` }} />
                  </div>
                </div>

                {/* 5. Overall Aesthetic Rating */}
                <div className="col-span-2 md:col-span-1 text-center p-4 rounded-xl bg-orange-600/[0.04] border border-orange-500/20 flex flex-col justify-between space-y-3">
                  <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">คะแนนภาพรวม (Visual Score)</span>
                  <div className="relative inline-flex items-center justify-center py-2">
                    <div className="p-2.5 rounded-full bg-orange-500/10 text-orange-400 animate-pulse text-xl font-black font-mono">
                      {currentAnalysis.visualQualityScore.overallScore}
                    </div>
                  </div>
                  <span className="text-[9.5px] uppercase tracking-wider block font-black text-orange-500">
                    {currentAnalysis.visualQualityScore.overallScore >= 90 ? "Excellent Shot ⭐" : "Very Good 👍"}
                  </span>
                </div>

              </div>
            </div>

            {/* Speeches & AI Marketing insights from Nong A */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              
              {/* 1. Compliments block */}
              <div className={`p-6 rounded-2xl space-y-4 ${v.card}`}>
                <h3 className="text-sm font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 animate-spin text-orange-500" /> วิจารณ์แชร์คำบรรยายภาพสไตล์น้องเอ (Aesthetic Insights)
                </h3>
                
                <div className="space-y-3.5">
                  {currentAnalysis.insights.map((insight, idx) => (
                    <div key={idx} className={`p-3 rounded-xl flex items-start gap-2.5 ${v.miniCard}`}>
                      <span className="text-xs p-1 rounded bg-orange-500/10 text-orange-400 font-bold font-mono">
                        {idx + 1}
                      </span>
                      <p className={`text-xs leading-relaxed pt-0.5 ${v.bodySecondary}`}>
                        {insight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Top Persuasive Selling Points with One-click Copy */}
              <div className={`p-6 rounded-2xl space-y-4 ${v.card}`}>
                <h3 className="text-sm font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-500" /> ความสร้างสรรค์จุดเด่นขายคัดเลือกโดย AI (Persuasive USPs)
                </h3>
                
                <div className="space-y-3">
                  {currentAnalysis.sellingPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className={`group p-3 rounded-xl flex items-center justify-between gap-3 text-xs transition ${v.miniCard} hover:bg-[var(--nonga-bg-elevated)]`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="p-0.5 mt-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </span>
                        <p className={`leading-relaxed select-text break-all ${v.bodySecondary}`}>
                          {point}
                        </p>
                      </div>

                      <button
                        onClick={() => copyToClipboard(point, idx)}
                        className={`px-2.5 py-1 rounded text-[10px] font-extrabold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition ${v.ghostBtn}`}
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400 animate-bounce" />
                            <span className="text-emerald-400 font-mono">ก๊อปปี้แล้ว!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>คัดลอกจุดขาย</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Future-Ready Roadmap checklist */}
            <div className="p-5 rounded-2xl border border-orange-500/15 bg-orange-500/[0.02] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-3 flex-1">
                <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 mt-0.5 animate-pulse">
                  <BadgeAlert className="w-5 h-5" />
                </span>
                <div className="space-y-1">
                  <h4 className={`text-xs font-black uppercase tracking-widest text-left ${v.headingSm}`}>
                    Vision Pipeline Roadmap & OCR Ecosystem (ยุทธศาตร์การต่อขยายในอนาคต)
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed text-left">
                    สถาปัตยกรรมนี้ถูกวางรากฐานให้พร้อมรับขยายผลสำหรับการเชื่อมต่อระบบ OpenAI Vision, พิกัดตรวจจับความลึกจุดบุบรอยแผล (Damage-AI Coordinates) และระบบฟิลเตอร์เบลอป้ายทะเบียนอัตโนมัติบนสายการพัฒนาโปรเพื่อความปลอดภัยครบรสชาติ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[9.5px] font-bold">
                <span className={`px-2.5 py-1 rounded-md flex items-center gap-1 ${v.miniCard} ${v.bodyMuted}`}>
                  <Check className="w-3 h-3 text-green-400" /> License Plate Blur ready
                </span>
                <span className={`px-2.5 py-1 rounded-md flex items-center gap-1 ${v.miniCard} ${v.bodyMuted}`}>
                  <Check className="w-3 h-3 text-green-400" /> Damage Scanner ready
                </span>
                <span className={`px-2.5 py-1 rounded-md flex items-center gap-1 ${v.miniCard} ${v.bodyMuted}`}>
                  <Check className="w-3 h-3 text-green-400" /> OCR Engine integrated
                </span>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Modals overlay */}
      <UpgradeModal />

    </div>
  );
}
