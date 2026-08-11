export type ChatV3ExpertMode =
  | "AUTO"
  | "BUYING"
  | "MAINTENANCE"
  | "REPAIR"
  | "INSURANCE"
  | "FINANCE";

export const CHAT_V3_EXPERT_MODES: ChatV3ExpertMode[] = [
  "AUTO",
  "BUYING",
  "MAINTENANCE",
  "REPAIR",
  "INSURANCE",
  "FINANCE",
];

export type ChatV3WorkspaceItemType =
  | "VEHICLE"
  | "COMPARISON"
  | "CHECKLIST"
  | "SUMMARY"
  | "MAINTENANCE_PLAN"
  | "REPAIR_NOTE"
  | "COST_ESTIMATE"
  | "INSURANCE_NOTE"
  | "FINANCE_NOTE"
  | "BUSINESS_PLACE"
  | "GENERIC_CARD";

export type ChatV3CreationMode =
  | "AUTO_CREATE"
  | "SUGGEST_CONFIRMATION"
  | "NEVER_CREATE_WITHOUT_EXPLICIT_REQUEST";

export type ChatV3ConfirmationState =
  | "NOT_REQUIRED"
  | "PENDING_USER_CONFIRM"
  | "CONFIRMED"
  | "REJECTED";

export type ChatV3MessageRole = "user" | "assistant" | "system";

export interface ChatV3Conversation {
  id: string;
  title: string;
  activeExpertMode: ChatV3ExpertMode;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  archived: boolean;
}

export type ChatV3MessageActionType = "open_workspace";

export interface ChatV3MessageAction {
  id: string;
  label: string;
  type: ChatV3MessageActionType;
}

export interface ChatV3Message {
  id: string;
  conversationId: string;
  role: ChatV3MessageRole;
  content: string;
  createdAt: string;
  status: "complete" | "failed" | "thinking";
  actions?: ChatV3MessageAction[];
  attachmentReadiness?: {
    text: "ready";
    image: "placeholder";
    document: "placeholder";
    microphone: "placeholder";
  };
}

export interface ChatV3WorkspaceItem {
  id: string;
  conversationId: string;
  type: ChatV3WorkspaceItemType | string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  sourceMessageIds: string[];
  order: number;
  creationMode: ChatV3CreationMode;
  confirmationState: ChatV3ConfirmationState;
  editable: boolean;
  createdAt: string;
  updatedAt: string;
}
