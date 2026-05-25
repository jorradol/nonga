import { useAuth } from "./useAuth";
import {
  UserRole,
  hasPermission,
  ROLE_CONFIGS,
  MEMBERSHIP_DISPLAY,
  getRoleFlags,
  normalizeRole,
} from "../../utils/rbac";

export function useRole() {
  const { user } = useAuth();

  // Safe fallback to 'guest' role if not signed in or undefined
  const role: UserRole = normalizeRole(user?.role);
  const flags = getRoleFlags(user ?? { role });

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
    status: flags.status,
    isGuest: flags.isGuest,
    isMember: flags.isMember,
    isDealer: flags.isDealer,
    isPremium: flags.isPremium,
    isAdmin: flags.isAdmin,
    isSuperAdmin: flags.isSuperAdmin,
    isSuspended: flags.isSuspended,
    canAccessDealerPortal: flags.canAccessDealerPortal,
    canCreateListing: flags.canCreateListing,
    canManageOwnDealerListings: flags.canManageOwnDealerListings,
    canAccessAdmin: flags.canAccessAdmin,
    canManageRoles: flags.canManageRoles,
    permissions,
    membershipDisplay,
    can,
    totalPosts,
    postLimit,
    canPostMore,
    remainingPosts
  };
}
