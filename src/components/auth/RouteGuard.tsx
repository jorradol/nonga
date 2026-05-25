import type { ReactNode } from "react";
import { AlertCircle, Home, LogIn, UserCheck } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { useAppStore } from "../../store";
import {
  canAccessAdmin,
  canAccessDealerPortal,
  canManageRoles,
  isSuspended,
  normalizeRole,
  type UserRole,
} from "../../utils/rbac";

type GuardRequirement = "auth" | "member" | "dealer" | "admin" | "superadmin";

interface RouteGuardProps {
  children: ReactNode;
  require: GuardRequirement;
}

const MESSAGES = {
  login: "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ",
  dealer: "บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ",
  admin: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบครับ",
  suspended: "บัญชีนี้ถูกระงับการใช้งานครับ กรุณาติดต่อผู้ดูแลระบบ",
};

function roleMeetsMember(role: UserRole): boolean {
  return (
    role === "member" ||
    role === "premium" ||
    role === "dealer" ||
    role === "admin" ||
    role === "superadmin"
  );
}

function AccessDenied({
  message,
  action,
}: {
  message: string;
  action: "login" | "profile" | "home";
}) {
  const setView = useAppStore((state) => state.setView);
  const button =
    action === "login"
      ? { label: "เข้าสู่ระบบ", view: "login" as const, icon: LogIn }
      : action === "profile"
        ? { label: "ไปที่โปรไฟล์", view: "profile" as const, icon: UserCheck }
        : { label: "กลับหน้าแรก", view: "home" as const, icon: Home };
  const Icon = button.icon;

  return (
    <div className="mx-auto flex min-h-[48vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-slate-200">{message}</p>
      <button
        type="button"
        onClick={() => setView(button.view)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-500"
      >
        <Icon className="h-4 w-4" />
        {button.label}
      </button>
    </div>
  );
}

export function RouteGuard({ children, require }: RouteGuardProps) {
  const { user, isSignedIn } = useAuth();
  const role = normalizeRole(user?.role);

  if (isSuspended(user)) {
    return <AccessDenied message={MESSAGES.suspended} action="home" />;
  }

  if (!isSignedIn) {
    return <AccessDenied message={MESSAGES.login} action="login" />;
  }

  if (require === "auth") return <>{children}</>;

  if (require === "member" && !roleMeetsMember(role)) {
    return <AccessDenied message={MESSAGES.login} action="login" />;
  }

  if (require === "dealer" && !canAccessDealerPortal(user)) {
    return <AccessDenied message={MESSAGES.dealer} action="profile" />;
  }

  if (require === "admin" && !canAccessAdmin(user)) {
    return <AccessDenied message={MESSAGES.admin} action="home" />;
  }

  if (require === "superadmin" && !canManageRoles(user)) {
    return <AccessDenied message={MESSAGES.admin} action="home" />;
  }

  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  return <RouteGuard require="auth">{children}</RouteGuard>;
}

export function RequireMember({ children }: { children: ReactNode }) {
  return <RouteGuard require="member">{children}</RouteGuard>;
}

export function RequireDealer({ children }: { children: ReactNode }) {
  return <RouteGuard require="dealer">{children}</RouteGuard>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return <RouteGuard require="admin">{children}</RouteGuard>;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  return <RouteGuard require="superadmin">{children}</RouteGuard>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
