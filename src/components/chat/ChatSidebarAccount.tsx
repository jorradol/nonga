import { useState } from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { useRole } from "../../hooks/auth/useRole";
import { requestChatLoginModal } from "../../utils/requestChatLogin";

function shortRoleLabel(role: string): string {
  switch (role) {
    case "dealer":
      return "ดีลเลอร์";
    case "admin":
    case "superadmin":
      return "แอดมิน";
    case "premium":
      return "พรีเมียม";
    case "member":
      return "สมาชิก";
    default:
      return "ผู้เยี่ยมชม";
  }
}

type ChatSidebarAccountProps = {
  collapsed: boolean;
  onMobileSidebarClose?: () => void;
};

export function ChatSidebarAccount({
  collapsed,
  onMobileSidebarClose,
}: ChatSidebarAccountProps) {
  const { isSignedIn, user, logout, loading: authLoading } = useAuth();
  const { role } = useRole();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    user?.displayName?.trim() || user?.email?.split("@")[0] || "สมาชิก";

  const openLogin = () => {
    requestChatLoginModal("chat");
    if (window.innerWidth < 768) {
      onMobileSidebarClose?.();
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <div
        className={`border-t border-slate-800/80 bg-slate-950/60 shrink-0 ${
          collapsed ? "md:p-1.5 p-3" : "p-3"
        }`}
        id="sidebar-account"
      >
        {!isSignedIn ? (
          <button
            type="button"
            onClick={openLogin}
            title="เข้าสู่ระบบ"
            className={`w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-200 hover:border-orange-500/40 hover:bg-slate-800 transition-colors ${
              collapsed ? "md:min-h-[40px] md:px-0 md:py-2.5 py-2.5 px-3" : "py-2.5 px-3"
            }`}
            id="sidebar-login-btn"
          >
            <LogIn className="w-4 h-4 shrink-0 text-orange-400" />
            <span className={`text-xs font-semibold ${collapsed ? "md:hidden" : ""}`}>
              เข้าสู่ระบบ
            </span>
          </button>
        ) : (
          <div
            className={`flex gap-2 ${collapsed ? "md:flex-col md:items-center" : "flex-col"}`}
          >
            <div
              className={`flex items-center gap-2 min-w-0 ${
                collapsed ? "md:justify-center md:w-full" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-orange-400" />
              </div>
              <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {shortRoleLabel(role)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut || authLoading}
              title="ออกจากระบบ"
              className={`flex items-center justify-center gap-2 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 hover:bg-slate-900 transition-colors disabled:opacity-50 ${
                collapsed
                  ? "md:w-full md:min-h-[36px] md:px-0 w-full py-2 px-3"
                  : "w-full py-2 px-3 text-xs"
              }`}
              id="sidebar-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className={collapsed ? "md:hidden" : ""}>ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
