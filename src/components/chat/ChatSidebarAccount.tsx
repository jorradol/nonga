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
      {/* v5.4.5-lite.1: compact auth footer — text link + icon (revert: restore bordered full-width buttons) */}
      <div
        className={`border-t border-slate-800/80 bg-slate-950/60 shrink-0 overflow-hidden ${
          collapsed ? "md:p-1.5 p-2" : "px-3 py-2"
        }`}
        id="sidebar-account"
      >
        {!isSignedIn ? (
          <button
            type="button"
            onClick={openLogin}
            title="เข้าสู่ระบบ"
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-900/50 transition-colors ${
              collapsed ? "md:py-1.5 md:px-0 py-1.5 px-2" : "py-1.5 px-2"
            }`}
            id="sidebar-login-btn"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className={`text-xs font-medium ${collapsed ? "md:hidden" : ""}`}>
              เข้าสู่ระบบ
            </span>
          </button>
        ) : (
          <div
            className={`flex items-center gap-2 min-w-0 ${
              collapsed ? "md:flex-col md:items-center md:gap-1" : ""
            }`}
          >
            <div
              className={`flex items-center gap-2 min-w-0 flex-1 ${
                collapsed ? "md:justify-center md:flex-none" : ""
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
                <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-500 truncate leading-tight">
                  {shortRoleLabel(role)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut || authLoading}
              title="ออกจากระบบ"
              className={`shrink-0 flex items-center gap-1 rounded-md text-slate-500 hover:text-rose-300 hover:bg-slate-900/60 transition-colors disabled:opacity-50 ${
                collapsed ? "md:p-1.5 md:justify-center py-1 px-1.5" : "py-1 px-1.5"
              }`}
              id="sidebar-logout-btn"
            >
              <LogOut className="w-3 h-3 shrink-0" />
              <span className={`text-[10px] font-medium ${collapsed ? "md:hidden" : ""}`}>
                ออกจากระบบ
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
