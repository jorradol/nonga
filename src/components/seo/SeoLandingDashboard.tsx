import React, { useState } from "react";
import { 
  Search, ShieldCheck, Globe, Star, FileText, Code, Check, Copy, 
  MapPin, Eye, ExternalLink, RefreshCw, Sparkles, TrendingUp, 
  Settings, Layers, Braces, EyeOff, Languages, ChevronRight,
  TrendingDown, PlusCircle, AlertCircle, Sparkle, Tag, Info, Award
} from "lucide-react";
import { useSeo } from "../../hooks/seo/useSeo";
import { useAppStore } from "../../store";
import { seoService } from "../../services/seo/seoService";
import { SeoLandingPage, SeoBreadcrumb } from "../../types/seo";

export function SeoLandingDashboard() {
  const { isDarkMode, cars, setView } = useAppStore();
  const { 
    pages, 
    activePage, 
    setActivePage, 
    insights, 
    isLoading, 
    customKeyword, 
    setCustomKeyword, 
    createDynamicPage 
  } = useSeo();

  const [language, setLanguage] = useState<"TH" | "EN" | "ZH">("TH");
  const [showMetadataRaw, setShowMetadataRaw] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [showSitemapXml, setShowSitemapXml] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "insights" | "sitemap">("visual");

  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Trigger simulated AI SEO Optimization
  const handleAiOptimize = () => {
    if (!activePage) return;
    setAiOptimizing(true);
    setTimeout(() => {
      setAiSuggestions([
        `💡 เพิ่มคำว่า "ราคากลางปี 2026" ในประโยคแรกเพื่อสอย Traffic คอนเซปต์ราคาอัปเดต`,
        `📈 คีย์เวิร์ด "${activePage.keyword}" กำลังก้าวกระโดดบนคีย์เวิร์ดเทรนด์โมบาย ดึงอิโมจิรถไฟความเร็วเพิ่มขึ้น`,
        `⚙️ ปรับ Canonical Schema เพิ่มพิกัดละติจูดโชว์รูม Nong A กรุงเทพมหานคร เพื่อเสริม SEO Local Snippet`,
        `🔗 ควรแนบลิงก์ภายในตรงไปที่หมวดหมู่หลัก "${activePage.category.toUpperCase()}" ด้วยตัวอักษรสีเข้มเลอค่า`
      ]);
      setAiOptimizing(false);
    }, 1200);
  };

  // Trigger text copy
  const handleCopyText = (text: string, slugKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(slugKey);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Convert active page values to multilingual translations on the fly
  const getTranslatedContent = (page: SeoLandingPage) => {
    if (language === "EN") {
      return {
        title: `Premium Used ${page.keyword.replace("มือสอง", "")} for Sale | Nong A Marketplace`,
        description: `Explore quality certified used vehicles inside Bangkok and prime locations. Instant financial pre-approvals via Nong A AI. Free quotation!`,
        h1: `Select Premium ${page.keyword.replace("มือสอง", "Used Vehicles")} 💎`,
        introContent: `Welcome to Thailand's most trusted green and luxury automotive index! We offer fully pre-checked ${page.keyword} vehicles with zero accidental logs, certified with official Nong A 150-Point Standard checks. Contact us today.`,
        detailedContent: `Experience true driving pleasure and long-term durability. Every vehicle listed undergoes deep engine profiling, system tuning, and local document vetting. Financing packages available with low interest rates up to 84 months.`
      };
    }
    if (language === "ZH") {
      return {
        title: `精选优质二手 ${page.keyword.replace("มือสอง", "")} 售价和图片 | 农阿汽车`,
        description: `寻找泰国最杰出的精选二手汽车。由农阿AI提供即时贷款和历史检查。无重大事故保证，曼谷优质经销商直营。`,
        h1: `尊享卓越 ${page.keyword.replace("มือสอง", "二手汽车")} 特惠 🔋`,
        introContent: `欢迎来到泰国首选的高端绿色二手车平台。我们精心筛选的 ${page.keyword} 均通过150项农阿标准系统测评，电池健康度卓越，历史透明，提供全额退款保障。`,
        detailedContent: `拥抱未来智慧出行。这里展示的每一款车型都拥有完备的保养记录与官方鉴定证书，让您的每次旅途都极富安全与舒适。我们还致力于为您配置低利率和高达84期的融资优惠。`
      };
    }
    return {
      title: page.title,
      description: page.description,
      h1: page.h1,
      introContent: page.introContent,
      detailedContent: page.detailedContent
    };
  };

  const activeContent = activePage ? getTranslatedContent(activePage) : null;
  const recommendedCars = activePage ? seoService.recommendCarsForPage(activePage, cars) : [];

  // Assemble dynamic Sitemap simulation
  const sitemapXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main Static Portals -->
  <url>
    <loc>https://nonga-car.com/</loc>
    <lastmod>2026-05-22</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nonga-car.com/marketplace</loc>
    <lastmod>2026-05-22</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Dynamic Auto-Generated SEO Landing Pages -->
  ${pages.map(p => `  <url>
    <loc>https://nonga-car.com/seo/${p.slug}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n  ")}
</urlset>`;

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* 1. Header segment */}
      <div className={`p-6 sm:p-8 rounded-3xl border w-full text-left relative overflow-hidden ${
        isDarkMode 
          ? "bg-[#0b0d13]/60 border-white/[0.05]" 
          : "bg-gradient-to-br from-[#f1f4f9] to-white border-slate-200"
      }`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono font-black uppercase tracking-wider">SEO Auto-Page Engine</span>
            </div>
            
            <h1 className="font-display font-black text-2xl sm:text-3.5xl text-gray-950 dark:text-white tracking-tight">
              ระบบหน้าเพจ <span className="text-emerald-500">SEO คัดกรองอัจฉริยะ 🔎</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              สร้างหน้า Landing Page ดึงคีย์เวิร์ดยอดฮิต คลอดโครงสร้างข้อมูล JSON-LD ออมนิกำหนดแบรนด์ ท้องถิ่น และแท็กแผนภูมิสอดรับเสิร์ชเอ็นจินทันใจ
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 md:pt-0 shrink-0">
            {["visual", "insights", "sitemap"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition cursor-pointer select-none ${
                  activeTab === tab
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/15"
                    : isDarkMode
                    ? "bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:bg-slate-900"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab === "visual" ? "🎯 Landing View" : tab === "insights" ? "📊 SEO Tracker" : "🔗 XML Sitemap"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Custom Index System Maker */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${
        isDarkMode ? "bg-[#0c0d12]/90 border-white/[0.05]" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <PlusCircle className="w-4.5 h-4.5 text-emerald-500" />
              <span>ดลใจขยายการรั้งคีย์เวิร์ดด่วน (Dynamic Custom SEO Page Builder)</span>
            </h4>
            <p className="text-xs text-slate-400">
              ป้อนคำที่ผู้บริโภคค้นหาบ่อยในกูเกิล แล้วระบบของน้องเอจะรวบสไตล์เขียนคำโมเดลพรีเมียมให้ทันสมัย
            </p>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <input 
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              placeholder="เช่น รถสปอร์ตมือสอง ราคาประหยัด..."
              disabled={isLoading}
              className={`text-xs p-3.5 rounded-xl border outline-none min-w-[240px] flex-1 md:flex-initial ${
                isDarkMode ? "bg-slate-950 border-white/5 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            />
            <button
              onClick={() => {
                if (customKeyword.trim()) {
                  createDynamicPage(customKeyword);
                  setCustomKeyword("");
                }
              }}
              disabled={isLoading || !customKeyword.trim()}
              className="p-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black rounded-xl text-white transition cursor-pointer shrink-0"
            >
              {isLoading ? "กำลังสังเคราะห์..." : "สร้างและอินเด็กซ์ด่วน"}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Horizontal list of Indexable Category pages */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">เลือกหน้าเพจที่จำลองขึ้นในเสิร์ชโรบ็อต:</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pages.map((p) => {
            const isActive = activePage?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  setActivePage(p);
                  setAiSuggestions([]);
                }}
                className={`p-3.5 rounded-xl border transition cursor-pointer select-none text-left space-y-1 bg-clip-padding relative group ${
                  isActive
                    ? "bg-emerald-500/[0.04] border-emerald-500 text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.05)] scale-102"
                    : isDarkMode ? "bg-slate-950 border-white/[0.04] hover:bg-slate-900 text-slate-400" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded leading-none ${
                    isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                  }`}>
                    {p.category.toUpperCase()}
                  </span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                </div>
                <h5 className={`font-bold text-xs truncate ${isActive ? "text-emerald-500" : "text-gray-900 dark:text-white"}`}>
                  {p.keyword}
                </h5>
                <span className="text-[10px] text-slate-500 font-mono">
                  /{p.slug}
                </span>
                
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all text-xs text-slate-400">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Tab content display */}
      {!activePage && activeTab === "visual" ? (
        <div className={`p-16 rounded-2xl border text-center space-y-4 ${
          isDarkMode ? "bg-[#090b0e] border-white/5" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto animate-pulse text-2xl">
            🔮
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-extrabold text-white text-sm dark:text-white">เชื่อมโยงหน้าผลกำไรเข้า SEO ไพน์</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              กรุณาคลิกเลือกการ์ดหัวข้อยอดนิยมด้านบน เพื่อเริ่มทดสอบประสิทธิภาพแผงรั้งคีย์เวิร์ด, บทสังเคราะห์ และ JSON Structured Scheme สบตาสไปเดอร์กูเกิลครับ
            </p>
          </div>
        </div>
      ) : (
        <div className="transition-all duration-300">
          
          {/* TAB 1: VISUAL LANDING TEMPLATE */}
          {activeTab === "visual" && activePage && activeContent && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left visual result presentation inside responsive body (7/12 cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Visual Sandbox: Simulated Browser Window for High Craftsmanship design */}
                <div className={`rounded-2xl border shadow-xl overflow-hidden ${
                  isDarkMode ? "bg-[#0b0c0f] border-white/[0.06]" : "bg-white border-slate-200 pb-1"
                }`}>
                  {/* Browser simulated top chrome bar */}
                  <div className="p-3 bg-slate-900 border-b border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    
                    <div className="bg-slate-950 px-4 py-1 rounded text-[10px] text-slate-400 font-mono w-1/2 text-center truncate select-all">
                      https://nonga-car.com/seo/{activePage.slug}?lang={language.toLowerCase()}
                    </div>

                    <div className="flex items-center gap-2">
                      <Languages className="w-3.5 h-3.5 text-slate-500" />
                      <div className="flex bg-slate-950 p-0.5 rounded border border-white/5">
                        {(["TH", "EN", "ZH"] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setLanguage(lang)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold cursor-pointer transition ${
                              language === lang ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Browser content rendering inside */}
                  <div className="p-6 sm:p-8 space-y-8 select-text">
                    
                    {/* SEO-friendly Crawlable Breadcrumbs */}
                    <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium tracking-tight">
                      <span>หน้าหลัก</span>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                      <span className="cursor-pointer hover:text-emerald-500 transition" onClick={() => setView("marketplace")}>รถยนต์มือสอง</span>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                      <span className="text-emerald-500 truncate font-semibold font-display">{activePage.keyword} ({language})</span>
                    </nav>

                    {/* SEO Heading H1 */}
                    <div className="space-y-4">
                      <h1 className="font-display font-black text-2xl sm:text-3xl text-gray-950 dark:text-white tracking-tight text-left leading-tight">
                        {activeContent.h1}
                      </h1>
                      
                      {/* Dynamic trust banner */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Checked Standard 150
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono font-medium">
                          อัปเดตล่าสุด: พฤศจิกายน 2026
                        </span>
                      </div>
                    </div>

                    {/* AI SEO Optimized copy section (Intro + Detail) */}
                    <div className="space-y-4 leading-relaxed text-slate-700 dark:text-slate-300 text-xs sm:text-sm text-left">
                      <p className="font-bold border-l-2 border-emerald-500 pl-3 py-0.5 text-gray-900 dark:text-white">
                        {activeContent.introContent}
                      </p>
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {activeContent.detailedContent}
                      </p>
                    </div>

                    {/* Dynamic Auto-Page Car Recommendation Showcase (Highly detailed list aligned to keywords) */}
                    <div className="space-y-4 border-t pt-6 border-orange-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          <h3 className="font-display font-black text-sm text-gray-950 dark:text-white">
                            คัดรถยนต์บ้านสภาพเยี่ยม แนะนำเฉพาะบุคคล (AI Recommendations)
                          </h3>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-mono">
                          พบทั้งสิ้น {recommendedCars.length} คันสอดคล้อง
                        </span>
                      </div>

                      {recommendedCars.length === 0 ? (
                        <div className="p-8 border border-white/5 rounded-xl bg-slate-950/20 text-center text-xs text-slate-500">
                          😢 ปัจจุบันยังไม่มีรายการรถแบรนด์นี้จดทะเบียนในโชว์รูม แนะนำกดสร้างลิสต์สุ่มจำลอง
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {recommendedCars.slice(0, 4).map((car) => (
                            <div
                              key={car.id}
                              onClick={() => setView("car-details", car.id)}
                              className={`rounded-xl border hover:border-emerald-500 transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                                isDarkMode ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200 shadow-xs"
                              }`}
                            >
                              <div className="aspect-video w-full relative overflow-hidden bg-slate-900">
                                <img 
                                  src={car.images?.[0] || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format" } 
                                  alt={car.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-102 transition"
                                />
                                {car.boosted && (
                                  <span className="absolute top-2 left-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide">
                                    BOOSTED
                                  </span>
                                )}
                              </div>

                              <div className="p-3.5 space-y-1.5 text-left">
                                <p className="font-bold text-xs truncate text-gray-900 dark:text-white">
                                  {car.title}
                                </p>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono font-semibold">
                                  <span>{car.year} | {car.mileage.toLocaleString()} กม.</span>
                                  <span className="text-emerald-500 text-xs font-black">
                                    ฿{car.price.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Internal Linking Widgets - helps spider crawlers travel inside web app structure config */}
                    <div className="pt-6 border-t border-white/[0.04] space-y-3">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                        🔗 ลิงก์เชื่อมโยงภายในที่เกี่ยวข้อง (Internal Crawl Matrix)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {pages.filter(p => p.id !== activePage.id).map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setActivePage(p);
                              setLanguage("TH");
                              setAiSuggestions([]);
                            }}
                            className={`p-1.5 px-3 rounded-lg border text-[11px] transition cursor-pointer select-none font-medium ${
                              isDarkMode 
                                ? "bg-slate-900 border-white/5 text-slate-300 hover:text-white hover:border-emerald-500" 
                                : "bg-slate-100 border-slate-205 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            ค้นหา {p.keyword} ทั้งหมด 🚘
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Right Side config detailing metadata & jsonLd (5/12 cols) */}
              <div className="lg:col-span-4 space-y-6 text-left">
                
                {/* Card 1: Meta Tag Simulation Block */}
                <div className={`p-5 sm:p-6 rounded-2xl border ${
                  isDarkMode ? "bg-[#0c0d12]/90 border-white/[0.05]" : "bg-white border-slate-200 shadow-sm"
                } space-y-4`}>
                  
                  <div className="flex items-center justify-between border-b pb-2 border-emerald-500/10">
                    <h4 className="font-display font-black text-xs text-uppercase text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-emerald-500" />
                      <span>META TAGS (กูเกิลบอทส่อง)</span>
                    </h4>

                    <button
                      onClick={() => setShowMetadataRaw(!showMetadataRaw)}
                      className="text-[10px] text-emerald-400 font-bold"
                    >
                      {showMetadataRaw ? "ซ่อนโค้ด HTML" : "แสดง HTML โค้ด"}
                    </button>
                  </div>

                  {!showMetadataRaw ? (
                    // OG Mock card visuals
                    <div className="space-y-4">
                      
                      <div className="p-3 bg-slate-900/60 rounded-xl space-y-1 w-full text-[11px]">
                        <span className="text-slate-400 font-bold">🎯 Title tag:</span>
                        <p className="text-white font-semibold leading-relaxed line-clamp-2">
                          {activeContent.title}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-xl space-y-1 w-full text-[11px]">
                        <span className="text-slate-400 font-bold">📝 Meta Description:</span>
                        <p className="text-slate-300 leading-relaxed line-clamp-3">
                          {activeContent.description}
                        </p>
                      </div>

                      {/* OG Card sharing preview mockup */}
                      <div className="p-1 rounded-xl border border-white/5 bg-slate-950 overflow-hidden space-y-2">
                        <img 
                          src={activePage.ogImage} 
                          alt="preview" 
                          referrerPolicy="no-referrer"
                          className="w-full aspect-video object-cover rounded-lg"
                        />
                        <div className="p-2 space-y-0.5 text-[10px] text-left">
                          <span className="text-slate-500 uppercase tracking-widest font-mono">NONGA-CAR.COM</span>
                          <h5 className="font-bold text-white truncate text-xs">{activeContent.title}</h5>
                          <p className="text-slate-400 truncate leading-relaxed">{activePage.description}</p>
                        </div>
                      </div>

                    </div>
                  ) : (
                    // Crawl HTML markup
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500">
                        * แทรกบน Header อัตโนมัติในโมเดล DOM (Next.js-like Head Injector)
                      </p>
                      <pre className="p-3 bg-black rounded-lg text-[9px] font-mono text-emerald-400 text-left overflow-x-auto whitespace-pre leading-relaxed max-h-[300px] overflow-y-auto">
{`<title>${activeContent.title}</title>
<meta name="description" content="${activeContent.description}" />
<link rel="canonical" href="${activePage.canonicalUrl}" />

<!-- Open Graph Facebook -->
<meta property="og:title" content="${activeContent.title}" />
<meta property="og:description" content="${activeContent.description}" />
<meta property="og:image" content="${activePage.ogImage}" />
<meta property="og:url" content="${activePage.canonicalUrl}" />
<meta property="og:type" content="website" />

<!-- Twitter Elements -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${activeContent.title}" />
<meta name="twitter:description" content="${activeContent.description}" />
<meta name="twitter:image" content="${activePage.ogImage}" />`}
                      </pre>
                    </div>
                  )}

                </div>

                {/* Card 2: JSON-LD Schema builder (Pretty Print code viewer) */}
                <div className={`p-5 sm:p-6 rounded-2xl border ${
                  isDarkMode ? "bg-[#0c0d12]/90 border-white/[0.05]" : "bg-white border-slate-200 shadow-sm"
                } space-y-3`}>
                  
                  <div className="flex items-center justify-between border-b pb-2 border-emerald-500/10">
                    <h4 className="font-display font-black text-xs text-uppercase text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Braces className="w-4 h-4 text-emerald-500" />
                      <span>JSON-LD STRUCTURED SCHEMA</span>
                    </h4>
                    
                    <button
                      onClick={() => handleCopyText(JSON.stringify(seoService.compileJsonLd(activePage, recommendedCars), null, 2), "schema")}
                      className="text-[10px] text-emerald-400 font-bold"
                    >
                      {copiedSlug === "schema" ? "คัดลอกสำเร็จแล้ว!" : "Copy Schema 📋"}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-normal">
                    กูเกิลบอทใช้โครงสร้าง Rich Snippets นี้เพื่อดันรีวิวระดับดาวและแสดงราคาขายบนหน้าค้นหาสเป็คตรงใจ
                  </p>

                  <pre className="p-3.5 bg-black rounded-lg text-[9.5px] font-mono text-amber-400 text-left overflow-x-auto whitespace-pre leading-relaxed max-h-[300px] overflow-y-auto w-full selection:bg-neutral-800">
                    {JSON.stringify(seoService.compileJsonLd(activePage, recommendedCars), null, 2)}
                  </pre>
                </div>

                {/* Card 3: AI SEO Ranking Insights & suggestions advisor */}
                <div className={`p-5 sm:p-6 rounded-2xl border ${
                  isDarkMode ? "bg-[#0c0d12]/90 border-white/[0.05]" : "bg-white border-slate-200 shadow-sm"
                } space-y-4`}>
                  
                  <div className="flex items-center justify-between border-b pb-2 border-emerald-500/10">
                    <h4 className="font-display font-black text-xs text-uppercase text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>AI SEO TUNING INTEGRATION</span>
                    </h4>
                    
                    <button
                      onClick={handleAiOptimize}
                      disabled={aiOptimizing}
                      className="px-2.5 py-1 text-[10px] bg-emerald-600 font-bold text-white rounded cursor-pointer"
                    >
                      {aiOptimizing ? "กำลังสืบ..." : "เปิดคัมภีร์แนะนำ"}
                    </button>
                  </div>

                  {aiSuggestions.length > 0 ? (
                    <div className="space-y-2 pt-1 animate-fade-in text-[11px] leading-relaxed">
                      {aiSuggestions.map((s, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 text-left">
                          {s}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-500">
                      * กดปุ่ม "เปิดคัมภีร์แนะนำ" เพื่อสกัดพลังค้นหาและแก้ไขช่องโหว่อีโคไลเซชันหน้าเพจนี้
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: SEARCH TRACKER INSIGHTS DASHBOARD */}
          {activeTab === "insights" && (
            <div className={`p-5 sm:p-6 rounded-2xl border ${
              isDarkMode ? "bg-[#0f1118] border-white/[0.05]" : "bg-white border-slate-200"
            } space-y-6 text-left`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-emerald-500/10 gap-2">
                <div className="space-y-0.5 text-left">
                  <h3 className="font-display font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span>แผงวิเคราะห์อันดับเสิร์ชคีย์เวิร์ด (Search Engine Rankings & Insights)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ติดตามยอด Traffic, ค่าประเมินความยากง่าย (KW Difficulty) และโอกาสปรับคลิกสตรีมเมอร์
                  </p>
                </div>

                <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold rounded-lg border border-emerald-500/20 uppercase tracking-widest shrink-0 self-start sm:self-center">
                  Real-time Rank Vetting Enabled
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">เป้าหมายคีย์เวิร์ด</th>
                      <th className="py-3 px-4">อันดับบน Google Search</th>
                      <th className="py-3 px-4">ปริมาณการค้นหา / ล้านเดือน</th>
                      <th className="py-3 px-4">ความยากขุดคำ (Difficulty)</th>
                      <th className="py-3 px-4">แบคลิงก์ (Referencing Links)</th>
                      <th className="py-3 px-4">ยอดแบรนดิ้งคลิก (Est. CTR)</th>
                      <th className="py-3 px-4 text-right">ลิงก์ผลลัพธ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {insights.map((ins, idx) => (
                      <tr key={idx} className="hover:bg-white/2 transition">
                        <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">
                          💡 "{ins.keyword}"
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-mono font-black text-xs ${
                            ins.currentRank <= 3 
                              ? "bg-emerald-500/15 text-emerald-400" 
                              : "bg-amber-500/15 text-amber-400"
                          }`}>
                            อันดับ {ins.currentRank}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-gray-900 dark:text-neutral-300">
                          {ins.monthlyVolume.toLocaleString()} ครั้ง
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[11px] font-semibold text-orange-400">
                            {ins.difficulty}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          {ins.backlinksCount} โดเมน
                        </td>
                        <td className="py-4 px-4 font-mono text-emerald-400 font-bold">
                          {ins.ctrEstimate}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              const match = pages.find(p => p.slug === ins.slug);
                              if (match) {
                                setActivePage(match);
                                setActiveTab("visual");
                              }
                            }}
                            className="p-1.5 px-3 rounded-lg border border-emerald-500/20 text-[10.5px] bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 transition cursor-pointer"
                          >
                            เจาะลึก 🎯
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Extra rank insights tip of the hour section */}
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-2 flex gap-3 items-start">
                <span className="text-xl">🏆</span>
                <div className="space-y-1">
                  <span className="text-[11px] font-black text-white uppercase tracking-wider block">วิเคราะห์แชมเปี้ยนคีย์เวิร์ดประจำสัปดาห์ (Search Ranking Insight Vetting):</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ปัจจุบัน คำว่า <strong className="text-emerald-400">"Toyota มือสอง กรุงเทพ"</strong> และ <strong className="text-emerald-400">"รถ EV มือสอง"</strong> มีค่าสวิงแอนะล็อกเติบโตขึ้นอย่างรวดเร็ว โชว์รูมของเราสามารถเร่งดันความพึงพอใจการมองเห็นด้วยการเพิ่มแคปชั่นโปรโมทติดสลัก Nong A Certified ได้ทันทีเลยจองง่ายสะพัดแน่นอนจ้า
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: DYNAMIC REAL-TIME SITEMAP VIEWER */}
          {activeTab === "sitemap" && (
            <div className={`p-5 sm:p-6 rounded-2xl border ${
              isDarkMode ? "bg-[#0c0d12]/90 border-white/[0.05]" : "bg-white border-slate-200"
            } space-y-4 text-left`}>
              
              <div className="flex items-center justify-between border-b pb-3 border-emerald-500/10">
                <div className="space-y-1">
                  <h3 className="font-display font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Braces className="w-4.5 h-4.5 text-emerald-500" />
                    <span>ระบบขูดทำสารบัญอัตโนมัติ (Automated /sitemap.xml Generator)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    เสิร์ชเอ็นจินกูเกิลบอท, ตึกดาต้า และสไปเดอร์สลักอื่นๆ ใช้ไฟล์นี้ในการวิ่งค้นข้อมูลรถยนต์ทั้งระบบ
                  </p>
                </div>

                <button
                  onClick={() => handleCopyText(sitemapXmlContent, "sitemap")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg transition"
                >
                  {copiedSlug === "sitemap" ? "คัดลอกไฟล์ XML สำเร็จ!" : "คัดลอก XML แดชบอร์ดด่วน 📋"}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                  <span>เซิร์ฟเวอร์เรียกลิงก์ปลายทาง: <strong className="text-emerald-400 font-mono">/sitemap.xml</strong></span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">200 OK</span>
                </div>
                
                <pre className="p-4 bg-black rounded-xl text-[9px] sm:text-[10.5px] font-mono text-emerald-400 text-left overflow-x-auto whitespace-pre leading-relaxed selection:bg-stone-800 max-h-[400px] overflow-y-auto">
                  {sitemapXmlContent}
                </pre>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
