import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchStore, SortOption } from "../../stores/search/searchStore";
import { useAppStore } from "../../store";
import { useSearch } from "../../hooks/search/useSearch";
import { CarSearchService } from "../../services/search/searchService";
import FilterPanel from "./FilterPanel";
import { getListingPrimaryImage } from "../../utils/listingImages";
import { 
  Search, SlidersHorizontal, Sparkles, AlertCircle, RefreshCw, X, ArrowUpDown, ChevronDown, 
  MapPin, Settings, Fuel, Calendar, Gauge, Heart, MessageSquare, ChevronRight, BookmarkCheck,
  Award, TrendingUp, Compass, Info, CheckCircle2, Star, HelpingHand
} from "lucide-react";

export default function SearchPageView() {
  const { 
    filters, 
    sortBy, 
    setFilters, 
    setSortBy, 
    resetAllFilters, 
    recentSearches, 
    addRecentSearch, 
    clearRecentSearches,
    isFilterDrawerOpen,
    toggleFilterDrawer
  } = useSearchStore();

  const { 
    setView, 
    toggleFavorite, 
    favorites, 
    createChatSession, 
    sendChatMessage,
  } = useAppStore();

  const {
    cars,
    filteredCount,
    catalogCount,
    isLoading,
    isShuffling,
    localSearchText,
    setLocalSearchText,
    aiInsights,
    firestoreIndexDetails,
    brands,
    models,
    provinces,
    hasMore,
    onLoadMore
  } = useSearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Dynamic SEO Metadata Update
  useEffect(() => {
    const brandTerm = filters.brand !== "all" ? filters.brand : "";
    const modelTerm = filters.model !== "all" ? filters.model : "";
    const categoryText = filters.isEvOnly ? "รถยนต์ไฟฟ้า EV " : "รถยนต์มือดีพรีเมียม ";
    
    let seoTitle = `ค้นหา ${brandTerm} ${modelTerm} ${categoryText}สเปกดีที่สุด | Nong A AI`;
    if (!brandTerm && !modelTerm) {
      seoTitle = "ค้นหาและกรองสเปกตลาดรถยนต์อัจฉริยะ | Nong A Market";
    }
    
    document.title = seoTitle;

    // Update meta description safely
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute(
        "content", 
        `โชว์รูมค้นหาอัจฉริยะพร้อมระบุพรีวิวจังหวาด ข้อเสนอปีและอัตราดอกเบี้ยเบื้องต้น คัดตรวจประวัติด้วย AI เกรดยอดเยี่ยม มีผลการรันดัชนีผสม Firestore composite index เพื่อความพึงพอใจร้อยเปอร์เซ็นต์`
      );
    }

    return () => {
      document.title = "Nong A AI | แพลตฟอร์มซื้อขายรถยนต์อัจฉริยะ";
    };
  }, [filters.brand, filters.model, filters.isEvOnly]);

  // 2. Click outside suggestions list close event
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Trigger search submit
  const handleQuerySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (localSearchText.trim() !== "") {
      addRecentSearch(localSearchText);
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (text: string) => {
    setLocalSearchText(text);
    setFilters({ search: text });
    addRecentSearch(text);
    setShowSuggestions(false);
  };

  // 4. Instantly consult AI about selected vehicle
  const handleConsultAI = (car: any) => {
    const sessionTitle = `สัมภาษณ์ ${car.brand} ${car.model} 🤖`;
    createChatSession(sessionTitle);
    setView("chat");
    
    const promptMessage = `วิเคราะห์วิจารณ์เชิงลึกรถยนต์คันนี้ให้หน่อยครับพี่เอ: 
- แบรนด์/รุ่น: ${car.brand} ${car.model} (${car.year})
- ราคาตั้งเสนอขาย: ฿${car.price.toLocaleString()} บาท 
- ประเภท: ${car.type}
- ระยะไมล์สะสม: ${car.mileage.toLocaleString()} กม.
- ระบบเครื่อง: ${car.fuelType}
- สภาพ: ${car.condition}
ช่วยสรุปวิจัยด้านความหรูหรา วงเงินผ่อนต่อเดือน ความคงคงกระพันของการขับขี่ และใส่โปรโมชั่น Nong A ปิดการขายแซ่บๆ ให้พี่ประทับใจแถมอมยิ้มแก้มตุ่ยให้ด้วยนะคร้าบ!`;
    
    sendChatMessage(promptMessage);
  };

  // Static Indexable filter presets for perfect crawlers & SEO discovery
  const seoFilterPresets = [
    { label: "⚡ รถ EV ยี่ห้อดัง", filters: { isEvOnly: true, brand: "all" } },
    { label: "🚗 Toyota เช็คสภาพเยี่ยม", filters: { brand: "Toyota", isEvOnly: false } },
    { label: "💎 งบต่ำกว่า 1.5 ล้าน", filters: { maxPrice: 1500000, brand: "all" } },
    { label: "🏆 รถปีใหม่ 2023 ขึ้นไป", filters: { minYear: 2023, brand: "all" } },
    { label: "📍 พรีเมียมคาร์ กรุงเทพฯ", filters: { province: "กรุงเทพมหานคร", brand: "all" } },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      
      {/* 1. Page Header & Premium Glow Showcase */}
      <div className="relative text-left rounded-3xl overflow-hidden py-10 px-6 sm:px-10 border nonga-bg-elevated nonga-border nonga-text-primary">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-orange-500/5 blur-3xl animate-pulse"></div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-600/10 to-orange-500/20 rounded-full border border-orange-500/20 text-orange-600 dark:text-orange-500 text-[10.5px] font-mono tracking-wider font-extrabold uppercase">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> Advanced Workspace Search
          </div>
          <h1 className="font-display font-black text-2xl sm:text-4xl leading-tight nonga-text-primary tracking-tight">
            ตรวจพิกัดและ <span className="text-orange-600 dark:text-orange-500 bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">คัดเกรดสเป็ครถยนต์</span> อัจฉริยะ
          </h1>
          <p className="nonga-text-secondary font-sans text-xs sm:text-sm max-w-3xl leading-relaxed">
            ระบบค้นหาละเอียดแบบ Instant Sync เชื่อมโยงดัชนีผสม Google Firestore รวดเร็วฉับไว พร้อมระบบให้คะแนนความคุ้มประเมินโดย Nong A AI ตัวท็อป สะท้อนสภาพจริงร้อยเปอร์เซ็นต์คร้าบ
          </p>
        </div>

        {/* Dynamic Search Box Input and Suggestions Interface */}
        <div className="relative mt-8 max-w-3xl z-30" ref={dropdownRef}>
          <form onSubmit={handleQuerySubmit} className="flex gap-2.5">
            <div className="relative flex-grow">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 nonga-text-muted" />
              <input
                type="text"
                value={localSearchText}
                onChange={(e) => {
                  setLocalSearchText(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="พิมพ์ยี่ห้อ, รุ่น, เช่น Tesla Model 3, Fortuner RS หรือรถไฟฟ้า..."
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl text-xs sm:text-sm nonga-bg-surface border nonga-border nonga-text-primary nonga-placeholder focus:outline-none focus:border-orange-500 transition-all nonga-focus-ring"
              />
              {localSearchText && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchText("");
                    setFilters({ search: "" });
                  }}
                  className="absolute right-4.5 top-1/2 -translate-y-1/2 p-1 rounded-full nonga-text-muted nonga-menu-item transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile filter drawer trigger button */}
            <button
              type="button"
              onClick={() => toggleFilterDrawer()}
              className="lg:hidden flex items-center justify-center p-3.5 nonga-action nonga-focus-ring rounded-2xl transition"
              title="เปิดตัวกรองโมบาย"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </form>

          {/* Prompt Suggestions Float list */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-0 right-0 mt-2 nonga-bg-elevated border nonga-border rounded-2xl shadow-xl z-50 overflow-hidden text-left nonga-text-primary"
              >
                {/* Popular Keywords section */}
                <div className="p-4 border-b nonga-border space-y-2">
                  <span className="text-[10px] nonga-text-muted uppercase tracking-widest font-mono font-bold block">คำแนะนำยอดค้นหา</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Tesla Highland", "Fortuner Legender", "Camry Hybrid", "Honda Civic FE", "Ducati V4"].map((item) => (
                      <button
                        key={item}
                        onClick={() => handleSuggestionClick(item)}
                        className="px-2.5 py-1 nonga-bg-subtle nonga-text-primary hover:bg-[var(--nonga-action-primary)] hover:text-[var(--nonga-action-primary-text)] rounded-lg text-[11px] font-sans transition nonga-focus-ring"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent history section */}
                {recentSearches.length > 0 ? (
                  <div className="p-4 max-h-[220px] overflow-y-auto space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] nonga-text-secondary font-mono">
                      <span className="font-bold uppercase tracking-wider">ประวัติบันทึกค้นหาล่าสุด</span>
                      <button onClick={clearRecentSearches} className="nonga-link-accent hover:underline">
                        ล้างประวัติ
                      </button>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {recentSearches.map((term, index) => (
                        <div key={index} className="flex items-center justify-between group py-1 border-b nonga-border">
                          <button
                            onClick={() => handleSuggestionClick(term)}
                            className="text-xs nonga-text-primary nonga-link-accent transition text-left"
                          >
                            🧭 {term}
                          </button>
                          <span className="text-[9px] nonga-text-muted font-mono">ค้นหาครั้งล่าสุด</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-xs nonga-text-muted text-center py-6">
                    คุณยังไม่มีความทรงจำในประวัติการค้นล่าสุด คีย์บอร์ดรถในฝันได้เลยคร้าบ!
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indexable Filter Link presets for SEO and organic crawlers discovery */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t nonga-border pt-4 text-left">
          <span className="text-[11px] nonga-text-muted font-medium font-sans flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-orange-500" /> ทางลัดยอดนิยม (SEO Preset):
          </span>
          <div className="flex flex-wrap gap-2 items-center">
            {seoFilterPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  setFilters(preset.filters as any);
                  if (preset.filters.brand !== "all") {
                    setLocalSearchText(preset.filters.brand);
                  }
                }}
                className="text-[11px] nonga-text-secondary nonga-link-accent border-b border-transparent hover:border-orange-500 transition-all font-mono py-0.5"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Page Layout Grid (Desktop Filters Sidebar + Results Directory) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* DESKTOP SIDEBAR: Sticky, pristine styled Filter panel (col-span-3) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24">
          <div className="p-5 rounded-3xl border nonga-bg-surface nonga-border shadow-xl backdrop-blur-xl">
            <FilterPanel 
              brands={brands} 
              models={models} 
              provinces={provinces} 
              firestoreIndexDetails={firestoreIndexDetails}
            />
          </div>
        </aside>

        {/* RESULTS CONTAINER: Dynamic grid list directory (col-span-9) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Header toolbar: Total Count + Dynamic Sorting Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-orange-500/5">
            <div className="text-left">
              <span className="text-[10px] uppercase font-mono tracking-wider nonga-text-muted block mb-0.5">Showroom Intelligence</span>
              <h2 className="font-display font-black nonga-text-primary text-lg flex items-baseline gap-1.5 leading-none">
                <span>พบ</span>
                <span className="font-mono text-orange-600 dark:text-orange-500 text-xl font-black">{isLoading ? "..." : filteredCount}</span>
                <span className="text-xs nonga-text-secondary font-normal">คัน จากทั้งหมด {catalogCount} คัน</span>
              </h2>
            </div>

            {/* Sort Choices panel */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <span className="text-[11px] font-medium nonga-text-secondary flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" /> เรียงสเป็กโดย:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 cursor-pointer nonga-bg-subtle border nonga-border nonga-text-primary nonga-focus-ring"
              >
                <option value="relevance">ลำดับความเหมาะสม (Relevance)</option>
                <option value="price-asc">ราคาขาย: ถูกสุดไปแพงสุด</option>
                <option value="price-desc">ราคาขาย: แพงสุดไปถูกสุด</option>
                <option value="year-desc">ปีของรุ่นรถ: ใหม่สุดก่อน</option>
                <option value="mileage-asc">เลขระยะไมล์สะสม: ต่ำสุดก่อน</option>
                <option value="ai-score">เกรดประเมินคุ้มโดย Nong A AI ⭐</option>
              </select>
            </div>
          </div>

          {/* AI Aggregated Quick Analytics widget box */}
          {filteredCount > 0 && (
            <div className="p-4 rounded-2xl bg-orange-600/[0.02] border border-orange-500/10 text-left grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[9px] nonga-text-muted tracking-wider block uppercase">ราคากลางเฉลี่ย</span>
                <span className="font-mono font-black text-sm nonga-text-primary">฿{aiInsights.averagePrice.toLocaleString()} บ.</span>
              </div>
              <div>
                <span className="text-[9px] nonga-text-muted tracking-wider block uppercase">จำนวนสตรีม EV/ไฟฟ้า</span>
                <span className="font-mono font-black text-sm text-orange-500">{aiInsights.evCount} คัน ⚡</span>
              </div>
              <div>
                <span className="text-[9px] nonga-text-muted tracking-wider block uppercase">ยี่ห้อมาแรงในระบบ</span>
                <span className="font-sans font-black text-sm text-lime-500 truncate block">{aiInsights.topBrand}</span>
              </div>
              <div>
                <span className="text-[9px] nonga-text-muted tracking-wider block uppercase">ดีลเด็ดดวงคัดพิเศษ</span>
                <button 
                  onClick={() => aiInsights.bestValueCarId && setView("car-details", aiInsights.bestValueCarId)}
                  className="font-mono font-black text-xs nonga-link-accent hover:underline transition text-left block truncate"
                >
                  ✨ คลิกดูดีลคุ้มสุด
                </button>
              </div>
            </div>
          )}

          {/* RENDERING SECTIONS: Skeletons vs Empty vs List Grid */}
          {isLoading && cars.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i} 
                  className="animate-pulse rounded-3xl h-[420px] nonga-bg-subtle border nonga-border"
                />
              ))}
            </div>
          ) : cars.length === 0 ? (
            
            /* EMPTY STATE: Visual callout recommending a reset with search assists */
            <div className="p-12 text-center rounded-3xl border nonga-bg-subtle nonga-border space-y-5 max-w-xl mx-auto">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-600/10 text-orange-500 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 animate-bounce" />
              </div>
              <div className="space-y-1.5 text-center">
                <h4 className="font-display font-black text-lg nonga-text-primary">ไม่พบรถตามพารามิเตอร์ที่คุณระบุครับผม</h4>
                <p className="nonga-text-muted text-xs leading-relaxed max-w-sm mx-auto">
                  อาจเป็นไปได้ว่าช่วงงบสูงสุดน้อยเกินไป หรือระบุเครื่องยนต์ที่ไม่สอดคล้องกัน ลองคลิกด้านล่างเพื่อล้างสเปกตารางค้นหรือเริ่มเจรจาใหม่นะคร้าบ!
                </p>
              </div>
              <button
                onClick={resetAllFilters}
                className="px-6 py-2.5 nonga-action nonga-focus-ring text-xs font-bold rounded-xl shadow-lg transition hover:scale-103 cursor-pointer"
              >
                ล้างข้อมูลตัวกรองเพื่อเรียกดูรถทั้งหมด
              </button>
            </div>
          ) : (
            
            /* IMMERSIVE RESULTS GRID OF CAR CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {cars.map((car, i) => {
                const isFav = favorites.includes(car.id);
                
                // Calculate dynamic visual properties for high-performance feel
                const isTesla = car.brand.toLowerCase() === "tesla";
                const isEv = car.type === "ev" || car.fuelType?.includes("electric");
                
                // Fetch dynamic AI Rating Score
                const aiRatingScore = CarSearchService.calculateAIScore(car);
                
                // Pick status phrase
                const aiQuote = isEv 
                  ? "น้องเอ: ตัวท็อปรถดีอนาคต ประจุไฟฟ้านิ่งไม่มีแผ่ว ⚡ ปังสุดครับ!"
                  : "น้องเอ: รถบ้านเกรดพรีเมียม สภาพเครื่องแน่นกริ๊บพร้อมซิ่งคร้าบ 🔥";

                return (
                  <motion.article
                    key={car.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border nonga-border nonga-bg-surface nonga-text-primary transition-all duration-300 hover:shadow-2xl hover:border-orange-500/30"
                  >
                    {/* Upper gallery display */}
                    <div className="aspect-video relative overflow-hidden nonga-bg-elevated shrink-0">
                      <img
                        src={getListingPrimaryImage(car)}
                        alt={car.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
                        referrerPolicy="no-referrer"
                      />

                      {/* Brand indicator bubble flag */}
                      <span className="absolute top-3.5 left-3.5 py-1 px-2.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider bg-black/75 text-orange-400 border border-orange-500/20 font-mono">
                        {isEv ? "ELECTRIC ⚡" : car.fuelType?.toUpperCase() || "PETROL"}
                      </span>

                      {/* Favorite star */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(car.id);
                        }}
                        className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all border ${
                          isFav
                            ? "bg-red-500 border-red-500 text-white scale-110"
                            : "bg-black/30 border-white/[0.04] text-white hover:bg-black/60"
                        }`}
                        title="ติดดาวรถยนต์"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? "fill-current animate-pulse" : ""}`} />
                      </button>

                      {/* Sold Out Banner */}
                      {car.isSold && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-white bg-red-600/90 font-display font-black text-sm tracking-widest uppercase border-2 border-white px-4 py-1 rotate-[-10deg]">
                            SOLD OUT / ขายแล้ว
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta info & detailed content */}
                    <div className="p-5 flex-grow flex flex-col justify-between space-y-4 text-left">
                      
                      {/* Name header */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider font-extrabold text-orange-500 uppercase">
                          <span>{car.brand}</span>
                          <span className="w-1 h-1 rounded-full nonga-bg-subtle ring-1 ring-[var(--nonga-border-strong)]"></span>
                          <span>{car.condition}</span>
                        </div>
                        <h4 
                          onClick={() => setView("car-details", car.id)}
                          className="font-display font-black text-sm sm:text-base tracking-tight leading-snug hover:text-orange-500 transition-colors cursor-pointer line-clamp-2 min-h-[44px]"
                        >
                          {car.title}
                        </h4>
                      </div>

                      {/* Specs catalog table */}
                      <div className="grid grid-cols-3 gap-1 py-2.5 border-y border-orange-500/5 text-[10.5px] nonga-text-muted font-sans">
                        <div className="flex items-center gap-1 min-w-0" title="ปีจดทะเบียน">
                          <Calendar className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="truncate">ปี {car.year}</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0" title="ระยะสะสม">
                          <Gauge className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="truncate font-mono">{car.mileage.toLocaleString()} กม.</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0" title="พื้นที่ขาย">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="truncate">{car.province || "กรุงเทพฯ"}</span>
                        </div>
                      </div>

                      {/* Rating & Insights block (Very Premium layout) */}
                      <div className="space-y-2">
                        {/* Dynamic rating scale */}
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="nonga-text-muted flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                            <span>AI ประเมินคะแนนคุ้มค่า</span>
                          </span>
                          <span className="text-emerald-500 font-extrabold">{aiRatingScore} / 100</span>
                        </div>
                        <div className="w-full nonga-bg-subtle h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-orange-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${aiRatingScore}%` }}
                          />
                        </div>
                        
                        {/* Quote bubble from advisor */}
                        <p className="text-[10px] leading-normal font-sans italic nonga-text-muted border-l-2 border-orange-500/40 pl-2">
                          {aiQuote}
                        </p>
                      </div>

                      {/* Price callout */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.02]">
                        <div className="text-left">
                          <span className="text-[9px] nonga-text-muted uppercase tracking-widest block leading-none mb-0.5">เงินดาวน์ + ราคาขายสุทธิ</span>
                          <span className="font-mono font-black text-lg text-orange-500">฿{car.price.toLocaleString()}</span>
                        </div>
                        {car.showroomName ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold flex items-center gap-0.5">
                            <BookmarkCheck className="w-3 h-3" /> DECert
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9.5px] nonga-bg-subtle nonga-text-secondary font-bold">
                            รถบ้านแท้
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Action execution panel */}
                    <div className="grid grid-cols-2 gap-2 p-3 border-t border-orange-500/5 nonga-bg-subtle">
                      <button
                        onClick={() => setView("car-details", car.id)}
                        className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold hover:scale-102 transition-all nonga-bg-elevated border nonga-border nonga-text-primary nonga-menu-item nonga-focus-ring"
                      >
                        ดูสเปกละเอียด
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        onClick={() => handleConsultAI(car)}
                        className="flex items-center justify-center gap-1 py-2.5 nonga-action nonga-focus-ring rounded-xl text-xs font-black shadow-md shadow-orange-600/10 hover:scale-102 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 animate-bounce" />
                        <span>ต่อราคาพี่เอ AI 🤖</span>
                      </button>
                    </div>

                  </motion.article>
                );
              })}
            </div>
          )}

          {/* INFINITE SCROLL / LOAD MORE TRIGGER */}
          {hasMore && cars.length > 0 && (
            <div className="pt-8 text-center">
              <button
                onClick={onLoadMore}
                disabled={isShuffling}
                className={`relative px-8 py-3.5 nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)] hover:scale-103 active:scale-97 border nonga-border rounded-2xl text-[11.5px] font-bold nonga-text-primary transition-all inline-flex items-center gap-1.5 select-none nonga-focus-ring ${
                  isShuffling ? "animate-pulse" : "cursor-pointer"
                }`}
              >
                {isShuffling ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                    <span>กำลังประมวลผลดึงพิกัดรถเพิ่ม...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                    <span>โหลดข้อเสนอสเป็กเพิ่มเติมอีก 6 คัน 🪄</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>

      {/* 3. MOBILE FILTER SLIDE-OUT PORTAL/DRAWER OVERLAY */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop dimmer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => toggleFilterDrawer(false)}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
            />
            
            {/* Drawer sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-[32px] border-t z-50 overflow-y-auto no-scrollbar shadow-2xl p-6 nonga-bg-elevated nonga-border backdrop-blur-2xl"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4.5 h-4.5 text-orange-500" />
                  <span className="font-display font-black text-sm nonga-text-primary">ตัวกรองสเป็กละเอียด</span>
                </div>
                <button
                  onClick={() => toggleFilterDrawer(false)}
                  className="p-1 px-3 rounded-full nonga-bg-subtle nonga-text-secondary nonga-menu-item transition-all text-xs border nonga-border nonga-focus-ring"
                >
                  เสร็จสิ้น (Done)
                </button>
              </div>

              <FilterPanel 
                brands={brands} 
                models={models} 
                provinces={provinces} 
                firestoreIndexDetails={firestoreIndexDetails}
                isMobile={true}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
