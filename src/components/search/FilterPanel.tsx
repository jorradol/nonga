import React from "react";
import { useSearchStore } from "../../stores/search/searchStore";
import { useAppStore } from "../../store";
import { 
  SlidersHorizontal, RefreshCw, Car, Calendar, DollarSign, MapPin, 
  Settings, Fuel, Sparkles, CheckSquare, Square, ShieldCheck, Zap 
} from "lucide-react";

interface FilterPanelProps {
  brands: string[];
  models: string[];
  provinces: string[];
  firestoreIndexDetails: {
    optimizedKeys: string[];
    indexIdNeeded: string;
    hasCompositeIndex: boolean;
    explanation: string;
  };
  isMobile?: boolean;
}

export default function FilterPanel({ 
  brands, 
  models, 
  provinces, 
  firestoreIndexDetails,
  isMobile = false 
}: FilterPanelProps) {
  const { filters, setFilters, resetAllFilters } = useSearchStore();
  const { isDarkMode } = useAppStore();

  const handleToggle = (key: keyof typeof filters) => {
    setFilters({ [key]: !filters[key] });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - i);

  return (
    <div className={`space-y-6 text-left ${isMobile ? "p-1" : ""}`}>
      {/* 1. Header with Reset Trigger */}
      <div className="flex items-center justify-between border-b pb-4 border-orange-500/10">
        <h4 className="font-display font-black text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
          <SlidersHorizontal className="w-4.5 h-4.5 text-orange-500 animate-pulse" />
          <span>ตัวกรองสเป็กละเอียด</span>
        </h4>
        <button
          onClick={resetAllFilters}
          className="flex items-center gap-1 text-[11px] font-bold text-orange-500 hover:text-orange-400 font-mono tracking-tight transition-colors"
          title="ล้างทั้งหมด"
        >
          <RefreshCw className="w-3 h-3" />
          <span>รีเซ็ต</span>
        </button>
      </div>

      {/* 2. Brand & Model selectors */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-orange-500" /> ยี่ห้อรถยนต์
          </label>
          <select
            value={filters.brand}
            onChange={(e) => setFilters({ brand: e.target.value })}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-white focus:outline-none focus:border-orange-500 transition-all ${
              isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white text-slate-800 border-slate-200"
            }`}
          >
            <option value="all" className="bg-slate-900 text-white">ทุกยี่ห้อ (All Brands)</option>
            {brands.map((brand) => (
              <option key={brand} value={brand} className="bg-slate-900 text-white">
                {brand}
              </option>
            ))}
          </select>
        </div>

        {filters.brand !== "all" && (
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              รุ่นของ {filters.brand}
            </label>
            <select
              value={filters.model}
              onChange={(e) => setFilters({ model: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-orange-500 transition-all ${
                isDarkMode ? "bg-slate-900/80 border-slate-800 text-white" : "bg-white text-slate-800 border-slate-200"
              }`}
            >
              <option value="all">ทุกรุ่น (All Models)</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Price Range Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-orange-500" /> ช่วงงบเสนอขาย
          </label>
          <span className="font-mono text-xs text-orange-500 font-extrabold">
            ฿{filters.maxPrice.toLocaleString()} บ.
          </span>
        </div>
        <input
          type="range"
          min="100000"
          max="8000000"
          step="50000"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ maxPrice: Number(e.target.value) })}
          className="w-full accent-orange-500 h-1.5 rounded-lg bg-slate-800 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>฿100k</span>
          <span>฿8M+</span>
        </div>
      </div>

      {/* 4. Year Min/Max selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-orange-500" /> ช่วงปีจดทะเบียน (ค.ศ.)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">ตั้งแต่ปี</span>
            <select
              value={filters.minYear}
              onChange={(e) => setFilters({ minYear: Number(e.target.value) })}
              className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                isDarkMode ? "bg-slate-900 text-white border border-slate-800" : "bg-slate-100 text-slate-800 border-transparent"
              }`}
            >
              {[2010, 2012, 2015, 2018, 2020, 2021, 2022, 2023].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">ถึงปี</span>
            <select
              value={filters.maxYear}
              onChange={(e) => setFilters({ maxYear: Number(e.target.value) })}
              className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none ${
                isDarkMode ? "bg-slate-900 text-white border border-slate-800" : "bg-slate-100 text-slate-800 border-transparent"
              }`}
            >
              {[2018, 2020, 2022, 2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. Fuel Type Options */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Fuel className="w-3.5 h-3.5 text-orange-500" /> ชนิดเชื้อเพลิง
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "electric", label: "ไฟฟ้า 100%" },
            { id: "hybrid", label: "Hybrid" },
            { id: "petrol", label: "เบนซิน" },
            { id: "diesel", label: "ดีเซล" },
          ].map((fuel) => (
            <button
              key={fuel.id}
              onClick={() => setFilters({ fuelType: fuel.id })}
              className={`px-3 py-2 rounded-xl text-left text-xs transition-all border ${
                filters.fuelType === fuel.id
                  ? "bg-slate-950 border-orange-500 text-orange-500 font-bold"
                  : "border-transparent bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-400"
              }`}
            >
              {fuel.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Transmission selects */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-orange-500" /> ระบบเกียร์
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "auto", label: "ออโต้" },
            { id: "manual", label: "ธรรมดา" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilters({ transmission: t.id })}
              className={`py-1.5 rounded-lg text-center text-[11px] font-sans border transition ${
                filters.transmission === t.id
                  ? "bg-orange-500/10 text-orange-500 border-orange-500/30 font-bold"
                  : "border-transparent bg-slate-900/40 hover:bg-slate-900 text-slate-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 7. Location Province Filter */}
      <div>
        <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-orange-500" /> พื้นที่ / จังหวัดที่ขาย
        </label>
        <select
          value={filters.province}
          onChange={(e) => setFilters({ province: e.target.value })}
          className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-orange-500 transition ${
            isDarkMode ? "bg-slate-900 border border-slate-800 text-white" : "bg-white text-slate-800 border-slate-200"
          }`}
        >
          <option value="all">ทุกพื้นที่ (Thailand)</option>
          <option value="กรุงเทพมหานคร">กรุงเทพมหานคร</option>
          <option value="ชลบุรี">ชลบุรี (พัทยา)</option>
          <option value="เชียงใหม่">เชียงใหม่</option>
          <option value="ภูเก็ต">ภูเก็ต</option>
          {provinces.filter(p => !["กรุงเทพมหานคร", "ชลบุรี", "เชียงใหม่", "ภูเก็ต"].includes(p)).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* 8. Luxury interactive switches */}
      <div className="space-y-4 pt-3 border-t border-orange-500/5">
        <label className="text-xs font-sans font-extrabold text-orange-500 uppercase tracking-widest block">
          สิทธิพิเศษ & ตัวช่วยคัดเกรด
        </label>

        {/* EV Clean Air */}
        <button
          onClick={() => handleToggle("isEvOnly")}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-600/10 text-orange-500 flex items-center justify-center">
              <Zap className="w-3 h-3 fill-current" />
            </div>
            <span>รถยนต์ไฟฟ้า EV เท่านั้น</span>
          </div>
          {filters.isEvOnly ? (
            <CheckSquare className="w-4.5 h-4.5 text-orange-500" />
          ) : (
            <Square className="w-4.5 h-4.5 text-slate-600" />
          )}
        </button>

        {/* Dealer Showrooms */}
        <button
          onClick={() => handleToggle("dealerOnly")}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-600/10 text-orange-500 flex items-center justify-center">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span>จากดีลเลอร์รับประกัน</span>
          </div>
          {filters.dealerOnly ? (
            <CheckSquare className="w-4.5 h-4.5 text-orange-500" />
          ) : (
            <Square className="w-4.5 h-4.5 text-slate-600" />
          )}
        </button>

        {/* AI Recommendations */}
        <button
          onClick={() => handleToggle("aiRecommendedOnly")}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition bg-orange-500/[0.03] p-2.5 rounded-xl border border-orange-500/10"
        >
          <div className="flex items-center gap-2 text-left">
            <div className="w-5 h-5 rounded-lg bg-orange-600/20 text-orange-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="leading-snug">
              <span className="text-orange-500 font-bold block">น้องเอวิเคราะห์เด่น ⭐</span>
              <span className="text-[9.5px] text-slate-400 block font-normal">สเปกคุ้มสุด คอนเฟิร์มโดย AI</span>
            </div>
          </div>
          {filters.aiRecommendedOnly ? (
            <CheckSquare className="w-5 h-5 text-orange-500 shrink-0" />
          ) : (
            <Square className="w-5 h-5 text-slate-600 shrink-0" />
          )}
        </button>
      </div>

      {/* 9. Firestore Composite Index optimized telemetry */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-3 shadow-inner">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Google Firestore Query Optimizer</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
          {firestoreIndexDetails.explanation}
        </p>
        <div className="p-2.5 bg-black rounded-lg border border-slate-850 font-mono text-[9px] text-[#22c55e] break-all leading-normal select-all cursor-pointer">
          {firestoreIndexDetails.hasCompositeIndex ? (
            <>
              <span className="text-slate-500 block">ID: {firestoreIndexDetails.indexIdNeeded}</span>
              <span>INDEX: status == "active" {firestoreIndexDetails.optimizedKeys.map(k => `&& ${k} == val`).join(" ")}</span>
            </>
          ) : (
            <span className="text-slate-500">No complex indexes requested - Standard index ready ✅</span>
          )}
        </div>
      </div>
    </div>
  );
}
