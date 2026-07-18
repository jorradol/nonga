import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { LogIn, User } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { useRole } from "../../hooks/auth/useRole";
import { useAppStore } from "../../store";
import { requestChatLoginModal } from "../../utils/requestChatLogin";
import ProfileAvatar from "../profile/ProfileAvatar";
import AccountProfileMenu from "../profile/AccountProfileMenu";

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
 * Account block — top of chat sidebar (position A).
 * Avatar from the same session/photoURL source as Header (ProfileAvatar).
 * Click opens the canonical AccountProfileMenu (logout lives inside the menu only).
 */
export function ChatSidebarAccount({
  collapsed,
  onMobileSidebarClose,
}: ChatSidebarAccountProps) {
  const { isSignedIn, user, logout, isSimulatedState } = useAuth();
  const { role, isDealer, isAdmin } = useRole();
  const setView = useAppStore((s) => s.setView);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const displayName =
    user?.displayName?.trim() || user?.email?.split("@")[0] || "สมาชิก";
  const hasRealProfilePhoto = Boolean(user?.photoURL?.trim()) && !avatarFailed;

  const viteEnv = (import.meta as { env?: { DEV?: boolean } }).env;
  const showSandboxNavigation = isSimulatedState || Boolean(viteEnv?.DEV);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.photoURL, user?.uid]);

  useEffect(() => {
    if (!isProfileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsProfileOpen(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const root = document.getElementById("sidebar-account");
      if (root && !root.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isSignedIn) setIsProfileOpen(false);
  }, [isSignedIn]);

  const openLogin = () => {
    requestChatLoginModal("chat");
    if (window.innerWidth < 768) {
      onMobileSidebarClose?.();
    }
  };

  const closeMenuAndMaybeDrawer = () => {
    setIsProfileOpen(false);
  };

  return (
    <div
      className={`relative flex items-center min-w-0 flex-1 ${
        collapsed ? "md:flex-col md:items-center md:gap-1 gap-2" : "gap-2"
      }`}
      id="sidebar-account"
    >
      {!isSignedIn ? (
        <button
          type="button"
          onClick={openLogin}
          title="เข้าสู่ระบบ"
          className={`flex items-center gap-2 min-w-0 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-orange-400 dark:hover:bg-slate-900/50 transition-colors nonga-focus-ring ${
            collapsed ? "md:p-1.5 py-1.5 px-1" : "py-1.5 px-1"
          }`}
          id="sidebar-login-btn"
        >
          <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <LogIn className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </span>
          <span className={`text-xs font-medium truncate ${collapsed ? "md:hidden" : ""}`}>
            เข้าสู่ระบบ
          </span>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsProfileOpen((open) => !open)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            aria-label={isProfileOpen ? "ปิดเมนูบัญชี" : "เปิดเมนูบัญชี"}
            title={displayName}
            data-testid="chat-sidebar-account-control"
            id="sidebar-account-trigger"
            className={`flex items-center min-w-0 flex-1 rounded-lg text-left transition-colors nonga-focus-ring hover:bg-slate-200/60 dark:hover:bg-slate-900/50 ${
              collapsed ? "md:p-1.5 md:justify-center gap-2 py-1 px-1" : "gap-2 py-1 px-1"
            }`}
          >
            <span
              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-orange-500/20"
              id="sidebar-account-avatar"
            >
              {hasRealProfilePhoto ? (
                <ProfileAvatar
                  user={user}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                  onUnresolved={() => setAvatarFailed(true)}
                />
              ) : (
                <User
                  className="w-4 h-4 text-orange-600 dark:text-orange-400"
                  aria-hidden="true"
                />
              )}
            </span>
            <span className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
              <span className="block text-xs font-semibold nonga-text-primary truncate leading-tight">
                {displayName}
              </span>
              <span className="block text-[10px] text-slate-600 dark:text-slate-500 truncate leading-tight">
                {shortRoleLabel(role)}
              </span>
            </span>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <AccountProfileMenu
                user={user}
                isSimulatedState={isSimulatedState}
                showSandboxNavigation={showSandboxNavigation}
                isAdmin={isAdmin}
                isDealer={isDealer}
                onNavigate={(view) => {
                  setView(view);
                  if (window.innerWidth < 768) {
                    onMobileSidebarClose?.();
                  }
                }}
                onLogout={() => {
                  void logout();
                  setView("home");
                }}
                onClose={closeMenuAndMaybeDrawer}
                data-testid="chat-sidebar-account-menu"
                className="absolute left-0 top-full mt-2 w-56 max-w-[min(14rem,calc(100vw-1.5rem))] origin-top-left z-[60]"
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
