// Role definition configurations and permission maps for Nong A

export type UserRole =
  | "guest"
  | "member"
  | "dealer"
  | "premium"
  | "admin"
  | "superadmin";

export type AuthRole = UserRole;

export type UserStatus = "active" | "pending" | "suspended";

export type DealerMembershipStatus = "active" | "pending" | "disabled";

export type DealerRoleInDealer = "owner" | "staff";

export interface UserAuthProfile {
  uid: string;
  email: string;
  displayName: string;
  role: AuthRole;
  status: UserStatus;
  dealerId?: string;
  dealerName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealerMembership {
  uid: string;
  dealerId: string;
  dealerName?: string;
  roleInDealer: DealerRoleInDealer;
  status: DealerMembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermissions {
  canPostCars: boolean;
  canViewDealers: boolean;
  canUsePremiumAI: boolean;
  canManageUsers: boolean;
  canManageDealers: boolean;
  canManageAllCars: boolean;
  canAccessDealerPortal: boolean;
  canCreateListing: boolean;
  canManageOwnDealerListings: boolean;
  canAccessAdmin: boolean;
  canManageRoles: boolean;
  postLimit: number;
}

export const ROLE_CONFIGS: Record<UserRole, RolePermissions> = {
  guest: {
    canPostCars: false,
    canViewDealers: true,
    canUsePremiumAI: false,
    canManageUsers: false,
    canManageDealers: false,
    canManageAllCars: false,
    canAccessDealerPortal: false,
    canCreateListing: false,
    canManageOwnDealerListings: false,
    canAccessAdmin: false,
    canManageRoles: false,
    postLimit: 0,
  },
  member: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: false,
    canManageUsers: false,
    canManageDealers: false,
    canManageAllCars: false,
    canAccessDealerPortal: false,
    canCreateListing: false,
    canManageOwnDealerListings: false,
    canAccessAdmin: false,
    canManageRoles: false,
    postLimit: 5,
  },
  dealer: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: false,
    canManageDealers: true, // Dealers can manage showrooms
    canManageAllCars: false,
    canAccessDealerPortal: true,
    canCreateListing: true,
    canManageOwnDealerListings: true,
    canAccessAdmin: false,
    canManageRoles: false,
    postLimit: Infinity, // Unlimited posts
  },
  premium: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: false,
    canManageDealers: false,
    canManageAllCars: false,
    canAccessDealerPortal: false,
    canCreateListing: false,
    canManageOwnDealerListings: false,
    canAccessAdmin: false,
    canManageRoles: false,
    postLimit: Infinity, // Unlimited posts
  },
  admin: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: true,
    canManageDealers: true,
    canManageAllCars: true,
    canAccessDealerPortal: true,
    canCreateListing: true,
    canManageOwnDealerListings: true,
    canAccessAdmin: true,
    canManageRoles: false,
    postLimit: Infinity,
  },
  superadmin: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: true,
    canManageDealers: true,
    canManageAllCars: true,
    canAccessDealerPortal: true,
    canCreateListing: true,
    canManageOwnDealerListings: true,
    canAccessAdmin: true,
    canManageRoles: true,
    postLimit: Infinity,
  }
};

export interface MembershipDetails {
  name: string;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
  desc: string;
}

export const MEMBERSHIP_DISPLAY: Record<UserRole, MembershipDetails> = {
  guest: {
    name: "ผู้เยี่ยมชม (Guest)",
    badgeColor: "bg-slate-500/10",
    textColor: "text-slate-400",
    borderColor: "border-slate-500/20",
    icon: "👤",
    desc: "สำรวจตลาดรถยนต์ คุยกับบอตระดับพื้นฐาน"
  },
  member: {
    name: "สมาชิกฟรี (Member)",
    badgeColor: "bg-indigo-500/10",
    textColor: "text-indigo-400",
    borderColor: "border-indigo-500/20",
    icon: "🌟",
    desc: "โพสต์ขายรถได้ 5 คัน และคุยกับ Nong A"
  },
  dealer: {
    name: "ดีลเลอร์ผู้เชี่ยวชาญ (Dealer)",
    badgeColor: "bg-teal-500/10",
    textColor: "text-teal-400",
    borderColor: "border-teal-500/20",
    icon: "🤝",
    desc: "โพสต์รถได้ไม่จำกัดจำนวน เข้าถึงห้องควบคุมดีลเลอร์"
  },
  premium: {
    name: "สมาชิกระดับพรีเมียม (Premium)",
    badgeColor: "bg-amber-500/10",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    icon: "👑",
    desc: "โพสต์รถไม่จำกัด นำเสนอรายงานวิเคราะห์ Nong A AI ขั้นรุ่งโรจน์"
  },
  admin: {
    name: "ผู้ดูแลระบบ (Admin)",
    badgeColor: "bg-orange-500/10",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/20",
    icon: "🔐",
    desc: "กำกับและอนุมัติความถูกต้องของฐานระบบ"
  },
  superadmin: {
    name: "ผู้ตรวจสูงสุด (Superadmin)",
    badgeColor: "bg-red-500/10",
    textColor: "text-red-400",
    borderColor: "border-red-500/20",
    icon: "🔱",
    desc: "กำกับสิทธิ์ จัดการบทบาท และระบบควบคุมเบื้องหลังสูงสุด"
  }
};

/**
 * Checks if a role has permission to perform an action
 */
export function hasPermission(role: UserRole | undefined, action: keyof RolePermissions): boolean {
  if (!role) return false;
  const val = ROLE_CONFIGS[role]?.[action];
  return typeof val === "boolean" ? val : false;
}

type RoleInput =
  | UserRole
  | {
      role?: string | null;
      status?: string | null;
      dealerId?: string | null;
    }
  | null
  | undefined;

function roleFrom(input: RoleInput): UserRole {
  const role = typeof input === "string" ? input : input?.role;
  return isKnownRole(role) ? role : "guest";
}

function statusFrom(input: RoleInput): UserStatus {
  if (typeof input === "string") return "active";
  const status = input?.status;
  if (status === "pending" || status === "suspended") return status;
  return "active";
}

function dealerIdFrom(input: RoleInput): string | null {
  if (typeof input === "string") return null;
  const dealerId = input?.dealerId?.trim();
  return dealerId || null;
}

export function isKnownRole(role: unknown): role is UserRole {
  return (
    role === "guest" ||
    role === "member" ||
    role === "premium" ||
    role === "dealer" ||
    role === "admin" ||
    role === "superadmin"
  );
}

export function normalizeRole(role: unknown): UserRole {
  return isKnownRole(role) ? role : "guest";
}

export function isGuest(input: RoleInput): boolean {
  return roleFrom(input) === "guest";
}

export function isMember(input: RoleInput): boolean {
  return roleFrom(input) === "member";
}

export function isPremium(input: RoleInput): boolean {
  return roleFrom(input) === "premium";
}

export function isDealer(input: RoleInput): boolean {
  return roleFrom(input) === "dealer";
}

export function isAdmin(input: RoleInput): boolean {
  const role = roleFrom(input);
  return role === "admin" || role === "superadmin";
}

export function isSuperAdmin(input: RoleInput): boolean {
  return roleFrom(input) === "superadmin";
}

export function isSuspended(input: RoleInput): boolean {
  return statusFrom(input) === "suspended";
}

export function isActiveUser(input: RoleInput): boolean {
  return statusFrom(input) === "active";
}

export function canAccessDealerPortal(input: RoleInput): boolean {
  if (!isActiveUser(input)) return false;
  const role = roleFrom(input);
  if (role === "dealer" || role === "admin" || role === "superadmin") {
    return true;
  }
  return role === "premium" && Boolean(dealerIdFrom(input));
}

export function canCreateListing(input: RoleInput): boolean {
  return canAccessDealerPortal(input);
}

export function canManageOwnDealerListings(input: RoleInput): boolean {
  return canAccessDealerPortal(input);
}

export function canAccessAdmin(input: RoleInput): boolean {
  return isActiveUser(input) && isAdmin(input);
}

export function canManageRoles(input: RoleInput): boolean {
  return isActiveUser(input) && isSuperAdmin(input);
}

export function getRoleFlags(input: RoleInput) {
  const role = roleFrom(input);
  return {
    role,
    status: statusFrom(input),
    isGuest: isGuest(input),
    isMember: isMember(input),
    isPremium: isPremium(input),
    isDealer: isDealer(input),
    isAdmin: isAdmin(input),
    isSuperAdmin: isSuperAdmin(input),
    isSuspended: isSuspended(input),
    canAccessDealerPortal: canAccessDealerPortal(input),
    canCreateListing: canCreateListing(input),
    canManageOwnDealerListings: canManageOwnDealerListings(input),
    canAccessAdmin: canAccessAdmin(input),
    canManageRoles: canManageRoles(input),
  };
}

/**
 * Validates if user list posting count is under boundary limit
 */
export function canAddListing(role: UserRole | undefined, totalPosts: number): boolean {
  if (!role) return false;
  const config = ROLE_CONFIGS[role];
  return totalPosts < config.postLimit;
}
