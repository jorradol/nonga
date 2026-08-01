/**
 * Chat Experience V2 — conversation navigation (left area).
 * Desktop / large tablet (lg+, ≥1024px): persistent inline column, expanded
 * by default, user-collapsible to a compact rail that can reopen it.
 * Below lg: modal drawer with backdrop, Escape, focus trap and focus return
 * (handled by the shell trigger).
 *
 * Reuses canonical account primitives (ProfileAvatar + AccountProfileMenu)
 * and the real session-history contract from ChatProvider. No fake history,
 * no fake users. Logout stays inside the profile menu (existing behavior).
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  LogIn,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { useAuth } from "../../hooks/auth/useAuth";
import { useRole } from "../../hooks/auth/useRole";
import { useAppStore } from "../../store";
import ProfileAvatar from "../profile/ProfileAvatar";
import AccountProfileMenu from "../profile/AccountProfileMenu";
import { useChatV2FocusTrap } from "./adapters/useChatV2FocusTrap";
import { CHAT_V2_SIDEBAR_INLINE_MEDIA_QUERY } from "./adapters/useChatV2Presentation";

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

function formatSessionDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ChatV2AccountBlock({ onAfterAction }: { onAfterAction?: () => void }) {
  const { isSignedIn, user, logout, isSimulatedState } = useAuth();
  const { role, isDealer, isAdmin } = useRole();
  const setView = useAppStore((s) => s.setView);
  const setChatLoginModalOpen = useAppStore((s) => s.setChatLoginModalOpen);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName =
    user?.displayName?.trim() || user?.email?.split("@")[0] || "สมาชิก";
  const hasRealProfilePhoto = Boolean(user?.photoURL?.trim()) && !avatarFailed;

  const viteEnv = (import.meta as { env?: { DEV?: boolean } }).env;
  const showSandboxNavigation = isSimulatedState || Boolean(viteEnv?.DEV);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.photoURL, user?.uid]);

  useEffect(() => {
    if (!isSignedIn) setIsProfileOpen(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (!isProfileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isProfileOpen]);

  if (!isSignedIn) {
    return (
      <button
        type="button"
        onClick={() => {
          setChatLoginModalOpen(true);
          onAfterAction?.();
        }}
        className="flex items-center gap-2.5 w-full min-w-0 min-h-11 rounded-xl px-2 py-1.5 text-left nonga-text-secondary hover:text-orange-600 dark:hover:text-orange-400 hover:bg-(--nonga-bg-subtle) transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
        data-testid="chat-v2-login-btn"
      >
        <span className="w-9 h-9 rounded-full bg-(--nonga-bg-subtle) border border-(--nonga-border) flex items-center justify-center shrink-0">
          <LogIn className="w-4 h-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
        </span>
        <span className="text-xs font-semibold truncate">เข้าสู่ระบบ</span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative" data-testid="chat-v2-account">
      <button
        type="button"
        onClick={() => setIsProfileOpen((open) => !open)}
        aria-expanded={isProfileOpen}
        aria-haspopup="true"
        aria-label={isProfileOpen ? "ปิดเมนูบัญชี" : "เปิดเมนูบัญชี"}
        title={displayName}
        className="flex items-center gap-2.5 w-full min-w-0 min-h-11 rounded-xl px-2 py-1.5 text-left hover:bg-(--nonga-bg-subtle) transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
        data-testid="chat-v2-account-trigger"
      >
        <span className="w-9 h-9 rounded-full bg-(--nonga-bg-subtle) border border-orange-500/25 flex items-center justify-center shrink-0 overflow-hidden">
          {hasRealProfilePhoto ? (
            <ProfileAvatar
              user={user}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
              onUnresolved={() => setAvatarFailed(true)}
            />
          ) : (
            <User className="w-4 h-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold nonga-text-primary truncate leading-tight">
            {displayName}
          </span>
          <span className="block text-[10px] nonga-text-muted truncate leading-tight mt-0.5">
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
              onAfterAction?.();
            }}
            onLogout={() => {
              // Canonical sign-out — stay on the current route (same as /chat).
              void logout();
            }}
            onClose={() => setIsProfileOpen(false)}
            data-testid="chat-v2-account-menu"
            className="absolute left-0 top-full mt-2 w-56 max-w-[min(14rem,calc(100vw-1.5rem))] origin-top-left z-[70]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ChatV2SidebarProps {
  /** Drawer visibility (<1024px only). */
  isOpen: boolean;
  onClose: () => void;
  /** Desktop (lg+) collapse state — compact rail when true. */
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function ChatV2Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapsed,
}: ChatV2SidebarProps) {
  const {
    sessions,
    activeSessionId,
    selectSession,
    createNewChat,
    removeChat,
    isGenerating,
  } = useChatContext();
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);

  const drawerRef = useRef<HTMLDivElement>(null);
  const isDrawerMode = () =>
    typeof window !== "undefined" &&
    !window.matchMedia(CHAT_V2_SIDEBAR_INLINE_MEDIA_QUERY).matches;

  useChatV2FocusTrap(drawerRef, isOpen && isDrawerMode(), onClose);

  const closeIfDrawer = () => {
    if (isDrawerMode()) onClose();
  };

  const handleNewChat = async () => {
    if (isGenerating) return;
    const newId = await createNewChat();
    selectSession(newId);
    closeIfDrawer();
  };

  const handleSelectSession = (id: string) => {
    selectSession(id);
    closeIfDrawer();
  };

  const content = (
    <>
      <div className="p-3 border-b border-(--nonga-border) flex items-center justify-between gap-1.5 shrink-0">
        <div className="min-w-0 flex-1">
          <ChatV2AccountBlock onAfterAction={closeIfDrawer} />
        </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          className="min-w-9 min-h-9 p-2 rounded-lg border border-(--nonga-border) bg-(--nonga-bg-surface) nonga-text-secondary hover:text-orange-600 dark:hover:text-orange-400 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring shrink-0"
          aria-label={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
          title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
          data-testid="chat-v2-theme-toggle"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="max-lg:hidden min-w-9 min-h-9 p-2 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) hover:text-orange-600 dark:hover:text-orange-400 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring shrink-0"
          aria-label="ย่อเมนูบทสนทนา"
          title="ย่อเมนูบทสนทนา"
          data-testid="chat-v2-sidebar-collapse"
        >
          <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden min-w-9 min-h-9 p-2 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring shrink-0"
          aria-label="ปิดเมนูบทสนทนา"
          title="ปิดเมนูบทสนทนา"
          data-testid="chat-v2-sidebar-close"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="p-3 shrink-0">
        <button
          type="button"
          onClick={() => void handleNewChat()}
          disabled={isGenerating}
          className="w-full min-h-11 flex items-center justify-center gap-2 text-xs font-extrabold rounded-xl nonga-action text-[var(--nonga-action-primary-text)] nonga-focus-ring transition-transform motion-reduce:transform-none hover:scale-[1.01] active:scale-[0.99] shadow-sm cursor-pointer disabled:cursor-not-allowed"
          data-testid="chat-v2-new-chat"
        >
          <Plus
            className="w-4 h-4 shrink-0 text-[var(--nonga-action-primary-text)]"
            strokeWidth={2.75}
            aria-hidden="true"
          />
          <span className="text-[var(--nonga-action-primary-text)] [text-shadow:0_0.5px_0_rgba(0,0,0,0.45)]">
            แชทใหม่
          </span>
        </button>
      </div>

      <nav
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 pb-3 space-y-1 scrollbar-thin"
        aria-label="ประวัติบทสนทนา"
        data-testid="chat-v2-session-list"
      >
        <p className="text-[10px] font-semibold nonga-text-muted uppercase tracking-wider px-2 mb-1.5">
          บทสนทนาที่ผ่านมา
        </p>

        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              className={`group flex items-center rounded-xl border transition-colors motion-reduce:transition-none ${
                isActive
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "border-transparent hover:bg-(--nonga-bg-subtle)"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectSession(session.id)}
                aria-current={isActive ? "true" : undefined}
                title={session.title}
                className="flex-1 min-w-0 min-h-11 flex items-center gap-2 px-2.5 py-2 text-left cursor-pointer nonga-focus-ring rounded-xl"
                data-testid="chat-v2-session-item"
              >
                <MessageSquare
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-orange-600 dark:text-orange-400"
                      : "nonga-text-muted"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-xs truncate leading-snug ${
                      isActive
                        ? "font-bold nonga-text-primary"
                        : "font-medium nonga-text-secondary"
                    }`}
                  >
                    {session.title}
                  </span>
                  <span className="block text-[10px] nonga-text-muted mt-0.5">
                    {formatSessionDate(session.createdAt)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบทสนทนานี้ออกจากระบบอย่างถาวร?")) {
                    removeChat(session.id);
                  }
                }}
                className={`min-w-9 min-h-9 p-1.5 mr-1 rounded-lg nonga-text-muted hover:text-(--nonga-error) hover:bg-(--nonga-bg-subtle) transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 ${
                  isActive ? "lg:opacity-100" : ""
                }`}
                aria-label={`ลบบทสนทนา ${session.title}`}
                title="ลบบทสนทนานี้"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}

        {sessions.length === 0 && (
          <div className="text-center py-8 px-3 space-y-2" data-testid="chat-v2-session-empty">
            <MessageSquare
              className="w-7 h-7 nonga-text-muted mx-auto opacity-50"
              aria-hidden="true"
            />
            <p className="text-xs font-semibold nonga-text-secondary">ยังไม่มีประวัติแชท</p>
            <p className="text-[11px] nonga-text-muted leading-relaxed">
              กด «แชทใหม่» ด้านบน แล้วเริ่มคุยกับน้องเอได้เลยครับ
            </p>
          </div>
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Drawer backdrop below lg */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
          data-testid="chat-v2-sidebar-backdrop"
        />
      )}

      {/* Compact rail — desktop collapsed state (lg+ only), reopenable */}
      {isCollapsed && (
        <div
          aria-label="เมนูบทสนทนา (ย่อ)"
          className="hidden lg:flex shrink-0 w-14 h-full border-r border-(--nonga-border) bg-(--nonga-bg-app) flex-col items-center pt-3 gap-2"
          data-testid="chat-v2-sidebar-rail"
        >
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="min-w-9 min-h-9 p-1.5 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) hover:text-orange-600 dark:hover:text-orange-400 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
            aria-label="เปิดเมนูบทสนทนา"
            title="เปิดเมนูบทสนทนา"
            data-testid="chat-v2-sidebar-expand"
          >
            <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => void handleNewChat()}
            disabled={isGenerating}
            className="min-w-9 min-h-9 p-1.5 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) hover:text-orange-600 dark:hover:text-orange-400 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="แชทใหม่"
            title="แชทใหม่"
            data-testid="chat-v2-sidebar-rail-new-chat"
          >
            <Plus className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
          </button>
          <span
            className="flex flex-col items-center gap-1 nonga-text-muted"
            aria-hidden="true"
          >
            <MessageSquare className="w-4 h-4" />
            {sessions.length > 0 && (
              <span className="text-[10px] font-bold">
                {sessions.length.toLocaleString("th-TH")}
              </span>
            )}
          </span>
        </div>
      )}

      <div
        ref={drawerRef}
        aria-label="เมนูบทสนทนา"
        className={`max-lg:fixed max-lg:top-0 max-lg:bottom-0 max-lg:left-0 max-lg:z-50 max-lg:w-[290px] max-lg:max-w-[85vw] max-lg:max-h-[100dvh] max-lg:pb-[env(safe-area-inset-bottom)] max-lg:shadow-2xl lg:static lg:shrink-0 lg:w-[248px] xl:w-[264px] lg:h-full border-r border-(--nonga-border) bg-(--nonga-bg-app) flex flex-col min-h-0 transform transition-transform duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? "translate-x-0" : "max-lg:-translate-x-full"
        } lg:translate-x-0 ${isCollapsed ? "lg:hidden" : ""}`}
        data-testid="chat-v2-sidebar"
        data-open={isOpen ? "true" : "false"}
        data-collapsed={isCollapsed ? "true" : "false"}
      >
        {content}
      </div>
    </>
  );
}
