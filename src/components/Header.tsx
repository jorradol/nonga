import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";
import { useAuth } from "../hooks/auth/useAuth";
import { useRole } from "../hooks/auth/useRole";
import {
  MessageSquare, Car, Sparkles, Heart, Store, ClipboardList,
  Sun, Moon, PlusCircle, Search, X, User,
  Home, Key, Sparkle, Camera
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ProfileAvatar from "./profile/ProfileAvatar";
import AccountProfileMenu from "./profile/AccountProfileMenu";
import { resolveVisibleFavoriteCount } from "../utils/resolveVisibleFavorites";

export default function Header() {
  const { 
    currentView, 
    setView, 
    isDarkMode, 
    toggleDarkMode, 
    favorites,
    cars,
    user, 
    filters, 
    setFilters 
  } = useAppStore();

  const { logout, isSignedIn, isSimulatedState } = useAuth();
  const { isDealer, isAdmin, membershipDisplay } = useRole();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navScrollRef = useRef<HTMLElement>(null);
  const mobileNavScrollRef = useRef<HTMLElement>(null);
  const hasRealProfilePhoto = Boolean(user?.photoURL?.trim());

  // Global shortcut 'Slash' or 'Ctrl/Command + K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus on status or search triggers
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const desktop = document.querySelector<HTMLInputElement>(
          '[data-testid="header-search-desktop"] input'
        );
        const mobile = document.querySelector<HTMLInputElement>(
          '[data-testid="header-mobile-stack"] input'
        );
        const preferDesktop =
          typeof window !== "undefined" &&
          window.matchMedia("(min-width: 768px)").matches;
        const target =
          (preferDesktop ? desktop : mobile) ?? searchInputRef.current;
        target?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Account menu: Escape closes; route/view change closes
  useEffect(() => {
    if (!isProfileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isProfileOpen]);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [currentView]);

  useEffect(() => {
    const attachArrowScroll = (el: HTMLElement | null) => {
      if (!el) return () => {};
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
    };
    const detachDesktop = attachArrowScroll(navScrollRef.current);
    const detachMobile = attachArrowScroll(mobileNavScrollRef.current);
    return () => {
      detachDesktop();
      detachMobile();
    };
  }, []);

  useEffect(() => {
    const scrollActiveIntoView = (root: HTMLElement | null) => {
      if (!root || root.scrollWidth <= root.clientWidth) return;
      root
        .querySelector<HTMLElement>(`[data-header-nav="${currentView}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    };
    scrollActiveIntoView(navScrollRef.current);
    scrollActiveIntoView(mobileNavScrollRef.current);
  }, [currentView]);

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
        { id: "sell", label: "ลงขายด่วน 🪄", icon: PlusCircle },
      ]
    : [];
  // P8A: SEO mock dashboard is not public-ready — omit from all Header nav surfaces.
  const sandboxNavItems: HeaderNavItem[] = showSandboxNavigation
    ? [
        { id: "car-vision", label: "วิเคราะห์รูปรถ 📸", icon: Camera, badge: "AI" },
        { id: "car-post-generator", label: "แต่งโพสต์ขายรถ 🪄", icon: Sparkles, badge: "ฮิต" },
        { id: "viral-captions", label: "เขียนแคปชั่น 👑", icon: Sparkle, badge: "ใหม่" },
      ]
    : [];
  const navItems: HeaderNavItem[] = [
    { id: "home", label: "หน้าแรก", icon: Home },
    { id: "marketplace", label: "ตลาดรถยนต์", icon: Car },
    { id: "chat", label: "คุยกับน้องเอ", icon: MessageSquare },
    ...dealerNavItems,
    { id: "my-listings", label: "ประกาศของฉัน", icon: ClipboardList },
    { id: "search", label: "ค้นหาละเอียด 🔍", icon: Search, badge: "แนะนำ" },
    ...sandboxNavItems,
    { id: "dealers", label: "ดีลเลอร์และศูนย์บริการ", icon: Store },
    { id: "saved", label: "ที่บันทึกไว้", icon: Heart, count: resolveVisibleFavoriteCount(favorites, cars) },
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

  const renderInlineNavItems = () =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = currentView === item.id;
      return (
        <button
          key={item.id}
          type="button"
          data-header-nav={item.id}
          aria-current={isActive ? "page" : undefined}
          onClick={() => {
            setView(item.id);
          }}
          className={`relative shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 lg:px-3 py-1.5 min-h-[36px] sm:min-h-[40px] rounded-lg sm:rounded-xl font-sans text-[11px] sm:text-xs lg:text-[13px] font-semibold transition-all duration-200 select-none whitespace-nowrap ${
            isActive
              ? "nonga-action shadow-md shadow-orange-600/15"
              : "nonga-nav-idle"
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
    });

  // Expand desktop search from filters.search only — no duplicate query SoT
  const desktopSearchHasQuery = Boolean(filters.search);

  const searchField = (opts: {
    ref?: typeof searchInputRef;
    showShortcutHint?: boolean;
    /** Desktop collapsed: truncate long placeholder with ellipsis */
    truncatePlaceholder?: boolean;
  }) => (
    <div className="relative group flex items-center min-w-0 w-full">
      <span className="absolute left-3 sm:left-3.5 nonga-text-muted group-focus-within:text-orange-500 transition-colors pointer-events-none">
        <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </span>
      <input
        ref={opts.ref}
        type="search"
        value={filters.search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="ค้นหารุ่นรถยนต์ ยี่ห้อ หรือสเป็กไฟฟ้า... (⌘K)"
        aria-label="ค้นหารถในตลาด"
        className={`w-full min-w-0 max-w-full text-[11px] sm:text-xs font-sans pl-9 sm:pl-10 pr-7 sm:pr-8 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-[border-color,box-shadow,color] outline-none border nonga-bg-subtle nonga-border nonga-text-primary nonga-placeholder focus:border-orange-500/40 nonga-focus-ring${
          opts.truncatePlaceholder ? " truncate" : ""
        }`}
      />
      {filters.search ? (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-2 sm:right-2.5 p-1.5 sm:p-1 rounded-md nonga-text-muted nonga-menu-item min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="ล้างคำค้นหา"
        >
          <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
        </button>
      ) : opts.showShortcutHint ? (
        <span className="absolute right-2.5 sm:right-3 font-mono text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded hidden group-focus-within:inline nonga-bg-subtle nonga-text-muted border nonga-border pointer-events-none">
          ⌘K
        </span>
      ) : null}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 transition-all duration-300 nonga-header-bar border-b backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0 py-1.5 sm:py-2">
          {/* Desktop single row: Logo → Nav → Search → Theme/Account; mobile keeps logo+actions then stacked search/nav */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
            <div
              onClick={() => {
                setView("home");
              }}
              className="flex items-center gap-2 cursor-pointer group shrink-0 min-w-0"
              id="header-branding-logo"
            >
              <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-600/20 group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>

              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-display font-black text-lg sm:text-xl lg:text-2xl tracking-tight flex items-center gap-1 nonga-text-primary">
                  Nong <span className="text-orange-500">A</span>
                  <span className="hidden sm:inline-flex items-center text-[8px] font-mono font-extrabold px-1 py-0.5 ml-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-widest">
                    NongBot
                  </span>
                </span>
                <span className="hidden sm:block text-[8px] sm:text-[9px] nonga-text-muted font-medium tracking-wide truncate">
                  Premium AI Auto Platform
                </span>
              </div>
            </div>

            {/* Desktop nav — flex-1 + min-w-0 so overflow scrolls here, not the page */}
            <div className="relative hidden md:block flex-1 min-w-0">
              <p className="sr-only">
                เมนูหลัก — เลื่อนซ้ายขวาหรือใช้ลูกศรเมื่อโฟกัสที่แถบเมนู
              </p>
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 lg:w-12 bg-gradient-to-l from-[var(--nonga-bg-surface)] to-transparent"
                aria-hidden
              />
              <nav
                ref={navScrollRef}
                role="navigation"
                aria-label="เมนูหลัก"
                tabIndex={0}
                data-testid="header-nav-desktop"
                className="header-nav-scroll flex w-full min-w-0 flex-nowrap items-center gap-1 sm:gap-1.5 py-1 px-0.5 min-h-[36px] sm:min-h-[40px] overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:ring-offset-0"
              >
                {renderInlineNavItems()}
              </nav>
            </div>

            {/* Desktop search — ~150px idle; ~290px on focus-within or when filters.search has value */}
            <div
              data-testid="header-search-desktop"
              data-search-expanded={desktopSearchHasQuery ? "true" : "false"}
              className={`hidden md:block shrink-0 min-w-0 transition-[width] duration-200 ease-out motion-reduce:transition-none ${
                desktopSearchHasQuery
                  ? "w-[min(290px,36vw)] max-w-[290px]"
                  : "w-[min(150px,28vw)] max-w-[150px] focus-within:w-[min(290px,36vw)] focus-within:max-w-[290px]"
              }`}
            >
              {searchField({
                ref: searchInputRef,
                showShortcutHint: true,
                truncatePlaceholder: true,
              })}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto md:ml-0">
              {/* Theme Toggle Button — icon/label = next action when pressed */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-2 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg sm:rounded-xl border nonga-border nonga-bg-subtle nonga-text-secondary hover:text-orange-500 nonga-menu-item transition-all duration-200 shrink-0 nonga-focus-ring"
                title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
                aria-label={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
                data-testid="header-theme-toggle"
              >
                {isDarkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              </button>

              {/* Verified Badge or Login Trigger for Authenticated or Guest User */}
              {!isSignedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 nonga-action nonga-focus-ring transition-all duration-300 font-semibold rounded-xl text-xs sm:text-[13px] shadow-sm select-none cursor-pointer shrink-0"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>เข้าสู่ระบบ AI 🪄</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="md:hidden p-2 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg sm:rounded-xl border nonga-border nonga-bg-subtle nonga-text-secondary hover:text-orange-500 nonga-menu-item transition-all duration-200 shrink-0 nonga-focus-ring"
                    aria-label="เข้าสู่ระบบ"
                    data-testid="header-account-guest-login"
                    data-account-variant="icon"
                  >
                    <User className="w-4 h-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <div className="relative shrink-0">
                  {/* Wide desktop: Account pill (Owner PASS baseline) */}
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((open) => !open)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    aria-label={isProfileOpen ? "ปิดเมนูบัญชี" : "เปิดเมนูบัญชี"}
                    data-testid="header-account-control"
                    data-account-variant="pill"
                    className="header-account-pill hidden md:flex items-center gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-[40px] max-w-[min(180px,28vw)] rounded-lg sm:rounded-xl border nonga-border nonga-bg-subtle nonga-text-secondary hover:text-orange-500 nonga-menu-item transition-all duration-200 shrink-0 cursor-pointer select-none active:scale-[0.98] outline-none nonga-focus-ring"
                  >
                    <ProfileAvatar
                      user={user}
                      alt="Avatar"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border border-orange-500/20 p-0.5 nonga-bg-elevated animate-fade-in object-contain shrink-0"
                    />
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[12px] font-semibold leading-none nonga-text-primary truncate">
                        {user?.displayName}
                      </span>
                      <span
                        className={`text-[9px] font-bold flex items-center gap-0.5 truncate header-account-role ${
                          isDarkMode
                            ? membershipDisplay?.textColor || "text-orange-400"
                            : "nonga-text-secondary"
                        }`}
                      >
                        <span>{membershipDisplay?.icon || "🚗"}</span>{" "}
                        <span>{membershipDisplay?.name?.split(" ")[0]}</span>
                      </span>
                    </div>
                  </button>

                  {/* Narrow / tablet / mobile: Account icon (not hamburger / not nav drawer) */}
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((open) => !open)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    aria-label={isProfileOpen ? "ปิดเมนูบัญชี" : "เปิดเมนูบัญชี"}
                    data-testid="header-account-control"
                    data-account-variant="icon"
                    data-header-account-icon="true"
                    className="md:hidden p-2 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg sm:rounded-xl border nonga-border nonga-bg-subtle nonga-text-secondary hover:text-orange-500 nonga-menu-item transition-all duration-200 shrink-0 cursor-pointer select-none active:scale-[0.98] outline-none nonga-focus-ring"
                  >
                    {hasRealProfilePhoto ? (
                      <ProfileAvatar
                        user={user}
                        alt=""
                        className="w-7 h-7 rounded-lg border border-orange-500/20 p-0.5 nonga-bg-elevated object-contain shrink-0"
                      />
                    ) : (
                      <User className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <AccountProfileMenu
                        user={user}
                        isSimulatedState={isSimulatedState}
                        showSandboxNavigation={showSandboxNavigation}
                        isAdmin={isAdmin}
                        isDealer={isDealer}
                        onNavigate={(view) => setView(view)}
                        onLogout={() => {
                          logout();
                          setView("home");
                        }}
                        onClose={() => setIsProfileOpen(false)}
                        data-testid="header-account-menu"
                        className="absolute right-0 mt-3 w-56 max-w-[min(14rem,calc(100vw-1.5rem))] origin-top-right"
                      />
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: keep search + horizontal nav (account opens canonical menu, not nav drawer) */}
          <div className="md:hidden mt-1.5 space-y-1 min-w-0" data-testid="header-mobile-stack">
            {searchField({ showShortcutHint: false })}
            <div className="relative min-w-0">
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-[var(--nonga-bg-surface)] to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-4 bg-gradient-to-r from-[var(--nonga-bg-surface)] to-transparent"
                aria-hidden
              />
              <nav
                ref={mobileNavScrollRef}
                role="navigation"
                aria-label="เมนูหลัก"
                tabIndex={0}
                data-testid="header-nav-mobile"
                className="header-nav-scroll flex w-full min-w-0 flex-nowrap items-center gap-1 py-1 px-0.5 min-h-[36px] overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:ring-offset-0"
              >
                {renderInlineNavItems()}
              </nav>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
