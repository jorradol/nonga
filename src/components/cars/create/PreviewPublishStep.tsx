import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Phone, Eye, Car, MapPin, Layers, Coins } from "lucide-react";

interface PreviewPublishStepProps {
  formData: any;
  validationErrors: string[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  isDarkMode: boolean;
}

export default function PreviewPublishStep({
  formData,
  validationErrors,
  onSubmit,
  isSubmitting,
  isDarkMode,
}: PreviewPublishStepProps) {
  const [aiScore, setAiScore] = useState(0);
  const [aiAssessment, setAiAssessment] = useState("");

  // Calculate dynamic AI Valuation listing quality score
  useEffect(() => {
    let score = 50; // base score

    // Photo weights
    const photoCount = formData.images.length;
    if (photoCount === 1) score += 10;
    else if (photoCount > 1 && photoCount <= 4) score += 20;
    else if (photoCount > 4) score += 30;

    // Spec descriptions length weights
    const descLength = formData.description.length;
    if (descLength > 100) score += 15;
    if (descLength > 250) score += 105; // caps at full points

    // Price realism weights
    if (formData.price > 1000000) score += 5;

    // Optional attributes supplied weights
    if (formData.generation) score += 5;
    if (formData.engineSize) score += 5;
    if (formData.drivetrain) score += 5;

    const finalScore = Math.min(100, score);
    setAiScore(finalScore);

    // Dynamic copy feedback lines
    if (finalScore >= 95) {
      setAiAssessment("รถคันนี้สวยกริ๊บจน AI ใจสั่น 😆 รูปภาพคมชัด ข้อมูลเทคนิคครบถ้วน โพสต์นี้ขึ้นแผงมีคนทักแน่นอน ปังปุริเย่!");
    } else if (finalScore >= 75) {
      setAiAssessment("โพสต์ครบถ้วนสมบูรณ์สูง มีข้อแนะนำเพิ่มเติมคือหมั่นอัปรูปประกอบมุมเด่นๆ เพิ่มเพื่อเรียกความน่าเชื่อถือจากสหายดีลเลอร์ครับ 👍");
    } else {
      setAiAssessment("ข้อมูลครบตามมาตรสากล แต่อาจลองให้ น้องเอ AI ช่วยเขียนคำบรรยายใหม่เพื่อให้ได้คะแนนการปิดดีลที่เหนือระดับกว่าเดิมครับ ✨");
    }
  }, [formData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-orange-500/10 pb-3">
        <Eye className="w-5 h-5 text-orange-500" />
        <div className="text-left">
          <h3 className="text-base font-extrabold text-orange-500">7. ตรวจทานพรีวิวรายละเอียดก่อนขึ้นแผงจริง</h3>
          <p className="text-[11px] text-slate-400">เช็คสภาพเกรดคำประกาศความพร้อมของข้อมูลด้วยระบบวิเคราะห์ Nong A AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 text-left items-start">
        
        {/* Left hand details and validation feedback */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* AI Auditor result panel */}
          <div className="p-5 rounded-2xl border bg-gradient-to-br from-[#0e0e12] to-[#12121a] border-orange-500/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex flex-col items-center justify-center border border-orange-550 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-widest leading-none">SCORE</span>
                <span className="text-xl font-black font-mono text-orange-500 leading-none pt-0.5">{aiScore}%</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest text-[#cf5b0c] uppercase font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                  Nong A AI Certified Score Validation
                </span>
                <h4 className="font-display font-medium text-xs leading-relaxed text-slate-300">
                  {aiAssessment}
                </h4>
              </div>
            </div>
          </div>

          {/* Validation Checklist / errors list */}
          <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
            <span className="text-xs font-bold text-slate-400 block">รายงานตรวจสอบระบบข้อมูลความพร้อมขาย</span>
            
            {validationErrors.length > 0 ? (
              <div className="space-y-2">
                <div className="flex gap-2 p-3 rounded-lg border border-red-500/15 bg-red-500/5 text-xs text-red-500 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span>กรุณาตรวจสอบและดำเนินการไขแก้ไขเพื่อความสมบูรณ์:</span>
                    <ul className="list-disc pl-4.5 space-y-1 pt-1.5 text-[11px]">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 text-xs text-emerald-500 font-medium flex gap-2 items-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>สุดยอดครับ! ข้อมูลทั้งหมดผ่านเกณฑ์นำขึ้นขาย คีย์เวิร์ดเล่มรถครบถ้วนสมบูรณ์พร้อมซิ่งสะดุดตาสหายดีลเลอร์</span>
              </div>
            )}
          </div>

          {/* Core Technical Highlights specs sheet list */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-400 block pl-1">สรุปข้อมูลรายละเอียดสินค้าสเปกตัวรถ</span>
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#0b0b0e] border border-white/5 p-4 rounded-xl">
              <div><span className="text-slate-500 block">แบรนด์/ยี่ห้อ:</span> <strong className="text-white">{formData.brand || "โปรดกรอกข้อมูล"}</strong></div>
              <div><span className="text-slate-500 block">โมเดล/รุ่น:</span> <strong className="text-white">{formData.model || "โปรดกรอกข้อมูล"}</strong></div>
              <div><span className="text-slate-500 block">เกียร์:</span> <strong className="text-white font-mono uppercase">{formData.transmission}</strong></div>
              <div><span className="text-slate-500 block">เชื้อเพลิง:</span> <strong className="text-white uppercase">{formData.fuelType}</strong></div>
              <div><span className="text-slate-500 block">เลขไมล์สะสม:</span> <strong className="text-white font-mono text-orange-400">{(formData.mileage).toLocaleString()} กม.</strong></div>
              <div><span className="text-slate-500 block">จังหวัดที่จอดรถ:</span> <strong className="text-white">{formData.province || "-"}</strong></div>
              <div><span className="text-slate-550 block">ชื่อผู้ติดต่อสัมภาษณ์:</span> <strong className="text-white">{formData.contactName || "สมเกียรติ มั่นคง"}</strong></div>
              <div><span className="text-slate-550 block">เบอร์ติดต่อกลับ:</span> <strong className="text-white font-mono">{formData.contactPhone || "-"}</strong></div>
            </div>
          </div>

        </div>

        {/* Right hand premium simulated mobile layout card preview */}
        <div className="lg:col-span-2 space-y-3.5">
          <span className="text-xs font-mono tracking-wider font-bold text-slate-500 uppercase block pl-1">ตัวอย่างหน้ารายละเอียดสดในสมาร์ทโฟน</span>
          
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0e] overflow-hidden shadow-2xl pb-4">
            <div className="aspect-video relative bg-slate-900 border-b border-white/5">
              {formData.coverImage ? (
                <img
                  src={formData.coverImage}
                  alt="Listing cover"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1 bg-slate-950">
                  <Car className="w-8 h-8 opacity-40 text-orange-500" />
                  <span className="text-xs">รอรูปภาพประกอบรถยนต์ของคุณ</span>
                </div>
              )}
              
              <div className="absolute top-3 left-3 bg-black/60 text-[9px] text-white font-bold px-2 py-0.5 rounded uppercase font-mono border border-white/5">
                {formData.condition.toUpperCase()}
              </div>

              {formData.images.length > 1 && (
                <span className="absolute bottom-3 right-3 bg-black/75 text-[9px] text-white font-mono px-2 py-0.5 rounded">
                  + {formData.images.length - 1} รูป
                </span>
              )}
            </div>

            <div className="p-4.5 space-y-4 text-left">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider flex items-center gap-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" /> {formData.province || "กรุงเทพมหานคร"} • ปี {formData.year}
                </span>
                <h4 className="font-display font-extrabold text-[#ffffff] text-base leading-tight">
                  {formData.brand} {formData.model ? formData.model : "รุ่นระบุตัวอย่าง"}
                </h4>
              </div>

              <div className="flex justify-between items-baseline py-2.5 border-y border-orange-500/5">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">ราคาเสนอตลาด:</span>
                <span className="font-mono text-base text-orange-500 font-extrabold">฿{(formData.price).toLocaleString()}</span>
              </div>

              {/* Inline description review box */}
              <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/40 text-[11px] leading-relaxed text-slate-400">
                <span className="font-bold text-slate-300 block mb-1">จุดเด่นขายโดดเด่น:</span>
                <p className="line-clamp-4 leading-relaxed font-sans">{formData.description || "ความคุ้มค่าครบถ้วน พร้อมจดโอนเล่มทะเบียนทันที!"}</p>
              </div>

              {/* Verified Badge placeholder */}
              <div className="p-3 rounded-lg bg-orange-550/5 border border-orange-500/10 text-[10.5px] text-slate-400 leading-relaxed flex gap-2 items-start justify-start">
                <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-orange-500 font-bold block">NongBot Certified System</span>
                  <span>ผ่านการตรวจสภาพรอยเช็คของเหลวผ่านเครื่องวิเคราะห์ AI ดีลคุ้มค้าแน่นอน ปังปุริเย่!</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
