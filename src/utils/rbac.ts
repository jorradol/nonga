// Role definition configurations and permission maps for Nong A

export type UserRole = "guest" | "member" | "dealer" | "premium" | "admin" | "superadmin";

export interface RolePermissions {
  canPostCars: boolean;
  canViewDealers: boolean;
  canUsePremiumAI: boolean;
  canManageUsers: boolean;
  canManageDealers: boolean;
  canManageAllCars: boolean;
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
    postLimit: 0,
  },
  member: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: false,
    canManageUsers: false,
    canManageDealers: false,
    canManageAllCars: false,
    postLimit: 5,
  },
  dealer: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: false,
    canManageDealers: true, // Dealers can manage showrooms
    canManageAllCars: false,
    postLimit: Infinity, // Unlimited posts
  },
  premium: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: false,
    canManageDealers: false,
    canManageAllCars: false,
    postLimit: Infinity, // Unlimited posts
  },
  admin: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: true,
    canManageDealers: true,
    canManageAllCars: true,
    postLimit: Infinity,
  },
  superadmin: {
    canPostCars: true,
    canViewDealers: true,
    canUsePremiumAI: true,
    canManageUsers: true,
    canManageDealers: true,
    canManageAllCars: true,
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

/**
 * Validates if user list posting count is under boundary limit
 */
export function canAddListing(role: UserRole | undefined, totalPosts: number): boolean {
  if (!role) return false;
  const config = ROLE_CONFIGS[role];
  return totalPosts < config.postLimit;
}
