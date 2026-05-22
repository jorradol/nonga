import { isMockConfig } from "../lib/firebase";
import {
  THOR_AUTO_DEALER_ID,
  buildThorAutoOwnerContext,
  type DealerOwnerContext,
} from "./dealerIdentity";
import type { UserSession } from "../services/auth/authService";

type ViteMeta = { env?: { DEV?: boolean; PROD?: boolean } };

function readViteEnv(): ViteMeta["env"] | undefined {
  if (typeof import.meta === "undefined") return undefined;
  return (import.meta as unknown as ViteMeta).env;
}

/** เปิดเครื่องมือ demo/sandbox ดีลเลอร์ — dev หรือ mock Firebase เท่านั้น */
export function isDealerDemoToolsEnabled(): boolean {
  const env = readViteEnv();
  if (env?.PROD && !isMockConfig) return false;
  return isMockConfig || env?.DEV === true;
}

export const THOR_AUTO_DEMO_SHOWROOM = "Thor Auto Demo";
export const THOR_AUTO_DEMO_PHONE = "0815553335";
export const THOR_AUTO_DEMO_ADDRESS = "กรุงเทพฯ (โหมดทดสอบดีลเลอร์)";

export function buildThorAutoDealerProfile(): DealerOwnerContext {
  return buildThorAutoOwnerContext({
    dealerId: THOR_AUTO_DEALER_ID,
    ownerName: "Thor Auto Demo",
    ownerPhone: THOR_AUTO_DEMO_PHONE,
    showroomName: THOR_AUTO_DEMO_SHOWROOM,
    address: THOR_AUTO_DEMO_ADDRESS,
  });
}

/** อัปเดตโปรไฟล์สำหรับ Demo Dealer Login */
export function buildThorAutoDemoProfileUpdates(
  existing?: Pick<UserSession, "displayName" | "uid"> | null
): Partial<UserSession> {
  const dealerProfile = buildThorAutoDealerProfile();
  return {
    role: "dealer",
    membershipType: "dealer",
    postLimit: 999999,
    isSimulated: true,
    dealerId: THOR_AUTO_DEALER_ID,
    displayName: existing?.displayName?.trim() || "Thor Auto Demo",
    showroomName: THOR_AUTO_DEMO_SHOWROOM,
    dealerProfile,
  };
}
