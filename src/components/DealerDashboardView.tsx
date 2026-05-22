import React, { useState } from "react";
import { useAuthContext } from "../contexts/auth/AuthContext";
import { useRole } from "../hooks/auth/useRole";
import { useAppStore } from "../store";
import { motion } from "motion/react";
import { 
  Building, ShieldCheck, Settings, AlertCircle, 
  Menu, Sparkles, X, Sun, Moon, ArrowLeft, Landmark, Car 
} from "lucide-react";

// Sub-components Imports
import { DealerSidebar, DealerTab } from "./dealer/DealerSidebar";
import { DealerOverview } from "./dealer/DealerOverview";
import { DealerAnalytics } from "./dealer/DealerAnalytics";
import { DealerLeads } from "./dealer/DealerLeads";
import { DealerInventory } from "./dealer/DealerInventory";
import { DealerChat } from "./dealer/DealerChat";
import { DealerBoost } from "./dealer/DealerBoost";
import { DealerSubscription } from "./dealer/DealerSubscription";

export default function DealerDashboardView() {
  const { user } = useAuthContext();
  const { isDealer, isAdmin } = useRole();
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  const setView = useAppStore((state) => state.setView);
  
  const [activeTab, setActiveTab] = useState<DealerTab>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Gating access checks
  if (!isDealer && !isAdmin) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center">
        <div className={`p-8 rounded-3xl text-left space-y-6 ${
          isDarkMode ? "bg-slate-950 border border-slate-900" : "bg-white border border-slate-200"
        } shadow-2xl relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl bg-orange-600/10 text-orange-500 animate-bounce">
              <AlertCircle className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-xl font-black text-white">เฉพาะสิทธิ์ดีลเลอร์และแอดมินเท่านั้นครับ 🔒</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              หน้าต่างห้องสรุปข้อมูลดีลเลอร์ระดับสากลนี้ ออกแบบมาเพื่อดีลเลอร์ผู้เชี่ยวชาญ คอยรับรายชื่อลูกค้า ขอส่วนลด และคัดสรรบทจองโฮมสเป็คเท่านั้นครับ
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 space-y-2">
            <p className="text-[11px] font-extrabold text-orange-400 flex items-center gap-1">
              💡 แนะนำในการทดสอบจำลอง:
            </p>
            <p className="text-[10.5px] text-slate-450 leading-relaxed">
              คุณพี่สามารถสลับระดับอนุญาตของคุณได้ง่ายๆ เพียงกดคลิกไปที่หน้า **"ตั้งค่าโปรไฟล์"** (Profile Settings) แล้วทำการสลับบทบาทของคุณเป็น **Dealer** จากนั้นสถิติวอบซ่าของระบบนี้จะพร้อมให้บริการคุณทันทีครับ!
            </p>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setView("profile")}
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl text-xs active:scale-97 transition cursor-pointer shadow-lg shadow-orange-500/10 text-center"
            >
              ไปที่หน้าการตั้งค่าโปรไฟล์ 🪄
            </button>
            <button
              onClick={() => setView("marketplace")}
              className="px-4 py-2.5 bg-slate-900 border border-slate-850 text-slate-300 rounded-xl text-xs hover:text-white transition cursor-pointer"
            >
              กลับสู่ตลาดรถยนต์
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Map tabs to active component modules
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <DealerOverview />;
      case "analytics":
        return <DealerAnalytics />;
      case "leads":
        return <DealerLeads />;
      case "inventory":
        return <DealerInventory />;
      case "chat":
        return <DealerChat />;
      case "boost":
        return <DealerBoost />;
      case "subscription":
        return <DealerSubscription />;
      default:
        return <DealerOverview />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "overview": return "แดชบอร์ดสรุปวิเคราะห์ทางการตลาด (Dashboard)";
      case "analytics": return "วิเคราะห์ทราฟฟิก & ฟันเนลอัจฉริยะ (Insights)";
      case "leads": return "รายชื่อดีลใบจองลูกค้าพรีเมียม (CRM Board)";
      case "inventory": return "ตารางบริหารคลังรถจำลอง (Inventory)";
      case "chat": return "อินบ็อกซ์คุยแชทลูกค้าคู่ขนานน้องเอ AI (Inbox Co-pilot)";
      case "boost": return "บูสเตอร์เร่งอัตราทราฟฟิก (Booster Network)";
      case "subscription": return "แพ็กเกจสมัครสมาชิกระดับสากล (SaaS Tiers)";
      default: return "แผงควบคุมหลัก";
    }
  };

  return (
    <div className={`flex min-h-screen ${
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* Component Sidebar controller */}
      <DealerSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main dynamic workspace container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top bar header inside content area */}
        <header className="h-16 border-b border-slate-900/60 bg-slate-950/40 backdrop-blur-md px-4 flex items-center justify-between z-10">
          
          {/* Logo menu trigger for responsive sizes */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 px-1.8.5 rounded-lg border border-slate-850 text-slate-400 hover:text-white lg:hidden cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h2 className="text-xs font-black text-white capitalize hidden sm:block">
                {getTabTitle()}
              </h2>
              <span className="text-[10px] text-slate-500 font-bold block leading-none uppercase tracking-wider sm:hidden">
                {activeTab} PANEL
              </span>
            </div>
          </div>

          {/* Configuration utility buttons section */}
          <div className="flex items-center gap-3">
            
            {/* Dark mode switcher toggle with Orange parameters */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-orange-400 transition cursor-pointer"
              title="สลับโทนแสง"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Simulated Admin status label */}
            <span className="hidden md:inline-flex items-center gap-1 px-2.2 py-0.8 rounded-lg bg-orange-600/10 text-orange-400 font-extrabold border border-orange-500/20 text-[9.5px] uppercase select-none">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Partner
            </span>

            {/* Quick avatar */}
            <div className="w-8 h-8 rounded-full border border-orange-500/20 bg-orange-600/10 flex items-center justify-center text-xs font-black text-orange-400 select-none">
              CEO
            </div>

          </div>

        </header>

        {/* Floating tabs menu for responsive sub-navigation */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-6xl w-full mx-auto pb-12">
          
          {/* Transition wrapper */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>

        </main>

      </div>

    </div>
  );
}
