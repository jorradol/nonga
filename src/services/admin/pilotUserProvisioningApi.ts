import { adminAuthHeadersAsync } from "../../utils/apiAuthHeaders";
import type { PilotProvisionInput } from "./pilotUserProvisioningCore";

export type PilotUserListItem = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  dealerId?: string;
  dealerName?: string;
  updatedAt: string;
};

async function adminHeaders(role: "admin" | "superadmin"): Promise<HeadersInit> {
  return adminAuthHeadersAsync(role);
}

export async function fetchPilotUsers(
  role: "admin" | "superadmin",
  limit = 40
): Promise<PilotUserListItem[]> {
  const res = await fetch(`/api/admin/pilot-users?limit=${limit}`, {
    headers: await adminHeaders(role),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.message === "string" ? body.message : "โหลดรายชื่อไม่สำเร็จ");
  }
  return Array.isArray(body.data) ? body.data : [];
}

export async function provisionPilotUser(
  role: "admin" | "superadmin",
  input: PilotProvisionInput
): Promise<{ user: Record<string, unknown>; membershipId?: string }> {
  const res = await fetch("/api/admin/pilot-users/provision", {
    method: "POST",
    headers: await adminHeaders(role),
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.message === "string" ? body.message : "บันทึกไม่สำเร็จ");
  }
  return body.data ?? {};
}
