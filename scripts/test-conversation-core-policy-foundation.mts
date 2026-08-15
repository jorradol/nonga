/**
 * WP-V2U-03C1 — Conversation Core policy foundation tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-policy-foundation.mts
 */
import fs from "node:fs";
import path from "node:path";
import {
  CONVERSATION_CORE_ASSISTANT_NAME,
  CONVERSATION_CORE_EXPERT_MODE_HINTS,
  CONVERSATION_CORE_EXPERT_MODE_HINT_KEYS,
  CONVERSATION_CORE_EXPERT_MODES,
  CONVERSATION_CORE_POLICY_LANE_DEFINITIONS,
  CONVERSATION_CORE_POLICY_LANE_IDS,
  buildConversationCoreBaseInstruction,
  getConversationCorePolicyLaneDefinition,
  validateConversationTurnRequest,
} from "../src/services/conversation-core/index";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertTruthy(label: string, value: unknown): void {
  if (!value) {
    console.error(`FAIL [${label}] expected truthy`);
    process.exit(1);
  }
  pass(label);
}

function assertFalsy(label: string, value: unknown): void {
  if (value) {
    console.error(`FAIL [${label}] expected falsy`);
    process.exit(1);
  }
  pass(label);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  pass(label);
}

function assertIncludes(label: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to include: ${needle}`);
    process.exit(1);
  }
  pass(label);
}

function assertExcludes(label: string, haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to exclude: ${needle}`);
    process.exit(1);
  }
  pass(label);
}

const POLICY_FILES = [
  "src/services/conversation-core/conversationCorePersona.ts",
  "src/services/conversation-core/conversationCoreInstruction.ts",
  "src/services/conversation-core/conversationCorePolicyLanes.ts",
];

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["'].*chat-v3/,
  /from\s+["'].*\/server\//,
  /from\s+["']@google\/genai/,
  /from\s+["'].*salesBrain/,
  /from\s+["'].*components\//,
  /from\s+["'].*hooks\//,
  /from\s+["'].*\/store/,
  /process\.env/,
  /from\s+["']node:fs/,
  /from\s+["']node:net/,
  /from\s+["']node:http/,
  /from\s+["'].*financeCalculator/,
];

for (const relativePath of POLICY_FILES) {
  const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
    assertFalsy(
      `boundary: ${relativePath} has no forbidden import ${pattern}`,
      pattern.test(source)
    );
  }
}

const barrelSource = fs.readFileSync(
  path.join(process.cwd(), "src/services/conversation-core/index.ts"),
  "utf8"
);
assertFalsy("boundary: barrel has no chat-v3 import", /chat-v3/.test(barrelSource));
assertFalsy("boundary: barrel has no server import", /from\s+["'].*\/server\//.test(barrelSource));

assertEqual(
  "persona: assistant name",
  CONVERSATION_CORE_ASSISTANT_NAME,
  "น้องเอ"
);

const instructionAuto = buildConversationCoreBaseInstruction({ expertMode: "AUTO" });
const instructionBuying = buildConversationCoreBaseInstruction({ expertMode: "BUYING" });

assertIncludes("persona: Thai assistant name in instruction", instructionAuto, "น้องเอ");
assertIncludes(
  "persona: consultative tone",
  instructionAuto,
  "ที่ปรึกษาเรื่องรถ"
);
assertExcludes("persona: no Chat V.3 branding", instructionAuto, "Chat V.3");
assertExcludes("persona: no route version branding", instructionAuto, "chat-v3");
assertIncludes(
  "persona: expert hint not hard boundary",
  instructionAuto,
  "ไม่ใช่ขอบเขตความรู้"
);
assertIncludes(
  "persona: cross-topic allowed",
  instructionAuto,
  "ตอบข้ามหมวดได้"
);
assertIncludes(
  "persona: history continuity principle",
  instructionAuto,
  "ใช้ประวัติและบริบทสนทนาที่ระบบส่งมาต่อเนื่อง"
);
assertIncludes(
  "persona: no fabricated authoritative facts",
  instructionAuto,
  "ห้ามแต่งรถ ราคา"
);
assertIncludes(
  "persona: trusted context required for facts",
  instructionAuto,
  "ต้องมาจากบริบทที่ระบบยืนยันแล้วเท่านั้น"
);
assertIncludes(
  "persona: general conversation natural",
  instructionAuto,
  "บทสนทนาทั่วไปต้องเป็นธรรมชาติ"
);
assertIncludes(
  "legacy exclusion: no fixed sentence count",
  instructionAuto,
  "ไม่กำหนดจำนวนประโยค"
);
assertIncludes(
  "legacy exclusion: no fixed vehicle count",
  instructionAuto,
  "จำนวนรถ"
);
assertIncludes(
  "legacy exclusion: no forced CTA",
  instructionAuto,
  "ไม่บังคับรูปแบบการขาย"
);
assertExcludes(
  "legacy exclusion: no mandatory catchphrase",
  instructionAuto,
  "ปังปุริเย่"
);
assertExcludes(
  "legacy exclusion: no marketplace fallback rule",
  instructionAuto,
  "ราคาตลาดตอนนี้"
);
assertIncludes(
  "legacy exclusion: no lead/posting action",
  instructionAuto,
  "ยังไม่ดำเนินการโพสต์ สร้างลีด"
);
assertExcludes("persona: no provider reference", instructionAuto, "Gemini");
assertExcludes("persona: no env reference", instructionAuto, "process.env");
assertExcludes("persona: no API key reference", instructionAuto, "API key");
assertExcludes("persona: no model reference", instructionAuto, "modelId");

assertEqual(
  "expert hints: covers all modes",
  CONVERSATION_CORE_EXPERT_MODE_HINT_KEYS.length,
  CONVERSATION_CORE_EXPERT_MODES.length
);
for (const mode of CONVERSATION_CORE_EXPERT_MODES) {
  assertTruthy(`expert hints: ${mode} defined`, CONVERSATION_CORE_EXPERT_MODE_HINTS[mode]);
  assertIncludes(
    `expert hints: ${mode} avoids keyword template`,
    CONVERSATION_CORE_EXPERT_MODE_HINTS[mode],
    mode === "AUTO" ? "ไม่ใช้แม่แบบคำหลัก" : "ตอบข้ามหมวดได้"
  );
}
assertIncludes(
  "expert mode: buying hint in instruction",
  instructionBuying,
  CONVERSATION_CORE_EXPERT_MODE_HINTS.BUYING
);

assertEqual(
  "instruction: deterministic for same input",
  buildConversationCoreBaseInstruction({ expertMode: "REPAIR" }),
  buildConversationCoreBaseInstruction({ expertMode: "REPAIR" })
);
assertFalsy(
  "instruction: different expert modes differ",
  instructionAuto === instructionBuying
);

assertEqual(
  "lanes: four lane ids",
  CONVERSATION_CORE_POLICY_LANE_IDS.length,
  4
);
assertEqual(
  "lanes: unique ids",
  new Set(CONVERSATION_CORE_POLICY_LANE_IDS).size,
  CONVERSATION_CORE_POLICY_LANE_IDS.length
);

const general = getConversationCorePolicyLaneDefinition("general-consultative");
const authoritative = getConversationCorePolicyLaneDefinition("authoritative-data");
const highRisk = getConversationCorePolicyLaneDefinition("high-risk-automotive");
const writeBlocked = getConversationCorePolicyLaneDefinition("write-action-blocked");

assertEqual(
  "lanes: general not inherently tool-required",
  general.toolRequirement,
  "not-inherently-required"
);
assertEqual(
  "lanes: authoritative requires read-only tools",
  authoritative.toolRequirement,
  "read-only-required"
);
assertEqual(
  "lanes: authoritative fail closed",
  authoritative.failureBehavior,
  "fail-closed-without-trusted-tools"
);
assertEqual(
  "lanes: high-risk requires validators",
  highRisk.validatorPolicy,
  "safety-and-high-risk-required"
);
assertEqual(
  "lanes: write action blocked",
  writeBlocked.toolRequirement,
  "write-blocked"
);
assertEqual(
  "lanes: write workspace blocked",
  writeBlocked.workspaceActionPolicy,
  "blocked"
);
assertEqual(
  "lanes: general workspace disallowed",
  general.workspaceActionPolicy,
  "disallowed"
);
assertEqual(
  "lanes: authoritative workspace future-only from trusted tools",
  authoritative.workspaceActionPolicy,
  "allowed-from-trusted-tool-results-future"
);

const frozenGeneral = CONVERSATION_CORE_POLICY_LANE_DEFINITIONS["general-consultative"];
try {
  (frozenGeneral as { summary: string }).summary = "mutated";
  console.error("FAIL [lanes: definitions should be immutable]");
  process.exit(1);
} catch {
  pass("lanes: definitions are immutable");
}

const policyLanesSource = fs.readFileSync(
  path.join(process.cwd(), "src/services/conversation-core/conversationCorePolicyLanes.ts"),
  "utf8"
);
assertFalsy(
  "lanes: no classifier export classifyLane",
  /export function classifyLane/.test(policyLanesSource)
);
assertFalsy(
  "lanes: no detectLane export",
  /export function detectLane/.test(policyLanesSource)
);
assertFalsy(
  "lanes: no resolveLaneFromMessage export",
  /export function resolveLaneFromMessage/.test(policyLanesSource)
);

const clientPolicyLane = validateConversationTurnRequest({
  conversationId: "conv-policy-001",
  messageId: "msg-001",
  userMessage: "อยากได้รถเก๋ง",
  policyLane: "general-consultative",
});
if (clientPolicyLane.ok === true) {
  console.error("FAIL [client authority: policyLane must be rejected]");
  process.exit(1);
}
const policyLaneCodes = clientPolicyLane.issues.map((item) => item.code);
assertTruthy(
  "client authority: policyLane rejected as unknown field",
  policyLaneCodes.includes("unknown_field")
);

console.log(`\nConversation Core policy foundation tests passed (${passCount} assertions).`);
