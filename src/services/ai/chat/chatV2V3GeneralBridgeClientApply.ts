/**
 * WP-NVB-02E — Pure Client apply seam for authenticated V.3 General Bridge.
 * Does not authorize V.3. Server-owned marker is the only selected-V.3 signal.
 * Does not set or consume realProviderNetwork as a V.3 selector.
 */
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../chat-v3/chatV3ConversationContracts";

export const CHAT_V3_GENERAL_CONVERSATION_BRAIN = "chat-v3-general" as const;

export const CHAT_V3_GENERAL_CONVERSATION_BRAIN_STATUSES = [
  "success",
  "failed-closed",
] as const;

export type ChatV3GeneralConversationBrain =
  typeof CHAT_V3_GENERAL_CONVERSATION_BRAIN;

export type ChatV3GeneralConversationBrainStatus =
  (typeof CHAT_V3_GENERAL_CONVERSATION_BRAIN_STATUSES)[number];

export interface ParsedChatV3GeneralConversationBrain {
  readonly conversationBrain: ChatV3GeneralConversationBrain;
  readonly conversationBrainStatus: ChatV3GeneralConversationBrainStatus;
}

export type ChatV2V3GeneralBridgeHopStatus =
  | "not-attempted"
  | "success"
  | "failure";

export interface ChatV2V3GeneralBridgeClientApplyInput {
  readonly userMessage: string;
  readonly generalHopAttempted: boolean;
  readonly hopStatus: ChatV2V3GeneralBridgeHopStatus;
  readonly userVisibleText?: string;
  readonly conversationBrain?: unknown;
  readonly conversationBrainStatus?: unknown;
  readonly localOrchestrated?: { readonly text?: string } | null;
  readonly isFollowUpPilot?: boolean;
  readonly realProviderNetwork?: boolean;
}

export type ChatV2V3GeneralBridgeClientApplyResult =
  | {
      readonly action: "adopt-v3";
      readonly text: string;
      readonly skipGemini: true;
      readonly stopClientGemini: true;
      readonly stopMockFallback: true;
    }
  | {
      readonly action: "high-risk-fail-closed";
      readonly text: string;
      readonly skipGemini: true;
      readonly stopClientGemini: true;
      readonly stopMockFallback: true;
    }
  | {
      readonly action: "preserve-existing";
    };

/**
 * Conservative Client fail-closed predicate only.
 * Not a Server lane claim, not a tool router, and not safety advice.
 * Patterns follow Server high-risk-intent categories; education/news/theory
 * are excluded so this never becomes a second classifier.
 */
const CLIENT_NON_OPERATING_EMERGENCY_EXCLUSIONS: readonly RegExp[] = [
  /คืออะไร/,
  /ต่างกันอย่างไร/,
  /ควรเช็ค/,
  /ดูแลอย่างไร/,
  /แนะนำการดูแล/,
  /ข่าว/,
  /ในทางทฤษฎี/,
  /อธิบายหลักการ/,
];

const CLIENT_CLEAR_OPERATING_EMERGENCY_PATTERNS: readonly RegExp[] = [
  /เบรกจม/,
  /เบรกล็อก/,
  /เบรกไม่ทำงาน/,
  /เบรกเสีย/,
  /เบรกหมด/,
  /เบรกไม่อยู่/,
  /เบรกแตก/,
  /แป้นเบรกจม/,
  /เบรก(?:ไม่กิน|หาย|ไม่มี).{0,30}(?:ขับ|วิ่ง|ถนน)/,
  /(?:ขับ|วิ่ง).{0,30}เบรก(?:จม|หาย|ไม่)/,
  /พวงมาลัยล็อก/,
  /พวงมาลัยขัด/,
  /พวงมาลัยหนัก/,
  /พวงมาลัยเลี้ยวไม่ได้/,
  /พวงมาลัยควบคุมไม่ได้/,
  /รถไฟไหม้/,
  /ควันไฟ/,
  /ควันออกจากรถ/,
  /ไฟไหม้/,
  /เครื่องร้อนเกิน/,
  /น้ำร้อนล้น/,
  /เครื่องยนต์ร้อนรุนแรง/,
  /ชนพุ่มไม้/,
  /รถคว่ำ/,
  /รถชน/,
  /อุบัติเหตุ/,
  /ดับเครื่องขณะรถยังเคลื่อนที่/,
  /ดับเครื่องทันทีขณะรถยังวิ่ง/,
  /คันเร่งค้าง/,
  /คันเร่งไม่กลับ/,
  /ยางแตกขณะ(?:ขับ|วิ่ง)/,
  /ยางระเบิดขณะ(?:ขับ|วิ่ง)/,
];

export function isClearHighRiskAutomotiveEmergencyMessage(
  message: string
): boolean {
  const text = String(message ?? "").trim();
  if (!text) return false;
  for (const exclusion of CLIENT_NON_OPERATING_EMERGENCY_EXCLUSIONS) {
    if (exclusion.test(text)) {
      return false;
    }
  }
  for (const pattern of CLIENT_CLEAR_OPERATING_EMERGENCY_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

export function parseServerOwnedChatV3GeneralConversationBrain(
  input: unknown
): ParsedChatV3GeneralConversationBrain | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (record.conversationBrain !== CHAT_V3_GENERAL_CONVERSATION_BRAIN) {
    return null;
  }
  if (record.conversationBrainStatus !== "success" &&
    record.conversationBrainStatus !== "failed-closed"
  ) {
    return null;
  }
  return {
    conversationBrain: CHAT_V3_GENERAL_CONVERSATION_BRAIN,
    conversationBrainStatus: record.conversationBrainStatus,
  };
}

function adoptUnavailable(): Extract<
  ChatV2V3GeneralBridgeClientApplyResult,
  { action: "adopt-v3" }
> {
  return {
    action: "adopt-v3",
    text: CHAT_V3_USER_FACING_UNAVAILABLE,
    skipGemini: true,
    stopClientGemini: true,
    stopMockFallback: true,
  };
}

function adoptText(
  text: string
): Extract<ChatV2V3GeneralBridgeClientApplyResult, { action: "adopt-v3" }> {
  return {
    action: "adopt-v3",
    text,
    skipGemini: true,
    stopClientGemini: true,
    stopMockFallback: true,
  };
}

/**
 * Decide how useChat applies an authenticated General Bridge hop.
 * Follow-up / local orchestrated / realProviderNetwork never select V.3.
 */
export function resolveChatV2V3GeneralBridgeClientApply(
  input: ChatV2V3GeneralBridgeClientApplyInput
): ChatV2V3GeneralBridgeClientApplyResult {
  if (!input.generalHopAttempted) {
    return { action: "preserve-existing" };
  }

  const parsed = parseServerOwnedChatV3GeneralConversationBrain({
    conversationBrain: input.conversationBrain,
    conversationBrainStatus: input.conversationBrainStatus,
  });

  if (parsed && input.hopStatus === "success") {
    const text = String(input.userVisibleText ?? "").trim();
    if (text) {
      return adoptText(text);
    }
    return adoptUnavailable();
  }

  if (isClearHighRiskAutomotiveEmergencyMessage(input.userMessage)) {
    return {
      action: "high-risk-fail-closed",
      text: CHAT_V3_USER_FACING_UNAVAILABLE,
      skipGemini: true,
      stopClientGemini: true,
      stopMockFallback: true,
    };
  }

  return { action: "preserve-existing" };
}
