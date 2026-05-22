import React from "react";
import { 
  LayoutDashboard, TrendingUp, Users, Car, 
  MessageSquare, Rocket, CreditCard, Sparkles,
  ShieldCheck, Menu, X, ArrowLeft
} from "lucide-react";
import { useAppStore } from "../../store";

export type DealerTab = 
  | "overview" 
  | "analytics" 
  | "leads" 
  | "inventory" 
  | "chat" 
  | "boost" 
  | "subscription";

interface DealerSidebarProps {
  activeTab: DealerTab;
  setActiveTab: (tab: DealerTab) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function DealerSidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: DealerSidebarProps) {
  const setView = useAppStore((state) => state.setView);
  const isDarkMode = useAppStore((state) => state.isDarkMode);

  const menuItems = [
    { id: "overview" as const, label: "แดชบอร์ดสรุปผล", desc: "ภาพรวมอภิมหาสถิติ", icon: LayoutDashboard },
    { id: "analytics" as const, label: "วิเคราะห์เชิงลึก AI", desc: "สถิติผู้เข้าชม & ฟันเนล", icon: TrendingUp },
    { id: "leads" as const, label: "ลูกค้าติดต่อขอซื้อ CRM", desc: "ติดตามรายชื่อขอข้อมูลดีล", icon: Users, badge: "ใหม่" },
    { id: "inventory" as const, label: "จัดการคลังรถยนต์", desc: "โพสต์รถ & อัปเดตราคา", icon: Car },
    { id: "chat" as const, label: "คุยอินบ็อกซ์ & บอทเอ", desc: "แชทลูกค้า & แนะนำคำถาม", icon: MessageSquare, badge: "แชท" },
    { id: "boost" as const, label: "ระบบลงบูสต์โฆษณา", desc: "เร่งคิวยอดวิวสิบเท่า", icon: Rocket },
    { id: "subscription" as const, label: "สมัครแพ็กเกจดีลเลอร์", desc: "ปลดล็อกขีดจำกัดสูงสุด", icon: CreditCard },
  ];

  const handleTabClick = (tabId: DealerTab) => {
    setActiveTab(tabId);
    setIsOpen(false); // Close responsive sidebar on mobile
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        {/* Brand Header inside Sidebar */}
        <div className="space-y-1 pb-4 border-b border-orange-500/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black text-white text-sm">
              N
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-1">
                Nong A <span className="text-orange-400">Pro</span>
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Showroom Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="space-y-1 text-left">
          <p className="text-[9px] uppercase font-extrabold tracking-widest text-slate-500 pl-2.5 pb-2">เมนูการบริหารโชว์รูม</p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition duration-200 group text-left cursor-pointer ${
                    isActive 
                      ? "bg-gradient-to-r from-orange-600/15 to-amber-500/5 border-l-2 border-orange-500 text-orange-400"
                      : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <IconComp className={`w-4 h-4 shrink-0 transition duration-200 ${isActive ? "text-orange-500" : "text-slate-400 group-hover:text-slate-200"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded ${
                          item.badge === "ใหม่" 
                            ? "bg-orange-500 text-white" 
                            : "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-550 leading-none mt-0.5 truncate">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Navigation Back Options */}
      <div className="space-y-3 pt-4 border-t border-slate-900">
        <button
          onClick={() => setView("marketplace")}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-orange-500/10 active:scale-97"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับสู่ตลาดรถยนต์
        </button>
        <p className="text-[9px] text-slate-500 text-center leading-relaxed">
          Nong A — ช่วยขายรถง่ายขึ้น ด้วย AI<br />
          Dealer Portal
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Panel */}
      <aside className="hidden lg:block w-64 shrink-0 bg-slate-950/80 border-r border-slate-900/80 backdrop-blur-md h-screen sticky top-0 overflow-y-auto">
        {navContent}
      </aside>

      {/* Mobile Drawer Slide Panel overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Black drop backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Drawer container body */}
          <div className="relative w-64 bg-slate-950 border-r border-slate-900 h-full z-10 transition">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
