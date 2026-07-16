import { useEffect } from "react";
import { useAppStore } from "../store";
import { Car } from "../types";
import { ListingCoverImage } from "./listings/ListingCoverImage";
import { resolveMarketplaceUiState } from "../utils/marketplaceUiState";
import { BoostFrame } from "./boost/BoostBadge";
import { submitListingReport, type ListingReportReason } from "../services/listings/listingReportApi";
import { Search, SlidersHorizontal, Sparkles, Heart, Fuel, Gauge, Calendar, MessageSquare, ArrowUpDown, ChevronRight, X, Car as CarIcon } from "lucide-react";

export default function MarketplaceView() {
  const { 
    cars, 
    isLoadingCars, 
    carsLoadState,
    carsLoadError,
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

  const reportListing = async (car: Car) => {
    const raw = window.prompt(
      "เลือกเหตุผลการรายงาน:\n1) ข้อมูลรถไม่ถูกต้อง\n2) รูปไม่ตรงกับรถ/ไม่เหมาะสม\n3) สงสัยหลอกลวง\n4) ประกาศซ้ำ\n5) ติดต่อไม่ได้/ข้อมูลไม่ชัดเจน\n6) อื่น ๆ\n\nพิมพ์หมายเลข 1-6",
      "1"
    );
    if (!raw) return;
    const reasonMap: Record<string, ListingReportReason> = {
      "1": "incorrect-info",
      "2": "image-mismatch-or-inappropriate",
      "3": "suspected-fraud",
      "4": "duplicate-listing",
      "5": "contact-unreachable-or-unclear",
      "6": "other",
    };
    const reason = reasonMap[raw.trim()];
    if (!reason) {
      alert("กรุณาเลือกเหตุผล 1-6");
      return;
    }
    const note = window.prompt("รายละเอียดเพิ่มเติม (ไม่บังคับ):", "") || "";
    const result = await submitListingReport({
      listingId: car.id,
      reason,
      note,
    });
    if (result.ok) {
      void fetchCars();
    }
    alert(
      result.ok
        ? "ขอบคุณที่ช่วยแจ้งครับ ทีมงานจะตรวจสอบประกาศนี้\nการรายงานเป็นการแจ้งให้ตรวจสอบ ไม่ได้หมายความว่าประกาศผิดทันที"
        : result.message
    );
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

  const uiState = resolveMarketplaceUiState({
    isLoadingCars,
    carsLoadState,
    carsCount: cars.length,
    filteredCarsCount: filteredCars.length,
  });

  return (
    <div className="space-y-6 sm:space-y-10 pb-20">
      
      {/* Premium Hero Banner Block */}
      <section className="relative overflow-hidden rounded-3xl nonga-bg-elevated nonga-text-primary py-12 px-6 sm:px-12 border nonga-border">
        {/* Glow backdrop shapes */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-orange-600/20 blur-3xl brand-glow"></div>
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full nonga-bg-subtle blur-3xl opacity-70"></div>
        
        <div className="relative max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/25 text-orange-500 text-xs font-semibold uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> Next-Gen SaaS Engine 2026
          </div>
          
          <h1 className="font-display font-bold text-3xl sm:text-5xl leading-tight tracking-tight">
            ตลาดซื้อ-ขายรถยนต์ที่ดีที่สุด <br/>
            ขับเคลื่อนด้วย <span className="text-orange-500 bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">AI อัจฉริยะ</span> ของ NongBot
          </h1>
          
          <p className="nonga-text-secondary font-sans text-sm sm:text-base max-w-2xl leading-relaxed">
            สัมผัสประสบการณ์ซื้อรถยุคใหม่ วิเคราะห์เปรียบเทียบราคาอย่างมั่นใจ ปังปุริเย่ไปกับน้องเอ AI Sales Expert สรุปข้อมูลครบจบในคลิกเดียว พร้อมให้ต่อรองและวิจารณ์สภาพรถแบบเจาะลึก!
          </p>
        </div>

        {/* Dynamic Search Console */}
        <div className="relative mt-8 max-w-3xl">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-grow">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 nonga-text-muted" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="พิมพ์ยี่ห้อ รุ่น หรือคีย์เวิร์ดรถที่ชอบ... (เช่น Tesla Model 3, Fortuner)"
                className="w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl nonga-bg-subtle border nonga-border nonga-text-primary nonga-placeholder focus:outline-none focus:border-orange-500 text-sm transition-all nonga-focus-ring"
              />
              {filters.search && (
                <button 
                  onClick={() => setFilters({ search: "" })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 nonga-text-muted hover:text-[var(--nonga-text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <button 
              onClick={() => setFilters({ sortBy: filters.sortBy === "latest" ? "price-asc" : "latest" })}
              className="flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 nonga-bg-subtle border nonga-border rounded-2xl nonga-text-secondary nonga-menu-item transition-all text-sm font-medium nonga-focus-ring"
            >
              <ArrowUpDown className="w-4 h-4 text-orange-500" />
              <span>{filters.sortBy === "price-asc" ? "ราคาต่ำสุดก่อน" : "เรียงตามล่าสุด"}</span>
            </button>
          </div>

          {hotTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 text-[12px] nonga-text-secondary">
              <span>ยี่ห้อในตลาด:</span>
              {hotTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilters({ search: tag })}
                  className="px-2.5 py-1 nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)] border nonga-border rounded-lg nonga-text-primary font-sans transition-all nonga-focus-ring"
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
        <aside className="lg:sticky lg:top-24 space-y-5 rounded-2xl p-5 nonga-bg-surface border nonga-border">
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
            <label className="text-[13px] font-medium block nonga-text-secondary">
              งบประมาณสูงสุด: <span className="font-mono text-orange-500 font-bold block sm:inline">฿{filters.maxPrice.toLocaleString()} บาท</span>
            </label>
            <input
              type="range"
              min="100000"
              max="10000000"
              step="50000"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ maxPrice: Number(e.target.value) })}
              className="w-full accent-orange-600 cursor-pointer h-1.5 rounded-lg nonga-bg-subtle"
            />
            <div className="flex justify-between text-[11px] nonga-text-muted font-mono">
              <span>฿100k</span>
              <span>฿10M</span>
            </div>
          </div>

          {/* Segment Selection lists */}
          <div className="space-y-2">
            <span className="text-[13px] font-medium block nonga-text-secondary">ประเภทเครื่องยนต์</span>
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
                      ? "nonga-bg-elevated border-orange-500 text-orange-600 dark:text-orange-500 font-medium"
                      : "border-transparent nonga-bg-subtle nonga-text-muted"
                  }`}
                >
                  {fuel.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats widget */}
          <div className="border-t border-orange-500/10 pt-4 text-xs space-y-1.5 nonga-text-muted">
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
                      ? "nonga-action border-[var(--nonga-action-primary)] shadow-md shadow-orange-600/15"
                      : "nonga-bg-surface border nonga-border nonga-text-secondary nonga-menu-item"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="ml-1.5 opacity-60 font-mono text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Loading Skeleton fallback */}
          {carsLoadState === "error" && (
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm ${
                isDarkMode
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p>{carsLoadError || "โหลดข้อมูลรถไม่สำเร็จชั่วคราว"}</p>
                <button
                  onClick={() => void fetchCars()}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold nonga-action nonga-focus-ring transition-all"
                >
                  ลองใหม่
                </button>
              </div>
            </div>
          )}

          {uiState === "loading" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl h-[380px] nonga-bg-subtle"></div>
              ))}
            </div>
          ) : uiState === "error" ? (
            <div
              className="p-12 text-center rounded-2xl border nonga-bg-subtle nonga-border space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <X className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-lg">
                  โหลดรายการรถไม่สำเร็จ
                </h4>
                <p className="nonga-text-muted text-xs sm:text-sm">
                  ข้อมูลอาจขัดข้องชั่วคราว กรุณาลองโหลดใหม่อีกครั้ง
                </p>
              </div>
              <button
                onClick={() => void fetchCars()}
                className="px-5 py-2.5 nonga-action nonga-focus-ring rounded-xl text-xs transition-all font-medium"
              >
                ลองโหลดใหม่
              </button>
            </div>
          ) : uiState === "empty" ? (
            <div
              className="p-12 text-center rounded-2xl border nonga-bg-subtle nonga-border space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <CarIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-lg">
                  ยังไม่มีรถในตลาด
                </h4>
                <p className="nonga-text-muted text-xs sm:text-sm">
                  เป็นคนแรกที่ลงประกาศขายรถได้เลยครับ — ข้อมูลจะแสดงทันทีหลังลงขาย
                </p>
              </div>
              <button
                onClick={() => setView("sell")}
                className="px-5 py-2.5 nonga-action nonga-focus-ring rounded-xl text-xs transition-all font-medium"
              >
                ลงประกาศขายรถ
              </button>
            </div>
          ) : uiState === "filtered-empty" ? (
            <div
              className="p-12 text-center rounded-2xl border nonga-bg-subtle nonga-border space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-lg">
                  ไม่พบรถตามตัวกรอง
                </h4>
                <p className="nonga-text-muted text-xs sm:text-sm">
                  มีรถ {cars.length} คันในตลาด — ลองปรับคำค้นหาหรือตัวกรอง
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 nonga-action nonga-focus-ring rounded-xl text-xs transition-all font-medium"
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
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border nonga-border nonga-bg-surface nonga-text-primary h-full transition-all duration-300 hover:scale-[1.01] hover:border-orange-500/30 shadow-sm hover:shadow-md"
                    >
                      
                      {/* Top image — แตะรูปเข้าหน้ารายละเอียดรถ */}
                      <div className="relative aspect-video w-full overflow-hidden nonga-bg-elevated">
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
                          <ListingCoverImage
                            listingId={car.id}
                            images={car.images}
                            alt={car.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                            testId="marketplace-card-cover-image"
                            showPlaceholderIcon
                          />
                        </div>

                        <span className="absolute top-3.5 left-3.5 z-10 pointer-events-none bg-black/75 backdrop-blur-md text-[10px] sm:text-[11px] text-orange-500 font-semibold px-2.5 py-1 rounded-lg border border-orange-500/25">
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
                            <span className="w-1 h-1 rounded-full nonga-bg-subtle ring-1 ring-[var(--nonga-border-strong)]"></span>
                            <span className="text-[10px] nonga-text-muted">
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
                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-orange-500/5 text-[11px] nonga-text-muted font-sans">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 nonga-text-muted flex-shrink-0" />
                            <span className="truncate">{car.year}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Gauge className="w-3.5 h-3.5 nonga-text-muted flex-shrink-0" />
                            <span className="truncate font-mono">{car.mileage.toLocaleString()} กม.</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Fuel className="w-3.5 h-3.5 nonga-text-muted flex-shrink-0" />
                            <span className="truncate uppercase">{car.fuelType}</span>
                          </div>
                        </div>

                        {/* Display price block */}
                        <div className="flex items-baseline justify-between pt-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] nonga-text-muted uppercase tracking-widest">ราคาเสนอขาย</span>
                            <span className="font-mono font-black text-lg text-orange-500">
                              ฿{car.price.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded nonga-bg-subtle nonga-text-secondary">
                            สภาพ {car.condition}
                          </span>
                        </div>

                        {/* AI Expert comment tag */}
                        <div className="p-2.5 rounded-xl border border-orange-500/10 bg-orange-500/5 flex items-start text-[11.5px] leading-relaxed select-none nonga-text-secondary">
                          <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                          <span className="line-clamp-2 pl-1.5">
                            <strong className="text-orange-500 font-bold block sm:inline">Nong A: </strong>
                            {car.type === "ev" ? "คันนี้ปังปุริเย่! สเป็คไฟฟ้าแห่งโลกอนาคต ประหยัดไฟตัวท็อป ⚡" : "รถบ้านแท้ คันนี้มีคนทักแน่ครับ 🔥 คอนเฟิร์มโดย AI น้องเอ!"}
                          </span>
                        </div>

                      </div>

                      {/* Button interactions footer */}
                      <div className="grid grid-cols-2 gap-2 p-3 pt-0 border-t border-orange-500/5 nonga-bg-subtle">
                        <button 
                          type="button"
                          onClick={openCarDetails}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-sans font-medium transition-all duration-150 nonga-bg-elevated border nonga-border nonga-text-primary nonga-menu-item nonga-focus-ring"
                        >
                          ดูสเป็คละเอียด <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        
                        <button 
                          onClick={() => consultAIAboutCar(car)}
                          className="flex items-center justify-center gap-1 px-3 py-2 nonga-action nonga-focus-ring rounded-xl text-xs font-semibold glow-orange-sm transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>ถามน้องเอ AI</span>
                        </button>
                      </div>
                      <div className="px-3 pb-3 -mt-1">
                        <button
                          type="button"
                          onClick={() => void reportListing(car)}
                          className="text-[11px] nonga-text-muted nonga-link-accent underline-offset-2 hover:underline"
                        >
                          รายงานประกาศ
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
