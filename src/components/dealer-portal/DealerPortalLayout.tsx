import React from "react";
import { useAppStore } from "../../store";
import {
  LayoutDashboard,
  Car,
  FileEdit,
  Upload,
  User,
  Store,
  ArrowLeft,
  Copy,
} from "lucide-react";

export type DealerPortalTab =
  | "home"
  | "inventory"
  | "drafts"
  | "import"
  | "duplicates"
  | "profile";

const NAV: { id: DealerPortalTab; label: string; path: string; icon: React.ElementType }[] = [
  { id: "home", label: "แดชบอร์ด", path: "/dealer", icon: LayoutDashboard },
  { id: "inventory", label: "รถในตลาด", path: "/dealer/inventory", icon: Car },
  { id: "drafts", label: "Draft", path: "/dealer/drafts", icon: FileEdit },
  { id: "duplicates", label: "รถซ้ำ", path: "/dealer/duplicates", icon: Copy },
  { id: "import", label: "นำเข้า", path: "/dealer/import", icon: Upload },
  { id: "profile", label: "โปรไฟล์", path: "/dealer/profile", icon: User },
];

export function dealerTabFromPath(pathname: string): DealerPortalTab {
  if (pathname.startsWith("/dealer/inventory")) return "inventory";
  if (pathname.startsWith("/dealer/drafts")) return "drafts";
  if (pathname.startsWith("/dealer/import")) return "import";
  if (pathname.startsWith("/dealer/duplicates")) return "duplicates";
  if (pathname.startsWith("/dealer/profile")) return "profile";
  return "home";
}

export function navigateDealerTab(tab: DealerPortalTab) {
  const item = NAV.find((n) => n.id === tab);
  if (item && typeof window !== "undefined") {
    window.history.replaceState(null, "", item.path);
  }
}

interface DealerPortalLayoutProps {
  activeTab: DealerPortalTab;
  dealerName: string;
  children: React.ReactNode;
}

export function DealerPortalLayout({
  activeTab,
  dealerName,
  children,
}: DealerPortalLayoutProps) {
  const { setView, isDarkMode } = useAppStore();
  const panel = isDarkMode
    ? "bg-slate-950/90 border-slate-800"
    : "bg-white border-slate-200";

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside
          className={`lg:w-56 shrink-0 rounded-2xl border p-4 space-y-1 ${panel}`}
        >
          <div className="flex items-center gap-2 px-2 py-3 mb-2 border-b border-slate-800/80">
            <Store className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">
                Dealer Portal
              </p>
              <p className="text-xs font-semibold truncate">{dealerName}</p>
            </div>
          </div>

          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigateDealerTab(item.id);
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-orange-600 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1">
            <button
              type="button"
              onClick={() => setView("marketplace")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-500 hover:text-orange-400"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              ไป Marketplace
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
