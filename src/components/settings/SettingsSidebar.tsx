import React from "react";
import { 
  User, Bot, Star, Volume2, ShieldAlert, 
  Settings, History, Sparkles, Sliders, ChevronRight
} from "lucide-react";

export type SettingsTabId = "profile" | "ai-preference" | "saved" | "dealer" | "system" | "history";

export interface SettingsTab {
  id: SettingsTabId;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

interface SettingsSidebarProps {
  activeTab: SettingsTabId;
  onTabChange: (id: SettingsTabId) => void;
  isDealerOrAdmin: boolean;
}

export default function SettingsSidebar({
  activeTab,
  onTabChange,
  isDealerOrAdmin,
}: SettingsSidebarProps) {
  
  const tabs: SettingsTab[] = [
    {
      id: "profile",
      label: "ข้อมูลบัญชีและโปรไฟล์",
      sublabel: "สิทธิ์และการตั้งชื่อ",
      icon: <User className="w-4 h-4" />
    },
    {
      id: "ai-preference",
      label: "สเปกเสียงและความคิด AI",
      sublabel: "น้องเอโมเดลและโทนเสียง",
      icon: <Bot className="w-4 h-4" />
    },
    {
      id: "saved",
      label: "รถคันโปรดที่บันทึกไว้",
      sublabel: "ส่องคันที่ใช่เพื่อติดตามราคา",
      icon: <Star className="w-4 h-4" />
    },
    {
      id: "dealer",
      label: "พื้นที่โชว์รูมดีลเลอร์",
      sublabel: "แต่งร้าน บบนเนอร์ และคะแนน",
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      id: "system",
      label: "การตั้งค่าและการแจ้งเตือน",
      sublabel: "ระบบ ธีม และภาษา",
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: "history",
      label: "คลังบันทึกการคุยกับน้องเอ",
      sublabel: "ย้อนความหลังรถในฟัน",
      icon: <History className="w-4 h-4" />
    }
  ];

  // If they are not a dealer or admin in actual mode, keep the tab available but with a cool lock icon / sandbox testing badge
  return (
    <div className="space-y-4">
      {/* Sidebar Navigation */}
      <div className="flex xl:flex-col gap-2 overflow-x-auto pb-3 xl:pb-0 scrollbar-none snap-x snap-mandatory">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDealerTab = tab.id === "dealer";
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-auto xl:w-full snap-start shrink-0 p-3 px-4 xl:p-4 rounded-xl text-left transition-all duration-300 flex items-center justify-between group cursor-pointer border relative overflow-hidden ${
                isActive 
                  ? "border-orange-500/30 bg-orange-600/10 text-orange-400 font-bold shadow-[0_0_15px_rgba(234,88,12,0.15)]" 
                  : "border-white/5 bg-black/20 hover:bg-white/[0.03] text-slate-400 hover:text-slate-205"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 w-1 xl:w-1.5 h-full bg-orange-500" />
              )}
              
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-transform ${
                  isActive 
                    ? "bg-orange-500/15 text-orange-400" 
                    : "bg-white/5 text-slate-400 group-hover:scale-110"
                }`}>
                  {tab.icon}
                </div>
                <div className="xl:block text-left">
                  <div className="text-xs font-black truncate max-w-[170px] xl:max-w-none">
                    {tab.label}
                  </div>
                  <div className="hidden xl:block text-[9.5px] text-slate-500 mt-0.5 max-w-[180px] truncate leading-none">
                    {tab.sublabel}
                  </div>
                </div>
              </div>

              {isDealerTab && !isDealerOrAdmin && (
                <span className="ml-2 text-[8px] bg-teal-500/10 border border-teal-500/20 text-teal-400 leading-none px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                  Sandbox
                </span>
              )}

              <ChevronRight className="hidden xl:block w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-orange-500" />
            </button>
          );
        })}
      </div>
      
      {/* Side Quick diagnostics info for full system look */}
      <div className="hidden xl:block p-4.5 rounded-xl border border-white/5 bg-black/15 text-left space-y-2">
        <h4 className="text-[11px] font-black tracking-wider uppercase text-slate-500 flex items-center gap-1">
          <Sliders className="w-3.5 h-3.5 text-orange-500" /> โครงสร้างความสว่างคลาวด์
        </h4>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          ความพรีเมียมของตระกูลระบบ <strong>NongBot SaaS Applet v2.5</strong> ดำเนินการผ่านสายเคเบิลความเร็วสูง
        </p>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 w-[89%]" />
        </div>
        <div className="flex justify-between text-[8.5px] font-mono text-slate-500">
          <span>LATENCY: ~22ms</span>
          <span>99.9% LIVE</span>
        </div>
      </div>
    </div>
  );
}
