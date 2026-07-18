import {
  FileText,
  LogOut,
  Rocket,
  ShieldCheck,
  Sparkle,
  Sparkles,
  Store,
  UserCheck,
  Crown,
} from "lucide-react";
import { motion } from "motion/react";

export type AccountProfileMenuUserLike = {
  displayName?: string | null;
  email?: string | null;
};

/** View ids the canonical account menu can navigate to (matches Header). */
export type AccountProfileMenuView =
  | "profile"
  | "billing"
  | "boost"
  | "onboarding"
  | "admin-dashboard"
  | "inventory-import"
  | "dealer-portal"
  | "dealer-dashboard"
  | "home";

type AccountProfileMenuProps = {
  user: AccountProfileMenuUserLike | null | undefined;
  isSimulatedState: boolean;
  showSandboxNavigation: boolean;
  isAdmin: boolean;
  isDealer: boolean;
  onNavigate: (view: AccountProfileMenuView) => void;
  onLogout: () => void;
  onClose: () => void;
  /** Optional test id; Header keeps `header-account-menu`. */
  "data-testid"?: string;
  /** Positioning / origin classes for the floating panel. */
  className?: string;
};

/**
 * Canonical account profile menu — single source for Header + Chat sidebar.
 * Role gates and navigation/logout actions stay identical; only presentation
 * chrome (position/origin) is overridden by the caller.
 */
export default function AccountProfileMenu({
  user,
  isSimulatedState,
  showSandboxNavigation,
  isAdmin,
  isDealer,
  onNavigate,
  onLogout,
  onClose,
  "data-testid": testId = "account-profile-menu",
  className = "absolute right-0 mt-3 w-56 max-w-[min(14rem,calc(100vw-1.5rem))] origin-top-right",
}: AccountProfileMenuProps) {
  const go = (view: AccountProfileMenuView) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-10"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="menu"
        aria-label="เมนูบัญชี"
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className={`${className} rounded-xl border nonga-border nonga-bg-elevated nonga-text-primary p-4.5 z-20 space-y-4 shadow-2xl text-left`}
        data-testid={testId}
      >
        <div className="space-y-1 pb-3 border-b border-orange-500/10">
          <p className="text-[10px] font-bold nonga-text-muted uppercase tracking-widest">
            ข้อมูลบัญชีผู้ใช้
          </p>
          <p className="text-sm font-black truncate">{user?.displayName}</p>
          <p className="text-[10.5px] font-mono nonga-text-muted truncate">
            {user?.email}
          </p>
        </div>

        <div className="space-y-1">
          <div className="p-2 py-2.5 rounded-lg bg-orange-500/5 border border-orange-500/10 text-[10px] leading-relaxed flex items-center gap-1.5 text-orange-400">
            <Sparkle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>
              {isSimulatedState
                ? "โหมดระบบข้อมูลจำลอง Sandbox"
                : "โหมดบัญชีผู้ใช้จริงบนคลาวด์"}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs py-1 border-t border-orange-500/10 pt-3">
          <button
            type="button"
            onClick={() => go("profile")}
            className="w-full text-left p-2 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer nonga-menu-item nonga-focus-ring"
          >
            <UserCheck className="w-4 h-4 text-orange-500" />
            <span>การตั้งค่าโปรไฟล์และบทบาท</span>
          </button>

          {showSandboxNavigation ? (
            <>
              <button
                type="button"
                onClick={() => go("billing")}
                className="w-full text-left p-2 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 nonga-focus-ring"
              >
                <Crown className="w-4 h-4 text-orange-400 animate-pulse" />
                <span>การเงินและแพ็กเกจสมาชิก 👑</span>
              </button>

              <button
                type="button"
                onClick={() => go("boost")}
                className="w-full text-left p-2 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 nonga-focus-ring"
              >
                <Rocket className="w-4 h-4 text-orange-500 animate-bounce" />
                <span>บูสต์จัดอันดับโพสต์ 🚀</span>
              </button>

              <button
                type="button"
                onClick={() => go("onboarding")}
                className="w-full text-left p-2 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer nonga-menu-item nonga-focus-ring"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>ไปทัวร์ Onboarding</span>
              </button>
            </>
          ) : (
            <div className="p-2 rounded-lg border border-amber-500/15 bg-amber-500/5 text-[10.5px] text-amber-800 dark:text-amber-200 leading-relaxed">
              แพ็กเกจ, บูสต์ และทัวร์ระบบจะเปิดในรอบ Public Beta ถัดไป
            </div>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => go("admin-dashboard")}
                className="w-full text-left p-2 hover:bg-orange-500/15 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-400 hover:text-orange-300 border border-orange-500/10 bg-orange-500/5"
              >
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                <span>แผงควบคุมระบบ (Admin Control) 👑</span>
              </button>
              <button
                type="button"
                onClick={() => go("inventory-import")}
                className="w-full text-left p-2 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer nonga-menu-item nonga-focus-ring"
              >
                <FileText className="w-4 h-4 text-teal-400" />
                <span>นำเข้าคลังรถ (CSV/Excel)</span>
              </button>
            </>
          )}

          {(isDealer || isAdmin) && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.replaceState(null, "", "/dealer");
                  }
                  go("dealer-portal");
                }}
                className="w-full text-left p-2 hover:bg-orange-500/10 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer text-orange-700 dark:text-orange-300 border border-orange-500/20 nonga-focus-ring"
              >
                <Store className="w-4 h-4 text-orange-400" />
                <span>Dealer Portal (คลังรถ)</span>
              </button>
              {showSandboxNavigation && (
                <button
                  type="button"
                  onClick={() => go("dealer-dashboard")}
                  className="w-full text-left p-2 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer nonga-menu-item nonga-focus-ring"
                >
                  <Store className="w-4 h-4 text-teal-400" />
                  <span>โชว์รูมฝ่ายขายดีลเลอร์</span>
                </button>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition rounded-lg text-xs font-bold flex items-center justify-center gap-2 focus:outline-none cursor-pointer nonga-focus-ring"
          data-testid="account-profile-menu-logout"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>ออกจากระบบเสร็จสรรพ</span>
        </button>
      </motion.div>
    </>
  );
}
