import { normalizeDealerId } from "../../utils/dealerIdentity";
import {
  normalizeRole,
  type AuthRole,
  type DealerRoleInDealer,
  type UserStatus,
} from "../../utils/rbac";

export type PilotProvisionRole = "member" | "dealer" | "admin";

export type PilotProvisionInput = {
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  status?: string;
  dealerId?: string;
  dealerName?: string;
  roleInDealer?: string;
  note?: string;
};

export type PilotProvisionUserDoc = {
  uid: string;
  email: string;
  displayName: string;
  role: PilotProvisionRole;
  status: UserStatus;
  dealerId?: string;
  dealerName?: string;
  pilotNote?: string;
  provisionedBy?: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export function membershipDocId(uid: string, dealerId: string): string {
  return `${uid}_${normalizeDealerId(dealerId)}`;
}

export function normalizePilotStatus(value: unknown): UserStatus | null {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "inactive") return "suspended";
  if (status === "active" || status === "pending" || status === "suspended") {
    return status;
  }
  return null;
}

export function normalizePilotProvisionRole(value: unknown): PilotProvisionRole | null {
  const role = normalizeRole(String(value ?? "").trim());
  if (role === "member" || role === "dealer" || role === "admin") {
    return role;
  }
  return null;
}

export function normalizeRoleInDealer(value: unknown): DealerRoleInDealer {
  return String(value ?? "").trim() === "staff" ? "staff" : "owner";
}

export type ValidatedPilotProvision = {
  uid: string;
  email: string;
  displayName: string;
  role: PilotProvisionRole;
  status: UserStatus;
  dealerId?: string;
  dealerName?: string;
  pilotNote?: string;
  roleInDealer: DealerRoleInDealer;
};

export function validatePilotProvisionRequest(
  input: PilotProvisionInput,
  actorRole: AuthRole
): { ok: true; data: ValidatedPilotProvision } | { ok: false; message: string } {
  const uid = String(input.uid ?? "").trim();
  const email = String(input.email ?? "").trim();
  if (!uid) {
    return { ok: false, message: "กรุณาระบุ uid ของผู้ใช้ที่ล็อกอินด้วย Firebase Auth แล้ว" };
  }

  const role = normalizePilotProvisionRole(input.role);
  if (!role) {
    return {
      ok: false,
      message: "role ต้องเป็น member, dealer หรือ admin เท่านั้น (ห้ามสร้าง superadmin ผ่านหน้านี้)",
    };
  }

  if (role === "admin" && actorRole !== "superadmin") {
    return {
      ok: false,
      message: "เฉพาะ superadmin เท่านั้นที่เปิดสิทธิ์ admin ได้",
    };
  }

  const status = normalizePilotStatus(input.status);
  if (!status) {
    return { ok: false, message: "status ต้องเป็น active, pending หรือ suspended" };
  }

  const dealerIdRaw = String(input.dealerId ?? "").trim();
  const dealerId = dealerIdRaw ? normalizeDealerId(dealerIdRaw) : "";
  if (role === "dealer" && !dealerId) {
    return { ok: false, message: "role=dealer ต้องระบุ dealerId" };
  }

  const displayName = String(input.displayName ?? "").trim() || email || uid;
  const dealerName = String(input.dealerName ?? "").trim();
  const pilotNote = String(input.note ?? "").trim().slice(0, 500);

  return {
    ok: true,
    data: {
      uid,
      email,
      displayName,
      role,
      status,
      ...(role === "dealer" && dealerId ? { dealerId, ...(dealerName ? { dealerName } : {}) } : {}),
      ...(pilotNote ? { pilotNote } : {}),
      roleInDealer: normalizeRoleInDealer(input.roleInDealer),
    },
  };
}

export function canSuspendSuperadmin(
  targetRole: string,
  nextStatus: UserStatus,
  activeSuperadminCount: number
): { ok: true } | { ok: false; message: string } {
  if (targetRole !== "superadmin") return { ok: true };
  if (nextStatus === "active") return { ok: true };
  if (activeSuperadminCount <= 1) {
    return {
      ok: false,
      message: "ไม่สามารถปิดหรือระงับ superadmin คนสุดท้ายที่ active ได้",
    };
  }
  return { ok: true };
}

export function buildPilotUserListItem(raw: Record<string, unknown>) {
  return {
    uid: String(raw.uid ?? ""),
    email: String(raw.email ?? ""),
    displayName: String(raw.displayName ?? ""),
    role: String(raw.role ?? ""),
    status: String(raw.status ?? ""),
    dealerId: raw.dealerId ? String(raw.dealerId) : undefined,
    dealerName: raw.dealerName ? String(raw.dealerName) : undefined,
    updatedAt: String(raw.updatedAt ?? ""),
  };
}
