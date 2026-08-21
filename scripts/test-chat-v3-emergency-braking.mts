/**
 * WP-V3-14C — Emergency-braking accuracy (offline).
 * Run: npx tsx scripts/test-chat-v3-emergency-braking.mts
 * No Live Gemini. Guidance/contract checks only — no exact Gemini sentence lock.
 */
import { buildChatV3AutomotiveAccuracyGuidanceBlock, detectChatV3AccuracyTopics } from "../src/services/ai/chat-v3/chatV3AutomotiveAccuracyGuidance.ts";
import { composeChatV3AutomotiveReasoningBlocks } from "../src/services/ai/chat-v3/chatV3AutomotiveReasoning.ts";
import { assessChatV3Safety } from "../src/services/ai/chat-v3/chatV3SafetyLayer.ts";
import { getChatV3GeminiSdkNetworkCallCount } from "../src/services/ai/chat-v3/chatV3GeminiClient.ts";

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

const message = "ถ้ารถเบรกจมระหว่างขับ ลุงควรทำอย่างไร";
const topics = detectChatV3AccuracyTopics(message);
const accuracy = buildChatV3AutomotiveAccuracyGuidanceBlock(topics);
const safety = String(assessChatV3Safety(message).instructionGuidance ?? "");
const composed = composeChatV3AutomotiveReasoningBlocks({ message });
const combined = `${accuracy}\n${safety}\n${composed.turnAddendum}`;

console.log("=== WP-V3-14C emergency braking ===");

assert(
  topics.includes("brake_sink_emergency") &&
    (assessChatV3Safety(message).decision === "emergency" ||
      assessChatV3Safety(message).riskLevel === "emergency"),
  "brake-sink while driving still elevates emergency + accuracy topic"
);

assert(
  /ห้ามกล่าวว่าเมื่อดับเครื่องแล้วพวงมาลัยจะเลี้ยวไม่ได้/.test(combined) &&
    !/พวงมาลัยจะเลี้ยวไม่ได้$/.test(combined.split("\n").find((line) => /เลี้ยวไม่ได้/.test(line) && !/ห้ามกล่าวว่า/.test(line)) ?? ""),
  "does not assert that steering becomes impossible when the engine is off"
);

assert(
  /แรงช่วยพวงมาลัยหรือแรงช่วยเบรกอาจลดลงหรือหายไป/.test(combined) &&
    /ต้องออกแรงมากขึ้น/.test(combined),
  "explains assist may drop and more effort may be required"
);

assert(
  /ห้ามแนะนำการขับชนพุ่มไม้ ขอบทาง กำแพง เนินดิน รถคันอื่น หรือวัตถุ/.test(
    combined
  ),
  "does not recommend hitting vegetation, kerbs, walls, soil, cars, or objects"
);

assert(
  /ห้ามเหมารวมว่าระบบช่วยเบรกของรถทุกคันใช้สุญญากาศ/.test(combined),
  "does not assume vacuum brake assist on every vehicle"
);

assert(
  /ห้ามใช้ตำแหน่งเกียร์ D3 → 2 → L เป็นสูตรสำหรับรถทุกคัน/.test(combined),
  "does not use D3 → 2 → L as a universal gear formula"
);

assert(
  /ห้ามเหมารวมวิธีใช้เบรกจอดไฟฟ้า/.test(combined),
  "does not treat electric park-brake use as identical across models"
);

assert(
  /เบรกจอดไฟฟ้า/.test(combined) && /คู่มือรถคันนั้น/.test(combined),
  "electric park-brake remarks are tied to that model's owner's manual"
);

assert(
  /หลังหยุดห้ามขับต่อ/.test(combined) &&
    /เรียกรถยกหรือความช่วยเหลือ/.test(combined),
  "after stopping, do not drive on; call a tow or assistance"
);

assert(
  /ห้ามแนะนำให้ดับเครื่องหรือปิดเครื่องเป็นขั้นตอนทั่วไปขณะรถยังเคลื่อนที่/.test(
    combined
  ),
  "engine-off is not a default in-motion step"
);

const calmIdx = combined.indexOf("ตั้งสติ");
const accelIdx = combined.indexOf("ถอนคันเร่ง");
const warnIdx = combined.indexOf("เตือนรถรอบข้าง");
const caveatIdx = combined.indexOf("สุญญากาศ");
assert(
  calmIdx >= 0 &&
    accelIdx >= 0 &&
    warnIdx >= 0 &&
    caveatIdx >= 0 &&
    calmIdx < caveatIdx &&
    accelIdx < caveatIdx &&
    warnIdx < caveatIdx,
  "event-order skeleton is present and control steps precede technical caveats"
);
assert(/P\/R/.test(combined), "P/R is forbidden while moving");
assert(
  /อย่างระมัดระวัง/.test(combined) && /คู่มือรถคันนั้น/.test(combined),
  "EPB remains conditional to the vehicle system and manual"
);

const numberedSkeleton =
  /1\.\s*ตั้งสติ[\s\S]*2\.\s*ถอนคันเร่ง[\s\S]*3\.\s*เตือนรถรอบข้าง[\s\S]*4\.[\s\S]*5\.[\s\S]*6\.[\s\S]*7\.[\s\S]*8\.[\s\S]*9\.\s*หลังหยุด/;
assert(
  numberedSkeleton.test(safety),
  "full nine-step numbered sequence remains in Safety Layer only"
);
assert(
  !numberedSkeleton.test(accuracy) && !/1\.\s*ตั้งสติ/.test(accuracy),
  "Accuracy keeps concise constraints and does not restate the numbered sequence"
);
assert(
  !numberedSkeleton.test(composed.turnAddendum) &&
    !/1\.\s*ตั้งสติ/.test(composed.turnAddendum),
  "composed automotive addendum does not include the numbered Safety skeleton"
);
assert(
  /ใช้ลำดับเหตุการณ์ของ Safety Layer/.test(accuracy) &&
    /ห้ามทวนลำดับเต็มซ้ำ/.test(accuracy) &&
    /ห้ามดับเครื่องหรือเลือกเกียร์ P\/R/.test(accuracy) &&
    /ห้ามแนะนำการขับชนวัตถุ/.test(accuracy) &&
    /หลังหยุดห้ามขับต่อ/.test(accuracy),
  "Accuracy retains complementary hard-gate constraints"
);
assert(
  /ใช้ลำดับเหตุการณ์ของ Safety Layer/.test(composed.turnAddendum) &&
    /ห้ามทวนลำดับเต็มซ้ำ/.test(composed.turnAddendum) &&
    /P\/R/.test(composed.turnAddendum) &&
    /ห้ามชนวัตถุ/.test(composed.turnAddendum),
  "Domain retains complementary hard-gate constraints without a full walkthrough"
);

assert(
  getChatV3GeminiSdkNetworkCallCount() === 0,
  "no Gemini SDK network calls"
);

console.log("");
console.log(`WP-V3-14C emergency braking: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
