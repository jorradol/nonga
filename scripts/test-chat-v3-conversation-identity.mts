/**
 * WP-V3-08 — Nong A conversation identity (prompt-structure, offline).
 * Run: npx tsx scripts/test-chat-v3-conversation-identity.mts
 */
import { buildChatV3SystemInstruction } from "../src/services/ai/chat-v3/chatV3SystemInstruction.ts";
import type { ChatV3RuntimeExpertMode } from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS — ${message}`);
    return;
  }
  failed += 1;
  console.error(`FAIL — ${message}`);
}

const modes: ChatV3RuntimeExpertMode[] = [
  "AUTO",
  "BUYING",
  "MAINTENANCE",
  "REPAIR",
  "INSURANCE",
  "FINANCE",
];

const instruction = buildChatV3SystemInstruction("AUTO");

assert(
  instruction.includes("น้องเอ") &&
    /ผู้ช่วยหญิง|ที่ปรึกษาเรื่องรถ/.test(instruction) &&
    instruction.includes("ประเทศไทย"),
  "persona names น้องเอ as female Thai automotive advisor"
);

assert(
  /ประวัติ|ต่อเนื่อง/.test(instruction) && /สรรพนาม/.test(instruction),
  "instruction preserves context and pronouns"
);

assert(
  /ห้ามกล่าวสวัสดีซ้ำ|สวัสดีซ้ำ/.test(instruction) &&
    !/กล่าวสวัสดีทุกข้อความ|สวัสดีทุกข้อความ|ทักทายทุกครั้ง/.test(instruction),
  "no command to greet with สวัสดี on every message"
);

assert(
  instruction.includes("ปังปุริเย่") &&
    /ครั้งคราว|ห้ามใส่ทุกคำตอบ/.test(instruction) &&
    !/ปังปุริเย่[!！]?\s*ทุกคำตอบ|ทุกคำตอบ.*ปังปุริเย่|ทุกข้อความ.*ปังปุริเย่/.test(
      instruction
    ),
  "ปังปุริเย่ is optional accent, not every answer"
);

assert(
  /ห้ามใช้\s*ปังปุริเย่/.test(instruction) &&
    /กลิ่นไหม้|ควัน|ไฟ|เบรก|พวงมาลัย|ฉุกเฉิน/.test(instruction),
  "ปังปุริเย่ banned in danger/serious contexts"
);

assert(
  /ห้ามแต่งรถ|ราคา|ร้าน|อู่|สต็อก|ข้อมูลตลาด/.test(instruction) &&
    /ห้ามอ้างว่าค้นข้อมูลปัจจุบัน/.test(instruction),
  "forbids inventing cars, prices, shops, stock, or market data"
);

assert(
  /เป็นธรรมชาติ|เพื่อนคู่คิด|ไหวพริบ/.test(instruction) &&
    !/5-8 ประโยค|soft CTA|บังคับถาม|จำนวนรถ\s*=/.test(instruction),
  "wording allows natural Gemini replies (no rigid sales template)"
);

assert(
  /ควัน|เปลวไฟ|กลิ่นไหม้|ความปลอดภัยของคนมาก่อน/.test(instruction) &&
    /อย่าแนะนำให้สตาร์ทซ้ำ|ไฟฟ้าลัดวงจร|เพลิงไหม้/.test(instruction),
  "light safety calibration present without a separate safety engine"
);

assert(
  /Service → Trust → Advice → Suitable Vehicle → Consent → Lead/.test(instruction) &&
    /Lead ยังไม่ต้องทำ/.test(instruction),
  "service funnel mentioned; Lead deferred"
);

assert(
  !instruction.includes("แน่นอนว่าต้อง") &&
    /ห้ามฟันธงด้วยคำว่า\s*แน่นอน|คำว่า\s*แน่นอน/.test(instruction),
  "avoids certainty-forcing when causes are ambiguous"
);

for (const mode of modes) {
  const text = buildChatV3SystemInstruction(mode);
  assert(
    text.includes("ไม่ใช่ขอบเขตความรู้") &&
      text.includes("ข้ามหมวด") &&
      text.includes(mode),
    `expert mode ${mode} is a hint with cross-domain allowed`
  );
}

console.log("");
console.log(`WP-V3-08 identity checks: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
