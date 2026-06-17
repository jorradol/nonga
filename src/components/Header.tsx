import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";
import { useAuth } from "../hooks/auth/useAuth";
import { useRole } from "../hooks/auth/useRole";
import { 
  MessageSquare, Car, Sparkles, Heart, Store, ClipboardList, FileText,
  Sun, Moon, PlusCircle, Search, Menu, X, 
  ChevronRight, ArrowRight, ShieldCheck, UserCheck, 
  Home, LogOut, Key, Sparkle, Camera, Crown, Rocket, Globe
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Header() {
  const { 
    currentView, 
    setView, 
    isDarkMode, 
    toggleDarkMode, 
    favorites, 
    user, 
    filters, 
    setFilters 
  } = useAppStore();

  const { logout, isSignedIn, isSimulatedState } = useAuth();
  const { role, isDealer, isAdmin, membershipDisplay } = useRole();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navScrollRef = useRef<HTMLElement>(null);

  // Global shortcut 'Slash' or 'Ctrl/Command + K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus on status or search triggers
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== el) return;
      const step = 120;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        el.scrollBy({ left: step, behavior: "smooth" });
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        el.scrollBy({ left: -step, behavior: "smooth" });
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  type AppView = Parameters<typeof setView>[0];
  type HeaderNavItem = {
    id: AppView;
    label: string;
    icon: LucideIcon;
    badge?: string;
    count?: number;
  };

  const viteEnv = (import.meta as { env?: { DEV?: boolean } }).env;
  const showSandboxNavigation = isSimulatedState || Boolean(viteEnv?.DEV);
  const showDealerActions = isDealer || isAdmin;
  const dealerNavItems: HeaderNavItem[] = showDealerActions
    ? [
        { id: "chat", label: "คุยกับน้องเอ AI", icon: MessageSquare },
        { id: "sell", label: "ลงขายด่วน 🪄", icon: PlusCircle },
      ]
    : [];
  const sandboxNavItems: HeaderNavItem[] = showSandboxNavigation
    ? [
        { id: "car-vision", label: "วิเคราะห์รูปรถ 📸", icon: Camera, badge: "AI" },
        { id: "car-post-generator", label: "แต่งโพสต์ขายรถ 🪄", icon: Sparkles, badge: "ฮิต" },
        { id: "viral-captions", label: "เขียนแคปชั่น 👑", icon: Sparkle, badge: "ใหม่" },
        { id: "seo-landing", label: "SEO หน้าพิเศษ 🔎", icon: Globe, badge: "ใหม่" },
      ]
    : [];
  const navItems: HeaderNavItem[] = [
    { id: "home", label: "หน้าแรก", icon: Home },
    { id: "marketplace", label: "ตลาดรถยนต์", icon: Car },
    ...dealerNavItems,
    { id: "my-listings", label: "ประกาศของฉัน", icon: ClipboardList },
    { id: "search", label: "ค้นหาละเอียด 🔍", icon: Search, badge: "แนะนำ" },
    ...sandboxNavItems,
    { id: "dealers", label: "ดีลเลอร์และศูนย์บริการ", icon: Store },
    { id: "saved", label: "ที่บันทึกไว้", icon: Heart, count: favorites.length },
  ];

  const handleSearchChange = (value: string) => {
    setFilters({ search: value });
    if (currentView !== "search" && currentView !== "car-details") {
      setView("search");
    }
  };

  const clearSearch = () => {
    setFilters({ search: "" });
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isDarkMode 
          ? "bg-[#0d0d0d]/85 border-white/[0.08]" 
          : "bg-white/90 border-slate-200/50"
      } border-b backdrop-blur-xl`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0 py-1.5 sm:py-2">
          {/* Header ชั้น 1: โลโก้ + ค้นหา + actions */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 sm:gap-x-3 gap-y-1.5 items-center">
            <div 
              onClick={() => {
                setView("home");
                setIsMobileDrawerOpen(false);
              }} 
              className="col-start-1 row-start-1 flex items-center gap-2 cursor-pointer group flex-shrink-0 self-center min-w-0"
              id="header-branding-logo"
            >
              <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-600/20 group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-display font-black text-lg sm:text-xl lg:text-2xl tracking-tight flex items-center gap-1">
                  Nong <span className="text-orange-500">A</span>
                  <span className="hidden sm:inline-flex items-center text-[8px] font-mono font-extrabold px-1 py-0.5 ml-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-widest">
                    NongBot
                  </span>
                </span>
                <span className="hidden sm:block text-[8px] sm:text-[9px] text-slate-500 font-medium tracking-wide truncate">
                  Premium AI Auto Platform
                </span>
              </div>
            </div>

            {/* ค้นหา — แสดงทุกขนาดจอ; มือถือเต็มแถว, desktop อยู่กลางแถวโลโก้ */}
            <div className="col-span-3 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 flex items-center min-w-0 w-full lg:max-w-sm relative group">
              <span className="absolute left-3 sm:left-3.5 text-slate-500 group-focus-within:text-orange-500 transition-colors pointer-events-none">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ค้นหารุ่นรถยนต์ ยี่ห้อ หรือสเป็กไฟฟ้า... (⌘K)"
                aria-label="ค้นหารถในตลาด"
                className={`w-full min-w-[10rem] max-w-full text-[11px] sm:text-xs font-sans pl-9 sm:pl-10 pr-7 sm:pr-8 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all outline-none border ${
                  isDarkMode 
                    ? "bg-[#141416]/90 border-white/[0.08] text-slate-200 placeholder-slate-500 focus:border-orange-500/40 focus:bg-black/40" 
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-500/40 focus:bg-white"
                }`}
              />
              {filters.search ? (
                <button 
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 sm:right-2.5 p-1.5 sm:p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800/10 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
              ) : (
                <span className={`absolute right-2.5 sm:right-3 font-mono text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded hidden xs:inline ${
                  isDarkMode ? "bg-slate-900 border-white/5 text-slate-500" : "bg-slate-200/50 text-slate-400"
                } pointer-events-none`}>
                  ⌘K
                </span>
              )}
            </div>

            <div className="col-start-3 row-start-1 flex items-center gap-1.5 sm:gap-2 flex-shrink-0 justify-self-end self-center">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`p-2 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg sm:rounded-xl border transition-all duration-200 flex-shrink-0 ${
                  isDarkMode 
                    ? "border-white/[0.08] bg-[#121214]/60 text-slate-300 hover:text-white hover:bg-[#18181b]" 
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:text-orange-500 hover:bg-slate-100"
                }`}
                title="สลับโหมดหน้าจอสีขาว/ดำ"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Verified Badge or Login Trigger for Authenticated or Guest User */}
              {!isSignedIn ? (
                <button
                  onClick={() => setView("login")}
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 border border-orange-500/20 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-300 font-semibold rounded-xl text-xs sm:text-[13px] shadow-sm select-none cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบ AI 🪄</span>
                </button>
              ) : (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`hidden sm:flex items-center gap-2.5 pl-3 border-l cursor-pointer select-none active:scale-95 transition-all outline-none ${
                      isDarkMode ? "border-white/[0.08]" : "border-slate-200"
                    }`}
                  >
                    <img
                      src={user?.photoURL}
                      alt="Avatar"
                      className="w-8 h-8 rounded-xl border border-orange-500/20 p-0.5 bg-slate-900/60 animate-fade-in"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-[12px] font-semibold leading-none text-slate-700 dark:text-slate-100 max-w-[110px] truncate">
                        {user?.displayName}
                      </span>
                      <span className={`text-[9px] font-bold flex items-center gap-0.5 ${membershipDisplay?.textColor || "text-orange-500"}`}>
                        <span>{membershipDisplay?.icon || "🚗"}</span> <span>{membershipDisplay?.name?.split(" ")[0]}</span>
                      </span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsProfileOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className={`absolute right-0 mt-3 w-56 rounded-xl border p-4.5 z-20 space-y-4 shadow-2xl text-left ${
                            isDarkMode 
                              ? "bg-[#0d0d0e] border-white/[0.08] text-slate-100" 
                              : "bg-white border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="space-y-1 pb-3 border-b border-orange-500/10">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">ข้อมูลบัญชีผู้ใช้</p>
                            <p className="text-sm font-black truncate">{user?.displayName}</p>
                            <p className="text-[10.5px] font-mono text-slate-400 truncate">{user?.email}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="p-2 py-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10 text-[10px] leading-relaxed flex items-center gap-1.5 text-orange-400">
                              <Sparkle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                              <span>{isSimulatedState ? "โหมดระบบข้อมูลจำลอง Sandbox" : "โหมดบัญชีผู้ใช้จริงบนคลาวด์"}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs py-1 border-t border-orange-500/10 pt-3">
                            <button
                              onClick={() => {
                                setView("profile");
                                setIsProfileOpen(false);
                              }}
                              className="w-full text-left p-2 hover:bg-white/5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-slate-300 hover:text-white"
                            >
                              <UserCheck className="w-4 h-4 text-orange-500" />
                              <span>การตั้งค่าโปรไฟล์และบทบาท</span>
                            </button>

                            {showSandboxNavigation ? (
                              <>
                                <button
                                  onClick={() => {
                                    setView("billing");
                                    setIsProfileOpen(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-white/5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-400 hover:text-white"
                                >
                                  <Crown className="w-4 h-4 text-orange-400 animate-pulse" />
                                  <span>การเงินและแพ็กเกจสมาชิก 👑</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setView("boost");
                                    setIsProfileOpen(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-white/5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-400 hover:text-white"
                                >
                                  <Rocket className="w-4 h-4 text-orange-500 animate-bounce" />
                                  <span>บูสต์จัดอันดับโพสต์ 🚀</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setView("onboarding");
                                    setIsProfileOpen(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-white/5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-slate-300 hover:text-white"
                                >
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  <span>ไปทัวร์ Onboarding</span>
                                </button>
                              </>
                            ) : (
                              <div className="p-2 rounded-lg border border-amber-500/15 bg-amber-500/5 text-[10.5px] text-amber-200 leading-relaxed">
                                แพ็กเกจ, บูสต์ และทัวร์ระบบจะเปิดในรอบ Public Beta ถัดไป
                              </div>
                            )}

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => {
                                    setView("admin-dashboard");
                                    setIsProfileOpen(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-orange-500/15 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-400 hover:text-orange-300 border border-orange-500/10 bg-orange-500/5"
                                >
                                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                                  <span>แผงควบคุมระบบ (Admin Control) 👑</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setView("inventory-import");
                                    setIsProfileOpen(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-white/5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-slate-300 hover:text-white"
                                >
                                  <FileText className="w-4 h-4 text-teal-400" />
                                  <span>นำเข้าคลังรถ (CSV/Excel)</span>
                                </button>
                              </>
                            )}

                            {(isDealer || isAdmin) && (
                              <>
                                <button
                                  onClick={() => {
                                    if (typeof window !== "undefined") {
                                      window.history.replaceState(null, "", "/dealer");
                                    }
                                    setView("dealer-portal");
                                    setIsProfileOpen(false);
                                  }}
                                  className="w-full text-left p-2 hover:bg-orange-500/10 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-300 hover:text-white border border-orange-500/20"
                                >
                                  <Store className="w-4 h-4 text-orange-400" />
                                  <span>Dealer Portal (คลังรถ)</span>
                                </button>
                                {showSandboxNavigation && (
                                  <button
                                    onClick={() => {
                                      setView("dealer-dashboard");
                                      setIsProfileOpen(false);
                                    }}
                                    className="w-full text-left p-2 hover:bg-white/5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-slate-300 hover:text-white"
                                  >
                                    <Store className="w-4 h-4 text-teal-400" />
                                    <span>โชว์รูมฝ่ายขายดีลเลอร์</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              logout();
                              setIsProfileOpen(false);
                              setView("home");
                            }}
                            className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition rounded-lg text-xs font-bold flex items-center justify-center gap-2 focus:outline-none cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>ออกจากระบบเสร็จสรรพ</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Mobile Burger Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                className={`md:hidden p-2.5 rounded-xl border transition-all min-h-[40px] min-w-[40px] flex items-center justify-center ${
                  isDarkMode 
                    ? "border-white/[0.08] bg-[#141416] text-slate-300 hover:text-white" 
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:text-orange-500 focus:bg-slate-100"
                }`}
                aria-label={isMobileDrawerOpen ? "ปิดเมนูเพิ่มเติม" : "เปิดเมนูเพิ่มเติม"}
              >
                {isMobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Header ชั้น 2: เมนูหลัก (รวมใน Header เดียว) */}
          <div
            className={`relative mt-1 pt-1 border-t ${
              isDarkMode ? "border-white/[0.06]" : "border-slate-200/40"
            }`}
          >
            <p className="sr-only">
              เมนูหลัก — เลื่อนซ้ายขวาหรือใช้ลูกศรเมื่อโฟกัสที่แถบเมนู
            </p>
            <div
              className={`pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 sm:w-12 bg-gradient-to-l to-transparent ${
                isDarkMode ? "from-[#0d0d0d]/95" : "from-white/95"
              }`}
              aria-hidden
            />
            <div
              className={`pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-4 bg-gradient-to-r to-transparent sm:hidden ${
                isDarkMode ? "from-[#0d0d0d]/90" : "from-white/90"
              }`}
              aria-hidden
            />
            <nav
              ref={navScrollRef}
              role="navigation"
              aria-label="เมนูหลัก"
              tabIndex={0}
              className="header-nav-scroll flex w-full min-w-0 flex-nowrap items-center gap-1 sm:gap-1.5 py-1 px-0.5 min-h-[36px] sm:min-h-[40px] overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:ring-offset-0"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setView(item.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`relative shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 lg:px-3 py-1.5 min-h-[36px] sm:min-h-[40px] rounded-lg sm:rounded-xl font-sans text-[11px] sm:text-xs lg:text-[13px] font-semibold transition-all duration-200 select-none whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-md shadow-orange-600/15"
                        : isDarkMode
                        ? "text-slate-300 hover:bg-slate-900/60 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-orange-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {"count" in item && item.count > 0 && (
                      <span className="flex-shrink-0 ml-0.5 sm:ml-1 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center leading-none">
                        {item.count}
                      </span>
                    )}
                    {"badge" in item && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[8px] font-mono tracking-wider font-black px-1.5 py-0.5 rounded-full uppercase leading-none scale-90 whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Slide-in Overlay Menu System */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop blur effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black z-45 backdrop-blur-sm lg:hidden"
            />

            {/* Centered / Slide-out Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`fixed top-0 right-0 h-full w-full max-w-xs z-50 shadow-2xl p-6 flex flex-col justify-between lg:hidden ${
                isDarkMode 
                  ? "bg-[#0c0c0e] text-slate-100 border-l border-white/5" 
                  : "bg-white text-slate-800 border-l border-slate-100"
              }`}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-orange-600/20">
                      A
                    </div>
                    <span className="font-display font-black text-slate-900 dark:text-white text-[15px]">
                      Nong <span className="text-orange-500">A</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`p-1.5 rounded-xl border ${
                      isDarkMode ? "border-white/5 bg-white/5" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Search Inside Drawer */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="พิมพ์ชื่อแบรนด์หรือรุ่นรถ..."
                    className={`w-full text-xs font-sans pl-10 pr-4 py-2.5 rounded-xl transition-all outline-none border ${
                      isDarkMode 
                        ? "bg-[#141416] border-white/10 text-slate-200 placeholder-slate-500 focus:border-orange-500" 
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-orange-500"
                    }`}
                  />
                </div>

                {/* Drawer links */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider block px-2">Navigation</span>
                  
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setView(item.id);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all ${
                          isActive
                            ? "bg-orange-600 text-white shadow-md shadow-orange-600/10"
                            : isDarkMode
                            ? "text-slate-300 hover:bg-white/5"
                            : "text-slate-600 hover:bg-slate-50 hover:text-orange-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span className="text-[14px] font-semibold">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {"count" in item && item.count > 0 && (
                            <span className="bg-red-500 text-white text-[9.5px] px-1.5 py-0.2 rounded-full font-extrabold font-mono">
                              {item.count}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Drawer Profile Area */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                {!isSignedIn ? (
                  <button
                    onClick={() => {
                      setView("login");
                      setIsMobileDrawerOpen(false);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/10 active:scale-95 transition-transform"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>เข้าสู่ระบบ AI 🪄</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/40">
                      <img
                        src={user?.photoURL}
                        alt="User avatar"
                        className="w-10 h-10 rounded-xl"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{user?.displayName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                        <p className="text-[9.5px] text-orange-500 font-semibold flex items-center gap-0.5">
                          <UserCheck className="w-2.5 h-2.5 text-orange-500" /> สมาชิกตัวจริง
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileDrawerOpen(false);
                        setView("home");
                      }}
                      className="w-full py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                )}

                <div className="text-[9px] text-slate-500 text-left leading-relaxed">
                  <p>✨ มิติใหม่แห่งการประมวลสเป็กและต่อรองรถยนต์ระดับพรีเมียมด้วยระบบน้องเอ AI Sales Assistant โดยกลุ่ม NongBot</p>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
