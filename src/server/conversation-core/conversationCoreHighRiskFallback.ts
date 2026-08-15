/**
 * WP-V2U-03C3 — Deterministic high-risk safe fallback (no user-message classifier).
 */
import {
  getConversationCorePolicyLaneDefinition,
  validateConversationCoreCandidate,
  validateConversationCoreHighRisk,
  validateConversationCoreSafety,
  validateConversationCoreTypography,
  type ConversationCorePolicyLane,
} from "../../services/conversation-core/index";

export const CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT =
  [
    "คำตอบก่อนหน้ายังผ่านการตรวจความปลอดภัยไม่ได้ จึงยังให้คำแนะนำเฉพาะรุ่นหรือวิธีควบคุมรถไม่ได้",
    "",
    "ความปลอดภัยของคนมาก่อนรถ หากเป็นเหตุฉุกเฉิน ให้ติดต่อบริการฉุกเฉินหรือขอความช่วยเหลือตามสถานการณ์ โดยไม่รับประกันผลลัพธ์",
    "",
    "ไม่วินิจฉัยอาการ และไม่สั่งวิธีควบคุมรถเฉพาะรุ่น โปรดอ้างอิงคู่มือรถรุ่นนั้น หรือสอบถามผู้เชี่ยวชาญที่เหมาะสมกับสถานการณ์",
  ].join("\n");

export type ConversationCoreHighRiskFallbackResult =
  | { readonly ok: true; readonly assistantText: string }
  | { readonly ok: false; readonly reasonCode: "fallback-invalid" };

export interface ConversationCoreHighRiskFallbackInput {
  readonly policyLane: ConversationCorePolicyLane;
}

function freezeOk(assistantText: string): ConversationCoreHighRiskFallbackResult {
  return Object.freeze({ ok: true as const, assistantText });
}

function freezeInvalid(): ConversationCoreHighRiskFallbackResult {
  return Object.freeze({ ok: false as const, reasonCode: "fallback-invalid" as const });
}

/**
 * Build a deterministic Thai safe fallback. Does not read or classify the user message.
 */
export function buildConversationCoreHighRiskFallback(
  input: ConversationCoreHighRiskFallbackInput
): ConversationCoreHighRiskFallbackResult {
  if (input.policyLane !== "high-risk-automotive") {
    return freezeInvalid();
  }

  void getConversationCorePolicyLaneDefinition(input.policyLane);

  const assistantText = CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT;
  const context = { policyLane: "high-risk-automotive" as const };

  const typography = validateConversationCoreTypography({ candidateText: assistantText });
  if (typography.outcome !== "accept") {
    return freezeInvalid();
  }

  const safety = validateConversationCoreSafety({ candidateText: assistantText });
  if (safety.outcome !== "accept") {
    return freezeInvalid();
  }

  const highRisk = validateConversationCoreHighRisk({
    candidateText: assistantText,
    context,
  });
  if (highRisk.outcome !== "accept") {
    return freezeInvalid();
  }

  const candidate = validateConversationCoreCandidate({
    candidateText: assistantText,
    context,
  });
  if (candidate.outcome !== "accept") {
    return freezeInvalid();
  }

  return freezeOk(assistantText);
}
