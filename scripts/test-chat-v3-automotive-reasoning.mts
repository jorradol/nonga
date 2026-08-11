/**
 * WP-V3-09 — Automotive conversation reasoning core (offline / deterministic).
 * Run: npx tsx scripts/test-chat-v3-automotive-reasoning.mts
 * Does NOT call Live Gemini.
 */
import {
  analyzeChatV3AutomotiveTurn,
  buildChatV3AutomotiveReasoningPrinciples,
  buildChatV3AutomotiveTurnAddendum,
  composeChatV3AutomotiveReasoningBlocks,
  type ChatV3AutomotiveVehicleContext,
} from "../src/services/ai/chat-v3/chatV3AutomotiveReasoning.ts";
import { buildChatV3SystemInstruction } from "../src/services/ai/chat-v3/chatV3SystemInstruction.ts";
import {
  validateChatV3ConversationRequest,
  type ChatV3AutomotiveVehicleContextDto,
} from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";

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

const twoVehicles: ChatV3AutomotiveVehicleContext = {
  selectedVehicleId: null,
  vehicles: [
    {
      id: "veh-a",
      label: "Toyota Fortuner 2019",
      summary: "SUV 7 ที่นั่ง",
      facts: { year: "2019", fuel: "diesel" },
    },
    {
      id: "veh-b",
      label: "Honda CR-V 2020",
      summary: "SUV 5 ที่นั่ง",
      facts: { year: "2020", fuel: "hybrid" },
    },
  ],
};

const selectedFortuner: ChatV3AutomotiveVehicleContext = {
  selectedVehicleId: "veh-a",
  vehicles: twoVehicles.vehicles,
};

// 1) Car choice with insufficient info
{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "ช่วยเลือกรถให้หน่อย",
  });
  assert(
    analysis.primaryIntent === "compare_or_choose" &&
      analysis.needsClarification === true &&
      Boolean(analysis.clarificationFocus),
    "1) insufficient car-choice info asks one meaningful clarification"
  );
}

// 2) Follow-up “คันนี้” with selected vehicle
{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "คันนี้กินน้ำมันไหม",
    vehicleContext: selectedFortuner,
  });
  assert(
    analysis.hasVehicleReference &&
      analysis.vehicleReferenceResolution === "resolved" &&
      analysis.resolvedVehicleId === "veh-a" &&
      analysis.needsClarification === false,
    "2) คันนี้ resolves to selected vehicle"
  );
  const addendum = buildChatV3AutomotiveTurnAddendum(analysis, selectedFortuner);
  assert(
    addendum.includes("Toyota Fortuner 2019") &&
      addendum.includes("veh-a") &&
      !addendum.includes("Honda CR-V 2020 เป็นคันที่เลือก"),
    "2) turn addendum points at selected Fortuner"
  );
}

// 3) Ambiguous “คันนี้” with multiple vehicles
{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "คันนี้ราคาเท่าไหร่",
    vehicleContext: twoVehicles,
  });
  assert(
    analysis.vehicleReferenceResolution === "ambiguous" &&
      analysis.needsClarification === true &&
      /คันใด|รถคันใด/.test(analysis.clarificationFocus ?? ""),
    "3) ambiguous คันนี้ with multiple cars asks which vehicle"
  );
}

// 4) Current market price / freshness
{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "ราคาตลาดปัจจุบันของ Fortuner ปี 2019 เท่าไหร่",
  });
  assert(
    analysis.freshnessRequired === true &&
      analysis.guidanceNotes.some((note) => /ข้อมูลปัจจุบัน|ตรวจแหล่งข้อมูลล่าสุด|ห้ามแต่ง/.test(note)),
    "4) market-price question flags freshness and no invented current data"
  );
  const principles = buildChatV3AutomotiveReasoningPrinciples();
  assert(
    /ห้ามแกล้งว่าได้ค้นแล้ว|ตรวจข้อมูลล่าสุด|ห้ามแต่งแหล่งอ้างอิง/.test(principles),
    "4) principles forbid pretending to have searched"
  );
}

// 5) Installment assumptions
{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "ค่างวดประมาณเท่าไหร่ถ้ายืมซื้อรถล้านสอง",
  });
  assert(
    analysis.primaryIntent === "budget_or_finance" &&
      analysis.financeAssumptionsRequired === true &&
      analysis.guidanceNotes.some((note) => /ประมาณการ|สมมติฐาน/.test(note)),
    "5) installment question requires labeled assumptions"
  );
}

// 6) General fault symptom
{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "รถสตาร์ทไม่ติดตอนเช้า เป็นอะไรได้บ้าง",
  });
  assert(
    analysis.primaryIntent === "maintenance_or_repair" &&
      analysis.safetyRiskLevel === "general" &&
      analysis.guidanceNotes.some((note) => /ไม่ฟันธงสาเหตุเดียว|แนวทางเบื้องต้น/.test(note)),
    "6) general breakdown stays advisory without over-certainty"
  );
}

// 7) High-risk symptom (brake / fuel smell)
{
  const brake = analyzeChatV3AutomotiveTurn({
    message: "เหยียบเบรกแล้วเบรกอ่อนมาก รู้สึกไม่ค่อยกิน",
  });
  const fuel = analyzeChatV3AutomotiveTurn({
    message: "มีกลิ่นเชื้อเพลิงฉุนในห้องโดยสาร",
  });
  assert(
    brake.safetyRiskLevel === "high" &&
      fuel.safetyRiskLevel === "high" &&
      brake.guidanceNotes.some((note) => /หยุดใช้|พบช่าง|ความปลอดภัย/.test(note)),
    "7) brake / fuel-smell risk elevates safety guidance"
  );
}

// 8) Multi-intent in one message
{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "ช่วยเทียบ SUV ครอบครัวหน่อย แล้วค่างวดประมาณเท่าไหร่",
  });
  assert(
    analysis.isMultiIntent &&
      analysis.intents.includes("compare_or_choose") &&
      analysis.intents.includes("budget_or_finance") &&
      analysis.guidanceNotes.some((note) => /หลายประเด็น|ตอบประเด็นสำคัญก่อน/.test(note)),
    "8) multi-intent message is detected and ordered"
  );
}

// 9) Do not invent specs / prices / sources — instruction + addendum
{
  const instruction = buildChatV3SystemInstruction("BUYING", {
    message: "คันนี้สเปกเครื่องเท่าไหร่",
    vehicleContext: selectedFortuner,
  });
  assert(
    /ห้ามแต่งรถ|ห้ามสร้างรายละเอียดรถที่ไม่มีในบริบท|ห้ามแต่งสเปก/.test(instruction) &&
      instruction.includes("year: 2019") &&
      !/2\.8|cc 2800|แหล่งอ้างอิง: https/.test(instruction),
    "9) instruction keeps only context facts; forbids inventing specs/sources"
  );
}

// 10) Persona / pronoun consistency retained
{
  const instruction = buildChatV3SystemInstruction("AUTO", {
    message: "เล่าให้ฟังหน่อยว่ารถครอบครัวควรดูอะไร",
  });
  assert(
    instruction.includes("น้องเอ") &&
      /สรรพนาม/.test(instruction) &&
      /เพื่อนคู่คิด|วงการรถ/.test(instruction) &&
      /WP-V3-09|แกนคิดเรื่องรถ/.test(instruction),
    "10) persona + pronoun guidance preserved with reasoning core"
  );
}

// Contract: vehicleContext accepted and sanitized
{
  const validated = validateChatV3ConversationRequest({
    conversationId: "conv-v3-test",
    message: "คันนี้ดีไหม",
    history: [],
    expertMode: "BUYING",
    vehicleContext: {
      selectedVehicleId: "veh-a",
      vehicles: [
        { id: "veh-a", label: "Toyota Fortuner 2019", facts: { year: "2019" } },
        { id: "", label: "skip-empty-id" },
      ],
    } satisfies ChatV3AutomotiveVehicleContextDto,
  });
  assert(
    validated.ok === true &&
      validated.ok &&
      validated.value.vehicleContext?.vehicles.length === 1 &&
      validated.value.vehicleContext.selectedVehicleId === "veh-a",
    "contract accepts vehicleContext and drops invalid items"
  );
}

// Compose helper returns principles + addendum
{
  const composed = composeChatV3AutomotiveReasoningBlocks({
    message: "คันนี้เบรกอ่อน",
    vehicleContext: selectedFortuner,
  });
  assert(
    composed.principles.includes("แกนคิดเรื่องรถ") &&
      composed.turnAddendum.includes("ความเสี่ยงความปลอดภัย: high") &&
      composed.analysis.resolvedVehicleId === "veh-a",
    "compose helper wires principles + turn addendum"
  );
}

// Structural: default build still offline-safe (no live provider)
{
  const base = buildChatV3SystemInstruction("AUTO");
  assert(
    base.includes("แกนคิดเรื่องรถ") &&
      !base.includes("[บริบทการคิดรอบนี้]"),
    "default instruction includes principles without turn addendum"
  );
}

console.log("");
console.log(`WP-V3-09 automotive reasoning: ${passed} passed, ${failed} failed`);
console.log("Confirmed: no Live Gemini call in this script.");
if (failed > 0) {
  process.exitCode = 1;
}
