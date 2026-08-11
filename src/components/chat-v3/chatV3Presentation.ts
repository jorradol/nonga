import type { ChatV3ExpertMode, ChatV3WorkspaceItem } from "./contracts/chatV3Contracts";

export const CHAT_V3_ASSISTANT_NAME = "น้องเอ";

export const chatV3ExpertModeThaiLabel: Record<ChatV3ExpertMode, string> = {
  AUTO: "ยานยนต์ทั่วไป",
  BUYING: "รถยนต์",
  MAINTENANCE: "มอเตอร์ไซค์",
  REPAIR: "ซ่อมและบำรุงรักษา",
  INSURANCE: "ประกันภัย",
  FINANCE: "สินเชื่อรถ",
};

const workspaceTypeLabelMap: Record<string, string> = {
  VEHICLE: "รายการรถ",
  COMPARISON: "เปรียบเทียบรถ",
  CHECKLIST: "รายการตรวจสอบ",
  SUMMARY: "สรุปบทสนทนา",
  MAINTENANCE_PLAN: "แผนดูแลรถ",
  REPAIR_NOTE: "แผนซ่อม",
  COST_ESTIMATE: "ตารางผ่อน",
  INSURANCE_NOTE: "เอกสารประกัน",
  FINANCE_NOTE: "สินเชื่อรถยนต์",
  BUSINESS_PLACE: "แผนที่ในอนาคต",
  GENERIC_CARD: "การ์ดงานทั่วไป",
};

export function resolveWorkspaceTypeLabel(item: ChatV3WorkspaceItem): string {
  return workspaceTypeLabelMap[item.type] ?? "รายการพิเศษ";
}

export function formatThaiDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const chatV3StarterPrompts = [
  "ช่วยเลือกรถให้เหมาะกับงบ",
  "รถมีอาการผิดปกติ ควรตรวจอะไร",
  "เปรียบเทียบประกันรถ",
  "คำนวณค่างวดรถเบื้องต้น",
] as const;

export const chatV3WelcomeTitle = "สวัสดีครับ ผมน้องเอ";
export const chatV3WelcomeSubtitle =
  "ผู้ช่วยเรื่องยานยนต์ พร้อมช่วยเลือกรถ ดูแลซ่อม ประกัน และสินเชื่อแบบคุยกันง่าย ๆ";
