import React, { useState } from "react";
import { 
  Dna, Gauge, Shield, MapPin, Palette, Settings, Fuel, Sparkles, 
  Compass, Eye, CheckCircle 
} from "lucide-react";
import { Car } from "../../../types";

interface SpecificationsListProps {
  car: Car;
  isDarkMode?: boolean;
}

export default function SpecificationsList({ car }: SpecificationsListProps) {
  const [activeTab, setActiveTab] = useState<"specifications" | "features" | "tags">("specifications");

  // Format conditions nicely
  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "new": return "แกะกล่องป้ายแดง (Factory New)";
      case "excellent": return "กริ๊บไร้ริ้วรอย (Excellent Grade)";
      case "good": return "ดีเยี่ยมพร้อมใช้งาน (Good Condition)";
      case "fair": return "สภาพการใช้งานมาตรฐาน (Fair)";
      default: return condition;
    }
  };

  // Convert transmission values
  const getTransmissionLabel = (trans: string) => {
    switch (trans) {
      case "auto": return "อัตโนมัติ (Automatic)";
      case "manual": return "เกียร์กระปุก (Manual)";
      default: return "อื่นๆ / ไดเร็กไดรฟ์";
    }
  };

  const specSpecs = [
    { label: "แบรนด์ยานยนต์", value: car.brand, icon: Dna },
    { label: "รุ่น / รุ่นย่อย (Model)", value: car.model, icon: Sparkles },
    { label: "ปีที่จดทะเบียน (Year)", value: `${car.year} (ค.ศ.)`, icon: Sparkles },
    { label: "ระยะไมล์แท้สะสม (Mileage)", value: `${car.mileage.toLocaleString()} กิโลเมตร`, icon: Gauge },
    { label: "ระบบขับเคลื่อน (Drivetrain)", value: car.drivetrain || "AWD (ทุกล้ออัจฉริยะ)", icon: Compass },
    { label: "ประเภทระบบเชื้อเพลิง", value: car.fuelType?.toUpperCase() || "ELECTRICITY", icon: Fuel },
    { label: "ระบบเกียร์ช่วงล่าง", value: getTransmissionLabel(car.transmission), icon: Settings },
    { label: "สีตัวถังภายนอก (Color)", value: car.color || "ขาวประกายมุก", icon: Palette },
    { label: "เซกเมนต์ประเภทตัวถัง", value: car.bodyType || "Premium SUV", icon: Shield },
    { label: "จังหวัดที่จอดทะเบียนรถ", value: car.province || "กรุงเทพมหานคร", icon: MapPin },
    { label: "สภาพเครื่องยนต์โดยรวม", value: getConditionLabel(car.condition), icon: Shield },
    { label: "เจรจาราคาได้หรือไม่", value: car.negotiable ? "ยินดีรับข้อเสนอ/ต่อรองได้" : "ราคาเน็ตดิวคุ้มค่าแล้ว", icon: Eye },
  ];

  return (
    <div className="p-6 sm:p-8 rounded-3xl border nonga-bg-surface nonga-border nonga-text-primary shadow-2xl space-y-6 text-left">

      {/* Tabs list menu */}
      <div className="flex border-b border-orange-500/20 pb-0 gap-4">
        {[
          { id: "specifications", label: "ข้อมูลทางเทคนิคของรถ" },
          { id: "features", label: `อุปกรณ์อำนวยความสะดวก (${car.features?.length || 8})` },
          { id: "tags", label: "แท็กรับรองพิเศษ" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "specifications" | "features" | "tags")}
            className={`pb-3.5 text-xs font-bold relative transition-all cursor-pointer nonga-focus-ring ${
              activeTab === tab.id
                ? "text-[var(--nonga-action-primary)] select-none"
                : "nonga-text-muted hover:text-[var(--nonga-text-primary)]"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[var(--nonga-action-primary)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels content displays */}
      <div>
        {activeTab === "specifications" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 animate-fadeIn">
            {specSpecs.map((spec, i) => {
              const IconComp = spec.icon;
              return (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--nonga-bg-subtle)] transition-all border border-transparent hover:border-[var(--nonga-border)]"
                >
                  <div className="p-2 rounded-lg bg-orange-600/10 text-[var(--nonga-action-primary)] shrink-0">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-[10px] nonga-text-muted uppercase tracking-wide block mb-0.5 font-semibold">{spec.label}</span>
                    <span className="text-xs sm:text-[13px] font-bold nonga-text-primary">{spec.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "features" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(car.features && car.features.length > 0 ? car.features : [
                "ถุงลมนิรภัยรอบคัน (Dual SRS Airbags)",
                "หน้าจอทัชสกรีนอัจฉริยะ 15 นิ้ว",
                "ระบบช่วยเบรกระบบอัจฉริยะ (ABS & EBD)",
                "กล้องรอบทิศทาง 360 องศา (Panoramic View)",
                "หลังคาแก้วแบบพาโนรามิก (Glass Roof)",
                "เบาะนั่งหุ้มหนังพรีเมียมสีทิวลิปพิเศษ",
                "ระบบคุมความปลอดภัย Lane Keeping Assist",
                "แท่นชาร์จโทรศัพท์ไร้สายประสิทธิภาพสูง (Wireless QC)"
              ]).map((feat, idx) => (
                <div 
                  key={idx} 
                  className="p-3 nonga-bg-subtle border nonga-border rounded-xl flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-[var(--nonga-action-primary)] shrink-0" />
                  <span className="text-xs nonga-text-secondary line-clamp-1">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "tags" && (
          <div className="space-y-4 animate-fadeIn text-left">
            <span className="text-[10px] font-sans font-bold nonga-text-muted uppercase tracking-widest block">
              แท็กจัดหมวดหมู่โดย น้องเอ AI และโบรกเกอร์ (Tags Classified)
            </span>
            <div className="flex flex-wrap gap-2">
              {(car.tags && car.tags.length > 0 ? car.tags : [
                "รถบ้านมือเดียวคัดเกรด",
                "ชาร์จตู้ทางเลือกง่าย",
                "เช็คศูนย์ตลอดปีครบถ้วน",
                "เล่มครบพร้อมโอนเสรี",
                "แบตเตอรี่รับประกันศูนย์เหลือเฟือ",
                "ห้องจอดในร่มร่มรื่น",
                "ประหยัดภาษีประจำปี"
              ]).map((tg, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold nonga-bg-subtle border border-orange-500/25 text-[var(--nonga-action-primary)] shadow-sm"
                >
                  #{tg}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
