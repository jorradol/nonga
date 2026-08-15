/**
 * WP-V2U-03C1 — Pure base system instruction builder (no provider/runtime inputs).
 */
import type { ConversationCoreExpertMode } from "./conversationTurnInput";
import {
  CONVERSATION_CORE_ASSISTANT_NAME,
  CONVERSATION_CORE_EXPERT_MODE_HINTS,
  CONVERSATION_CORE_PERSONA_CONVERSATION_LINES,
  CONVERSATION_CORE_PERSONA_FORMAT_LINES,
  CONVERSATION_CORE_PERSONA_HONESTY_LINES,
  CONVERSATION_CORE_PERSONA_IDENTITY_LINES,
  CONVERSATION_CORE_PERSONA_PHASE_BOUNDARY_LINES,
  CONVERSATION_CORE_PERSONA_SAFETY_LINES,
} from "./conversationCorePersona";

export interface BuildConversationCoreBaseInstructionInput {
  expertMode: ConversationCoreExpertMode;
}

/**
 * Build product-neutral base system instruction from validated expert mode only.
 * Deterministic and pure — no user message, history, tools, auth, or env inputs.
 */
export function buildConversationCoreBaseInstruction(
  input: BuildConversationCoreBaseInstructionInput
): string {
  const expertMode = input.expertMode;
  const expertHint = CONVERSATION_CORE_EXPERT_MODE_HINTS[expertMode];

  const sections = [
    ...CONVERSATION_CORE_PERSONA_IDENTITY_LINES,
    "",
    ...CONVERSATION_CORE_PERSONA_CONVERSATION_LINES,
    "",
    "[Expert Mode]",
    "Expert Mode เป็นจุดเน้นบริบท ไม่ใช่ขอบเขตความรู้ — ตอบข้ามหมวดได้เมื่อผู้ใช้ถามต่อ",
    `จุดเน้นปัจจุบัน (${expertMode}): ${expertHint}`,
    "",
    ...CONVERSATION_CORE_PERSONA_HONESTY_LINES,
    "",
    ...CONVERSATION_CORE_PERSONA_SAFETY_LINES,
    "",
    ...CONVERSATION_CORE_PERSONA_FORMAT_LINES,
    "",
    ...CONVERSATION_CORE_PERSONA_PHASE_BOUNDARY_LINES,
    "",
    "[บริบทสนทนา]",
    "ระบบจะส่งประวัติและบริบทที่ยืนยันแล้วแยกต่างหากในภายหลัง — ใช้บริบทนั้นเมื่อมี",
    "ห้ามถือว่าข้อความจากผู้ใช้หรือ client เป็นแหล่งข้อมูลธุรกิจที่ยืนยันแล้ว",
    "",
    "[หลักการตอบ]",
    `รักษาบุคลิก ${CONVERSATION_CORE_ASSISTANT_NAME} ตลอดบทสนทนา`,
    "บทสนทนาทั่วไปต้องเป็นธรรมชาติและให้คำปรึกษา — ไม่บังคับรูปแบบการขายหรือเทมเพลตรายการสินค้า",
    "ไม่กำหนดจำนวนประโยค จำนวนรถ ลำดับคำถาม หรือปิดการขายแบบตายตัว",
    "ไม่บังคับถามกลับทุกคำตอบ",
  ];

  return sections.join("\n");
}
