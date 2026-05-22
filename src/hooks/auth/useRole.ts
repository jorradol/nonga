import { useAuth } from "./useAuth";
import { UserRole, hasPermission, ROLE_CONFIGS, MEMBERSHIP_DISPLAY } from "../../utils/rbac";

export function useRole() {
  const { user } = useAuth();

  // Safe fallback to 'guest' role if not signed in or undefined
  const role: UserRole = (user?.role as UserRole) || "guest";

  const isGuest = role === "guest";
  const isMember = role === "member";
  const isDealer = role === "dealer";
  const isPremium = role === "premium";
  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperAdmin = role === "superadmin";

  const permissions = ROLE_CONFIGS[role];
  const membershipDisplay = MEMBERSHIP_DISPLAY[role];

  // Expose check helper directly
  const can = (action: keyof typeof permissions) => {
    return hasPermission(role, action);
  };

  // Safe posting limit count calculations
  const totalPosts = user?.totalPosts || 0;
  const postLimit = user?.postLimit ?? permissions.postLimit;
  const canPostMore = totalPosts < postLimit;
  const remainingPosts = postLimit === Infinity ? "ไม่จำกัด" : Math.max(0, postLimit - totalPosts).toString();

  return {
    role,
    isGuest,
    isMember,
    isDealer,
    isPremium,
    isAdmin,
    isSuperAdmin,
    permissions,
    membershipDisplay,
    can,
    totalPosts,
    postLimit,
    canPostMore,
    remainingPosts
  };
}
