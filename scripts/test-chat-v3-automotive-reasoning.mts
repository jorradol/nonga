/**
 * WP-V3-09/10B — Automotive conversation reasoning + expertise packs (offline).
 * Run: npx tsx scripts/test-chat-v3-automotive-reasoning.mts
 * Does NOT call Live Gemini.
 */
import { calculateFlatRateFinance } from "../src/utils/financeCalculator.ts";
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
import { buildChatV3FinanceAssumptionBlock } from "../src/services/ai/chat-v3/chatV3AutomotiveFinanceBlock.ts";

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

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
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

section("WP-V3-09 regression");

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
      analysis.guidanceNotes.some((note) =>
        /ข้อมูลปัจจุบัน|ตรวจแหล่งข้อมูลล่าสุด|ห้ามแต่ง/.test(note)
      ),
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
      analysis.guidanceNotes.some((note) =>
        /ประมาณการ|สมมติฐาน|ห้ามเดา/.test(note)
      ),
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
      analysis.guidanceNotes.some((note) =>
        /ไม่ฟันธงสาเหตุเดียว|แนวทางเบื้องต้น/.test(note)
      ),
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
      brake.guidanceNotes.some((note) =>
        /หยุดใช้|พบช่าง|ความปลอดภัย/.test(note)
      ),
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
      analysis.guidanceNotes.some((note) =>
        /หลายประเด็น|ตอบประเด็นสำคัญก่อน/.test(note)
      ),
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
    /ห้ามแต่งรถ|ห้ามสร้างรายละเอียดรถที่ไม่มีในบริบท|ห้ามแต่งสเปก/.test(
      instruction
    ) &&
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
    base.includes("แกนคิดเรื่องรถ") && !base.includes("[บริบทการคิดรอบนี้]"),
    "default instruction includes principles without turn addendum"
  );
}

section("WP-V3-10B — 8 category domain guidance");

const categoryCases: Array<{
  label: string;
  message: string;
  expectIntent: string;
  expectDomain: string;
}> = [
  {
    label: "buy new/used",
    message: "อยากซื้อรถมือสองคันแรก ช่วยแนะนำหน่อย",
    expectIntent: "compare_or_choose",
    expectDomain: "buy_new_or_used",
  },
  {
    label: "compare use/budget",
    message: "งบไม่เกิน 5 แสน ใช้ในเมือง เทียบเก๋งกับ SUV หน่อย",
    expectIntent: "compare_or_choose",
    expectDomain: "compare_use_budget",
  },
  {
    label: "price/value freshness",
    message: "ราคาตลาดปัจจุบันของรุ่นนี้คุ้มไหม",
    expectIntent: "other",
    expectDomain: "price_value",
  },
  {
    label: "finance",
    message: "อยากรู้ค่างวดถ้าผ่อนรถราคา 800000",
    expectIntent: "budget_or_finance",
    expectDomain: "finance_credit",
  },
  {
    label: "usage/maintenance",
    message: "มอเตอร์ไซค์ใช้งานทุกวัน ควรดูรอบบำรุงรักษายังไง",
    expectIntent: "maintenance_or_repair",
    expectDomain: "usage_maintenance",
  },
  {
    label: "fault diagnosis",
    message: "รถสตาร์ทไม่ติดตอนเช้า เป็นอะไรได้บ้าง",
    expectIntent: "maintenance_or_repair",
    expectDomain: "fault_diagnosis",
  },
  {
    label: "insurance/tax/docs",
    message: "พ.ร.บ. กับประกันชั้น 1 ต่างกันยังไง ต่อภาษีต้องเตรียมอะไร",
    expectIntent: "insurance_tax_admin",
    expectDomain: "insurance_tax_docs",
  },
  {
    label: "sell/prepare",
    message: "จะขายรถ ช่วยดูว่าควรเตรียมอะไรก่อนขาย",
    expectIntent: "sell_or_trade",
    expectDomain: "sell_prepare",
  },
];

for (const item of categoryCases) {
  const analysis = analyzeChatV3AutomotiveTurn({ message: item.message });
  const instruction = buildChatV3SystemInstruction("AUTO", {
    message: item.message,
  });
  const intentOk =
    item.expectIntent === "other"
      ? analysis.freshnessRequired || analysis.intents.length > 0
      : analysis.primaryIntent === item.expectIntent ||
        analysis.intents.includes(item.expectIntent as never);
  assert(
    intentOk && analysis.domainCategories.includes(item.expectDomain as never),
    `category intent/domain — ${item.label}`
  );
  assert(
    instruction.includes("[กรอบความรู้ยานยนต์รอบนี้ — WP-V3-10B]") &&
      instruction.includes(`หมวด ${item.expectDomain}`) &&
      !instruction.includes("น้องเอแนะนำเช็กเบื้องต้นแบบนี้ครับ:") &&
      !instruction.includes("คำนวณเบื้องต้นให้นะครับคุณพี่"),
    `category guidance in runtime instruction — ${item.label}`
  );
}

{
  const instruction = buildChatV3SystemInstruction("AUTO", {
    message: "ราคาตลาดปัจจุบันเท่าไหร่",
  });
  assert(
    /ยังไม่มี Live|ตรวจแหล่งข้อมูลล่าสุด|ห้ามแต่งราคา/.test(instruction) &&
      !/ราคาตลาดปัจจุบันคือ\s*\d/.test(instruction),
    "no invented current market price in instruction"
  );
}

section("WP-V3-10B — history-aware clarification");

{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "ช่วยเลือกรถให้หน่อย",
    history: [
      { role: "user", content: "งบไม่เกิน 5 แสน ใช้ในเมือง" },
      { role: "assistant", content: "รับทราบงบ 5 แสนครับ" },
    ],
  });
  assert(
    analysis.needsClarification === false &&
      analysis.userConstraints.budgetMaxBaht === 500_000 &&
      analysis.userConstraints.usageProfile === "ในเมือง" &&
      analysis.guidanceNotes.some((note) => /ห้ามถามงบซ้ำ/.test(note)),
    "history budget+usage → do not re-ask budget"
  );
}

{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "ช่วยเลือกรถให้หน่อย",
    history: [{ role: "user", content: "งบไม่เกิน 8 แสน" }],
  });
  assert(
    analysis.userConstraints.budgetMaxBaht === 800_000 &&
      analysis.needsClarification === true &&
      /การใช้งาน|ประเภท/.test(analysis.clarificationFocus ?? "") &&
      !/งบประมาณที่มีผล/.test(analysis.clarificationFocus ?? ""),
    "history budget only → ask usage/type, not budget again"
  );
}

{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "งบไม่เกิน 5 แสนแล้ว ช่วยเลือก SUV ครอบครัวหน่อย",
    history: [{ role: "user", content: "งบไม่เกิน 8 แสน" }],
  });
  assert(
    analysis.userConstraints.budgetMaxBaht === 500_000 &&
      analysis.userConstraints.budgetUpdatedThisTurn === true &&
      analysis.guidanceNotes.some((note) => /งบล่าสุด|เปลี่ยนงบ/.test(note)),
    "budget change uses latest value"
  );
}

{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "เปลี่ยนเป็นเกียร์ออโต้กับยี่ห้อ Honda แล้วกัน",
    history: [
      { role: "user", content: "งบไม่เกิน 6 แสน อยากได้เกียร์ธรรมดา Toyota" },
    ],
  });
  assert(
    analysis.userConstraints.transmission === "ออโต้" &&
      /Honda/i.test(analysis.userConstraints.brandPreference ?? "") &&
      analysis.userConstraints.conditionsUpdatedThisTurn === true &&
      analysis.guidanceNotes.some((note) =>
        /เงื่อนไขถูกเปลี่ยน|ตามเงื่อนไขใหม่|เงื่อนไขล่าสุด/.test(note)
      ),
    "condition change updates advice notes"
  );
}

{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "ช่วยเลือกรถให้หน่อย",
    history: [
      {
        role: "assistant",
        content: "งบไม่เกิน 3 แสนใช้ในเมืองเหมาะกับเก๋งเล็กครับ",
      },
    ],
  });
  assert(
    analysis.userConstraints.budgetMaxBaht == null &&
      analysis.userConstraints.usageProfile == null &&
      analysis.needsClarification === true,
    "assistant text is not treated as user constraints"
  );
}

{
  const analysis = analyzeChatV3AutomotiveTurn({
    message: "คันนี้ราคาเท่าไหร่",
    history: [{ role: "user", content: "งบไม่เกิน 5 แสน" }],
    vehicleContext: twoVehicles,
  });
  assert(
    analysis.vehicleReferenceResolution === "ambiguous" &&
      !analysis.resolvedVehicleId,
    "multi-car without selection still does not guess a vehicle"
  );
}

section("WP-V3-10B — deterministic finance");

{
  const message =
    "รถราคา 1200000 ดาวน์ 20% ผ่อน 60 เดือน ดอกเบี้ย 5% ค่างวดเท่าไหร่";
  const expected = calculateFlatRateFinance({
    carPrice: 1_200_000,
    downPaymentPercent: 20,
    annualFlatRatePercent: 5,
    termMonths: 60,
  });
  const block = buildChatV3FinanceAssumptionBlock({
    message,
    financeRelevant: true,
  });
  const analysis = analyzeChatV3AutomotiveTurn({ message });
  const instruction = buildChatV3SystemInstruction("FINANCE", { message });
  assert(block.status === "complete" && Boolean(block.result), "finance complete status");
  assert(
    block.result?.monthlyInstallment === expected.monthlyInstallment &&
      block.result?.totalRepayment === expected.totalRepayment &&
      block.result?.loanAmount === expected.loanAmount,
    "finance numbers match financeCalculator utility"
  );
  assert(
    analysis.financeBlock.status === "complete" &&
      instruction.includes("deterministic") &&
      instruction.includes(String(expected.monthlyInstallment.toLocaleString("th-TH"))) &&
      /ห้ามคำนวณตัวเลขชุดเดียวกันใหม่เอง/.test(instruction),
    "finance assumption block wired into runtime instruction"
  );
}

{
  const message = "ค่างวดประมาณเท่าไหร่ถ้ารถราคา 800000";
  const block = buildChatV3FinanceAssumptionBlock({
    message,
    financeRelevant: true,
  });
  assert(
    block.status === "incomplete" &&
      block.missingFields.length >= 2 &&
      !block.result &&
      /ห้ามเดา/.test(block.instructionText),
    "incomplete finance does not invent a calculation"
  );
}

{
  const message = "รถราคา 500000 ดาวน์ 20 ผ่อน 60 เดือน ดอก 5% ค่างวดเท่าไหร่";
  const block = buildChatV3FinanceAssumptionBlock({
    message,
    financeRelevant: true,
  });
  const analysis = analyzeChatV3AutomotiveTurn({ message });
  assert(
    block.status === "ambiguous_input" &&
      !block.result &&
      /บาท|เปอร์เซ็นต์|ห้ามตีความเงียบ/.test(block.instructionText) &&
      analysis.needsClarification === true,
    "ambiguous down payment is not silently interpreted"
  );
}

{
  const message =
    "รถราคา 900000 ดาวน์ 100000 บาท ผ่อน 48 เดือน ดอกเบี้ย flat 4.5% คำนวณค่างวด";
  const expected = calculateFlatRateFinance({
    carPrice: 900_000,
    downPaymentBaht: 100_000,
    annualFlatRatePercent: 4.5,
    termMonths: 48,
  });
  const block = buildChatV3FinanceAssumptionBlock({
    message,
    financeRelevant: true,
  });
  assert(
    block.status === "complete" &&
      block.result?.monthlyInstallment === expected.monthlyInstallment,
    "supports baht down payment + percent rate + months"
  );
}

{
  const instruction = buildChatV3SystemInstruction("FINANCE", {
    message: "ค่างวดเท่าไหร่",
  });
  assert(
    !/ตัวอย่างสมมติ:\s*ดอก\s*2%/.test(instruction) &&
      /ห้ามเดาอัตราดอกเบี้ย|ข้อมูลยังไม่ครบ/.test(instruction),
    "does not silently apply legacy V2 default assumptions"
  );
}

console.log("");
console.log(
  `WP-V3-10B automotive reasoning: ${passed} passed, ${failed} failed`
);
console.log("Confirmed: no Live Gemini call in this script.");
if (failed > 0) {
  process.exitCode = 1;
}
