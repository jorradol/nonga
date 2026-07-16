import { useEffect, useLayoutEffect } from "react";
import { useAppStore } from "./store";
import { getListingPrimaryImage } from "./utils/listingImages";
import { useRole } from "./hooks/auth/useRole";
import {
  navigateDealerSignupEntry,
  navigateDealerSystemEntry,
} from "./utils/dealerEntryNavigation";
import { motion, AnimatePresence } from "motion/react";

import Header from "./components/Header";
import AppNotifyHost from "./components/notify/AppNotifyHost";
import MarketplaceView from "./components/MarketplaceView";
import MyListingsView from "./components/MyListingsView";
import AIChatView from "./components/AIChatView";
import SellCarView from "./components/SellCarView";
import DetailView from "./components/DetailView";
import DealersView from "./components/DealersView";
import { ShowroomProfileView } from "./components/showroom/ShowroomProfileView";
import HomeView from "./components/HomeView";
import LoginView from "./components/auth/LoginView";
import RegisterView from "./components/auth/RegisterView";
import ForgotPasswordView from "./components/auth/ForgotPasswordView";
import {
  RequireAdmin,
  RequireDealer,
  RequireMember,
} from "./components/auth/RouteGuard";
import UserProfileView from "./components/UserProfileView";
import BillingDashboard from "./components/billing/BillingDashboard";
import OnboardingView from "./components/OnboardingView";
import DealerDashboardView from "./components/DealerDashboardView";
import AdminDashboardView from "./components/admin/AdminDashboardView";
import InventoryImportView from "./components/admin/inventory-import/InventoryImportView";
import DealerDraftInventoryView from "./components/admin/DealerDraftInventoryView";
import AdminListingReportsView from "./components/admin/AdminListingReportsView";
import AdminPendingListingsView from "./components/admin/AdminPendingListingsView";
import AdminPilotUsersView from "./components/admin/AdminPilotUsersView";
import AdminShadowSmokeDebugView from "./components/admin/AdminShadowSmokeDebugView";
import DealerPortalView from "./components/dealer-portal/DealerPortalView";
import { dealerTabFromPath } from "./components/dealer-portal/DealerPortalLayout";
import SearchPageView from "./components/search/SearchPageView";
import PilotPolicyPageView from "./components/policy/PilotPolicyPageView";
import { navigatePilotPolicy } from "./utils/pilotPolicyNavigation";
import { CarVisionDashboard } from "./components/ai/analysis/CarVisionDashboard";
import { PostGeneratorDashboard } from "./components/ai/post-generator/PostGeneratorDashboard";
import { CaptionEngineDashboard } from "./components/captions/CaptionEngineDashboard";
import { SeoLandingDashboard } from "./components/seo/SeoLandingDashboard";
import { BoostDashboard } from "./components/boost/BoostDashboard";
import {
  isChatEntryPath,
  resolveViewFromPathname,
} from "./utils/appRouteSync";
import { 
  Container, 
  Section, 
  GradientBackground, 
  AnimatedCard 
} from "./components/LayoutSystem";
import { resolveVisibleFavoriteCars } from "./utils/resolveVisibleFavorites";

import { 
  Sparkles, Heart, RefreshCw, Star, Info, 
  Facebook, Linkedin, Send, MessageSquare, Car, 
  LineChart, CheckCircle, ShieldAlert, Store
} from "lucide-react";

export default function App() {
  const { 
    currentView,
    setView,
    enforcePathnameView,
    fetchCars, 
    cars, 
    favorites, 
    toggleFavorite, 
    createChatSession, 
    sendChatMessage,
    user,
  } = useAppStore();

  const { isAdmin, isDealer, role } = useRole();
  const comingSoonLinkClass =
    "text-left nonga-text-muted cursor-not-allowed opacity-75";

  // Load cars directory from fullstack server immediately on startup
  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  // Pathname is the source of truth (before paint + on back/forward).
  useLayoutEffect(() => {
    enforcePathnameView();
  }, [enforcePathnameView]);

  useEffect(() => {
    const onPopState = () => enforcePathnameView();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enforcePathnameView]);

  // Pin only chat entry (/, /chat) and /home when URL was not updated by setView.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const pathLower = path.toLowerCase();
    if (!isChatEntryPath(path) && pathLower !== "/home") return;
    const viewForPath = resolveViewFromPathname(path);
    if (currentView !== viewForPath) {
      enforcePathnameView();
    }
  }, [currentView, enforcePathnameView]);

  // Client-side visual for Saved Favorites panel
  const renderSavedFavorites = () => {
    const savedCars = resolveVisibleFavoriteCars(favorites, cars);
    
    return (
      <Section
        badge="FAVORITE CARS"
        title={
          <span className="flex items-center gap-2">
            <span>รถที่คุณติดดาวไว้</span>
            <span className="text-red-500 flex items-center gap-1.5">
              <Heart className="w-6 h-6 fill-current animate-pulse" />
            </span>
          </span>
        }
        description="เปรียบเทียบสภาพแบตเตอรี่ ตารางผ่อน ตรวจประวัติเบื้องต้น หรือคลิกส่งด่วนไปหาน้องเอ AI เพื่อปรึกษาได้ทุกคันครับ!"
      >
        {savedCars.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border nonga-border nonga-bg-subtle space-y-5 max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-lg">
              <Heart className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-display font-black text-lg nonga-text-primary">ยังไม่ได้บันทึกรถคันใดไว้</h4>
              <p className="nonga-text-muted text-xs sm:text-sm">
                ลองกดดูในหน้ารายการตลาดซื้อขายรถ แล้วคลิกสัญลักษณ์หัวใจคันที่คุณชื่นชอบเพื่อวิเคราะห์เจาะลึกที่นี่ได้เลยครับ!
              </p>
            </div>
            <button 
              onClick={() => setView("marketplace")}
              className="px-6 py-2.5 nonga-action nonga-focus-ring font-semibold rounded-xl text-xs transition shadow-lg shadow-orange-600/15"
            >
              ดูสเป็ครถยนต์ยอดฮิต
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedCars.map((car) => (
              <AnimatedCard 
                key={car.id}
                className="flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video relative nonga-bg-elevated overflow-hidden">
                    <img 
                      key={`${car.id}-cover`}
                      src={getListingPrimaryImage(car)} 
                      alt={car.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/75 text-orange-400 border border-orange-500/30">
                        {car.brand}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleFavorite(car.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-red-500 text-white shadow hover:scale-110 active:scale-95 transition-all"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-3 text-left">
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-[10px] nonga-text-muted font-mono">
                        <span>ปี {car.year}</span>
                        <span>ไมล์ {car.mileage.toLocaleString()} กม.</span>
                      </div>
                      <h4 
                        onClick={() => setView("car-details", car.id)}
                        className="font-display font-extrabold text-[15px] sm:text-[16px] hover:text-orange-500 cursor-pointer line-clamp-1 transition-colors"
                      >
                        {car.title}
                      </h4>
                    </div>

                    <div className="flex justify-between items-baseline py-2.5 border-t border-orange-500/5">
                      <span className="text-[10px] nonga-text-muted">ราคาแนะนำ</span>
                      <span className="font-mono font-black text-orange-500 text-base">฿{car.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 border-t border-orange-500/5 nonga-bg-subtle">
                  <button
                    onClick={() => setView("car-details", car.id)}
                    className="px-3 py-2 border nonga-border rounded-xl text-xs font-semibold nonga-text-primary hover:bg-orange-600/5 hover:text-orange-500 transition-all text-center nonga-focus-ring"
                  >
                    ดูพรีวิวสเป็ค 🔍
                  </button>
                  <button
                    onClick={() => {
                      const sessionTitle = `ปรึกษาด่วน ${car.brand} 🤖`;
                      createChatSession(sessionTitle);
                      setView("chat");
                      sendChatMessage(`วิเคราะห์เจาะลึกรถเกรดบ้าน ${car.brand} ${car.model} ปี ${car.year} ราคา ฿${car.price.toLocaleString()} ให้ทีว่าน่าซื้อผ่อนในระยะยาวมั้ยครับน้องเอ ปังปุริเย่!`);
                    }}
                    className="px-3 py-2 nonga-action nonga-focus-ring rounded-xl text-xs font-bold transition-all text-center"
                  >
                    ถามน้องเอ AI 🪄
                  </button>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
      </Section>
    );
  };

  // Dispatcher mapping views with dynamic loading
  const renderActiveView = () => {
    switch (currentView) {
      case "home":
        return <HomeView />;
      case "marketplace":
        return <MarketplaceView />;
      case "my-listings":
        return (
          <RequireMember>
            <MyListingsView />
          </RequireMember>
        );
      case "chat":
        return <AIChatView />;
      case "sell":
        return (
          <RequireDealer>
            <SellCarView />
          </RequireDealer>
        );
      case "dealers":
        return <DealersView />;
      case "dealer-showroom":
        return <ShowroomProfileView />;
      case "saved":
        return renderSavedFavorites();
      case "car-details":
        return <DetailView />;
      case "profile":
        return (
          <RequireMember>
            <UserProfileView />
          </RequireMember>
        );
      case "billing":
        return <BillingDashboard />;
      case "onboarding":
        return <OnboardingView />;
      case "dealer-dashboard":
        return (
          <RequireDealer>
            <DealerDashboardView />
          </RequireDealer>
        );
      case "admin-dashboard":
        return (
          <RequireAdmin>
            <AdminDashboardView />
          </RequireAdmin>
        );
      case "inventory-import":
        return (
          <RequireAdmin>
            <InventoryImportView />
          </RequireAdmin>
        );
      case "dealer-draft-inventory":
        return (
          <RequireAdmin>
            <DealerDraftInventoryView />
          </RequireAdmin>
        );
      case "admin-reports":
        return (
          <RequireAdmin>
            <AdminListingReportsView />
          </RequireAdmin>
        );
      case "admin-pending-listings":
        return (
          <RequireAdmin>
            <AdminPendingListingsView />
          </RequireAdmin>
        );
      case "admin-pilot-users":
        return (
          <RequireAdmin>
            <AdminPilotUsersView />
          </RequireAdmin>
        );
      case "admin-shadow-smoke":
        return (
          <RequireAdmin>
            <AdminShadowSmokeDebugView />
          </RequireAdmin>
        );
      case "dealer-portal":
        return (
          <RequireDealer>
            <DealerPortalView />
          </RequireDealer>
        );
      case "search":
        return <SearchPageView />;
      case "car-vision":
        return <CarVisionDashboard />;
      case "car-post-generator":
        return <PostGeneratorDashboard />;
      case "viral-captions":
        return <CaptionEngineDashboard />;
      case "seo-landing":
        return <SeoLandingDashboard />;
      case "boost":
        return <BoostDashboard />;
      case "login":
        return <LoginView />;
      case "register":
        return <RegisterView />;
      case "forgot-password":
        return <ForgotPasswordView />;
      case "pilot-policy":
        return <PilotPolicyPageView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className={`${currentView === "chat" ? "h-[100dvh] overflow-hidden" : "min-h-screen"} flex flex-col justify-between transition-colors duration-300 nonga-bg-app nonga-text-primary selection:bg-orange-500/30 font-sans`}>
      
      {/* Atmosphere glow backdrop lines */}
      <GradientBackground />

      <div className={`w-full flex-1 flex flex-col h-full ${currentView === "chat" ? "min-h-0 overflow-hidden" : ""}`}>
        {/* Navigation bar - hidden in chat mode */}
        {currentView !== "chat" && <Header />}

        {/* Major Screen Content Port */}
        {currentView === "chat" ? (
          <div className="flex-1 flex flex-col w-full h-full relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden"
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <Container className="pt-6 sm:pt-10 pb-16 relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          </Container>
        )}
      </div>

      {/* Premium Multi-column Layout Footer with AI Disclaimers & Brand links */}
      {currentView !== "chat" && (
        <footer className="relative z-10 border-t nonga-border nonga-bg-surface nonga-text-secondary transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-orange-500/5">
            
            {/* Branding Column */}
            <div className="col-span-1 md:col-span-1.5 space-y-4 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-600/25">
                  A
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-slate-900 dark:text-white text-base leading-none tracking-tight">
                    Nong <span className="text-orange-500">A</span>
                  </span>
                  <span className="text-[9px] nonga-text-muted font-semibold uppercase tracking-wider">
                    by NongBot Group
                  </span>
                </div>
              </div>

              <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                สุดยอดตลาดกลางซื้อขายรถยนต์ระดับนวัตกรรมที่ออกแบบมาเพื่อสตรีมมิ่งข้อมูลสเป็ก ตรวจวัดราคา และต่อรองอัจฉริยะเคียงข้าง AI เพื่อนแท้ผู้ช่วยดีลเลอร์และลูกค้ายุคใหม่
              </p>

              {/* Social Channels Icons Row */}
              <div className="flex items-center gap-3 pt-1">
                <a href="https://www.nongbot.org/nonga" target="_blank" rel="noreferrer" title="Facebook - NongBot" className="p-2 rounded-lg bg-orange-500/5 nonga-text-muted hover:text-orange-500 hover:bg-orange-500/10 transition">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="https://www.nongbot.org/nonga" target="_blank" rel="noreferrer" title="Linkedin - NongBot Corporate" className="p-2 rounded-lg bg-orange-500/5 nonga-text-muted hover:text-orange-500 hover:bg-orange-500/10 transition">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="https://www.nongbot.org/nonga" target="_blank" rel="noreferrer" title="Line Official Account" className="p-2 rounded-lg bg-orange-500/5 nonga-text-muted hover:text-orange-500 hover:bg-orange-500/10 transition">
                  <MessageSquare className="w-4 h-4" />
                </a>
                <a href="https://www.nongbot.org/nonga" target="_blank" rel="noreferrer" title="Auto Advisory Chatbot" className="p-2 rounded-lg bg-orange-500/5 nonga-text-muted hover:text-orange-500 hover:bg-orange-500/10 transition">
                  <Sparkles className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="text-left space-y-3.5">
              <h5 className="text-[11.5px] font-mono font-bold nonga-text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-orange-500" /> ตลาดอัจฉริยะ
              </h5>
              <div className="flex flex-col gap-2.5 text-xs">
                <button onClick={() => setView("marketplace")} className="hover:text-orange-500 text-left transition-colors">ค้นหาและพรีวิวสเป็ครถ</button>
                <button onClick={() => setView("chat")} className="hover:text-orange-500 text-left transition-colors">สรุปตารางตกลงราคากับ AI</button>
                <button onClick={() => setView("sell")} className="hover:text-orange-500 text-left transition-colors font-medium">ลงทะเบียนขายหน้ารถด่วน 🪄</button>
                <button onClick={() => setView("dealers")} className="hover:text-orange-500 text-left transition-colors">โชว์รูมดีลเลอร์ผู้มีลิขสิทธิ์</button>
              </div>
            </div>

            {/* Resources Column */}
            <div className="text-left space-y-3.5">
              <h5 className="text-[11.5px] font-mono font-bold nonga-text-primary uppercase tracking-widest flex items-center gap-1.5">
                <LineChart className="w-3.5 h-3.5 text-orange-500" /> ศูนย์พริวิเลจ
              </h5>
              <div className="flex flex-col gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => navigateDealerSignupEntry(setView)}
                  className="hover:text-orange-500 transition-colors text-left"
                  title="เปิดสิทธิ์ดีลเลอร์จำลองในโปรไฟล์ (โหมดพัฒนา)"
                >
                  สมัครดีลเลอร์พันธมิตร Nong A
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateDealerSystemEntry(setView, user, role)
                  }
                  className="hover:text-orange-500 transition-colors text-left font-medium"
                  title={
                    isDealer || isAdmin
                      ? "เข้าระบบหลังบ้านเต็นท์รถ"
                      : "ตั้งค่าสิทธิ์ดีลเลอร์ในโปรไฟล์ก่อนเข้าใช้งาน"
                  }
                >
                  ระบบดีลเลอร์พันธมิตร Nong A
                </button>
                <button
                  type="button"
                  disabled
                  className={comingSoonLinkClass}
                  title="Coming Soon"
                >
                  ติดต่อความปลอดภัยไอที (เร็วๆ นี้)
                </button>
                <button
                  type="button"
                  onClick={() => navigatePilotPolicy("terms", setView)}
                  className="hover:text-orange-500 transition-colors text-left"
                >
                  เงื่อนไขการใช้งานรอบทดลอง
                </button>
                <button
                  type="button"
                  onClick={() => navigatePilotPolicy("privacy", setView)}
                  className="hover:text-orange-500 transition-colors text-left"
                >
                  นโยบายความเป็นส่วนตัว
                </button>
                <button
                  type="button"
                  onClick={() => navigatePilotPolicy("listing", setView)}
                  className="hover:text-orange-500 transition-colors text-left"
                >
                  นโยบายประกาศขายรถ
                </button>
                <button
                  type="button"
                  disabled
                  className={comingSoonLinkClass}
                  title="Coming Soon"
                >
                  ช่วยเหลือสนับสนุน API (เร็วๆ นี้)
                </button>
              </div>
            </div>

            {/* Quick Stats Support Badge */}
            <div className="text-left space-y-3">
              <h5 className="text-[11.5px] font-mono font-bold nonga-text-primary uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-orange-500" /> ความน่าเชื่อถือ
              </h5>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl border border-orange-500/10 bg-orange-500/5 text-[10.5px] leading-relaxed text-slate-700 dark:text-slate-350">
                  ⚡ <strong>NongBot Certified System</strong> ตรวจวัดสภาพคำนวณราคาด้วย AI ตรวจเช็คประวัติละเอียดผ่านฐานข้อมูลโชว์รูมหลัก มั่นใจทุกการจับจอง
                </div>
              </div>
            </div>

          </div>

          {/* AI Disclaimers segment (Crucial for compliance and premium vibe) */}
          <div className="mt-8 p-4 rounded-xl border text-left flex gap-3.5 items-start nonga-bg-subtle border-orange-500/10">
            <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500 block">AI DISCLAIMER & SAFETY NOTICE</span>
              <p className="text-[10px] nonga-text-secondary leading-relaxed">
                ข้อมูลการวิเคราะห์สภาพรถยนต์ แบตเตอรี่รถไฟฟ้า ตารางดอกเบี้ย คำคะแนนเปรียบเทียบ และการสนทนาทั้งหมดบนแพลตฟอร์มนี้ ถูกคำนวณและคาดเดาโดยโมเดลปัญญาประดิษฐ์อัจฉริยะ (AI Sales Assistant) โดยกลุ่ม NongBot เพื่อสนับสนุนข้อมูลประกอบการรีวิวเท่านั้น บริษัทฯ จะไม่รับผิดชอบต่อความถูกต้องทางกายภาพหรือเรื่องกฎหมาย การเจรจาราคาและการตัดสินใจซื้อขายจริง จะต้องกระทำ ณ โชว์รูมดีลเลอร์โดยตรวจสอบรายละเอียดและเอกสารประจำรถยนต์จากเจ้าของอย่างรอบคอบเป็นสำคัญ
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 mt-4 text-[11px] nonga-text-muted border-t border-orange-500/5">
            <span>© 2026 NongBot Innovation Co., Ltd. สงวนลิขสิทธิ์ทั้งหมด ตลาดซื้อขายรถอัจฉริยะน้องเอ (Nong A)</span>
            <span className="font-mono flex items-center gap-1.5 bg-orange-500/[0.03] border border-orange-500/10 px-3 py-1 rounded text-orange-500/95">
              <RefreshCw className="w-3 h-3 animate-spin text-orange-500" /> 100% Real-time Synced Database
            </span>
          </div>

        </div>
      </footer>
      )}

      <AppNotifyHost />
    </div>
  );
}
