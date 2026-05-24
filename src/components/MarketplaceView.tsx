import { useEffect } from "react";
import { useAppStore } from "../store";
import { Car } from "../types";
import { getListingPrimaryImage } from "../utils/listingImages";
import { BoostFrame } from "./boost/BoostBadge";
import { Search, SlidersHorizontal, Sparkles, Heart, Fuel, Gauge, Calendar, MessageSquare, ArrowUpDown, ChevronRight, X, Car as CarIcon } from "lucide-react";

export default function MarketplaceView() {
  const { 
    cars, 
    isLoadingCars, 
    fetchCars, 
    filters, 
    setFilters, 
    resetFilters, 
    toggleFavorite, 
    favorites, 
    setView,
    createChatSession,
    sendChatMessage,
    isDarkMode
  } = useAppStore();

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  const hotTags = Array.from(
    new Set(cars.map((c) => c.brand).filter(Boolean))
  ).slice(0, 5);

  const categories = [
    { id: "all", label: "รถทุกประเภท" },
    { id: "ev", label: "รถไฟฟ้า EV ⚡" },
    { id: "used", label: "รถบ้านมือสอง 🚗" },
    { id: "luxury", label: "พรีเมียมหรูหรา 💎" },
    { id: "new", label: "ป้ายแดง 🌟" },
    { id: "motorcycle", label: "มอเตอร์ไซค์ 🏍️" },
  ] as const;

  // Handle automatic AI consult when clicking an item
  const consultAIAboutCar = (car: Car) => {
    const sessionTitle = `วิเคราะห์ ${car.brand} ${car.model} 🤖`;
    createChatSession(sessionTitle);
    setView("chat");
    
    const promptMessage = `วิเคราะห์วิจารณ์เชิงลึกรถยนต์คันนี้ให้หน่อยครับพี่เอ: 
- แบรนด์/รุ่น: ${car.brand} ${car.model} (${car.year})
- ราคาขายตั้งไว้: ฿${car.price.toLocaleString()} บาท 
- ประเภท: ${car.type}
- เลขไมล์: ${car.mileage.toLocaleString()} กม.
- เชื้อเพลิง: ${car.fuelType}
- สภาพตัวเครื่อง: ${car.condition}
ช่วยให้คะแนนด้านความคุ้มค่า อัตราเร่ง แบตเตอรี่/ความคงทน แนะนำสเป็ก และใส่คำพูด signature ของน้องเอให้แซ่บซ่า ปังปุริเย่ ด้วยนะคร้าบ!`;
    
    sendChatMessage(promptMessage);
  };

  // Perform client-side filter computation
  const filteredCars = cars.filter(car => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchTitle = car.title.toLowerCase().includes(searchLower);
      const matchBrand = car.brand.toLowerCase().includes(searchLower);
      const matchModel = car.model.toLowerCase().includes(searchLower);
      if (!matchTitle && !matchBrand && !matchModel) return false;
    }

    // Category filter
    if (filters.category !== "all" && car.type !== filters.category) {
      return false;
    }

    // Min price
    if (car.price < filters.minPrice) return false;

    // Max price
    if (car.price > filters.maxPrice) return false;

    // Fuel Type
    if (filters.fuelType !== "all" && car.fuelType !== filters.fuelType) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (filters.sortBy === "latest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (filters.sortBy === "price-asc") {
      return a.price - b.price;
    }
    if (filters.sortBy === "price-desc") {
      return b.price - a.price;
    }
    if (filters.sortBy === "year-desc") {
      return b.year - a.year;
    }
    return 0;
  });

  return (
    <div className="space-y-6 sm:space-y-10 pb-20">
      
      {/* Premium Hero Banner Block */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white py-12 px-6 sm:px-12 border border-slate-800">
        {/* Glow backdrop shapes */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-orange-600/20 blur-3xl brand-glow"></div>
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-slate-800/40 blur-3xl"></div>
        
        <div className="relative max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/25 text-orange-500 text-xs font-semibold uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> Next-Gen SaaS Engine 2026
          </div>
          
          <h1 className="font-display font-bold text-3xl sm:text-5xl leading-tight tracking-tight">
            ตลาดซื้อ-ขายรถยนต์ที่ดีที่สุด <br/>
            ขับเคลื่อนด้วย <span className="text-orange-500 bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">AI อัจฉริยะ</span> ของ NongBot
          </h1>
          
          <p className="text-slate-400 font-sans text-sm sm:text-base max-w-2xl leading-relaxed">
            สัมผัสประสบการณ์ซื้อรถยุคใหม่ วิเคราะห์เปรียบเทียบราคาอย่างมั่นใจ ปังปุริเย่ไปกับน้องเอ AI Sales Expert สรุปข้อมูลครบจบในคลิกเดียว พร้อมให้ต่อรองและวิจารณ์สภาพรถแบบเจาะลึก!
          </p>
        </div>

        {/* Dynamic Search Console */}
        <div className="relative mt-8 max-w-3xl">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-grow">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="พิมพ์ยี่ห้อ รุ่น หรือคีย์เวิร์ดรถที่ชอบ... (เช่น Tesla Model 3, Fortuner)"
                className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-sm transition-all"
              />
              {filters.search && (
                <button 
                  onClick={() => setFilters({ search: "" })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <button 
              onClick={() => setFilters({ sortBy: filters.sortBy === "latest" ? "price-asc" : "latest" })}
              className="flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-slate-300 hover:text-white transition-all text-sm font-medium"
            >
              <ArrowUpDown className="w-4 h-4 text-orange-500" />
              <span>{filters.sortBy === "price-asc" ? "ราคาต่ำสุดก่อน" : "เรียงตามล่าสุด"}</span>
            </button>
          </div>

          {hotTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 text-[12px] text-slate-400">
              <span>ยี่ห้อในตลาด:</span>
              {hotTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilters({ search: tag })}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-sans transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Grid: Control center + Cars Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 items-start">
        
        {/* Filters sidebar */}
        <aside className={`lg:sticky lg:top-24 space-y-5 rounded-2xl p-5 ${isDarkMode ? "glass-panel" : "glass-panel-light"} border`}>
          <div className="flex items-center justify-between border-b pb-3 border-orange-500/10">
            <div className="flex items-center gap-2 font-display font-semibold">
              <SlidersHorizontal className="w-4.5 h-4.5 text-orange-500" />
              <span>ตัวกรองละเอียด</span>
            </div>
            <button 
              onClick={resetFilters}
              className="text-[11px] text-orange-500 hover:underline font-mono"
            >
              รีเซ็ตทั้งหมด
            </button>
          </div>

          {/* Budget Limit Slider */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium block text-slate-400">
              งบประมาณสูงสุด: <span className="font-mono text-orange-500 font-bold block sm:inline">฿{filters.maxPrice.toLocaleString()} บาท</span>
            </label>
            <input
              type="range"
              min="100000"
              max="10000000"
              step="50000"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ maxPrice: Number(e.target.value) })}
              className="w-full accent-orange-600 cursor-pointer h-1.5 rounded-lg bg-slate-200 dark:bg-slate-800"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>฿100k</span>
              <span>฿10M</span>
            </div>
          </div>

          {/* Segment Selection lists */}
          <div className="space-y-2">
            <span className="text-[13px] font-medium block text-slate-400">ประเภทเครื่องยนต์</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "all", label: "ทั้งหมด" },
                { id: "electric", label: "ไฟฟ้า 100%" },
                { id: "hybrid", label: "Hybrid" },
                { id: "petrol", label: "เบนซิน" },
                { id: "diesel", label: "ดีเซล" },
              ].map(fuel => (
                <button
                  key={fuel.id}
                  onClick={() => setFilters({ fuelType: fuel.id })}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-sans transition-all duration-150 border ${
                    filters.fuelType === fuel.id
                      ? "bg-slate-900 border-orange-500 text-orange-500 font-medium"
                      : "border-transparent bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/40 dark:hover:bg-slate-800/80 text-slate-400"
                  }`}
                >
                  {fuel.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats widget */}
          <div className="border-t border-orange-500/10 pt-4 text-xs space-y-1.5 text-slate-500">
            <div className="flex justify-between">
              <span>พบรถยนต์ทั้งหมด:</span>
              <span className="font-mono text-orange-500 font-semibold">{filteredCars.length} คัน</span>
            </div>
            <div className="flex justify-between">
              <span>รถเซกเมนต์ EV:</span>
              <span className="font-mono">{cars.filter(c => c.type === "ev").length} คัน</span>
            </div>
            <div className="flex justify-between">
              <span>มอเตอร์ไซค์ยอดฮิต:</span>
              <span className="font-mono">{cars.filter(c => c.type === "motorcycle").length} คัน</span>
            </div>
          </div>
        </aside>

        {/* Listings Display and Header categories Column */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Categories Quick Selector strip */}
          <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
            {categories.map((cat) => {
              const count = cat.id === "all" ? cars.length : cars.filter(c => c.type === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilters({ category: cat.id })}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-sans transition-all duration-200 border ${
                    filters.category === cat.id
                      ? "bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/15"
                      : isDarkMode
                      ? "bg-slate-900/40 border-slate-800/50 hover:border-slate-700 text-slate-300 hover:bg-slate-900"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="ml-1.5 opacity-60 font-mono text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Loading Skeleton fallback */}
          {isLoadingCars ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`animate-pulse rounded-2xl h-[380px] ${isDarkMode ? "bg-slate-900" : "bg-slate-100"}`}></div>
              ))}
            </div>
          ) : cars.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border ${
                isDarkMode
                  ? "bg-slate-900/10 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              } space-y-4`}
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <CarIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-lg">
                  ยังไม่มีรถในตลาด
                </h4>
                <p className="text-slate-500 text-xs sm:text-sm">
                  เป็นคนแรกที่ลงประกาศขายรถได้เลยครับ — ข้อมูลจะแสดงทันทีหลังลงขาย
                </p>
              </div>
              <button
                onClick={() => setView("sell")}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs hover:bg-orange-700 transition-all font-medium"
              >
                ลงประกาศขายรถ
              </button>
            </div>
          ) : filteredCars.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border ${
                isDarkMode
                  ? "bg-slate-900/10 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              } space-y-4`}
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-lg">
                  ไม่พบรถตามตัวกรอง
                </h4>
                <p className="text-slate-500 text-xs sm:text-sm">
                  มีรถ {cars.length} คันในตลาด — ลองปรับคำค้นหาหรือตัวกรอง
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs hover:bg-orange-700 transition-all font-medium"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            /* Vehicle collection listings grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {filteredCars.map((car) => {
                const isFav = favorites.includes(car.id);
                
                // Smart random tag picker to showcase emotional UI
                const smartBadge = car.type === "ev" 
                  ? "EV ⚡ มลพิษเป็นศูนย์" 
                  : car.type === "luxury" 
                  ? "พรีเมียม สภาพเลิศ 💎" 
                  : car.type === "motorcycle"
                  ? "ซุปเปอร์ซิ่ง 🏍️"
                  : car.price < 1000000 
                  ? "ราคาดี ผ่อนคุ้ม 🌟" 
                  : "คัดเกรดเช็คประวัติ ด่วน 🔥";

                const openCarDetails = () => setView("car-details", car.id);

                return (
                  <BoostFrame
                    key={car.id}
                    isBoosted={!!car.boosted}
                    isFeatured={!!car.featured}
                    aiScore={car.type === "ev" ? 92 : 86}
                  >
                    <article 
                      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border h-full transition-all duration-300 hover:scale-[1.01] ${
                        isDarkMode 
                          ? "glass-panel hover:border-orange-500/30 hover:glow-orange-sm text-white" 
                          : "bg-white border-slate-150 shadow-sm hover:shadow-md hover:border-orange-500/30 text-slate-800"
                      }`}
                    >
                      
                      {/* Top image — แตะรูปเข้าหน้ารายละเอียดรถ */}
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={openCarDetails}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openCarDetails();
                            }
                          }}
                          className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
                          aria-label={`ดูรายละเอียดรถคันนี้: ${car.title}`}
                        >
                          <img
                            key={`${car.id}-cover`}
                            src={getListingPrimaryImage(car)}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <span className="absolute top-3.5 left-3.5 z-10 pointer-events-none bg-slate-950/80 backdrop-blur-md text-[10px] sm:text-[11px] text-orange-500 font-semibold px-2.5 py-1 rounded-lg border border-orange-500/25">
                          {smartBadge}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(car.id);
                          }}
                          className={`absolute top-3 left-auto right-3 z-20 p-2 rounded-full backdrop-blur-md border transition-all ${
                            isFav 
                              ? "bg-red-500 border-red-500 text-white scale-110" 
                              : "bg-black/40 border-white/10 text-white hover:bg-black/60"
                          }`}
                          title="บันทึกคันนี้"
                          aria-label="บันทึกรถคันนี้ในรายการโปรด"
                        >
                          <Heart className={`w-4 h-4 ${isFav ? "fill-current animate-pulse" : ""}`} />
                        </button>

                        {car.isSold && (
                          <div className="absolute inset-0 z-10 pointer-events-none bg-black/60 flex items-center justify-center">
                            <span className="text-white bg-red-600/90 font-display font-black text-xl tracking-widest uppercase border-2 border-white px-4 py-1 rotate-[-12deg]">
                              SOLD OUT / ขายแล้ว
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadata & detail layout */}
                      <div className="p-4 space-y-3.5 flex-grow flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono tracking-wider font-semibold text-orange-500 uppercase">
                              {car.brand}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              ปี {car.year}
                            </span>
                          </div>
                          <h3 
                            onClick={openCarDetails}
                            className="font-display font-bold text-[15px] sm:text-[16px] leading-tight tracking-tight hover:text-orange-500 cursor-pointer min-h-[44px] line-clamp-2"
                          >
                            {car.title}
                          </h3>
                        </div>

                        {/* Spec metrics */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-orange-500/5 text-[11px] text-slate-400 font-sans">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{car.year}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Gauge className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate font-mono">{car.mileage.toLocaleString()} กม.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Fuel className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate uppercase">{car.fuelType}</span>
                          </div>
                        </div>

                        {/* Display price block */}
                        <div className="flex items-baseline justify-between pt-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest">ราคาเสนอขาย</span>
                            <span className="font-mono font-black text-lg text-orange-500">
                              ฿{car.price.toLocaleString()}
                            </span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"}`}>
                            สภาพ {car.condition}
                          </span>
                        </div>

                        {/* AI Expert comment tag */}
                        <div className={`p-2.5 rounded-xl border flex items-start text-[11.5px] leading-relaxed select-none ${
                          isDarkMode 
                            ? "bg-slate-900/80 border-slate-800/80 text-slate-300" 
                            : "bg-orange-500/5 border-orange-500/10 text-slate-700"
                        }`}>
                          <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                          <span className="line-clamp-2 pl-1.5">
                            <strong className="text-orange-500 font-bold block sm:inline">Nong A: </strong>
                            {car.type === "ev" ? "คันนี้ปังปุริเย่! สเป็คไฟฟ้าแห่งโลกอนาคต ประหยัดไฟตัวท็อป ⚡" : "รถบ้านแท้ คันนี้มีคนทักแน่ครับ 🔥 คอนเฟิร์มโดย AI น้องเอ!"}
                          </span>
                        </div>

                      </div>

                      {/* Button interactions footer */}
                      <div className="grid grid-cols-2 gap-2 p-3 pt-0 border-t border-orange-500/5 bg-slate-900/5 dark:bg-slate-950/20">
                        <button 
                          type="button"
                          onClick={openCarDetails}
                          className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-sans font-medium transition-all duration-150 ${
                            isDarkMode 
                              ? "bg-slate-800 hover:bg-slate-750 text-white" 
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          ดูสเป็คละเอียด <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        
                        <button 
                          onClick={() => consultAIAboutCar(car)}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl text-xs font-semibold glow-orange-sm transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>ถามน้องเอ AI</span>
                        </button>
                      </div>

                    </article>
                  </BoostFrame>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
