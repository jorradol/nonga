import {
  CHAT_V3_EXPERT_MODES,
  type ChatV3Conversation,
  type ChatV3ExpertMode,
  type ChatV3Message,
  type ChatV3WorkspaceItem,
} from "../contracts/chatV3Contracts";

const now = new Date().toISOString();

export const chatV3MockConversations: ChatV3Conversation[] = [
  {
    id: "conv-v3-001",
    title: "วางแผนซื้อ SUV ครอบครัว",
    activeExpertMode: "BUYING",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    archived: false,
  },
  {
    id: "conv-v3-002",
    title: "สรุปค่าเคลมประกันหลังชน",
    activeExpertMode: "INSURANCE",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    archived: false,
  },
  {
    id: "conv-v3-003",
    title: "Checklist ก่อนรับรถมือสอง",
    activeExpertMode: "AUTO",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    archived: false,
  },
];

export const chatV3MockMessages: ChatV3Message[] = [
  {
    id: "msg-v3-001",
    conversationId: "conv-v3-001",
    role: "user",
    content: "อยากเทียบ SUV 7 ที่นั่งในงบประมาณ 1.2 ล้านบาท",
    createdAt: now,
    status: "complete",
    attachmentReadiness: {
      text: "ready",
      image: "placeholder",
      document: "placeholder",
      microphone: "placeholder",
    },
  },
  {
    id: "msg-v3-002",
    conversationId: "conv-v3-001",
    role: "assistant",
    content:
      "ได้ครับ สรุปตัวเลือกหลักในงบประมาณของคุณดังนี้\n\n**จุดที่ควรเทียบ**\n- พื้นที่นั่ง 7 ที่และความสูงหลังคา\n- อัตราสิ้นเปลืองจริงในเมือง\n- ค่าบำรุงรักษารายปีและศูนย์บริการ\n\nผมเตรียมตารางเปรียบเทียบไว้ใน Workspace แล้ว คุณสามารถเปิดดูรายละเอียดได้ทันที",
    createdAt: now,
    status: "complete",
    actions: [
      {
        id: "open-workspace-comparison",
        label: "เปิด Workspace",
        type: "open_workspace",
      },
      {
        id: "view-comparison-detail",
        label: "ดูรายละเอียด",
        type: "open_workspace",
      },
    ],
  },
  {
    id: "msg-v3-003",
    conversationId: "conv-v3-002",
    role: "assistant",
    content:
      "สร้างสรุปค่าเสียหายและเอกสารที่ต้องใช้สำหรับเคลมประกันเบื้องต้นแล้ว\n\n1. บันทึกภาพความเสียหาย\n2. สำเนาทะเบียนรถ\n3. ใบขับขี่และกรมธรรม์\n\nเปิด Workspace เพื่อตรวจรายการเอกสารได้ครับ",
    createdAt: now,
    status: "complete",
    actions: [
      {
        id: "open-workspace-insurance",
        label: "เปิด Workspace",
        type: "open_workspace",
      },
    ],
  },
];

export const chatV3MockWorkspaceItems: ChatV3WorkspaceItem[] = [
  {
    id: "ws-v3-001",
    conversationId: "conv-v3-001",
    type: "COMPARISON",
    title: "ตารางเทียบ SUV 7 ที่นั่ง",
    summary: "เทียบราคา อัตราสิ้นเปลือง และค่าบำรุงรักษา 3 รุ่น",
    payload: { rows: 3, currency: "THB" },
    sourceMessageIds: ["msg-v3-001", "msg-v3-002"],
    order: 1,
    creationMode: "AUTO_CREATE",
    confirmationState: "NOT_REQUIRED",
    editable: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "ws-v3-001x",
    conversationId: "conv-v3-001",
    type: "UNSUPPORTED_REPORT",
    title: "รายงานนอกสัญญา",
    summary: "ใช้ทดสอบ fallback ของรายการประเภทที่ยังไม่รองรับ",
    payload: { legacy: true },
    sourceMessageIds: ["msg-v3-002"],
    order: 2,
    creationMode: "NEVER_CREATE_WITHOUT_EXPLICIT_REQUEST",
    confirmationState: "NOT_REQUIRED",
    editable: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "ws-v3-002",
    conversationId: "conv-v3-002",
    type: "INSURANCE_NOTE",
    title: "สรุปเอกสารเคลมประกัน",
    summary: "ระบุเอกสารบังคับและลำดับการยื่นเคลม",
    payload: { docs: ["สำเนาทะเบียนรถ", "ภาพความเสียหาย"] },
    sourceMessageIds: ["msg-v3-003"],
    order: 1,
    creationMode: "SUGGEST_CONFIRMATION",
    confirmationState: "PENDING_USER_CONFIRM",
    editable: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "ws-v3-003",
    conversationId: "conv-v3-001",
    type: "FINANCE_NOTE",
    title: "ประมาณการค่างวดเบื้องต้น",
    summary: "ตัวอย่างค่างวดสำหรับงบ 1.2 ล้านบาท ดาวน์ 20%",
    payload: { downPaymentPercent: 20 },
    sourceMessageIds: ["msg-v3-002"],
    order: 3,
    creationMode: "SUGGEST_CONFIRMATION",
    confirmationState: "NOT_REQUIRED",
    editable: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const chatV3MockModeDescription: Record<ChatV3ExpertMode, string> = {
  AUTO: "ผู้ช่วยยานยนต์ทั่วไป เลือกบริบทที่เหมาะกับการสนทนา",
  BUYING: "ช่วยเลือกรถยนต์ เทียบรุ่น ราคา และความคุ้มค่า",
  MAINTENANCE: "ช่วยเรื่องมอเตอร์ไซค์และการดูแลประจำวัน",
  REPAIR: "ช่วยวิเคราะห์อาการเสียและแผนซ่อมบำรุง",
  INSURANCE: "ช่วยเรื่องประกันภัยและการเคลมเบื้องต้น",
  FINANCE: "ช่วยคำนวณค่างวดและภาระสินเชื่อรถ",
};

export const chatV3MockExpertModes = CHAT_V3_EXPERT_MODES;
