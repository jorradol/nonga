import React, { useState, useEffect } from "react";
import { FormInput, Sparkles, AlertCircle, MapPin, Calendar, HelpCircle } from "lucide-react";

interface BasicInfoStepProps {
  brand: string;
  model: string;
  year: number;
  province: string;
  onChange: (fields: { brand: string; model: string; year: number; province: string }) => void;
  isDarkMode: boolean;
}

// Full array of highly popular brands and associated models for superb client selection
const POPULAR_BRANDS = [
  { id: "Tesla", name: "Tesla (เทสลา) ⚡" },
  { id: "Toyota", name: "Toyota (โตโยต้า)" },
  { id: "Honda", name: "Honda (ฮอนด้า)" },
  { id: "BMW", name: "BMW (บีเอ็มดับเบิลยู)" },
  { id: "BYD", name: "BYD (บีวายดี) 🔋" },
  { id: "MG", name: "MG (เอ็มจี)" },
  { id: "Porsche", name: "Porsche (ปอร์เช่) 💎" },
  { id: "Audi", name: "Audi (อาวดี้)" },
];

const BRAND_MODELS_MAP: Record<string, string[]> = {
  Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  Toyota: ["Fortuner", "Corolla Altis", "Camry", "Yaris Cross", "Hilux Revo", "Vios"],
  Honda: ["Civic", "Accord", "CR-V", "HR-V", "City", "Jazz"],
  BMW: ["3 Series", "5 Series", "i4 M50", "iX3", "X5", "7 Series"],
  BYD: ["Atto 3", "Dolphin", "Seal", "Sealion", "M6"],
  MG: ["Cyberster", "MG4 Electric", "ZS EV", "MG5", "HS"],
  Porsche: ["Taycan", "911 Carrera", "Cayenne", "Macan", "Panamera"],
  Audi: ["e-tron GT", "Q8 e-tron", "A4 Avant", "TT Coupe", "Q3"],
};

const THAI_PROVINCES = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  "สมุทรปราการ",
  "เชียงใหม่",
  "ชลบุรี",
  "ภูเก็ต",
  "ขอนแก่น",
  "นครราชสีมา",
  "สุราษฎร์ธานี",
  "สงขลา",
  "เชียงราย",
  "ประจวบคีรีขันธ์ (หัวหิน)",
  "ระยอง",
  "พิษณุโลก",
  "นครปฐม",
];

export default function BasicInfoStep({
  brand,
  model,
  year,
  province,
  onChange,
  isDarkMode,
}: BasicInfoStepProps) {
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [customBrand, setCustomBrand] = useState(false);

  useEffect(() => {
    if (brand && BRAND_MODELS_MAP[brand]) {
      setModelOptions(BRAND_MODELS_MAP[brand]);
      setCustomBrand(false);
    } else if (brand) {
      // Custom brand fallback
      setCustomBrand(true);
    } else {
      setModelOptions([]);
    }
  }, [brand]);

  const handleBrandChange = (newBrand: string) => {
    if (newBrand === "CUSTOM_BRAND") {
      setCustomBrand(true);
      onChange({ brand: "", model: "", year, province });
    } else {
      setCustomBrand(false);
      const defaultModel = BRAND_MODELS_MAP[newBrand]?.[0] || "";
      onChange({ brand: newBrand, model: defaultModel, year, province });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-orange-500/10 pb-3">
        <FormInput className="w-5 h-5 text-orange-500" />
        <div className="text-left">
          <h3 className="text-base font-extrabold text-orange-500">2. ข้อมูลรถขั้นพื้นฐาน</h3>
          <p className="text-[11px] text-slate-400">ระบุยี่ห้อ โมเดล และตำแหน่งที่จอดเพื่อจับสืบค้นราคาตลาด</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
        
        {/* Brand selection cascading */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <span>แบรนด์ยี่ห้อรถยนต์</span>
            <span className="text-orange-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            <select
              value={customBrand ? "CUSTOM_BRAND" : brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
            >
              <option value="">-- โปรดระบุแบรนด์รถ --</option>
              {POPULAR_BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="CUSTOM_BRAND">อื่น ๆ (ระบุเอง) 🖊️</option>
            </select>

            {customBrand && (
              <input
                type="text"
                value={brand}
                onChange={(e) => onChange({ brand: e.target.value, model: "", year, province })}
                placeholder="กรอกชื่อแบรนด์ เช่น GWM, Volvo, Rivian"
                className="w-full px-4 py-3 rounded-xl border border-orange-500/40 bg-slate-900 text-white text-xs sm:text-sm focus:outline-none focus:border-orange-500 placeholder-slate-600 animate-fadeIn"
              />
            )}
          </div>
        </div>

        {/* Dynamic Model selection based on selected brand */}
        <div className="space-y-1.55">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <span>โมเดล / รุ่นย่อยรถยนต์</span>
            <span className="text-orange-500">*</span>
          </label>
          
          {customBrand || modelOptions.length === 0 ? (
            <input
              type="text"
              value={model}
              onChange={(e) => onChange({ brand, model: e.target.value, year, province })}
              placeholder="เช่น Atto 3 Extended Range, CRV Gen 6"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white text-xs sm:text-sm focus:outline-none focus:border-orange-500 placeholder-slate-600"
            />
          ) : (
            <select
              value={model}
              onChange={(e) => onChange({ brand, model: e.target.value, year, province })}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
            >
              <option value="">-- โปรดเลือกรุ่น --</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="CUSTOM_MODEL">ระบุรุ่นย่อยเฉพาะ...</option>
            </select>
          )}

          {model === "CUSTOM_MODEL" && (
            <input
              type="text"
              onChange={(e) => onChange({ brand, model: e.target.value, year, province })}
              placeholder="ระบุรุ่นย่อยระบุเอง เช่น Model Y RWD Stealth Edition"
              className="w-full px-4 py-3 rounded-xl border border-orange-500/40 bg-slate-900 text-white text-xs sm:text-sm focus:outline-none focus:border-orange-500 placeholder-slate-600 mt-2 animate-fadeIn"
            />
          )}
        </div>

        {/* Year list Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>ปีที่จดทะเบียน (ค.ศ. เท่านั้น)</span>
            <span className="text-orange-500">*</span>
          </label>
          <select
            value={year || ""}
            onChange={(e) => onChange({ brand, model, year: Number(e.target.value), province })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          >
            <option value="">-- เลือกปีจดทะเบียน --</option>
            {Array.from({ length: 30 }, (_, index) => {
              const yr = new Date().getFullYear() + 1 - index;
              return (
                <option key={yr} value={yr}>
                  ปี {yr} (พ.ศ. {yr + 543})
                </option>
              );
            })}
          </select>
        </div>

        {/* Province Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span>จังหวัดหลัก (พิกัดที่จอดรถ)</span>
            <span className="text-orange-500">*</span>
          </label>
          <select
            value={province}
            onChange={(e) => onChange({ brand, model, year, province: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          >
            <option value="">-- เลือกจังหวัด --</option>
            {THAI_PROVINCES.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
        </div>

      </div>

      <div className="p-3.5 rounded-xl border border-orange-500/10 bg-orange-500/[0.02] flex gap-3 text-left">
        <Sparkles className="w-5 h-5 text-orange-500 shrink-0 mt-0.5 animate-spin" />
        <div className="space-y-0.5">
          <span className="text-xs font-extrabold text-orange-400 flex items-center gap-1">Nong A Dynamic Matcher (ตรวจเช็คข้อมูลอัจฉริยะ)</span>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            เมื่อท่านสวิตช์แบรนด์เป็นรถไฟฟ้าอัจฉริยะ (เช่น **Tesla**, **BYD** หรือ **Porsche** EV) ระบบ AI ของเราจะช่วยคำนวณราคาแนะนำตลาดแบตเตอรี่ในหน้า pricing ต่อไปให้เด้งทันทีครับ ปังปุริเย่!
          </p>
        </div>
      </div>
    </div>
  );
}
