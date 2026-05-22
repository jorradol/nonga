import React from "react";
import { Settings, RefreshCw, Eye, Battery, Compass, Layers } from "lucide-react";

interface SpecsStepProps {
  mileage: number;
  bodyType: string;
  transmission: "auto" | "manual" | "other";
  fuelType: "electric" | "hybrid" | "plug-in-hybrid" | "petrol" | "diesel" | "other";
  color: string;
  condition: "new" | "used" | "excellent" | "good" | "fair";
  generation: string;
  engineSize: string;
  drivetrain: string;
  onChange: (fields: {
    mileage: number;
    bodyType: string;
    transmission: "auto" | "manual" | "other";
    fuelType: any;
    color: string;
    condition: any;
    generation: string;
    engineSize: string;
    drivetrain: string;
  }) => void;
  isDarkMode: boolean;
}

const BODY_TYPES = [
  "SUV (รถอเนกประสงค์ขนาดใหญ่/เล็ก)",
  "Sedan (รถเก๋ง 4 ประตู)",
  "Hatchback (รถเก๋งท้ายตัด 5 ประตู)",
  "Coupe (รถสปอร์ต 2 ประตูตูดลาด)",
  "MPV (รถตู้ครอบครัวปิกนิก)",
  "Pick-up (รถกระบะขนส่งอึดคู่ใจ)",
  "Van (รถตู้เอนกประสงค์หรูหรา)",
  "Roadster (เปิดประทุนหางสปอยเลอร์ซิ่ง)",
];

const TRANSMISSIONS = [
  { value: "auto", label: "เกียร์อัตโนมัติ (Auto) ⚙️" },
  { value: "manual", label: "เกียร์ธรรมดา (Manual) 🕹️" },
  { value: "other", label: "ระบบขับตรงแบบไม่มีเกียร์ / อื่น ๆ 🔌" },
];

const FUEL_TYPES = [
  { value: "electric", label: "ไฟฟ้า 100% (Pure EV) ⚡" },
  { value: "hybrid", label: "ไฮบริด (HEV) 🔋" },
  { value: "plug-in-hybrid", label: "ปลั๊กอินไฮบริด (PHEV) 🔌" },
  { value: "petrol", label: "เบนซิน (Gasoline) ⛽" },
  { value: "diesel", label: "ดีเซล (Diesel) 🚛" },
  { value: "other", label: "พลังงานสะอาดอื่น ๆ 🌟" },
];

const CONDITIONS = [
  { value: "new", label: "ป้ายแดงแกะกล่องใหม่กริ๊บ (New)" },
  { value: "excellent", label: "สภาพนางฟ้า เล่มสวย ไร้ชนหนัก (Excellent)" },
  { value: "good", label: "สภาพสมบูรณ์ พร้อมขับใช้งาน (Good)" },
  { value: "fair", label: "สภาพทั่วไป มีรอบขนแมวตามการใช้งาน (Fair)" },
];

export default function SpecsStep({
  mileage,
  bodyType,
  transmission,
  fuelType,
  color,
  condition,
  generation,
  engineSize,
  drivetrain,
  onChange,
  isDarkMode,
}: SpecsStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-orange-500/10 pb-3">
        <Settings className="w-5 h-5 text-orange-500" />
        <div className="text-left">
          <h3 className="text-base font-extrabold text-orange-500">3. สเปกทางเทคนิคและสภาพเครื่อง</h3>
          <p className="text-[11px] text-slate-400">ระบุรายละเอียดระบบกำลังขับเคลื่อนและเลขไมล์รถตามจริง</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
        
        {/* Mileage */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-orange-500" />
            <span>เลขไมล์สะสมปัจจุบัน (กิโลเมตร)</span>
            <span className="text-orange-500">*</span>
          </label>
          <input
            type="number"
            value={mileage || ""}
            onChange={(e) => onChange({
              mileage: Number(e.target.value),
              bodyType, transmission, fuelType, color, condition, generation, engineSize, drivetrain
            })}
            placeholder="เช่น 24500"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          />
        </div>

        {/* Outer color */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span>สีตัวถังภายนอก</span>
            <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            value={color}
            onChange={(e) => onChange({
              color: e.target.value,
              mileage, bodyType, transmission, fuelType, condition, generation, engineSize, drivetrain
            })}
            placeholder="เช่น สีขาวมุก, สีดำซุปเปอร์แบล็ค, สีเทาซิลเวอร์"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          />
        </div>

        {/* Transmission Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 block">เกียร์รถยนต์ *</label>
          <select
            value={transmission}
            onChange={(e) => onChange({
              transmission: e.target.value as any,
              mileage, bodyType, fuelType, color, condition, generation, engineSize, drivetrain
            })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          >
            {TRANSMISSIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Petrol Type Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 block">เชื้อเพลิงขับเคลื่อน *</label>
          <select
            value={fuelType}
            onChange={(e) => onChange({
              fuelType: e.target.value as any,
              mileage, bodyType, transmission, color, condition, generation, engineSize, drivetrain
            })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          >
            {FUEL_TYPES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Body type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 block">ประเภทตัวถัง *</label>
          <select
            value={bodyType}
            onChange={(e) => onChange({
              bodyType: e.target.value,
              mileage, transmission, fuelType, color, condition, generation, engineSize, drivetrain
            })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          >
            <option value="">-- เลือกประเภทตัวถัง --</option>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Condition selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 block">สภาพสินค้า / ยานพาหนะ *</label>
          <select
            value={condition}
            onChange={(e) => onChange({
              condition: e.target.value as any,
              mileage, bodyType, transmission, fuelType, color, generation, engineSize, drivetrain
            })}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* ADVANCED & OPTIONAL SPECS FIELDS */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 block">โฉม / ปีเจนเนอเรชั่น (เลือกกรอก)</label>
          <input
            type="text"
            value={generation}
            onChange={(e) => onChange({
              generation: e.target.value,
              mileage, bodyType, transmission, fuelType, color, condition, engineSize, drivetrain
            })}
            placeholder="เช่น LCI, โฉมตาเหยี่ยว, ปี FE"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-orange-500" />
            <span>ขนาดความจุเครื่อง / แบตเตอรี่ (เลือกกรอก)</span>
          </label>
          <input
            type="text"
            value={engineSize}
            onChange={(e) => onChange({
              engineSize: e.target.value,
              mileage, bodyType, transmission, fuelType, color, condition, generation, drivetrain
            })}
            placeholder="เช่น 1500 CC, 60 kWh, 2.0 ลิตร"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition-all"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-orange-500" />
            <span>ระบบขับเคลื่อน (Drivetrain)</span>
          </label>
          <div className="flex gap-4">
            {["FWD (ขับหน้า)", "RWD (ขับหลัง)", "AWD (ขับสี่ตลอดเวลา)", "4WD (ขับสี่ลุยวิบาก)"].map((drive) => {
              const checked = drivetrain === drive;
              return (
                <label key={drive} className="flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all bg-slate-900/40 border-white/5 active:scale-95 text-center">
                  <input
                    type="radio"
                    name="drivetrain"
                    checked={checked}
                    onChange={() => onChange({
                      drivetrain: drive,
                      mileage, bodyType, transmission, fuelType, color, condition, generation, engineSize
                    })}
                    className="hidden"
                  />
                  <span className={checked ? "text-orange-550 underline" : "text-slate-400"}>
                    {drive}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
