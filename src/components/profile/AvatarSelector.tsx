import React, { useRef, useState } from "react";
import { Upload, Sparkles, Check, AlertCircle, RefreshCw, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AvatarSelectorProps {
  currentPhotoURL: string;
  onPhotoSeedChange: (seed: string) => void;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
}

const AVATAR_SEEDS = [
  { id: "NongBot", name: "น้องบอทซิ่ง" },
  { id: "NongA", name: "น้องเอพรีเมียม" },
  { id: "AutoExpert", name: "สเปกคาร์แปดริ้ว" },
  { id: "Roadmaster", name: "ขาแรงสุขุมวิท" },
  { id: "TeslaFun", name: "โมเดลสายไฟ" },
  { id: "Bimmer", name: "บิ้มเมอร์สตาร์" },
  { id: "FormulaOne", name: "ฟอร์มูล่าออโต้" },
  { id: "Supercharge", name: "ซุปเปอร์สตาร์" }
];

export default function AvatarSelector({
  currentPhotoURL,
  onPhotoSeedChange,
  onFileSelected,
  isUploading,
  uploadProgress,
}: AvatarSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.match("image.*")) {
        onFileSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  const selectPreset = (seed: string) => {
    setSelectedPreset(seed);
    onPhotoSeedChange(seed);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Avatar Container */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="relative group shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhotoURL}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-24 h-24 rounded-2xl border-2 border-orange-500/20 bg-black/40 overflow-hidden shadow-lg p-2 flex items-center justify-center relative"
            >
              {isUploading ? (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-1">
                  <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
                  <span className="text-[10px] font-mono text-orange-400 font-bold">{uploadProgress}%</span>
                  <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : null}
              <img 
                src={currentPhotoURL} 
                alt="โปรไฟล์น้องเอ" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg p-1 px-2 text-[9px] font-black tracking-wider text-white uppercase shadow-lg">
            NongBot
          </div>
        </div>

        <div className="space-y-2 text-center sm:text-left">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
            <Sparkles className="w-4 h-4 text-orange-500 animate-spin-slow" />
            <span>ปรับแต่งรูปแทนตัวสมาชิก</span>
          </h4>
          <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
            เลือกรูปธีมหุ่นยนต์อัจฉริยะตระกูล NongBot ที่ใช่ หรืออัปโหลดไฟล์รูปดีไซน์ส่วนตัวจริงของคุณ (PNG, JPG ขนาดไม่เกิน 4MB) เพื่อสลักเป็นอวาตาร์ขายรถครับ
          </p>
        </div>
      </div>

      {/* Grid of cute Presets */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          ⭐ เลือกอวตารหุ่นยนต์สำเร็จรูป (Preset Bots)
        </label>
        <div className="grid grid-cols-2 xs:grid-cols-4 md:grid-cols-8 gap-2.5">
          {AVATAR_SEEDS.map((seedObj) => {
            const seedUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seedObj.id}`;
            const isSelected = selectedPreset === seedObj.id || currentPhotoURL.includes(`seed=${seedObj.id}`);
            
            return (
              <button
                key={seedObj.id}
                type="button"
                onClick={() => selectPreset(seedObj.id)}
                className={`p-1.5 rounded-xl border text-center transition cursor-pointer relative group overflow-hidden flex flex-col items-center gap-1 active:scale-95 duration-200 ${
                  isSelected 
                    ? "border-orange-500 bg-orange-500/10 shadow-[0_0_10px_rgba(234,88,12,0.1)]" 
                    : "border-white/5 bg-slate-900/40 hover:border-white/20"
                }`}
              >
                <div className="w-10 h-10 p-0.5 bg-black/10 rounded-lg relative">
                  <img src={seedUrl} alt={seedObj.name} className="w-full h-full object-contain" />
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white p-0.5 rounded-full">
                      <Check className="w-2 h-2" />
                    </div>
                  )}
                </div>
                <p className="text-[8.5px] font-bold text-slate-400 group-hover:text-slate-200 truncate max-w-full leading-none mt-1">
                  {seedObj.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag & Drop Manual File Uploader */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          📁 อัปโหลดไฟล์รูปภาพจริง (Firebase Sandbox storage)
        </label>
        
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 relative ${
            dragActive 
              ? "border-orange-500 bg-orange-500/5 scale-[1.01]" 
              : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-2.5">
            <div className="p-3 bg-white/5 rounded-full text-slate-400 group-hover:text-orange-400 transition-colors">
              {isUploading ? (
                <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-slate-400" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-white">
                คลิกเพื่อเลือกไฟล์ หรือลากเอาไฟล์รูปมาวางปะที่นี่
              </p>
              <p className="text-[10px] text-slate-500">
                ระบบจำลองความสัญจรของ Firebase Cloud Storage ส่งรูปขึ้น CDN เสมอ
              </p>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
