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

/**
 * Account block — rendered at the TOP of the chat sidebar (sidebar header slot).
 * Shows the real session identity (profile icon + display name + role) with the
 * original interactions preserved: guest → login modal, signed-in → logout.
 */
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
    <div
      className={`flex items-center min-w-0 flex-1 ${
        collapsed ? "md:flex-col md:items-center md:gap-1 gap-2" : "gap-2"
      }`}
      id="sidebar-account"
    >
      {!isSignedIn ? (
        <button
          type="button"
          onClick={openLogin}
          title="เข้าสู่ระบบ"
          className={`flex items-center gap-2 min-w-0 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-orange-400 dark:hover:bg-slate-900/50 transition-colors ${
            collapsed ? "md:p-1.5 py-1.5 px-1" : "py-1.5 px-1"
          }`}
          id="sidebar-login-btn"
        >
          <span className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <LogIn className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </span>
          <span className={`text-xs font-medium truncate ${collapsed ? "md:hidden" : ""}`}>
            เข้าสู่ระบบ
          </span>
        </button>
      ) : (
        <>
          <div
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0"
            id="sidebar-account-avatar"
          >
            <User className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
            <p className="text-xs font-semibold nonga-text-primary truncate leading-tight">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-600 dark:text-slate-500 truncate leading-tight">
              {shortRoleLabel(role)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut || authLoading}
            title="ออกจากระบบ"
            className={`shrink-0 flex items-center gap-1 rounded-md text-slate-600 hover:text-rose-600 hover:bg-slate-200/60 dark:text-slate-500 dark:hover:text-rose-300 dark:hover:bg-slate-900/60 transition-colors disabled:opacity-50 ${
              collapsed ? "md:p-1.5 md:justify-center py-1 px-1.5" : "py-1 px-1.5"
            }`}
            id="sidebar-logout-btn"
          >
            <LogOut className="w-3 h-3 shrink-0" />
            <span className={`text-[10px] font-medium ${collapsed ? "md:hidden" : ""}`}>
              ออกจากระบบ
            </span>
          </button>
        </>
      )}
    </div>
  );
}
